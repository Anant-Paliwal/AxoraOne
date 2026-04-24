-- Fix Workspace Creation Error
-- The increment_usage function is missing or has wrong signature

-- ============================================
-- 1. DROP OLD FUNCTIONS (IF THEY EXIST)
-- ============================================

DROP FUNCTION IF EXISTS increment_usage(UUID, TEXT, INTEGER);
DROP FUNCTION IF EXISTS check_workspace_limit(UUID, TEXT, INTEGER);

-- ============================================
-- 2. CREATE increment_usage FUNCTION (FIXED)
-- ============================================

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
    
    -- If no subscription found, skip tracking
    IF v_period_start IS NULL THEN
        RETURN;
    END IF;
    
    -- Insert or update usage
    INSERT INTO usage_metrics (workspace_id, metric_type, count, period_start, period_end)
    VALUES (p_workspace_id, p_metric_type, p_increment, v_period_start, v_period_end)
    ON CONFLICT (workspace_id, metric_type, period_start)
    DO UPDATE SET count = usage_metrics.count + p_increment;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 3. CREATE check_workspace_limit FUNCTION
-- ============================================

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

-- ============================================
-- 4. GRANT EXECUTE PERMISSIONS
-- ============================================

GRANT EXECUTE ON FUNCTION increment_usage(UUID, TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_usage(UUID, TEXT, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION increment_usage(UUID, TEXT, INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION check_workspace_limit(UUID, TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION check_workspace_limit(UUID, TEXT, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION check_workspace_limit(UUID, TEXT, INTEGER) TO anon;

-- ============================================
-- 5. VERIFICATION
-- ============================================

-- Test the function exists
SELECT 
    routine_name,
    routine_type,
    data_type,
    routine_definition
FROM information_schema.routines
WHERE routine_name IN ('increment_usage', 'check_workspace_limit')
AND routine_schema = 'public';

-- Test calling the function (should not error)
DO $$
DECLARE
    test_workspace_id UUID;
BEGIN
    -- Get a test workspace
    SELECT id INTO test_workspace_id FROM workspaces LIMIT 1;
    
    IF test_workspace_id IS NOT NULL THEN
        -- Test increment_usage
        PERFORM increment_usage(test_workspace_id, 'max_pages', 0);
        RAISE NOTICE '✅ increment_usage function works!';
        
        -- Test check_workspace_limit
        IF check_workspace_limit(test_workspace_id, 'max_pages', 1) THEN
            RAISE NOTICE '✅ check_workspace_limit function works!';
        END IF;
    END IF;
END $$;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ increment_usage and check_workspace_limit functions created successfully!';
    RAISE NOTICE '🔧 Workspace creation should now work';
    RAISE NOTICE '📝 Try creating a workspace again';
END $$;

