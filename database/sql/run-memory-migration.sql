-- =====================================================
-- ASK ANYTHING MEMORY & CACHING SYSTEM
-- Run this in Supabase SQL Editor
-- =====================================================

-- Enable pgvector extension if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- =====================================================
-- 1. SHORT-TERM MEMORY (Session Context)
-- =====================================================
CREATE TABLE IF NOT EXISTS chat_context (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL,
    workspace_id UUID NOT NULL,
    user_id UUID NOT NULL,
    
    current_page_id UUID,
    current_skill_id UUID,
    current_task_id UUID,
    
    recent_pages JSONB DEFAULT '[]'::jsonb,
    recent_queries JSONB DEFAULT '[]'::jsonb,
    recent_actions JSONB DEFAULT '[]'::jsonb,
    
    session_start TIMESTAMPTZ DEFAULT NOW(),
    last_activity TIMESTAMPTZ DEFAULT NOW(),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(session_id)
);

CREATE INDEX IF NOT EXISTS idx_chat_context_session ON chat_context(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_context_workspace ON chat_context(workspace_id);
CREATE INDEX IF NOT EXISTS idx_chat_context_user ON chat_context(user_id);

ALTER TABLE chat_context ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own chat context" ON chat_context;
CREATE POLICY "Users can view own chat context"
    ON chat_context FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own chat context" ON chat_context;
CREATE POLICY "Users can insert own chat context"
    ON chat_context FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own chat context" ON chat_context;
CREATE POLICY "Users can update own chat context"
    ON chat_context FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own chat context" ON chat_context;
CREATE POLICY "Users can delete own chat context"
    ON chat_context FOR DELETE
    USING (auth.uid() = user_id);

-- =====================================================
-- 2. LONG-TERM MEMORY (Learning Progress)
-- =====================================================
CREATE TABLE IF NOT EXISTS user_learning_memory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    workspace_id UUID NOT NULL,
    skill_id UUID,
    
    mastery_level INTEGER DEFAULT 0 CHECK (mastery_level BETWEEN 0 AND 100),
    confidence_score FLOAT DEFAULT 0.0 CHECK (confidence_score BETWEEN 0 AND 1),
    
    learned_topics JSONB DEFAULT '[]'::jsonb,
    weak_areas JSONB DEFAULT '[]'::jsonb,
    strong_areas JSONB DEFAULT '[]'::jsonb,
    
    preferred_learning_style TEXT,
    avg_session_duration INTEGER,
    best_time_of_day TEXT,
    
    total_study_time INTEGER DEFAULT 0,
    total_questions_answered INTEGER DEFAULT 0,
    correct_answers INTEGER DEFAULT 0,
    quiz_attempts INTEGER DEFAULT 0,
    flashcard_reviews INTEGER DEFAULT 0,
    
    last_studied TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, workspace_id, skill_id)
);

CREATE INDEX IF NOT EXISTS idx_learning_memory_user ON user_learning_memory(user_id);
CREATE INDEX IF NOT EXISTS idx_learning_memory_workspace ON user_learning_memory(workspace_id);
CREATE INDEX IF NOT EXISTS idx_learning_memory_skill ON user_learning_memory(skill_id);

ALTER TABLE user_learning_memory ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own learning memory" ON user_learning_memory;
CREATE POLICY "Users can view own learning memory"
    ON user_learning_memory FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own learning memory" ON user_learning_memory;
CREATE POLICY "Users can insert own learning memory"
    ON user_learning_memory FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own learning memory" ON user_learning_memory;
CREATE POLICY "Users can update own learning memory"
    ON user_learning_memory FOR UPDATE
    USING (auth.uid() = user_id);

-- =====================================================
-- 3. VECTOR SEARCH CACHE
-- =====================================================
CREATE TABLE IF NOT EXISTS vector_search_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL,
    
    query_text TEXT NOT NULL,
    query_hash TEXT NOT NULL,
    
    retrieved_chunks JSONB NOT NULL,
    chunk_count INTEGER NOT NULL,
    
    hit_count INTEGER DEFAULT 0,
    last_accessed TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '24 hours',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(query_hash, workspace_id)
);

CREATE INDEX IF NOT EXISTS idx_vector_cache_hash ON vector_search_cache(query_hash);
CREATE INDEX IF NOT EXISTS idx_vector_cache_workspace ON vector_search_cache(workspace_id);
CREATE INDEX IF NOT EXISTS idx_vector_cache_expires ON vector_search_cache(expires_at);

ALTER TABLE vector_search_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view workspace vector cache" ON vector_search_cache;
CREATE POLICY "Users can view workspace vector cache"
    ON vector_search_cache FOR SELECT
    USING (true); -- Allow all authenticated users to read cache

DROP POLICY IF EXISTS "Users can insert vector cache" ON vector_search_cache;
CREATE POLICY "Users can insert vector cache"
    ON vector_search_cache FOR INSERT
    WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update vector cache" ON vector_search_cache;
CREATE POLICY "Users can update vector cache"
    ON vector_search_cache FOR UPDATE
    USING (true);

-- =====================================================
-- 4. AI RESPONSE CACHE
-- =====================================================
CREATE TABLE IF NOT EXISTS ai_response_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL,
    
    query_text TEXT NOT NULL,
    query_hash TEXT NOT NULL,
    context_hash TEXT NOT NULL,
    intent TEXT,
    
    response_text TEXT NOT NULL,
    response_type TEXT NOT NULL,
    response_data JSONB,
    sources JSONB,
    
    hit_count INTEGER DEFAULT 0,
    last_accessed TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '1 hour',
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_cache_hash ON ai_response_cache(query_hash, context_hash);
CREATE INDEX IF NOT EXISTS idx_ai_cache_workspace ON ai_response_cache(workspace_id);
CREATE INDEX IF NOT EXISTS idx_ai_cache_expires ON ai_response_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_ai_cache_intent ON ai_response_cache(intent);

ALTER TABLE ai_response_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view workspace ai cache" ON ai_response_cache;
CREATE POLICY "Users can view workspace ai cache"
    ON ai_response_cache FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Users can insert ai cache" ON ai_response_cache;
CREATE POLICY "Users can insert ai cache"
    ON ai_response_cache FOR INSERT
    WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update ai cache" ON ai_response_cache;
CREATE POLICY "Users can update ai cache"
    ON ai_response_cache FOR UPDATE
    USING (true);

-- =====================================================
-- 5. CONVERSATION MEMORY
-- =====================================================
CREATE TABLE IF NOT EXISTS conversation_memory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL,
    workspace_id UUID NOT NULL,
    user_id UUID NOT NULL,
    
    message_index INTEGER NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    
    page_context UUID,
    skill_context UUID,
    intent TEXT,
    
    token_count INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(session_id, message_index)
);

CREATE INDEX IF NOT EXISTS idx_conv_memory_session ON conversation_memory(session_id, message_index);
CREATE INDEX IF NOT EXISTS idx_conv_memory_workspace ON conversation_memory(workspace_id);

ALTER TABLE conversation_memory ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own conversation memory" ON conversation_memory;
CREATE POLICY "Users can view own conversation memory"
    ON conversation_memory FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own conversation memory" ON conversation_memory;
CREATE POLICY "Users can insert own conversation memory"
    ON conversation_memory FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- 6. HELPER FUNCTIONS
-- =====================================================

CREATE OR REPLACE FUNCTION update_learning_memory(
    p_user_id UUID,
    p_workspace_id UUID,
    p_skill_id UUID,
    p_topic TEXT,
    p_is_correct BOOLEAN,
    p_study_time INTEGER DEFAULT 0
)
RETURNS void AS $$
BEGIN
    INSERT INTO user_learning_memory (
        user_id, workspace_id, skill_id,
        total_study_time, total_questions_answered,
        correct_answers, last_studied
    )
    VALUES (
        p_user_id, p_workspace_id, p_skill_id,
        p_study_time, 1,
        CASE WHEN p_is_correct THEN 1 ELSE 0 END,
        NOW()
    )
    ON CONFLICT (user_id, workspace_id, skill_id)
    DO UPDATE SET
        total_study_time = user_learning_memory.total_study_time + p_study_time,
        total_questions_answered = user_learning_memory.total_questions_answered + 1,
        correct_answers = user_learning_memory.correct_answers + CASE WHEN p_is_correct THEN 1 ELSE 0 END,
        last_studied = NOW(),
        updated_at = NOW();
        
    UPDATE user_learning_memory
    SET mastery_level = LEAST(100, GREATEST(0, 
        (correct_answers::FLOAT / NULLIF(total_questions_answered, 0) * 100)::INTEGER
    ))
    WHERE user_id = p_user_id 
    AND workspace_id = p_workspace_id 
    AND skill_id = p_skill_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION clean_expired_cache()
RETURNS void AS $$
BEGIN
    DELETE FROM vector_search_cache WHERE expires_at < NOW();
    DELETE FROM ai_response_cache WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE '✅ Memory & Caching System installed successfully!';
    RAISE NOTICE 'Tables created: chat_context, user_learning_memory, vector_search_cache, ai_response_cache, conversation_memory';
END $$;
