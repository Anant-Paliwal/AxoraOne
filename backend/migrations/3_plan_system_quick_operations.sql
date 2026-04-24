-- ============================================
-- 3-PLAN SYSTEM QUICK OPERATIONS
-- Common SQL queries for managing the new billing system
-- ============================================

-- ============================================
-- VIEW CURRENT PLANS
-- ============================================

-- See all active plans
SELECT 
    code,
    name,
    price_monthly_inr,
    price_yearly_inr,
    workspaces_limit,
    collaborators_limit,
    ask_anything_daily_limit,
    page_history_days,
    can_share_page_edit,
    can_assign_tasks,
    can_team_pulse
FROM subscription_plans
WHERE is_active = true
ORDER BY sort_order;

-- ============================================
-- UPDATE PLAN LIMITS (NO CODE CHANGES NEEDED!)
-- ============================================

-- Increase FREE plan Ask Anything limit to 15/day
UPDATE subscription_plans
SET ask_anything_daily_limit = 15
WHERE code = 'FREE';

-- Increase PRO plan workspaces to 30
UPDATE subscription_plans
SET workspaces_limit = 30
WHERE code = 'PRO';

-- Make PRO PLUS collaborators truly unlimited
UPDATE subscription_plans
SET collaborators_limit = NULL
WHERE code = 'PRO_PLUS';

-- ============================================
-- UPDATE FEATURE FLAGS
-- ============================================

-- Enable team pulse for PRO plan
UPDATE subscription_plans
SET can_team_pulse = true
WHERE code = 'PRO';

-- Enable edit page sharing for FREE plan
UPDATE subscription_plans
SET can_share_page_edit = true
WHERE code = 'FREE';

-- ============================================
-- VIEW USER SUBSCRIPTIONS
-- ============================================

-- See all active subscriptions
SELECT 
    us.user_id,
    us.plan_code,
    sp.name as plan_name,
    us.status,
    us.billing_cycle,
    us.start_at,
    us.razorpay_subscription_id
FROM user_subscriptions us
JOIN subscription_plans sp ON us.plan_code = sp.code
WHERE us.status = 'active'
ORDER BY us.created_at DESC;

-- Count users per plan
SELECT 
    plan_code,
    COUNT(*) as user_count
FROM user_subscriptions
WHERE status = 'active'
GROUP BY plan_code
ORDER BY user_count DESC;

-- ============================================
-- MANUALLY UPGRADE/DOWNGRADE USER
-- ============================================

-- Upgrade user to PRO
UPDATE user_subscriptions
SET 
    plan_code = 'PRO',
    status = 'active',
    billing_cycle = 'monthly',
    updated_at = NOW()
WHERE user_id = '<user-id-here>';

-- Downgrade user to FREE
UPDATE user_subscriptions
SET 
    plan_code = 'FREE',
    status = 'active',
    billing_cycle = NULL,
    razorpay_subscription_id = NULL,
    updated_at = NOW()
WHERE user_id = '<user-id-here>';

-- ============================================
-- CHECK USER LIMITS
-- ============================================

-- Get user's plan and limits
SELECT * FROM get_user_plan('<user-id-here>');

-- Check if user can create workspace
SELECT check_workspace_limit('<user-id-here>');

-- Check if workspace can add collaborator
SELECT check_collaborator_limit('<workspace-id-here>');

-- Check if user has Ask Anything credits
SELECT check_ask_anything_limit('<user-id-here>');

-- ============================================
-- VIEW ASK ANYTHING USAGE
-- ============================================

-- Today's usage for all users
SELECT 
    u.user_id,
    u.used_count,
    sp.ask_anything_daily_limit as limit,
    (sp.ask_anything_daily_limit - u.used_count) as remaining
FROM ask_anything_usage_daily u
JOIN user_subscriptions us ON u.user_id = us.user_id
JOIN subscription_plans sp ON us.plan_code = sp.code
WHERE u.usage_date = CURRENT_DATE
ORDER BY u.used_count DESC;

-- User's usage history (last 7 days)
SELECT 
    usage_date,
    used_count
FROM ask_anything_usage_daily
WHERE user_id = '<user-id-here>'
AND usage_date >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY usage_date DESC;

-- ============================================
-- WORKSPACE STATISTICS
-- ============================================

-- Count workspaces per user
SELECT 
    user_id,
    COUNT(*) as workspace_count,
    sp.workspaces_limit,
    CASE 
        WHEN sp.workspaces_limit IS NULL THEN 'Unlimited'
        WHEN COUNT(*) >= sp.workspaces_limit THEN 'At Limit'
        ELSE 'Under Limit'
    END as status
FROM workspaces w
JOIN user_subscriptions us ON w.user_id = us.user_id
JOIN subscription_plans sp ON us.plan_code = sp.code
GROUP BY user_id, sp.workspaces_limit
ORDER BY workspace_count DESC;

-- ============================================
-- COLLABORATOR STATISTICS
-- ============================================

-- Count collaborators per workspace
SELECT 
    w.id as workspace_id,
    w.name as workspace_name,
    w.user_id,
    COUNT(wm.id) as collaborator_count,
    sp.collaborators_limit,
    CASE 
        WHEN sp.collaborators_limit IS NULL THEN 'Unlimited'
        WHEN COUNT(wm.id) >= sp.collaborators_limit THEN 'At Limit'
        ELSE 'Under Limit'
    END as status
FROM workspaces w
LEFT JOIN workspace_members wm ON w.id = wm.workspace_id AND wm.user_id != w.user_id
JOIN user_subscriptions us ON w.user_id = us.user_id
JOIN subscription_plans sp ON us.plan_code = sp.code
GROUP BY w.id, w.name, w.user_id, sp.collaborators_limit
ORDER BY collaborator_count DESC;

-- ============================================
-- RESET USAGE (FOR TESTING)
-- ============================================

-- Reset Ask Anything usage for a user
DELETE FROM ask_anything_usage_daily
WHERE user_id = '<user-id-here>'
AND usage_date = CURRENT_DATE;

-- Reset all Ask Anything usage for today
DELETE FROM ask_anything_usage_daily
WHERE usage_date = CURRENT_DATE;

-- ============================================
-- ADD NEW PLAN (EXAMPLE)
-- ============================================

-- Example: Add a TEAM plan between PRO and PRO_PLUS
INSERT INTO subscription_plans (
    code, name, description,
    price_monthly_inr, price_yearly_inr,
    workspaces_limit, collaborators_limit, ask_anything_daily_limit, page_history_days,
    can_share_workspace, can_share_page_readonly, can_share_page_edit, can_assign_tasks,
    can_team_pulse, can_skill_insights_history, skill_insights_history_days,
    knowledge_graph_level, is_active, sort_order
) VALUES (
    'TEAM', 'Team', 'For small teams',
    699, 6999,
    50, 25, 200, 60,
    true, true, true, true,
    true, true, 60,
    'advanced', true, 3
);

-- Update sort order for existing plans
UPDATE subscription_plans SET sort_order = 4 WHERE code = 'PRO_PLUS';

-- ============================================
-- DISABLE/ENABLE PLAN
-- ============================================

-- Disable a plan (won't show in UI, existing users keep it)
UPDATE subscription_plans
SET is_active = false
WHERE code = 'PRO_PLUS';

-- Re-enable a plan
UPDATE subscription_plans
SET is_active = true
WHERE code = 'PRO_PLUS';

-- ============================================
-- AUDIT QUERIES
-- ============================================

-- Find users at workspace limit
SELECT 
    us.user_id,
    us.plan_code,
    COUNT(w.id) as workspace_count,
    sp.workspaces_limit
FROM user_subscriptions us
JOIN subscription_plans sp ON us.plan_code = sp.code
LEFT JOIN workspaces w ON us.user_id = w.user_id
WHERE sp.workspaces_limit IS NOT NULL
GROUP BY us.user_id, us.plan_code, sp.workspaces_limit
HAVING COUNT(w.id) >= sp.workspaces_limit;

-- Find users who exceeded Ask Anything limit today
SELECT 
    u.user_id,
    u.used_count,
    sp.ask_anything_daily_limit,
    (u.used_count - sp.ask_anything_daily_limit) as exceeded_by
FROM ask_anything_usage_daily u
JOIN user_subscriptions us ON u.user_id = us.user_id
JOIN subscription_plans sp ON us.plan_code = sp.code
WHERE u.usage_date = CURRENT_DATE
AND u.used_count > sp.ask_anything_daily_limit;

-- ============================================
-- REVENUE ANALYTICS
-- ============================================

-- Monthly recurring revenue (MRR)
SELECT 
    SUM(
        CASE 
            WHEN us.billing_cycle = 'monthly' THEN sp.price_monthly_inr
            WHEN us.billing_cycle = 'yearly' THEN sp.price_yearly_inr / 12
            ELSE 0
        END
    ) as mrr
FROM user_subscriptions us
JOIN subscription_plans sp ON us.plan_code = sp.code
WHERE us.status = 'active'
AND sp.code != 'FREE';

-- Revenue breakdown by plan
SELECT 
    sp.code,
    sp.name,
    COUNT(*) as subscribers,
    SUM(
        CASE 
            WHEN us.billing_cycle = 'monthly' THEN sp.price_monthly_inr
            WHEN us.billing_cycle = 'yearly' THEN sp.price_yearly_inr / 12
            ELSE 0
        END
    ) as mrr
FROM user_subscriptions us
JOIN subscription_plans sp ON us.plan_code = sp.code
WHERE us.status = 'active'
GROUP BY sp.code, sp.name
ORDER BY mrr DESC;

-- ============================================
-- CLEANUP OLD DATA
-- ============================================

-- Delete old Ask Anything usage (keep last 90 days)
DELETE FROM ask_anything_usage_daily
WHERE usage_date < CURRENT_DATE - INTERVAL '90 days';

-- Archive cancelled subscriptions older than 1 year
-- (Create archive table first if needed)
-- DELETE FROM user_subscriptions
-- WHERE status = 'cancelled'
-- AND updated_at < NOW() - INTERVAL '1 year';
