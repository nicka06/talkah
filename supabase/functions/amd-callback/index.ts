// @ts-nocheck
// @ts-ignore: Deno types
declare const Deno: any;

import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Twilio from 'https://esm.sh/twilio?target=deno'

const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID")!;
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN")!;

const corsHeaders = { 
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" 
};

// This function receives the AMD result from Twilio and writes it to the database
serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  try {
    const formData = await req.formData();
    const callSid = formData.get("CallSid") as string;
    const answeredBy = formData.get("AnsweredBy") as string;

    console.log(`AMD Callback received for ${callSid}. AnsweredBy: ${answeredBy}`);

    // We only care about machine detections. Humans are handled by the IVR prompt.
    if (answeredBy && (answeredBy === 'machine_start' || answeredBy === 'fax')) {
      console.log(`Machine detected for ${callSid}. Redirecting call to say goodbye.`);

      const twilioClient = new Twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>It looks like you couldn't connect with talkah, try again another time.</Say>
  <Hangup/>
</Response>`;

      // Use the Twilio API to redirect the live call to the new TwiML
      await twilioClient.calls(callSid).update({ twiml: twiml });
      
      console.log(`Call ${callSid} redirected to hangup TwiML.`);
    } else {
      console.log(`No machine detected for ${callSid} (${answeredBy}). No action taken.`);
    }

    // Respond to Twilio's webhook request
    return new Response("OK", { headers: { "Content-Type": "text/plain" } });

  } catch (error) {
    console.error("Error in amd-callback function:", error.message, error.stack);
    return new Response("Internal Server Error", { 
      status: 500, 
      headers: { "Content-Type": "text/plain" } 
    });
  }
}) 