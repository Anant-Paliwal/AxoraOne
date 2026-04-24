-- ============================================
-- ACTIVITY TRACKING TRIGGERS
-- Automatically log all workspace changes
-- ============================================

-- Ensure user_activity_log table exists with all needed columns
CREATE TABLE IF NOT EXISTS user_activity_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    activity_type VARCHAR(50) NOT NULL, -- 'page', 'task', 'skill', 'quiz', 'flashcard', 'workspace'
    entity_type VARCHAR(50) NOT NULL,   -- 'page', 'task', 'skill', etc.
    entity_id UUID,
    action VARCHAR(20) NOT NULL,        -- 'create', 'update', 'delete', 'view', 'complete'
    details JSONB DEFAULT '{}',         -- Additional context like entity_name, changes, etc.
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_activity_user ON user_activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_workspace ON user_activity_log(workspace_id);
CREATE INDEX IF NOT EXISTS idx_activity_type ON user_activity_log(activity_type);
CREATE INDEX IF NOT EXISTS idx_activity_created ON user_activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_entity ON user_activity_log(entity_type, entity_id);

-- Enable RLS
ALTER TABLE user_activity_log ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own activity" ON user_activity_log;
DROP POLICY IF EXISTS "Users can log their own activity" ON user_activity_log;
DROP POLICY IF EXISTS "Service role can insert activity" ON user_activity_log;

-- RLS Policies
CREATE POLICY "Users can view their own activity"
    ON user_activity_log FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can log their own activity"
    ON user_activity_log FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Allow service role to insert (for triggers)
CREATE POLICY "Service role can insert activity"
    ON user_activity_log FOR INSERT
    WITH CHECK (true);

-- ============================================
-- PAGES ACTIVITY TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION log_page_activity()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO user_activity_log (user_id, workspace_id, activity_type, entity_type, entity_id, action, details)
        VALUES (
            NEW.user_id,
            NEW.workspace_id,
            'page',
            'page',
            NEW.id,
            'create',
            jsonb_build_object(
                'entity_name', NEW.title,
                'icon', NEW.icon,
                'page_type', NEW.page_type
            )
        );
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Only log significant updates (not just view counts)
        IF OLD.title != NEW.title OR OLD.content IS DISTINCT FROM NEW.content OR OLD.blocks IS DISTINCT FROM NEW.blocks THEN
            INSERT INTO user_activity_log (user_id, workspace_id, activity_type, entity_type, entity_id, action, details)
            VALUES (
                NEW.user_id,
                NEW.workspace_id,
                'page',
                'page',
                NEW.id,
                'update',
                jsonb_build_object(
                    'entity_name', NEW.title,
                    'icon', NEW.icon,
                    'changes', CASE 
                        WHEN OLD.title != NEW.title THEN 'title'
                        ELSE 'content'
                    END
                )
            );
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO user_activity_log (user_id, workspace_id, activity_type, entity_type, entity_id, action, details)
        VALUES (
            OLD.user_id,
            OLD.workspace_id,
            'page',
            'page',
            OLD.id,
            'delete',
            jsonb_build_object('entity_name', OLD.title)
        );
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_log_page_activity ON pages;
CREATE TRIGGER trigger_log_page_activity
    AFTER INSERT OR UPDATE OR DELETE ON pages
    FOR EACH ROW EXECUTE FUNCTION log_page_activity();

-- ============================================
-- TASKS ACTIVITY TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION log_task_activity()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO user_activity_log (user_id, workspace_id, activity_type, entity_type, entity_id, action, details)
        VALUES (
            NEW.user_id,
            NEW.workspace_id,
            'task',
            'task',
            NEW.id,
            'create',
            jsonb_build_object(
                'entity_name', NEW.title,
                'priority', NEW.priority,
                'status', NEW.status
            )
        );
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Log status changes and completions
        IF OLD.status != NEW.status THEN
            INSERT INTO user_activity_log (user_id, workspace_id, activity_type, entity_type, entity_id, action, details)
            VALUES (
                NEW.user_id,
                NEW.workspace_id,
                'task',
                'task',
                NEW.id,
                CASE WHEN NEW.status = 'completed' THEN 'complete' ELSE 'update' END,
                jsonb_build_object(
                    'entity_name', NEW.title,
                    'old_status', OLD.status,
                    'new_status', NEW.status
                )
            );
        ELSIF OLD.title != NEW.title OR OLD.description IS DISTINCT FROM NEW.description THEN
            INSERT INTO user_activity_log (user_id, workspace_id, activity_type, entity_type, entity_id, action, details)
            VALUES (
                NEW.user_id,
                NEW.workspace_id,
                'task',
                'task',
                NEW.id,
                'update',
                jsonb_build_object('entity_name', NEW.title)
            );
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO user_activity_log (user_id, workspace_id, activity_type, entity_type, entity_id, action, details)
        VALUES (
            OLD.user_id,
            OLD.workspace_id,
            'task',
            'task',
            OLD.id,
            'delete',
            jsonb_build_object('entity_name', OLD.title)
        );
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_log_task_activity ON tasks;
CREATE TRIGGER trigger_log_task_activity
    AFTER INSERT OR UPDATE OR DELETE ON tasks
    FOR EACH ROW EXECUTE FUNCTION log_task_activity();

-- ============================================
-- SKILLS ACTIVITY TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION log_skill_activity()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO user_activity_log (user_id, workspace_id, activity_type, entity_type, entity_id, action, details)
        VALUES (
            NEW.user_id,
            NEW.workspace_id,
            'skill',
            'skill',
            NEW.id,
            'create',
            jsonb_build_object(
                'entity_name', NEW.name,
                'level', NEW.level
            )
        );
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.level != NEW.level OR OLD.name != NEW.name OR OLD.confidence IS DISTINCT FROM NEW.confidence THEN
            INSERT INTO user_activity_log (user_id, workspace_id, activity_type, entity_type, entity_id, action, details)
            VALUES (
                NEW.user_id,
                NEW.workspace_id,
                'skill',
                'skill',
                NEW.id,
                'update',
                jsonb_build_object(
                    'entity_name', NEW.name,
                    'old_level', OLD.level,
                    'new_level', NEW.level,
                    'confidence', NEW.confidence
                )
            );
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO user_activity_log (user_id, workspace_id, activity_type, entity_type, entity_id, action, details)
        VALUES (
            OLD.user_id,
            OLD.workspace_id,
            'skill',
            'skill',
            OLD.id,
            'delete',
            jsonb_build_object('entity_name', OLD.name)
        );
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_log_skill_activity ON skills;
CREATE TRIGGER trigger_log_skill_activity
    AFTER INSERT OR UPDATE OR DELETE ON skills
    FOR EACH ROW EXECUTE FUNCTION log_skill_activity();

-- ============================================
-- LEARNING OBJECTS (QUIZZES/FLASHCARDS) TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION log_learning_object_activity()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO user_activity_log (user_id, workspace_id, activity_type, entity_type, entity_id, action, details)
        VALUES (
            NEW.user_id,
            NEW.workspace_id,
            NEW.object_type,
            NEW.object_type,
            NEW.id,
            'create',
            jsonb_build_object(
                'entity_name', NEW.title,
                'object_type', NEW.object_type
            )
        );
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Log completion/score updates
        IF OLD.last_score IS DISTINCT FROM NEW.last_score OR OLD.times_completed != NEW.times_completed THEN
            INSERT INTO user_activity_log (user_id, workspace_id, activity_type, entity_type, entity_id, action, details)
            VALUES (
                NEW.user_id,
                NEW.workspace_id,
                NEW.object_type,
                NEW.object_type,
                NEW.id,
                'complete',
                jsonb_build_object(
                    'entity_name', NEW.title,
                    'score', NEW.last_score,
                    'times_completed', NEW.times_completed
                )
            );
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO user_activity_log (user_id, workspace_id, activity_type, entity_type, entity_id, action, details)
        VALUES (
            OLD.user_id,
            OLD.workspace_id,
            OLD.object_type,
            OLD.object_type,
            OLD.id,
            'delete',
            jsonb_build_object('entity_name', OLD.title)
        );
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_log_learning_object_activity ON learning_objects;
CREATE TRIGGER trigger_log_learning_object_activity
    AFTER INSERT OR UPDATE OR DELETE ON learning_objects
    FOR EACH ROW EXECUTE FUNCTION log_learning_object_activity();

-- ============================================
-- GRAPH EDGES ACTIVITY TRIGGER (Connections)
-- ============================================
CREATE OR REPLACE FUNCTION log_graph_edge_activity()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO user_activity_log (user_id, workspace_id, activity_type, entity_type, entity_id, action, details)
        VALUES (
            COALESCE(NEW.user_id, auth.uid()),
            NEW.workspace_id,
            'connection',
            'graph_edge',
            NEW.id,
            'create',
            jsonb_build_object(
                'entity_name', 'Connection',
                'source_type', NEW.source_type,
                'target_type', NEW.target_type,
                'edge_type', NEW.edge_type
            )
        );
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_log_graph_edge_activity ON graph_edges;
CREATE TRIGGER trigger_log_graph_edge_activity
    AFTER INSERT ON graph_edges
    FOR EACH ROW EXECUTE FUNCTION log_graph_edge_activity();

-- ============================================
-- DONE
-- ============================================
SELECT 'Activity tracking triggers created successfully!' as status;
