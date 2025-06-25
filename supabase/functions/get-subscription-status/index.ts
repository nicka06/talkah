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

    // Get comprehensive user data with subscription info
    const { data: userData, error: fetchError } = await supabase
      .from('users')
      .select(`
        subscription_plan_id,
        subscription_status,
        billing_cycle_start,
        billing_cycle_end,
        billing_interval,
        stripe_customer_id,
        pending_plan_id,
        plan_change_effective_date,
        plan_change_type
      `)
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

    console.log('Successfully retrieved subscription status for user:', user.id)
    return new Response(JSON.stringify(userData), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })

  } catch (error) {
    console.error('Unexpected error getting subscription status:', error)
    return new Response(
      JSON.stringify({ error: error.message, stack: error.stack }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    )
  }
}) 