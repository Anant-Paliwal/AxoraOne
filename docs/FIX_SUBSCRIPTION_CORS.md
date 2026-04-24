# Fix Subscription CORS Error

## Problem
```
Access to fetch at 'http://localhost:8000/api/v1/subscriptions/current' 
from origin 'http://localhost:8080' has been blocked by CORS policy
```

## Root Cause
Backend CORS configuration only allowed `localhost:5173`, but frontend is running on `localhost:8080`.

## Solution Applied
Updated `backend/app/core/config.py` to include multiple ports:
```python
CORS_ORIGINS: List[str] = ["http://localhost:5173", "http://localhost:8080", "http://localhost:3000"]
```

## Steps to Fix

### 1. Restart Backend
```bash
cd backend
# Stop current backend (Ctrl+C)
python main.py
```

### 2. Verify Backend is Running
```bash
curl http://localhost:8000/health
# Should return: {"status":"healthy","version":"1.0.0"}
```

### 3. Test Subscription Endpoint
```bash
curl http://localhost:8000/api/v1/subscriptions/plans
# Should return array of 3 plans
```

### 4. Refresh Frontend
- Hard refresh browser: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
- Navigate to `/subscription` page
- Should now load without CORS error

## Verify It Works

### Check Browser Console
Should see successful API calls:
```
GET http://localhost:8000/api/v1/subscriptions/plans - 200 OK
GET http://localhost:8000/api/v1/subscriptions/current?workspace_id=... - 200 OK
```

### Check Subscription Page
Should display:
- ✅ Three plan cards (Free, Pro, Enterprise)
- ✅ Current plan status
- ✅ Usage metrics
- ✅ No CORS errors

## Additional Notes

### If Backend Won't Start
Check that database migration ran:
```sql
-- In Supabase SQL Editor
SELECT table_name 
FROM information_schema.tables 
WHERE table_name IN ('subscription_plans', 'workspace_subscriptions');
```

If tables don't exist, run `fix-subscription-setup.sql` first.

### If Still Getting CORS Errors
1. Check backend logs for errors
2. Verify backend is running on port 8000
3. Check frontend is calling correct URL
4. Clear browser cache completely

### Alternative: Use Environment Variable
You can also set CORS origins in `.env`:
```env
CORS_ORIGINS=["http://localhost:5173","http://localhost:8080","http://localhost:3000"]
```

## React Router Warning
The React Router warning about `v7_relativeSplatPath` is just a deprecation notice. You can ignore it or add the flag to your router configuration:

```typescript
// src/App.tsx
<BrowserRouter future={{ v7_relativeSplatPath: true }}>
  {/* routes */}
</BrowserRouter>
```

## Summary
✅ CORS configuration updated
✅ Backend supports localhost:8080
✅ Restart backend to apply changes
✅ Subscription page should now work
