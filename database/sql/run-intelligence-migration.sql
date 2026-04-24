-- Living Intelligence OS - Database Migration
-- Creates tables for insights, proposed actions, and enhanced tracking

-- ==================== INSIGHTS TABLE ====================
CREATE TABLE IF NOT EXISTS insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    insight_type TEXT NOT NULL, -- next_action, skill_unlocked, pattern_detected, overload, etc.
    title TEXT NOT NULL,
    description TEXT,
    severity TEXT DEFAULT 'info', -- info, warning, critical
    source_signals JSONB DEFAULT '[]',
    suggested_actions JSONB DEFAULT '[]',
    dismissed BOOLEAN DEFAULT FALSE,
    acted_upon BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================== PROPOSED ACTIONS TABLE ====================
CREATE TABLE IF NOT EXISTS proposed_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL, -- link_page_to_skill, extract_tasks, create_task, update_priority, etc.
    target_type TEXT NOT NULL, -- page, task, skill
    target_id UUID,
    payload JSONB DEFAULT '{}',
    reason TEXT NOT NULL,
    expected_impact TEXT,
    reversible BOOLEAN DEFAULT TRUE,
    trust_level_required INTEGER DEFAULT 2, -- 1=read_only, 2=suggest, 3=act, 4=autonomous
    auto_execute BOOLEAN DEFAULT FALSE,
    executed BOOLEAN DEFAULT FALSE,
    executed_at TIMESTAMPTZ,
    rejected BOOLEAN DEFAULT FALSE,
    rejected_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add source_skill_id column separately to handle existing table
ALTER TABLE proposed_actions ADD COLUMN IF NOT EXISTS source_skill_id UUID REFERENCES skills(id) ON DELETE SET NULL;

-- ==================== SKILL MEMORY TABLE ====================
-- Persistent memory for skill agents (learning from outcomes)
CREATE TABLE IF NOT EXISTS skill_memory (
    skill_id UUID PRIMARY KEY REFERENCES skills(id) ON DELETE CASCADE,
    successful_patterns JSONB DEFAULT '[]',
    failed_patterns JSONB DEFAULT '[]',
    user_preferences JSONB DEFAULT '{}',
    activation_history JSONB DEFAULT '[]',
    confidence_adjustments JSONB DEFAULT '[]',
    last_evolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================== SKILL EXECUTIONS TABLE (if not exists) ====================
CREATE TABLE IF NOT EXISTS skill_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    trigger_source TEXT DEFAULT 'manual', -- manual, ask_anything, task, chain, intelligence_engine
    input_context JSONB DEFAULT '{}',
    output_type TEXT, -- page, task, quiz, flashcards, insight
    output_id UUID,
    success BOOLEAN DEFAULT TRUE,
    executed_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================== ENTITY SIGNALS TABLE ====================
-- Tracks signals emitted by entities for pattern detection
CREATE TABLE IF NOT EXISTS entity_signals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    signal_type TEXT NOT NULL,
    source_id UUID NOT NULL,
    source_type TEXT NOT NULL, -- page, task, skill, user
    data JSONB DEFAULT '{}',
    priority INTEGER DEFAULT 5,
    processed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================== USER TRUST LEVELS ====================
-- Tracks trust level per user per workspace for autonomous actions
CREATE TABLE IF NOT EXISTS user_trust_levels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    trust_level INTEGER DEFAULT 2, -- 1=read_only, 2=suggest, 3=act, 4=autonomous
    successful_actions INTEGER DEFAULT 0,
    failed_actions INTEGER DEFAULT 0,
    last_action_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(workspace_id, user_id)
);

-- ==================== PAGE INTENT TRACKING ====================
-- Tracks inferred intent and domain for pages
ALTER TABLE pages ADD COLUMN IF NOT EXISTS inferred_intent TEXT; -- planning, learning, execution, reflection
ALTER TABLE pages ADD COLUMN IF NOT EXISTS inferred_domain TEXT;
ALTER TABLE pages ADD COLUMN IF NOT EXISTS time_sensitivity TEXT; -- urgent, soon, flexible, none
ALTER TABLE pages ADD COLUMN IF NOT EXISTS last_signal_at TIMESTAMPTZ;
ALTER TABLE pages ADD COLUMN IF NOT EXISTS drift_score FLOAT DEFAULT 0;

-- ==================== SKILL CONFIDENCE TRACKING ====================
-- Enhanced skill tracking for autonomous behavior
ALTER TABLE skills ADD COLUMN IF NOT EXISTS confidence_score FLOAT DEFAULT 0;
ALTER TABLE skills ADD COLUMN IF NOT EXISTS last_activated_at TIMESTAMPTZ;
ALTER TABLE skills ADD COLUMN IF NOT EXISTS activation_count INTEGER DEFAULT 0;
ALTER TABLE skills ADD COLUMN IF NOT EXISTS success_rate FLOAT DEFAULT 0;
ALTER TABLE skills ADD COLUMN IF NOT EXISTS is_bottleneck BOOLEAN DEFAULT FALSE;

-- ==================== TASK INTELLIGENCE ====================
-- Enhanced task tracking
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS calculated_priority_score FLOAT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS goal_alignment_score FLOAT DEFAULT 0;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS auto_generated BOOLEAN DEFAULT FALSE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS generation_source TEXT; -- page, skill, pattern, user

-- ==================== INDEXES ====================
CREATE INDEX IF NOT EXISTS idx_insights_workspace ON insights(workspace_id);
CREATE INDEX IF NOT EXISTS idx_insights_dismissed ON insights(workspace_id, dismissed);
CREATE INDEX IF NOT EXISTS idx_proposed_actions_workspace ON proposed_actions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_proposed_actions_executed ON proposed_actions(workspace_id, executed);
CREATE INDEX IF NOT EXISTS idx_proposed_actions_skill ON proposed_actions(source_skill_id);
CREATE INDEX IF NOT EXISTS idx_skill_executions_skill ON skill_executions(skill_id);
CREATE INDEX IF NOT EXISTS idx_entity_signals_workspace ON entity_signals(workspace_id);
CREATE INDEX IF NOT EXISTS idx_entity_signals_processed ON entity_signals(workspace_id, processed);
CREATE INDEX IF NOT EXISTS idx_skill_memory_skill ON skill_memory(skill_id);

-- ==================== RLS POLICIES ====================
ALTER TABLE insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposed_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE entity_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_trust_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_memory ENABLE ROW LEVEL SECURITY;

-- Insights policies
DROP POLICY IF EXISTS "Users can view their workspace insights" ON insights;
CREATE POLICY "Users can view their workspace insights" ON insights
    FOR SELECT USING (
        workspace_id IN (
            SELECT id FROM workspaces WHERE user_id = auth.uid()
            UNION
            SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can manage their insights" ON insights;
CREATE POLICY "Users can manage their insights" ON insights
    FOR ALL USING (user_id = auth.uid());

-- Proposed actions policies
DROP POLICY IF EXISTS "Users can view their workspace actions" ON proposed_actions;
CREATE POLICY "Users can view their workspace actions" ON proposed_actions
    FOR SELECT USING (
        workspace_id IN (
            SELECT id FROM workspaces WHERE user_id = auth.uid()
            UNION
            SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can manage their actions" ON proposed_actions;
CREATE POLICY "Users can manage their actions" ON proposed_actions
    FOR ALL USING (user_id = auth.uid());

-- Skill executions policies
DROP POLICY IF EXISTS "Users can view skill executions" ON skill_executions;
CREATE POLICY "Users can view skill executions" ON skill_executions
    FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can create skill executions" ON skill_executions;
CREATE POLICY "Users can create skill executions" ON skill_executions
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Entity signals policies
DROP POLICY IF EXISTS "Users can view their signals" ON entity_signals;
CREATE POLICY "Users can view their signals" ON entity_signals
    FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can create signals" ON entity_signals;
CREATE POLICY "Users can create signals" ON entity_signals
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Trust levels policies
DROP POLICY IF EXISTS "Users can view their trust levels" ON user_trust_levels;
CREATE POLICY "Users can view their trust levels" ON user_trust_levels
    FOR SELECT USING (user_id = auth.uid());

-- Skill memory policies
DROP POLICY IF EXISTS "Users can view skill memory" ON skill_memory;
CREATE POLICY "Users can view skill memory" ON skill_memory
    FOR SELECT USING (
        skill_id IN (
            SELECT id FROM skills WHERE user_id = auth.uid()
            UNION
            SELECT s.id FROM skills s
            JOIN workspaces w ON s.workspace_id = w.id
            WHERE w.user_id = auth.uid()
            UNION
            SELECT s.id FROM skills s
            JOIN workspace_members wm ON s.workspace_id = wm.workspace_id
            WHERE wm.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "System can manage skill memory" ON skill_memory;
CREATE POLICY "System can manage skill memory" ON skill_memory
    FOR ALL USING (true);

-- ==================== TRIGGERS ====================

-- Auto-update updated_at for insights
CREATE OR REPLACE FUNCTION update_insights_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS insights_updated_at ON insights;
CREATE TRIGGER insights_updated_at
    BEFORE UPDATE ON insights
    FOR EACH ROW
    EXECUTE FUNCTION update_insights_updated_at();

-- Auto-update trust level updated_at
CREATE OR REPLACE FUNCTION update_trust_level_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trust_level_updated_at ON user_trust_levels;
CREATE TRIGGER trust_level_updated_at
    BEFORE UPDATE ON user_trust_levels
    FOR EACH ROW
    EXECUTE FUNCTION update_trust_level_updated_at();

-- ==================== GRANT PERMISSIONS ====================
GRANT ALL ON insights TO authenticated;
GRANT ALL ON proposed_actions TO authenticated;
GRANT ALL ON skill_executions TO authenticated;
GRANT ALL ON entity_signals TO authenticated;
GRANT ALL ON user_trust_levels TO authenticated;
GRANT ALL ON skill_memory TO authenticated;

SELECT 'Living Intelligence OS migration complete!' as status;
