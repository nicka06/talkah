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
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    const { email, userId, planType, isYearly } = await req.json()

    // Validate input
    if (!email || !userId || !planType) {
      return new Response('Missing required fields', { status: 400 })
    }

    // Get or create Stripe customer
    const customerId = await getOrCreateCustomer(email, userId)

    // Get price ID based on plan
    const priceId = getPriceId(planType, isYearly)
    if (!priceId) {
      return new Response('Invalid plan type', { status: 400 })
    }

    // Create subscription
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: {
        save_default_payment_method: 'on_subscription',
      },
      expand: ['latest_invoice.payment_intent'],
    })

    return new Response(JSON.stringify(subscription), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error creating subscription:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
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

  // Create new Stripe customer
  const customer = await stripe.customers.create({
    email,
    metadata: {
      supabase_user_id: userId,
    },
  })

  // Update user record with Stripe customer ID
  await supabase
    .from('users')
    .update({ stripe_customer_id: customer.id })
    .eq('id', userId)

  return customer.id
}

function getPriceId(planType: string, isYearly: boolean): string {
  const priceIds: { [key: string]: string } = {
    'pro_monthly': 'price_1RYAcH04AHhaKcz1zSaXyJHS',
    'pro_yearly': 'price_1RYAcj04AHhaKcz1jZEqaw58',
    'premium_monthly': 'price_1RYAd904AHhaKcz1sfdexopq',
    'premium_yearly': 'price_1RYAdU04AHhaKcz1ZXsoCLdh',
  }

  const key = `${planType}_${isYearly ? 'yearly' : 'monthly'}`
  return priceIds[key] || ''
} 