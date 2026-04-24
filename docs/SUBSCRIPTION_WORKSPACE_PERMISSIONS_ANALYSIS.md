# Subscription & Workspace Permissions System Analysis

## Current Implementation Status

### ✅ What's Working

#### 1. Subscription System (Backend)
- **Database Schema**: Complete subscription tables exist
  - `subscription_plans` - Plan definitions with features/limits
  - `workspace_subscriptions` - Active subscriptions per workspace
  - `usage_metrics` - Usage tracking per workspace
  - `billing_history` - Payment records

- **Service Layer**: `SubscriptionService` fully implemented
  - Plan management (get plans, assign free plan)
  - Subscription CRUD (get, upgrade, cancel)
  - Feature gating (`check_feature_access`)
  - Limit enforcement (`check_limit`, `enforce_limit`)
  - Usage tracking (`increment_usage`, `get_current_usage`)

- **API Endpoints**: `/api/subscriptions/*` routes exist
  - `GET /plans` - List all plans
  - `GET /current` - Get workspace subscription
  - `POST /upgrade` - Upgrade plan
  - `POST /cancel` - Cancel subscription
  - `GET /usage` - Get usage metrics
  - `GET /check-feature/{feature}` - Check feature access
  - `GET /check-limit/{metric}` - Check usage limits

#### 2. Workspace Permission System
- **Role Hierarchy**: Defined in `workspace_access.py`
  - `viewer` (level 1) - Read-only access
  - `member` (level 2) - Can edit content
  - `admin` (level 3) - Can manage members
  - `owner` (level 4) - Full control

- **Helper Functions**:
  - `check_workspace_access()` - Verify user access
  - `require_workspace_access()` - Enforce minimum role
  - `can_edit()` - Check edit permissions
  - `can_admin()` - Check admin permissions

- **Applied To**:
  - Pages creation/editing
  - Skills creation/editing
  - Tasks creation/editing
  - Graph edges creation
  - Block databases

#### 3. Frontend Hooks
- `useSubscription()` - Load and check subscription status
- `useWorkspace()` - Workspace context with member role

---

## ❌ What's Missing / Broken

### 1. Subscription Enforcement Gaps

#### Problem: Subscription limits NOT enforced on most endpoints
**Current State**: Pages are UNLIMITED for all plans (no limit check needed)

**Missing From**:
- ❌ Skills creation (no `max_skills` check)
- ❌ Tasks creation (no `max_tasks` check)
- ❌ AI queries (no `max_ai_queries_per_day` check)
- ❌ Team member invites (no `max_team_members` check)
- ❌ Workspace creation (no `max_workspaces` check)
- ❌ File uploads (no `max_storage_mb` check)

**Note**: Pages are intentionally unlimited for all plans

#### Problem: Usage tracking incomplete
**Current State**: Pages are unlimited (no tracking needed)

**Missing Tracking**:
- ❌ AI query usage
- ❌ Storage usage
- ❌ Team member count (now tracked via trigger)
- ❌ Workspace count per user

---

### 2. Permission System Gaps

#### Problem: Subscription management has NO permission checks
**File**: `backend/app/api/endpoints/subscriptions.py`
```python
@router.post("/upgrade")
async def upgrade_subscription(
    workspace_id: str,
    request: UpgradeRequest,
    current_user: str = Depends(get_current_user)
):
    # TODO: Add workspace admin check  ⚠️ CRITICAL SECURITY ISSUE
    service = SubscriptionService(supabase_admin)
    result = await service.upgrade_subscription(...)
```

**Security Risk**: ANY authenticated user can upgrade ANY workspace's subscription!

#### Problem: Inconsistent permission checks
- Some endpoints check `can_edit()`
- Some check role directly
- Some have no checks at all

---

### 3. Frontend Integration Gaps

#### Problem: No subscription limit UI warnings
**Current State**: `UpgradePrompt` component exists but not used
**Missing**:
- No warnings before hitting limits
- No usage progress bars
- No "X of Y remaining" indicators

#### Problem: No permission-based UI hiding
**Current State**: Buttons/actions visible to all users
**Missing**:
- Hide "Create" buttons for viewers
- Hide "Delete" buttons for non-admins
- Hide "Settings" for non-owners

---

## 🔧 Implementation Plan

### Phase 1: Fix Critical Security Issues (HIGH PRIORITY)

#### 1.1 Add Permission Checks to Subscription Endpoints
```python
# backend/app/api/endpoints/subscriptions.py

@router.post("/upgrade")
async def upgrade_subscription(
    workspace_id: str,
    request: UpgradeRequest,
    current_user: str = Depends(get_current_user)
):
    # ✅ ADD THIS
    from app.api.helpers.workspace_access import require_workspace_access
    await require_workspace_access(current_user, workspace_id, min_role="admin")
    
    service = SubscriptionService(supabase_admin)
    result = await service.upgrade_subscription(...)
```

**Apply to**:
- `/upgrade` - Require admin
- `/cancel` - Require admin
- `/current` - Require member (any role)
- `/usage` - Require member (any role)

---

### Phase 2: Enforce Subscription Limits

#### 2.1 Add Limit Checks to All Creation Endpoints

**Skills Endpoint** (`backend/app/api/endpoints/skills.py`):
```python
@router.post("/")
async def create_skill(...):
    if skill.workspace_id:
        # Existing permission check
        access = await check_workspace_access(user_id, skill.workspace_id)
        if not can_edit(access["role"]):
            raise HTTPException(...)
        
        # ✅ ADD SUBSCRIPTION CHECK
        subscription_service = SubscriptionService(supabase_admin)
        await subscription_service.enforce_limit(skill.workspace_id, "max_skills", 1)
```

**Tasks Endpoint** (`backend/app/api/endpoints/tasks.py`):
```python
@router.post("/")
async def create_task(...):
    if task.workspace_id:
        # ✅ ADD SUBSCRIPTION CHECK
        subscription_service = SubscriptionService(supabase_admin)
        await subscription_service.enforce_limit(task.workspace_id, "max_tasks", 1)
```

**AI Chat Endpoint** (`backend/app/api/endpoints/ai_chat.py`):
```python
@router.post("/query")
async def ai_query(...):
    # ✅ ADD SUBSCRIPTION CHECK
    subscription_service = SubscriptionService(supabase_admin)
    await subscription_service.enforce_limit(workspace_id, "max_ai_queries_per_day", 1)
    
    # After successful query
    await subscription_service.increment_usage(workspace_id, "max_ai_queries_per_day", 1)
```

**Workspace Members** (`backend/app/api/endpoints/workspace_members.py`):
```python
@router.post("/{workspace_id}/members")
async def add_member(...):
    # ✅ ADD SUBSCRIPTION CHECK
    subscription_service = SubscriptionService(supabase_admin)
    await subscription_service.enforce_limit(workspace_id, "max_team_members", 1)
```

#### 2.2 Update Subscription Plans with Missing Limits

```sql
-- Add missing limits to subscription plans
UPDATE subscription_plans
SET features = jsonb_set(
    features,
    '{max_skills}',
    CASE name
        WHEN 'free' THEN '10'::jsonb
        WHEN 'pro' THEN '100'::jsonb
        WHEN 'enterprise' THEN '-1'::jsonb
    END
);

UPDATE subscription_plans
SET features = jsonb_set(
    features,
    '{max_tasks}',
    CASE name
        WHEN 'free' THEN '50'::jsonb
        WHEN 'pro' THEN '500'::jsonb
        WHEN 'enterprise' THEN '-1'::jsonb
    END
);
```

---

### Phase 3: Complete Usage Tracking

#### 3.1 Add Database Triggers

```sql
-- Track skill creation
CREATE OR REPLACE FUNCTION track_skill_creation()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM increment_usage(NEW.workspace_id, 'max_skills', 1);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_track_skill_creation
    AFTER INSERT ON skills
    FOR EACH ROW
    EXECUTE FUNCTION track_skill_creation();

-- Track task creation
CREATE OR REPLACE FUNCTION track_task_creation()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM increment_usage(NEW.workspace_id, 'max_tasks', 1);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_track_task_creation
    AFTER INSERT ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION track_task_creation();

-- Track team member additions
CREATE OR REPLACE FUNCTION track_member_addition()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM increment_usage(NEW.workspace_id, 'max_team_members', 1);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_track_member_addition
    AFTER INSERT ON workspace_members
    FOR EACH ROW
    EXECUTE FUNCTION track_member_addition();
```

---

### Phase 4: Frontend Permission UI

#### 4.1 Create Permission Hook

```typescript
// src/hooks/useWorkspacePermissions.ts
export function useWorkspacePermissions() {
  const { currentWorkspace } = useWorkspace();
  
  const canEdit = useMemo(() => {
    const role = currentWorkspace?.member_role;
    return ['member', 'admin', 'owner'].includes(role || '');
  }, [currentWorkspace]);
  
  const canAdmin = useMemo(() => {
    const role = currentWorkspace?.member_role;
    return ['admin', 'owner'].includes(role || '');
  }, [currentWorkspace]);
  
  const isOwner = useMemo(() => {
    return currentWorkspace?.member_role === 'owner';
  }, [currentWorkspace]);
  
  return { canEdit, canAdmin, isOwner };
}
```

#### 4.2 Add Subscription Limit Warnings

```typescript
// src/components/subscription/LimitWarning.tsx
export function LimitWarning({ metric }: { metric: string }) {
  const { subscription } = useSubscription();
  const usage = subscription?.usage?.[metric];
  
  if (!usage || usage.limit === -1) return null;
  
  const percentage = (usage.current / usage.limit) * 100;
  
  if (percentage < 80) return null;
  
  return (
    <Alert variant={percentage >= 100 ? "destructive" : "warning"}>
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>
        {percentage >= 100 ? "Limit Reached" : "Approaching Limit"}
      </AlertTitle>
      <AlertDescription>
        You've used {usage.current} of {usage.limit} {metric}.
        {percentage >= 100 && " Upgrade to continue."}
      </AlertDescription>
    </Alert>
  );
}
```

#### 4.3 Permission-Based UI Rendering

```typescript
// Example: src/pages/PagesPage.tsx
export default function PagesPage() {
  const { canEdit } = useWorkspacePermissions();
  
  return (
    <div>
      {canEdit && (
        <Button onClick={handleCreatePage}>
          <Plus className="w-4 h-4 mr-2" />
          Create Page
        </Button>
      )}
      {!canEdit && (
        <p className="text-muted-foreground">
          You don't have permission to create pages
        </p>
      )}
    </div>
  );
}
```

---

## 📋 Implementation Checklist

### Critical (Do First)
- [ ] Add permission checks to subscription endpoints
- [ ] Add subscription limit checks to skills endpoint
- [ ] Add subscription limit checks to tasks endpoint
- [ ] Add subscription limit checks to AI query endpoint
- [ ] Add subscription limit checks to member invite endpoint

### High Priority
- [ ] Update subscription plans with missing limits (skills, tasks)
- [ ] Add database triggers for usage tracking
- [ ] Create `useWorkspacePermissions` hook
- [ ] Add permission-based UI hiding to all pages

### Medium Priority
- [ ] Add `LimitWarning` component
- [ ] Add usage progress bars to settings page
- [ ] Add "Upgrade" prompts when limits reached
- [ ] Add permission tooltips ("You need admin role")

### Low Priority
- [ ] Add Stripe integration for payments
- [ ] Add webhook handling for subscription events
- [ ] Add billing history UI
- [ ] Add usage analytics dashboard

---

## 🔒 Security Considerations

### Current Vulnerabilities
1. **Any user can upgrade any workspace** - No permission check
2. **Subscription limits not enforced** - Users can exceed limits
3. **No audit logging** - Can't track who changed subscriptions

### Recommended Fixes
1. Require `admin` role for subscription changes
2. Enforce limits before allowing actions
3. Add audit log table for subscription changes
4. Add rate limiting to prevent abuse

---

## 🧪 Testing Plan

### Backend Tests
```python
# test_subscription_permissions.py
def test_non_admin_cannot_upgrade():
    # User with 'member' role tries to upgrade
    # Should return 403 Forbidden
    
def test_enforce_page_limit():
    # Create pages up to limit
    # Next creation should fail with 403
    
def test_usage_tracking():
    # Create resource
    # Verify usage_metrics incremented
```

### Frontend Tests
```typescript
// useWorkspacePermissions.test.ts
test('viewer cannot edit', () => {
  const { canEdit } = renderHook(() => useWorkspacePermissions());
  expect(canEdit).toBe(false);
});

test('member can edit', () => {
  const { canEdit } = renderHook(() => useWorkspacePermissions());
  expect(canEdit).toBe(true);
});
```

---

## 📊 Database Schema Additions Needed

```sql
-- Add audit log for subscription changes
CREATE TABLE subscription_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    action TEXT NOT NULL, -- 'upgrade', 'downgrade', 'cancel'
    old_plan_id UUID REFERENCES subscription_plans(id),
    new_plan_id UUID REFERENCES subscription_plans(id),
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add missing limits to plans
ALTER TABLE subscription_plans
ADD COLUMN IF NOT EXISTS max_skills INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS max_tasks INTEGER DEFAULT 50;
```

---

## 🚀 Deployment Steps

1. **Database Migration**
   ```bash
   # Run SQL to add missing limits and triggers
   psql -f add_subscription_limits.sql
   ```

2. **Backend Deployment**
   ```bash
   # Deploy updated endpoints with permission checks
   git push origin main
   ```

3. **Frontend Deployment**
   ```bash
   # Deploy UI with permission-based rendering
   npm run build
   netlify deploy --prod
   ```

4. **Verification**
   - Test subscription upgrade as non-admin (should fail)
   - Test creating resources beyond limit (should fail)
   - Test UI hiding for viewers (should hide create buttons)

---

## 📝 Summary

**Current State**: 
- Subscription system exists but limits not enforced
- Permission system exists but inconsistently applied
- Security vulnerabilities in subscription management

**Required Actions**:
1. Add permission checks to subscription endpoints (CRITICAL)
2. Enforce subscription limits on all creation endpoints
3. Complete usage tracking with database triggers
4. Add permission-based UI rendering

**Estimated Effort**: 2-3 days for full implementation
