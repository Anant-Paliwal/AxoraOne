"""
Redis Client Configuration

Provides async Redis connection for caching.
Falls back gracefully if Redis is not available.
"""

import os
from typing import Optional
import redis.asyncio as redis
from redis.asyncio import Redis

class RedisClient:
    """Async Redis client with fallback"""
    
    def __init__(self):
        self.client: Optional[Redis] = None
        self.enabled = False
        self._initialize()
    
    def _initialize(self):
        """Initialize Redis connection"""
        try:
            redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
            self.client = redis.from_url(
                redis_url,
                encoding="utf-8",
                decode_responses=True,
                socket_connect_timeout=2,
                socket_timeout=2
            )
            self.enabled = True
            print(f"✓ Redis client initialized: {redis_url}")
        except Exception as e:
            print(f"⚠ Redis not available: {e}")
            print("  Caching disabled - system will work without it")
            self.enabled = False
    
    async def get(self, key: str) -> Optional[str]:
        """Get value from cache"""
        if not self.enabled or not self.client:
            return None
        try:
            return await self.client.get(key)
        except Exception as e:
            print(f"Redis get error: {e}")
            return None
    
    async def set(self, key: str, value: str, ex: Optional[int] = None):
        """Set value in cache"""
        if not self.enabled or not self.client:
            return
        try:
            await self.client.set(key, value, ex=ex)
        except Exception as e:
            print(f"Redis set error: {e}")
    
    async def setex(self, key: str, seconds: int, value: str):
        """Set value with expiration"""
        if not self.enabled or not self.client:
            return
        try:
            await self.client.setex(key, seconds, value)
        except Exception as e:
            print(f"Redis setex error: {e}")
    
    async def delete(self, *keys: str):
        """Delete keys from cache"""
        if not self.enabled or not self.client:
            return
        try:
            await self.client.delete(*keys)
        except Exception as e:
            print(f"Redis delete error: {e}")
    
    async def keys(self, pattern: str):
        """Get keys matching pattern"""
        if not self.enabled or not self.client:
            return []
        try:
            return await self.client.keys(pattern)
        except Exception as e:
            print(f"Redis keys error: {e}")
            return []
    
    async def info(self, section: str = "default"):
        """Get Redis info"""
        if not self.enabled or not self.client:
            return {}
        try:
            return await self.client.info(section)
        except Exception as e:
            print(f"Redis info error: {e}")
            return {}
    
    async def ping(self) -> bool:
        """Check if Redis is available"""
        if not self.enabled or not self.client:
            return False
        try:
            await self.client.ping()
            return True
        except Exception as e:
            print(f"Redis ping error: {e}")
            return False
    
    async def close(self):
        """Close Redis connection"""
        if self.client:
            await self.client.close()


# Global instance
redis_client = RedisClient()
