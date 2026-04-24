-- ============================================
-- ADVANCED INTELLIGENCE OS SKILL SYSTEM
-- Cost-Safe, Event-Driven, LLM-Minimal
-- ============================================

-- 1️⃣ UPGRADE SKILLS TABLE
-- Add advanced fields for Intelligence OS

ALTER TABLE skills 
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'learning' 
  CHECK (category IN ('planning', 'execution', 'learning', 'decision', 'research', 'startup')),
ADD COLUMN IF NOT EXISTS purpose TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS goal_type JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS scope TEXT DEFAULT 'workspace' 
  CHECK (scope IN ('page', 'workspace')),
ADD COLUMN IF NOT EXISTS evidence_sources JSONB DEFAULT '{"pages": true, "tasks": true, "calendar": false}',
ADD COLUMN IF NOT EXISTS activation_signals JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS suggestion_types JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS authority_level TEXT DEFAULT 'suggest' 
  CHECK (authority_level IN ('read_only', 'suggest')),
ADD COLUMN IF NOT EXISTS memory_scope TEXT DEFAULT 'workspace' 
  CHECK (memory_scope IN ('page', 'workspace')),
ADD COLUMN IF NOT EXISTS compatible_skills JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS conflicting_skills JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS confidence FLOAT DEFAULT 0.3 
  CHECK (confidence >= 0 AND confidence <= 1),
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'learning' 
  CHECK (status IN ('learning', 'helping', 'reliable', 'trusted')),
ADD COLUMN IF NOT EXISTS skill_type TEXT DEFAULT 'learning';

-- Update existing skills to have default values
UPDATE skills 
SET 
  category = 'learning',
  purpose = COALESCE(description, ''),
  goal_type = '["clarity"]',
  evidence_sources = '{"pages": true, "tasks": true, "calendar": false}',
  activation_signals = '[]',
  suggestion_types = '[]',
  confidence = 0.3,
  status = 'learning'
WHERE category IS NULL;

-- 2️⃣ CREATE SKILL_EVENTS TABLE (EVIDENCE)
-- All learning comes from events, NOT LLM memory

CREATE TABLE IF NOT EXISTS skill_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,  -- page_edit, task_complete, task_delay, calendar_change
  entity_type TEXT NOT NULL CHECK (entity_type IN ('page', 'task', 'calendar')),
  entity_id UUID NOT NULL,
  signal TEXT NOT NULL,  -- oversized_task, page_drift, deadline_pressure, etc.
  outcome TEXT DEFAULT 'pending' CHECK (outcome IN ('success', 'ignored', 'failed', 'pending')),
  confidence_delta FLOAT DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_skill_events_skill ON skill_events(skill_id);
CREATE INDEX IF NOT EXISTS idx_skill_events_entity ON skill_events(entity_id, entity_type);
CREATE INDEX IF NOT EXISTS idx_skill_events_created ON skill_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_skill_events_workspace ON skill_events(workspace_id);

-- RLS for skill_events
ALTER TABLE skill_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view skill events in their workspaces" ON skill_events;
CREATE POLICY "Users can view skill events in their workspaces"
ON skill_events FOR SELECT
USING (
  workspace_id IN (
    SELECT workspace_id FROM workspace_members 
    WHERE user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "System can manage skill events" ON skill_events;
CREATE POLICY "System can manage skill events"
ON skill_events FOR ALL
USING (true)
WITH CHECK (true);

-- 3️⃣ CREATE LLM_CACHE TABLE
-- Cache LLM outputs to minimize API calls

CREATE TABLE IF NOT EXISTS llm_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key TEXT NOT NULL UNIQUE,  -- skill_id + signal + entity_id
  skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  signal TEXT NOT NULL,
  entity_id UUID NOT NULL,
  entity_type TEXT NOT NULL,
  llm_output TEXT NOT NULL,
  output_type TEXT NOT NULL,  -- explanation, suggestion, summary
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ DEFAULT NOW(),
  use_count INTEGER DEFAULT 1,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_llm_cache_key ON llm_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_llm_cache_skill ON llm_cache(skill_id);
CREATE INDEX IF NOT EXISTS idx_llm_cache_workspace ON llm_cache(workspace_id);

-- RLS for llm_cache
ALTER TABLE llm_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view LLM cache in their workspaces" ON llm_cache;
CREATE POLICY "Users can view LLM cache in their workspaces"
ON llm_cache FOR SELECT
USING (
  workspace_id IN (
    SELECT workspace_id FROM workspace_members 
    WHERE user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "System can manage LLM cache" ON llm_cache;
CREATE POLICY "System can manage LLM cache"
ON llm_cache FOR ALL
USING (true)
WITH CHECK (true);

-- 4️⃣ CREATE SKILL_COOLDOWNS TABLE
-- Track when skills last called LLM to enforce 24h cooldown

CREATE TABLE IF NOT EXISTS skill_cooldowns (
  skill_id UUID PRIMARY KEY REFERENCES skills(id) ON DELETE CASCADE,
  last_llm_call TIMESTAMPTZ DEFAULT NOW(),
  signal_counts JSONB DEFAULT '{}',  -- Track how many times each signal detected
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_skill_cooldowns_workspace ON skill_cooldowns(workspace_id);

-- RLS for skill_cooldowns
ALTER TABLE skill_cooldowns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "System can manage skill cooldowns" ON skill_cooldowns;
CREATE POLICY "System can manage skill cooldowns"
ON skill_cooldowns FOR ALL
USING (true)
WITH CHECK (true);

-- 5️⃣ CREATE SKILL_SUPPRESSION TABLE
-- Track when skills are suppressed due to repeated ignores

CREATE TABLE IF NOT EXISTS skill_suppression (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  suppressed_until TIMESTAMPTZ NOT NULL,
  reason TEXT NOT NULL,  -- ignored_3_times, low_confidence, etc.
  ignore_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_skill_suppression_skill ON skill_suppression(skill_id);
CREATE INDEX IF NOT EXISTS idx_skill_suppression_until ON skill_suppression(suppressed_until);
CREATE INDEX IF NOT EXISTS idx_skill_suppression_workspace ON skill_suppression(workspace_id);

-- RLS for skill_suppression
ALTER TABLE skill_suppression ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "System can manage skill suppression" ON skill_suppression;
CREATE POLICY "System can manage skill suppression"
ON skill_suppression FOR ALL
USING (true)
WITH CHECK (true);

-- 6️⃣ UPDATE EXISTING TABLES

-- Add workspace_id to skill_contributions if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'skill_contributions' AND column_name = 'workspace_id'
  ) THEN
    ALTER TABLE skill_contributions 
    ADD COLUMN workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;
    
    -- Backfill workspace_id from skills table
    UPDATE skill_contributions sc
    SET workspace_id = s.workspace_id
    FROM skills s
    WHERE sc.skill_id = s.id AND sc.workspace_id IS NULL;
  END IF;
END $$;

-- 7️⃣ CREATE HELPER FUNCTIONS

-- Function to calculate skill status from confidence
CREATE OR REPLACE FUNCTION calculate_skill_status(conf FLOAT)
RETURNS TEXT AS $$
BEGIN
  IF conf < 0.31 THEN RETURN 'learning';
  ELSIF conf < 0.61 THEN RETURN 'helping';
  ELSIF conf < 0.81 THEN RETURN 'reliable';
  ELSE RETURN 'trusted';
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to check if LLM call is allowed
CREATE OR REPLACE FUNCTION can_call_llm(
  p_skill_id UUID,
  p_signal TEXT,
  p_confidence FLOAT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_last_call TIMESTAMPTZ;
  v_signal_count INTEGER;
  v_cooldown_hours INTEGER := 24;
BEGIN
  -- Check confidence threshold
  IF p_confidence < 0.4 THEN
    RETURN FALSE;
  END IF;
  
  -- Check cooldown
  SELECT last_llm_call INTO v_last_call
  FROM skill_cooldowns
  WHERE skill_id = p_skill_id;
  
  IF v_last_call IS NOT NULL AND 
     v_last_call > NOW() - INTERVAL '24 hours' THEN
    RETURN FALSE;
  END IF;
  
  -- Check signal count (need at least 2 detections)
  SELECT COALESCE((signal_counts->>p_signal)::INTEGER, 0) INTO v_signal_count
  FROM skill_cooldowns
  WHERE skill_id = p_skill_id;
  
  IF v_signal_count < 2 THEN
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to update skill confidence
CREATE OR REPLACE FUNCTION update_skill_confidence(
  p_skill_id UUID,
  p_delta FLOAT
)
RETURNS VOID AS $$
DECLARE
  v_new_confidence FLOAT;
  v_new_status TEXT;
BEGIN
  -- Calculate new confidence (clamped 0-1)
  UPDATE skills
  SET confidence = GREATEST(0, LEAST(1, confidence + p_delta)),
      updated_at = NOW()
  WHERE id = p_skill_id
  RETURNING confidence INTO v_new_confidence;
  
  -- Update status based on new confidence
  v_new_status := calculate_skill_status(v_new_confidence);
  
  UPDATE skills
  SET status = v_new_status
  WHERE id = p_skill_id;
END;
$$ LANGUAGE plpgsql;

-- 8️⃣ CREATE TRIGGERS

-- Auto-update skill status when confidence changes
CREATE OR REPLACE FUNCTION trigger_update_skill_status()
RETURNS TRIGGER AS $$
BEGIN
  NEW.status := calculate_skill_status(NEW.confidence);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_skill_status_on_confidence_change ON skills;
CREATE TRIGGER update_skill_status_on_confidence_change
BEFORE UPDATE OF confidence ON skills
FOR EACH ROW
EXECUTE FUNCTION trigger_update_skill_status();

-- 9️⃣ COMMENTS

COMMENT ON TABLE skill_events IS 'Event-driven evidence for skill learning - NO LLM memory';
COMMENT ON TABLE llm_cache IS 'Cache LLM outputs to minimize API calls';
COMMENT ON TABLE skill_cooldowns IS 'Enforce 24h cooldown between LLM calls per skill';
COMMENT ON TABLE skill_suppression IS 'Track suppressed skills (ignored 3+ times)';

COMMENT ON COLUMN skills.category IS 'Skill category: planning, execution, learning, decision, research, startup';
COMMENT ON COLUMN skills.confidence IS 'Real confidence from events: 0-0.3=learning, 0.31-0.6=helping, 0.61-0.8=reliable, 0.81+=trusted';
COMMENT ON COLUMN skills.status IS 'Auto-calculated from confidence';
COMMENT ON COLUMN skills.activation_signals IS 'Array of signals that trigger this skill';
COMMENT ON COLUMN skills.authority_level IS 'read_only=insights only, suggest=needs approval';

COMMENT ON COLUMN skill_events.signal IS 'Detected pattern: oversized_task, page_drift, deadline_pressure, etc.';
COMMENT ON COLUMN skill_events.outcome IS 'success=+0.05, ignored=-0.03, failed=-0.08';
COMMENT ON COLUMN skill_events.confidence_delta IS 'How much this event changed confidence';

-- 🔟 SUCCESS MESSAGE

DO $$
BEGIN
  RAISE NOTICE '✅ Advanced Intelligence OS Skill System installed!';
  RAISE NOTICE '📊 Tables: skill_events, llm_cache, skill_cooldowns, skill_suppression';
  RAISE NOTICE '🧠 Skills upgraded with: category, confidence, status, signals';
  RAISE NOTICE '🚀 Event-driven learning enabled';
  RAISE NOTICE '💰 LLM calls minimized with caching + cooldowns';
  RAISE NOTICE '🔒 RLS policies applied';
  RAISE NOTICE '';
  RAISE NOTICE '⚡ Next steps:';
  RAISE NOTICE '1. Run backend skill engine';
  RAISE NOTICE '2. Skills learn from events automatically';
  RAISE NOTICE '3. LLM only called when strictly necessary';
END $$;
