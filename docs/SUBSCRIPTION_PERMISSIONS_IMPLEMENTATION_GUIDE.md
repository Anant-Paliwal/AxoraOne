# Subscription & Permissions Implementation Guide

## 🚀 Quick Start

### Step 1: Run Database Migration
```bash
# Connect to your Supabase database and run:
psql -f fix-subscription-permissions.sql

# Or via Supabase dashboard:
# 1. Go to SQL Editor
# 2. Paste contents of fix-subscription-permissions.sql
# 3. Run query
```

This will:
- ✅ Add missing limits to subscription plans (max_skills, max_tasks)
- ✅ Create usage tracking triggers
- ✅ Initialize usage metrics for existing data
- ✅ Create subscription audit log table

### Step 2: Restart Backend
```bash
cd backend
# Backend changes are already applied to:
# - subscriptions.py (permission checks added)
# - skills.py (limit enforcement added)
# - tasks.py (limit enforcement added)

# Restart your backend server
python -m uvicorn app.main:app --reload
```

### Step 3: Test the Changes

#### Test 1: Subscription Permission Check
```bash
# Try to upgrade a workspace as a non-admin member
# Should return 403 Forbidden

curl -X POST "http://localhost:8000/api/subscriptions/upgrade?workspace_id=YOUR_WORKSPACE_ID" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"plan_name": "pro", "billing_cycle": "monthly"}'
```

#### Test 2: Skill Creation Limit
```bash
# Create skills until you hit the limit (10 for free plan)
# 11th skill should return 403 with limit_exceeded error

curl -X POST "http://localhost:8000/api/skills" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Skill", "workspace_id": "YOUR_WORKSPACE_ID"}'
```

#### Test 3: Usage Tracking
```sql
-- Check usage metrics are being tracked
SELECT 
    w.name as workspace_name,
    um.metric_type,
    um.count,
    sp.name as plan_name,
    (sp.features->>um.metric_type)::int as plan_limit
FROM usage_metrics um
JOIN workspaces w ON um.workspace_id = w.id
JOIN workspace_subscriptions ws ON um.workspace_id = ws.workspace_id
JOIN subscription_plans sp ON ws.plan_id = sp.id
WHERE um.period_end >= NOW()
ORDER BY w.name, um.metric_type;
```

---

## 📋 What Was Fixed

### Backend Security Fixes ✅

#### 1. Subscription Endpoints (subscriptions.py)
**Before**: Any user could upgrade/cancel any workspace
```python
# ❌ NO PERMISSION CHECK
@router.post("/upgrade")
async def upgrade_subscription(workspace_id: str, ...):
    service = SubscriptionService(supabase_admin)
    result = await service.upgrade_subscription(...)
```

**After**: Only admins can manage subscriptions
```python
# ✅ PERMISSION CHECK ADDED
@router.post("/upgrade")
async def upgrade_subscription(workspace_id: str, ...):
    await require_workspace_access(current_user, workspace_id, min_role="admin")
    service = SubscriptionService(supabase_admin)
    result = await service.upgrade_subscription(...)
```

#### 2. Skills Endpoint (skills.py)
**Before**: No subscription limit check
```python
# ❌ NO LIMIT CHECK
@router.post("")
async def create_skill(skill: SkillCreate, ...):
    if skill.workspace_id:
        access = await check_workspace_access(...)
        if not can_edit(access["role"]):
            raise HTTPException(...)
    # Create skill
```

**After**: Enforces max_skills limit
```python
# ✅ LIMIT CHECK ADDED
@router.post("")
async def create_skill(skill: SkillCreate, ...):
    if skill.workspace_id:
        access = await check_workspace_access(...)
        if not can_edit(access["role"]):
            raise HTTPException(...)
        
        # ✅ CHECK SUBSCRIPTION LIMIT
        subscription_service = SubscriptionService(supabase_admin)
        await subscription_service.enforce_limit(skill.workspace_id, "max_skills", 1)
    # Create skill
```

#### 3. Tasks Endpoint (tasks.py)
**Before**: No subscription limit check
**After**: Enforces max_tasks limit (same pattern as skills)

---

### Database Improvements ✅

#### 1. Subscription Plans Updated
```sql
-- Added missing limits
max_skills: 10 (free), 100 (pro), unlimited (enterprise)
max_tasks: 50 (free), 500 (pro), unlimited (enterprise)
```

#### 2. Usage Tracking Triggers
```sql
-- Auto-track when resources are created
trigger_track_skill_creation
trigger_track_task_creation
trigger_track_member_addition
trigger_track_member_removal
```

#### 3. Audit Log Created
```sql
-- Track all subscription changes
CREATE TABLE subscription_audit_log (
    workspace_id, user_id, action, old_plan, new_plan, ...
)
```

---

## 🎨 Frontend Integration

### Using Permission Hooks

```typescript
import { useWorkspacePermissions } from '@/hooks/useWorkspacePermissions';

function MyComponent() {
  const { canEdit, canAdmin, isOwner, getPermissionError } = useWorkspacePermissions();
  
  return (
    <div>
      {/* Show create button only to members/admins/owners */}
      {canEdit && (
        <Button onClick={handleCreate}>Create Page</Button>
      )}
      
      {/* Show settings only to admins/owners */}
      {canAdmin && (
        <Button onClick={handleSettings}>Settings</Button>
      )}
      
      {/* Show billing only to owners */}
      {isOwner && (
        <Button onClick={handleBilling}>Manage Subscription</Button>
      )}
      
      {/* Show error message for viewers */}
      {!canEdit && (
        <p className="text-muted-foreground">
          {getPermissionError('edit')}
        </p>
      )}
    </div>
  );
}
```

### Using Limit Warnings

```typescript
import { LimitWarning, LimitBadge } from '@/components/subscription/LimitWarning';

function PagesPage() {
  return (
    <div>
      {/* Show warning when approaching limit */}
      <LimitWarning 
        metric="max_pages" 
        metricLabel="pages"
        showProgress={true}
      />
      
      {/* Inline badge */}
      <div className="flex items-center gap-2">
        <h2>My Pages</h2>
        <LimitBadge metric="max_pages" />
      </div>
    </div>
  );
}
```

---

## 🔐 Permission Levels

### Role Hierarchy
```
viewer (1)  → Read-only access
   ↓
member (2)  → Can create/edit content
   ↓
admin (3)   → Can manage members + settings
   ↓
owner (4)   → Full control + subscription management
```

### Permission Matrix

| Action | Viewer | Member | Admin | Owner |
|--------|--------|--------|-------|-------|
| View content | ✅ | ✅ | ✅ | ✅ |
| Create pages/skills/tasks | ❌ | ✅ | ✅ | ✅ |
| Edit content | ❌ | ✅ | ✅ | ✅ |
| Delete content | ❌ | ✅ | ✅ | ✅ |
| Invite members | ❌ | ❌ | ✅ | ✅ |
| Remove members | ❌ | ❌ | ✅ | ✅ |
| Change member roles | ❌ | ❌ | ✅ | ✅ |
| Workspace settings | ❌ | ❌ | ✅ | ✅ |
| Upgrade subscription | ❌ | ❌ | ✅ | ✅ |
| Cancel subscription | ❌ | ❌ | ✅ | ✅ |
| Delete workspace | ❌ | ❌ | ❌ | ✅ |

---

## 📊 Subscription Limits

### Free Plan
- **Pages: Unlimited** ✨
- Skills: 10
- Tasks: 50
- AI Queries: 20/day
- Team Members: 1
- Workspaces: 1
- Storage: 100 MB

### Pro Plan ($19.99/month)
- **Pages: Unlimited** ✨
- Skills: 100
- Tasks: 500
- AI Queries: 500/day
- Team Members: 10
- Workspaces: 5
- Storage: 10 GB

### Enterprise Plan ($99.99/month)
- **Pages: Unlimited** ✨
- Everything else: Unlimited
- Custom integrations
- Priority support
- SLA guarantee

---

## 🧪 Testing Checklist

### Backend Tests
- [ ] Non-admin cannot upgrade subscription (403)
- [ ] Non-admin cannot cancel subscription (403)
- [ ] Non-member cannot view subscription (403)
- [ ] Creating skill beyond limit fails (403)
- [ ] Creating task beyond limit fails (403)
- [ ] Usage metrics increment correctly
- [ ] Triggers fire on resource creation
- [ ] Audit log records subscription changes

### Frontend Tests
- [ ] Viewer cannot see create buttons
- [ ] Member can see create buttons
- [ ] Admin can see settings
- [ ] Owner can see billing
- [ ] Limit warnings appear at 80%
- [ ] Limit errors appear at 100%
- [ ] Permission errors show correct messages

---

## 🚨 Known Issues & Next Steps

### Still Missing (Future Work)

#### 1. AI Query Limit Enforcement
**File**: `backend/app/api/endpoints/ai_chat.py`
```python
# TODO: Add this to AI query endpoints
subscription_service = SubscriptionService(supabase_admin)
await subscription_service.enforce_limit(workspace_id, "max_ai_queries_per_day", 1)
# After successful query
await subscription_service.increment_usage(workspace_id, "max_ai_queries_per_day", 1)
```

#### 2. Workspace Creation Limit
**File**: `backend/app/api/endpoints/workspaces.py`
```python
# TODO: Check max_workspaces per user
# Count user's workspaces and compare to plan limit
```

#### 3. Storage Limit Enforcement
**File**: `backend/app/api/endpoints/file_upload.py`
```python
# TODO: Track file sizes and enforce max_storage_mb
```

#### 4. Stripe Integration
**File**: `backend/app/api/endpoints/subscriptions.py`
```python
# TODO: Integrate Stripe for actual payments
# - Create Stripe customer
# - Create Stripe subscription
# - Handle webhooks
```

---

## 📞 Support

### If Something Breaks

1. **Check Backend Logs**
   ```bash
   # Look for subscription or permission errors
   tail -f backend/logs/app.log
   ```

2. **Verify Database Migration**
   ```sql
   -- Check triggers exist
   SELECT trigger_name FROM information_schema.triggers 
   WHERE trigger_name LIKE 'trigger_track_%';
   
   -- Check usage metrics populated
   SELECT * FROM usage_metrics LIMIT 10;
   ```

3. **Test Permission Checks**
   ```bash
   # Use curl or Postman to test endpoints
   # Check response codes: 403 = permission denied
   ```

### Rollback Plan

If you need to rollback:
```sql
-- Remove triggers
DROP TRIGGER IF EXISTS trigger_track_skill_creation ON skills;
DROP TRIGGER IF EXISTS trigger_track_task_creation ON tasks;
DROP TRIGGER IF EXISTS trigger_track_member_addition ON workspace_members;

-- Remove audit log
DROP TABLE IF EXISTS subscription_audit_log;
```

---

## ✅ Success Criteria

You'll know it's working when:
1. ✅ Non-admins get 403 when trying to upgrade subscriptions
2. ✅ Creating 11th skill on free plan fails with limit error
3. ✅ Usage metrics show correct counts in database
4. ✅ Audit log records subscription changes
5. ✅ Frontend shows/hides buttons based on role
6. ✅ Limit warnings appear when approaching limits

---

## 📚 Related Documentation

- [SUBSCRIPTION_WORKSPACE_PERMISSIONS_ANALYSIS.md](./SUBSCRIPTION_WORKSPACE_PERMISSIONS_ANALYSIS.md) - Full analysis
- [backend/app/services/subscription_service.py](./backend/app/services/subscription_service.py) - Service implementation
- [backend/app/api/helpers/workspace_access.py](./backend/app/api/helpers/workspace_access.py) - Permission helpers
- [src/hooks/useWorkspacePermissions.ts](./src/hooks/useWorkspacePermissions.ts) - Frontend hook
