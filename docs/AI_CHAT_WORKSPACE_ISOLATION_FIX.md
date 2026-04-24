# AI Chat Workspace Isolation Fix

## Problem
When using the "Ask Anything" feature, the AI was showing sources (pages) from ALL workspaces, not just the current workspace. This broke workspace isolation.

## Root Cause
The issue was in the AI agent's vector store search:

1. **Frontend** was correctly sending `workspace_id` ✅
2. **Backend endpoint** was correctly receiving `workspace_id` ✅  
3. **AI agent service** was receiving `workspace_id` ✅
4. **BUT** the vector store search wasn't filtering by `workspace_id` ❌

Additionally, when pages were added to the vector store, the `workspace_id` wasn't being included in the metadata.

## Changes Made

### 1. AI Agent Service (`backend/app/services/ai_agent.py`)
Updated `_retrieve_vector_context` method to pass `workspace_id` to the vector store search:

```python
results = await vector_store_service.search_pages(
    state["query"], 
    limit=5,
    workspace_id=workspace_id  # Now passes workspace_id
)
```

### 2. Vector Store Service (`backend/app/services/vector_store.py`)
Updated `search_pages` method to filter results by `workspace_id`:

```python
async def search_pages(self, query: str, limit: int = 10, workspace_id: str = None):
    # ... search logic ...
    
    for i, idx in enumerate(indices[0]):
        if idx < len(self.documents['pages']):
            doc = self.documents['pages'][idx]
            
            # Filter by workspace_id if provided
            if workspace_id and doc["metadata"].get("workspace_id") != workspace_id:
                continue
            
            results.append(...)
```

### 3. Pages Endpoint (`backend/app/api/endpoints/pages.py`)
Updated both create and update operations to include `workspace_id` in vector store metadata:

**Create:**
```python
metadata={
    "title": page.title,
    "tags": page.tags,
    "user_id": user_id,
    "workspace_id": page_result.get("workspace_id")  # Added
}
```

**Update:**
```python
metadata={
    "title": page_data["title"],
    "tags": page_data["tags"],
    "user_id": user_id,
    "workspace_id": page_data.get("workspace_id")  # Added
}
```

## Testing
After restarting the backend:

1. Create pages in different workspaces
2. Switch to a specific workspace
3. Use "Ask Anything" to search
4. Verify that only pages from the current workspace appear in the sources

## Notes
- The fix maintains backward compatibility - if no `workspace_id` is provided, all pages are searched (existing behavior)
- Web search results are not affected by workspace filtering (as expected)
- Existing pages in the vector store will need to be re-indexed to include `workspace_id` in metadata
