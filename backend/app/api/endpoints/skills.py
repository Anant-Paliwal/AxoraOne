from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from app.core.supabase import supabase_admin
from app.api.dependencies import get_current_user

router = APIRouter()

def _generate_activation_signals(category: str) -> List[str]:
    """Auto-generate activation signals based on skill category"""
    signal_map = {
        "planning": ["oversized_task", "no_subtasks", "task_blocked"],
        "execution": ["task_delayed", "deadline_pressure", "task_blocked"],
        "learning": ["page_created", "page_edited", "page_neglected"],
        "decision": ["task_blocked", "deadline_pressure"],
        "research": ["page_created", "page_neglected"],
        "startup": ["task_delayed", "oversized_task", "deadline_pressure"]
    }
    return signal_map.get(category, ["page_created", "task_completed"])

class SkillCreate(BaseModel):
    name: str
    level: str = "Beginner"
    description: str = ""
    evidence: List[str] = []
    goals: List[str] = []
    workspace_id: Optional[str] = None
    skill_type: str = "learning"  # learning, research, creation, analysis, practice
    linked_skills: List[str] = []
    prerequisite_skills: List[str] = []
    
    # Advanced Intelligence OS fields
    category: str = "learning"  # planning, execution, learning, decision, research, startup
    purpose: str = ""  # User-written purpose
    goal_type: List[str] = ["clarity"]  # speed, clarity, quality, focus, execution
    scope: str = "workspace"  # page, workspace
    # Auto-generated fields (set by system, not user)
    # evidence_sources, activation_signals, suggestion_types, authority_level, memory_scope
    # compatible_skills, conflicting_skills, confidence, status

class SkillUpdate(BaseModel):
    name: Optional[str] = None
    level: Optional[str] = None
    description: Optional[str] = None
    evidence: Optional[List[str]] = None
    goals: Optional[List[str]] = None
    workspace_id: Optional[str] = None
    skill_type: Optional[str] = None
    linked_skills: Optional[List[str]] = None
    prerequisite_skills: Optional[List[str]] = None

class SkillExecutionCreate(BaseModel):
    trigger_source: str = "manual"  # manual, ask_anything, task, chain
    input_context: dict = {}
    output_type: Optional[str] = None  # page, task, quiz, flashcards, insight
    output_id: Optional[str] = None

class SkillEvidenceCreate(BaseModel):
    page_id: str
    evidence_type: str = "page"
    notes: str = ""

@router.get("")
async def get_skills(workspace_id: Optional[str] = None, user_id: str = Depends(get_current_user)):
    """Get all skills for a workspace (owner or member)"""
    try:
        # If workspace_id provided, check access and get all workspace skills
        if workspace_id:
            from app.api.helpers import check_workspace_access
            access = await check_workspace_access(user_id, workspace_id)
            
            if not access["has_access"]:
                raise HTTPException(status_code=403, detail="Not authorized to access this workspace")
            
            # Get all skills in workspace (not filtered by user_id)
            query = supabase_admin.table("skills").select("*").eq("workspace_id", workspace_id)
        else:
            # No workspace specified, get user's own skills
            query = supabase_admin.table("skills").select("*").eq("user_id", user_id)
        
        response = query.execute()
        skills = response.data
        
        # Get evidence for each skill
        for skill in skills:
            evidence_response = supabase_admin.table("skill_evidence")\
                .select("*, pages(id, title, icon)")\
                .eq("skill_id", skill["id"])\
                .execute()
            skill["linked_evidence"] = evidence_response.data
        
        return skills
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("")
async def create_skill(skill: SkillCreate, user_id: str = Depends(get_current_user)):
    """Create a new skill"""
    try:
        # Validate workspace access if provided (owner OR member)
        if skill.workspace_id:
            from app.api.helpers.workspace_access import check_workspace_access, can_edit
            access = await check_workspace_access(user_id, skill.workspace_id)
            
            if not access["has_access"]:
                raise HTTPException(status_code=404, detail="Workspace not found")
            
            # Check if user can edit (member, admin, or owner)
            if not can_edit(access["role"]):
                raise HTTPException(status_code=403, detail="You don't have permission to create skills in this workspace")
            
            # ✅ CHECK SUBSCRIPTION LIMIT (User-level)
            from app.services.user_subscription_service import UserSubscriptionService
            user_sub_service = UserSubscriptionService(supabase_admin)
            
            # Check user-level limit for skills
            await user_sub_service.enforce_user_limit(user_id, "max_skills", 1)
        
        # Build insert data, excluding fields that might not exist in the table
        insert_data = {
            "user_id": user_id,
            "name": skill.name,
            "level": skill.level,
            "description": skill.description,
        }
        
        # Only add optional fields if they have values
        if skill.workspace_id:
            insert_data["workspace_id"] = skill.workspace_id
        if skill.goals:
            insert_data["goals"] = skill.goals
        if skill.skill_type:
            insert_data["skill_type"] = skill.skill_type
        if skill.linked_skills:
            insert_data["linked_skills"] = skill.linked_skills
        if skill.prerequisite_skills:
            insert_data["prerequisite_skills"] = skill.prerequisite_skills
        
        # Advanced Intelligence OS fields
        insert_data["category"] = skill.category
        insert_data["purpose"] = skill.purpose or skill.description
        insert_data["goal_type"] = skill.goal_type
        insert_data["scope"] = skill.scope
        
        # Auto-generate activation signals based on category
        activation_signals = self._generate_activation_signals(skill.category)
        insert_data["activation_signals"] = activation_signals
        
        # Auto-generate evidence sources
        insert_data["evidence_sources"] = {
            "pages": True,
            "tasks": True,
            "calendar": False
        }
        
        # Set defaults for other fields
        insert_data["authority_level"] = "suggest"
        insert_data["memory_scope"] = skill.scope
        insert_data["confidence"] = 0.3
        insert_data["status"] = "learning"
        
        # Note: 'evidence' field is handled separately via skill_evidence table
        # Don't include it in the skills table insert
        
        print(f"Creating skill with data: {insert_data}")
        
        response = supabase_admin.table("skills").insert(insert_data).execute()
        
        if not response.data:
            raise HTTPException(status_code=500, detail="Failed to create skill - no data returned")
        
        # ✅ Increment user skill usage after successful creation
        if skill.workspace_id:
            try:
                await user_sub_service.increment_user_usage(user_id, "max_skills", 1)
            except Exception as usage_error:
                print(f"Warning: Failed to increment usage (non-fatal): {usage_error}")
            
        return response.data[0]
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error creating skill: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/{skill_id}")
async def update_skill(skill_id: str, skill: SkillUpdate, user_id: str = Depends(get_current_user)):
    """Update a skill"""
    try:
        print(f"Updating skill {skill_id} for user {user_id}")
        print(f"Update data: {skill.dict()}")
        
        # Get the skill to check workspace access
        skill_check = supabase_admin.table("skills").select("id, user_id, workspace_id").eq("id", skill_id).execute()
        if not skill_check.data:
            raise HTTPException(status_code=404, detail="Skill not found")
        
        existing_skill = skill_check.data[0]
        
        # Check if user owns skill OR has workspace access
        if existing_skill.get("user_id") != user_id:
            if existing_skill.get("workspace_id"):
                from app.api.helpers.workspace_access import check_workspace_access, can_edit
                access = await check_workspace_access(user_id, existing_skill["workspace_id"])
                if not access["has_access"] or not can_edit(access["role"]):
                    raise HTTPException(status_code=403, detail="Not authorized to update this skill")
            else:
                raise HTTPException(status_code=403, detail="Not authorized to update this skill")
        
        update_data = {k: v for k, v in skill.dict().items() if v is not None}
        print(f"Filtered update data: {update_data}")
        
        # Temporarily remove evidence from update to avoid trigger issues
        # Evidence should be managed through the skill_evidence table instead
        if 'evidence' in update_data:
            print(f"Removing evidence from update (use skill_evidence table instead)")
            del update_data['evidence']
        
        response = supabase_admin.table("skills").update(update_data).eq("id", skill_id).execute()
        
        print(f"Supabase response: {response}")
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Skill not found")
        return response.data[0]
    except HTTPException:
        raise
    except Exception as e:
        print(f"ERROR updating skill: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{skill_id}")
async def delete_skill(skill_id: str, user_id: str = Depends(get_current_user)):
    """Delete a skill"""
    try:
        # Get the skill to check workspace access
        skill_check = supabase_admin.table("skills").select("id, user_id, workspace_id").eq("id", skill_id).execute()
        if not skill_check.data:
            raise HTTPException(status_code=404, detail="Skill not found")
        
        existing_skill = skill_check.data[0]
        
        # Check if user owns skill OR is workspace admin/owner
        if existing_skill.get("user_id") != user_id:
            if existing_skill.get("workspace_id"):
                from app.api.helpers.workspace_access import check_workspace_access, can_admin
                access = await check_workspace_access(user_id, existing_skill["workspace_id"])
                if not access["has_access"] or not can_admin(access["role"]):
                    raise HTTPException(status_code=403, detail="Not authorized to delete this skill")
            else:
                raise HTTPException(status_code=403, detail="Not authorized to delete this skill")
        
        response = supabase_admin.table("skills").delete().eq("id", skill_id).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Skill not found")
        return {"message": "Skill deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{skill_id}/evidence")
async def add_skill_evidence(skill_id: str, evidence: SkillEvidenceCreate, user_id: str = Depends(get_current_user)):
    """Add evidence (page/quiz) to a skill"""
    try:
        # Verify skill belongs to user and get workspace_id
        skill_response = supabase_admin.table("skills").select("id, workspace_id").eq("id", skill_id).eq("user_id", user_id).execute()
        if not skill_response.data:
            raise HTTPException(status_code=404, detail="Skill not found")
        
        skill_data = skill_response.data[0]
        workspace_id = skill_data.get("workspace_id")
        
        # Add evidence
        response = supabase_admin.table("skill_evidence").insert({
            "skill_id": skill_id,
            "page_id": evidence.page_id,
            "user_id": user_id,
            "evidence_type": evidence.evidence_type,
            "notes": evidence.notes
        }).execute()
        
        # Track contribution - page linked to skill
        if workspace_id:
            try:
                import uuid
                supabase_admin.table("skill_contributions").insert({
                    "id": str(uuid.uuid4()),
                    "skill_id": skill_id,
                    "workspace_id": workspace_id,
                    "contribution_type": "page_linked",
                    "target_id": evidence.page_id,
                    "target_type": "page",
                    "impact_score": 0.15,  # 15% progress for linking a page
                    "metadata": {
                        "evidence_type": evidence.evidence_type,
                        "notes": evidence.notes
                    }
                }).execute()
                print(f"✅ Contribution tracked: page_linked to skill {skill_id}")
            except Exception as contrib_error:
                print(f"⚠️ Failed to track contribution (non-fatal): {contrib_error}")
        
        return response.data[0]
    except Exception as e:
        if "duplicate key" in str(e).lower():
            raise HTTPException(status_code=400, detail="This page is already linked to this skill")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{skill_id}/evidence/{evidence_id}")
async def remove_skill_evidence(skill_id: str, evidence_id: str, user_id: str = Depends(get_current_user)):
    """Remove evidence from a skill"""
    try:
        response = supabase_admin.table("skill_evidence")\
            .delete()\
            .eq("id", evidence_id)\
            .eq("skill_id", skill_id)\
            .eq("user_id", user_id)\
            .execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Evidence not found")
        
        return {"message": "Evidence removed successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================
# SKILL CHAINING & EXECUTION ENDPOINTS
# ============================================

@router.get("/{skill_id}/suggested-next")
async def get_suggested_next_skills(skill_id: str, workspace_id: Optional[str] = None, user_id: str = Depends(get_current_user)):
    """Get suggested next skills after completing this skill (skill chaining)"""
    try:
        # Get the current skill
        skill_response = supabase_admin.table("skills").select("*").eq("id", skill_id).eq("user_id", user_id).execute()
        if not skill_response.data:
            raise HTTPException(status_code=404, detail="Skill not found")
        
        current_skill = skill_response.data[0]
        suggestions = []
        
        # 1. Get explicitly linked skills
        linked_skill_ids = current_skill.get("linked_skills") or []
        if linked_skill_ids:
            linked_response = supabase_admin.table("skills")\
                .select("id, name, level, description, skill_type")\
                .in_("id", linked_skill_ids)\
                .eq("user_id", user_id)\
                .execute()
            for skill in linked_response.data or []:
                suggestions.append({
                    **skill,
                    "reason": "Linked skill",
                    "priority": 1
                })
        
        # 2. Get skills that have this skill as prerequisite (natural progression)
        progression_response = supabase_admin.table("skills")\
            .select("id, name, level, description, skill_type, prerequisite_skills")\
            .eq("user_id", user_id)\
            .execute()
        
        for skill in progression_response.data or []:
            prereqs = skill.get("prerequisite_skills") or []
            if skill_id in prereqs and skill["id"] not in [s["id"] for s in suggestions]:
                suggestions.append({
                    "id": skill["id"],
                    "name": skill["name"],
                    "level": skill["level"],
                    "description": skill.get("description"),
                    "skill_type": skill.get("skill_type"),
                    "reason": "Natural progression",
                    "priority": 2
                })
        
        # 3. Get skills of same type at next level
        current_level = current_skill.get("level", "Beginner")
        current_type = current_skill.get("skill_type", "learning")
        next_level_map = {
            "Beginner": "Intermediate",
            "Intermediate": "Advanced",
            "Advanced": "Expert"
        }
        next_level = next_level_map.get(current_level)
        
        if next_level and current_type:
            same_type_query = supabase_admin.table("skills")\
                .select("id, name, level, description, skill_type")\
                .eq("user_id", user_id)\
                .eq("skill_type", current_type)\
                .eq("level", next_level)\
                .neq("id", skill_id)
            
            if workspace_id:
                same_type_query = same_type_query.eq("workspace_id", workspace_id)
            
            same_type_response = same_type_query.limit(3).execute()
            
            for skill in same_type_response.data or []:
                if skill["id"] not in [s["id"] for s in suggestions]:
                    suggestions.append({
                        **skill,
                        "reason": f"Same category ({current_type}), higher level",
                        "priority": 3
                    })
        
        # Sort by priority and limit
        suggestions.sort(key=lambda x: x.get("priority", 99))
        
        return {
            "current_skill": {
                "id": current_skill["id"],
                "name": current_skill["name"],
                "level": current_skill["level"]
            },
            "suggested_next": suggestions[:5],
            "message": f"After mastering {current_skill['name']}, consider these skills:"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{skill_id}/execute")
async def execute_skill(skill_id: str, execution: SkillExecutionCreate, workspace_id: Optional[str] = None, user_id: str = Depends(get_current_user)):
    """
    Log a skill execution and get suggested next skills.
    This is called when a user "runs" a skill (manually, from Ask Anything, or from a task).
    Returns suggested next skills for chaining.
    """
    try:
        # Verify skill exists
        skill_response = supabase_admin.table("skills").select("*").eq("id", skill_id).eq("user_id", user_id).execute()
        if not skill_response.data:
            raise HTTPException(status_code=404, detail="Skill not found")
        
        current_skill = skill_response.data[0]
        ws_id = workspace_id or current_skill.get("workspace_id")
        
        # Log the execution
        execution_data = {
            "skill_id": skill_id,
            "user_id": user_id,
            "workspace_id": ws_id,
            "trigger_source": execution.trigger_source,
            "input_context": execution.input_context,
            "output_type": execution.output_type,
            "output_id": execution.output_id,
            "execution_status": "completed"
        }
        
        exec_response = supabase_admin.table("skill_executions").insert(execution_data).execute()
        
        # Get suggested next skills
        suggestions_response = await get_suggested_next_skills(skill_id, ws_id, user_id)
        
        # Update execution with suggested skill IDs
        suggested_ids = [s["id"] for s in suggestions_response.get("suggested_next", [])]
        if exec_response.data and suggested_ids:
            supabase_admin.table("skill_executions")\
                .update({"suggested_next_skills": suggested_ids})\
                .eq("id", exec_response.data[0]["id"])\
                .execute()
        
        return {
            "execution_id": exec_response.data[0]["id"] if exec_response.data else None,
            "skill_executed": {
                "id": current_skill["id"],
                "name": current_skill["name"]
            },
            "output": {
                "type": execution.output_type,
                "id": execution.output_id
            } if execution.output_type else None,
            "suggested_next": suggestions_response.get("suggested_next", []),
            "chain_prompt": f"After {current_skill['name']}, would you like to continue with one of these skills?"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{skill_id}/link/{target_skill_id}")
async def link_skills(skill_id: str, target_skill_id: str, user_id: str = Depends(get_current_user)):
    """Link two skills together for chaining suggestions"""
    try:
        # Verify both skills exist and belong to user
        source_response = supabase_admin.table("skills").select("id, linked_skills").eq("id", skill_id).eq("user_id", user_id).execute()
        target_response = supabase_admin.table("skills").select("id").eq("id", target_skill_id).eq("user_id", user_id).execute()
        
        if not source_response.data:
            raise HTTPException(status_code=404, detail="Source skill not found")
        if not target_response.data:
            raise HTTPException(status_code=404, detail="Target skill not found")
        
        # Add to linked_skills array
        current_linked = source_response.data[0].get("linked_skills") or []
        if target_skill_id not in current_linked:
            current_linked.append(target_skill_id)
            supabase_admin.table("skills")\
                .update({"linked_skills": current_linked})\
                .eq("id", skill_id)\
                .eq("user_id", user_id)\
                .execute()
        
        return {"message": "Skills linked successfully", "linked_skills": current_linked}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{skill_id}/link/{target_skill_id}")
async def unlink_skills(skill_id: str, target_skill_id: str, user_id: str = Depends(get_current_user)):
    """Remove link between two skills"""
    try:
        source_response = supabase_admin.table("skills").select("id, linked_skills").eq("id", skill_id).eq("user_id", user_id).execute()
        
        if not source_response.data:
            raise HTTPException(status_code=404, detail="Skill not found")
        
        current_linked = source_response.data[0].get("linked_skills") or []
        if target_skill_id in current_linked:
            current_linked.remove(target_skill_id)
            supabase_admin.table("skills")\
                .update({"linked_skills": current_linked})\
                .eq("id", skill_id)\
                .eq("user_id", user_id)\
                .execute()
        
        return {"message": "Skills unlinked successfully", "linked_skills": current_linked}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{skill_id}/executions")
async def get_skill_executions(skill_id: str, limit: int = 10, user_id: str = Depends(get_current_user)):
    """Get execution history for a skill"""
    try:
        response = supabase_admin.table("skill_executions")\
            .select("*")\
            .eq("skill_id", skill_id)\
            .eq("user_id", user_id)\
            .order("executed_at", desc=True)\
            .limit(limit)\
            .execute()
        
        return response.data or []
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
