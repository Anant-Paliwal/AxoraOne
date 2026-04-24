-- Enhanced Ask Anything Migration
-- Adds tables for intent learning and improved memory tracking

-- AI Feedback table for learning from user corrections
CREATE TABLE IF NOT EXISTS ai_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    query TEXT NOT NULL,
    detected_intent TEXT NOT NULL,
    content_types TEXT[] DEFAULT '{}',
    was_correct BOOLEAN NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for feedback analysis
CREATE INDEX IF NOT EXISTS idx_ai_feedback_workspace ON ai_feedback(workspace_id);
CREATE INDEX IF NOT EXISTS idx_ai_feedback_user ON ai_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_feedback_intent ON ai_feedback(detected_intent);

-- RLS for ai_feedback
ALTER TABLE ai_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own feedback" ON ai_feedback
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own feedback" ON ai_feedback
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Add columns to learning_memory if they don't exist
DO $$ 
BEGIN
    -- Add interaction_count column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'learning_memory' AND column_name = 'interaction_count') THEN
        ALTER TABLE learning_memory ADD COLUMN interaction_count INTEGER DEFAULT 0;
    END IF;
    
    -- Add last_interaction_type column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'learning_memory' AND column_name = 'last_interaction_type') THEN
        ALTER TABLE learning_memory ADD COLUMN last_interaction_type TEXT;
    END IF;
END $$;

-- Create learning_memory table if it doesn't exist
CREATE TABLE IF NOT EXISTS learning_memory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    topic TEXT NOT NULL,
    confidence FLOAT DEFAULT 0.5,
    interaction_count INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    last_reviewed TIMESTAMPTZ,
    last_interaction_type TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, workspace_id, topic)
);

-- Index for learning memory queries
CREATE INDEX IF NOT EXISTS idx_learning_memory_user_workspace ON learning_memory(user_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_learning_memory_topic ON learning_memory(topic);
CREATE INDEX IF NOT EXISTS idx_learning_memory_confidence ON learning_memory(confidence);

-- RLS for learning_memory
ALTER TABLE learning_memory ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own learning memory" ON learning_memory;
CREATE POLICY "Users can view own learning memory" ON learning_memory
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own learning memory" ON learning_memory;
CREATE POLICY "Users can insert own learning memory" ON learning_memory
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own learning memory" ON learning_memory;
CREATE POLICY "Users can update own learning memory" ON learning_memory
    FOR UPDATE USING (auth.uid() = user_id);

-- Grant permissions
GRANT ALL ON ai_feedback TO authenticated;
GRANT ALL ON learning_memory TO authenticated;

-- Success message
DO $$ BEGIN RAISE NOTICE 'Enhanced Ask Anything migration completed successfully'; END $$;
