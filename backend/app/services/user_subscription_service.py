"""
User Subscription Service
Handles user-level subscriptions (not workspace-level)
One subscription per user, applies to all their workspaces
"""
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
from supabase import Client
from fastapi import HTTPException
from app.core.supabase import supabase_admin

class UserSubscriptionService:
    def __init__(self, supabase: Client):
        self.supabase = supabase
        self.admin_client = supabase_admin
    
    # ============================================
    # USER SUBSCRIPTION
    # ============================================
    
    async def get_user_subscription(self, user_id: str) -> Dict[str, Any]:
        """Get current subscription for user"""
        result = self.admin_client.table("user_subscriptions")\
            .select("*, plan:subscription_plans(*)")\
            .eq("user_id", user_id)\
            .execute()
        
        if not result.data or len(result.data) == 0:
            # Auto-assign free plan
            return await self.assign_free_plan(user_id)
        
        return result.data[0]
    
    async def assign_free_plan(self, user_id: str) -> Dict[str, Any]:
        """Assign free plan to user"""
        free_plan = await self.get_plan_by_name("free")
        
        subscription_data = {
            "user_id": user_id,
            "plan_id": free_plan["id"],
            "status": "active",
            "billing_cycle": "monthly",
            "current_period_start": datetime.utcnow().isoformat(),
            "current_period_end": (datetime.utcnow() + timedelta(days=36500)).isoformat(),
        }
        
        try:
            result = self.admin_client.table("user_subscriptions")\
                .insert(subscription_data)\
                .execute()
            return result.data[0]
        except Exception as e:
            if "duplicate key" in str(e).lower():
                result = self.admin_client.table("user_subscriptions")\
                    .select("*, plan:subscription_plans(*)")\
                    .eq("user_id", user_id)\
                    .execute()
                return result.data[0]
            raise
    
    async def get_plan_by_name(self, plan_name: str) -> Dict[str, Any]:
        """Get specific plan by name"""
        result = self.supabase.table("subscription_plans")\
            .select("*")\
            .eq("name", plan_name)\
            .execute()
        
        if not result.data or len(result.data) == 0:
            raise HTTPException(status_code=404, detail="Plan not found")
        
        return result.data[0]
    
    # ============================================
    # LIMIT CHECKING (USER-LEVEL)
    # ============================================
    
    async def check_user_limit(
        self,
        user_id: str,
        metric_type: str,
        increment: int = 1
    ) -> Dict[str, Any]:
        """
        Check if user can perform action within limits
        This is GLOBAL across all user's workspaces
        """
        subscription = await self.get_user_subscription(user_id)
        plan = subscription.get("plan", {})
        features = plan.get("features", {})
        
        # Get limit from plan
        limit = features.get(metric_type, 0)
        
        # -1 means unlimited
        if limit == -1:
            return {
                "allowed": True,
                "current": 0,
                "limit": -1,
                "remaining": -1,
                "unlimited": True
            }
        
        # Get current usage (global across all workspaces)
        current_usage = await self.get_current_user_usage(user_id, metric_type)
        
        allowed = (current_usage + increment) <= limit
        remaining = max(0, limit - current_usage)
        
        return {
            "allowed": allowed,
            "current": current_usage,
            "limit": limit,
            "remaining": remaining,
            "unlimited": False
        }
    
    async def enforce_user_limit(
        self,
        user_id: str,
        metric_type: str,
        increment: int = 1
    ) -> None:
        """
        Enforce user-level limit - raises exception if limit exceeded
        """
        check = await self.check_user_limit(user_id, metric_type, increment)
        
        if not check["allowed"]:
            raise HTTPException(
                status_code=403,
                detail={
                    "error": "limit_exceeded",
                    "message": f"You've reached your plan limit for {metric_type}",
                    "current": check["current"],
                    "limit": check["limit"],
                    "upgrade_required": True
                }
            )
    
    # ============================================
    # USAGE TRACKING (USER-LEVEL)
    # ============================================
    
    async def get_current_user_usage(
        self,
        user_id: str,
        metric_type: str
    ) -> int:
        """Get current usage for metric in current period"""
        subscription = await self.get_user_subscription(user_id)
        
        result = self.admin_client.table("user_usage_metrics")\
            .select("count")\
            .eq("user_id", user_id)\
            .eq("metric_type", metric_type)\
            .gte("period_end", datetime.utcnow().isoformat())\
            .execute()
        
        if result.data:
            return result.data[0]["count"]
        return 0
    
    async def increment_user_usage(
        self,
        user_id: str,
        metric_type: str,
        increment: int = 1
    ) -> None:
        """Increment user usage counter"""
        subscription = await self.get_user_subscription(user_id)
        
        period_start = subscription["current_period_start"]
        period_end = subscription["current_period_end"]
        
        try:
            existing = self.admin_client.table("user_usage_metrics")\
                .select("*")\
                .eq("user_id", user_id)\
                .eq("metric_type", metric_type)\
                .eq("period_start", period_start)\
                .execute()
            
            if existing.data:
                self.admin_client.table("user_usage_metrics")\
                    .update({"count": existing.data[0]["count"] + increment})\
                    .eq("id", existing.data[0]["id"])\
                    .execute()
            else:
                self.admin_client.table("user_usage_metrics")\
                    .upsert({
                        "user_id": user_id,
                        "metric_type": metric_type,
                        "count": increment,
                        "period_start": period_start,
                        "period_end": period_end
                    }, on_conflict="user_id,metric_type,period_start")\
                    .execute()
        except Exception as e:
            error_str = str(e)
            if "23505" in error_str or "duplicate key" in error_str.lower():
                existing = self.admin_client.table("user_usage_metrics")\
                    .select("*")\
                    .eq("user_id", user_id)\
                    .eq("metric_type", metric_type)\
                    .eq("period_start", period_start)\
                    .execute()
                
                if existing.data:
                    self.admin_client.table("user_usage_metrics")\
                        .update({"count": existing.data[0]["count"] + increment})\
                        .eq("id", existing.data[0]["id"])\
                        .execute()
            else:
                raise
    
    async def get_all_user_usage(self, user_id: str) -> Dict[str, int]:
        """Get all usage metrics for user"""
        subscription = await self.get_user_subscription(user_id)
        
        result = self.admin_client.table("user_usage_metrics")\
            .select("metric_type, count")\
            .eq("user_id", user_id)\
            .gte("period_end", datetime.utcnow().isoformat())\
            .execute()
        
        usage = {}
        for metric in result.data:
            usage[metric["metric_type"]] = metric["count"]
        
        return usage
    
    # ============================================
    # SUBSCRIPTION STATUS
    # ============================================
    
    async def get_subscription_status(self, user_id: str) -> Dict[str, Any]:
        """Get complete subscription status with usage"""
        subscription = await self.get_user_subscription(user_id)
        plan = subscription.get("plan", {})
        usage = await self.get_all_user_usage(user_id)
        
        # Calculate usage percentages
        features = plan.get("features", {})
        usage_details = {}
        
        for metric, limit in features.items():
            if metric.startswith("max_") and isinstance(limit, int):
                current = usage.get(metric, 0)
                if limit == -1:
                    usage_details[metric] = {
                        "current": current,
                        "limit": "unlimited",
                        "percentage": 0
                    }
                else:
                    percentage = (current / limit * 100) if limit > 0 else 0
                    usage_details[metric] = {
                        "current": current,
                        "limit": limit,
                        "percentage": round(percentage, 1)
                    }
        
        return {
            "subscription": subscription,
            "plan": plan,
            "usage": usage_details,
            "status": subscription["status"],
            "billing_cycle": subscription["billing_cycle"],
            "current_period_end": subscription["current_period_end"],
            "cancel_at_period_end": subscription.get("cancel_at_period_end", False)
        }
    
    # ============================================
    # UPGRADE/DOWNGRADE
    # ============================================
    
    async def upgrade_subscription(
        self,
        user_id: str,
        new_plan_name: str,
        billing_cycle: str = "monthly"
    ) -> Dict[str, Any]:
        """Upgrade user to new plan"""
        new_plan = await self.get_plan_by_name(new_plan_name)
        
        period_start = datetime.utcnow()
        if billing_cycle == "yearly":
            period_end = period_start + timedelta(days=365)
        else:
            period_end = period_start + timedelta(days=30)
        
        update_data = {
            "plan_id": new_plan["id"],
            "billing_cycle": billing_cycle,
            "current_period_start": period_start.isoformat(),
            "current_period_end": period_end.isoformat(),
            "status": "active",
            "cancel_at_period_end": False,
            "updated_at": datetime.utcnow().isoformat()
        }
        
        result = self.admin_client.table("user_subscriptions")\
            .update(update_data)\
            .eq("user_id", user_id)\
            .execute()
        
        return result.data[0]
