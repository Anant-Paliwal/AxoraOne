-- Knowledge Graph Setup Migration
-- This ensures the graph_edges table and all related structures are properly configured

-- Update graph_edges table constraint to support all edge types
ALTER TABLE public.graph_edges 
DROP CONSTRAINT IF EXISTS graph_edges_edge_type_check;

ALTER TABLE public.graph_edges 
ADD CONSTRAINT graph_edges_edge_type_check 
CHECK (edge_type = ANY (ARRAY['explicit'::text, 'inferred'::text, 'evidence'::text, 'linked'::text]));

-- Enable RLS
ALTER TABLE public.graph_edges ENABLE ROW LEVEL SECURITY;

-- Drop and recreate RLS policies
DROP POLICY IF EXISTS "Users can view their own graph edges" ON public.graph_edges;
DROP POLICY IF EXISTS "Users can insert their own graph edges" ON public.graph_edges;
DROP POLICY IF EXISTS "Users can update their own graph edges" ON public.graph_edges;
DROP POLICY IF EXISTS "Users can delete their own graph edges" ON public.graph_edges;

CREATE POLICY "Users can view their own graph edges"
ON public.graph_edges FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own graph edges"
ON public.graph_edges FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own graph edges"
ON public.graph_edges FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own graph edges"
ON public.graph_edges FOR DELETE
USING (auth.uid() = user_id);

-- Create performance indexes
CREATE INDEX IF NOT EXISTS idx_graph_edges_source 
ON public.graph_edges (source_id, source_type);

CREATE INDEX IF NOT EXISTS idx_graph_edges_target 
ON public.graph_edges (target_id, target_type);

CREATE INDEX IF NOT EXISTS idx_graph_edges_edge_type 
ON public.graph_edges (edge_type);

CREATE INDEX IF NOT EXISTS idx_graph_edges_workspace_id 
ON public.graph_edges (workspace_id);

CREATE INDEX IF NOT EXISTS idx_graph_edges_user_workspace 
ON public.graph_edges (user_id, workspace_id);

-- Function to automatically create graph edges when evidence is added to skills
CREATE OR REPLACE FUNCTION create_skill_evidence_edges()
RETURNS TRIGGER AS $$
BEGIN
  -- When evidence array is updated, create/update graph edges
  IF NEW.evidence IS NOT NULL AND array_length(NEW.evidence, 1) > 0 THEN
    -- Delete old evidence edges for this skill
    DELETE FROM graph_edges 
    WHERE source_id = NEW.id 
    AND source_type = 'skill' 
    AND edge_type = 'evidence';
    
    -- Insert new evidence edges
    INSERT INTO graph_edges (user_id, workspace_id, source_id, source_type, target_id, target_type, edge_type)
    SELECT 
      NEW.user_id,
      NEW.workspace_id,
      NEW.id,
      'skill',
      unnest(NEW.evidence)::uuid,
      'page',
      'evidence'
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for skill evidence
DROP TRIGGER IF EXISTS skill_evidence_graph_trigger ON skills;
CREATE TRIGGER skill_evidence_graph_trigger
AFTER INSERT OR UPDATE OF evidence ON skills
FOR EACH ROW
EXECUTE FUNCTION create_skill_evidence_edges();

-- Function to automatically create graph edges when tasks are linked
CREATE OR REPLACE FUNCTION create_task_link_edges()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete old task link edges
  DELETE FROM graph_edges 
  WHERE source_id = NEW.id 
  AND source_type = 'task' 
  AND edge_type = 'linked';
  
  -- Create edge for linked page
  IF NEW.linked_page_id IS NOT NULL THEN
    INSERT INTO graph_edges (user_id, workspace_id, source_id, source_type, target_id, target_type, edge_type)
    VALUES (NEW.user_id, NEW.workspace_id, NEW.id, 'task', NEW.linked_page_id, 'page', 'linked')
    ON CONFLICT DO NOTHING;
  END IF;
  
  -- Create edge for linked skill
  IF NEW.linked_skill_id IS NOT NULL THEN
    INSERT INTO graph_edges (user_id, workspace_id, source_id, source_type, target_id, target_type, edge_type)
    VALUES (NEW.user_id, NEW.workspace_id, NEW.id, 'task', NEW.linked_skill_id, 'skill', 'linked')
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for task links
DROP TRIGGER IF EXISTS task_link_graph_trigger ON tasks;
CREATE TRIGGER task_link_graph_trigger
AFTER INSERT OR UPDATE OF linked_page_id, linked_skill_id ON tasks
FOR EACH ROW
EXECUTE FUNCTION create_task_link_edges();

-- Add helpful comments
COMMENT ON TABLE graph_edges IS 'Stores all connections between pages, skills, and tasks for knowledge graph visualization';
COMMENT ON COLUMN graph_edges.edge_type IS 'Type of connection: explicit (user-created), inferred (AI-suggested), evidence (skill evidence), linked (task links)';
COMMENT ON FUNCTION create_skill_evidence_edges() IS 'Automatically creates graph edges when evidence is added to skills';
COMMENT ON FUNCTION create_task_link_edges() IS 'Automatically creates graph edges when tasks are linked to pages or skills';
