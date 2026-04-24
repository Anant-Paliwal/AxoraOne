-- Fix the skill evidence trigger to properly handle text keywords vs UUID page IDs
-- This ensures only valid UUIDs are inserted into graph_edges

-- Drop the old trigger if it exists
DROP TRIGGER IF EXISTS sync_skill_evidence_trigger ON skills;
DROP FUNCTION IF EXISTS sync_skill_evidence_to_graph();

-- Create improved function that validates UUIDs before inserting
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
      -- Check if it's a valid UUID format (case insensitive)
      IF evidence_item ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        BEGIN
          -- Try to insert, catch any errors
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
        EXCEPTION
          WHEN OTHERS THEN
            -- Silently ignore invalid UUIDs or other errors
            NULL;
        END;
      END IF;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for skill evidence (only fires on INSERT or UPDATE of evidence column)
CREATE TRIGGER sync_skill_evidence_trigger
AFTER INSERT OR UPDATE OF evidence ON skills
FOR EACH ROW
EXECUTE FUNCTION sync_skill_evidence_to_graph();

-- Clean up any existing invalid edges (where target_id doesn't match a real page)
DELETE FROM graph_edges 
WHERE edge_type = 'evidence' 
  AND source_type = 'skill'
  AND target_id NOT IN (SELECT id FROM pages);

COMMIT;
