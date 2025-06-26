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
import Stripe from 'https://esm.sh/stripe@10.17.0?target=deno&deno-std=0.132.0'

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  httpClient: Stripe.createFetchHttpClient(),
  apiVersion: '2022-11-15', // Use a version compatible with the library
});

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
      // Web: Create Stripe Checkout Session
      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        payment_method_types: ['card'],
        customer: customerId,
        line_items: [
          { price: priceId, quantity: 1 }
        ],
        success_url: 'https://talkah.com/dashboard/subscription?success=true',
        cancel_url: 'https://talkah.com/dashboard/subscription',
        allow_promotion_codes: true
      })

      if (!session.url) {
        return new Response(JSON.stringify({ error: 'Failed to create Stripe Checkout session' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        })
      }
      return new Response(JSON.stringify({ url: session.url }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    } else {
      // Mobile: Create subscription and return client_secret for PaymentIntent
      const subscription = await stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId }],
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice.payment_intent'],
        promotion_code: 'promo_1RbSzU04AHhaKcz1LthpEsOg', // Temporary for testing
      });

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
  console.log(`[1/4] Checking for existing Stripe customer ID for user ${userId}`);
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('stripe_customer_id')
    .eq('id', userId)
    .single()

  if (userError) {
    console.error('Error fetching user from Supabase:', userError);
    throw userError;
  }

  if (user?.stripe_customer_id) {
    console.log(`Found existing Stripe customer ID: ${user.stripe_customer_id}`);
    return user.stripe_customer_id
  }

  // Create a new Stripe customer or retrieve an existing one by email
  console.log(`[2/4] No existing ID found. Searching Stripe for customer with email: ${email}`);
  const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY')
  
  // First, check if a customer with this email already exists in Stripe
  const searchResponse = await fetch(`https://api.stripe.com/v1/customers?email=${encodeURIComponent(email)}&limit=1`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${stripeSecret}` },
  });
  const searchResult = await searchResponse.json();

  if (!searchResponse.ok) {
    console.error('Error searching for customer in Stripe:', searchResult.error);
    throw new Error(searchResult.error?.message || 'Failed to search for Stripe customer');
  }
  
  let customerId;
  if (searchResult.data && searchResult.data.length > 0) {
    // Use existing customer
    customerId = searchResult.data[0].id;
    console.log(`Found existing Stripe customer by email: ${customerId}`);
  } else {
    // Create new Stripe customer
    console.log(`[3/4] No existing Stripe customer found. Creating new one.`);
    const params = new URLSearchParams({
      email,
      [`metadata[supabase_user_id]`]: userId,
    });
    const createResponse = await fetch('https://api.stripe.com/v1/customers', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeSecret}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
    });
    const newCustomer = await createResponse.json();
    if (!newCustomer.id) {
      console.error('Error creating new Stripe customer:', newCustomer.error);
      throw new Error(newCustomer.error?.message || 'Failed to create Stripe customer');
    }
    customerId = newCustomer.id;
    console.log(`Created new Stripe customer: ${customerId}`);
  }

  // Update user record with the Stripe customer ID
  console.log(`[4/4] Updating user ${userId} with Stripe customer ID ${customerId}`);
  const { error: updateError } = await supabase
    .from('users')
    .update({ stripe_customer_id: customerId })
    .eq('id', userId)

  if (updateError) {
    console.error(`Error updating user record with Stripe ID:`, updateError);
    throw updateError;
  }

  console.log(`Successfully associated Stripe customer ${customerId} with user ${userId}`);
  return customerId;
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