-- Fix Subscription & Workspace Permissions
-- Run this to add missing limits and usage tracking

-- ============================================
-- 1. ADD MISSING LIMITS TO SUBSCRIPTION PLANS
-- ============================================

-- Add max_skills limit
UPDATE subscription_plans
SET features = jsonb_set(
    features,
    '{max_skills}',
    CASE name
        WHEN 'free' THEN '10'::jsonb
        WHEN 'pro' THEN '100'::jsonb
        WHEN 'enterprise' THEN '-1'::jsonb
    END
)
WHERE name IN ('free', 'pro', 'enterprise');

-- Add max_tasks limit
UPDATE subscription_plans
SET features = jsonb_set(
    features,
    '{max_tasks}',
    CASE name
        WHEN 'free' THEN '50'::jsonb
        WHEN 'pro' THEN '500'::jsonb
        WHEN 'enterprise' THEN '-1'::jsonb
    END
)
WHERE name IN ('free', 'pro', 'enterprise');

-- Add max_ai_queries_per_day (already exists, but ensure it's set)
UPDATE subscription_plans
SET features = jsonb_set(
    features,
    '{max_ai_queries_per_day}',
    CASE name
        WHEN 'free' THEN '20'::jsonb
        WHEN 'pro' THEN '500'::jsonb
        WHEN 'enterprise' THEN '-1'::jsonb
    END
)
WHERE name IN ('free', 'pro', 'enterprise');

-- ============================================
-- IMPORTANT: PAGES ARE UNLIMITED FOR ALL PLANS
-- ============================================
UPDATE subscription_plans
SET features = jsonb_set(
    features,
    '{max_pages}',
    '-1'::jsonb  -- -1 means unlimited
)
WHERE name IN ('free', 'pro', 'enterprise');

-- ============================================
-- 2. ADD USAGE TRACKING TRIGGERS
-- ============================================

-- Track skill creation
CREATE OR REPLACE FUNCTION track_skill_creation()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.workspace_id IS NOT NULL THEN
        PERFORM increment_usage(NEW.workspace_id, 'max_skills', 1);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_track_skill_creation ON skills;
CREATE TRIGGER trigger_track_skill_creation
    AFTER INSERT ON skills
    FOR EACH ROW
    EXECUTE FUNCTION track_skill_creation();

-- Track task creation
CREATE OR REPLACE FUNCTION track_task_creation()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.workspace_id IS NOT NULL THEN
        PERFORM increment_usage(NEW.workspace_id, 'max_tasks', 1);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_track_task_creation ON tasks;
CREATE TRIGGER trigger_track_task_creation
    AFTER INSERT ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION track_task_creation();

-- Track team member additions
CREATE OR REPLACE FUNCTION track_member_addition()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM increment_usage(NEW.workspace_id, 'max_team_members', 1);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_track_member_addition ON workspace_members;
CREATE TRIGGER trigger_track_member_addition
    AFTER INSERT ON workspace_members
    FOR EACH ROW
    EXECUTE FUNCTION track_member_addition();

-- Track member removal (decrement)
CREATE OR REPLACE FUNCTION track_member_removal()
RETURNS TRIGGER AS $$
BEGIN
    -- Decrement usage when member is removed
    UPDATE usage_metrics
    SET count = GREATEST(0, count - 1)
    WHERE workspace_id = OLD.workspace_id
    AND metric_type = 'max_team_members'
    AND period_start <= NOW()
    AND period_end >= NOW();
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_track_member_removal ON workspace_members;
CREATE TRIGGER trigger_track_member_removal
    AFTER DELETE ON workspace_members
    FOR EACH ROW
    EXECUTE FUNCTION track_member_removal();

-- ============================================
-- 3. CREATE SUBSCRIPTION AUDIT LOG
-- ============================================

CREATE TABLE IF NOT EXISTS subscription_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    action TEXT NOT NULL, -- 'upgrade', 'downgrade', 'cancel', 'reactivate'
    old_plan_name TEXT,
    new_plan_name TEXT,
    old_plan_id UUID,
    new_plan_id UUID,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_subscription_audit_workspace ON subscription_audit_log(workspace_id);
CREATE INDEX IF NOT EXISTS idx_subscription_audit_user ON subscription_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_audit_created ON subscription_audit_log(created_at DESC);

-- RLS for audit log
ALTER TABLE subscription_audit_log ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists, then create
DROP POLICY IF EXISTS "Users can view their workspace audit logs" ON subscription_audit_log;
CREATE POLICY "Users can view their workspace audit logs"
    ON subscription_audit_log FOR SELECT
    USING (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members 
            WHERE user_id = auth.uid()
            AND role IN ('admin', 'owner')
        )
    );

-- ============================================
-- 4. INITIALIZE USAGE METRICS FOR EXISTING DATA
-- ============================================

-- NOTE: Pages are unlimited, so we don't track page usage

-- Count existing skills per workspace
INSERT INTO usage_metrics (workspace_id, metric_type, count, period_start, period_end)
SELECT 
    s.workspace_id,
    'max_skills' as metric_type,
    COUNT(*) as count,
    ws.current_period_start,
    ws.current_period_end
FROM skills s
JOIN workspace_subscriptions ws ON s.workspace_id = ws.workspace_id
WHERE s.workspace_id IS NOT NULL
GROUP BY s.workspace_id, ws.current_period_start, ws.current_period_end
ON CONFLICT (workspace_id, metric_type, period_start) 
DO UPDATE SET count = EXCLUDED.count;

-- Count existing tasks per workspace
INSERT INTO usage_metrics (workspace_id, metric_type, count, period_start, period_end)
SELECT 
    t.workspace_id,
    'max_tasks' as metric_type,
    COUNT(*) as count,
    ws.current_period_start,
    ws.current_period_end
FROM tasks t
JOIN workspace_subscriptions ws ON t.workspace_id = ws.workspace_id
WHERE t.workspace_id IS NOT NULL
GROUP BY t.workspace_id, ws.current_period_start, ws.current_period_end
ON CONFLICT (workspace_id, metric_type, period_start) 
DO UPDATE SET count = EXCLUDED.count;

-- Count existing team members per workspace
INSERT INTO usage_metrics (workspace_id, metric_type, count, period_start, period_end)
SELECT 
    wm.workspace_id,
    'max_team_members' as metric_type,
    COUNT(*) as count,
    ws.current_period_start,
    ws.current_period_end
FROM workspace_members wm
JOIN workspace_subscriptions ws ON wm.workspace_id = ws.workspace_id
GROUP BY wm.workspace_id, ws.current_period_start, ws.current_period_end
ON CONFLICT (workspace_id, metric_type, period_start) 
DO UPDATE SET count = EXCLUDED.count;

-- ============================================
-- 5. VERIFICATION QUERIES
-- ============================================

-- Check subscription plans have all limits
SELECT 
    name,
    (features->>'max_pages')::int as max_pages,
    (features->>'max_skills')::int as max_skills,
    (features->>'max_tasks')::int as max_tasks,
    (features->>'max_ai_queries_per_day')::int as max_ai_queries,
    (features->>'max_team_members')::int as max_team_members,
    (features->>'max_workspaces')::int as max_workspaces
FROM subscription_plans
ORDER BY sort_order;

-- Check usage metrics are populated
SELECT 
    w.name as workspace_name,
    um.metric_type,
    um.count,
    sp.name as plan_name,
    (sp.features->>um.metric_type)::int as plan_limit
FROM usage_metrics um
JOIN workspaces w ON um.workspace_id = w.id
JOIN workspace_subscriptions ws ON um.workspace_id = ws.workspace_id
JOIN subscription_plans sp ON ws.plan_id = sp.id
WHERE um.period_end >= NOW()
ORDER BY w.name, um.metric_type;

-- Check triggers are installed
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE trigger_name LIKE 'trigger_track_%'
ORDER BY event_object_table, trigger_name;

COMMENT ON TABLE subscription_audit_log IS 'Audit log for all subscription changes';
COMMENT ON FUNCTION track_skill_creation IS 'Auto-track skill creation for usage metrics';
COMMENT ON FUNCTION track_task_creation IS 'Auto-track task creation for usage metrics';
COMMENT ON FUNCTION track_member_addition IS 'Auto-track member additions for usage metrics';
COMMENT ON FUNCTION track_member_removal IS 'Auto-track member removals for usage metrics';
