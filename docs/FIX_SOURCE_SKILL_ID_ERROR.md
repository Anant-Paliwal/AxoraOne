# Fix: source_skill_id Column Missing Error

## Problem
Error: `column "source_skill_id" does not exist`

This occurs when the intelligence system tries to track which skill agent proposed an action, but the database column hasn't been created yet.

## Solution

Run this SQL migration in your Supabase SQL Editor:

```bash
# Option 1: Run the dedicated fix
psql -f fix-source-skill-id-column.sql

# Option 2: Run the full intelligence migration (includes this fix)
psql -f run-intelligence-migration.sql
```

## What This Does

1. Adds `source_skill_id` column to `proposed_actions` table
2. Creates a foreign key reference to the `skills` table
3. Creates an index for better query performance
4. Verifies the column was added successfully

## Files Affected

- `backend/app/services/skill_agent.py` - Creates proposed actions with source_skill_id
- `backend/app/api/endpoints/intelligence.py` - Reads source_skill_id for skill learning

## After Running

1. Restart your backend server
2. Test by having a skill agent propose an action
3. Verify the action is tracked with the correct skill ID

## Verification

Check if the column exists:
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'proposed_actions' 
  AND column_name = 'source_skill_id';
```

Should return:
```
column_name      | data_type
-----------------+-----------
source_skill_id  | uuid
```

## Quick Fix Command

If you're in a hurry, run this single command in Supabase SQL Editor:

```sql
ALTER TABLE proposed_actions 
ADD COLUMN IF NOT EXISTS source_skill_id UUID REFERENCES skills(id) ON DELETE SET NULL;
```

Done! The error should be resolved.
