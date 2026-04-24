# Task Sources - Technical Implementation Details

## Database Schema

### Tasks Table Structure
```sql
CREATE TABLE tasks (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  workspace_id UUID REFERENCES workspaces(id),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending',
  priority TEXT DEFAULT 'medium',
  due_date TIMESTAMPTZ,
  linked_page_id UUID REFERENCES pages(id) ON DELETE SET NULL,
  linked_skill_id UUID REFERENCES skills(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Key Relationships
- `linked_page_id` → Links to learning content (tutorials, guides, notes)
- `linked_skill_id` → Links to skill being developed
- Both use `ON DELETE SET NULL` (task remains if page/skill deleted)

## Backend Implementation

### 1. Context Gatherer Service

**File:** `backend/app/services/context_gatherer.py`

#### Enhanced Task Fetching
```python
async def _get_relevant_tasks(
    self, 
    user_id: str, 
    workspace_id: str, 
    keywords: List[str],
    limit: int
) -> List[Dict[str, Any]]:
    """Get tasks with linked sources using Supabase joins"""
    
    # Fetch with joins
    response = supabase_admin.table("tasks").select(
        "id, title, description, status, priority, due_date, created_at, "
        "linked_page_id, linked_skill_id, "
        "linked_page:pages!tasks_linked_page_id_fkey(id, title, content), "
        "linked_skill:skills!tasks_linked_skill_id_fkey(id, name, description)"
    ).eq("workspace_id", workspace_id).eq("user_id", user_id).limit(50).execute()
    
    tasks = response.data or []
    
    # Score with linked content
    for task in tasks:
        score = self._calculate_item_relevance(task, keywords, ["title", "description"])
        
        # Boost for linked page relevance
        if task.get("linked_page"):
            page_score = self._calculate_item_relevance(
                task["linked_page"], keywords, ["title", "content"]
            )
            score += page_score * 0.5  # 50% weight
        
        # Boost for linked skill relevance
        if task.get("linked_skill"):
            skill_score = self._calculate_item_relevance(
                task["linked_skill"], keywords, ["name", "description"]
            )
            score += skill_score * 0.3  # 30% weight
        
        task["_relevance_score"] = score
    
    return sorted(tasks, key=lambda x: x.get("_relevance_score", 0), reverse=True)[:limit]
```

#### Supabase Join Syntax
```python
# Foreign key relationship syntax:
"linked_page:pages!tasks_linked_page_id_fkey(id, title, content)"
#     ↑         ↑              ↑                    ↑
#   alias    table      foreign key name      columns to fetch
```

### 2. Enhanced AI Agent

**File:** `backend/app/services/enhanced_ai_agent.py`

#### Context Building
```python
def _build_user_message(self, query: str, intent: DetectedIntent, context: GatheredContext) -> str:
    """Build context with task sources"""
    
    message_parts = [query]
    
    # Add mentioned tasks with sources
    for item in context.mentioned_items:
        if item.get('type') == 'task':
            task_data = item.get('data', {})
            task_info = f"- Task '{task_data.get('title')}' (Status: {task_data.get('status')})"
            
            if task_data.get("linked_page"):
                task_info += f"\n  → Linked to page: {task_data['linked_page'].get('title')}"
            
            if task_data.get("linked_skill"):
                task_info += f"\n  → Linked to skill: {task_data['linked_skill'].get('name')}"
            
            message_parts.append(task_info)
    
    # Add relevant tasks section
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
```

#### Source Extraction
```python
def _extract_sources(self, context: GatheredContext) -> List[Dict]:
    """Extract all sources including task-linked content"""
    
    sources = []
    
    # Add tasks as sources
    for task in context.relevant_tasks[:5]:
        sources.append({
            "type": "task",
            "id": task.get("id"),
            "title": task.get("title"),
            "source": "workspace",
            "relevance": task.get("_relevance_score", 0)
        })
        
        # Add linked page
        if task.get("linked_page"):
            sources.append({
                "type": "page",
                "id": task["linked_page"].get("id"),
                "title": task["linked_page"].get("title"),
                "source": "workspace",
                "linked_from": "task"  # Mark as linked
            })
        
        # Add linked skill
        if task.get("linked_skill"):
            sources.append({
                "type": "skill",
                "id": task["linked_skill"].get("id"),
                "title": task["linked_skill"].get("name"),
                "source": "workspace",
                "linked_from": "task"  # Mark as linked
            })
    
    return sources
```

## Frontend Implementation

### 1. FloatingAskAnything Component

**File:** `src/components/FloatingAskAnything.tsx`

#### Source Configuration
```typescript
const availableSources = [
  { id: 'web', label: 'Web', icon: ExternalLink, description: 'Search the internet' },
  { id: 'pages', label: 'Pages', icon: FileText, description: 'Your workspace pages' },
  { id: 'skills', label: 'Skills', icon: Brain, description: 'Your tracked skills' },
  { id: 'tasks', label: 'Tasks', icon: ListTodo, description: 'Your tasks and linked content' },
  { id: 'graph', label: 'Graph', icon: GitBranch, description: 'Knowledge connections' },
  { id: 'kb', label: 'Knowledge Base', icon: Bookmark, description: 'All workspace content' },
];

const [enabledSources, setEnabledSources] = useState<string[]>([
  'web', 'pages', 'skills', 'tasks', 'graph', 'kb'
]);
```

#### Enhanced Source Display
```typescript
{message.sources?.map((source, i) => {
  const isTask = source.type === 'task';
  const isLinkedSource = source.linked_from === 'task';
  
  return (
    <button 
      key={i}
      onClick={() => handleSourceClick(source)}
      className={cn(
        "text-xs px-2 py-0.5 rounded transition-colors flex items-center gap-1",
        isLinkedSource 
          ? "bg-primary/5 text-primary/70 hover:bg-primary/10"  // Highlighted
          : "bg-muted/50 text-muted-foreground hover:bg-muted"
      )}
      title={isLinkedSource ? 'Linked from task' : undefined}
    >
      {source.type === 'task' ? <ListTodo className="w-3 h-3" /> :
       source.type === 'skill' ? <Brain className="w-3 h-3" /> :
       source.type === 'page' ? <FileText className="w-3 h-3" /> :
       <ExternalLink className="w-3 h-3" />}
      
      <span className="truncate max-w-[100px]">{source.title}</span>
      
      {isLinkedSource && <span className="text-[10px] opacity-60">→</span>}
    </button>
  );
})}
```

### 2. AskAnything Page

**File:** `src/pages/AskAnything.tsx`

#### Source Click Handler
```typescript
const handleSourceClick = (source: any) => {
  if (source.type === 'page') {
    navigate(`/pages/${source.id}`);
  } else if (source.type === 'skill') {
    navigate(`/skills`);
  } else if (source.type === 'task') {
    navigate(`/tasks`);
  } else if (source.type === 'web') {
    window.open(source.url, '_blank');
  }
};
```

#### Enhanced Source Card Display
```typescript
{message.sources?.map((source, sourceIdx) => {
  const isLinkedSource = source.linked_from === 'task';
  
  return (
    <div
      key={`${source.id}-${sourceIdx}`}
      onClick={() => handleSourceClick(source)}
      className={cn(
        "flex items-center gap-3 border rounded-xl px-4 py-3 hover:shadow-sm transition-all cursor-pointer group",
        isLinkedSource 
          ? "bg-primary/5 border-primary/20 hover:border-primary/40"
          : "bg-card border-border hover:border-primary/30"
      )}
    >
      <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
        {source.type === 'task' ? <ListTodo className="w-4 h-4 text-primary" /> :
         source.type === 'skill' ? <Brain className="w-4 h-4 text-primary" /> :
         source.type === 'page' ? <FileText className="w-4 h-4 text-primary" /> :
         <ExternalLink className="w-4 h-4 text-primary" />}
      </div>
      
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{source.title}</p>
        <p className="text-xs text-muted-foreground capitalize">
          {source.type}
          {isLinkedSource && <span className="ml-1 opacity-60">→ from task</span>}
        </p>
      </div>
      
      <ExternalLink className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
})}
```

## Data Flow

### Complete Request Flow

```
1. User Query
   ↓
2. FloatingAskAnything / AskAnything Page
   - Collects query + mentioned items
   - Sends to backend with enabled_sources=['tasks', ...]
   ↓
3. Enhanced AI Agent (backend)
   - Calls context_gatherer.gather_context()
   ↓
4. Context Gatherer
   - Fetches tasks with Supabase joins
   - SELECT tasks + linked_page + linked_skill
   - Scores relevance (task + page + skill)
   - Returns top results
   ↓
5. Enhanced AI Agent
   - Builds context message with task sources
   - Generates AI response
   - Extracts sources (tasks + linked pages + linked skills)
   ↓
6. Response to Frontend
   {
     response: "...",
     sources: [
       { type: "task", id: "...", title: "..." },
       { type: "page", id: "...", title: "...", linked_from: "task" },
       { type: "skill", id: "...", title: "...", linked_from: "task" }
     ]
   }
   ↓
7. Frontend Display
   - Renders sources with icons
   - Highlights linked sources
   - Shows "→ from task" indicator
```

## Performance Considerations

### 1. Database Queries
- **Single query** fetches task + linked data (no N+1 problem)
- **Limit** to 50 tasks max per query
- **Indexes** on linked_page_id and linked_skill_id

### 2. Relevance Scoring
- Base score from task title/description
- Bonus score from linked page content (50% weight)
- Bonus score from linked skill (30% weight)
- Prevents irrelevant tasks from ranking high

### 3. Source Deduplication
- Checks for duplicate sources before adding
- Prevents same page appearing multiple times
- Uses `any(s.get("id") == page.get("id") for s in sources)`

### 4. Frontend Optimization
- Sources limited to 5 displayed (with "+X more" indicator)
- Lazy loading of source details
- Efficient re-renders with proper keys

## Error Handling

### Backend
```python
try:
    response = supabase_admin.table("tasks").select(...).execute()
    tasks = response.data or []
except Exception as e:
    logger.error(f"Error getting relevant tasks: {e}")
    return []  # Graceful degradation
```

### Frontend
```typescript
{message.sources?.length > 0 && (
  // Only render if sources exist
)}

// Safe navigation
source.linked_from === 'task'  // undefined is falsy
```

## Testing Checklist

- [ ] Tasks without linked sources display correctly
- [ ] Tasks with only linked page work
- [ ] Tasks with only linked skill work
- [ ] Tasks with both page and skill work
- [ ] Relevance scoring prioritizes linked content
- [ ] Source deduplication works
- [ ] Visual indicators show correctly
- [ ] Navigation from sources works
- [ ] @mention tasks fetch linked sources
- [ ] Multiple tasks in one response work
- [ ] Performance with 50+ tasks acceptable

## Future Optimizations

1. **Caching:** Cache task-source relationships
2. **Pagination:** Load sources on demand
3. **Prefetching:** Preload linked content
4. **Indexing:** Add full-text search on linked content
5. **Aggregation:** Show task statistics in sources

## Summary

The implementation uses Supabase's foreign key joins to efficiently fetch tasks with their linked sources in a single query. The backend scores relevance based on all content (task + page + skill), and the frontend displays sources with visual indicators showing the relationships. This creates a seamless experience where tasks become knowledge connectors in the workspace.
