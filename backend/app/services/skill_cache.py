"""
Skill Cache Service - Redis-based caching for performance optimization

Caches:
- Skill lists by workspace
- Individual skill data
- Progress calculations
- Auto-linking results

Expected performance improvement: 50-70%
"""

from typing import Dict, List, Optional, Any
import json
import hashlib
from datetime import timedelta
from app.core.redis_client import redis_client

class SkillCache:
    """Redis-based caching for skill system"""
    
    # Cache TTLs (in seconds)
    SKILL_LIST_TTL = 300  # 5 minutes
    SKILL_DETAIL_TTL = 600  # 10 minutes
    PROGRESS_TTL = 180  # 3 minutes
    AUTO_LINK_TTL = 900  # 15 minutes
    
    def __init__(self):
        self.prefix = "skill:"
    
    def _make_key(self, *parts: str) -> str:
        """Create cache key from parts"""
        return self.prefix + ":".join(str(p) for p in parts)
    
    def _hash_content(self, content: str) -> str:
        """Hash content for cache key"""
        return hashlib.md5(content.encode()).hexdigest()[:12]
    
    # ==================== SKILL LIST CACHING ====================
    
    async def get_skill_list(self, workspace_id: str) -> Optional[List[Dict]]:
        """Get cached skill list for workspace"""
        try:
            key = self._make_key("list", workspace_id)
            data = await redis_client.get(key)
            if data:
                return json.loads(data)
            return None
        except Exception as e:
            print(f"Cache get error: {e}")
            return None
    
    async def set_skill_list(self, workspace_id: str, skills: List[Dict]):
        """Cache skill list for workspace"""
        try:
            key = self._make_key("list", workspace_id)
            await redis_client.setex(
                key,
                self.SKILL_LIST_TTL,
                json.dumps(skills)
            )
        except Exception as e:
            print(f"Cache set error: {e}")
    
    async def invalidate_skill_list(self, workspace_id: str):
        """Invalidate skill list cache"""
        try:
            key = self._make_key("list", workspace_id)
            await redis_client.delete(key)
        except Exception as e:
            print(f"Cache invalidate error: {e}")
    
    # ==================== SKILL DETAIL CACHING ====================
    
    async def get_skill(self, skill_id: str) -> Optional[Dict]:
        """Get cached skill detail"""
        try:
            key = self._make_key("detail", skill_id)
            data = await redis_client.get(key)
            if data:
                return json.loads(data)
            return None
        except Exception as e:
            print(f"Cache get error: {e}")
            return None
    
    async def set_skill(self, skill_id: str, skill: Dict):
        """Cache skill detail"""
        try:
            key = self._make_key("detail", skill_id)
            await redis_client.setex(
                key,
                self.SKILL_DETAIL_TTL,
                json.dumps(skill)
            )
        except Exception as e:
            print(f"Cache set error: {e}")
    
    async def invalidate_skill(self, skill_id: str, workspace_id: Optional[str] = None):
        """Invalidate skill cache"""
        try:
            # Invalidate detail
            detail_key = self._make_key("detail", skill_id)
            await redis_client.delete(detail_key)
            
            # Invalidate list if workspace provided
            if workspace_id:
                await self.invalidate_skill_list(workspace_id)
        except Exception as e:
            print(f"Cache invalidate error: {e}")
    
    # ==================== PROGRESS CACHING ====================
    
    async def get_progress(self, skill_id: str) -> Optional[Dict]:
        """Get cached progress calculation"""
        try:
            key = self._make_key("progress", skill_id)
            data = await redis_client.get(key)
            if data:
                return json.loads(data)
            return None
        except Exception as e:
            print(f"Cache get error: {e}")
            return None
    
    async def set_progress(self, skill_id: str, progress: Dict):
        """Cache progress calculation"""
        try:
            key = self._make_key("progress", skill_id)
            await redis_client.setex(
                key,
                self.PROGRESS_TTL,
                json.dumps(progress)
            )
        except Exception as e:
            print(f"Cache set error: {e}")
    
    async def invalidate_progress(self, skill_id: str):
        """Invalidate progress cache"""
        try:
            key = self._make_key("progress", skill_id)
            await redis_client.delete(key)
        except Exception as e:
            print(f"Cache invalidate error: {e}")
    
    # ==================== AUTO-LINKING CACHING ====================
    
    async def get_auto_link_result(
        self, 
        page_title: str, 
        page_content: str, 
        workspace_id: str
    ) -> Optional[List[Dict]]:
        """Get cached auto-linking result"""
        try:
            # Create hash of content for cache key
            content_hash = self._hash_content(page_title + page_content)
            key = self._make_key("autolink", workspace_id, content_hash)
            data = await redis_client.get(key)
            if data:
                return json.loads(data)
            return None
        except Exception as e:
            print(f"Cache get error: {e}")
            return None
    
    async def set_auto_link_result(
        self,
        page_title: str,
        page_content: str,
        workspace_id: str,
        result: List[Dict]
    ):
        """Cache auto-linking result"""
        try:
            content_hash = self._hash_content(page_title + page_content)
            key = self._make_key("autolink", workspace_id, content_hash)
            await redis_client.setex(
                key,
                self.AUTO_LINK_TTL,
                json.dumps(result)
            )
        except Exception as e:
            print(f"Cache set error: {e}")
    
    # ==================== BATCH OPERATIONS ====================
    
    async def invalidate_workspace(self, workspace_id: str):
        """Invalidate all caches for a workspace"""
        try:
            # Get all keys for workspace
            pattern = self._make_key("*", workspace_id, "*")
            keys = await redis_client.keys(pattern)
            
            if keys:
                await redis_client.delete(*keys)
            
            # Also invalidate list
            await self.invalidate_skill_list(workspace_id)
        except Exception as e:
            print(f"Cache invalidate error: {e}")
    
    async def warm_cache(self, workspace_id: str, skills: List[Dict]):
        """Warm cache with skill data"""
        try:
            # Cache list
            await self.set_skill_list(workspace_id, skills)
            
            # Cache individual skills
            for skill in skills:
                await self.set_skill(skill["id"], skill)
        except Exception as e:
            print(f"Cache warm error: {e}")
    
    # ==================== STATISTICS ====================
    
    async def get_cache_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        try:
            info = await redis_client.info("stats")
            
            # Count skill-related keys
            pattern = self.prefix + "*"
            keys = await redis_client.keys(pattern)
            
            return {
                "total_keys": len(keys),
                "hits": info.get("keyspace_hits", 0),
                "misses": info.get("keyspace_misses", 0),
                "hit_rate": (
                    info.get("keyspace_hits", 0) / 
                    max(1, info.get("keyspace_hits", 0) + info.get("keyspace_misses", 0))
                ) * 100
            }
        except Exception as e:
            print(f"Cache stats error: {e}")
            return {
                "total_keys": 0,
                "hits": 0,
                "misses": 0,
                "hit_rate": 0
            }


# Global instance
skill_cache = SkillCache()


# ==================== DECORATOR FOR CACHING ====================

def cache_skill_list(func):
    """Decorator to cache skill list queries"""
    async def wrapper(workspace_id: str, *args, **kwargs):
        # Try cache first
        cached = await skill_cache.get_skill_list(workspace_id)
        if cached is not None:
            return cached
        
        # Cache miss - fetch from database
        result = await func(workspace_id, *args, **kwargs)
        
        # Cache result
        await skill_cache.set_skill_list(workspace_id, result)
        
        return result
    
    return wrapper


def cache_skill_detail(func):
    """Decorator to cache skill detail queries"""
    async def wrapper(skill_id: str, *args, **kwargs):
        # Try cache first
        cached = await skill_cache.get_skill(skill_id)
        if cached is not None:
            return cached
        
        # Cache miss - fetch from database
        result = await func(skill_id, *args, **kwargs)
        
        # Cache result
        await skill_cache.set_skill(skill_id, result)
        
        return result
    
    return wrapper


def cache_progress(func):
    """Decorator to cache progress calculations"""
    async def wrapper(skill_id: str, *args, **kwargs):
        # Try cache first
        cached = await skill_cache.get_progress(skill_id)
        if cached is not None:
            return cached
        
        # Cache miss - calculate
        result = await func(skill_id, *args, **kwargs)
        
        # Cache result
        await skill_cache.set_progress(skill_id, result)
        
        return result
    
    return wrapper
