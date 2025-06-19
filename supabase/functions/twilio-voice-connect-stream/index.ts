// @ts-nocheck
// @ts-ignore: Deno types
declare const Deno: any;

// @ts-ignore
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Environment variables
// @ts-ignore
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
// @ts-ignore
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
// @ts-ignore
const EXTERNAL_WEBSOCKET_SERVICE_URL = Deno.env.get("EXTERNAL_WEBSOCKET_SERVICE_URL")!;
// @ts-ignore
const FUNCTIONS_BASE_URL = Deno.env.get("FUNCTIONS_BASE_URL")!;

const corsHeaders = { 
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" 
};

serve(async (req: Request) => {
  console.log("twilio-voice-connect-stream function invoked.");

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const formData = await req.formData();
    const callSid = formData.get("CallSid") as string;
    const digits = formData.get("Digits") as string | null;

    console.log(`Request received for CallSid: ${callSid}, Digits: ${digits}`);

    if (!digits) {
      // First leg of the call, play the prompt and gather input
      console.log(`No digits pressed for ${callSid}. Playing welcome message and gathering input.`);
      const gatherTwiML = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather input="dtmf" timeout="5" numDigits="1" action="${FUNCTIONS_BASE_URL}twilio-voice-connect-stream" method="POST">
    <Say>Hello. To speak with our AI assistant, Talkah, please press 1.</Say>
  </Gather>
  <Say>It looks like you couldn't connect with talkah, try again another time.</Say>
  <Hangup/>
</Response>`;
      return new Response(gatherTwiML, { headers: { "Content-Type": "application/xml" } });
    }

    if (digits === '1') {
      // User pressed 1, connect them to the WebSocket stream
      console.log(`User pressed 1 for ${callSid}. Connecting to WebSocket.`);

      const { data: callData, error: fetchError } = await supabaseAdmin
        .from("calls")
        .select("topic")
        .eq("twilio_call_sid", callSid)
        .single();

      if (fetchError || !callData) {
        console.error("Error fetching call details or call not found:", fetchError?.message);
        throw new Error("Call record not found");
      }
      
      const topic = callData.topic;
      const encodedTopic = encodeURIComponent(topic);
      
      const connectTwiML = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Stream url="${EXTERNAL_WEBSOCKET_SERVICE_URL}">
      <Parameter name="callSid" value="${callSid}"/>
      <Parameter name="topic" value="${encodedTopic}"/>
    </Stream>
  </Connect>
</Response>`;
      console.log(`Responding with TwiML to connect ${callSid}: ${connectTwiML}`);
      return new Response(connectTwiML, { headers: { "Content-Type": "application/xml" } });

    } else {
      // User pressed something other than 1
      console.log(`User pressed '${digits}' for ${callSid}. Hanging up.`);
      const hangupTwiML = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>You have pressed an invalid key. Goodbye.</Say>
  <Hangup/>
</Response>`;
      return new Response(hangupTwiML, { headers: { "Content-Type": "application/xml" } });
    }

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