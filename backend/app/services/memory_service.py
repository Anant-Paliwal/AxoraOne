"""
Memory Service for Ask Anything
Handles short-term memory, long-term memory, and caching
Uses Upstash Redis REST API for serverless caching
"""
import hashlib
import json
import httpx
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from uuid import UUID

from supabase import Client

from app.core.config import settings
from app.core.supabase import supabase_admin  # Import admin client to bypass RLS


class MemoryService:
    """Manages memory and caching for Ask Anything using Upstash"""
    
    def __init__(self, supabase: Client):
        # Use admin client to bypass RLS for internal memory operations
        self.supabase = supabase_admin
        # Initialize Upstash Redis REST client
        self.redis_available = False
        if settings.UPSTASH_REDIS_REST_URL and settings.UPSTASH_REDIS_REST_TOKEN:
            self.redis_url = settings.UPSTASH_REDIS_REST_URL
            self.redis_token = settings.UPSTASH_REDIS_REST_TOKEN
            self.redis_headers = {
                "Authorization": f"Bearer {self.redis_token}"
            }
            self.redis_available = True
        
        # Initialize Upstash Vector client
        self.vector_available = False
        if settings.UPSTASH_VECTOR_REST_URL and settings.UPSTASH_VECTOR_REST_TOKEN:
            self.vector_url = settings.UPSTASH_VECTOR_REST_URL
            self.vector_token = settings.UPSTASH_VECTOR_REST_TOKEN
            self.vector_headers = {
                "Authorization": f"Bearer {self.vector_token}"
            }
            self.vector_available = True
    
    async def _redis_get(self, key: str) -> Optional[str]:
        """Get value from Upstash Redis"""
        if not self.redis_available:
            return None
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.redis_url}/get/{key}",
                    headers=self.redis_headers,
                    timeout=5.0
                )
                if response.status_code == 200:
                    result = response.json()
                    # Upstash returns {"result": "value"} for GET
                    value = result.get("result")
                    print(f"Redis GET result for {key}: type={type(value)}, value={str(value)[:100] if value else None}")
                    return value
        except Exception as e:
            print(f"Redis GET error: {e}")
        return None
    
    async def _redis_set(self, key: str, value: str, ex: int = 3600) -> bool:
        """Set value in Upstash Redis with expiration"""
        if not self.redis_available:
            return False
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.redis_url}/set/{key}",
                    headers=self.redis_headers,
                    json={"value": value, "ex": ex},
                    timeout=5.0
                )
                return response.status_code == 200
        except Exception as e:
            print(f"Redis SET error: {e}")
        return False
    
    async def _redis_delete(self, key: str) -> bool:
        """Delete key from Upstash Redis"""
        if not self.redis_available:
            return False
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.redis_url}/del/{key}",
                    headers=self.redis_headers,
                    timeout=5.0
                )
                return response.status_code == 200
        except Exception as e:
            print(f"Redis DEL error: {e}")
        return False
    
    async def _redis_incr(self, key: str) -> Optional[int]:
        """Increment counter in Upstash Redis"""
        if not self.redis_available:
            return None
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.redis_url}/incr/{key}",
                    headers=self.redis_headers,
                    timeout=5.0
                )
                if response.status_code == 200:
                    result = response.json()
                    return result.get("result")
        except Exception as e:
            print(f"Redis INCR error: {e}")
        return None
    
    # =====================================================
    # SHORT-TERM MEMORY (Session Context)
    # =====================================================
    
    async def get_session_context(
        self, 
        session_id: str,
        user_id: str
    ) -> Optional[Dict[str, Any]]:
        """Get current session context (last page, current task, etc.)"""
        
        # Try Redis first
        if self.redis_available:
            cache_key = f"session_context:{session_id}"
            cached = await self._redis_get(cache_key)
            if cached:
                return json.loads(cached)
        
        # Fallback to database
        try:
            result = self.supabase.table("chat_context")\
                .select("*")\
                .eq("session_id", session_id)\
                .eq("user_id", user_id)\
                .limit(1)\
                .execute()
            
            if result.data and len(result.data) > 0:
                # Cache in Redis for 1 hour
                if self.redis_available:
                    await self._redis_set(
                        f"session_context:{session_id}",
                        json.dumps(result.data[0]),
                        ex=3600
                    )
                return result.data[0]
        except Exception as e:
            print(f"Session context fetch error: {e}")
        
        return None
    
    async def update_session_context(
        self,
        session_id: str,
        workspace_id: str,
        user_id: str,
        current_page_id: Optional[str] = None,
        current_skill_id: Optional[str] = None,
        current_task_id: Optional[str] = None,
        query: Optional[str] = None
    ) -> None:
        """Update session context with current activity"""
        
        # Update database
        data = {
            "session_id": session_id,
            "workspace_id": workspace_id,
            "user_id": user_id,
            "last_activity": datetime.utcnow().isoformat()
        }
        
        if current_page_id:
            data["current_page_id"] = current_page_id
        if current_skill_id:
            data["current_skill_id"] = current_skill_id
        if current_task_id:
            data["current_task_id"] = current_task_id
        
        self.supabase.table("chat_context")\
            .upsert(data, on_conflict="session_id")\
            .execute()
        
        # Add to recent queries if provided
        if query:
            context = await self.get_session_context(session_id, user_id)
            recent_queries = context.get("recent_queries", []) if context else []
            recent_queries.insert(0, {
                "query": query,
                "timestamp": datetime.utcnow().isoformat()
            })
            # Keep only last 10
            recent_queries = recent_queries[:10]
            
            self.supabase.table("chat_context")\
                .update({"recent_queries": recent_queries})\
                .eq("session_id", session_id)\
                .execute()
        
        # Invalidate Redis cache
        if self.redis_available:
            await self._redis_delete(f"session_context:{session_id}")
    
    async def get_recent_activity(
        self,
        session_id: str,
        user_id: str,
        limit: int = 5
    ) -> Dict[str, List]:
        """Get recent pages, queries, and actions"""
        
        context = await self.get_session_context(session_id, user_id)
        if not context:
            return {
                "recent_pages": [],
                "recent_queries": [],
                "recent_actions": []
            }
        
        return {
            "recent_pages": context.get("recent_pages", [])[:limit],
            "recent_queries": context.get("recent_queries", [])[:limit],
            "recent_actions": context.get("recent_actions", [])[:limit]
        }
    
    # =====================================================
    # LONG-TERM MEMORY (Learning Progress)
    # =====================================================
    
    async def get_learning_memory(
        self,
        user_id: str,
        workspace_id: str,
        skill_id: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Get long-term learning memory (NOT sent to LLM)"""
        
        query = self.supabase.table("user_learning_memory")\
            .select("*")\
            .eq("user_id", user_id)\
            .eq("workspace_id", workspace_id)
        
        if skill_id:
            query = query.eq("skill_id", skill_id)
        
        result = query.execute()
        return result.data or []
    
    async def update_learning_memory(
        self,
        user_id: str,
        workspace_id: str,
        skill_id: str,
        topic: str,
        is_correct: bool,
        study_time: int = 0
    ) -> None:
        """Update learning memory after quiz/flashcard interaction"""
        
        # Call database function
        self.supabase.rpc(
            "update_learning_memory",
            {
                "p_user_id": user_id,
                "p_workspace_id": workspace_id,
                "p_skill_id": skill_id,
                "p_topic": topic,
                "p_is_correct": is_correct,
                "p_study_time": study_time
            }
        ).execute()
        
        # Invalidate cache
        if self.redis_available:
            await self._redis_delete(f"learning_memory:{user_id}:{workspace_id}")
    
    async def get_weak_areas(
        self,
        user_id: str,
        workspace_id: str,
        skill_id: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Get topics that need review (structured data, not text)"""
        
        memories = await self.get_learning_memory(user_id, workspace_id, skill_id)
        
        weak_areas = []
        for memory in memories:
            if memory.get("weak_areas"):
                weak_areas.extend(memory["weak_areas"])
        
        # Sort by error count
        weak_areas.sort(key=lambda x: x.get("error_count", 0), reverse=True)
        return weak_areas[:10]  # Top 10 weak areas
    
    # =====================================================
    # VECTOR SEARCH CACHE
    # =====================================================
    
    def _generate_query_hash(self, query: str, workspace_id: str) -> str:
        """Generate hash for query caching"""
        content = f"{query}:{workspace_id}"
        return hashlib.md5(content.encode()).hexdigest()
    
    async def get_cached_vector_search(
        self,
        query: str,
        workspace_id: str
    ) -> Optional[List[Dict[str, Any]]]:
        """Get cached vector search results"""
        
        query_hash = self._generate_query_hash(query, workspace_id)
        
        # Try Redis first (fastest)
        if self.redis_available:
            cache_key = f"vector_search:{query_hash}"
            cached = await self._redis_get(cache_key)
            if cached:
                # Increment hit count
                await self._redis_incr(f"vector_search_hits:{query_hash}")
                return json.loads(cached)
        
        # Try database cache - use limit(1) and handle empty results
        try:
            result = self.supabase.table("vector_search_cache")\
                .select("retrieved_chunks, hit_count")\
                .eq("query_hash", query_hash)\
                .eq("workspace_id", workspace_id)\
                .gt("expires_at", datetime.utcnow().isoformat())\
                .limit(1)\
                .execute()
            
            if result.data and len(result.data) > 0:
                chunks = result.data[0]["retrieved_chunks"]
                
                # Update hit count
                self.supabase.table("vector_search_cache")\
                    .update({
                        "hit_count": result.data[0].get("hit_count", 0) + 1,
                        "last_accessed": datetime.utcnow().isoformat()
                    })\
                    .eq("query_hash", query_hash)\
                    .execute()
                
                # Cache in Redis
                if self.redis_available:
                    await self._redis_set(
                        f"vector_search:{query_hash}",
                        json.dumps(chunks),
                        ex=3600  # 1 hour
                    )
                
                return chunks
        except Exception as e:
            print(f"Vector cache fetch error: {e}")
        
        return None
    
    async def cache_vector_search(
        self,
        query: str,
        workspace_id: str,
        chunks: List[Dict[str, Any]],
        query_embedding: Optional[List[float]] = None
    ) -> None:
        """Cache vector search results"""
        
        query_hash = self._generate_query_hash(query, workspace_id)
        
        # Cache in Redis (fast access)
        if self.redis_available:
            await self._redis_set(
                f"vector_search:{query_hash}",
                json.dumps(chunks),
                ex=3600  # 1 hour
            )
        
        # Cache in database (persistent)
        data = {
            "workspace_id": workspace_id,
            "query_text": query,
            "query_hash": query_hash,
            "retrieved_chunks": chunks,
            "chunk_count": len(chunks),
            "expires_at": (datetime.utcnow() + timedelta(hours=24)).isoformat()
        }
        
        if query_embedding:
            data["query_embedding"] = query_embedding
        
        self.supabase.table("vector_search_cache")\
            .upsert(data, on_conflict="query_hash")\
            .execute()
    
    # =====================================================
    # AI RESPONSE CACHE
    # =====================================================
    
    def _generate_response_hash(
        self,
        query: str,
        context: Dict[str, Any]
    ) -> tuple[str, str]:
        """Generate hashes for response caching"""
        query_hash = hashlib.md5(query.encode()).hexdigest()
        context_str = json.dumps(context, sort_keys=True)
        context_hash = hashlib.md5(context_str.encode()).hexdigest()
        return query_hash, context_hash
    
    async def get_cached_response(
        self,
        query: str,
        workspace_id: str,
        context: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """Get cached AI response"""
        
        query_hash, context_hash = self._generate_response_hash(query, context)
        
        # Try Redis first
        if self.redis_available:
            cache_key = f"ai_response:{query_hash}:{context_hash}"
            cached = await self._redis_get(cache_key)
            if cached:
                cached_data = json.loads(cached)
                # Ensure 'response' key exists for consistency
                if 'response' not in cached_data and 'text' in cached_data:
                    cached_data['response'] = cached_data['text']
                if 'sources' not in cached_data:
                    cached_data['sources'] = []
                return cached_data
        
        # Try database - use limit(1) and handle empty results
        try:
            result = self.supabase.table("ai_response_cache")\
                .select("*")\
                .eq("query_hash", query_hash)\
                .eq("context_hash", context_hash)\
                .eq("workspace_id", workspace_id)\
                .gt("expires_at", datetime.utcnow().isoformat())\
                .limit(1)\
                .execute()
            
            if result.data and len(result.data) > 0:
                response = {
                    "response": result.data[0]["response_text"],  # Use 'response' key for consistency
                    "text": result.data[0]["response_text"],  # Keep 'text' for backward compatibility
                    "type": result.data[0]["response_type"],
                    "data": result.data[0].get("response_data"),
                    "sources": result.data[0].get("sources") or []
                }
                
                # Update hit count
                self.supabase.table("ai_response_cache")\
                    .update({
                        "hit_count": result.data[0]["hit_count"] + 1,
                        "last_accessed": datetime.utcnow().isoformat()
                    })\
                    .eq("id", result.data[0]["id"])\
                    .execute()
                
                # Cache in Redis - ensure 'response' key is present
                if self.redis_available:
                    redis_response = {
                        **response,
                        "response": response.get("response") or response.get("text", "")
                    }
                    await self._redis_set(
                        f"ai_response:{query_hash}:{context_hash}",
                        json.dumps(redis_response),
                        ex=3600  # 1 hour
                    )
                
                return response
        except Exception as e:
            print(f"AI cache fetch error: {e}")
        
        return None
    
    async def cache_response(
        self,
        query: str,
        workspace_id: str,
        context: Dict[str, Any],
        response_text: str,
        response_type: str,
        response_data: Optional[Dict] = None,
        sources: Optional[List] = None,
        intent: Optional[str] = None
    ) -> None:
        """Cache AI response"""
        
        query_hash, context_hash = self._generate_response_hash(query, context)
        
        # Cache in Redis
        if self.redis_available:
            cache_data = {
                "response": response_text,  # Primary key for frontend
                "text": response_text,  # Backward compatibility
                "type": response_type,
                "data": response_data,
                "sources": sources or []
            }
            await self._redis_set(
                f"ai_response:{query_hash}:{context_hash}",
                json.dumps(cache_data),
                ex=3600  # 1 hour
            )
        
        # Cache in database
        data = {
            "workspace_id": workspace_id,
            "query_text": query,
            "query_hash": query_hash,
            "context_hash": context_hash,
            "response_text": response_text,
            "response_type": response_type,
            "response_data": response_data,
            "sources": sources,
            "intent": intent,
            "expires_at": (datetime.utcnow() + timedelta(hours=1)).isoformat()
        }
        
        self.supabase.table("ai_response_cache")\
            .insert(data)\
            .execute()
    
    # =====================================================
    # CONVERSATION MEMORY
    # =====================================================
    
    async def add_conversation_message(
        self,
        session_id: str,
        workspace_id: str,
        user_id: str,
        role: str,
        content: str,
        message_index: int,
        page_context: Optional[str] = None,
        skill_context: Optional[str] = None,
        intent: Optional[str] = None
    ) -> None:
        """Add message to conversation memory"""
        
        data = {
            "session_id": session_id,
            "workspace_id": workspace_id,
            "user_id": user_id,
            "message_index": message_index,
            "role": role,
            "content": content,
            "page_context": page_context,
            "skill_context": skill_context,
            "intent": intent,
            "token_count": len(content.split()),  # Rough estimate
            "summary": ""  # Add empty summary to satisfy NOT NULL constraint
        }
        
        self.supabase.table("conversation_memory")\
            .insert(data)\
            .execute()
    
    async def get_conversation_history(
        self,
        session_id: str,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """Get recent conversation history"""
        
        result = self.supabase.table("conversation_memory")\
            .select("role, content, created_at")\
            .eq("session_id", session_id)\
            .order("message_index", desc=True)\
            .limit(limit)\
            .execute()
        
        # Reverse to get chronological order
        return list(reversed(result.data or []))
    
    # =====================================================
    # CACHE MANAGEMENT
    # =====================================================
    
    async def clear_expired_cache(self) -> Dict[str, int]:
        """Clear expired cache entries"""
        
        # Clear database cache
        vector_result = self.supabase.table("vector_search_cache")\
            .delete()\
            .lt("expires_at", datetime.utcnow().isoformat())\
            .execute()
        
        ai_result = self.supabase.table("ai_response_cache")\
            .delete()\
            .lt("expires_at", datetime.utcnow().isoformat())\
            .execute()
        
        return {
            "vector_cache_cleared": len(vector_result.data or []),
            "ai_cache_cleared": len(ai_result.data or [])
        }
    
    async def get_cache_stats(self, workspace_id: str) -> Dict[str, Any]:
        """Get cache statistics"""
        
        stats = {}
        
        # Vector search cache stats
        vector_stats = self.supabase.table("vector_search_cache")\
            .select("id, hit_count")\
            .eq("workspace_id", workspace_id)\
            .execute()
        
        stats["vector_cache_entries"] = len(vector_stats.data or [])
        stats["vector_cache_hits"] = sum(item["hit_count"] for item in (vector_stats.data or []))
        
        # AI response cache stats
        ai_stats = self.supabase.table("ai_response_cache")\
            .select("id, hit_count")\
            .eq("workspace_id", workspace_id)\
            .execute()
        
        stats["ai_cache_entries"] = len(ai_stats.data or [])
        stats["ai_cache_hits"] = sum(item["hit_count"] for item in (ai_stats.data or []))
        
        # Upstash stats
        stats["redis_provider"] = "Upstash"
        stats["redis_available"] = self.redis_available
        stats["vector_provider"] = "Upstash Vector"
        stats["vector_available"] = self.vector_available
        
        return stats

    # =====================================================
    # INTERACTION TRACKING (for learning from user behavior)
    # =====================================================
    
    async def record_interaction(
        self,
        user_id: str,
        workspace_id: str,
        topic: str,
        interaction_type: str,
        success: bool = True,
        metadata: Optional[Dict] = None
    ) -> None:
        """
        Record a user interaction for learning/retention tracking
        
        Args:
            user_id: User ID
            workspace_id: Workspace ID
            topic: Topic of interaction
            interaction_type: Type (ask, create, update, etc.)
            success: Whether interaction was successful
            metadata: Additional metadata
        """
        try:
            # Check if topic exists in learning_memory
            existing = self.supabase.table("learning_memory")\
                .select("id, interaction_count, confidence")\
                .eq("user_id", user_id)\
                .eq("workspace_id", workspace_id)\
                .eq("topic", topic)\
                .limit(1)\
                .execute()
            
            if existing.data and len(existing.data) > 0:
                # Update existing record
                record = existing.data[0]
                new_count = record.get("interaction_count", 0) + 1
                # Slightly increase confidence with each successful interaction
                new_confidence = min(1.0, record.get("confidence", 0.5) + (0.02 if success else -0.05))
                
                self.supabase.table("learning_memory")\
                    .update({
                        "interaction_count": new_count,
                        "confidence": new_confidence,
                        "last_reviewed": datetime.utcnow().isoformat(),
                        "last_interaction_type": interaction_type
                    })\
                    .eq("id", record["id"])\
                    .execute()
            else:
                # Create new record
                self.supabase.table("learning_memory")\
                    .insert({
                        "user_id": user_id,
                        "workspace_id": workspace_id,
                        "topic": topic,
                        "confidence": 0.5,
                        "interaction_count": 1,
                        "last_reviewed": datetime.utcnow().isoformat(),
                        "last_interaction_type": interaction_type,
                        "error_count": 0 if success else 1
                    })\
                    .execute()
                    
        except Exception as e:
            print(f"Error recording interaction: {e}")


# Create singleton instance
memory_service = MemoryService(supabase_admin)
