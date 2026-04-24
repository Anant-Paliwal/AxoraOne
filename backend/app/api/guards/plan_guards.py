"""
Plan Guards - Reusable limit and feature check decorators
Enforces DB-driven plan limits across all endpoints
"""
from functools import wraps
from fastapi import HTTPException
from app.services.plan_service import plan_service

class PlanGuardError(HTTPException):
    """Custom exception for plan limit violations"""
    def __init__(self, message: str, upgrade_required: bool = True):
        super().__init__(
            status_code=403,
            detail={
                "error": message,
                "upgrade_required": upgrade_required,
                "upgrade_url": "/subscription"
            }
        )

async def check_workspace_limit_guard(user_id: str) -> None:
    """
    Guard: Check if user can create more workspaces
    Raises PlanGuardError if limit exceeded
    """
    can_create = await plan_service.check_workspace_limit(user_id)
    if not can_create:
        plan = await plan_service.get_user_plan(user_id)
        limit = plan.get("workspaces_limit", 0)
        raise PlanGuardError(
            f"Workspace limit reached ({limit} workspaces). Upgrade to create more."
        )

async def check_collaborator_limit_guard(workspace_id: str) -> None:
    """
    Guard: Check if workspace can add more collaborators
    Raises PlanGuardError if limit exceeded
    """
    can_add = await plan_service.check_collaborator_limit(workspace_id)
    if not can_add:
        # Get workspace owner's plan
        from app.core.supabase import supabase_admin
        workspace_result = supabase_admin.table("workspaces")\
            .select("user_id")\
            .eq("id", workspace_id)\
            .single()\
            .execute()
        
        if workspace_result.data:
            owner_id = workspace_result.data["user_id"]
            plan = await plan_service.get_user_plan(owner_id)
            limit = plan.get("collaborators_limit")
            limit_text = "unlimited" if limit is None else str(limit)
            raise PlanGuardError(
                f"Collaborator limit reached ({limit_text}). Workspace owner needs to upgrade."
            )
        
        raise PlanGuardError("Collaborator limit reached. Upgrade to add more members.")

async def check_ask_anything_limit_guard(user_id: str) -> None:
    """
    Guard: Check if user has Ask Anything credits remaining
    Raises PlanGuardError if limit exceeded
    """
    can_use = await plan_service.check_ask_anything_limit(user_id)
    if not can_use:
        usage = await plan_service.get_ask_anything_usage(user_id)
        raise PlanGuardError(
            f"Daily Ask Anything limit reached ({usage['limit']} queries/day). Upgrade for more credits.",
            upgrade_required=True
        )

async def check_page_share_edit_guard(user_id: str) -> None:
    """
    Guard: Check if user can share pages with edit permission
    Raises PlanGuardError if feature not available
    """
    can_edit = await plan_service.can_share_page_edit(user_id)
    if not can_edit:
        raise PlanGuardError(
            "Edit page sharing is available in Pro and above. Upgrade to share pages with edit permission."
        )

async def check_task_assignment_guard(user_id: str) -> None:
    """
    Guard: Check if user can assign tasks to others
    Raises PlanGuardError if feature not available
    """
    can_assign = await plan_service.can_assign_tasks(user_id)
    if not can_assign:
        raise PlanGuardError(
            "Task assignment is available in Pro and above. Upgrade to assign tasks to team members."
        )

async def check_team_pulse_guard(user_id: str) -> None:
    """
    Guard: Check if user has access to team pulse insights
    Raises PlanGuardError if feature not available
    """
    can_access = await plan_service.can_team_pulse(user_id)
    if not can_access:
        raise PlanGuardError(
            "Team pulse insights are available in Pro Plus. Upgrade to access team analytics."
        )

async def check_skill_insights_history_guard(user_id: str) -> None:
    """
    Guard: Check if user has access to skill insights history
    Raises PlanGuardError if feature not available
    """
    can_access = await plan_service.can_skill_insights_history(user_id)
    if not can_access:
        raise PlanGuardError(
            "Skill insights history is available in Pro and above. Upgrade to track your progress over time."
        )

# Decorator versions for easy use
def require_workspace_limit(func):
    """Decorator: Require workspace creation limit check"""
    @wraps(func)
    async def wrapper(*args, current_user: str = None, **kwargs):
        if current_user:
            await check_workspace_limit_guard(current_user)
        return await func(*args, current_user=current_user, **kwargs)
    return wrapper

def require_collaborator_limit(workspace_id_param: str = "workspace_id"):
    """Decorator: Require collaborator limit check"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            workspace_id = kwargs.get(workspace_id_param)
            if workspace_id:
                await check_collaborator_limit_guard(workspace_id)
            return await func(*args, **kwargs)
        return wrapper
    return decorator

def require_ask_anything_limit(func):
    """Decorator: Require Ask Anything limit check"""
    @wraps(func)
    async def wrapper(*args, current_user: str = None, **kwargs):
        if current_user:
            await check_ask_anything_limit_guard(current_user)
        return await func(*args, current_user=current_user, **kwargs)
    return wrapper

def require_page_share_edit(func):
    """Decorator: Require edit page sharing feature"""
    @wraps(func)
    async def wrapper(*args, current_user: str = None, **kwargs):
        if current_user:
            await check_page_share_edit_guard(current_user)
        return await func(*args, current_user=current_user, **kwargs)
    return wrapper

def require_task_assignment(func):
    """Decorator: Require task assignment feature"""
    @wraps(func)
    async def wrapper(*args, current_user: str = None, **kwargs):
        if current_user:
            await check_task_assignment_guard(current_user)
        return await func(*args, current_user=current_user, **kwargs)
    return wrapper

def require_team_pulse(func):
    """Decorator: Require team pulse feature"""
    @wraps(func)
    async def wrapper(*args, current_user: str = None, **kwargs):
        if current_user:
            await check_team_pulse_guard(current_user)
        return await func(*args, current_user=current_user, **kwargs)
    return wrapper
