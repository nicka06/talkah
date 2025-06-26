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

    // Step 1: Get the user's stripe_customer_id from the 'users' table
    const { data: userData, error: userFetchError } = await supabase
      .from('users')
      .select('stripe_customer_id, subscription_plan_id')
      .eq('id', user.id)
      .single()

    if (userFetchError) {
      console.error('Database error fetching user:', userFetchError)
      return new Response(JSON.stringify({ error: 'Database error', details: userFetchError }), { 
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
    
    // Step 2: Get the stripe_subscription_id from the 'subscriptions' table
    const { data: subData, error: subFetchError } = await supabase
      .from('subscriptions')
      .select('stripe_subscription_id')
      .eq('user_id', user.id)
      .single()

    if (subFetchError) {
      console.error('Database error fetching subscription:', subFetchError)
      return new Response(JSON.stringify({ error: 'Database error', details: subFetchError }), {
        status: 500,
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
      if (subData.stripe_subscription_id) {
        const response = await fetch(`https://api.stripe.com/v1/subscriptions/${subData.stripe_subscription_id}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${stripeSecret}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            'cancel_at_period_end': 'true',
          }),
        })

        const subscription = await response.json();

        if (!response.ok) {
          console.error('Stripe API error:', subscription)
          return new Response(JSON.stringify({ error: 'Failed to schedule downgrade' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
          })
        }
        
        console.log('Received subscription object from Stripe:', JSON.stringify(subscription, null, 2));

        // Defensive check: Ensure the subscription object is valid before proceeding
        if (!subscription.items.data[0].current_period_end) {
          console.error('Stripe subscription object is missing current_period_end. The subscription may be in an incomplete or already canceled state.');
          return new Response(JSON.stringify({ error: 'Subscription is in an invalid state and cannot be updated.' }), {
            status: 400, // Bad Request, as the subscription state is the issue
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
          });
        }

        // Immediately record the pending change in the database for instant UI feedback
        const effectiveDate = new Date(subscription.items.data[0].current_period_end * 1000);
        const fromPlanId = getPlanIdFromPriceId(subscription.items.data[0].price.id) ?? userData.subscription_plan_id;

        // 1. Update the 'users' table
        const { error: updateUserError } = await supabase.from('users').update({
          pending_plan_id: 'free',
          plan_change_effective_date: effectiveDate.toISOString().split('T')[0],
          plan_change_type: 'downgrade',
          plan_change_requested_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }).eq('id', user.id);

        if (updateUserError) {
          console.error('Failed to update users table with pending change:', updateUserError);
          return new Response(JSON.stringify({ error: 'Database update failed (users table).', details: updateUserError }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
          });
        }

        // 2. Insert into the 'plan_changes' table
        const { error: insertPlanChangeError } = await supabase.from('plan_changes').insert({
          user_id: user.id,
          from_plan_id: fromPlanId,
          to_plan_id: 'free',
          change_type: 'downgrade',
          effective_date: effectiveDate.toISOString().split('T')[0],
          status: 'pending',
          stripe_subscription_id: subscription.id,
          notes: 'Downgrade to free requested from app',
        });

        if (insertPlanChangeError) {
          console.error('Failed to insert into plan_changes table:', insertPlanChangeError);
          return new Response(JSON.stringify({ error: 'Database update failed (plan_changes table).', details: insertPlanChangeError }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
          });
        }

        console.log(`Scheduled downgrade for user ${user.id} and recorded pending change.`);
      }
    } else {
      // For upgrades and billing switches, update the subscription immediately
      if (subData.stripe_subscription_id) {
        const priceId = getPriceId(planId, isYearly)
        if (!priceId) {
          return new Response(JSON.stringify({ error: 'Invalid plan type' }), { 
            status: 400, 
            headers: { 'Content-Type': 'application/json', ...corsHeaders } 
          })
        }

        const response = await fetch(`https://api.stripe.com/v1/subscriptions/${subData.stripe_subscription_id}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${stripeSecret}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            'items[0][id]': 'si_' + subData.stripe_subscription_id.split('_')[1], // Get subscription item ID
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

function getPlanIdFromPriceId(priceId: string): string {
  // Map Stripe Price IDs to our plan IDs
  const priceToPlanMap: { [key: string]: string } = {
    'price_1RYAcH04AHhaKcz1zSaXyJHS': 'pro', // Pro Monthly
    'price_1RYAcj04AHhaKcz1jZEqaw58': 'pro', // Pro Yearly
    'price_1RYAd904AHhaKcz1sfdexopq': 'premium', // Premium Monthly
    'price_1RYAdU04AHhaKcz1ZXsoCLdh': 'premium', // Premium Annual
  };
  return priceToPlanMap[priceId] || 'free';
} 