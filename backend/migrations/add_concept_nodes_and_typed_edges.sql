-- Add Concept Nodes and Enhanced Typed Edges for Knowledge Graph
-- This migration implements the "Personal Wikipedia" features

-- 1. Create concepts table for auto-extracted concepts
CREATE TABLE IF NOT EXISTS public.concepts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    definition TEXT,
    category TEXT, -- e.g., 'technical', 'business', 'general'
    importance_score FLOAT DEFAULT 0.5, -- 0-1 score for node sizing
    usage_count INTEGER DEFAULT 0, -- How many times referenced
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, workspace_id, name)
);

-- 2. Add indexes for concepts
CREATE INDEX idx_concepts_user_workspace ON public.concepts(user_id, workspace_id);
CREATE INDEX idx_concepts_name ON public.concepts(name);
CREATE INDEX idx_concepts_importance ON public.concepts(importance_score DESC);
CREATE INDEX idx_concepts_usage ON public.concepts(usage_count DESC);

-- 3. Enable RLS for concepts
ALTER TABLE public.concepts ENABLE ROW LEVEL SECURITY;

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

-- 4. Expand edge types to support more relationship types
ALTER TABLE public.graph_edges 
DROP CONSTRAINT IF EXISTS graph_edges_edge_type_check;

ALTER TABLE public.graph_edges 
ADD CONSTRAINT graph_edges_edge_type_check 
CHECK (edge_type = ANY (ARRAY[
    'explicit'::text,      -- User-created connection
    'inferred'::text,      -- AI-suggested connection
    'evidence'::text,      -- Skill evidence
    'linked'::text,        -- Task/page link
    'learns'::text,        -- Page teaches concept/skill
    'explains'::text,      -- Page explains concept
    'depends_on'::text,    -- Skill/concept depends on another
    'prerequisite'::text,  -- Required before
    'related'::text,       -- General relation
    'mentions'::text,      -- Page mentions concept
    'part_of'::text,       -- Subpage or component
    'blocks'::text         -- Prevents progress on
]));

-- 5. Add edge metadata for richer connections
ALTER TABLE public.graph_edges 
ADD COLUMN IF NOT EXISTS strength FLOAT DEFAULT 0.5, -- Connection strength 0-1
ADD COLUMN IF NOT EXISTS bidirectional BOOLEAN DEFAULT false, -- Is this a two-way relationship?
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}', -- Additional edge data
ADD COLUMN IF NOT EXISTS last_accessed TIMESTAMPTZ; -- For usage tracking

-- 6. Create indexes for new edge features
CREATE INDEX IF NOT EXISTS idx_graph_edges_strength ON public.graph_edges(strength DESC);
CREATE INDEX IF NOT EXISTS idx_graph_edges_bidirectional ON public.graph_edges(bidirectional);
CREATE INDEX IF NOT EXISTS idx_graph_edges_last_accessed ON public.graph_edges(last_accessed DESC);

-- 7. Create concept extraction function
CREATE OR REPLACE FUNCTION extract_concepts_from_page()
RETURNS TRIGGER AS $$
DECLARE
    concept_names TEXT[];
    concept_name TEXT;
    existing_concept UUID;
BEGIN
    -- Simple concept extraction: look for capitalized terms, technical terms
    -- In production, this would use NLP/AI
    
    -- Extract potential concepts from title and content
    -- This is a simplified version - real implementation would use AI
    concept_names := ARRAY(
        SELECT DISTINCT unnest(
            regexp_matches(
                NEW.title || ' ' || COALESCE(NEW.content, ''),
                '\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b',
                'g'
            )
        )
    );
    
    -- Insert or update concepts
    FOREACH concept_name IN ARRAY concept_names
    LOOP
        -- Skip very common words
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
            SET usage_count = usage_count + 1,
                updated_at = NOW()
            WHERE id = existing_concept;
            
            -- Create/update edge from page to concept
            INSERT INTO graph_edges (
                user_id, workspace_id, 
                source_id, source_type,
                target_id, target_type,
                edge_type, strength
            )
            VALUES (
                NEW.user_id, NEW.workspace_id,
                NEW.id, 'page',
                existing_concept, 'concept',
                'mentions', 0.6
            )
            ON CONFLICT DO NOTHING;
        ELSE
            -- Create new concept
            INSERT INTO concepts (user_id, workspace_id, name, usage_count)
            VALUES (NEW.user_id, NEW.workspace_id, concept_name, 1)
            RETURNING id INTO existing_concept;
            
            -- Create edge from page to concept
            INSERT INTO graph_edges (
                user_id, workspace_id,
                source_id, source_type,
                target_id, target_type,
                edge_type, strength
            )
            VALUES (
                NEW.user_id, NEW.workspace_id,
                NEW.id, 'page',
                existing_concept, 'concept',
                'mentions', 0.6
            );
        END IF;
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. Create trigger for concept extraction
DROP TRIGGER IF EXISTS extract_concepts_trigger ON pages;
CREATE TRIGGER extract_concepts_trigger
AFTER INSERT OR UPDATE OF title, content ON pages
FOR EACH ROW
EXECUTE FUNCTION extract_concepts_from_page();

-- 9. Create function to calculate graph insights
CREATE OR REPLACE FUNCTION calculate_graph_insights(
    p_user_id UUID,
    p_workspace_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
    skill_gaps JSONB;
    learning_paths JSONB;
    central_nodes JSONB;
    isolated_nodes JSONB;
BEGIN
    -- Find skill gaps (skills with no evidence or low connection)
    SELECT jsonb_agg(jsonb_build_object(
        'skill_id', s.id,
        'skill_name', s.name,
        'level', s.level,
        'connection_count', COALESCE(edge_count.count, 0),
        'gap_type', CASE 
            WHEN COALESCE(edge_count.count, 0) = 0 THEN 'no_evidence'
            WHEN COALESCE(edge_count.count, 0) < 2 THEN 'weak_evidence'
            ELSE 'needs_practice'
        END
    ))
    INTO skill_gaps
    FROM skills s
    LEFT JOIN (
        SELECT source_id, COUNT(*) as count
        FROM graph_edges
        WHERE user_id = p_user_id
        AND (p_workspace_id IS NULL OR workspace_id = p_workspace_id)
        AND source_type = 'skill'
        GROUP BY source_id
    ) edge_count ON s.id = edge_count.source_id
    WHERE s.user_id = p_user_id
    AND (p_workspace_id IS NULL OR s.workspace_id = p_workspace_id)
    AND COALESCE(edge_count.count, 0) < 3
    LIMIT 5;
    
    -- Find central nodes (most connected)
    SELECT jsonb_agg(jsonb_build_object(
        'node_id', node_id,
        'node_type', node_type,
        'connection_count', connection_count
    ))
    INTO central_nodes
    FROM (
        SELECT 
            COALESCE(source_id, target_id) as node_id,
            COALESCE(source_type, target_type) as node_type,
            COUNT(*) as connection_count
        FROM (
            SELECT source_id, source_type, NULL as target_id, NULL as target_type
            FROM graph_edges
            WHERE user_id = p_user_id
            AND (p_workspace_id IS NULL OR workspace_id = p_workspace_id)
            UNION ALL
            SELECT NULL, NULL, target_id, target_type
            FROM graph_edges
            WHERE user_id = p_user_id
            AND (p_workspace_id IS NULL OR workspace_id = p_workspace_id)
        ) combined
        GROUP BY COALESCE(source_id, target_id), COALESCE(source_type, target_type)
        ORDER BY connection_count DESC
        LIMIT 5
    ) top_nodes;
    
    -- Find isolated nodes (no connections)
    SELECT jsonb_agg(jsonb_build_object(
        'node_id', id,
        'node_type', node_type,
        'label', label
    ))
    INTO isolated_nodes
    FROM (
        SELECT p.id, 'page' as node_type, p.title as label
        FROM pages p
        WHERE p.user_id = p_user_id
        AND (p_workspace_id IS NULL OR p.workspace_id = p_workspace_id)
        AND NOT EXISTS (
            SELECT 1 FROM graph_edges e
            WHERE (e.source_id = p.id OR e.target_id = p.id)
            AND e.user_id = p_user_id
        )
        LIMIT 3
    ) isolated;
    
    -- Build result
    result := jsonb_build_object(
        'skill_gaps', COALESCE(skill_gaps, '[]'::jsonb),
        'central_nodes', COALESCE(central_nodes, '[]'::jsonb),
        'isolated_nodes', COALESCE(isolated_nodes, '[]'::jsonb),
        'total_nodes', (
            SELECT COUNT(*) FROM (
                SELECT id FROM pages WHERE user_id = p_user_id AND (p_workspace_id IS NULL OR workspace_id = p_workspace_id)
                UNION
                SELECT id FROM skills WHERE user_id = p_user_id AND (p_workspace_id IS NULL OR workspace_id = p_workspace_id)
                UNION
                SELECT id FROM tasks WHERE user_id = p_user_id AND (p_workspace_id IS NULL OR workspace_id = p_workspace_id)
                UNION
                SELECT id FROM concepts WHERE user_id = p_user_id AND (p_workspace_id IS NULL OR workspace_id = p_workspace_id)
            ) all_nodes
        ),
        'total_edges', (
            SELECT COUNT(*) FROM graph_edges 
            WHERE user_id = p_user_id 
            AND (p_workspace_id IS NULL OR workspace_id = p_workspace_id)
        )
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 10. Create function to find learning paths
CREATE OR REPLACE FUNCTION find_learning_path(
    p_user_id UUID,
    p_start_node_id UUID,
    p_end_node_id UUID,
    p_workspace_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    path JSONB;
BEGIN
    -- Simple path finding using recursive CTE
    -- In production, use more sophisticated graph algorithms
    WITH RECURSIVE path_search AS (
        -- Base case: start node
        SELECT 
            source_id as node_id,
            source_type as node_type,
            target_id as next_id,
            1 as depth,
            ARRAY[source_id] as path_ids,
            ARRAY[edge_type] as edge_types
        FROM graph_edges
        WHERE user_id = p_user_id
        AND source_id = p_start_node_id
        AND (p_workspace_id IS NULL OR workspace_id = p_workspace_id)
        
        UNION ALL
        
        -- Recursive case: follow edges
        SELECT 
            e.source_id,
            e.source_type,
            e.target_id,
            ps.depth + 1,
            ps.path_ids || e.source_id,
            ps.edge_types || e.edge_type
        FROM graph_edges e
        INNER JOIN path_search ps ON e.source_id = ps.next_id
        WHERE e.user_id = p_user_id
        AND ps.depth < 5  -- Limit path length
        AND NOT (e.source_id = ANY(ps.path_ids))  -- Avoid cycles
        AND (p_workspace_id IS NULL OR e.workspace_id = p_workspace_id)
    )
    SELECT jsonb_agg(jsonb_build_object(
        'node_id', node_id,
        'node_type', node_type,
        'depth', depth,
        'path', path_ids,
        'edge_types', edge_types
    ))
    INTO path
    FROM path_search
    WHERE next_id = p_end_node_id
    ORDER BY depth
    LIMIT 1;
    
    RETURN COALESCE(path, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql;

-- 11. Add comments
COMMENT ON TABLE concepts IS 'Auto-extracted concepts from pages for Personal Wikipedia feature';
COMMENT ON COLUMN graph_edges.strength IS 'Connection strength 0-1, based on usage and relevance';
COMMENT ON COLUMN graph_edges.bidirectional IS 'Whether this relationship works both ways';
COMMENT ON FUNCTION calculate_graph_insights IS 'Calculates AI insights: skill gaps, central nodes, isolated content';
COMMENT ON FUNCTION find_learning_path IS 'Finds shortest learning path between two nodes in the graph';

