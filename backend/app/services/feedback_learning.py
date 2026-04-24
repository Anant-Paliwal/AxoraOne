"""
Feedback Learning Service
Learns from user feedback to improve AI responses
"""
import logging
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
from collections import Counter

from app.core.supabase import supabase_admin

logger = logging.getLogger(__name__)


class FeedbackLearningService:
    """
    Analyzes user feedback to improve agent responses
    """
    
    async def analyze_feedback(
        self, 
        workspace_id: str,
        days_back: int = 30
    ) -> Dict[str, Any]:
        """
        Analyze feedback patterns for a workspace
        
        Returns:
            - success_rate: % of helpful responses
            - common_failures: Types of queries that get negative feedback
            - successful_patterns: What works well
            - mode_performance: Performance by mode (ask/build/plan)
        """
        try:
            cutoff_date = datetime.now() - timedelta(days=days_back)
            
            # Get all feedback for workspace
            response = supabase_admin.table("ai_action_feedback")\
                .select("*")\
                .eq("workspace_id", workspace_id)\
                .gte("created_at", cutoff_date.isoformat())\
                .execute()
            
            feedback_items = response.data
            
            if not feedback_items:
                return {
                    "success_rate": 0,
                    "total_feedback": 0,
                    "common_failures": [],
                    "successful_patterns": [],
                    "mode_performance": {}
                }
            
            # Calculate success rate
            helpful_count = sum(1 for f in feedback_items if f["rating"] == "helpful")
            total_count = len(feedback_items)
            success_rate = (helpful_count / total_count * 100) if total_count > 0 else 0
            
            # Analyze by mode
            mode_stats = {}
            for mode in ["ask", "build", "plan", "agent"]:
                mode_items = [f for f in feedback_items if f.get("mode") == mode]
                if mode_items:
                    mode_helpful = sum(1 for f in mode_items if f["rating"] == "helpful")
                    mode_stats[mode] = {
                        "total": len(mode_items),
                        "helpful": mode_helpful,
                        "success_rate": (mode_helpful / len(mode_items) * 100)
                    }
            
            # Find common failure patterns
            failures = [f for f in feedback_items if f["rating"] == "not_helpful"]
            failure_queries = [f.get("query", "")[:50] for f in failures if f.get("query")]
            
            # Find successful patterns
            successes = [f for f in feedback_items if f["rating"] == "helpful"]
            success_queries = [f.get("query", "")[:50] for f in successes if f.get("query")]
            
            return {
                "success_rate": round(success_rate, 2),
                "total_feedback": total_count,
                "helpful_count": helpful_count,
                "not_helpful_count": total_count - helpful_count,
                "common_failures": failure_queries[:5],
                "successful_patterns": success_queries[:5],
                "mode_performance": mode_stats
            }
            
        except Exception as e:
            logger.error(f"Error analyzing feedback: {e}")
            return {
                "success_rate": 0,
                "total_feedback": 0,
                "error": str(e)
            }
    
    async def get_user_preferences(
        self, 
        user_id: str,
        workspace_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Extract user preferences from feedback history
        
        Returns:
            - preferred_mode: Most used mode
            - response_style: Detailed vs concise
            - common_topics: Topics user asks about
        """
        try:
            # Get user's feedback history
            query = supabase_admin.table("ai_action_feedback")\
                .select("*")\
                .eq("user_id", user_id)
            
            if workspace_id:
                query = query.eq("workspace_id", workspace_id)
            
            response = query.limit(100).execute()
            feedback_items = response.data
            
            if not feedback_items:
                return self._get_default_preferences()
            
            # Analyze mode preferences
            modes = [f.get("mode") for f in feedback_items if f.get("mode")]
            mode_counter = Counter(modes)
            preferred_mode = mode_counter.most_common(1)[0][0] if mode_counter else "ask"
            
            # Analyze query patterns
            queries = [f.get("query", "") for f in feedback_items if f.get("query")]
            
            # Detect if user prefers detailed responses
            # (longer queries usually indicate desire for detailed answers)
            avg_query_length = sum(len(q) for q in queries) / len(queries) if queries else 0
            prefers_detailed = avg_query_length > 50
            
            # Extract common topics (simple keyword extraction)
            all_words = " ".join(queries).lower().split()
            common_words = [word for word, count in Counter(all_words).most_common(10) 
                          if len(word) > 4]  # Filter short words
            
            return {
                "preferred_mode": preferred_mode,
                "prefers_detailed": prefers_detailed,
                "prefers_examples": True,  # Default to true
                "common_topics": common_words[:5],
                "total_interactions": len(feedback_items),
                "success_rate": sum(1 for f in feedback_items if f["rating"] == "helpful") / len(feedback_items) * 100
            }
            
        except Exception as e:
            logger.error(f"Error getting user preferences: {e}")
            return self._get_default_preferences()
    
    def _get_default_preferences(self) -> Dict[str, Any]:
        """Return default preferences for new users"""
        return {
            "preferred_mode": "ask",
            "prefers_detailed": True,
            "prefers_examples": True,
            "common_topics": [],
            "total_interactions": 0,
            "success_rate": 0
        }
    
    async def adjust_prompt_based_on_feedback(
        self,
        base_prompt: str,
        user_id: str,
        workspace_id: Optional[str] = None
    ) -> str:
        """
        Modify system prompt based on learned user preferences
        """
        try:
            prefs = await self.get_user_preferences(user_id, workspace_id)
            
            # Build preference context
            pref_context = "\n\n## USER PREFERENCES (learned from feedback):\n"
            
            if prefs["prefers_detailed"]:
                pref_context += "- User prefers detailed, comprehensive explanations\n"
            else:
                pref_context += "- User prefers concise, to-the-point responses\n"
            
            if prefs["prefers_examples"]:
                pref_context += "- Include practical examples and code snippets\n"
            
            if prefs["common_topics"]:
                topics = ", ".join(prefs["common_topics"])
                pref_context += f"- User frequently works with: {topics}\n"
            
            if prefs["preferred_mode"]:
                pref_context += f"- User's preferred mode: {prefs['preferred_mode']}\n"
            
            # Append to base prompt
            return base_prompt + pref_context
            
        except Exception as e:
            logger.error(f"Error adjusting prompt: {e}")
            return base_prompt
    
    async def store_feedback(
        self,
        user_id: str,
        workspace_id: str,
        preview_id: str,
        query: str,
        mode: str,
        rating: str,
        comment: Optional[str] = None,
        executed_actions: Optional[List[Dict]] = None
    ) -> Dict[str, Any]:
        """
        Store user feedback in database
        """
        try:
            feedback_data = {
                "user_id": user_id,
                "workspace_id": workspace_id,
                "preview_id": preview_id,
                "query": query,
                "mode": mode,
                "rating": rating,
                "comment": comment,
                "executed_actions": executed_actions or []
            }
            
            response = supabase_admin.table("ai_action_feedback")\
                .insert(feedback_data)\
                .execute()
            
            logger.info(f"✅ Stored feedback: {rating} for query '{query[:50]}'")
            return {"success": True, "feedback_id": response.data[0]["id"]}
            
        except Exception as e:
            logger.error(f"Error storing feedback: {e}")
            return {"success": False, "error": str(e)}


# Singleton instance
feedback_learning_service = FeedbackLearningService()
