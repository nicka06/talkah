// supabase/functions/initiate-call/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts"; // Use a more recent std version
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'; // Supabase JS client
import Twilio from 'https://esm.sh/twilio?target=deno'; // Twilio SDK

// IMPORTANT: Set these in your Supabase project's Function settings or .env file for local dev
const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID")!;
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN")!;
const YOUR_TWILIO_PHONE_NUMBER = Deno.env.get("YOUR_TWILIO_PHONE_NUMBER")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// This is the publicly accessible URL of your Supabase project (or ngrok for local testing)
// It needs to point to where your *other* Edge Functions will be served from.
// For example, if your project is 'xyz', it might be `https://xyz.supabase.co/functions/v1/`
// Or for local dev with `supabase start`, usually `http://localhost:54321/functions/v1/`
const FUNCTIONS_BASE_URL = Deno.env.get("FUNCTIONS_BASE_URL")!;


serve(async (req: Request) => {
  // 1. Handle CORS if needed (especially for local testing from a browser/Flutter app)
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: { 
      "Access-Control-Allow-Origin": "*", // Be more specific in production
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
    }});
  }

  try {
    // 2. Parse request body
    const { user_phone_number, topic } = await req.json();

    if (!user_phone_number || !topic) {
      return new Response(
        JSON.stringify({ error: "Missing user_phone_number or topic" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    // 3. Initialize Supabase client (using service_role key for admin privileges)
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 4. Initialize Twilio client
    const twilioClient = new Twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

    // 5. Construct TwiML webhook URL
    // This URL will point to your 'twilio-voice-connect-stream' Edge Function
    // It needs to be publicly accessible by Twilio.
    const twimlWebhookUrl = `${FUNCTIONS_BASE_URL}twilio-voice-connect-stream`;
    // Note: We might need to pass the 'topic' to the next function.
    // One way is via query param, but ensure it's URL encoded.
    // Or, the next function could fetch it from the DB using CallSid.
    // For now, let's keep it simple and assume the next function can fetch if needed.

    // 6. Make the outbound call using Twilio
    const call = await twilioClient.calls.create({
      to: user_phone_number,
      from: YOUR_TWILIO_PHONE_NUMBER,
      url: twimlWebhookUrl, // Twilio will GET this URL when the call connects
      method: "GET", // Method Twilio will use to request the TwiML URL
      statusCallback: `${FUNCTIONS_BASE_URL}twilio-status-callback`, // For call status updates
      statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed', 'failed'],
    });

    console.log(`Twilio call initiated. SID: ${call.sid}`);

    // 7. Store initial call details in Supabase
    const { data: callRecord, error: dbError } = await supabaseAdmin
      .from("calls")
      .insert({
        user_phone_number: user_phone_number,
        topic: topic,
        twilio_call_sid: call.sid,
        status: "initiated", // Initial status
        // user_id: (await supabaseAdmin.auth.getUser()).data.user?.id // If user is authenticated
      })
      .select()
      .single();

    if (dbError) {
      console.error("Database error:", dbError);
      // Optional: Try to cancel/update the Twilio call if DB write fails critically
      return new Response(
        JSON.stringify({ error: "Failed to store call record", details: dbError.message }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }

    console.log("Call record stored in Supabase:", callRecord);

    // 8. Return success response
    return new Response(
      JSON.stringify({ success: true, message: "Call initiated successfully!", twilio_call_sid: call.sid, call_record_id: callRecord.id }),
      { headers: { "Content-Type": "application/json" } },
    );

  } catch (error) {
    console.error("Error in initiate-call function:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});