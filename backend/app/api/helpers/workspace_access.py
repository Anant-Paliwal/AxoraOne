"""
Helper functions for workspace access control.
Allows workspace owners and members to access workspace data.
"""
from app.core.supabase import supabase_admin
from fastapi import HTTPException

async def check_workspace_access(user_id: str, workspace_id: str) -> dict:
    """
    Check if user has access to a workspace (owner or member).
    Returns access info with role.
    """
    # Check if user owns the workspace
    workspace = supabase_admin.table("workspaces").select("*").eq("id", workspace_id).execute()
    
    if not workspace.data:
        raise HTTPException(status_code=404, detail="Workspace not found")
    
    ws = workspace.data[0]
    is_owner = ws.get("user_id") == user_id
    
    if is_owner:
        return {"has_access": True, "role": "owner", "workspace": ws}
    
    # Check if user is a member
    member = supabase_admin.table("workspace_members").select("role").eq("workspace_id", workspace_id).eq("user_id", user_id).execute()
    
    if member.data:
        return {"has_access": True, "role": member.data[0]["role"], "workspace": ws}
    
    return {"has_access": False, "role": None, "workspace": None}

async def require_workspace_access(user_id: str, workspace_id: str, min_role: str = None) -> dict:
    """
    Require user to have access to workspace. Raises 403 if not.
    min_role can be: 'viewer', 'member', 'admin', 'owner'
    """
    access = await check_workspace_access(user_id, workspace_id)
    
    if not access["has_access"]:
        raise HTTPException(status_code=403, detail="Not authorized to access this workspace")
    
    # Role hierarchy: viewer < member < admin < owner
    role_hierarchy = {"viewer": 1, "member": 2, "admin": 3, "owner": 4}
    
    if min_role and role_hierarchy.get(access["role"], 0) < role_hierarchy.get(min_role, 0):
        raise HTTPException(status_code=403, detail=f"Requires {min_role} role or higher")
    
    return access

def can_edit(role: str) -> bool:
    """Check if role can edit (member, admin, owner)"""
    return role in ["member", "admin", "owner"]

def can_admin(role: str) -> bool:
    """Check if role can admin (admin, owner)"""
    return role in ["admin", "owner"]
