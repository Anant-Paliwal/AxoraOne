-- Subscription System Migration
-- Run this to add subscription plans and billing to your platform

-- ============================================
-- 1. SUBSCRIPTION PLANS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE, -- 'free', 'pro', 'enterprise'
    display_name TEXT NOT NULL,
    description TEXT,
    price_monthly DECIMAL(10, 2) DEFAULT 0,
    price_yearly DECIMAL(10, 2) DEFAULT 0,
    features JSONB NOT NULL DEFAULT '{}', -- Feature limits and capabilities
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. WORKSPACE SUBSCRIPTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS workspace_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
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
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(workspace_id)
);

-- ============================================
-- 3. USAGE METRICS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS usage_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    metric_type TEXT NOT NULL, -- 'pages_created', 'ai_queries', 'storage_mb', 'team_members'
    count INTEGER NOT NULL DEFAULT 0,
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(workspace_id, metric_type, period_start)
);

-- ============================================
-- 4. BILLING HISTORY TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS billing_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES workspace_subscriptions(id) ON DELETE SET NULL,
    amount DECIMAL(10, 2) NOT NULL,
    currency TEXT DEFAULT 'USD',
    status TEXT NOT NULL, -- 'succeeded', 'failed', 'pending', 'refunded'
    description TEXT,
    invoice_url TEXT,
    stripe_invoice_id TEXT,
    stripe_payment_intent_id TEXT,
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
        "max_pages": 10,
        "max_ai_queries_per_day": 20,
        "max_storage_mb": 100,
        "max_team_members": 1,
        "max_workspaces": 1,
        "features": {
            "basic_editor": true,
            "ai_assistant": true,
            "knowledge_graph": false,
            "advanced_analytics": false,
            "custom_branding": false,
            "priority_support": false,
            "api_access": false,
            "export_data": true
        }
    }'::jsonb,
    1
),
(
    'pro',
    'Pro',
    'For professionals and growing teams',
    19.99,
    199.99,
    '{
        "max_pages": 500,
        "max_ai_queries_per_day": 500,
        "max_storage_mb": 10240,
        "max_team_members": 10,
        "max_workspaces": 5,
        "features": {
            "basic_editor": true,
            "ai_assistant": true,
            "knowledge_graph": true,
            "advanced_analytics": true,
            "custom_branding": false,
            "priority_support": true,
            "api_access": true,
            "export_data": true,
            "collaboration": true,
            "version_history": true
        }
    }'::jsonb,
    2
),
(
    'enterprise',
    'Enterprise',
    'For large organizations with advanced needs',
    99.99,
    999.99,
    '{
        "max_pages": -1,
        "max_ai_queries_per_day": -1,
        "max_storage_mb": -1,
        "max_team_members": -1,
        "max_workspaces": -1,
        "features": {
            "basic_editor": true,
            "ai_assistant": true,
            "knowledge_graph": true,
            "advanced_analytics": true,
            "custom_branding": true,
            "priority_support": true,
            "api_access": true,
            "export_data": true,
            "collaboration": true,
            "version_history": true,
            "sso": true,
            "custom_integrations": true,
            "dedicated_support": true,
            "sla": true
        }
    }'::jsonb,
    3
)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 6. ASSIGN FREE PLAN TO EXISTING WORKSPACES
-- ============================================
INSERT INTO workspace_subscriptions (workspace_id, plan_id, current_period_end)
SELECT 
    w.id,
    (SELECT id FROM subscription_plans WHERE name = 'free'),
    NOW() + INTERVAL '100 years' -- Free plan never expires
FROM workspaces w
WHERE NOT EXISTS (
    SELECT 1 FROM workspace_subscriptions ws WHERE ws.workspace_id = w.id
)
ON CONFLICT (workspace_id) DO NOTHING;

-- ============================================
-- 7. INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_workspace_subscriptions_workspace ON workspace_subscriptions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_subscriptions_status ON workspace_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_usage_metrics_workspace ON usage_metrics(workspace_id);
CREATE INDEX IF NOT EXISTS idx_usage_metrics_period ON usage_metrics(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_billing_history_workspace ON billing_history(workspace_id);

-- ============================================
-- 8. RLS POLICIES
-- ============================================

-- Subscription plans are public (everyone can see available plans)
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view subscription plans"
    ON subscription_plans FOR SELECT
    USING (true);

-- Workspace subscriptions - users can only see their workspace subscriptions
ALTER TABLE workspace_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their workspace subscriptions"
    ON workspace_subscriptions FOR SELECT
    USING (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members 
            WHERE user_id = auth.uid()
        )
    );

-- Usage metrics - users can only see their workspace metrics
ALTER TABLE usage_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their workspace usage"
    ON usage_metrics FOR SELECT
    USING (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members 
            WHERE user_id = auth.uid()
        )
    );

-- Billing history - users can only see their workspace billing
ALTER TABLE billing_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their workspace billing"
    ON billing_history FOR SELECT
    USING (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members 
            WHERE user_id = auth.uid()
        )
    );

-- ============================================
-- 9. HELPER FUNCTIONS
-- ============================================

-- Function to check if workspace can perform action
CREATE OR REPLACE FUNCTION check_workspace_limit(
    p_workspace_id UUID,
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
    FROM workspace_subscriptions ws
    JOIN subscription_plans sp ON ws.plan_id = sp.id
    WHERE ws.workspace_id = p_workspace_id
    AND ws.status = 'active';
    
    -- -1 means unlimited
    IF v_plan_limit = -1 THEN
        RETURN TRUE;
    END IF;
    
    -- Get current usage for this period
    SELECT COALESCE(count, 0)
    INTO v_current_usage
    FROM usage_metrics
    WHERE workspace_id = p_workspace_id
    AND metric_type = p_metric_type
    AND period_start <= NOW()
    AND period_end >= NOW();
    
    -- Check if adding increment would exceed limit
    RETURN (v_current_usage + p_increment) <= v_plan_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment usage
CREATE OR REPLACE FUNCTION increment_usage(
    p_workspace_id UUID,
    p_metric_type TEXT,
    p_increment INTEGER DEFAULT 1
)
RETURNS VOID AS $$
DECLARE
    v_period_start TIMESTAMPTZ;
    v_period_end TIMESTAMPTZ;
BEGIN
    -- Calculate current billing period
    SELECT current_period_start, current_period_end
    INTO v_period_start, v_period_end
    FROM workspace_subscriptions
    WHERE workspace_id = p_workspace_id;
    
    -- Insert or update usage
    INSERT INTO usage_metrics (workspace_id, metric_type, count, period_start, period_end)
    VALUES (p_workspace_id, p_metric_type, p_increment, v_period_start, v_period_end)
    ON CONFLICT (workspace_id, metric_type, period_start)
    DO UPDATE SET count = usage_metrics.count + p_increment;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 10. TRIGGERS FOR AUTO-TRACKING
-- ============================================

-- Auto-track page creation
CREATE OR REPLACE FUNCTION track_page_creation()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM increment_usage(NEW.workspace_id, 'max_pages', 1);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_track_page_creation
    AFTER INSERT ON pages
    FOR EACH ROW
    EXECUTE FUNCTION track_page_creation();

COMMENT ON TABLE subscription_plans IS 'Available subscription plans with features and pricing';
COMMENT ON TABLE workspace_subscriptions IS 'Active subscriptions for each workspace';
COMMENT ON TABLE usage_metrics IS 'Track usage against plan limits';
COMMENT ON TABLE billing_history IS 'Payment and invoice history';
