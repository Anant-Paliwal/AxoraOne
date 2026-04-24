"""Dashboard layout API endpoints."""
from fastapi import APIRouter, Depends, HTTPException
from typing import Optional, List, Any
from pydantic import BaseModel
from ..dependencies import get_current_user
from app.core.supabase import supabase_admin

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


class WidgetConfig(BaseModel):
    id: str
    type: str
    x: int
    y: int
    w: int
    h: int
    settings: Optional[dict] = {}


class DashboardLayoutUpdate(BaseModel):
    layout: List[WidgetConfig]
    gridColumns: Optional[int] = 3
    spacing: Optional[str] = 'none'


class DashboardLayoutResponse(BaseModel):
    id: Optional[str] = None
    workspace_id: str
    user_id: str
    layout: List[Any]
    gridColumns: Optional[int] = 3
    spacing: Optional[str] = 'none'
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


# Default layout for new users
DEFAULT_LAYOUT = [
    {"id": "widget-pinned", "type": "pinned-pages", "x": 0, "y": 0, "w": 2, "h": 2, "settings": {}},
    {"id": "widget-activity", "type": "recent-activity", "x": 0, "y": 2, "w": 2, "h": 2, "settings": {}},
    {"id": "widget-pulse", "type": "workspace-pulse", "x": 2, "y": 0, "w": 1, "h": 2, "settings": {}},
    {"id": "widget-tasks", "type": "my-tasks", "x": 2, "y": 2, "w": 1, "h": 2, "settings": {}},
]


@router.get("/layout/{workspace_id}")
async def get_dashboard_layout(
    workspace_id: str,
    current_user: str = Depends(get_current_user)
):
    """Get dashboard layout for a workspace."""
    try:
        result = supabase_admin.table("dashboard_layouts").select("*").eq(
            "workspace_id", workspace_id
        ).eq(
            "user_id", current_user
        ).execute()
        
        if result.data and len(result.data) > 0:
            return result.data[0]
        
        # Return default layout if none exists
        return {
            "workspace_id": workspace_id,
            "user_id": current_user,
            "layout": DEFAULT_LAYOUT,
            "gridColumns": 3,
            "spacing": "none"
        }
    except Exception as e:
        print(f"Error fetching dashboard layout: {e}")
        # Return default on error
        return {
            "workspace_id": workspace_id,
            "user_id": current_user,
            "layout": DEFAULT_LAYOUT,
            "gridColumns": 3,
            "spacing": "none"
        }


@router.put("/layout/{workspace_id}")
async def update_dashboard_layout(
    workspace_id: str,
    layout_update: DashboardLayoutUpdate,
    current_user: str = Depends(get_current_user)
):
    """Update or create dashboard layout for a workspace."""
    try:
        # Convert layout to dict format
        layout_data = [w.dict() if hasattr(w, 'dict') else w for w in layout_update.layout]
        
        # Check if layout exists
        existing = supabase_admin.table("dashboard_layouts").select("id").eq(
            "workspace_id", workspace_id
        ).eq(
            "user_id", current_user
        ).execute()
        
        update_data = {
            "layout": layout_data,
            "grid_columns": layout_update.gridColumns,
            "spacing": layout_update.spacing
        }
        
        if existing.data and len(existing.data) > 0:
            # Update existing
            result = supabase_admin.table("dashboard_layouts").update(update_data).eq(
                "workspace_id", workspace_id
            ).eq(
                "user_id", current_user
            ).execute()
        else:
            # Create new
            result = supabase_admin.table("dashboard_layouts").insert({
                "workspace_id": workspace_id,
                "user_id": current_user,
                **update_data
            }).execute()
        
        if result.data:
            return result.data[0]
        
        return {"success": True, **update_data}
    except Exception as e:
        print(f"Error updating dashboard layout: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/layout/{workspace_id}/reset")
async def reset_dashboard_layout(
    workspace_id: str,
    current_user: str = Depends(get_current_user)
):
    """Reset dashboard layout to default."""
    try:
        # Delete existing layout
        supabase_admin.table("dashboard_layouts").delete().eq(
            "workspace_id", workspace_id
        ).eq(
            "user_id", current_user
        ).execute()
        
        return {
            "workspace_id": workspace_id,
            "user_id": current_user,
            "layout": DEFAULT_LAYOUT,
            "gridColumns": 3,
            "spacing": "none"
        }
    except Exception as e:
        print(f"Error resetting dashboard layout: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/widgets/available")
async def get_available_widgets(
    current_user: str = Depends(get_current_user)
):
    """Get list of available widget types."""
    return {
        "widgets": [
            {
                "type": "workspace-pulse",
                "name": "Workspace Pulse",
                "description": "AI insights and overdue task alerts",
                "icon": "sparkles",
                "category": "insights",
                "defaultSize": {"w": 1, "h": 2},
                "minSize": {"w": 1, "h": 2},
                "maxSize": {"w": 2, "h": 3}
            },
            {
                "type": "my-tasks",
                "name": "My Tasks",
                "description": "Your task list with quick actions",
                "icon": "check-square",
                "category": "productivity",
                "defaultSize": {"w": 1, "h": 2},
                "minSize": {"w": 1, "h": 1},
                "maxSize": {"w": 2, "h": 4}
            },
            {
                "type": "pinned-pages",
                "name": "Pinned Pages",
                "description": "Quick access to favorite pages",
                "icon": "pin",
                "category": "navigation",
                "defaultSize": {"w": 2, "h": 2},
                "minSize": {"w": 1, "h": 1},
                "maxSize": {"w": 3, "h": 2}
            },
            {
                "type": "recent-activity",
                "name": "Recent Activity",
                "description": "Activity feed for your workspace",
                "icon": "clock",
                "category": "insights",
                "defaultSize": {"w": 2, "h": 2},
                "minSize": {"w": 1, "h": 2},
                "maxSize": {"w": 3, "h": 4}
            },
            {
                "type": "quick-actions",
                "name": "Quick Actions",
                "description": "Fast access to common actions",
                "icon": "zap",
                "category": "productivity",
                "defaultSize": {"w": 2, "h": 1},
                "minSize": {"w": 1, "h": 1},
                "maxSize": {"w": 3, "h": 1}
            },
            {
                "type": "skill-progress",
                "name": "Skill Progress",
                "description": "Track your skill development",
                "icon": "trending-up",
                "category": "learning",
                "defaultSize": {"w": 1, "h": 2},
                "minSize": {"w": 1, "h": 2},
                "maxSize": {"w": 2, "h": 3}
            },
            {
                "type": "learning-streak",
                "name": "Learning Streak",
                "description": "Your daily learning activity",
                "icon": "flame",
                "category": "learning",
                "defaultSize": {"w": 1, "h": 1},
                "minSize": {"w": 1, "h": 1},
                "maxSize": {"w": 2, "h": 2}
            },
            {
                "type": "upcoming-deadlines",
                "name": "Upcoming Deadlines",
                "description": "Tasks and events due soon",
                "icon": "calendar",
                "category": "productivity",
                "defaultSize": {"w": 1, "h": 2},
                "minSize": {"w": 1, "h": 1},
                "maxSize": {"w": 2, "h": 3}
            },
            {
                "type": "recent-pages",
                "name": "Recent Pages",
                "description": "Recently viewed or edited pages",
                "icon": "file-text",
                "category": "navigation",
                "defaultSize": {"w": 1, "h": 2},
                "minSize": {"w": 1, "h": 1},
                "maxSize": {"w": 2, "h": 3}
            },
            {
                "type": "knowledge-graph-preview",
                "name": "Knowledge Graph",
                "description": "Mini view of your knowledge graph",
                "icon": "git-branch",
                "category": "insights",
                "defaultSize": {"w": 2, "h": 2},
                "minSize": {"w": 1, "h": 2},
                "maxSize": {"w": 3, "h": 3}
            }
        ],
        "categories": [
            {"id": "insights", "name": "Insights", "icon": "sparkles"},
            {"id": "productivity", "name": "Productivity", "icon": "check-square"},
            {"id": "navigation", "name": "Navigation", "icon": "compass"},
            {"id": "learning", "name": "Learning", "icon": "book-open"}
        ]
    }
