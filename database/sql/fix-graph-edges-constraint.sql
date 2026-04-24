-- Fix graph_edges edge_type constraint
-- First, update existing rows that violate the constraint

-- Update any 'references' edge_type to 'linked' (valid type)
UPDATE public.graph_edges 
SET edge_type = 'linked' 
WHERE edge_type = 'references';

-- Update any 'related_to' edge_type to 'linked'
UPDATE public.graph_edges 
SET edge_type = 'linked' 
WHERE edge_type = 'related_to';

-- Update any other invalid edge types to 'linked'
UPDATE public.graph_edges 
SET edge_type = 'linked' 
WHERE edge_type NOT IN ('explicit', 'inferred', 'evidence', 'linked');

-- Now drop and recreate the constraint with more edge types
ALTER TABLE public.graph_edges 
DROP CONSTRAINT IF EXISTS graph_edges_edge_type_check;

-- Add new constraint with all valid edge types
ALTER TABLE public.graph_edges 
ADD CONSTRAINT graph_edges_edge_type_check 
CHECK (edge_type = ANY (ARRAY[
    -- Original edge types
    'explicit'::text,      -- User-created connection
    'inferred'::text,      -- AI-suggested connection
    'evidence'::text,      -- Skill evidence connection
    'linked'::text,        -- Task/page linked connection
    -- Page link relation types
    'references'::text,    -- Page references another page
    'related_to'::text,    -- Pages are related
    'prerequisite'::text,  -- Page is prerequisite for another
    'extends'::text,       -- Page extends another
    'contradicts'::text,   -- Page contradicts another
    'supports'::text,      -- Page supports another
    'example_of'::text,    -- Page is example of another
    'part_of'::text,       -- Page is part of another
    'derived_from'::text,  -- Page is derived from another
    -- Concept edge types
    'concept'::text,       -- Page mentions concept
    'defines'::text,       -- Page defines concept
    'uses'::text           -- Page uses concept
]));

-- Verify the constraint was updated
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conname = 'graph_edges_edge_type_check';

SELECT 'graph_edges constraint fixed successfully' as status;
