# Subscription System - Implementation Fixes

## Fix #1: AI Query Limits (User-Level) - 30 minutes

### File: `backend/app/api/endpoints/ai_chat.py`

**Find and replace 3 locations:**

#### Location 1: ask_anything endpoint (around line 183)

**BEFORE:**
```python
if request.workspace_id:
    subscription_service = SubscriptionService(supabase_admin)
    await subscription_service.enforce_limit(
        request.workspace_id, 
        "max_ai_queries_per_day", 
        1
    )

    await subscription_service.increment_usage(
        request.workspace_id,
        "max_ai_queries_per_day",
        1
    )
```

**AFTER:**
```python
# Check user-level limit for AI queries
from app.services.user_subscription_service import UserSubscriptionService
user_sub_service = UserSubscriptionService(supabase_admin)
await user_sub_service.enforce_user_limit(
    user_id,
    "max_ai_queries_per_day", 
    1
)

await user_sub_service.increment_user_usage(
    user_id,
    "max_ai_queries_per_day",
    1
)
```

#### Location 2: ask_anything_stream endpoint (around line 405)

Same change as Location 1

#### Location 3: ask_anything_build endpoint (around line 538)

Same change as Location 1

---

## Fix #2: Stripe Payment Integration - 4-6 hours

### File: `backend/app/api/endpoints/subscriptions.py`

**Replace entire file with:**

```python
"""
Subscription API Endpoints
User-level subscriptions with Stripe payment integration
"""
from fastapi import APIRouter, Depends, HTTPException, Request
from typing import Dict, Any, List
from pydantic import BaseModel
from datetime import datetime
import stripe
import os

from app.api.dependencies import get_current_user
from app.core.supabase import supabase_admin
from app.services.user_subscription_service import UserSubscriptionService

router = APIRouter()

# Initialize Stripe
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

# ============================================
# REQUEST MODELS
# ============================================

class UpgradeRequest(BaseModel):
    plan_name: str
    billing_cycle: str = "monthly"

class CancelRequest(BaseModel):
    immediate: bool = False

# ============================================
# ENDPOINTS
# ============================================

@router.get("/plans")
async def get_plans() -> List[Dict[str, Any]]:
    """Get all available subscription plans (public)"""
    result = supabase_admin.table("subscription_plans")\
        .select("*")\
        .eq("is_active", True)\
        .order("sort_order")\
        .execute()
    
    return result.data


@router.get("/current")
async def get_current_subscription(
    current_user: str = Depends(get_current_user)
) -> Dict[str, Any]:
    """Get current subscription for user with usage"""
    service = UserSubscriptionService(supabase_admin)
    return await service.get_subscription_status(current_user)


@router.post("/upgrade")
async def upgrade_subscription(
    request: UpgradeRequest,
    current_user: str = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Upgrade user to new plan
    Creates Stripe checkout session for payment
    """
    try:
        service = UserSubscriptionService(supabase_admin)
        
        # Get the plan
        plan = await service.get_plan_by_name(request.plan_name)
        
        # Get or create Stripe customer
        subscription = await service.get_user_subscription(current_user)
        stripe_customer_id = subscription.get("stripe_customer_id")
        
        if not stripe_customer_id:
            # Create new Stripe customer
            customer = stripe.Customer.create(
                email=current_user,
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
            raise HTTPException(
                status_code=400, 
                detail=f"Plan {request.plan_name} not available for purchase"
            )
        
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
            success_url=f"{FRONTEND_URL}/subscription?success=true&session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{FRONTEND_URL}/subscription?cancelled=true",
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
        
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/cancel")
async def cancel_subscription(
    request: CancelRequest,
    current_user: str = Depends(get_current_user)
) -> Dict[str, Any]:
    """Cancel subscription and downgrade to free plan"""
    try:
        service = UserSubscriptionService(supabase_admin)
        
        # Get current subscription
        subscription = await service.get_user_subscription(current_user)
        stripe_subscription_id = subscription.get("stripe_subscription_id")
        
        # Cancel Stripe subscription if exists
        if stripe_subscription_id:
            stripe.Subscription.delete(stripe_subscription_id)
        
        # Downgrade to free plan
        result = await service.upgrade_subscription(
            user_id=current_user,
            new_plan_name="free",
            billing_cycle="monthly"
        )
        
        return {
            "success": True,
            "message": "Subscription cancelled, downgraded to Free plan",
            "subscription": result
        }
        
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/usage")
async def get_usage(
    current_user: str = Depends(get_current_user)
) -> Dict[str, Any]:
    """Get current usage metrics for user"""
    service = UserSubscriptionService(supabase_admin)
    usage = await service.get_all_user_usage(current_user)
    subscription = await service.get_user_subscription(current_user)
    
    plan = subscription.get("plan", {})
    features = plan.get("features", {})
    
    # Format usage with limits
    usage_with_limits = {}
    for metric, current in usage.items():
        limit = features.get(metric, 0)
        usage_with_limits[metric] = {
            "current": current,
            "limit": limit if limit != -1 else "unlimited",
            "percentage": (current / limit * 100) if limit > 0 and limit != -1 else 0
        }
    
    return {
        "user_id": current_user,
        "plan": plan.get("name"),
        "usage": usage_with_limits
    }


@router.get("/check-limit/{metric_type}")
async def check_limit(
    metric_type: str,
    increment: int = 1,
    current_user: str = Depends(get_current_user)
) -> Dict[str, Any]:
    """Check if user can perform action within limits"""
    service = UserSubscriptionService(supabase_admin)
    return await service.check_user_limit(current_user, metric_type, increment)


@router.post("/webhook/stripe")
async def stripe_webhook(request: Request) -> Dict[str, str]:
    """
    Handle Stripe webhooks
    Events: subscription.created, subscription.updated, invoice.paid, etc.
    """
    try:
        payload = await request.body()
        sig_header = request.headers.get("stripe-signature")
        
        # Verify webhook signature
        event = stripe.Webhook.construct_event(
            payload, sig_header, STRIPE_WEBHOOK_SECRET
        )
        
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")
    
    service = UserSubscriptionService(supabase_admin)
    
    # Handle subscription events
    if event["type"] == "customer.subscription.updated":
        subscription = event["data"]["object"]
        user_id = subscription["metadata"].get("user_id")
        
        if user_id:
            plan_name = subscription["metadata"].get("plan_name", "pro")
            billing_cycle = subscription["metadata"].get("billing_cycle", "monthly")
            
            # Update subscription
            await service.upgrade_subscription(
                user_id=user_id,
                new_plan_name=plan_name,
                billing_cycle=billing_cycle
            )
            
            # Update Stripe IDs
            supabase_admin.table("user_subscriptions")\
                .update({
                    "stripe_subscription_id": subscription["id"],
                    "stripe_customer_id": subscription["customer"]
                })\
                .eq("user_id", user_id)\
                .execute()
    
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
                "description": f"Invoice {invoice['number']}",
                "stripe_invoice_id": invoice["id"],
                "paid_at": datetime.fromtimestamp(invoice["paid_at"]).isoformat()
            }).execute()
    
    elif event["type"] == "invoice.payment_failed":
        invoice = event["data"]["object"]
        user_id = invoice["metadata"].get("user_id")
        
        if user_id:
            # Record failed payment
            supabase_admin.table("billing_history").insert({
                "user_id": user_id,
                "amount": invoice["amount_due"] / 100,
                "currency": invoice["currency"].upper(),
                "status": "failed",
                "description": f"Failed payment for invoice {invoice['number']}",
                "stripe_invoice_id": invoice["id"]
            }).execute()
    
    elif event["type"] == "customer.subscription.deleted":
        subscription = event["data"]["object"]
        user_id = subscription["metadata"].get("user_id")
        
        if user_id:
            # Downgrade to free
            await service.upgrade_subscription(
                user_id=user_id,
                new_plan_name="free",
                billing_cycle="monthly"
            )
    
    return {"status": "received"}
```

---

## Fix #3: Add Stripe Price IDs to Plans

### File: `backend/migrations/add_stripe_price_ids.sql`

**Create new migration file:**

```sql
-- Add Stripe price IDs to subscription plans
-- Run this after creating Stripe products and prices

UPDATE subscription_plans
SET stripe_price_id = CASE 
    WHEN name = 'pro' AND billing_cycle = 'monthly' THEN 'price_1234567890_monthly'
    WHEN name = 'pro' AND billing_cycle = 'yearly' THEN 'price_1234567890_yearly'
    WHEN name = 'enterprise' AND billing_cycle = 'monthly' THEN 'price_0987654321_monthly'
    WHEN name = 'enterprise' AND billing_cycle = 'yearly' THEN 'price_0987654321_yearly'
END
WHERE name IN ('pro', 'enterprise');

-- Note: Replace price IDs with actual Stripe price IDs
-- Get these from Stripe dashboard after creating products
```

---

## Fix #4: Update Environment Variables

### File: `.env`

**Add:**

```
# Stripe
STRIPE_SECRET_KEY=sk_live_YOUR_KEY_HERE
STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_KEY_HERE
STRIPE_WEBHOOK_SECRET=whsec_YOUR_SECRET_HERE

# Frontend
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_KEY_HERE

# URLs
FRONTEND_URL=https://yourdomain.com
WEBHOOK_URL=https://yourdomain.com/api/v1/subscriptions/webhook/stripe
```

---

## Fix #5: Update Frontend to Handle Stripe Redirect

### File: `src/pages/SubscriptionPage.tsx`

**Update handleUpgrade function:**

```typescript
const handleUpgrade = async (planName: string) => {
  try {
    setLoading(true);
    const result = await api.upgradeSubscription(planName, billingCycle);
    
    if (result.checkout_url) {
      // Redirect to Stripe checkout
      window.location.href = result.checkout_url;
    } else {
      toast.success(`Successfully upgraded to ${planName}!`);
      loadData();
    }
  } catch (error: any) {
    toast.error(error.message || 'Failed to upgrade subscription');
  } finally {
    setLoading(false);
  }
};
```

**Add success/cancelled handling:**

```typescript
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  
  if (params.get('success')) {
    toast.success('Payment successful! Your subscription has been updated.');
    // Reload subscription data
    loadData();
    // Clear URL params
    window.history.replaceState({}, document.title, window.location.pathname);
  }
  
  if (params.get('cancelled')) {
    toast.info('Payment cancelled. Your subscription was not updated.');
    // Clear URL params
    window.history.replaceState({}, document.title, window.location.pathname);
  }
}, []);
```

---

## Fix #6: Add Storage Usage Tracking

### File: `backend/app/services/user_subscription_service.py`

**Add method:**

```python
async def track_storage_usage(
    self,
    user_id: str,
    bytes_added: int
) -> None:
    """Track storage usage in MB"""
    mb_added = bytes_added // (1024 * 1024)
    if mb_added > 0:
        await self.increment_user_usage(user_id, "max_storage_mb", mb_added)
```

---

## Fix #7: Add Database Triggers for Storage Tracking

### File: `backend/migrations/add_storage_tracking.sql`

**Create new migration:**

```sql
-- Track storage usage when pages are created/updated

CREATE OR REPLACE FUNCTION track_page_storage()
RETURNS TRIGGER AS $
BEGIN
    IF NEW.workspace_id IS NOT NULL THEN
        -- Get workspace owner
        DECLARE
            owner_id UUID;
            bytes_added INT;
        BEGIN
            SELECT user_id INTO owner_id FROM workspaces WHERE id = NEW.workspace_id;
            
            IF owner_id IS NOT NULL THEN
                -- Calculate bytes added
                bytes_added := COALESCE(octet_length(NEW.content), 0) - 
                               COALESCE(octet_length(OLD.content), 0);
                
                IF bytes_added > 0 THEN
                    -- Increment storage usage
                    PERFORM increment_user_usage(
                        owner_id, 
                        'max_storage_mb', 
                        bytes_added / (1024 * 1024)
                    );
                END IF;
            END IF;
        END;
    END IF;
    RETURN NEW;
END;
$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_track_page_storage ON pages;
CREATE TRIGGER trigger_track_page_storage
    AFTER UPDATE ON pages
    FOR EACH ROW
    WHEN (OLD.content IS DISTINCT FROM NEW.content)
    EXECUTE FUNCTION track_page_storage();
```

---

## Deployment Steps

1. **Create Stripe Account**
   - Go to stripe.com
   - Create account
   - Get API keys

2. **Create Stripe Products**
   - Create product "Pro Plan"
   - Create prices: monthly ($19.99) and yearly ($199.99)
   - Create product "Enterprise Plan"
   - Create prices: monthly ($99.99) and yearly ($999.99)
   - Copy price IDs

3. **Update Database**
   - Run migration: `add_stripe_price_ids.sql`
   - Update price IDs with actual Stripe IDs
   - Run migration: `add_storage_tracking.sql`

4. **Update Environment**
   - Add Stripe keys to `.env`
   - Add webhook URL to Stripe dashboard

5. **Update Code**
   - Apply Fix #1: AI query limits
   - Apply Fix #2: Stripe integration
   - Apply Fix #5: Frontend redirect
   - Apply Fix #6 & #7: Storage tracking

6. **Test**
   - Test upgrade flow
   - Test payment processing
   - Test webhook handling
   - Test limit enforcement

7. **Deploy**
   - Deploy backend
   - Deploy frontend
   - Monitor Stripe logs

---

## Verification Checklist

- [ ] Stripe keys configured
- [ ] Stripe products created
- [ ] Price IDs added to database
- [ ] AI query limits use user-level model
- [ ] Upgrade endpoint creates checkout session
- [ ] Webhook handler processes events
- [ ] Storage tracking triggers created
- [ ] Frontend redirects to Stripe
- [ ] Payment successful updates subscription
- [ ] Billing history records created
- [ ] Limit enforcement working
- [ ] Error handling in place

