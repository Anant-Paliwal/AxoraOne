# Ask Anything Memory System - Complete Fix

## 🎯 Overview
This document provides the complete fix for integrating the memory system with Ask Anything.

## 📋 Issues to Fix

1. ❌ Session context not passed to AI agent
2. ❌ Conversation history not included in LLM prompts
3. ❌ Learning memory never updated (quiz/flashcard interactions)
4. ❌ Upstash Vector not used (using local FAISS instead)
5. ❌ Frontend doesn't call memory endpoints

## 🔧 Fix #1: Integrate Session Context with AI Agent

### File: `backend/app/services/ai_agent.py`

**Add session context to AgentState:**
```python
class AgentState(TypedDict):
    """State for the AI agent"""
    query: str
    mode: str
    scope: str
    user_id: str
    workspace_id: Optional[str]
    context: List[Dict[str, Any]]
    workspace_context: Dict[str, Any]
    session_context: Optional[Dict[str, Any]]  # ADD THIS
    conversation_history: Optional[List[Dict[str, Any]]]  # ADD THIS
    response: Optional[str]
    sources: List[Dict[str, Any]]
    suggested_actions: List[str]
    created_items: Dict[str, List[str]]
    model: Optional[str]
    mentioned_items: Optional[List[Dict[str, str]]]
```

**Update `_build_workspace_summary()` to include session context:**
```python
def _build_workspace_summary(self, workspace_ctx: Dict[str, Any]) -> str:
    """Build a comprehensive summary of workspace context with learning awareness"""
    pages = workspace_ctx.get("pages", [])
    skills = workspace_ctx.get("skills", [])
    tasks = workspace_ctx.get("tasks", [])
    mentioned = workspace_ctx.get("mentioned", [])
    session_ctx = workspace_ctx.get("session_context")  # ADD THIS
    conversation = workspace_ctx.get("conversation_history", [])  # ADD THIS
    
    summary_parts = []
    
    # ADD SESSION CONTEXT SECTION
    if session_ctx:
        summary_parts.append("=== 🔄 CURRENT SESSION CONTEXT ===")
        if session_ctx.get("current_page_id"):
            summary_parts.append(f"Currently viewing page: {session_ctx.get('current_page_id')}")
        if session_ctx.get("current_skill_id"):
            summary_parts.append(f"Currently working on skill: {session_ctx.get('current_skill_id')}")
        if session_ctx.get("current_task_id"):
            summary_parts.append(f"Currently working on task: {session_ctx.get('current_task_id')}")
        
        recent_queries = session_ctx.get("recent_queries", [])
        if recent_queries:
            summary_parts.append("\nRecent Questions:")
            for q in recent_queries[:3]:
                summary_parts.append(f"  - {q.get('query')}")
        summary_parts.append("")
    
    # ADD CONVERSATION HISTORY
    if conversation:
        summary_parts.append("=== 💬 RECENT CONVERSATION ===")
        for msg in conversation[-5:]:  # Last 5 messages
            role = msg.get("role", "user")
            content = msg.get("content", "")[:100]
            summary_parts.append(f"{role.upper()}: {content}...")
        summary_parts.append("")
    
    # ... rest of existing code ...
```

**Update `process_query()` to accept session context:**
```python
async def process_query(
    self, 
    query: str, 
    user_id: str, 
    mode: str = "ask",
    scope: str = "all", 
    workspace_id: str = None,
    model: str = None,
    mentioned_items: List[Dict[str, str]] = None,
    session_context: Dict[str, Any] = None,  # ADD THIS
    conversation_history: List[Dict[str, Any]] = None  # ADD THIS
) -> Dict[str, Any]:
    """Process user query through the agent workflow"""
    initial_state: AgentState = {
        "query": query,
        "mode": mode,
        "scope": scope,
        "user_id": user_id,
        "workspace_id": workspace_id,
        "context": [],
        "workspace_context": {},
        "session_context": session_context,  # ADD THIS
        "conversation_history": conversation_history,  # ADD THIS
        "response": None,
        "sources": [],
        "suggested_actions": [],
        "created_items": {},
        "model": model
    }
    
    # Add mentioned items to context if provided
    if mentioned_items:
        initial_state["mentioned_items"] = mentioned_items
    
    result = await self.graph.ainvoke(initial_state)
    
    return {
        "response": result["response"],
        "sources": result["sources"],
        "suggested_actions": result["suggested_actions"],
        "created_items": result.get("created_items", {})
    }
```

**Update `_retrieve_workspace_context()` to include session data:**
```python
async def _retrieve_workspace_context(self, state: AgentState) -> AgentState:
    """Retrieve workspace pages, skills, and tasks"""
    try:
        # ... existing code ...
        
        state["workspace_context"] = {
            "pages": pages_response.data or [],
            "skills": skills_response.data or [],
            "tasks": tasks_response.data or [],
            "mentioned": mentioned_context,
            "session_context": state.get("session_context"),  # ADD THIS
            "conversation_history": state.get("conversation_history")  # ADD THIS
        }
        
        # ... rest of existing code ...
```

## 🔧 Fix #2: Update AI Chat Endpoint to Pass Memory Context

### File: `backend/app/api/endpoints/ai_chat.py`

**Update `/query` endpoint:**
```python
@router.post("/query")
async def process_query_endpoint(
    request: QueryRequest, 
    user_id: str = Depends(get_current_user),
    supabase = Depends(get_supabase_client)
):
    """Universal AI query endpoint with memory and caching"""
    try:
        # Initialize memory service
        memory_service = None
        try:
            memory_service = MemoryService(supabase)
        except Exception as mem_error:
            print(f"Memory service not available: {mem_error}")
        
        # GET SESSION CONTEXT
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
            except Exception as ctx_error:
                print(f"Failed to get session context: {ctx_error}")
        
        # UPDATE SESSION CONTEXT
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
        
        # PROCESS QUERY WITH MEMORY CONTEXT
        result = await ai_agent_service.process_query(
            query=request.query,
            user_id=user_id,
            mode=request.mode,
            scope=request.scope,
            workspace_id=request.workspace_id,
            model=request.model,
            mentioned_items=request.mentioned_items,
            session_context=session_context,  # ADD THIS
            conversation_history=conversation_history  # ADD THIS
        )
        
        # ... rest of existing code ...
```

## 🔧 Fix #3: Add Learning Memory Updates to Frontend

### File: `src/components/learning/QuizCard.tsx`

**Add memory update after quiz submission:**
```typescript
const handleSubmit = async () => {
  if (!quiz) return;
  
  const correctCount = answers.filter((answer, index) => 
    answer === quiz.questions[index].correctAnswer
  ).length;
  
  const percentage = (correctCount / quiz.questions.length) * 100;
  
  try {
    // Save quiz attempt
    await api.post(`/learning/quizzes/${quiz.id}/attempts`, {
      score: correctCount,
      total_questions: quiz.questions.length,
      percentage
    });
    
    // UPDATE LEARNING MEMORY FOR EACH QUESTION
    for (let i = 0; i < quiz.questions.length; i++) {
      const question = quiz.questions[i];
      const isCorrect = answers[i] === question.correctAnswer;
      
      await api.post('/ai/memory/update-learning', {
        workspace_id: quiz.workspace_id,
        skill_id: quiz.linked_skill_id || 'general',
        topic: question.question,
        is_correct: isCorrect,
        study_time: 30  // Estimate 30 seconds per question
      });
    }
    
    setShowResults(true);
    
    // Update skill confidence if linked
    if (quiz.linked_skill_id && percentage >= 70) {
      await api.patch(`/skills/${quiz.linked_skill_id}`, {
        confidence: Math.min(100, percentage)
      });
    }
  } catch (error) {
    console.error('Failed to submit quiz:', error);
  }
};
```

### File: `src/components/learning/FlashcardDeck.tsx`

**Add memory update when marking cards:**
```typescript
const handleKnown = async () => {
  if (!deck || currentIndex >= deck.cards.length) return;
  
  const card = deck.cards[currentIndex];
  
  try {
    // Save flashcard progress
    await api.post(`/learning/flashcards/${deck.id}/progress`, {
      card_index: currentIndex,
      status: 'known'
    });
    
    // UPDATE LEARNING MEMORY
    await api.post('/ai/memory/update-learning', {
      workspace_id: deck.workspace_id,
      skill_id: deck.linked_skill_id || 'general',
      topic: card.front,
      is_correct: true,
      study_time: 10  // Estimate 10 seconds per card
    });
    
    setKnownCards([...knownCards, currentIndex]);
    nextCard();
  } catch (error) {
    console.error('Failed to mark card as known:', error);
  }
};

const handleUnknown = async () => {
  if (!deck || currentIndex >= deck.cards.length) return;
  
  const card = deck.cards[currentIndex];
  
  try {
    // Save flashcard progress
    await api.post(`/learning/flashcards/${deck.id}/progress`, {
      card_index: currentIndex,
      status: 'unknown'
    });
    
    // UPDATE LEARNING MEMORY
    await api.post('/ai/memory/update-learning', {
      workspace_id: deck.workspace_id,
      skill_id: deck.linked_skill_id || 'general',
      topic: card.front,
      is_correct: false,
      study_time: 10
    });
    
    setUnknownCards([...unknownCards, currentIndex]);
    nextCard();
  } catch (error) {
    console.error('Failed to mark card as unknown:', error);
  }
};
```

## 🔧 Fix #4: Create Database Function for Learning Memory

### File: `backend/migrations/add_learning_memory_function.sql`

```sql
-- Create function to update learning memory
CREATE OR REPLACE FUNCTION update_learning_memory(
    p_user_id UUID,
    p_workspace_id UUID,
    p_skill_id UUID,
    p_topic TEXT,
    p_is_correct BOOLEAN,
    p_study_time INTEGER DEFAULT 0
)
RETURNS void AS $$
DECLARE
    v_memory_id UUID;
    v_correct_count INTEGER;
    v_error_count INTEGER;
    v_weak_areas JSONB;
BEGIN
    -- Get or create memory record
    SELECT id, correct_count, error_count, weak_areas
    INTO v_memory_id, v_correct_count, v_error_count, v_weak_areas
    FROM user_learning_memory
    WHERE user_id = p_user_id
      AND workspace_id = p_workspace_id
      AND skill_id = p_skill_id
      AND topic = p_topic;
    
    -- If not found, create new record
    IF v_memory_id IS NULL THEN
        INSERT INTO user_learning_memory (
            user_id,
            workspace_id,
            skill_id,
            topic,
            correct_count,
            error_count,
            total_study_time,
            weak_areas
        ) VALUES (
            p_user_id,
            p_workspace_id,
            p_skill_id,
            p_topic,
            CASE WHEN p_is_correct THEN 1 ELSE 0 END,
            CASE WHEN p_is_correct THEN 0 ELSE 1 END,
            p_study_time,
            CASE WHEN p_is_correct THEN '[]'::jsonb 
                 ELSE jsonb_build_array(jsonb_build_object('topic', p_topic, 'error_count', 1))
            END
        );
    ELSE
        -- Update existing record
        UPDATE user_learning_memory
        SET 
            correct_count = correct_count + CASE WHEN p_is_correct THEN 1 ELSE 0 END,
            error_count = error_count + CASE WHEN p_is_correct THEN 0 ELSE 1 END,
            total_study_time = total_study_time + p_study_time,
            last_reviewed = NOW(),
            weak_areas = CASE 
                WHEN p_is_correct THEN weak_areas
                ELSE jsonb_set(
                    weak_areas,
                    '{0}',
                    jsonb_build_object(
                        'topic', p_topic,
                        'error_count', COALESCE((weak_areas->0->>'error_count')::int, 0) + 1
                    )
                )
            END
        WHERE id = v_memory_id;
    END IF;
END;
$$ LANGUAGE plpgsql;
```

## 🔧 Fix #5: Replace FAISS with Upstash Vector (Optional)

### File: `backend/app/services/vector_store.py`

**Replace FAISS with Upstash Vector REST API:**
```python
import httpx
from typing import List, Dict, Any, Optional
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

class VectorStoreService:
    def __init__(self):
        self.upstash_available = False
        if settings.UPSTASH_VECTOR_REST_URL and settings.UPSTASH_VECTOR_REST_TOKEN:
            self.vector_url = settings.UPSTASH_VECTOR_REST_URL
            self.vector_token = settings.UPSTASH_VECTOR_REST_TOKEN
            self.vector_headers = {
                "Authorization": f"Bearer {self.vector_token}"
            }
            self.upstash_available = True
        
    async def initialize(self):
        """Initialize vector store"""
        if self.upstash_available:
            logger.info("Vector store initialized with Upstash Vector")
        else:
            logger.warning("Upstash Vector not configured")
    
    async def close(self):
        """Cleanup resources"""
        pass
    
    async def add_page(self, page_id: str, title: str, content: str, metadata: Dict[str, Any]):
        """Add page to vector store"""
        if not self.upstash_available:
            return
        
        text = f"{title}\n\n{content}"
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.vector_url}/upsert",
                    headers=self.vector_headers,
                    json={
                        "id": page_id,
                        "data": text,
                        "metadata": metadata
                    },
                    timeout=10.0
                )
                if response.status_code == 200:
                    logger.info(f"Added page {page_id} to Upstash Vector")
        except Exception as e:
            logger.error(f"Failed to add page to Upstash Vector: {e}")
    
    async def search_pages(self, query: str, limit: int = 10, workspace_id: str = None) -> List[Dict[str, Any]]:
        """Search pages by semantic similarity"""
        if not self.upstash_available:
            return []
        
        try:
            async with httpx.AsyncClient() as client:
                # Build filter for workspace
                filter_query = f"workspace_id = '{workspace_id}'" if workspace_id else None
                
                response = await client.post(
                    f"{self.vector_url}/query",
                    headers=self.vector_headers,
                    json={
                        "data": query,
                        "topK": limit,
                        "includeMetadata": True,
                        "filter": filter_query
                    },
                    timeout=10.0
                )
                
                if response.status_code == 200:
                    results = response.json()
                    return [
                        {
                            "id": item["id"],
                            "document": item.get("data", ""),
                            "metadata": item.get("metadata", {}),
                            "score": item.get("score", 0)
                        }
                        for item in results
                    ]
        except Exception as e:
            logger.error(f"Vector search failed: {e}")
        
        return []
    
    async def find_related_pages(self, page_id: str, limit: int = 5) -> List[Dict[str, Any]]:
        """Find pages related to a given page"""
        if not self.upstash_available:
            return []
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.vector_url}/query",
                    headers=self.vector_headers,
                    json={
                        "id": page_id,
                        "topK": limit + 1,  # +1 to exclude self
                        "includeMetadata": True
                    },
                    timeout=10.0
                )
                
                if response.status_code == 200:
                    results = response.json()
                    # Filter out the source page
                    return [
                        {
                            "id": item["id"],
                            "metadata": item.get("metadata", {}),
                            "score": item.get("score", 0)
                        }
                        for item in results
                        if item["id"] != page_id
                    ][:limit]
        except Exception as e:
            logger.error(f"Related pages search failed: {e}")
        
        return []

vector_store_service = VectorStoreService()
```

## 📝 Migration Checklist

### Backend Changes:
- [ ] Update `ai_agent.py` - Add session_context to AgentState
- [ ] Update `ai_agent.py` - Modify `_build_workspace_summary()`
- [ ] Update `ai_agent.py` - Update `process_query()` signature
- [ ] Update `ai_agent.py` - Update `_retrieve_workspace_context()`
- [ ] Update `ai_chat.py` - Pass session context to AI agent
- [ ] Create `add_learning_memory_function.sql` migration
- [ ] Run migration in Supabase
- [ ] (Optional) Replace `vector_store.py` with Upstash implementation

### Frontend Changes:
- [ ] Update `QuizCard.tsx` - Add memory update on submit
- [ ] Update `FlashcardDeck.tsx` - Add memory update on known/unknown
- [ ] Test quiz completion flow
- [ ] Test flashcard review flow

### Testing:
- [ ] Test session context appears in AI responses
- [ ] Test conversation history is maintained
- [ ] Test quiz completion updates learning memory
- [ ] Test flashcard review updates learning memory
- [ ] Test weak areas endpoint returns data
- [ ] Test cache stats show memory usage

## 🎯 Expected Results After Fix

1. **AI becomes context-aware:**
   - Remembers what you were just looking at
   - References previous questions in conversation
   - Builds on earlier discussions

2. **Learning progress is tracked:**
   - Quiz scores saved to database
   - Flashcard mastery tracked
   - Weak areas identified automatically

3. **Memory system is integrated:**
   - Short-term memory (session) used by AI
   - Long-term memory (learning) updated after activities
   - Cache improves performance

4. **Data is visible:**
   - `/memory/learning/{workspace_id}` returns progress
   - `/memory/weak-areas/{workspace_id}` shows topics to review
   - `/cache/stats/{workspace_id}` shows cache usage

## 🚀 Quick Start

1. Apply backend changes to `ai_agent.py` and `ai_chat.py`
2. Run the SQL migration for learning memory function
3. Update frontend components (`QuizCard.tsx`, `FlashcardDeck.tsx`)
4. Restart backend and frontend
5. Test with a quiz or flashcard deck
6. Check `/memory/learning/{workspace_id}` to see saved progress

## 📊 Verification

After implementing fixes, verify:
```bash
# Check learning memory is being saved
curl http://localhost:8000/ai/memory/learning/{workspace_id}

# Check weak areas are identified
curl http://localhost:8000/ai/memory/weak-areas/{workspace_id}

# Check cache stats
curl http://localhost:8000/ai/cache/stats/{workspace_id}

# Check conversation history
curl http://localhost:8000/ai/memory/conversation/{session_id}
```

All endpoints should return data after using Ask Anything, quizzes, and flashcards.
