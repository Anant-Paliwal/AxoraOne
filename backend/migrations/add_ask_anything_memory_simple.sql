-- =====================================================
-- ASK ANYTHING MEMORY & CACHING SYSTEM (SIMPLE VERSION)
-- =====================================================
-- This version works WITHOUT pgvector extension
-- All caching and memory features work, just without semantic search

-- =====================================================
-- 1. SHORT-TERM MEMORY (Session Context)
-- =====================================================
CREATE TABLE IF NOT EXISTS chat_context (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Current context
    current_page_id UUID REFERENCES pages(id) ON DELETE SET NULL,
    current_skill_id UUID REFERENCES skills(id) ON DELETE SET NULL,
    current_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    
    -- Recent activity (last 5-10 items)
    recent_pages JSONB DEFAULT '[]'::jsonb,
    recent_queries JSONB DEFAULT '[]'::jsonb,
    recent_actions JSONB DEFAULT '[]'::jsonb,
    
    -- Session metadata
    session_start TIMESTAMPTZ DEFAULT NOW(),
    last_activity TIMESTAMPTZ DEFAULT NOW(),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(session_id)
);

CREATE INDEX idx_chat_context_session ON chat_context(session_id);
CREATE INDEX idx_chat_context_workspace ON chat_context(workspace_id);
CREATE INDEX idx_chat_context_user ON chat_context(user_id);
CREATE INDEX idx_chat_context_activity ON chat_context(last_activity DESC);

ALTER TABLE chat_context ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own chat context"
    ON chat_context FOR SELECT
    USING (auth.uid() = user