# AI Query Limit Fixed ✅

## Problem

AI queries were failing with:
```
403: {'error': 'limit_exceeded', 'message': "You've reached your plan limit for max_ai_queries_per_day", 'current': 2, 'limit': 0, 'upgrade_required': True}
```

**Root Cause:** AI chat endpoints were using old `user_subscription_service` which checked `max_ai_queries_per_day` (doesn't exist in new 3-plan system). The limit showed as 0 instead of 10 (FREE plan limit).

## Solution

Updated all AI chat endpoints to use new `plan_service` which checks `ask_anything_daily_limit`:

### Changed From (Old System)
```python
from app.services.user_subscription_service import UserSubscriptionService
user_sub_service = UserSubscriptionService(supabase_admin)
await user_sub_service.enforce_user_limit(
    user_id,
    "max_ai_queries_per_day",  # ❌ Doesn't exist
    1
)
```

### Changed To (New 3-Plan System)
```python
from app.services.plan_service import PlanService
plan_service = PlanService(supabase_admin)

# Check Ask Anything daily limit
usage = await plan_service.get_ask_anything_usage(user_id)
if usage["remaining"] <= 0:
    raise HTTPException(
        status_code=403,
        detail={
            "error": "limit_exceeded",
            "message": f"You've reached your daily Ask Anything limit ({usage['limit']} queries/day)",
            "current": usage["used"],
            "limit": usage["limit"],
            "remaining": 0,
            "upgrade_required": True
        }
    )

# Increment usage
await plan_service.increment_ask_anything_usage(user_id)
```

## Files Updated

- `backend/app/api/endpoints/ai_chat.py` (3 endpoints fixed)
  - `/api/v1/ai/query` - Regular AI query
  - `/api/v1/ai/query/enhanced` - Enhanced AI query  
  - `/api/v1/ai/query/agent` - Agentic AI query

## New Limits (3-Plan System)

| Plan | Ask Anything Daily Limit |
|------|-------------------------|
| FREE | 10 queries/day |
| PRO | 100 queries/day |
| PRO_PLUS | 300 queries/day |

## What to Do Now

**Restart Backend Server:**
```bash
# Stop backend (Ctrl+C)
# Restart:
cd backend
python -m uvicorn app.main:app --reload --port 8000
```

## Test After Restart

1. **Test Ask Anything**
   - Go to Ask Anything page
   - Ask a question
   - Should work without limit error
   - Should show correct remaining queries

2. **Check Usage**
   - FREE plan users: 10 queries/day
   - Usage resets daily
   - Upgrade prompt shows when limit reached

## Summary

✅ Fixed AI query limit checking
✅ Now uses new 3-plan system
✅ FREE plan: 10 queries/day (was showing 0)
✅ All 3 AI endpoints updated

**Action Required:** Restart backend to apply fixes!
