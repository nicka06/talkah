// @ts-nocheck
// @ts-ignore: Deno types
declare const Deno: any;

// supabase/functions/initiate-call/index.ts
// @ts-ignore
import { serve } from "https://deno.land/std@0.177.0/http/server.ts"; // Use a more recent std version
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'; // Supabase JS client
// @ts-ignore
import Twilio from 'https://esm.sh/twilio?target=deno'; // Twilio SDK

// IMPORTANT: Set these in your Supabase project's Function settings or .env file for local dev
// @ts-ignore
const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID")!;
// @ts-ignore
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN")!;
// @ts-ignore
const YOUR_TWILIO_PHONE_NUMBER = Deno.env.get("YOUR_TWILIO_PHONE_NUMBER")!;
// @ts-ignore
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
// @ts-ignore
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
// @ts-ignore
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

// This is the publicly accessible URL of your Supabase project (or ngrok for local testing)
// It needs to point to where your *other* Edge Functions will be served from.
// For example, if your project is 'xyz', it might be `https://xyz.supabase.co/functions/v1/`
// Or for local dev with `supabase start`, usually `http://localhost:54321/functions/v1/`
// @ts-ignore
const FUNCTIONS_BASE_URL = Deno.env.get("FUNCTIONS_BASE_URL")!;
const WEBSOCKET_SERVER_URL = Deno.env.get("EXTERNAL_WEBSOCKET_SERVICE_URL")!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  // 1. Handle CORS if needed (especially for local testing from a browser/Flutter app)
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 2. Check authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    // Create Supabase client with user's JWT for authentication
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: { Authorization: authHeader }
      }
    });

    // @ts-ignore
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    console.log(`Authenticated user: ${user.id}`);

    // 3. Parse request body
    const { user_phone_number, topic } = await req.json();

    if (!user_phone_number || !topic) {
      return new Response(
        JSON.stringify({ error: "Missing user_phone_number or topic" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }

    // 4. Check usage limits before making call
    const { data: usageData, error: rpcError } = await supabase
      .rpc('get_current_month_usage', { user_uuid: user.id });

    if (rpcError) {
      console.error('Error fetching user usage:', rpcError);
      throw new Error('Could not verify user usage.');
    }
    
    const usage = usageData[0] || { calls_used: 0, tier: 'Free' };
    const userTier = usage.tier || 'Free';

    // Initialize Supabase admin client for service operations
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch the plan details from the database to get the real limit
    const { data: planData, error: planError } = await supabaseAdmin
        .from('subscription_plans')
        .select('phone_calls_limit')
        .eq('name', userTier)
        .single();
    
    if (planError) {
        console.error(`Could not find plan details for tier: ${userTier}`, planError);
        throw new Error(`Invalid subscription tier: ${userTier}`);
    }

    const tierLimit = planData.phone_calls_limit;
    
    if (tierLimit !== -1 && usage.calls_used >= tierLimit) {
      return new Response(JSON.stringify({ 
        error: 'Phone call limit reached',
        usage_limit_reached: true 
      }), {
        status: 403,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    // 5. Initialize Twilio client
    const twilioClient = new Twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

    // 6. Construct TwiML webhook URL
    // This URL will now point to our always-on websocket server on Fly.io
    const twimlWebhookUrl = WEBSOCKET_SERVER_URL.replace('wss://', 'https://').replace('ws://', 'http://') + '/twilio-voice';
    const amdWebhookUrl = `${FUNCTIONS_BASE_URL}amd-callback`;

    // 7. Make the outbound call using Twilio
    const call = await twilioClient.calls.create({
      to: user_phone_number,
      from: YOUR_TWILIO_PHONE_NUMBER,
      url: twimlWebhookUrl, // Twilio will POST to this URL when the call connects
      method: "POST",
      statusCallback: `${FUNCTIONS_BASE_URL}twilio-status-callback`, // For call status updates
      statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed', 'failed'],
      // Add Asynchronous Answering Machine Detection (AMD)
      machineDetection: 'Enable',
      asyncAmd: true,
      asyncAmdStatusCallback: amdWebhookUrl,
      asyncAmdStatusCallbackMethod: 'POST'
    });

    console.log(`Twilio call initiated. SID: ${call.sid}`);

    // 8. Store initial call details in Supabase with user_id
    // @ts-ignore
    const { data: callRecord, error: dbError } = await supabaseAdmin
      .from("calls")
      .insert({
        user_id: user.id, // Associate call with authenticated user
        user_phone_number: user_phone_number,
        topic: topic,
        twilio_call_sid: call.sid,
        status: "initiated", // Initial status
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (dbError) {
      console.error("Database error:", dbError);
      // Optional: Try to cancel/update the Twilio call if DB write fails critically
      return new Response(
        JSON.stringify({ error: "Failed to store call record", details: dbError.message }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }

    console.log("Call record stored in Supabase:", callRecord);

    // 9. Return success response
    return new Response(
      JSON.stringify({ success: true, message: "Call initiated successfully!", twilio_call_sid: call.sid, call_record_id: callRecord.id }),
      { headers: { "Content-Type": "application/json", ...corsHeaders } },
    );

  } catch (error) {
    console.error("Error in initiate-call function:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } },
    );
  }
});