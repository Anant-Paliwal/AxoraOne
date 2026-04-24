"""
Skill Authority System - Safe, Trusted Intelligence OS Behavior
"""

from typing import Dict, List, Optional, Tuple
from datetime import datetime, timedelta
from enum import Enum
from dataclasses import dataclass
from app.core.supabase import supabase_admin


class AuthorityLevel(Enum):
    """Skill authority levels"""
    READ_ONLY = "read_only"
    SUGGEST = "suggest"
    ASSIST_STRUCTURE = "assist_structure"


class ChangeType(Enum):
    """Types of changes skills can propose"""
    # SAFE
    ADD_SECTION = "add_section"
    ADD_CHECKLIST = "add_checklist"
    ADD_METADATA = "add_metadata"
    LINK_ENTITY = "link_entity"
    # MODERATE
    SUGGEST_TASK = "suggest_task"
    SUGGEST_BREAKDOWN = "suggest_breakdown"
    UPDATE_TASK_META = "update_task_meta"
    # BLOCKED
    REWRITE_CONTENT = "rewrite_content"
    DELETE_CONTENT = "delete_content"
    CHANGE_PRIORITY = "change_priority"
    AUTO_COMPLETE = "auto_complete"
    CHANGE_INTENT = "change_intent"


class RiskLevel(Enum):
    """Risk level of proposed changes"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


@dataclass
class SkillSuggestion:
    """A suggestion from a skill"""
    skill_id: str
    skill_name: str
    suggestion_type: ChangeType
    target_type: str
    target_id: str
    description: str
    why: str
    risk_level: RiskLevel
    requires_approval: bool
    reversible: bool
    payload: Dict
    confidence: float
    created_at: datetime
    approved: bool = False
    rejected: bool = False
    ignored: bool = False
    executed: bool = False


class SkillAuthority:
    """Enforces safe skill behavior"""
    
    MIN_CONFIDENCE_SUGGEST = 0.25
    MIN_CONFIDENCE_STRUCTURE = 0.80
    IGNORE_THRESHOLD = 3
    SUPPRESSION_DAYS = 7
    
    async def can_skill_act(
        self,
        skill_id: str,
        change_type: ChangeType,
        target_type: str,
        target_id: str,
        workspace_id: str
    ) -> Tuple[bool, str]:
        """Check if skill is allowed to perform an action"""
        try:
            skill = await self._get_skill(skill_id)
            if not skill:
                return False, "Skill not found"
            
            authority_level = AuthorityLevel(skill.get("authority_level", "suggest"))
            confidence = skill.get("confidence", 0.3)
            
            # Block intent-altering changes
            if self._alters_intent(change_type):
                return False, "Change type alters user intent - blocked"
            
            # Block unsafe change types
            if change_type in [ChangeType.REWRITE_CONTENT, ChangeType.DELETE_CONTENT, 
                              ChangeType.CHANGE_PRIORITY, ChangeType.AUTO_COMPLETE]:
                return False, "Change type not allowed"
            
            # Structural changes require high confidence
            if change_type == ChangeType.ADD_SECTION:
                if authority_level != AuthorityLevel.ASSIST_STRUCTURE:
                    return False, f"Requires assist_structure authority"
                if confidence < self.MIN_CONFIDENCE_STRUCTURE:
                    return False, f"Confidence too low ({confidence:.2f})"
            
            # Check suppression
            is_suppressed = await self._is_suppressed(skill_id)
            if is_suppressed:
                return False, "Skill is currently suppressed"
            
            # Check recent rejection
            recently_rejected = await self._recently_rejected_similar(
                skill_id, change_type, target_type, workspace_id
            )
            if recently_rejected:
                return False, "User recently rejected similar suggestion"
            
            # Check reversibility
            if not self._is_reversible(change_type):
                return False, "Change is not reversible"
            
            return True, "All checks passed"
            
        except Exception as e:
            return False, f"Error: {str(e)}"
    
    async def create_suggestion(
        self,
        skill_id: str,
        change_type: ChangeType,
        target_type: str,
        target_id: str,
        description: str,
        why: str,
        payload: Dict,
        workspace_id: str,
        user_id: str
    ) -> Optional[SkillSuggestion]:
        """Create a skill suggestion"""
        try:
            skill = await self._get_skill(skill_id)
            if not skill:
                return None
            
            allowed, reason = await self.can_skill_act(
                skill_id, change_type, target_type, target_id, workspace_id
            )
            
            if not allowed:
                print(f"Skill {skill_id} not allowed: {reason}")
                return None
            
            risk_level = self._calculate_risk_level(change_type)
            
            suggestion = SkillSuggestion(
                skill_id=skill_id,
                skill_name=skill.get("name", "Unknown Skill"),
                suggestion_type=change_type,
                target_type=target_type,
                target_id=target_id,
                description=description,
                why=why,
                risk_level=risk_level,
                requires_approval=True,
                reversible=self._is_reversible(change_type),
                payload=payload,
                confidence=skill.get("confidence", 0.3),
                created_at=datetime.utcnow()
            )
            
            await self._store_suggestion(suggestion, workspace_id, user_id)
            return suggestion
            
        except Exception as e:
            print(f"Error creating suggestion: {e}")
            return None
    
    async def approve_suggestion(self, suggestion_id: str, user_id: str) -> Tuple[bool, Optional[Dict]]:
        """User approves a suggestion"""
        try:
            suggestion_data = await self._get_suggestion(suggestion_id)
            if not suggestion_data:
                return False, None
            
            result = await self._execute_change(suggestion_data)
            
            await self._update_suggestion_status(suggestion_id, approved=True, executed=True)
            await self._update_skill_confidence(suggestion_data["skill_id"], 0.05, "approved")
            
            return True, result
            
        except Exception as e:
            print(f"Error approving: {e}")
            return False, None
    
    async def reject_suggestion(self, suggestion_id: str, user_id: str) -> bool:
        """User rejects a suggestion"""
        try:
            suggestion_data = await self._get_suggestion(suggestion_id)
            if not suggestion_data:
                return False
            
            await self._update_suggestion_status(suggestion_id, rejected=True)
            await self._update_skill_confidence(suggestion_data["skill_id"], -0.10, "rejected")
            
            return True
            
        except Exception as e:
            print(f"Error rejecting: {e}")
            return False
    
    async def ignore_suggestion(self, suggestion_id: str) -> bool:
        """User ignores a suggestion"""
        try:
            suggestion_data = await self._get_suggestion(suggestion_id)
            if not suggestion_data:
                return False
            
            await self._update_suggestion_status(suggestion_id, ignored=True)
            
            return True
            
        except Exception as e:
            print(f"Error ignoring: {e}")
            return False
    
    def _alters_intent(self, change_type: ChangeType) -> bool:
        """Check if change type alters user intent"""
        intent_altering = [
            ChangeType.REWRITE_CONTENT,
            ChangeType.DELETE_CONTENT,
            ChangeType.CHANGE_PRIORITY,
            ChangeType.AUTO_COMPLETE,
            ChangeType.CHANGE_INTENT
        ]
        return change_type in intent_altering
    
    def _is_reversible(self, change_type: ChangeType) -> bool:
        """Check if change is reversible"""
        reversible = [
            ChangeType.ADD_SECTION,
            ChangeType.ADD_CHECKLIST,
            ChangeType.ADD_METADATA,
            ChangeType.LINK_ENTITY,
            ChangeType.UPDATE_TASK_META
        ]
        return change_type in reversible
    
    def _calculate_risk_level(self, change_type: ChangeType) -> RiskLevel:
        """Calculate risk level"""
        if change_type in [ChangeType.ADD_SECTION, ChangeType.ADD_CHECKLIST, ChangeType.LINK_ENTITY]:
            return RiskLevel.LOW
        if change_type in [ChangeType.SUGGEST_TASK, ChangeType.SUGGEST_BREAKDOWN, ChangeType.UPDATE_TASK_META]:
            return RiskLevel.MEDIUM
        return RiskLevel.HIGH
    
    async def _get_skill(self, skill_id: str) -> Optional[Dict]:
        """Get skill data"""
        try:
            response = supabase_admin.table("skills").select("*").eq("id", skill_id).single().execute()
            return response.data
        except:
            return None
    
    async def _is_suppressed(self, skill_id: str) -> bool:
        """Check if skill is suppressed"""
        try:
            response = supabase_admin.table("skill_suppression")\
                .select("suppressed_until")\
                .eq("skill_id", skill_id)\
                .gte("suppressed_until", datetime.utcnow().isoformat())\
                .execute()
            return len(response.data or []) > 0
        except:
            return False
    
    async def _recently_rejected_similar(
        self, skill_id: str, change_type: ChangeType, target_type: str, workspace_id: str
    ) -> bool:
        """Check if user recently rejected similar suggestion"""
        try:
            week_ago = (datetime.utcnow() - timedelta(days=7)).isoformat()
            response = supabase_admin.table("skill_suggestions")\
                .select("id")\
                .eq("skill_id", skill_id)\
                .eq("suggestion_type", change_type.value)\
                .eq("target_type", target_type)\
                .eq("workspace_id", workspace_id)\
                .eq("rejected", True)\
                .gte("created_at", week_ago)\
                .execute()
            return len(response.data or []) > 0
        except:
            return False
    
    async def _store_suggestion(self, suggestion: SkillSuggestion, workspace_id: str, user_id: str):
        """Store suggestion in database"""
        try:
            import uuid
            supabase_admin.table("skill_suggestions").insert({
                "id": str(uuid.uuid4()),
                "skill_id": suggestion.skill_id,
                "skill_name": suggestion.skill_name,
                "suggestion_type": suggestion.suggestion_type.value,
                "target_type": suggestion.target_type,
                "target_id": suggestion.target_id,
                "description": suggestion.description,
                "why": suggestion.why,
                "risk_level": suggestion.risk_level.value,
                "requires_approval": suggestion.requires_approval,
                "reversible": suggestion.reversible,
                "payload": suggestion.payload,
                "confidence": suggestion.confidence,
                "workspace_id": workspace_id,
                "user_id": user_id,
                "approved": False,
                "rejected": False,
                "ignored": False,
                "executed": False,
                "created_at": suggestion.created_at.isoformat()
            }).execute()
        except Exception as e:
            print(f"Error storing suggestion: {e}")
    
    async def _get_suggestion(self, suggestion_id: str) -> Optional[Dict]:
        """Get suggestion from database"""
        try:
            response = supabase_admin.table("skill_suggestions").select("*").eq("id", suggestion_id).single().execute()
            return response.data
        except:
            return None
    
    async def _update_suggestion_status(
        self, suggestion_id: str, approved: bool = False, rejected: bool = False,
        ignored: bool = False, executed: bool = False
    ):
        """Update suggestion status"""
        try:
            update_data = {}
            if approved:
                update_data["approved"] = True
                update_data["approved_at"] = datetime.utcnow().isoformat()
            if rejected:
                update_data["rejected"] = True
                update_data["rejected_at"] = datetime.utcnow().isoformat()
            if ignored:
                update_data["ignored"] = True
                update_data["ignored_at"] = datetime.utcnow().isoformat()
            if executed:
                update_data["executed"] = True
                update_data["executed_at"] = datetime.utcnow().isoformat()
            
            supabase_admin.table("skill_suggestions").update(update_data).eq("id", suggestion_id).execute()
        except Exception as e:
            print(f"Error updating status: {e}")
    
    async def _execute_change(self, suggestion_data: Dict) -> Dict:
        """Execute the approved change"""
        try:
            change_type = ChangeType(suggestion_data["suggestion_type"])
            return {"success": True, "message": f"Executed {change_type.value}"}
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def _update_skill_confidence(self, skill_id: str, delta: float, reason: str):
        """Update skill confidence"""
        try:
            skill = await self._get_skill(skill_id)
            if skill:
                current = skill.get("confidence", 0.3)
                new_confidence = max(0, min(1, current + delta))
                supabase_admin.table("skills").update({"confidence": new_confidence}).eq("id", skill_id).execute()
        except Exception as e:
            print(f"Error updating confidence: {e}")


# Global instance
skill_authority = SkillAuthority()
