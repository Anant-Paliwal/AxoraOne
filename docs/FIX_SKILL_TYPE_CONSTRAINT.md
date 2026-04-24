# Fix Skill Type Constraint Error

## Problem

When trying to update or create skills with categories like "execution", "planning", "decision", or "startup", you get this error:

```
new row for relation "skills" violates check constraint "skills_skill_type_check"
```

## Root Cause

The `skills` table has a CHECK constraint on the `skill_type` column that only allows these values:
- `learning`
- `research`
- `creation`
- `analysis`
- `practice`

But the Intelligence OS uses these additional categories:
- `planning`
- `execution`
- `decision`
- `startup`

## Solution

Run the SQL migration to update the constraint:

```bash
# Using psql
psql -h <host> -U <user> -d <database> -f fix-skill-type-constraint.sql

# Or using Supabase SQL Editor
# Copy and paste the contents of fix-skill-type-constraint.sql
```

## What the Fix Does

1. **Drops old constraint** - Removes the restrictive constraint
2. **Adds new constraint** - Allows all 9 categories:
   - Original: learning, research, creation, analysis, practice
   - New: planning, execution, decision, startup
3. **Updates category constraint** - Ensures both columns accept the same values
4. **Verifies** - Shows the updated constraints

## After Running

You should be able to:
- ✅ Create skills with any category
- ✅ Update skills to use new categories
- ✅ Install marketplace skills (which use all categories)
- ✅ Edit existing skills without errors

## Verification

After running the migration, test by:

1. **Create a skill with "execution" category**
2. **Update an existing skill to "planning"**
3. **Install a marketplace skill**

All should work without constraint errors.

## Alternative: Manual Fix via Supabase Dashboard

1. Go to Supabase Dashboard
2. Navigate to SQL Editor
3. Run this query:

```sql
ALTER TABLE public.skills DROP CONSTRAINT IF EXISTS skills_skill_type_check;
ALTER TABLE public.skills ADD CONSTRAINT skills_skill_type_check 
CHECK (skill_type IN ('learning', 'research', 'creation', 'analysis', 'practice', 'planning', 'execution', 'decision', 'startup'));
```

## Why This Happened

The original skill system only had 5 categories. When we added the Intelligence OS with 4 new categories, the database constraint wasn't updated to match.

## Prevention

When adding new skill categories in the future:
1. Update the database constraint first
2. Then add the category to the code
3. Test with a sample skill before rolling out

---

**Run this fix now to enable all Intelligence OS categories!**
