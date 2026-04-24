"""
Context Gatherer Service for Ask Anything
Efficiently gathers relevant context from workspace without loading everything
"""
import asyncio
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass
from datetime import datetime, timedelta
import logging

from app.core.supabase import supabase_admin

logger = logging.getLogger(__name__)


@dataclass
class GatheredContext:
    """Structured context gathered from workspace"""
    relevant_pages: List[Dict[str, Any]]
    relevant_skills: List[Dict[str, Any]]
    relevant_tasks: List[Dict[str, Any]]
    mentioned_items: List[Dict[str, Any]]
    recent_activity: List[Dict[str, Any]]
    learning_history: List[Dict[str, Any]]
    weak_areas: List[Dict[str, Any]]
    related_concepts: List[str]
    context_summary: str
    total_items_scanned: int
    relevance_score: float


class ContextGatherer:
    """
    Intelligent context gathering for Ask Anything
    Only loads relevant data based on query and user history
    """
    
    # Maximum items to load per category for performance
    MAX_PAGES = 50
    MAX_SKILLS = 30
    MAX_TASKS = 50
    MAX_RECENT_ACTIVITY = 20
    
    def __init__(self):
        self.cache = {}  # Simple in-memory cache
        self.cache_ttl = 300  # 5 minutes
    
    async def gather_context(
        self,
        query: str,
        user_id: str,
        workspace_id: str,
        mentioned_items: List[Dict[str, str]] = None,
        topic: str = None,
        limit_results: int = 10
    ) -> GatheredContext:
        """
        Gather relevant context for a query
        
        Args:
            query: User's query
            user_id: Current user ID
            workspace_id: Current workspace ID
            mentioned_items: Items mentioned with @ syntax
            topic: Extracted topic from intent detection
            limit_results: Max results per category
            
        Returns:
            GatheredContext with relevant workspace data
        """
        mentioned_items = mentioned_items or []
        topic = topic or query
        
        # Extract keywords for relevance matching
        keywords = self._extract_keywords(query, topic)
        
        # Gather data in parallel for performance
        results = await asyncio.gather(
            self._get_relevant_pages(user_id, workspace_id, keywords, limit_results),
            self._get_relevant_skills(user_id, workspace_id, keywords, limit_results),
            self._get_relevant_tasks(user_id, workspace_id, keywords, limit_results),
            self._get_mentioned_items_data(user_id, mentioned_items),
            self._get_recent_activity(user_id, workspace_id),
            self._get_learning_history(user_id, workspace_id, keywords),
            self._get_weak_areas(user_id, workspace_id),
            return_exceptions=True
        )
        
        # Unpack results with error handling
        relevant_pages = results[0] if not isinstance(results[0], Exception) else []
        relevant_skills = results[1] if not isinstance(results[1], Exception) else []
        relevant_tasks = results[2] if not isinstance(results[2], Exception) else []
        mentioned_data = results[3] if not isinstance(results[3], Exception) else []
        recent_activity = results[4] if not isinstance(results[4], Exception) else []
        learning_history = results[5] if not isinstance(results[5], Exception) else []
        weak_areas = results[6] if not isinstance(results[6], Exception) else []
        
        # Extract related concepts from gathered data
        related_concepts = self._extract_related_concepts(
            relevant_pages, relevant_skills, keywords
        )
        
        # Calculate total items scanned
        total_scanned = (
            len(relevant_pages) + len(relevant_skills) + 
            len(relevant_tasks) + len(mentioned_data)
        )
        
        # Calculate relevance score
        relevance_score = self._calculate_relevance_score(
            query, relevant_pages, relevant_skills, mentioned_data
        )
        
        # Build context summary
        context_summary = self._build_context_summary(
            relevant_pages, relevant_skills, relevant_tasks,
            mentioned_data, weak_areas, keywords
        )
        
        context = GatheredContext(
            relevant_pages=relevant_pages,
            relevant_skills=relevant_skills,
            relevant_tasks=relevant_tasks,
            mentioned_items=mentioned_data,
            recent_activity=recent_activity,
            learning_history=learning_history,
            weak_areas=weak_areas,
            related_concepts=related_concepts,
            context_summary=context_summary,
            total_items_scanned=total_scanned,
            relevance_score=relevance_score
        )
        
        logger.info(f"📚 Gathered context: {len(relevant_pages)} pages, {len(relevant_skills)} skills, "
                   f"{len(relevant_tasks)} tasks, {len(mentioned_data)} mentioned, "
                   f"relevance: {relevance_score:.2f}")
        
        return context
    
    def _extract_keywords(self, query: str, topic: str) -> List[str]:
        """Extract relevant keywords from query and topic"""
        # Combine query and topic
        text = f"{query} {topic}".lower()
        
        # Remove common stop words
        stop_words = {
            "a", "an", "the", "is", "are", "was", "were", "be", "been",
            "being", "have", "has", "had", "do", "does", "did", "will",
            "would", "could", "should", "may", "might", "must", "shall",
            "can", "need", "dare", "ought", "used", "to", "of", "in",
            "for", "on", "with", "at", "by", "from", "as", "into",
            "through", "during", "before", "after", "above", "below",
            "between", "under", "again", "further", "then", "once",
            "here", "there", "when", "where", "why", "how", "all",
            "each", "few", "more", "most", "other", "some", "such",
            "no", "nor", "not", "only", "own", "same", "so", "than",
            "too", "very", "just", "and", "but", "if", "or", "because",
            "until", "while", "about", "create", "make", "page", "skill",
            "task", "please", "want", "need", "help", "me", "i", "my"
        }
        
        # Extract words
        words = text.split()
        keywords = []
        
        for word in words:
            # Clean word
            clean_word = ''.join(c for c in word if c.isalnum())
            if clean_word and clean_word not in stop_words and len(clean_word) > 2:
                keywords.append(clean_word)
        
        # Remove duplicates while preserving order
        seen = set()
        unique_keywords = []
        for kw in keywords:
            if kw not in seen:
                seen.add(kw)
                unique_keywords.append(kw)
        
        return unique_keywords[:10]  # Limit to top 10 keywords
    
    async def _get_relevant_pages(
        self, 
        user_id: str, 
        workspace_id: str, 
        keywords: List[str],
        limit: int
    ) -> List[Dict[str, Any]]:
        """Get pages relevant to the query keywords"""
        try:
            # Get all pages for workspace (limited)
            response = supabase_admin.table("pages").select(
                "id, title, content, tags, icon, parent_page_id, created_at, updated_at"
            ).eq("workspace_id", workspace_id).eq("user_id", user_id).limit(self.MAX_PAGES).execute()
            
            pages = response.data or []
            
            # Score pages by relevance
            scored_pages = []
            for page in pages:
                score = self._calculate_item_relevance(page, keywords, ["title", "content", "tags"])
                if score > 0:
                    page["_relevance_score"] = score
                    scored_pages.append(page)
            
            # Sort by relevance and return top results
            scored_pages.sort(key=lambda x: x.get("_relevance_score", 0), reverse=True)
            return scored_pages[:limit]
            
        except Exception as e:
            logger.error(f"Error getting relevant pages: {e}")
            return []
    
    async def _get_relevant_skills(
        self, 
        user_id: str, 
        workspace_id: str, 
        keywords: List[str],
        limit: int
    ) -> List[Dict[str, Any]]:
        """Get skills relevant to the query keywords"""
        try:
            # Query without confidence column (may not exist in all setups)
            response = supabase_admin.table("skills").select(
                "id, name, level, description, created_at"
            ).eq("workspace_id", workspace_id).eq("user_id", user_id).limit(self.MAX_SKILLS).execute()
            
            skills = response.data or []
            
            # Score skills by relevance
            scored_skills = []
            for skill in skills:
                score = self._calculate_item_relevance(skill, keywords, ["name", "description"])
                if score > 0:
                    skill["_relevance_score"] = score
                    scored_skills.append(skill)
            
            scored_skills.sort(key=lambda x: x.get("_relevance_score", 0), reverse=True)
            return scored_skills[:limit]
            
        except Exception as e:
            logger.error(f"Error getting relevant skills: {e}")
            return []
    
    async def _get_relevant_tasks(
        self, 
        user_id: str, 
        workspace_id: str, 
        keywords: List[str],
        limit: int
    ) -> List[Dict[str, Any]]:
        """Get tasks relevant to the query keywords, including their linked sources"""
        try:
            # Fetch tasks with their linked page and skill data
            response = supabase_admin.table("tasks").select(
                "id, title, description, status, priority, due_date, created_at, "
                "linked_page_id, linked_skill_id, "
                "linked_page:pages!tasks_linked_page_id_fkey(id, title, content), "
                "linked_skill:skills!tasks_linked_skill_id_fkey(id, name, description)"
            ).eq("workspace_id", workspace_id).eq("user_id", user_id).limit(self.MAX_TASKS).execute()
            
            tasks = response.data or []
            
            # Score tasks by relevance (including linked content)
            scored_tasks = []
            for task in tasks:
                # Calculate base relevance from task itself
                score = self._calculate_item_relevance(task, keywords, ["title", "description"])
                
                # Boost score if linked page is relevant
                if task.get("linked_page"):
                    page_score = self._calculate_item_relevance(
                        task["linked_page"], keywords, ["title", "content"]
                    )
                    score += page_score * 0.5  # 50% weight for linked page
                
                # Boost score if linked skill is relevant
                if task.get("linked_skill"):
                    skill_score = self._calculate_item_relevance(
                        task["linked_skill"], keywords, ["name", "description"]
                    )
                    score += skill_score * 0.3  # 30% weight for linked skill
                
                if score > 0:
                    task["_relevance_score"] = score
                    scored_tasks.append(task)
            
            scored_tasks.sort(key=lambda x: x.get("_relevance_score", 0), reverse=True)
            return scored_tasks[:limit]
            
        except Exception as e:
            logger.error(f"Error getting relevant tasks: {e}")
            return []
    
    async def _get_mentioned_items_data(
        self, 
        user_id: str, 
        mentioned_items: List[Dict[str, str]]
    ) -> List[Dict[str, Any]]:
        """Get full data for mentioned items"""
        if not mentioned_items:
            return []
        
        results = []
        for item in mentioned_items:
            item_type = item.get("type")
            item_id = item.get("id")
            item_name = item.get("name")
            
            try:
                if item_type == "page":
                    response = supabase_admin.table("pages").select("*").eq("id", item_id).single().execute()
                    if response.data:
                        results.append({
                            "type": "page",
                            "data": response.data,
                            "name": item_name
                        })
                elif item_type == "skill":
                    response = supabase_admin.table("skills").select("*").eq("id", item_id).single().execute()
                    if response.data:
                        results.append({
                            "type": "skill",
                            "data": response.data,
                            "name": item_name
                        })
                elif item_type == "task":
                    # Fetch task with linked sources
                    response = supabase_admin.table("tasks").select(
                        "*, "
                        "linked_page:pages!tasks_linked_page_id_fkey(id, title, content), "
                        "linked_skill:skills!tasks_linked_skill_id_fkey(id, name, description)"
                    ).eq("id", item_id).single().execute()
                    if response.data:
                        results.append({
                            "type": "task",
                            "data": response.data,
                            "name": item_name
                        })
            except Exception as e:
                logger.warning(f"Could not fetch mentioned {item_type} {item_id}: {e}")
        
        return results
    
    async def _get_recent_activity(
        self, 
        user_id: str, 
        workspace_id: str
    ) -> List[Dict[str, Any]]:
        """Get recent user activity in workspace"""
        try:
            # Get recently updated pages
            pages_response = supabase_admin.table("pages").select(
                "id, title, updated_at"
            ).eq("workspace_id", workspace_id).eq("user_id", user_id).order(
                "updated_at", desc=True
            ).limit(self.MAX_RECENT_ACTIVITY).execute()
            
            activity = []
            for page in (pages_response.data or []):
                activity.append({
                    "type": "page_updated",
                    "item_id": page["id"],
                    "title": page["title"],
                    "timestamp": page["updated_at"]
                })
            
            return activity[:self.MAX_RECENT_ACTIVITY]
            
        except Exception as e:
            logger.error(f"Error getting recent activity: {e}")
            return []
    
    async def _get_learning_history(
        self, 
        user_id: str, 
        workspace_id: str,
        keywords: List[str]
    ) -> List[Dict[str, Any]]:
        """Get learning history related to keywords"""
        try:
            response = supabase_admin.table("learning_memory").select(
                "topic, confidence, last_reviewed, error_count"
            ).eq("workspace_id", workspace_id).eq("user_id", user_id).execute()
            
            history = response.data or []
            
            # Filter by relevance to keywords
            relevant_history = []
            for item in history:
                topic_lower = item.get("topic", "").lower()
                for keyword in keywords:
                    if keyword in topic_lower:
                        relevant_history.append(item)
                        break
            
            return relevant_history[:10]
            
        except Exception as e:
            logger.error(f"Error getting learning history: {e}")
            return []
    
    async def _get_weak_areas(
        self, 
        user_id: str, 
        workspace_id: str
    ) -> List[Dict[str, Any]]:
        """Get topics where user has shown difficulty"""
        try:
            response = supabase_admin.table("learning_memory").select(
                "topic, confidence, error_count, last_reviewed"
            ).eq("workspace_id", workspace_id).eq("user_id", user_id).lt(
                "confidence", 0.5
            ).order("error_count", desc=True).limit(5).execute()
            
            return response.data or []
            
        except Exception as e:
            logger.error(f"Error getting weak areas: {e}")
            return []
    
    def _calculate_item_relevance(
        self, 
        item: Dict[str, Any], 
        keywords: List[str],
        fields: List[str]
    ) -> float:
        """Calculate relevance score for an item based on keyword matches"""
        if not keywords:
            return 0.5  # Default relevance if no keywords
        
        score = 0.0
        total_keywords = len(keywords)
        
        for field in fields:
            field_value = item.get(field, "")
            if isinstance(field_value, list):
                field_value = " ".join(str(v) for v in field_value)
            elif not isinstance(field_value, str):
                field_value = str(field_value) if field_value else ""
            
            field_lower = field_value.lower()
            
            for keyword in keywords:
                if keyword in field_lower:
                    # Higher weight for title/name matches
                    if field in ["title", "name"]:
                        score += 2.0 / total_keywords
                    else:
                        score += 1.0 / total_keywords
        
        return min(score, 1.0)
    
    def _calculate_relevance_score(
        self,
        query: str,
        pages: List[Dict],
        skills: List[Dict],
        mentioned: List[Dict]
    ) -> float:
        """Calculate overall relevance score for gathered context"""
        if not pages and not skills and not mentioned:
            return 0.0
        
        # Base score from having relevant items
        score = 0.0
        
        if mentioned:
            score += 0.4  # Mentioned items are highly relevant
        
        if pages:
            avg_page_relevance = sum(p.get("_relevance_score", 0) for p in pages) / len(pages)
            score += avg_page_relevance * 0.3
        
        if skills:
            avg_skill_relevance = sum(s.get("_relevance_score", 0) for s in skills) / len(skills)
            score += avg_skill_relevance * 0.3
        
        return min(score, 1.0)
    
    def _extract_related_concepts(
        self,
        pages: List[Dict],
        skills: List[Dict],
        keywords: List[str]
    ) -> List[str]:
        """Extract related concepts from gathered data"""
        concepts = set()
        
        # Extract from page tags
        for page in pages:
            tags = page.get("tags", [])
            if isinstance(tags, list):
                concepts.update(tags)
        
        # Extract from skill names
        for skill in skills:
            name = skill.get("name", "")
            if name:
                concepts.add(name)
        
        # Add keywords as concepts
        concepts.update(keywords)
        
        return list(concepts)[:20]
    
    def _build_context_summary(
        self,
        pages: List[Dict],
        skills: List[Dict],
        tasks: List[Dict],
        mentioned: List[Dict],
        weak_areas: List[Dict],
        keywords: List[str]
    ) -> str:
        """Build a human-readable context summary"""
        parts = []
        
        if mentioned:
            parts.append(f"🎯 User specifically mentioned {len(mentioned)} item(s)")
        
        if pages:
            parts.append(f"📄 Found {len(pages)} relevant page(s)")
        
        if skills:
            parts.append(f"⭐ Found {len(skills)} related skill(s)")
        
        if tasks:
            pending = sum(1 for t in tasks if t.get("status") != "completed")
            parts.append(f"✅ Found {len(tasks)} related task(s) ({pending} pending)")
        
        if weak_areas:
            parts.append(f"⚠️ User has {len(weak_areas)} weak area(s) to review")
        
        if not parts:
            parts.append("📭 No relevant content found in workspace")
        
        return " | ".join(parts)


# Singleton instance
context_gatherer = ContextGatherer()
