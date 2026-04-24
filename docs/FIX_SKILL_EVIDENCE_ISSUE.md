# Fix Skill Evidence Trigger Issue

## Problem
When updating skills, getting this error:
```
ERROR: column "target_id" is of type uuid but expression is of type text
```

## Root Cause
The database trigger `sync_skill_evidence_to_graph()` is trying to insert text keywords (like "SQL", "Data Analysis") from the `evidence` array into the `graph_edges` table's `target_id` column, which expects UUIDs.

The `evidence` field in skills contains **text keywords**, not page IDs. The trigger should only insert items that are valid UUIDs (actual page IDs).

## Solution

### Option 1: Run SQL in Supabase Dashboard (RECOMMENDED)

1. Go to your Supabase dashboard: https://elwlchiiextcpkjnpyyt.supabase.co
2. Navigate to **SQL Editor**
3. Copy and paste the contents of `fix-skill-evidence-trigger.sql`
4. Click **Run**

### Option 2: Temporary Workaround - Disable the Trigger

If you need a quick fix right now, run this in Supabase SQL Editor:

```sql
-- Temporarily disable the trigger
DROP TRIGGER IF EXISTS sync_skill_evidence_trigger ON skills;
```

This will allow skill updates to work, but evidence won't be synced to the knowledge graph.

### Option 3: Fix the Trigger Properly

Run this complete fix in Supabase SQL Editor:

```sql
-- Drop the old trigger
DROP TRIGGER IF EXISTS sync_skill_evidence_trigger ON skills;
DROP FUNCTION IF EXISTS sync_skill_evidence_to_graph();

-- Create improved function with better UUID validation
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

-- Recreate the trigger
CREATE TRIGGER sync_skill_evidence_trigger
AFTER INSERT OR UPDATE OF evidence ON skills
FOR EACH ROW
EXECUTE FUNCTION sync_skill_evidence_to_graph();

-- Clean up any existing invalid edges
DELETE FROM graph_edges 
WHERE edge_type = 'evidence' 
  AND source_type = 'skill'
  AND target_id NOT IN (SELECT id FROM pages);
```

## What This Fix Does

1. **Drops the old trigger** that was causing issues
2. **Creates a new function** with:
   - Better UUID validation using case-insensitive regex
   - Exception handling to catch any casting errors
   - Only inserts evidence items that are valid UUIDs
3. **Recreates the trigger** to use the new function
4. **Cleans up** any invalid edges that were already created

## After Applying the Fix

Try updating your skill again:
1. Edit the "Data Analytics" skill
2. Change any field (name, level, description, keywords)
3. Click "Update Skill"
4. Should save successfully! ✅

## Understanding the Evidence Field

The `evidence` field in skills serves two purposes:
- **Text keywords**: Like "SQL", "Data Analysis", "Excel" (for search/categorization)
- **Page IDs**: UUIDs linking to actual pages (for knowledge graph)

The trigger now correctly distinguishes between these two types and only creates graph edges for valid page IDs.

## Alternative: Use skill_evidence Table

For a cleaner approach, consider using the `skill_evidence` table (which already exists) for linking pages to skills, and keep the `evidence` array purely for text keywords. This is already implemented in the UI with the "Add Page" button!

The `skill_evidence` table has its own trigger that properly handles page linking without this UUID issue.
