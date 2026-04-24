-- Complete Skill Intelligence Tables Migration
-- Run this to create ALL skill-related tables

-- 1. Skill Contributions (tracks real impact)
CREATE TABLE IF NOT EXISTS skill_contributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    contribution_type TEXT NOT NULL,
    target_id TEXT NOT NULL,
    target_type TEXT NOT NULL,
    impact_score FLOAT NOT NULL DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_skill_contributions_skill ON skill_contributions(skill_id);
CREATE INDEX IF NOT EXISTS idx_skill_contributions_workspace ON skill_contributions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_skill_contributions_created ON skill_contributions(created_at DESC);

-- 2. Skill Memory (agent learning)
CREATE TABLE IF NOT EXISTS skill_memory (
    skill_id UUID PRIMARY KEY REFERENCES skills(id) ON DELETE CASCADE,
    successful_patterns JSONB DEFAULT '[]',
    failed_patterns JSONB DEFAULT '[]',
    user_preferences JSONB DEFAULT '{}',
    activation_history JSONB DEFAULT '[]',
    confidence_adjustments JSONB DEFAULT '[]',
    last_evolved_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_skill_memory_updated ON skill_memory(updated_at DESC);

-- 3. Skill Executions (track when skills run)
CREATE TABLE IF NOT EXISTS skill_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    trigger_source TEXT NOT NULL,
    input_context JSONB DEFAULT '{}',
    output_result JSONB DEFAULT '{}',
    success BOOLEAN DEFAULT true,
    executed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_skill_executions_skill ON skill_executions(skill_id);
CREATE INDEX IF NOT EXISTS idx_skill_executions_workspace ON skill_executions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_skill_executions_executed ON skill_executions(executed_at DESC);

-- 4. Skill Chains (skill relationships)
CREATE TABLE IF NOT EXISTS skill_chains (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    target_skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    chain_type TEXT NOT NULL DEFAULT 'prerequisite',
    strength FLOAT DEFAULT 1.0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(source_skill_id, target_skill_id)
);

CREATE INDEX IF NOT EXISTS idx_skill_chains_source ON skill_chains(source_skill_id);
CREATE INDEX IF NOT EXISTS idx_skill_chains_target ON skill_chains(target_skill_id);

-- 5. Update skills table with new columns
ALTER TABLE skills 
ADD COLUMN IF NOT EXISTS confidence_score FLOAT DEFAULT 0,
ADD COLUMN IF NOT EXISTS success_rate FLOAT DEFAULT 0,
ADD COLUMN IF NOT EXISTS activation_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_activated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS is_bottleneck BOOLEAN DEFAULT FALSE;

-- 6. Update skill_evidence with confidence
ALTER TABLE skill_evidence
ADD COLUMN IF NOT EXISTS confidence_score FLOAT DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS evidence_type TEXT DEFAULT 'manual';

-- 7. RLS Policies for skill_contributions
ALTER TABLE skill_contributions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view skill contributions in their workspaces" ON skill_contributions;
CREATE POLICY "Users can view skill contributions in their workspaces"
ON skill_contributions FOR SELECT
USING (
    workspace_id IN (
        SELECT workspace_id FROM workspace_members 
        WHERE user_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Users can create skill contributions in their workspaces" ON skill_contributions;
CREATE POLICY "Users can create skill contributions in their workspaces"
ON skill_contributions FOR INSERT
WITH CHECK (
    workspace_id IN (
        SELECT workspace_id FROM workspace_members 
        WHERE user_id = auth.uid()
    )
);

-- 8. RLS Policies for skill_memory
ALTER TABLE skill_memory ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view skill memory for their skills" ON skill_memory;
CREATE POLICY "Users can view skill memory for their skills"
ON skill_memory FOR SELECT
USING (
    skill_id IN (
        SELECT s.id FROM skills s
        JOIN workspace_members wm ON s.workspace_id = wm.workspace_id
        WHERE wm.user_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "System can manage skill memory" ON skill_memory;
CREATE POLICY "System can manage skill memory"
ON skill_memory FOR ALL
USING (true)
WITH CHECK (true);

-- 9. RLS Policies for skill_executions
ALTER TABLE skill_executions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view skill executions in their workspaces" ON skill_executions;
CREATE POLICY "Users can view skill executions in their workspaces"
ON skill_executions FOR SELECT
USING (
    workspace_id IN (
        SELECT workspace_id FROM workspace_members 
        WHERE user_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Users can create skill executions in their workspaces" ON skill_executions;
CREATE POLICY "Users can create skill executions in their workspaces"
ON skill_executions FOR INSERT
WITH CHECK (
    workspace_id IN (
        SELECT workspace_id FROM workspace_members 
        WHERE user_id = auth.uid()
    )
);

-- 10. RLS Policies for skill_chains
ALTER TABLE skill_chains ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view skill chains for their skills" ON skill_chains;
CREATE POLICY "Users can view skill chains for their skills"
ON skill_chains FOR SELECT
USING (
    source_skill_id IN (
        SELECT s.id FROM skills s
        JOIN workspace_members wm ON s.workspace_id = wm.workspace_id
        WHERE wm.user_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Users can manage skill chains for their skills" ON skill_chains;
CREATE POLICY "Users can manage skill chains for their skills"
ON skill_chains FOR ALL
USING (
    source_skill_id IN (
        SELECT s.id FROM skills s
        JOIN workspace_members wm ON s.workspace_id = wm.workspace_id
        WHERE wm.user_id = auth.uid()
    )
)
WITH CHECK (
    source_skill_id IN (
        SELECT s.id FROM skills s
        JOIN workspace_members wm ON s.workspace_id = wm.workspace_id
        WHERE wm.user_id = auth.uid()
    )
);

-- Comments
COMMENT ON TABLE skill_contributions IS 'Tracks real contributions from skills - what actually helped';
COMMENT ON TABLE skill_memory IS 'Persistent memory for skill agents - learning and evolution';
COMMENT ON TABLE skill_executions IS 'Records when skills are executed and their results';
COMMENT ON TABLE skill_chains IS 'Relationships between skills (prerequisites, chains, etc)';

COMMENT ON COLUMN skill_contributions.impact_score IS 'Positive = helped, Negative = hurt, 0 = neutral';
COMMENT ON COLUMN skills.confidence_score IS 'Real confidence based on actual contributions (0-1)';
COMMENT ON COLUMN skills.success_rate IS 'Percentage of suggestions that were accepted (0-1)';
COMMENT ON COLUMN skills.activation_count IS 'How many times skill has been activated';

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ All skill intelligence tables created successfully!';
    RAISE NOTICE '📊 Tables: skill_contributions, skill_memory, skill_executions, skill_chains';
    RAISE NOTICE '🔒 RLS policies applied';
    RAISE NOTICE '🚀 Skill intelligence system ready!';
END $$;
