// @ts-nocheck
// Deno runtime types
declare global {
  const Deno: any;
}

// @ts-ignore
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  {
    auth: {
      persistSession: false,
    },
  }
)

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders })
  }

  try {
    // Get the user from the Authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response('Unauthorized - No auth header', { status: 401, headers: corsHeaders })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)

    if (userError || !user) {
      return new Response('Unauthorized - Invalid user', { status: 401, headers: corsHeaders })
    }

    const { planId, isYearly, changeType } = await req.json()

    // Validate input
    if (!planId || changeType === undefined) {
      return new Response('Missing required fields: planId, changeType', { status: 400, headers: corsHeaders })
    }

    console.log(`Processing ${changeType} for user ${user.id}: ${planId} (${isYearly ? 'yearly' : 'monthly'})`)

    // Get user's current subscription info
    const { data: userData, error: fetchError } = await supabase
      .from('users')
      .select('stripe_customer_id, subscription_plan_id, stripe_subscription_id')
      .eq('id', user.id)
      .single()

    if (fetchError) {
      console.error('Database error fetching user:', fetchError)
      return new Response(JSON.stringify({ error: 'Database error', details: fetchError }), { 
        status: 500, 
        headers: { 'Content-Type': 'application/json', ...corsHeaders } 
      })
    }

    if (!userData?.stripe_customer_id) {
      return new Response(JSON.stringify({ error: 'No Stripe customer found for this user' }), { 
        status: 404, 
        headers: { 'Content-Type': 'application/json', ...corsHeaders } 
      })
    }

    const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY')
    if (!stripeSecret) {
      return new Response('Stripe configuration error', { status: 500, headers: corsHeaders })
    }

    // Handle different change types
    if (changeType === 'downgrade') {
      // For downgrades, schedule cancellation at period end
      if (userData.stripe_subscription_id) {
        const response = await fetch(`https://api.stripe.com/v1/subscriptions/${userData.stripe_subscription_id}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${stripeSecret}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            'cancel_at_period_end': 'true',
          }),
        })

        if (!response.ok) {
          const error = await response.json()
          console.error('Stripe API error:', error)
          return new Response(JSON.stringify({ error: 'Failed to schedule downgrade' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
          })
        }

        console.log(`Scheduled downgrade for user ${user.id}`)
      }
    } else {
      // For upgrades and billing switches, update the subscription immediately
      if (userData.stripe_subscription_id) {
        const priceId = getPriceId(planId, isYearly)
        if (!priceId) {
          return new Response(JSON.stringify({ error: 'Invalid plan type' }), { 
            status: 400, 
            headers: { 'Content-Type': 'application/json', ...corsHeaders } 
          })
        }

        const response = await fetch(`https://api.stripe.com/v1/subscriptions/${userData.stripe_subscription_id}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${stripeSecret}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            'items[0][id]': 'si_' + userData.stripe_subscription_id.split('_')[1], // Get subscription item ID
            'items[0][price]': priceId,
            'proration_behavior': 'create_prorations',
          }),
        })

        if (!response.ok) {
          const error = await response.json()
          console.error('Stripe API error:', error)
          return new Response(JSON.stringify({ error: 'Failed to update subscription' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
          })
        }

        console.log(`Updated subscription for user ${user.id} to ${planId}`)
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })

  } catch (error) {
    console.error('Error updating subscription plan:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    )
  }
})

function getPriceId(planType: string, isYearly: boolean): string | null {
  // Map plan IDs to Stripe price IDs (same as in create-stripe-subscription)
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

  const normalizedPlanType = planType.toLowerCase()
  
  if (normalizedPlanType === 'free') {
    return null // Free plan doesn't have a Stripe price ID
  }
  
  const planPrices = priceIds[normalizedPlanType]
  if (!planPrices) {
    return null
  }

  return isYearly ? planPrices.yearly : planPrices.monthly
} 