# ⚡ Quick Fix - Run This Now

## The Error You Got

```
Error: Failed to run sql query: ERROR: 42703: column "source_skill_id" does not exist
```

This means the `proposed_actions` table exists but is missing the `source_skill_id` column.

## The Solution

I've created a **safer migration** that handles existing tables properly.

### Step 1: Use the Safe Migration

Instead of `RUN_THIS_SKILL_INTELLIGENCE_SETUP.sql`, use:

**File:** `FIX_SKILL_TABLES_SAFE.sql`

### Step 2: Run in Supabase

1. Open Supabase SQL Editor
2. Copy ALL content from `FIX_SKILL_TABLES_SAFE.sql`
3. Paste and click **Run**

### What's Different?

The safe version:
- ✅ Checks if columns exist before adding them
- ✅ Checks if tables exist before creating them
- ✅ Uses `IF NOT EXISTS` everywhere
- ✅ Handles the `proposed_actions` table properly
- ✅ Won't fail if run multiple times

### What It Does

1. **Adds missing column** to `proposed_actions`:
   - `source_skill_id` (links actions to skills)

2. **Creates 3 new tables**:
   - `skill_memory` (agent learning)
   - `skill_contributions` (impact tracking)
   - `skill_chains` (skill relationships)

3. **Adds columns** to `skills` table:
   - `activation_count`
   - `last_activated_at`
   - `confidence_score`
   - `success_rate`
   - `is_bottleneck`

4. **Sets up automation**:
   - Auto-creates memory on skill creation
   - Auto-tracks activations
   - RLS policies for security

### Verification

After running, you'll see:

```
table_name            | record_count
---------------------|-------------
skill_memory         | 0
skill_contributions  | 0
skill_chains         | 0
```

And:

```
column_name          | data_type
--------------------|----------
activation_count    | integer
confidence_score    | numeric
is_bottleneck       | boolean
last_activated_at   | timestamp
success_rate        | numeric
```

Both results confirm success!

### After Running

1. ✅ Restart your backend
2. ✅ Test creating a skill
3. ✅ Check progress tracking works
4. ✅ Try linking pages to skills

## Why This Happened

Your database had some intelligence tables already created (like `proposed_actions`), but they were incomplete. The safe migration handles this by:

- Checking what exists
- Only adding what's missing
- Never failing on duplicates

## Next Steps

After the migration succeeds:

```bash
# Restart backend
cd backend
python main.py
```

Then test in the UI:
1. Create a skill
2. Link a page to it
3. Check the progress shows > 0%

That's it! The skill intelligence system will now work properly. 🎉
