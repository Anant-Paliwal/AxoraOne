-- Fix: Add source_skill_id column to proposed_actions table
-- This column tracks which skill agent proposed an action

-- Add the column if it doesn't exist
ALTER TABLE proposed_actions 
ADD COLUMN IF NOT EXISTS source_skill_id UUID REFERENCES skills(id) ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_proposed_actions_skill 
ON proposed_actions(source_skill_id);

-- Verify the column was added
SELECT 
    column_name, 
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'proposed_actions' 
  AND column_name = 'source_skill_id';

-- Show sample of proposed_actions structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'proposed_actions'
ORDER BY ordinal_position;

SELECT 'source_skill_id column fix complete!' as status;
