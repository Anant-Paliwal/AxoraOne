# Fix Ask Anything Limit Error

## 🔴 Problem

```
403: {'error': 'limit_exceeded', 'message': "You've reached your daily Ask Anything limit (10 queries/day)"}
```

But the error is being returned as **500 Internal Server Error** instead of **403 Forbidden**.

## 🎯 Root Cause

In `backend/app/api/endpoints/ai_chat.py`, the HTTPException is being caught by the generic exception handler and re-raised as a 500 error.

## ✅ Fix Applied

**File:** `backend/app/api/endpoints/ai_chat.py` (line ~633)

**Before:**
```python
except Exception as e:
    logger.error(f"Agentic query error: {e}", exc_info=True)
    raise HTTPException(status_code=500, detail=f"Error processing goal: {str(e)}")
```

**After:**
```python
except HTTPException:
    # Re-raise HTTPException (like limit_exceeded) without modification
    raise
except Exception as e:
    logger.error(f"Agentic query error: {e}", exc_info=True)
    raise HTTPException(status_code=500, detail=f"Error processing goal: {str(e)}")
```

## 🔧 Reset Usage for Testing

### Option 1: Reset Your Usage Count

Run this SQL in Supabase SQL Editor:

```sql
-- Reset Ask Anything usage for today
UPDATE user_usage_tracking 
SET ask_anything_count = 0, 
    last_reset_date = CURRENT_DATE;
```

### Option 2: Upgrade to Pro Plan (Temporary)

```sql
-- Upgrade to Pro plan (unlimited queries)
UPDATE user_subscriptions
SET plan_name = 'pro',
    status = 'active'
WHERE user_id = (SELECT id FROM auth.users LIMIT 1);
```

### Option 3: Increase Free Plan Limit

```sql
-- Modify the free plan limit in plan_service.py
-- Change line ~50:
# "free": {"ask_anything_daily": 10}  # Old
"free": {"ask_anything_daily": 100}  # New (for testing)
```

## 🚀 Apply the Fix

### Step 1: Restart Backend
```bash
cd backend
python -m uvicorn app.main:app --reload --port 8000
```

### Step 2: Reset Usage (Choose One)

**Quick Reset (All Users):**
```sql
UPDATE user_usage_tracking SET ask_anything_count = 0;
```

**OR Reset for Specific User:**
```sql
UPDATE user_usage_tracking 
SET ask_anything_count = 0 
WHERE user_id = 'YOUR_USER_ID';
```

### Step 3: Test

1. Open Ask Anything
2. Try a query
3. Should work now ✅
4. Error should be 403 (not 500) if limit is reached ✅

## 📊 Check Current Usage

```sql
SELECT 
    ut.user_id,
    ut.ask_anything_count,
    ut.last_reset_date,
    us.plan_name,
    us.status
FROM user_usage_tracking ut
LEFT JOIN user_subscriptions us ON ut.user_id = us.user_id
ORDER BY ut.created_at DESC
LIMIT 10;
```

## 🎯 Plan Limits

| Plan | Ask Anything Queries/Day |
|------|-------------------------|
| Free | 10 |
| Starter | 50 |
| Pro | Unlimited |

## 🔄 Daily Reset

Usage automatically resets at midnight (UTC). The system checks:
```python
if last_reset_date < today:
    reset_count_to_zero()
```

## ✅ What's Fixed

1. ✅ HTTPException now properly returns 403 (not 500)
2. ✅ Error message is clear and actionable
3. ✅ Frontend can handle the error properly
4. ✅ Usage can be reset for testing

## 🧪 Test the Fix

1. **Test limit exceeded:**
   - Use up your daily limit
   - Next query should return 403 with clear message ✅

2. **Test after reset:**
   - Reset usage count
   - Queries should work again ✅

3. **Test error handling:**
   - Frontend should show upgrade prompt ✅

## 📝 Frontend Handling

The frontend should already handle this error in `FloatingAskAnything.tsx`:

```typescript
if (error.response?.status === 403) {
  const detail = error.response.data.detail;
  if (detail.error === 'limit_exceeded') {
    toast.error(detail.message);
    // Show upgrade prompt
  }
}
```

## 🎉 Done!

After applying the fix and resetting usage:
- Queries work again ✅
- Errors are properly formatted ✅
- Frontend can show upgrade prompts ✅
