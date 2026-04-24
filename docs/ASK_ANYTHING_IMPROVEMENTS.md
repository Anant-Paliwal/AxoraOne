# Ask Anything Page Improvements

## Issues Fixed

### 1. ✅ Clickable Sources
**Problem:** Sources displayed at the bottom were not clickable.

**Solution:** 
- Added `onClick` handler to source cards
- Added `handleSourceClick` function that:
  - Navigates to page editor for page sources: `/pages/{id}`
  - Opens web sources in new tab for web search results
- Added proper icon differentiation (FileText for pages, ExternalLink for web)

### 2. ✅ Functional Suggested Actions
**Problem:** Suggested action buttons at the bottom did nothing when clicked.

**Solution:**
- Added `onClick` handler to action buttons
- Added `handleSuggestedAction` function that handles different actions:
  - "View related pages" → Navigate to `/pages`
  - "Visualize in knowledge graph" → Navigate to `/graph`
  - "Explain in detail" → Switch to explain mode and re-run query
  - "Create a plan" → Switch to plan mode and re-run query
  - "Save as new page" → Navigate to `/pages/new`
  - "Create tasks" → Navigate to `/tasks`
  - Other actions → Show toast notification

### 3. ✅ Chat History Title Auto-Generation
**Problem:** Chat history showed "Untitled Chat" or "New Chat" instead of meaningful titles.

**Solution:**
- Backend already has logic to auto-generate title from first user message
- The title is automatically set to the first 50 characters of the first user message
- This happens in `add_message_to_session` endpoint when:
  - It's the first message (length == 1)
  - The message role is "user"
  - Current title is "New Chat"

### 4. ✅ Chat Messages Saving
**Problem:** Messages weren't being saved properly to chat history.

**Solution:**
- The code already saves messages correctly via `api.addMessageToSession()`
- Both user and assistant messages are saved with:
  - Role (user/assistant)
  - Content
  - Timestamp
  - Sources (for assistant messages)
  - Model used

## Code Changes

### Frontend (`src/pages/AskAnything.tsx`)

1. **Added imports:**
```typescript
import { useNavigate } from 'react-router-dom';
```

2. **Added navigation hook:**
```typescript
const navigate = useNavigate();
```

3. **Added handler functions:**
```typescript
const handleSourceClick = (source: any) => {
  if (source.type === 'page') {
    navigate(`/pages/${source.id}`);
  } else if (source.type === 'web') {
    window.open(source.url, '_blank');
  }
};

const handleSuggestedAction = (action: string) => {
  // Handles various action types with appropriate navigation or mode changes
};
```

4. **Updated source cards:**
- Added `onClick={() => handleSourceClick(source)}`
- Added conditional icon rendering based on source type

5. **Updated action buttons:**
- Added `onClick={() => handleSuggestedAction(action)}`
- Changed string matching to use `.toLowerCase()` for case-insensitive matching

### Backend (No changes needed)
The backend already had all the necessary functionality:
- Auto-title generation in `chat_sessions.py`
- Message saving with all metadata
- Proper workspace isolation

## Testing

1. **Test Sources:**
   - Ask a question that returns page sources
   - Click on a source card
   - Verify it navigates to the page editor

2. **Test Web Sources:**
   - Set scope to "Web Search"
   - Ask a question
   - Click on a web source
   - Verify it opens in a new tab

3. **Test Suggested Actions:**
   - Ask a question in different modes
   - Click on suggested action buttons
   - Verify appropriate navigation or mode changes

4. **Test Chat History:**
   - Create a new chat
   - Send a message
   - Check history sidebar
   - Verify the title shows the first message content (truncated to 50 chars)

5. **Test Message Persistence:**
   - Send multiple messages in a chat
   - Reload the page
   - Load the chat from history
   - Verify all messages are preserved

## User Experience Improvements

- Sources are now interactive and lead to actual content
- Suggested actions provide quick navigation to related features
- Chat history shows meaningful titles instead of generic names
- All conversations are properly saved and can be resumed
- Smooth navigation between different parts of the app
