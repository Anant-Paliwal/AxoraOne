# 🔧 Fix Intelligence System Errors

## Errors You're Seeing

1. ❌ `column "source_skill_id" does not exist`
2. ❌ `500 Internal Server Error` on `/intelligence/home`
3. ❌ `404 Not Found` on `/page-links` endpoints

---

## Solution: Run These Steps

### Step 1: Fix the Migration SQL ✅

The migration has been updated. Run this in Supabase SQL Editor:

```sql
-- Run the updated migration
run-intelligence-migration.sql
```

**OR** if you already ran it, just add the missing column:

```sql
-- Run this quick fix
fix-intelligence-tables.sql
```

This adds the `source_skill_id` column that was missing.

### Step 2: Verify Tables Were Created

Run this in Supabase SQL Editor:

```sql
-- Check if all intelligence tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'insights', 
    'proposed_actions', 
    'skill_memory', 
    'skill_executions', 
    'entity_signals', 
    'user_trust_levels'
  )
ORDER BY table_name;
```

**Expected Result:** Should show all 6 tables.

### Step 3: Restart Backend

```bash
cd backend
python -m uvicorn main:app --reload
```

**Expected Console Output:**
```
🧠 Skill Background Runner started - Skills are now autonomous agents
🧠 Living Intelligence OS activated - Skills are autonomous agents
```

### Step 4: Refresh Frontend

Hard refresh your browser:
- **Windows/Linux:** `Ctrl + Shift + R`
- **Mac:** `Cmd + Shift + R`

---

## What Was Fixed

### 1. Migration SQL Updated ✅

**Before:**
```sql
CREATE TABLE proposed_actions (
    ...
    source_skill_id UUID REFERENCES skills(id) ON DELETE SET NULL,
    ...
);
```

**After:**
```sql
CREATE TABLE proposed_actions (
    ...
);

-- Add column separately to handle existing tables
ALTER TABLE proposed_actions 
ADD COLUMN IF NOT EXISTS source_skill_id UUID REFERENCES skills(id) ON DELETE SET NULL;
```

This ensures the column is added even if the table already exists.

### 2. Backend Error Handling Improved ✅

The `/intelligence/home` endpoint now:
- ✅ Handles missing tables gracefully
- ✅ Returns empty arrays instead of crashing
- ✅ Logs detailed errors to console
- ✅ Continues working even if some tables don't exist yet

**Before:**
```python
insights = supabase_admin.table("insights").select("*")...
# Crashes if table doesn't exist
```

**After:**
```python
try:
    insights = supabase_admin.table("insights").select("*")...
    insights_data = insights.data or []
except Exception as insights_error:
    print(f"Insights table not ready: {insights_error}")
    insights_data = []
```

### 3. Frontend Error Handling Added ✅

The `IntelligenceDashboard` component now:
- ✅ Shows helpful message if migration not run
- ✅ Displays error toast with instructions
- ✅ Doesn't crash if API returns error

---

## Verify Everything Works

### Test 1: Check Backend Logs

After restarting backend, you should see:
```
🧠 Skill Background Runner started - Skills are now autonomous agents
🧠 Living Intelligence OS activated - Skills are autonomous agents
```

✅ If you see this, the background runner is working.

### Test 2: Check Intelligence Dashboard

1. Navigate to home page
2. Click "Intelligence" tab
3. Should see:
   - Quick stats (tasks, completed, overdue)
   - Empty sections (no data yet, but no errors)

✅ If you see the dashboard without errors, it's working.

### Test 3: Create a Page

```bash
POST http://localhost:8000/api/v1/pages
{
  "title": "Test Page",
  "content": "Test content",
  "workspace_id": "YOUR_WORKSPACE_ID"
}
```

Check backend console for:
```
Processing signal: PAGE_CREATED
```

✅ If you see this, signals are being emitted.

### Test 4: Check Proposed Actions

```bash
GET http://localhost:8000/api/v1/intelligence/actions/proposed?workspace_id=YOUR_WORKSPACE_ID
```

Should return `[]` (empty array) without errors.

✅ If you get a 200 response, the endpoint is working.

---

## About the 404 Errors

The 404 errors for `/page-links` are **not related to the intelligence system**. These are from a different feature (ConnectedItems component).

You can ignore these for now, or we can fix them separately if needed.

---

## Still Having Issues?

### Issue: Tables still don't exist

**Solution:** Run the full migration again:
```sql
-- In Supabase SQL Editor
run-intelligence-migration.sql
```

### Issue: Backend still shows errors

**Check:**
1. Is `supabase_admin` configured correctly in `backend/app/core/supabase.py`?
2. Does the service key have permission to create tables?
3. Are there any RLS policy conflicts?

**Debug:**
```bash
# Check backend logs for detailed error messages
cd backend
python -m uvicorn main:app --reload --log-level debug
```

### Issue: Frontend still shows 500 error

**Check:**
1. Did you restart the backend after running migration?
2. Did you hard refresh the browser?
3. Check browser console for detailed error messages

**Debug:**
Open browser DevTools → Network tab → Click on failed request → Check response

---

## Summary

✅ **Migration SQL fixed** - Adds `source_skill_id` column properly  
✅ **Backend error handling improved** - Gracefully handles missing tables  
✅ **Frontend error handling added** - Shows helpful messages  
✅ **Quick fix SQL created** - `fix-intelligence-tables.sql` for existing tables  

**Next Step:** Run the migration and restart the backend! 🚀
