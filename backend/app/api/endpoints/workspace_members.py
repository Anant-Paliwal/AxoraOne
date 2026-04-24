from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime, timedelta
from app.core.supabase import supabase_admin
from app.api.dependencies import get_current_user

router = APIRouter()

class InviteMemberRequest(BaseModel):
    email: EmailStr
    role: str = "member"  # admin, member, viewer

class UpdateMemberRole(BaseModel):
    role: str  # admin, member, viewer

class InvitationResponse(BaseModel):
    id: str
    workspace_id: str
    email: str
    role: str
    status: str
    invited_by: str
    created_at: str

# ============================================
# USER'S PENDING INVITATIONS (Must be FIRST - before /{workspace_id} routes)
# ============================================

@router.get("/my-invitations")
async def get_my_invitations(
    user_id: str = Depends(get_current_user)
):
    """Get all pending invitations for the current user"""
    try:
        # Get user's email using admin API
        try:
            user_auth = supabase_admin.auth.admin.get_user_by_id(user_id)
            if not user_auth or not user_auth.user:
                raise HTTPException(status_code=401, detail="User not found")
            user_email = user_auth.user.email
        except Exception as e:
            print(f"Error getting user: {e}")
            raise HTTPException(status_code=401, detail="Could not verify user")
        
        print(f"Looking for invitations for email: {user_email}")
        
        # Get pending invitations - join with workspaces table
        invitations = supabase_admin.table("workspace_invitations")\
            .select("*, workspaces(name, icon, color)")\
            .eq("email", user_email)\
            .eq("status", "pending")\
            .execute()
        
        print(f"Found invitations: {invitations.data}")
        
        result = []
        for inv in invitations.data or []:
            # Get inviter info
            inviter_settings = supabase_admin.table("user_settings").select("full_name").eq("user_id", inv["invited_by"]).execute()
            inviter_name = inviter_settings.data[0].get("full_name") if inviter_settings.data else "Someone"
            
            workspace_data = inv.get("workspaces") or {}
            
            result.append({
                "id": inv["id"],
                "workspace_id": inv["workspace_id"],
                "workspace_name": workspace_data.get("name", "Unknown Workspace"),
                "workspace_icon": workspace_data.get("icon"),
                "workspace_color": workspace_data.get("color"),
                "role": inv["role"],
                "invited_by_name": inviter_name,
                "token": inv["token"],
                "created_at": inv["created_at"],
                "expires_at": inv.get("expires_at")
            })
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error getting user invitations: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

# ============================================
# INVITATION TOKEN ROUTES (Before workspace_id routes)
# ============================================

@router.post("/invitations/{token}/accept")
async def accept_invitation(
    token: str,
    user_id: str = Depends(get_current_user)
):
    """Accept a workspace invitation"""
    try:
        # Get current user's email
        user_auth = supabase_admin.auth.admin.get_user_by_id(user_id)
        if not user_auth.user:
            raise HTTPException(status_code=401, detail="User not found")
        
        user_email = user_auth.user.email
        
        # Find the invitation
        invitation = supabase_admin.table("workspace_invitations").select("*").eq("token", token).eq("status", "pending").execute()
        
        if not invitation.data:
            raise HTTPException(status_code=404, detail="Invalid or expired invitation")
        
        inv = invitation.data[0]
        
        # Check if expired
        if inv.get("expires_at"):
            try:
                expires = datetime.fromisoformat(inv["expires_at"].replace("Z", "+00:00"))
                if expires < datetime.now(expires.tzinfo):
                    supabase_admin.table("workspace_invitations").update({"status": "expired"}).eq("id", inv["id"]).execute()
                    raise HTTPException(status_code=400, detail="Invitation has expired")
            except ValueError:
                pass  # Skip expiry check if date parsing fails
        
        # Check if email matches (case-insensitive)
        if inv["email"].lower() != user_email.lower():
            raise HTTPException(status_code=403, detail="This invitation was sent to a different email address")
        
        # Check if already a member
        existing_member = supabase_admin.table("workspace_members").select("id").eq("workspace_id", inv["workspace_id"]).eq("user_id", user_id).execute()
        
        if existing_member.data:
            # Update invitation status
            supabase_admin.table("workspace_invitations").update({"status": "accepted"}).eq("id", inv["id"]).execute()
            return {"message": "You are already a member of this workspace", "workspace_id": inv["workspace_id"]}
        
        # Add user as member
        member_data = {
            "workspace_id": inv["workspace_id"],
            "user_id": user_id,
            "role": inv["role"],
            "invited_by": inv["invited_by"],
            "joined_at": datetime.utcnow().isoformat()
        }
        print(f"Adding member to workspace: {member_data}")
        member_result = supabase_admin.table("workspace_members").insert(member_data).execute()
        print(f"Member insert result: {member_result.data}")
        
        # Update invitation status
        supabase_admin.table("workspace_invitations").update({"status": "accepted"}).eq("id", inv["id"]).execute()
        
        # Notify the inviter
        workspace = supabase_admin.table("workspaces").select("name").eq("id", inv["workspace_id"]).execute()
        workspace_name = workspace.data[0]["name"] if workspace.data else "Unknown"
        
        user_settings = supabase_admin.table("user_settings").select("full_name").eq("user_id", user_id).execute()
        user_name = user_settings.data[0].get("full_name") if user_settings.data else user_email.split("@")[0]
        
        notification_data = {
            "user_id": inv["invited_by"],
            "title": "Invitation Accepted",
            "message": f"{user_name} has joined '{workspace_name}'",
            "type": "success",
            "workspace_id": inv["workspace_id"],
            "icon": "user-check"
        }
        supabase_admin.table("notifications").insert(notification_data).execute()
        
        return {"message": "Successfully joined workspace", "workspace_id": inv["workspace_id"]}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error accepting invitation: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/invitations/{token}/decline")
async def decline_invitation(
    token: str,
    user_id: str = Depends(get_current_user)
):
    """Decline a workspace invitation"""
    try:
        # Find the invitation
        invitation = supabase_admin.table("workspace_invitations").select("*").eq("token", token).eq("status", "pending").execute()
        
        if not invitation.data:
            raise HTTPException(status_code=404, detail="Invalid or expired invitation")
        
        inv = invitation.data[0]
        
        # Update invitation status
        supabase_admin.table("workspace_invitations").update({"status": "declined"}).eq("id", inv["id"]).execute()
        
        return {"message": "Invitation declined"}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error declining invitation: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================
# WORKSPACE MEMBERS ENDPOINTS
# ============================================

@router.get("/{workspace_id}/members")
async def get_workspace_members(
    workspace_id: str,
    user_id: str = Depends(get_current_user)
):
    """Get all members of a workspace"""
    try:
        # Verify user has access to this workspace
        member_check = supabase_admin.table("workspace_members").select("role").eq("workspace_id", workspace_id).eq("user_id", user_id).execute()
        
        # Also check if user is the workspace owner
        workspace_check = supabase_admin.table("workspaces").select("user_id").eq("id", workspace_id).execute()
        
        is_owner = workspace_check.data and workspace_check.data[0].get("user_id") == user_id
        is_member = bool(member_check.data)
        
        if not is_owner and not is_member:
            raise HTTPException(status_code=403, detail="Not authorized to view workspace members")
        
        # Get all members with user details
        members_response = supabase_admin.table("workspace_members").select("*").eq("workspace_id", workspace_id).execute()
        
        members = []
        for member in members_response.data or []:
            # Get user details
            user_response = supabase_admin.table("user_settings").select("full_name, avatar_url").eq("user_id", member["user_id"]).execute()
            user_auth = supabase_admin.auth.admin.get_user_by_id(member["user_id"])
            
            user_data = user_response.data[0] if user_response.data else {}
            
            members.append({
                "id": member["id"],
                "user_id": member["user_id"],
                "role": member["role"],
                "joined_at": member["joined_at"],
                "full_name": user_data.get("full_name") or user_auth.user.email.split("@")[0] if user_auth.user else "Unknown",
                "email": user_auth.user.email if user_auth.user else "Unknown",
                "avatar_url": user_data.get("avatar_url")
            })
        
        return members
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error getting workspace members: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/{workspace_id}/members/{member_user_id}")
async def update_member_role(
    workspace_id: str,
    member_user_id: str,
    update: UpdateMemberRole,
    user_id: str = Depends(get_current_user)
):
    """Update a member's role (owner/admin only)"""
    try:
        # Check if current user is owner or admin
        current_member = supabase_admin.table("workspace_members").select("role").eq("workspace_id", workspace_id).eq("user_id", user_id).execute()
        
        workspace_check = supabase_admin.table("workspaces").select("user_id").eq("id", workspace_id).execute()
        is_owner = workspace_check.data and workspace_check.data[0].get("user_id") == user_id
        
        if not is_owner and (not current_member.data or current_member.data[0]["role"] not in ["owner", "admin"]):
            raise HTTPException(status_code=403, detail="Only owners and admins can update member roles")
        
        # Cannot change owner role
        if update.role == "owner":
            raise HTTPException(status_code=400, detail="Cannot assign owner role")
        
        # Update the member's role
        response = supabase_admin.table("workspace_members").update({
            "role": update.role,
            "updated_at": datetime.utcnow().isoformat()
        }).eq("workspace_id", workspace_id).eq("user_id", member_user_id).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Member not found")
        
        return response.data[0]
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error updating member role: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{workspace_id}/members/{member_user_id}")
async def remove_member(
    workspace_id: str,
    member_user_id: str,
    user_id: str = Depends(get_current_user)
):
    """Remove a member from workspace (owner/admin only, or self-leave for non-owners)"""
    try:
        # Check if current user is owner, admin, or removing themselves
        is_self = member_user_id == user_id
        
        workspace_check = supabase_admin.table("workspaces").select("user_id").eq("id", workspace_id).execute()
        if not workspace_check.data:
            raise HTTPException(status_code=404, detail="Workspace not found")
        
        workspace_owner_id = workspace_check.data[0].get("user_id")
        is_owner = workspace_owner_id == user_id
        is_target_owner = workspace_owner_id == member_user_id
        
        # Owner cannot leave their own workspace
        if is_self and is_owner:
            raise HTTPException(status_code=400, detail="Workspace owner cannot leave. Transfer ownership or delete the workspace instead.")
        
        # Cannot remove the workspace owner
        if is_target_owner:
            raise HTTPException(status_code=400, detail="Cannot remove workspace owner")
        
        # Check current user's role if not owner
        current_member = supabase_admin.table("workspace_members").select("role").eq("workspace_id", workspace_id).eq("user_id", user_id).execute()
        current_role = current_member.data[0]["role"] if current_member.data else None
        
        # Permission check: owner, admin, or self-leave
        if not is_self and not is_owner and current_role not in ["admin"]:
            raise HTTPException(status_code=403, detail="Not authorized to remove members")
        
        # Remove the member
        response = supabase_admin.table("workspace_members").delete().eq("workspace_id", workspace_id).eq("user_id", member_user_id).execute()
        
        action = "left" if is_self else "removed"
        return {"message": f"Member {action} successfully"}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error removing member: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{workspace_id}/leave")
async def leave_workspace(
    workspace_id: str,
    user_id: str = Depends(get_current_user)
):
    """Leave a workspace (for non-owners only)"""
    try:
        # Check if user is the workspace owner
        workspace_check = supabase_admin.table("workspaces").select("user_id").eq("id", workspace_id).execute()
        if not workspace_check.data:
            raise HTTPException(status_code=404, detail="Workspace not found")
        
        is_owner = workspace_check.data[0].get("user_id") == user_id
        
        # Owner cannot leave their own workspace
        if is_owner:
            raise HTTPException(status_code=400, detail="Workspace owner cannot leave. Transfer ownership or delete the workspace instead.")
        
        # Check if user is a member
        member_check = supabase_admin.table("workspace_members").select("id, role").eq("workspace_id", workspace_id).eq("user_id", user_id).execute()
        if not member_check.data:
            raise HTTPException(status_code=404, detail="You are not a member of this workspace")
        
        # Remove the member
        supabase_admin.table("workspace_members").delete().eq("workspace_id", workspace_id).eq("user_id", user_id).execute()
        
        return {"message": "Successfully left the workspace"}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error leaving workspace: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================
# INVITATION ENDPOINTS
# ============================================

@router.get("/{workspace_id}/invitations")
async def get_workspace_invitations(
    workspace_id: str,
    status: Optional[str] = None,
    user_id: str = Depends(get_current_user)
):
    """Get all pending invitations for a workspace"""
    try:
        # Check if user is workspace owner
        workspace_check = supabase_admin.table("workspaces").select("user_id").eq("id", workspace_id).execute()
        
        if not workspace_check.data:
            raise HTTPException(status_code=404, detail="Workspace not found")
        
        is_owner = workspace_check.data[0].get("user_id") == user_id
        
        # If not owner, check if admin member
        is_admin = False
        if not is_owner:
            member_check = supabase_admin.table("workspace_members").select("role").eq("workspace_id", workspace_id).eq("user_id", user_id).execute()
            is_admin = member_check.data and member_check.data[0]["role"] in ["owner", "admin"]
        
        if not is_owner and not is_admin:
            raise HTTPException(status_code=403, detail="Not authorized to view invitations")
        
        query = supabase_admin.table("workspace_invitations").select("*").eq("workspace_id", workspace_id)
        
        if status:
            query = query.eq("status", status)
        
        response = query.order("created_at", desc=True).execute()
        return response.data or []
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error getting invitations: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{workspace_id}/invitations")
async def invite_member(
    workspace_id: str,
    invite: InviteMemberRequest,
    user_id: str = Depends(get_current_user)
):
    """Send an invitation to join the workspace"""
    try:
        # Verify user is owner or admin
        member_check = supabase_admin.table("workspace_members").select("role").eq("workspace_id", workspace_id).eq("user_id", user_id).execute()
        
        workspace_check = supabase_admin.table("workspaces").select("user_id, name").eq("id", workspace_id).execute()
        is_owner = workspace_check.data and workspace_check.data[0].get("user_id") == user_id
        workspace_name = workspace_check.data[0].get("name") if workspace_check.data else "Unknown"
        
        if not is_owner and (not member_check.data or member_check.data[0]["role"] not in ["owner", "admin"]):
            raise HTTPException(status_code=403, detail="Not authorized to invite members")
        
        # Check if user exists by looking up in auth.users via a different method
        # Use the user_settings table or try to find user by email
        target_user_id = None
        
        # Try to find user by email in user_settings (if they have settings)
        user_by_email = supabase_admin.rpc('get_user_id_by_email', {'user_email': invite.email}).execute()
        if user_by_email.data:
            target_user_id = user_by_email.data
        
        # If not found via RPC, try listing users (with proper handling)
        if not target_user_id:
            try:
                users_response = supabase_admin.auth.admin.list_users()
                # Handle both list and paginated response
                users_list = users_response if isinstance(users_response, list) else getattr(users_response, 'users', [])
                for u in users_list:
                    if hasattr(u, 'email') and u.email and u.email.lower() == invite.email.lower():
                        target_user_id = u.id
                        break
            except Exception as e:
                print(f"Error listing users: {e}")
        
        if target_user_id:
            existing_member = supabase_admin.table("workspace_members").select("id").eq("workspace_id", workspace_id).eq("user_id", target_user_id).execute()
            if existing_member.data:
                raise HTTPException(status_code=400, detail="User is already a member of this workspace")
        
        # Check for existing pending invitation
        existing_invite = supabase_admin.table("workspace_invitations").select("id").eq("workspace_id", workspace_id).eq("email", invite.email).eq("status", "pending").execute()
        if existing_invite.data:
            raise HTTPException(status_code=400, detail="An invitation is already pending for this email")
        
        # Create invitation
        import secrets
        token = secrets.token_urlsafe(32)
        
        invitation_data = {
            "workspace_id": workspace_id,
            "email": invite.email,
            "role": invite.role,
            "invited_by": user_id,
            "token": token,
            "status": "pending",
            "expires_at": (datetime.utcnow() + timedelta(days=7)).isoformat()
        }
        
        response = supabase_admin.table("workspace_invitations").insert(invitation_data).execute()
        
        if not response.data:
            raise HTTPException(status_code=500, detail="Failed to create invitation")
        
        invitation = response.data[0]
        
        # Create notification for the invited user if they exist
        if target_user_id:
            # Get inviter's name
            inviter_settings = supabase_admin.table("user_settings").select("full_name").eq("user_id", user_id).execute()
            inviter_name = inviter_settings.data[0].get("full_name") if inviter_settings.data else "Someone"
            
            notification_data = {
                "user_id": target_user_id,
                "title": "Workspace Invitation",
                "message": f"{inviter_name} invited you to join '{workspace_name}'",
                "type": "info",
                "link": f"/invitation/{token}",
                "link_label": "View Invitation",
                "icon": "users",
                "metadata": {
                    "invitation_id": invitation["id"],
                    "workspace_name": workspace_name,
                    "role": invite.role,
                    "token": token
                }
            }
            
            try:
                notif_response = supabase_admin.table("notifications").insert(notification_data).execute()
                print(f"Notification created: {notif_response.data}")
            except Exception as notif_error:
                print(f"Failed to create notification: {notif_error}")
        
        return {
            "id": invitation["id"],
            "email": invite.email,
            "role": invite.role,
            "status": "pending",
            "token": token,
            "message": f"Invitation sent to {invite.email}",
            "user_found": target_user_id is not None
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error inviting member: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{workspace_id}/invitations/{invitation_id}")
async def cancel_invitation(
    workspace_id: str,
    invitation_id: str,
    user_id: str = Depends(get_current_user)
):
    """Cancel a pending invitation"""
    try:
        # Verify user is owner or admin
        member_check = supabase_admin.table("workspace_members").select("role").eq("workspace_id", workspace_id).eq("user_id", user_id).execute()
        
        workspace_check = supabase_admin.table("workspaces").select("user_id").eq("id", workspace_id).execute()
        is_owner = workspace_check.data and workspace_check.data[0].get("user_id") == user_id
        
        if not is_owner and (not member_check.data or member_check.data[0]["role"] not in ["owner", "admin"]):
            raise HTTPException(status_code=403, detail="Not authorized to cancel invitations")
        
        # Delete the invitation
        response = supabase_admin.table("workspace_invitations").delete().eq("id", invitation_id).eq("workspace_id", workspace_id).execute()
        
        return {"message": "Invitation cancelled"}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error cancelling invitation: {e}")
        raise HTTPException(status_code=500, detail=str(e))
