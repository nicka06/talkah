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

serve(async (req: Request) => {
  console.log("twilio-status-callback function invoked.");

  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { 
      headers: { 
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" 
      }
    });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    // Parse Twilio webhook data (form-encoded)
    const formData = await req.formData();
    
    // Extract Twilio call data
    const callSid = formData.get('CallSid') as string;
    const callStatus = formData.get('CallStatus') as string;
    const callDuration = formData.get('CallDuration') as string;
    const from = formData.get('From') as string;
    const to = formData.get('To') as string;
    const direction = formData.get('Direction') as string;

    if (!callSid || !callStatus) {
      console.error('Missing required webhook data: CallSid or CallStatus');
      return new Response("Bad request", { status: 400 });
    }

    console.log(`Received status update: CallSid=${callSid}, Status=${callStatus}, Duration=${callDuration}`);

    // Initialize Supabase client with service role key
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Update call record in database
    const updateData: any = {
      status: callStatus.toLowerCase(),
      updated_at: new Date().toISOString()
    };

    // Add additional data based on call status
    switch (callStatus.toLowerCase()) {
      case 'initiated':
        updateData.initiated_time = new Date().toISOString();
        break;
      case 'ringing':
        updateData.ringing_time = new Date().toISOString();
        break;
      case 'answered':
      case 'in-progress':
        updateData.answered_time = new Date().toISOString();
        break;
      case 'completed':
      case 'busy':
      case 'failed':
      case 'no-answer':
      case 'canceled':
        updateData.ended_time = new Date().toISOString();
        if (callDuration) {
          updateData.duration_seconds = parseInt(callDuration);
        }
        break;
    }

    // @ts-ignore
    const { data, error } = await supabase
      .from('calls')
      .update(updateData)
      .eq('twilio_call_sid', callSid)
      .select();

    if (error) {
      console.error('Database update error:', error);
      // Don't return error to Twilio - we still want to acknowledge the webhook
    } else {
      console.log(`Successfully updated call ${callSid} with status ${callStatus}`);
    }

    // Handle usage tracking for completed calls
    if (callStatus.toLowerCase() === 'completed' && data && data.length > 0) {
      const callRecord = data[0];
      
      // If we have user_id, increment their usage
      if (callRecord.user_id) {
        try {
          // @ts-ignore
          await supabase.rpc('increment_usage', { 
            user_uuid: callRecord.user_id, 
            usage_type: 'calls' 
          });
          console.log(`Incremented usage for user ${callRecord.user_id}`);
        } catch (usageError) {
          console.error('Usage increment error:', usageError);
          // Don't fail the webhook for usage errors
        }
      }
    }

    // Return success response to Twilio (important!)
    return new Response("OK", { 
      status: 200,
      headers: { "Content-Type": "text/plain" }
    });

  } catch (error) {
    console.error('Error processing Twilio status callback:', error);
    
    // Return success even on error to prevent Twilio retries
    // Log the error but don't let it break the webhook
    return new Response("OK", { 
      status: 200,
      headers: { "Content-Type": "text/plain" }
    });
  }
}); 