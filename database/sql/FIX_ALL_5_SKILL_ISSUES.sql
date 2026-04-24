-- ============================================
-- FIX #1: Add user_id column to skill_evidence
-- ============================================

-- Add user_id column if it doesn't exist
ALTER TABLE skill_evidence 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_skill_evidence_user_id ON skill_evidence(user_id);

-- Verify the column was added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'skill_evidence'
ORDER BY ordinal_position;

-- Success message
DO $
BEGIN
    RAISE NOTICE '✅ FIX #1 COMPLETE: skill_evidence.user_id column added';
END $;
