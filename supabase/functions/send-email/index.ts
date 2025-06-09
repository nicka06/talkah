// @ts-ignore
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// @ts-ignore
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
// @ts-ignore
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
// @ts-ignore
const SENDGRID_API_KEY = Deno.env.get("SENDGRID_API_KEY")!;
// @ts-ignore
const SENDGRID_FROM_EMAIL = Deno.env.get("SENDGRID_FROM_EMAIL")!;
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

    const { recipient_email, subject, content, type, topic } = await req.json();
    
    if (!recipient_email || !subject) {
      return new Response(JSON.stringify({ error: 'recipient_email and subject are required' }), {
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
      free: { emails: 1 },
      pro: { emails: -1 },
      premium: { emails: -1 }
    };
    
    // @ts-ignore
    const tierLimit = limits[usage.tier as keyof typeof limits]?.emails || 1;
    if (tierLimit !== -1 && usage.emails_used >= tierLimit) {
      return new Response(JSON.stringify({ 
        error: 'Email limit reached',
        usage_limit_reached: true 
      }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    let emailContent = content;

    // Generate AI content if type is 'ai_generated'
    if (type === 'ai_generated' && topic) {
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
              content: 'You are a helpful assistant that writes professional, well-structured emails. Write clear, concise, and appropriate emails based on the topic provided.'
            },
            {
              role: 'user',
              content: `Write an email about: ${topic}. The subject is: ${subject}. Make it professional and appropriate.`
            }
          ],
          max_tokens: 800,
          temperature: 0.7
        })
      });

      if (!openaiResponse.ok) {
        console.error('OpenAI API error:', await openaiResponse.text());
        return new Response(JSON.stringify({ error: 'Failed to generate email content' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const openaiData = await openaiResponse.json();
      // @ts-ignore
      emailContent = openaiData.choices[0]?.message?.content;

      if (!emailContent) {
        return new Response(JSON.stringify({ error: 'Failed to generate email content' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // Send email via SendGrid
    const sendGridResponse = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        personalizations: [{
          to: [{ email: recipient_email }],
          subject: subject
        }],
        from: { email: SENDGRID_FROM_EMAIL },
        content: [{
          type: 'text/plain',
          value: emailContent
        }]
      })
    });

    let status = 'sent';
    // @ts-ignore
    let sendgridMessageId: string | null = null;

    if (!sendGridResponse.ok) {
      console.error('SendGrid error:', await sendGridResponse.text());
      status = 'failed';
    } else {
      const messageId = sendGridResponse.headers.get('x-message-id');
      if (messageId) {
        sendgridMessageId = messageId;
      }
    }

    // Save email to database
    // @ts-ignore
    const { data: emailRecord, error: saveError } = await supabase
      .from('emails')
      .insert({
        user_id: user.id,
        recipient_email,
        subject,
        content: emailContent,
        type: type || 'custom',
        topic,
        status,
        // @ts-ignore
        sendgrid_message_id: sendgridMessageId
      })
      .select()
      .single();

    if (saveError) {
      console.error('Save email error:', saveError);
      return new Response(JSON.stringify({ error: 'Failed to save email record' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Increment usage only if email was sent successfully
    if (status === 'sent') {
      // @ts-ignore
      await supabase.rpc('increment_usage', { 
        user_uuid: user.id, 
        usage_type: 'emails' 
      });
    }

    return new Response(JSON.stringify({
      success: status === 'sent',
      status,
      email_id: emailRecord.id,
      generated_content: type === 'ai_generated' ? emailContent : undefined
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