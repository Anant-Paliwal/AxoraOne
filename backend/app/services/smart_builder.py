"""
Smart Builder Service for Ask Anything BUILD Mode
Creates ONLY what user asks for - not everything automatically
"""
import json
import re
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass
from enum import Enum
import logging

from app.core.supabase import supabase_admin
from app.services.intent_detector import DetectedIntent, ContentType, IntentType

logger = logging.getLogger(__name__)


@dataclass
class BuildResult:
    """Result of a build operation"""
    success: bool
    created_items: Dict[str, List[Dict]]
    updated_items: Dict[str, List[Dict]]
    deleted_items: Dict[str, List[Dict]]
    skipped_items: Dict[str, List[Dict]]
    errors: List[Dict]
    actions: List[Dict]  # Navigation actions for frontend
    message: str
    generated_blocks: List[Dict] = None  # Blocks to insert into page
    
    def __post_init__(self):
        if self.generated_blocks is None:
            self.generated_blocks = []


class SmartBuilder:
    """
    Intelligent builder that creates ONLY what user asks for
    Follows the architecture: Create objects → Return actions → UI handles interaction
    """
    
    def __init__(self):
        pass
    
    async def build(
        self,
        intent: DetectedIntent,
        user_id: str,
        workspace_id: str,
        ai_response: str,
        workspace_context: Dict[str, Any],
        web_sources: List[Dict] = None
    ) -> BuildResult:
        """
        Execute build based on detected intent
        Creates ONLY what user specifically asked for
        
        Args:
            intent: Detected user intent
            user_id: Current user ID
            workspace_id: Current workspace ID
            ai_response: AI-generated content
            workspace_context: Current workspace data
            web_sources: Web search results used
            
        Returns:
            BuildResult with created items and navigation actions
        """
        web_sources = web_sources or []
        
        created = {"pages": [], "skills": [], "tasks": [], "quizzes": [], "flashcards": [], "blocks": []}
        updated = {"pages": [], "skills": [], "tasks": []}
        deleted = {"pages": [], "skills": [], "tasks": []}
        skipped = {"pages": [], "skills": [], "tasks": []}
        errors = []
        actions = []
        
        # Get existing items for duplicate detection
        existing_pages = workspace_context.get("pages", [])
        existing_skills = workspace_context.get("skills", [])
        existing_tasks = workspace_context.get("tasks", [])
        
        # Process based on intent type
        if intent.intent_type == IntentType.CREATE:
            # Create ONLY what user asked for
            for content_type in intent.content_types:
                try:
                    if content_type == ContentType.PAGE:
                        result = await self._create_page(
                            intent, user_id, workspace_id, ai_response,
                            existing_pages, web_sources
                        )
                        if result:
                            created["pages"].append(result["item"])
                            actions.extend(result.get("actions", []))
                            existing_pages.append(result["item"])
                    
                    elif content_type == ContentType.SUBPAGE:
                        result = await self._create_subpage(
                            intent, user_id, workspace_id, ai_response,
                            existing_pages, web_sources
                        )
                        if result:
                            created["pages"].append(result["item"])
                            actions.extend(result.get("actions", []))
                    
                    elif content_type == ContentType.SKILL:
                        result = await self._create_skill(
                            intent, user_id, workspace_id, ai_response,
                            existing_skills
                        )
                        if result:
                            if result.get("skipped"):
                                skipped["skills"].append(result["item"])
                            else:
                                created["skills"].append(result["item"])
                                actions.extend(result.get("actions", []))
                    
                    elif content_type == ContentType.TASK:
                        result = await self._create_task(
                            intent, user_id, workspace_id,
                            existing_tasks
                        )
                        if result:
                            if result.get("skipped"):
                                skipped["tasks"].append(result["item"])
                            else:
                                created["tasks"].append(result["item"])
                                actions.extend(result.get("actions", []))
                    
                    elif content_type == ContentType.QUIZ:
                        result = await self._create_quiz(
                            intent, user_id, workspace_id, ai_response,
                            workspace_context
                        )
                        if result:
                            created["quizzes"].append(result["item"])
                            actions.extend(result.get("actions", []))
                    
                    elif content_type == ContentType.FLASHCARD:
                        result = await self._create_flashcards(
                            intent, user_id, workspace_id, ai_response,
                            workspace_context
                        )
                        if result:
                            created["flashcards"].append(result["item"])
                            actions.extend(result.get("actions", []))
                    
                    elif content_type == ContentType.COURSE:
                        result = await self._create_course(
                            intent, user_id, workspace_id, ai_response,
                            existing_pages, web_sources
                        )
                        if result:
                            created["pages"].extend(result.get("items", []))
                            actions.extend(result.get("actions", []))
                    
                    elif content_type == ContentType.BLOCK:
                        result = await self._generate_blocks(
                            intent, user_id, workspace_id, ai_response,
                            workspace_context
                        )
                        if result:
                            created["blocks"].extend(result.get("blocks", []))
                            actions.extend(result.get("actions", []))
                            
                except Exception as e:
                    logger.error(f"Error creating {content_type.value}: {e}")
                    errors.append({
                        "type": content_type.value,
                        "error": str(e)
                    })
        
        elif intent.intent_type == IntentType.UPDATE:
            # Update existing items
            for content_type in intent.content_types:
                try:
                    if content_type == ContentType.PAGE:
                        result = await self._update_page(
                            intent, user_id, workspace_id, ai_response,
                            existing_pages
                        )
                        if result:
                            updated["pages"].append(result["item"])
                            actions.extend(result.get("actions", []))
                    
                    elif content_type == ContentType.SKILL:
                        result = await self._update_skill(
                            intent, user_id, workspace_id,
                            existing_skills
                        )
                        if result:
                            updated["skills"].append(result["item"])
                            actions.extend(result.get("actions", []))
                    
                    elif content_type == ContentType.TASK:
                        result = await self._update_task(
                            intent, user_id, workspace_id,
                            existing_tasks
                        )
                        if result:
                            updated["tasks"].append(result["item"])
                            actions.extend(result.get("actions", []))
                            
                except Exception as e:
                    logger.error(f"Error updating {content_type.value}: {e}")
                    errors.append({
                        "type": content_type.value,
                        "error": str(e)
                    })
        
        elif intent.intent_type == IntentType.DELETE:
            # Delete items
            for content_type in intent.content_types:
                try:
                    if content_type == ContentType.PAGE:
                        result = await self._delete_page(
                            intent, user_id, workspace_id, existing_pages
                        )
                        if result:
                            deleted["pages"].append(result["item"])
                    
                    elif content_type == ContentType.SKILL:
                        result = await self._delete_skill(
                            intent, user_id, workspace_id, existing_skills
                        )
                        if result:
                            deleted["skills"].append(result["item"])
                    
                    elif content_type == ContentType.TASK:
                        result = await self._delete_task(
                            intent, user_id, workspace_id, existing_tasks
                        )
                        if result:
                            deleted["tasks"].append(result["item"])
                            
                except Exception as e:
                    logger.error(f"Error deleting {content_type.value}: {e}")
                    errors.append({
                        "type": content_type.value,
                        "error": str(e)
                    })
        
        # Build result message
        message = self._build_result_message(created, updated, deleted, skipped, errors)
        
        # Determine success
        success = bool(
            created["pages"] or created["skills"] or created["tasks"] or
            created["quizzes"] or created["flashcards"] or created["blocks"] or
            updated["pages"] or updated["skills"] or updated["tasks"] or
            deleted["pages"] or deleted["skills"] or deleted["tasks"]
        )
        
        # Extract generated blocks for frontend
        generated_blocks = created.get("blocks", [])
        
        return BuildResult(
            success=success,
            created_items=created,
            updated_items=updated,
            deleted_items=deleted,
            skipped_items=skipped,
            errors=errors,
            actions=actions,
            message=message,
            generated_blocks=generated_blocks
        )
    
    async def _create_page(
        self,
        intent: DetectedIntent,
        user_id: str,
        workspace_id: str,
        content: str,
        existing_pages: List[Dict],
        web_sources: List[Dict]
    ) -> Optional[Dict]:
        """Create a single page"""
        title = intent.topic or "New Page"
        
        # Check for duplicates
        is_dup, existing_title = self._check_duplicate(title, existing_pages, "title")
        if is_dup:
            logger.info(f"Skipped duplicate page: {title}")
            return {"item": {"title": title, "reason": f"Similar page exists: {existing_title}"}, "skipped": True}
        
        # Ensure content is substantial
        if len(content) < 50:
            content = f"# {title}\n\n{content}\n\n*Content to be expanded*"
        
        try:
            response = supabase_admin.table("pages").insert({
                "user_id": user_id,
                "workspace_id": workspace_id,
                "title": title,
                "content": content,
                "icon": "📄",
                "tags": []
            }).execute()
            
            if response.data:
                page = response.data[0]
                logger.info(f"✅ Created page: {title}")
                return {
                    "item": {
                        "id": page["id"],
                        "title": title,
                        "type": "page"
                    },
                    "actions": [{
                        "label": f"View {title}",
                        "route": f"/pages/{page['id']}"
                    }]
                }
        except Exception as e:
            logger.error(f"Failed to create page: {e}")
            raise
        
        return None
    
    async def _create_subpage(
        self,
        intent: DetectedIntent,
        user_id: str,
        workspace_id: str,
        content: str,
        existing_pages: List[Dict],
        web_sources: List[Dict]
    ) -> Optional[Dict]:
        """Create a subpage under a parent page"""
        title = intent.topic or "New Subpage"
        parent_ref = intent.parent_reference
        
        # Find parent page
        parent_page = None
        if parent_ref:
            for page in existing_pages:
                if parent_ref.lower() in page.get("title", "").lower():
                    parent_page = page
                    break
        
        if not parent_page:
            # Create as regular page if parent not found
            logger.warning(f"Parent page '{parent_ref}' not found, creating as regular page")
            return await self._create_page(intent, user_id, workspace_id, content, existing_pages, web_sources)
        
        # Get page order for new subpage
        existing_subpages = [p for p in existing_pages if p.get("parent_page_id") == parent_page["id"]]
        page_order = len(existing_subpages)
        
        try:
            response = supabase_admin.table("pages").insert({
                "user_id": user_id,
                "workspace_id": workspace_id,
                "parent_page_id": parent_page["id"],
                "page_order": page_order,
                "title": title,
                "content": content,
                "icon": "📖",
                "tags": []
            }).execute()
            
            if response.data:
                page = response.data[0]
                logger.info(f"✅ Created subpage: {title} under {parent_page['title']}")
                return {
                    "item": {
                        "id": page["id"],
                        "title": title,
                        "type": "subpage",
                        "parent": parent_page["title"]
                    },
                    "actions": [{
                        "label": f"View {title}",
                        "route": f"/pages/{page['id']}"
                    }]
                }
        except Exception as e:
            logger.error(f"Failed to create subpage: {e}")
            raise
        
        return None
    
    async def _create_skill(
        self,
        intent: DetectedIntent,
        user_id: str,
        workspace_id: str,
        description: str,
        existing_skills: List[Dict]
    ) -> Optional[Dict]:
        """Create a skill with full form fields"""
        name = intent.topic or "New Skill"
        
        # Check for duplicates
        is_dup, existing_name = self._check_duplicate(name, existing_skills, "name")
        if is_dup:
            logger.info(f"Skipped duplicate skill: {name}")
            return {"item": {"name": name, "reason": f"Similar skill exists: {existing_name}"}, "skipped": True}
        
        # Determine skill type from context
        query_lower = intent.raw_query.lower()
        if any(w in query_lower for w in ["learn", "study", "tutorial"]):
            skill_type = "learning"
        elif any(w in query_lower for w in ["research", "analyze", "investigate"]):
            skill_type = "research"
        elif any(w in query_lower for w in ["create", "build", "design"]):
            skill_type = "creation"
        elif any(w in query_lower for w in ["data", "metrics", "statistics"]):
            skill_type = "analysis"
        else:
            skill_type = "practice"
        
        try:
            response = supabase_admin.table("skills").insert({
                "user_id": user_id,
                "workspace_id": workspace_id,
                "name": name,
                "level": "Beginner",
                "skill_type": skill_type,
                "description": description[:200] if description else f"Skill in {name}",
                "goals": [],
                "evidence": []
            }).execute()
            
            if response.data:
                skill = response.data[0]
                logger.info(f"✅ Created skill: {name} (type: {skill_type})")
                return {
                    "item": {
                        "id": skill["id"],
                        "name": name,
                        "level": "Beginner",
                        "skill_type": skill_type
                    },
                    "actions": [{
                        "label": f"View {name} Skill",
                        "route": f"/skills?highlight={skill['id']}"
                    }]
                }
        except Exception as e:
            logger.error(f"Failed to create skill: {e}")
            raise
        
        return None
    
    async def _create_task(
        self,
        intent: DetectedIntent,
        user_id: str,
        workspace_id: str,
        existing_tasks: List[Dict]
    ) -> Optional[Dict]:
        """Create a task with full form fields"""
        title = f"Learn {intent.topic}" if intent.topic else "New Task"
        
        # Check for duplicates
        is_dup, existing_title = self._check_duplicate(title, existing_tasks, "title")
        if is_dup:
            logger.info(f"Skipped duplicate task: {title}")
            return {"item": {"title": title, "reason": f"Similar task exists: {existing_title}"}, "skipped": True}
        
        # Determine event type from context
        query_lower = intent.raw_query.lower()
        if any(w in query_lower for w in ["remind", "reminder"]):
            event_type = "reminder"
        elif any(w in query_lower for w in ["milestone", "goal", "achieve"]):
            event_type = "milestone"
        elif any(w in query_lower for w in ["event", "meeting", "schedule"]):
            event_type = "event"
        else:
            event_type = "task"
        
        # Determine priority
        if any(w in query_lower for w in ["urgent", "important", "critical", "high"]):
            priority = "high"
        elif any(w in query_lower for w in ["low", "minor", "later"]):
            priority = "low"
        else:
            priority = "medium"
        
        # Get linked page if mentioned
        linked_page_id = None
        for item in intent.mentioned_items:
            if item.get("type") == "page":
                linked_page_id = item.get("id")
                break
        
        try:
            task_data = {
                "user_id": user_id,
                "workspace_id": workspace_id,
                "title": title,
                "priority": priority,
                "status": "todo",
                "event_type": event_type,
                "description": f"Task related to {intent.topic}"
            }
            
            if linked_page_id:
                task_data["linked_page_id"] = linked_page_id
            
            response = supabase_admin.table("tasks").insert(task_data).execute()
            
            if response.data:
                task = response.data[0]
                logger.info(f"✅ Created task: {title} (type: {event_type})")
                return {
                    "item": {
                        "id": task["id"],
                        "title": title,
                        "priority": priority,
                        "event_type": event_type
                    },
                    "actions": [{
                        "label": "View Tasks",
                        "route": "/tasks"
                    }]
                }
        except Exception as e:
            logger.error(f"Failed to create task: {e}")
            raise
        
        return None
    
    async def _create_quiz(
        self,
        intent: DetectedIntent,
        user_id: str,
        workspace_id: str,
        ai_response: str,
        workspace_context: Dict
    ) -> Optional[Dict]:
        """Create a quiz - returns action to navigate to quiz"""
        title = f"{intent.topic} Quiz" if intent.topic else "New Quiz"
        
        # Find source page if mentioned
        source_page_id = None
        linked_skill = None
        
        for item in intent.mentioned_items:
            if item.get("type") == "page":
                source_page_id = item.get("id")
            elif item.get("type") == "skill":
                linked_skill = item.get("name")
        
        try:
            # Create quiz in learning_objects table
            response = supabase_admin.table("learning_objects").insert({
                "user_id": user_id,
                "workspace_id": workspace_id,
                "type": "quiz",
                "title": title,
                "source_page_id": source_page_id,
                "linked_skill": linked_skill,
                "content": json.dumps({"questions": [], "generated": True}),
                "status": "pending_generation"
            }).execute()
            
            if response.data:
                quiz = response.data[0]
                logger.info(f"✅ Created quiz: {title}")
                return {
                    "item": {
                        "id": quiz["id"],
                        "title": title,
                        "type": "quiz",
                        "source_page_id": source_page_id
                    },
                    "actions": [{
                        "label": "Start Quiz",
                        "route": f"/quiz/{quiz['id']}"
                    }]
                }
        except Exception as e:
            logger.error(f"Failed to create quiz: {e}")
            raise
        
        return None
    
    async def _create_flashcards(
        self,
        intent: DetectedIntent,
        user_id: str,
        workspace_id: str,
        ai_response: str,
        workspace_context: Dict
    ) -> Optional[Dict]:
        """Create flashcard deck - returns action to navigate to flashcards"""
        title = f"{intent.topic} Flashcards" if intent.topic else "New Flashcard Deck"
        
        # Find source page if mentioned
        source_page_id = None
        linked_skill = None
        
        for item in intent.mentioned_items:
            if item.get("type") == "page":
                source_page_id = item.get("id")
            elif item.get("type") == "skill":
                linked_skill = item.get("name")
        
        try:
            response = supabase_admin.table("learning_objects").insert({
                "user_id": user_id,
                "workspace_id": workspace_id,
                "type": "flashcard_deck",
                "title": title,
                "source_page_id": source_page_id,
                "linked_skill": linked_skill,
                "content": json.dumps({"cards": [], "generated": True}),
                "status": "pending_generation"
            }).execute()
            
            if response.data:
                deck = response.data[0]
                logger.info(f"✅ Created flashcard deck: {title}")
                return {
                    "item": {
                        "id": deck["id"],
                        "title": title,
                        "type": "flashcard_deck",
                        "source_page_id": source_page_id
                    },
                    "actions": [{
                        "label": "Review Flashcards",
                        "route": f"/flashcards/{deck['id']}"
                    }]
                }
        except Exception as e:
            logger.error(f"Failed to create flashcards: {e}")
            raise
        
        return None
    
    async def _create_course(
        self,
        intent: DetectedIntent,
        user_id: str,
        workspace_id: str,
        ai_response: str,
        existing_pages: List[Dict],
        web_sources: List[Dict]
    ) -> Optional[Dict]:
        """Create a course with chapters"""
        title = f"{intent.topic} Course" if intent.topic else "New Course"
        
        # Check for duplicates
        is_dup, existing_title = self._check_duplicate(title, existing_pages, "title")
        if is_dup:
            logger.info(f"Skipped duplicate course: {title}")
            return None
        
        items = []
        actions = []
        
        try:
            # Create parent course page
            course_response = supabase_admin.table("pages").insert({
                "user_id": user_id,
                "workspace_id": workspace_id,
                "title": title,
                "content": f"# {title}\n\n{ai_response[:500]}...\n\n## Course Overview\n\nThis course covers {intent.topic}.",
                "icon": "📚",
                "tags": ["course"]
            }).execute()
            
            if course_response.data:
                course = course_response.data[0]
                items.append({
                    "id": course["id"],
                    "title": title,
                    "type": "course"
                })
                actions.append({
                    "label": f"View {title}",
                    "route": f"/pages/{course['id']}"
                })
                
                logger.info(f"✅ Created course: {title}")
                
                return {
                    "items": items,
                    "actions": actions
                }
        except Exception as e:
            logger.error(f"Failed to create course: {e}")
            raise
        
        return None
    
    async def _update_page(self, intent, user_id, workspace_id, content, existing_pages) -> Optional[Dict]:
        """Update an existing page"""
        # Find page to update
        target_page = None
        for page in existing_pages:
            if intent.topic.lower() in page.get("title", "").lower():
                target_page = page
                break
        
        if not target_page:
            return None
        
        try:
            response = supabase_admin.table("pages").update({
                "content": content
            }).eq("id", target_page["id"]).execute()
            
            if response.data:
                logger.info(f"✅ Updated page: {target_page['title']}")
                return {
                    "item": {"id": target_page["id"], "title": target_page["title"]},
                    "actions": [{"label": f"View {target_page['title']}", "route": f"/pages/{target_page['id']}"}]
                }
        except Exception as e:
            logger.error(f"Failed to update page: {e}")
            raise
        
        return None
    
    async def _update_skill(self, intent, user_id, workspace_id, existing_skills) -> Optional[Dict]:
        """Update an existing skill"""
        target_skill = None
        for skill in existing_skills:
            if intent.topic.lower() in skill.get("name", "").lower():
                target_skill = skill
                break
        
        if not target_skill:
            return None
        
        # Detect level change from query
        new_level = None
        query_lower = intent.raw_query.lower()
        for level in ["beginner", "intermediate", "advanced", "expert"]:
            if level in query_lower:
                new_level = level.capitalize()
                break
        
        if not new_level:
            return None
        
        try:
            response = supabase_admin.table("skills").update({
                "level": new_level
            }).eq("id", target_skill["id"]).execute()
            
            if response.data:
                logger.info(f"✅ Updated skill: {target_skill['name']} to {new_level}")
                return {
                    "item": {"id": target_skill["id"], "name": target_skill["name"], "new_level": new_level},
                    "actions": [{"label": "View Skills", "route": "/skills"}]
                }
        except Exception as e:
            logger.error(f"Failed to update skill: {e}")
            raise
        
        return None
    
    async def _update_task(self, intent, user_id, workspace_id, existing_tasks) -> Optional[Dict]:
        """Update an existing task"""
        target_task = None
        for task in existing_tasks:
            if intent.topic.lower() in task.get("title", "").lower():
                target_task = task
                break
        
        if not target_task:
            return None
        
        # Detect status change from query
        new_status = None
        query_lower = intent.raw_query.lower()
        if any(w in query_lower for w in ["complete", "done", "finish"]):
            new_status = "completed"
        elif any(w in query_lower for w in ["start", "begin", "working"]):
            new_status = "in_progress"
        
        if not new_status:
            return None
        
        try:
            response = supabase_admin.table("tasks").update({
                "status": new_status
            }).eq("id", target_task["id"]).execute()
            
            if response.data:
                logger.info(f"✅ Updated task: {target_task['title']} to {new_status}")
                return {
                    "item": {"id": target_task["id"], "title": target_task["title"], "new_status": new_status},
                    "actions": [{"label": "View Tasks", "route": "/tasks"}]
                }
        except Exception as e:
            logger.error(f"Failed to update task: {e}")
            raise
        
        return None
    
    async def _delete_page(self, intent, user_id, workspace_id, existing_pages) -> Optional[Dict]:
        """Delete a page"""
        target_page = None
        for page in existing_pages:
            if intent.topic.lower() in page.get("title", "").lower():
                target_page = page
                break
        
        if not target_page:
            return None
        
        try:
            supabase_admin.table("pages").delete().eq("id", target_page["id"]).execute()
            logger.info(f"✅ Deleted page: {target_page['title']}")
            return {"item": {"id": target_page["id"], "title": target_page["title"]}}
        except Exception as e:
            logger.error(f"Failed to delete page: {e}")
            raise
    
    async def _delete_skill(self, intent, user_id, workspace_id, existing_skills) -> Optional[Dict]:
        """Delete a skill"""
        target_skill = None
        for skill in existing_skills:
            if intent.topic.lower() in skill.get("name", "").lower():
                target_skill = skill
                break
        
        if not target_skill:
            return None
        
        try:
            supabase_admin.table("skills").delete().eq("id", target_skill["id"]).execute()
            logger.info(f"✅ Deleted skill: {target_skill['name']}")
            return {"item": {"id": target_skill["id"], "name": target_skill["name"]}}
        except Exception as e:
            logger.error(f"Failed to delete skill: {e}")
            raise
    
    async def _delete_task(self, intent, user_id, workspace_id, existing_tasks) -> Optional[Dict]:
        """Delete a task"""
        target_task = None
        for task in existing_tasks:
            if intent.topic.lower() in task.get("title", "").lower():
                target_task = task
                break
        
        if not target_task:
            return None
        
        try:
            supabase_admin.table("tasks").delete().eq("id", target_task["id"]).execute()
            logger.info(f"✅ Deleted task: {target_task['title']}")
            return {"item": {"id": target_task["id"], "title": target_task["title"]}}
        except Exception as e:
            logger.error(f"Failed to delete task: {e}")
            raise
    
    async def _generate_blocks(
        self,
        intent: DetectedIntent,
        user_id: str,
        workspace_id: str,
        ai_response: str,
        workspace_context: Dict
    ) -> Optional[Dict]:
        """
        Generate blocks from AI response to insert into a page.
        Returns blocks in the format expected by the frontend block editor.
        
        Block types supported:
        - text: Plain text content
        - heading: H1, H2, H3 headings
        - list: Bullet or numbered lists
        - table: Data tables
        - code: Code blocks with syntax highlighting
        - quote: Blockquotes
        - callout: Info/warning/tip callouts
        - divider: Horizontal dividers
        """
        import time
        
        blocks = []
        position = 0
        
        # Parse AI response to extract structured content
        lines = ai_response.strip().split('\n')
        current_list_items = []
        current_list_type = None
        in_code_block = False
        code_content = []
        code_language = ""
        in_table = False
        table_rows = []
        
        for line in lines:
            line_stripped = line.strip()
            
            # Handle code blocks
            if line_stripped.startswith('```'):
                if in_code_block:
                    # End code block
                    blocks.append({
                        "id": f"code-{int(time.time() * 1000)}-{position}",
                        "type": "code",
                        "position": position,
                        "data": {
                            "code": '\n'.join(code_content),  # Changed from "content" to "code"
                            "language": code_language or "javascript"  # Changed default from "plaintext" to "javascript"
                        }
                    })
                    position += 1
                    code_content = []
                    code_language = ""
                    in_code_block = False
                else:
                    # Start code block
                    # Flush any pending list
                    if current_list_items:
                        blocks.append({
                            "id": f"list-{int(time.time() * 1000)}-{position}",
                            "type": "list",
                            "position": position,
                            "data": {
                                "items": current_list_items,
                                "style": current_list_type or "bullet"
                            }
                        })
                        position += 1
                        current_list_items = []
                        current_list_type = None
                    
                    in_code_block = True
                    code_language = line_stripped[3:].strip()
                continue
            
            if in_code_block:
                code_content.append(line)
                continue
            
            # Handle tables (markdown format)
            if '|' in line_stripped and not line_stripped.startswith('|--'):
                if line_stripped.startswith('|') or line_stripped.endswith('|'):
                    # Flush any pending list
                    if current_list_items:
                        blocks.append({
                            "id": f"list-{int(time.time() * 1000)}-{position}",
                            "type": "list",
                            "position": position,
                            "data": {
                                "items": current_list_items,
                                "style": current_list_type or "bullet"
                            }
                        })
                        position += 1
                        current_list_items = []
                        current_list_type = None
                    
                    # Parse table row
                    cells = [c.strip() for c in line_stripped.split('|') if c.strip()]
                    if cells and not all(c.replace('-', '').replace(':', '') == '' for c in cells):
                        table_rows.append(cells)
                    in_table = True
                    continue
            elif in_table and table_rows:
                # End of table
                blocks.append({
                    "id": f"table-{int(time.time() * 1000)}-{position}",
                    "type": "table",
                    "position": position,
                    "data": {
                        "rows": table_rows,
                        "hasHeader": True
                    }
                })
                position += 1
                table_rows = []
                in_table = False
            
            # Skip separator lines
            if line_stripped.startswith('|--') or line_stripped.replace('-', '').replace('|', '').replace(':', '').strip() == '':
                if in_table:
                    continue
            
            # Handle headings
            if line_stripped.startswith('###'):
                # Flush any pending list
                if current_list_items:
                    blocks.append({
                        "id": f"list-{int(time.time() * 1000)}-{position}",
                        "type": "list",
                        "position": position,
                        "data": {
                            "items": current_list_items,
                            "style": current_list_type or "bullet"
                        }
                    })
                    position += 1
                    current_list_items = []
                    current_list_type = None
                
                blocks.append({
                    "id": f"heading-{int(time.time() * 1000)}-{position}",
                    "type": "heading",
                    "position": position,
                    "data": {
                        "content": line_stripped[3:].strip(),
                        "level": 3
                    }
                })
                position += 1
                continue
            elif line_stripped.startswith('##'):
                if current_list_items:
                    blocks.append({
                        "id": f"list-{int(time.time() * 1000)}-{position}",
                        "type": "list",
                        "position": position,
                        "data": {
                            "items": current_list_items,
                            "style": current_list_type or "bullet"
                        }
                    })
                    position += 1
                    current_list_items = []
                    current_list_type = None
                
                blocks.append({
                    "id": f"heading-{int(time.time() * 1000)}-{position}",
                    "type": "heading",
                    "position": position,
                    "data": {
                        "content": line_stripped[2:].strip(),
                        "level": 2
                    }
                })
                position += 1
                continue
            elif line_stripped.startswith('#'):
                if current_list_items:
                    blocks.append({
                        "id": f"list-{int(time.time() * 1000)}-{position}",
                        "type": "list",
                        "position": position,
                        "data": {
                            "items": current_list_items,
                            "style": current_list_type or "bullet"
                        }
                    })
                    position += 1
                    current_list_items = []
                    current_list_type = None
                
                blocks.append({
                    "id": f"heading-{int(time.time() * 1000)}-{position}",
                    "type": "heading",
                    "position": position,
                    "data": {
                        "content": line_stripped[1:].strip(),
                        "level": 1
                    }
                })
                position += 1
                continue
            
            # Handle blockquotes
            if line_stripped.startswith('>'):
                if current_list_items:
                    blocks.append({
                        "id": f"list-{int(time.time() * 1000)}-{position}",
                        "type": "list",
                        "position": position,
                        "data": {
                            "items": current_list_items,
                            "style": current_list_type or "bullet"
                        }
                    })
                    position += 1
                    current_list_items = []
                    current_list_type = None
                
                blocks.append({
                    "id": f"quote-{int(time.time() * 1000)}-{position}",
                    "type": "quote",
                    "position": position,
                    "data": {
                        "content": line_stripped[1:].strip()
                    }
                })
                position += 1
                continue
            
            # Handle bullet lists
            if line_stripped.startswith('- ') or line_stripped.startswith('* '):
                current_list_items.append(line_stripped[2:])
                current_list_type = "bullet"
                continue
            
            # Handle numbered lists
            if re.match(r'^\d+\.\s', line_stripped):
                item_text = re.sub(r'^\d+\.\s', '', line_stripped)
                current_list_items.append(item_text)
                current_list_type = "numbered"
                continue
            
            # Handle dividers
            if line_stripped in ['---', '***', '___']:
                if current_list_items:
                    blocks.append({
                        "id": f"list-{int(time.time() * 1000)}-{position}",
                        "type": "list",
                        "position": position,
                        "data": {
                            "items": current_list_items,
                            "style": current_list_type or "bullet"
                        }
                    })
                    position += 1
                    current_list_items = []
                    current_list_type = None
                
                blocks.append({
                    "id": f"divider-{int(time.time() * 1000)}-{position}",
                    "type": "divider",
                    "position": position,
                    "data": {}
                })
                position += 1
                continue
            
            # Handle regular text (non-empty lines)
            if line_stripped:
                # Flush any pending list first
                if current_list_items:
                    blocks.append({
                        "id": f"list-{int(time.time() * 1000)}-{position}",
                        "type": "list",
                        "position": position,
                        "data": {
                            "items": current_list_items,
                            "style": current_list_type or "bullet"
                        }
                    })
                    position += 1
                    current_list_items = []
                    current_list_type = None
                
                blocks.append({
                    "id": f"text-{int(time.time() * 1000)}-{position}",
                    "type": "text",
                    "position": position,
                    "data": {
                        "content": line_stripped
                    }
                })
                position += 1
        
        # Flush any remaining list items
        if current_list_items:
            blocks.append({
                "id": f"list-{int(time.time() * 1000)}-{position}",
                "type": "list",
                "position": position,
                "data": {
                    "items": current_list_items,
                    "style": current_list_type or "bullet"
                }
            })
            position += 1
        
        # Flush any remaining table
        if table_rows:
            blocks.append({
                "id": f"table-{int(time.time() * 1000)}-{position}",
                "type": "table",
                "position": position,
                "data": {
                    "rows": table_rows,
                    "hasHeader": True
                }
            })
            position += 1
        
        # Flush any remaining code
        if code_content:
            blocks.append({
                "id": f"code-{int(time.time() * 1000)}-{position}",
                "type": "code",
                "position": position,
                "data": {
                    "code": '\n'.join(code_content),  # Changed from "content" to "code"
                    "language": code_language or "javascript"
                }
            })
        
        if not blocks:
            # If no structured content found, create a single text block
            blocks.append({
                "id": f"text-{int(time.time() * 1000)}-0",
                "type": "text",
                "position": 0,
                "data": {
                    "content": ai_response.strip()
                }
            })
        
        logger.info(f"✅ Generated {len(blocks)} blocks from AI response")
        
        return {
            "blocks": blocks,
            "actions": [{
                "label": "Insert Blocks",
                "action": "insert_blocks",
                "blocks": blocks
            }]
        }
    
    def _check_duplicate(
        self, 
        name: str, 
        existing_items: List[Dict], 
        field: str,
        threshold: float = 0.7
    ) -> Tuple[bool, Optional[str]]:
        """Check for duplicate items using fuzzy matching"""
        name_lower = name.lower().strip()
        name_words = set(name_lower.split())
        
        for item in existing_items:
            existing_name = item.get(field, "").lower().strip()
            
            # Exact match
            if name_lower == existing_name:
                return True, item.get(field)
            
            # Word overlap
            existing_words = set(existing_name.split())
            if name_words and existing_words:
                overlap = len(name_words & existing_words) / max(len(name_words), len(existing_words))
                if overlap >= threshold:
                    return True, item.get(field)
        
        return False, None
    
    def _build_result_message(
        self,
        created: Dict,
        updated: Dict,
        deleted: Dict,
        skipped: Dict,
        errors: List
    ) -> str:
        """Build a summary message of build results"""
        parts = []
        
        # Created items
        total_created = sum(len(v) for k, v in created.items() if k != "blocks")
        blocks_created = len(created.get("blocks", []))
        
        if total_created > 0:
            parts.append(f"✅ Created {total_created} item(s)")
            for item_type, items in created.items():
                if items and item_type != "blocks":
                    names = [i.get("title") or i.get("name") for i in items]
                    parts.append(f"  • {item_type}: {', '.join(names)}")
        
        if blocks_created > 0:
            parts.append(f"📝 Generated {blocks_created} block(s) ready to insert")
        
        # Updated items
        total_updated = sum(len(v) for v in updated.values())
        if total_updated > 0:
            parts.append(f"🔄 Updated {total_updated} item(s)")
        
        # Deleted items
        total_deleted = sum(len(v) for v in deleted.values())
        if total_deleted > 0:
            parts.append(f"❌ Deleted {total_deleted} item(s)")
        
        # Skipped items
        total_skipped = sum(len(v) for v in skipped.values())
        if total_skipped > 0:
            parts.append(f"⏭️ Skipped {total_skipped} duplicate(s)")
        
        # Errors
        if errors:
            parts.append(f"⚠️ {len(errors)} error(s) occurred")
        
        return "\n".join(parts) if parts else "No changes made"


# Singleton instance
smart_builder = SmartBuilder()
