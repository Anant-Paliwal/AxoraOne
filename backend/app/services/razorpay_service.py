"""
Razorpay Service - Handle subscription payments
Webhooks are the source of truth for subscription status
"""
import razorpay
import hmac
import hashlib
from typing import Dict, Any, Optional
from datetime import datetime, timedelta
from app.core.config import settings
from app.core.supabase import supabase_admin

class RazorpayService:
    """Service for Razorpay subscription management"""
    
    def __init__(self):
        self.key_id = settings.RAZORPAY_KEY_ID
        self.key_secret = settings.RAZORPAY_KEY_SECRET
        self.webhook_secret = settings.RAZORPAY_WEBHOOK_SECRET
        
        # Initialize Razorpay client
        self.client = razorpay.Client(auth=(self.key_id, self.key_secret))
    
    # ============================================
    # SUBSCRIPTION CREATION
    # ============================================
    
    async def create_subscription(
        self,
        user_id: str,
        plan_code: str,
        billing_cycle: str,
        user_email: str
    ) -> Dict[str, Any]:
        """
        Create Razorpay subscription
        Returns subscription_id for checkout
        """
        # Get plan from database
        plan_result = supabase_admin.table("subscription_plans")\
            .select("*")\
            .eq("code", plan_code)\
            .single()\
            .execute()
        
        if not plan_result.data:
            raise ValueError(f"Plan {plan_code} not found")
        
        plan = plan_result.data
        
        # Get Razorpay plan ID based on billing cycle
        if billing_cycle == "monthly":
            razorpay_plan_id = plan.get("razorpay_plan_id_monthly")
            total_count = 12  # 12 monthly payments
        elif billing_cycle == "yearly":
            razorpay_plan_id = plan.get("razorpay_plan_id_yearly")
            total_count = 1  # 1 yearly payment
        else:
            raise ValueError("Invalid billing cycle")
        
        if not razorpay_plan_id:
            raise ValueError(f"Razorpay plan ID not configured for {plan_code} {billing_cycle}")
        
        # Create subscription on Razorpay
        subscription_data = {
            "plan_id": razorpay_plan_id,
            "customer_notify": 1,
            "total_count": total_count,
            "notes": {
                "user_id": user_id,
                "plan_code": plan_code,
                "billing_cycle": billing_cycle
            }
        }
        
        razorpay_subscription = self.client.subscription.create(subscription_data)
        
        # Create pending subscription in database
        subscription_record = {
            "user_id": user_id,
            "plan_code": plan_code,
            "status": "pending",
            "billing_cycle": billing_cycle,
            "razorpay_subscription_id": razorpay_subscription["id"],
            "razorpay_plan_id": razorpay_plan_id,
            "start_at": datetime.now().isoformat()
        }
        
        # Upsert subscription (update if exists, insert if not)
        # Use onConflict to specify which column to check for duplicates
        supabase_admin.table("user_subscriptions")\
            .upsert(subscription_record, on_conflict="user_id")\
            .execute()
        
        return {
            "razorpay_subscription_id": razorpay_subscription["id"],
            "plan_code": plan_code,
            "billing_cycle": billing_cycle,
            "razorpay_key_id": self.key_id
        }
    
    # ============================================
    # PAYMENT VERIFICATION
    # ============================================
    
    def verify_payment_signature(
        self,
        payment_id: str,
        subscription_id: str,
        signature: str
    ) -> bool:
        """
        Verify Razorpay payment signature
        IMPORTANT: This only verifies the payment, not the subscription status
        Webhook is the source of truth for activation
        """
        try:
            # Create expected signature
            message = f"{payment_id}|{subscription_id}"
            expected_signature = hmac.new(
                self.key_secret.encode(),
                message.encode(),
                hashlib.sha256
            ).hexdigest()
            
            return hmac.compare_digest(expected_signature, signature)
        except Exception as e:
            print(f"Signature verification error: {e}")
            return False
    
    def verify_webhook_signature(self, payload: str, signature: str) -> bool:
        """Verify webhook signature"""
        try:
            expected_signature = hmac.new(
                self.webhook_secret.encode(),
                payload.encode(),
                hashlib.sha256
            ).hexdigest()
            
            return hmac.compare_digest(expected_signature, signature)
        except Exception as e:
            print(f"Webhook signature verification error: {e}")
            return False
    
    # ============================================
    # WEBHOOK HANDLERS (SOURCE OF TRUTH)
    # ============================================
    
    async def handle_webhook_event(self, event_type: str, payload: Dict[str, Any]) -> Dict[str, str]:
        """
        Handle Razorpay webhook events
        This is the SOURCE OF TRUTH for subscription status
        """
        try:
            if event_type == "subscription.activated":
                return await self._handle_subscription_activated(payload)
            
            elif event_type == "subscription.charged":
                return await self._handle_subscription_charged(payload)
            
            elif event_type == "subscription.cancelled":
                return await self._handle_subscription_cancelled(payload)
            
            elif event_type == "subscription.completed":
                return await self._handle_subscription_completed(payload)
            
            elif event_type == "invoice.paid":
                return await self._handle_invoice_paid(payload)
            
            elif event_type == "payment.failed":
                return await self._handle_payment_failed(payload)
            
            else:
                return {"status": "ignored", "event": event_type}
        
        except Exception as e:
            print(f"Webhook handler error: {e}")
            return {"status": "error", "message": str(e)}
    
    async def _handle_subscription_activated(self, payload: Dict[str, Any]) -> Dict[str, str]:
        """Handle subscription.activated event"""
        subscription = payload.get("payload", {}).get("subscription", {}).get("entity", {})
        subscription_id = subscription.get("id")
        
        if not subscription_id:
            return {"status": "error", "message": "No subscription ID"}
        
        # Get subscription from database
        result = supabase_admin.table("user_subscriptions")\
            .select("*")\
            .eq("razorpay_subscription_id", subscription_id)\
            .single()\
            .execute()
        
        if not result.data:
            return {"status": "error", "message": "Subscription not found in database"}
        
        # Calculate period end
        current_end = subscription.get("current_end")
        if current_end:
            period_end = datetime.fromtimestamp(current_end)
        else:
            # Fallback: 30 days from now
            period_end = datetime.now() + timedelta(days=30)
        
        # Activate subscription
        supabase_admin.table("user_subscriptions")\
            .update({
                "status": "active",
                "start_at": datetime.now().isoformat(),
                "current_period_end": period_end.isoformat(),
                "updated_at": datetime.now().isoformat()
            })\
            .eq("razorpay_subscription_id", subscription_id)\
            .execute()
        
        return {"status": "success", "event": "subscription.activated"}
    
    async def _handle_subscription_charged(self, payload: Dict[str, Any]) -> Dict[str, str]:
        """Handle subscription.charged event"""
        payment = payload.get("payload", {}).get("payment", {}).get("entity", {})
        subscription_id = payment.get("subscription_id")
        
        if not subscription_id:
            return {"status": "ignored"}
        
        # Fetch subscription from Razorpay to get current_end
        try:
            razorpay_sub = self.client.subscription.fetch(subscription_id)
            current_end = razorpay_sub.get("current_end")
            
            if current_end:
                period_end = datetime.fromtimestamp(current_end)
                
                # Update period end
                supabase_admin.table("user_subscriptions")\
                    .update({
                        "current_period_end": period_end.isoformat(),
                        "updated_at": datetime.now().isoformat()
                    })\
                    .eq("razorpay_subscription_id", subscription_id)\
                    .execute()
        except Exception as e:
            print(f"Error fetching subscription: {e}")
        
        return {"status": "success", "event": "subscription.charged"}
    
    async def _handle_subscription_cancelled(self, payload: Dict[str, Any]) -> Dict[str, str]:
        """Handle subscription.cancelled event"""
        subscription = payload.get("payload", {}).get("subscription", {}).get("entity", {})
        subscription_id = subscription.get("id")
        
        if not subscription_id:
            return {"status": "error", "message": "No subscription ID"}
        
        # Downgrade to FREE
        supabase_admin.table("user_subscriptions")\
            .update({
                "plan_code": "FREE",
                "status": "cancelled",
                "billing_cycle": None,
                "razorpay_subscription_id": None,
                "razorpay_plan_id": None,
                "updated_at": datetime.now().isoformat()
            })\
            .eq("razorpay_subscription_id", subscription_id)\
            .execute()
        
        return {"status": "success", "event": "subscription.cancelled"}
    
    async def _handle_subscription_completed(self, payload: Dict[str, Any]) -> Dict[str, str]:
        """Handle subscription.completed event"""
        return await self._handle_subscription_cancelled(payload)
    
    async def _handle_invoice_paid(self, payload: Dict[str, Any]) -> Dict[str, str]:
        """Handle invoice.paid event"""
        invoice = payload.get("payload", {}).get("invoice", {}).get("entity", {})
        subscription_id = invoice.get("subscription_id")
        
        if not subscription_id:
            return {"status": "ignored"}
        
        # Similar to subscription.charged
        return await self._handle_subscription_charged(payload)
    
    async def _handle_payment_failed(self, payload: Dict[str, Any]) -> Dict[str, str]:
        """Handle payment.failed event"""
        payment = payload.get("payload", {}).get("payment", {}).get("entity", {})
        subscription_id = payment.get("subscription_id")
        
        if not subscription_id:
            return {"status": "ignored"}
        
        # Keep subscription active but log warning
        # Business decision: grace period or immediate suspension
        print(f"Payment failed for subscription: {subscription_id}")
        
        return {"status": "success", "event": "payment.failed"}
    
    # ============================================
    # SUBSCRIPTION MANAGEMENT
    # ============================================
    
    async def cancel_subscription(self, user_id: str, immediate: bool = False) -> Dict[str, Any]:
        """Cancel user subscription"""
        # Get user subscription
        result = supabase_admin.table("user_subscriptions")\
            .select("*")\
            .eq("user_id", user_id)\
            .single()\
            .execute()
        
        if not result.data:
            raise ValueError("No subscription found")
        
        subscription = result.data
        razorpay_sub_id = subscription.get("razorpay_subscription_id")
        
        if not razorpay_sub_id:
            # Already on FREE plan
            return {"status": "success", "message": "Already on FREE plan"}
        
        # Cancel on Razorpay
        try:
            if immediate:
                self.client.subscription.cancel(razorpay_sub_id, {"cancel_at_cycle_end": 0})
            else:
                self.client.subscription.cancel(razorpay_sub_id, {"cancel_at_cycle_end": 1})
        except Exception as e:
            print(f"Razorpay cancellation error: {e}")
        
        # Update database (webhook will handle final status)
        if immediate:
            supabase_admin.table("user_subscriptions")\
                .update({
                    "plan_code": "FREE",
                    "status": "cancelled",
                    "billing_cycle": None,
                    "razorpay_subscription_id": None,
                    "updated_at": datetime.now().isoformat()
                })\
                .eq("user_id", user_id)\
                .execute()
        else:
            supabase_admin.table("user_subscriptions")\
                .update({
                    "cancel_at_period_end": True,
                    "updated_at": datetime.now().isoformat()
                })\
                .eq("user_id", user_id)\
                .execute()
        
        return {
            "status": "success",
            "message": "Subscription cancelled" if immediate else "Subscription will cancel at period end"
        }
    
    async def fetch_subscription(self, subscription_id: str) -> Dict[str, Any]:
        """Fetch subscription from Razorpay"""
        try:
            return self.client.subscription.fetch(subscription_id)
        except Exception as e:
            print(f"Error fetching subscription: {e}")
            return {}

# Global instance
razorpay_service = RazorpayService()
