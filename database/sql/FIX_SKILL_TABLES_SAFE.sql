-- ============================================
-- SAFE SKILL INTELLIGENCE SETUP
-- Handles existing tables gracefully
-- ============================================

-- 1. Add source_skill_id to proposed_actions if missing
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='proposed_actions' AND column_name='source_skill_id'
    ) THEN
        ALTER TABLE proposed_actions 
        ADD COLUMN source_skill_id UUID REFERENCES skills(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 2. Create skill_memory table
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

CREATE INDEX IF NOT EXISTS idx_skill_memory_skill_id ON skill_memory(skill_id);

-- 3. Create skill_contributions table
CREATE TABLE IF NOT EXISTS skill_contributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    contribution_type TEXT NOT NULL,
    contribution_data JSONB DEFAULT '{}',
    impact_score DECIMAL(5,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_skill_contributions_skill_id ON skill_contributions(skill_id);
CREATE INDEX IF NOT EXISTS idx_skill_contributions_workspace_id ON skill_contributions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_skill_contributions_type ON skill_contributions(contribution_type);
CREATE INDEX IF NOT EXISTS idx_skill_contributions_created_at ON skill_contributions(created_at DESC);

-- 4. Create skill_chains table
CREATE TABLE IF NOT EXISTS skill_chains (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    target_skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    chain_type TEXT DEFAULT 'manual',
    execution_count INT DEFAULT 0,
    success_count INT DEFAULT 0,
    avg_time_between_seconds INT DEFAULT 0,
    last_executed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_skill_chains_source ON skill_chains(source_skill_id);
CREATE INDEX IF NOT EXISTS idx_skill_chains_target ON skill_chains(target_skill_id);
CREATE INDEX IF NOT EXISTS idx_skill_chains_workspace ON skill_chains(workspace_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_skill_chains_unique 
ON skill_chains(source_skill_id, target_skill_id, workspace_id);

-- 5. Add intelligence columns to skills table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='skills' AND column_name='activation_count') THEN
        ALTER TABLE skills ADD COLUMN activation_count INT DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='skills' AND column_name='last_activated_at') THEN
        ALTER TABLE skills ADD COLUMN last_activated_at TIMESTAMPTZ;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='skills' AND column_name='confidence_score') THEN
        ALTER TABLE skills ADD COLUMN confidence_score DECIMAL(3,2) DEFAULT 0.0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='skills' AND column_name='success_rate') THEN
        ALTER TABLE skills ADD COLUMN success_rate DECIMAL(3,2) DEFAULT 0.0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='skills' AND column_name='is_bottleneck') THEN
        ALTER TABLE skills ADD COLUMN is_bottleneck BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- 6. Add suggested_next_skills to skill_executions if missing
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='skill_executions' AND column_name='suggested_next_skills') THEN
        ALTER TABLE skill_executions ADD COLUMN suggested_next_skills JSONB DEFAULT '[]';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='skill_executions' AND column_name='execution_status') THEN
        ALTER TABLE skill_executions ADD COLUMN execution_status TEXT DEFAULT 'completed';
    END IF;
END $$;

-- 7. Enable RLS on new tables
ALTER TABLE skill_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_chains ENABLE ROW LEVEL SECURITY;

-- 8. RLS Policies for skill_memory
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

-- 9. RLS Policies for skill_contributions
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

-- 10. RLS Policies for skill_chains
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

-- 11. Auto-create skill memory trigger
CREATE OR REPLACE FUNCTION create_skill_memory()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO skill_memory (skill_id)
    VALUES (NEW.id)
    ON CONFLICT (skill_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_create_skill_memory ON skills;
CREATE TRIGGER trigger_create_skill_memory
    AFTER INSERT ON skills
    FOR EACH ROW
    EXECUTE FUNCTION create_skill_memory();

-- 12. Update activation count trigger
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

DROP TRIGGER IF EXISTS trigger_update_skill_activation ON skill_executions;
CREATE TRIGGER trigger_update_skill_activation
    AFTER INSERT ON skill_executions
    FOR EACH ROW
    EXECUTE FUNCTION update_skill_activation();

-- 13. Create intelligence summary view
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
-- VERIFICATION
-- ============================================

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

-- Check skills table has intelligence columns
SELECT 
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name = 'skills' 
AND column_name IN ('activation_count', 'confidence_score', 'last_activated_at', 'success_rate', 'is_bottleneck')
ORDER BY column_name;

-- ============================================
-- SETUP COMPLETE!
-- ============================================
