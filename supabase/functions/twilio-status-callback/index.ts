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
  console.log("🔔 TWILIO CALLBACK: Function invoked at", new Date().toISOString());
  console.log("🔔 Request method:", req.method);
  console.log("🔔 Request URL:", req.url);

  // Handle CORS
  if (req.method === "OPTIONS") {
    console.log("🔔 CORS preflight request");
    return new Response("ok", { 
      headers: { 
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" 
      }
    });
  }

  if (req.method !== "POST") {
    console.log("❌ TWILIO CALLBACK: Non-POST method:", req.method);
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    // Parse Twilio webhook data (form-encoded)
    const formData = await req.formData();
    console.log("🔔 TWILIO CALLBACK: Received form data");
    
    // Log ALL form data for debugging
    for (const [key, value] of formData.entries()) {
      console.log(`🔔 Form field: ${key} = ${value}`);
    }
    
    // Extract Twilio call data
    const callSid = formData.get('CallSid') as string;
    const callStatus = formData.get('CallStatus') as string;
    const callDuration = formData.get('CallDuration') as string;
    const from = formData.get('From') as string;
    const to = formData.get('To') as string;
    const direction = formData.get('Direction') as string;

    if (!callSid || !callStatus) {
      console.error('❌ TWILIO CALLBACK: Missing required webhook data: CallSid or CallStatus');
      return new Response("Bad request", { status: 400 });
    }

    console.log(`🔔 TWILIO CALLBACK: Processing - CallSid=${callSid}, Status=${callStatus}, Duration=${callDuration}`);

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

    console.log(`🔔 TWILIO CALLBACK: Updating call record with data:`, updateData);

    // @ts-ignore
    const { data, error } = await supabase
      .from('calls')
      .update(updateData)
      .eq('twilio_call_sid', callSid)
      .select();

    if (error) {
      console.error('❌ TWILIO CALLBACK: Database update error:', error);
      // Don't return error to Twilio - we still want to acknowledge the webhook
    } else {
      console.log(`✅ TWILIO CALLBACK: Successfully updated call ${callSid} with status ${callStatus}`);
      console.log(`🔔 TWILIO CALLBACK: Updated records:`, data);
    }

    // Handle usage tracking for completed calls
    console.log(`🔔 TWILIO CALLBACK: Checking usage tracking conditions...`);
    console.log(`🔔 Status check: callStatus.toLowerCase() === 'completed'? ${callStatus.toLowerCase() === 'completed'}`);
    console.log(`🔔 Data check: data && data.length > 0? ${data && data.length > 0}`);
    
    if (callStatus.toLowerCase() === 'completed' && data && data.length > 0) {
      const callRecord = data[0];
      console.log(`🔔 TWILIO CALLBACK: Call record for usage tracking:`, callRecord);
      
      // If we have user_id, increment their usage
      if (callRecord.user_id) {
        console.log(`🔔 TWILIO CALLBACK: Attempting to increment usage for user ${callRecord.user_id}`);
        try {
          // @ts-ignore
          const usageResult = await supabase.rpc('increment_usage', { 
            user_uuid: callRecord.user_id, 
            usage_type: 'calls' 
          });
          console.log(`✅ TWILIO CALLBACK: Usage increment result:`, usageResult);
          console.log(`✅ TWILIO CALLBACK: Incremented usage for user ${callRecord.user_id}`);
        } catch (usageError) {
          console.error('❌ TWILIO CALLBACK: Usage increment error:', usageError);
          // Don't fail the webhook for usage errors
        }
      } else {
        console.log(`⚠️ TWILIO CALLBACK: No user_id found in call record, cannot increment usage`);
      }
    } else {
      console.log(`⚠️ TWILIO CALLBACK: Usage tracking conditions not met`);
      if (callStatus.toLowerCase() !== 'completed') {
        console.log(`⚠️ Call status "${callStatus}" is not "completed"`);
      }
      if (!data || data.length === 0) {
        console.log(`⚠️ No data returned from database update`);
      }
    }

    // Return success response to Twilio (important!)
    console.log(`🔔 TWILIO CALLBACK: Sending OK response to Twilio`);
    return new Response("OK", { 
      status: 200,
      headers: { "Content-Type": "text/plain" }
    });

  } catch (error) {
    console.error('❌ TWILIO CALLBACK: Error processing Twilio status callback:', error);
    
    // Return success even on error to prevent Twilio retries
    // Log the error but don't let it break the webhook
    return new Response("OK", { 
      status: 200,
      headers: { "Content-Type": "text/plain" }
    });
  }
}); 