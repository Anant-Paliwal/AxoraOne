-- Add Storage and Team Member Usage Tracking
-- Run this migration to enable complete usage tracking

-- ============================================
-- 1. ADD RAZORPAY COLUMNS TO SUBSCRIPTION TABLES (IF NOT EXISTS)
-- ============================================

-- Add Razorpay columns to user_subscriptions (only if they don't exist)
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

-- Add Razorpay columns to billing_history (only if they don't exist)
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

-- Add Razorpay plan ID to subscription_plans (only if it doesn't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='subscription_plans' 
                   AND column_name='razorpay_plan_id') THEN
        ALTER TABLE subscription_plans ADD COLUMN razorpay_plan_id TEXT;
    END IF;
END $$;

-- ============================================
-- 2. STORAGE USAGE TRACKING FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION track_page_storage()
RETURNS TRIGGER AS $$
DECLARE
    owner_id UUID;
    bytes_added BIGINT;
    mb_added INTEGER;
BEGIN
    -- Get workspace owner
    IF NEW.workspace_id IS NOT NULL THEN
        SELECT user_id INTO owner_id 
        FROM workspaces 
        WHERE id = NEW.workspace_id;
        
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
            
            -- Convert to MB (only if significant change)
            mb_added := bytes_added / (1024 * 1024);
            
            IF mb_added != 0 THEN
                -- Get current period from user subscription
                DECLARE
                    period_start TIMESTAMPTZ;
                    period_end TIMESTAMPTZ;
                BEGIN
                    SELECT current_period_start, current_period_end 
                    INTO period_start, period_end
                    FROM user_subscriptions
                    WHERE user_id = owner_id;
                    
                    -- Upsert usage metric
                    INSERT INTO user_usage_metrics (
                        user_id,
                        metric_type,
                        count,
                        period_start,
                        period_end
                    ) VALUES (
                        owner_id,
                        'max_storage_mb',
                        GREATEST(0, mb_added),  -- Don't go negative
                        period_start,
                        period_end
                    )
                    ON CONFLICT (user_id, metric_type, period_start)
                    DO UPDATE SET 
                        count = GREATEST(0, user_usage_metrics.count + mb_added);
                END;
            END IF;
        END IF;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers for storage tracking
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
-- 3. TEAM MEMBER TRACKING FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION track_team_member_change()
RETURNS TRIGGER AS $$
DECLARE
    owner_id UUID;
    period_start TIMESTAMPTZ;
    period_end TIMESTAMPTZ;
BEGIN
    -- Get workspace owner
    IF NEW.workspace_id IS NOT NULL OR OLD.workspace_id IS NOT NULL THEN
        SELECT user_id INTO owner_id 
        FROM workspaces 
        WHERE id = COALESCE(NEW.workspace_id, OLD.workspace_id);
        
        IF owner_id IS NOT NULL THEN
            -- Get current period
            SELECT current_period_start, current_period_end 
            INTO period_start, period_end
            FROM user_subscriptions
            WHERE user_id = owner_id;
            
            IF TG_OP = 'INSERT' THEN
                -- Increment team member count
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
                -- Decrement team member count
                UPDATE user_usage_metrics
                SET count = GREATEST(0, count - 1)
                WHERE user_id = owner_id
                  AND metric_type = 'max_team_members'
                  AND period_start = period_start;
            END IF;
        END IF;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers for team member tracking
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
-- 4. INITIALIZE CURRENT USAGE FOR EXISTING USERS
-- ============================================

-- Calculate current storage usage for all users
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

-- Calculate current team member count for all users
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
-- 5. ADD INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_razorpay 
ON user_subscriptions(razorpay_subscription_id);

CREATE INDEX IF NOT EXISTS idx_billing_history_razorpay 
ON billing_history(razorpay_payment_id);

CREATE INDEX IF NOT EXISTS idx_user_usage_metrics_lookup
ON user_usage_metrics(user_id, metric_type, period_start);

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check storage usage
-- SELECT 
--     u.email,
--     uum.metric_type,
--     uum.count as current_usage,
--     sp.features->>'max_storage_mb' as limit
-- FROM user_usage_metrics uum
-- JOIN user_subscriptions us ON us.user_id = uum.user_id
-- JOIN subscription_plans sp ON sp.id = us.plan_id
-- JOIN auth.users u ON u.id = uum.user_id
-- WHERE uum.metric_type = 'max_storage_mb';

-- Check team member usage
-- SELECT 
--     u.email,
--     uum.metric_type,
--     uum.count as current_usage,
--     sp.features->>'max_team_members' as limit
-- FROM user_usage_metrics uum
-- JOIN user_subscriptions us ON us.user_id = uum.user_id
-- JOIN subscription_plans sp ON sp.id = us.plan_id
-- JOIN auth.users u ON u.id = uum.user_id
-- WHERE uum.metric_type = 'max_team_members';
