-- Quick Fix for Intelligence Tables
-- Run this if you already ran the migration but are missing columns

-- Add source_skill_id to proposed_actions if missing
ALTER TABLE proposed_actions ADD COLUMN IF NOT EXISTS source_skill_id UUID REFERENCES skills(id) ON DELETE SET NULL;

-- Verify the column was added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'proposed_actions' 
  AND column_name = 'source_skill_id';

-- Check if all intelligence tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('insights', 'proposed_actions', 'skill_memory', 'skill_executions', 'entity_signals', 'user_trust_levels')
ORDER BY table_name;

SELECT 'Intelligence tables check complete!' as status;
