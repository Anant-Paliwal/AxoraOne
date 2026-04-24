-- ============================================
-- STEP 2: Create Intelligence Tables (FIXED)
-- Run this AFTER STEP 1 completes successfully
-- ============================================

-- First, verify skills table exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'skills') THEN
        RAISE EXCEPTION 'Skills table does not exist! Cannot create intelligence tables.';
    END IF;
END $$;

-- 1. Create skill_memory table
CREATE TABLE IF NOT EXISTS skill_memory (
    skill_id UUID PRIMARY KEY,
    successful_patterns JSONB DEFAULT '[]',
    failed_patterns JSONB DEFAULT '[]',
    activation_history JSONB DEFAULT '[]',
    confidence_adjustments JSONB DEFAULT '[]',
    user_preferences JSONB DEFAULT '{}',
    last_evolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign key separately to handle if table already exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'skill_memory_skill_id_fkey'
    ) THEN
        ALTER TABLE skill_memory 
        ADD CONSTRAINT skill_memory_skill_id_fkey 
        FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_skill_memory_skill_id ON skill_memory(skill_id);

-- 2. Create skill_contributions table
CREATE TABLE IF NOT EXISTS skill_contributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    skill_id UUID NOT NULL,
    workspace_id UUID NOT NULL,
    contribution_type TEXT NOT NULL,
    contribution_data JSONB DEFAULT '{}',
    impact_score DECIMAL(5,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign keys separately
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'skill_contributions_skill_id_fkey'
    ) THEN
        ALTER TABLE skill_contributions 
        ADD CONSTRAINT skill_contributions_skill_id_fkey 
        FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'skill_contributions_workspace_id_fkey'
    ) THEN
        ALTER TABLE skill_contributions 
        ADD CONSTRAINT skill_contributions_workspace_id_fkey 
        FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_skill_contributions_skill_id ON skill_contributions(skill_id);
CREATE INDEX IF NOT EXISTS idx_skill_contributions_workspace_id ON skill_contributions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_skill_contributions_type ON skill_contributions(contribution_type);
CREATE INDEX IF NOT EXISTS idx_skill_contributions_created_at ON skill_contributions(created_at DESC);

-- 3. Create skill_chains table
CREATE TABLE IF NOT EXISTS skill_chains (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_skill_id UUID NOT NULL,
    target_skill_id UUID NOT NULL,
    workspace_id UUID NOT NULL,
    chain_type TEXT DEFAULT 'manual',
    execution_count INT DEFAULT 0,
    success_count INT DEFAULT 0,
    avg_time_between_seconds INT DEFAULT 0,
    last_executed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign keys separately
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'skill_chains_source_skill_id_fkey'
    ) THEN
        ALTER TABLE skill_chains 
        ADD CONSTRAINT skill_chains_source_skill_id_fkey 
        FOREIGN KEY (source_skill_id) REFERENCES skills(id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'skill_chains_target_skill_id_fkey'
    ) THEN
        ALTER TABLE skill_chains 
        ADD CONSTRAINT skill_chains_target_skill_id_fkey 
        FOREIGN KEY (target_skill_id) REFERENCES skills(id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'skill_chains_workspace_id_fkey'
    ) THEN
        ALTER TABLE skill_chains 
        ADD CONSTRAINT skill_chains_workspace_id_fkey 
        FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_skill_chains_source ON skill_chains(source_skill_id);
CREATE INDEX IF NOT EXISTS idx_skill_chains_target ON skill_chains(target_skill_id);
CREATE INDEX IF NOT EXISTS idx_skill_chains_workspace ON skill_chains(workspace_id);

-- Create unique index separately
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_skill_chains_unique'
    ) THEN
        CREATE UNIQUE INDEX idx_skill_chains_unique 
        ON skill_chains(source_skill_id, target_skill_id, workspace_id);
    END IF;
END $$;

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

-- 5. Add columns to skill_executions if table exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'skill_executions') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name='skill_executions' AND column_name='suggested_next_skills') THEN
            ALTER TABLE skill_executions ADD COLUMN suggested_next_skills JSONB DEFAULT '[]';
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name='skill_executions' AND column_name='execution_status') THEN
            ALTER TABLE skill_executions ADD COLUMN execution_status TEXT DEFAULT 'completed';
        END IF;
    END IF;
END $$;

-- Verification
SELECT 
    'skill_memory' as table_name,
    EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name='skill_memory') as exists,
    COUNT(*) as record_count
FROM skill_memory
UNION ALL
SELECT 
    'skill_contributions' as table_name,
    EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name='skill_contributions') as exists,
    COUNT(*) as record_count
FROM skill_contributions
UNION ALL
SELECT 
    'skill_chains' as table_name,
    EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name='skill_chains') as exists,
    COUNT(*) as record_count
FROM skill_chains;

-- Check skills table columns
SELECT 
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name = 'skills' 
AND column_name IN ('activation_count', 'confidence_score', 'last_activated_at', 'success_rate', 'is_bottleneck')
ORDER BY column_name;
