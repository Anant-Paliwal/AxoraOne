import httpx
from typing import List, Dict, Any, Optional, Tuple
from app.core.config import settings
import logging
import hashlib
import re
from collections import Counter

logger = logging.getLogger(__name__)

class VectorStoreService:
    def __init__(self):
        self.upstash_available = False
        self.gemini_api_key = settings.GEMINI_API_KEY
        self.openai_api_key = settings.OPENAI_API_KEY
        
        # Initialize Upstash Vector client
        if settings.UPSTASH_VECTOR_REST_URL and settings.UPSTASH_VECTOR_REST_TOKEN:
            self.vector_url = settings.UPSTASH_VECTOR_REST_URL
            self.vector_token = settings.UPSTASH_VECTOR_REST_TOKEN
            self.vector_headers = {
                "Authorization": f"Bearer {self.vector_token}",
                "Content-Type": "application/json"
            }
            self.upstash_available = True
    
    def _generate_sparse_vector(self, text: str) -> Tuple[List[int], List[float]]:
        """Generate sparse vector from text using simple term frequency"""
        # Tokenize and clean text
        words = re.findall(r'\b\w+\b', text.lower())
        
        # Count word frequencies
        word_counts = Counter(words)
        total_words = len(words) if words else 1
        
        # Generate indices and values
        indices = []
        values = []
        
        for word, count in word_counts.most_common(100):  # Top 100 terms
            # Use hash to get consistent index for each word
            word_hash = int(hashlib.md5(word.encode()).hexdigest()[:8], 16)
            index = word_hash % 30000  # Keep indices in reasonable range
            
            # TF value (normalized)
            tf = count / total_words
            
            indices.append(index)
            values.append(float(tf))
        
        # Ensure we have at least one entry
        if not indices:
            indices = [0]
            values = [0.1]
        
        return indices, values
        
    async def initialize(self):
        """Initialize vector store"""
        try:
            if self.upstash_available and (self.gemini_api_key or self.openai_api_key):
                embedding_provider = "Gemini" if self.gemini_api_key else "OpenAI"
                logger.info(f"Vector store initialized successfully with Upstash Vector + {embedding_provider} embeddings")
            elif self.upstash_available:
                logger.warning("Upstash Vector configured but no API key - vector search disabled")
                self.upstash_available = False
            else:
                logger.warning("Upstash Vector not configured - vector search will be limited")
        except Exception as e:
            logger.error(f"Failed to initialize vector store: {e}")
            logger.warning("Continuing without vector store functionality")
    
    async def close(self):
        """Cleanup resources"""
        pass
        
    async def embed_text(self, text: str) -> List[float]:
        """Generate embedding for text using Gemini or OpenAI API"""
        # Try Gemini first if available
        if self.gemini_api_key:
            try:
                return await self._embed_with_gemini(text)
            except Exception as e:
                logger.warning(f"Gemini embedding failed, trying OpenAI: {e}")
        
        # Fallback to OpenAI
        if self.openai_api_key:
            return await self._embed_with_openai(text)
        
        raise RuntimeError("No embedding API key configured (need Gemini or OpenAI)")
    
    async def _embed_with_gemini(self, text: str) -> List[float]:
        """Generate embedding using Google Gemini API (768 dims → padded to 1536)"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key={self.gemini_api_key}",
                    headers={"Content-Type": "application/json"},
                    json={
                        "model": "models/text-embedding-004",
                        "content": {
                            "parts": [{"text": text}]
                        }
                    },
                    timeout=30.0
                )
                
                if response.status_code != 200:
                    logger.error(f"Gemini embedding failed: {response.text}")
                    raise RuntimeError(f"Gemini embedding failed: {response.status_code}")
                
                data = response.json()
                embedding = data["embedding"]["values"]
                
                # Pad from 768 to 1536 dimensions (Upstash expects 1536)
                if len(embedding) == 768:
                    # Pad with zeros to reach 1536 dimensions
                    embedding = embedding + [0.0] * (1536 - 768)
                
                return embedding
        except Exception as e:
            logger.error(f"Error generating Gemini embedding: {e}")
            raise
    
    async def _embed_with_openai(self, text: str) -> List[float]:
        """Generate embedding using OpenAI API (1536 dimensions)"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "https://api.openai.com/v1/embeddings",
                    headers={
                        "Authorization": f"Bearer {self.openai_api_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "input": text,
                        "model": "text-embedding-3-small"  # 1536 dimensions
                    },
                    timeout=30.0
                )
                
                if response.status_code != 200:
                    logger.error(f"OpenAI embedding failed: {response.text}")
                    raise RuntimeError(f"OpenAI embedding failed: {response.status_code}")
                
                data = response.json()
                embedding = data["data"][0]["embedding"]
                return embedding
        except Exception as e:
            logger.error(f"Error generating OpenAI embedding: {e}")
            raise
    
    async def add_page(self, page_id: str, title: str, content: str, metadata: Dict[str, Any]):
        """Add page to Upstash Vector store with error surfacing"""
        if not self.upstash_available:
            logger.warning(f"⚠️ Upstash Vector not configured - page {page_id} skipped")
            return True  # Don't fail, just skip
            
        try:
            text = f"{title}\n\n{content}"
            embedding = await self.embed_text(text)
            
            # Generate sparse vector from text
            sparse_indices, sparse_values = self._generate_sparse_vector(text)
            
            # Upsert to Upstash Vector with both dense and sparse vectors
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.vector_url}/upsert",
                    headers=self.vector_headers,
                    json={
                        "id": page_id,
                        "vector": embedding,
                        "sparseVector": {
                            "indices": sparse_indices,
                            "values": sparse_values
                        },
                        "metadata": {
                            "title": title,
                            "content": content[:500],
                            "user_id": metadata.get("user_id"),
                            "workspace_id": metadata.get("workspace_id"),
                            "tags": metadata.get("tags", [])
                        }
                    },
                    timeout=10.0
                )
                
                if response.status_code != 200:
                    logger.warning(f"⚠️ Vector indexing skipped for page {page_id}: {response.text}")
                    return True  # Don't fail the page save
                else:
                    logger.info(f"✅ Indexed page {page_id} in vector store: {title}")
                    return True
        except Exception as e:
            logger.warning(f"⚠️ Vector indexing skipped for page {page_id}: {e}")
            return True  # Don't fail the page save
        
    async def search_pages(self, query: str, limit: int = 10, workspace_id: str = None) -> List[Dict[str, Any]]:
        """Search pages by semantic similarity using Upstash Vector"""
        if not self.upstash_available:
            logger.warning("Upstash Vector not available")
            return []
            
        try:
            query_embedding = await self.embed_text(query)
            
            # Build query - send dense vector directly (Upstash handles conversion)
            query_data = {
                "vector": query_embedding,  # Send as dense array
                "topK": limit * 2,  # Get more for filtering
                "includeMetadata": True
            }
            
            # Add workspace filter if provided
            if workspace_id:
                query_data["filter"] = f"workspace_id = '{workspace_id}'"
            
            # Query Upstash Vector
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.vector_url}/query",
                    headers=self.vector_headers,
                    json=query_data,
                    timeout=10.0
                )
                
                if response.status_code != 200:
                    logger.error(f"Upstash Vector query failed: {response.text}")
                    return []
                
                data = response.json()
                results = []
                
                for item in data.get("result", [])[:limit]:
                    metadata = item.get("metadata", {})
                    results.append({
                        "id": item.get("id"),
                        "document": f"{metadata.get('title', '')}\n\n{metadata.get('content', '')}",
                        "metadata": metadata,
                        "distance": 1 - item.get("score", 0)  # Convert score to distance
                    })
                
                return results
        except Exception as e:
            logger.error(f"Error searching pages: {e}")
            return []
    
    async def find_related_pages(self, page_id: str, limit: int = 5) -> List[Dict[str, Any]]:
        """Find pages related to a given page using Upstash Vector"""
        if not self.upstash_available:
            return []
            
        try:
            # Fetch the page vector from Upstash
            async with httpx.AsyncClient() as client:
                fetch_response = await client.get(
                    f"{self.vector_url}/fetch",
                    headers=self.vector_headers,
                    params={"ids": page_id},
                    timeout=10.0
                )
                
                if fetch_response.status_code != 200:
                    logger.error(f"Failed to fetch page vector: {fetch_response.text}")
                    return []
                
                fetch_data = fetch_response.json()
                vectors = fetch_data.get("result", [])
                
                if not vectors:
                    return []
                
                page_vector = vectors[0].get("vector")
                if not page_vector:
                    return []
                
                # Convert to sparse format if needed
                if isinstance(page_vector, list):
                    # Dense format - convert to sparse
                    sparse_indices = []
                    sparse_values = []
                    for i, val in enumerate(page_vector):
                        if abs(val) > 1e-6:
                            sparse_indices.append(i)
                            sparse_values.append(val)
                    page_vector = {
                        "indices": sparse_indices,
                        "values": sparse_values
                    }
                
                # Query for similar pages
                query_response = await client.post(
                    f"{self.vector_url}/query",
                    headers=self.vector_headers,
                    json={
                        "vector": page_vector,
                        "topK": limit + 1,  # +1 to exclude self
                        "includeMetadata": True
                    },
                    timeout=10.0
                )
                
                if query_response.status_code != 200:
                    return []
                
                query_data = query_response.json()
                related = []
                
                for item in query_data.get("result", []):
                    # Skip the source page
                    if item.get("id") == page_id:
                        continue
                    
                    related.append({
                        "id": item.get("id"),
                        "metadata": item.get("metadata", {}),
                        "distance": 1 - item.get("score", 0)
                    })
                    
                    if len(related) >= limit:
                        break
                
                return related
        except Exception as e:
            logger.error(f"Error finding related pages: {e}")
            return []
    
    async def delete_page(self, page_id: str):
        """Delete page from Upstash Vector store"""
        if not self.upstash_available:
            logger.warning("Upstash Vector not available, skipping delete_page")
            return
            
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.vector_url}/delete",
                    headers=self.vector_headers,
                    json={"ids": [page_id]},
                    timeout=10.0
                )
                
                if response.status_code != 200:
                    logger.error(f"Upstash Vector delete failed: {response.text}")
                else:
                    logger.info(f"Deleted page {page_id} from Upstash Vector")
        except Exception as e:
            logger.error(f"Error deleting page from vector store: {e}")

vector_store_service = VectorStoreService()
