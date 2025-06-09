// @ts-nocheck
// @ts-ignore: Deno types
declare const Deno: any;

// @ts-ignore
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
// @ts-ignore
import Twilio from 'https://esm.sh/twilio?target=deno';

// @ts-ignore
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
// @ts-ignore
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
// @ts-ignore
const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID")!;
// @ts-ignore
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN")!;
// @ts-ignore
const YOUR_TWILIO_PHONE_NUMBER = Deno.env.get("YOUR_TWILIO_PHONE_NUMBER")!;
// @ts-ignore
const TWILIO_MESSAGING_SERVICE_SID = Deno.env.get("TWILIO_MESSAGING_SERVICE_SID")!;

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { 
      headers: { 
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
      }
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

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
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { phone_number, message_text } = await req.json();
    
    if (!phone_number || !message_text) {
      return new Response(JSON.stringify({ error: 'phone_number and message_text are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check usage limits
    // @ts-ignore
    const { data: usageData } = await supabase
      .rpc('get_current_month_usage', { user_uuid: user.id });
    
    // @ts-ignore
    const usage = usageData[0] || { calls_used: 0, texts_used: 0, emails_used: 0, tier: 'free' };
    
    const limits = {
      free: { texts: 1 },
      pro: { texts: 10 },
      premium: { texts: -1 }
    };
    
    // @ts-ignore
    const tierLimit = limits[usage.tier as keyof typeof limits]?.texts || 1;
    if (tierLimit !== -1 && usage.texts_used >= tierLimit) {
      return new Response(JSON.stringify({ 
        error: 'SMS limit reached',
        usage_limit_reached: true 
      }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Initialize Twilio client
    const twilioClient = new Twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

    // Send SMS message via Twilio
    try {
      const twilioMessage = await twilioClient.messages.create({
        body: message_text,
        messagingServiceSid: TWILIO_MESSAGING_SERVICE_SID,
        to: phone_number
      });

      // Save the sent message to database
      // @ts-ignore
      await supabase
        .from('sms_messages')
        .insert({
          user_id: user.id,
          phone_number: phone_number,
          twilio_message_sid: twilioMessage.sid,
          direction: 'outbound',
          message_text: message_text,
          type: 'single',
          status: 'sent'
        });

      console.log(`Single SMS sent successfully. SID: ${twilioMessage.sid}`);

      // Increment usage
      // @ts-ignore
      await supabase.rpc('increment_usage', { 
        user_uuid: user.id, 
        usage_type: 'texts' 
      });

      return new Response(JSON.stringify({
        success: true,
        message_sid: twilioMessage.sid,
        message: 'SMS sent successfully'
      }), {
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (twilioError) {
      console.error('Twilio SMS error:', twilioError);
      return new Response(JSON.stringify({ error: 'Failed to send SMS' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}); 