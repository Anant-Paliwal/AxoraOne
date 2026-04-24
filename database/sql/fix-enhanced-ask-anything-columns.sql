-- Fix missing columns for Enhanced Ask Anything
-- Run this in Supabase SQL Editor

-- 1. Add confidence column to skills table if missing
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'skills' AND column_name = 'confidence') THEN
        ALTER TABLE skills ADD COLUMN confidence FLOAT DEFAULT 0.5;
    END IF;
END $$;

-- 2. Create or update learning_memory table
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

-- Add missing columns if table exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'learning_memory' AND column_name = 'interaction_count') THEN
        ALTER TABLE learning_memory ADD COLUMN interaction_count INTEGER DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'learning_memory' AND column_name = 'last_interaction_type') THEN
        ALTER TABLE learning_memory ADD COLUMN last_interaction_type TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'learning_memory' AND column_name = 'error_count') THEN
        ALTER TABLE learning_memory ADD COLUMN error_count INTEGER DEFAULT 0;
    END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_learning_memory_user_workspace ON learning_memory(user_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_learning_memory_topic ON learning_memory(topic);

-- Enable RLS
ALTER TABLE learning_memory ENABLE ROW LEVEL SECURITY;

-- RLS Policies
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
GRANT ALL ON learning_memory TO authenticated;

SELECT 'Migration completed successfully' as status;
