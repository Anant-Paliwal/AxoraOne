# Agent Real-Time Status Updates - Implementation Guide

## 🎯 What You Want

Show real-time status updates in the frontend like other AI agents:

```
🤔 Thinking...
🔍 Searching workspace...
📚 Found 5 relevant pages
🧠 Generating response...
✅ Done!
```

---

## 📊 How Your Current Agent Works (LangGraph Flow)

### Current Architecture

```
User Query
    ↓
Backend API (/api/v1/ai/query)
    ↓
LangGraph StateGraph (5 nodes executed sequentially)
    ↓
    Node 1: retrieve_workspace_context
    ├─ Fetch pages from Supabase
    ├─ Fetch skills from Supabase
    ├─ Fetch tasks from Supabase
    ├─ Fetch mentioned items
    └─ Get weak areas
    
    Node 2: retrieve_vector_context
    ├─ IF scope == "web": Call Brave Search
    └─ ELSE: Search Upstash Vector DB
    
    Node 3: generate_response
    ├─ Build context
    ├─ Create system prompt
    └─ Call LLM (OpenAI/OpenRouter)
    
    Node 4: execute_actions
    ├─ IF mode == "plan": Create tasks
    └─ IF mode == "build": Create pages/skills/tasks/quizzes
    
    Node 5: suggest_actions
    └─ Generate suggested action buttons
    ↓
Return complete response to frontend
```

### Current Problem

**Backend:** Processes everything silently, returns only final result
**Frontend:** Shows loading spinner, no intermediate updates

```
User clicks Send
    ↓
Frontend: [Loading spinner...]
    ↓
Backend: [Silent processing for 5-10 seconds]
    ↓
Frontend: [Shows complete response]
```

---

## 🔄 How to Add Real-Time Status Updates

### Option 1: Server-Sent Events (SSE) - RECOMMENDED

**What it is:** Backend streams status updates to frontend in real-time

**Flow:**
```
User Query
    ↓
Backend opens SSE stream
    ↓
Node 1: Send "🔍 Searching workspace..."
    ↓
Node 2: Send "📚 Found 5 pages"
    ↓
Node 3: Send "🧠 Generating response..."
    ↓
Node 4: Send "✅ Creating tasks..."
    ↓
Node 5: Send "✨ Done!"
    ↓
Close stream
```

**Implementation:**

#### Backend Changes

**File:** `backend/app/api/endpoints/ai_chat.py`

```python
from fastapi.responses import StreamingResponse
import json
import asyncio

@router.post("/query/stream")
async def process_query_stream(
    request: QueryRequest,
    user_id: str = Depends(get_current_user)
):
    """Stream query processing with real-time status updates"""
    
    async def event_generator():
        try:
            # Send initial status
            yield f"data: {json.dumps({'type': 'status', 'message': '🤔 Starting...'})}\n\n"
            
            # Node 1: Workspace context
            yield f"data: {json.dumps({'type': 'status', 'message': '🔍 Searching workspace...'})}\n\n"
            await asyncio.sleep(0.1)  # Allow frontend to update
            
            # Fetch workspace data
            workspace_data = await fetch_workspace_context(user_id, request.workspace_id)
            
            yield f"data: {json.dumps({
                'type': 'status', 
                'message': f'📚 Found {len(workspace_data[\"pages\"])} pages, {len(workspace_data[\"skills\"])} skills'
            })}\n\n"
            
            # Node 2: Vector search
            if request.scope == "web":
                yield f"data: {json.dumps({'type': 'status', 'message': '🌐 Searching web...'})}\n\n"
            else:
                yield f"data: {json.dumps({'type': 'status', 'message': '🔎 Searching knowledge base...'})}\n\n"
            
            vector_results = await search_vector_db(request.query, request.workspace_id)
            
            yield f"data: {json.dumps({
                'type': 'status',
                'message': f'✅ Found {len(vector_results)} relevant documents'
            })}\n\n"
            
            # Node 3: Generate response
            yield f"data: {json.dumps({'type': 'status', 'message': '🧠 Generating response...'})}\n\n"
            
            response = await ai_agent_service.process_query(
                query=request.query,
                user_id=user_id,
                mode=request.mode,
                scope=request.scope,
                workspace_id=request.workspace_id,
                model=request.model
            )
            
            # Node 4: Execute actions
            if request.mode == "plan":
                yield f"data: {json.dumps({'type': 'status', 'message': '📋 Creating tasks...'})}\n\n"
            elif request.mode == "build":
                yield f"data: {json.dumps({'type': 'status', 'message': '🔨 Building content...'})}\n\n"
            
            # Send final response
            yield f"data: {json.dumps({
                'type': 'response',
                'data': response
            })}\n\n"
            
            # Send completion
            yield f"data: {json.dumps({'type': 'status', 'message': '✨ Done!'})}\n\n"
            yield "data: [DONE]\n\n"
            
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )
```

#### Frontend Changes

**File:** `src/pages/AskAnything.tsx`

```typescript
const [agentStatus, setAgentStatus] = useState<string>('');
const [statusHistory, setStatusHistory] = useState<string[]>([]);

const handleSearchWithStatus = async () => {
  if (!query.trim()) return;
  
  setIsLoading(true);
  setAgentStatus('🤔 Starting...');
  setStatusHistory([]);
  
  try {
    // Use EventSource for SSE
    const eventSource = new EventSource(
      `/api/v1/ai/query/stream?query=${encodeURIComponent(query)}&mode=${mode}&scope=${scope}`
    );
    
    eventSource.onmessage = (event) => {
      if (event.data === '[DONE]') {
        eventSource.close();
        setIsLoading(false);
        setAgentStatus('');
        return;
      }
      
      const data = JSON.parse(event.data);
      
      if (data.type === 'status') {
        setAgentStatus(data.message);
        setStatusHistory(prev => [...prev, data.message]);
      } else if (data.type === 'response') {
        setResponse(data.data);
      } else if (data.type === 'error') {
        toast.error(data.message);
        eventSource.close();
      }
    };
    
    eventSource.onerror = () => {
      eventSource.close();
      setIsLoading(false);
      toast.error('Connection lost');
    };
    
  } catch (error) {
    toast.error('Failed to process query');
    setIsLoading(false);
  }
};

// UI Component
{isLoading && (
  <div className="flex items-center gap-3 p-4 bg-secondary/50 rounded-lg">
    <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
    <span className="text-sm text-muted-foreground">{agentStatus}</span>
  </div>
)}

{/* Status History */}
{statusHistory.length > 0 && (
  <div className="space-y-1 p-3 bg-secondary/30 rounded-lg text-xs">
    {statusHistory.map((status, i) => (
      <div key={i} className="flex items-center gap-2 text-muted-foreground">
        <span className="text-primary">✓</span>
        {status}
      </div>
    ))}
  </div>
)}
```

---

### Option 2: WebSocket - More Complex

**What it is:** Bidirectional real-time communication

**When to use:** If you need two-way communication (user can cancel, agent can ask questions)

**Implementation:** Similar to SSE but uses WebSocket protocol

---

### Option 3: Polling - Simple but Less Efficient

**What it is:** Frontend repeatedly asks backend for status

**Flow:**
```
User Query → Backend starts processing
    ↓
Frontend polls every 500ms: "What's the status?"
    ↓
Backend responds: "Searching workspace..."
    ↓
Frontend polls again: "What's the status?"
    ↓
Backend responds: "Generating response..."
```

**Not recommended:** Inefficient, adds server load

---

## 🎨 Status Messages for Each Node

### Node 1: retrieve_workspace_context
```
🔍 Searching workspace...
📚 Found X pages, Y skills, Z tasks
💭 Loading conversation history...
⚠️ Identified X weak areas
```

### Node 2: retrieve_vector_context
```
# If scope == "web"
🌐 Searching web...
🔗 Found X web results

# If scope == "pages/kb"
🔎 Searching knowledge base...
📄 Found X relevant documents
```

### Node 3: generate_response
```
🧠 Generating response...
💬 Using model: GPT-4o Mini
✍️ Writing answer...
```

### Node 4: execute_actions (PLAN mode)
```
📋 Analyzing plan...
✅ Creating task 1/5...
✅ Creating task 2/5...
✅ Creating task 3/5...
✅ Created 5 tasks
```

### Node 4: execute_actions (BUILD mode)
```
🔨 Building content...
📄 Creating page: "Python Basics"
⭐ Creating skill: "Python"
✅ Creating task: "Practice loops"
📝 Creating quiz: "Python Quiz"
🎴 Creating flashcard deck...
✨ Created 5 items
```

### Node 5: suggest_actions
```
💡 Generating suggestions...
✨ Done!
```

---

## 📊 Complete Flow Visualization

### Current (No Status Updates)
```
User: "Plan to learn Python"
    ↓
[Loading spinner for 8 seconds...]
    ↓
Response: "Here's your plan... ✅ Created 5 tasks"
```

### With Status Updates (SSE)
```
User: "Plan to learn Python"
    ↓
🤔 Starting...
    ↓
🔍 Searching workspace...
    ↓
📚 Found 10 pages, 5 skills, 3 tasks
    ↓
🔎 Searching knowledge base...
    ↓
📄 Found 3 relevant documents
    ↓
🧠 Generating response...
    ↓
💬 Using model: GPT-4o Mini
    ↓
📋 Creating tasks...
    ↓
✅ Creating task 1/5: "Learn Python basics"
✅ Creating task 2/5: "Practice data structures"
✅ Creating task 3/5: "Build a project"
✅ Creating task 4/5: "Study algorithms"
✅ Creating task 5/5: "Create portfolio"
    ↓
💡 Generating suggestions...
    ↓
✨ Done!
    ↓
Response: "Here's your plan... ✅ Created 5 tasks"
```

---

## 🔧 Implementation Steps (No Code Changes Yet)

### Step 1: Modify LangGraph Nodes to Emit Events

**Current:**
```python
async def _retrieve_workspace_context(self, state: AgentState) -> AgentState:
    # Fetch data silently
    pages = fetch_pages()
    return state
```

**With Events:**
```python
async def _retrieve_workspace_context(self, state: AgentState) -> AgentState:
    # Emit status
    await self.emit_status("🔍 Searching workspace...")
    
    # Fetch data
    pages = fetch_pages()
    
    # Emit result
    await self.emit_status(f"📚 Found {len(pages)} pages")
    
    return state
```

### Step 2: Add Event Emitter to AIAgentService

```python
class AIAgentService:
    def __init__(self):
        self.llm = ChatOpenAI(...)
        self.graph = self._build_graph()
        self.status_callback = None  # For emitting status
    
    async def emit_status(self, message: str):
        """Emit status update to frontend"""
        if self.status_callback:
            await self.status_callback(message)
    
    def set_status_callback(self, callback):
        """Set callback for status updates"""
        self.status_callback = callback
```

### Step 3: Create Streaming Endpoint

```python
@router.post("/query/stream")
async def process_query_stream(...):
    async def event_generator():
        # Set callback to emit status
        def status_callback(message):
            yield f"data: {json.dumps({'type': 'status', 'message': message})}\n\n"
        
        ai_agent_service.set_status_callback(status_callback)
        
        # Process query
        result = await ai_agent_service.process_query(...)
        
        # Send final response
        yield f"data: {json.dumps({'type': 'response', 'data': result})}\n\n"
    
    return StreamingResponse(event_generator(), media_type="text/event-stream")
```

### Step 4: Update Frontend to Use SSE

```typescript
// Use EventSource instead of fetch
const eventSource = new EventSource('/api/v1/ai/query/stream');

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  if (data.type === 'status') {
    setAgentStatus(data.message);  // Show in UI
  } else if (data.type === 'response') {
    setResponse(data.data);  // Show final response
  }
};
```

---

## 🎯 Benefits of Real-Time Status

### User Experience
- ✅ User knows what's happening
- ✅ Reduces perceived wait time
- ✅ Builds trust (transparency)
- ✅ Looks professional

### Debugging
- ✅ See where agent gets stuck
- ✅ Identify slow operations
- ✅ Better error messages

### Engagement
- ✅ User stays engaged during wait
- ✅ Can see progress (e.g., "Creating task 3/5")
- ✅ Feels more interactive

---

## 📊 Status Update Examples by Mode

### ASK Mode
```
🤔 Starting...
🔍 Searching workspace...
📚 Found 10 pages, 5 skills
🔎 Searching knowledge base...
📄 Found 3 relevant documents
🧠 Generating response...
💬 Using model: GPT-4o Mini
✨ Done!
```

### PLAN Mode
```
🤔 Starting...
🔍 Searching workspace...
📚 Found 10 pages, 5 skills, 3 tasks
🧠 Generating plan...
💬 Using model: GPT-4o Mini
📋 Extracting tasks from plan...
✅ Creating task 1/5: "Learn Python basics"
✅ Creating task 2/5: "Practice data structures"
✅ Creating task 3/5: "Build a project"
✅ Creating task 4/5: "Study algorithms"
✅ Creating task 5/5: "Create portfolio"
💡 Generating suggestions...
✨ Done! Created 5 tasks
```

### BUILD Mode
```
🤔 Starting...
🔍 Searching workspace...
📚 Found 10 pages, 5 skills
🔎 Searching knowledge base...
📄 Found 3 relevant documents
🧠 Generating content...
💬 Using model: GPT-4o Mini
🔨 Building content...
📄 Creating page: "Python Basics"
⭐ Creating skill: "Python Programming"
✅ Creating task: "Practice Python loops"
📝 Creating quiz: "Python Basics Quiz"
🎴 Creating flashcard deck: "Python Terms"
🔗 Linking to knowledge graph...
💡 Generating suggestions...
✨ Done! Created 5 items
```

---

## 🚀 Summary

### Current System
- ❌ No real-time updates
- ❌ User sees only loading spinner
- ❌ No visibility into agent process

### With Status Updates
- ✅ Real-time status messages
- ✅ User sees each step
- ✅ Progress indicators
- ✅ Professional UX

### Implementation Approach
1. **Backend:** Add SSE endpoint with status emissions
2. **LangGraph:** Emit status at each node
3. **Frontend:** Use EventSource to receive updates
4. **UI:** Display status messages with icons

### Effort Required
- **Backend:** 2-3 hours (add SSE, modify nodes)
- **Frontend:** 1-2 hours (EventSource, UI components)
- **Testing:** 1 hour
- **Total:** ~5-6 hours

---

## 🎨 UI Design Mockup

```
┌─────────────────────────────────────────────────────────┐
│  Ask Anything                                           │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  [Input: "Plan to learn Python"]  [Send]               │
│                                                         │
│  ┌───────────────────────────────────────────────────┐ │
│  │ 🤔 Agent Status                                   │ │
│  │                                                   │ │
│  │ ✓ 🔍 Searching workspace...                      │ │
│  │ ✓ 📚 Found 10 pages, 5 skills                    │ │
│  │ ✓ 🧠 Generating plan...                          │ │
│  │ → 📋 Creating tasks... (3/5)                     │ │
│  │                                                   │ │
│  │ [Progress bar: 60%]                              │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**This is how you add real-time status updates like other AI agents!** 🎉

Would you like me to implement this feature?
