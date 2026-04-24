-- ============================================
-- SKILL INTELLIGENCE SYSTEM - COMPLETE SETUP
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. SKILL MEMORY TABLE (Agent Learning)
-- Stores what each skill agent has learned from past actions
CREATE TABLE IF NOT EXISTS skill_memory (
    skill_id UUID PRIMARY KEY REFERENCES skills(id) ON DELETE CASCADE,
    successful_patterns JSONB DEFAULT '[]',
    failed_patterns JSONB DEFAULT '[]',
    activation_history JSONB DEFAULT '[]',
    confidence_adjustments JSONB DEFAULT '[]',
    user_preferences JSONB DEFAULT '{}',
    last_evolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_skill_memory_skill_id ON skill_memory(skill_id);

-- 2. SKILL CONTRIBUTIONS TABLE (Real Impact Tracking)
-- Tracks actual contributions each skill makes to user's work
CREATE TABLE IF NOT EXISTS skill_contributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    contribution_type TEXT NOT NULL, -- 'suggestion_accepted', 'suggestion_rejected', 'task_accelerated', 'page_linked', 'insight_generated'
    contribution_data JSONB DEFAULT '{}',
    impact_score DECIMAL(5,2) DEFAULT 0, -- Calculated impact (0-100)
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_skill_contributions_skill_id ON skill_contributions(skill_id);
CREATE INDEX IF NOT EXISTS idx_skill_contributions_workspace_id ON skill_contributions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_skill_contributions_type ON skill_contributions(contribution_type);
CREATE INDEX IF NOT EXISTS idx_skill_contributions_created_at ON skill_contributions(created_at DESC);

-- 3. SKILL CHAINS TABLE (Skill Relationships & Execution Flow)
-- Tracks which skills are executed together and in what order
CREATE TABLE IF NOT EXISTS skill_chains (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    target_skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    chain_type TEXT DEFAULT 'manual', -- 'manual', 'auto', 'prerequisite', 'suggested'
    execution_count INT DEFAULT 0,
    success_count INT DEFAULT 0,
    avg_time_between_seconds INT DEFAULT 0,
    last_executed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_skill_chains_source ON skill_chains(source_skill_id);
CREATE INDEX IF NOT EXISTS idx_skill_chains_target ON skill_chains(target_skill_id);
CREATE INDEX IF NOT EXISTS idx_skill_chains_workspace ON skill_chains(workspace_id);

-- Prevent duplicate chains
CREATE UNIQUE INDEX IF NOT EXISTS idx_skill_chains_unique 
ON skill_chains(source_skill_id, target_skill_id, workspace_id);

-- 4. SKILL EXECUTIONS TABLE (Execution History)
-- Already exists, but ensure it has all needed columns
DO $$ 
BEGIN
    -- Add columns if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='skill_executions' AND column_name='suggested_next_skills') THEN
        ALTER TABLE skill_executions ADD COLUMN suggested_next_skills JSONB DEFAULT '[]';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='skill_executions' AND column_name='execution_status') THEN
        ALTER TABLE skill_executions ADD COLUMN execution_status TEXT DEFAULT 'completed';
    END IF;
END $$;

-- 5. UPDATE SKILLS TABLE (Add intelligence columns)
DO $$ 
BEGIN
    -- Add activation_count if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='skills' AND column_name='activation_count') THEN
        ALTER TABLE skills ADD COLUMN activation_count INT DEFAULT 0;
    END IF;
    
    -- Add last_activated_at if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='skills' AND column_name='last_activated_at') THEN
        ALTER TABLE skills ADD COLUMN last_activated_at TIMESTAMPTZ;
    END IF;
    
    -- Add confidence_score if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='skills' AND column_name='confidence_score') THEN
        ALTER TABLE skills ADD COLUMN confidence_score DECIMAL(3,2) DEFAULT 0.0;
    END IF;
    
    -- Add success_rate if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='skills' AND column_name='success_rate') THEN
        ALTER TABLE skills ADD COLUMN success_rate DECIMAL(3,2) DEFAULT 0.0;
    END IF;
    
    -- Add is_bottleneck if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='skills' AND column_name='is_bottleneck') THEN
        ALTER TABLE skills ADD COLUMN is_bottleneck BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- 6. ROW LEVEL SECURITY (RLS) POLICIES

-- Enable RLS on new tables
ALTER TABLE skill_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_chains ENABLE ROW LEVEL SECURITY;

-- skill_memory policies
DROP POLICY IF EXISTS "Users can view their skill memory" ON skill_memory;
CREATE POLICY "Users can view their skill memory" ON skill_memory
    FOR SELECT USING (
        skill_id IN (
            SELECT id FROM skills WHERE user_id = auth.uid()
            OR workspace_id IN (
                SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
            )
        )
    );

DROP POLICY IF EXISTS "Users can update their skill memory" ON skill_memory;
CREATE POLICY "Users can update their skill memory" ON skill_memory
    FOR ALL USING (
        skill_id IN (
            SELECT id FROM skills WHERE user_id = auth.uid()
            OR workspace_id IN (
                SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
            )
        )
    );

-- skill_contributions policies
DROP POLICY IF EXISTS "Users can view workspace contributions" ON skill_contributions;
CREATE POLICY "Users can view workspace contributions" ON skill_contributions
    FOR SELECT USING (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can insert contributions" ON skill_contributions;
CREATE POLICY "Users can insert contributions" ON skill_contributions
    FOR INSERT WITH CHECK (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
        )
    );

-- skill_chains policies
DROP POLICY IF EXISTS "Users can view workspace chains" ON skill_chains;
CREATE POLICY "Users can view workspace chains" ON skill_chains
    FOR SELECT USING (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can manage workspace chains" ON skill_chains;
CREATE POLICY "Users can manage workspace chains" ON skill_chains
    FOR ALL USING (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
        )
    );

-- 7. FUNCTIONS FOR AUTOMATIC TRACKING

-- Function to auto-create skill memory when skill is created
CREATE OR REPLACE FUNCTION create_skill_memory()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO skill_memory (skill_id)
    VALUES (NEW.id)
    ON CONFLICT (skill_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create memory on skill creation
DROP TRIGGER IF EXISTS trigger_create_skill_memory ON skills;
CREATE TRIGGER trigger_create_skill_memory
    AFTER INSERT ON skills
    FOR EACH ROW
    EXECUTE FUNCTION create_skill_memory();

-- Function to update skill activation count
CREATE OR REPLACE FUNCTION update_skill_activation()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE skills
    SET 
        activation_count = COALESCE(activation_count, 0) + 1,
        last_activated_at = NOW()
    WHERE id = NEW.skill_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to track activations
DROP TRIGGER IF EXISTS trigger_update_skill_activation ON skill_executions;
CREATE TRIGGER trigger_update_skill_activation
    AFTER INSERT ON skill_executions
    FOR EACH ROW
    EXECUTE FUNCTION update_skill_activation();

-- 8. HELPER VIEWS

-- View: Skill Intelligence Summary
CREATE OR REPLACE VIEW skill_intelligence_summary AS
SELECT 
    s.id,
    s.name,
    s.level,
    s.workspace_id,
    s.activation_count,
    s.confidence_score,
    s.success_rate,
    s.last_activated_at,
    COUNT(DISTINCT sc.id) as total_contributions,
    COALESCE(SUM(sc.impact_score), 0) as total_impact,
    COUNT(DISTINCT CASE WHEN sc.contribution_type = 'suggestion_accepted' THEN sc.id END) as accepted_suggestions,
    COUNT(DISTINCT CASE WHEN sc.contribution_type = 'suggestion_rejected' THEN sc.id END) as rejected_suggestions,
    (SELECT COUNT(*) FROM skill_chains WHERE source_skill_id = s.id) as outgoing_chains,
    (SELECT COUNT(*) FROM skill_chains WHERE target_skill_id = s.id) as incoming_chains
FROM skills s
LEFT JOIN skill_contributions sc ON s.id = sc.skill_id
GROUP BY s.id, s.name, s.level, s.workspace_id, s.activation_count, 
         s.confidence_score, s.success_rate, s.last_activated_at;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check if tables were created
SELECT 
    'skill_memory' as table_name,
    COUNT(*) as record_count
FROM skill_memory
UNION ALL
SELECT 
    'skill_contributions' as table_name,
    COUNT(*) as record_count
FROM skill_contributions
UNION ALL
SELECT 
    'skill_chains' as table_name,
    COUNT(*) as record_count
FROM skill_chains;

-- Show skills with their intelligence data
SELECT 
    id,
    name,
    level,
    activation_count,
    confidence_score,
    last_activated_at
FROM skills
LIMIT 5;

-- ============================================
-- SETUP COMPLETE!
-- ============================================
-- Next steps:
-- 1. Create some skills in the UI
-- 2. Link pages to skills
-- 3. Complete tasks linked to skills
-- 4. Watch the intelligence system track contributions automatically
-- ============================================
