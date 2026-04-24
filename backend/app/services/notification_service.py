"""
Notification Service - Auto-generates notifications based on tasks, events, and calendar items
"""
from datetime import datetime, timedelta
from typing import Optional, List
from app.core.supabase import supabase_admin

class NotificationService:
    
    @staticmethod
    async def create_notification(
        user_id: str,
        title: str,
        message: Optional[str] = None,
        notification_type: str = "info",
        workspace_id: Optional[str] = None,
        link: Optional[str] = None,
        link_label: Optional[str] = None,
        icon: Optional[str] = None,
        metadata: Optional[dict] = None
    ):
        """Create a notification for a user"""
        try:
            data = {
                "user_id": user_id,
                "title": title,
                "message": message,
                "type": notification_type,
                "workspace_id": workspace_id,
                "link": link,
                "link_label": link_label,
                "icon": icon,
                "metadata": metadata or {}
            }
            
            response = supabase_admin.table("notifications").insert(data).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            print(f"Error creating notification: {e}")
            return None

    @staticmethod
    async def check_and_create_task_notifications(user_id: str, workspace_id: Optional[str] = None):
        """Check tasks and create notifications for due/overdue items"""
        try:
            now = datetime.utcnow()
            today = now.date()
            tomorrow = today + timedelta(days=1)
            
            # Build query
            query = supabase_admin.table("tasks").select("*").eq("user_id", user_id).neq("status", "done")
            
            if workspace_id:
                query = query.eq("workspace_id", workspace_id)
            
            response = query.execute()
            tasks = response.data or []
            
            notifications_created = []
            
            for task in tasks:
                if not task.get("due_date"):
                    continue
                    
                due_date = datetime.fromisoformat(task["due_date"].replace("Z", "+00:00")).date()
                task_id = task["id"]
                task_title = task["title"]
                event_type = task.get("event_type", "task")
                ws_id = task.get("workspace_id")
                
                # Check if notification already exists for this task today
                existing = supabase_admin.table("notifications").select("id").eq("user_id", user_id).eq("metadata->>task_id", task_id).gte("created_at", today.isoformat()).execute()
                
                if existing.data:
                    continue  # Already notified today
                
                # Determine notification type based on due date
                if due_date < today:
                    # Overdue
                    notification = await NotificationService.create_notification(
                        user_id=user_id,
                        title=f"Overdue: {task_title}",
                        message=f"This {event_type} was due on {due_date.strftime('%b %d')}",
                        notification_type="warning",
                        workspace_id=ws_id,
                        link=f"/tasks",
                        link_label="View Task",
                        icon="⚠️" if event_type == "task" else "🎂" if event_type == "birthday" else "📅",
                        metadata={"task_id": task_id, "event_type": event_type, "reason": "overdue"}
                    )
                    if notification:
                        notifications_created.append(notification)
                        
                elif due_date == today:
                    # Due today
                    icon_map = {
                        "task": "📋",
                        "event": "📅",
                        "birthday": "🎂",
                        "reminder": "🔔",
                        "milestone": "🎯"
                    }
                    notification = await NotificationService.create_notification(
                        user_id=user_id,
                        title=f"Due Today: {task_title}",
                        message=f"This {event_type} is due today",
                        notification_type=event_type,
                        workspace_id=ws_id,
                        link=f"/tasks",
                        link_label="View",
                        icon=icon_map.get(event_type, "📋"),
                        metadata={"task_id": task_id, "event_type": event_type, "reason": "due_today"}
                    )
                    if notification:
                        notifications_created.append(notification)
                        
                elif due_date == tomorrow:
                    # Due tomorrow
                    notification = await NotificationService.create_notification(
                        user_id=user_id,
                        title=f"Tomorrow: {task_title}",
                        message=f"This {event_type} is due tomorrow",
                        notification_type="info",
                        workspace_id=ws_id,
                        link=f"/tasks",
                        link_label="View",
                        icon="📆",
                        metadata={"task_id": task_id, "event_type": event_type, "reason": "due_tomorrow"}
                    )
                    if notification:
                        notifications_created.append(notification)
            
            return notifications_created
            
        except Exception as e:
            print(f"Error checking task notifications: {e}")
            return []

    @staticmethod
    async def notify_task_created(task: dict):
        """Create notification when a new task is created"""
        try:
            event_type = task.get("event_type", "task")
            icon_map = {
                "task": "✅",
                "event": "📅",
                "birthday": "🎂",
                "reminder": "🔔",
                "milestone": "🎯"
            }
            
            return await NotificationService.create_notification(
                user_id=task["user_id"],
                title=f"New {event_type.title()} Created",
                message=task["title"],
                notification_type="success",
                workspace_id=task.get("workspace_id"),
                link="/tasks",
                link_label="View",
                icon=icon_map.get(event_type, "✅"),
                metadata={"task_id": task["id"], "event_type": event_type, "reason": "created"}
            )
        except Exception as e:
            print(f"Error creating task notification: {e}")
            return None

    @staticmethod
    async def notify_task_completed(task: dict):
        """Create notification when a task is completed"""
        try:
            return await NotificationService.create_notification(
                user_id=task["user_id"],
                title="Task Completed! 🎉",
                message=task["title"],
                notification_type="success",
                workspace_id=task.get("workspace_id"),
                link="/tasks",
                link_label="View Tasks",
                icon="🎉",
                metadata={"task_id": task["id"], "reason": "completed"}
            )
        except Exception as e:
            print(f"Error creating completion notification: {e}")
            return None

    @staticmethod
    async def notify_quiz_created(quiz: dict, user_id: str):
        """Notify when a quiz is created"""
        try:
            return await NotificationService.create_notification(
                user_id=user_id,
                title="New Quiz Ready!",
                message=quiz.get("title", "Quiz"),
                notification_type="quiz",
                workspace_id=quiz.get("workspace_id"),
                link=f"/quiz/{quiz['id']}",
                link_label="Start Quiz",
                icon="🧠",
                metadata={"quiz_id": quiz["id"], "reason": "created"}
            )
        except Exception as e:
            print(f"Error creating quiz notification: {e}")
            return None

    @staticmethod
    async def notify_skill_progress(user_id: str, skill_name: str, new_level: int, workspace_id: Optional[str] = None):
        """Notify when skill level increases"""
        try:
            return await NotificationService.create_notification(
                user_id=user_id,
                title=f"Skill Level Up! 🚀",
                message=f"{skill_name} is now level {new_level}",
                notification_type="skill",
                workspace_id=workspace_id,
                link="/skills",
                link_label="View Skills",
                icon="🚀",
                metadata={"skill_name": skill_name, "new_level": new_level, "reason": "level_up"}
            )
        except Exception as e:
            print(f"Error creating skill notification: {e}")
            return None

    @staticmethod
    async def notify_learning_reminder(user_id: str, workspace_id: Optional[str] = None):
        """Send daily learning reminder"""
        try:
            return await NotificationService.create_notification(
                user_id=user_id,
                title="Time to Learn! 📚",
                message="Keep your streak going - review some flashcards or take a quiz",
                notification_type="reminder",
                workspace_id=workspace_id,
                link="/learning",
                link_label="Start Learning",
                icon="📚",
                metadata={"reason": "daily_reminder"}
            )
        except Exception as e:
            print(f"Error creating learning reminder: {e}")
            return None


# Singleton instance
notification_service = NotificationService()
