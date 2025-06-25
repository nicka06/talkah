# Talking App Database Map

## Database Overview
This document provides a complete map of the Talking App database schema, showing all tables, their relationships, and data flow patterns.

## Core Tables

### 1. USERS (Core User Management)
```
users
├── id (uuid, PK) - Primary user identifier
├── email (text) - User email address
├── subscription_plan_id (text) - Current subscription plan
├── subscription_status (text) - Active, canceled, past_due, etc.
├── billing_cycle_start (timestamp) - Current billing period start
├── billing_cycle_end (timestamp) - Current billing period end
├── stripe_customer_id (text) - Stripe customer reference
├── billing_interval (text) - Monthly/yearly billing
├── created_at (timestamp) - Account creation date
└── updated_at (timestamp) - Last update timestamp
```

### 2. SUBSCRIPTION_PLANS (Plan Definitions)
```
subscription_plans
├── id (text, PK) - Plan identifier (free, pro, premium)
├── name (text) - Display name
├── description (text) - Plan description
├── stripe_price_id_monthly (text) - Stripe monthly price ID
├── stripe_price_id_yearly (text) - Stripe yearly price ID
├── phone_calls_limit (integer) - Call limit (-1 = unlimited)
├── text_chains_limit (integer) - Text limit (-1 = unlimited)
├── emails_limit (integer) - Email limit (-1 = unlimited)
├── price_monthly (numeric) - Monthly price
├── price_yearly (numeric) - Yearly price
├── features (jsonb) - Array of feature descriptions
├── is_active (boolean) - Plan availability
├── sort_order (integer) - Display order
├── created_at (timestamp) - Creation date
└── updated_at (timestamp) - Last update
```

### 3. SUBSCRIPTIONS (Active Subscriptions)
```
subscriptions
├── id (uuid, PK) - Subscription record ID
├── user_id (uuid, FK) → users.id - User reference
├── stripe_subscription_id (text) - Stripe subscription ID
├── tier (text) - Plan tier (free, pro, premium)
├── status (text) - Active, canceled, past_due, etc.
├── current_period_start (timestamp) - Billing period start
├── current_period_end (timestamp) - Billing period end
├── created_at (timestamp) - Subscription creation
└── updated_at (timestamp) - Last update
```

## Activity Tracking Tables

### 4. CALLS (Phone Call Records)
```
calls
├── id (uuid, PK) - Call record ID
├── user_id (uuid, FK) → users.id - User reference
├── user_phone_number (text) - User's phone number
├── topic (text) - Call topic/description
├── twilio_call_sid (text) - Twilio call identifier
├── status (text) - initiating, ringing, answered, ended, etc.
├── initiated_time (timestamp) - Call initiation
├── ringing_time (timestamp) - When phone started ringing
├── answered_time (timestamp) - When call was answered
├── ended_time (timestamp) - When call ended
├── duration_seconds (integer) - Call duration
├── created_at (timestamp) - Record creation
└── updated_at (timestamp) - Last update
```

### 5. EMAILS (Email Activity)
```
emails
├── id (uuid, PK) - Email record ID
├── user_id (uuid, FK) → users.id - User reference
├── recipient_email (text) - Recipient email address
├── from_email (text) - Sender email address
├── subject (text) - Email subject
├── content (text) - Email content
├── type (text) - Email type (custom, template)
├── topic (text) - Email topic/description
├── status (text) - sent, failed, pending
├── sendgrid_message_id (text) - SendGrid message ID
├── created_at (timestamp) - Email creation
└── updated_at (timestamp) - Last update
```

### 6. SMS_CONVERSATIONS (Text Conversation Groups)
```
sms_conversations
├── id (uuid, PK) - Conversation ID
├── user_id (uuid, FK) → users.id - User reference
├── phone_number (text) - Contact phone number
├── topic (text) - Conversation topic
├── message_count (integer) - Total messages in conversation
├── current_exchange (integer) - Current message exchange count
├── status (text) - active, paused, ended
├── created_at (timestamp) - Conversation start
└── updated_at (timestamp) - Last update
```

### 7. SMS_MESSAGES (Individual SMS Messages)
```
sms_messages
├── id (uuid, PK) - Message ID
├── conversation_id (uuid, FK) → sms_conversations.id - Conversation reference
├── user_id (uuid, FK) → users.id - User reference
├── phone_number (text) - Contact phone number
├── twilio_message_sid (text) - Twilio message ID
├── direction (text) - inbound, outbound
├── message_text (text) - Message content
├── type (text) - ai, user
├── status (text) - sent, delivered, failed
├── created_at (timestamp) - Message timestamp
└── (no updated_at - messages are immutable)
```

## Subscription Management Tables

### 8. SUBSCRIPTION_EVENTS (Audit Trail)
```
subscription_events
├── id (uuid, PK) - Event ID
├── user_id (uuid, FK) → users.id - User reference
├── event_type (text) - subscription.created, invoice.payment_succeeded, etc.
├── from_plan (text) - Previous plan
├── to_plan (text) - New plan
├── stripe_subscription_id (text) - Stripe subscription reference
├── stripe_event_id (text) - Stripe webhook event ID
├── stripe_customer_id (text) - Stripe customer reference
├── billing_amount (numeric) - Amount charged
├── currency (text) - Currency (default: usd)
├── billing_interval (text) - Monthly/yearly
├── effective_date (date) - When change takes effect
├── metadata (jsonb) - Additional event data
├── created_at (timestamp) - Event timestamp
└── (no updated_at - events are immutable)
```

### 9. PLAN_CHANGES (Pending Changes)
```
plan_changes
├── id (uuid, PK) - Change request ID
├── user_id (uuid, FK) → users.id - User reference
├── from_plan_id (varchar(50)) - Current plan
├── to_plan_id (varchar(50)) - Target plan
├── change_type (varchar(20)) - upgrade, downgrade, interval_change
├── requested_at (timestamp) - Request timestamp
├── effective_date (date) - When change takes effect
├── status (varchar(20)) - pending, completed, cancelled, failed
├── stripe_subscription_id (varchar(255)) - Stripe reference
├── notes (text) - Change notes
├── created_at (timestamp) - Record creation
└── updated_at (timestamp) - Last update
```

### 10. USAGE_TRACKING (Monthly Usage)
```
usage_tracking
├── id (uuid, PK) - Usage record ID
├── user_id (uuid, FK) → users.id - User reference
├── month_year (text) - YYYY-MM format
├── calls_used (integer) - Calls used this month
├── texts_used (integer) - Texts used this month
├── emails_used (integer) - Emails used this month
└── (no created_at/updated_at - calculated data)
```

## Special Tables

### 11. AMD_WAITING_ROOM (Call Queue Management)
```
amd_waiting_room
├── id (uuid, PK) - Queue entry ID
├── user_id (uuid, FK) → users.id - User reference
├── call_id (uuid, FK) → calls.id - Call reference
├── status (text) - waiting, processing, completed
├── created_at (timestamp) - Queue entry time
└── updated_at (timestamp) - Last status update
```

## Relationships Map

```
USERS (1) ←→ (1) SUBSCRIPTIONS
    ↓
    ├── (1) ←→ (many) CALLS
    ├── (1) ←→ (many) EMAILS
    ├── (1) ←→ (many) SMS_CONVERSATIONS
    ├── (1) ←→ (many) SUBSCRIPTION_EVENTS
    ├── (1) ←→ (many) PLAN_CHANGES
    ├── (1) ←→ (many) USAGE_TRACKING
    └── (1) ←→ (many) AMD_WAITING_ROOM

SMS_CONVERSATIONS (1) ←→ (many) SMS_MESSAGES

CALLS (1) ←→ (1) AMD_WAITING_ROOM

SUBSCRIPTION_PLANS (1) ←→ (many) USERS (via subscription_plan_id)
```

## Data Flow Patterns

### 1. User Registration Flow
```
1. User signs up → users table
2. Default subscription created → subscriptions table (tier: 'free')
3. Initial usage tracking → usage_tracking table
4. Registration event logged → subscription_events table
```

### 2. Subscription Upgrade Flow
```
1. User requests upgrade → plan_changes table (status: 'pending')
2. Payment processed → subscription_events table (event_type: 'invoice.payment_succeeded')
3. Subscription updated → subscriptions table
4. Plan change completed → plan_changes table (status: 'completed')
5. Usage limits updated → usage_tracking table
```

### 3. Activity Tracking Flow
```
1. User initiates call → calls table (status: 'initiating')
2. Call progresses → calls table (status updates)
3. Call ends → calls table (status: 'ended', duration_seconds populated)
4. Usage incremented → usage_tracking table
5. Activity event logged → subscription_events table
```

### 4. SMS Conversation Flow
```
1. User starts conversation → sms_conversations table
2. Messages sent/received → sms_messages table
3. Conversation updated → sms_conversations table (message_count, current_exchange)
4. Usage tracked → usage_tracking table
```

## Key Business Rules

### 1. Subscription Limits
- Free: 1 call, 1 text, 1 email
- Pro: 5 calls, 10 texts, unlimited emails
- Premium: Unlimited calls, texts, emails

### 2. Billing Periods
- Monthly: 1st of month to last day of month
- Yearly: Annual billing cycle
- Usage resets at billing period start

### 3. Plan Changes
- Upgrades: Immediate effect, prorated billing
- Downgrades: End of current billing period
- Cancellations: End of current billing period

### 4. Activity Tracking
- All activities count toward monthly limits
- Unlimited features (-1) bypass limit checks
- Usage tracked per calendar month

## Indexes and Performance

### Primary Indexes
- All `id` fields (UUID primary keys)
- `user_id` foreign keys
- `created_at` timestamps

### Secondary Indexes
- `subscription_plans.is_active` - Active plan queries
- `calls.status` - Call status filtering
- `emails.status` - Email status filtering
- `sms_messages.direction` - Message direction filtering
- `usage_tracking.month_year` - Monthly usage queries
- `subscription_events.event_type` - Event type filtering

### Composite Indexes
- `(user_id, month_year)` - Usage tracking queries
- `(user_id, status)` - User activity filtering
- `(user_id, created_at)` - User activity history

## Data Retention Policies

### Permanent Data
- User accounts and subscription history
- Subscription events (audit trail)
- Plan changes (audit trail)

### Time-Limited Data
- Call records: 2 years
- Email records: 2 years
- SMS messages: 1 year
- SMS conversations: 1 year
- Usage tracking: 3 years

### Real-Time Data
- AMD waiting room: 24 hours
- Current subscription status
- Active usage tracking

## Security Considerations

### Row Level Security (RLS)
- Users can only access their own data
- Admin users have read access to all data
- Service accounts have limited access

### Data Encryption
- Sensitive data encrypted at rest
- API communications use HTTPS
- Payment data handled by Stripe

### Audit Trail
- All subscription changes logged
- User activity tracked
- Payment events recorded

## Integration Points

### External Services
- **Stripe**: Payment processing and subscription management
- **Twilio**: Voice calls and SMS messaging
- **SendGrid**: Email delivery
- **Supabase**: Database and authentication

### Webhooks
- Stripe webhooks update subscription status
- Twilio webhooks update call/SMS status
- SendGrid webhooks update email status

This database map provides a complete view of the Talking App's data architecture, supporting all current features and designed for future scalability. 