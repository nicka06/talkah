// @ts-nocheck
// Deno runtime types
// @ts-ignore
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
// @ts-ignore
import { crypto } from 'https://deno.land/std@0.168.0/crypto/mod.ts';
// @ts-ignore
import { decode as hexDecode } from 'https://deno.land/std@0.168.0/encoding/hex.ts';
// @ts-ignore
import Stripe from 'https://esm.sh/stripe@10.17.0?target=deno&deno-std=0.132.0';
const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'), {
  httpClient: Stripe.createFetchHttpClient(),
  apiVersion: '2024-06-20'
});
const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'), {
  auth: {
    persistSession: false
  }
});
async function verifyStripeSignature(payload, sigHeader, secret) {
  const parts = sigHeader.split(',');
  const timestamp = parts.find((part)=>part.startsWith('t='))?.split('=')[1];
  const signatureHex = parts.find((part)=>part.startsWith('v1='))?.split('=')[1];
  if (!timestamp || !signatureHex) {
    console.error('Invalid Stripe signature header format');
    return false;
  }
  const signedPayload = `${timestamp}.${payload}`;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), {
    name: 'HMAC',
    hash: 'SHA-256'
  }, false, [
    'sign'
  ]);
  const hmac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signedPayload));
  const signatureBytes = hexDecode(new TextEncoder().encode(signatureHex));
  return crypto.subtle.timingSafeEqual(hmac, signatureBytes);
}
serve(async (req)=>{
  const signature = req.headers.get('stripe-signature');
  if (!signature) {
    return new Response('No signature', {
      status: 400
    });
  }
  try {
    const body = await req.text();
    const secret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
    if (!await verifyStripeSignature(body, signature, secret)) {
      return new Response('Invalid signature', {
        status: 400
      });
    }
    const event = await stripe.webhooks.constructEventAsync(body, signature, secret, undefined, stripe.cryptoProvider);
    console.log(`Received event: ${event.type}`);
    switch(event.type){
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object;
        const { user_id, plan_type } = paymentIntent.metadata;
        if (user_id && plan_type) {
          console.log(`Payment intent ${paymentIntent.id} succeeded with metadata. Updating user ${user_id} to plan ${plan_type}.`);
          const { data: user, error: userError } = await supabase.from('users').select('id, subscription_tier, stripe_customer_id').eq('id', user_id).single();
          if (userError || !user) {
            console.error('User not found for user_id from metadata:', user_id, userError);
            break;
          }
          const mockSubscription = {
            id: `sub_mock_${paymentIntent.id}`,
            customer: user.stripe_customer_id,
            status: 'active',
            items: {
              data: [
                {
                  price: {
                    id: `price_mock_${plan_type}`
                  },
                  current_period_start: Math.floor(Date.now() / 1000),
                  current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60
                }
              ]
            },
            current_period_start: Math.floor(Date.now() / 1000),
            current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
            cancel_at_period_end: false
          };
          await updateUserTable(user.id, mockSubscription, plan_type);
          await updateSubscriptionsTable(user.id, mockSubscription, plan_type);
          await updateUsageTracking(user.id, mockSubscription, plan_type);
          await recordSubscriptionEvent(user.id, {
            data: {
              object: mockSubscription
            }
          }, 'created', plan_type, user.subscription_tier);
          console.log(`Successfully updated database for user ${user.id} for plan ${plan_type}.`);
        } else {
          console.log(`Payment intent ${paymentIntent.id} succeeded but had no user_id/plan_type metadata.`);
        }
        break;
      case 'invoice.payment_succeeded':
        // If the invoice has a subscription, handle it as a subscription change
        if (event.data.object.subscription) {
          console.log('Invoice payment succeeded for a subscription, handling as subscription change.');
          // We need to fetch the full subscription object from Stripe
          const stripe = Deno.env.get('STRIPE_SECRET_KEY');
          const response = await fetch(`https://api.stripe.com/v1/subscriptions/${event.data.object.subscription}`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${stripe}`
            }
          });
          const subscription = await response.json();
          if (subscription.error) {
            console.error('Error fetching subscription from Stripe:', subscription.error);
            break;
          }
          // Re-create a fake event object to pass to handleSubscriptionChange
          const fakeEvent = {
            data: {
              object: subscription
            }
          };
          await handleSubscriptionChange(fakeEvent);
        } else {
          console.log('Invoice payment succeeded, but it is not for a subscription.');
        }
        break;
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionChange(event);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
    return new Response(JSON.stringify({
      received: true
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (err) {
    console.error('Webhook error:', err.message);
    return new Response(`Webhook Error: ${err.message}`, {
      status: 400
    });
  }
});
async function handleSubscriptionChange(event) {
  const subscription = event.data.object;
  const customerId = subscription.customer;
  const { data: user, error: userError } = await supabase.from('users').select('id, subscription_tier').eq('stripe_customer_id', customerId).single();
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
    // The current_period_end is in the subscription items, not the main subscription object
    const subscriptionItem = subscription.items.data[0];
    const currentPeriodEnd = subscriptionItem?.current_period_end;
    console.log('Raw current_period_end value:', currentPeriodEnd);
    console.log('Type of current_period_end:', typeof currentPeriodEnd);
    console.log('Subscription item:', subscriptionItem);
    let effectiveDate;
    try {
      // Handle both string and number timestamps
      const timestamp = typeof currentPeriodEnd === 'string' ? parseInt(currentPeriodEnd) : currentPeriodEnd;
      if (!timestamp) {
        throw new Error(`current_period_end is missing or invalid: ${currentPeriodEnd}`);
      }
      effectiveDate = new Date(timestamp * 1000);
      if (isNaN(effectiveDate.getTime())) {
        throw new Error(`Invalid date created from timestamp: ${timestamp}`);
      }
      console.log('Effective date calculated:', effectiveDate.toISOString());
    } catch (error) {
      console.error('Error converting current_period_end to date:', error);
      console.error('Full subscription object:', JSON.stringify(subscription, null, 2));
      return; // Exit early to prevent further errors
    }
    // Update user record with pending downgrade to free
    await supabase.from('users').update({
      pending_plan_id: 'free',
      plan_change_effective_date: effectiveDate.toISOString().split('T')[0],
      plan_change_type: 'downgrade',
      plan_change_requested_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }).eq('id', user.id);
    // Record in plan_changes table
    await supabase.from('plan_changes').insert({
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
    const { data: userData } = await supabase.from('users').select('pending_plan_id, plan_change_type').eq('id', user.id).single();
    if (userData?.pending_plan_id && userData?.plan_change_type === 'downgrade') {
      console.log(`Subscription ${subscription.id} reactivated - clearing pending cancellation`);
      // Clear pending plan change
      await supabase.from('users').update({
        pending_plan_id: null,
        plan_change_effective_date: null,
        plan_change_type: null,
        plan_change_requested_at: null,
        updated_at: new Date().toISOString()
      }).eq('id', user.id);
      // Mark pending plan changes as cancelled
      await supabase.from('plan_changes').update({
        status: 'cancelled',
        notes: 'Cancelled - subscription reactivated before effective date',
        updated_at: new Date().toISOString()
      }).eq('user_id', user.id).eq('status', 'pending');
      console.log(`Cleared pending plan change for user ${user.id} - subscription reactivated`);
    }
  }
  // Continue with normal subscription update processing
  await updateUserTable(user.id, subscription, planId);
  await updateSubscriptionsTable(user.id, subscription, planId);
  await updateUsageTracking(user.id, subscription, planId);
  await recordSubscriptionEvent(user.id, event, 'updated', planId, previousPlanId);
}
async function handleSubscriptionDeleted(subscription) {
  console.log('Handling subscription deleted:', subscription.id);
  const customerId = subscription.customer;
  const { data: user, error: userError } = await supabase.from('users').select('id, subscription_tier').eq('stripe_customer_id', customerId).single();
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
  const fakeEvent = {
    id: `evt_deleted_${subscription.id}`,
    data: {
      object: subscription
    }
  };
  await recordSubscriptionEvent(user.id, fakeEvent, 'canceled', newPlanId, previousPlanId);
}
async function handlePaymentFailed(invoice) {
  console.log('Handling payment failed:', invoice.id);
  const customerId = invoice.customer;
  const { data: user } = await supabase.from('users').select('id').eq('stripe_customer_id', customerId).single();
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
async function updateUserTable(userId, subscription, planId) {
  const startDate = new Date((subscription.trial_start || subscription.items.data[0].current_period_start) * 1000);
  const endDate = new Date((subscription.trial_end || subscription.items.data[0].current_period_end) * 1000);
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    console.error('Invalid date from subscription object.', JSON.stringify(subscription));
    return;
  }
  // Extract billing interval from Stripe subscription
  const stripeInterval = subscription.items.data[0].price.recurring?.interval;
  const billingInterval = stripeInterval === 'year' ? 'yearly' : 'monthly';
  console.log(`Updating user ${userId} with plan ${planId}, billing interval: ${billingInterval}`);
  const { error } = await supabase.from('users').update({
    subscription_tier: planId,
    subscription_status: subscription.status,
    billing_cycle_start: startDate.toISOString().split('T')[0],
    billing_cycle_end: endDate.toISOString().split('T')[0],
    billing_interval: billingInterval,
    updated_at: new Date().toISOString(),
    subscription_plan_id: planId
  }).eq('id', userId);
  if (error) console.error('Error updating user table:', error);
  else console.log(`Updated user ${userId} to plan ${planId} (${billingInterval}) in users table.`);
}
async function updateSubscriptionsTable(userId, subscription, planId) {
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
  const { error } = await supabase.from('subscriptions').upsert(subscriptionData, {
    onConflict: 'stripe_subscription_id'
  });
  if (error) console.error('Error upserting subscription:', error);
  else console.log(`Upserted subscription ${subscription.id} for user ${userId}.`);
}
async function updateUsageTracking(userId, subscription, planId) {
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
    updated_at: new Date().toISOString()
  };
  const { error } = await supabase.from('usage_tracking').upsert(usageTrackingData, {
    onConflict: 'user_id,month_year'
  });
  if (error) console.error('Error creating/updating usage tracking record:', error);
  else console.log(`Upserted usage tracking record for user ${userId} for plan ${planId}.`);
}
async function resetUsageTracking(userId) {
  const limits = getPlanLimits('free');
  const now = new Date();
  const usageTrackingData = {
    user_id: userId,
    subscription_plan_id: 'free',
    billing_period_start: now.toISOString().split('T')[0],
    billing_period_end: now.toISOString().split('T')[0],
    phone_calls_limit: limits.phone_calls_limit,
    text_chains_limit: limits.text_chains_limit,
    emails_limit: limits.emails_limit,
    calls_used: 0,
    texts_used: 0,
    emails_used: 0,
    month_year: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  const { error } = await supabase.from('usage_tracking').upsert(usageTrackingData, {
    onConflict: 'user_id,month_year'
  });
  if (error) console.error('Error resetting usage tracking record:', error);
  else console.log(`Reset usage tracking for user ${userId}.`);
}
async function recordSubscriptionEvent(userId, event, eventType, toPlan, fromPlan) {
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
    metadata: event,
    created_at: new Date().toISOString()
  };
  const { error } = await supabase.from('subscription_events').insert(eventData);
  if (error) console.error('Error recording subscription event:', error);
  else console.log(`Recorded ${eventType} subscription event for user ${userId}.`);
}
function getPlanLimits(planId) {
  const limits = {
    free: {
      phone_calls_limit: 10,
      text_chains_limit: 10,
      emails_limit: 10
    },
    pro: {
      phone_calls_limit: 15,
      text_chains_limit: 20,
      emails_limit: 9999
    },
    premium: {
      phone_calls_limit: 100,
      text_chains_limit: 100,
      emails_limit: 1000
    }
  };
  return limits[planId] || limits['free'];
}
function getPlanIdFromPriceId(priceId) {
  // Map Stripe Price IDs to our plan IDs
  const priceToPlainMap = {
    'price_1RYAcH04AHhaKcz1zSaXyJHS': 'pro',
    'price_1RYAcj04AHhaKcz1jZEqaw58': 'pro',
    'price_1RYAd904AHhaKcz1sfdexopq': 'premium',
    'price_1RYAdU04AHhaKcz1ZXsoCLdh': 'premium' // Premium Annual
  };
  return priceToPlainMap[priceId] || 'free';
}
