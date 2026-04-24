-- Fix skill_type constraint to include all Intelligence OS categories
-- This allows skills to use: planning, execution, learning, decision, research, startup

-- Drop the old constraint
ALTER TABLE public.skills 
DROP CONSTRAINT IF EXISTS skills_skill_type_check;

-- Add new constraint with all valid categories
ALTER TABLE public.skills 
ADD CONSTRAINT skills_skill_type_check 
CHECK (skill_type IN (
    'learning', 
    'research', 
    'creation', 
    'analysis', 
    'practice',
    'planning',
    'execution',
    'decision',
    'startup'
));

-- Also update the category column constraint if it exists
ALTER TABLE public.skills 
DROP CONSTRAINT IF EXISTS skills_category_check;

ALTER TABLE public.skills 
ADD CONSTRAINT skills_category_check 
CHECK (category IN (
    'learning', 
    'research', 
    'creation', 
    'analysis', 
    'practice',
    'planning',
    'execution',
    'decision',
    'startup'
));

-- Verify the constraints
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.skills'::regclass
AND conname LIKE '%skill_type%' OR conname LIKE '%category%';
