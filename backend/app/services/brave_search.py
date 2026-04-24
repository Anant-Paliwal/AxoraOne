import httpx
from typing import List, Dict, Any
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

class BraveSearchService:
    def __init__(self):
        self.api_key = settings.BRAVE_API_KEY
        self.base_url = "https://api.search.brave.com/res/v1/web/search"
        
    async def search(self, query: str, count: int = 10) -> List[Dict[str, Any]]:
        """Search the web using Brave Search API"""
        if not self.api_key:
            logger.warning("Brave API key not configured")
            return []
            
        try:
            headers = {
                "Accept": "application/json",
                "Accept-Encoding": "gzip",
                "X-Subscription-Token": self.api_key
            }
            
            params = {
                "q": query,
                "count": count,
                "text_decorations": False,
                "search_lang": "en"
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    self.base_url,
                    headers=headers,
                    params=params,
                    timeout=10.0
                )
                
                if response.status_code != 200:
                    logger.error(f"Brave API error: {response.status_code} - {response.text}")
                    return []
                
                data = response.json()
                results = []
                
                # Parse web results
                if "web" in data and "results" in data["web"]:
                    for item in data["web"]["results"]:
                        results.append({
                            "title": item.get("title", ""),
                            "url": item.get("url", ""),
                            "description": item.get("description", ""),
                            "type": "web"
                        })
                
                return results
                
        except Exception as e:
            logger.error(f"Error searching with Brave: {e}")
            return []

brave_search_service = BraveSearchService()
