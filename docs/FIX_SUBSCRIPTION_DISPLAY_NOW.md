# Fix Subscription Display - Quick Steps

## Problem
The subscription page shows workspace-level data instead of user-level data.

## Solution
I've updated the backend and frontend code. Now you need to:

### Step 1: Run Database Migration
```bash
# This creates user_subscriptions table and migrates data
psql -f migrate-to-user-subscriptions.sql
```

Or via Supabase SQL Editor - paste and run the contents of `migrate-to-user-subscriptions.sql`

### Step 2: Restart Backend
```bash
cd backend
# The code changes are already saved, just restart
python -m uvicorn app.main:app --reload
```

### Step 3: Refresh Frontend
```bash
# Clear browser cache or hard refresh
Ctrl + Shift + R (Windows/Linux)
Cmd + Shift + R (Mac)
```

---

## What Changed

### Backend (`backend/app/api/endpoints/subscriptions.py`)
✅ Changed from `SubscriptionService` to `UserSubscriptionService`
✅ Removed `workspace_id` parameter from all endpoints
✅ Now uses `current_user` (user_id) instead

**Before**:
```python
@router.get("/current")
async def get_current_subscription(workspace_id: str, ...):
    service = SubscriptionService(supabase_admin)
    return await service.get_subscription_status(workspace_id)
```

**After**:
```python
@router.get("/current")
async def get_current_subscription(current_user: str = Depends(get_current_user)):
    service = UserSubscriptionService(supabase_admin)
    return await service.get_subscription_status(current_user)
```

### Frontend (`src/lib/api.ts`)
✅ Removed `workspaceId` parameter from subscription methods

**Before**:
```typescript
async getCurrentSubscription(workspaceId: string) {
  const response = await fetch(`${API_BASE_URL}/subscriptions/current?workspace_id=${workspaceId}`, ...);
}
```

**After**:
```typescript
async getCurrentSubscription() {
  const response = await fetch(`${API_BASE_URL}/subscriptions/current`, ...);
}
```

### Frontend (`src/pages/SubscriptionPage.tsx`)
✅ Removed workspace dependency
✅ Calls API without workspace_id

**Before**:
```typescript
const statusRes = await api.getCurrentSubscription(currentWorkspace.id);
```

**After**:
```typescript
const statusRes = await api.getCurrentSubscription();
```

### Frontend (`src/hooks/useSubscription.ts`)
✅ Removed workspace dependency
✅ Loads subscription on mount, not on workspace change

---

## Expected Result

After completing the steps, the subscription page will show:

### Current Plan Section
```
Current Plan
Free (active)
Billed Monthly

Usage This Period:
- Workspaces: 0 / 5
- Team Members Total: 0 / 5
- Pages: 0 / ∞
- Skills: 2 / 50
- Tasks: 4 / 100
- Storage MB: 0 / 100
- AI Queries per day: 40 / 20
```

### Key Differences
- ✅ **Workspaces**: Shows global count (how many workspaces user created)
- ✅ **Team Members Total**: Shows global count (across all workspaces)
- ✅ **Same plan** shown in all workspaces
- ✅ **Settings page** shows same subscription everywhere

---

## Verification

### Test 1: Check User Subscription
```sql
SELECT 
    u.email,
    sp.name as plan_name,
    us.status,
    (sp.features->>'max_workspaces')::int as max_workspaces,
    (sp.features->>'max_team_members_total')::int as max_team_members
FROM user_subscriptions us
JOIN subscription_plans sp ON us.plan_id = sp.id
JOIN auth.users u ON us.user_id = u.id
WHERE u.email = 'your@email.com';
```

Expected output:
```
email              | plan_name | status | max_workspaces | max_team_members
-------------------|-----------|--------|----------------|------------------
your@email.com     | free      | active | 5              | 5
```

### Test 2: Check User Usage
```sql
SELECT 
    u.email,
    uum.metric_type,
    uum.count
FROM user_usage_metrics uum
JOIN auth.users u ON uum.user_id = u.id
WHERE u.email = 'your@email.com'
AND uum.period_end >= NOW();
```

Expected output:
```
email              | metric_type              | count
-------------------|--------------------------|-------
your@email.com     | max_workspaces           | 3
your@email.com     | max_team_members_total   | 2
```

### Test 3: API Response
```bash
# Call the API directly
curl -X GET "http://localhost:8000/api/v1/subscriptions/current" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Expected response:
```json
{
  "subscription": {
    "user_id": "...",
    "plan_id": "...",
    "status": "active"
  },
  "plan": {
    "name": "free",
    "display_name": "Free",
    "features": {
      "max_workspaces": 5,
      "max_team_members_total": 5,
      "max_pages": -1,
      ...
    }
  },
  "usage": {
    "max_workspaces": {
      "current": 3,
      "limit": 5,
      "percentage": 60
    },
    "max_team_members_total": {
      "current": 2,
      "limit": 5,
      "percentage": 40
    }
  }
}
```

---

## Troubleshooting

### Issue: "Function increment_user_usage does not exist"
**Solution**: Run `fix-workspace-creation-error.sql` first, then run `migrate-to-user-subscriptions.sql`

### Issue: Still showing workspace-level data
**Solution**: 
1. Clear browser cache (Ctrl+Shift+R)
2. Check backend logs - make sure it's using `UserSubscriptionService`
3. Verify migration ran successfully

### Issue: "user_subscriptions table does not exist"
**Solution**: Run the migration: `psql -f migrate-to-user-subscriptions.sql`

### Issue: Subscription page shows "Loading..." forever
**Solution**: 
1. Check browser console for errors
2. Check backend logs
3. Verify API endpoint is accessible: `curl http://localhost:8000/api/v1/subscriptions/current`

---

## Summary

✅ **Backend updated** - Uses `UserSubscriptionService`
✅ **Frontend updated** - Removes workspace_id from calls
✅ **Migration ready** - Run `migrate-to-user-subscriptions.sql`
✅ **User-level limits** - 5 workspaces, 5 team members (free)
✅ **Global tracking** - Counts across all user's workspaces

After running the migration and restarting, your subscription page will show the correct user-level data! 🎉
