from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, validator
from typing import List, Dict, Any, Optional
from app.services.ai_agent import ai_agent_service, MAX_QUERY_LENGTH
from app.services.enhanced_ai_agent import enhanced_ai_agent
from app.services.agentic_agent import agentic_agent
from app.services.memory_service import MemoryService
from app.services.subscription_service import SubscriptionService
from app.api.dependencies import get_current_user
from app.core.supabase import supabase_admin
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

class QueryRequest(BaseModel):
    query: str
    mode: str = "ask"  # ask, explain, plan, agent
    scope: str = "all"  # all, pages, skills, graph, kb, web
    workspace_id: Optional[str] = None
    session_id: Optional[str] = None
    page_id: Optional[str] = None
    skill_id: Optional[str] = None
    model: Optional[str] = None  # AI model to use
    mentioned_items: Optional[List[Dict[str, str]]] = None  # [{type, id, name}]
    enabled_sources: Optional[List[str]] = None  # ['web', 'pages', 'skills', 'graph', 'kb']
    
    @validator('query')
    def validate_query_length(cls, v):
        if len(v) > MAX_QUERY_LENGTH:
            raise ValueError(f'Query must be {MAX_QUERY_LENGTH} characters or less')
        if len(v.strip()) == 0:
            raise ValueError('Query cannot be empty')
        return v.strip()
    
    @validator('mode')
    def validate_mode(cls, v):
        valid_modes = ['ask', 'explain', 'plan', 'agent']
        if v not in valid_modes:
            raise ValueError(f'Mode must be one of: {", ".join(valid_modes)}')
        return v
    
    @validator('scope')
    def validate_scope(cls, v):
        valid_scopes = ['all', 'pages', 'skills', 'graph', 'kb', 'web']
        if v not in valid_scopes:
            raise ValueError(f'Scope must be one of: {", ".join(valid_scopes)}')
        return v

class QueryResponse(BaseModel):
    response: str
    sources: List[Dict[str, Any]]
    suggested_actions: List[str]

@router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}

@router.get("/test-llm")
async def test_llm():
    """Test LLM connectivity"""
    from langchain_openai import ChatOpenAI
    from app.core.config import settings
    
    try:
        if not settings.OPENROUTER_API_KEY:
            return {"status": "error", "message": "OPENROUTER_API_KEY not configured"}
        
        llm = ChatOpenAI(
            model="gemini-2.0-flash-exp",
            temperature=0.7,
            max_tokens=100,
            api_key=settings.OPENROUTER_API_KEY,
            base_url=settings.OPENROUTER_BASE_URL
        )
        
        messages = [
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": "Say hello in one sentence."}
        ]
        
        response = await llm.ainvoke(messages)
        
        return {
            "status": "success",
            "response": response.content,
            "response_length": len(response.content) if response.content else 0
        }
    except Exception as e:
        import traceback
        return {
            "status": "error",
            "message": str(e),
            "traceback": traceback.format_exc()
        }

@router.post("/ask")
async def ask_ai(request: QueryRequest, user_id: str = Depends(get_current_user)):
    """Ask AI a question"""
    try:
        result = await ai_agent_service.process_query(
            request.query, 
            user_id,
            scope=request.scope,
            model=request.model
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing query: {str(e)}")

@router.post("/explain")
async def explain_ai(request: QueryRequest, user_id: str = Depends(get_current_user)):
    """Ask AI to explain something"""
    try:
        # Add explanation context to the query
        enhanced_query = f"Please explain in detail: {request.query}"
        result = await ai_agent_service.process_query(
            enhanced_query, 
            user_id,
            scope=request.scope,
            model=request.model
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing explanation: {str(e)}")

@router.post("/plan")
async def plan_ai(request: QueryRequest, user_id: str = Depends(get_current_user)):
    """Ask AI to create a plan"""
    try:
        # Add planning context to the query
        enhanced_query = f"Create a detailed plan for: {request.query}"
        result = await ai_agent_service.process_query(
            enhanced_query, 
            user_id,
            scope=request.scope,
            model=request.model
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating plan: {str(e)}")

@router.post("/agent")
async def agent_ai(request: QueryRequest, user_id: str = Depends(get_current_user)):
    """Ask AI agent to create/modify workspace content"""
    try:
        # Add agent context to the query
        enhanced_query = f"Execute this action: {request.query}"
        result = await ai_agent_service.process_query(
            enhanced_query, 
            user_id,
            scope=request.scope,
            model=request.model
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error executing agent action: {str(e)}")

@router.post("/query")
async def process_query_endpoint(
    request: QueryRequest, 
    user_id: str = Depends(get_current_user)
):
    """
    Universal AI query endpoint with memory and caching:
    - ask: Answer questions
    - explain: Explain concepts in detail
    - plan: Create plans and schedules
    - agent: Create workspace content (pages, skills, tasks)
    
    Features:
    - Short-term memory (session context)
    - Long-term memory (learning progress)
    - Vector search caching
    - AI response caching
    """
    try:
        # CHECK SUBSCRIPTION LIMIT FOR AI QUERIES (NEW 3-PLAN SYSTEM)
        from app.services.plan_service import PlanService
        plan_service = PlanService(supabase_admin)
        
        # Check Ask Anything daily limit
        usage = await plan_service.get_ask_anything_usage(user_id)
        if usage["remaining"] <= 0:
            raise HTTPException(
                status_code=403,
                detail={
                    "error": "limit_exceeded",
                    "message": f"You've reached your daily Ask Anything limit ({usage['limit']} queries/day)",
                    "current": usage["used"],
                    "limit": usage["limit"],
                    "remaining": 0,
                    "upgrade_required": True
                }
            )
        
        # Increment usage
        await plan_service.increment_ask_anything_usage(user_id)
        
        # Initialize memory service (optional - graceful degradation)
        memory_service = None
        try:
            memory_service = MemoryService(supabase_admin)
        except Exception as mem_error:
            print(f"Memory service not available: {mem_error}")
        
        # Build context from session and page/skill
        context = {
            "workspace_id": request.workspace_id,
            "page_id": request.page_id,
            "skill_id": request.skill_id,
            "mentioned_items": request.mentioned_items or []
        }
        
        # 1. GET SESSION CONTEXT AND CONVERSATION HISTORY
        session_context = None
        conversation_history = None
        if memory_service and request.session_id:
            try:
                session_context = await memory_service.get_session_context(
                    request.session_id,
                    user_id
                )
                conversation_history = await memory_service.get_conversation_history(
                    request.session_id,
                    limit=10
                )
                logger.info(f"Retrieved session context and {len(conversation_history)} conversation messages")
            except Exception as ctx_error:
                logger.warning(f"Failed to get session context: {ctx_error}")
        
        # 2. CHECK CACHE FIRST (if memory service available)
        cache_hit = False
        if memory_service and request.mode == "ask":
            try:
                cached_response = await memory_service.get_cached_response(
                    request.query,
                    request.workspace_id,
                    context
                )
                if cached_response:
                    return {
                        **cached_response,
                        "cached": True,
                        "cache_stats": {
                            "response_cache_hit": True,
                            "vector_cache_hit": None
                        },
                        "suggested_actions": []
                    }
            except Exception as cache_error:
                print(f"Cache check failed: {cache_error}")
        
        # 3. UPDATE SESSION CONTEXT (if memory service available)
        if memory_service and request.session_id:
            try:
                await memory_service.update_session_context(
                    session_id=request.session_id,
                    workspace_id=request.workspace_id,
                    user_id=user_id,
                    current_page_id=request.page_id,
                    current_skill_id=request.skill_id,
                    query=request.query
                )
            except Exception as ctx_error:
                print(f"Session context update failed: {ctx_error}")
        
        # 4. CHECK VECTOR SEARCH CACHE (if memory service available)
        cached_chunks = None
        vector_cache_hit = False
        if memory_service and request.scope in ["all", "pages", "kb"]:
            try:
                cached_chunks = await memory_service.get_cached_vector_search(
                    request.query,
                    request.workspace_id
                )
                if cached_chunks:
                    vector_cache_hit = True
            except Exception as vec_error:
                print(f"Vector cache check failed: {vec_error}")
        
        # 5. PROCESS QUERY WITH MEMORY CONTEXT
        result = await ai_agent_service.process_query(
            query=request.query,
            user_id=user_id,
            mode=request.mode,
            scope=request.scope,
            workspace_id=request.workspace_id,
            model=request.model,
            mentioned_items=request.mentioned_items,
            session_context=session_context,
            conversation_history=conversation_history,
            enabled_sources=request.enabled_sources
        )
        
        # Log the result for debugging
        logger.info(f"Query result - response length: {len(result.get('response', '')) if result.get('response') else 0}")
        logger.info(f"Query result - sources count: {len(result.get('sources', []))}")
        
        # Ensure response is not empty
        if not result.get("response") or not result.get("response").strip():
            logger.error(f"⚠️ Empty response returned from ai_agent_service for query: {request.query[:100]}")
            result["response"] = "I apologize, but I couldn't generate a response. Please try again or rephrase your question."
        
        # 6. CACHE RESULTS (if memory service available)
        if memory_service:
            try:
                # Cache vector search results if new
                if not cached_chunks and result.get("retrieved_chunks"):
                    await memory_service.cache_vector_search(
                        request.query,
                        request.workspace_id,
                        result["retrieved_chunks"]
                    )
                
                # Cache AI response
                if request.mode == "ask":
                    await memory_service.cache_response(
                        query=request.query,
                        workspace_id=request.workspace_id,
                        context=context,
                        response_text=result.get("response", ""),
                        response_type=result.get("type", "text"),
                        response_data=result.get("data"),
                        sources=result.get("sources"),
                        intent=request.mode
                    )
            except Exception as cache_save_error:
                print(f"Cache save failed: {cache_save_error}")
        
        # 7. ADD TO CONVERSATION MEMORY (if memory service available)
        if memory_service and request.session_id:
            try:
                # Get message index
                history = await memory_service.get_conversation_history(request.session_id)
                message_index = len(history)
                
                # Add user message
                await memory_service.add_conversation_message(
                    session_id=request.session_id,
                    workspace_id=request.workspace_id,
                    user_id=user_id,
                    role="user",
                    content=request.query,
                    message_index=message_index,
                    page_context=request.page_id,
                    skill_context=request.skill_id,
                    intent=request.mode
                )
                
                # Add assistant message
                await memory_service.add_conversation_message(
                    session_id=request.session_id,
                    workspace_id=request.workspace_id,
                    user_id=user_id,
                    role="assistant",
                    content=result.get("response", ""),
                    message_index=message_index + 1,
                    page_context=request.page_id,
                    skill_context=request.skill_id,
                    intent=request.mode
                )
            except Exception as conv_error:
                print(f"Conversation memory save failed: {conv_error}")
        
        # Final safety check before returning
        final_response = result.get("response", "")
        if not final_response or not final_response.strip():
            logger.error(f"⚠️ FINAL CHECK: Response is still empty! Setting fallback.")
            result["response"] = "I apologize, but I couldn't generate a response. Please try again or select a different AI model."
        
        logger.info(f"✅ Returning response with length: {len(result.get('response', ''))}")
        
        return {
            **result,
            "cached": False,
            "cache_stats": {
                "response_cache_hit": False,
                "vector_cache_hit": vector_cache_hit
            }
        }
        
    except Exception as e:
        print(f"Query processing error: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error processing query: {str(e)}")

@router.post("/query/enhanced")
async def process_enhanced_query(
    request: QueryRequest, 
    user_id: str = Depends(get_current_user)
):
    """
    Enhanced AI query endpoint with:
    - Intelligent intent detection
    - Smart context gathering (no lag with large workspaces)
    - Selective building (only creates what user asks for)
    - Learning from user interactions
    
    This endpoint follows the Ask Anything architecture:
    - Creates objects and returns actions
    - Does NOT render interactive UI
    - UI components handle all interaction
    """
    try:
        # CHECK SUBSCRIPTION LIMIT FOR AI QUERIES (NEW 3-PLAN SYSTEM)
        from app.services.plan_service import PlanService
        plan_service = PlanService(supabase_admin)
        
        # Check Ask Anything daily limit
        usage = await plan_service.get_ask_anything_usage(user_id)
        if usage["remaining"] <= 0:
            raise HTTPException(
                status_code=403,
                detail={
                    "error": "limit_exceeded",
                    "message": f"You've reached your daily Ask Anything limit ({usage['limit']} queries/day)",
                    "current": usage["used"],
                    "limit": usage["limit"],
                    "remaining": 0,
                    "upgrade_required": True
                }
            )
        
        # Increment usage
        await plan_service.increment_ask_anything_usage(user_id)
        
        # Get conversation history if session exists
        conversation_history = []
        if request.session_id:
            try:
                memory_service = MemoryService(supabase_admin)
                conversation_history = await memory_service.get_conversation_history(
                    request.session_id,
                    limit=10
                )
            except Exception as e:
                logger.warning(f"Failed to get conversation history: {e}")
        
        # Process with enhanced agent
        result = await enhanced_ai_agent.process_query(
            query=request.query,
            user_id=user_id,
            workspace_id=request.workspace_id,
            mode=request.mode,
            mentioned_items=request.mentioned_items or [],
            conversation_history=conversation_history,
            session_id=request.session_id
        )
        
        # Save to conversation memory
        if request.session_id:
            try:
                memory_service = MemoryService(supabase_admin)
                history = await memory_service.get_conversation_history(request.session_id)
                message_index = len(history)
                
                await memory_service.add_conversation_message(
                    session_id=request.session_id,
                    workspace_id=request.workspace_id,
                    user_id=user_id,
                    role="user",
                    content=request.query,
                    message_index=message_index,
                    page_context=request.page_id,
                    skill_context=request.skill_id,
                    intent=request.mode
                )
                
                await memory_service.add_conversation_message(
                    session_id=request.session_id,
                    workspace_id=request.workspace_id,
                    user_id=user_id,
                    role="assistant",
                    content=result.get("response", ""),
                    message_index=message_index + 1,
                    page_context=request.page_id,
                    skill_context=request.skill_id,
                    intent=request.mode
                )
            except Exception as e:
                logger.warning(f"Failed to save conversation: {e}")
        
        return result
        
    except Exception as e:
        logger.error(f"Enhanced query error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error processing query: {str(e)}")


@router.post("/feedback")
async def submit_feedback(
    query: str,
    was_correct: bool,
    workspace_id: str,
    user_id: str = Depends(get_current_user)
):
    """
    Submit feedback on AI intent detection to improve future accuracy
    """
    try:
        from app.services.intent_detector import intent_detector
        
        # Re-detect intent for the query
        intent = intent_detector.detect_intent(query)
        
        # Learn from feedback
        await enhanced_ai_agent.provide_feedback(
            query=query,
            intent=intent,
            was_correct=was_correct,
            user_id=user_id,
            workspace_id=workspace_id
        )
        
        return {"success": True, "message": "Feedback recorded"}
    except Exception as e:
        logger.error(f"Feedback error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/query/agent")
async def process_agentic_query(
    request: QueryRequest, 
    user_id: str = Depends(get_current_user)
):
    """
    Agentic AI query endpoint with:
    - Goal decomposition for complex tasks
    - Thought-Action-Observation loop (ReAct pattern)
    - Self-learning and retention
    - Full CRUD control over workspace content
    
    Use this for complex goals like:
    - "Plan a complete marketing campaign"
    - "Update this page with comprehensive content about X"
    - "Research and create a learning path for Y"
    
    The agent will:
    1. Analyze and decompose the goal
    2. Search workspace for relevant content
    3. Generate and insert content blocks
    4. Create/update pages, skills, tasks
    5. Learn from the interaction for future improvement
    """
    try:
        # CHECK SUBSCRIPTION LIMIT (NEW 3-PLAN SYSTEM)
        from app.services.plan_service import PlanService
        plan_service = PlanService(supabase_admin)
        
        # Check Ask Anything daily limit
        usage = await plan_service.get_ask_anything_usage(user_id)
        if usage["remaining"] <= 0:
            raise HTTPException(
                status_code=403,
                detail={
                    "error": "limit_exceeded",
                    "message": f"You've reached your daily Ask Anything limit ({usage['limit']} queries/day)",
                    "current": usage["used"],
                    "limit": usage["limit"],
                    "remaining": 0,
                    "upgrade_required": True
                }
            )
        
        # Increment usage
        await plan_service.increment_ask_anything_usage(user_id)
        
        # Get conversation history if session exists
        conversation_history = []
        if request.session_id:
            try:
                memory_service = MemoryService(supabase_admin)
                conversation_history = await memory_service.get_conversation_history(
                    request.session_id,
                    limit=10
                )
            except Exception as e:
                logger.warning(f"Failed to get conversation history: {e}")
        
        # Process with agentic agent
        result = await agentic_agent.process_goal(
            goal=request.query,
            user_id=user_id,
            workspace_id=request.workspace_id,
            mode=request.mode,
            current_page_id=request.page_id,
            mentioned_items=request.mentioned_items or [],
            conversation_history=conversation_history
        )
        
        # Save to conversation memory
        if request.session_id:
            try:
                memory_service = MemoryService(supabase_admin)
                history = await memory_service.get_conversation_history(request.session_id)
                message_index = len(history)
                
                await memory_service.add_conversation_message(
                    session_id=request.session_id,
                    workspace_id=request.workspace_id,
                    user_id=user_id,
                    role="user",
                    content=request.query,
                    message_index=message_index,
                    page_context=request.page_id,
                    skill_context=request.skill_id,
                    intent="agent"
                )
                
                await memory_service.add_conversation_message(
                    session_id=request.session_id,
                    workspace_id=request.workspace_id,
                    user_id=user_id,
                    role="assistant",
                    content=result.get("response", ""),
                    message_index=message_index + 1,
                    page_context=request.page_id,
                    skill_context=request.skill_id,
                    intent="agent"
                )
            except Exception as e:
                logger.warning(f"Failed to save conversation: {e}")
        
        return result
        
    except HTTPException:
        # Re-raise HTTPException (like limit_exceeded) without modification
        raise
    except Exception as e:
        logger.error(f"Agentic query error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error processing goal: {str(e)}")


@router.get("/models")
async def get_available_models():
    """Get list of available AI models - only verified working models"""
    return {
        "models": [
            # FREE MODELS (Verified Working)
            {
                "id": "gemini-2.5-flash",
                "name": "Gemini 2.5 Flash",
                "provider": "Google",
                "description": "Latest Gemini - Direct Google API",
                "free": True,
                "status": "working"
            },
            {
                "id": "meta-llama/llama-3.2-3b-instruct:free",
                "name": "Llama 3.2 3B (Free)",
                "provider": "Meta",
                "description": "Fast, reliable - OpenRouter",
                "free": True,
                "status": "working"
            },
            {
                "id": "nvidia/nemotron-nano-12b-v2-vl:free",
                "name": "Nemotron Nano 12B (Free)",
                "provider": "NVIDIA",
                "description": "Lightweight, fast (OpenRouter)",
                "free": True,
                "status": "working"
            },
            # PAID MODELS (Low cost)
            {
                "id": "gpt-4o-mini",
                "name": "GPT-4o Mini",
                "provider": "OpenAI",
                "description": "Fast and efficient",
                "free": False,
                "status": "working"
            },
            {
                "id": "gpt-4o",
                "name": "GPT-4o",
                "provider": "OpenAI",
                "description": "Most capable",
                "free": False,
                "status": "working"
            },
            {
                "id": "anthropic/claude-3.5-sonnet",
                "name": "Claude 3.5 Sonnet",
                "provider": "Anthropic",
                "description": "Excellent reasoning (requires credits)",
                "free": False,
                "status": "requires_credits"
            },
            {
                "id": "google/gemini-pro-1.5",
                "name": "Gemini Pro 1.5",
                "provider": "Google",
                "description": "Large context window",
                "free": False,
                "status": "working"
            },
            {
                "id": "meta-llama/llama-3.1-70b-instruct",
                "name": "Llama 3.1 70B",
                "provider": "Meta",
                "description": "Powerful open source",
                "free": False,
                "status": "working"
            },
            {
                "id": "mistralai/mistral-large",
                "name": "Mistral Large",
                "provider": "Mistral AI",
                "description": "European AI",
                "free": False,
                "status": "working"
            }
        ],
        "default": "gemini-2.5-flash",
        "recommended_free": "gemini-2.5-flash",
        "recommended_paid": "gpt-4o-mini"
    }

@router.post("/infer-connections/{page_id}")
async def infer_connections(page_id: str, user_id: str = Depends(get_current_user)):
    """Infer potential connections for a page"""
    try:
        connections = await ai_agent_service.infer_connections(page_id)
        return {"connections": connections}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error inferring connections: {str(e)}")


# =====================================================
# MEMORY MANAGEMENT ENDPOINTS
# =====================================================

@router.get("/memory/context/{session_id}")
async def get_session_context(
    session_id: str,
    user_id: str = Depends(get_current_user)
):
    """Get current session context (short-term memory)"""
    try:
        memory_service = MemoryService(supabase_admin)
        context = await memory_service.get_session_context(session_id, user_id)
        return context or {}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting context: {str(e)}")

@router.get("/memory/learning/{workspace_id}")
async def get_learning_memory(
    workspace_id: str,
    skill_id: Optional[str] = None,
    user_id: str = Depends(get_current_user)
):
    """Get learning memory (long-term memory)"""
    try:
        memory_service = MemoryService(supabase_admin)
        memory = await memory_service.get_learning_memory(
            user_id,
            workspace_id,
            skill_id
        )
        return {"learning_memory": memory}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting learning memory: {str(e)}")

@router.get("/memory/weak-areas/{workspace_id}")
async def get_weak_areas(
    workspace_id: str,
    skill_id: Optional[str] = None,
    user_id: str = Depends(get_current_user)
):
    """Get topics that need review"""
    try:
        memory_service = MemoryService(supabase_admin)
        weak_areas = await memory_service.get_weak_areas(
            user_id,
            workspace_id,
            skill_id
        )
        return {"weak_areas": weak_areas}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting weak areas: {str(e)}")

@router.get("/memory/conversation/{session_id}")
async def get_conversation_history(
    session_id: str,
    limit: int = 10,
    user_id: str = Depends(get_current_user)
):
    """Get conversation history"""
    try:
        memory_service = MemoryService(supabase_admin)
        history = await memory_service.get_conversation_history(session_id, limit)
        return {"history": history}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting history: {str(e)}")

@router.get("/cache/stats/{workspace_id}")
async def get_cache_stats(
    workspace_id: str,
    user_id: str = Depends(get_current_user)
):
    """Get cache statistics"""
    try:
        memory_service = MemoryService(supabase_admin)
        stats = await memory_service.get_cache_stats(workspace_id)
        return stats
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting stats: {str(e)}")

@router.post("/cache/clear")
async def clear_cache(
    user_id: str = Depends(get_current_user)
):
    """Clear expired cache entries"""
    try:
        memory_service = MemoryService(supabase_admin)
        result = await memory_service.clear_expired_cache()
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error clearing cache: {str(e)}")

@router.post("/cache/clear-all")
async def clear_all_cache(
    workspace_id: str = None,
    user_id: str = Depends(get_current_user)
):
    """Clear ALL cache entries for a workspace (use with caution)"""
    try:
        # Clear from database using admin client
        if workspace_id:
            supabase_admin.table("ai_response_cache").delete().eq("workspace_id", workspace_id).execute()
        else:
            # Clear all for user - this is a safety measure
            pass
        
        return {"success": True, "message": "Cache cleared successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error clearing cache: {str(e)}")

class LearningUpdateRequest(BaseModel):
    workspace_id: str
    skill_id: str
    topic: str
    is_correct: bool
    study_time: int = 0

@router.post("/memory/update-learning")
async def update_learning_memory(
    request: LearningUpdateRequest,
    user_id: str = Depends(get_current_user)
):
    """Update learning memory after quiz/flashcard interaction"""
    try:
        memory_service = MemoryService(supabase_admin)
        await memory_service.update_learning_memory(
            user_id=user_id,
            workspace_id=request.workspace_id,
            skill_id=request.skill_id,
            topic=request.topic,
            is_correct=request.is_correct,
            study_time=request.study_time
        )
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating learning memory: {str(e)}")
