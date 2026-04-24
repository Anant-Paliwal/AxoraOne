-- ============================================
-- COMPLETE RAZORPAY SUBSCRIPTION SYSTEM SETUP
-- Run this single file to set up everything
-- Safe to run multiple times (idempotent)
-- ============================================

-- ============================================
-- PART 1: CREATE TABLES
-- ============================================

-- 1. Subscription Plans Table
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

-- Add Razorpay column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='subscription_plans' 
                   AND column_name='razorpay_plan_id') THEN
        ALTER TABLE subscription_plans ADD COLUMN razorpay_plan_id TEXT;
    END IF;
END $$;

-- 2. User Subscriptions Table
CREATE TABLE IF NOT EXISTS user_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES subscription_plans(id),
    status TEXT NOT NULL DEFAULT 'active',
    billing_cycle TEXT NOT NULL DEFAULT 'monthly',
    current_period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    current_period_end TIMESTAMPTZ NOT NULL,
    cancel_at_period_end BOOLEAN DEFAULT false,
    trial_end TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Add Razorpay columns if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='user_subscriptions' 
                   AND column_name='razorpay_subscription_id') THEN
        ALTER TABLE user_subscriptions ADD COLUMN razorpay_subscription_id TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='user_subscriptions' 
                   AND column_name='razorpay_payment_id') THEN
        ALTER TABLE user_subscriptions ADD COLUMN razorpay_payment_id TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='user_subscriptions' 
                   AND column_name='razorpay_customer_id') THEN
        ALTER TABLE user_subscriptions ADD COLUMN razorpay_customer_id TEXT;
    END IF;
END $$;

-- 3. User Usage Metrics Table
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

-- 4. Billing History Table
CREATE TABLE IF NOT EXISTS billing_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    currency TEXT DEFAULT 'INR',
    status TEXT NOT NULL,
    description TEXT,
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add Razorpay columns if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='billing_history' 
                   AND column_name='razorpay_payment_id') THEN
        ALTER TABLE billing_history ADD COLUMN razorpay_payment_id TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='billing_history' 
                   AND column_name='razorpay_invoice_id') THEN
        ALTER TABLE billing_history ADD COLUMN razorpay_invoice_id TEXT;
    END IF;
END $$;

-- ============================================
-- PART 2: INSERT DEFAULT PLANS
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
-- PART 3: ASSIGN FREE PLAN TO EXISTING USERS
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
-- PART 4: STORAGE TRACKING TRIGGERS
-- ============================================

CREATE OR REPLACE FUNCTION track_page_storage()
RETURNS TRIGGER AS $$
DECLARE
    owner_id UUID;
    bytes_added BIGINT;
    mb_added INTEGER;
BEGIN
    -- Get workspace owner
    IF NEW.workspace_id IS NOT NULL OR OLD.workspace_id IS NOT NULL THEN
        SELECT user_id INTO owner_id 
        FROM workspaces 
        WHERE id = COALESCE(NEW.workspace_id, OLD.workspace_id);
        
        IF owner_id IS NOT NULL THEN
            -- Calculate bytes added/removed
            IF TG_OP = 'INSERT' THEN
                bytes_added := COALESCE(octet_length(NEW.content::text), 0);
            ELSIF TG_OP = 'UPDATE' THEN
                bytes_added := COALESCE(octet_length(NEW.content::text), 0) - 
                               COALESCE(octet_length(OLD.content::text), 0);
            ELSIF TG_OP = 'DELETE' THEN
                bytes_added := -COALESCE(octet_length(OLD.content::text), 0);
            END IF;
            
            -- Convert to MB
            mb_added := bytes_added / (1024 * 1024);
            
            IF mb_added != 0 THEN
                DECLARE
                    period_start TIMESTAMPTZ;
                    period_end TIMESTAMPTZ;
                BEGIN
                    SELECT current_period_start, current_period_end 
                    INTO period_start, period_end
                    FROM user_subscriptions
                    WHERE user_id = owner_id;
                    
                    IF period_start IS NOT NULL THEN
                        INSERT INTO user_usage_metrics (
                            user_id,
                            metric_type,
                            count,
                            period_start,
                            period_end
                        ) VALUES (
                            owner_id,
                            'max_storage_mb',
                            GREATEST(0, mb_added),
                            period_start,
                            period_end
                        )
                        ON CONFLICT (user_id, metric_type, period_start)
                        DO UPDATE SET 
                            count = GREATEST(0, user_usage_metrics.count + mb_added);
                    END IF;
                END;
            END IF;
        END IF;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_track_page_storage_insert ON pages;
CREATE TRIGGER trigger_track_page_storage_insert
    AFTER INSERT ON pages
    FOR EACH ROW
    EXECUTE FUNCTION track_page_storage();

DROP TRIGGER IF EXISTS trigger_track_page_storage_update ON pages;
CREATE TRIGGER trigger_track_page_storage_update
    AFTER UPDATE ON pages
    FOR EACH ROW
    WHEN (OLD.content IS DISTINCT FROM NEW.content)
    EXECUTE FUNCTION track_page_storage();

DROP TRIGGER IF EXISTS trigger_track_page_storage_delete ON pages;
CREATE TRIGGER trigger_track_page_storage_delete
    AFTER DELETE ON pages
    FOR EACH ROW
    EXECUTE FUNCTION track_page_storage();

-- ============================================
-- PART 5: TEAM MEMBER TRACKING TRIGGERS
-- ============================================

CREATE OR REPLACE FUNCTION track_team_member_change()
RETURNS TRIGGER AS $$
DECLARE
    owner_id UUID;
    period_start TIMESTAMPTZ;
    period_end TIMESTAMPTZ;
BEGIN
    IF NEW.workspace_id IS NOT NULL OR OLD.workspace_id IS NOT NULL THEN
        SELECT user_id INTO owner_id 
        FROM workspaces 
        WHERE id = COALESCE(NEW.workspace_id, OLD.workspace_id);
        
        IF owner_id IS NOT NULL THEN
            SELECT current_period_start, current_period_end 
            INTO period_start, period_end
            FROM user_subscriptions
            WHERE user_id = owner_id;
            
            IF period_start IS NOT NULL THEN
                IF TG_OP = 'INSERT' THEN
                    INSERT INTO user_usage_metrics (
                        user_id,
                        metric_type,
                        count,
                        period_start,
                        period_end
                    ) VALUES (
                        owner_id,
                        'max_team_members',
                        1,
                        period_start,
                        period_end
                    )
                    ON CONFLICT (user_id, metric_type, period_start)
                    DO UPDATE SET count = user_usage_metrics.count + 1;
                    
                ELSIF TG_OP = 'DELETE' THEN
                    UPDATE user_usage_metrics
                    SET count = GREATEST(0, count - 1)
                    WHERE user_id = owner_id
                      AND metric_type = 'max_team_members'
                      AND period_start = period_start;
                END IF;
            END IF;
        END IF;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_track_team_member_add ON workspace_members;
CREATE TRIGGER trigger_track_team_member_add
    AFTER INSERT ON workspace_members
    FOR EACH ROW
    EXECUTE FUNCTION track_team_member_change();

DROP TRIGGER IF EXISTS trigger_track_team_member_remove ON workspace_members;
CREATE TRIGGER trigger_track_team_member_remove
    AFTER DELETE ON workspace_members
    FOR EACH ROW
    EXECUTE FUNCTION track_team_member_change();

-- ============================================
-- PART 6: INITIALIZE CURRENT USAGE
-- ============================================

-- Calculate current storage usage
INSERT INTO user_usage_metrics (user_id, metric_type, count, period_start, period_end)
SELECT 
    w.user_id,
    'max_storage_mb' as metric_type,
    COALESCE(SUM(octet_length(p.content::text)) / (1024 * 1024), 0) as count,
    us.current_period_start,
    us.current_period_end
FROM workspaces w
JOIN user_subscriptions us ON us.user_id = w.user_id
LEFT JOIN pages p ON p.workspace_id = w.id
GROUP BY w.user_id, us.current_period_start, us.current_period_end
ON CONFLICT (user_id, metric_type, period_start) 
DO UPDATE SET count = EXCLUDED.count;

-- Calculate current team member count
INSERT INTO user_usage_metrics (user_id, metric_type, count, period_start, period_end)
SELECT 
    w.user_id,
    'max_team_members' as metric_type,
    COUNT(DISTINCT wm.user_id) as count,
    us.current_period_start,
    us.current_period_end
FROM workspaces w
JOIN user_subscriptions us ON us.user_id = w.user_id
LEFT JOIN workspace_members wm ON wm.workspace_id = w.id
GROUP BY w.user_id, us.current_period_start, us.current_period_end
ON CONFLICT (user_id, metric_type, period_start)
DO UPDATE SET count = EXCLUDED.count;

-- ============================================
-- PART 7: CREATE INDEXES
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
-- PART 8: ENABLE ROW LEVEL SECURITY
-- ============================================

ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_usage_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_history ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PART 9: RLS POLICIES
-- ============================================

DROP POLICY IF EXISTS "Anyone can view subscription plans" ON subscription_plans;
CREATE POLICY "Anyone can view subscription plans"
    ON subscription_plans FOR SELECT
    USING (is_active = true);

DROP POLICY IF EXISTS "Users can view own subscription" ON user_subscriptions;
CREATE POLICY "Users can view own subscription"
    ON user_subscriptions FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own subscription" ON user_subscriptions;
CREATE POLICY "Users can update own subscription"
    ON user_subscriptions FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own usage" ON user_usage_metrics;
CREATE POLICY "Users can view own usage"
    ON user_usage_metrics FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own billing history" ON billing_history;
CREATE POLICY "Users can view own billing history"
    ON billing_history FOR SELECT
    USING (auth.uid() = user_id);

-- ============================================
-- PART 10: HELPER FUNCTIONS
-- ============================================

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
    SELECT (sp.features->>p_metric_type)::INTEGER INTO v_limit
    FROM user_subscriptions us
    JOIN subscription_plans sp ON sp.id = us.plan_id
    WHERE us.user_id = p_user_id
    AND us.status = 'active';
    
    IF v_limit = -1 THEN
        RETURN TRUE;
    END IF;
    
    SELECT COALESCE(count, 0) INTO v_current
    FROM user_usage_metrics
    WHERE user_id = p_user_id
    AND metric_type = p_metric_type
    AND period_end > NOW();
    
    RETURN (v_current + p_increment) <= v_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

DO $$
DECLARE
    plan_count INTEGER;
    user_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO plan_count FROM subscription_plans;
    SELECT COUNT(*) INTO user_count FROM user_subscriptions;
    
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ SUBSCRIPTION SYSTEM SETUP COMPLETE!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE '✅ Tables created: 4';
    RAISE NOTICE '✅ Subscription plans: %', plan_count;
    RAISE NOTICE '✅ Users assigned: %', user_count;
    RAISE NOTICE '✅ Triggers created: 5';
    RAISE NOTICE '✅ Indexes created: 9';
    RAISE NOTICE '✅ RLS policies: 5';
    RAISE NOTICE '✅ Helper functions: 2';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Configure Razorpay credentials in .env';
    RAISE NOTICE '2. Restart backend server';
    RAISE NOTICE '3. Test payment flow';
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
END $$;
