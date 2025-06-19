// @ts-nocheck
// Deno runtime types
declare global {
  const Deno: any;
}

// @ts-ignore
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
// @ts-ignore
import { crypto } from 'https://deno.land/std@0.168.0/crypto/mod.ts'
// @ts-ignore
import { decode as hexDecode } from 'https://deno.land/std@0.168.0/encoding/hex.ts'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  {
    auth: {
      persistSession: false,
    },
  }
)

async function verifyStripeSignature(payload: string, sigHeader: string, secret: string): Promise<boolean> {
  const parts = sigHeader.split(',');
  const timestamp = parts.find(part => part.startsWith('t='))?.split('=')[1];
  const signatureHex = parts.find(part => part.startsWith('v1='))?.split('=')[1];

  if (!timestamp || !signatureHex) {
    console.error('Invalid Stripe signature header format');
    return false;
  }
  
  const signedPayload = `${timestamp}.${payload}`;
  
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const hmac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signedPayload));
  const signatureBytes = hexDecode(new TextEncoder().encode(signatureHex));

  return crypto.subtle.timingSafeEqual(hmac, signatureBytes);
}

serve(async (req) => {
  const signature = req.headers.get('stripe-signature')
  if (!signature) {
    return new Response('No signature', { status: 400 })
  }

  try {
    const body = await req.text()
    
    const secret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!
    if (!await verifyStripeSignature(body, signature, secret)) {
      return new Response('Invalid signature', { status: 400 })
    }

    const event = JSON.parse(body)
    console.log(`Received event: ${event.type}`)

    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionChange(event);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return new Response(JSON.stringify({ received: true }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (err) {
    console.error('Webhook error:', err.message)
    return new Response(`Webhook Error: ${err.message}`, { status: 400 })
  }
})

async function handleSubscriptionChange(event: any) {
  const subscription = event.data.object;
  const customerId = subscription.customer as string;

  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id, subscription_tier')
    .eq('stripe_customer_id', customerId)
    .single();

  if (userError || !user) {
    console.error('User not found for customer:', customerId, userError);
    return;
  }

  const price = subscription.items.data[0].price;
  const planId = getPlanIdFromPriceId(price.id);
  const previousPlanId = user.subscription_tier;

  // Check if subscription is scheduled for cancellation
  if (subscription.cancel_at_period_end) {
    console.log(`Subscription ${subscription.id} scheduled for cancellation at period end`);
    
    // Calculate effective date (when subscription will actually cancel)
    const effectiveDate = new Date(subscription.current_period_end * 1000);
    
    // Update user record with pending downgrade to free
    await supabase
      .from('users')
      .update({
        pending_plan_id: 'free',
        plan_change_effective_date: effectiveDate.toISOString().split('T')[0],
        plan_change_type: 'downgrade',
        plan_change_requested_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    // Record in plan_changes table
    await supabase
      .from('plan_changes')
      .insert({
        user_id: user.id,
        from_plan_id: planId,
        to_plan_id: 'free',
        change_type: 'downgrade',
        effective_date: effectiveDate.toISOString().split('T')[0],
        status: 'pending',
        stripe_subscription_id: subscription.id,
        notes: 'Scheduled via Stripe Customer Portal cancel_at_period_end'
      });

    console.log(`Updated pending plan change for user ${user.id}: ${planId} -> free on ${effectiveDate.toDateString()}`);
  } else {
    // Subscription is not scheduled for cancellation
    // Check if user had a pending cancellation that was reactivated
    const { data: userData } = await supabase
      .from('users')
      .select('pending_plan_id, plan_change_type')
      .eq('id', user.id)
      .single();

    if (userData?.pending_plan_id && userData?.plan_change_type === 'downgrade') {
      console.log(`Subscription ${subscription.id} reactivated - clearing pending cancellation`);
      
      // Clear pending plan change
      await supabase
        .from('users')
        .update({
          pending_plan_id: null,
          plan_change_effective_date: null,
          plan_change_type: null,
          plan_change_requested_at: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      // Mark pending plan changes as cancelled
      await supabase
        .from('plan_changes')
        .update({
          status: 'cancelled',
          notes: 'Cancelled - subscription reactivated before effective date',
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .eq('status', 'pending');

      console.log(`Cleared pending plan change for user ${user.id} - subscription reactivated`);
    }
  }

  // Continue with normal subscription update processing
  await updateUserTable(user.id, subscription, planId);
  await updateSubscriptionsTable(user.id, subscription, planId);
  await updateUsageTracking(user.id, subscription, planId);
  await recordSubscriptionEvent(user.id, event, 'updated', planId, previousPlanId);
}

async function handleSubscriptionDeleted(subscription: any) {
  console.log('Handling subscription deleted:', subscription.id);
  
  const customerId = subscription.customer as string;
  
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id, subscription_tier')
    .eq('stripe_customer_id', customerId)
    .single();

  if (userError || !user) {
    console.error('User not found for customer:', customerId, userError);
    return;
  }

  const previousPlanId = user.subscription_tier;
  const newPlanId = 'free';

  await supabase.from('users').update({
      subscription_tier: newPlanId,
      subscription_status: 'canceled',
      billing_cycle_start: null,
      billing_cycle_end: null,
      updated_at: new Date().toISOString(),
      subscription_plan_id: null
    }).eq('id', user.id);

  await supabase.from('subscriptions').update({
      status: 'canceled',
      tier: newPlanId,
      updated_at: new Date().toISOString()
    }).eq('stripe_subscription_id', subscription.id);

  await resetUsageTracking(user.id);
  // We need to create a fake event object to pass to recordSubscriptionEvent
  const fakeEvent = { id: `evt_deleted_${subscription.id}`, data: { object: subscription } };
  await recordSubscriptionEvent(user.id, fakeEvent, 'canceled', newPlanId, previousPlanId);
}

async function handlePaymentFailed(invoice: any) {
  console.log('Handling payment failed:', invoice.id)
  
  const customerId = invoice.customer as string
  
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single()

  if (user) {
    await supabase.from('users').update({
        subscription_status: 'past_due',
        updated_at: new Date().toISOString()
      }).eq('id', user.id);

    await supabase.from('subscriptions').update({
        status: 'past_due',
        updated_at: new Date().toISOString()
      }).eq('user_id', user.id);
  }
}

async function updateUserTable(userId: string, subscription: any, planId: string) {
  const startDate = new Date((subscription.trial_start || subscription.items.data[0].current_period_start) * 1000);
  const endDate = new Date((subscription.trial_end || subscription.items.data[0].current_period_end) * 1000);

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    console.error('Invalid date from subscription object.', JSON.stringify(subscription));
    return;
  }

  const { error } = await supabase
    .from('users')
    .update({
      subscription_tier: planId,
      subscription_status: subscription.status,
      billing_cycle_start: startDate.toISOString().split('T')[0],
      billing_cycle_end: endDate.toISOString().split('T')[0],
      updated_at: new Date().toISOString(),
      subscription_plan_id: planId
    })
    .eq('id', userId);

  if (error) console.error('Error updating user table:', error);
  else console.log(`Updated user ${userId} to plan ${planId} in users table.`);
}

async function updateSubscriptionsTable(userId: string, subscription: any, planId: string) {
  const startDate = new Date((subscription.trial_start || subscription.items.data[0].current_period_start) * 1000);
  const endDate = new Date((subscription.trial_end || subscription.items.data[0].current_period_end) * 1000);

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    console.error('Invalid date from subscription object.', JSON.stringify(subscription));
    return;
  }

  const subscriptionData = {
    user_id: userId,
    stripe_subscription_id: subscription.id,
    tier: planId,
    status: subscription.status,
    current_period_start: startDate.toISOString(),
    current_period_end: endDate.toISOString(),
    updated_at: new Date().toISOString()
  };

  const { error } = await supabase
    .from('subscriptions')
    .upsert(subscriptionData, { onConflict: 'stripe_subscription_id' });

  if (error) console.error('Error upserting subscription:', error);
  else console.log(`Upserted subscription ${subscription.id} for user ${userId}.`);
}

async function updateUsageTracking(userId: string, subscription: any, planId: string) {
  const limits = getPlanLimits(planId);
  const startDate = new Date((subscription.trial_start || subscription.items.data[0].current_period_start) * 1000);
  const endDate = new Date((subscription.trial_end || subscription.items.data[0].current_period_end) * 1000);
  
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    console.error('Invalid date from subscription object.', JSON.stringify(subscription));
    return;
  }

  const usageTrackingData = {
    user_id: userId,
    subscription_plan_id: planId,
    billing_period_start: startDate.toISOString().split('T')[0],
    billing_period_end: endDate.toISOString().split('T')[0],
    phone_calls_limit: limits.phone_calls_limit,
    text_chains_limit: limits.text_chains_limit,
    emails_limit: limits.emails_limit,
    calls_used: 0,
    texts_used: 0,
    emails_used: 0,
    month_year: `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

   const { error } = await supabase.from('usage_tracking').upsert(usageTrackingData, { onConflict: 'user_id,month_year' });

  if (error) console.error('Error creating/updating usage tracking record:', error);
  else console.log(`Upserted usage tracking record for user ${userId} for plan ${planId}.`);
}

async function resetUsageTracking(userId: string) {
    const limits = getPlanLimits('free');
    const now = new Date();
    
    const usageTrackingData = {
        user_id: userId,
        subscription_plan_id: 'free',
        billing_period_start: now.toISOString().split('T')[0],
        billing_period_end: now.toISOString().split('T')[0], // Period ends now
        phone_calls_limit: limits.phone_calls_limit,
        text_chains_limit: limits.text_chains_limit,
        emails_limit: limits.emails_limit,
        calls_used: 0,
        texts_used: 0,
        emails_used: 0,
        month_year: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from('usage_tracking').upsert(usageTrackingData, { onConflict: 'user_id,month_year' });
  if (error) console.error('Error resetting usage tracking record:', error);
  else console.log(`Reset usage tracking for user ${userId}.`);
}

async function recordSubscriptionEvent(
  userId: string,
  event: any,
  eventType: string,
  toPlan: string,
  fromPlan: string | null
) {
  const subscription = event.data.object;
  const price = subscription.items.data[0].price;
  const eventData = {
    user_id: userId,
    event_type: eventType,
    from_plan: fromPlan,
    to_plan: toPlan,
    stripe_subscription_id: subscription.id,
    stripe_customer_id: subscription.customer,
    stripe_event_id: event.id,
    billing_amount: price.unit_amount,
    currency: price.currency,
    billing_interval: price.recurring?.interval,
    effective_date: new Date().toISOString().split('T')[0],
    metadata: event, // Log the entire Stripe event object
    created_at: new Date().toISOString()
  };
  
  const { error } = await supabase.from('subscription_events').insert(eventData);

  if (error) console.error('Error recording subscription event:', error);
  else console.log(`Recorded ${eventType} subscription event for user ${userId}.`);
}

function getPlanLimits(planId: string) {
    const limits = {
        free: { phone_calls_limit: 10, text_chains_limit: 10, emails_limit: 10 },
        pro: { phone_calls_limit: 15, text_chains_limit: 20, emails_limit: 9999 },
        premium: { phone_calls_limit: 100, text_chains_limit: 100, emails_limit: 1000 }
    };
    return limits[planId] || limits['free'];
}

function getPlanIdFromPriceId(priceId: string): string {
  // Map Stripe Price IDs to our plan IDs
  const priceToPlainMap: { [key: string]: string } = {
    'price_1RYAcH04AHhaKcz1zSaXyJHS': 'pro',     // Pro Monthly
    'price_1RYAcj04AHhaKcz1jZEqaw58': 'pro',     // Pro Annual  
    'price_1RYAd904AHhaKcz1sfdexopq': 'premium', // Premium Monthly
    'price_1RYAdU04AHhaKcz1ZXsoCLdh': 'premium'  // Premium Annual
  }
  
  return priceToPlainMap[priceId] || 'free'
} 