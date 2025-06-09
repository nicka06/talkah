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

  try {
    // Get the Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Initialize Supabase client with user's JWT
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: { Authorization: authHeader }
      }
    });

    // Get the authenticated user
    // @ts-ignore
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get current usage and tier
    // @ts-ignore
    const { data: usageData, error: usageError } = await supabase
      .rpc('get_current_month_usage', { user_uuid: user.id });

    if (usageError) {
      console.error('Usage error:', usageError);
      return new Response(JSON.stringify({ error: 'Failed to fetch usage data' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // @ts-ignore
    const usage = usageData[0] || { calls_used: 0, texts_used: 0, emails_used: 0, tier: 'free' };

    // Define limits based on tier
    const limits = {
      free: { calls: 1, texts: 1, emails: 1 },
      pro: { calls: 5, texts: 10, emails: -1 }, // -1 = unlimited
      premium: { calls: -1, texts: -1, emails: -1 }
    };

    // @ts-ignore
    const tierLimits = limits[usage.tier as keyof typeof limits] || limits.free;

    return new Response(JSON.stringify({
      usage: {
        calls_used: usage.calls_used,
        texts_used: usage.texts_used,
        emails_used: usage.emails_used
      },
      limits: tierLimits,
      tier: usage.tier,
      remaining: {
        calls: tierLimits.calls === -1 ? -1 : Math.max(0, tierLimits.calls - usage.calls_used),
        texts: tierLimits.texts === -1 ? -1 : Math.max(0, tierLimits.texts - usage.texts_used),
        emails: tierLimits.emails === -1 ? -1 : Math.max(0, tierLimits.emails - usage.emails_used)
      }
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