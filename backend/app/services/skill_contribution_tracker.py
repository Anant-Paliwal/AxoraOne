"""
Skill Contribution Tracker - Measures REAL skill impact

A skill is contributing if it causes any of these measurable improvements:
- Tasks: Finished faster / fewer delays
- Pages: Better structure / less rewrites  
- Decisions: Fewer reversals
- Home: Fewer recurring problems
- User: Accepts suggestions more often

Skills don't get stronger because they run.
They get stronger because they HELP.
"""

from typing import Dict, List, Optional
from datetime import datetime, timedelta
from dataclasses import dataclass
from app.core.supabase import supabase_admin

@dataclass
class SkillContribution:
    """Tracks a single contribution event"""
    skill_id: str
    contribution_type: str  # suggestion_accepted, task_accelerated, page_improved, etc.
    target_id: str
    target_type: str
    impact_score: float  # 0-1, how much it helped
    timestamp: datetime
    metadata: Dict

class SkillContributionTracker:
    """
    Tracks REAL contributions from skills.
    This is what actually increases skill confidence.
    """
    
    async def track_suggestion_accepted(
        self, 
        skill_id: str, 
        suggestion_id: str,
        workspace_id: str
    ):
        """User accepted a skill's suggestion - STRONG signal"""
        await self._record_contribution(
            skill_id=skill_id,
            contribution_type="suggestion_accepted",
            target_id=suggestion_id,
            target_type="suggestion",
            impact_score=0.15,  # Big boost for acceptance
            workspace_id=workspace_id,
            metadata={"suggestion_id": suggestion_id}
        )
        
        # Update skill confidence immediately
        await self._boost_confidence(skill_id, 0.15)
    
    async def track_suggestion_rejected(
        self,
        skill_id: str,
        suggestion_id: str,
        workspace_id: str
    ):
        """User rejected a skill's suggestion - learn from this"""
        await self._record_contribution(
            skill_id=skill_id,
            contribution_type="suggestion_rejected",
            target_id=suggestion_id,
            target_type="suggestion",
            impact_score=-0.10,  # Penalty for bad suggestion
            workspace_id=workspace_id,
            metadata={"suggestion_id": suggestion_id}
        )
        
        # Reduce confidence
        await self._boost_confidence(skill_id, -0.10)
    
    async def track_task_accelerated(
        self,
        skill_id: str,
        task_id: str,
        workspace_id: str,
        days_saved: int
    ):
        """Task completed faster than expected - skill helped"""
        impact = min(0.20, days_saved * 0.05)  # More days saved = more impact
        
        await self._record_contribution(
            skill_id=skill_id,
            contribution_type="task_accelerated",
            target_id=task_id,
            target_type="task",
            impact_score=impact,
            workspace_id=workspace_id,
            metadata={"days_saved": days_saved}
        )
        
        await self._boost_confidence(skill_id, impact)
    
    async def track_page_improved(
        self,
        skill_id: str,
        page_id: str,
        workspace_id: str,
        improvement_type: str  # "less_rewrites", "better_structure", etc.
    ):
        """Page quality improved due to skill guidance"""
        impact_map = {
            "less_rewrites": 0.10,
            "better_structure": 0.12,
            "clearer_content": 0.08,
            "linked_properly": 0.05
        }
        
        impact = impact_map.get(improvement_type, 0.05)
        
        await self._record_contribution(
            skill_id=skill_id,
            contribution_type="page_improved",
            target_id=page_id,
            target_type="page",
            impact_score=impact,
            workspace_id=workspace_id,
            metadata={"improvement_type": improvement_type}
        )
        
        await self._boost_confidence(skill_id, impact)
    
    async def track_decision_quality(
        self,
        skill_id: str,
        decision_id: str,
        workspace_id: str,
        was_reversed: bool
    ):
        """Track if decisions influenced by skill were good"""
        if was_reversed:
            # Bad decision - skill gave bad advice
            impact = -0.15
        else:
            # Good decision - skill helped
            impact = 0.10
        
        await self._record_contribution(
            skill_id=skill_id,
            contribution_type="decision_quality",
            target_id=decision_id,
            target_type="decision",
            impact_score=impact,
            workspace_id=workspace_id,
            metadata={"reversed": was_reversed}
        )
        
        await self._boost_confidence(skill_id, impact)
    
    async def track_problem_prevented(
        self,
        skill_id: str,
        problem_type: str,
        workspace_id: str
    ):
        """Skill prevented a recurring problem"""
        await self._record_contribution(
            skill_id=skill_id,
            contribution_type="problem_prevented",
            target_id=problem_type,
            target_type="pattern",
            impact_score=0.20,  # Big boost for prevention
            workspace_id=workspace_id,
            metadata={"problem_type": problem_type}
        )
        
        await self._boost_confidence(skill_id, 0.20)
    
    async def calculate_real_progress(self, skill_id: str) -> Dict:
        """
        Calculate REAL progress based on actual contributions.
        This is what determines if skill can evolve to next level.
        """
        try:
            # Get skill data
            skill = supabase_admin.table("skills")\
                .select("*")\
                .eq("id", skill_id)\
                .single()\
                .execute()
            
            if not skill.data:
                return {"progress": 0, "can_evolve": False}
            
            skill_data = skill.data
            current_level = skill_data.get("level", "Beginner")
            
            # Get all contributions in last 90 days
            ninety_days_ago = (datetime.utcnow() - timedelta(days=90)).isoformat()
            
            contributions = supabase_admin.table("skill_contributions")\
                .select("*")\
                .eq("skill_id", skill_id)\
                .gte("created_at", ninety_days_ago)\
                .execute()
            
            # Count linked pages from skill_evidence table
            evidence = supabase_admin.table("skill_evidence")\
                .select("page_id")\
                .eq("skill_id", skill_id)\
                .execute()
            
            pages_linked = len(set(e.get("page_id") for e in evidence.data if e.get("page_id"))) if evidence.data else 0
            
            if not contributions.data:
                return {
                    "progress": 0,
                    "can_evolve": False,
                    "reason": "No contributions yet",
                    "pages_linked": pages_linked,
                    "total_impact": 0,
                    "contribution_count": 0
                }
            
            # Calculate progress from REAL contributions
            total_impact = sum(c.get("impact_score", 0) for c in contributions.data)
            
            # Count different types of contributions
            contribution_types = {}
            for c in contributions.data:
                ctype = c.get("contribution_type", "unknown")
                contribution_types[ctype] = contribution_types.get(ctype, 0) + 1
            
            # Level-specific requirements
            level_requirements = {
                "Beginner": {
                    "min_impact": 0.5,  # Need 0.5 total impact
                    "min_contributions": 5,  # At least 5 contributions
                    "min_types": 2  # At least 2 different types
                },
                "Intermediate": {
                    "min_impact": 1.5,
                    "min_contributions": 15,
                    "min_types": 3
                },
                "Advanced": {
                    "min_impact": 3.0,
                    "min_contributions": 30,
                    "min_types": 4
                },
                "Expert": {
                    "min_impact": 5.0,
                    "min_contributions": 50,
                    "min_types": 5
                }
            }
            
            requirements = level_requirements.get(current_level, level_requirements["Beginner"])
            
            # Calculate progress percentage
            impact_progress = min(100, (total_impact / requirements["min_impact"]) * 100)
            count_progress = min(100, (len(contributions.data) / requirements["min_contributions"]) * 100)
            type_progress = min(100, (len(contribution_types) / requirements["min_types"]) * 100)
            
            # Overall progress is average of all three
            overall_progress = (impact_progress + count_progress + type_progress) / 3
            
            # Can evolve if ALL requirements met
            can_evolve = (
                total_impact >= requirements["min_impact"] and
                len(contributions.data) >= requirements["min_contributions"] and
                len(contribution_types) >= requirements["min_types"]
            )
            
            return {
                "progress": round(overall_progress, 1),
                "can_evolve": can_evolve,
                "total_impact": round(total_impact, 2),
                "contribution_count": len(contributions.data),
                "contribution_types": len(contribution_types),
                "pages_linked": pages_linked,
                "requirements": requirements,
                "breakdown": {
                    "impact": round(impact_progress, 1),
                    "count": round(count_progress, 1),
                    "diversity": round(type_progress, 1)
                }
            }
            
        except Exception as e:
            print(f"Error calculating real progress: {e}")
            return {"progress": 0, "can_evolve": False, "error": str(e), "pages_linked": 0}
    
    async def _record_contribution(
        self,
        skill_id: str,
        contribution_type: str,
        target_id: str,
        target_type: str,
        impact_score: float,
        workspace_id: str,
        metadata: Dict
    ):
        """Record a contribution in the database"""
        try:
            import uuid
            supabase_admin.table("skill_contributions").insert({
                "id": str(uuid.uuid4()),
                "skill_id": skill_id,
                "workspace_id": workspace_id,
                "contribution_type": contribution_type,
                "target_id": target_id,
                "target_type": target_type,
                "impact_score": impact_score,
                "metadata": metadata,
                "created_at": datetime.utcnow().isoformat()
            }).execute()
        except Exception as e:
            print(f"Error recording contribution: {e}")
    
    async def _boost_confidence(self, skill_id: str, amount: float):
        """Boost (or reduce) skill confidence based on contribution"""
        try:
            # Get current confidence
            skill = supabase_admin.table("skills")\
                .select("confidence_score")\
                .eq("id", skill_id)\
                .single()\
                .execute()
            
            if not skill.data:
                return
            
            current = skill.data.get("confidence_score", 0)
            new_confidence = max(0, min(1, current + amount))
            
            # Update skill
            supabase_admin.table("skills").update({
                "confidence_score": new_confidence,
                "updated_at": datetime.utcnow().isoformat()
            }).eq("id", skill_id).execute()
            
        except Exception as e:
            print(f"Error boosting confidence: {e}")


# Global instance
contribution_tracker = SkillContributionTracker()
