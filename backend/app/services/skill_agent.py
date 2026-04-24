"""
Skill Agent - Autonomous Skill Lifecycle Implementation

Each Skill is a long-living intelligence agent that runs for the lifetime of the workspace.

Lifecycle: Observe → Detect Pattern → Activate → Reason → Propose Action → 
           (Optional) Execute → Evaluate → Learn → Evolve → Repeat forever
"""

from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime, timedelta
from enum import Enum
from dataclasses import dataclass, field
import asyncio
import json
from app.core.supabase import supabase_admin

class SkillState(Enum):
    DORMANT = "dormant"       # Observing passively
    DETECTING = "detecting"   # Analyzing patterns
    ACTIVATED = "activated"   # Ready to reason
    REASONING = "reasoning"   # Processing context
    PROPOSING = "proposing"   # Creating actions
    EXECUTING = "executing"   # Running actions
    EVALUATING = "evaluating" # Checking outcomes
    LEARNING = "learning"     # Updating memory
    EVOLVING = "evolving"     # Improving behavior

@dataclass
class SkillMemory:
    """Persistent memory for a skill agent"""
    skill_id: str
    successful_patterns: List[Dict] = field(default_factory=list)
    failed_patterns: List[Dict] = field(default_factory=list)
    user_preferences: Dict[str, Any] = field(default_factory=dict)
    activation_history: List[Dict] = field(default_factory=list)
    confidence_adjustments: List[float] = field(default_factory=list)
    last_evolved_at: Optional[datetime] = None

@dataclass
class SkillContext:
    """Context for skill reasoning"""
    skill_id: str
    skill_name: str
    skill_type: str
    level: str
    workspace_id: str
    user_id: str
    related_pages: List[Dict] = field(default_factory=list)
    related_tasks: List[Dict] = field(default_factory=list)
    linked_skills: List[str] = field(default_factory=list)
    prerequisite_skills: List[str] = field(default_factory=list)
    recent_activity: List[Dict] = field(default_factory=list)

@dataclass
class SkillAction:
    """Action proposed by a skill"""
    action_type: str
    target_type: str
    target_id: Optional[str]
    payload: Dict[str, Any]
    reason: str
    expected_impact: str
    confidence: float
    reversible: bool = True

class SkillAgent:
    """
    Autonomous Skill Agent that follows the complete lifecycle.
    Each skill instance runs as an independent agent.
    """
    
    def __init__(self, skill_id: str, workspace_id: str):
        self.skill_id = skill_id
        self.workspace_id = workspace_id
        self.state = SkillState.DORMANT
        self.memory: Optional[SkillMemory] = None
        self.context: Optional[SkillContext] = None
        self._running = False
        self._activation_threshold = 0.6  # Minimum relevance to activate
    
    async def initialize(self):
        """Load skill data and memory"""
        # Load skill from database
        skill_data = await self._load_skill()
        if not skill_data:
            return False
        
        # Load or create memory
        self.memory = await self._load_memory()
        
        # Build initial context
        self.context = await self._build_context(skill_data)
        
        return True
    
    async def _load_skill(self) -> Optional[Dict]:
        """Load skill data from database"""
        try:
            response = supabase_admin.table("skills")\
                .select("*")\
                .eq("id", self.skill_id)\
                .single()\
                .execute()
            return response.data
        except Exception as e:
            print(f"Error loading skill {self.skill_id}: {e}")
            return None
    
    async def _load_memory(self) -> SkillMemory:
        """Load skill memory from database or create new"""
        try:
            # Try to load existing memory (table might not exist yet)
            response = supabase_admin.table("skill_memory")\
                .select("*")\
                .eq("skill_id", self.skill_id)\
                .execute()
            
            # Check if we got any data
            if response and response.data and len(response.data) > 0:
                data = response.data[0]
                return SkillMemory(
                    skill_id=self.skill_id,
                    successful_patterns=data.get("successful_patterns", []),
                    failed_patterns=data.get("failed_patterns", []),
                    user_preferences=data.get("user_preferences", {}),
                    activation_history=data.get("activation_history", []),
                    confidence_adjustments=data.get("confidence_adjustments", []),
                    last_evolved_at=datetime.fromisoformat(data["last_evolved_at"].replace('Z', '+00:00')).replace(tzinfo=None) if data.get("last_evolved_at") else None
                )
        except Exception as e:
            # Table might not exist or no data - that's OK, silently create new memory
            error_msg = str(e)
            # Only log if it's NOT the expected "0 rows" or "table not found" error
            if "skill_memory" not in error_msg and "0 rows" not in error_msg and "PGRST116" not in error_msg:
                print(f"Unexpected error loading skill memory: {e}")
        
        # Create new memory (this is normal for new skills)
        return SkillMemory(skill_id=self.skill_id)
    
    async def _save_memory(self):
        """Persist skill memory to database"""
        if not self.memory:
            return
            
        try:
            memory_data = {
                "skill_id": self.skill_id,
                "successful_patterns": self.memory.successful_patterns[-100:],  # Keep last 100
                "failed_patterns": self.memory.failed_patterns[-50:],  # Keep last 50
                "user_preferences": self.memory.user_preferences,
                "activation_history": self.memory.activation_history[-50:],
                "confidence_adjustments": self.memory.confidence_adjustments[-100:],
                "last_evolved_at": self.memory.last_evolved_at.isoformat() if self.memory.last_evolved_at else None,
                "updated_at": datetime.utcnow().isoformat()
            }
            
            # Upsert memory (table might not exist yet)
            supabase_admin.table("skill_memory").upsert(
                memory_data,
                on_conflict="skill_id"
            ).execute()
        except Exception as e:
            # Table might not exist - that's OK, skip saving
            if "skill_memory" not in str(e):
                print(f"Error saving skill memory: {e}")
    
    async def _build_context(self, skill_data: Dict) -> SkillContext:
        """Build context for skill reasoning"""
        # Get related pages (via skill_evidence)
        pages_response = supabase_admin.table("skill_evidence")\
            .select("page_id, pages(id, title, content, tags, updated_at)")\
            .eq("skill_id", self.skill_id)\
            .execute()
        
        related_pages = [
            p["pages"] for p in pages_response.data 
            if p.get("pages")
        ] if pages_response.data else []
        
        # Get related tasks
        tasks_response = supabase_admin.table("tasks")\
            .select("*")\
            .eq("linked_skill_id", self.skill_id)\
            .in_("status", ["todo", "in-progress", "blocked"])\
            .execute()
        
        related_tasks = tasks_response.data or []
        
        # Get recent activity
        activity_response = supabase_admin.table("skill_executions")\
            .select("*")\
            .eq("skill_id", self.skill_id)\
            .order("executed_at", desc=True)\
            .limit(10)\
            .execute()
        
        recent_activity = activity_response.data or []
        
        return SkillContext(
            skill_id=self.skill_id,
            skill_name=skill_data.get("name", ""),
            skill_type=skill_data.get("skill_type", "learning"),
            level=skill_data.get("level", "Beginner"),
            workspace_id=self.workspace_id,
            user_id=skill_data.get("user_id", ""),
            related_pages=related_pages,
            related_tasks=related_tasks,
            linked_skills=skill_data.get("linked_skills", []),
            prerequisite_skills=skill_data.get("prerequisite_skills", []),
            recent_activity=recent_activity
        )
    
    # ==================== LIFECYCLE PHASES ====================
    
    async def observe(self, signal_data: Dict) -> float:
        """
        PHASE 1: OBSERVE
        Passively observe signals and calculate relevance score.
        Returns relevance score (0-1).
        """
        self.state = SkillState.DORMANT
        
        relevance = 0.0
        
        # Check if signal relates to this skill
        if signal_data.get("linked_skill_id") == self.skill_id:
            relevance += 0.5
        
        # Check content relevance
        content = signal_data.get("content", "") + signal_data.get("title", "")
        if self.context and self.context.skill_name.lower() in content.lower():
            relevance += 0.3
        
        # Check tag relevance
        tags = signal_data.get("tags", [])
        if self.context and any(
            self.context.skill_name.lower() in tag.lower() 
            for tag in tags
        ):
            relevance += 0.2
        
        # Boost based on skill type matching signal type
        signal_type = signal_data.get("signal_type", "")
        if self.context:
            type_boost = {
                "learning": ["page_created", "page_edited"],
                "research": ["page_created", "page_edited"],
                "creation": ["task_completed"],
                "analysis": ["pattern_detected"],
                "practice": ["task_completed", "quiz_completed"]
            }
            if signal_type in type_boost.get(self.context.skill_type, []):
                relevance += 0.1
        
        return min(relevance, 1.0)
    
    async def detect_pattern(self) -> List[Dict]:
        """
        PHASE 2: DETECT PATTERN
        Analyze context for actionable patterns.
        """
        self.state = SkillState.DETECTING
        patterns = []
        
        if not self.context:
            return patterns
        
        # Pattern 1: Stalled progress
        if self.context.related_tasks:
            blocked_tasks = [t for t in self.context.related_tasks if t.get("status") == "blocked"]
            if len(blocked_tasks) > 0:
                patterns.append({
                    "type": "blocked_tasks",
                    "severity": "high" if len(blocked_tasks) > 2 else "medium",
                    "data": {"count": len(blocked_tasks), "tasks": blocked_tasks[:3]}
                })
            
            # Check for tasks not progressing
            stalled = [
                t for t in self.context.related_tasks 
                if t.get("status") == "in-progress" and 
                self._days_since(t.get("updated_at")) > 7
            ]
            if stalled:
                patterns.append({
                    "type": "stalled_tasks",
                    "severity": "medium",
                    "data": {"count": len(stalled), "tasks": stalled[:3]}
                })
        
        # Pattern 2: Learning opportunity
        if self.context.level == "Beginner" and len(self.context.related_pages) < 3:
            patterns.append({
                "type": "needs_content",
                "severity": "low",
                "data": {"current_pages": len(self.context.related_pages)}
            })
        
        # Pattern 3: Ready for advancement
        if self.context.recent_activity:
            recent_successes = sum(
                1 for a in self.context.recent_activity 
                if a.get("success", True)
            )
            if recent_successes >= 5 and self.context.level != "Expert":
                patterns.append({
                    "type": "ready_for_advancement",
                    "severity": "info",
                    "data": {"recent_successes": recent_successes, "current_level": self.context.level}
                })
        
        # Pattern 4: Prerequisite not met
        if self.context.prerequisite_skills:
            # Check if prerequisites are at sufficient level
            prereq_response = supabase_admin.table("skills")\
                .select("id, name, level")\
                .in_("id", self.context.prerequisite_skills)\
                .execute()
            
            weak_prereqs = [
                p for p in prereq_response.data or []
                if p.get("level") == "Beginner"
            ]
            if weak_prereqs:
                patterns.append({
                    "type": "weak_prerequisites",
                    "severity": "medium",
                    "data": {"skills": weak_prereqs}
                })
        
        return patterns
    
    async def should_activate(self, relevance: float, patterns: List[Dict]) -> bool:
        """
        PHASE 3: ACTIVATE (Decision)
        Decide whether to activate based on relevance and patterns.
        """
        # Always activate for high-severity patterns
        if any(p.get("severity") == "high" for p in patterns):
            return True
        
        # Activate if relevance exceeds threshold
        if relevance >= self._activation_threshold:
            return True
        
        # Activate if multiple medium patterns
        medium_patterns = [p for p in patterns if p.get("severity") == "medium"]
        if len(medium_patterns) >= 2:
            return True
        
        return False
    
    async def activate(self):
        """
        PHASE 3: ACTIVATE
        Transition to activated state.
        """
        self.state = SkillState.ACTIVATED
        
        # Record activation
        if self.memory:
            self.memory.activation_history.append({
                "timestamp": datetime.utcnow().isoformat(),
                "context_summary": {
                    "pages": len(self.context.related_pages) if self.context else 0,
                    "tasks": len(self.context.related_tasks) if self.context else 0
                }
            })
        
        # Update skill activation count in database
        try:
            supabase_admin.table("skills").update({
                "last_activated_at": datetime.utcnow().isoformat(),
                "activation_count": supabase_admin.table("skills")
                    .select("activation_count")
                    .eq("id", self.skill_id)
                    .single()
                    .execute()
                    .data.get("activation_count", 0) + 1
            }).eq("id", self.skill_id).execute()
        except:
            pass
    
    async def reason(self, patterns: List[Dict]) -> List[SkillAction]:
        """
        PHASE 4: REASON
        Analyze patterns and determine appropriate actions.
        """
        self.state = SkillState.REASONING
        actions = []
        
        if not self.context:
            return actions
        
        for pattern in patterns:
            pattern_type = pattern.get("type")
            
            if pattern_type == "blocked_tasks":
                # Suggest breaking down blocked tasks
                for task in pattern["data"].get("tasks", [])[:2]:
                    actions.append(SkillAction(
                        action_type="suggest_task_breakdown",
                        target_type="task",
                        target_id=task.get("id"),
                        payload={
                            "task_title": task.get("title"),
                            "suggestion": "Break this task into smaller steps"
                        },
                        reason=f"Task '{task.get('title')}' is blocked. Breaking it down may help progress.",
                        expected_impact="Unblock progress on this skill",
                        confidence=0.7,
                        reversible=True
                    ))
            
            elif pattern_type == "stalled_tasks":
                # Suggest reviewing stalled tasks
                actions.append(SkillAction(
                    action_type="create_insight",
                    target_type="skill",
                    target_id=self.skill_id,
                    payload={
                        "insight_type": "stalled_progress",
                        "title": f"Progress on '{self.context.skill_name}' has stalled",
                        "description": f"{pattern['data']['count']} tasks haven't been updated in over a week."
                    },
                    reason="Tasks linked to this skill are not progressing",
                    expected_impact="Bring attention to stalled work",
                    confidence=0.8,
                    reversible=True
                ))
            
            elif pattern_type == "needs_content":
                # Suggest creating learning content
                actions.append(SkillAction(
                    action_type="suggest_page_creation",
                    target_type="skill",
                    target_id=self.skill_id,
                    payload={
                        "suggestion": f"Create notes or resources for '{self.context.skill_name}'",
                        "current_pages": pattern["data"]["current_pages"]
                    },
                    reason="This skill has limited learning content",
                    expected_impact="Build knowledge base for this skill",
                    confidence=0.6,
                    reversible=True
                ))
            
            elif pattern_type == "ready_for_advancement":
                # Suggest level advancement
                next_level = self._get_next_level(self.context.level)
                if next_level:
                    actions.append(SkillAction(
                        action_type="suggest_level_up",
                        target_type="skill",
                        target_id=self.skill_id,
                        payload={
                            "current_level": self.context.level,
                            "suggested_level": next_level,
                            "recent_successes": pattern["data"]["recent_successes"]
                        },
                        reason=f"You've had {pattern['data']['recent_successes']} recent successes with this skill",
                        expected_impact="Recognize your progress and unlock advanced content",
                        confidence=0.75,
                        reversible=True
                    ))
            
            elif pattern_type == "weak_prerequisites":
                # Suggest focusing on prerequisites
                for prereq in pattern["data"].get("skills", [])[:2]:
                    actions.append(SkillAction(
                        action_type="suggest_focus_shift",
                        target_type="skill",
                        target_id=prereq.get("id"),
                        payload={
                            "prereq_name": prereq.get("name"),
                            "main_skill": self.context.skill_name
                        },
                        reason=f"'{prereq.get('name')}' is a prerequisite that needs more attention",
                        expected_impact=f"Strengthen foundation for '{self.context.skill_name}'",
                        confidence=0.7,
                        reversible=True
                    ))
        
        return actions
    
    async def propose_actions(self, actions: List[SkillAction]) -> List[str]:
        """
        PHASE 5: PROPOSE ACTION
        Store proposed actions for user review.
        Returns list of created action IDs.
        """
        self.state = SkillState.PROPOSING
        action_ids = []
        
        if not self.context:
            return action_ids
        
        for action in actions:
            try:
                import uuid
                action_id = str(uuid.uuid4())
                
                supabase_admin.table("proposed_actions").insert({
                    "id": action_id,
                    "workspace_id": self.workspace_id,
                    "user_id": self.context.user_id,
                    "action_type": action.action_type,
                    "target_type": action.target_type,
                    "target_id": action.target_id,
                    "payload": action.payload,
                    "reason": action.reason,
                    "expected_impact": action.expected_impact,
                    "reversible": action.reversible,
                    "trust_level_required": 2,  # Suggest level
                    "executed": False,
                    "created_at": datetime.utcnow().isoformat(),
                    "source_skill_id": self.skill_id  # Track which skill proposed this
                }).execute()
                
                action_ids.append(action_id)
            except Exception as e:
                print(f"Error proposing action: {e}")
        
        return action_ids
    
    async def execute_action(self, action: SkillAction) -> Tuple[bool, Dict]:
        """
        PHASE 6: EXECUTE (Optional)
        Execute an action if trust level allows.
        Returns (success, result).
        """
        self.state = SkillState.EXECUTING
        
        # For now, most actions require user approval
        # Only low-impact actions can auto-execute
        
        if action.action_type == "create_insight":
            try:
                import uuid
                supabase_admin.table("insights").insert({
                    "id": str(uuid.uuid4()),
                    "workspace_id": self.workspace_id,
                    "user_id": self.context.user_id if self.context else "",
                    "insight_type": action.payload.get("insight_type", "skill_insight"),
                    "title": action.payload.get("title", ""),
                    "description": action.payload.get("description", ""),
                    "severity": "info",
                    "suggested_actions": [],
                    "dismissed": False,
                    "created_at": datetime.utcnow().isoformat()
                }).execute()
                return True, {"created": "insight"}
            except Exception as e:
                return False, {"error": str(e)}
        
        # Other actions require approval
        return False, {"requires_approval": True}
    
    async def evaluate(self, action_id: str) -> Dict:
        """
        PHASE 7: EVALUATE
        Check the outcome of an executed action.
        """
        self.state = SkillState.EVALUATING
        
        try:
            # Get action result
            action_response = supabase_admin.table("proposed_actions")\
                .select("*")\
                .eq("id", action_id)\
                .single()\
                .execute()
            
            if not action_response.data:
                return {"success": False, "reason": "Action not found"}
            
            action = action_response.data
            
            return {
                "success": action.get("executed", False),
                "rejected": action.get("rejected", False),
                "action_type": action.get("action_type"),
                "executed_at": action.get("executed_at")
            }
        except Exception as e:
            return {"success": False, "reason": str(e)}
    
    async def learn(self, evaluation: Dict):
        """
        PHASE 8: LEARN
        Update memory based on evaluation results.
        """
        self.state = SkillState.LEARNING
        
        if not self.memory:
            return
        
        pattern_record = {
            "timestamp": datetime.utcnow().isoformat(),
            "action_type": evaluation.get("action_type"),
            "context": {
                "level": self.context.level if self.context else None,
                "task_count": len(self.context.related_tasks) if self.context else 0
            }
        }
        
        if evaluation.get("success"):
            self.memory.successful_patterns.append(pattern_record)
            self.memory.confidence_adjustments.append(0.05)  # Boost confidence
        elif evaluation.get("rejected"):
            self.memory.failed_patterns.append(pattern_record)
            self.memory.confidence_adjustments.append(-0.1)  # Reduce confidence
        
        # Save updated memory
        await self._save_memory()
    
    async def evolve(self):
        """
        PHASE 9: EVOLVE
        Improve behavior based on accumulated learning.
        """
        self.state = SkillState.EVOLVING
        
        if not self.memory:
            return
        
        # Adjust activation threshold based on success rate
        if len(self.memory.confidence_adjustments) >= 10:
            recent_adjustments = self.memory.confidence_adjustments[-10:]
            avg_adjustment = sum(recent_adjustments) / len(recent_adjustments)
            
            # If mostly successful, lower threshold (activate more)
            # If mostly rejected, raise threshold (activate less)
            self._activation_threshold = max(0.3, min(0.9, 
                self._activation_threshold - avg_adjustment
            ))
        
        # Update user preferences based on patterns
        if self.memory.successful_patterns:
            # Track which action types work best
            action_types = [p.get("action_type") for p in self.memory.successful_patterns[-20:]]
            from collections import Counter
            preferred_actions = Counter(action_types).most_common(3)
            self.memory.user_preferences["preferred_actions"] = [a[0] for a in preferred_actions]
        
        self.memory.last_evolved_at = datetime.utcnow()
        await self._save_memory()
        
        # Update skill confidence in database
        if self.memory.confidence_adjustments:
            total_adjustment = sum(self.memory.confidence_adjustments[-50:])
            try:
                current = supabase_admin.table("skills")\
                    .select("confidence_score")\
                    .eq("id", self.skill_id)\
                    .single()\
                    .execute()
                
                current_score = current.data.get("confidence_score", 0) if current.data else 0
                new_score = max(0, min(1, current_score + total_adjustment))
                
                supabase_admin.table("skills").update({
                    "confidence_score": new_score,
                    "success_rate": len(self.memory.successful_patterns) / max(1, 
                        len(self.memory.successful_patterns) + len(self.memory.failed_patterns)
                    )
                }).eq("id", self.skill_id).execute()
            except:
                pass
    
    async def run_lifecycle(self, signal_data: Dict) -> Dict:
        """
        Run the complete skill lifecycle for a given signal.
        """
        result = {
            "skill_id": self.skill_id,
            "activated": False,
            "patterns": [],
            "actions_proposed": [],
            "executed": False
        }
        
        # Initialize if needed
        if not self.context:
            if not await self.initialize():
                return result
        
        # PHASE 1: OBSERVE
        relevance = await self.observe(signal_data)
        result["relevance"] = relevance
        
        # PHASE 2: DETECT PATTERN
        patterns = await self.detect_pattern()
        result["patterns"] = patterns
        
        # PHASE 3: ACTIVATE (Decision)
        if not await self.should_activate(relevance, patterns):
            self.state = SkillState.DORMANT
            return result
        
        await self.activate()
        result["activated"] = True
        
        # PHASE 4: REASON
        actions = await self.reason(patterns)
        
        # PHASE 5: PROPOSE ACTION
        action_ids = await self.propose_actions(actions)
        result["actions_proposed"] = action_ids
        
        # PHASE 6: EXECUTE (for auto-executable actions)
        for action in actions:
            if action.action_type == "create_insight":
                success, exec_result = await self.execute_action(action)
                if success:
                    result["executed"] = True
        
        # PHASE 7-9: EVALUATE, LEARN, EVOLVE
        # These happen asynchronously when actions are approved/rejected
        
        # Return to dormant state
        self.state = SkillState.DORMANT
        
        return result
    
    # ==================== HELPERS ====================
    
    def _days_since(self, date_str: Optional[str]) -> int:
        if not date_str:
            return 999
        try:
            date = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
            return (datetime.utcnow() - date.replace(tzinfo=None)).days
        except:
            return 999
    
    def _get_next_level(self, current: str) -> Optional[str]:
        levels = ["Beginner", "Intermediate", "Advanced", "Expert"]
        try:
            idx = levels.index(current)
            return levels[idx + 1] if idx < len(levels) - 1 else None
        except:
            return None


class SkillAgentManager:
    """
    Manages all skill agents in a workspace.
    Coordinates lifecycle execution across skills.
    """
    
    def __init__(self, workspace_id: str):
        self.workspace_id = workspace_id
        self.agents: Dict[str, SkillAgent] = {}
    
    async def get_or_create_agent(self, skill_id: str) -> SkillAgent:
        """Get existing agent or create new one"""
        if skill_id not in self.agents:
            agent = SkillAgent(skill_id, self.workspace_id)
            await agent.initialize()
            self.agents[skill_id] = agent
        return self.agents[skill_id]
    
    async def process_signal(self, signal_data: Dict) -> List[Dict]:
        """
        Process a signal through all relevant skill agents.
        """
        results = []
        
        # Get all skills in workspace
        skills_response = supabase_admin.table("skills")\
            .select("id")\
            .eq("workspace_id", self.workspace_id)\
            .execute()
        
        if not skills_response.data:
            return results
        
        # Run lifecycle for each skill
        for skill in skills_response.data:
            agent = await self.get_or_create_agent(skill["id"])
            result = await agent.run_lifecycle(signal_data)
            if result.get("activated"):
                results.append(result)
        
        return results
    
    async def evaluate_and_learn(self, action_id: str, skill_id: str):
        """
        Called when an action is approved/rejected.
        Triggers evaluate → learn → evolve phases.
        """
        agent = await self.get_or_create_agent(skill_id)
        
        # PHASE 7: EVALUATE
        evaluation = await agent.evaluate(action_id)
        
        # PHASE 8: LEARN
        await agent.learn(evaluation)
        
        # PHASE 9: EVOLVE (periodically, not every time)
        if agent.memory and len(agent.memory.confidence_adjustments) % 10 == 0:
            await agent.evolve()


# Global manager cache
_workspace_managers: Dict[str, SkillAgentManager] = {}

def get_skill_manager(workspace_id: str) -> SkillAgentManager:
    """Get or create skill manager for workspace"""
    if workspace_id not in _workspace_managers:
        _workspace_managers[workspace_id] = SkillAgentManager(workspace_id)
    return _workspace_managers[workspace_id]
