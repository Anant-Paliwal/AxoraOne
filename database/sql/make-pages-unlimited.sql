-- Make Pages Unlimited for All Plans
-- Run this to remove page limits from all subscription plans

-- ============================================
-- 1. UPDATE SUBSCRIPTION PLANS - UNLIMITED PAGES
-- ============================================

UPDATE subscription_plans
SET features = jsonb_set(
    features,
    '{max_pages}',
    '-1'::jsonb  -- -1 means unlimited
)
WHERE name IN ('free', 'pro', 'enterprise');

-- ============================================
-- 2. REMOVE PAGE CREATION TRIGGER
-- ============================================

-- Drop the trigger that tracks page creation
DROP TRIGGER IF EXISTS trigger_track_page_creation ON pages;

-- Drop the function (optional - keep if you want to re-enable later)
DROP FUNCTION IF EXISTS track_page_creation();

-- ============================================
-- 3. CLEAN UP EXISTING PAGE USAGE METRICS
-- ============================================

-- Remove page usage metrics (optional - they won't be enforced anyway)
DELETE FROM usage_metrics 
WHERE metric_type = 'max_pages';

-- ============================================
-- 4. VERIFICATION
-- ============================================

-- Check that all plans now have unlimited pages
SELECT 
    name,
    display_name,
    (features->>'max_pages')::int as max_pages,
    (features->>'max_skills')::int as max_skills,
    (features->>'max_tasks')::int as max_tasks,
    (features->>'max_ai_queries_per_day')::int as max_ai_queries,
    (features->>'max_team_members')::int as max_team_members
FROM subscription_plans
ORDER BY sort_order;

-- Expected output: max_pages should be -1 for all plans

COMMENT ON TABLE subscription_plans IS 'Subscription plans - pages are unlimited for all plans';
