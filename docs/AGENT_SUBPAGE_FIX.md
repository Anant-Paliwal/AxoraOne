# Agent Subpage Creation Issue & Fix

## Problem

When users ask the AI agent to "create a subpage", the agent automatically generates content instead of creating an empty subpage. This is not what users expect.

**Example:**
- User: "Create a subpage called 'Introduction'"
- Current behavior: Creates subpage WITH auto-generated content
- Expected behavior: Creates EMPTY subpage, user adds content manually

## Root Cause

In `backend/app/services/agentic_agent.py` (line 640):

```python
# Current code - ALWAYS generates content
initial_blocks = await self._generate_continuation_content(next_title, parent_page, subpage_titles, goal)

# Create subpage
subpage = await self._create_subpage(next_title, current_page_id, "", initial_blocks, user_id, workspace_id)
```

The agent calls `_generate_continuation_content()` for EVERY subpage creation, even when the user just wants an empty page.

## Solution

The agent should only generate content when explicitly requested. Update the logic to:

1. **Check user intent** - Does the query ask for content generation?
2. **Create empty by default** - If no content requested, create empty subpage
3. **Generate only when asked** - Only call `_generate_continuation_content()` if user asks for it

### Detection Keywords

**Generate content:**
- "create subpage with content about..."
- "add subpage and write about..."
- "create subpage explaining..."
- "generate subpage for..."
- "fill subpage with..."

**Empty subpage (default):**
- "create subpage"
- "add subpage"
- "new subpage called..."
- "create empty subpage"

## Recommended Fix

```python
# In agentic_agent.py, around line 615-642

# Check if user wants content generation
wants_content = any(phrase in goal_lower for phrase in [
    "with content", "write about", "explaining", "generate", 
    "fill with", "add content", "create content"
])

if wants_content:
    # Generate content as before
    initial_blocks = await self._generate_continuation_content(
        next_title, parent_page, subpage_titles, goal
    )
else:
    # Create empty subpage
    initial_blocks = [{
        "id": f"text-{int(time.time() * 1000)}",
        "type": "text",
        "position": 0,
        "data": {"content": ""}
    }]

# Create subpage
subpage = await self._create_subpage(
    next_title, current_page_id, "", initial_blocks, 
    user_id, workspace_id
)
```

## Benefits

1. **Faster response** - No AI generation delay for simple subpage creation
2. **User control** - Users decide what content to add
3. **Better UX** - Matches user expectations
4. **Cost savings** - Fewer unnecessary AI API calls

## Testing

After fix, test these scenarios:

1. ✅ "Create subpage called Introduction" → Empty subpage
2. ✅ "Add subpage for Chapter 2" → Empty subpage
3. ✅ "Create subpage with content about Python basics" → Generated content
4. ✅ "New subpage explaining SQL" → Generated content

## Alternative Approach

Add a confirmation step:

```
User: "Create subpage called Introduction"
Agent: "Created empty subpage 'Introduction'. Would you like me to generate content for it?"
User: "Yes" → Generate content
User: "No" → Keep empty
```

This gives users explicit control over content generation.
