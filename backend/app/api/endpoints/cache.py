from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from app.core.supabase import supabase_admin
from app.services.memory_service import MemoryService
from app.api.dependencies import get_current_user

router = APIRouter()

class CacheInvalidateRequest(BaseModel):
    cache_type: str  # "vector", "ai_response", "session", "all"
    workspace_id: Optional[str] = None
    session_id: Optional[str] = None

@router.get("/stats/{workspace_id}")
async def get_cache_stats(
    workspace_id: str,
    user_id: str = Depends(get_current_user)
):
    """Get cache statistics for a workspace"""
    try:
        memory_service = MemoryService(supabase_admin)
        stats = await memory_service.get_cache_stats(workspace_id)
        return stats
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/clear")
async def clear_cache(
    request: CacheInvalidateRequest,
    user_id: str = Depends(get_current_user)
):
    """Clear cache entries"""
    try:
        memory_service = MemoryService(supabase_admin)
        
        if request.cache_type == "all":
            result = await memory_service.clear_expired_cache()
            return {"message": "All expired cache cleared", "result": result}
        
        elif request.cache_type == "session" and request.session_id:
            # Clear session context from Redis
            await memory_service._redis_delete(f"session_context:{request.session_id}")
            return {"message": f"Session cache cleared for {request.session_id}"}
        
        elif request.cache_type == "vector" and request.workspace_id:
            # Clear vector search cache for workspace
            result = supabase_admin.table("vector_search_cache")\
                .delete()\
                .eq("workspace_id", request.workspace_id)\
                .execute()
            return {"message": f"Vector cache cleared for workspace", "count": len(result.data or [])}
        
        elif request.cache_type == "ai_response" and request.workspace_id:
            # Clear AI response cache for workspace
            result = supabase_admin.table("ai_response_cache")\
                .delete()\
                .eq("workspace_id", request.workspace_id)\
                .execute()
            return {"message": f"AI response cache cleared for workspace", "count": len(result.data or [])}
        
        else:
            raise HTTPException(status_code=400, detail="Invalid cache_type or missing required parameters")
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/expired")
async def clear_expired_cache(
    user_id: str = Depends(get_current_user)
):
    """Clear all expired cache entries"""
    try:
        memory_service = MemoryService(supabase_admin)
        result = await memory_service.clear_expired_cache()
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/redis/status")
async def get_redis_status(
    user_id: str = Depends(get_current_user)
):
    """Check Redis connection status"""
    try:
        memory_service = MemoryService(supabase_admin)
        
        # Try a simple Redis operation
        test_key = f"health_check:{user_id}"
        set_success = await memory_service._redis_set(test_key, "ok", ex=10)
        
        if set_success:
            get_value = await memory_service._redis_get(test_key)
            await memory_service._redis_delete(test_key)
            
            return {
                "redis_available": True,
                "redis_url": memory_service.redis_url if memory_service.redis_available else None,
                "test_passed": get_value == "ok"
            }
        else:
            return {
                "redis_available": False,
                "message": "Redis not configured or unavailable"
            }
    except Exception as e:
        return {
            "redis_available": False,
            "error": str(e)
        }

@router.get("/vector/status")
async def get_vector_status(
    user_id: str = Depends(get_current_user)
):
    """Check Upstash Vector connection status"""
    try:
        memory_service = MemoryService(supabase_admin)
        
        return {
            "vector_available": memory_service.vector_available,
            "vector_url": memory_service.vector_url if memory_service.vector_available else None
        }
    except Exception as e:
        return {
            "vector_available": False,
            "error": str(e)
        }
