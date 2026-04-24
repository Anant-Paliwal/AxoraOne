# 🚀 Agentic Agent Quick Start Guide

## What's New?

Your AI agent now has:
- ✅ **Feedback Learning** - Learns from your likes/dislikes
- ✅ **Deep Context Understanding** - Understands pages, subpages, and relationships
- ✅ **Fuzzy Input Handling** - Understands unclear requests
- ✅ **User Preference Adaptation** - Adapts to your style over time
- ✅ **Enhanced Plan Mode** - Better task decomposition and tracking

---

## 🎯 Setup (5 minutes)

### 1. Run Database Migration

```bash
# In Supabase SQL Editor, run:
```

```sql
-- AI Action Feedback Table with RLS
DROP TABLE IF EXISTS ai_action_feedback CASCADE;

CREATE TABLE public.ai_action_feedback (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    workspace_id uuid NULL,
    preview_id text NOT NULL,
    query text NULL,
    mode text NULL,
    rating text NOT NULL CHECK (rating IN ('helpful', 'not_helpful')),
    comment text NULL,
    executed_actions jsonb DEFAULT '[]'::jsonb,
    created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX idx_ai_action_feedback_user ON ai_action_feedback(user_id);
CREATE INDEX idx_ai_action_feedback_workspace ON ai_action_feedback(workspace_id);
CREATE INDEX idx_ai_action_feedback_rating ON ai_action_feedback(rating);
CREATE INDEX idx_ai_action_feedback_created ON ai_action_feedback(created_at DESC);

-- Enable RLS
ALTER TABLE ai_action_feedback ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can insert own feedback" ON ai_action_feedback
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own feedback" ON ai_action_feedback
    FOR SELECT USING (auth.uid() = user_id);

-- Permissions
GRANT ALL ON ai_action_feedback TO authenticated;
GRANT ALL ON ai_action_feedback TO service_role;
```

### 2. Register Feedback Endpoints

Add to `backend/app/main.py`:

```python
from app.api.endpoints import ai_feedback

# Add to router includes
app.include_router(ai_feedback.router, prefix="/api/v1/ai", tags=["ai-feedback"])
```

### 3. Restart Backend

```bash
cd backend
uvicorn app.main:app --reload
```

---

## 💡 How to Use

### 1. Feedback System

Every AI response now has feedback buttons:

```
┌─────────────────────────────────────┐
│ AI Response                         │
│ [Response content here...]          │
│                                     │
│ Was this helpful?                   │
│ [👍 Yes] [👎 No]                    │
└─────────────────────────────────────┘
```

**What happens when you give feedback:**
- ✅ **Thumbs Up**: Agent learns this response style works for you
- ❌ **Thumbs Down**: Opens dialog to explain what went wrong
- 🧠 **Learning**: Agent adapts future responses based on patterns

### 2. Enhanced Context Understanding

The agent now understands:

**Page Hierarchies:**
```
📄 SQL Basics (parent)
  ├─ 📄 SELECT Statements (subpage)
  ├─ 📄 JOIN Operations (subpage)
  └─ 📄 Aggregations (subpage)
```

**Try asking:**
- "Summarize this page and all subpages"
- "Create a quiz covering all SQL topics"
- "What skills are linked to this page?"

### 3. Fuzzy Input Handling

The agent understands unclear requests:

**You type:** "make that thing about sql"
**Agent understands:** "Create a page about SQL"

**You type:** "show me the data anlytics stuff"
**Agent finds:** "Data Analytics" skill (despite typo)

### 4. User Preference Learning

After ~10 interactions, the agent learns:
- Do you prefer detailed or concise responses?
- Do you like examples and code snippets?
- What topics do you work on most?
- Which mode (ask/build/plan) do you use most?

**Check your preferences:**
```bash
curl -X GET "http://localhost:8000/api/v1/ai/feedback/preferences" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 🎨 UI Integration

### Add Feedback to Messages

In `FloatingAskAnything.tsx` or `AskAnything.tsx`:

```tsx
import { FeedbackButtons } from '@/components/FeedbackButtons';

// In your message rendering:
<div className="message">
  <div className="content">{message.content}</div>
  
  {message.role === 'assistant' && (
    <FeedbackButtons
      messageId={message.id}
      workspaceId={currentWorkspace?.id}
      query={message.query}
      mode={message.mode}
      executedActions={message.actions}
    />
  )}
</div>
```

---

## 📊 Feedback Insights Dashboard

### View Workspace Insights

```typescript
// Get feedback insights
const insights = await api.getFeedbackInsights(workspaceId, 30);

console.log(insights);
// {
//   success_rate: 85.5,
//   total_feedback: 47,
//   helpful_count: 40,
//   not_helpful_count: 7,
//   mode_performance: {
//     ask: { total: 20, helpful: 18, success_rate: 90 },
//     build: { total: 15, helpful: 12, success_rate: 80 },
//     plan: { total: 12, helpful: 10, success_rate: 83.3 }
//   }
// }
```

### Create Insights Widget

```tsx
function FeedbackInsightsWidget({ workspaceId }: { workspaceId: string }) {
  const [insights, setInsights] = useState(null);

  useEffect(() => {
    api.getFeedbackInsights(workspaceId).then(data => {
      setInsights(data.insights);
    });
  }, [workspaceId]);

  if (!insights) return null;

  return (
    <div className="p-4 border rounded-lg">
      <h3 className="font-semibold mb-2">AI Performance</h3>
      <div className="text-2xl font-bold text-green-600">
        {insights.success_rate}%
      </div>
      <p className="text-sm text-muted-foreground">
        Success rate ({insights.total_feedback} responses)
      </p>
    </div>
  );
}
```

---

## 🧪 Testing

### Test Feedback Submission

```bash
# Submit positive feedback
curl -X POST "http://localhost:8000/api/v1/ai/feedback/submit" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "workspace_id": "workspace-uuid",
    "preview_id": "message-123",
    "query": "Explain SQL joins",
    "mode": "ask",
    "rating": "helpful"
  }'
```

### Test Preference Learning

```python
# backend/tests/test_feedback_learning.py
import pytest
from app.services.feedback_learning import feedback_learning_service

@pytest.mark.asyncio
async def test_user_preferences():
    prefs = await feedback_learning_service.get_user_preferences(
        user_id="test-user-id",
        workspace_id="test-workspace-id"
    )
    
    assert "preferred_mode" in prefs
    assert "prefers_detailed" in prefs
    assert "common_topics" in prefs
```

---

## 🔧 Advanced Configuration

### Customize Feedback Prompts

In `feedback_learning.py`, modify `adjust_prompt_based_on_feedback()`:

```python
async def adjust_prompt_based_on_feedback(
    self,
    base_prompt: str,
    user_id: str,
    workspace_id: Optional[str] = None
) -> str:
    prefs = await self.get_user_preferences(user_id, workspace_id)
    
    # Add custom adaptations
    if prefs["success_rate"] < 50:
        # User is struggling - be more helpful
        base_prompt += "\n- Provide extra detailed explanations\n"
        base_prompt += "- Include step-by-step examples\n"
    
    return base_prompt
```

### Add Custom Feedback Categories

Extend the rating system:

```sql
-- Add more rating options
ALTER TABLE ai_action_feedback 
DROP CONSTRAINT ai_action_feedback_rating_check;

ALTER TABLE ai_action_feedback 
ADD CONSTRAINT ai_action_feedback_rating_check 
CHECK (rating IN ('helpful', 'not_helpful', 'partially_helpful', 'confusing'));
```

---

## 📈 Monitoring

### Track Feedback Metrics

```python
# Get daily feedback stats
from datetime import datetime, timedelta

async def get_daily_stats(workspace_id: str):
    today = datetime.now().date()
    
    response = supabase_admin.table("ai_action_feedback")\
        .select("rating")\
        .eq("workspace_id", workspace_id)\
        .gte("created_at", today.isoformat())\
        .execute()
    
    helpful = sum(1 for f in response.data if f["rating"] == "helpful")
    total = len(response.data)
    
    return {
        "date": today,
        "total_feedback": total,
        "success_rate": (helpful / total * 100) if total > 0 else 0
    }
```

---

## 🎯 Best Practices

### 1. Encourage Feedback
- Show feedback buttons prominently
- Make it easy (one click for positive)
- Thank users for feedback

### 2. Act on Feedback
- Review negative feedback weekly
- Identify common failure patterns
- Adjust prompts accordingly

### 3. Privacy
- Users can delete their feedback
- Workspace-scoped learning only
- No cross-workspace data leakage

### 4. Performance
- Cache user preferences (5 min TTL)
- Aggregate feedback async
- Use background jobs for analysis

---

## 🐛 Troubleshooting

### Feedback not saving?
```bash
# Check table exists
psql -c "SELECT COUNT(*) FROM ai_action_feedback;"

# Check RLS policies
psql -c "\d+ ai_action_feedback"
```

### Preferences not loading?
```python
# Check service logs
logger.info(f"Loading preferences for user: {user_id}")

# Verify feedback exists
response = supabase_admin.table("ai_action_feedback")\
    .select("*")\
    .eq("user_id", user_id)\
    .execute()
print(f"Found {len(response.data)} feedback items")
```

### Agent not adapting?
- Need at least 5-10 feedback items for learning
- Check `adjust_prompt_based_on_feedback()` is called
- Verify preferences are passed to LLM

---

## 📚 Next Steps

1. ✅ **Phase 1 Complete**: Feedback system working
2. 🔄 **Phase 2**: Enhanced context gathering (in progress)
3. ⏳ **Phase 3**: Fuzzy matching and intent clarification
4. ⏳ **Phase 4**: Plan tracking and execution monitoring
5. ⏳ **Phase 5**: Long-term memory and conversation summaries

---

## 🎉 Success Metrics

After 1 week, you should see:
- ✅ 30%+ feedback rate on responses
- ✅ 70%+ helpful ratings
- ✅ Agent adapting to your style
- ✅ Fewer unclear/wrong responses

---

## 💬 Example Interactions

### Before Feedback Learning:
**You:** "Explain SQL"
**Agent:** [Generic 500-word explanation]

### After 10+ Feedbacks:
**You:** "Explain SQL"
**Agent:** [Concise 150-word explanation with code example]
*(Because you consistently liked shorter, example-heavy responses)*

---

## 🔗 Related Files

- `backend/app/services/feedback_learning.py` - Core learning logic
- `backend/app/api/endpoints/ai_feedback.py` - API endpoints
- `src/components/FeedbackButtons.tsx` - UI component
- `src/lib/api.ts` - Frontend API methods

---

**Status**: ✅ Ready to Use
**Setup Time**: 5 minutes
**Impact**: High - Agent learns and improves over time
