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
// @ts-ignore
const OPENAI_API_KEY = Deno.env.get("OpenAI_Key")!;

console.log('OpenAI API Key exists:', !!OPENAI_API_KEY);
console.log('OpenAI API Key length:', OPENAI_API_KEY?.length || 0);

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

    const { phone_number, topic, message_count } = await req.json();
    
    if (!phone_number || !topic || !message_count) {
      return new Response(JSON.stringify({ error: 'phone_number, topic, and message_count are required' }), {
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
        error: 'SMS conversation limit reached',
        usage_limit_reached: true 
      }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Initialize Twilio client
    const twilioClient = new Twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

    // Create SMS conversation record in database
    // @ts-ignore
    const { data: conversation, error: createError } = await supabase
      .from('sms_conversations')
      .insert({
        user_id: user.id,
        phone_number: phone_number,
        topic: topic,
        message_count: message_count,
        status: 'active',
        current_exchange: 0
      })
      .select()
      .single();

    if (createError) {
      console.error('Create SMS conversation error:', createError);
      return new Response(JSON.stringify({ error: 'Failed to create SMS conversation' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Generate first AI message using OpenAI
    console.log('Attempting OpenAI call with key length:', OPENAI_API_KEY?.length);
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `You are starting an SMS conversation about: ${topic}. This is the beginning of a ${message_count}-exchange conversation. Send a friendly opening message that introduces the topic and asks an engaging question. Keep it conversational and under 160 characters.`
          },
          {
            role: 'user',
            content: `Start a conversation about ${topic}.`
          }
        ],
        max_tokens: 150,
        temperature: 0.7
      })
    });

    if (!openaiResponse.ok) {
      console.error('OpenAI API error:', await openaiResponse.text());
      return new Response(JSON.stringify({ error: 'Failed to generate opening message' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const openaiData = await openaiResponse.json();
    // @ts-ignore
    const aiMessage = openaiData.choices[0]?.message?.content;

    if (!aiMessage) {
      console.log('No AI message generated, using fallback');
      // Use a fallback message if OpenAI fails
      const fallbackMessage = `Hi! Let's chat about ${topic}. What interests you most about this topic?`;
      
      // Send the fallback SMS message via Twilio
      try {
        const message = await twilioClient.messages.create({
          body: fallbackMessage,
          messagingServiceSid: TWILIO_MESSAGING_SERVICE_SID,
          to: phone_number
        });

        console.log(`Fallback SMS sent successfully. SID: ${message.sid}, Message: "${fallbackMessage}"`);

        // Save the sent message to database
        // @ts-ignore
        await supabase
          .from('sms_messages')
          .insert({
            conversation_id: conversation.id,
            twilio_message_sid: message.sid,
            direction: 'outbound',
            message_text: fallbackMessage,
            status: 'sent'
          });

        // Increment usage
        // @ts-ignore
        await supabase.rpc('increment_usage', { 
          user_uuid: user.id, 
          usage_type: 'texts' 
        });

        return new Response(JSON.stringify({
          success: true,
          conversation_id: conversation.id,
          first_message: fallbackMessage,
          message: 'SMS conversation started successfully (fallback message)',
          warning: 'OpenAI unavailable, used fallback message'
        }), {
          headers: { 'Content-Type': 'application/json' }
        });

      } catch (twilioError) {
        console.error('Twilio SMS error (fallback):', twilioError);
        
        // Update conversation status to failed
        // @ts-ignore
        await supabase
          .from('sms_conversations')
          .update({ status: 'failed' })
          .eq('id', conversation.id);

        return new Response(JSON.stringify({ error: 'Failed to send SMS' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    console.log(`AI message generated: "${aiMessage}"`);

    // Send the first SMS message via Twilio
    try {
      const message = await twilioClient.messages.create({
        body: aiMessage,
        messagingServiceSid: TWILIO_MESSAGING_SERVICE_SID,
        to: phone_number
      });

      console.log(`SMS sent successfully. SID: ${message.sid}, Message: "${aiMessage}"`);

      // Save the sent message to database
      // @ts-ignore
      await supabase
        .from('sms_messages')
        .insert({
          conversation_id: conversation.id,
          twilio_message_sid: message.sid,
          direction: 'outbound',
          message_text: aiMessage,
          status: 'sent'
        });

    } catch (twilioError) {
      console.error('Twilio SMS error:', twilioError);
      
      // Update conversation status to failed
      // @ts-ignore
      await supabase
        .from('sms_conversations')
        .update({ status: 'failed' })
        .eq('id', conversation.id);

      return new Response(JSON.stringify({ error: 'Failed to send SMS' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Increment usage
    // @ts-ignore
    await supabase.rpc('increment_usage', { 
      user_uuid: user.id, 
      usage_type: 'texts' 
    });

    return new Response(JSON.stringify({
      success: true,
      conversation_id: conversation.id,
      first_message: aiMessage,
      message: 'SMS conversation started successfully'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}); 