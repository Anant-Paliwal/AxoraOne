-- Update graph_edges table to support new edge types
-- This migration adds 'evidence' and 'linked' edge types

-- Drop the old constraint
ALTER TABLE public.graph_edges 
DROP CONSTRAINT IF EXISTS graph_edges_edge_type_check;

-- Add new constraint with additional edge types
ALTER TABLE public.graph_edges 
ADD CONSTRAINT graph_edges_edge_type_check 
CHECK (edge_type = ANY (ARRAY['explicit'::text, 'inferred'::text, 'evidence'::text, 'linked'::text]));

-- Enable RLS if not already enabled
ALTER TABLE public.graph_edges ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own graph edges" ON public.graph_edges;
DROP POLICY IF EXISTS "Users can insert their own graph edges" ON public.graph_edges;
DROP POLICY IF EXISTS "Users can update their own graph edges" ON public.graph_edges;
DROP POLICY IF EXISTS "Users can delete their own graph edges" ON public.graph_edges;

-- Create RLS policies for graph_edges
CREATE POLICY "Users can view their own graph edges"
ON public.graph_edges
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own graph edges"
ON public.graph_edges
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own graph edges"
ON public.graph_edges
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own graph edges"
ON public.graph_edges
FOR DELETE
USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_graph_edges_source 
ON public.graph_edges (source_id, source_type);

CREATE INDEX IF NOT EXISTS idx_graph_edges_target 
ON public.graph_edges (target_id, target_type);

CREATE INDEX IF NOT EXISTS idx_graph_edges_edge_type 
ON public.graph_edges (edge_type);

-- Add comment
COMMENT ON TABLE public.graph_edges IS 'Stores explicit and inferred connections between pages, skills, and tasks for the knowledge graph visualization';
