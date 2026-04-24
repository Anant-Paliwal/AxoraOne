from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from app.core.supabase import supabase_admin
from app.api.dependencies import get_current_user

router = APIRouter()

# Predefined marketplace skills
MARKETPLACE_SKILLS = [
    {
        "id": "marketplace_idea_validator",
        "name": "Idea Validator",
        "category": "startup",
        "level": "Beginner",
        "description": "Validate your business ideas with structured criteria",
        "icon": "💡",
        "tags": ["startup", "validation", "business"],
        "rating": 4.8,
        "users": 1247,
        "purpose": "Help validate business ideas before investing time and resources",
        "goal_type": ["clarity", "quality"],
        "activation_signals": ["page_created", "task_blocked"],
        "planner_type": "Experiment Planner"
    },
    {
        "id": "marketplace_focus_protector",
        "name": "Focus Protector",
        "category": "execution",
        "level": "Intermediate",
        "description": "Minimize distractions and increase deep work time",
        "icon": "🎯",
        "tags": ["execution", "focus", "productivity"],
        "rating": 4.9,
        "users": 2156,
        "purpose": "Protect your focus time and eliminate distractions",
        "goal_type": ["focus", "execution"],
        "activation_signals": ["task_delayed", "deadline_pressure"],
        "planner_type": "Experiment Planner"
    },
    {
        "id": "marketplace_task_optimizer",
        "name": "Task Optimizer",
        "category": "planning",
        "level": "Intermediate",
        "description": "Break down large tasks into actionable steps",
        "icon": "📋",
        "tags": ["planning", "tasks", "productivity"],
        "rating": 4.7,
        "users": 1893,
        "purpose": "Transform overwhelming tasks into manageable action items",
        "goal_type": ["clarity", "execution"],
        "activation_signals": ["oversized_task", "no_subtasks"],
        "planner_type": "Mini Clarity"
    },
    {
        "id": "marketplace_mvp_clarity",
        "name": "MVP Clarity",
        "category": "startup",
        "level": "Advanced",
        "description": "Define clear, testable MVPs for your ideas",
        "icon": "🚀",
        "tags": ["startup", "mvp", "planning"],
        "rating": 4.9,
        "users": 987,
        "purpose": "Create focused MVPs that test core assumptions",
        "goal_type": ["clarity", "speed"],
        "activation_signals": ["page_created", "task_blocked"],
        "planner_type": "Experiment Planner"
    },
    {
        "id": "marketplace_delay_detector",
        "name": "Delay Detector",
        "category": "execution",
        "level": "Intermediate",
        "description": "Identify and reduce repeated task delays",
        "icon": "⏰",
        "tags": ["execution", "time", "analysis"],
        "rating": 4.6,
        "users": 1456,
        "purpose": "Detect patterns in task delays and suggest improvements",
        "goal_type": ["speed", "execution"],
        "activation_signals": ["task_delayed", "deadline_pressure"],
        "planner_type": "High"
    },
    {
        "id": "marketplace_priority_setter",
        "name": "Priority Setter",
        "category": "decision",
        "level": "Intermediate",
        "description": "Identify and reduce repeated task delays",
        "icon": "⭐",
        "tags": ["decision", "priority", "planning"],
        "rating": 4.8,
        "users": 2341,
        "purpose": "Make better priority decisions under pressure",
        "goal_type": ["clarity", "focus"],
        "activation_signals": ["task_blocked", "deadline_pressure"],
        "planner_type": "Mini Clarity"
    },
    {
        "id": "marketplace_milestone_maker",
        "name": "Milestone Maker",
        "category": "planning",
        "level": "Advanced",
        "description": "Deep-eggplantism scheduling + Idea Validator",
        "icon": "🎯",
        "tags": ["planning", "milestones", "scheduling"],
        "rating": 4.7,
        "users": 1123,
        "purpose": "Create realistic milestones with validation",
        "goal_type": ["clarity", "quality"],
        "activation_signals": ["oversized_task", "no_subtasks"],
        "planner_type": "Experiment Planner"
    },
    {
        "id": "marketplace_insight_synthesizer",
        "name": "Insight Synthesizer",
        "category": "research",
        "level": "Advanced",
        "description": "Explore and management task delays",
        "icon": "💎",
        "tags": ["research", "synthesis", "analysis"],
        "rating": 4.9,
        "users": 876,
        "purpose": "Synthesize insights from multiple sources",
        "goal_type": ["clarity", "quality"],
        "activation_signals": ["page_created", "page_neglected"],
        "planner_type": "High"
    },
    {
        "id": "marketplace_experiment_planner",
        "name": "Experiment Planner",
        "category": "startup",
        "level": "Advanced",
        "description": "Boost organization processed valinto ideas",
        "icon": "🧪",
        "tags": ["startup", "experiments", "testing"],
        "rating": 4.8,
        "users": 1567,
        "purpose": "Design and track lean experiments",
        "goal_type": ["speed", "quality"],
        "activation_signals": ["page_created", "task_blocked"],
        "planner_type": "Experiment Planner"
    }
]

# Skill bundles
SKILL_BUNDLES = [
    {
        "id": "bundle_startup_pack",
        "name": "Startup Pack",
        "description": "Essential skills for early-stage founders",
        "icon": "🚀",
        "skills": ["marketplace_idea_validator", "marketplace_mvp_clarity", "marketplace_experiment_planner"],
        "rating": 4.9,
        "users": 543
    },
    {
        "id": "bundle_focus_pack",
        "name": "Focus Pack",
        "description": "Maximize productivity and deep work",
        "icon": "🎯",
        "skills": ["marketplace_focus_protector", "marketplace_priority_setter", "marketplace_delay_detector"],
        "rating": 4.8,
        "users": 789
    }
]

class MarketplaceSkillInstall(BaseModel):
    marketplace_skill_id: str
    workspace_id: Optional[str] = None

@router.get("/marketplace")
async def get_marketplace_skills(
    category: Optional[str] = None,
    sort_by: str = "popular",
    user_id: str = Depends(get_current_user)
):
    """Get all marketplace skills with optional filtering"""
    try:
        skills = MARKETPLACE_SKILLS.copy()
        
        # Filter by category
        if category and category != "all":
            skills = [s for s in skills if s["category"] == category]
        
        # Sort
        if sort_by == "popular":
            skills.sort(key=lambda x: x["users"], reverse=True)
        elif sort_by == "rating":
            skills.sort(key=lambda x: x["rating"], reverse=True)
        elif sort_by == "name":
            skills.sort(key=lambda x: x["name"])
        
        return {
            "skills": skills,
            "bundles": SKILL_BUNDLES,
            "categories": [
                {"value": "all", "label": "All", "count": len(MARKETPLACE_SKILLS)},
                {"value": "planning", "label": "Planning", "count": len([s for s in MARKETPLACE_SKILLS if s["category"] == "planning"])},
                {"value": "execution", "label": "Execution", "count": len([s for s in MARKETPLACE_SKILLS if s["category"] == "execution"])},
                {"value": "decision", "label": "Decision", "count": len([s for s in MARKETPLACE_SKILLS if s["category"] == "decision"])},
                {"value": "research", "label": "Research", "count": len([s for s in MARKETPLACE_SKILLS if s["category"] == "research"])},
                {"value": "learning", "label": "Learning", "count": len([s for s in MARKETPLACE_SKILLS if s["category"] == "learning"])},
                {"value": "startup", "label": "Startup", "count": len([s for s in MARKETPLACE_SKILLS if s["category"] == "startup"])},
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/marketplace/recommended")
async def get_recommended_skills(
    workspace_id: Optional[str] = None,
    user_id: str = Depends(get_current_user)
):
    """Get personalized skill recommendations based on user's current skills"""
    try:
        # Get user's existing skills
        query = supabase_admin.table("skills").select("category, skill_type")
        if workspace_id:
            query = query.eq("workspace_id", workspace_id)
        else:
            query = query.eq("user_id", user_id)
        
        response = query.execute()
        user_skills = response.data or []
        
        # Count categories
        category_counts = {}
        for skill in user_skills:
            cat = skill.get("category") or skill.get("skill_type", "learning")
            category_counts[cat] = category_counts.get(cat, 0) + 1
        
        # Recommend skills from categories user is interested in
        recommended = []
        for skill in MARKETPLACE_SKILLS:
            if skill["category"] in category_counts:
                recommended.append({
                    **skill,
                    "reason": f"Based on your {skill['category']} skills"
                })
        
        # If no recommendations, suggest popular ones
        if not recommended:
            recommended = [
                {**s, "reason": "Popular choice"} 
                for s in sorted(MARKETPLACE_SKILLS, key=lambda x: x["users"], reverse=True)[:3]
            ]
        
        return recommended[:3]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/marketplace/install")
async def install_marketplace_skill(
    install: MarketplaceSkillInstall,
    user_id: str = Depends(get_current_user)
):
    """Install a marketplace skill to user's workspace"""
    try:
        # Find the marketplace skill
        marketplace_skill = next(
            (s for s in MARKETPLACE_SKILLS if s["id"] == install.marketplace_skill_id),
            None
        )
        
        if not marketplace_skill:
            raise HTTPException(status_code=404, detail="Marketplace skill not found")
        
        # Check if already installed
        query = supabase_admin.table("skills")\
            .select("id")\
            .eq("user_id", user_id)\
            .eq("name", marketplace_skill["name"])
        
        if install.workspace_id:
            query = query.eq("workspace_id", install.workspace_id)
        
        existing = query.execute()
        if existing.data:
            raise HTTPException(status_code=400, detail="Skill already installed")
        
        # Create the skill
        skill_data = {
            "user_id": user_id,
            "name": marketplace_skill["name"],
            "level": marketplace_skill["level"],
            "description": marketplace_skill["description"],
            "category": marketplace_skill["category"],
            "purpose": marketplace_skill["purpose"],
            "goal_type": marketplace_skill["goal_type"],
            "activation_signals": marketplace_skill["activation_signals"],
            "scope": "workspace",
            "authority_level": "suggest",
            "memory_scope": "workspace",
            "confidence": 0.3,
            "status": "learning",
            "evidence_sources": {
                "pages": True,
                "tasks": True,
                "calendar": False
            }
        }
        
        if install.workspace_id:
            skill_data["workspace_id"] = install.workspace_id
        
        response = supabase_admin.table("skills").insert(skill_data).execute()
        
        if not response.data:
            raise HTTPException(status_code=500, detail="Failed to install skill")
        
        return {
            "success": True,
            "skill": response.data[0],
            "message": f"'{marketplace_skill['name']}' installed successfully!"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/marketplace/top-rated")
async def get_top_rated_skills(limit: int = 5):
    """Get top rated marketplace skills"""
    try:
        skills = sorted(MARKETPLACE_SKILLS, key=lambda x: x["rating"], reverse=True)[:limit]
        return skills
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/marketplace/bundles")
async def get_skill_bundles():
    """Get all skill bundles"""
    try:
        # Enrich bundles with skill details
        enriched_bundles = []
        for bundle in SKILL_BUNDLES:
            bundle_skills = [
                s for s in MARKETPLACE_SKILLS 
                if s["id"] in bundle["skills"]
            ]
            enriched_bundles.append({
                **bundle,
                "skill_details": bundle_skills
            })
        return enriched_bundles
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
