# Ask Anything Memory & Caching System

## 🎯 Overview

Implemented a comprehensive memory and caching system for Ask Anything that follows best practices:
- ✅ Short-term memory (session context)
- ✅ Long-term memory (learning progress as structured data)
- ✅ Vector search caching
- ✅ AI response caching
- ✅ Upstash Redis for serverless caching
- ✅ Upstash Vector for embeddings

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Ask Anything Query                        │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
         ┌────────────────────────┐
         │  1. Check Redis Cache  │ ◄── Upstash Redis (sub-ms)
         └────────┬───────────────┘
                  │ Cache Miss
                  ▼
         ┌────────────────────────┐
         │ 2. Check DB Cache      │ ◄── PostgreSQL
         └────────┬───────────────┘
                  │ Cache Miss
                  ▼
         ┌────────────────────────┐
         │ 3. Vector Search       │ ◄── Upstash Vector
         └────────┬───────────────┘
                  │
                  ▼
         ┌────────────────────────┐
         │ 4. LLM Processing      │ ◄── OpenAI/OpenRouter
         └────────┬───────────────┘
                  │
                  ▼
         ┌────────────────────────┐
         │ 5. Cache Results       │ ──► Redis + PostgreSQL
         └────────────────────────┘
```

## 📊 Database Schema

### 1. Short-Term Memory: `chat_context`
Stores current session context (NOT sent to LLM):
```sql
- session_id
- current_page_id
- current_skill_id
- current_task_id
- recent_pages (last 5-10)
- recent_queries (last 5-10)
- recent_actions (last 5-10)
```

### 2. Long-Term Memory: `user_learning_memory`
Stores learning progress as structured data (NOT text blobs):
```sql
- mastery_level (0-100)
- confidence_score (0-1)
- learned_topics (JSONB)
- weak_areas (JSONB)
- strong_areas (JSONB)
- total_study_time
- total_questions_answered
- correct_answers
```

### 3. Vector Search Cache: `vector_search_cache`
Caches retrieved chunks (24hr expiry):
```sql
- query_hash
- retrieved_chunks (JSONB)
- hit_count
- expires_at
```

### 4. AI Response Cache: `ai_response_cache`
Caches complete AI responses (1hr expiry):
```sql
- query_hash
- context_hash
- response_text
- response_type
- response_data (JSONB)
- hit_count
- expires_at
```

### 5. Conversation Memory: `conversation_memory`
Stores conversation with semantic search:
```sql
- session_id
- message_index
- role (user/assistant)
- content
- content_embedding (vector)
- page_context
- skill_context
```

## 🚀 Implementation

### Backend Files Created/Modified

1. **`backend/migrations/add_ask_anything_memory.sql`**
   - Creates all memory tables
   - Sets up RLS policies
   - Adds helper functions
   - Creates views for easy access

2. **`backend/app/services/memory_service.py`**
   - MemoryService class with Upstash integration
   - Redis REST API client (async)
   - Vector search caching
   - AI response caching
   - Learning memory management

3. **`backend/app/core/config.py`**
   - Added Upstash Vector config
   - Added Upstash Redis config

4. **`backend/app/api/endpoints/ai_chat.py`**
   - Enhanced `/query` endpoint with caching
   - Added memory management endpoints
   - Integrated MemoryService

5. **`backend/.env`**
   - Added Upstash credentials

## 📡 API Endpoints

### Query Endpoint (Enhanced)
```
POST /ai/query
```
**Features:**
- Checks cache first (saves tokens/money/time)
- Updates session context
- Caches vector search results
- Caches AI responses
- Adds to conversation memory

**Request:**
```json
{
  "query": "Explain SQL joins",
  "mode": "ask",
  "scope": "all",
  "workspace_id": "uuid",
  "session_id": "uuid",
  "page_id": "uuid",
  "skill_id": "uuid"
}
```

**Response:**
```json
{
  "response": "...",
  "sources": [...],
  "cached": false,
  "suggested_actions": [...]
}
```

### Memory Management Endpoints

```
GET  /ai/memory/context/{session_id}
GET  /ai/memory/learning/{workspace_id}
GET  /ai/memory/weak-areas/{workspace_id}
GET  /ai/memory/conversation/{session_id}
GET  /ai/cache/stats/{workspace_id}
POST /ai/cache/clear
POST /ai/memory/update-learning
```

## 🎯 What This Achieves

### ✅ Saves Resources
- **Tokens**: No repeated vector searches
- **Money**: Cached responses avoid LLM calls
- **Time**: Redis sub-millisecond response

### ❌ Prevents Anti-Patterns
- ❌ Sending all pages to LLM
- ❌ Sending full documents
- ❌ Sending entire skill history
- ❌ Using LLM for retrieval
- ❌ Chat "scrolling memory"

### 🧠 Memory Types

**Short-Term Memory (Session Context):**
- Last page viewed
- Current task
- Today's learning
- Used directly in context (minimal)

**Long-Term Memory (Structured Data):**
- Skill progress
- Learned topics
- Weak areas
- Stored as structured data, NOT text blobs
- Never dumped into LLM

## 🔧 Setup Instructions

### 1. Run Database Migration
```bash
# Connect to your Supabase database
psql -h db.elwlchiiextcpkjnpyyt.supabase.co -U postgres -d postgres

# Run migration
\i backend/migrations/add_ask_anything_memory.sql
```

### 2. Verify Environment Variables
Already configured in `backend/.env`:
```env
UPSTASH_VECTOR_REST_URL=https://alert-seagull-55007-us1-vector.upstash.io
UPSTASH_VECTOR_REST_TOKEN=ABcFMGFsZXJ0LXNlYWd1bGwtNTUwMDctdXMxYWRtaW5OREV3WkRBek9Ea3RZakEwT0MwME5qZzBMV0l4TldVdE0yRmxOMlU0WVdSbE1qZzU=

UPSTASH_REDIS_REST_URL=https://helpful-wildcat-39932.upstash.io
UPSTASH_REDIS_REST_TOKEN=AZv8AAIncDJmN2YwN2I5YWJlZDQ0NjM1YTZhODZkNDRhMzVlODRmYnAyMzk5MzI
```

### 3. Install Dependencies
```bash
cd backend
pip install -r requirements.txt
```

### 4. Restart Backend
```bash
uvicorn main:app --reload --port 8000
```

## 📈 Usage Examples

### Frontend Integration

```typescript
// Ask Anything with memory
const response = await fetch('/api/ai/query', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: "Explain SQL joins",
    mode: "ask",
    workspace_id: currentWorkspace.id,
    session_id: currentSession.id,
    page_id: currentPage?.id,
    skill_id: currentSkill?.id
  })
});

const data = await response.json();
if (data.cached) {
  console.log("Response from cache! ⚡");
}
```

### Update Learning Memory (After Quiz)
```typescript
await fetch('/api/ai/memory/update-learning', {
  method: 'POST',
  body: JSON.stringify({
    workspace_id: workspace.id,
    skill_id: skill.id,
    topic: "SQL Joins",
    is_correct: true,
    study_time: 5 // minutes
  })
});
```

### Get Weak Areas
```typescript
const response = await fetch(
  `/api/ai/memory/weak-areas/${workspace.id}?skill_id=${skill.id}`
);
const { weak_areas } = await response.json();
// Use to suggest review topics
```

### Get Cache Stats
```typescript
const response = await fetch(`/api/ai/cache/stats/${workspace.id}`);
const stats = await response.json();
console.log(`Cache hits: ${stats.vector_cache_hits}`);
console.log(`Cache entries: ${stats.ai_cache_entries}`);
```

## 🎨 Frontend Components to Update

### 1. Ask Anything Chat Component
```typescript
// Add session tracking
const [sessionId] = useState(() => uuidv4());

// Pass session_id in queries
const handleQuery = async (query: string) => {
  const response = await api.post('/ai/query', {
    query,
    session_id: sessionId,
    workspace_id: currentWorkspace.id,
    page_id: currentPage?.id
  });
  
  // Show cache indicator
  if (response.cached) {
    showToast("Response from cache ⚡", "success");
  }
};
```

### 2. Quiz Component
```typescript
// Update learning memory after quiz
const handleQuizSubmit = async (answers: Answer[]) => {
  const score = calculateScore(answers);
  
  // Update memory for each question
  for (const answer of answers) {
    await api.post('/ai/memory/update-learning', {
      workspace_id: workspace.id,
      skill_id: quiz.skill_id,
      topic: answer.topic,
      is_correct: answer.correct,
      study_time: answer.time_spent
    });
  }
};
```

### 3. Flashcard Component
```typescript
// Track flashcard reviews
const handleCardReview = async (card: Card, known: boolean) => {
  await api.post('/ai/memory/update-learning', {
    workspace_id: workspace.id,
    skill_id: deck.skill_id,
    topic: card.topic,
    is_correct: known,
    study_time: 1
  });
};
```

## 🔍 Monitoring & Debugging

### Check Cache Performance
```sql
-- Vector search cache stats
SELECT 
  COUNT(*) as total_entries,
  SUM(hit_count) as total_hits,
  AVG(hit_count) as avg_hits_per_entry
FROM vector_search_cache
WHERE workspace_id = 'your-workspace-id';

-- AI response cache stats
SELECT 
  COUNT(*) as total_entries,
  SUM(hit_count) as total_hits,
  intent,
  COUNT(*) as count_by_intent
FROM ai_response_cache
WHERE workspace_id = 'your-workspace-id'
GROUP BY intent;
```

### View Learning Progress
```sql
SELECT * FROM learning_progress_summary
WHERE workspace_id = 'your-workspace-id'
ORDER BY mastery_level DESC;
```

### Check Session Context
```sql
SELECT * FROM current_user_context
WHERE session_id = 'your-session-id';
```

## 🚨 Important Notes

1. **Cache Expiration:**
   - Vector search cache: 24 hours
   - AI response cache: 1 hour
   - Redis cache: 1 hour
   - Auto-cleanup function available

2. **Memory Limits:**
   - Recent queries: Last 10
   - Recent pages: Last 10
   - Recent actions: Last 10
   - Conversation history: Configurable (default 10)

3. **Privacy:**
   - All data is workspace-scoped
   - RLS policies enforce user access
   - Cache is user-specific

4. **Performance:**
   - Redis: Sub-millisecond response
   - PostgreSQL: ~10-50ms
   - Vector search: ~100-500ms
   - LLM call: ~1-5 seconds

## 🎉 Benefits

1. **Cost Savings:** Reduced LLM API calls by caching responses
2. **Speed:** Sub-millisecond cache hits with Upstash Redis
3. **Scalability:** Serverless architecture with Upstash
4. **Intelligence:** Learning memory tracks progress without bloating context
5. **User Experience:** Faster responses, personalized learning

## 📝 Next Steps

1. ✅ Database migration applied
2. ✅ Backend service implemented
3. ✅ API endpoints created
4. ✅ Upstash configured
5. ⏳ Frontend integration (update Ask Anything component)
6. ⏳ Quiz/Flashcard memory tracking
7. ⏳ Cache monitoring dashboard

## 🔗 Related Files

- `backend/migrations/add_ask_anything_memory.sql` - Database schema
- `backend/app/services/memory_service.py` - Memory service
- `backend/app/api/endpoints/ai_chat.py` - Enhanced endpoints
- `backend/app/core/config.py` - Configuration
- `.kiro/steering/ask-anything-architecture.md` - Architecture principles
