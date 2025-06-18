import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// This function receives the AMD result from Twilio and writes it to the database
serve(async (req) => {
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  try {
    const params = new URL(req.url).searchParams;
    const callSid = params.get('CallSid');
    const answeredBy = params.get('AnsweredBy');

    if (!callSid || !answeredBy) {
      console.error('Missing CallSid or AnsweredBy in request');
      return new Response('Missing required parameters', { status: 400 });
    }

    console.log(`Received AMD result for CallSid: ${callSid}. AnsweredBy: ${answeredBy}`);

    const { error } = await supabaseClient
      .from('amd_waiting_room')
      .insert({ 
        call_sid: callSid, 
        answered_by: answeredBy 
      });

    if (error) {
      console.error('Error inserting AMD result into database:', error);
      throw error;
    }
    
    console.log(`Successfully inserted AMD result for ${callSid}`);
    return new Response("AMD result stored.", { status: 200 });

  } catch (error) {
    console.error('Error in amd-callback function:', error.message);
    return new Response(`Internal Server Error: ${error.message}`, { status: 500 });
  }
}) 