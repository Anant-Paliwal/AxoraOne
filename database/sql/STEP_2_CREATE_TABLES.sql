-- ============================================
-- STEP 2: Create Intelligence Tables
-- Run this AFTER STEP 1 completes successfully
-- ============================================

-- 1. Create skill_memory table
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

-- 2. Create skill_contributions table
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

-- 3. Create skill_chains table
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

-- 4. Add intelligence columns to skills table
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

-- 5. Add columns to skill_executions if missing
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

-- Verification
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
