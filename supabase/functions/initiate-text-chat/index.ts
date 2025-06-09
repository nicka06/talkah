// @ts-ignore
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// @ts-ignore
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
// @ts-ignore
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

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

    // Get authenticated user
    // @ts-ignore
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Parse request body
    const { topic } = await req.json();
    if (!topic) {
      return new Response(JSON.stringify({ error: 'Topic is required' }), {
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
    
    // Check if user can start a new text conversation
    const limits = {
      free: { texts: 1 },
      pro: { texts: 10 },
      premium: { texts: -1 }
    };
    
    // @ts-ignore
    const tierLimit = limits[usage.tier as keyof typeof limits]?.texts || 1;
    if (tierLimit !== -1 && usage.texts_used >= tierLimit) {
      return new Response(JSON.stringify({ 
        error: 'Text conversation limit reached',
        usage_limit_reached: true 
      }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Create new text conversation
    // @ts-ignore
    const { data: conversation, error: createError } = await supabase
      .from('text_conversations')
      .insert({
        user_id: user.id,
        topic: topic,
        conversation_history: []
      })
      .select()
      .single();

    if (createError) {
      console.error('Create conversation error:', createError);
      return new Response(JSON.stringify({ error: 'Failed to create conversation' }), {
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
      topic: conversation.topic
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