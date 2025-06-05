import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Environment variables that will need to be set in Supabase Dashboard
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const EXTERNAL_WEBSOCKET_SERVICE_URL = Deno.env.get("EXTERNAL_WEBSOCKET_SERVICE_URL")!; // e.g., wss://your-websocket-app.fly.dev

serve(async (req: Request) => {
  console.log("twilio-voice-connect-stream function invoked.");

  // 1. Handle CORS (though less critical for Twilio webhooks, good practice)
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: { 
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" 
    }});
  }

  try {
    // 2. Extract CallSid from the request
    const url = new URL(req.url);
    let callSid = url.searchParams.get("CallSid");

    if (!callSid && req.method === "POST") {
        try {
            const formData = await req.formData();
            callSid = formData.get("CallSid") as string | null;
        } catch (e) {
            console.warn("Could not parse form data, or not a form data request:", e.message);
        }
    }
    
    if (!callSid) {
      console.error("CallSid not found in request.");
      return new Response(JSON.stringify({ error: "CallSid is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    console.log(`Received CallSid: ${callSid}`);

    // 3. Initialize Supabase client
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 4. Fetch the topic for this call from the 'calls' table
    const { data: callData, error: fetchError } = await supabaseAdmin
      .from("calls")
      .select("topic")
      .eq("twilio_call_sid", callSid)
      .single();

    if (fetchError || !callData) {
      console.error("Error fetching call details or call not found:", fetchError?.message);
      const hangupTwiML = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>An error occurred, please try again later.</Say>
  <Hangup/>
</Response>`;
      return new Response(hangupTwiML, { headers: { "Content-Type": "application/xml" } });
    }
    const topic = callData.topic;
    console.log(`Topic for call ${callSid}: ${topic}`);

    // 5. Update the call record: status to 'answered', set answered_time
    const { error: updateError } = await supabaseAdmin
      .from("calls")
      .update({ status: "answered", answered_time: new Date().toISOString() })
      .eq("twilio_call_sid", callSid);

    if (updateError) {
      console.error("Error updating call status to answered:", updateError.message);
    } else {
      console.log(`Call ${callSid} status updated to answered.`);
    }

    // 6. Construct TwiML with <Connect><Stream>
    const streamBaseUrl = `${EXTERNAL_WEBSOCKET_SERVICE_URL}/ws/audio-stream`;
    const encodedTopic = encodeURIComponent(topic); // Still encode topic just in case for parameter value
    
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Stream url="${streamBaseUrl}">
      <Parameter name="callSid" value="${callSid}"/>
      <Parameter name="topic" value="${encodedTopic}"/>
    </Stream>
  </Connect>
</Response>`;

    console.log(`Responding with TwiML: ${twiml}`);

    // 7. Return TwiML response
    return new Response(twiml, { headers: { "Content-Type": "application/xml" } });

  } catch (error) {
    console.error("Error in twilio-voice-connect-stream function:", error.message, error.stack);
    const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>An internal server error occurred.</Say>
  <Hangup/>
</Response>`;
    return new Response(errorTwiml, { 
      status: 500, 
      headers: { "Content-Type": "application/xml" } 
    });
  }
}); 