# Fix Agent Intent Detection

## 🔴 Problem from Screenshot

User is in Agent mode and asks something like:
- "write about Python"
- "explain Python"  
- "tell me about Python"

**Expected:** Create a subpage about Python
**Actual:** Generates content in chat (not creating a subpage)

## 🎯 Root Cause

The agent has two competing patterns:

1. **Subpage creation** (lines 615-695)
   - Triggers: "create subpage", "add subpage", "subpage about"
   
2. **Content generation** (lines 697-735)
   - Triggers: "write about", "explain", "tell me about"

When user says "write about Python" in Agent mode:
- ❌ Doesn't match subpage patterns
- ✅ Matches content generation patterns
- Result: Generates content instead of creating subpage

## ✅ Solution

### Option 1: Context-Aware Intent Detection

When in **Agent mode** with a **current page open**, assume user wants to create a subpage, not generate content.

```python
# Add at the beginning of process_goal (after line 450)

# ============ AGENT MODE CONTEXT-AWARE DETECTION ============
# If user is in Agent mode with a page open, they likely want to create a subpage
# not just generate content in chat
if mode == "agent" and current_page_id:
    # Check if user is asking about a topic (not explicitly asking for content generation)
    topic_indicators = [
        "write about", "explain", "tell me about", "describe",
        "create about", "make about", "add about", "for"
    ]
    
    # Check if it's a simple topic request
    is_topic_request = any(indicator in goal_lower for indicator in topic_indicators)
    
    # Check if user explicitly wants content insertion (not a subpage)
    wants_insertion = any(phrase in goal_lower for phrase in [
        "insert", "add to this page", "add here", "put here",
        "add content to", "insert into", "append to"
    ])
    
    if is_topic_request and not wants_insertion:
        # Extract topic
        topic = goal
        for indicator in topic_indicators:
            if indicator in goal_lower:
                parts = goal_lower.split(indicator, 1)
                if len(parts) > 1:
                    topic = parts[1].strip()
                    break
        
        # Clean topic
        topic = topic.replace('the current page', '').replace('this page', '').strip()
        
        if topic and len(topic) > 2:
            # Redirect to subpage creation
            logger.info(f"🎯 Agent mode + page open + topic request → Creating subpage about: {topic}")
            goal = f"create subpage about {topic}"
            goal_lower = goal.lower()
```

### Option 2: Add Explicit Mode Check in Content Generation

```python
# Modify content generation check (line 697)

# ============ GENERATE CONTENT (for insertion) ============
# ONLY generate content if:
# 1. User explicitly wants insertion, OR
# 2. No current page is open (can't create subpage)

content_triggers = [
    "write about", "generate content", "create content", "write content",
    "explain", "describe", "tell me about", "give me", "write a",
    "create a table", "make a table", "generate a table",
    "create a list", "make a list", "generate a list",
    "add content", "add section", "add", "write", "generate"
]

# Check if user wants insertion
wants_insertion = any(phrase in goal_lower for phrase in [
    "insert", "add to this page", "add here", "put here",
    "add content to", "insert into", "append to", "add to current"
])

# Only generate content if explicitly requested OR no page is open
should_generate_content = (
    any(trigger in goal_lower for trigger in content_triggers) and
    (wants_insertion or not current_page_id)
)

if should_generate_content:
    # ... existing content generation code
```

### Option 3: Improve Subpage Detection Patterns

```python
# Expand subpage detection (line 615)

if any(phrase in goal_lower for phrase in [
    # Explicit subpage creation
    "create subpage", "add subpage", "new subpage", "create a subpage",
    "add child page", "create child page", "next chapter", "continue", "next topic",
    "subpage about", "subpage for", "subpage on", "subpage related",
    "child page about", "child page for", "sub page about", "sub page for",
    
    # Implicit subpage creation (when page is open in agent mode)
    # These should create subpages, not generate content
]) or (
    # If in agent mode with page open and asking about a topic
    mode == "agent" and current_page_id and any(phrase in goal_lower for phrase in [
        "write about", "explain", "tell me about", "describe",
        "create about", "make about", "add about"
    ]) and not any(phrase in goal_lower for phrase in [
        "insert", "add to this", "add here", "put here"
    ])
):
```

## 🎯 Recommended Fix

Use **Option 1** - it's the cleanest and most intuitive. When user is in Agent mode with a page open, assume they want to create a subpage unless they explicitly say "insert" or "add to this page".

## 📝 Implementation

I'll apply Option 1 to the agentic_agent.py file.
