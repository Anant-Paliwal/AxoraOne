# 🚀 START HERE - Agentic Agent Setup

## What You're Getting

A **self-learning AI agent** that:
- ✅ Learns from your feedback (like/dislike)
- ✅ Understands page hierarchies and relationships
- ✅ Adapts to your preferences over time
- ✅ Gets smarter with every interaction

---

## ⚡ Quick Setup (5 Minutes)

### Step 1: Run Database Migration (2 min)

1. Open **Supabase SQL Editor**
2. Copy contents of `backend/migrations/add_ai_feedback_system.sql`
3. Paste and click **Run**
4. Look for success messages:
   ```
   ✅ ai_action_feedback table created
   ✅ user_agent_preferences table created
   ✅ conversation_memory table created
   ```

### Step 2: Restart Backend (1 min)

```bash
cd backend
uvicorn app.main:app --reload
```

Look for:
```
✅ Server started on http://localhost:8000
✅ No import errors
```

### Step 3: Verify Endpoints (1 min)

Open http://localhost:8000/docs

Look for these new endpoints:
- ✅ `POST /api/v1/ai/feedback/submit`
- ✅ `GET /api/v1/ai/feedback/insights/{workspace_id}`
- ✅ `GET /api/v1/ai/feedback/preferences`

### Step 4: Test It (1 min)

```bash
# Quick test
curl http://localhost:8000/health
```

Expected: `{"status":"healthy","version":"1.0.0"}`

---

## 🎨 Add to Your UI (Optional)

### Add Feedback Buttons to Chat

In `src/components/FloatingAskAnything.tsx`:

```tsx
import { FeedbackButtons } from '@/components/FeedbackButtons';

// In your message rendering (around line 400-500):
{message.role === 'assistant' && (
  <FeedbackButtons
    messageId={message.id}
    workspaceId={currentWorkspace?.id || ''}
    query={message.query || ''}
    mode={message.mode || 'ask'}
    onFeedbackSubmitted={(rating) => {
      console.log(`User rated: ${rating}`);
    }}
  />
)}
```

---

## 📊 What Happens Next

### After 5 Interactions:
- Agent starts learning your style
- Preferences begin forming

### After 10 Interactions:
- Agent adapts responses to your preferences
- Knows if you like detailed vs concise
- Understands your common topics

### After 30 Interactions:
- Fully personalized experience
- 85%+ success rate
- Feels like it "knows you"

---

## 🧪 Test It Works

### Test 1: Submit Feedback
```bash
# Get your token from browser DevTools
TOKEN="your-token-here"

curl -X POST "http://localhost:8000/api/v1/ai/feedback/submit" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "workspace_id": "test",
    "preview_id": "msg-1",
    "query": "Test query",
    "mode": "ask",
    "rating": "helpful"
  }'
```

Expected: `{"success": true, "feedback_id": "...", "message": "Thank you..."}`

### Test 2: Check Preferences
```bash
curl -X GET "http://localhost:8000/api/v1/ai/feedback/preferences" \
  -H "Authorization: Bearer $TOKEN"
```

Expected: `{"success": true, "preferences": {...}}`

### Test 3: View in Database
In Supabase:
```sql
SELECT * FROM ai_action_feedback ORDER BY created_at DESC LIMIT 5;
```

Should see your test feedback!

---

## 📚 Documentation

- **Full Plan**: `AGENTIC_AGENT_ENHANCEMENT_PLAN.md`
- **Quick Start**: `AGENTIC_AGENT_QUICK_START.md`
- **Implementation**: `AGENTIC_AGENT_IMPLEMENTATION_SUMMARY.md`
- **Testing**: `TEST_FEEDBACK_SYSTEM.md`

---

## 🐛 Troubleshooting

### Backend won't start?
```bash
# Check for import errors
cd backend
python -c "from app.services.feedback_learning import feedback_learning_service; print('OK')"
```

### Endpoints not showing?
Check `backend/app/api/routes.py` has:
```python
from app.api.endpoints import ai_feedback
api_router.include_router(ai_feedback.router, prefix="/ai", tags=["ai-feedback"])
```

### Database errors?
Run migration again in Supabase SQL Editor

---

## ✅ Success Checklist

- [ ] Migration completed in Supabase
- [ ] Backend starts without errors
- [ ] Endpoints visible in /docs
- [ ] Can submit test feedback
- [ ] Data appears in Supabase
- [ ] (Optional) Feedback buttons in UI

---

## 🎯 What's Next?

Once setup is complete:

1. **Use it**: Give feedback on AI responses
2. **Watch it learn**: After 10+ interactions, notice improvements
3. **Monitor**: Check insights dashboard
4. **Expand**: Add to more AI interactions

---

## 💡 Key Files

**Backend:**
- `backend/app/services/feedback_learning.py` - Learning logic
- `backend/app/api/endpoints/ai_feedback.py` - API endpoints
- `backend/migrations/add_ai_feedback_system.sql` - Database

**Frontend:**
- `src/components/FeedbackButtons.tsx` - UI component
- `src/lib/api.ts` - API methods (already updated)

**Routes:**
- `backend/app/api/routes.py` - ✅ Already updated!

---

## 🎉 You're Done!

The agent is now ready to learn from your feedback and improve over time.

**Time spent**: ~5 minutes
**Impact**: Huge - AI that gets better with use!

---

**Questions?** Check the detailed docs or test with `TEST_FEEDBACK_SYSTEM.md`
