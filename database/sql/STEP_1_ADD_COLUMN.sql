-- ============================================
-- STEP 1: Add source_skill_id column ONLY
-- Run this first, then run STEP 2
-- ============================================

-- Add source_skill_id to proposed_actions if missing
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='proposed_actions' AND column_name='source_skill_id'
    ) THEN
        ALTER TABLE proposed_actions 
        ADD COLUMN source_skill_id UUID REFERENCES skills(id) ON DELETE SET NULL;
        
        RAISE NOTICE 'Column source_skill_id added to proposed_actions';
    ELSE
        RAISE NOTICE 'Column source_skill_id already exists in proposed_actions';
    END IF;
END $$;

-- Verify
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'proposed_actions' 
AND column_name = 'source_skill_id';
