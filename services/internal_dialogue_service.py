"""
Internal Dialogue Service for PTSD Therapy Application
Validates and analyzes internal dialogue patterns in therapeutic stories
"""

import logging

from typing import Dict, Any, List, Optional, Union, Tuple
from dataclasses import dataclass
from enum import Enum

# Setup logging
logger = logging.getLogger(__name__)

class DialogueQuality(Enum):
    """Enum for dialogue quality levels"""
    EXCELLENT = "excellent"
    GOOD = "good"
    FAIR = "fair"
    POOR = "poor"
    ABSENT = "absent"

class DialogueType(Enum):
    """Enum for types of internal dialogue"""
    SELF_REFLECTION = "self_reflection"
    EMOTIONAL_PROCESSING = "emotional_processing"
    COGNITIVE_RESTRUCTURING = "cognitive_restructuring"
    COPING_STRATEGIES = "coping_strategies"
    FUTURE_PLANNING = "future_planning"

@dataclass
class DialogueAnalysis:
    """Data class for internal dialogue analysis results"""
    quality: DialogueQuality
    score: float  # 0.0 to 1.0
    detected_patterns: List[str]
    dialogue_types: Dict[DialogueType, int]
    emotional_depth: int
    cognitive_complexity: int
    feedback_message: str
    suggestions: List[str]

class InternalDialogueValidationError(Exception):
    """Custom exception for internal dialogue validation errors"""
    pass

class InternalDialogueService:
    """
    Service to validate and analyze internal dialogue patterns in therapeutic stories.
    
    Internal dialogue is crucial for therapeutic narrative as it helps patients:
    - Process emotions and thoughts
    - Develop self-awareness
    - Practice cognitive restructuring
    - Build coping strategies
    
    Usage:
        service = InternalDialogueService()
        analysis = service.validate_internal_dialogue(story_text)
        print(analysis.feedback_message)
    """
    
    def __init__(self):
        """Initialize the internal dialogue service with pattern analysis"""
        self.logger = logger
        
        # Hebrew patterns for different types of internal dialogue
        self.dialogue_patterns = {
            DialogueType.SELF_REFLECTION: {
                "keywords": [
                    "אני חושב", "חשבתי", "אני מרגיש", "הרגשתי", "אני מבין", "הבנתי",
                    "אני זוכר", "זכרתי", "אני שואל את עצמי", "שאלתי את עצמי",
                    "אני תוהה", "תהיתי", "אני מודע", "הייתי מודע"
                ],
                "weight": 1.0
            },
            DialogueType.EMOTIONAL_PROCESSING: {
                "keywords": [
                    "אני עצוב", "אני כועס", "אני פוחד", "אני חרד", "אני שמח",
                    "הרגשתי כעס", "הרגשתי פחד", "הרגשתי עצב", "הרגשתי תקווה",
                    "זה מכאיב", "זה מפחיד", "זה מרגיע", "זה מעודד"
                ],
                "weight": 0.9
            },
            DialogueType.COGNITIVE_RESTRUCTURING: {
                "keywords": [
                    "אולי זה לא נכון", "אני יכול לחשוב אחרת", "יש דרך אחרת לראות את זה",
                    "זה לא הגיוני", "אני מגזים", "זה לא כל כך נורא",
                    "אני יכול להתמודד", "זה יעבור", "אני חזק יותר"
                ],
                "weight": 1.2
            },
            DialogueType.COPING_STRATEGIES: {
                "keywords": [
                    "אני אנשום עמוק", "אני אתרגע", "אני אקח הפסקה", "אני אדבר עם מישהו",
                    "אני אזכור שזה זמני", "אני אתמקד בחיובי", "אני אשתמש בכלים שלי",
                    "אני יכול לעשות את זה", "אני אמצא פתרון"
                ],
                "weight": 1.1
            },
            DialogueType.FUTURE_PLANNING: {
                "keywords": [
                    "בפעם הבאה אני", "אני אשתדל", "אני מתכנן", "אני רוצה ללמוד",
                    "אני אכין עצמי", "אני אהיה מוכן", "אני אשפר", "אני אצמח"
                ],
                "weight": 0.8
            }
        }
        
        # Markers for dialogue depth and complexity
        self.depth_indicators = [
            "למה", "איך", "מה אם", "בגלל מה", "מה המשמעות", "מה זה אומר",
            "איך זה קשור", "מה זה מלמד אותי", "איך אני יכול"
        ]
        
        self.complexity_indicators = [
            "מצד אחד", "מצד שני", "אבל", "אולם", "עם זאת", "בכל זאת",
            "למרות זאת", "יחד עם זאת", "בנוסף", "בניגוד"
        ]
        
        # Emotional intensity markers
        self.emotional_intensity = {
            "high": ["מאוד", "נורא", "בטירוף", "לא ייאמן", "בלתי נסבל", "קיצוני"],
            "medium": ["די", "למדי", "קצת", "מעט", "במידה מסוימת"],
            "low": ["קלות", "בקושי", "כמעט לא", "בקושי"]
        }
        
        self.logger.info("InternalDialogueService initialized")

    def validate_internal_dialogue(self, story_text: str) -> DialogueAnalysis:
        """
        Validate and analyze internal dialogue patterns in a therapeutic story.
        
        Args:
            story_text: The story text to analyze
            
        Returns:
            DialogueAnalysis object with detailed analysis results
            
        Raises:
            InternalDialogueValidationError: If validation fails
        """
        try:
            # Input validation
            self._validate_input(story_text)
            
            # Analyze dialogue patterns
            score, detected_patterns = self._calculate_dialogue_score(story_text)
            dialogue_types = self._analyze_dialogue_types(story_text)
            emotional_depth = self._assess_emotional_depth(story_text)
            cognitive_complexity = self._assess_cognitive_complexity(story_text)
            quality = self._determine_dialogue_quality(score, emotional_depth, cognitive_complexity)
            
            # Generate feedback and suggestions
            feedback_message = self._generate_feedback_message(quality, score, dialogue_types)
            suggestions = self._generate_suggestions(quality, dialogue_types, emotional_depth, cognitive_complexity)
            
            analysis = DialogueAnalysis(
                quality=quality,
                score=score,
                detected_patterns=detected_patterns,
                dialogue_types=dialogue_types,
                emotional_depth=emotional_depth,
                cognitive_complexity=cognitive_complexity,
                feedback_message=feedback_message,
                suggestions=suggestions
            )
            
            self.logger.info(f"Internal dialogue analysis completed: {quality.value} quality, score: {score:.2f}")
            return analysis
            
        except Exception as e:
            self.logger.error(f"Internal dialogue validation failed: {e}")
            raise InternalDialogueValidationError(f"Failed to validate internal dialogue: {e}")

    def _validate_input(self, story_text: Union[str, None]) -> None:
        """Validate input parameters"""
        if not story_text:
            raise InternalDialogueValidationError("Story text cannot be empty or None")
        
        if not isinstance(story_text, str):
            raise InternalDialogueValidationError(f"Story text must be a string, got {type(story_text).__name__}")
        
        if len(story_text.strip()) < 10:
            raise InternalDialogueValidationError("Story text too short for meaningful analysis")
        
        if len(story_text) > 15000:
            raise InternalDialogueValidationError("Story text too long for processing")

    def _calculate_dialogue_score(self, story_text: str) -> Tuple[float, List[str]]:
        """Calculate internal dialogue score based on pattern detection"""
        story_lower = story_text.lower()
        total_score = 0.0
        detected_patterns = []
        
        for dialogue_type, data in self.dialogue_patterns.items():
            keywords = data["keywords"]
            weight = data["weight"]
            
            for keyword in keywords:
                if keyword in story_lower:
                    total_score += weight
                    detected_patterns.append(keyword)
                    self.logger.debug(f"Found dialogue pattern '{keyword}' of type '{dialogue_type.value}'")
        
        # Normalize score to 0-1 range
        max_possible_score = sum(data["weight"] * len(data["keywords"]) for data in self.dialogue_patterns.values())
        normalized_score = min(max(total_score / max_possible_score, 0.0), 1.0)
        
        return normalized_score, detected_patterns

    def _analyze_dialogue_types(self, story_text: str) -> Dict[DialogueType, int]:
        """Analyze which types of internal dialogue are present"""
        story_lower = story_text.lower()
        dialogue_counts = {}
        
        for dialogue_type, data in self.dialogue_patterns.items():
            keywords = data["keywords"]
            count = sum(1 for keyword in keywords if keyword in story_lower)
            dialogue_counts[dialogue_type] = count
        
        return dialogue_counts

    def _assess_emotional_depth(self, story_text: str) -> int:
        """Assess the emotional depth of the dialogue (0-10 scale)"""
        story_lower = story_text.lower()
        depth_score = 0
        
        # Count depth indicators
        depth_count = sum(1 for indicator in self.depth_indicators if indicator in story_lower)
        
        # Count emotional intensity markers
        for intensity, markers in self.emotional_intensity.items():
            count = sum(1 for marker in markers if marker in story_lower)
            if intensity == "high":
                depth_score += count * 3
            elif intensity == "medium":
                depth_score += count * 2
            else:
                depth_score += count
        
        # Add depth indicators
        depth_score += depth_count * 2
        
        # Normalize to 0-10 scale
        return min(depth_score, 10)

    def _assess_cognitive_complexity(self, story_text: str) -> int:
        """Assess the cognitive complexity of the dialogue (0-10 scale)"""
        story_lower = story_text.lower()
        complexity_score = 0
        
        # Count complexity indicators (contradictions, comparisons, etc.)
        complexity_count = sum(1 for indicator in self.complexity_indicators if indicator in story_lower)
        complexity_score += complexity_count * 2
        
        # Count questions (indicates reflection)
        question_count = story_text.count('?')
        complexity_score += min(question_count, 5)
        
        # Count conditional statements
        conditional_markers = ["אם", "כאשר", "במקרה ש", "לו", "אילו"]
        conditional_count = sum(1 for marker in conditional_markers if marker in story_lower)
        complexity_score += conditional_count
        
        # Normalize to 0-10 scale
        return min(complexity_score, 10)

    def _determine_dialogue_quality(self, score: float, emotional_depth: int, cognitive_complexity: int) -> DialogueQuality:
        """Determine overall dialogue quality based on multiple factors"""
        if score == 0:
            return DialogueQuality.ABSENT
        
        # Calculate weighted quality score
        quality_score = (score * 0.5) + (emotional_depth / 10 * 0.3) + (cognitive_complexity / 10 * 0.2)
        
        if quality_score >= 0.8:
            return DialogueQuality.EXCELLENT
        elif quality_score >= 0.6:
            return DialogueQuality.GOOD
        elif quality_score >= 0.4:
            return DialogueQuality.FAIR
        else:
            return DialogueQuality.POOR

    def _generate_feedback_message(self, quality: DialogueQuality, score: float, dialogue_types: Dict[DialogueType, int]) -> str:
        """Generate detailed feedback message"""
        base_messages = {
            DialogueQuality.EXCELLENT: f"מעולה! זוהה דיאלוג פנימי עשיר ומעמיק (ציון: {score:.1%})",
            DialogueQuality.GOOD: f"טוב! זוהה דיאלוג פנימי איכותי (ציון: {score:.1%})",
            DialogueQuality.FAIR: f"זוהה דיאלוג פנימי בסיסי (ציון: {score:.1%})",
            DialogueQuality.POOR: f"זוהה דיאלוג פנימי מינימלי (ציון: {score:.1%})",
            DialogueQuality.ABSENT: "אזהרה: לא זוהה דיאלוג פנימי בסיפור"
        }
        
        message = base_messages[quality]
        
        # Add information about dialogue types found
        active_types = [dialogue_type.value for dialogue_type, count in dialogue_types.items() if count > 0]
        if active_types:
            message += f". זוהו סוגי דיאלוג: {', '.join(active_types)}"
        
        return message

    def _generate_suggestions(self, quality: DialogueQuality, dialogue_types: Dict[DialogueType, int], 
                            emotional_depth: int, cognitive_complexity: int) -> List[str]:
        """Generate improvement suggestions based on analysis"""
        suggestions = []
        
        if quality == DialogueQuality.ABSENT or quality == DialogueQuality.POOR:
            suggestions.extend([
                "הוסף ביטויים של מחשבות פנימיות (אני חושב, הרגשתי)",
                "כלול רפלקציה על רגשות ותחושות",
                "הוסף שאלות שהדמות שואלת את עצמה"
            ])
        
        # Check for missing dialogue types
        if dialogue_types.get(DialogueType.SELF_REFLECTION, 0) == 0:
            suggestions.append("הוסף רפלקציה עצמית - מחשבות על החוויה")
        
        if dialogue_types.get(DialogueType.EMOTIONAL_PROCESSING, 0) == 0:
            suggestions.append("כלול עיבוד רגשי - הכרה ברגשות ומקורם")
        
        if dialogue_types.get(DialogueType.COGNITIVE_RESTRUCTURING, 0) == 0:
            suggestions.append("הוסף מחשבה מחדש על האירוע או הסיטואציה")
        
        if dialogue_types.get(DialogueType.COPING_STRATEGIES, 0) == 0:
            suggestions.append("כלול אסטרטגיות התמודדות במחשבות הפנימיות")
        
        # Depth and complexity suggestions
        if emotional_depth < 5:
            suggestions.append("העמק את התוכן הרגשי של המחשבות")
        
        if cognitive_complexity < 5:
            suggestions.append("הוסף מורכבות קוגניטיבית - שאלות, ניגודים, השוואות")
        
        return suggestions

    def analyze_dialogue_progression(self, story_parts: List[str]) -> Dict[str, Any]:
        """
        Analyze internal dialogue progression across multiple story parts.
        
        Args:
            story_parts: List of story parts to analyze
            
        Returns:
            Dictionary with progression analysis
        """
        try:
            if not story_parts or not isinstance(story_parts, list):
                raise InternalDialogueValidationError("Story parts must be a non-empty list")
            
            progression_data = []
            
            for i, part in enumerate(story_parts):
                if not isinstance(part, str):
                    raise InternalDialogueValidationError(f"Story part {i+1} must be a string")
                
                analysis = self.validate_internal_dialogue(part)
                progression_data.append({
                    "part_number": i + 1,
                    "quality": analysis.quality.value,
                    "score": analysis.score,
                    "emotional_depth": analysis.emotional_depth,
                    "cognitive_complexity": analysis.cognitive_complexity,
                    "dialogue_types": {dt.value: count for dt, count in analysis.dialogue_types.items()}
                })
            
            # Calculate progression metrics
            scores = [data["score"] for data in progression_data]
            depth_scores = [data["emotional_depth"] for data in progression_data]
            complexity_scores = [data["cognitive_complexity"] for data in progression_data]
            
            analysis = {
                "progression_data": progression_data,
                "score_trend": self._calculate_trend(scores),
                "depth_trend": self._calculate_trend(depth_scores),
                "complexity_trend": self._calculate_trend(complexity_scores),
                "overall_improvement": scores[-1] > scores[0] if len(scores) > 1 else False,
                "recommendations": self._get_progression_recommendations(progression_data)
            }
            
            self.logger.info(f"Dialogue progression analyzed across {len(story_parts)} parts")
            return analysis
            
        except Exception as e:
            self.logger.error(f"Dialogue progression analysis failed: {e}")
            raise InternalDialogueValidationError(f"Failed to analyze dialogue progression: {e}")

    def _calculate_trend(self, values: List[float]) -> str:
        """Calculate trend direction from a list of values"""
        if len(values) < 2:
            return "insufficient_data"
        
        increases = sum(1 for i in range(1, len(values)) if values[i] > values[i-1])
        total_comparisons = len(values) - 1
        
        if increases / total_comparisons >= 0.7:
            return "improving"
        elif increases / total_comparisons <= 0.3:
            return "declining"
        else:
            return "stable"

    def _get_progression_recommendations(self, progression_data: List[Dict]) -> List[str]:
        """Get recommendations based on progression analysis"""
        recommendations = []
        
        if len(progression_data) < 2:
            return ["Add more story parts for progression analysis"]
        
        # Check if dialogue quality is improving
        first_score = progression_data[0]["score"]
        last_score = progression_data[-1]["score"]
        
        if last_score <= first_score:
            recommendations.append("Focus on developing stronger internal dialogue in later parts")
        
        # Check for consistent dialogue types
        all_types = set()
        for data in progression_data:
            all_types.update(data["dialogue_types"].keys())
        
        missing_consistently = []
        for dialogue_type in all_types:
            if all(data["dialogue_types"].get(dialogue_type, 0) == 0 for data in progression_data):
                missing_consistently.append(dialogue_type)
        
        if missing_consistently:
            recommendations.append(f"Consider adding {', '.join(missing_consistently)} dialogue types")
        
        return recommendations

    def get_service_status(self) -> Dict[str, Any]:
        """Get service status and configuration"""
        return {
            "service_name": "InternalDialogueService", 
            "version": "2.0",
            "dialogue_types": len(self.dialogue_patterns),
            "total_patterns": sum(len(data["keywords"]) for data in self.dialogue_patterns.values()),
            "depth_indicators": len(self.depth_indicators),
            "complexity_indicators": len(self.complexity_indicators)
        }