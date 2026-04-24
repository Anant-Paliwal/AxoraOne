# Backend Errors Fixed ✅

## Errors Fixed

### 1. Database Error - ask_anything_usage_daily
**Error:**
```
postgrest.exceptions.APIError: {'message': 'Cannot coerce the result to a single JSON object', 'code': 'PGRST116', 'hint': None, 'details': 'The result contains 0 rows'}
```

**Cause:** Query used `.single()` which fails when no row exists for the user yet.

**Fix:** Changed query to not use `.single()` and handle empty results:
```python
# Before (fails if no row)
result = self.supabase.table("ask_anything_usage_daily")\
    .select("used_count")\
    .eq("user_id", user_id)\
    .eq("usage_date", date.today())\
    .single()\  # ❌ Fails if no row
    .execute()

# After (handles empty results)
result = self.supabase.table("ask_anything_usage_daily")\
    .select("used_count")\
    .eq("user_id", user_id)\
    .eq("usage_date", date.today())\
    .execute()  # ✅ Returns empty list if no row

used = result.data[0]["used_count"] if result.data and len(result.data) > 0 else 0
```

**File:** `backend/app/services/plan_service.py`

### 2. Razorpay Error - Wrong Parameter Name
**Error:**
```
RazorpayService.create_subscription() got an unexpected keyword argument 'plan_name'. Did you mean 'plan_code'?
```

**Cause:** Subscription endpoint was passing `plan_name` instead of `plan_code`.

**Fix:** Changed parameter name to `plan_code`:
```python
# Before
subscription_data = await razorpay_service.create_subscription(
    user_id=current_user,
    plan_name=request.plan_name,  # ❌ Wrong parameter
    billing_cycle=request.billing_cycle,
    user_email=user_email
)

# After
subscription_data = await razorpay_service.create_subscription(
    user_id=current_user,
    plan_code=request.plan_name.upper(),  # ✅ Correct parameter
    billing_cycle=request.billing_cycle,
    user_email=user_email
)
```

**File:** `backend/app/api/endpoints/subscriptions.py`

### 3. CORS Error (Already Fixed)
**Error:**
```
Access to fetch at 'http://localhost:8000/api/v1/subscriptions/current' from origin 'http://localhost:8080' has been blocked by CORS policy
```

**Status:** Already fixed in `backend/app/core/config.py` but **backend needs restart**.

**CORS origins configured:**
- http://localhost:8080
- http://127.0.0.1:8080
- http://localhost:5173
- http://127.0.0.1:5173

## What to Do Now

### Restart Backend
The fixes are applied, but you need to restart the backend server:

```bash
# Stop the backend (Ctrl+C)
# Then restart:
cd backend
python -m uvicorn app.main:app --reload --port 8000
```

### Test After Restart

1. **Test Subscription Page**
   - Go to Subscription page
   - Should load without errors
   - Should show current plan (FREE by default)

2. **Test Upgrade Flow**
   - Click "Upgrade to Pro"
   - Should not show parameter error
   - Should create Razorpay subscription

3. **Test Ask Anything Usage**
   - Use Ask Anything feature
   - Should track usage without errors
   - Should show remaining credits

## Summary

✅ Fixed database query to handle missing rows
✅ Fixed Razorpay parameter name
✅ CORS already configured (needs restart)

**Action Required:** Restart backend server to apply fixes!
