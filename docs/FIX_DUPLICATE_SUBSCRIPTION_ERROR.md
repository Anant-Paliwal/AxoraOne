# Fixed: Duplicate User Subscription Error ✅

## Problem

Database error when upgrading subscription:
```
duplicate key value violates unique constraint "user_subscriptions_user_id_key"
Key (user_id)=(b6824775-bb92-4277-8de4-5d15303b0c98) already exists
```

## Root Cause

In `backend/app/services/razorpay_service.py`, the `create_subscription` method was using `.upsert()` without specifying the conflict resolution column.

When Supabase's `.upsert()` is called without `on_conflict` parameter, it doesn't know which column to check for duplicates, causing it to attempt an INSERT even when a record already exists.

## Solution

Added `on_conflict="user_id"` parameter to the upsert call:

```python
# Line ~93 in razorpay_service.py
supabase_admin.table("user_subscriptions")\
    .upsert(subscription_record, on_conflict="user_id")\
    .execute()
```

## How It Works Now

### First Time Subscription
1. User clicks "Upgrade to Pro"
2. No existing record → INSERT new subscription
3. ✅ Success

### Upgrading Existing Subscription
1. User clicks "Upgrade to Pro Plus"
2. Record exists with same user_id → UPDATE existing subscription
3. ✅ Success (no duplicate error)

### Downgrading Then Upgrading Again
1. User cancels subscription (downgrades to FREE)
2. User upgrades again to Pro
3. Record exists → UPDATE existing subscription
4. ✅ Success (no duplicate error)

## Database Constraint

The `user_subscriptions` table has a UNIQUE constraint on `user_id`:
```sql
CONSTRAINT user_subscriptions_user_id_key UNIQUE (user_id)
```

This ensures each user can only have ONE subscription record (which is correct for the business logic).

## Files Modified

- `backend/app/services/razorpay_service.py` (line ~93)

## Testing Scenarios

✅ New user subscribing for first time
✅ Existing user upgrading plan
✅ User downgrading then upgrading again
✅ User switching billing cycles (monthly ↔ yearly)

## Deploy

Restart the backend to apply the fix:
```bash
cd backend
python -m uvicorn app.main:app --reload --port 8000
```

Or on Render, the fix will be applied on next deployment.

## Related Files

- `backend/app/api/endpoints/subscriptions.py` - Subscription endpoints
- `backend/app/services/plan_service.py` - Plan management
- Database table: `user_subscriptions`

The subscription system now handles all upgrade/downgrade scenarios correctly! 🚀
