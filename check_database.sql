-- Check if the required tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('users', 'usage_tracking', 'text_conversations', 'emails', 'subscriptions');

-- Check the structure of the users table if it exists
\d public.users;

-- Check if RLS is enabled on tables
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('users', 'usage_tracking', 'text_conversations', 'emails', 'subscriptions');

-- Check if there are any triggers on auth.users
SELECT trigger_name, event_manipulation, action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'users' 
AND event_object_schema = 'auth'; 