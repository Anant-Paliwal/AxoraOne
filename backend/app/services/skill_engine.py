"""
Advanced Skill Engine - Event-Driven, Cost-Safe Intelligence OS

This engine:
- Runs continuously WITHOUT calling LLMs
- Learns from Pages + Tasks + Calendar events
- Uses LLMs ONLY when strictly necessary
- Tracks contribution, confidence, and outcomes
- Supports future Skill Marketplace

NO LLM CALLS IN THIS FILE (except when explicitly allowed)
"""

from typing import Dict, List, Optional, Tuple
from datetime import datetime, timedelta
from enum import Enum
import asyncio
import json
from dataclasses import dataclass
from app.core.supabase import supabase_admin


class SignalType(Enum):
    """Detected patterns that trigger skill activation"""
    # Task signals
    OVERSIZED_TASK = "oversized_task"
    TASK_DELAYED = "task_delayed"
    TASK_BLOCKED = "task_blocked"
    TASK_COMPLETED = "task_completed"
    NO_SUBTASKS = "no_subtasks"
    
    # Page signals
    PAGE_DRIFT = "page_drift"
    PAGE_NEGLECTED = "page_neglected"
    PAGE_CREATED = "page_created"
    PAGE_EDITED = "page_edited"
    
    # Calendar signals
    DEADLINE_PRESSURE = "deadline_pressure"
    OVERCOMMITTED = "overcommitted"
    
    # Skill signals
    SKILL_STALLED = "skill_stalled"
    SKILL_READY_ADVANCE = "skill_ready_advance"


class EventOutcome(Enum):
    """Outcome of a skill event"""
    SUCCESS = "success"      # +0.05 confidence
    IGNORED = "ignored"      # -0.03 confidence
    FAILED = "failed"        # -0.08 confidence
    PENDING = "pending"      # No change yet


@dataclass
class SkillEvent:
    """Event that triggers skill learning"""
    skill_id: str
    event_type: str
    entity_type: str
    entity_id: str
    signal: SignalType
    outcome: EventOutcome
    confidence_delta: float
    metadata: Dict
    workspace_id: str


class SkillEngine:
    """
    Core Skill Engine - Runs continuously, processes events, NO LLM calls
    """
    
    def __init__(self):
        self._running = False
        self._signal_rules = self._init_signal_rules()
    
    def _init_signal_rules(self) -> Dict:
        """
        Define rules for detecting signals WITHOUT LLM.
        These are simple, fast, deterministic checks.
        """
        return {
            SignalType.OVERSIZED_TASK: {
                "check": lambda task: (
                    task.get("delayed_count", 0) >= 2 and
                    not task.get("subtasks")
                ),
                "activation_signals": ["planning", "execution"],
                "suggestion": "Break this task into smaller steps"
            },
            SignalType.TASK_DELAYED: {
                "check": lambda task: task.get("delayed_count", 0) >= 1,
                "activation_signals": ["execution", "planning"],
                "suggestion": "Review task scope and timeline"
            },
            SignalType.TASK_BLOCKED: {
                "check": lambda task: task.get("status") == "blocked",
                "activation_signals": ["decision", "planning"],
                "suggestion": "Identify and remove blockers"
            },
            SignalType.PAGE_NEGLECTED: {
                "check": lambda page: self._days_since(page.get("updated_at")) > 30,
                "activation_signals": ["learning", "research"],
                "suggestion": "Review and update this page"
            },
            SignalType.DEADLINE_PRESSURE: {
                "check": lambda task: (
                    task.get("due_date") and
                    self._days_until(task.get("due_date")) <= 2 and
                    task.get("status") != "completed"
                ),
                "activation_signals": ["execution", "decision"],
                "suggestion": "Prioritize this task"
            }
        }
    
    # ==================== EVENT PROCESSING ====================
    
    async def process_page_event(
        self,
        page_id: str,
        event_type: str,  # created, edited
        workspace_id: str,
        user_id: str
    ):
        """Process page event and detect signals"""
        try:
            # Get page data
            page = await self._get_page(page_id)
            if not page:
                return
            
            # Detect signals
            signals = []
            
            if event_type == "edited":
                # Check for neglect (was it neglected before?)
                if self._days_since(page.get("updated_at")) > 30:
                    signals.append(SignalType.PAGE_NEGLECTED)
            
            # Get skills that should observe this
            skills = await self._get_relevant_skills(
                workspace_id=workspace_id,
                entity_type="page",
                entity_id=page_id,
                signals=signals
            )
            
            # Create events for each skill
            for skill in skills:
                for signal in signals:
                    await self._create_skill_event(
                        skill_id=skill["id"],
                        event_type=event_type,
                        entity_type="page",
                        entity_id=page_id,
                        signal=signal,
                        workspace_id=workspace_id,
                        metadata={"page_title": page.get("title")}
                    )
        
        except Exception as e:
            print(f"Error processing page event: {e}")
    
    async def process_task_event(
        self,
        task_id: str,
        event_type: str,  # created, updated, completed, delayed
        workspace_id: str,
        user_id: str
    ):
        """Process task event and detect signals"""
        try:
            # Get task data
            task = await self._get_task(task_id)
            if not task:
                return
            
            # Detect signals using rules
            signals = []
            
            for signal_type, rule in self._signal_rules.items():
                if rule["check"](task):
                    signals.append(signal_type)
            
            # Get skills that should observe this
            skills = await self._get_relevant_skills(
                workspace_id=workspace_id,
                entity_type="task",
                entity_id=task_id,
                signals=signals,
                linked_skill_id=task.get("linked_skill_id")
            )
            
            # Create events for each skill
            for skill in skills:
                for signal in signals:
                    # Calculate confidence delta based on event
                    delta = self._calculate_confidence_delta(event_type, signal)
                    
                    await self._create_skill_event(
                        skill_id=skill["id"],
                        event_type=event_type,
                        entity_type="task",
                        entity_id=task_id,
                        signal=signal,
                        workspace_id=workspace_id,
                        metadata={
                            "task_title": task.get("title"),
                            "task_status": task.get("status")
                        },
                        confidence_delta=delta
                    )
                    
                    # Update skill confidence immediately
                    if delta != 0:
                        await self._update_skill_confidence(skill["id"], delta)
        
        except Exception as e:
            print(f"Error processing task event: {e}")
    
    async def process_task_completion(
        self,
        task_id: str,
        workspace_id: str,
        user_id: str
    ):
        """
        Special handler for task completion.
        This is a SUCCESS signal for linked skills.
        """
        try:
            task = await self._get_task(task_id)
            if not task:
                return
            
            linked_skill_id = task.get("linked_skill_id")
            if not linked_skill_id:
                return
            
            # SUCCESS: Task completed
            await self._create_skill_event(
                skill_id=linked_skill_id,
                event_type="task_completed",
                entity_type="task",
                entity_id=task_id,
                signal=SignalType.TASK_COMPLETED,
                workspace_id=workspace_id,
                metadata={
                    "task_title": task.get("title"),
                    "completion_time": datetime.utcnow().isoformat()
                },
                confidence_delta=0.05,  # Success boost
                outcome=EventOutcome.SUCCESS
            )
            
            # Update skill confidence
            await self._update_skill_confidence(linked_skill_id, 0.05)
            
            # Check if skill is ready to advance
            await self._check_skill_advancement(linked_skill_id, workspace_id)
        
        except Exception as e:
            print(f"Error processing task completion: {e}")
    
    # ==================== SKILL CONFIDENCE ====================
    
    def _calculate_confidence_delta(
        self,
        event_type: str,
        signal: SignalType
    ) -> float:
        """Calculate confidence change for an event"""
        # Success events
        if event_type == "task_completed":
            return 0.05
        
        # Neutral events (just observation)
        if event_type in ["created", "edited"]:
            return 0.0
        
        # Negative events
        if event_type == "task_delayed":
            return -0.03
        
        if event_type == "task_blocked":
            return -0.05
        
        return 0.0
    
    async def _update_skill_confidence(
        self,
        skill_id: str,
        delta: float
    ):
        """Update skill confidence and status"""
        try:
            # Use database function
            supabase_admin.rpc(
                "update_skill_confidence",
                {"p_skill_id": skill_id, "p_delta": delta}
            ).execute()
        except Exception as e:
            # Fallback to manual update
            try:
                skill = supabase_admin.table("skills")\
                    .select("confidence")\
                    .eq("id", skill_id)\
                    .single()\
                    .execute()
                
                if skill.data:
                    current = skill.data.get("confidence", 0.3)
                    new_confidence = max(0, min(1, current + delta))
                    
                    # Calculate status
                    if new_confidence < 0.31:
                        status = "learning"
                    elif new_confidence < 0.61:
                        status = "helping"
                    elif new_confidence < 0.81:
                        status = "reliable"
                    else:
                        status = "trusted"
                    
                    supabase_admin.table("skills").update({
                        "confidence": new_confidence,
                        "status": status,
                        "updated_at": datetime.utcnow().isoformat()
                    }).eq("id", skill_id).execute()
            except Exception as fallback_error:
                print(f"Error updating skill confidence: {fallback_error}")
    
    async def apply_confidence_decay(self, workspace_id: str):
        """
        Apply confidence decay for inactive skills.
        Run this periodically (e.g., daily).
        """
        try:
            # Get skills not activated in 14+ days
            two_weeks_ago = (datetime.utcnow() - timedelta(days=14)).isoformat()
            
            inactive_skills = supabase_admin.table("skills")\
                .select("id, confidence, last_activated_at")\
                .eq("workspace_id", workspace_id)\
                .or_(f"last_activated_at.lt.{two_weeks_ago},last_activated_at.is.null")\
                .execute()
            
            for skill in inactive_skills.data or []:
                # Decay by -0.01
                await self._update_skill_confidence(skill["id"], -0.01)
        
        except Exception as e:
            print(f"Error applying confidence decay: {e}")
    
    # ==================== SKILL ADVANCEMENT ====================
    
    async def _check_skill_advancement(
        self,
        skill_id: str,
        workspace_id: str
    ):
        """Check if skill is ready to advance to next level"""
        try:
            skill = supabase_admin.table("skills")\
                .select("*")\
                .eq("id", skill_id)\
                .single()\
                .execute()
            
            if not skill.data:
                return
            
            skill_data = skill.data
            current_level = skill_data.get("level", "Beginner")
            confidence = skill_data.get("confidence", 0)
            
            # Advancement thresholds
            advancement_map = {
                "Beginner": ("Intermediate", 0.6),
                "Intermediate": ("Advanced", 0.75),
                "Advanced": ("Expert", 0.9)
            }
            
            if current_level in advancement_map:
                next_level, threshold = advancement_map[current_level]
                
                if confidence >= threshold:
                    # Create insight about advancement
                    await self._create_advancement_insight(
                        skill_id=skill_id,
                        skill_name=skill_data.get("name"),
                        current_level=current_level,
                        next_level=next_level,
                        confidence=confidence,
                        workspace_id=workspace_id,
                        user_id=skill_data.get("user_id")
                    )
        
        except Exception as e:
            print(f"Error checking skill advancement: {e}")
    
    async def _create_advancement_insight(
        self,
        skill_id: str,
        skill_name: str,
        current_level: str,
        next_level: str,
        confidence: float,
        workspace_id: str,
        user_id: str
    ):
        """Create insight suggesting skill level advancement"""
        try:
            import uuid
            supabase_admin.table("insights").insert({
                "id": str(uuid.uuid4()),
                "workspace_id": workspace_id,
                "user_id": user_id,
                "insight_type": "skill_ready_advance",
                "title": f"'{skill_name}' is ready to advance",
                "description": f"Your confidence in {skill_name} has reached {confidence:.0%}. Consider advancing from {current_level} to {next_level}.",
                "severity": "info",
                "source_signals": [skill_id],
                "suggested_actions": [{
                    "type": "advance_skill",
                    "skill_id": skill_id,
                    "from_level": current_level,
                    "to_level": next_level
                }],
                "dismissed": False,
                "created_at": datetime.utcnow().isoformat()
            }).execute()
        except Exception as e:
            print(f"Error creating advancement insight: {e}")
    
    # ==================== LLM CONTROL (STRICT) ====================
    
    async def can_call_llm(
        self,
        skill_id: str,
        signal: str,
        entity_id: str
    ) -> Tuple[bool, str]:
        """
        Check if LLM call is allowed.
        Returns (allowed, reason)
        """
        try:
            # Get skill
            skill = supabase_admin.table("skills")\
                .select("confidence")\
                .eq("id", skill_id)\
                .single()\
                .execute()
            
            if not skill.data:
                return False, "Skill not found"
            
            confidence = skill.data.get("confidence", 0)
            
            # Rule 1: Confidence must be >= 0.4
            if confidence < 0.4:
                return False, f"Confidence too low ({confidence:.2f} < 0.4)"
            
            # Rule 2: Check cooldown (24h)
            cooldown = supabase_admin.table("skill_cooldowns")\
                .select("last_llm_call, signal_counts")\
                .eq("skill_id", skill_id)\
                .execute()
            
            if cooldown.data:
                last_call = cooldown.data[0].get("last_llm_call")
                if last_call:
                    last_call_dt = datetime.fromisoformat(last_call.replace('Z', '+00:00'))
                    hours_since = (datetime.utcnow() - last_call_dt.replace(tzinfo=None)).total_seconds() / 3600
                    
                    if hours_since < 24:
                        return False, f"Cooldown active ({24 - hours_since:.1f}h remaining)"
                
                # Rule 3: Signal must be detected >= 2 times
                signal_counts = cooldown.data[0].get("signal_counts", {})
                count = signal_counts.get(signal, 0)
                
                if count < 2:
                    return False, f"Signal detected only {count} times (need 2+)"
            
            # Rule 4: Check cache first
            cache_key = f"{skill_id}:{signal}:{entity_id}"
            cached = supabase_admin.table("llm_cache")\
                .select("llm_output")\
                .eq("cache_key", cache_key)\
                .execute()
            
            if cached.data:
                # Use cached output instead
                return False, "Using cached output"
            
            return True, "All checks passed"
        
        except Exception as e:
            return False, f"Error: {str(e)}"
    
    async def record_llm_call(
        self,
        skill_id: str,
        signal: str,
        entity_id: str,
        entity_type: str,
        llm_output: str,
        output_type: str,
        workspace_id: str
    ):
        """Record LLM call and cache output"""
        try:
            import uuid
            
            # Update cooldown
            supabase_admin.table("skill_cooldowns").upsert({
                "skill_id": skill_id,
                "last_llm_call": datetime.utcnow().isoformat(),
                "workspace_id": workspace_id
            }, on_conflict="skill_id").execute()
            
            # Cache output
            cache_key = f"{skill_id}:{signal}:{entity_id}"
            supabase_admin.table("llm_cache").insert({
                "id": str(uuid.uuid4()),
                "cache_key": cache_key,
                "skill_id": skill_id,
                "signal": signal,
                "entity_id": entity_id,
                "entity_type": entity_type,
                "llm_output": llm_output,
                "output_type": output_type,
                "workspace_id": workspace_id,
                "created_at": datetime.utcnow().isoformat()
            }).execute()
        
        except Exception as e:
            print(f"Error recording LLM call: {e}")
    
    async def increment_signal_count(
        self,
        skill_id: str,
        signal: str,
        workspace_id: str
    ):
        """Increment signal detection count"""
        try:
            # Get current counts
            cooldown = supabase_admin.table("skill_cooldowns")\
                .select("signal_counts")\
                .eq("skill_id", skill_id)\
                .execute()
            
            if cooldown.data:
                counts = cooldown.data[0].get("signal_counts", {})
            else:
                counts = {}
            
            counts[signal] = counts.get(signal, 0) + 1
            
            # Update
            supabase_admin.table("skill_cooldowns").upsert({
                "skill_id": skill_id,
                "signal_counts": counts,
                "workspace_id": workspace_id
            }, on_conflict="skill_id").execute()
        
        except Exception as e:
            print(f"Error incrementing signal count: {e}")
    
    # ==================== SKILL SUPPRESSION ====================
    
    async def check_suppression(self, skill_id: str) -> bool:
        """Check if skill is currently suppressed"""
        try:
            suppression = supabase_admin.table("skill_suppression")\
                .select("suppressed_until")\
                .eq("skill_id", skill_id)\
                .gte("suppressed_until", datetime.utcnow().isoformat())\
                .execute()
            
            return len(suppression.data or []) > 0
        except:
            return False
    
    async def record_ignore(
        self,
        skill_id: str,
        suggestion_id: str,
        workspace_id: str
    ):
        """Record when user ignores a skill suggestion"""
        try:
            # Get current ignore count
            suppression = supabase_admin.table("skill_suppression")\
                .select("ignore_count")\
                .eq("skill_id", skill_id)\
                .execute()
            
            if suppression.data:
                ignore_count = suppression.data[0].get("ignore_count", 0) + 1
            else:
                ignore_count = 1
            
            # If ignored 3+ times, suppress for 7 days
            if ignore_count >= 3:
                import uuid
                supabase_admin.table("skill_suppression").upsert({
                    "id": str(uuid.uuid4()),
                    "skill_id": skill_id,
                    "suppressed_until": (datetime.utcnow() + timedelta(days=7)).isoformat(),
                    "reason": "ignored_3_times",
                    "ignore_count": ignore_count,
                    "workspace_id": workspace_id
                }, on_conflict="skill_id").execute()
                
                print(f"Skill {skill_id} suppressed for 7 days (ignored {ignore_count} times)")
        
        except Exception as e:
            print(f"Error recording ignore: {e}")
    
    # ==================== HELPERS ====================
    
    async def _create_skill_event(
        self,
        skill_id: str,
        event_type: str,
        entity_type: str,
        entity_id: str,
        signal: SignalType,
        workspace_id: str,
        metadata: Dict,
        confidence_delta: float = 0.0,
        outcome: EventOutcome = EventOutcome.PENDING
    ):
        """Create a skill event record"""
        try:
            import uuid
            supabase_admin.table("skill_events").insert({
                "id": str(uuid.uuid4()),
                "skill_id": skill_id,
                "event_type": event_type,
                "entity_type": entity_type,
                "entity_id": entity_id,
                "signal": signal.value,
                "outcome": outcome.value,
                "confidence_delta": confidence_delta,
                "metadata": metadata,
                "workspace_id": workspace_id,
                "created_at": datetime.utcnow().isoformat()
            }).execute()
            
            # Increment signal count
            await self.increment_signal_count(skill_id, signal.value, workspace_id)
        
        except Exception as e:
            print(f"Error creating skill event: {e}")
    
    async def _get_relevant_skills(
        self,
        workspace_id: str,
        entity_type: str,
        entity_id: str,
        signals: List[SignalType],
        linked_skill_id: Optional[str] = None
    ) -> List[Dict]:
        """Get skills that should observe this event"""
        try:
            # Start with linked skill if provided
            skills = []
            
            if linked_skill_id:
                linked = supabase_admin.table("skills")\
                    .select("*")\
                    .eq("id", linked_skill_id)\
                    .execute()
                if linked.data:
                    skills.extend(linked.data)
            
            # Get skills with matching activation signals
            for signal in signals:
                signal_value = signal.value
                
                # Get skills that have this signal in activation_signals
                matching = supabase_admin.table("skills")\
                    .select("*")\
                    .eq("workspace_id", workspace_id)\
                    .contains("activation_signals", [signal_value])\
                    .execute()
                
                if matching.data:
                    # Avoid duplicates
                    existing_ids = {s["id"] for s in skills}
                    skills.extend([s for s in matching.data if s["id"] not in existing_ids])
            
            return skills
        
        except Exception as e:
            print(f"Error getting relevant skills: {e}")
            return []
    
    async def _get_page(self, page_id: str) -> Optional[Dict]:
        """Get page data"""
        try:
            response = supabase_admin.table("pages")\
                .select("*")\
                .eq("id", page_id)\
                .single()\
                .execute()
            return response.data
        except:
            return None
    
    async def _get_task(self, task_id: str) -> Optional[Dict]:
        """Get task data"""
        try:
            response = supabase_admin.table("tasks")\
                .select("*")\
                .eq("id", task_id)\
                .single()\
                .execute()
            return response.data
        except:
            return None
    
    def _days_since(self, date_str: Optional[str]) -> int:
        """Calculate days since a date"""
        if not date_str:
            return 999
        try:
            date = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
            return (datetime.utcnow() - date.replace(tzinfo=None)).days
        except:
            return 999
    
    def _days_until(self, date_str: Optional[str]) -> int:
        """Calculate days until a date"""
        if not date_str:
            return 999
        try:
            date = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
            return (date.replace(tzinfo=None) - datetime.utcnow()).days
        except:
            return 999


# Global instance
skill_engine = SkillEngine()
