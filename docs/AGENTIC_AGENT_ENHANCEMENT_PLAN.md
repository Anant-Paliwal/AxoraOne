# 🤖 Agentic Agent Enhancement Plan

## Overview
Enhance the AI agent to be truly agentic with:
- **Deep Context Understanding** (pages, subpages, workspace structure)
- **Feedback Learning System** (like/dislike to improve responses)
- **Enhanced Plan Mode** (better task decomposition and execution)
- **Long-term Memory** (remember user preferences and patterns)
- **Imperfect Input Handling** (understand unclear requests)

---

## 🎯 Current State Analysis

### ✅ What Already Exists
1. **Agentic Agent** (`backend/app/services/agentic_agent.py`)
   - ReAct pattern (Thought-Action-Observation)
   - Goal decomposition
   - CRUD operations for pages/skills/tasks
   - Agent memory for current session

2. **Feedback Table** (`ai_action_feedback`)
   - Stores like/dislike ratings
   - Captures executed actions
   - Workspace-scoped

3. **Memory System** (`skill_memory` table)
   - Learning memory per skill
   - Weak areas tracking
   - Confidence scoring

4. **Plan Mode** (in `ai_agent.py`)
   - Creates tasks from plans
   - Auto-links to skills
   - Timeline generation

### ❌ What's Missing
1. **Feedback Loop Integration** - Feedback is stored but not used to improve
2. **Context Window Management** - No smart context pruning for long conversations
3. **User Preference Learning** - Doesn't adapt to user's style
4. **Imperfect Input Understanding** - Limited fuzzy matching
5. **Plan Execution Tracking** - Plans created but not monitored
6. **Cross-session Memory** - Forgets context between sessions

---

## 🚀 Enhancement Implementation

### 1. Feedback Learning System

#### A. Backend API Endpoints
```python
# backend/app/api/endpoints/ai_feedback.py

@router.post("/feedback/submit")
async def submit_feedback(
    feedback: FeedbackRequest,
    user_id: str = Depends(get_current_user)
):
    """
    Submit feedback for AI response
    - Stores rating (helpful/not_helpful)
    - Captures what was wrong
    - Updates agent learning model
    """
    pass

@router.get("/feedback/insights/{workspace_id}")
async def get_feedback_insights(
    workspace_id: str,
    user_id: str = Depends(get_current_user)
):
    """
    Get aggregated feedback insights
    - Common failure patterns
    - Successful response types
    - User preferences
    """
    pass
```

#### B. Feedback Learning Service
```python
# backend/app/services/feedback_learning.py

class FeedbackLearningService:
    """
    Learn from user feedback to improve responses
    """
    
    async def analyze_feedback(self, workspace_id: str) -> Dict:
        """
        Analyze feedback patterns:
        - What types of queries get negative feedback?
        - What response styles work best?
        - Which modes (ask/build/plan) are most successful?
        """
        pass
    
    async def get_user_preferences(self, user_id: str) -> Dict:
        """
        Extract user preferences from feedback:
        - Preferred response length
        - Likes detailed explanations vs concise
        - Prefers examples vs theory
        """
        pass
    
    async def adjust_prompt_based_on_feedback(
        self, 
        base_prompt: str,
        user_id: str,
        workspace_id: str
    ) -> str:
        """
        Modify system prompt based on learned preferences
        """
        pass
```

#### C. Frontend Feedback UI
```typescript
// src/components/FeedbackButtons.tsx

export function FeedbackButtons({ 
  messageId, 
  onFeedback 
}: FeedbackButtonsProps) {
  return (
    <div className="flex gap-2 mt-2">
      <Button
        size="sm"
        variant="ghost"
        onClick={() => handleFeedback('helpful')}
      >
        <ThumbsUp className="w-4 h-4" />
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => handleFeedback('not_helpful')}
      >
        <ThumbsDown className="w-4 h-4" />
      </Button>
    </div>
  );
}
```

---

### 2. Enhanced Context Understanding

#### A. Smart Context Gatherer
```python
# backend/app/services/enhanced_context_gatherer.py

class EnhancedContextGatherer:
    """
    Intelligently gather and manage context
    """
    
    async def gather_hierarchical_context(
        self,
        page_id: str,
        include_subpages: bool = True,
        max_depth: int = 3
    ) -> Dict:
        """
        Gather page + subpages in hierarchy
        - Parent page content
        - All subpages (recursive)
        - Linked skills
        - Related tasks
        """
        pass
    
    async def understand_workspace_structure(
        self,
        workspace_id: str
    ) -> Dict:
        """
        Build mental model of workspace:
        - Page hierarchy (parent-child relationships)
        - Skill connections
        - Task dependencies
        - Knowledge graph structure
        """
        pass
    
    async def prune_context_intelligently(
        self,
        full_context: Dict,
        query: str,
        max_tokens: int = 4000
    ) -> Dict:
        """
        Keep only relevant context:
        - Rank by relevance to query
        - Preserve critical relationships
        - Summarize less important parts
        """
        pass
```

#### B. Fuzzy Input Understanding
```python
# backend/app/services/fuzzy_matcher.py

class FuzzyMatcher:
    """
    Understand imperfect user input
    """
    
    async def match_page_name(
        self,
        user_input: str,
        workspace_id: str
    ) -> List[Dict]:
        """
        Find pages even with typos:
        - "sql basiks" → "SQL Basics"
        - "data anlytics" → "Data Analytics"
        """
        pass
    
    async def understand_intent_from_unclear_query(
        self,
        query: str,
        context: Dict
    ) -> Dict:
        """
        Extract intent from unclear requests:
        - "make that thing" → CREATE_PAGE
        - "fix the stuff" → UPDATE_PAGE
        - "show me about X" → READ_PAGE
        """
        pass
    
    async def suggest_corrections(
        self,
        query: str,
        workspace_id: str
    ) -> List[str]:
        """
        Suggest what user might have meant:
        "Did you mean: 'Create a page about SQL'?"
        """
        pass
```

---

### 3. Enhanced Plan Mode

#### A. Plan Execution Tracker
```python
# backend/app/services/plan_tracker.py

class PlanTracker:
    """
    Track plan execution and progress
    """
    
    async def create_plan_with_tracking(
        self,
        plan_data: Dict,
        workspace_id: str,
        user_id: str
    ) -> str:
        """
        Create plan and set up tracking:
        - Store plan in database
        - Create tasks with dependencies
        - Set up progress monitoring
        """
        pass
    
    async def get_plan_progress(
        self,
        plan_id: str
    ) -> Dict:
        """
        Get current plan status:
        - Completed tasks
        - In-progress tasks
        - Blocked tasks
        - Overall progress %
        """
        pass
    
    async def suggest_next_action(
        self,
        plan_id: str
    ) -> Dict:
        """
        AI suggests what to do next:
        - Based on completed tasks
        - Considering dependencies
        - Accounting for blockers
        """
        pass
```

#### B. Plan Database Schema
```sql
-- backend/migrations/add_plan_tracking.sql

CREATE TABLE learning_plans (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id),
    workspace_id uuid NOT NULL REFERENCES workspaces(id),
    title text NOT NULL,
    goal text NOT NULL,
    status text NOT NULL DEFAULT 'active', -- active, completed, paused
    progress_percentage int DEFAULT 0,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    completed_at timestamptz
);

CREATE TABLE plan_tasks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id uuid NOT NULL REFERENCES learning_plans(id) ON DELETE CASCADE,
    task_id uuid REFERENCES tasks(id),
    sequence_order int NOT NULL,
    depends_on uuid[], -- Array of task IDs this depends on
    status text NOT NULL DEFAULT 'pending', -- pending, in_progress, completed, blocked
    created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_learning_plans_workspace ON learning_plans(workspace_id);
CREATE INDEX idx_learning_plans_status ON learning_plans(status);
CREATE INDEX idx_plan_tasks_plan ON plan_tasks(plan_id);
```

---

### 4. Long-term Memory System

#### A. User Preference Storage
```sql
-- backend/migrations/add_user_preferences.sql

CREATE TABLE user_agent_preferences (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id),
    workspace_id uuid REFERENCES workspaces(id),
    
    -- Response style preferences
    preferred_response_length text DEFAULT 'medium', -- short, medium, detailed
    prefers_examples boolean DEFAULT true,
    prefers_step_by_step boolean DEFAULT true,
    
    -- Interaction preferences
    preferred_mode text, -- ask, build, plan, agent
    auto_create_tasks boolean DEFAULT false,
    auto_link_skills boolean DEFAULT true,
    
    -- Learned patterns
    common_queries jsonb DEFAULT '[]'::jsonb,
    successful_patterns jsonb DEFAULT '[]'::jsonb,
    
    updated_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX idx_user_prefs_user_workspace 
ON user_agent_preferences(user_id, workspace_id);
```

#### B. Conversation Memory Service
```python
# backend/app/services/conversation_memory.py

class ConversationMemoryService:
    """
    Manage long-term conversation memory
    """
    
    async def store_conversation_summary(
        self,
        session_id: str,
        summary: str,
        key_points: List[str]
    ):
        """
        Store summary of conversation for future reference
        """
        pass
    
    async def retrieve_relevant_memories(
        self,
        user_id: str,
        workspace_id: str,
        current_query: str,
        limit: int = 5
    ) -> List[Dict]:
        """
        Retrieve relevant past conversations:
        - Similar queries
        - Related topics
        - User's past preferences
        """
        pass
    
    async def build_user_context(
        self,
        user_id: str,
        workspace_id: str
    ) -> str:
        """
        Build context about user for prompt:
        "User prefers detailed explanations with examples.
         Previously worked on SQL and Data Analytics.
         Likes to create structured learning plans."
        """
        pass
```

---

### 5. Integration with Existing Agent

#### A. Enhanced Agentic Agent
```python
# backend/app/services/agentic_agent.py (enhancements)

class AgenticAgent:
    def __init__(self):
        self.llm = None
        self.feedback_service = FeedbackLearningService()
        self.context_gatherer = EnhancedContextGatherer()
        self.fuzzy_matcher = FuzzyMatcher()
        self.plan_tracker = PlanTracker()
        self.memory_service = ConversationMemoryService()
    
    async def process_goal(
        self,
        goal: str,
        user_id: str,
        workspace_id: str,
        mode: str = "agent",
        current_page_id: str = None,
        mentioned_items: List[Dict] = None,
        conversation_history: List[Dict] = None
    ) -> Dict[str, Any]:
        """
        Enhanced goal processing with:
        1. Fuzzy input understanding
        2. User preference adaptation
        3. Long-term memory integration
        4. Feedback-based improvements
        """
        
        # 1. Understand unclear input
        if self._is_unclear_input(goal):
            clarified_goal = await self.fuzzy_matcher.understand_intent_from_unclear_query(
                goal, 
                {"workspace_id": workspace_id}
            )
            suggestions = await self.fuzzy_matcher.suggest_corrections(goal, workspace_id)
        
        # 2. Load user preferences and past context
        user_prefs = await self.feedback_service.get_user_preferences(user_id)
        past_memories = await self.memory_service.retrieve_relevant_memories(
            user_id, workspace_id, goal
        )
        
        # 3. Gather enhanced context
        if current_page_id:
            context = await self.context_gatherer.gather_hierarchical_context(
                current_page_id,
                include_subpages=True
            )
        else:
            context = await self.context_gatherer.understand_workspace_structure(
                workspace_id
            )
        
        # 4. Adjust prompt based on feedback
        base_prompt = self._get_base_prompt(mode)
        adapted_prompt = await self.feedback_service.adjust_prompt_based_on_feedback(
            base_prompt, user_id, workspace_id
        )
        
        # 5. Process with enhanced context
        result = await self._process_with_enhanced_context(
            goal=goal,
            context=context,
            user_prefs=user_prefs,
            past_memories=past_memories,
            prompt=adapted_prompt
        )
        
        # 6. Store conversation summary for future
        await self.memory_service.store_conversation_summary(
            session_id=result.get("session_id"),
            summary=result.get("summary"),
            key_points=result.get("key_points", [])
        )
        
        return result
```

---

## 📋 Implementation Checklist

### Phase 1: Feedback System (Week 1)
- [ ] Create feedback API endpoints
- [ ] Implement FeedbackLearningService
- [ ] Add feedback buttons to UI
- [ ] Create feedback insights dashboard
- [ ] Test feedback collection

### Phase 2: Enhanced Context (Week 2)
- [ ] Build EnhancedContextGatherer
- [ ] Implement hierarchical context loading
- [ ] Add smart context pruning
- [ ] Test with complex workspace structures

### Phase 3: Fuzzy Matching (Week 3)
- [ ] Implement FuzzyMatcher service
- [ ] Add typo correction
- [ ] Build intent clarification
- [ ] Add "Did you mean?" suggestions

### Phase 4: Plan Tracking (Week 4)
- [ ] Create plan tracking database schema
- [ ] Implement PlanTracker service
- [ ] Add plan progress UI
- [ ] Build "next action" suggestions

### Phase 5: Long-term Memory (Week 5)
- [ ] Create user preferences schema
- [ ] Implement ConversationMemoryService
- [ ] Add memory retrieval to agent
- [ ] Build user context builder

### Phase 6: Integration & Testing (Week 6)
- [ ] Integrate all services into AgenticAgent
- [ ] End-to-end testing
- [ ] Performance optimization
- [ ] User acceptance testing

---

## 🎨 UI Enhancements

### 1. Feedback Interface
```
┌─────────────────────────────────────┐
│ AI Response                         │
│ [Response content here...]          │
│                                     │
│ Was this helpful?                   │
│ [👍 Yes] [👎 No]                    │
│                                     │
│ [Optional: Tell us more...]         │
└─────────────────────────────────────┘
```

### 2. Plan Progress Tracker
```
┌─────────────────────────────────────┐
│ 📋 Learning Plan: Master SQL        │
│ Progress: ████████░░ 75%            │
│                                     │
│ ✅ Week 1: SQL Basics (Done)       │
│ ✅ Week 2: Joins (Done)             │
│ 🔄 Week 3: Subqueries (In Progress)│
│ ⏳ Week 4: Optimization (Pending)  │
│                                     │
│ [View Details] [Adjust Plan]        │
└─────────────────────────────────────┘
```

### 3. Context Awareness Indicator
```
┌─────────────────────────────────────┐
│ 🤖 Agent Context                    │
│ • Current Page: SQL Basics          │
│ • Subpages: 3 found                 │
│ • Linked Skills: Data Analytics     │
│ • Related Tasks: 5 active           │
│                                     │
│ [Show Full Context]                 │
└─────────────────────────────────────┘
```

---

## 🔧 Technical Considerations

### 1. Performance
- Cache user preferences (Redis)
- Lazy load subpage content
- Implement context pagination
- Use background jobs for memory summarization

### 2. Privacy
- User can delete feedback history
- Workspace-scoped learning (no cross-workspace leakage)
- Opt-out of preference learning

### 3. Scalability
- Feedback aggregation runs async
- Memory retrieval uses vector similarity
- Context pruning prevents token overflow

---

## 📊 Success Metrics

1. **Feedback Rate**: >30% of responses get feedback
2. **Positive Feedback**: >70% helpful ratings
3. **Context Accuracy**: Agent finds correct pages 90%+ of time
4. **Plan Completion**: 60%+ of plans completed
5. **User Retention**: Users return to agent 3x/week

---

## 🚀 Quick Start

### Run Feedback Migration
```bash
# In Supabase SQL Editor
psql -f backend/migrations/add_ai_action_feedback.sql
psql -f backend/migrations/add_plan_tracking.sql
psql -f backend/migrations/add_user_preferences.sql
```

### Test Feedback System
```bash
cd backend
python -m pytest tests/test_feedback_learning.py -v
```

### Start Enhanced Agent
```bash
# Backend will auto-load new services
cd backend
uvicorn app.main:app --reload
```

---

## 📚 Related Documentation

- [Ask Anything Architecture](./ASK_ANYTHING_ARCHITECTURE_FLOW.md)
- [Agent Memory System](./MEMORY_SYSTEM_QUICK_START.md)
- [Plan Mode Guide](./SKILL_SYSTEM_QUICK_REFERENCE.md)

---

**Status**: 🟡 Ready for Implementation
**Priority**: 🔴 High
**Estimated Time**: 6 weeks
