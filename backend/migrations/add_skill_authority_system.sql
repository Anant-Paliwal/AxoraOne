-- ==========================================
-- SKILL AUTHORITY SYSTEM MIGRATION
-- Safe, Trusted Intelligence OS Behavior
-- ==========================================

-- 1️⃣ Update skills table with new authority level
ALTER TABLE skills
ADD COLUMN IF NOT EXISTS authority_level TEXT DEFAULT 'suggest' 
  CHECK (authority_level IN ('read_only', 'suggest', 'assist_structure'));

-- Set default for existing skills
UPDATE skills
SET authority_level = 'suggest'
WHERE authority_level IS NULL;

-- 2️⃣ Create skill_suggestions table
CREATE TABLE IF NOT EXISTS skill_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  skill_name TEXT NOT NULL,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Suggestion details
  suggestion_type TEXT NOT NULL, -- add_section, suggest_task, etc.
  target_type TEXT NOT NULL, -- page, task
  target_id UUID NOT NULL,
  description TEXT NOT NULL,
  why TEXT NOT NULL, -- Explanation
  
  -- Risk assessment
  risk_level TEXT NOT NULL CHECK (risk_level IN ('low', 'medium', 'high')),
  requires_approval BOOLEAN DEFAULT true,
  reversible BOOLEAN DEFAULT true,
  
  -- Payload
  payload JSONB DEFAULT '{}',
  confidence FLOAT DEFAULT 0.3,
  
  -- Status tracking
  approved BOOLEAN DEFAULT false,
  rejected BOOLEAN DEFAULT false,
  ignored BOOLEAN DEFAULT false,
  executed BOOLEAN DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  ignored_at TIMESTAMPTZ,
  executed_at TIMESTAMPTZ,
  
  -- Indexes
  CONSTRAINT valid_target CHECK (target_type IN ('page', 'task', 'skill'))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_skill_suggestions_skill ON skill_suggestions(skill_id);
CREATE INDEX IF NOT EXISTS idx_skill_suggestions_workspace ON skill_suggestions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_skill_suggestions_user ON skill_suggestions(user_id);
CREATE INDEX IF NOT EXISTS idx_skill_suggestions_status ON skill_suggestions(approved, rejected, ignored, executed);
CREATE INDEX IF NOT EXISTS idx_skill_suggestions_created ON skill_suggestions(created_at DESC);

-- 3️⃣ Create skill_feedback table (tracks user responses)
CREATE TABLE IF NOT EXISTS skill_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  suggestion_id UUID REFERENCES skill_suggestions(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Feedback details
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('approved', 'rejected', 'ignored')),
  change_type TEXT NOT NULL,
  target_type TEXT NOT NULL,
  
  -- Impact on confidence
  confidence_delta FLOAT DEFAULT 0,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_skill_feedback_skill ON skill_feedback(skill_id);
CREATE INDEX IF NOT EXISTS idx_skill_feedback_created ON skill_feedback(created_at DESC);

-- 4️⃣ Add RLS policies for skill_suggestions
ALTER TABLE skill_suggestions ENABLE ROW LEVEL SECURITY;

-- Users can see suggestions in their workspaces
CREATE POLICY skill_suggestions_select ON skill_suggestions
  FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
      UNION
      SELECT id FROM workspaces WHERE user_id = auth.uid()
    )
  );

-- Users can insert suggestions (skills create them)
CREATE POLICY skill_suggestions_insert ON skill_suggestions
  FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
      UNION
      SELECT id FROM workspaces WHERE user_id = auth.uid()
    )
  );

-- Users can update suggestions (approve/reject)
CREATE POLICY skill_suggestions_update ON skill_suggestions
  FOR UPDATE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
      UNION
      SELECT id FROM workspaces WHERE user_id = auth.uid()
    )
  );

-- 5️⃣ Add RLS policies for skill_feedback
ALTER TABLE skill_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY skill_feedback_select ON skill_feedback
  FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
      UNION
      SELECT id FROM workspaces WHERE user_id = auth.uid()
    )
  );

CREATE POLICY skill_feedback_insert ON skill_feedback
  FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
      UNION
      SELECT id FROM workspaces WHERE user_id = auth.uid()
    )
  );

-- 6️⃣ Create helper functions

-- Function to check if skill can modify content
CREATE OR REPLACE FUNCTION can_skill_modify(
  p_skill_id UUID,
  p_change_type TEXT,
  p_target_type TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_authority TEXT;
  v_confidence FLOAT;
BEGIN
  -- Get skill authority and confidence
  SELECT authority_level, confidence
  INTO v_authority, v_confidence
  FROM skills
  WHERE id = p_skill_id;
  
  -- Block intent-altering changes
  IF p_change_type IN ('rewrite_content', 'delete_content', 'change_priority', 'auto_complete') THEN
    RETURN FALSE;
  END IF;
  
  -- Structural changes require assist_structure authority
  IF p_change_type IN ('add_section', 'add_checklist') THEN
    IF v_authority != 'assist_structure' THEN
      RETURN FALSE;
    END IF;
    IF v_confidence < 0.8 THEN
      RETURN FALSE;
    END IF;
  END IF;
  
  -- Suggestions require at least suggest authority
  IF p_change_type IN ('suggest_task', 'suggest_breakdown') THEN
    IF v_authority = 'read_only' THEN
      RETURN FALSE;
    END IF;
    IF v_confidence < 0.25 THEN
      RETURN FALSE;
    END IF;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to track suggestion outcome
CREATE OR REPLACE FUNCTION track_suggestion_outcome()
RETURNS TRIGGER AS $$
BEGIN
  -- When suggestion is approved/rejected/ignored, update skill confidence
  IF NEW.approved = TRUE AND OLD.approved = FALSE THEN
    -- Positive feedback
    UPDATE skills
    SET confidence = LEAST(1.0, confidence + 0.05)
    WHERE id = NEW.skill_id;
    
    -- Record feedback
    INSERT INTO skill_feedback (skill_id, suggestion_id, workspace_id, user_id, feedback_type, change_type, target_type, confidence_delta)
    VALUES (NEW.skill_id, NEW.id, NEW.workspace_id, NEW.user_id, 'approved', NEW.suggestion_type, NEW.target_type, 0.05);
  END IF;
  
  IF NEW.rejected = TRUE AND OLD.rejected = FALSE THEN
    -- Negative feedback
    UPDATE skills
    SET confidence = GREATEST(0.0, confidence - 0.10)
    WHERE id = NEW.skill_id;
    
    -- Record feedback
    INSERT INTO skill_feedback (skill_id, suggestion_id, workspace_id, user_id, feedback_type, change_type, target_type, confidence_delta)
    VALUES (NEW.skill_id, NEW.id, NEW.workspace_id, NEW.user_id, 'rejected', NEW.suggestion_type, NEW.target_type, -0.10);
  END IF;
  
  IF NEW.ignored = TRUE AND OLD.ignored = FALSE THEN
    -- Track ignore for suppression
    INSERT INTO skill_feedback (skill_id, suggestion_id, workspace_id, user_id, feedback_type, change_type, target_type, confidence_delta)
    VALUES (NEW.skill_id, NEW.id, NEW.workspace_id, NEW.user_id, 'ignored', NEW.suggestion_type, NEW.target_type, 0);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS track_suggestion_outcome_trigger ON skill_suggestions;
CREATE TRIGGER track_suggestion_outcome_trigger
AFTER UPDATE ON skill_suggestions
FOR EACH ROW
EXECUTE FUNCTION track_suggestion_outcome();

-- 7️⃣ Add comments for documentation
COMMENT ON TABLE skill_suggestions IS 'Stores skill suggestions that require user approval';
COMMENT ON COLUMN skills.authority_level IS 'read_only=insights only, suggest=needs approval, assist_structure=limited safe updates';
COMMENT ON COLUMN skill_suggestions.risk_level IS 'low=safe structural, medium=requires approval, high=blocked';
COMMENT ON COLUMN skill_suggestions.reversible IS 'Whether the change can be undone';
COMMENT ON FUNCTION can_skill_modify IS 'Checks if skill has authority to perform a change';

-- 8️⃣ Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Skill Authority System installed!';
  RAISE NOTICE '🛡️ Skills now require approval for all modifications';
  RAISE NOTICE '📊 Tables: skill_suggestions, skill_feedback';
  RAISE NOTICE '🔒 Authority levels: read_only, suggest, assist_structure';
  RAISE NOTICE '🚫 Blocked: rewrite_content, delete_content, auto_complete, change_priority';
  RAISE NOTICE '✅ Allowed with approval: add_section, suggest_task, link_entity';
END $$;
