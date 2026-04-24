"""
Skill Metrics Updater - Periodic background task to update skill intelligence

This service runs periodically to:
1. Calculate real progress for each skill
2. Update confidence scores based on completed tasks
3. Flag neglected skills
4. Detect bottlenecks
5. Trigger skill evolution
"""

import asyncio
from datetime import datetime, timedelta
from typing import Dict, List
from app.core.supabase import supabase_admin

class SkillMetricsUpdater:
    """Background service to keep skill metrics up-to-date"""
    
    def __init__(self):
        self._running = False
        self._update_interval = 300  # 5 minutes
    
    async def start(self):
        """Start the background updater"""
        self._running = True
        print("🧠 Skill Metrics Updater started")
        
        while self._running:
            try:
                await self.update_all_skills()
                await asyncio.sleep(self._update_interval)
            except Exception as e:
                print(f"Error in skill metrics updater: {e}")
                await asyncio.sleep(60)  # Wait 1 minute on error
    
    def stop(self):
        """Stop the background updater"""
        self._running = False
        print("🧠 Skill Metrics Updater stopped")
    
    async def update_all_skills(self):
        """Update metrics for all skills across all workspaces"""
        try:
            # Get all skills
            skills_response = supabase_admin.table("skills")\
                .select("id, workspace_id, user_id")\
                .execute()
            
            if not skills_response.data:
                return
            
            print(f"📊 Updating metrics for {len(skills_response.data)} skills...")
            
            for skill in skills_response.data:
                try:
                    await self.update_skill_metrics(skill["id"])
                except Exception as e:
                    print(f"Error updating skill {skill['id']}: {e}")
            
            print(f"✅ Skill metrics update complete")
        except Exception as e:
            print(f"Error in update_all_skills: {e}")
    
    async def update_skill_metrics(self, skill_id: str):
        """Update metrics for a single skill"""
        try:
            # Get skill data
            skill_response = supabase_admin.table("skills")\
                .select("*, linked_evidence:skill_evidence(id)")\
                .eq("id", skill_id)\
                .single()\
                .execute()
            
            if not skill_response.data:
                return
            
            skill = skill_response.data
            
            # Count linked pages
            pages_count = len(skill.get("linked_evidence", []))
            
            # Count completed tasks linked to this skill
            completed_tasks = supabase_admin.table("tasks")\
                .select("id", count="exact")\
                .eq("linked_skill_id", skill_id)\
                .eq("status", "completed")\
                .execute()
            
            completed_count = completed_tasks.count or 0
            
            # Count total tasks
            total_tasks = supabase_admin.table("tasks")\
                .select("id", count="exact")\
                .eq("linked_skill_id", skill_id)\
                .execute()
            
            total_count = total_tasks.count or 0
            
            # Calculate success rate
            success_rate = completed_count / total_count if total_count > 0 else 0
            
            # Calculate confidence score based on activity
            # Base confidence from completed tasks (0-0.5)
            task_confidence = min(0.5, completed_count * 0.05)
            
            # Bonus from linked pages (0-0.3)
            page_confidence = min(0.3, pages_count * 0.06)
            
            # Bonus from goals (0-0.2)
            goals_count = len(skill.get("goals", []))
            goal_confidence = min(0.2, goals_count * 0.04)
            
            total_confidence = task_confidence + page_confidence + goal_confidence
            
            # Check if skill is neglected (no activity in 30 days)
            last_activated = skill.get("last_activated_at")
            is_neglected = False
            if last_activated:
                try:
                    last_date = datetime.fromisoformat(last_activated.replace('Z', '+00:00'))
                    days_since = (datetime.utcnow() - last_date.replace(tzinfo=None)).days
                    is_neglected = days_since > 30
                except:
                    pass
            
            # Check if skill is a bottleneck (many blocked tasks)
            blocked_tasks = supabase_admin.table("tasks")\
                .select("id", count="exact")\
                .eq("linked_skill_id", skill_id)\
                .eq("status", "blocked")\
                .execute()
            
            is_bottleneck = (blocked_tasks.count or 0) > 2
            
            # Update skill in database
            update_data = {
                "confidence_score": total_confidence,
                "success_rate": success_rate,
                "is_bottleneck": is_bottleneck,
                "updated_at": datetime.utcnow().isoformat()
            }
            
            supabase_admin.table("skills")\
                .update(update_data)\
                .eq("id", skill_id)\
                .execute()
            
            # Create insight if skill is neglected
            if is_neglected and not is_bottleneck:
                await self._create_neglect_insight(skill)
            
            # Create insight if skill is bottleneck
            if is_bottleneck:
                await self._create_bottleneck_insight(skill, blocked_tasks.count)
            
        except Exception as e:
            print(f"Error updating metrics for skill {skill_id}: {e}")
    
    async def _create_neglect_insight(self, skill: Dict):
        """Create insight for neglected skill"""
        try:
            # Check if insight already exists
            existing = supabase_admin.table("insights")\
                .select("id")\
                .eq("insight_type", "skill_neglected")\
                .eq("dismissed", False)\
                .contains("source_signals", [skill["id"]])\
                .execute()
            
            if existing.data:
                return  # Already have an active insight
            
            import uuid
            supabase_admin.table("insights").insert({
                "id": str(uuid.uuid4()),
                "workspace_id": skill["workspace_id"],
                "user_id": skill["user_id"],
                "insight_type": "skill_neglected",
                "title": f"Skill '{skill['name']}' needs attention",
                "description": f"You haven't worked on '{skill['name']}' in over 30 days. Consider reviewing or archiving it.",
                "severity": "info",
                "source_signals": [skill["id"]],
                "suggested_actions": [
                    {"type": "view_skill", "skill_id": skill["id"], "label": "Review Skill"},
                    {"type": "create_task", "skill_id": skill["id"], "label": "Create Practice Task"}
                ],
                "dismissed": False,
                "created_at": datetime.utcnow().isoformat()
            }).execute()
        except Exception as e:
            print(f"Error creating neglect insight: {e}")
    
    async def _create_bottleneck_insight(self, skill: Dict, blocked_count: int):
        """Create insight for bottleneck skill"""
        try:
            # Check if insight already exists
            existing = supabase_admin.table("insights")\
                .select("id")\
                .eq("insight_type", "skill_bottleneck")\
                .eq("dismissed", False)\
                .contains("source_signals", [skill["id"]])\
                .execute()
            
            if existing.data:
                return  # Already have an active insight
            
            import uuid
            supabase_admin.table("insights").insert({
                "id": str(uuid.uuid4()),
                "workspace_id": skill["workspace_id"],
                "user_id": skill["user_id"],
                "insight_type": "skill_bottleneck",
                "title": f"'{skill['name']}' is blocking progress",
                "description": f"{blocked_count} tasks are blocked waiting on this skill. Consider focusing here to unblock progress.",
                "severity": "warning",
                "source_signals": [skill["id"]],
                "suggested_actions": [
                    {"type": "view_skill", "skill_id": skill["id"], "label": "Focus on This Skill"},
                    {"type": "view_blocked_tasks", "skill_id": skill["id"], "label": "View Blocked Tasks"}
                ],
                "dismissed": False,
                "created_at": datetime.utcnow().isoformat()
            }).execute()
        except Exception as e:
            print(f"Error creating bottleneck insight: {e}")


# Global instance
skill_metrics_updater = SkillMetricsUpdater()
