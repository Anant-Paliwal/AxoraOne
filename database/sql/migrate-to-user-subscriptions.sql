-- Migrate from Workspace-Based to User-Based Subscriptions
-- This changes the subscription model from per-workspace to per-user

-- ============================================
-- 1. CREATE USER SUBSCRIPTIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS user_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE, -- One subscription per user
    plan_id UUID NOT NULL REFERENCES subscription_plans(id),
    status TEXT NOT NULL DEFAULT 'active', -- 'active', 'cancelled', 'expired', 'past_due'
    billing_cycle TEXT NOT NULL DEFAULT 'monthly', -- 'monthly', 'yearly', 'lifetime'
    current_period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    current_period_end TIMESTAMPTZ NOT NULL,
    cancel_at_period_end BOOLEAN DEFAULT false,
    
    -- Payment provider fields
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    stripe_price_id TEXT,
    
    -- Metadata
    trial_end TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. CREATE USER USAGE METRICS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS user_usage_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    metric_type TEXT NOT NULL, -- 'max_workspaces', 'max_team_members_total', 'max_ai_queries_per_day'
    count INTEGER NOT NULL DEFAULT 0,
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, metric_type, period_start)
);

-- ============================================
-- 3. UPDATE SUBSCRIPTION PLANS FOR USER-LEVEL
-- ============================================

-- Update Free plan with user-level limits
UPDATE subscription_plans
SET features = jsonb_build_object(
    'max_pages', -1,  -- Unlimited pages
    'max_skills', 50,  -- Per workspace
    'max_tasks', 100,  -- Per workspace
    'max_ai_queries_per_day', 20,  -- Global per user
    'max_team_members', 5,  -- Per workspace
    'max_team_members_total', 5,  -- Global across all workspaces
    'max_workspaces', 5,  -- Global per user
    'max_storage_mb', 100,  -- Global per user
    'features', jsonb_build_object(
        'basic_editor', true,
        'ai_assistant', true,
        'knowledge_graph', false,
        'advanced_analytics', false,
        'custom_branding', false,
        'priority_support', false,
        'api_access', false,
        'export_data', true
    )
)
WHERE name = 'free';

-- Update Pro plan
UPDATE subscription_plans
SET features = jsonb_build_object(
    'max_pages', -1,  -- Unlimited pages
    'max_skills', 200,  -- Per workspace
    'max_tasks', 500,  -- Per workspace
    'max_ai_queries_per_day', 500,  -- Global per user
    'max_team_members', 20,  -- Per workspace
    'max_team_members_total', 50,  -- Global across all workspaces
    'max_workspaces', 20,  -- Global per user
    'max_storage_mb', 10240,  -- Global per user (10GB)
    'features', jsonb_build_object(
        'basic_editor', true,
        'ai_assistant', true,
        'knowledge_graph', true,
        'advanced_analytics', true,
        'custom_branding', false,
        'priority_support', true,
        'api_access', true,
        'export_data', true,
        'collaboration', true,
        'version_history', true
    )
)
WHERE name = 'pro';

-- Update Enterprise plan
UPDATE subscription_plans
SET features = jsonb_build_object(
    'max_pages', -1,  -- Unlimited
    'max_skills', -1,  -- Unlimited
    'max_tasks', -1,  -- Unlimited
    'max_ai_queries_per_day', -1,  -- Unlimited
    'max_team_members', -1,  -- Unlimited per workspace
    'max_team_members_total', -1,  -- Unlimited total
    'max_workspaces', -1,  -- Unlimited
    'max_storage_mb', -1,  -- Unlimited
    'features', jsonb_build_object(
        'basic_editor', true,
        'ai_assistant', true,
        'knowledge_graph', true,
        'advanced_analytics', true,
        'custom_branding', true,
        'priority_support', true,
        'api_access', true,
        'export_data', true,
        'collaboration', true,
        'version_history', true,
        'sso', true,
        'custom_integrations', true,
        'dedicated_support', true,
        'sla', true
    )
)
WHERE name = 'enterprise';

-- ============================================
-- 4. MIGRATE EXISTING DATA
-- ============================================

-- Create user subscriptions from workspace subscriptions
-- Take the highest plan if user has multiple workspaces
INSERT INTO user_subscriptions (user_id, plan_id, status, billing_cycle, current_period_start, current_period_end)
SELECT DISTINCT ON (w.user_id)
    w.user_id,
    ws.plan_id,
    ws.status,
    ws.billing_cycle,
    ws.current_period_start,
    ws.current_period_end
FROM workspaces w
JOIN workspace_subscriptions ws ON w.id = ws.workspace_id
ORDER BY w.user_id, 
    CASE 
        WHEN (SELECT name FROM subscription_plans WHERE id = ws.plan_id) = 'enterprise' THEN 3
        WHEN (SELECT name FROM subscription_plans WHERE id = ws.plan_id) = 'pro' THEN 2
        ELSE 1
    END DESC
ON CONFLICT (user_id) DO NOTHING;

-- ============================================
-- 5. CREATE USER-LEVEL FUNCTIONS
-- ============================================

-- Function to get user's subscription
CREATE OR REPLACE FUNCTION get_user_subscription(p_user_id UUID)
RETURNS TABLE (
    subscription_id UUID,
    plan_name TEXT,
    plan_id UUID,
    status TEXT,
    features JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        us.id,
        sp.name,
        sp.id,
        us.status,
        sp.features
    FROM user_subscriptions us
    JOIN subscription_plans sp ON us.plan_id = sp.id
    WHERE us.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check user-level limit
CREATE OR REPLACE FUNCTION check_user_limit(
    p_user_id UUID,
    p_metric_type TEXT,
    p_increment INTEGER DEFAULT 1
)
RETURNS BOOLEAN AS $$
DECLARE
    v_plan_limit INTEGER;
    v_current_usage INTEGER;
BEGIN
    -- Get plan limit
    SELECT (sp.features->p_metric_type)::INTEGER
    INTO v_plan_limit
    FROM user_subscriptions us
    JOIN subscription_plans sp ON us.plan_id = sp.id
    WHERE us.user_id = p_user_id
    AND us.status = 'active';
    
    -- If no subscription, default to free plan limits
    IF v_plan_limit IS NULL THEN
        SELECT (features->p_metric_type)::INTEGER
        INTO v_plan_limit
        FROM subscription_plans
        WHERE name = 'free';
    END IF;
    
    -- -1 means unlimited
    IF v_plan_limit = -1 THEN
        RETURN TRUE;
    END IF;
    
    -- Get current usage
    SELECT COALESCE(count, 0)
    INTO v_current_usage
    FROM user_usage_metrics
    WHERE user_id = p_user_id
    AND metric_type = p_metric_type
    AND period_start <= NOW()
    AND period_end >= NOW();
    
    -- Check if adding increment would exceed limit
    RETURN (v_current_usage + p_increment) <= v_plan_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment user usage
CREATE OR REPLACE FUNCTION increment_user_usage(
    p_user_id UUID,
    p_metric_type TEXT,
    p_increment INTEGER DEFAULT 1
)
RETURNS VOID AS $$
DECLARE
    v_period_start TIMESTAMPTZ;
    v_period_end TIMESTAMPTZ;
BEGIN
    -- Get current billing period
    SELECT current_period_start, current_period_end
    INTO v_period_start, v_period_end
    FROM user_subscriptions
    WHERE user_id = p_user_id;
    
    -- If no subscription, use current month
    IF v_period_start IS NULL THEN
        v_period_start := date_trunc('month', NOW());
        v_period_end := date_trunc('month', NOW()) + INTERVAL '1 month';
    END IF;
    
    -- Insert or update usage
    INSERT INTO user_usage_metrics (user_id, metric_type, count, period_start, period_end)
    VALUES (p_user_id, p_metric_type, p_increment, v_period_start, v_period_end)
    ON CONFLICT (user_id, metric_type, period_start)
    DO UPDATE SET count = user_usage_metrics.count + p_increment;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 6. CREATE TRIGGERS FOR USER-LEVEL TRACKING
-- ============================================

-- Track workspace creation (user-level)
CREATE OR REPLACE FUNCTION track_user_workspace_creation()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM increment_user_usage(NEW.user_id, 'max_workspaces', 1);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_track_user_workspace_creation ON workspaces;
CREATE TRIGGER trigger_track_user_workspace_creation
    AFTER INSERT ON workspaces
    FOR EACH ROW
    EXECUTE FUNCTION track_user_workspace_creation();

-- ============================================
-- 7. INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_user_usage_metrics_user ON user_usage_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_user_usage_metrics_period ON user_usage_metrics(period_start, period_end);

-- ============================================
-- 8. RLS POLICIES
-- ============================================

ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_usage_metrics ENABLE ROW LEVEL SECURITY;

-- Users can view their own subscription
DROP POLICY IF EXISTS "Users can view their own subscription" ON user_subscriptions;
CREATE POLICY "Users can view their own subscription"
    ON user_subscriptions FOR SELECT
    USING (user_id = auth.uid());

-- Users can view their own usage
DROP POLICY IF EXISTS "Users can view their own usage" ON user_usage_metrics;
CREATE POLICY "Users can view their own usage"
    ON user_usage_metrics FOR SELECT
    USING (user_id = auth.uid());

-- ============================================
-- 9. GRANT PERMISSIONS
-- ============================================

GRANT EXECUTE ON FUNCTION get_user_subscription(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION check_user_limit(UUID, TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_user_usage(UUID, TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_subscription(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION check_user_limit(UUID, TEXT, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION increment_user_usage(UUID, TEXT, INTEGER) TO service_role;

-- ============================================
-- 10. INITIALIZE USER USAGE METRICS
-- ============================================

-- Count existing workspaces per user
INSERT INTO user_usage_metrics (user_id, metric_type, count, period_start, period_end)
SELECT 
    w.user_id,
    'max_workspaces' as metric_type,
    COUNT(*) as count,
    us.current_period_start,
    us.current_period_end
FROM workspaces w
JOIN user_subscriptions us ON w.user_id = us.user_id
GROUP BY w.user_id, us.current_period_start, us.current_period_end
ON CONFLICT (user_id, metric_type, period_start) 
DO UPDATE SET count = EXCLUDED.count;

-- Count total team members across all workspaces per user
INSERT INTO user_usage_metrics (user_id, metric_type, count, period_start, period_end)
SELECT 
    w.user_id,
    'max_team_members_total' as metric_type,
    COUNT(DISTINCT wm.user_id) as count,
    us.current_period_start,
    us.current_period_end
FROM workspaces w
JOIN workspace_members wm ON w.id = wm.workspace_id
JOIN user_subscriptions us ON w.user_id = us.user_id
GROUP BY w.user_id, us.current_period_start, us.current_period_end
ON CONFLICT (user_id, metric_type, period_start) 
DO UPDATE SET count = EXCLUDED.count;

-- ============================================
-- 11. VERIFICATION
-- ============================================

-- Check user subscriptions
SELECT 
    u.email,
    sp.name as plan_name,
    us.status,
    (sp.features->>'max_workspaces')::int as max_workspaces,
    (sp.features->>'max_team_members_total')::int as max_team_members_total
FROM user_subscriptions us
JOIN subscription_plans sp ON us.plan_id = sp.id
JOIN auth.users u ON us.user_id = u.id
ORDER BY u.email;

-- Check user usage
SELECT 
    u.email,
    uum.metric_type,
    uum.count,
    sp.name as plan_name,
    (sp.features->>uum.metric_type)::int as plan_limit
FROM user_usage_metrics uum
JOIN user_subscriptions us ON uum.user_id = us.user_id
JOIN subscription_plans sp ON us.plan_id = sp.id
JOIN auth.users u ON uum.user_id = u.id
WHERE uum.period_end >= NOW()
ORDER BY u.email, uum.metric_type;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Successfully migrated to user-based subscriptions!';
    RAISE NOTICE '📊 Subscription is now per-user, not per-workspace';
    RAISE NOTICE '🌍 Limits are global across all user workspaces';
    RAISE NOTICE '📝 Free plan: 5 workspaces, 5 total team members';
    RAISE NOTICE '💎 Pro plan: 20 workspaces, 50 total team members';
    RAISE NOTICE '🏢 Enterprise plan: Unlimited everything';
END $$;
