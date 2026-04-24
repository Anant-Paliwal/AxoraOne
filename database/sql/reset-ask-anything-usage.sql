-- =====================================================
-- Reset Ask Anything Usage for Testing
-- =====================================================
-- This resets your daily Ask Anything usage count
-- Use this ONLY for testing/development

-- Option 1: Reset for specific user (replace with your user_id)
-- UPDATE user_usage_tracking 
-- SET ask_anything_count = 0, last_reset_date = CURRENT_DATE
-- WHERE user_id = 'YOUR_USER_ID_HERE';

-- Option 2: Reset for ALL users (use with caution!)
UPDATE user_usage_tracking 
SET ask_anything_count = 0, 
    last_reset_date = CURRENT_DATE;

-- Option 3: Increase limit temporarily for testing
-- UPDATE user_subscriptions
-- SET plan_name = 'pro'
-- WHERE user_id = 'YOUR_USER_ID_HERE';

-- Verify the reset
SELECT 
    user_id,
    ask_anything_count,
    last_reset_date,
    created_at
FROM user_usage_tracking
ORDER BY created_at DESC
LIMIT 10;

-- Check your current plan
SELECT 
    user_id,
    plan_name,
    status,
    created_at
FROM user_subscriptions
ORDER BY created_at DESC
LIMIT 10;
