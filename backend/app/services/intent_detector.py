"""
Intent Detector Service for Ask Anything
Intelligently detects user intent and extracts what they want to create/modify
"""
import re
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass
from enum import Enum
import logging

logger = logging.getLogger(__name__)


class IntentType(Enum):
    """Types of user intents"""
    ASK = "ask"           # Question/explanation
    CREATE = "create"     # Create new content
    UPDATE = "update"     # Modify existing content
    DELETE = "delete"     # Remove content
    PLAN = "plan"         # Create a plan with tasks
    SEARCH = "search"     # Search for information
    NAVIGATE = "navigate" # Navigate to existing content


class ContentType(Enum):
    """Types of content that can be created/modified"""
    PAGE = "page"
    SUBPAGE = "subpage"
    SKILL = "skill"
    TASK = "task"
    QUIZ = "quiz"
    FLASHCARD = "flashcard"
    COURSE = "course"
    BLOCK = "block"  # Add blocks to existing page
    ALL = "all"  # Create everything related


@dataclass
class DetectedIntent:
    """Structured intent detection result"""
    intent_type: IntentType
    content_types: List[ContentType]
    topic: str
    parent_reference: Optional[str] = None  # For subpages
    mentioned_items: List[Dict[str, str]] = None
    confidence: float = 0.0
    is_specific: bool = False  # User was specific about what to create
    raw_query: str = ""
    
    def __post_init__(self):
        if self.mentioned_items is None:
            self.mentioned_items = []


class IntentDetector:
    """
    Intelligent intent detection for Ask Anything
    Understands what user wants to create/modify based on their query
    """
    
    # Keywords for intent detection
    CREATE_KEYWORDS = [
        "create", "make", "add", "generate", "build", "new", "write",
        "produce", "develop", "construct", "establish", "set up"
    ]
    
    UPDATE_KEYWORDS = [
        "update", "modify", "change", "edit", "revise", "improve",
        "enhance", "fix", "correct", "adjust", "refine", "add to"
    ]
    
    DELETE_KEYWORDS = [
        "delete", "remove", "clear", "erase", "drop", "destroy",
        "eliminate", "get rid of", "discard"
    ]
    
    PLAN_KEYWORDS = [
        "plan", "schedule", "roadmap", "timeline", "strategy",
        "outline", "organize", "structure", "prepare"
    ]
    
    ASK_KEYWORDS = [
        "what", "how", "why", "when", "where", "who", "which",
        "explain", "tell me", "describe", "define", "clarify",
        "help me understand", "can you", "could you", "is", "are",
        "does", "do", "should", "would", "will"
    ]
    
    # Content type detection patterns
    CONTENT_PATTERNS = {
        ContentType.PAGE: [
            r"\bpage\b", r"\bdocument\b", r"\barticle\b", r"\bnote\b",
            r"\bcontent\b", r"\bwrite about\b", r"\babout\b"
        ],
        ContentType.SUBPAGE: [
            r"\bsub[-\s]?page\b", r"\bchild page\b", r"\bsection\b",
            r"\bchapter\b", r"\bpart\b", r"\bunder\b", r"\binside\b",
            r"\bwithin\b", r"\bfor (?:the )?page\b"
        ],
        ContentType.SKILL: [
            r"\bskill\b", r"\bability\b", r"\bcompetency\b",
            r"\bexpertise\b", r"\bproficiency\b", r"\btrack\b",
            r"\bskill from (?:this|the) page\b", r"\bskill for (?:this|the) page\b",
            r"\brelated skill\b", r"\bcreate skill\b"
        ],
        ContentType.TASK: [
            r"\btask\b", r"\btodo\b", r"\bto[-\s]?do\b", r"\breminder\b",
            r"\baction item\b", r"\bto complete\b", r"\bassignment\b",
            r"\btask from (?:this|the) page\b", r"\btask for (?:this|the) page\b",
            r"\brelated task\b", r"\bcreate task\b"
        ],
        ContentType.QUIZ: [
            r"\bquiz\b", r"\btest\b", r"\bquestion\b", r"\bassessment\b",
            r"\bexam\b", r"\bevaluation\b"
        ],
        ContentType.FLASHCARD: [
            r"\bflashcard\b", r"\bflash card\b", r"\bcard\b",
            r"\bmemorize\b", r"\breview card\b", r"\bdeck\b"
        ],
        ContentType.COURSE: [
            r"\bcourse\b", r"\bcurriculum\b", r"\bsyllabus\b",
            r"\bmodule\b", r"\blesson\b", r"\btraining\b", r"\btutorial\b"
        ],
        ContentType.BLOCK: [
            r"\bblock\b", r"\badd (?:a )?(?:text|heading|list|table|code|image|quote)\b",
            r"\binsert\b", r"\bappend\b", r"\badd to (?:this|current|the) page\b",
            r"\bgenerate (?:content|text|table|list|code)\b",
            r"\bwrite (?:here|this|content)\b", r"\badd content\b",
            r"\bcreate (?:a )?(?:table|list|code block|heading)\b"
        ]
    }
    
    # Parent reference patterns (for subpages)
    PARENT_PATTERNS = [
        r"(?:for|under|in|inside|within|to)\s+(?:the\s+)?(?:page\s+)?['\"]?([^'\"]+?)['\"]?\s*(?:page)?",
        r"(?:add|create)\s+(?:a\s+)?(?:sub[-\s]?page|section|chapter)\s+(?:to|for|in)\s+['\"]?([^'\"]+?)['\"]?",
        r"@page:?\s*([^\s@]+)",
        r"@([^\s@]+)\s+page"
    ]
    
    def __init__(self):
        self.learning_patterns = {}  # Store learned patterns from user interactions
    
    def detect_intent(
        self, 
        query: str, 
        mode: str = "ask",
        mentioned_items: List[Dict[str, str]] = None,
        workspace_context: Dict[str, Any] = None
    ) -> DetectedIntent:
        """
        Detect user intent from query
        
        Args:
            query: User's input query
            mode: Current mode (ask/build/plan)
            mentioned_items: Items mentioned with @ syntax
            workspace_context: Current workspace data
            
        Returns:
            DetectedIntent with detected intent type and content types
        """
        query_lower = query.lower().strip()
        mentioned_items = mentioned_items or []
        workspace_context = workspace_context or {}
        
        # Detect intent type
        intent_type = self._detect_intent_type(query_lower, mode)
        
        # Detect content types to create
        content_types, is_specific = self._detect_content_types(query_lower, intent_type)
        
        # Extract topic
        topic = self._extract_topic(query, content_types)
        
        # Detect parent reference for subpages
        parent_reference = self._detect_parent_reference(query, mentioned_items, workspace_context)
        
        # Calculate confidence
        confidence = self._calculate_confidence(query_lower, intent_type, content_types, is_specific)
        
        # If user mentioned a page and wants to create something, likely a subpage
        if parent_reference and ContentType.PAGE in content_types and intent_type == IntentType.CREATE:
            if ContentType.SUBPAGE not in content_types:
                content_types.append(ContentType.SUBPAGE)
        
        intent = DetectedIntent(
            intent_type=intent_type,
            content_types=content_types,
            topic=topic,
            parent_reference=parent_reference,
            mentioned_items=mentioned_items,
            confidence=confidence,
            is_specific=is_specific,
            raw_query=query
        )
        
        logger.info(f"🎯 Detected intent: {intent_type.value}, content: {[c.value for c in content_types]}, "
                   f"topic: {topic}, parent: {parent_reference}, confidence: {confidence:.2f}, specific: {is_specific}")
        
        return intent
    
    def _detect_intent_type(self, query_lower: str, mode: str) -> IntentType:
        """Detect the primary intent type"""
        
        # Check for explicit action keywords
        for keyword in self.DELETE_KEYWORDS:
            if keyword in query_lower:
                return IntentType.DELETE
        
        for keyword in self.UPDATE_KEYWORDS:
            if keyword in query_lower:
                return IntentType.UPDATE
        
        for keyword in self.CREATE_KEYWORDS:
            if keyword in query_lower:
                return IntentType.CREATE
        
        for keyword in self.PLAN_KEYWORDS:
            if keyword in query_lower:
                return IntentType.PLAN
        
        # Check for question patterns
        for keyword in self.ASK_KEYWORDS:
            if query_lower.startswith(keyword) or f" {keyword} " in f" {query_lower} ":
                return IntentType.ASK
        
        # Mode-based fallback
        if mode == "agent":
            return IntentType.CREATE
        elif mode == "plan":
            return IntentType.PLAN
        else:
            return IntentType.ASK
    
    def _detect_content_types(self, query_lower: str, intent_type: IntentType) -> Tuple[List[ContentType], bool]:
        """
        Detect what content types user wants to create
        Returns (content_types, is_specific)
        """
        detected_types = []
        is_specific = False
        
        # Check for block-specific patterns first (higher priority)
        # These indicate user wants to add content to current page, not create a new page
        block_indicators = [
            r"\badd (?:a |some |the )?(?:text|heading|list|table|code|image|quote|content)\b",
            r"\binsert\b", r"\bappend\b", r"\bgenerate (?:a |some )?(?:table|list|code|content)\b",
            r"\bwrite (?:a |some )?(?:table|list|code|paragraph|section)\b",
            r"\bcreate (?:a )?(?:table|list|code block|heading) (?:about|for|on)\b",
            r"\badd (?:this |it )?(?:to|here|below)\b",
            r"\bput (?:this |it )?(?:here|below|in)\b"
        ]
        
        for pattern in block_indicators:
            if re.search(pattern, query_lower):
                detected_types.append(ContentType.BLOCK)
                is_specific = True
                return detected_types, is_specific
        
        # Check each content type pattern
        for content_type, patterns in self.CONTENT_PATTERNS.items():
            for pattern in patterns:
                if re.search(pattern, query_lower):
                    if content_type not in detected_types:
                        detected_types.append(content_type)
                    is_specific = True
                    break
        
        # If no specific type detected but it's a CREATE intent
        if not detected_types and intent_type == IntentType.CREATE:
            # Default to page only - don't create everything
            detected_types = [ContentType.PAGE]
            is_specific = False
        
        # If user says "everything" or "all", create all types
        if any(word in query_lower for word in ["everything", "all related", "complete set"]):
            detected_types = [ContentType.PAGE, ContentType.SKILL, ContentType.TASK]
            is_specific = True
        
        return detected_types, is_specific
    
    def _extract_topic(self, query: str, content_types: List[ContentType]) -> str:
        """Extract the main topic from the query"""
        topic = query
        
        # Remove action words
        remove_words = (
            self.CREATE_KEYWORDS + self.UPDATE_KEYWORDS + 
            self.DELETE_KEYWORDS + self.PLAN_KEYWORDS +
            ["a", "an", "the", "about", "on", "for", "with", "please", "can you", "could you"]
        )
        
        # Remove content type words
        for content_type in ContentType:
            remove_words.append(content_type.value)
            remove_words.append(content_type.value + "s")  # plural
        
        topic_lower = topic.lower()
        for word in remove_words:
            topic_lower = re.sub(rf'\b{re.escape(word)}\b', ' ', topic_lower)
        
        # Clean up
        topic = ' '.join(topic_lower.split()).strip()
        
        # Capitalize properly
        if topic:
            topic = topic.title()
        
        return topic[:100] if topic else "New Content"
    
    def _detect_parent_reference(
        self, 
        query: str, 
        mentioned_items: List[Dict[str, str]],
        workspace_context: Dict[str, Any]
    ) -> Optional[str]:
        """Detect if user is referencing a parent page for subpage creation"""
        
        # Check mentioned items first
        for item in mentioned_items:
            if item.get("type") == "page":
                return item.get("name") or item.get("id")
        
        # Check query patterns
        query_lower = query.lower()
        for pattern in self.PARENT_PATTERNS:
            match = re.search(pattern, query_lower)
            if match:
                parent_name = match.group(1).strip()
                # Verify it exists in workspace
                pages = workspace_context.get("pages", [])
                for page in pages:
                    if parent_name.lower() in page.get("title", "").lower():
                        return page.get("title")
                return parent_name
        
        return None
    
    def _calculate_confidence(
        self, 
        query_lower: str, 
        intent_type: IntentType,
        content_types: List[ContentType],
        is_specific: bool
    ) -> float:
        """Calculate confidence score for the detected intent"""
        confidence = 0.5  # Base confidence
        
        # Higher confidence if user was specific
        if is_specific:
            confidence += 0.3
        
        # Higher confidence for explicit action words
        if intent_type == IntentType.CREATE:
            if any(word in query_lower for word in ["create", "make", "generate"]):
                confidence += 0.15
        elif intent_type == IntentType.ASK:
            if any(word in query_lower for word in ["what", "how", "explain"]):
                confidence += 0.15
        
        # Higher confidence if content type is clear
        if len(content_types) == 1:
            confidence += 0.1
        
        return min(confidence, 1.0)
    
    def learn_from_feedback(self, query: str, intent: DetectedIntent, was_correct: bool):
        """
        Learn from user feedback to improve future detection
        
        Args:
            query: Original query
            intent: Detected intent
            was_correct: Whether the detection was correct
        """
        # Extract key patterns from query
        query_lower = query.lower()
        words = query_lower.split()
        
        # Store pattern with feedback
        pattern_key = " ".join(words[:3]) if len(words) >= 3 else query_lower
        
        if pattern_key not in self.learning_patterns:
            self.learning_patterns[pattern_key] = {
                "correct": 0,
                "incorrect": 0,
                "intent_type": intent.intent_type.value,
                "content_types": [c.value for c in intent.content_types]
            }
        
        if was_correct:
            self.learning_patterns[pattern_key]["correct"] += 1
        else:
            self.learning_patterns[pattern_key]["incorrect"] += 1
        
        logger.info(f"📚 Learned from feedback: {pattern_key} -> {was_correct}")


# Singleton instance
intent_detector = IntentDetector()
