# Ask Anything @ Mentions Feature

## Overview

The @ mention system in Ask Anything allows users to reference specific workspace items (pages, tasks, skills, workspaces) directly in their queries for more contextual and precise AI responses.

## How It Works

### User Experience

1. **Type @ in the input field**
   - A dropdown appears showing available items to mention
   - Items are grouped by type: Workspaces, Pages, Tasks, Skills

2. **Filter by type (optional)**
   - `@page:` or `@p:` - Show only pages
   - `@task:` or `@t:` - Show only tasks
   - `@skill:` or `@s:` - Show only skills
   - `@workspace:` or `@w:` - Show only workspaces

3. **Search and select**
   - Type to filter items by name
   - Click to insert the mention
   - Multiple mentions can be added to one query

### Example Queries

```
"Summarize @SQL Basics and create a quiz"
"What tasks are related to @Data Analytics skill?"
"Create flashcards from @page:Python Functions"
"Compare @Machine Learning and @Deep Learning skills"
"What's the status of @task:Complete Project?"
```

## Technical Implementation

### Frontend (AskAnything.tsx)

**State Management:**
```typescript
const [showMentions, setShowMentions] = useState(false);
const [mentionType, setMentionType] = useState<'workspace' | 'page' | 'task' | 'skill' | null>(null);
const [mentionSearch, setMentionSearch] = useState('');
const [mentionedItems, setMentionedItems] = useState<Array<{type: string, id: string, name: string}>>([]);
```

**Data Loading:**
- Pages, tasks, and skills are loaded when workspace changes
- Filtered based on current workspace context
- Up to 5 items per type shown in dropdown

**Mention Detection:**
- Detects `@` character in input
- Parses optional type prefix (`page:`, `task:`, etc.)
- Shows filtered dropdown with matching items
- Tracks mentioned items in state

**API Integration:**
```typescript
const result = await api.query(
  userQuery, 
  mode, 
  scope, 
  selectedModel, 
  workspaceId, 
  mentionedItems  // [{type, id, name}]
);
```

### Backend (ai_chat.py & ai_agent.py)

**Request Model:**
```python
class QueryRequest(BaseModel):
    query: str
    mode: str = "ask"
    scope: str = "all"
    workspace_id: Optional[str] = None
    mentioned_items: Optional[List[Dict[str, str]]] = None  # [{type, id, name}]
```

**Context Retrieval:**
- Mentioned items are fetched with full details from database
- Added to `workspace_context["mentioned"]`
- Prioritized in AI prompt

**AI Prompt Enhancement:**
```
=== 🎯 MENTIONED ITEMS (User is asking about these specifically) ===

📄 PAGE: SQL Basics
   Tags: database, tutorial
   Content: SQL (Structured Query Language) is...

⚠️ IMPORTANT: The user's question is specifically about the items mentioned above.
Focus your answer on these items. Use their full content in your response.
```

## Benefits

### 1. **Precise Context**
- AI knows exactly which items the user is referring to
- No ambiguity in queries like "summarize this page"

### 2. **Cross-Workspace Queries**
- Mention items from different workspaces
- Compare and relate content across workspace boundaries

### 3. **Better Responses**
- Full content of mentioned items included in prompt
- AI can reference specific details accurately
- Reduces hallucination

### 4. **Improved UX**
- Autocomplete makes it easy to find items
- Visual feedback shows what's mentioned
- Type prefixes for quick filtering

## Architecture Alignment

This feature follows the **Ask Anything Architecture** principles:

✅ **Control Layer**: Mentions provide context for AI to create objects
✅ **No UI Rendering**: AI doesn't render mentioned items, just uses them as context
✅ **Object Creation**: In BUILD mode, mentioned items inform what to create
✅ **Workspace Scoped**: All mentions respect workspace isolation

## Use Cases

### Learning & Review
```
"Create a quiz from @Python Basics"
"Generate flashcards for @Data Structures skill"
"Explain @Recursion page in simple terms"
```

### Task Management
```
"What's blocking @task:Deploy API?"
"Create subtasks for @Complete Migration"
"Link @Database Design skill to @Schema Task"
```

### Knowledge Synthesis
```
"Compare @React and @Vue pages"
"How does @Authentication relate to @Security skill?"
"Summarize all pages tagged with @machine-learning"
```

### Content Creation
```
"Create a page combining @Topic A and @Topic B"
"Build a learning path from @Beginner SQL to @Advanced SQL"
"Generate practice tasks for @JavaScript skill"
```

## Future Enhancements

### Planned Features
1. **Tag Mentions**: `@tag:machine-learning` to reference all items with that tag
2. **Date Mentions**: `@today`, `@this-week` for temporal queries
3. **Smart Suggestions**: AI suggests relevant items to mention
4. **Mention History**: Recently mentioned items for quick access
5. **Bulk Mentions**: `@all-pages`, `@all-tasks` for workspace-wide queries

### Advanced Capabilities
- **Mention Relationships**: Show connections between mentioned items
- **Mention Analytics**: Track which items are mentioned most
- **Mention Templates**: Save common mention patterns
- **Cross-Reference**: Automatically link mentioned items in responses

## Testing

### Manual Testing Checklist
- [ ] Type `@` shows dropdown
- [ ] Type `@page:` filters to pages only
- [ ] Search filters items correctly
- [ ] Click inserts mention into input
- [ ] Multiple mentions work
- [ ] Mentioned items sent to backend
- [ ] AI response uses mentioned context
- [ ] Works in all modes (ask, explain, plan, build)

### Test Queries
```
"Summarize @[YourPage]"
"Create tasks for @[YourSkill]"
"What's the status of @[YourTask]?"
"Compare @[Page1] and @[Page2]"
```

## Troubleshooting

### Dropdown Not Showing
- Check if workspace has items (pages, tasks, skills)
- Verify `@` is typed with space before or at start
- Check console for data loading errors

### Mentioned Items Not Used
- Verify `mentioned_items` sent in API request
- Check backend logs for context retrieval
- Ensure items belong to accessible workspace

### Wrong Items Shown
- Check workspace context is correct
- Verify RLS policies allow access
- Ensure items are not deleted

## Summary

The @ mention system transforms Ask Anything from a generic chatbot into a **workspace-aware intelligence engine** that understands exactly what you're asking about. It's the bridge between natural language queries and structured workspace data.
