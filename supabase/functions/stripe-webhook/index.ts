// @ts-nocheck
// Deno runtime types
declare global {
  const Deno: any;
}

// @ts-ignore
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
// @ts-ignore
import Stripe from 'https://esm.sh/stripe@11.1.0?target=deno'
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// @ts-ignore
const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2023-10-16',
})

// @ts-ignore
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
// @ts-ignore
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

serve(async (req) => {
  const signature = req.headers.get('stripe-signature')
  
  if (!signature) {
    return new Response('No signature', { status: 400 })
  }

  try {
    const body = await req.text()
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      Deno.env.get('STRIPE_WEBHOOK_SECRET')!
    )

    console.log(`Received event: ${event.type}`)

    switch (event.type) {
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription)
        break
      
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
        break
      
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break
      
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice)
        break
      
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice)
        break
      
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

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  console.log('Handling subscription created:', subscription.id)
  
  const customerId = subscription.customer as string
  const planId = getPlanIdFromPriceId(subscription.items.data[0].price.id)
  
  // Get user by Stripe customer ID
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single()

  if (!user) {
    console.error('User not found for customer:', customerId)
    return
  }

  // Update user's subscription
  await updateUserSubscription(user.id, subscription, planId)
  
  // Record subscription event
  await recordSubscriptionEvent(user.id, 'created', planId, subscription.id)
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  console.log('Handling subscription updated:', subscription.id)
  
  const customerId = subscription.customer as string
  const planId = getPlanIdFromPriceId(subscription.items.data[0].price.id)
  
  const { data: user } = await supabase
    .from('users')
    .select('id, subscription_plan_id')
    .eq('stripe_customer_id', customerId)
    .single()

  if (!user) {
    console.error('User not found for customer:', customerId)
    return
  }

  const previousPlanId = user.subscription_plan_id
  await updateUserSubscription(user.id, subscription, planId)
  
  // Record subscription event
  await recordSubscriptionEvent(user.id, 'updated', planId, subscription.id, previousPlanId)
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  console.log('Handling subscription deleted:', subscription.id)
  
  const customerId = subscription.customer as string
  
  const { data: user } = await supabase
    .from('users')
    .select('id, subscription_plan_id')
    .eq('stripe_customer_id', customerId)
    .single()

  if (!user) {
    console.error('User not found for customer:', customerId)
    return
  }

  const previousPlanId = user.subscription_plan_id
  
  // Downgrade to free plan
  await supabase
    .from('users')
    .update({
      subscription_plan_id: 'free',
      subscription_status: 'canceled',
      billing_cycle_start: null,
      billing_cycle_end: null,
      updated_at: new Date().toISOString()
    })
    .eq('id', user.id)

  // Record subscription event
  await recordSubscriptionEvent(user.id, 'canceled', 'free', subscription.id, previousPlanId)
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  console.log('Handling payment succeeded:', invoice.id)
  
  if (invoice.subscription) {
    const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string)
    await handleSubscriptionUpdated(subscription)
  }
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  console.log('Handling payment failed:', invoice.id)
  
  const customerId = invoice.customer as string
  
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single()

  if (user) {
    // Update subscription status to past_due
    await supabase
      .from('users')
      .update({
        subscription_status: 'past_due',
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)
  }
}

async function updateUserSubscription(userId: string, subscription: Stripe.Subscription, planId: string) {
  const currentPeriodStart = new Date(subscription.current_period_start * 1000)
  const currentPeriodEnd = new Date(subscription.current_period_end * 1000)
  
  await supabase
    .from('users')
    .update({
      subscription_plan_id: planId,
      subscription_status: subscription.status,
      billing_cycle_start: currentPeriodStart.toISOString().split('T')[0],
      billing_cycle_end: currentPeriodEnd.toISOString().split('T')[0],
      updated_at: new Date().toISOString()
    })
    .eq('id', userId)

  console.log(`Updated user ${userId} to plan ${planId}`)
}

async function recordSubscriptionEvent(
  userId: string, 
  eventType: string, 
  planId: string, 
  stripeSubscriptionId: string,
  previousPlanId?: string
) {
  await supabase
    .from('subscription_events')
    .insert({
      user_id: userId,
      event_type: eventType,
      subscription_plan_id: planId,
      previous_plan_id: previousPlanId,
      stripe_subscription_id: stripeSubscriptionId,
      created_at: new Date().toISOString()
    })
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