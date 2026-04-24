# Memory System - Quick Start Guide

## 🚀 Get Started in 3 Steps

### Step 1: Run Database Migration (1 minute)

Open Supabase SQL Editor and run:

```sql
-- File: backend/migrations/add_learning_memory_function.sql
-- Copy and paste the entire file contents
```

This creates the `update_learning_memory()` function that tracks learning progress.

**Verify it worked:**
```sql
SELECT proname FROM pg_proc WHERE proname = 'update_learning_memory';
-- Should return: update_learning_memory
```

---

### Step 2: Restart Backend (30 seconds)

```bash
cd backend
python -m uvicorn main:app --reload
```

The backend will now:
- ✅ Pass session context to AI
- ✅ Include conversation history in responses
- ✅ Update learning memory after quizzes/flashcards

---

### Step 3: Test It! (2 minutes)

#### Test 1: Context-Aware Conversation

1. Open Ask Anything
2. Ask: "What is Python?"
3. Then ask: "Can you explain more about that?"
4. The AI should reference your first question! ✨

#### Test 2: Learning Memory

1. Ask: "Create a quiz about JavaScript basics"
2. Complete the quiz
3. Check if memory was saved:

```bash
# Replace {workspace_id} with your actual workspace ID
curl http://localhost:8000/ai/memory/learning/{workspace_id}
```

You should see learning records with correct/error counts!

#### Test 3: Weak Areas Detection

1. Create flashcards: "Create flashcards for SQL"
2. Review cards, mark some as "unknown"
3. Check weak areas:

```bash
curl http://localhost:8000/ai/memory/weak-areas/{workspace_id}
```

Topics you marked as unknown should appear here!

---

## 🎯 What Changed?

### Before ❌
- AI had no memory of previous questions
- Quiz/flashcard interactions weren't tracked
- No learning progress saved
- Cache existed but wasn't used by AI

### After ✅
- AI remembers conversation context
- Quiz scores saved to database
- Flashcard progress tracked
- Weak areas identified automatically
- Session context included in AI responses

---

## 📊 Quick Verification

### Check Session Context
```bash
curl http://localhost:8000/ai/memory/context/{session_id}
```

Should return:
```json
{
  "session_id": "...",
  "current_page_id": "...",
  "recent_queries": [...],
  "last_activity": "..."
}
```

### Check Learning Memory
```bash
curl http://localhost:8000/ai/memory/learning/{workspace_id}
```

Should return:
```json
[
  {
    "topic": "What is a variable?",
    "correct_count": 1,
    "error_count": 0,
    "total_study_time": 30,
    "weak_areas": []
  }
]
```

### Check Cache Stats
```bash
curl http://localhost:8000/ai/cache/stats/{workspace_id}
```

Should return:
```json
{
  "redis_available": true,
  "vector_cache_entries": 5,
  "ai_cache_entries": 10,
  "vector_cache_hits": 15,
  "ai_cache_hits": 20
}
```

---

## 🔍 Troubleshooting

### "Function does not exist" error
**Solution:** Run the migration in Supabase SQL Editor

### AI doesn't remember context
**Solution:** Make sure you're passing `session_id` in requests

### Learning memory not updating
**Solution:** 
1. Check `workspaceId` is passed to QuizCard/FlashcardDeck components
2. Look for console errors in browser dev tools
3. Verify migration was run successfully

### Cache not working
**Solution:**
1. Check `backend/.env` has Redis credentials
2. Verify `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`
3. Test connection: `curl {REDIS_URL}/ping -H "Authorization: Bearer {TOKEN}"`

---

## 🎉 You're Done!

The memory system is now fully integrated. Your AI:
- ✅ Remembers conversations
- ✅ Tracks learning progress
- ✅ Identifies weak areas
- ✅ Uses cache for performance

**Next:** Try creating a quiz, completing it, and checking your learning progress!

---

## 📚 Learn More

- **Full Details:** See `ASK_ANYTHING_MEMORY_INTEGRATION_COMPLETE.md`
- **Original Diagnostic:** See `ASK_ANYTHING_DIAGNOSTIC_REPORT.md`
- **Fix Guide:** See `ASK_ANYTHING_MEMORY_FIX.md`
