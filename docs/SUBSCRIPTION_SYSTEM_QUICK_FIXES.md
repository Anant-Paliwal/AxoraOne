# Subscription System - Quick Fixes

## Issue 1: AI Query Limits Use Wrong Model (CRITICAL)

### Problem
AI queries are limited at **workspace level** instead of **user level**. Users can bypass limits by creating multiple workspaces.

### Fix
**File:** `backend/app/api/endpoints/ai_chat.py`

**Change from:**
```python
from app.services.subscription_service import SubscriptionService

# Line 183-188
subscription_service = SubscriptionService(supabase_admin)
await subscription_service.enforce_limit(
    request.workspace_id, 
    "max_ai_queries_per_day", 
    1
)
```

**Change to:**
```python
from app.services.user_subscription_service import UserSubscriptionService

# Line 183-188
user_sub_service = UserSubscriptionService(supabase_admin)
await user_sub_service.enforce_user_limit(
    user_id,  # Use user_id instead of workspace_id
    "max_ai_queries_per_day", 
    1
)
```

**Locations to fix:**
- Line 183-188 (ask_anything endpoint)
- Line 405-410 (ask_anything_stream endpoint)
- Line 538-543 (ask_anything_build endpoint)

---

## Issue 2: Stripe Payment Integration Missing (CRITICAL)

### Problem
Users can upgrade to Pro/Enterprise plans WITHOUT paying.

### Fix
**File:** `backend/app/api/endpoints/subscriptions.py`

**Replace the upgrade endpoint:**

```python
import stripe
from app.core.config import settings

# Initialize Stripe
stripe.api_key = settings.STRIPE_SECRET_KEY

@router.post("/upgrade")
async def upgrade_subscription(
    request: UpgradeRequest,
    current_user: str = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Upgrade USER to new plan
    Creates Stripe checkout session for payment
    """
    service = UserSubscriptionService(supabase_admin)
    
    # Get the plan
    plan = await service.get_plan_by_name(request.plan_name)
    
    # Get or create Stripe customer
    subscription = await service.get_user_subscription(current_user)
    stripe_customer_id = subscription.get("stripe_customer_id")
    
    if not stripe_customer_id:
        # Create new Stripe customer
        customer = stripe.Customer.create(
            email=current_user,  # Should be user email from auth
            metadata={"user_id": current_user}
        )
        stripe_customer_id = customer.id
        
        # Save to database
        supabase_admin.table("user_subscriptions")\
            .update({"stripe_customer_id": stripe_customer_id})\
            .eq("user_id", current_user)\
            .execute()
    
    # Get price ID from plan
    price_id = plan.get("stripe_price_id")
    if not price_id:
        raise HTTPException(status_code=400, detail="Plan not available for purchase")
    
    # Create checkout session
    checkout_session = stripe.checkout.Session.create(
        customer=stripe_customer_id,
        payment_method_types=["card"],
        line_items=[
            {
                "price": price_id,
                "quantity": 1,
            }
        ],
        mode="subscription",
        success_url=f"{settings.FRONTEND_URL}/subscription?success=true",
        cancel_url=f"{settings.FRONTEND_URL}/subscription?cancelled=true",
        metadata={
            "user_id": current_user,
            "plan_name": request.plan_name,
            "billing_cycle": request.billing_cycle
        }
    )
    
    return {
        "success": True,
        "checkout_url": checkout_session.url,
        "session_id": checkout_session.id
    }
```

**Add webhook handler:**

```python
@router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    """Handle Stripe webhooks"""
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    
    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
        )
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")
    
    # Handle subscription events
    if event["type"] == "customer.subscription.updated":
        subscription = event["data"]["object"]
        user_id = subscription["metadata"].get("user_id")
        
        if user_id:
            service = UserSubscriptionService(supabase_admin)
            await service.upgrade_subscription(
                user_id=user_id,
                new_plan_name=subscription["metadata"].get("plan_name", "pro"),
                billing_cycle=subscription["metadata"].get("billing_cycle", "monthly")
            )
    
    elif event["type"] == "invoice.paid":
        invoice = event["data"]["object"]
        user_id = invoice["metadata"].get("user_id")
        
        if user_id:
            # Record billing history
            supabase_admin.table("billing_history").insert({
                "user_id": user_id,
                "amount": invoice["amount_paid"] / 100,  # Convert from cents
                "currency": invoice["currency"].upper(),
                "status": "succeeded",
                "stripe_invoice_id": invoice["id"],
                "paid_at": datetime.fromtimestamp(invoice["paid_at"]).isoformat()
            }).execute()
    
    elif event["type"] == "customer.subscription.deleted":
        subscription = event["data"]["object"]
        user_id = subscription["metadata"].get("user_id")
        
        if user_id:
            service = UserSubscriptionService(supabase_admin)
            # Downgrade to free
            await service.upgrade_subscription(
                user_id=user_id,
                new_plan_name="free",
                billing_cycle="monthly"
            )
    
    return {"status": "received"}
```

**Add to environment variables:**
```
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

---

## Issue 3: Incomplete Usage Tracking

### Problem
Storage and team member usage not tracked.

### Fix
**File:** `backend/app/services/user_subscription_service.py`

**Add tracking functions:**

```python
async def track_storage_usage(self, user_id: str, bytes_added: int) -> None:
    """Track storage usage"""
    await self.increment_user_usage(user_id, "max_storage_mb", bytes_added // (1024 * 1024))

async def track_team_member(self, user_id: str, workspace_id: str, action: str) -> None:
    """Track team member additions/removals"""
    if action == "add":
        await self.increment_user_usage(user_id, "max_team_members", 1)
    elif action == "remove":
        # Decrement (if supported)
        pass
```

**Add database triggers:**

```sql
-- Track storage usage
CREATE OR REPLACE FUNCTION track_storage_usage()
RETURNS TRIGGER AS $
BEGIN
    IF NEW.workspace_id IS NOT NULL THEN
        -- Get workspace owner
        SELECT user_id INTO user_id FROM workspaces WHERE id = NEW.workspace_id;
        PERFORM increment_user_usage(user_id, 'max_storage_mb', 
            (octet_length(NEW.content) - octet_length(OLD.content)) / (1024 * 1024));
    END IF;
    RETURN NEW;
END;
$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_track_storage ON pages;
CREATE TRIGGER trigger_track_storage
    AFTER UPDATE ON pages
    FOR EACH ROW
    EXECUTE FUNCTION track_storage_usage();
```

---

## Issue 4: Missing Billing History

### Problem
No invoice records created when users upgrade.

### Fix
**File:** `backend/app/api/endpoints/subscriptions.py`

**Add after successful payment:**

```python
async def record_billing_event(
    user_id: str,
    amount: float,
    plan_name: str,
    billing_cycle: str
) -> None:
    """Record billing event in history"""
    supabase_admin.table("billing_history").insert({
        "user_id": user_id,
        "amount": amount,
        "currency": "USD",
        "status": "succeeded",
        "description": f"Subscription to {plan_name} plan ({billing_cycle})",
        "paid_at": datetime.utcnow().isoformat()
    }).execute()
```

---

## Issue 5: Frontend API Methods Incomplete

### Problem
`checkFeatureAccess()` method incomplete.

### Fix
**File:** `src/lib/api.ts`

**Complete the method:**

```typescript
async checkFeatureAccess(workspaceId: string, featureName: string) {
  const headers = await getAuthHeaders();
  const response = await fetch(
    `${API_BASE_URL}/subscriptions/check-feature?workspace_id=${workspaceId}`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({ feature_name: featureName })
    }
  );
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Feature access check failed');
  }
  return response.json();
},

async checkLimit(metricType: string) {
  const headers = await getAuthHeaders();
  const response = await fetch(
    `${API_BASE_URL}/subscriptions/check-limit/${metricType}`,
    { headers }
  );
  if (!response.ok) throw new Error('Failed to check limit');
  return response.json();
},

async getBillingHistory() {
  const headers = await getAuthHeaders();
  const response = await fetch(
    `${API_BASE_URL}/subscriptions/billing-history`,
    { headers }
  );
  if (!response.ok) throw new Error('Failed to fetch billing history');
  return response.json();
}
```

---

## Testing After Fixes

### Test 1: AI Query Limits (User-Level)
```bash
# Create 2 workspaces
# Make 21 AI queries in workspace 1 → Should fail
# Make 1 AI query in workspace 2 → Should also fail (user-level limit)
```

### Test 2: Stripe Integration
```bash
# Go to /subscription
# Click "Upgrade to Pro"
# Should redirect to Stripe checkout
# Complete payment
# Should update subscription
```

### Test 3: Billing History
```bash
# After payment, check /subscriptions/billing-history
# Should show payment record
```

---

## Deployment Checklist

- [ ] Add Stripe API keys to environment
- [ ] Update ai_chat.py to use user-level limits
- [ ] Implement Stripe webhook handler
- [ ] Add storage tracking triggers
- [ ] Test all payment flows
- [ ] Test limit enforcement
- [ ] Update frontend to handle Stripe redirect
- [ ] Add error handling for payment failures
- [ ] Document payment flow for users
- [ ] Set up Stripe webhook in dashboard

