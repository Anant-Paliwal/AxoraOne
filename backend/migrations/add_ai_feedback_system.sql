-- Complete AI Feedback System Migration
-- Run this in Supabase SQL Editor

-- ============================================
-- 1. AI Action Feedback Table
-- ============================================

DROP TABLE IF EXISTS ai_action_feedback CASCADE;

CREATE TABLE public.ai_action_feedback (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    workspace_id uuid NULL,
    preview_id text NOT NULL,
    query text NULL,
    mode text NULL,
    rating text NOT NULL CHECK (rating IN ('helpful', 'not_helpful')),
    comment text NULL,
    executed_actions jsonb DEFAULT '[]'::jsonb,
    created_at timestamptz DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_ai_action_feedback_user ON ai_action_feedback(user_id);
CREATE INDEX idx_ai_action_feedback_workspace ON ai_action_feedback(workspace_id);
CREATE INDEX idx_ai_action_feedback_rating ON ai_action_feedback(rating);
CREATE INDEX idx_ai_action_feedback_created ON ai_action_feedback(created_at DESC);
CREATE INDEX idx_ai_action_feedback_mode ON ai_action_feedback(mode);

-- Enable RLS
ALTER TABLE ai_action_feedback ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can insert own feedback" ON ai_action_feedback
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own feedback" ON ai_action_feedback
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own feedback" ON ai_action_feedback
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own feedback" ON ai_action_feedback
    FOR DELETE USING (auth.uid() = user_id);

-- Permissions
GRANT ALL ON ai_action_feedback TO authenticated;
GRANT ALL ON ai_action_feedback TO service_role;

-- ============================================
-- 2. User Agent Preferences Table
-- ============================================

DROP TABLE IF EXISTS user_agent_preferences CASCADE;

CREATE TABLE public.user_agent_preferences (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    workspace_id uuid NULL,
    
    -- Response style preferences
    preferred_response_length text DEFAULT 'medium' CHECK (preferred_response_length IN ('short', 'medium', 'detailed')),
    prefers_examples boolean DEFAULT true,
    prefers_step_by_step boolean DEFAULT true,
    
    -- Interaction preferences
    preferred_mode text CHECK (preferred_mode IN ('ask', 'build', 'plan', 'agent')),
    auto_create_tasks boolean DEFAULT false,
    auto_link_skills boolean DEFAULT true,
    
    -- Learned patterns (JSON arrays)
    common_queries jsonb DEFAULT '[]'::jsonb,
    successful_patterns jsonb DEFAULT '[]'::jsonb,
    
    -- Metadata
    total_interactions int DEFAULT 0,
    success_rate numeric(5,2) DEFAULT 0,
    last_updated timestamptz DEFAULT now(),
    created_at timestamptz DEFAULT now()
);

-- Unique constraint: one preference per user per workspace
CREATE UNIQUE INDEX idx_user_prefs_user_workspace 
ON user_agent_preferences(user_id, COALESCE(workspace_id, '00000000-0000-0000-0000-000000000000'::uuid));

-- Indexes
CREATE INDEX idx_user_prefs_user ON user_agent_preferences(user_id);
CREATE INDEX idx_user_prefs_workspace ON user_agent_preferences(workspace_id);

-- Enable RLS
ALTER TABLE user_agent_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own preferences" ON user_agent_preferences
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences" ON user_agent_preferences
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences" ON user_agent_preferences
    FOR UPDATE USING (auth.uid() = user_id);

-- Permissions
GRANT ALL ON user_agent_preferences TO authenticated;
GRANT ALL ON user_agent_preferences TO service_role;

-- ============================================
-- 3. Conversation Memory Table
-- ============================================

DROP TABLE IF EXISTS conversation_memory CASCADE;

CREATE TABLE public.conversation_memory (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    workspace_id uuid NULL,
    session_id text NOT NULL,
    
    -- Summary and key points
    summary text NOT NULL,
    key_points jsonb DEFAULT '[]'::jsonb,
    topics jsonb DEFAULT '[]'::jsonb,
    
    -- Context
    mentioned_pages jsonb DEFAULT '[]'::jsonb,
    mentioned_skills jsonb DEFAULT '[]'::jsonb,
    created_items jsonb DEFAULT '[]'::jsonb,
    
    -- Metadata
    message_count int DEFAULT 0,
    created_at timestamptz DEFAULT now(),
    expires_at timestamptz DEFAULT (now() + interval '30 days')
);

-- Indexes
CREATE INDEX idx_conversation_memory_user ON conversation_memory(user_id);
CREATE INDEX idx_conversation_memory_workspace ON conversation_memory(workspace_id);
CREATE INDEX idx_conversation_memory_session ON conversation_memory(session_id);
CREATE INDEX idx_conversation_memory_expires ON conversation_memory(expires_at);

-- Enable RLS
ALTER TABLE conversation_memory ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own memory" ON conversation_memory
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own memory" ON conversation_memory
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Permissions
GRANT ALL ON conversation_memory TO authenticated;
GRANT ALL ON conversation_memory TO service_role;

-- ============================================
-- 4. Helper Functions
-- ============================================

-- Function to auto-update user preferences based on feedback
CREATE OR REPLACE FUNCTION update_user_preferences_from_feedback()
RETURNS TRIGGER AS $$
BEGIN
    -- Update or insert user preferences
    INSERT INTO user_agent_preferences (
        user_id,
        workspace_id,
        total_interactions,
        last_updated
    )
    VALUES (
        NEW.user_id,
        NEW.workspace_id,
        1,
        now()
    )
    ON CONFLICT (user_id, COALESCE(workspace_id, '00000000-0000-0000-0000-000000000000'::uuid))
    DO UPDATE SET
        total_interactions = user_agent_preferences.total_interactions + 1,
        last_updated = now();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update preferences on feedback
DROP TRIGGER IF EXISTS trigger_update_preferences ON ai_action_feedback;
CREATE TRIGGER trigger_update_preferences
    AFTER INSERT ON ai_action_feedback
    FOR EACH ROW
    EXECUTE FUNCTION update_user_preferences_from_feedback();

-- Function to clean up old conversation memory
CREATE OR REPLACE FUNCTION cleanup_expired_conversation_memory()
RETURNS void AS $$
BEGIN
    DELETE FROM conversation_memory
    WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 5. Verification Queries
-- ============================================

-- Check tables exist
DO $$
BEGIN
    RAISE NOTICE 'Checking tables...';
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ai_action_feedback') THEN
        RAISE NOTICE '✅ ai_action_feedback table created';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_agent_preferences') THEN
        RAISE NOTICE '✅ user_agent_preferences table created';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'conversation_memory') THEN
        RAISE NOTICE '✅ conversation_memory table created';
    END IF;
END $$;

-- ============================================
-- 6. Sample Data (Optional - for testing)
-- ============================================

-- Uncomment to insert sample feedback
/*
INSERT INTO ai_action_feedback (user_id, workspace_id, preview_id, query, mode, rating, comment)
VALUES 
    (auth.uid(), NULL, 'test-1', 'Explain SQL joins', 'ask', 'helpful', 'Great explanation!'),
    (auth.uid(), NULL, 'test-2', 'Create a page about Python', 'build', 'helpful', NULL),
    (auth.uid(), NULL, 'test-3', 'Make a learning plan', 'plan', 'not_helpful', 'Too vague');
*/

-- ============================================
-- MIGRATION COMPLETE
-- ============================================

SELECT 'AI Feedback System migration completed successfully!' as status;
