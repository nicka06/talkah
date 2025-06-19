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

  try {
    // Get the user from the Authorization header
    const authHeader = req.headers.get('Authorization')
    console.log('Auth header present:', !!authHeader)
    
    if (!authHeader) {
      console.error('No Authorization header provided')
      return new Response('Unauthorized - No auth header', { status: 401, headers: corsHeaders })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)

    console.log('User fetch result:', { user: !!user, userError })

    if (userError || !user) {
      console.error('User authentication failed:', userError)
      return new Response('Unauthorized - Invalid user', { status: 401, headers: corsHeaders })
    }

    console.log('Authenticated user ID:', user.id)

    // Get the user's Stripe customer ID
    const { data: userData, error: fetchError } = await supabase
      .from('users')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single()

    console.log('User data fetch result:', { userData, fetchError })

    if (fetchError) {
      console.error('Database error fetching user:', fetchError)
      return new Response(JSON.stringify({ error: 'Database error', details: fetchError }), { 
        status: 500, 
        headers: { 'Content-Type': 'application/json', ...corsHeaders } 
      })
    }

    if (!userData?.stripe_customer_id) {
      console.error('No Stripe customer ID found for user:', user.id)
      return new Response(JSON.stringify({ error: 'No Stripe customer found for this user. Please create a subscription first.' }), { 
        status: 404, 
        headers: { 'Content-Type': 'application/json', ...corsHeaders } 
      })
    }

    console.log('Found Stripe customer ID:', userData.stripe_customer_id)

    const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY')
    if (!stripeSecret) {
      console.error('STRIPE_SECRET_KEY environment variable not set')
      return new Response('Stripe configuration error', { status: 500, headers: corsHeaders })
    }

    // Create Stripe Customer Portal session
    const params = new URLSearchParams({
      'customer': userData.stripe_customer_id,
      'return_url': 'https://talkah.com/dashboard/subscription',
    })

    console.log('Creating Stripe customer portal session for customer:', userData.stripe_customer_id)

    const response = await fetch('https://api.stripe.com/v1/billing_portal/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeSecret}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
    })

    const session = await response.json()
    console.log('Stripe API response status:', response.status)
    console.log('Stripe API response:', session)

    if (!response.ok || !session.url) {
      console.error('Stripe API error:', session)
      return new Response(JSON.stringify({ 
        error: session.error || 'Failed to create Customer Portal session',
        stripeError: session,
        status: response.status
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    console.log('Successfully created customer portal session')
    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })

  } catch (error) {
    console.error('Unexpected error creating customer portal session:', error)
    return new Response(
      JSON.stringify({ error: error.message, stack: error.stack }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    )
  }
}) 