# ✅ Test Feedback System

## Quick Test (1 minute)

### 1. Check Backend Starts
```bash
cd backend
uvicorn app.main:app --reload
```

Look for:
```
✅ No import errors
✅ Server starts on http://localhost:8000
```

### 2. Test API Endpoint
```bash
# Health check
curl http://localhost:8000/health

# Check API docs (should show feedback endpoints)
open http://localhost:8000/docs
```

Look for these endpoints in the docs:
- ✅ `POST /api/v1/ai/feedback/submit`
- ✅ `GET /api/v1/ai/feedback/insights/{workspace_id}`
- ✅ `GET /api/v1/ai/feedback/preferences`
- ✅ `GET /api/v1/ai/feedback/history`

### 3. Run Database Migration
```bash
# In Supabase SQL Editor, paste and run:
# backend/migrations/add_ai_feedback_system.sql
```

Look for:
```
✅ ai_action_feedback table created
✅ user_agent_preferences table created
✅ conversation_memory table created
```

### 4. Test Feedback Submission
```bash
# Get your auth token from browser (DevTools > Application > Local Storage)
TOKEN="your-token-here"

# Submit test feedback
curl -X POST "http://localhost:8000/api/v1/ai/feedback/submit" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "workspace_id": "test-workspace",
    "preview_id": "test-message-123",
    "query": "Explain SQL joins",
    "mode": "ask",
    "rating": "helpful",
    "comment": "Great explanation!"
  }'
```

Expected response:
```json
{
  "success": true,
  "feedback_id": "uuid-here",
  "message": "Thank you for your feedback! This helps improve the AI."
}
```

### 5. Test Preferences Endpoint
```bash
curl -X GET "http://localhost:8000/api/v1/ai/feedback/preferences" \
  -H "Authorization: Bearer $TOKEN"
```

Expected response:
```json
{
  "success": true,
  "preferences": {
    "preferred_mode": "ask",
    "prefers_detailed": true,
    "prefers_examples": true,
    "common_topics": [],
    "total_interactions": 1,
    "success_rate": 100
  }
}
```

### 6. Test Insights Endpoint
```bash
curl -X GET "http://localhost:8000/api/v1/ai/feedback/insights/test-workspace?days_back=30" \
  -H "Authorization: Bearer $TOKEN"
```

Expected response:
```json
{
  "success": true,
  "insights": {
    "success_rate": 100,
    "total_feedback": 1,
    "helpful_count": 1,
    "not_helpful_count": 0,
    "mode_performance": {
      "ask": {
        "total": 1,
        "helpful": 1,
        "success_rate": 100
      }
    }
  }
}
```

---

## Unit Tests (Optional)

```bash
cd backend
pytest tests/test_feedback_system.py -v
```

Expected output:
```
✅ test_store_feedback PASSED
✅ test_get_user_preferences PASSED
✅ test_analyze_feedback PASSED
✅ test_adjust_prompt PASSED
✅ test_gather_hierarchical_context PASSED
✅ test_understand_workspace_structure PASSED
✅ test_prune_context PASSED
✅ test_services_importable PASSED
```

---

## Frontend Integration Test

### 1. Add Feedback Buttons to Chat
In `src/components/FloatingAskAnything.tsx` or `src/pages/AskAnything.tsx`:

```tsx
import { FeedbackButtons } from '@/components/FeedbackButtons';

// In message rendering:
{message.role === 'assistant' && (
  <FeedbackButtons
    messageId={message.id}
    workspaceId={currentWorkspace?.id || ''}
    query={message.query || ''}
    mode={message.mode || 'ask'}
  />
)}
```

### 2. Test in Browser
1. Open Ask Anything
2. Send a query
3. Look for feedback buttons below response
4. Click thumbs up/down
5. Check browser console for success message
6. Verify in Supabase: `SELECT * FROM ai_action_feedback;`

---

## Troubleshooting

### Error: "Module 'ai_feedback' not found"
**Fix:** Make sure you added the import in `backend/app/api/routes.py`:
```python
from app.api.endpoints import ai_feedback
```

### Error: "Table 'ai_action_feedback' does not exist"
**Fix:** Run the migration in Supabase SQL Editor:
```bash
# Copy contents of backend/migrations/add_ai_feedback_system.sql
# Paste in Supabase SQL Editor and run
```

### Error: "RLS policy violation"
**Fix:** Check RLS policies are created:
```sql
SELECT * FROM pg_policies WHERE tablename = 'ai_action_feedback';
```

### Error: "Cannot import feedback_learning_service"
**Fix:** Check file exists and has no syntax errors:
```bash
python -c "from app.services.feedback_learning import feedback_learning_service; print('OK')"
```

---

## Success Checklist

- [ ] Backend starts without errors
- [ ] Feedback endpoints visible in /docs
- [ ] Database migration completed
- [ ] Can submit feedback via API
- [ ] Can retrieve preferences
- [ ] Can get insights
- [ ] Frontend buttons render
- [ ] Clicking buttons submits feedback
- [ ] Data appears in Supabase

---

## Next Steps

Once all tests pass:

1. ✅ **Integrate with existing agent** - Add to `agentic_agent.py`
2. ✅ **Add to all AI responses** - Show feedback buttons everywhere
3. ✅ **Create insights dashboard** - Show feedback analytics
4. ✅ **Monitor metrics** - Track success rate over time

---

**Status**: Ready to test!
**Time**: ~5 minutes
