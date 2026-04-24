-- Run this in Supabase SQL Editor to enable activity tracking
-- This creates triggers that automatically log all workspace changes

-- Copy and paste the contents of:
-- backend/migrations/add_activity_tracking_triggers.sql

-- Or run this simplified version:

-- Ensure user_activity_log table exists
CREATE TABLE IF NOT EXISTS user_activity_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    activity_type VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID,
    action VARCHAR(20) NOT NULL,
    details JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_activity_user ON user_activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_workspace ON user_activity_log(workspace_id);
CREATE INDEX IF NOT EXISTS idx_activity_created ON user_activity_log(created_at DESC);

-- Enable RLS
ALTER TABLE user_activity_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies (drop if exist first)
DROP POLICY IF EXISTS "Users can view their own activity" ON user_activity_log;
DROP POLICY IF EXISTS "Users can log their own activity" ON user_activity_log;

CREATE POLICY "Users can view their own activity"
    ON user_activity_log FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can log their own activity"
    ON user_activity_log FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Page Activity Trigger
CREATE OR REPLACE FUNCTION log_page_activity()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO user_activity_log (user_id, workspace_id, activity_type, entity_type, entity_id, action, details)
        VALUES (NEW.user_id, NEW.workspace_id, 'page', 'page', NEW.id, 'create',
            jsonb_build_object('entity_name', NEW.title, 'icon', NEW.icon));
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.title != NEW.title OR OLD.content IS DISTINCT FROM NEW.content THEN
            INSERT INTO user_activity_log (user_id, workspace_id, activity_type, entity_type, entity_id, action, details)
            VALUES (NEW.user_id, NEW.workspace_id, 'page', 'page', NEW.id, 'update',
                jsonb_build_object('entity_name', NEW.title));
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO user_activity_log (user_id, workspace_id, activity_type, entity_type, entity_id, action, details)
        VALUES (OLD.user_id, OLD.workspace_id, 'page', 'page', OLD.id, 'delete',
            jsonb_build_object('entity_name', OLD.title));
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_log_page_activity ON pages;
CREATE TRIGGER trigger_log_page_activity
    AFTER INSERT OR UPDATE OR DELETE ON pages
    FOR EACH ROW EXECUTE FUNCTION log_page_activity();

-- Task Activity Trigger
CREATE OR REPLACE FUNCTION log_task_activity()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO user_activity_log (user_id, workspace_id, activity_type, entity_type, entity_id, action, details)
        VALUES (NEW.user_id, NEW.workspace_id, 'task', 'task', NEW.id, 'create',
            jsonb_build_object('entity_name', NEW.title, 'status', NEW.status));
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.status != NEW.status THEN
            INSERT INTO user_activity_log (user_id, workspace_id, activity_type, entity_type, entity_id, action, details)
            VALUES (NEW.user_id, NEW.workspace_id, 'task', 'task', NEW.id,
                CASE WHEN NEW.status = 'completed' THEN 'complete' ELSE 'update' END,
                jsonb_build_object('entity_name', NEW.title, 'new_status', NEW.status));
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO user_activity_log (user_id, workspace_id, activity_type, entity_type, entity_id, action, details)
        VALUES (OLD.user_id, OLD.workspace_id, 'task', 'task', OLD.id, 'delete',
            jsonb_build_object('entity_name', OLD.title));
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_log_task_activity ON tasks;
CREATE TRIGGER trigger_log_task_activity
    AFTER INSERT OR UPDATE OR DELETE ON tasks
    FOR EACH ROW EXECUTE FUNCTION log_task_activity();

-- Skill Activity Trigger
CREATE OR REPLACE FUNCTION log_skill_activity()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO user_activity_log (user_id, workspace_id, activity_type, entity_type, entity_id, action, details)
        VALUES (NEW.user_id, NEW.workspace_id, 'skill', 'skill', NEW.id, 'create',
            jsonb_build_object('entity_name', NEW.name, 'level', NEW.level));
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.level != NEW.level OR OLD.name != NEW.name THEN
            INSERT INTO user_activity_log (user_id, workspace_id, activity_type, entity_type, entity_id, action, details)
            VALUES (NEW.user_id, NEW.workspace_id, 'skill', 'skill', NEW.id, 'update',
                jsonb_build_object('entity_name', NEW.name, 'new_level', NEW.level));
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO user_activity_log (user_id, workspace_id, activity_type, entity_type, entity_id, action, details)
        VALUES (OLD.user_id, OLD.workspace_id, 'skill', 'skill', OLD.id, 'delete',
            jsonb_build_object('entity_name', OLD.name));
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_log_skill_activity ON skills;
CREATE TRIGGER trigger_log_skill_activity
    AFTER INSERT OR UPDATE OR DELETE ON skills
    FOR EACH ROW EXECUTE FUNCTION log_skill_activity();

SELECT 'Activity tracking enabled! All page, task, and skill changes will now be logged.' as status;
