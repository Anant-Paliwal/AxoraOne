# Ask Anything - Complete Architecture Flow

## 🎯 Core Libraries & Technologies

### Frontend
- **React** - UI framework
- **TypeScript** - Type safety
- **Framer Motion** - Animations
- **TanStack Query** - Data fetching
- **Axios/Fetch** - HTTP requests

### Backend
- **FastAPI** - Python web framework
- **LangChain** - LLM orchestration framework
- **LangGraph** - Workflow/agent state management
- **OpenAI/OpenRouter** - LLM API
- **Google Gemini** - Embeddings API
- **Supabase** - Database (PostgreSQL)
- **Upstash Vector** - Vector database
- **Upstash Redis** - Caching
- **Brave Search** - Web search API

---

## 📊 Complete Query-to-Answer Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND LAYER                          │
└─────────────────────────────────────────────────────────────────┘

1. User Input
   ├─ User types query in AskAnything.tsx
   ├─ Selects mode: Ask / Plan / Build
   ├─ Selects sources: Web / Pages / Skills / Graph / KB
   └─ Can mention items with @page, @task, @skill

2. Frontend Processing
   ├─ Validate input
   ├─ Collect mentioned items
   ├─ Get current workspace context
   └─ Send to backend API

   ↓ HTTP POST /api/v1/ai/query

┌─────────────────────────────────────────────────────────────────┐
│                      BACKEND API LAYER                          │
└─────────────────────────────────────────────────────────────────┘

3. API Endpoint (ai_chat.py)
   ├─ Receive QueryRequest
   │  ├─ query: str
   │  ├─ mode: "ask" | "plan" | "build"
   │  ├─ scope: "all" | "web" | "pages" | "skills" | "graph" | "kb"
   │  ├─ workspace_id: str
   │  ├─ session_id: str
   │  ├─ model: str (e.g., "gpt-4o-mini")
   │  └─ mentioned_items: [{type, id, name}]
   │
   ├─ Initialize MemoryService (optional)
   ├─ Get session context (short-term memory)
   ├─ Get conversation history (last 10 messages)
   ├─ Check cache (response cache + vector cache)
   └─ If cache miss → proceed to AI Agent

   ↓

┌─────────────────────────────────────────────────────────────────┐
│                      AI AGENT LAYER (LangGraph)                 │
└─────────────────────────────────────────────────────────────────┘

4. AI Agent Service (ai_agent.py)
   
   Uses LangGraph StateGraph with 5 nodes:
   
   ┌──────────────────────────────────────────────────────────┐
   │  Node 1: retrieve_workspace_context                      │
   ├──────────────────────────────────────────────────────────┤
   │  • Fetch pages from Supabase (filtered by workspace)     │
   │  • Fetch skills from Supabase (filtered by workspace)    │
   │  • Fetch tasks from Supabase (filtered by workspace)     │
   │  • Fetch mentioned items (@page, @task, @skill)          │
   │  • Get weak areas from learning memory                   │
   │  • Add session context + conversation history            │
   └──────────────────────────────────────────────────────────┘
                            ↓
   ┌──────────────────────────────────────────────────────────┐
   │  Node 2: retrieve_vector_context                         │
   ├──────────────────────────────────────────────────────────┤
   │  IF scope == "web":                                      │
   │    • Call Brave Search API                               │
   │    • Get web results (title, URL, description)           │
   │                                                           │
   │  ELSE (pages/kb/all):                                    │
   │    • Generate query embedding (Gemini/OpenAI)            │
   │    • Search Upstash Vector database                      │
   │    • Get relevant page chunks                            │
   │    • Filter by workspace_id                              │
   └──────────────────────────────────────────────────────────┘
                            ↓
   ┌──────────────────────────────────────────────────────────┐
   │  Node 3: generate_response                               │
   ├──────────────────────────────────────────────────────────┤
   │  • Build context from workspace + vector results         │
   │  • Create system prompt based on mode:                   │
   │    - ASK: Answer questions                               │
   │    - PLAN: Create structured plans                       │
   │    - BUILD: Create learning objects (quiz/flashcards)    │
   │  • Add conversation history for context                  │
   │  • Call LLM (OpenAI/OpenRouter/Gemini)                   │
   │  • Stream or return complete response                    │
   └──────────────────────────────────────────────────────────┘
                            ↓
   ┌──────────────────────────────────────────────────────────┐
   │  Node 4: execute_actions                                 │
   ├──────────────────────────────────────────────────────────┤
   │  IF mode == "build":                                     │
   │    • Parse LLM response for learning objects             │
   │    • Create quiz in database (Supabase)                  │
   │    • Create flashcard deck in database                   │
   │    • Create tasks in database                            │
   │    • Link to skills + pages                              │
   │    • Update knowledge graph                              │
   │                                                           │
   │  IF mode == "plan":                                      │
   │    • Create tasks from plan                              │
   │    • Set due dates                                       │
   │    • Link to workspace                                   │
   └──────────────────────────────────────────────────────────┘
                            ↓
   ┌──────────────────────────────────────────────────────────┐
   │  Node 5: suggest_actions                                 │
   ├──────────────────────────────────────────────────────────┤
   │  • Generate suggested actions based on response          │
   │  • Examples:                                             │
   │    - "Save as new page"                                  │
   │    - "Generate practice tasks"                           │
   │    - "View related pages"                                │
   │    - "Visualize in knowledge graph"                      │
   │    - "Start Quiz" (if quiz created)                      │
   │    - "Review Flashcards" (if deck created)               │
   └──────────────────────────────────────────────────────────┘
                            ↓
                         END

5. Post-Processing (ai_chat.py)
   ├─ Cache vector search results (Upstash Redis)
   ├─ Cache AI response (Upstash Redis)
   ├─ Add to conversation memory (Supabase)
   │  ├─ User message
   │  └─ Assistant message
   ├─ Update session context
   └─ Return response to frontend

   ↓ HTTP Response

┌─────────────────────────────────────────────────────────────────┐
│                      FRONTEND RESPONSE HANDLING                 │
└─────────────────────────────────────────────────────────────────┘

6. Display Response (AskAnything.tsx)
   ├─ Stream response character-by-character (smooth UX)
   ├─ Display sources with links
   ├─ Show suggested action buttons
   ├─ Add to conversation history UI
   └─ Save to chat session

7. User Actions
   ├─ Click "Start Quiz" → Navigate to /quiz/{quiz_id}
   ├─ Click "Review Flashcards" → Navigate to /flashcards/{deck_id}
   ├─ Click "View Mindmap" → Navigate to /graph?mode=mindmap
   ├─ Click "Save as page" → Create new page
   └─ Ask follow-up question → Repeat flow with context
```

---

## 🔄 Data Flow Diagram

```
┌──────────┐
│  User    │
│  Input   │
└────┬─────┘
     │
     ↓
┌────────────────────────────────────────────────────────┐
│  Frontend (React)                                      │
│  • AskAnything.tsx                                     │
│  • Collect query + mode + sources + mentions           │
└────┬───────────────────────────────────────────────────┘
     │ POST /api/v1/ai/query
     ↓
┌────────────────────────────────────────────────────────┐
│  API Endpoint (FastAPI)                                │
│  • ai_chat.py: process_query_endpoint()                │
│  • Validate request                                    │
│  • Initialize memory service                           │
└────┬───────────────────────────────────────────────────┘
     │
     ├─→ Check Cache (Upstash Redis)
     │   ├─ Response cache hit? → Return cached
     │   └─ Vector cache hit? → Use cached chunks
     │
     ↓
┌────────────────────────────────────────────────────────┐
│  AI Agent (LangGraph)                                  │
│  • ai_agent.py: AIAgentService                         │
│  • StateGraph with 5 nodes                             │
└────┬───────────────────────────────────────────────────┘
     │
     ├─→ Node 1: Workspace Context
     │   └─→ Supabase: pages, skills, tasks, mentions
     │
     ├─→ Node 2: Vector Context
     │   ├─→ IF web: Brave Search API
     │   └─→ ELSE: Upstash Vector + Gemini Embeddings
     │
     ├─→ Node 3: Generate Response
     │   └─→ LLM (OpenAI/OpenRouter/Gemini)
     │
     ├─→ Node 4: Execute Actions
     │   └─→ IF build: Create objects in Supabase
     │
     └─→ Node 5: Suggest Actions
         └─→ Generate action buttons
     │
     ↓
┌────────────────────────────────────────────────────────┐
│  Post-Processing                                       │
│  • Cache results (Upstash Redis)                       │
│  • Save to memory (Supabase)                           │
│  • Update session context                              │
└────┬───────────────────────────────────────────────────┘
     │ Response JSON
     ↓
┌────────────────────────────────────────────────────────┐
│  Frontend Display                                      │
│  • Stream response                                     │
│  • Show sources                                        │
│  • Render action buttons                               │
│  • Update chat history                                 │
└────────────────────────────────────────────────────────┘
```

---

## 🗄️ Database Schema

### Supabase Tables Used

```sql
-- User data
pages (id, user_id, workspace_id, title, content, tags)
skills (id, user_id, workspace_id, name, level, confidence)
tasks (id, user_id, workspace_id, title, status, due_date)

-- Learning objects
quizzes (id, user_id, workspace_id, title, questions, page_id, skill_id)
flashcard_decks (id, user_id, workspace_id, title, cards, page_id, skill_id)

-- Memory system
chat_sessions (id, user_id, workspace_id, title, created_at)
chat_messages (id, session_id, role, content, sources, timestamp)
session_context (session_id, workspace_id, current_page_id, current_skill_id)
learning_memory (user_id, workspace_id, skill_id, topic, confidence, last_reviewed)

-- Knowledge graph
graph_nodes (id, type, entity_id, workspace_id)
graph_edges (source_id, target_id, relationship_type, strength)
```

### Upstash Vector Index

```
Dimensions: 1536 (padded from Gemini's 768)
Metric: Cosine similarity
Metadata: {title, content, user_id, workspace_id, tags}
```

### Upstash Redis Cache

```
Keys:
- response_cache:{query_hash}:{workspace_id} → AI response
- vector_cache:{query_hash}:{workspace_id} → Page chunks
- session_context:{session_id} → Session state

TTL: 1 hour (3600 seconds)
```

---

## 🧠 Memory System

### Short-Term Memory (Session Context)
- Current workspace
- Current page/skill being discussed
- Recent conversation (last 10 messages)
- Mentioned items in conversation

### Long-Term Memory (Learning Memory)
- Topics studied per skill
- Confidence levels
- Weak areas needing review
- Study time per topic
- Quiz/flashcard performance

---

## 🎨 Mode-Specific Behavior

### ASK Mode
```
Purpose: Answer questions
Context: Workspace + Vector search + Web (if enabled)
Output: Text response + sources + suggested actions
```

### PLAN Mode
```
Purpose: Create structured plans
Context: Workspace + Tasks + Skills
Output: Plan with tasks + timeline + suggested actions
Actions: Auto-create tasks in database
```

### BUILD Mode
```
Purpose: Create learning objects
Context: Page content + Skill data
Output: Quiz/Flashcards created + navigation actions
Actions: 
  - Create quiz in database
  - Create flashcard deck
  - Link to page + skill
  - Update knowledge graph
  - Return object IDs + routes
```

---

## 🔌 API Endpoints

```
POST /api/v1/ai/query
  → Main query endpoint (all modes)

GET /api/v1/ai/models
  → List available AI models

POST /api/v1/ai/infer-connections/{page_id}
  → Infer knowledge graph connections

GET /api/v1/memory/context/{session_id}
  → Get session context

GET /api/v1/memory/learning/{workspace_id}
  → Get learning memory

GET /api/v1/cache/stats/{workspace_id}
  → Get cache statistics

POST /api/v1/cache/clear
  → Clear expired cache
```

---

## 📦 Key Dependencies

```python
# Backend (requirements.txt)
fastapi==0.115.0
langchain==0.3.13
langchain-openai==0.2.0
langgraph==0.2.45
openai==1.99.6
supabase==2.10.0
httpx==0.27.2
```

```json
// Frontend (package.json)
"react": "^18.x",
"framer-motion": "^11.x",
"@tanstack/react-query": "^5.x",
"axios": "^1.x"
```

---

## 🚀 Performance Optimizations

1. **Response Caching** - Cache AI responses for 1 hour
2. **Vector Caching** - Cache vector search results
3. **Streaming** - Stream responses for better UX
4. **Workspace Isolation** - Filter all queries by workspace
5. **Lazy Loading** - Load conversation history on demand
6. **Debouncing** - Debounce user input
7. **Parallel Requests** - Fetch workspace data in parallel

---

## 🔒 Security Features

1. **Authentication** - Supabase Auth (JWT tokens)
2. **Row-Level Security** - All tables have RLS policies
3. **Workspace Isolation** - Users only see their workspace data
4. **API Key Protection** - Keys stored in .env, never exposed
5. **Input Validation** - Pydantic models validate all inputs
6. **Rate Limiting** - API rate limits (future)

---

This is the complete architecture of your Ask Anything system!
