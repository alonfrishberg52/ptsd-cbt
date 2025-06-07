"""
Habituation Service for PTSD Therapy Application
Validates and tracks anxiety reduction patterns in therapeutic stories
"""

import logging
from typing import Dict, Any, List, Optional, Union
from dataclasses import dataclass
from enum import Enum

# Setup logging
logger = logging.getLogger(__name__)

class HabituationLevel(Enum):
    """Enum for habituation levels"""
    HIGH = "high"
    MEDIUM = "medium" 
    LOW = "low"
    NONE = "none"

@dataclass
class HabituationAnalysis:
    """Data class for habituation analysis results"""
    level: HabituationLevel
    score: float  # 0.0 to 1.0
    detected_keywords: List[str]
    emotional_progression: Dict[str, int]
    feedback_message: str
    suggestions: List[str]

class HabituationValidationError(Exception):
    """Custom exception for habituation validation errors"""
    pass

class HabituationService:
    """
    Service to validate and analyze habituation (anxiety reduction) patterns in therapeutic stories.
    
    Habituation is a key component of exposure therapy where anxiety levels decrease
    over time through repeated or prolonged exposure to feared stimuli.
    
    Usage:
        service = HabituationService()
        analysis = service.validate_habituation_curve(story_text)
        print(analysis.feedback_message)
    """
    
    def __init__(self):
        """Initialize the habituation service with keyword patterns and weights"""
        self.logger = logger
        
        # Hebrew keywords for anxiety reduction patterns
        self.habituation_keywords = {
            "direct_reduction": {
                "keywords": ["הפחתה", "ירידה", "נרגע", "הקלה", "פוחת", "פחתה", "פחת", "התרגע", "נח", "שקט"],
                "weight": 1.0
            },
            "emotional_progress": {
                "keywords": ["טוב יותר", "משתפר", "התקדמות", "הבנה", "שליטה", "ביטחון", "כוח", "אומץ"],
                "weight": 0.8
            },
            "coping_mechanisms": {
                "keywords": ["נשימה", "הרפיה", "מדיטציה", "חשיבה חיובית", "כלים", "אסטרטגיה", "התמודדות"],
                "weight": 0.7
            },
            "time_progression": {
                "keywords": ["בהדרגה", "אט אט", "לאורך זמן", "עם הזמן", "בהמשך", "אחרי זמן", "בסוף"],
                "weight": 0.6
            },
            "support_systems": {
                "keywords": ["תמיכה", "עזרה", "לא לבד", "יחד", "משפחה", "חברים", "קהילה"],
                "weight": 0.5
            }
        }
        
        # Keywords that might indicate lack of habituation
        self.negative_indicators = [
            "גרוע יותר", "החמיר", "הוסיף", "עלה", "התגבר", "חזק יותר", "אין שיפור", "לא עוזר"
        ]
        
        # Emotional progression patterns
        self.emotional_patterns = {
            "anxiety": ["חרדה", "פחד", "דאגה", "מתח", "עצבנות", "בהלה"],
            "calm": ["רגוע", "שקט", "נח", "שלו", "מאוזן", "רגיעה"],
            "control": ["שליטה", "ביטחון", "כוח", "יכולת", "אמונה", "אומץ"],
            "understanding": ["הבנה", "תובנה", "בהירות", "למידה", "מודעות"]
        }
        
        self.logger.info("HabituationService initialized")

    def validate_habituation_curve(self, story_text: str) -> HabituationAnalysis:
        """
        Validate and analyze habituation patterns in a therapeutic story.
        
        Args:
            story_text: The story text to analyze
            
        Returns:
            HabituationAnalysis object with detailed analysis results
            
        Raises:
            HabituationValidationError: If validation fails
        """
        try:
            # Input validation
            self._validate_input(story_text)
            
            # Analyze habituation patterns
            score, detected_keywords = self._calculate_habituation_score(story_text)
            emotional_progression = self._analyze_emotional_progression(story_text)
            level = self._determine_habituation_level(score)
            
            # Generate feedback and suggestions
            feedback_message = self._generate_feedback_message(level, score, detected_keywords)
            suggestions = self._generate_suggestions(level, emotional_progression)
            
            analysis = HabituationAnalysis(
                level=level,
                score=score,
                detected_keywords=detected_keywords,
                emotional_progression=emotional_progression,
                feedback_message=feedback_message,
                suggestions=suggestions
            )
            
            self.logger.info(f"Habituation analysis completed: {level.value} level, score: {score:.2f}")
            return analysis
            
        except Exception as e:
            self.logger.error(f"Habituation validation failed: {e}")
            raise HabituationValidationError(f"Failed to validate habituation curve: {e}")

    def _validate_input(self, story_text: Union[str, None]) -> None:
        """Validate input parameters"""
        if not story_text:
            raise HabituationValidationError("Story text cannot be empty or None")
        
        if not isinstance(story_text, str):
            raise HabituationValidationError(f"Story text must be a string, got {type(story_text).__name__}")
        
        if len(story_text.strip()) < 10:
            raise HabituationValidationError("Story text too short for meaningful analysis")
        
        if len(story_text) > 10000:
            raise HabituationValidationError("Story text too long for processing")

    def _calculate_habituation_score(self, story_text: str) -> tuple[float, List[str]]:
        """Calculate habituation score based on keyword presence and patterns"""
        story_lower = story_text.lower()
        total_score = 0.0
        detected_keywords = []
        
        # Check for positive habituation indicators
        for category, data in self.habituation_keywords.items():
            keywords = data["keywords"]
            weight = data["weight"]
            
            for keyword in keywords:
                if keyword in story_lower:
                    total_score += weight
                    detected_keywords.append(keyword)
                    self.logger.debug(f"Found habituation keyword '{keyword}' in category '{category}'")
        
        # Check for negative indicators (subtract from score)
        for neg_keyword in self.negative_indicators:
            if neg_keyword in story_lower:
                total_score -= 0.3
                self.logger.debug(f"Found negative indicator: '{neg_keyword}'")
        
        # Normalize score to 0-1 range
        max_possible_score = sum(data["weight"] * len(data["keywords"]) for data in self.habituation_keywords.values())
        normalized_score = min(max(total_score / max_possible_score, 0.0), 1.0)
        
        return normalized_score, detected_keywords

    def _analyze_emotional_progression(self, story_text: str) -> Dict[str, int]:
        """Analyze emotional progression throughout the story"""
        story_lower = story_text.lower()
        emotional_counts = {}
        
        for emotion, keywords in self.emotional_patterns.items():
            count = sum(1 for keyword in keywords if keyword in story_lower)
            emotional_counts[emotion] = count
        
        return emotional_counts

    def _determine_habituation_level(self, score: float) -> HabituationLevel:
        """Determine habituation level based on score"""
        if score >= 0.7:
            return HabituationLevel.HIGH
        elif score >= 0.4:
            return HabituationLevel.MEDIUM
        elif score >= 0.2:
            return HabituationLevel.LOW
        else:
            return HabituationLevel.NONE

    def _generate_feedback_message(self, level: HabituationLevel, score: float, keywords: List[str]) -> str:
        """Generate detailed feedback message"""
        base_messages = {
            HabituationLevel.HIGH: f"מעולה! זוהתה עקומת התרגלות ברורה וחזקה (ציון: {score:.1%})",
            HabituationLevel.MEDIUM: f"טוב! זוהתה עקומת התרגלות בינונית (ציון: {score:.1%})", 
            HabituationLevel.LOW: f"זוהתה עקומת התרגלות חלשה (ציון: {score:.1%})",
            HabituationLevel.NONE: f"אזהרה: לא זוהתה עקומת התרגלות ברורה (ציון: {score:.1%})"
        }
        
        message = base_messages[level]
        
        if keywords:
            message += f". נמצאו מילות מפתח: {', '.join(keywords[:5])}"
            if len(keywords) > 5:
                message += f" ועוד {len(keywords) - 5}"
        
        return message

    def _generate_suggestions(self, level: HabituationLevel, emotional_progression: Dict[str, int]) -> List[str]:
        """Generate improvement suggestions based on analysis"""
        suggestions = []
        
        if level == HabituationLevel.NONE or level == HabituationLevel.LOW:
            suggestions.extend([
                "הוסף תיאורים של הפחתת חרדה בהדרגה",
                "כלול מילים המתארות התקדמות רגשית",
                "הוסף אזכורים של כלי התמודדות"
            ])
        
        if emotional_progression.get("calm", 0) < 2:
            suggestions.append("הוסף יותר ביטויים של רגיעה ושקט")
        
        if emotional_progression.get("control", 0) < 1:
            suggestions.append("הדגש תחושות של שליטה וביטחון")
        
        if emotional_progression.get("understanding", 0) < 1:
            suggestions.append("כלול אלמנטים של הבנה ותובנה")
        
        return suggestions

    def track_sud_progression(self, story_id: str, sud_values: List[float]) -> Dict[str, Any]:
        """
        Track SUD (Subjective Units of Distress) progression across story parts.
        
        Args:
            story_id: Unique identifier for the story
            sud_values: List of SUD values throughout the story
            
        Returns:
            Dictionary with progression analysis
        """
        try:
            if not story_id:
                raise HabituationValidationError("Story ID cannot be empty")
            
            if not sud_values or not isinstance(sud_values, list):
                raise HabituationValidationError("SUD values must be a non-empty list")
            
            # Validate SUD values
            for i, value in enumerate(sud_values):
                if not isinstance(value, (int, float)) or not (0 <= value <= 100):
                    raise HabituationValidationError(f"SUD value at index {i} must be between 0-100")
            
            # Calculate progression metrics
            initial_sud = sud_values[0]
            final_sud = sud_values[-1]
            reduction = initial_sud - final_sud
            reduction_percentage = (reduction / initial_sud) * 100 if initial_sud > 0 else 0
            
            # Determine if habituation occurred
            habituation_occurred = reduction > 0 and reduction_percentage >= 20
            
            analysis = {
                "story_id": story_id,
                "initial_sud": initial_sud,
                "final_sud": final_sud,
                "reduction": reduction,
                "reduction_percentage": reduction_percentage,
                "habituation_occurred": habituation_occurred,
                "progression_quality": self._assess_progression_quality(sud_values),
                "recommendations": self._get_sud_recommendations(sud_values)
            }
            
            self.logger.info(f"SUD progression tracked for story {story_id}: {reduction_percentage:.1f}% reduction")
            return analysis
            
        except Exception as e:
            self.logger.error(f"SUD progression tracking failed: {e}")
            raise HabituationValidationError(f"Failed to track SUD progression: {e}")

    def _assess_progression_quality(self, sud_values: List[float]) -> str:
        """Assess the quality of SUD progression"""
        if len(sud_values) < 2:
            return "insufficient_data"
        
        # Check for consistent downward trend
        decreases = sum(1 for i in range(1, len(sud_values)) if sud_values[i] < sud_values[i-1])
        total_comparisons = len(sud_values) - 1
        
        if decreases / total_comparisons >= 0.8:
            return "excellent"
        elif decreases / total_comparisons >= 0.6:
            return "good"
        elif decreases / total_comparisons >= 0.4:
            return "fair"
        else:
            return "poor"

    def _get_sud_recommendations(self, sud_values: List[float]) -> List[str]:
        """Get recommendations based on SUD progression"""
        recommendations = []
        
        if len(sud_values) < 2:
            return ["Collect more SUD measurements for better analysis"]
        
        final_reduction = sud_values[0] - sud_values[-1]
        
        if final_reduction <= 0:
            recommendations.extend([
                "Consider adjusting exposure intensity",
                "Include more coping strategies",
                "Extend story duration for better habituation"
            ])
        elif final_reduction < sud_values[0] * 0.2:
            recommendations.append("Try to increase habituation effect")
        
        return recommendations

    def get_service_status(self) -> Dict[str, Any]:
        """Get service status and configuration"""
        return {
            "service_name": "HabituationService",
            "version": "2.0",
            "keyword_categories": len(self.habituation_keywords),
            "total_keywords": sum(len(data["keywords"]) for data in self.habituation_keywords.values()),
            "emotional_patterns": len(self.emotional_patterns),
            "negative_indicators": len(self.negative_indicators)
        }