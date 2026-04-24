-- Skill Contributions Table
-- Tracks REAL contributions from skills (not just usage)

-- PREREQUISITE: Ensure proposed_actions has source_skill_id column
-- This is needed for the intelligence system to track which skill proposed actions
ALTER TABLE proposed_actions 
ADD COLUMN IF NOT EXISTS source_skill_id UUID REFERENCES skills(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_proposed_actions_skill ON proposed_actions(source_skill_id);

-- Create skill_contributions table
CREATE TABLE IF NOT EXISTS skill_contributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    contribution_type TEXT NOT NULL, -- suggestion_accepted, task_accelerated, page_improved, etc.
    target_id TEXT NOT NULL, -- ID of the thing that was improved
    target_type TEXT NOT NULL, -- task, page, decision, etc.
    impact_score FLOAT NOT NULL DEFAULT 0, -- How much it helped (-1 to 1)
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_skill_contributions_skill ON skill_contributions(skill_id);
CREATE INDEX IF NOT EXISTS idx_skill_contributions_workspace ON skill_contributions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_skill_contributions_type ON skill_contributions(contribution_type);
CREATE INDEX IF NOT EXISTS idx_skill_contributions_created ON skill_contributions(created_at DESC);

-- Add confidence_score to skills if not exists
ALTER TABLE skills 
ADD COLUMN IF NOT EXISTS confidence_score FLOAT DEFAULT 0,
ADD COLUMN IF NOT EXISTS success_rate FLOAT DEFAULT 0,
ADD COLUMN IF NOT EXISTS activation_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_activated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS is_bottleneck BOOLEAN DEFAULT FALSE;

-- Add confidence_score to skill_evidence
ALTER TABLE skill_evidence
ADD COLUMN IF NOT EXISTS confidence_score FLOAT DEFAULT 1.0;

-- RLS Policies
ALTER TABLE skill_contributions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view skill contributions in their workspaces" ON skill_contributions;
DROP POLICY IF EXISTS "Users can create skill contributions in their workspaces" ON skill_contributions;

-- Users can view contributions in their workspaces
CREATE POLICY "Users can view skill contributions in their workspaces"
ON skill_contributions FOR SELECT
USING (
    workspace_id IN (
        SELECT workspace_id FROM workspace_members 
        WHERE user_id = auth.uid()
    )
);

-- Users can create contributions in their workspaces
CREATE POLICY "Users can create skill contributions in their workspaces"
ON skill_contributions FOR INSERT
WITH CHECK (
    workspace_id IN (
        SELECT workspace_id FROM workspace_members 
        WHERE user_id = auth.uid()
    )
);

COMMENT ON TABLE skill_contributions IS 'Tracks real contributions from skills - what actually helped';
COMMENT ON COLUMN skill_contributions.impact_score IS 'Positive = helped, Negative = hurt, 0 = neutral';
COMMENT ON COLUMN skills.confidence_score IS 'Real confidence based on actual contributions (0-1)';
COMMENT ON COLUMN skills.success_rate IS 'Percentage of suggestions that were accepted (0-1)';
COMMENT ON COLUMN skills.activation_count IS 'How many times skill has been activated';
COMMENT ON COLUMN skills.is_bottleneck IS 'True if skill is blocking progress on multiple tasks';
