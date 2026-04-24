# Plan Guard Implementation Examples

This document shows how to implement DB-driven plan limits and feature flags in your API endpoints.

---

## Import Guards

```python
from app.api.guards.plan_guards import (
    check_workspace_limit_guard,
    check_collaborator_limit_guard,
    check_ask_anything_limit_guard,
    check_page_share_edit_guard,
    check_task_assignment_guard,
    check_team_pulse_guard,
    PlanGuardError
)
from app.services.plan_service import plan_service
```

---

## Example 1: Workspace Creation

**File**: `backend/app/api/endpoints/workspaces.py`

```python
from fastapi import APIRouter, Depends, HTTPException
from app.api.dependencies import get_current_user
from app.api.guards.plan_guards import check_workspace_limit_guard
from app.services.plan_service import plan_service

router = APIRouter()

@router.post("/")
async def create_workspace(
    data: WorkspaceCreate,
    current_user: str = Depends(get_current_user)
):
    """Create new workspace - enforces workspace limit"""
    
    # ✅ Check limit BEFORE creating
    await check_workspace_limit_guard(current_user)
    
    # Create workspace
    result = supabase_admin.table("workspaces").insert({
        "owner_user_id": current_user,
        "name": data.name,
        "description": data.description
    }).execute()
    
    return result.data[0]
```

---

## Example 2: Invite Workspace Member

**File**: `backend/app/api/endpoints/workspace_members.py`

```python
@router.post("/{workspace_id}/members")
async def invite_member(
    workspace_id: str,
    data: InviteMemberRequest,
    current_user: str = Depends(get_current_user)
):
    """Invite member to workspace - enforces collaborator limit"""
    
    # ✅ Check collaborator limit
    await check_collaborator_limit_guard(workspace_id)
    
    # Check if user is workspace owner/admin
    # ... authorization logic ...
    
    # Send invitation
    result = supabase_admin.table("workspace_members").insert({
        "workspace_id": workspace_id,
        "user_id": data.user_id,
        "role": data.role
    }).execute()
    
    return {"success": True, "member": result.data[0]}
```

---

## Example 3: Ask Anything Query

**File**: `backend/app/api/endpoints/ai_chat.py`

```python
@router.post("/ask")
async def ask_anything(
    request: AskRequest,
    current_user: str = Depends(get_current_user)
):
    """Process Ask Anything query - enforces daily limit"""
    
    # ✅ Check Ask Anything limit BEFORE processing
    await check_ask_anything_limit_guard(current_user)
    
    # Process AI query
    response = await ai_service.process_query(
        query=request.query,
        workspace_id=request.workspace_id,
        user_id=current_user
    )
    
    # ✅ Increment usage AFTER successful processing
    await plan_service.increment_ask_anything_usage(current_user)
    
    return response
```

---

## Example 4: Share Page with Edit Permission

**File**: `backend/app/api/endpoints/pages.py`

```python
@router.post("/{page_id}/share")
async def share_page(
    page_id: str,
    data: SharePageRequest,
    current_user: str = Depends(get_current_user)
):
    """Share page with user - enforces edit permission feature flag"""
    
    # ✅ Check feature flag if requesting edit permission
    if data.permission == "edit":
        await check_page_share_edit_guard(current_user)
    
    # Read-only sharing is allowed for all plans
    # Create page share
    result = supabase_admin.table("page_shares").insert({
        "page_id": page_id,
        "user_id": data.user_id,
        "permission": data.permission
    }).execute()
    
    return {"success": True, "share": result.data[0]}
```

---

## Example 5: Assign Task

**File**: `backend/app/api/endpoints/tasks.py`

```python
@router.post("/")
async def create_task(
    data: TaskCreate,
    current_user: str = Depends(get_current_user)
):
    """Create task - enforces task assignment feature flag"""
    
    # ✅ Check feature flag if assigning to someone
    if data.assigned_user_id and data.assigned_user_id != current_user:
        await check_task_assignment_guard(current_user)
    
    # Create task
    result = supabase_admin.table("tasks").insert({
        "workspace_id": data.workspace_id,
        "title": data.title,
        "description": data.description,
        "assigned_user_id": data.assigned_user_id,
        "created_by": current_user
    }).execute()
    
    return result.data[0]

@router.patch("/{task_id}")
async def update_task(
    task_id: str,
    data: TaskUpdate,
    current_user: str = Depends(get_current_user)
):
    """Update task - enforces task assignment when changing assignee"""
    
    # ✅ Check feature flag if changing assignment
    if data.assigned_user_id is not None:
        # Get current task
        task = supabase_admin.table("tasks")\
            .select("assigned_user_id")\
            .eq("id", task_id)\
            .single()\
            .execute()
        
        # If assignment is changing, check feature flag
        if task.data and task.data["assigned_user_id"] != data.assigned_user_id:
            await check_task_assignment_guard(current_user)
    
    # Update task
    result = supabase_admin.table("tasks")\
        .update(data.dict(exclude_unset=True))\
        .eq("id", task_id)\
        .execute()
    
    return result.data[0]
```

---

## Example 6: Team Pulse Insights

**File**: `backend/app/api/endpoints/intelligence.py`

```python
@router.get("/team-pulse/{workspace_id}")
async def get_team_pulse(
    workspace_id: str,
    current_user: str = Depends(get_current_user)
):
    """Get team pulse insights - Pro Plus feature"""
    
    # ✅ Check team pulse feature flag
    await check_team_pulse_guard(current_user)
    
    # Get team metrics
    metrics = await intelligence_service.get_team_pulse(
        workspace_id=workspace_id,
        user_id=current_user
    )
    
    return metrics
```

---

## Example 7: Skill Insights History

**File**: `backend/app/api/endpoints/skills.py`

```python
@router.get("/{skill_id}/history")
async def get_skill_history(
    skill_id: str,
    days: int = 30,
    current_user: str = Depends(get_current_user)
):
    """Get skill progress history - Pro feature"""
    
    # ✅ Check skill insights history feature
    await check_skill_insights_history_guard(current_user)
    
    # Get user's allowed history days
    allowed_days = await plan_service.get_skill_insights_history_days(current_user)
    
    # Limit request to allowed days
    days = min(days, allowed_days)
    
    # Fetch history
    history = await skill_service.get_skill_history(
        skill_id=skill_id,
        user_id=current_user,
        days=days
    )
    
    return {
        "skill_id": skill_id,
        "days": days,
        "max_days": allowed_days,
        "history": history
    }
```

---

## Example 8: Page History/Revisions

**File**: `backend/app/api/endpoints/page_history.py`

```python
@router.get("/{page_id}/revisions")
async def get_page_revisions(
    page_id: str,
    current_user: str = Depends(get_current_user)
):
    """Get page revision history - limited by plan"""
    
    # ✅ Get user's page history limit
    history_days = await plan_service.get_page_history_days(current_user)
    
    # Calculate cutoff date
    from datetime import datetime, timedelta
    cutoff_date = datetime.now() - timedelta(days=history_days)
    
    # Fetch revisions within allowed timeframe
    result = supabase_admin.table("page_revisions")\
        .select("*")\
        .eq("page_id", page_id)\
        .gte("created_at", cutoff_date.isoformat())\
        .order("created_at", desc=True)\
        .execute()
    
    return {
        "page_id": page_id,
        "history_days": history_days,
        "revisions": result.data
    }
```

---

## Example 9: Knowledge Graph Level

**File**: `backend/app/api/endpoints/graph.py`

```python
@router.get("/suggestions")
async def get_graph_suggestions(
    workspace_id: str,
    current_user: str = Depends(get_current_user)
):
    """Get knowledge graph suggestions - quality depends on plan"""
    
    # ✅ Get user's knowledge graph level
    graph_level = await plan_service.get_knowledge_graph_level(current_user)
    
    # Fetch suggestions with appropriate algorithm
    if graph_level == "advanced":
        suggestions = await graph_service.get_advanced_suggestions(
            workspace_id=workspace_id,
            user_id=current_user
        )
    else:
        suggestions = await graph_service.get_basic_suggestions(
            workspace_id=workspace_id,
            user_id=current_user
        )
    
    return {
        "level": graph_level,
        "suggestions": suggestions
    }
```

---

## Error Handling

All guards raise `PlanGuardError` which returns a structured response:

```json
{
  "detail": {
    "error": "Workspace limit reached (5 workspaces). Upgrade to create more.",
    "upgrade_required": true,
    "upgrade_url": "/subscription"
  }
}
```

Frontend can catch this and show upgrade prompt:

```typescript
try {
  await api.createWorkspace(data);
} catch (error: any) {
  if (error.response?.status === 403 && error.response?.data?.detail?.upgrade_required) {
    // Show upgrade modal
    showUpgradeModal(error.response.data.detail.error);
  } else {
    toast.error(error.message);
  }
}
```

---

## Testing Guards

```python
# Test workspace limit
async def test_workspace_limit():
    user_id = "test-user-id"
    
    # Should pass for FREE plan (limit 5)
    for i in range(5):
        await check_workspace_limit_guard(user_id)
        # Create workspace...
    
    # Should fail on 6th workspace
    try:
        await check_workspace_limit_guard(user_id)
        assert False, "Should have raised PlanGuardError"
    except PlanGuardError as e:
        assert "Workspace limit reached" in str(e.detail)

# Test Ask Anything limit
async def test_ask_anything_limit():
    user_id = "test-user-id"
    
    # Should pass for FREE plan (limit 10)
    for i in range(10):
        await check_ask_anything_limit_guard(user_id)
        await plan_service.increment_ask_anything_usage(user_id)
    
    # Should fail on 11th query
    try:
        await check_ask_anything_limit_guard(user_id)
        assert False, "Should have raised PlanGuardError"
    except PlanGuardError as e:
        assert "Daily Ask Anything limit reached" in str(e.detail)
```

---

## Best Practices

1. **Check limits BEFORE performing action** - Don't create resources then check
2. **Increment usage AFTER successful action** - Only count successful operations
3. **Use descriptive error messages** - Tell users exactly what limit they hit
4. **Always include upgrade path** - Guide users to subscription page
5. **Test edge cases** - NULL limits (unlimited), exactly at limit, etc.
6. **Log limit violations** - Track which limits users hit most often
7. **Cache plan data** - Consider caching user plans for performance

---

## Performance Optimization

For high-traffic endpoints, consider caching plan data:

```python
from functools import lru_cache
from datetime import datetime, timedelta

# Cache user plan for 5 minutes
@lru_cache(maxsize=1000)
async def get_cached_user_plan(user_id: str, cache_key: str):
    return await plan_service.get_user_plan(user_id)

# Use with time-based cache key
async def get_user_plan_cached(user_id: str):
    # Cache key changes every 5 minutes
    cache_key = datetime.now().strftime("%Y%m%d%H%M")[:-1]  # Round to 5 min
    return await get_cached_user_plan(user_id, cache_key)
```

---

## Summary

✅ **DO**:
- Check limits before actions
- Use guard functions consistently
- Provide clear error messages
- Guide users to upgrade

❌ **DON'T**:
- Hardcode plan limits in code
- Skip limit checks
- Create resources before checking
- Forget to increment usage counters
