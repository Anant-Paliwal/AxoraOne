"""
Plan Service - DB-Driven Billing System
Reads all plan limits and feature flags from database
NO HARDCODED PLAN RULES
"""
from typing import Optional, Dict, Any, List
from datetime import date
from supabase import Client
from app.core.supabase import supabase_admin

class PlanService:
    """Service for managing subscription plans and enforcing limits"""
    
    def __init__(self, supabase: Client = None):
        self.supabase = supabase or supabase_admin
    
    # ============================================
    # PLAN QUERIES
    # ============================================
    
    async def get_all_plans(self) -> List[Dict[str, Any]]:
        """Get all active subscription plans"""
        result = self.supabase.table("subscription_plans")\
            .select("*")\
            .eq("is_active", True)\
            .order("sort_order")\
            .execute()
        
        return result.data if result.data else []
    
    async def get_plan(self, plan_code: str) -> Optional[Dict[str, Any]]:
        """Get specific plan by code"""
        result = self.supabase.table("subscription_plans")\
            .select("*")\
            .eq("code", plan_code)\
            .eq("is_active", True)\
            .single()\
            .execute()
        
        return result.data if result.data else None
    
    async def get_user_plan_code(self, user_id: str) -> str:
        """Get user's current plan code (defaults to FREE)"""
        result = self.supabase.table("user_subscriptions")\
            .select("plan_code, status")\
            .eq("user_id", user_id)\
            .single()\
            .execute()
        
        if result.data:
            # Only return paid plan if status is active
            if result.data["status"] == "active":
                return result.data["plan_code"]
            else:
                # Pending, cancelled, expired -> treat as FREE
                return "FREE"
        
        # Default to FREE if no subscription found
        return "FREE"
    
    async def get_user_plan(self, user_id: str) -> Dict[str, Any]:
        """Get user's full plan details with limits and feature flags"""
        # Use database function for consistency
        result = self.supabase.rpc("get_user_plan", {"p_user_id": user_id}).execute()
        
        if result.data and len(result.data) > 0:
            return result.data[0]
        
        # Fallback: get FREE plan directly
        free_plan = await self.get_plan("FREE")
        return free_plan if free_plan else {}
    
    async def get_user_subscription(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user's subscription record"""
        result = self.supabase.table("user_subscriptions")\
            .select("*, plan:subscription_plans(*)")\
            .eq("user_id", user_id)\
            .single()\
            .execute()
        
        return result.data if result.data else None
    
    # ============================================
    # LIMIT CHECKS
    # ============================================
    
    async def check_workspace_limit(self, user_id: str) -> bool:
        """Check if user can create more workspaces"""
        result = self.supabase.rpc("check_workspace_limit", {"p_user_id": user_id}).execute()
        return result.data if result.data is not None else False
    
    async def check_collaborator_limit(self, workspace_id: str) -> bool:
        """Check if workspace can add more collaborators"""
        result = self.supabase.rpc("check_collaborator_limit", {"p_workspace_id": workspace_id}).execute()
        return result.data if result.data is not None else False
    
    async def check_ask_anything_limit(self, user_id: str) -> bool:
        """Check if user has Ask Anything credits remaining today"""
        result = self.supabase.rpc("check_ask_anything_limit", {"p_user_id": user_id}).execute()
        return result.data if result.data is not None else False
    
    async def increment_ask_anything_usage(self, user_id: str) -> None:
        """Increment user's Ask Anything usage for today"""
        self.supabase.rpc("increment_ask_anything_usage", {"p_user_id": user_id}).execute()
    
    async def get_ask_anything_usage(self, user_id: str) -> Dict[str, int]:
        """Get user's Ask Anything usage for today"""
        plan = await self.get_user_plan(user_id)
        limit = plan.get("ask_anything_daily_limit", 10)
        
        result = self.supabase.table("ask_anything_usage_daily")\
            .select("used_count")\
            .eq("user_id", user_id)\
            .eq("usage_date", date.today())\
            .execute()
        
        # Handle case where no row exists yet (returns empty list)
        used = result.data[0]["used_count"] if result.data and len(result.data) > 0 else 0
        
        return {
            "limit": limit,
            "used": used,
            "remaining": max(0, limit - used)
        }
    
    async def get_workspace_count(self, user_id: str) -> int:
        """Get number of workspaces owned by user"""
        result = self.supabase.table("workspaces")\
            .select("id", count="exact")\
            .eq("user_id", user_id)\
            .execute()
        
        return result.count if result.count else 0
    
    async def get_collaborator_count(self, workspace_id: str) -> int:
        """Get number of collaborators in workspace (excluding owner)"""
        # Get workspace owner
        workspace_result = self.supabase.table("workspaces")\
            .select("user_id")\
            .eq("id", workspace_id)\
            .single()\
            .execute()
        
        if not workspace_result.data:
            return 0
        
        owner_id = workspace_result.data["user_id"]
        
        # Count members excluding owner
        result = self.supabase.table("workspace_members")\
            .select("id", count="exact")\
            .eq("workspace_id", workspace_id)\
            .neq("user_id", owner_id)\
            .execute()
        
        return result.count if result.count else 0
    
    # ============================================
    # FEATURE FLAGS
    # ============================================
    
    async def can_share_workspace(self, user_id: str) -> bool:
        """Check if user can share workspaces"""
        plan = await self.get_user_plan(user_id)
        return plan.get("can_share_workspace", False)
    
    async def can_share_page_readonly(self, user_id: str) -> bool:
        """Check if user can share pages as read-only"""
        plan = await self.get_user_plan(user_id)
        return plan.get("can_share_page_readonly", False)
    
    async def can_share_page_edit(self, user_id: str) -> bool:
        """Check if user can share pages with edit permission"""
        plan = await self.get_user_plan(user_id)
        return plan.get("can_share_page_edit", False)
    
    async def can_assign_tasks(self, user_id: str) -> bool:
        """Check if user can assign tasks to others"""
        plan = await self.get_user_plan(user_id)
        return plan.get("can_assign_tasks", False)
    
    async def can_team_pulse(self, user_id: str) -> bool:
        """Check if user has access to team pulse insights"""
        plan = await self.get_user_plan(user_id)
        return plan.get("can_team_pulse", False)
    
    async def can_skill_insights_history(self, user_id: str) -> bool:
        """Check if user has access to skill insights history"""
        plan = await self.get_user_plan(user_id)
        return plan.get("can_skill_insights_history", False)
    
    async def get_page_history_days(self, user_id: str) -> int:
        """Get number of days of page history available to user"""
        plan = await self.get_user_plan(user_id)
        return plan.get("page_history_days", 7)
    
    async def get_skill_insights_history_days(self, user_id: str) -> int:
        """Get number of days of skill insights history available"""
        plan = await self.get_user_plan(user_id)
        return plan.get("skill_insights_history_days", 0)
    
    async def get_knowledge_graph_level(self, user_id: str) -> str:
        """Get knowledge graph level (basic or advanced)"""
        plan = await self.get_user_plan(user_id)
        return plan.get("knowledge_graph_level", "basic")
    
    # ============================================
    # SUBSCRIPTION MANAGEMENT
    # ============================================
    
    async def create_subscription(
        self,
        user_id: str,
        plan_code: str,
        billing_cycle: str = "monthly",
        razorpay_subscription_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Create or update user subscription"""
        data = {
            "user_id": user_id,
            "plan_code": plan_code,
            "status": "active",
            "billing_cycle": billing_cycle,
            "razorpay_subscription_id": razorpay_subscription_id
        }
        
        result = self.supabase.table("user_subscriptions")\
            .upsert(data)\
            .execute()
        
        return result.data[0] if result.data else {}
    
    async def cancel_subscription(self, user_id: str) -> None:
        """Cancel subscription and downgrade to FREE"""
        self.supabase.table("user_subscriptions")\
            .update({
                "plan_code": "FREE",
                "status": "cancelled",
                "billing_cycle": None,
                "razorpay_subscription_id": None
            })\
            .eq("user_id", user_id)\
            .execute()
    
    async def get_subscription_status(self, user_id: str) -> Dict[str, Any]:
        """Get complete subscription status with usage"""
        subscription = await self.get_user_subscription(user_id)
        plan = await self.get_user_plan(user_id)
        
        # Get usage stats
        workspace_count = await self.get_workspace_count(user_id)
        ask_anything_usage = await self.get_ask_anything_usage(user_id)
        
        return {
            "subscription": subscription,
            "plan": plan,
            "usage": {
                "workspaces": {
                    "used": workspace_count,
                    "limit": plan.get("workspaces_limit"),
                    "unlimited": plan.get("workspaces_limit") is None
                },
                "ask_anything": ask_anything_usage
            },
            "status": subscription["status"] if subscription else "active",
            "billing_cycle": subscription["billing_cycle"] if subscription else None
        }

# Global instance
plan_service = PlanService()
