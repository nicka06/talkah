// @ts-ignore
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// @ts-ignore
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
// @ts-ignore
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
// @ts-ignore
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;

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

    const { conversation_id, message } = await req.json();
    if (!conversation_id || !message) {
      return new Response(JSON.stringify({ error: 'conversation_id and message are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get the conversation
    // @ts-ignore
    const { data: conversation, error: fetchError } = await supabase
      .from('text_conversations')
      .select('*')
      .eq('id', conversation_id)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !conversation) {
      return new Response(JSON.stringify({ error: 'Conversation not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Add user message to history
    // @ts-ignore
    const conversationHistory = conversation.conversation_history || [];
    conversationHistory.push({
      role: 'user',
      content: message,
      timestamp: new Date().toISOString()
    });

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
            content: `You are having a conversation about: ${conversation.topic}. Be helpful, engaging, and stay on topic. Keep responses conversational and not too long.`
          },
          // @ts-ignore
          ...conversationHistory.map(msg => ({
            role: msg.role,
            content: msg.content
          }))
        ],
        max_tokens: 500,
        temperature: 0.7
      })
    });

    if (!openaiResponse.ok) {
      console.error('OpenAI API error:', await openaiResponse.text());
      return new Response(JSON.stringify({ error: 'Failed to generate AI response' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const openaiData = await openaiResponse.json();
    // @ts-ignore
    const aiMessage = openaiData.choices[0]?.message?.content;

    if (!aiMessage) {
      return new Response(JSON.stringify({ error: 'Failed to generate AI response' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Add AI response to history
    conversationHistory.push({
      role: 'assistant',
      content: aiMessage,
      timestamp: new Date().toISOString()
    });

    // Update conversation in database
    // @ts-ignore
    const { error: updateError } = await supabase
      .from('text_conversations')
      .update({
        conversation_history: conversationHistory,
        updated_at: new Date().toISOString()
      })
      .eq('id', conversation_id);

    if (updateError) {
      console.error('Update error:', updateError);
      return new Response(JSON.stringify({ error: 'Failed to update conversation' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      ai_response: aiMessage,
      conversation_history: conversationHistory
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