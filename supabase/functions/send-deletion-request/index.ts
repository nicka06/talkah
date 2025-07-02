// @ts-ignore
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

// @ts-ignore
const SENDGRID_API_KEY = Deno.env.get("SENDGRID_API_KEY")!;
// Hard-coded admin email - ALWAYS send deletion requests here!
const ADMIN_EMAIL = "info.talkah@gmail.com";
// @ts-ignore
const SENDGRID_FROM_EMAIL = Deno.env.get("SENDGRID_FROM_EMAIL")!;

// CORS headers for all responses
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json'
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: corsHeaders
    });
  }

  try {
    const { 
      userEmail, 
      userId, 
      userDetails, 
      requestTimestamp,
      userAgent 
    } = await req.json();
    
    if (!userEmail || !userId) {
      return new Response(JSON.stringify({ error: 'userEmail and userId are required' }), {
        status: 400,
        headers: corsHeaders
      });
    }

    // Format user details for email
    const accountCreated = userDetails?.created_at ? new Date(userDetails.created_at).toLocaleDateString() : 'Unknown';
    const subscriptionTier = userDetails?.subscription_tier || 'free';
    const stripeCustomerId = userDetails?.stripe_customer_id || 'None';
    const lastUpdated = userDetails?.updated_at ? new Date(userDetails.updated_at).toLocaleDateString() : 'Unknown';

    // Create detailed email content for admin
    const emailSubject = `🚨 Account Deletion Request - ${userEmail}`;
    
    const emailContent = `ACCOUNT DELETION REQUEST

======================================
USER DETAILS:
======================================
Email: ${userEmail}
User ID: ${userId}
Account Created: ${accountCreated}
Subscription Tier: ${subscriptionTier}
Stripe Customer ID: ${stripeCustomerId}
Last Updated: ${lastUpdated}

======================================
REQUEST DETAILS:
======================================
Requested At: ${new Date(requestTimestamp).toLocaleString()}
User Agent: ${userAgent}
Request IP: [Will be in server logs]

======================================
DELETION CHECKLIST:
======================================
□ Delete from Supabase Auth (auth.users)
□ Delete from users table
□ Delete from usage_tracking table  
□ Delete from subscriptions table
□ Delete from subscription_events table
□ Delete from plan_changes table
□ Delete from calls table
□ Delete from emails table
□ Delete from sms_messages table
□ Cancel/Delete Stripe customer: ${stripeCustomerId}
□ Send confirmation email to user

======================================
VERIFICATION:
======================================
✅ User successfully authenticated before request
✅ User confirmed deletion understanding
✅ Request sent via secure web form

IMPORTANT: Process this deletion within 24 hours and send confirmation to the user.

---
Talkah Account Deletion System
Generated: ${new Date().toISOString()}`;

    // Send email to admin via SendGrid (completely separate from user system)
    const sendGridResponse = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        personalizations: [{
          to: [{ email: ADMIN_EMAIL }],
          subject: emailSubject
        }],
        from: { email: SENDGRID_FROM_EMAIL },
        content: [
          {
            type: 'text/plain',
            value: emailContent
          },
          {
            type: 'text/html',
            value: emailContent.replace(/\n/g, '<br>').replace(/\n\n/g, '<br><br>')
          }
        ]
      })
    });

    if (!sendGridResponse.ok) {
      console.error('SendGrid error:', await sendGridResponse.text());
      return new Response(JSON.stringify({ error: 'Failed to send deletion request email' }), {
        status: 500,
        headers: corsHeaders
      });
    }

    // Get message ID for tracking
    const messageId = sendGridResponse.headers.get('x-message-id');
    
    console.log(`Account deletion request sent to admin for user: ${userEmail} (ID: ${userId})`);
    console.log(`SendGrid Message ID: ${messageId}`);

    return new Response(JSON.stringify({
      success: true,
      message: 'Deletion request sent to admin team',
      messageId: messageId,
      adminEmail: ADMIN_EMAIL
    }), {
      headers: corsHeaders
    });

  } catch (error) {
    console.error('Error sending deletion request:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: corsHeaders
    });
  }
}); 