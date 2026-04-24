# Chat History Implementation

## Overview
Added chat history functionality to the Ask Anything page using the existing `chat_sessions` table.

## What's Already Working
✅ **Sources Filtering** - The "All Sources" dropdown already works and filters by:
- All Sources
- Knowledge Base
- Pages
- Skills  
- Graph
- Web Search

The `scope` parameter is passed to the backend and properly filters results.

## New Features Added

### Backend Implementation

#### 1. Chat Sessions Endpoint (`backend/app/api/endpoints/chat_sessions.py`)
New REST API for managing chat sessions:

**Endpoints:**
- `GET /api/v1/chat-sessions` - Get all chat sessions (optionally filtered by workspace)
- `POST /api/v1/chat-sessions` - Create a new chat session
- `GET /api/v1/chat-sessions/{session_id}` - Get a specific session
- `PATCH /api/v1/chat-sessions/{session_id}` - Update session (e.g., rename)
- `DELETE /api/v1/chat-sessions/{session_id}` - Delete a session
- `POST /api/v1/chat-sessions/{session_id}/messages` - Add a message to session

**Features:**
- Automatic title generation from first message
- Stores full conversation history with timestamps
- Stores sources and model used for each response
- Workspace isolation support

#### 2. Database Migration (`add-chat-sessions-workspace.sql`)
Adds workspace support to chat_sessions:
```sql
ALTER TABLE public.chat_sessions 
ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;
```

#### 3. API Routes Updated (`backend/app/api/routes.py`)
Registered the new chat_sessions router

#### 4. Frontend API Methods (`src/lib/api.ts`)
Added methods for:
- `getChatSessions(workspaceId?)`
- `getChatSession(sessionId)`
- `createChatSession(session)`
- `updateChatSession(sessionId, updates)`
- `deleteChatSession(sessionId)`
- `addMessageToSession(sessionId, message)`

## Database Schema

### chat_sessions Table
```sql
CREATE TABLE public.chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,
  messages JSONB DEFAULT '[]',
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### Message Format (stored in JSONB)
```json
{
  "role": "user" | "assistant",
  "content": "message text",
  "timestamp": "2025-12-21T10:30:00Z",
  "sources": [
    {
      "id": "page-id",
      "title": "Page Title",
      "type": "page"
    }
  ],
  "model": "gpt-4o-mini"
}
```

## How to Use

### 1. Apply Database Migration
Run in Supabase Dashboard → SQL Editor:
```sql
-- From add-chat-sessions-workspace.sql
ALTER TABLE public.chat_sessions 
ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_chat_sessions_workspace_id ON public.chat_sessions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_workspace ON public.chat_sessions(user_id, workspace_id);
```

### 2. Restart Backend
```bash
cd backend
python -m uvicorn main:app --reload
```

### 3. Frontend Integration (Next Steps)
To add chat history UI to the Ask Anything page:

1. **Add History Sidebar** - Show list of past conversations
2. **Session Management** - Create/load/delete sessions
3. **Auto-save** - Save each Q&A to current session
4. **Session Switching** - Load previous conversations

## Example Usage

### Create a New Chat Session
```typescript
const session = await api.createChatSession({
  title: "SQL Learning Questions",
  workspace_id: currentWorkspace?.id
});
```

### Add Messages to Session
```typescript
// Add user message
await api.addMessageToSession(session.id, {
  role: "user",
  content: "What is SQL?",
  model: "gpt-4o-mini"
});

// Add AI response
await api.addMessageToSession(session.id, {
  role: "assistant",
  content: "SQL is a language for managing databases...",
  sources: [{ id: "page-1", title: "SQL Basics", type: "page" }],
  model: "gpt-4o-mini"
});
```

### Load Chat History
```typescript
const sessions = await api.getChatSessions(currentWorkspace?.id);
const session = await api.getChatSession(sessionId);
// session.messages contains full conversation
```

## Benefits

✅ **Persistent History** - All conversations are saved
✅ **Workspace Isolation** - Chats are organized by workspace
✅ **Source Tracking** - Know which sources were used for each answer
✅ **Model Tracking** - See which AI model generated each response
✅ **Auto-titling** - Sessions automatically named from first question
✅ **Full Context** - Can resume conversations with full history

## Next Steps (Frontend UI)

To complete the implementation, add to `AskAnything.tsx`:

1. **History Sidebar Component**
   - List of past chat sessions
   - Click to load a session
   - Delete button for each session

2. **Session State Management**
   - Track current session ID
   - Auto-create session on first message
   - Save each Q&A pair to session

3. **UI Enhancements**
   - "New Chat" button
   - Session rename functionality
   - Clear current chat
   - Export chat history

## Testing

1. **Create a session:**
   ```bash
   curl -X POST http://localhost:8000/api/v1/chat-sessions \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"title": "Test Chat"}'
   ```

2. **Add messages:**
   ```bash
   curl -X POST http://localhost:8000/api/v1/chat-sessions/SESSION_ID/messages \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"role": "user", "content": "Hello"}'
   ```

3. **Get sessions:**
   ```bash
   curl http://localhost:8000/api/v1/chat-sessions \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```

## Summary

✅ Backend API complete and ready
✅ Database schema supports workspace isolation
✅ Frontend API methods added
✅ Sources filtering already working
✅ Ready for UI implementation

The infrastructure is complete - just need to add the UI components to display and manage chat history!
