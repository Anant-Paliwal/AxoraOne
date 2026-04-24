# Fix RLS Infinite Recursion Error

## Problem
```
infinite recursion detected in policy for relation "workspace_members"
```

## Root Cause
The RLS policy for `workspace_members` was checking membership by querying `workspace_members` itself, creating an infinite loop:

```sql
-- BAD: This causes infinite recursion
CREATE POLICY "Users can view workspace members"
    ON workspace_members FOR SELECT
    USING (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members  -- ❌ Queries itself!
            WHERE user_id = auth.uid()
        )
    );
```

## Solution
Check workspace ownership via the `workspaces` table instead:

```sql
-- GOOD: No recursion
CREATE POLICY "Users can view workspace members"
    ON workspace_members FOR SELECT
    USING (
        user_id = auth.uid() OR workspace_id IN (
            SELECT w.id FROM workspaces w  -- ✅ Queries different table
            WHERE w.user_id = auth.uid()
        )
    );
```

## Quick Fix

### Run This SQL
In Supabase SQL Editor, run:
```bash
fix-rls-infinite-recursion.sql
```

This will:
1. ✅ Drop problematic policies
2. ✅ Create fixed policies without recursion
3. ✅ Fix workspace_members policies
4. ✅ Fix subscription table policies

### Verify Fix
```sql
-- Should return without error
SELECT * FROM workspace_members LIMIT 1;
SELECT * FROM workspace_subscriptions LIMIT 1;
```

## Test Subscription Page

### 1. Restart Backend (if needed)
```bash
cd backend
python main.py
```

### 2. Refresh Browser
Hard refresh: `Ctrl+Shift+R`

### 3. Navigate to Subscription Page
```
http://localhost:8080/subscription
```

Should now load successfully!

## What Changed

### Before (Infinite Recursion)
```sql
workspace_members → checks workspace_members → checks workspace_members → ∞
```

### After (No Recursion)
```sql
workspace_members → checks workspaces → done ✅
```

## Alternative: Disable RLS Temporarily

If you need a quick workaround for development:

```sql
-- DEVELOPMENT ONLY - NOT FOR PRODUCTION
ALTER TABLE workspace_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_subscriptions DISABLE ROW LEVEL SECURITY;
ALTER TABLE usage_metrics DISABLE ROW LEVEL SECURITY;
```

**Warning**: This removes all access control. Only use in local development!

## Verify Backend Logs

After fix, backend should show:
```
INFO: 127.0.0.1:50254 - "GET /api/v1/subscriptions/current?workspace_id=... HTTP/1.1" 200 OK
```

No more 500 errors!

## Summary
✅ Fixed infinite recursion in RLS policies
✅ Policies now check workspaces table instead of workspace_members
✅ Subscription endpoints will work correctly
✅ Run `fix-rls-infinite-recursion.sql` to apply fix
