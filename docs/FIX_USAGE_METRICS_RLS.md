# Usage Metrics RLS Fix ✅

## Problem
The subscription service was failing to insert/update usage metrics with error:
```
new row violates row-level security policy for table "usage_metrics"
```

## Root Cause
The `subscription_service.py` was using the regular Supabase client (`self.supabase`) which uses the user's JWT token and is subject to RLS policies. Usage metrics operations were being blocked by RLS.

## Solution
Updated all `usage_metrics` table operations to use `self.admin_client` (service role key) which bypasses RLS:

### Methods Fixed:
1. **increment_usage()** - INSERT and UPDATE operations
2. **get_usage()** - SELECT operations  
3. **get_all_usage()** - SELECT operations
4. **reset_usage_metrics()** - DELETE operations

## Why Admin Client?
Usage metrics are system-level operations that need to happen regardless of user permissions:
- Tracking AI query usage
- Tracking page creation
- Tracking storage usage
- Resetting metrics for billing periods

These operations should always succeed, so they need to bypass RLS.

## Testing
Restart the backend server and test:
```bash
# The AI chat should now work without RLS errors
# Usage metrics will be tracked properly
```

## Files Modified
- `backend/app/services/subscription_service.py`
