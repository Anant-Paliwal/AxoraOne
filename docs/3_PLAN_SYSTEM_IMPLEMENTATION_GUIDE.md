# 3-Plan System Implementation Guide

## Overview

Axora billing system has been upgraded to a **DB-driven 3-plan structure**: FREE, PRO, PRO_PLUS.

**Key Principle**: All limits and feature flags are stored in the database. NO hardcoded plan rules in frontend or backend.

---

## Plan Definitions

### FREE Plan
- **Price**: ₹0/month
- **Workspaces**: 5
- **Collaborators**: 3
- **Ask Anything**: 10/day
- **Page History**: 7 days
- **Features**: Basic sharing, read-only page sharing, basic knowledge graph

### PRO Plan (Most Popular)
- **Price**: ₹499/month or ₹4,999/year
- **Workspaces**: 20
- **Collaborators**: 10
- **Ask Anything**: 100/day
- **Page History**: 30 days
- **Features**: Edit page sharing, task assignment, skill insights history (30 days), advanced knowledge graph

### PRO PLUS Plan
- **Price**: ₹999/month or ₹9,999/year
- **Workspaces**: Unlimited
- **Collaborators**: Unlimited
- **Ask Anything**: 300/day
- **Page History**: 90 days
- **Features**: All PRO features + team pulse insights

---

## Database Schema

### subscription_plans
```sql
- id UUID PK
- code TEXT UNIQUE (FREE, PRO, PRO_PLUS)
- name TEXT
- description TEXT
- price_monthly_inr INT
- price_yearly_inr INT NULL
- workspaces_limit INT NULL (NULL = unlimited)
- collaborators_limit INT NULL (NULL = unlimited)
- ask_anything_daily_limit INT
- page_history_days INT
- can_share_workspace BOOLEAN
- can_share_page_readonly BOOLEAN
- can_share_page_edit BOOLEAN
- can_assign_tasks BOOLEAN
- can_team_pulse BOOLEAN
- can_skill_insights_history BOOLEAN
- skill_insights_history_days INT
- knowledge_graph_level TEXT (basic|advanced)
- is_active BOOLEAN
- sort_order INT
```

### user_subscriptions
```sql
- id UUID PK
- user_id UUID UNIQUE
- plan_code TEXT REFERENCES subscription_plans(code)
- status TEXT (active|cancelled|expired)
- billing_cycle TEXT (monthly|yearly)
- start_at TIMESTAMP
- end_at TIMESTAMP NULL
- razorpay_subscription_id TEXT NULL
```

### ask_anything_usage_daily
```sql
- id UUID PK
- user_id UUID
- usage_date DATE
- used_count INT
- UNIQUE(user_id, usage_date)
```

---

## Migration Steps

### 1. Run SQL Migration

```bash
# Connect to your Supabase database
psql <your-connection-string>

# Run the migration
\i backend/migrations/upgrade_to_3_plan_system.sql
```

This will:
- Drop old subscription_plans table
- Create new schema with feature flags
- Seed 3 plans (FREE, PRO, PRO_PLUS)
- Migrate all existing users to FREE plan
- Create helper functions for limit checks
- Set up RLS policies

### 2. Update Backend Dependencies

The migration creates these SQL functions:
- `get_user_plan(user_id)` - Returns plan with all limits/flags
- `check_workspace_limit(user_id)` - Returns true if can create workspace
- `check_collaborator_limit(workspace_id)` - Returns true if can add collaborator
- `check_ask_anything_limit(user_id)` - Returns true if has credits remaining
- `increment_ask_anything_usage(user_id)` - Increments daily usage

### 3. Backend Service Integration

The `PlanService` (`backend/app/services/plan_service.py`) provides:

```python
from app.services.plan_service import plan_service

# Get user's plan
plan = await plan_service.get_user_plan(user_id)

# Check limits
can_create = await plan_service.check_workspace_limit(user_id)
can_add = await plan_service.check_collaborator_limit(workspace_id)
can_use = await plan_service.check_ask_anything_limit(user_id)

# Increment usage
await plan_service.increment_ask_anything_usage(user_id)

# Check feature flags
can_edit = await plan_service.can_share_page_edit(user_id)
can_assign = await plan_service.can_assign_tasks(user_id)
```

---

## Enforcing Limits

### Workspace Creation

```python
# In workspaces.py endpoint
@router.post("/")
async def create_workspace(
    data: WorkspaceCreate,
    current_user: str = Depends(get_current_user)
):
    # Check limit
    can_create = await plan_service.check_workspace_limit(current_user)
    if not can_create:
        raise HTTPException(
            status_code=403,
            detail="Workspace limit reached. Upgrade to create more workspaces."
        )
    
    # Create workspace...
```

### Collaborator Invitation

```python
# In workspace_members.py endpoint
@router.post("/{workspace_id}/members")
async def invite_member(
    workspace_id: str,
    data: InviteMemberRequest,
    current_user: str = Depends(get_current_user)
):
    # Check limit
    can_add = await plan_service.check_collaborator_limit(workspace_id)
    if not can_add:
        raise HTTPException(
            status_code=403,
            detail="Collaborator limit reached. Upgrade to add more members."
        )
    
    # Invite member...
```

### Ask Anything Usage

```python
# In ai_chat.py endpoint
@router.post("/ask")
async def ask_anything(
    request: AskRequest,
    current_user: str = Depends(get_current_user)
):
    # Check limit
    can_use = await plan_service.check_ask_anything_limit(current_user)
    if not can_use:
        raise HTTPException(
            status_code=429,
            detail="Daily Ask Anything limit reached. Upgrade for more credits."
        )
    
    # Process request...
    
    # Increment usage
    await plan_service.increment_ask_anything_usage(current_user)
```

### Page Sharing

```python
# In pages.py endpoint
@router.post("/{page_id}/share")
async def share_page(
    page_id: str,
    data: SharePageRequest,
    current_user: str = Depends(get_current_user)
):
    # Check feature flag
    if data.permission == "edit":
        can_edit = await plan_service.can_share_page_edit(current_user)
        if not can_edit:
            raise HTTPException(
                status_code=403,
                detail="Edit page sharing available in Pro and above."
            )
    
    # Share page...
```

### Task Assignment

```python
# In tasks.py endpoint
@router.post("/")
async def create_task(
    data: TaskCreate,
    current_user: str = Depends(get_current_user)
):
    # Check feature flag if assigning
    if data.assigned_user_id:
        can_assign = await plan_service.can_assign_tasks(current_user)
        if not can_assign:
            raise HTTPException(
                status_code=403,
                detail="Task assignment available in Pro and above."
            )
    
    # Create task...
```

---

## Frontend Integration

### API Client Updates

Update `src/lib/api.ts`:

```typescript
// Subscription endpoints
getSubscriptionPlans: () => api.get('/subscriptions/plans'),
getCurrentSubscription: () => api.get('/subscriptions/current'),
upgradeSubscription: (planCode: string, billingCycle: string) => 
  api.post('/subscriptions/upgrade', { plan_name: planCode, billing_cycle: billingCycle }),
verifyPayment: (data: any) => api.post('/subscriptions/verify-payment', data),
cancelSubscription: (immediate: boolean) => 
  api.post('/subscriptions/cancel', { immediate }),
getUsage: () => api.get('/subscriptions/usage'),
checkLimit: (limitType: string, workspaceId?: string) => 
  api.get(`/subscriptions/check-limit/${limitType}${workspaceId ? `?workspace_id=${workspaceId}` : ''}`),
```

### Limit Checks in UI

```typescript
// Before creating workspace
const checkWorkspaceLimit = async () => {
  const result = await api.checkLimit('workspace');
  if (!result.allowed) {
    toast.error('Workspace limit reached. Upgrade to create more.');
    return false;
  }
  return true;
};

// Before inviting member
const checkCollaboratorLimit = async (workspaceId: string) => {
  const result = await api.checkLimit('collaborator', workspaceId);
  if (!result.allowed) {
    toast.error('Collaborator limit reached. Upgrade to add more members.');
    return false;
  }
  return true;
};

// Before using Ask Anything
const checkAskAnythingLimit = async () => {
  const result = await api.checkLimit('ask_anything');
  if (!result.allowed) {
    toast.error('Daily Ask Anything limit reached. Upgrade for more credits.');
    return false;
  }
  return true;
};
```

---

## Testing Checklist

### Database
- [ ] Migration runs successfully
- [ ] 3 plans exist in subscription_plans table
- [ ] All users have user_subscriptions record (default FREE)
- [ ] Helper functions work correctly

### Backend
- [ ] GET /subscriptions/plans returns 3 plans
- [ ] GET /subscriptions/current returns user subscription
- [ ] Workspace creation enforces limit
- [ ] Collaborator invitation enforces limit
- [ ] Ask Anything enforces daily limit
- [ ] Page sharing enforces edit permission
- [ ] Task assignment enforces feature flag

### Frontend
- [ ] Subscription page displays 3 plans correctly
- [ ] Pricing shows INR currency
- [ ] Current plan status displays usage
- [ ] Upgrade flow works with Razorpay
- [ ] Limit checks prevent actions when exceeded
- [ ] Error messages guide users to upgrade

---

## Deployment Steps

1. **Backup Database**
   ```bash
   pg_dump <connection-string> > backup_before_3_plan_migration.sql
   ```

2. **Run Migration**
   ```bash
   psql <connection-string> -f backend/migrations/upgrade_to_3_plan_system.sql
   ```

3. **Deploy Backend**
   ```bash
   cd backend
   git pull
   pip install -r requirements.txt
   # Restart backend service
   ```

4. **Deploy Frontend**
   ```bash
   npm install
   npm run build
   # Deploy to hosting
   ```

5. **Verify**
   - Check subscription page loads
   - Test limit enforcement
   - Test upgrade flow
   - Monitor error logs

---

## Key Differences from Old System

### Before (Hardcoded)
```python
# ❌ BAD: Hardcoded in code
if plan_name == "free":
    max_workspaces = 5
elif plan_name == "pro":
    max_workspaces = 20
```

### After (DB-Driven)
```python
# ✅ GOOD: Read from database
plan = await plan_service.get_user_plan(user_id)
max_workspaces = plan.get("workspaces_limit")  # NULL = unlimited
```

### Benefits
1. **No code changes** to update limits - just update database
2. **Consistent** across frontend and backend
3. **Flexible** - easy to add new plans or features
4. **Auditable** - all plan changes tracked in database

---

## Common Issues

### Issue: Users stuck on old plan
**Solution**: Run migration again to ensure all users have user_subscriptions record

### Issue: Limits not enforced
**Solution**: Check that endpoints are using `plan_service` instead of hardcoded checks

### Issue: Frontend shows wrong limits
**Solution**: Ensure frontend is reading from API response, not hardcoded values

### Issue: NULL limit treated as 0
**Solution**: Check for `NULL` explicitly - it means unlimited, not zero

---

## Support

For issues or questions:
1. Check migration logs for errors
2. Verify database schema matches expected structure
3. Test API endpoints directly with curl/Postman
4. Check backend logs for plan_service errors

---

## Next Steps

After successful deployment:
1. Monitor usage metrics
2. Gather user feedback on limits
3. Adjust limits in database as needed (no code changes!)
4. Consider adding more feature flags for future features
