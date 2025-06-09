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
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
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
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    // Use service role key for webhook (no user auth required)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Parse Twilio webhook data (form-encoded)
    const formData = await req.formData();
    const messageBody = formData.get('Body') as string;
    const fromNumber = formData.get('From') as string;
    const toNumber = formData.get('To') as string;
    const messageSid = formData.get('MessageSid') as string;

    if (!messageBody || !fromNumber || !messageSid) {
      console.error('Missing required webhook data');
      return new Response("Bad request", { status: 400 });
    }

    console.log(`Received SMS from ${fromNumber}: ${messageBody}`);

    // Find active conversation for this phone number
    // @ts-ignore
    const { data: conversation, error: convError } = await supabase
      .from('sms_conversations')
      .select('*')
      .eq('phone_number', fromNumber)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (convError || !conversation) {
      console.log('No active conversation found for', fromNumber);
      // Just save the message as inbound but don't respond
      // @ts-ignore
      await supabase
        .from('sms_messages')
        .insert({
          user_id: null, // We don't know the user for standalone messages
          phone_number: fromNumber,
          twilio_message_sid: messageSid,
          direction: 'inbound',
          message_text: messageBody,
          type: 'standalone',
          status: 'received'
        });

      return new Response('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
        headers: { 'Content-Type': 'text/xml' }
      });
    }

    // Save the incoming message
    // @ts-ignore
    await supabase
      .from('sms_messages')
      .insert({
        conversation_id: conversation.id,
        user_id: conversation.user_id,
        phone_number: fromNumber,
        twilio_message_sid: messageSid,
        direction: 'inbound',
        message_text: messageBody,
        type: 'ai_conversation',
        status: 'received'
      });

    // Check if conversation has reached max exchanges
    const currentExchange = conversation.current_exchange + 1;
    if (currentExchange >= conversation.message_count) {
      console.log(`Conversation ${conversation.id} completed (${currentExchange}/${conversation.message_count})`);
      
      // Mark conversation as completed
      // @ts-ignore
      await supabase
        .from('sms_conversations')
        .update({ 
          status: 'completed',
          current_exchange: currentExchange,
          updated_at: new Date().toISOString()
        })
        .eq('id', conversation.id);

      // Send final message
      const twilioClient = new Twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
      const finalMessage = "Thanks for the conversation! This AI chat has reached its planned conclusion. Feel free to start a new conversation anytime.";
      
      try {
        const message = await twilioClient.messages.create({
          body: finalMessage,
          messagingServiceSid: TWILIO_MESSAGING_SERVICE_SID,
          to: fromNumber
        });

        // Save final message
        // @ts-ignore
        await supabase
          .from('sms_messages')
          .insert({
            conversation_id: conversation.id,
            user_id: conversation.user_id,
            phone_number: fromNumber,
            twilio_message_sid: message.sid,
            direction: 'outbound',
            message_text: finalMessage,
            type: 'ai_conversation',
            status: 'sent'
          });

      } catch (error) {
        console.error('Error sending final message:', error);
      }

      return new Response('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
        headers: { 'Content-Type': 'text/xml' }
      });
    }

    // Get conversation history for context
    // @ts-ignore
    const { data: messageHistory } = await supabase
      .from('sms_messages')
      .select('direction, message_text')
      .eq('conversation_id', conversation.id)
      .order('created_at', { ascending: true });

    // Build conversation context for OpenAI
    const conversationHistory = messageHistory?.map((msg: any) => ({
      role: msg.direction === 'outbound' ? 'assistant' : 'user',
      content: msg.message_text
    })) || [];

    // Generate AI response using OpenAI
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
            content: `You are continuing an SMS conversation about: ${conversation.topic}. This is exchange ${currentExchange} of ${conversation.message_count}. Keep responses conversational, engaging, and under 160 characters. Build on the conversation naturally.`
          },
          ...conversationHistory,
          {
            role: 'user',
            content: messageBody
          }
        ],
        max_tokens: 150,
        temperature: 0.7
      })
    });

    if (!openaiResponse.ok) {
      console.error('OpenAI API error:', await openaiResponse.text());
      throw new Error('Failed to generate AI response');
    }

    const openaiData = await openaiResponse.json();
    // @ts-ignore
    const aiResponse = openaiData.choices[0]?.message?.content;

    if (!aiResponse) {
      throw new Error('No AI response generated');
    }

    // Send AI response via Twilio
    const twilioClient = new Twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
    
    try {
      const message = await twilioClient.messages.create({
        body: aiResponse,
        messagingServiceSid: TWILIO_MESSAGING_SERVICE_SID,
        to: fromNumber
      });

      // Save AI response
      // @ts-ignore
      await supabase
        .from('sms_messages')
        .insert({
          conversation_id: conversation.id,
          user_id: conversation.user_id,
          phone_number: fromNumber,
          twilio_message_sid: message.sid,
          direction: 'outbound',
          message_text: aiResponse,
          type: 'ai_conversation',
          status: 'sent'
        });

      // Update conversation exchange count
      // @ts-ignore
      await supabase
        .from('sms_conversations')
        .update({ 
          current_exchange: currentExchange,
          updated_at: new Date().toISOString()
        })
        .eq('id', conversation.id);

      console.log(`AI response sent successfully. Exchange ${currentExchange}/${conversation.message_count}`);

    } catch (twilioError) {
      console.error('Twilio send error:', twilioError);
      throw twilioError;
    }

    // Return empty TwiML response
    return new Response('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
      headers: { 'Content-Type': 'text/xml' }
    });

  } catch (error) {
    console.error('Webhook error:', error);
    
    // Return empty TwiML response even on error to avoid webhook retries
    return new Response('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
      headers: { 'Content-Type': 'text/xml' }
    });
  }
}); 