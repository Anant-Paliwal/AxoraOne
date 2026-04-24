# Ask Anything Diagnostic Report

## 🔍 Issue Summary
**Nothing is being saved to Supabase tables when using Ask Anything**

## 📊 Current System Analysis

### ✅ What's Working

1. **Redis Cache (Upstash)** - CONFIGURED ✓
   - URL: `https://helpful-wildcat-39932.upstash.io`
   - Token: Present
   - Status: Available in memory_service.py

2. **Vector Store (Upstash)** - CONFIGURED ✓
   - URL: `https://alert-seagull-55007-us1-vector.upstash.io`
   - Token: Present
   - Status: Available in memory_service.py

3. **Database Tables** - EXIST ✓
   - `quizzes` table exists
   - `flashcard_decks` table exists
   - `chat_context` table exists
   - `vector_search_cache` table exists
   - `ai_response_cache` table exists
   - `conversation_memory` table exists
   - `user_learning_memory` table exists

4. **AI Agent Service** - WORKING ✓
   - LangGraph workflow configured
   - OpenRouter API configured
   - Build mode implementation exists

### ❌ What's NOT Working

#### 1. **Short-Term Memory (Session Context)**
**Location:** `memory_service.py` → `get_session_context()`, `update_session_context()`

**Issue:** Session context is being saved to `chat_context` table, but:
- NOT being used by AI agent during query processing
- NOT being passed to LLM for context awareness
- Session data exists but is isolated from the AI workflow

**Evidence:**
```python
# In ai_chat.py - session context is updated but NOT used
await memory_service.update_session_context(...)
# But then AI agent doesn't receive this context!
result = await ai_agent_service.process_query(...)  # No session context passed
```

#### 2. **Long-Term Memory (Learning Progress)**
**Location:** `memory_service.py` → `get_learning_memory()`, `update_learning_memory()`

**Issue:** Learning memory table exists but:
- NEVER updated after quiz/flashcard interactions
- NO integration with QuizCard.tsx or FlashcardDeck.tsx
- Database function `update_learning_memory` may not exist

**Missing Integration:**
- QuizCard.tsx doesn't call `/memory/update-learning` after quiz completion
- FlashcardDeck.tsx doesn't track known/unknown cards to memory

#### 3. **Vector Search Cache**
**Location:** `memory_service.py` → `get_cached_vector_search()`, `cache_vector_search()`

**Issue:** Cache is checked but:
- Vector store (FAISS) is LOCAL, not using Upstash Vector
- Upstash Vector REST API is configured but NOT used
- Cache saves to Supabase but vector search doesn't use Upstash

**Evidence:**
```python
# vector_store.py uses FAISS (local file system)
self.indexes: Dict[str, faiss.Index] = {}
# But Upstash Vector is configured and available!
```

#### 4. **AI Response Cache**
**Location:** `memory_service.py` → `get_cached_response()`, `cache_response()`

**Status:** PARTIALLY WORKING
- Cache is checked in `ai_chat.py`
- Cache is saved after responses
- BUT: Only works for "ask" mode, not "build" mode

#### 5. **Conversation Memory**
**Location:** `memory_service.py` → `add_conversation_message()`, `get_conversation_history()`

**Issue:** Conversation history is saved but:
- NOT retrieved and sent to LLM for context
- NOT displayed in UI
- Exists in database but isolated from AI workflow

#### 6. **Build Mode - Content Creation**
**Location:** `ai_agent.py` → `_execute_actions()`

**Status:** WORKING BUT LIMITED
- Pages, skills, tasks ARE being created ✓
- Quizzes and flashcards ARE being created ✓
- Duplicate detection works ✓
- BUT: No integration with learning memory
- BUT: No automatic skill confidence updates

## 🔧 Root Causes

### 1. **Disconnected Systems**
The memory system and AI agent are separate:
```
Memory Service (saves data) ←→ [NO CONNECTION] ←→ AI Agent (processes queries)
```

### 2. **Upstash Vector Not Used**
Despite being configured, the system uses local FAISS instead of Upstash Vector:
```
Configured: Upstash Vector REST API
Actually Used: Local FAISS files in ./data/chroma
```

### 3. **Frontend Missing Memory Calls**
UI components don't call memory endpoints:
```
QuizCard.tsx → Submit Quiz → ❌ No call to /memory/update-learning
FlashcardDeck.tsx → Mark Known → ❌ No call to /memory/update-learning
```

### 4. **Session Context Not Passed to LLM**
Session context exists but isn't included in AI prompts:
```python
# Session context is saved
await memory_service.update_session_context(...)

# But AI agent doesn't receive it
result = await ai_agent_service.process_query(
    query=request.query,
    # ❌ No session_context parameter
    # ❌ No conversation_history parameter
)
```

## 📋 What IS Being Saved

### ✅ Currently Saved to Supabase:
1. **Pages** - via Build mode ✓
2. **Skills** - via Build mode ✓
3. **Tasks** - via Build mode ✓
4. **Quizzes** - via Build mode ✓
5. **Flashcard Decks** - via Build mode ✓
6. **Chat Sessions** - via chat_sessions table ✓
7. **Session Context** - via chat_context table ✓
8. **Conversation Messages** - via conversation_memory table ✓
9. **AI Response Cache** - via ai_response_cache table ✓
10. **Vector Search Cache** - via vector_search_cache table ✓

### ❌ NOT Being Saved:
1. **Learning Memory** - user_learning_memory table is EMPTY
2. **Quiz Attempts** - quiz_attempts table is EMPTY
3. **Flashcard Progress** - flashcard_progress table is EMPTY
4. **Skill Confidence Updates** - Not triggered after learning activities

## 🎯 Redis & Vector Usage

### Redis (Upstash) - SHORT-TERM CACHE
**Purpose:** Fast access to frequently used data
**Current Usage:**
- ✅ Session context caching (1 hour TTL)
- ✅ Vector search results caching (1 hour TTL)
- ✅ AI response caching (1 hour TTL)
- ✅ Hit count tracking

**How It Works:**
1. Check Redis first (fast)
2. If miss, check Supabase (slower)
3. Cache result in Redis for next time

### Vector Store - SEMANTIC SEARCH
**Configured:** Upstash Vector
**Actually Used:** Local FAISS

**Should Be Used For:**
- Semantic search across pages
- Finding related content
- Knowledge graph connections
- Intelligent page recommendations

**Current Problem:**
- FAISS stores vectors in local files
- Upstash Vector is configured but not integrated
- No cloud-based vector search

## 🔄 Data Flow Analysis

### Current Flow (Broken):
```
User Query
    ↓
AI Chat Endpoint
    ↓
Memory Service (saves session context) ← ISOLATED
    ↓
AI Agent (no memory context)
    ↓
Generate Response
    ↓
Save to Cache ← WORKS
    ↓
Return Response
```

### Expected Flow (Fixed):
```
User Query
    ↓
AI Chat Endpoint
    ↓
Memory Service (get session + conversation history)
    ↓
AI Agent (WITH memory context)
    ↓
Generate Response (context-aware)
    ↓
Save to Cache + Update Memory
    ↓
Return Response
```

## 🚨 Critical Missing Pieces

### 1. Memory Context Integration
**File:** `backend/app/services/ai_agent.py`
**Missing:** Session context and conversation history in LLM prompts

### 2. Learning Memory Updates
**Files:** 
- `src/components/learning/QuizCard.tsx`
- `src/components/learning/FlashcardDeck.tsx`
**Missing:** API calls to `/memory/update-learning` after interactions

### 3. Upstash Vector Integration
**File:** `backend/app/services/vector_store.py`
**Missing:** Replace FAISS with Upstash Vector REST API

### 4. Database Function
**Missing:** PostgreSQL function `update_learning_memory` may not exist in Supabase

## 📝 Summary

### What's Saved:
- ✅ Content (pages, skills, tasks, quizzes, flashcards)
- ✅ Session data (chat_context table)
- ✅ Conversation history (conversation_memory table)
- ✅ Cache data (Redis + Supabase)

### What's NOT Saved:
- ❌ Learning progress (quiz scores, flashcard mastery)
- ❌ Skill confidence updates
- ❌ Weak areas tracking

### Why Nothing Seems Saved:
The memory system IS saving data, but:
1. It's not being USED by the AI (disconnected)
2. Learning activities don't UPDATE memory (no frontend integration)
3. Vector search uses local files, not Upstash (misconfigured)

## 🎯 Next Steps

See `ASK_ANYTHING_MEMORY_FIX.md` for the complete fix implementation.
