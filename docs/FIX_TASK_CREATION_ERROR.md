# Fix Task Creation 500 Error

## Problem
Getting a 500 Internal Server Error when trying to create tasks:
```
POST http://localhost:8000/api/v1/tasks 500 (Internal Server Error)
```

## Root Cause
The database `tasks` table is missing the new columns that the backend is trying to insert:
- `description` (TEXT)
- `is_recurring` (BOOLEAN)
- `workspace_id` (UUID) - might also be missing

## Solution

### Step 1: Apply Database Migration

You need to run the SQL migration in `add-task-fields.sql` on your Supabase database.

**Option A: Using Supabase Dashboard (Recommended)**
1. Go to your Supabase Dashboard
2. Navigate to the SQL Editor
3. Copy the contents of `add-task-fields.sql`
4. Paste and run the SQL

**Option B: Using Supabase CLI**
```bash
supabase db execute -f add-task-fields.sql
```

### Step 2: Restart Backend Server

After applying the migration, restart your backend:

```bash
# Stop the current backend (Ctrl+C)
# Then restart:
cd backend
python -m uvicorn main:app --reload
```

### Step 3: Test Task Creation

1. Refresh your browser
2. Go to Tasks page
3. Click "Add Task"
4. Fill in the form
5. Click "Create Task"
6. Task should now save successfully!

## What the Migration Does

```sql
-- Adds description column
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS description TEXT;

-- Adds is_recurring column
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT FALSE;

-- Adds workspace_id column (if missing)
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;

-- Updates RLS policy for workspace isolation
DROP POLICY IF EXISTS "Users can manage their own tasks" ON public.tasks;
CREATE POLICY "Users can manage their own tasks" ON public.tasks
  FOR ALL USING (
    auth.uid() = user_id 
    AND (
      workspace_id IS NULL 
      OR workspace_id IN (
        SELECT id FROM public.workspaces WHERE user_id = auth.uid()
      )
    )
  );
```

## Verification

After applying the migration, you can verify the columns exist:

**In Supabase Dashboard:**
1. Go to Table Editor
2. Select `tasks` table
3. Check that these columns exist:
   - `description` (text, nullable)
   - `is_recurring` (bool, default: false)
   - `workspace_id` (uuid, nullable, foreign key to workspaces)

**Or run this SQL:**
```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'tasks'
ORDER BY ordinal_position;
```

## Expected Result

After migration:
✅ Tasks can be created with description
✅ Tasks can be marked as recurring
✅ Tasks are properly isolated by workspace
✅ No more 500 errors
✅ Tasks save and display correctly

## Troubleshooting

If you still get errors after migration:

1. **Check backend logs** - Look for specific error messages
2. **Verify migration ran** - Check if columns exist in database
3. **Restart backend** - Make sure backend picked up the changes
4. **Clear browser cache** - Hard refresh (Ctrl+Shift+R)
5. **Check console** - Look for any frontend errors

## Quick Command Reference

```bash
# Apply migration (Supabase CLI)
supabase db execute -f add-task-fields.sql

# Restart backend
cd backend
python -m uvicorn main:app --reload

# Or if using the batch file
cd backend
python main.py
```
