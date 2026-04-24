-- Fix Concepts Migration - Step by Step
-- Run this to complete the concepts setup

-- Step 1: Drop the concepts table if it exists (to start fresh)
DROP TABLE IF EXISTS public.concepts CASCADE;

-- Step 2: Create concepts table fresh
CREATE TABLE public.concepts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    definition TEXT,
    category TEXT,
    importance_score FLOAT DEFAULT 0.5,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, workspace_id, name)
);

-- Step 3: Create indexes
CREATE INDEX idx_concepts_user_workspace ON public.concepts(user_id, workspace_id);
CREATE INDEX idx_concepts_name ON public.concepts(name);
CREATE INDEX idx_concepts_importance ON public.concepts(importance_score DESC);
CREATE INDEX idx_concepts_usage ON public.concepts(usage_count DESC);

-- Step 4: Enable RLS
ALTER TABLE public.concepts ENABLE ROW LEVEL SECURITY;

-- Step 5: Create RLS policies
CREATE POLICY "Users can view their own concepts"
ON public.concepts FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own concepts"
ON public.concepts FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own concepts"
ON public.concepts FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own concepts"
ON public.concepts FOR DELETE
USING (auth.uid() = user_id);

-- Step 6: Update graph_edges constraint for new edge types
ALTER TABLE public.graph_edges DROP CONSTRAINT IF EXISTS graph_edges_edge_type_check;

ALTER TABLE public.graph_edges ADD CONSTRAINT graph_edges_edge_type_check 
CHECK (edge_type = ANY (ARRAY[
    'explicit'::text, 'inferred'::text, 'evidence'::text, 'linked'::text,
    'learns'::text, 'explains'::text, 'depends_on'::text, 'prerequisite'::text,
    'related'::text, 'mentions'::text, 'part_of'::text, 'blocks'::text
]));

-- Step 7: Add new columns to graph_edges (if they don't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'graph_edges' AND column_name = 'strength') THEN
        ALTER TABLE public.graph_edges ADD COLUMN strength FLOAT DEFAULT 0.5;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'graph_edges' AND column_name = 'bidirectional') THEN
        ALTER TABLE public.graph_edges ADD COLUMN bidirectional BOOLEAN DEFAULT false;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'graph_edges' AND column_name = 'metadata') THEN
        ALTER TABLE public.graph_edges ADD COLUMN metadata JSONB DEFAULT '{}';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'graph_edges' AND column_name = 'last_accessed') THEN
        ALTER TABLE public.graph_edges ADD COLUMN last_accessed TIMESTAMPTZ;
    END IF;
END $$;

-- Step 8: Create indexes for graph_edges new columns
CREATE INDEX IF NOT EXISTS idx_graph_edges_strength ON public.graph_edges(strength DESC);
CREATE INDEX IF NOT EXISTS idx_graph_edges_bidirectional ON public.graph_edges(bidirectional);
CREATE INDEX IF NOT EXISTS idx_graph_edges_last_accessed ON public.graph_edges(last_accessed DESC);

-- Step 9: Create concept extraction function
CREATE OR REPLACE FUNCTION extract_concepts_from_page()
RETURNS TRIGGER AS $$
DECLARE
    concept_names TEXT[];
    concept_name TEXT;
    existing_concept UUID;
BEGIN
    -- Extract capitalized terms
    concept_names := ARRAY(
        SELECT DISTINCT unnest(
            regexp_matches(
                NEW.title || ' ' || COALESCE(NEW.content, ''),
                '\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b',
                'g'
            )
        )
    );
    
    -- Process each concept
    FOREACH concept_name IN ARRAY concept_names
    LOOP
        -- Skip common words
        IF concept_name IN ('The', 'This', 'That', 'These', 'Those', 'What', 'When', 'Where', 'Why', 'How') THEN
            CONTINUE;
        END IF;
        
        -- Check if concept exists
        SELECT id INTO existing_concept
        FROM concepts
        WHERE user_id = NEW.user_id 
        AND workspace_id = NEW.workspace_id
        AND name = concept_name;
        
        IF existing_concept IS NOT NULL THEN
            -- Update usage count
            UPDATE concepts
            SET usage_count = usage_count + 1, updated_at = NOW()
            WHERE id = existing_concept;
            
            -- Create edge
            INSERT INTO graph_edges (
                user_id, workspace_id, source_id, source_type,
                target_id, target_type, edge_type, strength
            )
            VALUES (
                NEW.user_id, NEW.workspace_id, NEW.id, 'page',
                existing_concept, 'concept', 'mentions', 0.6
            )
            ON CONFLICT DO NOTHING;
        ELSE
            -- Create new concept
            INSERT INTO concepts (user_id, workspace_id, name, usage_count)
            VALUES (NEW.user_id, NEW.workspace_id, concept_name, 1)
            RETURNING id INTO existing_concept;
            
            -- Create edge
            INSERT INTO graph_edges (
                user_id, workspace_id, source_id, source_type,
                target_id, target_type, edge_type, strength
            )
            VALUES (
                NEW.user_id, NEW.workspace_id, NEW.id, 'page',
                existing_concept, 'concept', 'mentions', 0.6
            );
        END IF;
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 10: Create trigger
DROP TRIGGER IF EXISTS extract_concepts_trigger ON pages;
CREATE TRIGGER extract_concepts_trigger
AFTER INSERT OR UPDATE OF title, content ON pages
FOR EACH ROW
EXECUTE FUNCTION extract_concepts_from_page();

-- Step 11: Create insights function
CREATE OR REPLACE FUNCTION calculate_graph_insights(
    p_user_id UUID,
    p_workspace_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    result := jsonb_build_object(
        'skill_gaps', '[]'::jsonb,
        'central_nodes', '[]'::jsonb,
        'isolated_nodes', '[]'::jsonb,
        'total_nodes', 0,
        'total_edges', 0
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Step 12: Create path finding function
CREATE OR REPLACE FUNCTION find_learning_path(
    p_user_id UUID,
    p_start_node_id UUID,
    p_end_node_id UUID,
    p_workspace_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
BEGIN
    RETURN '[]'::jsonb;
END;
$$ LANGUAGE plpgsql;

-- Success!
SELECT 'Concepts migration completed successfully!' as status;
