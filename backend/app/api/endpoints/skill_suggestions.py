"""
Skill Suggestions API - User approval workflow for skill modifications
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional, Dict
from app.core.supabase import supabase_admin
from app.api.dependencies import get_current_user
from app.services.skill_authority import skill_authority, ChangeType, RiskLevel

router = APIRouter()


class CreateSuggestionRequest(BaseModel):
    skill_id: str
    change_type: str  # Will be converted to ChangeType enum
    target_type: str  # page, task
    target_id: str
    description: str
    why: str
    payload: Dict
    workspace_id: str


class SuggestionResponse(BaseModel):
    id: str
    skill_id: str
    skill_name: str
    suggestion_type: str
    target_type: str
    target_id: str
    description: str
    why: str
    risk_level: str
    requires_approval: bool
    reversible: bool
    confidence: float
    approved: bool
    rejected: bool
    ignored: bool
    executed: bool
    created_at: str


@router.get("/pending")
async def get_pending_suggestions(
    workspace_id: str,
    user_id: str = Depends(get_current_user)
):
    """Get all pending suggestions for a workspace"""
    try:
        # Check workspace access
        from app.api.helpers import check_workspace_access
        access = await check_workspace_access(user_id, workspace_id)
        
        if not access["has_access"]:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        # Get pending suggestions
        response = supabase_admin.table("skill_suggestions")\
            .select("*")\
            .eq("workspace_id", workspace_id)\
            .eq("approved", False)\
            .eq("rejected", False)\
            .eq("ignored", False)\
            .order("created_at", desc=True)\
            .execute()
        
        return response.data
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/history")
async def get_suggestion_history(
    workspace_id: str,
    skill_id: Optional[str] = None,
    limit: int = 50,
    user_id: str = Depends(get_current_user)
):
    """Get suggestion history (approved/rejected/ignored)"""
    try:
        # Check workspace access
        from app.api.helpers import check_workspace_access
        access = await check_workspace_access(user_id, workspace_id)
        
        if not access["has_access"]:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        # Build query
        query = supabase_admin.table("skill_suggestions")\
            .select("*")\
            .eq("workspace_id", workspace_id)
        
        if skill_id:
            query = query.eq("skill_id", skill_id)
        
        # Get suggestions that have been acted upon
        query = query.or_("approved.eq.true,rejected.eq.true,ignored.eq.true")
        
        response = query.order("created_at", desc=True)\
            .limit(limit)\
            .execute()
        
        return response.data
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{suggestion_id}/approve")
async def approve_suggestion(
    suggestion_id: str,
    user_id: str = Depends(get_current_user)
):
    """Approve and execute a skill suggestion"""
    try:
        # Get suggestion to check workspace access
        suggestion = supabase_admin.table("skill_suggestions")\
            .select("workspace_id")\
            .eq("id", suggestion_id)\
            .single()\
            .execute()
        
        if not suggestion.data:
            raise HTTPException(status_code=404, detail="Suggestion not found")
        
        # Check workspace access
        from app.api.helpers import check_workspace_access
        access = await check_workspace_access(user_id, suggestion.data["workspace_id"])
        
        if not access["has_access"]:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        # Approve and execute
        success, result = await skill_authority.approve_suggestion(
            suggestion_id,
            user_id
        )
        
        if not success:
            raise HTTPException(status_code=500, detail="Failed to execute suggestion")
        
        return {
            "success": True,
            "message": "Suggestion approved and executed",
            "result": result
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{suggestion_id}/reject")
async def reject_suggestion(
    suggestion_id: str,
    user_id: str = Depends(get_current_user)
):
    """Reject a skill suggestion"""
    try:
        # Get suggestion to check workspace access
        suggestion = supabase_admin.table("skill_suggestions")\
            .select("workspace_id")\
            .eq("id", suggestion_id)\
            .single()\
            .execute()
        
        if not suggestion.data:
            raise HTTPException(status_code=404, detail="Suggestion not found")
        
        # Check workspace access
        from app.api.helpers import check_workspace_access
        access = await check_workspace_access(user_id, suggestion.data["workspace_id"])
        
        if not access["has_access"]:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        # Reject
        success = await skill_authority.reject_suggestion(
            suggestion_id,
            user_id
        )
        
        if not success:
            raise HTTPException(status_code=500, detail="Failed to reject suggestion")
        
        return {
            "success": True,
            "message": "Suggestion rejected"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{suggestion_id}/ignore")
async def ignore_suggestion(
    suggestion_id: str,
    user_id: str = Depends(get_current_user)
):
    """Ignore a skill suggestion (tracks for suppression)"""
    try:
        # Get suggestion to check workspace access
        suggestion = supabase_admin.table("skill_suggestions")\
            .select("workspace_id")\
            .eq("id", suggestion_id)\
            .single()\
            .execute()
        
        if not suggestion.data:
            raise HTTPException(status_code=404, detail="Suggestion not found")
        
        # Check workspace access
        from app.api.helpers import check_workspace_access
        access = await check_workspace_access(user_id, suggestion.data["workspace_id"])
        
        if not access["has_access"]:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        # Ignore
        success = await skill_authority.ignore_suggestion(suggestion_id)
        
        if not success:
            raise HTTPException(status_code=500, detail="Failed to ignore suggestion")
        
        return {
            "success": True,
            "message": "Suggestion ignored"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats")
async def get_suggestion_stats(
    workspace_id: str,
    skill_id: Optional[str] = None,
    user_id: str = Depends(get_current_user)
):
    """Get suggestion statistics for a workspace or skill"""
    try:
        # Check workspace access
        from app.api.helpers import check_workspace_access
        access = await check_workspace_access(user_id, workspace_id)
        
        if not access["has_access"]:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        # Build base query
        query = supabase_admin.table("skill_suggestions")\
            .select("*")\
            .eq("workspace_id", workspace_id)
        
        if skill_id:
            query = query.eq("skill_id", skill_id)
        
        all_suggestions = query.execute()
        
        # Calculate stats
        total = len(all_suggestions.data or [])
        approved = len([s for s in all_suggestions.data if s.get("approved")])
        rejected = len([s for s in all_suggestions.data if s.get("rejected")])
        ignored = len([s for s in all_suggestions.data if s.get("ignored")])
        pending = total - approved - rejected - ignored
        
        # Acceptance rate
        acceptance_rate = (approved / total * 100) if total > 0 else 0
        
        # By risk level
        by_risk = {}
        for s in all_suggestions.data or []:
            risk = s.get("risk_level", "unknown")
            by_risk[risk] = by_risk.get(risk, 0) + 1
        
        # By suggestion type
        by_type = {}
        for s in all_suggestions.data or []:
            stype = s.get("suggestion_type", "unknown")
            by_type[stype] = by_type.get(stype, 0) + 1
        
        return {
            "total": total,
            "approved": approved,
            "rejected": rejected,
            "ignored": ignored,
            "pending": pending,
            "acceptance_rate": round(acceptance_rate, 1),
            "by_risk_level": by_risk,
            "by_suggestion_type": by_type
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/skill/{skill_id}/performance")
async def get_skill_suggestion_performance(
    skill_id: str,
    workspace_id: str,
    user_id: str = Depends(get_current_user)
):
    """Get performance metrics for a specific skill's suggestions"""
    try:
        # Check workspace access
        from app.api.helpers import check_workspace_access
        access = await check_workspace_access(user_id, workspace_id)
        
        if not access["has_access"]:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        # Get skill suggestions
        suggestions = supabase_admin.table("skill_suggestions")\
            .select("*")\
            .eq("skill_id", skill_id)\
            .eq("workspace_id", workspace_id)\
            .execute()
        
        # Get skill feedback
        feedback = supabase_admin.table("skill_feedback")\
            .select("*")\
            .eq("skill_id", skill_id)\
            .eq("workspace_id", workspace_id)\
            .execute()
        
        total = len(suggestions.data or [])
        approved = len([s for s in suggestions.data if s.get("approved")])
        rejected = len([s for s in suggestions.data if s.get("rejected")])
        ignored = len([s for s in suggestions.data if s.get("ignored")])
        
        # Calculate confidence impact
        total_confidence_delta = sum(
            f.get("confidence_delta", 0) for f in feedback.data or []
        )
        
        # Recent trend (last 7 days)
        from datetime import datetime, timedelta
        week_ago = (datetime.utcnow() - timedelta(days=7)).isoformat()
        recent = [s for s in suggestions.data or [] 
                 if s.get("created_at", "") >= week_ago]
        recent_approved = len([s for s in recent if s.get("approved")])
        recent_total = len(recent)
        recent_acceptance = (recent_approved / recent_total * 100) if recent_total > 0 else 0
        
        return {
            "skill_id": skill_id,
            "total_suggestions": total,
            "approved": approved,
            "rejected": rejected,
            "ignored": ignored,
            "acceptance_rate": round((approved / total * 100) if total > 0 else 0, 1),
            "total_confidence_impact": round(total_confidence_delta, 2),
            "recent_7_days": {
                "total": recent_total,
                "approved": recent_approved,
                "acceptance_rate": round(recent_acceptance, 1)
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
