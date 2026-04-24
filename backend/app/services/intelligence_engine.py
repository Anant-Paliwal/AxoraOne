"""
Living Intelligence Engine - Core autonomous processing system
This engine runs continuously, observing patterns and triggering intelligent actions.
"""

from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
from enum import Enum
import asyncio
import json
from dataclasses import dataclass, field
from app.core.supabase import supabase_admin

class SignalType(Enum):
    PAGE_CREATED = "page_created"
    PAGE_EDITED = "page_edited"
    PAGE_NEGLECTED = "page_neglected"
    PAGE_DRIFT = "page_drift"
    TASK_CREATED = "task_created"
    TASK_COMPLETED = "task_completed"
    TASK_OVERDUE = "task_overdue"
    TASK_BLOCKED = "task_blocked"
    SKILL_ACTIVATED = "skill_activated"
    SKILL_STALLED = "skill_stalled"
    SKILL_BOTTLENECK = "skill_bottleneck"
    GOAL_PROGRESS = "goal_progress"
    GOAL_STALLED = "goal_stalled"
    PATTERN_DETECTED = "pattern_detected"
    USER_IDLE = "user_idle"
    USER_OVERLOADED = "user_overloaded"

class TrustLevel(Enum):
    READ_ONLY = 1      # Insights only
    SUGGEST = 2        # User approval required
    ACT = 3            # Auto-execute small reversible actions
    AUTONOMOUS = 4     # Execute & notify

@dataclass
class Signal:
    type: SignalType
    source_id: str
    source_type: str  # page, task, skill, user
    workspace_id: str
    user_id: str
    data: Dict[str, Any]
    timestamp: datetime = field(default_factory=datetime.utcnow)
    priority: int = 5  # 1-10, higher = more urgent

@dataclass
class Insight:
    id: str
    workspace_id: str
    user_id: str
    insight_type: str
    title: str
    description: str
    severity: str  # info, warning, critical
    source_signals: List[str]
    suggested_actions: List[Dict[str, Any]]
    created_at: datetime = field(default_factory=datetime.utcnow)
    dismissed: bool = False
    acted_upon: bool = False

@dataclass
class ProposedAction:
    id: str
    workspace_id: str
    user_id: str
    action_type: str  # create_task, link_entities, update_priority, create_page, etc.
    target_type: str
    target_id: Optional[str]
    payload: Dict[str, Any]
    reason: str
    expected_impact: str
    reversible: bool
    trust_level_required: TrustLevel
    auto_execute: bool = False
    executed: bool = False
    created_at: datetime = field(default_factory=datetime.utcnow)

class IntelligenceEngine:
    """
    Core intelligence engine that observes, reasons, and acts.
    Runs as a background process, continuously analyzing workspace state.
    """
    
    def __init__(self):
        self.signal_queue: List[Signal] = []
        self.active_skills: Dict[str, Dict] = {}  # workspace_id -> skill states
        self.pattern_memory: Dict[str, List] = {}  # workspace_id -> detected patterns
        self._running = False
    
    async def emit_signal(self, signal: Signal):
        """Emit a signal for processing"""
        self.signal_queue.append(signal)
        # Process immediately for high-priority signals
        if signal.priority >= 8:
            await self._process_signal(signal)
    
    async def _process_signal(self, signal: Signal):
        """Process a single signal and trigger appropriate responses"""
        handlers = {
            SignalType.PAGE_CREATED: self._handle_page_created,
            SignalType.PAGE_EDITED: self._handle_page_edited,
            SignalType.TASK_COMPLETED: self._handle_task_completed,
            SignalType.TASK_OVERDUE: self._handle_task_overdue,
            SignalType.SKILL_ACTIVATED: self._handle_skill_activated,
        }
        handler = handlers.get(signal.type)
        if handler:
            await handler(signal)
        
        # Also process through Skill Agents for autonomous behavior
        await self._process_through_skill_agents(signal)
    
    async def _handle_page_created(self, signal: Signal):
        """When a page is created, infer relationships and suggest actions"""
        page_data = signal.data
        workspace_id = signal.workspace_id
        user_id = signal.user_id
        
        # Auto-link to relevant skills based on content
        await self._auto_link_page_to_skills(page_data, workspace_id, user_id)
        
        # Detect if this page implies tasks
        await self._detect_implied_tasks(page_data, workspace_id, user_id)
        
        # Update knowledge graph
        await self._update_graph_for_page(page_data, workspace_id)
    
    async def _process_through_skill_agents(self, signal: Signal):
        """
        Process signal through all skill agents in the workspace.
        This enables the full Skill Lifecycle:
        Observe → Detect Pattern → Activate → Reason → Propose Action → Execute → Evaluate → Learn → Evolve
        """
        try:
            from app.services.skill_agent import get_skill_manager
            
            manager = get_skill_manager(signal.workspace_id)
            
            # Convert signal to dict for skill agents
            signal_data = {
                "signal_type": signal.type.value,
                "source_id": signal.source_id,
                "source_type": signal.source_type,
                "workspace_id": signal.workspace_id,
                "user_id": signal.user_id,
                **signal.data
            }
            
            # Process through all skill agents
            results = await manager.process_signal(signal_data)
            
            # Log activated skills
            for result in results:
                if result.get("activated"):
                    print(f"Skill {result['skill_id']} activated with {len(result.get('actions_proposed', []))} proposed actions")
        except Exception as e:
            print(f"Error processing through skill agents: {e}")
    
    async def _handle_page_edited(self, signal: Signal):
        """When a page is edited, check for drift and update relationships"""
        page_data = signal.data
        # Check if page content has drifted from original intent
        # Update semantic embeddings
        # Re-evaluate skill associations
        pass
    
    async def _handle_task_completed(self, signal: Signal):
        """When a task is completed, update skill confidence and suggest next steps"""
        task_data = signal.data
        workspace_id = signal.workspace_id
        user_id = signal.user_id
        
        # Update linked skill confidence
        if task_data.get('linked_skill_id'):
            await self._update_skill_confidence(
                task_data['linked_skill_id'], 
                'task_completed',
                workspace_id
            )
        
        # Suggest next task or skill activation
        await self._suggest_next_action(task_data, workspace_id, user_id)
    
    async def _handle_task_overdue(self, signal: Signal):
        """Handle overdue tasks - escalate priority, suggest rescheduling"""
        task_data = signal.data
        # Create insight about overdue task
        # Suggest rescheduling or breaking down
        pass
    
    async def _handle_skill_activated(self, signal: Signal):
        """When a skill is activated, track execution and chain to next skills"""
        skill_data = signal.data
        workspace_id = signal.workspace_id
        
        # Record skill execution
        await self._record_skill_execution(skill_data, workspace_id)
        
        # Check for skill chaining opportunities
        await self._check_skill_chain(skill_data, workspace_id)
    
    async def _auto_link_page_to_skills(self, page_data: Dict, workspace_id: str, user_id: str):
        """Automatically link a page to relevant skills based on content analysis"""
        try:
            # Get all skills in workspace
            skills_response = supabase_admin.table("skills")\
                .select("id, name, description")\
                .eq("workspace_id", workspace_id)\
                .execute()
            
            if not skills_response.data:
                return
            
            page_content = f"{page_data.get('title', '')} {page_data.get('content', '')}"
            page_tags = page_data.get('tags', [])
            
            # Simple keyword matching (in production, use embeddings)
            for skill in skills_response.data:
                skill_keywords = skill['name'].lower().split() + \
                                (skill.get('description', '') or '').lower().split()
                
                content_lower = page_content.lower()
                matches = sum(1 for kw in skill_keywords if kw in content_lower)
                
                if matches >= 2 or any(tag.lower() in skill['name'].lower() for tag in page_tags):
                    # Create proposed action to link
                    await self._create_proposed_action(
                        workspace_id=workspace_id,
                        user_id=user_id,
                        action_type="link_page_to_skill",
                        target_type="page",
                        target_id=page_data.get('id'),
                        payload={
                            "skill_id": skill['id'],
                            "skill_name": skill['name'],
                            "confidence": min(matches * 0.2, 1.0)
                        },
                        reason=f"Page content relates to skill '{skill['name']}'",
                        expected_impact="Improves knowledge graph connectivity",
                        reversible=True,
                        trust_level=TrustLevel.SUGGEST
                    )
        except Exception as e:
            print(f"Error auto-linking page to skills: {e}")
    
    async def _detect_implied_tasks(self, page_data: Dict, workspace_id: str, user_id: str):
        """Detect tasks implied by page content"""
        content = page_data.get('content', '')
        
        # Look for action-oriented phrases
        action_indicators = [
            'todo:', 'to do:', 'action:', 'task:', 'need to', 'should', 
            'must', 'will', 'plan to', '[ ]', '- [ ]'
        ]
        
        content_lower = content.lower()
        if any(indicator in content_lower for indicator in action_indicators):
            await self._create_proposed_action(
                workspace_id=workspace_id,
                user_id=user_id,
                action_type="extract_tasks",
                target_type="page",
                target_id=page_data.get('id'),
                payload={"page_title": page_data.get('title')},
                reason="Page contains action items that could be tasks",
                expected_impact="Ensures action items are tracked",
                reversible=True,
                trust_level=TrustLevel.SUGGEST
            )
    
    async def _update_skill_confidence(self, skill_id: str, event_type: str, workspace_id: str):
        """Update skill confidence based on events"""
        try:
            # Get current skill
            skill_response = supabase_admin.table("skills")\
                .select("*")\
                .eq("id", skill_id)\
                .single()\
                .execute()
            
            if not skill_response.data:
                return
            
            skill = skill_response.data
            current_level = skill.get('level', 'Beginner')
            
            # Confidence boost based on event
            confidence_boost = {
                'task_completed': 0.05,
                'quiz_passed': 0.1,
                'page_created': 0.02,
                'skill_executed': 0.03
            }.get(event_type, 0.01)
            
            # Level progression thresholds
            level_thresholds = {
                'Beginner': 0.25,
                'Intermediate': 0.50,
                'Advanced': 0.75,
                'Expert': 1.0
            }
            
            # Calculate new confidence (stored in metadata or separate field)
            # This is a simplified version - production would track more granularly
            
        except Exception as e:
            print(f"Error updating skill confidence: {e}")
    
    async def _suggest_next_action(self, completed_task: Dict, workspace_id: str, user_id: str):
        """Suggest next action after task completion"""
        try:
            # Get related tasks
            if completed_task.get('linked_skill_id'):
                related_tasks = supabase_admin.table("tasks")\
                    .select("*")\
                    .eq("workspace_id", workspace_id)\
                    .eq("linked_skill_id", completed_task['linked_skill_id'])\
                    .eq("status", "todo")\
                    .limit(3)\
                    .execute()
                
                if related_tasks.data:
                    # Create insight about next steps
                    await self._create_insight(
                        workspace_id=workspace_id,
                        user_id=user_id,
                        insight_type="next_action",
                        title="Continue your momentum",
                        description=f"You completed '{completed_task.get('title')}'. Here are related tasks to keep progressing.",
                        severity="info",
                        suggested_actions=[
                            {"type": "view_task", "task_id": t['id'], "title": t['title']}
                            for t in related_tasks.data[:3]
                        ]
                    )
        except Exception as e:
            print(f"Error suggesting next action: {e}")
    
    async def _create_proposed_action(
        self,
        workspace_id: str,
        user_id: str,
        action_type: str,
        target_type: str,
        target_id: Optional[str],
        payload: Dict,
        reason: str,
        expected_impact: str,
        reversible: bool,
        trust_level: TrustLevel
    ):
        """Create a proposed action for user review or auto-execution"""
        import uuid
        action = ProposedAction(
            id=str(uuid.uuid4()),
            workspace_id=workspace_id,
            user_id=user_id,
            action_type=action_type,
            target_type=target_type,
            target_id=target_id,
            payload=payload,
            reason=reason,
            expected_impact=expected_impact,
            reversible=reversible,
            trust_level_required=trust_level
        )
        
        # Store in database
        try:
            supabase_admin.table("proposed_actions").insert({
                "id": action.id,
                "workspace_id": workspace_id,
                "user_id": user_id,
                "action_type": action_type,
                "target_type": target_type,
                "target_id": target_id,
                "payload": payload,
                "reason": reason,
                "expected_impact": expected_impact,
                "reversible": reversible,
                "trust_level_required": trust_level.value,
                "executed": False,
                "created_at": datetime.utcnow().isoformat()
            }).execute()
        except Exception as e:
            print(f"Error storing proposed action: {e}")
    
    async def _create_insight(
        self,
        workspace_id: str,
        user_id: str,
        insight_type: str,
        title: str,
        description: str,
        severity: str,
        suggested_actions: List[Dict]
    ):
        """Create an insight for the user"""
        import uuid
        try:
            supabase_admin.table("insights").insert({
                "id": str(uuid.uuid4()),
                "workspace_id": workspace_id,
                "user_id": user_id,
                "insight_type": insight_type,
                "title": title,
                "description": description,
                "severity": severity,
                "suggested_actions": suggested_actions,
                "dismissed": False,
                "acted_upon": False,
                "created_at": datetime.utcnow().isoformat()
            }).execute()
        except Exception as e:
            print(f"Error creating insight: {e}")
    
    async def _update_graph_for_page(self, page_data: Dict, workspace_id: str):
        """Update knowledge graph when a page is created/updated"""
        try:
            # Ensure page node exists in graph
            page_id = page_data.get('id')
            if not page_id:
                return
            
            # Check if node exists
            existing = supabase_admin.table("graph_nodes")\
                .select("id")\
                .eq("entity_id", page_id)\
                .eq("entity_type", "page")\
                .execute()
            
            if not existing.data:
                # Create node
                supabase_admin.table("graph_nodes").insert({
                    "entity_id": page_id,
                    "entity_type": "page",
                    "workspace_id": workspace_id,
                    "label": page_data.get('title', 'Untitled'),
                    "metadata": {
                        "icon": page_data.get('icon', '📄'),
                        "tags": page_data.get('tags', [])
                    }
                }).execute()
        except Exception as e:
            print(f"Error updating graph for page: {e}")
    
    async def _record_skill_execution(self, skill_data: Dict, workspace_id: str):
        """Record when a skill is executed"""
        try:
            supabase_admin.table("skill_executions").insert({
                "skill_id": skill_data.get('id'),
                "workspace_id": workspace_id,
                "trigger_source": skill_data.get('trigger_source', 'manual'),
                "input_context": skill_data.get('input_context', {}),
                "executed_at": datetime.utcnow().isoformat()
            }).execute()
        except Exception as e:
            print(f"Error recording skill execution: {e}")
    
    async def _check_skill_chain(self, skill_data: Dict, workspace_id: str):
        """Check if completing this skill should trigger next skills in chain"""
        try:
            skill_id = skill_data.get('id')
            
            # Find skills that have this skill as prerequisite
            dependent_skills = supabase_admin.table("skills")\
                .select("*")\
                .eq("workspace_id", workspace_id)\
                .contains("prerequisite_skills", [skill_id])\
                .execute()
            
            if dependent_skills.data:
                for dep_skill in dependent_skills.data:
                    # Check if all prerequisites are met
                    prereqs = dep_skill.get('prerequisite_skills', [])
                    # In production, check if all prereqs have sufficient confidence
                    # For now, just create an insight
                    await self._create_insight(
                        workspace_id=workspace_id,
                        user_id=skill_data.get('user_id'),
                        insight_type="skill_unlocked",
                        title=f"Skill '{dep_skill['name']}' is now available",
                        description=f"You've made progress on prerequisites. Consider starting '{dep_skill['name']}'.",
                        severity="info",
                        suggested_actions=[
                            {"type": "view_skill", "skill_id": dep_skill['id'], "name": dep_skill['name']}
                        ]
                    )
        except Exception as e:
            print(f"Error checking skill chain: {e}")

    # ==================== PATTERN DETECTION ====================
    
    async def analyze_workspace_patterns(self, workspace_id: str, user_id: str) -> List[Dict]:
        """Analyze workspace for patterns and generate insights"""
        patterns = []
        
        # Pattern 1: Stalled goals (tasks not progressing)
        stalled = await self._detect_stalled_tasks(workspace_id)
        if stalled:
            patterns.append({
                "type": "stalled_tasks",
                "severity": "warning",
                "data": stalled
            })
        
        # Pattern 2: Skill bottlenecks
        bottlenecks = await self._detect_skill_bottlenecks(workspace_id)
        if bottlenecks:
            patterns.append({
                "type": "skill_bottleneck",
                "severity": "warning",
                "data": bottlenecks
            })
        
        # Pattern 3: Neglected pages
        neglected = await self._detect_neglected_pages(workspace_id)
        if neglected:
            patterns.append({
                "type": "neglected_pages",
                "severity": "info",
                "data": neglected
            })
        
        # Pattern 4: Overload detection
        overload = await self._detect_overload(workspace_id, user_id)
        if overload:
            patterns.append({
                "type": "overload",
                "severity": "critical",
                "data": overload
            })
        
        return patterns
    
    async def _detect_stalled_tasks(self, workspace_id: str) -> Optional[Dict]:
        """Detect tasks that haven't progressed"""
        try:
            # Tasks in progress for more than 7 days
            week_ago = (datetime.utcnow() - timedelta(days=7)).isoformat()
            
            stalled = supabase_admin.table("tasks")\
                .select("id, title, status, updated_at")\
                .eq("workspace_id", workspace_id)\
                .eq("status", "in-progress")\
                .lt("updated_at", week_ago)\
                .execute()
            
            if stalled.data:
                return {
                    "count": len(stalled.data),
                    "tasks": stalled.data[:5]  # Top 5
                }
        except Exception as e:
            print(f"Error detecting stalled tasks: {e}")
        return None
    
    async def _detect_skill_bottlenecks(self, workspace_id: str) -> Optional[Dict]:
        """Detect skills that are blocking progress"""
        try:
            # Skills with many dependent tasks but low confidence
            skills = supabase_admin.table("skills")\
                .select("id, name, level")\
                .eq("workspace_id", workspace_id)\
                .in_("level", ["Beginner"])\
                .execute()
            
            bottlenecks = []
            for skill in skills.data or []:
                # Count blocked tasks linked to this skill
                blocked = supabase_admin.table("tasks")\
                    .select("id", count="exact")\
                    .eq("linked_skill_id", skill['id'])\
                    .eq("status", "blocked")\
                    .execute()
                
                if blocked.count and blocked.count > 2:
                    bottlenecks.append({
                        "skill": skill,
                        "blocked_tasks": blocked.count
                    })
            
            if bottlenecks:
                return {"bottlenecks": bottlenecks}
        except Exception as e:
            print(f"Error detecting skill bottlenecks: {e}")
        return None
    
    async def _detect_neglected_pages(self, workspace_id: str) -> Optional[Dict]:
        """Detect pages that haven't been viewed/edited recently"""
        try:
            month_ago = (datetime.utcnow() - timedelta(days=30)).isoformat()
            
            neglected = supabase_admin.table("pages")\
                .select("id, title, updated_at")\
                .eq("workspace_id", workspace_id)\
                .eq("is_archived", False)\
                .lt("updated_at", month_ago)\
                .limit(10)\
                .execute()
            
            if neglected.data:
                return {
                    "count": len(neglected.data),
                    "pages": neglected.data
                }
        except Exception as e:
            print(f"Error detecting neglected pages: {e}")
        return None
    
    async def _detect_overload(self, workspace_id: str, user_id: str) -> Optional[Dict]:
        """Detect if user is overloaded"""
        try:
            today = datetime.utcnow().date().isoformat()
            
            # Count tasks due today or overdue
            urgent = supabase_admin.table("tasks")\
                .select("id", count="exact")\
                .eq("workspace_id", workspace_id)\
                .eq("status", "todo")\
                .lte("due_date", today)\
                .execute()
            
            if urgent.count and urgent.count > 10:
                return {
                    "urgent_tasks": urgent.count,
                    "recommendation": "Consider rescheduling or delegating some tasks"
                }
        except Exception as e:
            print(f"Error detecting overload: {e}")
        return None

    # ==================== DYNAMIC PRIORITY CALCULATION ====================
    
    async def calculate_task_priority(self, task: Dict, workspace_id: str) -> Dict:
        """Calculate dynamic priority for a task based on multiple factors"""
        base_priority = {"low": 1, "medium": 2, "high": 3}.get(task.get('priority', 'medium'), 2)
        
        factors = {
            "base": base_priority,
            "urgency": 0,
            "goal_alignment": 0,
            "skill_bottleneck": 0,
            "calendar_pressure": 0
        }
        
        # Urgency based on due date
        if task.get('due_date'):
            try:
                due_str = task['due_date']
                # Handle different date formats
                if 'T' in due_str:
                    # Full datetime format
                    due = datetime.fromisoformat(due_str.replace('Z', '+00:00'))
                    # Make it timezone-naive for comparison
                    due = due.replace(tzinfo=None)
                else:
                    # Date only format (YYYY-MM-DD)
                    due = datetime.strptime(due_str[:10], '%Y-%m-%d')
                
                now = datetime.utcnow()
                days_until = (due.date() - now.date()).days
                
                if days_until < 0:
                    factors["urgency"] = 3  # Overdue
                elif days_until == 0:
                    factors["urgency"] = 2  # Due today
                elif days_until <= 3:
                    factors["urgency"] = 1  # Due soon
            except Exception as date_error:
                # If date parsing fails, skip urgency calculation
                pass
        
        # Skill bottleneck - if linked skill is blocking other tasks
        if task.get('linked_skill_id'):
            try:
                blocked_count = supabase_admin.table("tasks")\
                    .select("id", count="exact")\
                    .eq("linked_skill_id", task['linked_skill_id'])\
                    .eq("status", "blocked")\
                    .execute()
                if blocked_count.count and blocked_count.count > 0:
                    factors["skill_bottleneck"] = min(blocked_count.count * 0.5, 2)
            except Exception:
                pass
        
        # Calculate final score
        total_score = sum(factors.values())
        
        return {
            "score": total_score,
            "factors": factors,
            "recommendation": self._get_priority_recommendation(total_score)
        }
    
    def _get_priority_recommendation(self, score: float) -> str:
        if score >= 6:
            return "Critical - Do this immediately"
        elif score >= 4:
            return "High priority - Schedule for today"
        elif score >= 2:
            return "Medium priority - Plan for this week"
        else:
            return "Low priority - Can be deferred"

# Global instance
intelligence_engine = IntelligenceEngine()
