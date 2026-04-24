"""
Intelligence API Endpoints - Exposes the Living Intelligence Engine
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime
from app.core.supabase import supabase_admin
from app.api.dependencies import get_current_user
from app.services.intelligence_engine import intelligence_engine, SignalType, Signal

router = APIRouter()

class SignalCreate(BaseModel):
    signal_type: str
    source_id: str
    source_type: str
    data: Dict[str, Any] = {}
    priority: int = 5

class ActionResponse(BaseModel):
    action_id: str
    action_type: str
    reason: str
    payload: Dict[str, Any]

class InsightResponse(BaseModel):
    id: str
    insight_type: str
    title: str
    description: str
    severity: str
    suggested_actions: List[Dict[str, Any]]
    created_at: str

# ==================== INSIGHTS ====================

@router.get("/insights")
async def get_insights(
    workspace_id: str,
    dismissed: bool = False,
    limit: int = 20,
    user_id: str = Depends(get_current_user)
):
    """Get active insights for a workspace"""
    try:
        query = supabase_admin.table("insights")\
            .select("*")\
            .eq("workspace_id", workspace_id)\
            .eq("dismissed", dismissed)\
            .order("created_at", desc=True)\
            .limit(limit)
        
        response = query.execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/insights/{insight_id}/dismiss")
async def dismiss_insight(
    insight_id: str,
    user_id: str = Depends(get_current_user)
):
    """Dismiss an insight"""
    try:
        supabase_admin.table("insights")\
            .update({"dismissed": True})\
            .eq("id", insight_id)\
            .execute()
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/insights/{insight_id}/act")
async def act_on_insight(
    insight_id: str,
    action_index: int = 0,
    user_id: str = Depends(get_current_user)
):
    """Act on a suggested action from an insight"""
    try:
        # Get insight
        insight = supabase_admin.table("insights")\
            .select("*")\
            .eq("id", insight_id)\
            .single()\
            .execute()
        
        if not insight.data:
            raise HTTPException(status_code=404, detail="Insight not found")
        
        actions = insight.data.get("suggested_actions", [])
        if action_index >= len(actions):
            raise HTTPException(status_code=400, detail="Invalid action index")
        
        action = actions[action_index]
        
        # Mark as acted upon
        supabase_admin.table("insights")\
            .update({"acted_upon": True})\
            .eq("id", insight_id)\
            .execute()
        
        return {"success": True, "action": action}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==================== PROPOSED ACTIONS ====================

@router.get("/actions/proposed")
async def get_proposed_actions(
    workspace_id: str,
    executed: bool = False,
    limit: int = 20,
    user_id: str = Depends(get_current_user)
):
    """Get proposed actions awaiting approval"""
    try:
        response = supabase_admin.table("proposed_actions")\
            .select("*")\
            .eq("workspace_id", workspace_id)\
            .eq("executed", executed)\
            .order("created_at", desc=True)\
            .limit(limit)\
            .execute()
        
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/actions/{action_id}/approve")
async def approve_action(
    action_id: str,
    user_id: str = Depends(get_current_user)
):
    """Approve and execute a proposed action"""
    try:
        # Get action
        action = supabase_admin.table("proposed_actions")\
            .select("*")\
            .eq("id", action_id)\
            .single()\
            .execute()
        
        if not action.data:
            raise HTTPException(status_code=404, detail="Action not found")
        
        action_data = action.data
        
        # Execute based on action type
        result = await _execute_action(action_data, user_id)
        
        # Mark as executed
        supabase_admin.table("proposed_actions")\
            .update({"executed": True, "executed_at": datetime.utcnow().isoformat()})\
            .eq("id", action_id)\
            .execute()
        
        # Trigger skill learning if action was proposed by a skill
        if action_data.get("source_skill_id"):
            try:
                from app.services.skill_agent import get_skill_manager
                manager = get_skill_manager(action_data["workspace_id"])
                await manager.evaluate_and_learn(action_id, action_data["source_skill_id"])
            except Exception as learn_error:
                print(f"Skill learning error (non-fatal): {learn_error}")
        
        return {"success": True, "result": result}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/actions/{action_id}/reject")
async def reject_action(
    action_id: str,
    user_id: str = Depends(get_current_user)
):
    """Reject a proposed action"""
    try:
        # Get action first to check for source skill
        action = supabase_admin.table("proposed_actions")\
            .select("workspace_id, source_skill_id")\
            .eq("id", action_id)\
            .single()\
            .execute()
        
        action_data = action.data if action.data else {}
        
        # Mark as rejected
        supabase_admin.table("proposed_actions")\
            .update({"rejected": True, "rejected_at": datetime.utcnow().isoformat()})\
            .eq("id", action_id)\
            .execute()
        
        # Trigger skill learning if action was proposed by a skill
        if action_data.get("source_skill_id"):
            try:
                from app.services.skill_agent import get_skill_manager
                manager = get_skill_manager(action_data["workspace_id"])
                await manager.evaluate_and_learn(action_id, action_data["source_skill_id"])
            except Exception as learn_error:
                print(f"Skill learning error (non-fatal): {learn_error}")
        
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

async def _execute_action(action_data: Dict, user_id: str) -> Dict:
    """Execute a proposed action"""
    action_type = action_data.get("action_type")
    payload = action_data.get("payload", {})
    workspace_id = action_data.get("workspace_id")
    
    if action_type == "link_page_to_skill":
        # Create skill evidence link
        supabase_admin.table("skill_evidence").insert({
            "skill_id": payload.get("skill_id"),
            "page_id": action_data.get("target_id"),
            "evidence_type": "auto_linked",
            "notes": f"Auto-linked by intelligence engine (confidence: {payload.get('confidence', 0):.0%})"
        }).execute()
        
        # Create graph edge
        supabase_admin.table("graph_edges").insert({
            "source_id": action_data.get("target_id"),
            "target_id": payload.get("skill_id"),
            "source_type": "page",
            "target_type": "skill",
            "edge_type": "evidence",
            "workspace_id": workspace_id
        }).execute()
        
        return {"linked": True, "skill_id": payload.get("skill_id")}
    
    elif action_type == "extract_tasks":
        # This would call AI to extract tasks from page content
        return {"extracted": True, "message": "Task extraction queued"}
    
    elif action_type == "create_task":
        # Create a task
        task_data = {
            "user_id": user_id,
            "workspace_id": workspace_id,
            "title": payload.get("title"),
            "description": payload.get("description", ""),
            "status": "todo",
            "priority": payload.get("priority", "medium"),
            "linked_page_id": payload.get("linked_page_id"),
            "linked_skill_id": payload.get("linked_skill_id"),
            "created_from": "intelligence_engine"
        }
        result = supabase_admin.table("tasks").insert(task_data).execute()
        return {"created": True, "task_id": result.data[0]["id"] if result.data else None}
    
    return {"executed": True}

# ==================== PATTERN ANALYSIS ====================

@router.get("/patterns")
async def analyze_patterns(
    workspace_id: str,
    user_id: str = Depends(get_current_user)
):
    """Analyze workspace patterns and return insights"""
    try:
        patterns = await intelligence_engine.analyze_workspace_patterns(workspace_id, user_id)
        return {"patterns": patterns}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==================== PRIORITY CALCULATION ====================

@router.get("/tasks/{task_id}/priority")
async def get_task_priority(
    task_id: str,
    user_id: str = Depends(get_current_user)
):
    """Get calculated priority for a task"""
    try:
        # Get task
        task = supabase_admin.table("tasks")\
            .select("*")\
            .eq("id", task_id)\
            .single()\
            .execute()
        
        if not task.data:
            raise HTTPException(status_code=404, detail="Task not found")
        
        priority = await intelligence_engine.calculate_task_priority(
            task.data, 
            task.data.get("workspace_id")
        )
        
        return priority
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/tasks/ranked")
async def get_ranked_tasks(
    workspace_id: str,
    limit: int = 20,
    user_id: str = Depends(get_current_user)
):
    """Get tasks ranked by calculated priority"""
    try:
        # Get all active tasks
        tasks = supabase_admin.table("tasks")\
            .select("*")\
            .eq("workspace_id", workspace_id)\
            .in_("status", ["todo", "in-progress"])\
            .execute()
        
        if not tasks.data:
            return []
        
        # Calculate priority for each
        ranked = []
        for task in tasks.data:
            priority = await intelligence_engine.calculate_task_priority(task, workspace_id)
            ranked.append({
                **task,
                "calculated_priority": priority
            })
        
        # Sort by score descending
        ranked.sort(key=lambda x: x["calculated_priority"]["score"], reverse=True)
        
        return ranked[:limit]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==================== SIGNAL EMISSION ====================

@router.post("/signals")
async def emit_signal(
    signal: SignalCreate,
    workspace_id: str,
    user_id: str = Depends(get_current_user)
):
    """Emit a signal to the intelligence engine"""
    try:
        signal_type = SignalType[signal.signal_type.upper()]
        
        await intelligence_engine.emit_signal(Signal(
            type=signal_type,
            source_id=signal.source_id,
            source_type=signal.source_type,
            workspace_id=workspace_id,
            user_id=user_id,
            data=signal.data,
            priority=signal.priority
        ))
        
        return {"success": True, "message": "Signal emitted"}
    except KeyError:
        raise HTTPException(status_code=400, detail=f"Invalid signal type: {signal.signal_type}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==================== HOME INTELLIGENCE ====================

@router.get("/home")
async def get_home_intelligence(
    workspace_id: str,
    user_id: str = Depends(get_current_user)
):
    """Get intelligent home screen data - what matters right now"""
    try:
        from datetime import date
        today = date.today().isoformat()
        
        # 1. High-impact tasks (ranked by calculated priority)
        tasks = supabase_admin.table("tasks")\
            .select("*")\
            .eq("workspace_id", workspace_id)\
            .in_("status", ["todo", "in-progress"])\
            .limit(50)\
            .execute()
        
        ranked_tasks = []
        for task in tasks.data or []:
            try:
                priority = await intelligence_engine.calculate_task_priority(task, workspace_id)
                ranked_tasks.append({**task, "calculated_priority": priority})
            except Exception as task_error:
                print(f"Error calculating priority for task {task.get('id')}: {task_error}")
                # Add task without priority calculation
                ranked_tasks.append({
                    **task, 
                    "calculated_priority": {
                        "score": 2,
                        "factors": {"base": 2},
                        "recommendation": "Medium priority"
                    }
                })
        ranked_tasks.sort(key=lambda x: x["calculated_priority"]["score"], reverse=True)
        
        # 2. Active contexts (recently edited pages)
        try:
            active_pages = supabase_admin.table("pages")\
                .select("id, title, icon, updated_at, tags")\
                .eq("workspace_id", workspace_id)\
                .eq("is_archived", False)\
                .order("updated_at", desc=True)\
                .limit(5)\
                .execute()
            active_pages_data = active_pages.data or []
        except Exception as pages_error:
            print(f"Error fetching pages: {pages_error}")
            active_pages_data = []
        
        # 3. Skill intelligence
        try:
            skills = supabase_admin.table("skills")\
                .select("*")\
                .eq("workspace_id", workspace_id)\
                .execute()
            
            # Categorize skills
            active_skills = [s for s in skills.data or [] if s.get('level') in ['Intermediate', 'Advanced']]
            beginner_skills = [s for s in skills.data or [] if s.get('level') == 'Beginner']
            total_skills = len(skills.data or [])
        except Exception as skills_error:
            print(f"Error fetching skills: {skills_error}")
            active_skills = []
            beginner_skills = []
            total_skills = 0
        
        # 4. Recent insights (may not exist yet)
        try:
            insights = supabase_admin.table("insights")\
                .select("*")\
                .eq("workspace_id", workspace_id)\
                .eq("dismissed", False)\
                .order("created_at", desc=True)\
                .limit(5)\
                .execute()
            insights_data = insights.data or []
        except Exception as insights_error:
            print(f"Insights table not ready: {insights_error}")
            insights_data = []
        
        # 5. Pending actions (may not exist yet)
        try:
            pending_actions = supabase_admin.table("proposed_actions")\
                .select("*")\
                .eq("workspace_id", workspace_id)\
                .eq("executed", False)\
                .order("created_at", desc=True)\
                .limit(5)\
                .execute()
            pending_actions_data = pending_actions.data or []
        except Exception as actions_error:
            print(f"Proposed actions table not ready: {actions_error}")
            pending_actions_data = []
        
        # 6. Pattern analysis
        try:
            patterns = await intelligence_engine.analyze_workspace_patterns(workspace_id, user_id)
        except Exception as patterns_error:
            print(f"Error analyzing patterns: {patterns_error}")
            patterns = []
        
        # 7. Quick stats
        total_tasks = len(tasks.data or [])
        try:
            completed_today = supabase_admin.table("tasks")\
                .select("id", count="exact")\
                .eq("workspace_id", workspace_id)\
                .eq("status", "done")\
                .gte("completed_at", today)\
                .execute()
            completed_count = completed_today.count or 0
        except Exception:
            completed_count = 0
        
        overdue_count = len([t for t in tasks.data or [] 
                           if t.get('due_date') and t['due_date'] < today and t['status'] != 'done'])
        
        return {
            "high_impact_tasks": ranked_tasks[:5],
            "active_contexts": active_pages_data,
            "skill_intelligence": {
                "active": active_skills[:3],
                "needs_attention": beginner_skills[:3],
                "total": total_skills
            },
            "insights": insights_data,
            "pending_actions": pending_actions_data,
            "patterns": patterns,
            "stats": {
                "total_active_tasks": total_tasks,
                "completed_today": completed_count,
                "overdue": overdue_count
            }
        }
    except Exception as e:
        print(f"Error in get_home_intelligence: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

# ==================== SKILL LIFECYCLE ====================

@router.get("/skills/{skill_id}/status")
async def get_skill_agent_status(
    skill_id: str,
    workspace_id: str,
    user_id: str = Depends(get_current_user)
):
    """Get the status of a skill agent including its memory and lifecycle state"""
    try:
        from app.services.skill_agent import get_skill_manager, SkillState
        
        manager = get_skill_manager(workspace_id)
        agent = await manager.get_or_create_agent(skill_id)
        
        # Get skill memory
        memory_data = None
        if agent.memory:
            memory_data = {
                "successful_patterns_count": len(agent.memory.successful_patterns),
                "failed_patterns_count": len(agent.memory.failed_patterns),
                "activation_count": len(agent.memory.activation_history),
                "last_evolved_at": agent.memory.last_evolved_at.isoformat() if agent.memory.last_evolved_at else None,
                "user_preferences": agent.memory.user_preferences,
                "recent_confidence_trend": sum(agent.memory.confidence_adjustments[-10:]) if agent.memory.confidence_adjustments else 0
            }
        
        # Get skill data
        skill_data = supabase_admin.table("skills")\
            .select("name, level, confidence_score, activation_count, last_activated_at, success_rate")\
            .eq("id", skill_id)\
            .single()\
            .execute()
        
        return {
            "skill_id": skill_id,
            "state": agent.state.value,
            "activation_threshold": agent._activation_threshold,
            "skill_data": skill_data.data,
            "memory": memory_data,
            "context": {
                "related_pages": len(agent.context.related_pages) if agent.context else 0,
                "related_tasks": len(agent.context.related_tasks) if agent.context else 0,
                "linked_skills": agent.context.linked_skills if agent.context else [],
                "prerequisite_skills": agent.context.prerequisite_skills if agent.context else []
            } if agent.context else None
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/skills/{skill_id}/activate")
async def manually_activate_skill(
    skill_id: str,
    workspace_id: str,
    user_id: str = Depends(get_current_user)
):
    """Manually trigger a skill's lifecycle to detect patterns and propose actions"""
    try:
        from app.services.skill_agent import get_skill_manager
        
        manager = get_skill_manager(workspace_id)
        agent = await manager.get_or_create_agent(skill_id)
        
        # Run lifecycle with manual trigger signal
        result = await agent.run_lifecycle({
            "signal_type": "manual_activation",
            "source_id": skill_id,
            "source_type": "skill",
            "workspace_id": workspace_id,
            "user_id": user_id,
            "linked_skill_id": skill_id  # Ensure high relevance
        })
        
        return {
            "success": True,
            "activated": result.get("activated", False),
            "patterns_detected": result.get("patterns", []),
            "actions_proposed": result.get("actions_proposed", []),
            "relevance_score": result.get("relevance", 0)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/skills/{skill_id}/evolve")
async def force_skill_evolution(
    skill_id: str,
    workspace_id: str,
    user_id: str = Depends(get_current_user)
):
    """Force a skill to evolve based on accumulated learning"""
    try:
        from app.services.skill_agent import get_skill_manager
        
        manager = get_skill_manager(workspace_id)
        agent = await manager.get_or_create_agent(skill_id)
        
        # Force evolution
        await agent.evolve()
        
        return {
            "success": True,
            "new_activation_threshold": agent._activation_threshold,
            "evolved_at": datetime.utcnow().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/skills/lifecycle-summary")
async def get_skills_lifecycle_summary(
    workspace_id: str,
    user_id: str = Depends(get_current_user)
):
    """Get a summary of all skill agents' lifecycle status in the workspace"""
    try:
        # Get all skills
        skills = supabase_admin.table("skills")\
            .select("id, name, level, confidence_score, activation_count, last_activated_at, success_rate, is_bottleneck")\
            .eq("workspace_id", workspace_id)\
            .execute()
        
        if not skills.data:
            return {"skills": [], "summary": {}}
        
        # Get memory stats for each skill
        skill_summaries = []
        for skill in skills.data:
            # Use execute() instead of single() to avoid error when no memory exists
            memory = supabase_admin.table("skill_memory")\
                .select("successful_patterns, failed_patterns, last_evolved_at")\
                .eq("skill_id", skill["id"])\
                .execute()
            
            # Get first result or empty dict
            memory_data = memory.data[0] if memory.data else {}
            
            skill_summaries.append({
                "id": skill["id"],
                "name": skill["name"],
                "level": skill["level"],
                "confidence_score": skill.get("confidence_score", 0),
                "activation_count": skill.get("activation_count", 0),
                "last_activated_at": skill.get("last_activated_at"),
                "success_rate": skill.get("success_rate", 0),
                "is_bottleneck": skill.get("is_bottleneck", False),
                "learning_progress": {
                    "successes": len(memory_data.get("successful_patterns", [])) if memory_data else 0,
                    "failures": len(memory_data.get("failed_patterns", [])) if memory_data else 0,
                    "last_evolved": memory_data.get("last_evolved_at") if memory_data else None
                }
            })
        
        # Calculate summary stats
        total_activations = sum(s.get("activation_count", 0) for s in skill_summaries)
        avg_confidence = sum(s.get("confidence_score", 0) for s in skill_summaries) / len(skill_summaries) if skill_summaries else 0
        bottleneck_count = sum(1 for s in skill_summaries if s.get("is_bottleneck"))
        
        return {
            "skills": skill_summaries,
            "summary": {
                "total_skills": len(skill_summaries),
                "total_activations": total_activations,
                "average_confidence": round(avg_confidence, 2),
                "bottleneck_skills": bottleneck_count,
                "skills_by_level": {
                    "Beginner": len([s for s in skill_summaries if s["level"] == "Beginner"]),
                    "Intermediate": len([s for s in skill_summaries if s["level"] == "Intermediate"]),
                    "Advanced": len([s for s in skill_summaries if s["level"] == "Advanced"]),
                    "Expert": len([s for s in skill_summaries if s["level"] == "Expert"])
                }
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==================== SKILL CONTRIBUTIONS ====================

@router.post("/skills/{skill_id}/contribution/suggestion-accepted")
async def track_suggestion_accepted(
    skill_id: str,
    suggestion_id: str,
    workspace_id: str,
    user_id: str = Depends(get_current_user)
):
    """Track when user accepts a skill's suggestion"""
    from app.services.skill_contribution_tracker import contribution_tracker
    
    await contribution_tracker.track_suggestion_accepted(
        skill_id=skill_id,
        suggestion_id=suggestion_id,
        workspace_id=workspace_id
    )
    
    return {"success": True, "message": "Contribution tracked"}

@router.post("/skills/{skill_id}/contribution/suggestion-rejected")
async def track_suggestion_rejected(
    skill_id: str,
    suggestion_id: str,
    workspace_id: str,
    user_id: str = Depends(get_current_user)
):
    """Track when user rejects a skill's suggestion"""
    from app.services.skill_contribution_tracker import contribution_tracker
    
    await contribution_tracker.track_suggestion_rejected(
        skill_id=skill_id,
        suggestion_id=suggestion_id,
        workspace_id=workspace_id
    )
    
    return {"success": True, "message": "Rejection tracked"}

@router.post("/skills/{skill_id}/contribution/task-accelerated")
async def track_task_accelerated(
    skill_id: str,
    task_id: str,
    days_saved: int,
    workspace_id: str,
    user_id: str = Depends(get_current_user)
):
    """Track when a task is completed faster due to skill"""
    from app.services.skill_contribution_tracker import contribution_tracker
    
    await contribution_tracker.track_task_accelerated(
        skill_id=skill_id,
        task_id=task_id,
        workspace_id=workspace_id,
        days_saved=days_saved
    )
    
    return {"success": True, "message": "Task acceleration tracked"}

@router.get("/skills/{skill_id}/real-progress")
async def get_skill_real_progress(
    skill_id: str,
    user_id: str = Depends(get_current_user)
):
    """Get REAL progress for a skill based on actual contributions"""
    from app.services.skill_contribution_tracker import contribution_tracker
    
    progress = await contribution_tracker.calculate_real_progress(skill_id)
    return progress

# ==================== SKILL AUTO-LINKING ====================

@router.post("/skills/auto-link/page")
async def auto_link_page_to_skills(
    page_id: str,
    page_title: str,
    page_content: str,
    page_tags: List[str],
    workspace_id: str,
    user_id: str = Depends(get_current_user)
):
    """Automatically link a page to relevant skills"""
    from app.services.skill_auto_linker import auto_linker
    
    links = await auto_linker.analyze_and_link_page(
        page_id=page_id,
        page_title=page_title,
        page_content=page_content,
        page_tags=page_tags,
        workspace_id=workspace_id,
        user_id=user_id
    )
    
    return {
        "success": True,
        "links_created": len(links),
        "links": links
    }

@router.post("/skills/auto-link/task")
async def auto_link_task_to_skill(
    task_id: str,
    task_title: str,
    task_description: str,
    workspace_id: str,
    user_id: str = Depends(get_current_user)
):
    """Automatically link a task to most relevant skill"""
    from app.services.skill_auto_linker import auto_linker
    
    link = await auto_linker.analyze_and_link_task(
        task_id=task_id,
        task_title=task_title,
        task_description=task_description,
        workspace_id=workspace_id
    )
    
    if link:
        return {
            "success": True,
            "linked": True,
            "skill": link
        }
    else:
        return {
            "success": True,
            "linked": False,
            "message": "No confident match found"
        }

@router.get("/skills/suggest-links/page/{page_id}")
async def suggest_skill_links_for_page(
    page_id: str,
    workspace_id: str,
    user_id: str = Depends(get_current_user)
):
    """Get suggested skill links for a page"""
    from app.services.skill_auto_linker import auto_linker
    
    # Get page data
    page = supabase_admin.table("pages")\
        .select("*")\
        .eq("id", page_id)\
        .single()\
        .execute()
    
    if not page.data:
        raise HTTPException(status_code=404, detail="Page not found")
    
    suggestions = await auto_linker.suggest_links(
        page_id=page_id,
        page_title=page.data.get("title", ""),
        page_content=page.data.get("content", ""),
        page_tags=page.data.get("tags", []),
        workspace_id=workspace_id
    )
    
    return {
        "suggestions": suggestions
    }

# ==================== SKILL EVOLUTION ====================

@router.post("/skills/{skill_id}/evolve")
async def evolve_skill_to_next_level(
    skill_id: str,
    user_id: str = Depends(get_current_user)
):
    """Evolve skill to next level (L1 -> L2, etc.)"""
    from app.services.skill_contribution_tracker import contribution_tracker
    
    # Check if skill can evolve
    progress = await contribution_tracker.calculate_real_progress(skill_id)
    
    if not progress.get("can_evolve"):
        return {
            "success": False,
            "message": "Skill not ready to evolve",
            "progress": progress
        }
    
    # Get current skill
    skill = supabase_admin.table("skills")\
        .select("*")\
        .eq("id", skill_id)\
        .single()\
        .execute()
    
    if not skill.data:
        raise HTTPException(status_code=404, detail="Skill not found")
    
    current_level = skill.data.get("level", "Beginner")
    
    # Determine next level
    level_progression = {
        "Beginner": "Intermediate",
        "Intermediate": "Advanced",
        "Advanced": "Expert",
        "Expert": "Expert"  # Max level
    }
    
    next_level = level_progression.get(current_level)
    
    if next_level == current_level:
        return {
            "success": False,
            "message": "Already at maximum level"
        }
    
    # Update skill level
    supabase_admin.table("skills").update({
        "level": next_level,
        "updated_at": datetime.utcnow().isoformat()
    }).eq("id", skill_id).execute()
    
    # Reset progress for next level
    # (contributions stay, but requirements increase)
    
    return {
        "success": True,
        "previous_level": current_level,
        "new_level": next_level,
        "message": f"Skill evolved from {current_level} to {next_level}!"
    }
