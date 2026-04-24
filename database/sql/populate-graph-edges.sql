-- Populate graph_edges table with existing connections
-- This script creates edges from existing data in skills and tasks tables

-- First, update the constraint to support all edge types
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
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own graph edges"
ON public.graph_edges FOR DELETE
USING (auth.uid() = user_id);

-- Clear existing auto-generated edges (keep explicit and inferred)
DELETE FROM graph_edges 
WHERE edge_type IN ('evidence', 'linked');

-- Populate evidence edges from skills (with UUID validation)
INSERT INTO graph_edges (user_id, workspace_id, source_id, source_type, target_id, target_type, edge_type)
SELECT 
    s.user_id,
    s.workspace_id,
    s.id as source_id,
    'skill' as source_type,
    evidence_item::uuid as target_id,
    'page' as target_type,
    'evidence' as edge_type
FROM skills s,
     unnest(s.evidence) as evidence_item
WHERE s.evidence IS NOT NULL 
  AND array_length(s.evidence, 1) > 0
  -- Only include valid UUIDs (36 characters with hyphens in correct positions)
  AND evidence_item ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
ON CONFLICT DO NOTHING;

-- Populate linked edges from tasks to pages
INSERT INTO graph_edges (user_id, workspace_id, source_id, source_type, target_id, target_type, edge_type)
SELECT 
    t.user_id,
    t.workspace_id,
    t.id as source_id,
    'task' as source_type,
    t.linked_page_id as target_id,
    'page' as target_type,
    'linked' as edge_type
FROM tasks t
WHERE t.linked_page_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- Populate linked edges from tasks to skills
INSERT INTO graph_edges (user_id, workspace_id, source_id, source_type, target_id, target_type, edge_type)
SELECT 
    t.user_id,
    t.workspace_id,
    t.id as source_id,
    'task' as source_type,
    t.linked_skill_id as target_id,
    'skill' as target_type,
    'linked' as edge_type
FROM tasks t
WHERE t.linked_skill_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- Create indexes for performance
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

-- Create function to automatically sync skill evidence to graph_edges
CREATE OR REPLACE FUNCTION sync_skill_evidence_to_graph()
RETURNS TRIGGER AS $$
DECLARE
    evidence_item text;
BEGIN
  -- Delete old evidence edges for this skill
  DELETE FROM graph_edges 
  WHERE source_id = NEW.id 
    AND source_type = 'skill' 
    AND edge_type = 'evidence';
  
  -- Insert new evidence edges if evidence exists
  IF NEW.evidence IS NOT NULL AND array_length(NEW.evidence, 1) > 0 THEN
    -- Loop through evidence items and only insert valid UUIDs
    FOREACH evidence_item IN ARRAY NEW.evidence
    LOOP
      -- Check if it's a valid UUID format
      IF evidence_item ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        INSERT INTO graph_edges (user_id, workspace_id, source_id, source_type, target_id, target_type, edge_type)
        VALUES (
          NEW.user_id,
          NEW.workspace_id,
          NEW.id,
          'skill',
          evidence_item::uuid,
          'page',
          'evidence'
        )
        ON CONFLICT DO NOTHING;
      END IF;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for skill evidence
DROP TRIGGER IF EXISTS sync_skill_evidence_trigger ON skills;
CREATE TRIGGER sync_skill_evidence_trigger
AFTER INSERT OR UPDATE OF evidence ON skills
FOR EACH ROW
EXECUTE FUNCTION sync_skill_evidence_to_graph();

-- Create function to automatically sync task links to graph_edges
CREATE OR REPLACE FUNCTION sync_task_links_to_graph()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete old link edges for this task
  DELETE FROM graph_edges 
  WHERE source_id = NEW.id 
    AND source_type = 'task' 
    AND edge_type = 'linked';
  
  -- Insert edge for linked page
  IF NEW.linked_page_id IS NOT NULL THEN
    INSERT INTO graph_edges (user_id, workspace_id, source_id, source_type, target_id, target_type, edge_type)
    VALUES (NEW.user_id, NEW.workspace_id, NEW.id, 'task', NEW.linked_page_id, 'page', 'linked')
    ON CONFLICT DO NOTHING;
  END IF;
  
  -- Insert edge for linked skill
  IF NEW.linked_skill_id IS NOT NULL THEN
    INSERT INTO graph_edges (user_id, workspace_id, source_id, source_type, target_id, target_type, edge_type)
    VALUES (NEW.user_id, NEW.workspace_id, NEW.id, 'task', NEW.linked_skill_id, 'skill', 'linked')
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for task links
DROP TRIGGER IF EXISTS sync_task_links_trigger ON tasks;
CREATE TRIGGER sync_task_links_trigger
AFTER INSERT OR UPDATE OF linked_page_id, linked_skill_id ON tasks
FOR EACH ROW
EXECUTE FUNCTION sync_task_links_to_graph();

-- Verify the data
SELECT 
    edge_type,
    COUNT(*) as count
FROM graph_edges
GROUP BY edge_type
ORDER BY edge_type;

-- Show summary
SELECT 
    'Total Edges' as metric,
    COUNT(*) as count
FROM graph_edges
UNION ALL
SELECT 
    'Evidence Edges',
    COUNT(*)
FROM graph_edges
WHERE edge_type = 'evidence'
UNION ALL
SELECT 
    'Linked Edges',
    COUNT(*)
FROM graph_edges
WHERE edge_type = 'linked'
UNION ALL
SELECT 
    'Explicit Edges',
    COUNT(*)
FROM graph_edges
WHERE edge_type = 'explicit'
UNION ALL
SELECT 
    'Inferred Edges',
    COUNT(*)
FROM graph_edges
WHERE edge_type = 'inferred';

-- Show any invalid evidence items that were skipped
SELECT 
    s.id as skill_id,
    s.name as skill_name,
    evidence_item as invalid_evidence
FROM skills s,
     unnest(s.evidence) as evidence_item
WHERE s.evidence IS NOT NULL 
  AND array_length(s.evidence, 1) > 0
  -- Find items that are NOT valid UUIDs
  AND evidence_item !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
ORDER BY s.name;
