-- =====================================================
-- ASK ANYTHING MEMORY & CACHING SYSTEM
-- =====================================================
-- This migration adds memory and caching capabilities to Ask Anything
-- Following the architecture: Short-term memory, Long-term memory, Vector search, Redis caching

-- =====================================================
-- 0. ENABLE VECTOR EXTENSION (if available)
-- =====================================================
-- Enable pgvector extension for semantic search
-- If this fails, vector columns will be skipped
DO $$ 
BEGIN
    CREATE EXTENSION IF NOT EXISTS vector;
    RAISE NOTICE 'pgvector extension enabled';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'pgvector extension not available - vector columns will be skipped';
END $$;

-- =====================================================
-- 1. SHORT-TERM MEMORY (Session Context)
-- =====================================================
-- Stores current conversation context, last page viewed, current task
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
    recent_pages JSONB DEFAULT '[]'::jsonb, -- [{id, title, timestamp}]
    recent_queries JSONB DEFAULT '[]'::jsonb, -- [{query, timestamp, intent}]
    recent_actions JSONB DEFAULT '[]'::jsonb, -- [{action, timestamp, result}]
    
    -- Session metadata
    session_start TIMESTAMPTZ DEFAULT NOW(),
    last_activity TIMESTAMPTZ DEFAULT NOW(),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast lookups
CREATE INDEX idx_chat_context_session ON chat_context(session_id);
CREATE INDEX idx_chat_context_workspace ON chat_context(workspace_id);
CREATE INDEX idx_chat_context_user ON chat_context(user_id);
CREATE INDEX idx_chat_context_activity ON chat_context(last_activity DESC);

-- RLS Policies
ALTER TABLE chat_context ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own chat context"
    ON chat_context FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own chat context"
    ON chat_context FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own chat context"
    ON chat_context FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own chat context"
    ON chat_context FOR DELETE
    USING (auth.uid() = user_id);

-- =====================================================
-- 2. LONG-TERM MEMORY (Structured Learning Data)
-- =====================================================
-- Stores skill progress, learned topics, weak areas as structured data

CREATE TABLE IF NOT EXISTS user_learning_memory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    skill_id UUID REFERENCES skills(id) ON DELETE CASCADE,
    
    -- Skill mastery tracking
    mastery_level INTEGER DEFAULT 0 CHECK (mastery_level BETWEEN 0 AND 100),
    confidence_score FLOAT DEFAULT 0.0 CHECK (confidence_score BETWEEN 0 AND 1),
    
    -- Topic knowledge
    learned_topics JSONB DEFAULT '[]'::jsonb, -- [{topic, confidence, last_reviewed}]
    weak_areas JSONB DEFAULT '[]'::jsonb, -- [{topic, error_count, needs_review}]
    strong_areas JSONB DEFAULT '[]'::jsonb, -- [{topic, success_rate}]
    
    -- Learning patterns
    preferred_learning_style TEXT, -- visual, reading, interactive, etc.
    avg_session_duration INTEGER, -- minutes
    best_time_of_day TEXT, -- morning, afternoon, evening
    
    -- Statistics
    total_study_time INTEGER DEFAULT 0, -- minutes
    total_questions_answered INTEGER DEFAULT 0,
    correct_answers INTEGER DEFAULT 0,
    quiz_attempts INTEGER DEFAULT 0,
    flashcard_reviews INTEGER DEFAULT 0,
    
    -- Metadata
    last_studied TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, workspace_id, skill_id)
);

-- Indexes
CREATE INDEX idx_learning_memory_user ON user_learning_memory(user_id);
CREATE INDEX idx_learning_memory_workspace ON user_learning_memory(workspace_id);
CREATE INDEX idx_learning_memory_skill ON user_learning_memory(skill_id);
CREATE INDEX idx_learning_memory_mastery ON user_learning_memory(mastery_level DESC);

-- RLS Policies
ALTER TABLE user_learning_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own learning memory"
    ON user_learning_memory FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own learning memory"
    ON user_learning_memory FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own learning memory"
    ON user_learning_memory FOR UPDATE
    USING (auth.uid() = user_id);

-- =====================================================
-- 3. VECTOR SEARCH CACHE
-- =====================================================
-- Stores retrieved chunks for queries to avoid re-searching

CREATE TABLE IF NOT EXISTS vector_search_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    
    -- Query information
    query_text TEXT NOT NULL,
    query_hash TEXT NOT NULL, -- MD5 hash for fast lookup
    -- query_embedding will be added if pgvector is available
    
    -- Retrieved results
    retrieved_chunks JSONB NOT NULL, -- [{page_id, content, score, metadata}]
    chunk_count INTEGER NOT NULL,
    
    -- Cache metadata
    hit_count INTEGER DEFAULT 0,
    last_accessed TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '24 hours',
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add vector column if extension is available
DO $$ 
BEGIN
    ALTER TABLE vector_search_cache ADD COLUMN query_embedding vector(1536);
    RAISE NOTICE 'Added query_embedding vector column';
EXCEPTION
    WHEN undefined_object THEN
        RAISE NOTICE 'Skipping query_embedding column - pgvector not available';
END $$;

-- Indexes
CREATE INDEX idx_vector_cache_hash ON vector_search_cache(query_hash);
CREATE INDEX idx_vector_cache_workspace ON vector_search_cache(workspace_id);
CREATE INDEX idx_vector_cache_expires ON vector_search_cache(expires_at);

-- Add vector index if column exists
DO $$ 
BEGIN
    CREATE INDEX idx_vector_cache_embedding ON vector_search_cache USING ivfflat (query_embedding vector_cosine_ops);
    RAISE NOTICE 'Created vector index on query_embedding';
EXCEPTION
    WHEN undefined_column OR undefined_object THEN
        RAISE NOTICE 'Skipping vector index - column not available';
END $$;

-- RLS Policies
ALTER TABLE vector_search_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view workspace vector cache"
    ON vector_search_cache FOR SELECT
    USING (
        workspace_id IN (
            SELECT id FROM workspaces WHERE owner_id = auth.uid()
        )
    );

-- =====================================================
-- 4. AI RESPONSE CACHE
-- =====================================================
-- Caches complete AI responses to avoid regeneration

CREATE TABLE IF NOT EXISTS ai_response_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    
    -- Request information
    query_text TEXT NOT NULL,
    query_hash TEXT NOT NULL,
    intent TEXT, -- ask, build, explain, etc.
    context_hash TEXT, -- Hash of context (page_id, skill_id, etc.)
    
    -- Response data
    response_text TEXT NOT NULL,
    response_type TEXT NOT NULL, -- text, quiz_created, flashcards_created, etc.
    response_data JSONB, -- Structured response data
    sources JSONB, -- Source citations
    
    -- Cache metadata
    hit_count INTEGER DEFAULT 0,
    last_accessed TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '1 hour',
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_ai_cache_hash ON ai_response_cache(query_hash, context_hash);
CREATE INDEX idx_ai_cache_workspace ON ai_response_cache(workspace_id);
CREATE INDEX idx_ai_cache_expires ON ai_response_cache(expires_at);
CREATE INDEX idx_ai_cache_intent ON ai_response_cache(intent);

-- RLS Policies
ALTER TABLE ai_response_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view workspace ai cache"
    ON ai_response_cache FOR SELECT
    USING (
        workspace_id IN (
            SELECT id FROM workspaces WHERE owner_id = auth.uid()
        )
    );

-- =====================================================
-- 5. CONVERSATION MEMORY
-- =====================================================
-- Stores conversation history with semantic search capability

CREATE TABLE IF NOT EXISTS conversation_memory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Message data
    message_index INTEGER NOT NULL, -- Order in conversation
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    -- content_embedding will be added if pgvector is available
    
    -- Context at time of message
    page_context UUID REFERENCES pages(id) ON DELETE SET NULL,
    skill_context UUID REFERENCES skills(id) ON DELETE SET NULL,
    intent TEXT,
    
    -- Metadata
    token_count INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(session_id, message_index)
);

-- Add vector column if extension is available
DO $$ 
BEGIN
    ALTER TABLE conversation_memory ADD COLUMN content_embedding vector(1536);
    RAISE NOTICE 'Added content_embedding vector column';
EXCEPTION
    WHEN undefined_object THEN
        RAISE NOTICE 'Skipping content_embedding column - pgvector not available';
END $$;

-- Indexes
CREATE INDEX idx_conv_memory_session ON conversation_memory(session_id, message_index);
CREATE INDEX idx_conv_memory_workspace ON conversation_memory(workspace_id);

-- Add vector index if column exists
DO $$ 
BEGIN
    CREATE INDEX idx_conv_memory_embedding ON conversation_memory USING ivfflat (content_embedding vector_cosine_ops);
    RAISE NOTICE 'Created vector index on content_embedding';
EXCEPTION
    WHEN undefined_column OR undefined_object THEN
        RAISE NOTICE 'Skipping vector index - column not available';
END $$;

-- RLS Policies
ALTER TABLE conversation_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own conversation memory"
    ON conversation_memory FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own conversation memory"
    ON conversation_memory FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- 6. HELPER FUNCTIONS
-- =====================================================

-- Function to update chat context
CREATE OR REPLACE FUNCTION update_chat_context(
    p_session_id UUID,
    p_workspace_id UUID,
    p_user_id UUID,
    p_current_page_id UUID DEFAULT NULL,
    p_current_skill_id UUID DEFAULT NULL,
    p_query TEXT DEFAULT NULL
)
RETURNS void AS $$
BEGIN
    INSERT INTO chat_context (
        session_id, workspace_id, user_id, 
        current_page_id, current_skill_id, last_activity
    )
    VALUES (
        p_session_id, p_workspace_id, p_user_id,
        p_current_page_id, p_current_skill_id, NOW()
    )
    ON CONFLICT (session_id) 
    DO UPDATE SET
        current_page_id = COALESCE(p_current_page_id, chat_context.current_page_id),
        current_skill_id = COALESCE(p_current_skill_id, chat_context.current_skill_id),
        last_activity = NOW(),
        updated_at = NOW();
        
    -- Add to recent queries if provided
    IF p_query IS NOT NULL THEN
        UPDATE chat_context
        SET recent_queries = (
            SELECT jsonb_agg(q ORDER BY (q->>'timestamp')::timestamptz DESC)
            FROM (
                SELECT jsonb_array_elements(recent_queries) as q
                UNION ALL
                SELECT jsonb_build_object(
                    'query', p_query,
                    'timestamp', NOW()
                )
                LIMIT 10
            ) subq
        )
        WHERE session_id = p_session_id;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to update learning memory
CREATE OR REPLACE FUNCTION update_learning_memory(
    p_user_id UUID,
    p_workspace_id UUID,
    p_skill_id UUID,
    p_topic TEXT,
    p_is_correct BOOLEAN,
    p_study_time INTEGER DEFAULT 0
)
RETURNS void AS $$
DECLARE
    v_current_topics JSONB;
    v_weak_areas JSONB;
    v_strong_areas JSONB;
BEGIN
    -- Upsert learning memory
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
        
    -- Update mastery level based on success rate
    UPDATE user_learning_memory
    SET mastery_level = LEAST(100, GREATEST(0, 
        (correct_answers::FLOAT / NULLIF(total_questions_answered, 0) * 100)::INTEGER
    ))
    WHERE user_id = p_user_id 
    AND workspace_id = p_workspace_id 
    AND skill_id = p_skill_id;
END;
$$ LANGUAGE plpgsql;

-- Function to clean expired cache
CREATE OR REPLACE FUNCTION clean_expired_cache()
RETURNS void AS $$
BEGIN
    DELETE FROM vector_search_cache WHERE expires_at < NOW();
    DELETE FROM ai_response_cache WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 7. AUTOMATIC CACHE CLEANUP (Optional - requires pg_cron)
-- =====================================================
-- Uncomment if pg_cron extension is available
-- SELECT cron.schedule('clean-cache', '0 * * * *', 'SELECT clean_expired_cache()');

-- =====================================================
-- 8. VIEWS FOR EASY ACCESS
-- =====================================================

-- View for current user context
CREATE OR REPLACE VIEW current_user_context AS
SELECT 
    cc.*,
    p.title as current_page_title,
    s.name as current_skill_name,
    t.title as current_task_title
FROM chat_context cc
LEFT JOIN pages p ON cc.current_page_id = p.id
LEFT JOIN skills s ON cc.current_skill_id = s.id
LEFT JOIN tasks t ON cc.current_task_id = t.id
WHERE cc.user_id = auth.uid();

-- View for learning progress summary
CREATE OR REPLACE VIEW learning_progress_summary AS
SELECT 
    ulm.*,
    s.name as skill_name,
    s.category as skill_category,
    CASE 
        WHEN ulm.total_questions_answered > 0 
        THEN (ulm.correct_answers::FLOAT / ulm.total_questions_answered * 100)::INTEGER
        ELSE 0 
    END as success_rate
FROM user_learning_memory ulm
LEFT JOIN skills s ON ulm.skill_id = s.id
WHERE ulm.user_id = auth.uid();

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- This migration adds:
-- 1. Short-term memory (chat_context)
-- 2. Long-term memory (user_learning_memory)
-- 3. Vector search cache (vector_search_cache)
-- 4. AI response cache (ai_response_cache)
-- 5. Conversation memory (conversation_memory)
-- 6. Helper functions for updates
-- 7. Views for easy access
--
-- NOTE: Vector columns (for semantic search) are optional.
-- If pgvector extension is not available, the system will work
-- without semantic search capabilities but all caching will still function.
--
-- To enable pgvector (optional):
-- 1. Install pgvector extension in PostgreSQL
-- 2. Run: CREATE EXTENSION vector;
-- 3. Re-run this migration to add vector columns
