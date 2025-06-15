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
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
// @ts-ignore
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Use your domain in production!
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': '*', // Allow all headers for dev, or add x-client-info
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders })
  }

  try {
    const { email, userId, planType, isYearly, platform } = await req.json()

    // Validate input
    if (!email || !userId || !planType) {
      return new Response('Missing required fields', { status: 400, headers: corsHeaders })
    }

    // Get or create Stripe customer
    const customerId = await getOrCreateCustomer(email, userId)

    // Get price ID based on plan
    const priceId = getPriceId(planType, isYearly)
    if (!priceId) {
      return new Response('Invalid plan type', { status: 400, headers: corsHeaders })
    }

    const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY')
    if (!stripeSecret) {
      return new Response('Stripe secret key not set', { status: 500, headers: corsHeaders })
    }

    if (platform === 'web') {
      // Web: Create Stripe Checkout Session via fetch
      const params = new URLSearchParams({
        'mode': 'subscription',
        'payment_method_types[]': 'card',
        'customer': customerId,
        'line_items[0][price]': priceId,
        'line_items[0][quantity]': '1',
        'success_url': 'https://talkah.com/dashboard/subscription?success=true',
        'cancel_url': 'https://talkah.com/dashboard/subscription?canceled=true',
      })
      const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${stripeSecret}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params,
      })
      const session = await response.json()
      if (!session.url) {
        return new Response(JSON.stringify({ error: session.error || 'Failed to create Stripe Checkout session' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        })
      }
      return new Response(JSON.stringify({ url: session.url }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    } else {
      // Mobile: Create subscription and return client_secret for PaymentIntent via fetch
      const params = new URLSearchParams({
        'customer': customerId,
        'items[0][price]': priceId,
        'payment_behavior': 'default_incomplete',
        'payment_settings[save_default_payment_method]': 'on_subscription',
        'expand[]': 'latest_invoice.payment_intent',
      })
      const response = await fetch('https://api.stripe.com/v1/subscriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${stripeSecret}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params,
      })
      const subscription = await response.json()
      const clientSecret = subscription.latest_invoice?.payment_intent?.client_secret
      if (!clientSecret) {
        return new Response(JSON.stringify({ error: subscription.error || 'Failed to create Stripe subscription' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        })
      }
      return new Response(JSON.stringify({ client_secret: clientSecret }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }
  } catch (error) {
    console.error('Error creating subscription:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    )
  }
})

async function getOrCreateCustomer(email: string, userId: string): Promise<string> {
  // Check if user already has a Stripe customer ID
  const { data: user } = await supabase
    .from('users')
    .select('stripe_customer_id')
    .eq('id', userId)
    .single()

  if (user?.stripe_customer_id) {
    return user.stripe_customer_id
  }

  // Create new Stripe customer using fetch
  const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY')
  const params = new URLSearchParams({
    email,
    [`metadata[supabase_user_id]`]: userId,
  })
  const response = await fetch('https://api.stripe.com/v1/customers', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${stripeSecret}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params,
  })
  const customer = await response.json()
  if (!customer.id) {
    throw new Error(customer.error?.message || 'Failed to create Stripe customer')
  }

  // Update user record with Stripe customer ID
  await supabase
    .from('users')
    .update({ stripe_customer_id: customer.id })
    .eq('id', userId)

  return customer.id
}

function getPriceId(planType: string, isYearly: boolean): string {
  // Map plan IDs to Stripe price IDs
  const priceIds: { [key: string]: { monthly: string; yearly: string } } = {
    'pro': {
      monthly: 'price_1RYAcH04AHhaKcz1zSaXyJHS',
      yearly: 'price_1RYAcj04AHhaKcz1jZEqaw58'
    },
    'premium': {
      monthly: 'price_1RYAd904AHhaKcz1sfdexopq',
      yearly: 'price_1RYAdU04AHhaKcz1ZXsoCLdh'
    }
  }

  // Convert plan type to lowercase
  const normalizedPlanType = planType.toLowerCase()
  
  // Validate plan type
  if (normalizedPlanType === 'free') {
    throw new Error('Cannot create a subscription for the free plan')
  }
  
  // Get the price IDs for the plan type
  const planPrices = priceIds[normalizedPlanType]
  if (!planPrices) {
    throw new Error(`Invalid plan type: ${planType}. Must be one of: ${Object.keys(priceIds).join(', ')}`)
  }

  // Return the appropriate price ID based on billing cycle
  return isYearly ? planPrices.yearly : planPrices.monthly
} 