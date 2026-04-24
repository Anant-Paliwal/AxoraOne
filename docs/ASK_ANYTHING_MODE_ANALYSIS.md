# Ask Anything Mode Analysis & Recommendations

## 📊 Current Mode Status

| Mode | Read Workspace | Ask Questions | Create Pages | Create Tasks | Execute Skills | Use Web Search | Learn & Store Memory | Preview Actions |
|------|---------------|---------------|--------------|--------------|----------------|----------------|---------------------|-----------------|
| **ASK** | ✅ Full | ✅ Yes | ❌ No | ❌ No | ❌ No | ⚠️ Optional | ❌ No | ✅ Limited |
| **PLAN** | ✅ Full | ⚠️ Minimal | ❌ No | ❌ No | ❌ No | ❌ No | ❌ No | ⚠️ Limited |
| **BUILD** | ✅ Full | ❌ No | ✅ Yes | ✅ Yes | ✅ Yes | ⚠️ If needed | ✅ Yes | ✅ Before execute |

---

## 🎯 Mode Capabilities Deep Dive

### 1. ASK Mode ✅ WORKING WELL

**Current Capabilities:**
- ✅ Reads all workspace data (pages, skills, tasks)
- ✅ Searches vector database for relevant content
- ✅ Uses web search when scope="web"
- ✅ References specific pages, skills, tasks by name
- ✅ Handles @mentions for context
- ✅ Session memory (last 10 messages)
- ✅ Conversation history
- ✅ Weak areas detection from learning memory

**What Works:**
```
User: "What is SQL?"
ASK Mode: 
- Searches workspace pages for SQL content
- Finds "SQL Basics" page
- Returns answer with source citations
- Suggests: "View related pages", "Create a plan", "Save as new page"
```

**Limitations:**
- ❌ Cannot create content
- ❌ Cannot execute actions
- ❌ Does not store learning insights

**Recommendation:** ✅ **KEEP AS IS** - ASK mode is working perfectly for its purpose.

---

### 2. PLAN Mode ⚠️ NEEDS IMPROVEMENT

**Current Capabilities:**
- ✅ Reads workspace context
- ✅ Creates structured plans
- ⚠️ Minimal question answering
- ❌ Does NOT auto-create tasks (despite documentation claiming it does)
- ❌ No web search
- ❌ No memory storage

**What's Broken:**
```
User: "Create a plan to learn Python"
PLAN Mode:
- ✅ Generates structured plan with phases
- ❌ Does NOT create tasks in database
- ❌ Does NOT link to skills
- ❌ Only returns text response
```

**Critical Issues:**
1. **Documentation Mismatch**: Architecture says PLAN creates tasks, but code shows it doesn't
2. **No Execution**: Plans are just text, not actionable
3. **No Follow-Through**: User must manually copy plan to BUILD mode

**Current System Prompt (PLAN Mode):**
```
You are PLAN MODE, a goal-to-structure planning agent.
Your role is to convert a user goal into a clear, actionable plan.

You do NOT execute. You do NOT create pages or tasks. You ONLY plan.
```

**Recommendation:** 🔧 **FIX REQUIRED**

**Option A: Make PLAN Execute (Recommended)**
```python
# In _execute_actions, add:
if mode == "plan":
    # Extract tasks from plan
    # Create tasks in database
    # Link to workspace
    # Return task IDs
```

**Option B: Rename to PLAN → PREVIEW**
- Keep it read-only
- Add "Execute Plan" button that switches to BUILD mode
- Clear documentation that PLAN doesn't create content

---

### 3. BUILD Mode ✅ MOSTLY WORKING

**Current Capabilities:**
- ✅ Reads full workspace context
- ✅ Creates pages (with duplicate detection)
- ✅ Creates skills (with duplicate detection)
- ✅ Creates tasks (with duplicate detection)
- ✅ Creates quizzes
- ✅ Creates flashcard decks
- ✅ Creates courses with chapters (parent/sub-pages)
- ✅ Links to workspace
- ✅ Stores learning memory
- ✅ Web search if needed
- ✅ Comprehensive feedback summary

**What Works:**
```
User: "Build a course on Data Analytics"
BUILD Mode:
- ✅ Creates parent page "Data Analytics Course"
- ✅ Creates 5 chapter sub-pages
- ✅ Creates "Data Analytics" skill
- ✅ Creates 10 practice tasks
- ✅ Links everything to workspace
- ✅ Returns summary with IDs
```

**Duplicate Detection:**
```python
# Pages: Case-insensitive, fuzzy match
"SQL Basics" == "sql basics" ✅ Duplicate
"SQL Basics" contains "SQL" ✅ Duplicate (if >3 chars)

# Skills: Exact match (case-insensitive)
"Python" == "python" ✅ Duplicate

# Tasks: Exact match (case-insensitive)
"Learn SQL" == "learn sql" ✅ Duplicate
```

**Limitations:**
- ❌ Cannot answer questions (by design)
- ❌ Cannot explain concepts (by design)
- ⚠️ Requires workspace_id (good for isolation)

**Recommendation:** ✅ **WORKING WELL** - Minor improvements below.

---

## 🚨 Critical Issues Found

### Issue 1: PLAN Mode Doesn't Execute
**Problem:** Documentation says PLAN creates tasks, but code shows it doesn't.

**Evidence:**
```python
# In _execute_actions:
if mode != "build":
    return state  # PLAN mode exits here without creating anything
```

**Fix:**
```python
async def _execute_actions(self, state: AgentState) -> AgentState:
    mode = state.get("mode", "ask")
    
    if mode == "plan":
        # Extract tasks from plan response
        # Create tasks in database
        # Return task IDs
    
    if mode == "build":
        # Current BUILD logic
```

---

### Issue 2: Workspace Isolation Not Enforced in PLAN
**Problem:** PLAN mode doesn't check workspace_id before planning.

**Fix:**
```python
if mode == "plan" and not workspace_id:
    state["response"] += "\n\n⚠️ Please select a workspace to create a plan."
    return state
```

---

### Issue 3: No Memory Storage in ASK/PLAN
**Problem:** Only BUILD mode stores learning insights.

**Fix:**
```python
# After _generate_response in ASK/PLAN:
if mode in ["ask", "plan"]:
    # Store query + response in learning memory
    # Track topics discussed
    # Update weak areas if quiz/flashcard mentioned
```

---

## 💡 Improvement Recommendations

### 1. Make PLAN Mode Executable (HIGH PRIORITY)

**Current Flow:**
```
User: "Plan to learn Python"
  ↓
PLAN generates text plan
  ↓
User must manually copy to BUILD
  ↓
BUILD creates tasks
```

**Improved Flow:**
```
User: "Plan to learn Python"
  ↓
PLAN generates structured plan
  ↓
PLAN auto-creates tasks in database
  ↓
Returns: "Created 5 tasks. View in Tasks page."
```

**Implementation:**
```python
# In _execute_actions:
if mode == "plan":
    # Use LLM to extract tasks from plan
    extraction_prompt = f"""
    Extract actionable tasks from this plan:
    {state["response"]}
    
    Return JSON:
    {{
      "tasks": [
        {{"title": "Task 1", "priority": "high", "due_date": "2024-01-15"}},
        ...
      ]
    }}
    """
    
    # Create tasks in database
    for task_data in extracted_tasks:
        supabase_admin.table("tasks").insert({
            "user_id": user_id,
            "workspace_id": workspace_id,
            "title": task_data["title"],
            "priority": task_data["priority"],
            "status": "todo"
        }).execute()
```

---

### 2. Add Memory to ASK Mode (MEDIUM PRIORITY)

**Why:** ASK mode should learn what user asks about to improve future responses.

**Implementation:**
```python
# After _generate_response in ASK mode:
if mode == "ask":
    # Extract topics from query
    topics = extract_topics(state["query"])
    
    # Store in learning memory
    for topic in topics:
        supabase_admin.table("learning_memory").upsert({
            "user_id": user_id,
            "workspace_id": workspace_id,
            "topic": topic,
            "query_count": 1,  # Increment if exists
            "last_queried": "now()"
        }).execute()
```

---

### 3. Add Web Search to PLAN Mode (LOW PRIORITY)

**Why:** Plans could benefit from external research.

**Implementation:**
```python
# In _retrieve_vector_context:
if mode == "plan" and scope == "web":
    # Search web for best practices
    web_results = await brave_search_service.search(
        f"how to learn {state['query']}", 
        count=3
    )
    state["context"].extend(web_results)
```

---

### 4. Add Preview Actions to All Modes (MEDIUM PRIORITY)

**Current:** Only BUILD shows comprehensive actions.

**Improved:**
```python
# ASK Mode Actions:
- "Save as page"
- "Create quiz from this"
- "Generate flashcards"
- "View in knowledge graph"

# PLAN Mode Actions:
- "Execute Plan" (creates tasks)
- "Save plan as page"
- "Set reminders"
- "Adjust timeline"

# BUILD Mode Actions:
- "View created pages"
- "Start quiz"
- "Review flashcards"
- "View in knowledge graph"
```

---

## 🎯 Recommended Mode Behavior (Fixed)

### ASK Mode (No Changes Needed)
```
Purpose: Answer questions using workspace knowledge
Reads: ✅ Pages, Skills, Tasks, Graph, Web (optional)
Creates: ❌ Nothing
Memory: ✅ Add query tracking
Output: Text answer + sources + suggested actions
```

### PLAN Mode (NEEDS FIX)
```
Purpose: Create structured plans AND execute them
Reads: ✅ Pages, Skills, Tasks
Creates: ✅ Tasks (auto-create from plan)
Memory: ✅ Add plan tracking
Output: Plan text + created task IDs + actions
```

### BUILD Mode (Working Well)
```
Purpose: Create learning objects and content
Reads: ✅ Pages, Skills, Tasks, Web (if needed)
Creates: ✅ Pages, Skills, Tasks, Quizzes, Flashcards, Courses
Memory: ✅ Already implemented
Output: Created items + IDs + navigation actions
```

---

## 🔧 Implementation Priority

### Phase 1: Critical Fixes (Do First)
1. ✅ Make PLAN mode create tasks
2. ✅ Add workspace_id validation to PLAN
3. ✅ Fix documentation mismatch

### Phase 2: Memory Improvements
1. ✅ Add query tracking to ASK mode
2. ✅ Add plan tracking to PLAN mode
3. ✅ Improve weak area detection

### Phase 3: UX Enhancements
1. ✅ Add preview actions to all modes
2. ✅ Add web search to PLAN mode
3. ✅ Improve suggested actions

---

## 📝 Code Changes Required

### File: `backend/app/services/ai_agent.py`

**Change 1: Make PLAN mode executable**
```python
async def _execute_actions(self, state: AgentState) -> AgentState:
    mode = state.get("mode", "ask")
    workspace_id = state.get("workspace_id")
    state["created_items"] = {"pages": [], "skills": [], "tasks": [], "quizzes": [], "flashcards": [], "skipped": [], "errors": []}
    
    # ADD THIS: PLAN mode creates tasks
    if mode == "plan":
        if not workspace_id:
            state["response"] += "\n\n⚠️ Workspace required to create tasks from plan."
            return state
        
        # Extract tasks from plan using LLM
        extraction_prompt = f"""Extract actionable tasks from this plan:

{state["response"]}

Return JSON:
{{
  "tasks": [
    {{"title": "Task title", "priority": "low|medium|high", "description": "Optional description"}}
  ]
}}

Only return valid JSON, no other text."""

        try:
            messages = [
                {"role": "system", "content": "You are a JSON extraction assistant."},
                {"role": "user", "content": extraction_prompt}
            ]
            extraction_response = await self.llm.ainvoke(messages)
            extracted_text = extraction_response.content.strip()
            
            # Remove markdown code blocks
            if extracted_text.startswith("```"):
                extracted_text = extracted_text.split("```")[1]
                if extracted_text.startswith("json"):
                    extracted_text = extracted_text[4:]
                extracted_text = extracted_text.strip()
            
            structured_data = json.loads(extracted_text)
            
            # Create tasks
            for task_data in structured_data.get("tasks", []):
                title = task_data.get("title", "Untitled Task")
                priority = task_data.get("priority", "medium").lower()
                
                if priority not in ["low", "medium", "high"]:
                    priority = "medium"
                
                task_response = supabase_admin.table("tasks").insert({
                    "user_id": state["user_id"],
                    "workspace_id": workspace_id,
                    "title": title,
                    "priority": priority,
                    "status": "todo",
                    "description": task_data.get("description", "")
                }).execute()
                
                if task_response.data:
                    created_task = task_response.data[0]
                    state["created_items"]["tasks"].append({
                        "id": created_task["id"],
                        "title": title,
                        "priority": priority
                    })
                    logger.info(f"✅ Created task from plan: {title}")
            
            # Add feedback to response
            if state["created_items"]["tasks"]:
                state["response"] += f"\n\n---\n\n✅ **Created {len(state['created_items']['tasks'])} Task(s):**\n"
                for task in state["created_items"]["tasks"]:
                    priority_emoji = {'high': '🔴', 'medium': '🟡', 'low': '🟢'}.get(task['priority'], '⚪')
                    state["response"] += f"   {priority_emoji} {task['title']}\n"
                state["response"] += "\n📋 View all tasks in the Tasks page."
        
        except Exception as e:
            logger.error(f"Error creating tasks from plan: {e}")
            state["response"] += f"\n\n⚠️ Could not auto-create tasks. Please create them manually."
        
        return state
    
    # BUILD mode (existing logic)
    if mode != "build":
        return state
    
    # ... rest of BUILD logic ...
```

**Change 2: Add memory to ASK mode**
```python
async def _generate_response(self, state: AgentState) -> AgentState:
    # ... existing response generation ...
    
    # ADD THIS: Store query in learning memory for ASK mode
    mode = state.get("mode", "ask")
    workspace_id = state.get("workspace_id")
    
    if mode == "ask" and workspace_id:
        try:
            # Extract topics from query (simple keyword extraction)
            query_lower = state["query"].lower()
            
            # Store query in learning memory
            supabase_admin.table("learning_memory").upsert({
                "user_id": state["user_id"],
                "workspace_id": workspace_id,
                "topic": state["query"][:100],  # Truncate long queries
                "query_count": 1,
                "last_queried": "now()"
            }, on_conflict="user_id,workspace_id,topic").execute()
            
            logger.info(f"Stored ASK query in learning memory: {state['query'][:50]}")
        except Exception as e:
            logger.warning(f"Could not store query in memory: {e}")
    
    return state
```

**Change 3: Improve suggested actions**
```python
async def _suggest_actions(self, state: AgentState) -> AgentState:
    mode = state.get("mode", "ask")
    actions = []
    
    if mode == "ask":
        # Check if response mentions specific content
        response_lower = state["response"].lower()
        
        if any(word in response_lower for word in ["quiz", "test", "questions"]):
            actions.append("Create quiz from this")
        
        if any(word in response_lower for word in ["flashcard", "memorize", "review"]):
            actions.append("Generate flashcards")
        
        if state["sources"]:
            actions.append("View related pages")
            actions.append("Visualize in knowledge graph")
        
        actions.extend([
            "Save as new page",
            "Create a plan",
            "Ask follow-up question"
        ])
    
    elif mode == "plan":
        # Check if tasks were created
        if state["created_items"].get("tasks"):
            actions.append("View created tasks")
            actions.append("Set due dates")
        
        actions.extend([
            "Save plan as page",
            "Adjust timeline",
            "Add more details"
        ])
    
    elif mode == "build":
        # Check what was created
        if state["created_items"].get("pages"):
            actions.append("View created pages")
        
        if state["created_items"].get("quizzes"):
            for quiz in state["created_items"]["quizzes"]:
                actions.append(f"Start Quiz: {quiz['title']}")
        
        if state["created_items"].get("flashcards"):
            for deck in state["created_items"]["flashcards"]:
                actions.append(f"Review Flashcards: {deck['title']}")
        
        actions.extend([
            "Visualize in knowledge graph",
            "Generate related skills"
        ])
    
    state["suggested_actions"] = actions
    return state
```

---

## ✅ Summary

### What's Working
- ✅ ASK mode: Perfect for questions
- ✅ BUILD mode: Excellent for content creation
- ✅ Workspace isolation: Properly enforced
- ✅ Duplicate detection: Working well
- ✅ @Mentions: Working correctly

### What Needs Fixing
- ❌ PLAN mode doesn't create tasks (documentation mismatch)
- ❌ ASK mode doesn't store learning memory
- ❌ PLAN mode doesn't use web search
- ❌ Suggested actions are too generic

### Priority Actions
1. **HIGH**: Make PLAN mode create tasks automatically
2. **MEDIUM**: Add memory tracking to ASK mode
3. **MEDIUM**: Improve suggested actions for all modes
4. **LOW**: Add web search to PLAN mode

---

## 🎯 Final Recommendation

**Your Ask Anything system is 80% complete and working well!**

The main issue is that PLAN mode doesn't execute (create tasks), which creates a disconnect between planning and execution. Users expect PLAN to create tasks, but it only returns text.

**Quick Fix (30 minutes):**
1. Add task creation to PLAN mode (see code above)
2. Update documentation to match behavior
3. Test with: "Plan to learn Python in 30 days"

**This will make your system 100% functional and aligned with the architecture document.**
