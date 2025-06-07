"""
Input validation service for PTSD therapy application
Validates patient profiles, exposure stages, and other inputs
"""

import logging
from typing import Dict, Any, List, Optional, Union
from config.app_config import ValidationConfig

logger = logging.getLogger(__name__)

class ValidationError(Exception):
    """Custom exception for validation errors"""
    pass

class ValidationService:
    """Service for validating various inputs in the PTSD therapy system"""
    
    def __init__(self):
        self.config = ValidationConfig()
    
    def validate_patient_profile(self, patient_profile: Dict[str, Any]) -> bool:
        """
        Validate patient profile structure and required fields
        
        Args:
            patient_profile: Dictionary containing patient information
            
        Returns:
            True if valid
            
        Raises:
            ValidationError: If validation fails
        """
        if not isinstance(patient_profile, dict):
            raise ValidationError("Patient profile must be a dictionary")
        
        # Check required fields
        for field in self.config.REQUIRED_PATIENT_FIELDS:
            if field not in patient_profile:
                raise ValidationError(f"Missing required field: {field}")
            
            if not patient_profile[field] or patient_profile[field].strip() == "":
                raise ValidationError(f"Required field '{field}' cannot be empty")
        
        # Validate field types
        for field, expected_type in self.config.PATIENT_PROFILE_SCHEMA.items():
            if field in patient_profile:
                value = patient_profile[field]
                if value is not None and not isinstance(value, expected_type):
                    raise ValidationError(
                        f"Field '{field}' must be of type {expected_type.__name__}, "
                        f"got {type(value).__name__}"
                    )
        
        # Validate gender if present
        if 'gender' in patient_profile:
            gender = patient_profile['gender']
            if gender not in self.config.VALID_GENDERS:
                raise ValidationError(
                    f"Invalid gender '{gender}'. Must be one of: {self.config.VALID_GENDERS}"
                )
        
        # Validate list fields
        list_fields = ['ptsd_symptoms', 'main_avoidances', 'pcl5', 'phq9']
        for field in list_fields:
            if field in patient_profile:
                value = patient_profile[field]
                if value is not None:
                    if not isinstance(value, list):
                        raise ValidationError(f"Field '{field}' must be a list")
                    
                    # Validate PCL-5 and PHQ-9 score ranges
                    if field == 'pcl5' and value:
                        if len(value) != 20:
                            raise ValidationError("PCL-5 must have exactly 20 scores")
                        for i, score in enumerate(value):
                            if not isinstance(score, (int, float)) or not (0 <= score <= 4):
                                raise ValidationError(f"PCL-5 score {i+1} must be between 0-4")
                    
                    elif field == 'phq9' and value:
                        if len(value) != 9:
                            raise ValidationError("PHQ-9 must have exactly 9 scores")
                        for i, score in enumerate(value):
                            if not isinstance(score, (int, float)) or not (0 <= score <= 3):
                                raise ValidationError(f"PHQ-9 score {i+1} must be between 0-3")
        
        logger.info(f"Patient profile validation successful for: {patient_profile.get('name', 'Unknown')}")
        return True
    
    def validate_exposure_stage(self, exposure_stage: int) -> bool:
        """
        Validate exposure therapy stage
        
        Args:
            exposure_stage: The exposure stage number
            
        Returns:
            True if valid
            
        Raises:
            ValidationError: If validation fails
        """
        if not isinstance(exposure_stage, int):
            raise ValidationError(f"Exposure stage must be an integer, got {type(exposure_stage).__name__}")
        
        from config.app_config import ExposureConfig
        if exposure_stage not in ExposureConfig.VALID_EXPOSURE_STAGES:
            raise ValidationError(
                f"Invalid exposure stage {exposure_stage}. "
                f"Must be one of: {ExposureConfig.VALID_EXPOSURE_STAGES}"
            )
        
        return True
    
    def validate_text_for_tts(self, text: str) -> bool:
        """
        Validate text for TTS generation
        
        Args:
            text: Text to be converted to speech
            
        Returns:
            True if valid
            
        Raises:
            ValidationError: If validation fails
        """
        if not isinstance(text, str):
            raise ValidationError(f"TTS text must be a string, got {type(text).__name__}")
        
        if len(text) < self.config.MIN_TEXT_LENGTH:
            raise ValidationError(f"Text too short. Minimum length: {self.config.MIN_TEXT_LENGTH}")
        
        if len(text) > self.config.MAX_TEXT_LENGTH:
            raise ValidationError(f"Text too long. Maximum length: {self.config.MAX_TEXT_LENGTH}")
        
        # Check for malicious content (basic check)
        suspicious_patterns = ['<script>', 'javascript:', 'eval(', 'exec(']
        text_lower = text.lower()
        for pattern in suspicious_patterns:
            if pattern in text_lower:
                raise ValidationError(f"Suspicious content detected: {pattern}")
        
        return True
    
    def validate_sud_score(self, sud_score: Union[int, float, None]) -> bool:
        """
        Validate SUD (Subjective Units of Distress) score
        
        Args:
            sud_score: SUD score to validate
            
        Returns:
            True if valid
            
        Raises:
            ValidationError: If validation fails
        """
        if sud_score is None:
            return True  # None is allowed for missing scores
        
        if not isinstance(sud_score, (int, float)):
            raise ValidationError(f"SUD score must be a number, got {type(sud_score).__name__}")
        
        if not (0 <= sud_score <= 100):
            raise ValidationError(f"SUD score must be between 0-100, got {sud_score}")
        
        return True
    
    def validate_previous_parts(self, previous_parts: Optional[List[str]]) -> bool:
        """
        Validate previous story parts
        
        Args:
            previous_parts: List of previous story parts
            
        Returns:
            True if valid
            
        Raises:
            ValidationError: If validation fails
        """
        if previous_parts is None:
            return True
        
        if not isinstance(previous_parts, list):
            raise ValidationError(f"Previous parts must be a list, got {type(previous_parts).__name__}")
        
        for i, part in enumerate(previous_parts):
            if not isinstance(part, str):
                raise ValidationError(f"Previous part {i+1} must be a string")
            
            if len(part.strip()) == 0:
                raise ValidationError(f"Previous part {i+1} cannot be empty")
        
        return True
    
    def validate_rules(self, rules: Optional[List[str]]) -> bool:
        """
        Validate therapy rules
        
        Args:
            rules: List of therapy rules
            
        Returns:
            True if valid
            
        Raises:
            ValidationError: If validation fails
        """
        if rules is None:
            return True
        
        if not isinstance(rules, list):
            raise ValidationError(f"Rules must be a list, got {type(rules).__name__}")
        
        for i, rule in enumerate(rules):
            if not isinstance(rule, str):
                raise ValidationError(f"Rule {i+1} must be a string")
            
            if len(rule.strip()) == 0:
                raise ValidationError(f"Rule {i+1} cannot be empty")
        
        return True