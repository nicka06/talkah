-- Revert all changes made to usage tracking functions
-- Drop all the functions I created and restore the original working state

-- Drop all the functions I created
DROP FUNCTION IF EXISTS get_current_usage(UUID);
DROP FUNCTION IF EXISTS increment_usage(UUID, TEXT, INTEGER);
DROP FUNCTION IF EXISTS get_current_month_usage(UUID);
DROP FUNCTION IF EXISTS increment_usage(UUID, TEXT);

-- The original system was working fine for fetching usage data
-- The only issue was that usage wasn't being incremented
-- Let's not touch the database functions and just fix the increment calls in the Edge Functions 