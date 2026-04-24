"""
Agentic AI Agent for Ask Anything
Implements ReAct (Reasoning + Acting) pattern with:
- Goal Decomposition
- Thought-Action-Observation Loop
- Self-Learning & Retention
- Full Page/Subpage CRUD Operations
- Smart Skill & Task Creation from Page Context
- Block-level CRUD Operations
"""
import json
import asyncio
import re
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, field
from enum import Enum
from datetime import datetime, timedelta, timezone
import logging

from langchain_openai import ChatOpenAI
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.schema import HumanMessage, SystemMessage, AIMessage

from app.core.config import settings
from app.core.supabase import supabase_admin
from app.services.intent_detector import intent_detector, IntentType, ContentType, DetectedIntent
from app.services.context_gatherer import context_gatherer, GatheredContext
from app.services.smart_builder import smart_builder

logger = logging.getLogger(__name__)

# Default model - use a reliable free model via OpenRouter
DEFAULT_MODEL = "gemini-2.5-flash"

# Model routing - which API to use for each model
GEMINI_MODELS = [
    "gemini-2.5-flash",
    "gemini-2.0-flash-exp",
    "gemini-1.5-flash",
    "gemini-1.5-pro",
    "gemini-pro",
    "google/gemini-2.0-flash-exp:free",
    "google/gemini-1.5-flash:free"
]

OPENROUTER_MODELS = [
    "nvidia/nemotron-nano-12b-v2-vl:free",
    "meta-llama/llama-3.2-3b-instruct:free",
    "meta-llama/llama-3.1-8b-instruct:free",
    "gpt-4o-mini",
    "gpt-4o",
    "anthropic/claude-3.5-sonnet"
]


class AgentAction(Enum):
    """Available agent actions/tools"""
    THINK = "think"                    # Reason about the problem
    SEARCH_WORKSPACE = "search_workspace"  # Search pages, skills, tasks
    READ_PAGE = "read_page"            # Read full page content with blocks
    READ_SUBPAGES = "read_subpages"    # Read all subpages of a page
    CREATE_CONTENT = "create_content"  # Generate content blocks
    UPDATE_PAGE = "update_page"        # Update existing page
    CREATE_PAGE = "create_page"        # Create new page
    CREATE_SUBPAGE = "create_subpage"  # Create subpage under parent
    DELETE_CONTENT = "delete_content"  # Delete blocks from page
    DELETE_PAGE = "delete_page"        # Delete a page
    CREATE_SKILL = "create_skill"      # Create a skill with full form fields
    UPDATE_SKILL = "update_skill"      # Update existing skill
    CREATE_TASK = "create_task"        # Create a task with full form fields
    UPDATE_TASK = "update_task"        # Update existing task
    LINK_PAGE_TO_SKILL = "link_page_to_skill"  # Link page as skill evidence
    LEARN = "learn"                    # Store learning for future
    ANSWER = "answer"                  # Provide final answer
    DECOMPOSE = "decompose"            # Break goal into subtasks
    ANALYZE_PAGE = "analyze_page"      # Analyze page to suggest skills/tasks


@dataclass
class AgentStep:
    """Single step in agent execution"""
    step_number: int
    thought: str
    action: AgentAction
    action_input: Dict[str, Any]
    observation: str = ""
    success: bool = True


@dataclass
class AgentPlan:
    """Decomposed plan for complex goals"""
    goal: str
    subtasks: List[Dict[str, Any]] = field(default_factory=list)
    current_step: int = 0
    completed_steps: List[int] = field(default_factory=list)


@dataclass
class AgentMemory:
    """Agent's working memory for current session"""
    goal: str
    plan: Optional[AgentPlan] = None
    steps: List[AgentStep] = field(default_factory=list)
    context: Dict[str, Any] = field(default_factory=dict)
    generated_blocks: List[Dict] = field(default_factory=list)
    modified_pages: List[Dict] = field(default_factory=list)
    created_skills: List[Dict] = field(default_factory=list)
    created_tasks: List[Dict] = field(default_factory=list)
    learnings: List[Dict] = field(default_factory=list)
    page_analysis: Optional[Dict] = None  # Analyzed page context


class AgenticAgent:
    """
    ReAct-style Agent that:
    1. Decomposes complex goals into subtasks
    2. Uses Thought-Action-Observation loop
    3. Learns from interactions and improves
    4. Has full CRUD control over workspace content
    """
    
    MAX_STEPS = 10  # Prevent infinite loops
    
    def __init__(self):
        self.llm = None
    
    def _get_llm(self, model: str = None):
        """Get LLM instance - routes to correct API based on model"""
        model = model or DEFAULT_MODEL
        
        # Check if this is a Gemini model - use Google's direct API
        is_gemini = any(gm in model.lower() for gm in ['gemini', 'google/gemini'])
        
        if is_gemini and settings.GEMINI_API_KEY:
            # Use Google's direct Gemini API
            # Extract model name (remove provider prefix if present)
            gemini_model = model
            if model.startswith("google/"):
                gemini_model = model.split("/")[1].replace(":free", "")
            
            logger.info(f"🔷 Using Google Gemini API: {gemini_model}")
            return ChatGoogleGenerativeAI(
                model=gemini_model,
                google_api_key=settings.GEMINI_API_KEY,
                temperature=0.7,
                convert_system_message_to_human=True
            )
        
        # Use OpenRouter for other models
        api_key = settings.OPENROUTER_API_KEY or settings.OPENAI_API_KEY
        base_url = settings.OPENROUTER_BASE_URL if settings.OPENROUTER_API_KEY else None
        
        if not api_key:
            raise ValueError("No API key configured")
        
        logger.info(f"🔶 Using OpenRouter API: {model}")
        return ChatOpenAI(
            model=model,
            api_key=api_key,
            base_url=base_url,
            temperature=0.7
        )

    async def process_goal(
        self,
        goal: str,
        user_id: str,
        workspace_id: str,
        mode: str = "agent",
        current_page_id: str = None,
        mentioned_items: List[Dict] = None,
        conversation_history: List[Dict] = None
    ) -> Dict[str, Any]:
        """
        Process a user goal using agentic reasoning
        
        Args:
            goal: User's goal/request
            user_id: Current user ID
            workspace_id: Current workspace ID
            mode: agent/build/ask
            current_page_id: ID of current page (for CRUD operations)
            mentioned_items: Items mentioned with @ syntax
            conversation_history: Previous messages
            
        Returns:
            Complete response with reasoning trace and results
        """
        mentioned_items = mentioned_items or []
        conversation_history = conversation_history or []
        
        logger.info(f"🤖 Agent processing goal: '{goal[:50]}...'")
        
        # Initialize agent memory
        memory = AgentMemory(goal=goal)
        
        try:
            # FAST PATH: Handle simple direct commands without complex reasoning
            fast_result = await self._handle_fast_path(
                goal, user_id, workspace_id, current_page_id, memory
            )
            if fast_result:
                return fast_result
            
            # Step 1: Analyze goal complexity and decompose if needed
            is_complex, subtasks = await self._analyze_and_decompose(goal, workspace_id, user_id)
            
            if is_complex and subtasks:
                memory.plan = AgentPlan(goal=goal, subtasks=subtasks)
                logger.info(f"📋 Decomposed into {len(subtasks)} subtasks")
            
            # Step 2: Gather initial context
            context = await self._gather_context(
                goal, user_id, workspace_id, mentioned_items, current_page_id
            )
            memory.context = {
                "pages": context.relevant_pages,
                "skills": context.relevant_skills,
                "tasks": context.relevant_tasks,
                "current_page": await self._get_page(current_page_id) if current_page_id else None,
                "mentioned_items": context.mentioned_items,
                "learnings": await self._get_user_learnings(user_id, workspace_id)
            }
            
            # Step 3: Execute Thought-Action-Observation loop
            final_response = await self._execute_agent_loop(
                memory, user_id, workspace_id, current_page_id, conversation_history
            )
            
            # Step 4: Store learnings for future improvement
            await self._store_learnings(memory, user_id, workspace_id)
            
            # Build response
            return self._build_response(memory, final_response)
            
        except Exception as e:
            logger.error(f"Agent error: {e}", exc_info=True)
            return {
                "success": False,
                "response": f"I encountered an error while processing your request: {str(e)}",
                "reasoning_trace": [s.__dict__ for s in memory.steps],
                "error": str(e)
            }
    
    async def _handle_fast_path(
        self,
        goal: str,
        user_id: str,
        workspace_id: str,
        current_page_id: str,
        memory: AgentMemory
    ) -> Optional[Dict[str, Any]]:
        """
        Handle simple direct commands without complex reasoning.
        This is the FAST PATH for common operations.
        
        AUTONOMOUS AGENT - Takes action immediately without asking.
        Enhanced with better natural language understanding for page CRUD.
        """
        goal_lower = goal.lower().strip()
        
        # ============ CONTEXT-AWARE INTENT DETECTION ============
        # If user is in Agent mode with a page open and asks about a topic,
        # they likely want to create a subpage, not generate content in chat
        if current_page_id:
            # Topic request indicators
            topic_indicators = [
                "write about", "explain", "tell me about", "describe",
                "create about", "make about", "add about", "write on"
            ]
            
            # Check if it's a topic request
            is_topic_request = any(indicator in goal_lower for indicator in topic_indicators)
            
            # Check if user explicitly wants content insertion (not a subpage)
            wants_insertion = any(phrase in goal_lower for phrase in [
                "insert", "add to this page", "add here", "put here",
                "add content to", "insert into", "append to", "add to current",
                "write to this page", "write to the page", "add to page"
            ])
            
            # If it's a topic request without explicit insertion, redirect to subpage creation
            if is_topic_request and not wants_insertion:
                import re
                # Extract topic
                topic = goal
                for indicator in topic_indicators:
                    if indicator in goal_lower:
                        parts = goal_lower.split(indicator, 1)
                        if len(parts) > 1:
                            topic = parts[1].strip()
                            break
                
                # Clean topic
                topic = topic.replace('the current page', '').replace('this page', '').replace('current page', '').strip()
                
                if topic and len(topic) > 2:
                    # Redirect to subpage creation
                    logger.info(f"🎯 Context-aware detection: Topic request '{topic}' → Creating subpage")
                    goal = f"create subpage about {topic}"
                    goal_lower = goal.lower()
        
        # ============ LEARNING: Track user intent for improvement ============
        await self._track_user_intent(goal, user_id, workspace_id)
        
        # ============ ENHANCED PAGE CRUD OPERATIONS ============
        
        # DELETE PAGE - Multiple natural variations
        delete_page_patterns = [
            "delete this page", "delete the page", "delete current page",
            "remove this page", "remove the page", "remove current page",
            "delete page", "remove page", "trash this page", "trash page",
            "get rid of this page", "get rid of page"
        ]
        if any(pattern in goal_lower for pattern in delete_page_patterns):
            if not current_page_id:
                return {
                    "success": False,
                    "response": "Please open a page first to delete it.",
                    "mode": "agent"
                }
            
            # Get page title for confirmation message
            page = await self._get_page(current_page_id)
            page_title = page.get('title', 'this page') if page else 'this page'
            
            # Delete the page
            result = await self._delete_page(current_page_id, user_id)
            if result:
                return {
                    "success": True,
                    "response": f"✅ Deleted page: **{page_title}**",
                    "mode": "agent",
                    "actions": [{
                        "label": "Go to Pages",
                        "route": "/pages",
                        "type": "page_deleted"
                    }]
                }
            else:
                return {
                    "success": False,
                    "response": f"Failed to delete page: {page_title}",
                    "mode": "agent"
                }
        
        # DELETE CONTENT/BLOCKS - Clear page content
        delete_content_patterns = [
            "delete all content", "delete content", "clear content",
            "delete all blocks", "delete blocks", "clear blocks",
            "clear this page", "clear the page", "empty this page",
            "remove all content", "remove content", "erase content"
        ]
        if any(pattern in goal_lower for pattern in delete_content_patterns):
            if not current_page_id:
                return {
                    "success": False,
                    "response": "Please open a page first to delete its content.",
                    "mode": "agent"
                }
            
            # Delete all blocks from the page
            result = await self._delete_blocks(current_page_id, [], user_id)
            if result:
                return {
                    "success": True,
                    "response": "✅ Cleared all content from this page.",
                    "mode": "agent",
                    "actions": [{
                        "label": "Add Content",
                        "action": "focus_editor",
                        "type": "content_cleared"
                    }]
                }
        
        # UPDATE/EDIT PAGE - Modify existing page
        update_page_patterns = [
            "update this page", "update the page", "update page",
            "edit this page", "edit the page", "edit page",
            "modify this page", "modify the page", "modify page",
            "change this page", "change the page", "rewrite this page"
        ]
        if any(pattern in goal_lower for pattern in update_page_patterns):
            if not current_page_id:
                return {
                    "success": False,
                    "response": "Please open a page first to update it.",
                    "mode": "agent"
                }
            
            # Get current page context
            page_context = await self._get_page(current_page_id)
            page_title = page_context.get('title', 'this page') if page_context else 'this page'
            
            # Extract what user wants to update
            update_request = goal.replace("update", "").replace("edit", "").replace("modify", "").replace("change", "").replace("this page", "").replace("the page", "").replace("page", "").strip()
            
            if not update_request or len(update_request) < 5:
                return {
                    "success": False,
                    "response": f"What would you like to update on **{page_title}**? Please be more specific.",
                    "mode": "agent"
                }
            
            # Generate new content based on update request
            blocks = await self._generate_content_blocks_simple(update_request, "mixed", page_context)
            
            if blocks:
                memory.generated_blocks = blocks
                return {
                    "success": True,
                    "response": f"✅ Generated updated content for **{page_title}**\n\nClick below to replace the page content.",
                    "mode": "agent",
                    "generated_blocks": blocks,
                    "actions": [{
                        "label": "Replace Page Content",
                        "action": "replace_blocks",
                        "blocks": blocks,
                        "type": "update_page"
                    }, {
                        "label": "Append to Page",
                        "action": "insert_blocks",
                        "blocks": blocks,
                        "type": "append_blocks"
                    }]
                }
        
        # READ PAGE - View page content
        read_page_patterns = [
            "read this page", "read the page", "read page",
            "show this page", "show the page", "show page content",
            "what's on this page", "what is on this page",
            "view this page", "view the page", "display page"
        ]
        if any(pattern in goal_lower for pattern in read_page_patterns):
            if not current_page_id:
                return {
                    "success": False,
                    "response": "Please open a page first to read it.",
                    "mode": "agent"
                }
            
            page = await self._get_page_with_details(current_page_id)
            if page:
                title = page.get('title', 'Untitled')
                content = page.get('content', '')
                blocks = page.get('blocks', [])
                
                # Build summary
                block_summary = {}
                for block in blocks:
                    bt = block.get('type', 'unknown')
                    block_summary[bt] = block_summary.get(bt, 0) + 1
                
                block_info = ", ".join([f"{count} {btype}(s)" for btype, count in block_summary.items()])
                
                response_text = f"📄 **{title}**\n\n"
                response_text += f"**Content:** {len(content)} characters\n"
                response_text += f"**Blocks:** {len(blocks)} total - {block_info}\n\n"
                
                if content:
                    response_text += f"**Preview:** {content[:300]}{'...' if len(content) > 300 else ''}"
                
                return {
                    "success": True,
                    "response": response_text,
                    "mode": "agent",
                    "page_data": page
                }
        
        # WRITE TO PAGE - Add content to current page
        write_page_patterns = [
            "write to this page", "write to the page", "write to page",
            "add to this page", "add to the page", "add to page",
            "write on this page", "write on the page",
            "put this on the page", "put this on page"
        ]
        if any(pattern in goal_lower for pattern in write_page_patterns):
            if not current_page_id:
                return {
                    "success": False,
                    "response": "Please open a page first to write to it.",
                    "mode": "agent"
                }
            
            # Extract what to write
            write_content = goal
            for pattern in write_page_patterns:
                write_content = write_content.replace(pattern, "").strip()
            
            if not write_content or len(write_content) < 3:
                return {
                    "success": False,
                    "response": "What would you like to write? Please provide the content.",
                    "mode": "agent"
                }
            
            # Get page context
            page_context = await self._get_page(current_page_id)
            
            # Generate blocks
            blocks = await self._generate_content_blocks_simple(write_content, "mixed", page_context)
            
            if blocks:
                memory.generated_blocks = blocks
                return {
                    "success": True,
                    "response": f"✅ Generated content to add to this page.\n\nClick below to insert.",
                    "mode": "agent",
                    "generated_blocks": blocks,
                    "actions": [{
                        "label": f"Insert {len(blocks)} Block(s)",
                        "action": "insert_blocks",
                        "blocks": blocks,
                        "type": "insert_blocks"
                    }]
                }
        
        # ============ AUTONOMOUS TASK MANAGEMENT ============
        # User says "reschedule overdue tasks" → Agent just does it
        if any(phrase in goal_lower for phrase in [
            "reschedule overdue", "reschedule tasks", "fix overdue", 
            "update overdue", "move overdue", "postpone overdue"
        ]):
            result = await self._reschedule_overdue_tasks(user_id, workspace_id)
            if result["success"]:
                await self._record_success(goal, "reschedule_tasks", user_id, workspace_id)
                return {
                    "success": True,
                    "response": f"✅ {result['message']}\n\nRescheduled {result['count']} overdue tasks to next week.",
                    "mode": "agent",
                    "generated_blocks": [],
                    "modified_pages": [],
                    "created_skills": [],
                    "created_tasks": [],
                    "actions": [{
                        "label": "View Tasks",
                        "route": "/tasks",
                        "type": "tasks_updated"
                    }]
                }
        
        # ============ CREATE REMINDER/TASK (HIGH PRIORITY) ============
        # User says "create a reminder" or "remind me" → Create TASK, not content
        if any(phrase in goal_lower for phrase in [
            "create a reminder", "create reminder", "remind me", "set a reminder",
            "reminder for", "reminder to", "set reminder"
        ]):
            # Extract task details
            task_title = self._extract_reminder_title(goal) or "Reminder"
            task = await self._create_task_with_type(task_title, "reminder", user_id, workspace_id, goal)
            
            if task:
                memory.created_tasks.append(task)
                await self._record_success(goal, "create_reminder", user_id, workspace_id)
                return {
                    "success": True,
                    "response": f"✅ Created reminder: **{task_title}**\n\nDue: {task.get('due_date', 'Not set')}",
                    "mode": "agent",
                    "generated_blocks": [],
                    "modified_pages": [],
                    "created_skills": [],
                    "created_tasks": [task],
                    "actions": [{
                        "label": "View Calendar",
                        "route": "/calendar",
                        "type": "task_created"
                    }]
                }
        
        # Complete all done tasks
        if any(phrase in goal_lower for phrase in [
            "complete all done", "mark done as complete", "finish completed tasks",
            "archive done tasks", "clean up done"
        ]):
            result = await self._complete_done_tasks(user_id, workspace_id)
            await self._record_success(goal, "complete_tasks", user_id, workspace_id)
            return {
                "success": True,
                "response": f"✅ {result['message']}",
                "mode": "agent",
                "actions": [{"label": "View Tasks", "route": "/tasks"}]
            }
        
        # Delete completed tasks
        if any(phrase in goal_lower for phrase in [
            "delete completed", "remove done tasks", "clear finished"
        ]):
            result = await self._delete_completed_tasks(user_id, workspace_id)
            await self._record_success(goal, "delete_tasks", user_id, workspace_id)
            return {
                "success": True,
                "response": f"✅ {result['message']}",
                "mode": "agent",
                "actions": [{"label": "View Tasks", "route": "/tasks"}]
            }
        
        # Prioritize tasks
        if any(phrase in goal_lower for phrase in [
            "prioritize tasks", "organize tasks", "sort tasks by priority"
        ]):
            result = await self._prioritize_tasks(user_id, workspace_id)
            await self._record_success(goal, "prioritize_tasks", user_id, workspace_id)
            return {
                "success": True,
                "response": f"✅ {result['message']}",
                "mode": "agent",
                "actions": [{"label": "View Tasks", "route": "/tasks"}]
            }
        
        # ============ CREATE NEW PAGE WITH CONTENT ============
        if any(phrase in goal_lower for phrase in [
            "create new page", "create a new page", "new page", "make a page",
            "create page", "add new page", "add a page"
        ]):
            # Extract title from goal or use default
            title = self._extract_page_title(goal) or "New Page"
            
            # Generate initial content blocks for the page
            logger.info(f"📝 Creating page '{title}' with AI-generated content...")
            initial_blocks = await self._generate_smart_page_content(title, goal)
            
            # Create the page with content
            page = await self._create_page(title, "", initial_blocks, user_id, workspace_id, "📄")
            
            if page:
                memory.modified_pages.append({
                    "id": page["id"], 
                    "title": title, 
                    "action": "created"
                })
                return {
                    "success": True,
                    "response": f"✅ Created new page: **{title}**\n\nThe page has been created with AI-generated content. Click below to open and edit it.",
                    "mode": "agent",
                    "generated_blocks": initial_blocks,
                    "modified_pages": memory.modified_pages,
                    "created_skills": [],
                    "created_tasks": [],
                    "actions": [{
                        "label": f"Open '{title}'",
                        "route": f"/pages/{page['id']}/edit",
                        "type": "page_created"
                    }]
                }
            else:
                return {
                    "success": False,
                    "response": "Failed to create page. Please try again.",
                    "mode": "agent"
                }
        
        # ============ CREATE SUBPAGE (continues topic like book chapters) ============
        if any(phrase in goal_lower for phrase in [
            "create subpage", "add subpage", "new subpage", "create a subpage",
            "add child page", "create child page", "next chapter", "continue", "next topic",
            "subpage about", "subpage for", "subpage on", "subpage related",
            "child page about", "child page for", "sub page about", "sub page for"
        ]):
            if not current_page_id:
                return {
                    "success": False,
                    "response": "Please open a page first to create a subpage under it.",
                    "mode": "agent"
                }
            
            # Get parent page context
            parent_page = await self._get_page(current_page_id)
            parent_title = parent_page.get('title', 'Parent') if parent_page else 'Parent'
            parent_content = parent_page.get('content', '') if parent_page else ''
            
            # Get existing subpages to understand progression
            existing_subpages = await self._get_subpages(current_page_id)
            subpage_titles = [sp.get('title', '') for sp in existing_subpages] if existing_subpages else []
            
            # Generate NEXT topic title (not copy of parent)
            next_title = await self._generate_next_topic_title(parent_title, parent_content, subpage_titles, goal)
            
            # Extract topic if user specified one (e.g., "create subpage about Python")
            import re
            topic_match = re.search(r'(?:about|for|on|regarding|related to)\s+(.+?)(?:\s+under|\s+in|\s+to|\s+with|$)', goal_lower)
            if topic_match:
                user_topic = topic_match.group(1).strip()
                # Clean up the topic
                user_topic = user_topic.replace('the current page', '').replace('this page', '').replace('current page', '').strip()
                if user_topic and len(user_topic) > 2:
                    next_title = user_topic.title()
                    logger.info(f"📝 Using user-specified topic: {next_title}")
            
            # Check if user wants content generation (must be explicit)
            wants_content = any(phrase in goal_lower for phrase in [
                "with content", "write content", "generate content", 
                "fill with content", "add content to it", "create content for it",
                "and write", "and generate", "and fill", "explaining"
            ])
            
            # Only generate content if explicitly requested
            if wants_content:
                logger.info(f"📝 Creating subpage '{next_title}' WITH generated content...")
                initial_blocks = await self._generate_continuation_content(next_title, parent_page, subpage_titles, goal)
            else:
                logger.info(f"📝 Creating EMPTY subpage '{next_title}'...")
                # Create empty subpage with single empty text block
                import time
                initial_blocks = [{
                    "id": f"text-{int(time.time() * 1000)}",
                    "type": "text",
                    "position": 0,
                    "data": {"content": ""}
                }]
            
            # Create subpage
            subpage = await self._create_subpage(next_title, current_page_id, "", initial_blocks, user_id, workspace_id)
            
            if subpage:
                memory.modified_pages.append({
                    "id": subpage["id"], 
                    "title": next_title, 
                    "action": "created",
                    "parent_id": current_page_id
                })
                
                content_msg = " with generated content" if wants_content else " (empty - add your content)"
                
                return {
                    "success": True,
                    "response": f"✅ Created subpage: **{next_title}** under **{parent_title}**{content_msg}",
                    "mode": "agent",
                    "generated_blocks": initial_blocks,
                    "modified_pages": memory.modified_pages,
                    "created_skills": [],
                    "created_tasks": [],
                    "actions": [{
                        "label": f"Open '{next_title}'",
                        "route": f"/pages/{subpage['id']}/edit",
                        "type": "page_created"
                    }]
                }
        
        # ============ GENERATE CONTENT (for insertion) ============
        content_triggers = [
            "write about", "generate content", "create content", "write content",
            "explain", "describe", "tell me about", "give me", "write a",
            "create a table", "make a table", "generate a table",
            "create a list", "make a list", "generate a list",
            "add content", "add section", "add", "write", "generate"
        ]
        
        if any(trigger in goal_lower for trigger in content_triggers):
            # Get current page context if available
            page_context = None
            if current_page_id:
                page_context = await self._get_page(current_page_id)
            
            # Generate content blocks with context
            topic = goal  # Use full goal as topic
            content_type = self._detect_content_type(goal_lower)
            
            blocks = await self._generate_content_blocks_simple(topic, content_type, page_context)
            
            if blocks:
                memory.generated_blocks = blocks
                block_summary = self._summarize_blocks(blocks)
                
                return {
                    "success": True,
                    "response": f"✅ Generated content\n\n{block_summary}\n\nClick 'Insert Blocks' to add this content to your page.",
                    "mode": "agent",
                    "generated_blocks": blocks,
                    "modified_pages": [],
                    "created_skills": [],
                    "created_tasks": [],
                    "actions": [{
                        "label": f"Insert {len(blocks)} Block(s)",
                        "action": "insert_blocks",
                        "blocks": blocks,
                        "type": "insert_blocks"
                    }]
                }
        
        # ============ CREATE SKILL ============
        if any(phrase in goal_lower for phrase in [
            "create skill", "add skill", "new skill", "create a skill"
        ]):
            skill_name = self._extract_skill_name(goal) or "New Skill"
            skill = await self._create_skill(skill_name, "Beginner", user_id, workspace_id)
            
            if skill:
                memory.created_skills.append(skill)
                return {
                    "success": True,
                    "response": f"✅ Created skill: **{skill_name}**",
                    "mode": "agent",
                    "generated_blocks": [],
                    "modified_pages": [],
                    "created_skills": [skill],
                    "created_tasks": [],
                    "actions": [{
                        "label": f"View Skills",
                        "route": "/skills",
                        "type": "skill_created"
                    }]
                }
        
        # ============ CREATE TASK (with types: task, milestone, event, birthday, reminder) ============
        task_patterns = [
            ("task", ["create task", "add task", "new task"]),
            ("milestone", ["create milestone", "add milestone", "new milestone"]),
            ("event", ["create event", "add event", "new event", "schedule event"]),
            ("birthday", ["create birthday", "add birthday", "birthday reminder"]),
            ("reminder", ["create reminder", "add reminder", "remind me", "set reminder"])
        ]
        
        for event_type, patterns in task_patterns:
            if any(phrase in goal_lower for phrase in patterns):
                # Extract title from goal
                task_title = self._extract_task_title(goal) or f"New {event_type.title()}"
                task = await self._create_task_with_type(task_title, event_type, user_id, workspace_id, goal)
                
                if task:
                    memory.created_tasks.append(task)
                    return {
                        "success": True,
                        "response": f"✅ Created {event_type}: **{task_title}**",
                        "mode": "agent",
                        "generated_blocks": [],
                        "modified_pages": [],
                        "created_skills": [],
                        "created_tasks": [task],
                        "actions": [{
                            "label": "View Calendar",
                            "route": "/calendar",
                            "type": "task_created"
                        }]
                    }
        
        # ============ SMART UNIVERSAL HANDLER ============
        # If no specific pattern matched, let the LLM decide what to do
        # This makes the agent truly intelligent - it understands any request
        page_context = None
        if current_page_id:
            page_context = await self._get_page(current_page_id)
        
        # Generate smart content for any request
        blocks = await self._generate_content_blocks_simple(goal, "mixed", page_context)
        
        if blocks and len(blocks) > 0:
            memory.generated_blocks = blocks
            block_summary = self._summarize_blocks(blocks)
            
            return {
                "success": True,
                "response": f"✅ Here's what I generated:\n\n{block_summary}\n\nClick below to insert into your page.",
                "mode": "agent",
                "generated_blocks": blocks,
                "modified_pages": [],
                "created_skills": [],
                "created_tasks": [],
                "actions": [{
                    "label": f"Insert {len(blocks)} Block(s)",
                    "action": "insert_blocks",
                    "blocks": blocks,
                    "type": "insert_blocks"
                }]
            }
        
        # Not a fast-path command, return None to use full reasoning
        return None
    
    def _extract_page_title(self, goal: str) -> str:
        """Extract page title from goal"""
        # Common patterns: "create new page called X", "create page X", "new page: X"
        patterns = [
            r"(?:create|make|add)\s+(?:a\s+)?(?:new\s+)?page\s+(?:called|named|titled|:)?\s*['\"]?([^'\"]+)['\"]?",
            r"new page\s+(?:called|named|titled|:)?\s*['\"]?([^'\"]+)['\"]?",
            r"page\s+(?:about|for|on)\s+['\"]?([^'\"]+)['\"]?"
        ]
        
        for pattern in patterns:
            match = re.search(pattern, goal, re.IGNORECASE)
            if match:
                title = match.group(1).strip()
                # Clean up common suffixes
                title = re.sub(r'\s*(please|thanks|thank you).*$', '', title, flags=re.IGNORECASE)
                return title[:100] if title else None
        
        return None
    
    def _extract_skill_name(self, goal: str) -> str:
        """Extract skill name from goal"""
        patterns = [
            r"(?:create|add|new)\s+skill\s+(?:called|named|for|:)?\s*['\"]?([^'\"]+)['\"]?",
            r"skill\s+(?:about|for|on)\s+['\"]?([^'\"]+)['\"]?"
        ]
        
        for pattern in patterns:
            match = re.search(pattern, goal, re.IGNORECASE)
            if match:
                name = match.group(1).strip()
                name = re.sub(r'\s*(please|thanks).*$', '', name, flags=re.IGNORECASE)
                return name[:100] if name else None
        
        return None
    
    def _extract_reminder_title(self, goal: str) -> str:
        """Extract reminder title from goal - what user wants to be reminded about"""
        patterns = [
            r"remind(?:er)?\s+(?:me\s+)?(?:to\s+)?(.+?)(?:\s+(?:at|in|on|by|for)|\s*$)",
            r"(?:create|set)\s+(?:a\s+)?remind(?:er)?\s+(?:for|to)\s+(.+?)(?:\s+(?:at|in|on|by)|\s*$)",
            r"remind(?:er)?\s+for\s+(.+?)(?:\s+(?:at|in|on|by)|\s*$)"
        ]
        
        for pattern in patterns:
            match = re.search(pattern, goal, re.IGNORECASE)
            if match:
                title = match.group(1).strip()
                # Clean up
                title = re.sub(r'\s*(please|thanks|thank you).*$', '', title, flags=re.IGNORECASE)
                return title[:100] if title else None
        
        # Fallback: extract everything after "to"
        if " to " in goal.lower():
            parts = goal.lower().split(" to ", 1)
            if len(parts) > 1:
                return parts[1].strip()[:100]
        
        return None
    
    def _extract_task_title(self, goal: str) -> str:
        """Extract task title from goal"""
        patterns = [
            r"(?:create|add|new)\s+task\s+(?:called|named|to|:)?\s*['\"]?([^'\"]+)['\"]?",
            r"task\s+(?:to|for)\s+['\"]?([^'\"]+)['\"]?"
        ]
        
        for pattern in patterns:
            match = re.search(pattern, goal, re.IGNORECASE)
            if match:
                title = match.group(1).strip()
                title = re.sub(r'\s*(please|thanks).*$', '', title, flags=re.IGNORECASE)
                return title[:100] if title else None
        
        return None
    
    def _detect_content_type(self, goal_lower: str) -> str:
        """Detect what type of content user wants"""
        if any(w in goal_lower for w in ["table", "comparison", "compare"]):
            return "table"
        if any(w in goal_lower for w in ["list", "steps", "points"]):
            return "list"
        if any(w in goal_lower for w in ["code", "example", "snippet"]):
            return "code"
        return "mixed"  # Default to mixed content
    
    def _summarize_blocks(self, blocks: List[Dict]) -> str:
        """Create a brief summary of generated blocks"""
        type_counts = {}
        for block in blocks:
            bt = block.get("type", "unknown")
            type_counts[bt] = type_counts.get(bt, 0) + 1
        
        parts = [f"{count} {btype}(s)" for btype, count in type_counts.items()]
        return f"Generated: {', '.join(parts)}"
    
    async def _generate_content_blocks_simple(
        self, topic: str, content_type: str, page_context: Dict = None
    ) -> List[Dict]:
        """
        Smart content generation - LLM decides what to generate based on context.
        No hardcoded templates - pure AI-driven content.
        """
        import time
        
        llm = self._get_llm()
        
        # Build context from current page if available
        context_info = ""
        if page_context:
            context_info = f"""
CURRENT PAGE CONTEXT:
- Title: {page_context.get('title', 'Untitled')}
- Existing Content: {page_context.get('content', '')[:500]}
- Existing Blocks: {len(page_context.get('blocks', []))} blocks
- Page Type: {page_context.get('page_type', 'page')}

Generate content that COMPLEMENTS and EXTENDS the existing page content.
"""
        
        # Smart prompt - let LLM decide the best format
        prompt = f"""You are an intelligent content generator. Generate high-quality, relevant content.

USER REQUEST: {topic}
{context_info}

INSTRUCTIONS:
1. Analyze what the user wants
2. Generate COMPLETE, USEFUL content (not placeholders)
3. Choose the BEST block types for the content:
   - Use "heading" for section titles
   - Use "text" for paragraphs and explanations
   - Use "list" for enumerable items, steps, or bullet points
   - Use "table" for comparisons, data, or structured information
   - Use "code" for any code examples (with correct language)
   - Use "callout" for tips, warnings, or important notes
   - Use "quote" for citations or important quotes

BLOCK FORMAT (JSON array):
[
  {{"type": "heading", "data": {{"content": "Section Title", "level": 2}}}},
  {{"type": "text", "data": {{"content": "Full paragraph with real information..."}}}},
  {{"type": "list", "data": {{"items": ["Real item 1", "Real item 2", "Real item 3"], "style": "bullet"}}}},
  {{"type": "code", "data": {{"code": "actual code here", "language": "python"}}}},
  {{"type": "table", "data": {{"rows": [["Header1", "Header2"], ["Data1", "Data2"]], "hasHeader": true}}}},
  {{"type": "callout", "data": {{"content": "Important tip or note", "type": "info"}}}}
]

RULES:
- Generate 3-10 blocks based on content needs
- Write REAL content, not "Add content here" placeholders
- Use appropriate block types for the content
- For code, always specify the correct language
- Make content educational and useful
- Return ONLY the JSON array, nothing else"""

        try:
            response = await asyncio.to_thread(
                lambda: llm.invoke([HumanMessage(content=prompt)])
            )
            content = response.content.strip()
            
            # Try to parse JSON with multiple strategies
            raw_blocks = self._parse_json_safely(content)
            
            if not raw_blocks:
                raise ValueError("Could not parse JSON from response")
            
            # Convert to proper format with IDs
            blocks = []
            ts = int(time.time() * 1000)
            for i, block in enumerate(raw_blocks):
                block_type = block.get("type", "text")
                block_data = block.get("data", {})
                
                blocks.append({
                    "id": f"{block_type}-{ts}-{i}",
                    "type": block_type,
                    "position": i,
                    "data": self._normalize_block_data(block_type, block_data)
                })
            
            logger.info(f"✅ Generated {len(blocks)} blocks for '{topic[:30]}...'")
            return blocks
            
        except Exception as e:
            logger.error(f"Simple content generation error: {e}")
            # Return basic fallback
            return self._create_fallback_blocks(topic)
    
    async def _generate_initial_page_blocks(self, title: str) -> List[Dict]:
        """
        Generate initial content blocks for a new page.
        Creates professional, complete content that looks human-written.
        """
        import time
        ts = int(time.time() * 1000)
        
        # Try to generate rich, natural content with LLM
        try:
            llm = self._get_llm()
            
            prompt = f"""Write comprehensive, professional content for a page about "{title}".

Create 5-8 blocks with COMPLETE, NATURAL content (not placeholders):

1. Start with an engaging introduction paragraph (2-3 sentences)
2. Add a heading for a main section
3. Write detailed paragraphs with real information
4. Include a list with specific, useful points
5. Add a table if relevant (with real data/examples)
6. End with a conclusion or next steps

IMPORTANT:
- Write COMPLETE sentences and paragraphs
- NO placeholders like "Add content here" or "..."
- Make it look like a human expert wrote it
- Include specific details and examples
- Use proper formatting

Return JSON array:
[
  {{"type": "text", "data": {{"content": "Complete introduction paragraph with 2-3 full sentences explaining {title} clearly and professionally."}}}},
  {{"type": "heading", "data": {{"content": "Main Topic Section", "level": 2}}}},
  {{"type": "text", "data": {{"content": "Detailed paragraph with specific information and examples."}}}},
  {{"type": "list", "data": {{"items": ["Specific point with details", "Another detailed point", "Third concrete point"], "style": "bullet"}}}},
  {{"type": "text", "data": {{"content": "Additional paragraph with more insights and information."}}}}
]

Return ONLY the JSON array with COMPLETE content."""

            response = await asyncio.to_thread(
                lambda: llm.invoke([HumanMessage(content=prompt)])
            )
            content = response.content.strip()
            
            # Use safe JSON parser
            raw_blocks = self._parse_json_safely(content)
            
            if not raw_blocks:
                raise ValueError("Could not parse JSON from response")
            
            # Convert to proper format
            blocks = []
            for i, block in enumerate(raw_blocks):
                block_type = block.get("type", "text")
                block_data = block.get("data", {})
                
                blocks.append({
                    "id": f"{block_type}-{ts}-{i}",
                    "type": block_type,
                    "position": i,
                    "data": self._normalize_block_data(block_type, block_data)
                })
            
            if blocks and len(blocks) >= 3:
                logger.info(f"✅ Generated {len(blocks)} rich blocks for page '{title}'")
                return blocks
                
        except Exception as e:
            logger.warning(f"LLM content generation failed, using enhanced fallback: {e}")
        
        # FALLBACK: Create better default content
        return self._create_enhanced_fallback_blocks(title)
    
    async def _generate_smart_page_content(self, title: str, user_request: str, parent_page: Dict = None) -> List[Dict]:
        """
        Generate intelligent page content based on:
        - Page title
        - User's full request
        - Parent page context (for subpages)
        
        Let the LLM decide the best content structure.
        """
        import time
        ts = int(time.time() * 1000)
        
        llm = self._get_llm()
        
        # Build context
        parent_context = ""
        if parent_page:
            parent_context = f"""
PARENT PAGE CONTEXT:
- Parent Title: {parent_page.get('title', 'Unknown')}
- Parent Content: {(parent_page.get('content') or '')[:500]}

This is a SUBPAGE. Generate content that:
1. Relates to and extends the parent page topic
2. Goes deeper into a specific aspect
3. References the parent topic naturally
"""
        
        prompt = f"""You are creating content for a page titled: "{title}"

USER REQUEST: {user_request}
{parent_context}

Generate comprehensive, professional content using these block types:

AVAILABLE BLOCKS:
- heading: {{"content": "Title", "level": 1|2|3}}
- text: {{"content": "Paragraph with real information"}}
- list: {{"items": ["item1", "item2", "item3"], "style": "bullet"|"numbered"}}
- table: {{"rows": [["H1","H2"],["D1","D2"]], "hasHeader": true}}
- code: {{"content": "real code", "language": "python|javascript|sql|etc"}}
- callout: {{"content": "Important note", "type": "info"|"warning"|"success"}}
- quote: {{"content": "Quote text", "author": "Source"}}

INSTRUCTIONS:
1. Start with a level 1 heading (the page title)
2. Write an engaging introduction paragraph
3. Add relevant sections with level 2 headings
4. Use lists for steps, features, or key points
5. Use tables for comparisons or structured data
6. Use code blocks for any code examples
7. Use callouts for tips, warnings, or important notes
8. Write REAL, USEFUL content - no placeholders

OUTPUT FORMAT - JSON array only:
[
  {{"type": "heading", "data": {{"content": "{title}", "level": 1}}}},
  {{"type": "text", "data": {{"content": "Introduction paragraph..."}}}},
  ...more blocks...
]

Generate 5-12 blocks with complete, educational content.
Return ONLY the JSON array."""

        try:
            response = await asyncio.to_thread(
                lambda: llm.invoke([HumanMessage(content=prompt)])
            )
            
            raw_blocks = self._parse_json_safely(response.content.strip())
            
            if raw_blocks:
                blocks = []
                for i, block in enumerate(raw_blocks):
                    block_type = block.get("type", "text")
                    block_data = block.get("data", {})
                    blocks.append({
                        "id": f"{block_type}-{ts}-{i}",
                        "type": block_type,
                        "position": i,
                        "data": self._normalize_block_data(block_type, block_data)
                    })
                logger.info(f"✅ Generated {len(blocks)} smart blocks for '{title}'")
                return blocks
                
        except Exception as e:
            logger.warning(f"Smart content generation failed: {e}")
        
        # Fallback
        return self._create_fallback_blocks(title)
    
    def _create_fallback_blocks(self, title: str) -> List[Dict]:
        """Create reliable fallback blocks when LLM fails"""
        import time
        ts = int(time.time() * 1000)
        
        return [
            {
                "id": f"text-{ts}-0",
                "type": "text",
                "position": 0,
                "data": {"content": f"Welcome to {title}. Start adding your content here."}
            },
            {
                "id": f"text-{ts}-1",
                "type": "text",
                "position": 1,
                "data": {"content": "Use the editor toolbar to add headings, lists, tables, and more."}
            },
            {
                "id": f"callout-{ts}-2",
                "type": "callout",
                "position": 2,
                "data": {"content": "Tip: Press '/' to see all available block types.", "type": "info"}
            }
        ]
    
    def _create_enhanced_fallback_blocks(self, title: str) -> List[Dict]:
        """Create enhanced fallback blocks with topic-specific content"""
        import time
        ts = int(time.time() * 1000)
        
        # Generate topic-specific content based on title keywords
        title_lower = title.lower()
        
        # Detect topic category
        if any(word in title_lower for word in ['sql', 'database', 'query', 'join', 'table']):
            return self._create_sql_content(title, ts)
        elif any(word in title_lower for word in ['python', 'javascript', 'java', 'code', 'programming']):
            return self._create_programming_content(title, ts)
        elif any(word in title_lower for word in ['ai', 'machine learning', 'ml', 'data science', 'neural']):
            return self._create_ai_content(title, ts)
        elif any(word in title_lower for word in ['react', 'vue', 'angular', 'web', 'frontend']):
            return self._create_web_content(title, ts)
        else:
            return self._create_generic_content(title, ts)
    
    def _create_sql_content(self, title: str, ts: int) -> List[Dict]:
        """Create SQL-specific content"""
        return [
            {
                "id": f"text-{ts}-0",
                "type": "text",
                "position": 0,
                "data": {"content": f"{title} is an essential concept in database management. Understanding how to effectively use this helps you retrieve and manipulate data efficiently."}
            },
            {
                "id": f"heading-{ts}-1",
                "type": "heading",
                "position": 1,
                "data": {"content": "Key Concepts", "level": 2}
            },
            {
                "id": f"list-{ts}-2",
                "type": "list",
                "position": 2,
                "data": {
                    "items": [
                        "Combines data from multiple tables based on related columns",
                        "Improves query performance and data organization",
                        "Essential for relational database operations",
                        "Multiple types available for different use cases"
                    ],
                    "style": "bullet"
                }
            },
            {
                "id": f"heading-{ts}-3",
                "type": "heading",
                "position": 3,
                "data": {"content": "Common Types", "level": 2}
            },
            {
                "id": f"table-{ts}-4",
                "type": "table",
                "position": 4,
                "data": {
                    "rows": [
                        ["Type", "Description", "Use Case"],
                        ["INNER", "Returns matching rows from both tables", "Most common, finds exact matches"],
                        ["LEFT", "Returns all rows from left table", "Keep all records from main table"],
                        ["RIGHT", "Returns all rows from right table", "Keep all records from joined table"],
                        ["FULL", "Returns all rows from both tables", "Complete data from both sides"]
                    ],
                    "hasHeader": True
                }
            },
            {
                "id": f"heading-{ts}-5",
                "type": "heading",
                "position": 5,
                "data": {"content": "Best Practices", "level": 2}
            },
            {
                "id": f"text-{ts}-6",
                "type": "text",
                "position": 6,
                "data": {"content": "Always specify the join condition clearly, use table aliases for readability, and consider indexing columns used in join conditions for better performance."}
            }
        ]
    
    def _create_programming_content(self, title: str, ts: int) -> List[Dict]:
        """Create programming-specific content"""
        return [
            {
                "id": f"text-{ts}-0",
                "type": "text",
                "position": 0,
                "data": {"content": f"{title} is a fundamental concept in modern software development. Mastering this topic will significantly improve your coding skills and problem-solving abilities."}
            },
            {
                "id": f"heading-{ts}-1",
                "type": "heading",
                "position": 1,
                "data": {"content": "Overview", "level": 2}
            },
            {
                "id": f"text-{ts}-2",
                "type": "text",
                "position": 2,
                "data": {"content": "This concept helps developers write cleaner, more efficient code. It's widely used in production applications and is considered a best practice in the industry."}
            },
            {
                "id": f"heading-{ts}-3",
                "type": "heading",
                "position": 3,
                "data": {"content": "Key Features", "level": 2}
            },
            {
                "id": f"list-{ts}-4",
                "type": "list",
                "position": 4,
                "data": {
                    "items": [
                        "Improves code readability and maintainability",
                        "Reduces code duplication and errors",
                        "Enhances performance and scalability",
                        "Follows industry best practices"
                    ],
                    "style": "bullet"
                }
            },
            {
                "id": f"heading-{ts}-5",
                "type": "heading",
                "position": 5,
                "data": {"content": "Getting Started", "level": 2}
            },
            {
                "id": f"text-{ts}-6",
                "type": "text",
                "position": 6,
                "data": {"content": "Start by understanding the basic syntax and common use cases. Practice with small examples before applying to larger projects. Review documentation and community resources for advanced techniques."}
            },
            {
                "id": f"callout-{ts}-7",
                "type": "callout",
                "position": 7,
                "data": {"content": "Pro Tip: Always test your code thoroughly and follow coding standards for your language.", "type": "info"}
            }
        ]
    
    def _create_ai_content(self, title: str, ts: int) -> List[Dict]:
        """Create AI/ML-specific content"""
        return [
            {
                "id": f"text-{ts}-0",
                "type": "text",
                "position": 0,
                "data": {"content": f"{title} represents a cutting-edge area in artificial intelligence and machine learning. This technology is transforming industries and creating new possibilities for innovation."}
            },
            {
                "id": f"heading-{ts}-1",
                "type": "heading",
                "position": 1,
                "data": {"content": "Core Concepts", "level": 2}
            },
            {
                "id": f"list-{ts}-2",
                "type": "list",
                "position": 2,
                "data": {
                    "items": [
                        "Leverages advanced algorithms and computational power",
                        "Learns patterns from large datasets",
                        "Improves accuracy through training and optimization",
                        "Applicable across multiple domains and industries"
                    ],
                    "style": "bullet"
                }
            },
            {
                "id": f"heading-{ts}-3",
                "type": "heading",
                "position": 3,
                "data": {"content": "Applications", "level": 2}
            },
            {
                "id": f"text-{ts}-4",
                "type": "text",
                "position": 4,
                "data": {"content": "This technology is used in natural language processing, computer vision, predictive analytics, and autonomous systems. Companies worldwide are investing heavily in these capabilities."}
            },
            {
                "id": f"heading-{ts}-5",
                "type": "heading",
                "position": 5,
                "data": {"content": "Learning Path", "level": 2}
            },
            {
                "id": f"list-{ts}-6",
                "type": "list",
                "position": 6,
                "data": {
                    "items": [
                        "Master the mathematical foundations (linear algebra, calculus, statistics)",
                        "Learn programming languages like Python and relevant libraries",
                        "Study different model architectures and their use cases",
                        "Practice with real-world datasets and projects"
                    ],
                    "style": "numbered"
                }
            }
        ]
    
    def _create_web_content(self, title: str, ts: int) -> List[Dict]:
        """Create web development-specific content"""
        return [
            {
                "id": f"text-{ts}-0",
                "type": "text",
                "position": 0,
                "data": {"content": f"{title} is a powerful tool in modern web development. It enables developers to build fast, responsive, and user-friendly applications that work seamlessly across devices."}
            },
            {
                "id": f"heading-{ts}-1",
                "type": "heading",
                "position": 1,
                "data": {"content": "Why Use This?", "level": 2}
            },
            {
                "id": f"text-{ts}-2",
                "type": "text",
                "position": 2,
                "data": {"content": "This technology simplifies complex UI development, improves performance, and provides excellent developer experience. It's backed by a strong community and extensive ecosystem."}
            },
            {
                "id": f"heading-{ts}-3",
                "type": "heading",
                "position": 3,
                "data": {"content": "Key Benefits", "level": 2}
            },
            {
                "id": f"list-{ts}-4",
                "type": "list",
                "position": 4,
                "data": {
                    "items": [
                        "Component-based architecture for reusable code",
                        "Virtual DOM for optimal performance",
                        "Rich ecosystem of tools and libraries",
                        "Strong community support and documentation"
                    ],
                    "style": "bullet"
                }
            },
            {
                "id": f"heading-{ts}-5",
                "type": "heading",
                "position": 5,
                "data": {"content": "Getting Started", "level": 2}
            },
            {
                "id": f"text-{ts}-6",
                "type": "text",
                "position": 6,
                "data": {"content": "Begin with the official documentation and tutorials. Build small projects to understand core concepts. Gradually explore advanced features like state management, routing, and optimization techniques."}
            }
        ]
    
    def _create_generic_content(self, title: str, ts: int) -> List[Dict]:
        """Create generic professional content"""
        return [
            {
                "id": f"text-{ts}-0",
                "type": "text",
                "position": 0,
                "data": {"content": f"This page covers {title}, an important topic worth exploring in depth. Understanding this subject will enhance your knowledge and skills in this area."}
            },
            {
                "id": f"heading-{ts}-1",
                "type": "heading",
                "position": 1,
                "data": {"content": "Introduction", "level": 2}
            },
            {
                "id": f"text-{ts}-2",
                "type": "text",
                "position": 2,
                "data": {"content": "This topic encompasses several key concepts and practical applications. It's relevant across various contexts and provides valuable insights for both beginners and experienced practitioners."}
            },
            {
                "id": f"heading-{ts}-3",
                "type": "heading",
                "position": 3,
                "data": {"content": "Key Points", "level": 2}
            },
            {
                "id": f"list-{ts}-4",
                "type": "list",
                "position": 4,
                "data": {
                    "items": [
                        "Provides foundational knowledge in this area",
                        "Applicable to real-world scenarios and projects",
                        "Builds upon established principles and best practices",
                        "Continues to evolve with new developments"
                    ],
                    "style": "bullet"
                }
            },
            {
                "id": f"heading-{ts}-5",
                "type": "heading",
                "position": 5,
                "data": {"content": "Next Steps", "level": 2}
            },
            {
                "id": f"text-{ts}-6",
                "type": "text",
                "position": 6,
                "data": {"content": "Continue learning by exploring related topics, practicing with examples, and applying these concepts to your own projects. Stay updated with the latest developments and best practices in this field."}
            },
            {
                "id": f"callout-{ts}-7",
                "type": "callout",
                "position": 7,
                "data": {"content": "Remember: Consistent practice and application are key to mastering any new topic.", "type": "info"}
            }
        ]
    
    async def _create_task_with_type(
        self, title: str, event_type: str, user_id: str, workspace_id: str, goal: str
    ) -> Optional[Dict]:
        """Create a task with specific event type (task, milestone, event, birthday, reminder)"""
        try:
            from datetime import datetime, timedelta
            
            # Parse date from goal if mentioned
            due_date = self._extract_date_from_goal(goal)
            
            # Determine if this is an all-day event
            all_day = event_type in ["birthday", "milestone", "event"]
            
            # Check if user explicitly mentioned "all day"
            if "all day" in goal.lower() or "whole day" in goal.lower():
                all_day = True
            
            if not due_date:
                # Default dates based on type
                if event_type == "birthday":
                    # Birthday - set to start of day, all day event
                    due_date = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
                    all_day = True
                elif event_type == "reminder":
                    due_date = datetime.utcnow() + timedelta(hours=1)  # 1 hour from now
                    all_day = False
                elif event_type == "milestone":
                    due_date = datetime.utcnow().replace(hour=23, minute=59, second=59)  # End of day
                    all_day = True
                elif event_type == "event":
                    due_date = datetime.utcnow().replace(hour=0, minute=0, second=0)
                    all_day = True
                else:
                    due_date = datetime.utcnow() + timedelta(days=7)  # 1 week for tasks
                    all_day = False
            
            # For all-day events, set time to end of day so it shows until day is complete
            if all_day and isinstance(due_date, datetime):
                # Set end time to 23:59:59 so event shows all day
                end_date = due_date.replace(hour=23, minute=59, second=59)
            else:
                end_date = due_date
            
            task_data = {
                "user_id": user_id,
                "workspace_id": workspace_id,
                "title": title,
                "status": "todo",
                "priority": "high" if event_type in ["milestone", "birthday"] else "medium",
                "event_type": event_type,
                "due_date": end_date.isoformat() if isinstance(end_date, datetime) else end_date,
                "all_day": all_day
            }
            
            response = supabase_admin.table("tasks").insert(task_data).execute()
            
            if response.data:
                logger.info(f"✅ Created {event_type}: {title} (all_day={all_day})")
                return response.data[0]
            return None
        except Exception as e:
            logger.error(f"Failed to create {event_type}: {e}")
            return None
    
    def _extract_date_from_goal(self, goal: str) -> Optional[datetime]:
        """Extract date from goal text"""
        from datetime import datetime, timedelta
        import re
        
        goal_lower = goal.lower()
        now = datetime.utcnow()
        
        # Today/Tomorrow
        if "today" in goal_lower:
            return now.replace(hour=18, minute=0)
        if "tomorrow" in goal_lower:
            return (now + timedelta(days=1)).replace(hour=9, minute=0)
        
        # Next week/month
        if "next week" in goal_lower:
            return now + timedelta(weeks=1)
        if "next month" in goal_lower:
            return now + timedelta(days=30)
        
        # Specific day names
        days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
        for i, day in enumerate(days):
            if day in goal_lower:
                days_ahead = i - now.weekday()
                if days_ahead <= 0:
                    days_ahead += 7
                return (now + timedelta(days=days_ahead)).replace(hour=9, minute=0)
        
        # Try to parse date patterns like "Jan 15" or "15/01"
        date_patterns = [
            r'(\d{1,2})[/\-](\d{1,2})',  # 15/01 or 15-01
            r'(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+(\d{1,2})',  # Jan 15
        ]
        
        for pattern in date_patterns:
            match = re.search(pattern, goal_lower)
            if match:
                try:
                    # Simple parsing - could be enhanced
                    return now + timedelta(days=7)  # Default to 1 week if parsing fails
                except:
                    pass
        
        return None
    
    async def _generate_next_topic_title(
        self, parent_title: str, parent_content: str, existing_subpages: List[str], goal: str
    ) -> str:
        """Generate the NEXT logical topic title (like book chapters)"""
        
        # If user specified a title, use it
        extracted = self._extract_page_title(goal)
        if extracted and extracted.lower() not in parent_title.lower():
            return extracted
        
        llm = self._get_llm()
        
        existing_str = ", ".join(existing_subpages) if existing_subpages else "None yet"
        
        prompt = f"""You are creating a learning curriculum. Generate the NEXT topic title.

PARENT PAGE: {parent_title}
EXISTING SUBPAGES: {existing_str}
USER REQUEST: {goal}

Think like a textbook author. What comes NEXT in the learning sequence?

Examples:
- Parent: "Python Basics" → Next: "Variables and Data Types" → Then: "Control Flow" → Then: "Functions"
- Parent: "SQL Fundamentals" → Next: "SELECT Queries" → Then: "JOINs" → Then: "Aggregations"
- Parent: "Machine Learning" → Next: "Supervised Learning" → Then: "Neural Networks"

Return ONLY the next topic title (no explanation, no quotes):"""

        try:
            response = await asyncio.to_thread(
                lambda: llm.invoke([HumanMessage(content=prompt)])
            )
            title = response.content.strip().strip('"\'')
            if title and len(title) < 100:
                return title
        except Exception as e:
            logger.warning(f"Failed to generate next topic title: {e}")
        
        # Fallback: generate based on pattern
        if not existing_subpages:
            return f"{parent_title} - Part 1"
        else:
            return f"{parent_title} - Part {len(existing_subpages) + 1}"
    
    async def _generate_continuation_content(
        self, title: str, parent_page: Dict, existing_subpages: List[str], goal: str
    ) -> List[Dict]:
        """Generate content that CONTINUES from parent, not copies it"""
        import time
        ts = int(time.time() * 1000)
        
        llm = self._get_llm()
        
        parent_title = parent_page.get('title', 'Unknown') if parent_page else 'Unknown'
        parent_content = (parent_page.get('content') or '')[:500] if parent_page else ''
        existing_str = ", ".join(existing_subpages) if existing_subpages else "None"
        
        prompt = f"""Create content for: "{title}"

CONTEXT:
- This is a SUBPAGE under: "{parent_title}"
- Parent content preview: {parent_content[:300]}
- Existing subpages: {existing_str}

IMPORTANT:
- Do NOT repeat content from parent page
- This is the NEXT chapter/topic in the sequence
- Build upon what was covered before
- Introduce NEW concepts specific to "{title}"

Generate 5-10 blocks with FRESH, UNIQUE content:

[
  {{"type": "heading", "data": {{"content": "{title}", "level": 1}}}},
  {{"type": "text", "data": {{"content": "Introduction to this specific topic..."}}}},
  {{"type": "heading", "data": {{"content": "Key Concepts", "level": 2}}}},
  {{"type": "list", "data": {{"items": ["New concept 1", "New concept 2"], "style": "bullet"}}}},
  ...more blocks with NEW content...
]

Return ONLY the JSON array:"""

        try:
            response = await asyncio.to_thread(
                lambda: llm.invoke([HumanMessage(content=prompt)])
            )
            
            raw_blocks = self._parse_json_safely(response.content.strip())
            
            if raw_blocks:
                blocks = []
                for i, block in enumerate(raw_blocks):
                    block_type = block.get("type", "text")
                    block_data = block.get("data", {})
                    blocks.append({
                        "id": f"{block_type}-{ts}-{i}",
                        "type": block_type,
                        "position": i,
                        "data": self._normalize_block_data(block_type, block_data)
                    })
                logger.info(f"✅ Generated {len(blocks)} continuation blocks for '{title}'")
                return blocks
                
        except Exception as e:
            logger.warning(f"Continuation content generation failed: {e}")
        
        # Fallback
        return self._create_fallback_blocks(title)
    
    def _clean_json_string(self, content: str) -> str:
        """Clean common JSON issues from LLM output"""
        import json
        
        # First, try to parse as-is
        try:
            json.loads(content)
            return content
        except:
            pass
        
        # Remove markdown code blocks if present
        if "```" in content:
            # Extract content between code blocks
            parts = content.split("```")
            for part in parts:
                if part.strip().startswith('[') or part.strip().startswith('{'):
                    content = part.strip()
                    break
                elif part.strip().startswith('json'):
                    content = part.strip()[4:].strip()
                    break
        
        # Remove any text before the first [ or {
        first_bracket = min(
            content.find('[') if content.find('[') != -1 else len(content),
            content.find('{') if content.find('{') != -1 else len(content)
        )
        if first_bracket < len(content):
            content = content[first_bracket:]
        
        # Remove any text after the last ] or }
        last_bracket = max(content.rfind(']'), content.rfind('}'))
        if last_bracket != -1:
            content = content[:last_bracket + 1]
        
        # Fix common JSON issues
        # 1. Replace single quotes with double quotes (but not inside strings)
        content = re.sub(r"(?<![\\])\'", '"', content)
        
        # 2. Remove trailing commas before ] or }
        content = re.sub(r',\s*([}\]])', r'\1', content)
        
        # 3. Fix unescaped newlines in strings
        content = re.sub(r'(?<!\\)\n', ' ', content)
        
        # 4. Remove control characters
        content = re.sub(r'[\x00-\x1f\x7f-\x9f]', '', content)
        
        # 5. Fix double-escaped quotes
        content = content.replace('\\\\"', '\\"')
        
        # 6. Ensure proper escaping of backslashes
        # Only escape backslashes that aren't already part of valid escape sequences
        content = re.sub(r'\\(?!["\\/bfnrtu])', r'\\\\', content)
        
        # 7. Try to fix truncated JSON by adding missing brackets
        open_brackets = content.count('[') - content.count(']')
        open_braces = content.count('{') - content.count('}')
        
        if open_brackets > 0:
            content += ']' * open_brackets
        if open_braces > 0:
            content += '}' * open_braces
        
        return content.strip()
    
    def _parse_json_safely(self, content: str) -> Optional[List[Dict]]:
        """Parse JSON with multiple fallback strategies"""
        
        # Strategy 1: Try direct parse
        try:
            result = json.loads(content)
            if isinstance(result, list):
                return result
        except:
            pass
        
        # Strategy 2: Extract from markdown code blocks
        if "```" in content:
            try:
                if "```json" in content:
                    json_str = content.split("```json")[1].split("```")[0].strip()
                else:
                    json_str = content.split("```")[1].split("```")[0].strip()
                result = json.loads(json_str)
                if isinstance(result, list):
                    return result
            except:
                pass
        
        # Strategy 3: Find JSON array with regex
        try:
            json_match = re.search(r'\[[\s\S]*\]', content)
            if json_match:
                json_str = json_match.group(0)
                result = json.loads(json_str)
                if isinstance(result, list):
                    return result
        except:
            pass
        
        # Strategy 4: Clean and retry
        try:
            cleaned = self._clean_json_string(content)
            result = json.loads(cleaned)
            if isinstance(result, list):
                return result
        except:
            pass
        
        # Strategy 5: Try to extract individual JSON objects
        try:
            objects = []
            # Find all {...} patterns
            for match in re.finditer(r'\{[^{}]*\}', content):
                try:
                    obj = json.loads(match.group(0))
                    if "type" in obj:
                        objects.append(obj)
                except:
                    continue
            if objects:
                return objects
        except:
            pass
        
        # Strategy 6: Parse line by line for simple cases
        try:
            lines = content.split('\n')
            objects = []
            for line in lines:
                line = line.strip()
                if line.startswith('{') and line.endswith('}'):
                    try:
                        obj = json.loads(line)
                        if "type" in obj:
                            objects.append(obj)
                    except:
                        continue
            if objects:
                return objects
        except:
            pass
        
        logger.warning(f"All JSON parsing strategies failed for content: {content[:200]}...")
        return None
    
    async def _create_task_simple(
        self, title: str, user_id: str, workspace_id: str
    ) -> Optional[Dict]:
        """Create a task with minimal fields"""
        try:
            due_date = (datetime.utcnow() + timedelta(days=7)).isoformat()
            
            response = supabase_admin.table("tasks").insert({
                "user_id": user_id,
                "workspace_id": workspace_id,
                "title": title,
                "status": "todo",
                "priority": "medium",
                "event_type": "task",
                "due_date": due_date
            }).execute()
            
            if response.data:
                logger.info(f"✅ Created task: {title}")
                return response.data[0]
            return None
        except Exception as e:
            logger.error(f"Failed to create task: {e}")
            return None
    
    async def _analyze_and_decompose(
        self, goal: str, workspace_id: str, user_id: str
    ) -> Tuple[bool, List[Dict]]:
        """Analyze if goal is complex and decompose into subtasks"""
        
        # SKIP decomposition for most queries - just generate content directly
        # Only decompose for very complex multi-step goals
        goal_lower = goal.lower()
        
        # Simple queries that should NOT be decomposed
        simple_patterns = [
            "what is", "explain", "tell me", "describe", "write about",
            "create a", "make a", "generate", "list", "show me",
            "how to", "how do", "why", "when", "where", "who"
        ]
        
        if any(pattern in goal_lower for pattern in simple_patterns):
            return False, []
        
        # Only decompose for explicitly complex goals
        complex_indicators = [
            "step by step plan for",
            "complete project for",
            "full course on",
            "comprehensive guide to"
        ]
        
        is_complex = any(ind in goal_lower for ind in complex_indicators)
        
        if not is_complex:
            return False, []
        
        # For complex goals, try to decompose (but don't fail if it doesn't work)
        try:
            llm = self._get_llm()
            
            decompose_prompt = f"""Break this goal into 2-4 simple subtasks.

Goal: {goal}

Return JSON array:
[{{"step": 1, "task": "description"}}]

Only return the JSON array."""
            
            response = await asyncio.to_thread(
                lambda: llm.invoke([HumanMessage(content=decompose_prompt)])
            )
            
            content = response.content.strip()
            if "```" in content:
                content = re.search(r'\[.*\]', content, re.DOTALL)
                content = content.group(0) if content else "[]"
            
            subtasks = json.loads(content)
            return True, subtasks
        except Exception as e:
            logger.warning(f"Decomposition skipped: {e}")
            return False, []

    async def _execute_agent_loop(
        self,
        memory: AgentMemory,
        user_id: str,
        workspace_id: str,
        current_page_id: str,
        conversation_history: List[Dict]
    ) -> str:
        """Execute simplified content generation - skip complex reasoning"""
        
        # SIMPLIFIED: Just generate content directly without complex reasoning loop
        # This avoids the "Reasoning error" issues
        
        goal = memory.goal
        
        try:
            # Generate content directly
            blocks = await self._generate_content_blocks_simple(goal, "mixed")
            
            if blocks:
                memory.generated_blocks = blocks
                block_summary = self._summarize_blocks(blocks)
                return f"Generated content about: {goal[:50]}...\n\n{block_summary}"
            else:
                return f"I can help you with: {goal}. Please be more specific about what you'd like me to create."
                
        except Exception as e:
            logger.error(f"Content generation error: {e}")
            return f"I understand you want help with: {goal}. Let me provide some guidance."
    
    async def _reason_next_step(
        self,
        llm: ChatOpenAI,
        memory: AgentMemory,
        conversation_history: List[Dict]
    ) -> Tuple[str, AgentAction, Dict]:
        """Use LLM to reason about next step"""
        
        # Build context for reasoning
        context_summary = self._build_context_summary(memory)
        steps_summary = self._build_steps_summary(memory.steps)
        
        system_prompt = """You are an intelligent agent that helps users with their workspace.
You use a Thought-Action-Observation loop to accomplish goals.
You understand pages, subpages, blocks, skills, and tasks deeply.

Available Actions:
- THINK: Reason about the problem (input: {"reasoning": "your thoughts"})
- SEARCH_WORKSPACE: Search pages/skills/tasks (input: {"query": "search term"})
- READ_PAGE: Read full page with blocks (input: {"page_id": "id"})
- READ_SUBPAGES: Get all subpages of a page (input: {"page_id": "id"})
- ANALYZE_PAGE: Analyze page to suggest skills/tasks (input: {"page_id": "id"})
- CREATE_CONTENT: Generate content blocks (input: {"topic": "topic", "content_type": "text/table/list/code/heading/quote"})
- UPDATE_PAGE: Update page with blocks (input: {"page_id": "id", "blocks": [...], "mode": "append/replace/insert", "position": 0})
- CREATE_PAGE: Create new page (input: {"title": "title", "content": "content", "icon": "📄"})
- CREATE_SUBPAGE: Create subpage (input: {"title": "title", "parent_page_id": "id", "content": "content"})
- DELETE_CONTENT: Delete blocks (input: {"page_id": "id", "block_ids": ["id1", "id2"]})
- DELETE_PAGE: Delete a page (input: {"page_id": "id"})
- CREATE_SKILL: Create skill with full fields (input: {"name": "name", "level": "Beginner/Intermediate/Advanced/Expert", "skill_type": "learning/research/creation/analysis/practice", "description": "purpose", "goals": ["goal1"], "linked_page_id": "optional"})
- UPDATE_SKILL: Update skill (input: {"skill_id": "id", "level": "new_level", "description": "new_desc"})
- CREATE_TASK: Create task with full fields (input: {"title": "title", "priority": "low/medium/high", "event_type": "task/event/reminder/milestone", "description": "desc", "due_date": "ISO date", "linked_page_id": "optional", "linked_skill_id": "optional"})
- UPDATE_TASK: Update task (input: {"task_id": "id", "status": "todo/in-progress/done", "priority": "new"})
- LINK_PAGE_TO_SKILL: Link page as evidence (input: {"page_id": "id", "skill_id": "id"})
- LEARN: Store learning (input: {"topic": "topic", "insight": "what you learned"})
- ANSWER: Final answer (input: {"response": "final response to user"})

IMPORTANT RULES:
1. When user mentions "this page" or "current page", use the current_page_id from context
2. When creating skills/tasks from a page, ANALYZE the page title and content first
3. Generate skill names and task titles that RELATE to the page topic
4. For skills: use appropriate skill_type based on content (learning for tutorials, research for docs, etc.)
5. For tasks: set realistic due dates and link to relevant pages/skills
6. Always use ANALYZE_PAGE before creating related skills/tasks
7. End with ANSWER when goal is achieved

Respond in this exact format:
THOUGHT: [your reasoning]
ACTION: [action name]
INPUT: [JSON input for action]"""

        user_message = f"""Goal: {memory.goal}

Current Context:
{context_summary}

Previous Steps:
{steps_summary}

What should I do next?"""

        try:
            response = await asyncio.to_thread(
                lambda: llm.invoke([
                    SystemMessage(content=system_prompt),
                    HumanMessage(content=user_message)
                ])
            )
            
            # Parse response
            content = response.content
            thought = self._extract_field(content, "THOUGHT")
            action_str = self._extract_field(content, "ACTION")
            input_str = self._extract_field(content, "INPUT")
            
            # Map action string to enum
            action = self._parse_action(action_str)
            
            # Parse input JSON
            try:
                action_input = json.loads(input_str) if input_str else {}
            except:
                action_input = {"raw": input_str}
            
            return thought, action, action_input
            
        except Exception as e:
            logger.error(f"Reasoning error: {e}")
            return "Error in reasoning", AgentAction.ANSWER, {"response": "I encountered an error while reasoning."}
    
    def _extract_field(self, content: str, field: str) -> str:
        """Extract field value from response"""
        pattern = rf'{field}:\s*(.+?)(?=\n[A-Z]+:|$)'
        match = re.search(pattern, content, re.DOTALL | re.IGNORECASE)
        return match.group(1).strip() if match else ""
    
    def _parse_action(self, action_str: str) -> AgentAction:
        """Parse action string to enum"""
        action_map = {
            "think": AgentAction.THINK,
            "search_workspace": AgentAction.SEARCH_WORKSPACE,
            "search": AgentAction.SEARCH_WORKSPACE,
            "read_page": AgentAction.READ_PAGE,
            "read": AgentAction.READ_PAGE,
            "read_subpages": AgentAction.READ_SUBPAGES,
            "analyze_page": AgentAction.ANALYZE_PAGE,
            "analyze": AgentAction.ANALYZE_PAGE,
            "create_content": AgentAction.CREATE_CONTENT,
            "generate": AgentAction.CREATE_CONTENT,
            "update_page": AgentAction.UPDATE_PAGE,
            "update": AgentAction.UPDATE_PAGE,
            "create_page": AgentAction.CREATE_PAGE,
            "create_subpage": AgentAction.CREATE_SUBPAGE,
            "delete_page": AgentAction.DELETE_PAGE,
            "create_skill": AgentAction.CREATE_SKILL,
            "update_skill": AgentAction.UPDATE_SKILL,
            "create_task": AgentAction.CREATE_TASK,
            "update_task": AgentAction.UPDATE_TASK,
            "link_page_to_skill": AgentAction.LINK_PAGE_TO_SKILL,
            "learn": AgentAction.LEARN,
            "answer": AgentAction.ANSWER,
            "decompose": AgentAction.DECOMPOSE,
            "delete_content": AgentAction.DELETE_CONTENT,
        }
        return action_map.get(action_str.lower().strip(), AgentAction.ANSWER)

    async def _execute_action(
        self,
        action: AgentAction,
        action_input: Dict,
        memory: AgentMemory,
        user_id: str,
        workspace_id: str,
        current_page_id: str
    ) -> Tuple[str, bool, bool]:
        """
        Execute an action and return observation
        Returns: (observation, success, should_stop)
        """
        
        try:
            if action == AgentAction.THINK:
                return action_input.get("reasoning", "Thinking..."), True, False
            
            elif action == AgentAction.SEARCH_WORKSPACE:
                query = action_input.get("query", memory.goal)
                results = await self._search_workspace(query, workspace_id)
                return f"Found {len(results)} results: {json.dumps(results[:5], default=str)}", True, False
            
            elif action == AgentAction.READ_PAGE:
                page_id = action_input.get("page_id") or current_page_id
                if not page_id:
                    return "No page ID provided", False, False
                page = await self._get_page_with_details(page_id)
                if page:
                    memory.context["current_page"] = page
                    # Build detailed page summary
                    blocks = page.get("blocks") or []
                    block_types = {}
                    for b in blocks:
                        bt = b.get("type", "unknown")
                        block_types[bt] = block_types.get(bt, 0) + 1
                    
                    summary = f"Page '{page.get('title')}' (ID: {page.get('id')})\n"
                    summary += f"Icon: {page.get('icon', '📄')}\n"
                    summary += f"Blocks: {len(blocks)} total - {block_types}\n"
                    summary += f"Content preview: {(page.get('content') or '')[:300]}..."
                    if page.get("parent_page_id"):
                        summary += f"\nParent page: {page.get('parent_page_id')}"
                    return summary, True, False
                return "Page not found", False, False
            
            elif action == AgentAction.READ_SUBPAGES:
                page_id = action_input.get("page_id") or current_page_id
                if not page_id:
                    return "No page ID provided", False, False
                subpages = await self._get_subpages(page_id)
                if subpages:
                    summary = f"Found {len(subpages)} subpages:\n"
                    for sp in subpages:
                        summary += f"- {sp.get('title')} (ID: {sp.get('id')})\n"
                    return summary, True, False
                return "No subpages found", True, False
            
            elif action == AgentAction.ANALYZE_PAGE:
                page_id = action_input.get("page_id") or current_page_id
                if not page_id:
                    return "No page ID provided", False, False
                analysis = await self._analyze_page_for_skills_tasks(page_id, workspace_id)
                memory.page_analysis = analysis
                return f"Page Analysis:\n{json.dumps(analysis, indent=2)}", True, False
            
            elif action == AgentAction.CREATE_CONTENT:
                topic = action_input.get("topic", memory.goal)
                content_type = action_input.get("content_type", "text")
                blocks = await self._generate_content_blocks(topic, content_type, memory)
                memory.generated_blocks.extend(blocks)
                return f"Generated {len(blocks)} {content_type} block(s) about '{topic}'", True, False
            
            elif action == AgentAction.UPDATE_PAGE:
                page_id = action_input.get("page_id") or current_page_id
                blocks = action_input.get("blocks") or memory.generated_blocks
                mode = action_input.get("mode", "append")
                position = action_input.get("position", -1)
                
                if not page_id:
                    return "No page ID to update", False, False
                
                result = await self._update_page_blocks(page_id, blocks, mode, user_id, position)
                if result:
                    memory.modified_pages.append({"id": page_id, "action": "updated", "blocks_added": len(blocks)})
                    return f"Updated page with {len(blocks)} blocks (mode: {mode})", True, False
                return "Failed to update page", False, False
            
            elif action == AgentAction.CREATE_PAGE:
                title = action_input.get("title", f"New Page - {memory.goal[:30]}")
                content = action_input.get("content", "")
                blocks = action_input.get("blocks") or memory.generated_blocks
                icon = action_input.get("icon", "📄")
                
                page = await self._create_page(title, content, blocks, user_id, workspace_id, icon)
                if page:
                    memory.modified_pages.append({"id": page["id"], "title": title, "action": "created"})
                    return f"Created page '{title}' with ID {page['id']}", True, False
                return "Failed to create page", False, False
            
            elif action == AgentAction.CREATE_SUBPAGE:
                title = action_input.get("title", "New Subpage")
                parent_id = action_input.get("parent_page_id") or current_page_id
                content = action_input.get("content", "")
                blocks = action_input.get("blocks") or []
                
                if not parent_id:
                    return "No parent page ID provided", False, False
                
                page = await self._create_subpage(title, parent_id, content, blocks, user_id, workspace_id)
                if page:
                    memory.modified_pages.append({"id": page["id"], "title": title, "action": "created", "parent": parent_id})
                    return f"Created subpage '{title}' under parent {parent_id}", True, False
                return "Failed to create subpage", False, False
            
            elif action == AgentAction.DELETE_PAGE:
                page_id = action_input.get("page_id")
                if not page_id:
                    return "No page ID provided", False, False
                result = await self._delete_page(page_id, user_id)
                if result:
                    return f"Deleted page {page_id}", True, False
                return "Failed to delete page", False, False
            
            elif action == AgentAction.DELETE_CONTENT:
                page_id = action_input.get("page_id") or current_page_id
                block_ids = action_input.get("block_ids", [])
                
                if not page_id:
                    return "No page ID provided", False, False
                
                result = await self._delete_blocks(page_id, block_ids, user_id)
                return f"Deleted {len(block_ids)} blocks from page", result, False
            
            elif action == AgentAction.CREATE_SKILL:
                # Full skill creation with all form fields
                skill_data = await self._create_skill_from_context(action_input, memory, user_id, workspace_id)
                if skill_data:
                    memory.created_skills.append(skill_data)
                    return f"Created skill '{skill_data.get('name')}' at {skill_data.get('level')} level (type: {skill_data.get('skill_type', 'learning')})", True, False
                return "Failed to create skill", False, False
            
            elif action == AgentAction.UPDATE_SKILL:
                skill_id = action_input.get("skill_id")
                if not skill_id:
                    return "No skill ID provided", False, False
                result = await self._update_skill(skill_id, action_input, user_id)
                if result:
                    return f"Updated skill {skill_id}", True, False
                return "Failed to update skill", False, False
            
            elif action == AgentAction.CREATE_TASK:
                # Full task creation with all form fields
                task_data = await self._create_task_from_context(action_input, memory, user_id, workspace_id)
                if task_data:
                    memory.created_tasks.append(task_data)
                    return f"Created task '{task_data.get('title')}' with {task_data.get('priority')} priority", True, False
                return "Failed to create task", False, False
            
            elif action == AgentAction.UPDATE_TASK:
                task_id = action_input.get("task_id")
                if not task_id:
                    return "No task ID provided", False, False
                result = await self._update_task(task_id, action_input, user_id)
                if result:
                    return f"Updated task {task_id}", True, False
                return "Failed to update task", False, False
            
            elif action == AgentAction.LINK_PAGE_TO_SKILL:
                page_id = action_input.get("page_id") or current_page_id
                skill_id = action_input.get("skill_id")
                if not page_id or not skill_id:
                    return "Need both page_id and skill_id", False, False
                result = await self._link_page_to_skill(page_id, skill_id, user_id)
                if result:
                    return f"Linked page {page_id} to skill {skill_id} as evidence", True, False
                return "Failed to link page to skill", False, False
            
            elif action == AgentAction.LEARN:
                topic = action_input.get("topic", memory.goal)
                insight = action_input.get("insight", "")
                memory.learnings.append({"topic": topic, "insight": insight})
                return f"Learned about '{topic}': {insight}", True, False
            
            elif action == AgentAction.ANSWER:
                response = action_input.get("response", "Task completed.")
                return response, True, True  # should_stop = True
            
            else:
                return f"Unknown action: {action}", False, False
                
        except Exception as e:
            logger.error(f"Action execution error: {e}")
            return f"Error executing {action.value}: {str(e)}", False, False

    # ==================== Helper Methods ====================
    
    async def _gather_context(
        self, goal: str, user_id: str, workspace_id: str, 
        mentioned_items: List[Dict], current_page_id: str
    ) -> GatheredContext:
        """Gather context for the goal"""
        return await context_gatherer.gather_context(
            query=goal,
            user_id=user_id,
            workspace_id=workspace_id,
            mentioned_items=mentioned_items,
            topic=goal,
            limit_results=10
        )
    
    async def _get_page(self, page_id: str) -> Optional[Dict]:
        """Get page by ID"""
        if not page_id:
            return None
        try:
            response = supabase_admin.table("pages")\
                .select("*")\
                .eq("id", page_id)\
                .single()\
                .execute()
            return response.data
        except Exception as e:
            logger.error(f"Failed to get page: {e}")
            return None
    
    async def _get_page_with_details(self, page_id: str) -> Optional[Dict]:
        """Get page with full details including blocks analysis"""
        if not page_id:
            return None
        try:
            response = supabase_admin.table("pages")\
                .select("*")\
                .eq("id", page_id)\
                .single()\
                .execute()
            return response.data
        except Exception as e:
            logger.error(f"Failed to get page: {e}")
            return None
    
    async def _get_subpages(self, parent_page_id: str) -> List[Dict]:
        """Get all subpages of a parent page"""
        try:
            response = supabase_admin.table("pages")\
                .select("id, title, icon, page_order")\
                .eq("parent_page_id", parent_page_id)\
                .order("page_order")\
                .execute()
            return response.data or []
        except Exception as e:
            logger.error(f"Failed to get subpages: {e}")
            return []
    
    async def _analyze_page_for_skills_tasks(self, page_id: str, workspace_id: str) -> Dict:
        """Analyze a page to suggest relevant skills and tasks"""
        page = await self._get_page(page_id)
        if not page:
            return {"error": "Page not found"}
        
        title = page.get("title", "")
        content = page.get("content", "")
        blocks = page.get("blocks") or []
        
        # Extract key topics from title and content
        analysis = {
            "page_id": page_id,
            "page_title": title,
            "content_length": len(content),
            "blocks_count": len(blocks),
            "block_types": {},
            "suggested_skill": None,
            "suggested_tasks": [],
            "keywords": []
        }
        
        # Analyze block types
        for block in blocks:
            bt = block.get("type", "unknown")
            analysis["block_types"][bt] = analysis["block_types"].get(bt, 0) + 1
        
        # Determine skill type based on content
        content_lower = (title + " " + content).lower()
        
        if any(w in content_lower for w in ["tutorial", "learn", "guide", "introduction", "basics"]):
            skill_type = "learning"
        elif any(w in content_lower for w in ["research", "study", "analysis", "findings"]):
            skill_type = "research"
        elif any(w in content_lower for w in ["create", "build", "design", "develop"]):
            skill_type = "creation"
        elif any(w in content_lower for w in ["analyze", "data", "metrics", "statistics"]):
            skill_type = "analysis"
        else:
            skill_type = "practice"
        
        # Suggest skill based on page title
        analysis["suggested_skill"] = {
            "name": title,
            "skill_type": skill_type,
            "level": "Beginner",
            "description": f"Learn and master {title}"
        }
        
        # Suggest tasks
        analysis["suggested_tasks"] = [
            {
                "title": f"Study {title}",
                "priority": "medium",
                "event_type": "task",
                "description": f"Complete studying the {title} page"
            },
            {
                "title": f"Practice {title}",
                "priority": "medium",
                "event_type": "task",
                "description": f"Apply knowledge from {title}"
            }
        ]
        
        # Extract keywords from title
        stop_words = {"the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with", "by"}
        words = re.findall(r'\b\w+\b', title.lower())
        analysis["keywords"] = [w for w in words if w not in stop_words and len(w) > 2]
        
        return analysis
    
    async def _search_workspace(self, query: str, workspace_id: str) -> List[Dict]:
        """Search workspace for relevant content"""
        results = []
        
        # Search pages
        try:
            pages = supabase_admin.table("pages")\
                .select("id, title, icon")\
                .eq("workspace_id", workspace_id)\
                .ilike("title", f"%{query}%")\
                .limit(5)\
                .execute()
            results.extend([{"type": "page", **p} for p in (pages.data or [])])
        except:
            pass
        
        # Search skills
        try:
            skills = supabase_admin.table("skills")\
                .select("id, name, level")\
                .eq("workspace_id", workspace_id)\
                .ilike("name", f"%{query}%")\
                .limit(3)\
                .execute()
            results.extend([{"type": "skill", **s} for s in (skills.data or [])])
        except:
            pass
        
        # Search tasks
        try:
            tasks = supabase_admin.table("tasks")\
                .select("id, title, status")\
                .eq("workspace_id", workspace_id)\
                .ilike("title", f"%{query}%")\
                .limit(3)\
                .execute()
            results.extend([{"type": "task", **t} for t in (tasks.data or [])])
        except:
            pass
        
        return results
    
    async def _generate_content_blocks(
        self, topic: str, content_type: str, memory: AgentMemory
    ) -> List[Dict]:
        """Generate rich, structured content blocks using LLM"""
        import time
        
        llm = self._get_llm()
        
        # Get page context for better generation
        page_context = ""
        if memory.context.get("current_page"):
            page = memory.context["current_page"]
            page_context = f"""
Page Title: {page.get('title', '')}
Page Content Preview: {(page.get('content') or '')[:500]}
Existing Blocks: {len(page.get('blocks') or [])}
"""
        
        # Rich block generation prompt
        prompt = f"""Generate comprehensive, well-structured content about: {topic}

{page_context}

IMPORTANT: Generate content using MULTIPLE block types for rich formatting.

Available block types you MUST use appropriately:
1. heading - For section titles (use level 1, 2, or 3)
2. text - For paragraphs
3. list - For bullet points or numbered lists
4. table - For structured data with rows and columns
5. code - For code snippets with language specification
6. quote - For important quotes or callouts
7. callout - For tips, warnings, or important notes (types: info, warning, success, error)
8. divider - To separate sections
9. toggle - For collapsible content
10. checklist - For todo items

OUTPUT FORMAT - Return a JSON array of blocks:
[
  {{"type": "heading", "data": {{"content": "Main Title", "level": 1}}}},
  {{"type": "text", "data": {{"content": "Introduction paragraph..."}}}},
  {{"type": "callout", "data": {{"content": "Important note here", "type": "info"}}}},
  {{"type": "heading", "data": {{"content": "Key Points", "level": 2}}}},
  {{"type": "list", "data": {{"items": ["Point 1", "Point 2", "Point 3"], "style": "bullet"}}}},
  {{"type": "table", "data": {{"rows": [["Header1", "Header2"], ["Data1", "Data2"]], "hasHeader": true}}}},
  {{"type": "code", "data": {{"code": "code here", "language": "python"}}}},
  {{"type": "quote", "data": {{"content": "Important quote", "author": "Source"}}}},
  {{"type": "divider", "data": {{}}}},
  {{"type": "checklist", "data": {{"items": [{{"text": "Task 1", "checked": false}}]}}}}
]

RULES:
1. Start with a heading (level 1 or 2)
2. Use at least 3-5 different block types
3. Include a callout for important information
4. Use tables for any comparative or structured data
5. Use code blocks for any technical content
6. Use lists for enumerable items
7. Make content comprehensive and useful
8. Generate 5-15 blocks minimum

Return ONLY the JSON array, no other text."""

        try:
            response = await asyncio.to_thread(
                lambda: llm.invoke([HumanMessage(content=prompt)])
            )
            content = response.content.strip()
            
            # Extract JSON from response
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            elif "```" in content:
                content = content.split("```")[1].split("```")[0].strip()
            
            # Try to find JSON array
            json_match = re.search(r'\[[\s\S]*\]', content)
            if json_match:
                content = json_match.group(0)
            
            # Parse JSON
            raw_blocks = json.loads(content)
            
            # Convert to proper block format with IDs and positions
            blocks = []
            for i, block in enumerate(raw_blocks):
                block_type = block.get("type", "text")
                block_data = block.get("data", {})
                
                # Generate unique ID
                block_id = f"{block_type}-{int(time.time() * 1000)}-{i}"
                
                # Normalize block data based on type
                normalized_block = {
                    "id": block_id,
                    "type": block_type,
                    "position": i,
                    "data": self._normalize_block_data(block_type, block_data)
                }
                blocks.append(normalized_block)
            
            logger.info(f"✅ Generated {len(blocks)} rich blocks for '{topic}'")
            return blocks
            
        except json.JSONDecodeError as e:
            logger.warning(f"JSON parse error, falling back to text parsing: {e}")
            # Fallback to parsing as markdown
            return self._parse_markdown_to_blocks(response.content if 'response' in dir() else topic)
        except Exception as e:
            logger.error(f"Content generation error: {e}")
            # Return a basic structure
            return self._generate_fallback_blocks(topic)
    
    def _normalize_block_data(self, block_type: str, data: Dict) -> Dict:
        """Normalize block data to match expected format"""
        import time
        
        if block_type == "heading":
            return {
                "content": data.get("content", ""),
                "level": min(max(data.get("level", 2), 1), 3)
            }
        elif block_type == "text":
            return {"content": data.get("content", "")}
        elif block_type == "list":
            items = data.get("items", [])
            # Convert to proper format with id, text, checked
            normalized_items = []
            for i, item in enumerate(items):
                item_id = f"item-{int(time.time() * 1000)}-{i}"
                if isinstance(item, str):
                    normalized_items.append({"id": item_id, "text": item, "checked": False})
                elif isinstance(item, dict):
                    normalized_items.append({
                        "id": item.get("id", item_id),
                        "text": item.get("text", str(item)),
                        "checked": item.get("checked", False)
                    })
            return {
                "items": normalized_items,
                "listType": data.get("style", data.get("listType", "bullet"))
            }
        elif block_type == "table":
            return {
                "rows": data.get("rows", []),
                "hasHeader": data.get("hasHeader", True)
            }
        elif block_type == "code":
            return {
                "code": data.get("code", data.get("content", "")),  # Support both 'code' and 'content'
                "language": data.get("language", "text")
            }
        elif block_type == "quote":
            return {
                "content": data.get("content", ""),
                "author": data.get("author", "")
            }
        elif block_type == "callout":
            return {
                "content": data.get("content", ""),
                "type": data.get("type", "info")  # info, warning, success, error
            }
        elif block_type == "divider":
            return {}
        elif block_type == "toggle":
            return {
                "title": data.get("title", "Toggle"),
                "content": data.get("content", "")
            }
        elif block_type == "checklist":
            items = data.get("items", [])
            normalized_items = []
            for i, item in enumerate(items):
                item_id = f"check-{int(time.time() * 1000)}-{i}"
                if isinstance(item, str):
                    normalized_items.append({"id": item_id, "text": item, "checked": False})
                elif isinstance(item, dict):
                    normalized_items.append({
                        "id": item.get("id", item_id),
                        "text": item.get("text", ""),
                        "checked": item.get("checked", False)
                    })
            return {"items": normalized_items}
        elif block_type == "image":
            return {
                "url": data.get("url", ""),
                "caption": data.get("caption", ""),
                "width": data.get("width", "100%")
            }
        else:
            return data
    
    def _generate_fallback_blocks(self, topic: str) -> List[Dict]:
        """Generate fallback blocks when LLM fails"""
        import time
        ts = int(time.time() * 1000)
        return [
            {
                "id": f"heading-{ts}-0",
                "type": "heading",
                "position": 0,
                "data": {"content": topic, "level": 1}
            },
            {
                "id": f"callout-{ts}-1",
                "type": "callout",
                "position": 1,
                "data": {"content": "Content is being generated...", "type": "info"}
            },
            {
                "id": f"text-{ts}-2",
                "type": "text",
                "position": 2,
                "data": {"content": f"This section covers {topic}. Add more content as needed."}
            }
        ]
    
    def _parse_markdown_to_blocks(self, content: str) -> List[Dict]:
        """Parse markdown content into rich blocks"""
        import time
        blocks = []
        position = 0
        ts = int(time.time() * 1000)
        
        lines = content.strip().split('\n')
        i = 0
        
        while i < len(lines):
            line = lines[i].strip()
            
            if not line:
                i += 1
                continue
            
            # Code block
            if line.startswith('```'):
                language = line[3:].strip() or "text"
                code_lines = []
                i += 1
                while i < len(lines) and not lines[i].strip().startswith('```'):
                    code_lines.append(lines[i])
                    i += 1
                blocks.append({
                    "id": f"code-{ts}-{position}",
                    "type": "code",
                    "position": position,
                    "data": {"code": '\n'.join(code_lines), "language": language}  # Changed from "content" to "code"
                })
                position += 1
                i += 1
                continue
            
            # Heading
            if line.startswith('#'):
                level = len(re.match(r'^#+', line).group())
                blocks.append({
                    "id": f"heading-{ts}-{position}",
                    "type": "heading",
                    "position": position,
                    "data": {"content": line.lstrip('#').strip(), "level": min(level, 3)}
                })
                position += 1
                i += 1
                continue
            
            # Table
            if line.startswith('|') and '|' in line[1:]:
                rows = []
                while i < len(lines) and lines[i].strip().startswith('|'):
                    row_line = lines[i].strip()
                    # Skip separator rows
                    if not re.match(r'^\|[\s\-:|]+\|$', row_line):
                        cells = [c.strip() for c in row_line.split('|') if c.strip()]
                        if cells:
                            rows.append(cells)
                    i += 1
                if rows:
                    blocks.append({
                        "id": f"table-{ts}-{position}",
                        "type": "table",
                        "position": position,
                        "data": {"rows": rows, "hasHeader": True}
                    })
                    position += 1
                continue
            
            # Bullet list
            if line.startswith('- ') or line.startswith('* '):
                items = []
                while i < len(lines) and (lines[i].strip().startswith('- ') or lines[i].strip().startswith('* ')):
                    items.append(lines[i].strip()[2:])
                    i += 1
                blocks.append({
                    "id": f"list-{ts}-{position}",
                    "type": "list",
                    "position": position,
                    "data": {"items": items, "style": "bullet"}
                })
                position += 1
                continue
            
            # Numbered list
            if re.match(r'^\d+\.\s', line):
                items = []
                while i < len(lines) and re.match(r'^\d+\.\s', lines[i].strip()):
                    items.append(re.sub(r'^\d+\.\s', '', lines[i].strip()))
                    i += 1
                blocks.append({
                    "id": f"list-{ts}-{position}",
                    "type": "list",
                    "position": position,
                    "data": {"items": items, "style": "numbered"}
                })
                position += 1
                continue
            
            # Blockquote
            if line.startswith('>'):
                quote_lines = []
                while i < len(lines) and lines[i].strip().startswith('>'):
                    quote_lines.append(lines[i].strip()[1:].strip())
                    i += 1
                blocks.append({
                    "id": f"quote-{ts}-{position}",
                    "type": "quote",
                    "position": position,
                    "data": {"content": ' '.join(quote_lines)}
                })
                position += 1
                continue
            
            # Regular text
            blocks.append({
                "id": f"text-{ts}-{position}",
                "type": "text",
                "position": position,
                "data": {"content": line}
            })
            position += 1
            i += 1
        
        return blocks if blocks else self._generate_fallback_blocks("Content")

    async def _update_page_blocks(
        self, page_id: str, blocks: List[Dict], mode: str, user_id: str, position: int = -1
    ) -> bool:
        """Update page with new blocks - supports append, replace, and insert modes"""
        try:
            # Get current page
            page = await self._get_page(page_id)
            if not page:
                return False
            
            current_blocks = page.get("blocks") or []
            
            if mode == "replace":
                new_blocks = blocks
            elif mode == "insert" and position >= 0:
                # Insert at specific position
                new_blocks = current_blocks[:position] + blocks + current_blocks[position:]
            else:  # append
                new_blocks = current_blocks + blocks
            
            # Renumber all positions
            for i, block in enumerate(new_blocks):
                block["position"] = i
            
            # Update page
            supabase_admin.table("pages")\
                .update({"blocks": new_blocks, "updated_at": datetime.utcnow().isoformat()})\
                .eq("id", page_id)\
                .execute()
            
            logger.info(f"✅ Updated page {page_id} with {len(blocks)} blocks (mode: {mode})")
            return True
            
        except Exception as e:
            logger.error(f"Failed to update page: {e}")
            return False
    
    async def _create_page(
        self, title: str, content: str, blocks: List[Dict], 
        user_id: str, workspace_id: str, icon: str = "📄"
    ) -> Optional[Dict]:
        """Create a new page"""
        try:
            # Ensure blocks is a valid list
            if not blocks:
                blocks = self._create_fallback_blocks(title)
            
            logger.info(f"📝 Creating page '{title}' with {len(blocks)} blocks")
            
            response = supabase_admin.table("pages").insert({
                "user_id": user_id,
                "workspace_id": workspace_id,
                "title": title,
                "content": content,
                "blocks": blocks,
                "icon": icon
            }).execute()
            
            if response.data:
                logger.info(f"✅ Created page: {title} (ID: {response.data[0].get('id')})")
                return response.data[0]
            return None
        except Exception as e:
            logger.error(f"Failed to create page: {e}")
            return None
    
    async def _create_subpage(
        self, title: str, parent_page_id: str, content: str, blocks: List[Dict],
        user_id: str, workspace_id: str
    ) -> Optional[Dict]:
        """Create a subpage under a parent page"""
        try:
            # Get page order for new subpage
            existing_subpages = await self._get_subpages(parent_page_id)
            page_order = len(existing_subpages)
            
            response = supabase_admin.table("pages").insert({
                "user_id": user_id,
                "workspace_id": workspace_id,
                "parent_page_id": parent_page_id,
                "page_order": page_order,
                "title": title,
                "content": content,
                "blocks": blocks,
                "icon": "📖"
            }).execute()
            
            if response.data:
                logger.info(f"✅ Created subpage: {title} under {parent_page_id}")
                return response.data[0]
            return None
        except Exception as e:
            logger.error(f"Failed to create subpage: {e}")
            return None
    
    async def _delete_page(self, page_id: str, user_id: str) -> bool:
        """Soft delete a page (move to trash) instead of permanent deletion"""
        try:
            # Soft delete: Set deleted_at timestamp
            supabase_admin.table("pages")\
                .update({
                    "deleted_at": datetime.utcnow().isoformat(),
                    "deleted_by": user_id
                })\
                .eq("id", page_id)\
                .execute()
            
            # Also soft delete subpages
            supabase_admin.table("pages")\
                .update({
                    "deleted_at": datetime.utcnow().isoformat(),
                    "deleted_by": user_id
                })\
                .eq("parent_page_id", page_id)\
                .execute()
            
            logger.info(f"✅ Moved page to trash: {page_id}")
            return True
        except Exception as e:
            logger.error(f"Failed to delete page: {e}")
            return False
    
    async def _delete_blocks(
        self, page_id: str, block_ids: List[str], user_id: str
    ) -> bool:
        """Delete specific blocks from a page"""
        try:
            page = await self._get_page(page_id)
            if not page:
                return False
            
            current_blocks = page.get("blocks") or []
            
            if block_ids:
                # Delete specific blocks
                new_blocks = [b for b in current_blocks if b.get("id") not in block_ids]
            else:
                # Clear all blocks
                new_blocks = []
            
            # Renumber positions
            for i, block in enumerate(new_blocks):
                block["position"] = i
            
            supabase_admin.table("pages")\
                .update({"blocks": new_blocks})\
                .eq("id", page_id)\
                .execute()
            
            return True
        except Exception as e:
            logger.error(f"Failed to delete blocks: {e}")
            return False
    
    async def _create_skill(
        self, name: str, level: str, user_id: str, workspace_id: str
    ) -> Optional[Dict]:
        """Create a new skill - basic version"""
        try:
            response = supabase_admin.table("skills").insert({
                "user_id": user_id,
                "workspace_id": workspace_id,
                "name": name,
                "level": level,
                "description": f"Skill in {name}"
            }).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            logger.error(f"Failed to create skill: {e}")
            return None
    
    async def _create_skill_from_context(
        self, action_input: Dict, memory: AgentMemory, user_id: str, workspace_id: str
    ) -> Optional[Dict]:
        """Create a skill with full form fields based on context"""
        try:
            # Get skill data from input or analyze from page
            name = action_input.get("name")
            
            # If no name provided, try to get from page analysis
            if not name and memory.page_analysis:
                suggested = memory.page_analysis.get("suggested_skill", {})
                name = suggested.get("name", "New Skill")
            elif not name and memory.context.get("current_page"):
                name = memory.context["current_page"].get("title", "New Skill")
            else:
                name = name or "New Skill"
            
            # Determine skill type - MUST be lowercase
            skill_type = action_input.get("skill_type")
            if not skill_type and memory.page_analysis:
                skill_type = memory.page_analysis.get("suggested_skill", {}).get("skill_type", "learning")
            skill_type = (skill_type or "learning").lower()  # ✅ Force lowercase
            
            # Validate skill_type
            valid_types = ["learning", "research", "creation", "analysis", "practice"]
            if skill_type not in valid_types:
                skill_type = "learning"  # Default to learning if invalid
            
            # Build skill data with all form fields
            skill_data = {
                "user_id": user_id,
                "workspace_id": workspace_id,
                "name": name,
                "level": action_input.get("level", "Beginner"),
                "skill_type": skill_type,  # ✅ Now guaranteed to be valid
                "description": action_input.get("description", f"Learn and master {name}"),
                "goals": action_input.get("goals", []),
                "evidence": action_input.get("keywords", []),
            }
            
            # Check for duplicates
            existing = supabase_admin.table("skills")\
                .select("id, name")\
                .eq("workspace_id", workspace_id)\
                .ilike("name", f"%{name}%")\
                .limit(1)\
                .execute()
            
            if existing.data:
                logger.info(f"Skill '{name}' already exists, skipping")
                return {"id": existing.data[0]["id"], "name": name, "skipped": True}
            
            response = supabase_admin.table("skills").insert(skill_data).execute()
            
            if response.data:
                skill = response.data[0]
                logger.info(f"✅ Created skill: {name} (type: {skill_type})")
                
                # Link to page if provided
                linked_page_id = action_input.get("linked_page_id")
                if linked_page_id:
                    await self._link_page_to_skill(linked_page_id, skill["id"], user_id)
                
                return {
                    "id": skill["id"],
                    "name": name,
                    "level": skill_data["level"],
                    "skill_type": skill_type,
                    "description": skill_data["description"]
                }
            return None
        except Exception as e:
            logger.error(f"Failed to create skill: {e}")
            return None
    
    async def _update_skill(self, skill_id: str, updates: Dict, user_id: str) -> bool:
        """Update an existing skill"""
        try:
            # Validate skill_id
            if not skill_id or skill_id == "no skill ID provided":
                logger.error("Invalid skill_id provided for update")
                return False
            
            update_data = {}
            if "level" in updates:
                update_data["level"] = updates["level"]
            if "description" in updates:
                update_data["description"] = updates["description"]
            if "skill_type" in updates:
                # Validate and lowercase skill_type
                skill_type = updates["skill_type"].lower()
                valid_types = ["learning", "research", "creation", "analysis", "practice"]
                if skill_type in valid_types:
                    update_data["skill_type"] = skill_type
            if "goals" in updates:
                update_data["goals"] = updates["goals"]
            
            if not update_data:
                return False
            
            update_data["updated_at"] = datetime.utcnow().isoformat()
            
            supabase_admin.table("skills")\
                .update(update_data)\
                .eq("id", skill_id)\
                .execute()
            
            logger.info(f"✅ Updated skill: {skill_id}")
            return True
        except Exception as e:
            logger.error(f"Failed to update skill: {e}")
            return False
    
    async def _create_task_from_context(
        self, action_input: Dict, memory: AgentMemory, user_id: str, workspace_id: str
    ) -> Optional[Dict]:
        """Create a task with full form fields based on context"""
        try:
            # Get task title from input or generate from page
            title = action_input.get("title")
            
            if not title and memory.page_analysis:
                suggested_tasks = memory.page_analysis.get("suggested_tasks", [])
                if suggested_tasks:
                    title = suggested_tasks[0].get("title", f"Task: {memory.goal[:30]}")
            elif not title and memory.context.get("current_page"):
                page_title = memory.context["current_page"].get("title", "")
                title = f"Study {page_title}" if page_title else f"Task: {memory.goal[:30]}"
            else:
                title = title or f"Task: {memory.goal[:30]}"
            
            # Build task data with all form fields
            task_data = {
                "user_id": user_id,
                "workspace_id": workspace_id,
                "title": title,
                "description": action_input.get("description", ""),
                "status": action_input.get("status", "todo"),
                "priority": action_input.get("priority", "medium"),
                "event_type": action_input.get("event_type", "task"),
            }
            
            # Set due date if provided or default to 7 days from now
            if action_input.get("due_date"):
                task_data["due_date"] = action_input["due_date"]
            else:
                # Default due date: 7 days from now
                due_date = datetime.utcnow() + timedelta(days=7)
                task_data["due_date"] = due_date.isoformat()
            
            # Link to page if provided or use current page
            linked_page_id = action_input.get("linked_page_id")
            if not linked_page_id and memory.context.get("current_page"):
                linked_page_id = memory.context["current_page"].get("id")
            if linked_page_id:
                task_data["linked_page_id"] = linked_page_id
            
            # Link to skill if provided
            if action_input.get("linked_skill_id"):
                task_data["linked_skill_id"] = action_input["linked_skill_id"]
            
            # Check for duplicates
            existing = supabase_admin.table("tasks")\
                .select("id, title")\
                .eq("workspace_id", workspace_id)\
                .ilike("title", f"%{title}%")\
                .limit(1)\
                .execute()
            
            if existing.data:
                logger.info(f"Task '{title}' already exists, skipping")
                return {"id": existing.data[0]["id"], "title": title, "skipped": True}
            
            response = supabase_admin.table("tasks").insert(task_data).execute()
            
            if response.data:
                task = response.data[0]
                logger.info(f"✅ Created task: {title}")
                return {
                    "id": task["id"],
                    "title": title,
                    "priority": task_data["priority"],
                    "event_type": task_data["event_type"],
                    "due_date": task_data.get("due_date")
                }
            return None
        except Exception as e:
            logger.error(f"Failed to create task: {e}")
            return None
    
    async def _update_task(self, task_id: str, updates: Dict, user_id: str) -> bool:
        """Update an existing task"""
        try:
            update_data = {}
            if "status" in updates:
                update_data["status"] = updates["status"]
            if "priority" in updates:
                update_data["priority"] = updates["priority"]
            if "title" in updates:
                update_data["title"] = updates["title"]
            if "description" in updates:
                update_data["description"] = updates["description"]
            if "due_date" in updates:
                update_data["due_date"] = updates["due_date"]
            
            if not update_data:
                return False
            
            update_data["updated_at"] = datetime.utcnow().isoformat()
            
            supabase_admin.table("tasks")\
                .update(update_data)\
                .eq("id", task_id)\
                .execute()
            
            logger.info(f"✅ Updated task: {task_id}")
            return True
        except Exception as e:
            logger.error(f"Failed to update task: {e}")
            return False
    
    async def _link_page_to_skill(self, page_id: str, skill_id: str, user_id: str) -> bool:
        """Link a page to a skill as evidence"""
        try:
            # Get current skill evidence
            skill = supabase_admin.table("skills")\
                .select("evidence")\
                .eq("id", skill_id)\
                .single()\
                .execute()
            
            if not skill.data:
                return False
            
            evidence = skill.data.get("evidence") or []
            
            # Add page_id to evidence if not already there
            evidence_entry = f"page:{page_id}"
            if evidence_entry not in evidence:
                evidence.append(evidence_entry)
                
                supabase_admin.table("skills")\
                    .update({"evidence": evidence})\
                    .eq("id", skill_id)\
                    .execute()
                
                logger.info(f"✅ Linked page {page_id} to skill {skill_id}")
            
            # Also create a graph edge
            try:
                supabase_admin.table("graph_edges").insert({
                    "user_id": user_id,
                    "source_id": page_id,
                    "source_type": "page",
                    "target_id": skill_id,
                    "target_type": "skill",
                    "edge_type": "explicit"
                }).execute()
            except:
                pass  # Edge might already exist
            
            return True
        except Exception as e:
            logger.error(f"Failed to link page to skill: {e}")
            return False
    
    async def _get_user_learnings(self, user_id: str, workspace_id: str) -> List[Dict]:
        """Get user's learning history for context"""
        try:
            response = supabase_admin.table("learning_memory")\
                .select("topic, confidence, interaction_count, last_interaction_type")\
                .eq("user_id", user_id)\
                .eq("workspace_id", workspace_id)\
                .order("interaction_count", desc=True)\
                .limit(10)\
                .execute()
            return response.data or []
        except:
            return []
    
    async def _store_learnings(
        self, memory: AgentMemory, user_id: str, workspace_id: str
    ):
        """Store learnings from this session for future improvement"""
        try:
            for learning in memory.learnings:
                topic = learning.get("topic", "")
                if not topic:
                    continue
                
                # Check if exists
                existing = supabase_admin.table("learning_memory")\
                    .select("id, interaction_count")\
                    .eq("user_id", user_id)\
                    .eq("workspace_id", workspace_id)\
                    .eq("topic", topic)\
                    .limit(1)\
                    .execute()
                
                if existing.data:
                    # Update
                    supabase_admin.table("learning_memory")\
                        .update({
                            "interaction_count": existing.data[0]["interaction_count"] + 1,
                            "last_reviewed": datetime.utcnow().isoformat(),
                            "last_interaction_type": "agent_learning"
                        })\
                        .eq("id", existing.data[0]["id"])\
                        .execute()
                else:
                    # Create
                    supabase_admin.table("learning_memory")\
                        .insert({
                            "user_id": user_id,
                            "workspace_id": workspace_id,
                            "topic": topic,
                            "confidence": 0.6,
                            "interaction_count": 1,
                            "last_reviewed": datetime.utcnow().isoformat(),
                            "last_interaction_type": "agent_learning"
                        })\
                        .execute()
        except Exception as e:
            logger.warning(f"Failed to store learnings: {e}")

    def _build_context_summary(self, memory: AgentMemory) -> str:
        """Build context summary for reasoning"""
        parts = []
        
        if memory.context.get("current_page"):
            page = memory.context["current_page"]
            parts.append(f"Current Page: '{page.get('title')}' (ID: {page.get('id')})")
            blocks = page.get("blocks") or []
            parts.append(f"  - Has {len(blocks)} blocks")
            if page.get("parent_page_id"):
                parts.append(f"  - Is a subpage of: {page.get('parent_page_id')}")
            content_preview = (page.get("content") or "")[:200]
            if content_preview:
                parts.append(f"  - Content: {content_preview}...")
        
        if memory.page_analysis:
            parts.append(f"Page Analysis Available: {memory.page_analysis.get('page_title')}")
            if memory.page_analysis.get("suggested_skill"):
                parts.append(f"  - Suggested skill: {memory.page_analysis['suggested_skill'].get('name')}")
        
        if memory.context.get("pages"):
            parts.append(f"Related Pages: {len(memory.context['pages'])} found")
            for p in memory.context["pages"][:3]:
                parts.append(f"  - {p.get('title', 'Untitled')}")
        
        if memory.context.get("skills"):
            parts.append(f"Related Skills: {len(memory.context['skills'])} found")
            for s in memory.context["skills"][:3]:
                parts.append(f"  - {s.get('name', 'Unnamed')} ({s.get('level', 'Beginner')})")
        
        if memory.context.get("tasks"):
            parts.append(f"Related Tasks: {len(memory.context['tasks'])} found")
        
        if memory.context.get("learnings"):
            topics = [l.get("topic") for l in memory.context["learnings"][:3]]
            parts.append(f"User's Learning History: {', '.join(topics)}")
        
        if memory.generated_blocks:
            parts.append(f"Generated Blocks: {len(memory.generated_blocks)} ready to insert")
        
        if memory.modified_pages:
            parts.append(f"Modified Pages: {len(memory.modified_pages)}")
        
        if memory.created_skills:
            parts.append(f"Created Skills: {len(memory.created_skills)}")
        
        if memory.created_tasks:
            parts.append(f"Created Tasks: {len(memory.created_tasks)}")
        
        return "\n".join(parts) if parts else "No context gathered yet."
    
    def _build_steps_summary(self, steps: List[AgentStep]) -> str:
        """Build summary of previous steps"""
        if not steps:
            return "No steps taken yet."
        
        summaries = []
        for step in steps[-5:]:  # Last 5 steps
            status = "✓" if step.success else "✗"
            summaries.append(
                f"Step {step.step_number} [{status}]: {step.action.value}\n"
                f"  Thought: {step.thought[:100]}...\n"
                f"  Result: {step.observation[:100]}..."
            )
        
        return "\n".join(summaries)
    
    def _build_response(self, memory: AgentMemory, final_answer: str) -> Dict[str, Any]:
        """Build final response object"""
        return {
            "success": True,
            "response": final_answer,
            "mode": "agent",
            "reasoning_trace": [
                {
                    "step": s.step_number,
                    "thought": s.thought,
                    "action": s.action.value,
                    "observation": s.observation[:200],
                    "success": s.success
                }
                for s in memory.steps
            ],
            "plan": {
                "goal": memory.goal,
                "subtasks": memory.plan.subtasks if memory.plan else [],
                "completed": memory.plan.completed_steps if memory.plan else []
            } if memory.plan else None,
            "generated_blocks": memory.generated_blocks,
            "modified_pages": memory.modified_pages,
            "created_skills": memory.created_skills,
            "created_tasks": memory.created_tasks,
            "learnings": memory.learnings,
            "page_analysis": memory.page_analysis,
            "actions": self._build_actions(memory)
        }
    
    def _build_actions(self, memory: AgentMemory) -> List[Dict]:
        """Build action buttons for frontend"""
        actions = []
        
        # Add navigation to modified pages
        for page in memory.modified_pages:
            if page.get("action") == "created":
                actions.append({
                    "label": f"View '{page.get('title', 'New Page')}'",
                    "route": f"/pages/{page['id']}",
                    "type": "page_created"
                })
            elif page.get("action") == "updated":
                actions.append({
                    "label": "View Updated Page",
                    "route": f"/pages/{page['id']}",
                    "type": "page_updated"
                })
        
        # Add navigation to created skills
        for skill in memory.created_skills:
            if not skill.get("skipped"):
                actions.append({
                    "label": f"View Skill: {skill.get('name', 'New Skill')}",
                    "route": f"/skills?highlight={skill['id']}",
                    "type": "skill_created"
                })
        
        # Add navigation to created tasks
        for task in memory.created_tasks:
            if not task.get("skipped"):
                actions.append({
                    "label": f"View Task: {task.get('title', 'New Task')}",
                    "route": "/tasks",
                    "type": "task_created"
                })
        
        # Add insert blocks action if blocks generated but not inserted
        if memory.generated_blocks and not memory.modified_pages:
            actions.append({
                "label": f"Insert {len(memory.generated_blocks)} Block(s)",
                "action": "insert_blocks",
                "blocks": memory.generated_blocks,
                "type": "insert_blocks"
            })
        
        return actions
    
    # ==================== AUTONOMOUS TASK MANAGEMENT ====================
    
    async def _reschedule_overdue_tasks(self, user_id: str, workspace_id: str) -> Dict:
        """
        Autonomously reschedule all overdue tasks to next week.
        No confirmation needed - just does it.
        """
        try:
            from datetime import datetime, timedelta, timezone
            
            # Get all tasks that are NOT completed/done
            response = supabase_admin.table("tasks")\
                .select("*")\
                .eq("user_id", user_id)\
                .eq("workspace_id", workspace_id)\
                .neq("status", "completed")\
                .neq("status", "done")\
                .execute()
            
            all_tasks = response.data or []
            
            # Use timezone-aware datetime for comparison
            now = datetime.now(timezone.utc)
            
            # Filter overdue tasks
            overdue_tasks = []
            for task in all_tasks:
                due_date_str = task.get("due_date")
                if not due_date_str:
                    continue
                
                try:
                    # Parse date - handle timezone properly
                    if due_date_str.endswith('Z'):
                        due_date_str = due_date_str[:-1] + '+00:00'
                    
                    due_date = datetime.fromisoformat(due_date_str)
                    
                    # Make timezone-aware if naive
                    if due_date.tzinfo is None:
                        due_date = due_date.replace(tzinfo=timezone.utc)
                    
                    # Check if overdue
                    if due_date < now:
                        overdue_tasks.append(task)
                        logger.info(f"✓ Found overdue: '{task.get('title')}' (due: {due_date.date()})")
                except Exception as date_error:
                    logger.warning(f"Date parse error for task {task.get('id')}: {date_error}")
            
            if not overdue_tasks:
                logger.info("No overdue tasks found")
                return {
                    "success": True,
                    "count": 0,
                    "message": "No overdue tasks found"
                }
            
            # Reschedule to next week
            next_week = now + timedelta(days=7)
            updated_count = 0
            
            for task in overdue_tasks:
                try:
                    supabase_admin.table("tasks")\
                        .update({
                            "due_date": next_week.isoformat(),
                            "status": "todo"
                        })\
                        .eq("id", task["id"])\
                        .execute()
                    updated_count += 1
                    logger.info(f"✅ Rescheduled '{task.get('title')}' → {next_week.date()}")
                except Exception as e:
                    logger.error(f"Failed to reschedule {task.get('title')}: {e}")
            
            return {
                "success": True,
                "count": updated_count,
                "message": f"Rescheduled {updated_count} overdue task{'s' if updated_count != 1 else ''} to {next_week.date()}"
            }
            
        except Exception as e:
            logger.error(f"Reschedule error: {e}", exc_info=True)
            return {
                "success": False,
                "count": 0,
                "message": f"Error: {str(e)}"
            }
    
    async def _complete_done_tasks(self, user_id: str, workspace_id: str) -> Dict:
        """Mark all 'done' status tasks as completed"""
        try:
            response = supabase_admin.table("tasks")\
                .select("id")\
                .eq("user_id", user_id)\
                .eq("workspace_id", workspace_id)\
                .eq("status", "done")\
                .execute()
            
            tasks = response.data or []
            
            for task in tasks:
                supabase_admin.table("tasks")\
                    .update({"status": "completed"})\
                    .eq("id", task["id"])\
                    .execute()
            
            return {
                "success": True,
                "message": f"Marked {len(tasks)} tasks as completed"
            }
        except Exception as e:
            return {"success": False, "message": str(e)}
    
    async def _delete_completed_tasks(self, user_id: str, workspace_id: str) -> Dict:
        """Delete all completed tasks"""
        try:
            response = supabase_admin.table("tasks")\
                .delete()\
                .eq("user_id", user_id)\
                .eq("workspace_id", workspace_id)\
                .eq("status", "completed")\
                .execute()
            
            count = len(response.data or [])
            return {
                "success": True,
                "message": f"Deleted {count} completed tasks"
            }
        except Exception as e:
            return {"success": False, "message": str(e)}
    
    async def _prioritize_tasks(self, user_id: str, workspace_id: str) -> Dict:
        """
        Intelligently prioritize tasks based on:
        - Due date proximity
        - Current status
        - Task type (milestone > task > reminder)
        """
        try:
            from datetime import datetime, timedelta, timezone
            
            response = supabase_admin.table("tasks")\
                .select("*")\
                .eq("user_id", user_id)\
                .eq("workspace_id", workspace_id)\
                .eq("status", "todo")\
                .execute()
            
            tasks = response.data or []
            now = datetime.now(timezone.utc)
            updated = 0
            
            for task in tasks:
                due_date_str = task.get("due_date")
                if not due_date_str:
                    continue
                
                try:
                    # Parse date with timezone handling
                    if due_date_str.endswith('Z'):
                        due_date_str = due_date_str[:-1] + '+00:00'
                    
                    due_date = datetime.fromisoformat(due_date_str)
                    
                    # Make timezone-aware if naive
                    if due_date.tzinfo is None:
                        due_date = due_date.replace(tzinfo=timezone.utc)
                    
                    days_until_due = (due_date - now).days
                    
                    # Auto-prioritize based on urgency
                    if days_until_due < 0:  # Overdue
                        new_priority = "high"
                    elif days_until_due <= 2:  # Due soon
                        new_priority = "high"
                    elif days_until_due <= 7:  # Due this week
                        new_priority = "medium"
                    else:  # Due later
                        new_priority = "low"
                    
                    # Boost priority for milestones
                    if task.get("event_type") == "milestone":
                        if new_priority == "low":
                            new_priority = "medium"
                        elif new_priority == "medium":
                            new_priority = "high"
                    
                    # Update if priority changed
                    if task.get("priority") != new_priority:
                        supabase_admin.table("tasks")\
                            .update({"priority": new_priority})\
                            .eq("id", task["id"])\
                            .execute()
                        updated += 1
                        
                except Exception as e:
                    logger.warning(f"Failed to prioritize task {task.get('id')}: {e}")
            
            return {
                "success": True,
                "message": f"Prioritized {updated} task{'s' if updated != 1 else ''} based on urgency"
            }
            
        except Exception as e:
            logger.error(f"Prioritize error: {e}")
            return {"success": False, "message": str(e)}
    
    # ==================== LEARNING SYSTEM ====================
    
    async def _track_user_intent(self, goal: str, user_id: str, workspace_id: str):
        """Track what user asked for - used for learning and improvement"""
        try:
            # Extract topic from goal
            topic = self._extract_topic_from_goal(goal)
            intent = self._detect_simple_intent(goal)
            
            # Check if topic exists in learning_memory
            existing = supabase_admin.table("learning_memory")\
                .select("id, interaction_count")\
                .eq("user_id", user_id)\
                .eq("workspace_id", workspace_id)\
                .eq("topic", topic)\
                .limit(1)\
                .execute()
            
            if existing.data and len(existing.data) > 0:
                # Update existing record
                record = existing.data[0]
                supabase_admin.table("learning_memory")\
                    .update({
                        "interaction_count": record.get("interaction_count", 0) + 1,
                        "last_reviewed": datetime.now(timezone.utc).isoformat(),
                        "last_interaction_type": intent
                    })\
                    .eq("id", record["id"])\
                    .execute()
            else:
                # Create new record
                supabase_admin.table("learning_memory")\
                    .insert({
                        "user_id": user_id,
                        "workspace_id": workspace_id,
                        "topic": topic,
                        "confidence": 0.5,
                        "interaction_count": 1,
                        "error_count": 0,
                        "last_reviewed": datetime.now(timezone.utc).isoformat(),
                        "last_interaction_type": intent
                    })\
                    .execute()
        except Exception as e:
            logger.warning(f"Failed to track intent: {e}")
    
    async def _record_success(self, goal: str, action_taken: str, user_id: str, workspace_id: str):
        """Record successful action - agent learns what works"""
        try:
            topic = self._extract_topic_from_goal(goal)
            
            # Update confidence when action succeeds
            supabase_admin.table("learning_memory")\
                .update({
                    "confidence": supabase_admin.rpc("least", {"a": 1.0, "b": supabase_admin.rpc("greatest", {"a": 0.0, "b": "confidence + 0.05"})}),
                    "last_interaction_type": action_taken
                })\
                .eq("user_id", user_id)\
                .eq("workspace_id", workspace_id)\
                .eq("topic", topic)\
                .execute()
            
            logger.info(f"✓ Learned: '{topic}' → {action_taken}")
        except Exception as e:
            logger.warning(f"Failed to record success: {e}")
    
    def _extract_topic_from_goal(self, goal: str) -> str:
        """Extract main topic from user goal"""
        # Remove common action words
        topic = goal.lower()
        remove_words = [
            "create", "make", "add", "generate", "build", "new", "write",
            "remind", "reminder", "reschedule", "update", "delete",
            "a", "an", "the", "me", "to", "for", "in", "at", "on"
        ]
        
        words = topic.split()
        filtered = [w for w in words if w not in remove_words and len(w) > 2]
        
        # Take first 3-5 meaningful words as topic
        topic_words = filtered[:5] if len(filtered) > 5 else filtered
        return " ".join(topic_words)[:100] if topic_words else goal[:100]
    
    def _detect_simple_intent(self, goal: str) -> str:
        """Detect simple intent from goal"""
        goal_lower = goal.lower()
        
        if any(w in goal_lower for w in ["remind", "reminder"]):
            return "create_reminder"
        elif any(w in goal_lower for w in ["reschedule", "overdue"]):
            return "reschedule_tasks"
        elif any(w in goal_lower for w in ["create task", "add task"]):
            return "create_task"
        elif any(w in goal_lower for w in ["create page", "new page"]):
            return "create_page"
        elif any(w in goal_lower for w in ["create skill", "add skill"]):
            return "create_skill"
        else:
            return "generate_content"


# Singleton instance
agentic_agent = AgenticAgent()
