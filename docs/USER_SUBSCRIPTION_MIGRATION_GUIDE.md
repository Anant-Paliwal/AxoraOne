# User-Based Subscription Migration Guide

## 🎯 What's Changing

### Before (Workspace-Based)
- ❌ Each workspace has its own subscription
- ❌ User with 3 workspaces = 3 separate subscriptions
- ❌ Limits are per workspace
- ❌ Confusing for users

### After (User-Based) ✅
- ✅ One subscription per user (tied to email/user_id)
- ✅ Subscription applies to ALL user's workspaces
- ✅ Limits are GLOBAL across all workspaces
- ✅ Simple and clear

---

## 📊 New Limit Structure

### Free Plan (Per User)
| Resource | Limit | Scope |
|----------|-------|-------|
| **Workspaces** | **5** | **Global** - Can create 5 workspaces total |
| **Team Members** | **5 total** | **Global** - 5 members across ALL workspaces |
| Pages | Unlimited | Per workspace |
| Skills | 50 | Per workspace |
| Tasks | 100 | Per workspace |
| AI Queries | 20/day | Global |
| Storage | 100 MB | Global |

### Pro Plan (Per User) - $19.99/month
| Resource | Limit | Scope |
|----------|-------|-------|
| **Workspaces** | **20** | **Global** |
| **Team Members** | **50 total** | **Global** |
| Pages | Unlimited | Per workspace |
| Skills | 200 | Per workspace |
| Tasks | 500 | Per workspace |
| AI Queries | 500/day | Global |
| Storage | 10 GB | Global |

### Enterprise Plan (Per User) - $99.99/month
| Resource | Limit | Scope |
|----------|-------|-------|
| Everything | Unlimited | All |

---

## 🚀 Migration Steps

### Step 1: Run Database Migration
```bash
psql -f migrate-to-user-subscriptions.sql
```

This will:
1. ✅ Create `user_subscriptions` table
2. ✅ Create `user_usage_metrics` table
3. ✅ Update subscription plans with user-level limits
4. ✅ Migrate existing workspace subscriptions to user subscriptions
5. ✅ Create user-level tracking functions
6. ✅ Initialize usage metrics

### Step 2: Update Backend Routes
The backend needs to use the new `UserSubscriptionService` instead of `SubscriptionService`.

**File**: `backend/app/api/endpoints/subscriptions.py`

Replace imports:
```python
# OLD
from app.services.subscription_service import SubscriptionService

# NEW
from app.services.user_subscription_service import UserSubscriptionService
```

Update endpoints to use `user_id` instead of `workspace_id`:
```python
# OLD
@router.get("/current")
async def get_current_subscription(
    workspace_id: str,
    current_user: str = Depends(get_current_user)
):
    service = SubscriptionService(supabase_admin)
    return await service.get_subscription_status(workspace_id)

# NEW
@router.get("/current")
async def get_current_subscription(
    current_user: str = Depends(get_current_user)
):
    service = UserSubscriptionService(supabase_admin)
    return await service.get_subscription_status(current_user)
```

### Step 3: Update Workspace Creation Endpoint
**File**: `backend/app/api/endpoints/workspaces.py`

Add limit check before creating workspace:
```python
from app.services.user_subscription_service import UserSubscriptionService

@router.post("")
async def create_workspace(
    workspace: WorkspaceCreate,
    user_id: str = Depends(get_current_user)
):
    # ✅ CHECK USER-LEVEL WORKSPACE LIMIT
    subscription_service = UserSubscriptionService(supabase_admin)
    await subscription_service.enforce_user_limit(user_id, "max_workspaces", 1)
    
    # Create workspace...
```

### Step 4: Update Frontend
**File**: `src/hooks/useSubscription.ts`

Remove workspace_id dependency:
```typescript
// OLD
const loadSubscription = async () => {
  if (!currentWorkspace) return;
  const data = await api.getCurrentSubscription(currentWorkspace.id);
  setSubscription(data);
};

// NEW
const loadSubscription = async () => {
  const data = await api.getCurrentSubscription(); // No workspace_id needed
  setSubscription(data);
};
```

**File**: `src/lib/api.ts`

Update API calls:
```typescript
// OLD
getCurrentSubscription: async (workspaceId: string) => {
  return await apiRequest(`/subscriptions/current?workspace_id=${workspaceId}`);
},

// NEW
getCurrentSubscription: async () => {
  return await apiRequest(`/subscriptions/current`);
},
```

---

## 🧪 Testing

### Test 1: Workspace Creation Limit
```bash
# Create 6 workspaces as free user
# 6th workspace should fail with limit_exceeded error

for i in {1..6}; do
  curl -X POST "http://localhost:8000/api/v1/workspaces" \
    -H "Authorization: Bearer YOUR_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"name\": \"Workspace $i\", \"description\": \"Test\"}"
done
```

Expected: First 5 succeed, 6th fails with:
```json
{
  "error": "limit_exceeded",
  "message": "You've reached your plan limit for max_workspaces",
  "current": 5,
  "limit": 5,
  "upgrade_required": true
}
```

### Test 2: Team Member Limit (Global)
```bash
# Invite 6 members across different workspaces
# 6th invite should fail

# Workspace 1: Invite 3 members
# Workspace 2: Invite 2 members
# Workspace 3: Invite 1 member (should fail - total would be 6)
```

### Test 3: Subscription Status
```sql
-- Check user subscription
SELECT 
    u.email,
    sp.name as plan_name,
    (sp.features->>'max_workspaces')::int as max_workspaces,
    (sp.features->>'max_team_members_total')::int as max_team_members
FROM user_subscriptions us
JOIN subscription_plans sp ON us.plan_id = sp.id
JOIN auth.users u ON us.user_id = u.id
WHERE u.email = 'your@email.com';
```

### Test 4: Usage Metrics
```sql
-- Check user usage
SELECT 
    u.email,
    uum.metric_type,
    uum.count,
    (sp.features->>uum.metric_type)::int as limit
FROM user_usage_metrics uum
JOIN user_subscriptions us ON uum.user_id = us.user_id
JOIN subscription_plans sp ON us.plan_id = sp.id
JOIN auth.users u ON uum.user_id = u.id
WHERE u.email = 'your@email.com';
```

---

## 📝 Key Differences

### Workspace Limits (Per Workspace)
These limits apply to EACH workspace individually:
- Pages (unlimited)
- Skills (50 free, 200 pro)
- Tasks (100 free, 500 pro)

### User Limits (Global)
These limits apply ACROSS ALL user's workspaces:
- Workspaces (5 free, 20 pro)
- Team Members Total (5 free, 50 pro)
- AI Queries per day (20 free, 500 pro)
- Storage (100MB free, 10GB pro)

---

## 🎨 UI Changes

### Settings Page
**Before**: Shows workspace subscription
**After**: Shows user subscription (same for all workspaces)

```typescript
// Settings page now shows user-level subscription
<div>
  <h2>Your Plan</h2>
  <p>Free Plan</p>
  <p>5 workspaces, 5 team members total</p>
  <Button>Upgrade to Pro</Button>
</div>
```

### Workspace Creation
**Before**: No limit check
**After**: Shows remaining workspaces

```typescript
<div>
  <h2>Create Workspace</h2>
  <p>You have {5 - currentCount} workspaces remaining</p>
  {currentCount >= 5 && (
    <Alert>
      You've reached your workspace limit. Upgrade to create more.
    </Alert>
  )}
</div>
```

---

## 🔄 Migration Behavior

### Existing Users
- If user has multiple workspaces with different plans, they get the HIGHEST plan
- Example: User has 2 workspaces (1 free, 1 pro) → User gets Pro plan
- All workspace subscriptions are consolidated into one user subscription

### New Users
- Automatically get Free plan on signup
- Can create up to 5 workspaces
- Can invite up to 5 team members total

---

## ✅ Verification Checklist

After migration:
- [ ] User subscriptions table populated
- [ ] User usage metrics initialized
- [ ] Workspace creation enforces limit
- [ ] Team member invites count globally
- [ ] Settings page shows user plan
- [ ] Upgrade flow works
- [ ] Free users limited to 5 workspaces
- [ ] Pro users limited to 20 workspaces
- [ ] Enterprise users have unlimited

---

## 🚨 Rollback Plan

If you need to rollback:

```sql
-- Drop user subscription tables
DROP TABLE IF EXISTS user_usage_metrics CASCADE;
DROP TABLE IF EXISTS user_subscriptions CASCADE;

-- Drop user functions
DROP FUNCTION IF EXISTS get_user_subscription(UUID);
DROP FUNCTION IF EXISTS check_user_limit(UUID, TEXT, INTEGER);
DROP FUNCTION IF EXISTS increment_user_usage(UUID, TEXT, INTEGER);
DROP FUNCTION IF EXISTS track_user_workspace_creation();

-- Workspace subscriptions will still work
```

---

## 📞 Support

### Common Issues

**Issue**: "User can't create 6th workspace"
**Solution**: This is correct! Free plan allows 5 workspaces. Upgrade to Pro for 20.

**Issue**: "Team member limit reached at 5"
**Solution**: This is global across all workspaces. Upgrade to Pro for 50 total.

**Issue**: "Settings shows different plan in different workspaces"
**Solution**: After migration, all workspaces show the same user plan.

---

## 🎉 Benefits

1. **Simpler for Users**: One subscription, applies everywhere
2. **Easier Billing**: One charge per user, not per workspace
3. **Clear Limits**: Users know exactly what they get
4. **Better UX**: No confusion about which workspace has which plan
5. **Scalable**: Easy to add new user-level features

---

## Summary

✅ **Subscription is now per-user (email/user_id)**
✅ **One plan applies to all user's workspaces**
✅ **Global limits: 5 workspaces, 5 team members (free)**
✅ **Per-workspace limits: skills, tasks, pages**
✅ **Settings page shows user plan globally**

Your subscription system is now user-centric and much easier to understand! 🚀
