-- Complete Subscription System Tables
-- Run this FIRST before add_storage_and_team_tracking.sql

-- ============================================
-- 1. SUBSCRIPTION PLANS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    description TEXT,
    price_monthly DECIMAL(10, 2) DEFAULT 0,
    price_yearly DECIMAL(10, 2) DEFAULT 0,
    features JSONB NOT NULL DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    razorpay_plan_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. USER SUBSCRIPTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS user_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES subscription_plans(id),
    status TEXT NOT NULL DEFAULT 'active',
    billing_cycle TEXT NOT NULL DEFAULT 'monthly',
    current_period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    current_period_end TIMESTAMPTZ NOT NULL,
    cancel_at_period_end BOOLEAN DEFAULT false,
    
    -- Razorpay fields (included from start)
    razorpay_subscription_id TEXT,
    razorpay_payment_id TEXT,
    razorpay_customer_id TEXT,
    
    -- Metadata
    trial_end TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id)
);

-- ============================================
-- 3. USER USAGE METRICS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS user_usage_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    metric_type TEXT NOT NULL,
    count INTEGER NOT NULL DEFAULT 0,
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, metric_type, period_start)
);

-- ============================================
-- 4. BILLING HISTORY TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS billing_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    currency TEXT DEFAULT 'INR',
    status TEXT NOT NULL,
    description TEXT,
    
    -- Razorpay fields (included from start)
    razorpay_payment_id TEXT,
    razorpay_invoice_id TEXT,
    
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 5. INSERT DEFAULT PLANS
-- ============================================
INSERT INTO subscription_plans (name, display_name, description, price_monthly, price_yearly, features, sort_order)
VALUES 
(
    'free',
    'Free',
    'Perfect for getting started',
    0,
    0,
    '{
        "max_pages": -1,
        "max_ai_queries_per_day": 20,
        "max_storage_mb": 100,
        "max_team_members": 1,
        "max_workspaces": 1,
        "max_skills": 10,
        "max_tasks": 50,
        "features": {
            "basic_editor": true,
            "ai_assistant": true,
            "export_data": true
        }
    }'::jsonb,
    0
),
(
    'pro',
    'Pro',
    'For professionals and growing teams',
    1499,
    14999,
    '{
        "max_pages": -1,
        "max_ai_queries_per_day": 500,
        "max_storage_mb": 10240,
        "max_team_members": 10,
        "max_workspaces": 5,
        "max_skills": 100,
        "max_tasks": 500,
        "features": {
            "basic_editor": true,
            "ai_assistant": true,
            "export_data": true,
            "knowledge_graph": true,
            "advanced_analytics": true,
            "priority_support": true,
            "api_access": true,
            "collaboration": true,
            "version_history": true
        }
    }'::jsonb,
    1
),
(
    'enterprise',
    'Enterprise',
    'For large organizations',
    7499,
    74999,
    '{
        "max_pages": -1,
        "max_ai_queries_per_day": -1,
        "max_storage_mb": -1,
        "max_team_members": -1,
        "max_workspaces": -1,
        "max_skills": -1,
        "max_tasks": -1,
        "features": {
            "basic_editor": true,
            "ai_assistant": true,
            "export_data": true,
            "knowledge_graph": true,
            "advanced_analytics": true,
            "priority_support": true,
            "api_access": true,
            "collaboration": true,
            "version_history": true,
            "custom_branding": true,
            "sso": true,
            "custom_integrations": true,
            "dedicated_support": true,
            "sla": true
        }
    }'::jsonb,
    2
)
ON CONFLICT (name) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    description = EXCLUDED.description,
    price_monthly = EXCLUDED.price_monthly,
    price_yearly = EXCLUDED.price_yearly,
    features = EXCLUDED.features,
    sort_order = EXCLUDED.sort_order,
    updated_at = NOW();

-- ============================================
-- 6. ASSIGN FREE PLAN TO EXISTING USERS
-- ============================================
INSERT INTO user_subscriptions (user_id, plan_id, status, billing_cycle, current_period_start, current_period_end)
SELECT 
    u.id,
    (SELECT id FROM subscription_plans WHERE name = 'free'),
    'active',
    'monthly',
    NOW(),
    NOW() + INTERVAL '100 years'
FROM auth.users u
WHERE NOT EXISTS (
    SELECT 1 FROM user_subscriptions WHERE user_id = u.id
);

-- ============================================
-- 7. CREATE INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_plan_id ON user_subscriptions(plan_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_razorpay ON user_subscriptions(razorpay_subscription_id);

CREATE INDEX IF NOT EXISTS idx_user_usage_metrics_user_id ON user_usage_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_user_usage_metrics_lookup ON user_usage_metrics(user_id, metric_type, period_start);

CREATE INDEX IF NOT EXISTS idx_billing_history_user_id ON billing_history(user_id);
CREATE INDEX IF NOT EXISTS idx_billing_history_razorpay ON billing_history(razorpay_payment_id);
CREATE INDEX IF NOT EXISTS idx_billing_history_status ON billing_history(status);

-- ============================================
-- 8. ENABLE ROW LEVEL SECURITY
-- ============================================
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_usage_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_history ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 9. RLS POLICIES
-- ============================================

-- Subscription plans (public read)
DROP POLICY IF EXISTS "Anyone can view subscription plans" ON subscription_plans;
CREATE POLICY "Anyone can view subscription plans"
    ON subscription_plans FOR SELECT
    USING (is_active = true);

-- User subscriptions (users can view their own)
DROP POLICY IF EXISTS "Users can view own subscription" ON user_subscriptions;
CREATE POLICY "Users can view own subscription"
    ON user_subscriptions FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own subscription" ON user_subscriptions;
CREATE POLICY "Users can update own subscription"
    ON user_subscriptions FOR UPDATE
    USING (auth.uid() = user_id);

-- User usage metrics (users can view their own)
DROP POLICY IF EXISTS "Users can view own usage" ON user_usage_metrics;
CREATE POLICY "Users can view own usage"
    ON user_usage_metrics FOR SELECT
    USING (auth.uid() = user_id);

-- Billing history (users can view their own)
DROP POLICY IF EXISTS "Users can view own billing history" ON billing_history;
CREATE POLICY "Users can view own billing history"
    ON billing_history FOR SELECT
    USING (auth.uid() = user_id);

-- ============================================
-- 10. HELPER FUNCTIONS
-- ============================================

-- Function to get user's current plan
CREATE OR REPLACE FUNCTION get_user_plan(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'plan_name', sp.name,
        'features', sp.features
    ) INTO result
    FROM user_subscriptions us
    JOIN subscription_plans sp ON sp.id = us.plan_id
    WHERE us.user_id = p_user_id
    AND us.status = 'active';
    
    RETURN COALESCE(result, '{"plan_name": "free"}'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can perform action
CREATE OR REPLACE FUNCTION can_user_perform_action(
    p_user_id UUID,
    p_metric_type TEXT,
    p_increment INTEGER DEFAULT 1
)
RETURNS BOOLEAN AS $$
DECLARE
    v_limit INTEGER;
    v_current INTEGER;
BEGIN
    -- Get limit from plan
    SELECT (sp.features->>p_metric_type)::INTEGER INTO v_limit
    FROM user_subscriptions us
    JOIN subscription_plans sp ON sp.id = us.plan_id
    WHERE us.user_id = p_user_id
    AND us.status = 'active';
    
    -- -1 means unlimited
    IF v_limit = -1 THEN
        RETURN TRUE;
    END IF;
    
    -- Get current usage
    SELECT COALESCE(count, 0) INTO v_current
    FROM user_usage_metrics
    WHERE user_id = p_user_id
    AND metric_type = p_metric_type
    AND period_end > NOW();
    
    -- Check if within limit
    RETURN (v_current + p_increment) <= v_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check tables exist
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'subscription_plans') THEN
        RAISE NOTICE '✅ subscription_plans table created';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_subscriptions') THEN
        RAISE NOTICE '✅ user_subscriptions table created';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_usage_metrics') THEN
        RAISE NOTICE '✅ user_usage_metrics table created';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'billing_history') THEN
        RAISE NOTICE '✅ billing_history table created';
    END IF;
END $$;

-- Check plans inserted
DO $$
DECLARE
    plan_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO plan_count FROM subscription_plans;
    RAISE NOTICE '✅ % subscription plans created', plan_count;
END $$;

-- Check users assigned to free plan
DO $$
DECLARE
    user_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO user_count FROM user_subscriptions;
    RAISE NOTICE '✅ % users assigned to subscription plans', user_count;
END $$;

RAISE NOTICE '✅ Subscription system tables created successfully!';
RAISE NOTICE 'Next step: Run add_storage_and_team_tracking.sql';
