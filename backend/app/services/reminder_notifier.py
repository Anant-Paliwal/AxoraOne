"""
Reminder Notification Service
Checks for due reminders and creates notifications
Runs as a background task
"""
import asyncio
from datetime import datetime, timezone, timedelta
import logging
from typing import List, Dict

from app.core.supabase import supabase_admin

logger = logging.getLogger(__name__)


class ReminderNotifier:
    """
    Background service that checks for due reminders and sends notifications
    """
    
    def __init__(self):
        self.check_interval = 60  # Check every 60 seconds
        self.is_running = False
    
    async def start(self):
        """Start the reminder notification service"""
        if self.is_running:
            logger.warning("Reminder notifier already running")
            return
        
        self.is_running = True
        logger.info("🔔 Reminder notifier started")
        
        while self.is_running:
            try:
                await self._check_and_notify()
                await asyncio.sleep(self.check_interval)
            except Exception as e:
                logger.error(f"Error in reminder notifier: {e}", exc_info=True)
                await asyncio.sleep(self.check_interval)
    
    async def stop(self):
        """Stop the reminder notification service"""
        self.is_running = False
        logger.info("🔕 Reminder notifier stopped")
    
    async def _check_and_notify(self):
        """Check for due reminders and create notifications"""
        try:
            now = datetime.now(timezone.utc)
            
            # Get all reminders/tasks that are due within the next 5 minutes
            # and haven't been notified yet
            five_minutes_from_now = now + timedelta(minutes=5)
            
            response = supabase_admin.table("tasks")\
                .select("*")\
                .eq("event_type", "reminder")\
                .neq("status", "completed")\
                .neq("status", "done")\
                .gte("due_date", now.isoformat())\
                .lte("due_date", five_minutes_from_now.isoformat())\
                .execute()
            
            due_reminders = response.data or []
            
            if not due_reminders:
                return
            
            logger.info(f"Found {len(due_reminders)} due reminders")
            
            for reminder in due_reminders:
                await self._create_notification_for_reminder(reminder)
        
        except Exception as e:
            logger.error(f"Error checking reminders: {e}")
    
    async def _create_notification_for_reminder(self, reminder: Dict):
        """Create a notification for a due reminder"""
        try:
            user_id = reminder.get("user_id")
            workspace_id = reminder.get("workspace_id")
            title = reminder.get("title", "Reminder")
            due_date = reminder.get("due_date")
            
            # Check if notification already exists for this reminder
            existing = supabase_admin.table("notifications")\
                .select("id")\
                .eq("user_id", user_id)\
                .eq("type", "reminder")\
                .contains("metadata", {"task_id": reminder["id"]})\
                .gte("created_at", (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat())\
                .execute()
            
            if existing.data and len(existing.data) > 0:
                # Already notified recently
                return
            
            # Parse due date to show time
            try:
                due_dt = datetime.fromisoformat(due_date.replace('Z', '+00:00'))
                time_str = due_dt.strftime("%I:%M %p")
            except:
                time_str = "now"
            
            # Create notification
            supabase_admin.table("notifications").insert({
                "user_id": user_id,
                "workspace_id": workspace_id,
                "type": "reminder",
                "title": f"⏰ Reminder: {title}",
                "message": f"Due at {time_str}",
                "icon": "🔔",
                "link": f"/tasks",
                "link_label": "View Task",
                "metadata": {
                    "task_id": reminder["id"],
                    "due_date": due_date
                },
                "is_read": False
            }).execute()
            
            logger.info(f"✅ Created notification for reminder: {title}")
        
        except Exception as e:
            logger.error(f"Error creating notification for reminder {reminder.get('id')}: {e}")


# Singleton instance
reminder_notifier = ReminderNotifier()
