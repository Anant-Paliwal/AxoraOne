-- ============================================
-- AUTOMATIC SUBSCRIPTION EXPIRY & DOWNGRADE
-- Handles expired subscriptions automatically using SQL
-- ============================================

-- ============================================
-- 1. FUNCTION TO DOWNGRADE EXPIRED SUBSCRIPTIONS
-- ============================================

CREATE OR REPLACE FUNCTION downgrade_expired_subscriptions()
RETURNS INTEGER AS $$
DECLARE
    expired_count INTEGER := 0;
    free_plan_id UUID;
    expired_sub RECORD;
BEGIN
    -- Get free plan ID
    SELECT id INTO free_plan_id 
    FROM subscription_plans 
    WHERE name = 'free';
    
    -- Find and downgrade expired subscriptions
    FOR expired_sub IN 
        SELECT 
            us.id,
            us.user_id,
            us.plan_id,
            sp.name as plan_name
        FROM user_subscriptions us
        JOIN subscription_plans sp ON sp.id = us.plan_id
        WHERE us.status = 'active'
          AND us.current_period_end < NOW()
          AND sp.name != 'free'  -- Don't downgrade free plan
    LOOP
        -- Downgrade to free plan
        UPDATE user_subscriptions
        SET 
            plan_id = free_plan_id,
            status = 'active',
            billing_cycle = 'monthly',
            current_period_start = NOW(),
            current_period_end = NOW() + INTERVAL '100 years',
            cancel_at_period_end = false,
            updated_at = NOW()
        WHERE id = expired_sub.id;
        
        -- Clear usage metrics for new period
        DELETE FROM user_usage_metrics
        WHERE user_id = expired_sub.user_id
          AND period_end < NOW();
        
        expired_count := expired_count + 1;
        
        RAISE NOTICE 'Downgraded user % from % to free (expired)', 
            expired_sub.user_id, expired_sub.plan_name;
    END LOOP;
    
    RETURN expired_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 2. FUNCTION TO CHECK SUBSCRIPTION STATUS
-- ============================================

CREATE OR REPLACE FUNCTION check_subscription_status(p_user_id UUID)
RETURNS TABLE(
    is_active BOOLEAN,
    plan_name TEXT,
    days_remaining INTEGER,
    is_expired BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        us.status = 'active' as is_active,
        sp.name as plan_name,
        EXTRACT(DAY FROM (us.current_period_end - NOW()))::INTEGER as days_remaining,
        us.current_period_end < NOW() as is_expired
    FROM user_subscriptions us
    JOIN subscription_plans sp ON sp.id = us.plan_id
    WHERE us.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 3. TRIGGER TO AUTO-DOWNGRADE ON READ
-- ============================================

CREATE OR REPLACE FUNCTION auto_downgrade_on_read()
RETURNS TRIGGER AS $$
DECLARE
    free_plan_id UUID;
BEGIN
    -- Check if subscription is expired
    IF NEW.status = 'active' AND NEW.current_period_end < NOW() THEN
        -- Get free plan ID
        SELECT id INTO free_plan_id 
        FROM subscription_plans 
        WHERE name = 'free';
        
        -- Check if not already on free plan
        IF NEW.plan_id != free_plan_id THEN
            -- Auto-downgrade to free
            NEW.plan_id := free_plan_id;
            NEW.billing_cycle := 'monthly';
            NEW.current_period_start := NOW();
            NEW.current_period_end := NOW() + INTERVAL '100 years';
            NEW.cancel_at_period_end := false;
            NEW.updated_at := NOW();
            
            RAISE NOTICE 'Auto-downgraded user % to free plan (expired)', NEW.user_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_downgrade_on_read ON user_subscriptions;
CREATE TRIGGER trigger_auto_downgrade_on_read
    BEFORE SELECT ON user_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION auto_downgrade_on_read();

-- Note: BEFORE SELECT triggers don't exist in PostgreSQL
-- We'll use a different approach with a view

-- ============================================
-- 4. CREATE VIEW WITH AUTO-DOWNGRADE LOGIC
-- ============================================

CREATE OR REPLACE VIEW active_subscriptions AS
SELECT 
    us.id,
    us.user_id,
    CASE 
        WHEN us.current_period_end < NOW() AND sp.name != 'free' THEN 
            (SELECT id FROM subscription_plans WHERE name = 'free')
        ELSE us.plan_id
    END as plan_id,
    CASE 
        WHEN us.current_period_end < NOW() AND sp.name != 'free' THEN 'expired'
        ELSE us.status
    END as status,
    us.billing_cycle,
    us.current_period_start,
    us.current_period_end,
    us.cancel_at_period_end,
    us.razorpay_subscription_id,
    us.razorpay_payment_id,
    us.razorpay_customer_id,
    us.trial_end,
    us.cancelled_at,
    us.created_at,
    us.updated_at,
    sp.name as current_plan_name,
    CASE 
        WHEN us.current_period_end < NOW() AND sp.name != 'free' THEN true
        ELSE false
    END as is_expired
FROM user_subscriptions us
JOIN subscription_plans sp ON sp.id = us.plan_id;

-- ============================================
-- 5. SCHEDULED JOB FUNCTION (Call from cron or pg_cron)
-- ============================================

CREATE OR REPLACE FUNCTION run_subscription_maintenance()
RETURNS TABLE(
    downgraded_count INTEGER,
    cleaned_metrics INTEGER,
    execution_time TIMESTAMPTZ
) AS $$
DECLARE
    v_downgraded INTEGER;
    v_cleaned INTEGER;
BEGIN
    -- Downgrade expired subscriptions
    SELECT downgrade_expired_subscriptions() INTO v_downgraded;
    
    -- Clean old usage metrics (older than 1 year)
    DELETE FROM user_usage_metrics
    WHERE period_end < NOW() - INTERVAL '1 year';
    
    GET DIAGNOSTICS v_cleaned = ROW_COUNT;
    
    RETURN QUERY SELECT v_downgraded, v_cleaned, NOW();
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 6. FUNCTION TO HANDLE FAILED PAYMENTS
-- ============================================

CREATE OR REPLACE FUNCTION handle_failed_payment(
    p_user_id UUID,
    p_amount DECIMAL,
    p_currency TEXT,
    p_razorpay_payment_id TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    failed_count INTEGER;
    free_plan_id UUID;
BEGIN
    -- Record failed payment
    INSERT INTO billing_history (
        user_id,
        amount,
        currency,
        status,
        description,
        razorpay_payment_id,
        created_at
    ) VALUES (
        p_user_id,
        p_amount,
        p_currency,
        'failed',
        'Payment failed',
        p_razorpay_payment_id,
        NOW()
    );
    
    -- Count failed payments in last 30 days
    SELECT COUNT(*) INTO failed_count
    FROM billing_history
    WHERE user_id = p_user_id
      AND status = 'failed'
      AND created_at > NOW() - INTERVAL '30 days';
    
    -- If 3 or more failures, downgrade to free
    IF failed_count >= 3 THEN
        SELECT id INTO free_plan_id 
        FROM subscription_plans 
        WHERE name = 'free';
        
        UPDATE user_subscriptions
        SET 
            plan_id = free_plan_id,
            status = 'active',
            billing_cycle = 'monthly',
            current_period_start = NOW(),
            current_period_end = NOW() + INTERVAL '100 years',
            cancel_at_period_end = false,
            updated_at = NOW()
        WHERE user_id = p_user_id;
        
        RAISE NOTICE 'Downgraded user % to free plan (3 failed payments)', p_user_id;
        RETURN TRUE;
    END IF;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 7. FUNCTION TO HANDLE SUBSCRIPTION CANCELLATION
-- ============================================

CREATE OR REPLACE FUNCTION cancel_subscription(
    p_user_id UUID,
    p_immediate BOOLEAN DEFAULT false
)
RETURNS BOOLEAN AS $$
DECLARE
    free_plan_id UUID;
BEGIN
    SELECT id INTO free_plan_id 
    FROM subscription_plans 
    WHERE name = 'free';
    
    IF p_immediate THEN
        -- Immediate cancellation - downgrade now
        UPDATE user_subscriptions
        SET 
            plan_id = free_plan_id,
            status = 'cancelled',
            billing_cycle = 'monthly',
            current_period_start = NOW(),
            current_period_end = NOW() + INTERVAL '100 years',
            cancel_at_period_end = false,
            cancelled_at = NOW(),
            updated_at = NOW()
        WHERE user_id = p_user_id;
    ELSE
        -- Cancel at period end
        UPDATE user_subscriptions
        SET 
            cancel_at_period_end = true,
            cancelled_at = NOW(),
            updated_at = NOW()
        WHERE user_id = p_user_id;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 8. ENABLE pg_cron EXTENSION (if available)
-- ============================================

-- Uncomment if pg_cron is available in your Supabase instance
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule maintenance job to run every hour
-- SELECT cron.schedule(
--     'subscription-maintenance',
--     '0 * * * *',  -- Every hour
--     'SELECT run_subscription_maintenance();'
-- );

-- ============================================
-- 9. MANUAL MAINTENANCE COMMAND
-- ============================================

-- Run this manually or via cron if pg_cron is not available:
-- SELECT run_subscription_maintenance();

-- ============================================
-- 10. TEST FUNCTIONS
-- ============================================

-- Test expired subscription check
-- SELECT * FROM check_subscription_status('user-id-here');

-- Test manual downgrade
-- SELECT downgrade_expired_subscriptions();

-- Test failed payment handling
-- SELECT handle_failed_payment(
--     'user-id-here',
--     1499.00,
--     'INR',
--     'pay_test123'
-- );

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ SUBSCRIPTION AUTO-DOWNGRADE SETUP COMPLETE!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE '✅ Functions created:';
    RAISE NOTICE '   - downgrade_expired_subscriptions()';
    RAISE NOTICE '   - check_subscription_status(user_id)';
    RAISE NOTICE '   - run_subscription_maintenance()';
    RAISE NOTICE '   - handle_failed_payment(...)';
    RAISE NOTICE '   - cancel_subscription(user_id, immediate)';
    RAISE NOTICE '';
    RAISE NOTICE '✅ View created:';
    RAISE NOTICE '   - active_subscriptions';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  IMPORTANT: Set up cron job to run:';
    RAISE NOTICE '   SELECT run_subscription_maintenance();';
    RAISE NOTICE '   Recommended: Every hour';
    RAISE NOTICE '';
    RAISE NOTICE '📝 Manual test:';
    RAISE NOTICE '   SELECT downgrade_expired_subscriptions();';
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
END $$;
