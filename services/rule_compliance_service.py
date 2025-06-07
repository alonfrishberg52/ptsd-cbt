"""
Rule Compliance Service for PTSD Therapy Application
Validates therapeutic content against safety and compliance rules
"""

import logging
import re
from typing import Dict, Any, List, Optional, Union
from dataclasses import dataclass
from enum import Enum

# Setup logging
logger = logging.getLogger(__name__)

class ComplianceLevel(Enum):
    """Enum for compliance levels"""
    EXCELLENT = "excellent"
    GOOD = "good"
    FAIR = "fair"
    POOR = "poor"
    VIOLATION = "violation"

class RuleCategory(Enum):
    """Enum for rule categories"""
    SAFETY = "safety"
    THERAPEUTIC_GUIDELINES = "therapeutic_guidelines"
    ETHICAL_STANDARDS = "ethical_standards"
    CONTENT_APPROPRIATENESS = "content_appropriateness"
    TRAUMA_SENSITIVITY = "trauma_sensitivity"

@dataclass
class ComplianceAnalysis:
    """Data class for rule compliance analysis results"""
    level: ComplianceLevel
    score: float  # 0.0 to 1.0
    violations: List[str]
    warnings: List[str]
    compliant_rules: List[str]
    rule_breakdown: Dict[RuleCategory, Dict[str, Any]]
    feedback_message: str
    recommendations: List[str]

class RuleComplianceValidationError(Exception):
    """Custom exception for rule compliance validation errors"""
    pass

class RuleComplianceService:
    """
    Service to validate therapeutic content against safety and compliance rules.
    
    This service ensures that therapeutic stories adhere to:
    - Safety guidelines for trauma therapy
    - Ethical standards for patient care
    - Content appropriateness for therapeutic settings
    - Trauma-informed care principles
    
    Usage:
        service = RuleComplianceService()
        analysis = service.aggregate_rule_validation(story_text)
        print(analysis.feedback_message)
    """
    
    def __init__(self):
        """Initialize the rule compliance service with comprehensive rule patterns"""
        self.logger = logger
        
        # Safety rules (highest priority)
        self.safety_rules = {
            "no_harmful_content": {
                "keywords": [
                    "פגיעה עצמית", "התאבדות", "סכין", "נשק", "סמים", "אלכוהול",
                    "אלימות קיצונית", "דם", "מוות", "רצח", "פגיעה"
                ],
                "weight": -2.0,
                "category": "safety_violation"
            },
            "trigger_warnings": {
                "keywords": [
                    "פיצוץ", "ירי", "תקיפה", "אונס", "התעללות", "טראומה קשה",
                    "זוועה", "סיוט", "בהלה קיצונית"
                ],
                "weight": -1.5,
                "category": "trigger_warning"
            },
            "safety_measures": {
                "keywords": [
                    "בטיחות", "בטוח", "מוגן", "תמיכה", "עזרה", "ליווי",
                    "מטפל", "רופא", "חירום", "קו חם"
                ],
                "weight": 1.0,
                "category": "safety_positive"
            }
        }
        
        # Therapeutic guidelines
        self.therapeutic_rules = {
            "gradual_exposure": {
                "keywords": [
                    "בהדרגה", "אט אט", "צעד צעד", "לאט", "במתינות",
                    "בקצב שלך", "בזמן שלך", "ללא לחץ"
                ],
                "weight": 0.8,
                "category": "therapeutic_positive"
            },
            "empowerment": {
                "keywords": [
                    "כוח", "יכולת", "חוזק", "ביטחון", "שליטה", "בחירה",
                    "החלטה", "אמונה עצמית", "העצמה"
                ],
                "weight": 0.7,
                "category": "empowerment"
            },
            "coping_resources": {
                "keywords": [
                    "כלים", "אסטרטגיות", "שיטות", "דרכים", "פתרונות",
                    "התמודדות", "משאבים", "יכולות"
                ],
                "weight": 0.6,
                "category": "coping_positive"
            }
        }
        
        # Content appropriateness rules
        self.content_rules = {
            "age_appropriate": {
                "keywords": [
                    "תוכן מתאים", "הולם", "ראוי", "מקובל", "מתון",
                    "בהיר", "מובן", "נגיש"
                ],
                "weight": 0.5,
                "category": "content_positive"
            },
            "professional_language": {
                "keywords": [
                    "מקצועי", "רגיש", "מכבד", "אמפתי", "מבין",
                    "תומך", "מעודד", "חיובי"
                ],
                "weight": 0.4,
                "category": "professional"
            }
        }
        
        # Trauma sensitivity patterns
        self.trauma_sensitivity = {
            "informed_care": {
                "keywords": [
                    "טיפול מודע טראומה", "רגיש לטראומה", "מבין טראומה",
                    "טראומה מודעת", "טיפול רגיש"
                ],
                "weight": 1.0,
                "category": "trauma_informed"
            },
            "validation": {
                "keywords": [
                    "תקף", "לגיטימי", "מובן", "טבעי", "נורמלי",
                    "מאמין", "מכיר", "מזהה"
                ],
                "weight": 0.6,
                "category": "validation"
            }
        }
        
        # Prohibited phrases (automatic violations)
        self.prohibited_phrases = [
            "תתגבר על זה", "זה בראש שלך", "פשוט תשכח",
            "זה לא כל כך נורא", "אחרים עברו גרוע יותר",
            "תפסיק להיות חלש", "זה כבר עבר"
        ]
        
        # Required elements for therapeutic content
        self.required_elements = {
            "hope_message": ["תקווה", "עתיד", "שיפור", "התקדמות", "החלמה"],
            "support_system": ["תמיכה", "עזרה", "יחד", "לא לבד", "קהילה"],
            "personal_agency": ["בחירה", "החלטה", "יכולת", "כוח", "שליטה"]
        }
        
        self.logger.info("RuleComplianceService initialized with comprehensive rule set")

    def aggregate_rule_validation(self, story_text: str, rules: Optional[List[str]] = None) -> ComplianceAnalysis:
        """
        Validate therapeutic content against comprehensive safety and compliance rules.
        
        Args:
            story_text: The story text to validate
            rules: Optional list of additional custom rules
            
        Returns:
            ComplianceAnalysis object with detailed compliance results
            
        Raises:
            RuleComplianceValidationError: If validation fails
        """
        try:
            # Input validation
            self._validate_input(story_text)
            
            # Perform comprehensive compliance analysis
            violations = self._check_violations(story_text)
            warnings = self._check_warnings(story_text)
            compliant_rules = self._check_compliant_rules(story_text)
            rule_breakdown = self._analyze_rule_categories(story_text)
            score = self._calculate_compliance_score(story_text, violations, warnings, compliant_rules)
            level = self._determine_compliance_level(score, violations)
            
            # Generate feedback and recommendations
            feedback_message = self._generate_feedback_message(level, score, violations, warnings)
            recommendations = self._generate_recommendations(level, violations, warnings, rule_breakdown)
            
            analysis = ComplianceAnalysis(
                level=level,
                score=score,
                violations=violations,
                warnings=warnings,
                compliant_rules=compliant_rules,
                rule_breakdown=rule_breakdown,
                feedback_message=feedback_message,
                recommendations=recommendations
            )
            
            self.logger.info(f"Rule compliance analysis completed: {level.value} level, score: {score:.2f}")
            return analysis
            
        except Exception as e:
            self.logger.error(f"Rule compliance validation failed: {e}")
            raise RuleComplianceValidationError(f"Failed to validate rule compliance: {e}")

    def generate_compliance_report(self, story_text: str) -> Dict[str, Any]:
        """
        Generate detailed compliance report for therapeutic content.
        
        Args:
            story_text: The story text to analyze
            
        Returns:
            Dictionary with comprehensive compliance report
        """
        try:
            analysis = self.aggregate_rule_validation(story_text)
            
            report = {
                "compliance_summary": {
                    "level": analysis.level.value,
                    "score": analysis.score,
                    "status": "PASS" if analysis.level != ComplianceLevel.VIOLATION else "FAIL"
                },
                "safety_assessment": {
                    "violations_count": len(analysis.violations),
                    "warnings_count": len(analysis.warnings),
                    "violations": analysis.violations,
                    "warnings": analysis.warnings
                },
                "rule_categories": analysis.rule_breakdown,
                "compliant_elements": analysis.compliant_rules,
                "recommendations": analysis.recommendations,
                "detailed_feedback": analysis.feedback_message,
                "timestamp": self._get_timestamp()
            }
            
            self.logger.info(f"Compliance report generated for content analysis")
            return report
            
        except Exception as e:
            self.logger.error(f"Compliance report generation failed: {e}")
            raise RuleComplianceValidationError(f"Failed to generate compliance report: {e}")

    def _validate_input(self, story_text: Union[str, None]) -> None:
        """Validate input parameters"""
        if not story_text:
            raise RuleComplianceValidationError("Story text cannot be empty or None")
        
        if not isinstance(story_text, str):
            raise RuleComplianceValidationError(f"Story text must be a string, got {type(story_text).__name__}")
        
        if len(story_text.strip()) < 10:
            raise RuleComplianceValidationError("Story text too short for meaningful compliance analysis")
        
        if len(story_text) > 20000:
            raise RuleComplianceValidationError("Story text too long for processing")

    def _check_violations(self, story_text: str) -> List[str]:
        """Check for rule violations that require immediate attention"""
        violations = []
        story_lower = story_text.lower()
        
        # Check prohibited phrases
        for phrase in self.prohibited_phrases:
            if phrase in story_lower:
                violations.append(f"Prohibited phrase: '{phrase}'")
                self.logger.warning(f"Found prohibited phrase: '{phrase}'")
        
        # Check safety violations
        for rule_name, rule_data in self.safety_rules.items():
            if rule_data["weight"] < 0:  # Negative weight indicates violation
                for keyword in rule_data["keywords"]:
                    if keyword in story_lower:
                        violations.append(f"Safety violation ({rule_name}): '{keyword}'")
                        self.logger.warning(f"Safety violation found: {keyword}")
        
        return violations

    def _check_warnings(self, story_text: str) -> List[str]:
        """Check for potential issues that need attention"""
        warnings = []
        story_lower = story_text.lower()
        
        # Check for missing required elements
        for element, keywords in self.required_elements.items():
            if not any(keyword in story_lower for keyword in keywords):
                warnings.append(f"Missing {element.replace('_', ' ')}: consider adding elements like {', '.join(keywords[:3])}")
        
        # Check for excessive negative content
        negative_words = ["נורא", "איום", "קשה", "כואב", "מפחיד", "רע"]
        negative_count = sum(1 for word in negative_words if word in story_lower)
        
        if negative_count > 5:
            warnings.append(f"High negative content: {negative_count} negative words found")
        
        return warnings

    def _check_compliant_rules(self, story_text: str) -> List[str]:
        """Check which rules are being followed correctly"""
        compliant_rules = []
        story_lower = story_text.lower()
        
        all_rules = {**self.safety_rules, **self.therapeutic_rules, **self.content_rules, **self.trauma_sensitivity}
        
        for rule_name, rule_data in all_rules.items():
            if rule_data["weight"] > 0:  # Positive weight indicates good practice
                for keyword in rule_data["keywords"]:
                    if keyword in story_lower:
                        compliant_rules.append(f"{rule_name}: '{keyword}'")
                        break  # Only count each rule once
        
        return compliant_rules

    def _analyze_rule_categories(self, story_text: str) -> Dict[RuleCategory, Dict[str, Any]]:
        """Analyze compliance by rule categories"""
        story_lower = story_text.lower()
        breakdown = {}
        
        category_rules = {
            RuleCategory.SAFETY: self.safety_rules,
            RuleCategory.THERAPEUTIC_GUIDELINES: self.therapeutic_rules,
            RuleCategory.CONTENT_APPROPRIATENESS: self.content_rules,
            RuleCategory.TRAUMA_SENSITIVITY: self.trauma_sensitivity
        }
        
        for category, rules in category_rules.items():
            matches = []
            total_score = 0
            
            for rule_name, rule_data in rules.items():
                rule_matches = [kw for kw in rule_data["keywords"] if kw in story_lower]
                if rule_matches:
                    matches.extend(rule_matches)
                    total_score += len(rule_matches) * rule_data["weight"]
            
            breakdown[category] = {
                "matches": matches,
                "count": len(matches),
                "score": total_score,
                "status": "good" if total_score > 0 else "needs_attention"
            }
        
        return breakdown

    def _calculate_compliance_score(self, story_text: str, violations: List[str], 
                                   warnings: List[str], compliant_rules: List[str]) -> float:
        """Calculate overall compliance score"""
        story_lower = story_text.lower()
        base_score = 0.5  # Start with neutral score
        
        # Subtract for violations and warnings
        violation_penalty = len(violations) * 0.2
        warning_penalty = len(warnings) * 0.1
        
        # Add for compliant rules
        compliance_bonus = len(compliant_rules) * 0.05
        
        # Calculate keyword-based score
        all_rules = {**self.safety_rules, **self.therapeutic_rules, **self.content_rules, **self.trauma_sensitivity}
        keyword_score = 0
        
        for rule_data in all_rules.values():
            for keyword in rule_data["keywords"]:
                if keyword in story_lower:
                    keyword_score += rule_data["weight"]
        
        # Normalize keyword score
        normalized_keyword_score = min(max(keyword_score / 10, -0.5), 0.5)
        
        # Calculate final score
        final_score = base_score + normalized_keyword_score + compliance_bonus - violation_penalty - warning_penalty
        
        return min(max(final_score, 0.0), 1.0)

    def _determine_compliance_level(self, score: float, violations: List[str]) -> ComplianceLevel:
        """Determine compliance level based on score and violations"""
        if violations:
            return ComplianceLevel.VIOLATION
        elif score >= 0.8:
            return ComplianceLevel.EXCELLENT
        elif score >= 0.6:
            return ComplianceLevel.GOOD
        elif score >= 0.4:
            return ComplianceLevel.FAIR
        else:
            return ComplianceLevel.POOR

    def _generate_feedback_message(self, level: ComplianceLevel, score: float, 
                                  violations: List[str], warnings: List[str]) -> str:
        """Generate detailed feedback message"""
        base_messages = {
            ComplianceLevel.EXCELLENT: f"מעולה! התוכן עומד בכל הכללים הטיפוליים (ציון: {score:.1%})",
            ComplianceLevel.GOOD: f"טוב! התוכן עומד ברוב הכללים הטיפוליים (ציון: {score:.1%})",
            ComplianceLevel.FAIR: f"התוכן עומד בכללים הבסיסיים (ציון: {score:.1%})",
            ComplianceLevel.POOR: f"התוכן זקוק לשיפורים נוספים (ציון: {score:.1%})",
            ComplianceLevel.VIOLATION: f"אזהרה: נמצאו הפרות כללים (ציון: {score:.1%})"
        }
        
        message = base_messages[level]
        
        if violations:
            message += f". הפרות: {len(violations)}"
        
        if warnings:
            message += f". אזהרות: {len(warnings)}"
        
        return message

    def _generate_recommendations(self, level: ComplianceLevel, violations: List[str], 
                                warnings: List[str], rule_breakdown: Dict) -> List[str]:
        """Generate improvement recommendations"""
        recommendations = []
        
        if violations:
            recommendations.extend([
                "תקן מיידית את ההפרות שזוהו",
                "הסר תוכן שעלול להזיק או לטריגר",
                "וודא שהתוכן בטוח לכל המטופלים"
            ])
        
        if warnings:
            recommendations.extend([
                "שפר את האלמנטים החסרים שזוהו",
                "הוסף יותר תוכן חיובי ומעצים",
                "וודא שיש מסר של תקווה ותמיכה"
            ])
        
        # Category-specific recommendations
        for category, data in rule_breakdown.items():
            if data["status"] == "needs_attention":
                if category == RuleCategory.SAFETY:
                    recommendations.append("הוסף יותר אלמנטים של בטיחות ותמיכה")
                elif category == RuleCategory.THERAPEUTIC_GUIDELINES:
                    recommendations.append("שלב יותר עקרונות טיפוליים מקובלים")
                elif category == RuleCategory.TRAUMA_SENSITIVITY:
                    recommendations.append("הוסף יותר רגישות לטראומה והבנה")
        
        if level in [ComplianceLevel.FAIR, ComplianceLevel.POOR]:
            recommendations.extend([
                "שקול להוסיף יותר כלי התמודדות",
                "הדגש את החוזק והיכולות של המטופל",
                "וודא שהתוכן מעודד ומעצים"
            ])
        
        return recommendations

    def _get_timestamp(self) -> str:
        """Get current timestamp for reporting"""
        from datetime import datetime
        return datetime.utcnow().isoformat()

    def get_service_status(self) -> Dict[str, Any]:
        """Get service status and configuration"""
        all_rules = {**self.safety_rules, **self.therapeutic_rules, **self.content_rules, **self.trauma_sensitivity}
        
        return {
            "service_name": "RuleComplianceService",
            "version": "2.0",
            "total_rules": len(all_rules),
            "safety_rules": len(self.safety_rules),
            "therapeutic_rules": len(self.therapeutic_rules),
            "content_rules": len(self.content_rules),
            "trauma_sensitivity_rules": len(self.trauma_sensitivity),
            "prohibited_phrases": len(self.prohibited_phrases),
            "required_elements": len(self.required_elements)
        } 