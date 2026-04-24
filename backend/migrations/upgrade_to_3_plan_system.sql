-- ============================================
-- UPGRADE TO 3-PLAN SYSTEM (FREE, PRO, PRO_PLUS)
-- Remove Enterprise, Add DB-driven feature flags
-- ============================================

-- ============================================
-- STEP 1: DROP OLD PLANS AND RECREATE TABLE
-- ============================================

-- Temporarily disable foreign key constraints
ALTER TABLE IF EXISTS user_subscriptions DROP CONSTRAINT IF EXISTS user_subscriptions_plan_id_fkey;
ALTER TABLE IF EXISTS user_subscriptions DROP CONSTRAINT IF EXISTS user_subscriptions_plan_code_fkey;

-- Drop old table and recreate with new structure
DROP TABLE IF EXISTS subscription_plans CASCADE;

CREATE TABLE subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    
    -- Pricing (INR)
    price_monthly_inr INT NOT NULL DEFAULT 0,
    price_yearly_inr INT,
    
    -- Razorpay Plan IDs
    razorpay_plan_id_monthly TEXT,
    razorpay_plan_id_yearly TEXT,
    
    -- Core Limits (NULL = unlimited)
    workspaces_limit INT,
    collaborators_limit INT,
    ask_anything_daily_limit INT NOT NULL DEFAULT 10,
    page_history_days INT NOT NULL DEFAULT 7,
    
    -- Feature Flags (DB-driven)
    can_share_workspace BOOLEAN DEFAULT true,
    can_share_page_readonly BOOLEAN DEFAULT true,
    can_share_page_edit BOOLEAN DEFAULT false,
    can_assign_tasks BOOLEAN DEFAULT false,
    can_team_pulse BOOLEAN DEFAULT false,
    can_skill_insights_history BOOLEAN DEFAULT false,
    skill_insights_history_days INT DEFAULT 0,
    knowledge_graph_level TEXT DEFAULT 'basic' CHECK (knowledge_graph_level IN ('basic', 'advanced')),
    
    -- Metadata
    is_active BOOLEAN DEFAULT true,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- STEP 2: RECREATE USER_SUBSCRIPTIONS TABLE
-- ============================================

-- Backup existing subscriptions if table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_subscriptions') THEN
        CREATE TEMP TABLE user_subscriptions_backup AS 
        SELECT * FROM user_subscriptions;
    END IF;
END $$;

DROP TABLE IF EXISTS user_subscriptions CASCADE;

CREATE TABLE user_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    plan_code TEXT NOT NULL REFERENCES subscription_plans(code) ON DELETE RESTRICT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending', 'cancelled', 'expired')),
    
    -- Billing
    billing_cycle TEXT CHECK (billing_cycle IN ('monthly', 'yearly')),
    start_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    end_at TIMESTAMP WITH TIME ZONE,
    current_period_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    current_period_end TIMESTAMP WITH TIME ZONE,
    cancel_at_period_end BOOLEAN DEFAULT false,
    
    -- Razorpay Integration
    razorpay_subscription_id TEXT UNIQUE,
    razorpay_customer_id TEXT,
    razorpay_plan_id TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX idx_user_subscriptions_plan_code ON user_subscriptions(plan_code);
CREATE INDEX idx_user_subscriptions_status ON user_subscriptions(status);

-- ============================================
-- STEP 3: CREATE ASK_ANYTHING_USAGE_DAILY TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS ask_anything_usage_daily (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
    used_count INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, usage_date)
);

CREATE INDEX IF NOT EXISTS idx_ask_anything_usage_user_date ON ask_anything_usage_daily(user_id, usage_date);

-- ============================================
-- STEP 4: ENSURE OTHER REQUIRED TABLES EXIST
-- ============================================

-- Workspaces table (check if it exists, don't recreate)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'workspaces') THEN
        CREATE TABLE workspaces (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            description TEXT,
            is_default BOOLEAN DEFAULT false,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        CREATE INDEX idx_workspaces_user ON workspaces(user_id);
    END IF;
END $$;

-- Workspace members table (check if it exists, don't recreate)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'workspace_members') THEN
        CREATE TABLE workspace_members (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
            user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('owner', 'admin', 'editor', 'viewer')),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE(workspace_id, user_id)
        );
        
        CREATE INDEX idx_workspace_members_workspace ON workspace_members(workspace_id);
        CREATE INDEX idx_workspace_members_user ON workspace_members(user_id);
    END IF;
END $$;

-- Pages table (check if it exists, don't recreate)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pages') THEN
        CREATE TABLE pages (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
            parent_page_id UUID REFERENCES pages(id) ON DELETE CASCADE,
            title TEXT NOT NULL DEFAULT 'Untitled',
            content_json JSONB DEFAULT '[]'::jsonb,
            icon TEXT,
            cover_image TEXT,
            created_by UUID REFERENCES auth.users(id),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        CREATE INDEX idx_pages_workspace ON pages(workspace_id);
        CREATE INDEX idx_pages_parent ON pages(parent_page_id);
    END IF;
END $$;

-- Page revisions table (check if it exists, don't recreate)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'page_revisions') THEN
        CREATE TABLE page_revisions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            page_id UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
            content_json JSONB NOT NULL,
            created_by UUID REFERENCES auth.users(id),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            source TEXT DEFAULT 'client' CHECK (source IN ('client', 'server'))
        );
        
        CREATE INDEX idx_page_revisions_page ON page_revisions(page_id, created_at DESC);
    END IF;
END $$;

-- Tasks table (check if it exists, don't recreate)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tasks') THEN
        CREATE TABLE tasks (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
            title TEXT NOT NULL,
            description TEXT,
            status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'progress', 'blocked', 'done')),
            due_date DATE,
            priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
            effort TEXT DEFAULT 'medium' CHECK (effort IN ('small', 'medium', 'large')),
            linked_page_id UUID REFERENCES pages(id) ON DELETE SET NULL,
            assigned_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
            created_by UUID REFERENCES auth.users(id),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        CREATE INDEX idx_tasks_workspace ON tasks(workspace_id);
        CREATE INDEX idx_tasks_assigned ON tasks(assigned_user_id);
        CREATE INDEX idx_tasks_status ON tasks(status);
    END IF;
END $$;

-- Page shares table (check if it exists, don't recreate)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'page_shares') THEN
        CREATE TABLE page_shares (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            page_id UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
            user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            permission TEXT NOT NULL DEFAULT 'read' CHECK (permission IN ('read', 'edit')),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE(page_id, user_id)
        );
        
        CREATE INDEX idx_page_shares_page ON page_shares(page_id);
        CREATE INDEX idx_page_shares_user ON page_shares(user_id);
    END IF;
END $$;

-- ============================================
-- STEP 5: SEED SUBSCRIPTION PLANS
-- ============================================

INSERT INTO subscription_plans (
    code, name, description,
    price_monthly_inr, price_yearly_inr,
    workspaces_limit, collaborators_limit, ask_anything_daily_limit, page_history_days,
    can_share_workspace, can_share_page_readonly, can_share_page_edit, can_assign_tasks,
    can_team_pulse, can_skill_insights_history, skill_insights_history_days,
    knowledge_graph_level, is_active, sort_order
) VALUES
-- FREE PLAN
(
    'FREE', 'Free', 'Perfect for individuals getting started',
    0, NULL,
    5, 3, 10, 7,
    true, true, false, false,
    false, false, 0,
    'basic', true, 1
),
-- PRO PLAN
(
    'PRO', 'Pro', 'For professionals who need more power',
    499, 4999,
    20, 10, 100, 30,
    true, true, true, true,
    false, true, 30,
    'advanced', true, 2
),
-- PRO PLUS PLAN
(
    'PRO_PLUS', 'Pro Plus', 'For teams and power users',
    999, 9999,
    NULL, NULL, 300, 90,
    true, true, true, true,
    true, true, 90,
    'advanced', true, 3
);

-- ============================================
-- STEP 6: MIGRATE EXISTING USERS TO FREE PLAN
-- ============================================

-- Set all existing users to FREE plan
INSERT INTO user_subscriptions (user_id, plan_code, status, billing_cycle)
SELECT 
    id, 
    'FREE', 
    'active',
    NULL
FROM auth.users
ON CONFLICT (user_id) DO UPDATE
SET 
    plan_code = 'FREE',
    status = 'active',
    updated_at = NOW();

-- ============================================
-- STEP 7: ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ask_anything_usage_daily ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Plans are viewable by everyone" ON subscription_plans;
DROP POLICY IF EXISTS "Users can view own subscription" ON user_subscriptions;
DROP POLICY IF EXISTS "Users can view own usage" ON ask_anything_usage_daily;
DROP POLICY IF EXISTS "Users can insert own usage" ON ask_anything_usage_daily;
DROP POLICY IF EXISTS "Users can update own usage" ON ask_anything_usage_daily;

-- Plans are readable by everyone
CREATE POLICY "Plans are viewable by everyone"
    ON subscription_plans FOR SELECT
    USING (is_active = true);

-- Users can view their own subscription
CREATE POLICY "Users can view own subscription"
    ON user_subscriptions FOR SELECT
    USING (auth.uid() = user_id);

-- Users can view their own usage
CREATE POLICY "Users can view own usage"
    ON ask_anything_usage_daily FOR SELECT
    USING (auth.uid() = user_id);

-- Users can insert their own usage
CREATE POLICY "Users can insert own usage"
    ON ask_anything_usage_daily FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own usage
CREATE POLICY "Users can update own usage"
    ON ask_anything_usage_daily FOR UPDATE
    USING (auth.uid() = user_id);

-- ============================================
-- STEP 8: HELPER FUNCTIONS
-- ============================================

-- Drop OLD subscription system functions (different signatures)
DROP FUNCTION IF EXISTS check_workspace_limit(UUID, TEXT, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS check_workspace_limit(UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS increment_usage(UUID, TEXT, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS increment_usage(UUID, TEXT) CASCADE;

-- Drop NEW system functions if they exist (to handle return type changes)
DROP FUNCTION IF EXISTS get_user_plan(UUID) CASCADE;
DROP FUNCTION IF EXISTS check_ask_anything_limit(UUID) CASCADE;
DROP FUNCTION IF EXISTS increment_ask_anything_usage(UUID) CASCADE;
DROP FUNCTION IF EXISTS check_workspace_limit(UUID) CASCADE;
DROP FUNCTION IF EXISTS check_collaborator_limit(UUID) CASCADE;

-- Function to get user's plan
CREATE OR REPLACE FUNCTION get_user_plan(p_user_id UUID)
RETURNS TABLE (
    plan_code TEXT,
    workspaces_limit INT,
    collaborators_limit INT,
    ask_anything_daily_limit INT,
    page_history_days INT,
    can_share_workspace BOOLEAN,
    can_share_page_readonly BOOLEAN,
    can_share_page_edit BOOLEAN,
    can_assign_tasks BOOLEAN,
    can_team_pulse BOOLEAN,
    can_skill_insights_history BOOLEAN,
    skill_insights_history_days INT,
    knowledge_graph_level TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sp.code,
        sp.workspaces_limit,
        sp.collaborators_limit,
        sp.ask_anything_daily_limit,
        sp.page_history_days,
        sp.can_share_workspace,
        sp.can_share_page_readonly,
        sp.can_share_page_edit,
        sp.can_assign_tasks,
        sp.can_team_pulse,
        sp.can_skill_insights_history,
        sp.skill_insights_history_days,
        sp.knowledge_graph_level
    FROM user_subscriptions us
    JOIN subscription_plans sp ON us.plan_code = sp.code
    WHERE us.user_id = p_user_id
    AND us.status = 'active'
    LIMIT 1;
    
    -- If no subscription found, return FREE plan
    IF NOT FOUND THEN
        RETURN QUERY
        SELECT 
            sp.code,
            sp.workspaces_limit,
            sp.collaborators_limit,
            sp.ask_anything_daily_limit,
            sp.page_history_days,
            sp.can_share_workspace,
            sp.can_share_page_readonly,
            sp.can_share_page_edit,
            sp.can_assign_tasks,
            sp.can_team_pulse,
            sp.can_skill_insights_history,
            sp.skill_insights_history_days,
            sp.knowledge_graph_level
        FROM subscription_plans sp
        WHERE sp.code = 'FREE'
        LIMIT 1;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check Ask Anything usage
CREATE OR REPLACE FUNCTION check_ask_anything_limit(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_limit INT;
    v_used INT;
BEGIN
    -- Get user's daily limit
    SELECT ask_anything_daily_limit INTO v_limit
    FROM get_user_plan(p_user_id);
    
    -- Get today's usage
    SELECT COALESCE(used_count, 0) INTO v_used
    FROM ask_anything_usage_daily
    WHERE user_id = p_user_id
    AND usage_date = CURRENT_DATE;
    
    -- Return true if under limit
    RETURN v_used < v_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment Ask Anything usage
CREATE OR REPLACE FUNCTION increment_ask_anything_usage(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
    INSERT INTO ask_anything_usage_daily (user_id, usage_date, used_count)
    VALUES (p_user_id, CURRENT_DATE, 1)
    ON CONFLICT (user_id, usage_date)
    DO UPDATE SET 
        used_count = ask_anything_usage_daily.used_count + 1,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check workspace limit
CREATE OR REPLACE FUNCTION check_workspace_limit(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_limit INT;
    v_count INT;
BEGIN
    -- Get user's workspace limit
    SELECT workspaces_limit INTO v_limit
    FROM get_user_plan(p_user_id);
    
    -- NULL means unlimited
    IF v_limit IS NULL THEN
        RETURN true;
    END IF;
    
    -- Count user's workspaces
    SELECT COUNT(*) INTO v_count
    FROM workspaces
    WHERE user_id = p_user_id;
    
    -- Return true if under limit
    RETURN v_count < v_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check collaborator limit for a workspace
CREATE OR REPLACE FUNCTION check_collaborator_limit(p_workspace_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_owner_id UUID;
    v_limit INT;
    v_count INT;
BEGIN
    -- Get workspace owner
    SELECT user_id INTO v_owner_id
    FROM workspaces
    WHERE id = p_workspace_id;
    
    -- Get owner's collaborator limit
    SELECT collaborators_limit INTO v_limit
    FROM get_user_plan(v_owner_id);
    
    -- NULL means unlimited
    IF v_limit IS NULL THEN
        RETURN true;
    END IF;
    
    -- Count workspace members (excluding owner)
    SELECT COUNT(*) INTO v_count
    FROM workspace_members
    WHERE workspace_id = p_workspace_id
    AND user_id != v_owner_id;
    
    -- Return true if under limit
    RETURN v_count < v_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- STEP 9: UPDATE TRIGGERS
-- ============================================

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS update_subscription_plans_updated_at ON subscription_plans;
DROP TRIGGER IF EXISTS update_user_subscriptions_updated_at ON user_subscriptions;
DROP TRIGGER IF EXISTS update_ask_anything_usage_updated_at ON ask_anything_usage_daily;

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_subscription_plans_updated_at
    BEFORE UPDATE ON subscription_plans
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_subscriptions_updated_at
    BEFORE UPDATE ON user_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ask_anything_usage_updated_at
    BEFORE UPDATE ON ask_anything_usage_daily
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- MIGRATION COMPLETE
-- ============================================

COMMENT ON TABLE subscription_plans IS '3-plan system: FREE, PRO, PRO_PLUS with DB-driven feature flags';
COMMENT ON TABLE user_subscriptions IS 'User-level subscriptions (one per user, applies to all workspaces)';
COMMENT ON TABLE ask_anything_usage_daily IS 'Daily Ask Anything usage tracking per user';
COMMENT ON FUNCTION get_user_plan IS 'Returns user plan with all limits and feature flags';
COMMENT ON FUNCTION check_ask_anything_limit IS 'Returns true if user has not exceeded daily Ask Anything limit';
COMMENT ON FUNCTION increment_ask_anything_usage IS 'Increments user Ask Anything usage for today';
COMMENT ON FUNCTION check_workspace_limit IS 'Returns true if user can create more workspaces';
COMMENT ON FUNCTION check_collaborator_limit IS 'Returns true if workspace can add more collaborators';