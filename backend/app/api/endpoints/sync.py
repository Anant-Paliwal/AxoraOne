from fastapi import APIRouter, Depends, HTTPException
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from datetime import datetime
import logging

from app.api.dependencies import get_current_user
from app.core.supabase import supabase_admin

logger = logging.getLogger(__name__)

router = APIRouter()


class SyncEvent(BaseModel):
    """Single sync event from client"""
    id: str  # Client-generated event ID for idempotency
    entity_type: str  # 'page' or 'task'
    entity_id: str
    op_type: str  # 'upsert', 'patch', or 'delete'
    payload: Dict[str, Any]
    created_at: int  # Client timestamp
    client_version: Optional[int] = None


class SyncRequest(BaseModel):
    """Batch sync request"""
    events: List[SyncEvent]


class SyncEventResult(BaseModel):
    """Result for a single event"""
    event_id: str
    ok: bool
    error: Optional[str] = None
    server_version: Optional[int] = None
    server_updated_at: Optional[str] = None


class SyncResponse(BaseModel):
    """Batch sync response"""
    results: List[SyncEventResult]
    synced_count: int
    failed_count: int


# In-memory idempotency cache (in production, use Redis)
_processed_events: Dict[str, bool] = {}


def is_event_processed(event_id: str) -> bool:
    """Check if event was already processed"""
    return event_id in _processed_events


def mark_event_processed(event_id: str):
    """Mark event as processed"""
    _processed_events[event_id] = True
    
    # Simple cleanup: keep only last 10000 events
    if len(_processed_events) > 10000:
        # Remove oldest 1000
        keys_to_remove = list(_processed_events.keys())[:1000]
        for key in keys_to_remove:
            del _processed_events[key]


@router.post("/events", response_model=SyncResponse)
async def sync_events(
    request: SyncRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Sync batch of events from client
    Applies updates idempotently and returns results
    """
    user_id = current_user["id"]
    
    results: List[SyncEventResult] = []
    synced_count = 0
    failed_count = 0
    
    for event in request.events:
        try:
            # Check idempotency
            if is_event_processed(event.id):
                logger.info(f"Event {event.id} already processed, skipping")
                results.append(SyncEventResult(
                    event_id=event.id,
                    ok=True,
                    error="Already processed"
                ))
                synced_count += 1
                continue
            
            # Process based on entity type
            if event.entity_type == "page":
                result = await sync_page_event(
                    user_id, event
                )
            elif event.entity_type == "task":
                result = await sync_task_event(
                    user_id, event
                )
            else:
                result = SyncEventResult(
                    event_id=event.id,
                    ok=False,
                    error=f"Unknown entity type: {event.entity_type}"
                )
            
            results.append(result)
            
            if result.ok:
                synced_count += 1
                mark_event_processed(event.id)
            else:
                failed_count += 1
                
        except Exception as e:
            logger.error(f"Error processing event {event.id}: {e}")
            results.append(SyncEventResult(
                event_id=event.id,
                ok=False,
                error=str(e)
            ))
            failed_count += 1
    
    return SyncResponse(
        results=results,
        synced_count=synced_count,
        failed_count=failed_count
    )


async def sync_page_event(
    user_id: str,
    event: SyncEvent
) -> SyncEventResult:
    """Sync a page event"""
    try:
        if event.op_type == "delete":
            # Soft delete
            response = supabase_admin.table("pages").update({
                "deleted": True,
                "updated_at": datetime.utcnow().isoformat()
            }).eq("id", event.entity_id).eq("user_id", user_id).execute()
            
            if not response.data:
                return SyncEventResult(
                    event_id=event.id,
                    ok=False,
                    error="Page not found or unauthorized"
                )
            
            return SyncEventResult(
                event_id=event.id,
                ok=True
            )
        
        else:  # upsert or patch
            payload = event.payload.copy()
            payload["user_id"] = user_id
            payload["updated_at"] = datetime.utcnow().isoformat()
            
            # Check if page exists
            existing = supabase_admin.table("pages").select("id, version").eq(
                "id", event.entity_id
            ).eq("user_id", user_id).execute()
            
            if existing.data:
                # Update existing page
                current_version = existing.data[0].get("version", 0)
                payload["version"] = current_version + 1
                
                response = supabase_admin.table("pages").update(payload).eq(
                    "id", event.entity_id
                ).eq("user_id", user_id).execute()
            else:
                # Insert new page
                payload["id"] = event.entity_id
                payload["version"] = 1
                response = supabase_admin.table("pages").insert(payload).execute()
            
            if not response.data:
                return SyncEventResult(
                    event_id=event.id,
                    ok=False,
                    error="Failed to sync page"
                )
            
            page_data = response.data[0]
            return SyncEventResult(
                event_id=event.id,
                ok=True,
                server_version=page_data.get("version"),
                server_updated_at=page_data.get("updated_at")
            )
            
    except Exception as e:
        logger.error(f"Page sync error: {e}")
        return SyncEventResult(
            event_id=event.id,
            ok=False,
            error=str(e)
        )


async def sync_task_event(
    user_id: str,
    event: SyncEvent
) -> SyncEventResult:
    """Sync a task event"""
    try:
        if event.op_type == "delete":
            # Hard delete for tasks
            response = supabase_admin.table("tasks").delete().eq(
                "id", event.entity_id
            ).eq("user_id", user_id).execute()
            
            return SyncEventResult(
                event_id=event.id,
                ok=True
            )
        
        else:  # upsert or patch
            payload = event.payload.copy()
            payload["user_id"] = user_id
            payload["updated_at"] = datetime.utcnow().isoformat()
            
            # Convert camelCase to snake_case for database
            if "dueDate" in payload:
                payload["due_date"] = payload.pop("dueDate")
            if "linkedPageId" in payload:
                payload["linked_page_id"] = payload.pop("linkedPageId")
            if "skillIds" in payload:
                payload["skill_ids"] = payload.pop("skillIds")
            if "workspaceId" in payload:
                payload["workspace_id"] = payload.pop("workspaceId")
            
            # Check if task exists
            existing = supabase_admin.table("tasks").select("id, version").eq(
                "id", event.entity_id
            ).eq("user_id", user_id).execute()
            
            if existing.data:
                # Update existing task
                current_version = existing.data[0].get("version", 0)
                payload["version"] = current_version + 1
                
                response = supabase_admin.table("tasks").update(payload).eq(
                    "id", event.entity_id
                ).eq("user_id", user_id).execute()
            else:
                # Insert new task
                payload["id"] = event.entity_id
                payload["version"] = 1
                response = supabase_admin.table("tasks").insert(payload).execute()
            
            if not response.data:
                return SyncEventResult(
                    event_id=event.id,
                    ok=False,
                    error="Failed to sync task"
                )
            
            task_data = response.data[0]
            return SyncEventResult(
                event_id=event.id,
                ok=True,
                server_version=task_data.get("version"),
                server_updated_at=task_data.get("updated_at")
            )
            
    except Exception as e:
        logger.error(f"Task sync error: {e}")
        return SyncEventResult(
            event_id=event.id,
            ok=False,
            error=str(e)
        )
