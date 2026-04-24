"""
Enhanced AI Agent Service for Ask Anything
Integrates intelligent intent detection, context gathering, and smart building
"""
import json
import asyncio
from typing import TypedDict, List, Dict, Any, Optional
from datetime import datetime
import logging

from langchain_openai import ChatOpenAI
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.schema import HumanMessage, SystemMessage, AIMessage

from app.core.config import settings
from app.core.supabase import supabase_admin
from app.services.intent_detector import intent_detector, IntentType, ContentType, DetectedIntent
from app.services.context_gatherer import context_gatherer, GatheredContext
from app.services.smart_builder import smart_builder, BuildResult

logger = logging.getLogger(__name__)

# Default model to use - Llama via OpenRouter (Gemini quota exhausted)
DEFAULT_MODEL = "gemini-2.5-flash"


class AgentState(TypedDict):
    """State for the enhanced AI agent"""
    query: str
    user_id: str
    workspace_id: str
    mode: str
    mentioned_items: List[Dict]
    intent: Optional[DetectedIntent]
    context: Optional[GatheredContext]
    ai_response: str
    build_result: Optional[BuildResult]
    sources: List[Dict]
    conversation_history: List[Dict]
    final_response: Dict


class EnhancedAIAgent:
    """
    Enhanced AI Agent with:
    - Intelligent intent detection
    - Smart context gathering (no lag with large workspaces)
    - Selective building (only creates what user asks for)
    - Learning from user interactions
    """
    
    def __init__(self):
        self.llm = None  # Lazy initialization
        self.conversation_cache = {}  # Cache for conversation context
    
    def _get_llm(self, model: str = None):
        """Get the appropriate LLM - routes to correct API"""
        model = model or DEFAULT_MODEL
        
        # Check if this is a Gemini model - use Google's direct API
        is_gemini = any(gm in model.lower() for gm in ['gemini', 'google/gemini'])
        
        if is_gemini and settings.GEMINI_API_KEY:
            # Use Google's direct Gemini API
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
            raise ValueError("No API key configured. Set OPENROUTER_API_KEY or OPENAI_API_KEY")
        
        logger.info(f"🔶 Using OpenRouter API: {model}")
        return ChatOpenAI(
            model=model,
            api_key=api_key,
            base_url=base_url,
            temperature=0.7
        )

    
    async def process_query(
        self,
        query: str,
        user_id: str,
        workspace_id: str,
        mode: str = "ask",
        mentioned_items: List[Dict] = None,
        conversation_history: List[Dict] = None,
        session_id: str = None
    ) -> Dict[str, Any]:
        """
        Process a user query through the enhanced pipeline
        
        Args:
            query: User's input query
            user_id: Current user ID
            workspace_id: Current workspace ID
            mode: ask/build/plan
            mentioned_items: Items mentioned with @ syntax
            conversation_history: Previous messages in conversation
            session_id: Chat session ID for context
            
        Returns:
            Complete response with AI answer, actions, and build results
        """
        mentioned_items = mentioned_items or []
        conversation_history = conversation_history or []
        
        logger.info(f"🚀 Processing query: '{query[:50]}...' mode={mode}")
        
        try:
            # Step 1: Detect intent
            intent = intent_detector.detect_intent(
                query=query,
                mode=mode,
                mentioned_items=mentioned_items
            )
            
            # Step 2: Gather relevant context (efficient - no full workspace load)
            context = await context_gatherer.gather_context(
                query=query,
                user_id=user_id,
                workspace_id=workspace_id,
                mentioned_items=mentioned_items,
                topic=intent.topic,
                limit_results=10
            )
            
            # Step 3: Generate AI response
            ai_response, sources = await self._generate_response(
                query=query,
                intent=intent,
                context=context,
                conversation_history=conversation_history,
                mode=mode
            )
            
            # Step 4: Execute build if needed (ONLY in agent/build mode)
            # ASK mode should NEVER create objects - only answer questions
            build_result = None
            if mode in ["agent", "build"] and intent.intent_type in [IntentType.CREATE, IntentType.UPDATE, IntentType.DELETE]:
                build_result = await smart_builder.build(
                    intent=intent,
                    user_id=user_id,
                    workspace_id=workspace_id,
                    ai_response=ai_response,
                    workspace_context={
                        "pages": context.relevant_pages,
                        "skills": context.relevant_skills,
                        "tasks": context.relevant_tasks
                    },
                    web_sources=sources
                )
            
            # Step 5: Update learning memory
            await self._update_learning_memory(
                user_id=user_id,
                workspace_id=workspace_id,
                query=query,
                intent=intent,
                context=context
            )
            
            # Build final response
            response = self._build_final_response(
                query=query,
                intent=intent,
                context=context,
                ai_response=ai_response,
                build_result=build_result,
                sources=sources
            )
            
            logger.info(f"✅ Query processed successfully")
            return response
            
        except Exception as e:
            logger.error(f"Error processing query: {e}", exc_info=True)
            return {
                "success": False,
                "response": f"I encountered an error: {str(e)}. Please try again.",
                "mode": mode,
                "actions": [],
                "sources": [],
                "error": str(e)
            }
    
    async def _generate_response(
        self,
        query: str,
        intent: DetectedIntent,
        context: GatheredContext,
        conversation_history: List[Dict],
        mode: str
    ) -> tuple[str, List[Dict]]:
        """Generate AI response based on intent and context"""
        
        # Build system prompt based on mode and intent
        system_prompt = self._build_system_prompt(intent, context, mode)
        
        # Build context-aware user message
        user_message = self._build_user_message(query, intent, context)
        
        # Prepare messages
        messages = [SystemMessage(content=system_prompt)]
        
        # Add relevant conversation history (last 5 messages)
        for msg in conversation_history[-5:]:
            if msg.get("role") == "user":
                messages.append(HumanMessage(content=msg.get("content", "")))
            elif msg.get("role") == "assistant":
                messages.append(AIMessage(content=msg.get("content", "")))
        
        # Add current query
        messages.append(HumanMessage(content=user_message))
        
        # Generate response
        try:
            # Get LLM instance (lazy initialization)
            llm = self._get_llm()
            response = await asyncio.to_thread(
                lambda: llm.invoke(messages)
            )
            ai_response = response.content
        except Exception as e:
            logger.error(f"LLM error: {e}")
            # Provide a helpful fallback response
            ai_response = f"I understand you want to {intent.intent_type.value} content about {intent.topic}. Let me help you with that."
        
        # Extract sources from context
        sources = self._extract_sources(context)
        
        return ai_response, sources

    
    def _build_system_prompt(self, intent: DetectedIntent, context: GatheredContext, mode: str) -> str:
        """Build system prompt based on intent and context"""
        
        base_prompt = """You are an intelligent learning assistant. You help users learn, create content, and manage their knowledge workspace.

IMPORTANT RULES:
1. Be concise and helpful
2. Use the provided context to give relevant answers
3. In ASK mode, NEVER create objects - only answer questions and provide guidance
4. In AGENT/BUILD mode, create ONLY what the user specifically asked for
5. Reference existing workspace content when relevant
6. Acknowledge user's learning history and weak areas when appropriate
"""
        
        # Add mode-specific instructions
        if mode == "agent":
            base_prompt += """
AGENT MODE INSTRUCTIONS:
- You have FULL CONTROL to create, update, and delete workspace content
- Create pages, skills, tasks, quizzes, flashcards as needed
- If user says "create a page about X", create the page
- If user says "create everything about X", create page + skill + task
- Always confirm what you're creating in your response
- Return structured actions for the UI to navigate to created objects
"""
        elif mode == "plan":
            base_prompt += """
PLAN MODE INSTRUCTIONS:
- Help user create a learning plan
- Break down topics into manageable tasks
- Suggest a timeline if appropriate
- Don't create anything automatically - just provide the plan
- User can switch to AGENT mode to execute the plan
"""
        else:  # ask mode
            base_prompt += """
ASK MODE INSTRUCTIONS:
- Answer questions clearly and concisely
- Reference relevant pages/skills from the workspace
- Suggest related content the user might find helpful
- NEVER create pages, skills, tasks, or any objects
- If user wants to create something, suggest they switch to AGENT mode
- Provide guidance on HOW to do things, not DO them automatically
"""
        
        # Add context summary
        if context.context_summary:
            base_prompt += f"\n\nWORKSPACE CONTEXT:\n{context.context_summary}"
        
        # Add weak areas if relevant
        if context.weak_areas:
            weak_topics = [w.get("topic") for w in context.weak_areas[:3]]
            base_prompt += f"\n\nUSER'S WEAK AREAS (may need extra help): {', '.join(weak_topics)}"
        
        return base_prompt
    
    def _build_user_message(self, query: str, intent: DetectedIntent, context: GatheredContext) -> str:
        """Build context-enriched user message"""
        
        message_parts = [query]
        
        # Add mentioned items context
        if context.mentioned_items:
            message_parts.append("\n\n[Referenced Items:]")
            for item in context.mentioned_items[:3]:
                item_type = item.get("type")
                item_data = item.get("data", {})
                if item_type == "page":
                    content_preview = item_data.get("content", "")[:200]
                    message_parts.append(f"- Page '{item_data.get('title')}': {content_preview}...")
                elif item_type == "skill":
                    message_parts.append(f"- Skill '{item_data.get('name')}' (Level: {item_data.get('level')})")
                elif item_type == "task":
                    task_info = f"- Task '{item_data.get('title')}' (Status: {item_data.get('status')})"
                    # Add linked sources info
                    if item_data.get("linked_page"):
                        task_info += f"\n  → Linked to page: {item_data['linked_page'].get('title')}"
                    if item_data.get("linked_skill"):
                        task_info += f"\n  → Linked to skill: {item_data['linked_skill'].get('name')}"
                    message_parts.append(task_info)
        
        # Add relevant pages context
        if context.relevant_pages and not context.mentioned_items:
            message_parts.append("\n\n[Related Pages in Workspace:]")
            for page in context.relevant_pages[:3]:
                message_parts.append(f"- {page.get('title')}")
        
        # Add relevant tasks with their sources
        if context.relevant_tasks:
            message_parts.append("\n\n[Related Tasks:]")
            for task in context.relevant_tasks[:3]:
                task_info = f"- {task.get('title')} ({task.get('status')})"
                if task.get("linked_page"):
                    task_info += f" [from: {task['linked_page'].get('title')}]"
                if task.get("linked_skill"):
                    task_info += f" [skill: {task['linked_skill'].get('name')}]"
                message_parts.append(task_info)
        
        return "\n".join(message_parts)
    
    def _extract_sources(self, context: GatheredContext) -> List[Dict]:
        """Extract sources from gathered context"""
        sources = []
        
        # Add mentioned items as sources
        for item in context.mentioned_items:
            item_data = item.get("data", {})
            sources.append({
                "type": item.get("type"),
                "id": item_data.get("id"),
                "title": item_data.get("title") or item_data.get("name"),
                "source": "workspace"
            })
            
            # If it's a task with linked sources, add those too
            if item.get("type") == "task":
                if item_data.get("linked_page"):
                    linked_page = item_data["linked_page"]
                    sources.append({
                        "type": "page",
                        "id": linked_page.get("id"),
                        "title": linked_page.get("title"),
                        "source": "workspace",
                        "linked_from": "task"
                    })
                if item_data.get("linked_skill"):
                    linked_skill = item_data["linked_skill"]
                    sources.append({
                        "type": "skill",
                        "id": linked_skill.get("id"),
                        "title": linked_skill.get("name"),
                        "source": "workspace",
                        "linked_from": "task"
                    })
        
        # Add relevant pages as sources
        for page in context.relevant_pages[:5]:
            if not any(s.get("id") == page.get("id") for s in sources):
                sources.append({
                    "type": "page",
                    "id": page.get("id"),
                    "title": page.get("title"),
                    "source": "workspace",
                    "relevance": page.get("_relevance_score", 0)
                })
        
        # Add relevant tasks as sources (with their linked content)
        for task in context.relevant_tasks[:5]:
            if not any(s.get("id") == task.get("id") for s in sources):
                sources.append({
                    "type": "task",
                    "id": task.get("id"),
                    "title": task.get("title"),
                    "source": "workspace",
                    "relevance": task.get("_relevance_score", 0)
                })
                
                # Add linked sources from tasks
                if task.get("linked_page") and not any(s.get("id") == task["linked_page"].get("id") for s in sources):
                    sources.append({
                        "type": "page",
                        "id": task["linked_page"].get("id"),
                        "title": task["linked_page"].get("title"),
                        "source": "workspace",
                        "linked_from": "task"
                    })
                if task.get("linked_skill") and not any(s.get("id") == task["linked_skill"].get("id") for s in sources):
                    sources.append({
                        "type": "skill",
                        "id": task["linked_skill"].get("id"),
                        "title": task["linked_skill"].get("name"),
                        "source": "workspace",
                        "linked_from": "task"
                    })
        
        return sources
    
    async def _update_learning_memory(
        self,
        user_id: str,
        workspace_id: str,
        query: str,
        intent: DetectedIntent,
        context: GatheredContext
    ):
        """Update learning memory based on interaction"""
        try:
            # Record the topic interaction directly in database
            if intent.topic:
                # Check if topic exists
                existing = supabase_admin.table("learning_memory")\
                    .select("id, interaction_count, confidence")\
                    .eq("user_id", user_id)\
                    .eq("workspace_id", workspace_id)\
                    .eq("topic", intent.topic)\
                    .limit(1)\
                    .execute()
                
                if existing.data and len(existing.data) > 0:
                    # Update existing record
                    record = existing.data[0]
                    new_count = record.get("interaction_count", 0) + 1
                    new_confidence = min(1.0, record.get("confidence", 0.5) + 0.02)
                    
                    supabase_admin.table("learning_memory")\
                        .update({
                            "interaction_count": new_count,
                            "confidence": new_confidence,
                            "last_reviewed": datetime.utcnow().isoformat(),
                            "last_interaction_type": intent.intent_type.value
                        })\
                        .eq("id", record["id"])\
                        .execute()
                else:
                    # Create new record
                    supabase_admin.table("learning_memory")\
                        .insert({
                            "user_id": user_id,
                            "workspace_id": workspace_id,
                            "topic": intent.topic,
                            "confidence": 0.5,
                            "interaction_count": 1,
                            "last_reviewed": datetime.utcnow().isoformat(),
                            "last_interaction_type": intent.intent_type.value,
                            "error_count": 0
                        })\
                        .execute()
        except Exception as e:
            logger.warning(f"Failed to update learning memory: {e}")

    
    def _build_final_response(
        self,
        query: str,
        intent: DetectedIntent,
        context: GatheredContext,
        ai_response: str,
        build_result: Optional[BuildResult],
        sources: List[Dict]
    ) -> Dict[str, Any]:
        """Build the final response object"""
        
        response = {
            "success": True,
            "response": ai_response,
            "mode": intent.intent_type.value,
            "intent": {
                "type": intent.intent_type.value,
                "content_types": [ct.value for ct in intent.content_types],
                "topic": intent.topic,
                "confidence": intent.confidence,
                "is_specific": intent.is_specific
            },
            "context": {
                "relevant_pages_count": len(context.relevant_pages),
                "relevant_skills_count": len(context.relevant_skills),
                "mentioned_items_count": len(context.mentioned_items),
                "relevance_score": context.relevance_score
            },
            "sources": sources,
            "actions": []
        }
        
        # Add build results if any
        if build_result:
            response["build"] = {
                "success": build_result.success,
                "message": build_result.message,
                "created": {
                    k: [{"id": i.get("id"), "title": i.get("title") or i.get("name")} for i in v]
                    for k, v in build_result.created_items.items() if v and k != "blocks"
                },
                "updated": {
                    k: [{"id": i.get("id"), "title": i.get("title") or i.get("name")} for i in v]
                    for k, v in build_result.updated_items.items() if v
                },
                "skipped": {
                    k: [{"title": i.get("title") or i.get("name"), "reason": i.get("reason")} for i in v]
                    for k, v in build_result.skipped_items.items() if v
                },
                "errors": build_result.errors
            }
            response["actions"] = build_result.actions
            
            # Add generated blocks for frontend to insert into page
            if build_result.generated_blocks:
                response["generated_blocks"] = build_result.generated_blocks
            
            # Enhance response with build summary
            if build_result.success:
                response["response"] = f"{ai_response}\n\n{build_result.message}"
        
        return response
    
    async def provide_feedback(
        self,
        query: str,
        intent: DetectedIntent,
        was_correct: bool,
        user_id: str,
        workspace_id: str
    ):
        """
        Process user feedback to improve future intent detection
        
        Args:
            query: Original query
            intent: Detected intent
            was_correct: Whether the detection was correct
            user_id: User ID
            workspace_id: Workspace ID
        """
        # Update intent detector learning
        intent_detector.learn_from_feedback(query, intent, was_correct)
        
        # Store feedback in database for analysis
        try:
            supabase_admin.table("ai_feedback").insert({
                "user_id": user_id,
                "workspace_id": workspace_id,
                "query": query,
                "detected_intent": intent.intent_type.value,
                "content_types": [ct.value for ct in intent.content_types],
                "was_correct": was_correct,
                "created_at": datetime.utcnow().isoformat()
            }).execute()
        except Exception as e:
            logger.warning(f"Failed to store feedback: {e}")


# Singleton instance
enhanced_ai_agent = EnhancedAIAgent()
