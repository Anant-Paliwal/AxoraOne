-- Quick Fix: Setup Subscription System
-- Run this file to fix the workspace_members error and setup subscriptions

-- ============================================
-- STEP 1: CREATE WORKSPACE MEMBERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS workspace_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member',
    invited_by UUID REFERENCES auth.users(id),
    invited_at TIMESTAMPTZ DEFAULT NOW(),
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(workspace_id, user_id)
);

-- Add existing workspace owners
INSERT INTO workspace_members (workspace_id, user_id, role)
SELECT id, user_id, 'owner'
FROM workspaces
WHERE user_id IS NOT NULL
ON CONFLICT (workspace_id, user_id) DO NOTHING;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace ON workspace_members(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_user ON workspace_members(user_id);

-- RLS
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view workspace members" ON workspace_members;
CREATE POLICY "Users can view workspace members"
    ON workspace_members FOR SELECT
    USING (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members 
            WHERE user_id = auth.uid()
        )
    );

-- ============================================
-- STEP 2: CREATE SUBSCRIPTION TABLES
-- ============================================

-- Subscription Plans
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
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workspace Subscriptions
CREATE TABLE IF NOT EXISTS workspace_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES subscription_plans(id),
    status TEXT NOT NULL DEFAULT 'active',
    billing_cycle TEXT NOT NULL DEFAULT 'monthly',
    current_period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    current_period_end TIMESTAMPTZ NOT NULL,
    cancel_at_period_end BOOLEAN DEFAULT false,
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    stripe_price_id TEXT,
    trial_end TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(workspace_id)
);

-- Usage Metrics
CREATE TABLE IF NOT EXISTS usage_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    metric_type TEXT NOT NULL,
    count INTEGER NOT NULL DEFAULT 0,
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(workspace_id, metric_type, period_start)
);

-- ============================================
-- STEP 3: INSERT DEFAULT PLANS
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
            "priority_support": false
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
            "priority_support": true,
            "collaboration": true
        }
    }'::jsonb,
    2
),
(
    'enterprise',
    'Enterprise',
    'For large organizations',
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
            "priority_support": true,
            "collaboration": true,
            "sso": true,
            "dedicated_support": true
        }
    }'::jsonb,
    3
)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- STEP 4: ASSIGN FREE PLAN TO WORKSPACES
-- ============================================
INSERT INTO workspace_subscriptions (workspace_id, plan_id, current_period_end)
SELECT 
    w.id,
    (SELECT id FROM subscription_plans WHERE name = 'free'),
    NOW() + INTERVAL '100 years'
FROM workspaces w
WHERE NOT EXISTS (
    SELECT 1 FROM workspace_subscriptions ws WHERE ws.workspace_id = w.id
)
ON CONFLICT (workspace_id) DO NOTHING;

-- ============================================
-- STEP 5: INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_workspace_subscriptions_workspace ON workspace_subscriptions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_usage_metrics_workspace ON usage_metrics(workspace_id);

-- ============================================
-- STEP 6: RLS POLICIES
-- ============================================

-- Subscription plans are public
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view subscription plans" ON subscription_plans;
CREATE POLICY "Anyone can view subscription plans"
    ON subscription_plans FOR SELECT
    USING (true);

-- Workspace subscriptions
ALTER TABLE workspace_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their workspace subscriptions" ON workspace_subscriptions;
CREATE POLICY "Users can view their workspace subscriptions"
    ON workspace_subscriptions FOR SELECT
    USING (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members 
            WHERE user_id = auth.uid()
        )
    );

-- Usage metrics
ALTER TABLE usage_metrics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their workspace usage" ON usage_metrics;
CREATE POLICY "Users can view their workspace usage"
    ON usage_metrics FOR SELECT
    USING (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members 
            WHERE user_id = auth.uid()
        )
    );

-- ============================================
-- DONE!
-- ============================================
SELECT 'Subscription system setup complete!' as status;
