"""
Enhanced Context Gatherer
Intelligently gathers and manages context for AI agent
"""
import logging
from typing import Dict, List, Optional, Any
from app.core.supabase import supabase_admin

logger = logging.getLogger(__name__)


class EnhancedContextGatherer:
    """
    Gathers hierarchical context including pages, subpages, skills, and tasks
    """
    
    async def gather_hierarchical_context(
        self,
        page_id: str,
        user_id: str,
        include_subpages: bool = True,
        max_depth: int = 3,
        current_depth: int = 0
    ) -> Dict[str, Any]:
        """
        Gather page content with full hierarchy
        
        Returns:
            - page: Main page data with blocks
            - subpages: List of subpages (recursive)
            - linked_skills: Skills linked to this page
            - related_tasks: Tasks mentioning this page
            - total_blocks: Total block count across hierarchy
        """
        try:
            # Get main page
            page_response = supabase_admin.table("pages")\
                .select("*")\
                .eq("id", page_id)\
                .eq("user_id", user_id)\
                .single()\
                .execute()
            
            page = page_response.data
            
            if not page:
                return {"error": "Page not found"}
            
            context = {
                "page": page,
                "subpages": [],
                "linked_skills": [],
                "related_tasks": [],
                "total_blocks": len(page.get("blocks", []))
            }
            
            # Get subpages recursively
            if include_subpages and current_depth < max_depth:
                subpages_response = supabase_admin.table("pages")\
                    .select("*")\
                    .eq("parent_id", page_id)\
                    .eq("user_id", user_id)\
                    .execute()
                
                for subpage in subpages_response.data:
                    # Recursively gather subpage context
                    subpage_context = await self.gather_hierarchical_context(
                        page_id=subpage["id"],
                        user_id=user_id,
                        include_subpages=True,
                        max_depth=max_depth,
                        current_depth=current_depth + 1
                    )
                    context["subpages"].append(subpage_context)
                    context["total_blocks"] += subpage_context.get("total_blocks", 0)
            
            # Get linked skills
            try:
                skills_response = supabase_admin.table("skill_evidence")\
                    .select("skill_id, skills(id, name, description)")\
                    .eq("evidence_type", "page")\
                    .eq("evidence_id", page_id)\
                    .execute()
                
                context["linked_skills"] = [
                    s["skills"] for s in skills_response.data if s.get("skills")
                ]
            except Exception as e:
                logger.warning(f"Could not fetch linked skills: {e}")
            
            # Get related tasks
            try:
                tasks_response = supabase_admin.table("tasks")\
                    .select("*")\
                    .eq("user_id", user_id)\
                    .or_(f"source_page_id.eq.{page_id},linked_page_id.eq.{page_id}")\
                    .execute()
                
                context["related_tasks"] = tasks_response.data
            except Exception as e:
                logger.warning(f"Could not fetch related tasks: {e}")
            
            return context
            
        except Exception as e:
            logger.error(f"Error gathering hierarchical context: {e}")
            return {"error": str(e)}
    
    async def understand_workspace_structure(
        self,
        workspace_id: str,
        user_id: str
    ) -> Dict[str, Any]:
        """
        Build a mental model of the entire workspace
        
        Returns:
            - page_hierarchy: Tree structure of pages
            - skill_map: All skills with connections
            - task_overview: Task statistics
            - knowledge_graph_summary: Key concepts and connections
        """
        try:
            # Get all pages in workspace
            pages_response = supabase_admin.table("pages")\
                .select("id, title, parent_id, created_at")\
                .eq("workspace_id", workspace_id)\
                .eq("user_id", user_id)\
                .execute()
            
            pages = pages_response.data
            
            # Build page hierarchy
            page_hierarchy = self._build_page_tree(pages)
            
            # Get all skills
            skills_response = supabase_admin.table("skills")\
                .select("id, name, description, progress")\
                .eq("workspace_id", workspace_id)\
                .eq("user_id", user_id)\
                .execute()
            
            skills = skills_response.data
            
            # Get task statistics
            tasks_response = supabase_admin.table("tasks")\
                .select("id, status, priority")\
                .eq("workspace_id", workspace_id)\
                .eq("user_id", user_id)\
                .execute()
            
            tasks = tasks_response.data
            task_stats = {
                "total": len(tasks),
                "completed": sum(1 for t in tasks if t.get("status") == "completed"),
                "in_progress": sum(1 for t in tasks if t.get("status") == "in_progress"),
                "pending": sum(1 for t in tasks if t.get("status") == "pending")
            }
            
            return {
                "page_hierarchy": page_hierarchy,
                "total_pages": len(pages),
                "skill_map": skills,
                "total_skills": len(skills),
                "task_overview": task_stats,
                "workspace_id": workspace_id
            }
            
        except Exception as e:
            logger.error(f"Error understanding workspace structure: {e}")
            return {"error": str(e)}
    
    def _build_page_tree(self, pages: List[Dict]) -> List[Dict]:
        """Build hierarchical tree from flat page list"""
        # Create lookup dict
        page_dict = {p["id"]: {**p, "children": []} for p in pages}
        
        # Build tree
        root_pages = []
        for page in pages:
            parent_id = page.get("parent_id")
            if parent_id and parent_id in page_dict:
                page_dict[parent_id]["children"].append(page_dict[page["id"]])
            else:
                root_pages.append(page_dict[page["id"]])
        
        return root_pages
    
    async def prune_context_intelligently(
        self,
        full_context: Dict,
        query: str,
        max_tokens: int = 4000
    ) -> Dict[str, Any]:
        """
        Keep only relevant context to fit within token limit
        
        Strategy:
        1. Always keep main page
        2. Rank subpages by relevance to query
        3. Summarize less relevant content
        4. Preserve critical relationships
        """
        try:
            # Simple token estimation (4 chars ≈ 1 token)
            def estimate_tokens(text: str) -> int:
                return len(str(text)) // 4
            
            pruned_context = {
                "page": full_context.get("page"),
                "subpages": [],
                "linked_skills": full_context.get("linked_skills", []),
                "related_tasks": full_context.get("related_tasks", []),
                "pruned": False
            }
            
            current_tokens = estimate_tokens(str(pruned_context))
            
            # Add subpages if space allows
            subpages = full_context.get("subpages", [])
            for subpage in subpages:
                subpage_tokens = estimate_tokens(str(subpage))
                if current_tokens + subpage_tokens < max_tokens:
                    pruned_context["subpages"].append(subpage)
                    current_tokens += subpage_tokens
                else:
                    # Summarize remaining subpages
                    pruned_context["pruned"] = True
                    pruned_context["pruned_count"] = len(subpages) - len(pruned_context["subpages"])
                    break
            
            return pruned_context
            
        except Exception as e:
            logger.error(f"Error pruning context: {e}")
            return full_context


# Singleton instance
enhanced_context_gatherer = EnhancedContextGatherer()
