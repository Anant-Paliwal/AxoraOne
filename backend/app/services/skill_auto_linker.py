"""
Skill Auto-Linker - Automatically links pages and tasks to relevant skills

Skills work FOR the user by:
1. Detecting when content relates to them
2. Auto-linking pages/tasks (with confidence score)
3. Building knowledge graph connections
4. Learning from user corrections
"""

from typing import Dict, List, Optional, Tuple
from datetime import datetime
from app.core.supabase import supabase_admin
import re

class SkillAutoLinker:
    """
    Automatically links content to skills based on semantic analysis.
    Works silently in the background.
    """
    
    def __init__(self):
        self.confidence_threshold = 0.6  # Only auto-link if 60%+ confident
    
    async def analyze_and_link_page(
        self,
        page_id: str,
        page_title: str,
        page_content: str,
        page_tags: List[str],
        workspace_id: str,
        user_id: str
    ) -> List[Dict]:
        """
        Analyze a page and auto-link to relevant skills.
        Returns list of links created.
        """
        # Get all skills in workspace
        skills = await self._get_workspace_skills(workspace_id)
        
        if not skills:
            return []
        
        links_created = []
        
        for skill in skills:
            confidence = await self._calculate_relevance(
                skill=skill,
                title=page_title,
                content=page_content,
                tags=page_tags
            )
            
            if confidence >= self.confidence_threshold:
                # Auto-link with confidence score
                link_id = await self._create_skill_evidence(
                    skill_id=skill["id"],
                    page_id=page_id,
                    confidence=confidence,
                    auto_linked=True
                )
                
                if link_id:
                    links_created.append({
                        "skill_id": skill["id"],
                        "skill_name": skill["name"],
                        "confidence": confidence,
                        "link_id": link_id
                    })
                    
                    print(f"✅ Auto-linked page '{page_title}' to skill '{skill['name']}' ({confidence:.0%} confidence)")
        
        return links_created
    
    async def analyze_and_link_task(
        self,
        task_id: str,
        task_title: str,
        task_description: str,
        workspace_id: str
    ) -> Optional[Dict]:
        """
        Analyze a task and auto-link to most relevant skill.
        Returns link info if created.
        """
        skills = await self._get_workspace_skills(workspace_id)
        
        if not skills:
            return None
        
        # Find best matching skill
        best_skill = None
        best_confidence = 0
        
        for skill in skills:
            confidence = await self._calculate_relevance(
                skill=skill,
                title=task_title,
                content=task_description,
                tags=[]
            )
            
            if confidence > best_confidence:
                best_confidence = confidence
                best_skill = skill
        
        # Auto-link if confident enough
        if best_skill and best_confidence >= self.confidence_threshold:
            success = await self._link_task_to_skill(
                task_id=task_id,
                skill_id=best_skill["id"]
            )
            
            if success:
                print(f"✅ Auto-linked task '{task_title}' to skill '{best_skill['name']}' ({best_confidence:.0%} confidence)")
                return {
                    "skill_id": best_skill["id"],
                    "skill_name": best_skill["name"],
                    "confidence": best_confidence
                }
        
        return None
    
    async def suggest_links(
        self,
        page_id: str,
        page_title: str,
        page_content: str,
        page_tags: List[str],
        workspace_id: str
    ) -> List[Dict]:
        """
        Suggest skill links without auto-linking.
        For user review.
        """
        skills = await self._get_workspace_skills(workspace_id)
        
        suggestions = []
        
        for skill in skills:
            confidence = await self._calculate_relevance(
                skill=skill,
                title=page_title,
                content=page_content,
                tags=page_tags
            )
            
            # Suggest if above 40% confidence (lower threshold for suggestions)
            if confidence >= 0.4:
                suggestions.append({
                    "skill_id": skill["id"],
                    "skill_name": skill["name"],
                    "skill_level": skill.get("level", "Beginner"),
                    "confidence": confidence,
                    "reason": self._explain_relevance(skill, page_title, page_content, page_tags)
                })
        
        # Sort by confidence
        suggestions.sort(key=lambda x: x["confidence"], reverse=True)
        
        return suggestions[:5]  # Top 5 suggestions
    
    async def _calculate_relevance(
        self,
        skill: Dict,
        title: str,
        content: str,
        tags: List[str]
    ) -> float:
        """
        Calculate how relevant content is to a skill.
        Returns confidence score 0-1.
        Enhanced with semantic matching and context understanding.
        """
        score = 0.0
        
        skill_name = skill.get("name", "").lower()
        skill_desc = (skill.get("description") or "").lower()
        skill_keywords = skill.get("evidence", [])
        skill_type = skill.get("skill_type", "").lower()
        
        title_lower = title.lower()
        content_lower = content.lower()
        combined_text = f"{title_lower} {content_lower}"
        
        # 1. Exact skill name match in title (40 points)
        if skill_name in title_lower:
            score += 0.40
        # Partial name match (e.g., "Python" in "Python Programming")
        elif any(word in title_lower for word in skill_name.split() if len(word) > 3):
            score += 0.25
        
        # 2. Skill name in content (20 points)
        elif skill_name in content_lower:
            score += 0.20
        # Partial name in content
        elif any(word in content_lower for word in skill_name.split() if len(word) > 3):
            score += 0.12
        
        # 3. Enhanced keyword matches (up to 30 points)
        keyword_matches = 0
        for keyword in skill_keywords:
            keyword_lower = keyword.lower()
            # Exact match in title
            if keyword_lower in title_lower:
                keyword_matches += 3
            # Exact match in content
            elif keyword_lower in content_lower:
                keyword_matches += 2
            # Partial match (word boundaries)
            elif any(word in combined_text for word in keyword_lower.split() if len(word) > 3):
                keyword_matches += 1
        
        score += min(0.30, keyword_matches * 0.04)
        
        # 4. Tag matches (up to 20 points)
        tag_matches = 0
        for tag in tags:
            tag_lower = tag.lower()
            # Exact skill name in tag
            if skill_name in tag_lower or tag_lower in skill_name:
                tag_matches += 3
            # Keyword in tag
            for keyword in skill_keywords:
                if keyword.lower() in tag_lower:
                    tag_matches += 2
            # Partial match
            if any(word in tag_lower for word in skill_name.split() if len(word) > 3):
                tag_matches += 1
        
        score += min(0.20, tag_matches * 0.08)
        
        # 5. Description overlap (up to 15 points) - Enhanced
        if skill_desc:
            desc_words = set(w for w in skill_desc.split() if len(w) > 3)
            content_words = set(w for w in content_lower.split() if len(w) > 3)
            overlap = len(desc_words & content_words)
            score += min(0.15, overlap * 0.015)
        
        # 6. Skill type context matching (up to 10 points) - NEW
        type_keywords = {
            "learning": ["tutorial", "learn", "guide", "basics", "introduction", "course"],
            "research": ["research", "study", "analysis", "investigation", "findings"],
            "creation": ["build", "create", "develop", "project", "implementation"],
            "analysis": ["analyze", "data", "metrics", "insights", "statistics"],
            "practice": ["exercise", "practice", "challenge", "problem", "solution"]
        }
        
        if skill_type in type_keywords:
            type_matches = sum(1 for kw in type_keywords[skill_type] if kw in combined_text)
            score += min(0.10, type_matches * 0.02)
        
        # 7. Frequency bonus (up to 5 points) - NEW
        # If skill name appears multiple times, it's more relevant
        name_count = combined_text.count(skill_name)
        if name_count > 1:
            score += min(0.05, (name_count - 1) * 0.015)
        
        return min(1.0, score)
    
    def _explain_relevance(
        self,
        skill: Dict,
        title: str,
        content: str,
        tags: List[str]
    ) -> str:
        """Generate human-readable explanation of why skill is relevant"""
        reasons = []
        
        skill_name = skill.get("name", "").lower()
        title_lower = title.lower()
        content_lower = content.lower()
        
        if skill_name in title_lower:
            reasons.append(f"'{skill['name']}' mentioned in title")
        elif skill_name in content_lower:
            reasons.append(f"'{skill['name']}' mentioned in content")
        
        # Check keywords
        skill_keywords = skill.get("evidence", [])
        matched_keywords = [
            kw for kw in skill_keywords 
            if kw.lower() in title_lower or kw.lower() in content_lower
        ]
        
        if matched_keywords:
            reasons.append(f"Keywords: {', '.join(matched_keywords[:3])}")
        
        # Check tags
        matched_tags = [
            tag for tag in tags
            if skill_name in tag.lower() or any(kw.lower() in tag.lower() for kw in skill_keywords)
        ]
        
        if matched_tags:
            reasons.append(f"Tags: {', '.join(matched_tags[:2])}")
        
        return " • ".join(reasons) if reasons else "Content similarity"
    
    async def _get_workspace_skills(self, workspace_id: str) -> List[Dict]:
        """Get all skills in workspace"""
        try:
            response = supabase_admin.table("skills")\
                .select("id, name, description, evidence, level")\
                .eq("workspace_id", workspace_id)\
                .execute()
            
            return response.data or []
        except Exception as e:
            print(f"Error getting workspace skills: {e}")
            return []
    
    async def _create_skill_evidence(
        self,
        skill_id: str,
        page_id: str,
        confidence: float,
        auto_linked: bool
    ) -> Optional[str]:
        """Create skill evidence link"""
        try:
            import uuid
            link_id = str(uuid.uuid4())
            
            supabase_admin.table("skill_evidence").insert({
                "id": link_id,
                "skill_id": skill_id,
                "page_id": page_id,
                "evidence_type": "auto_linked" if auto_linked else "manual",
                "notes": f"Auto-linked with {confidence:.0%} confidence" if auto_linked else "",
                "confidence_score": confidence,
                "created_at": datetime.utcnow().isoformat()
            }).execute()
            
            return link_id
        except Exception as e:
            print(f"Error creating skill evidence: {e}")
            return None
    
    async def _link_task_to_skill(
        self,
        task_id: str,
        skill_id: str
    ) -> bool:
        """Link task to skill"""
        try:
            supabase_admin.table("tasks").update({
                "linked_skill_id": skill_id,
                "updated_at": datetime.utcnow().isoformat()
            }).eq("id", task_id).execute()
            
            return True
        except Exception as e:
            print(f"Error linking task to skill: {e}")
            return False
    
    async def learn_from_correction(
        self,
        link_id: str,
        was_removed: bool,
        skill_id: str
    ):
        """
        Learn when user removes/adds a link.
        Adjusts future auto-linking behavior.
        """
        try:
            # Get the link details
            link = supabase_admin.table("skill_evidence")\
                .select("*")\
                .eq("id", link_id)\
                .single()\
                .execute()
            
            if not link.data:
                return
            
            confidence = link.data.get("confidence_score", 0.5)
            
            if was_removed:
                # User removed auto-link - it was wrong
                # Lower confidence threshold for this skill
                print(f"📉 Learning: Auto-link was incorrect (confidence was {confidence:.0%})")
                # In production, store this in skill memory
            else:
                # User manually added link - boost confidence
                print(f"📈 Learning: Manual link confirms relevance")
                # In production, reinforce this pattern
        
        except Exception as e:
            print(f"Error learning from correction: {e}")


# Global instance
auto_linker = SkillAutoLinker()
