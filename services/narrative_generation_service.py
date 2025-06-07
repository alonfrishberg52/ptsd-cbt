"""
Story Generation Service - Refactored with proper separation of concerns
Orchestrates story generation with enhanced validation, TTS, and Hebrew language support
"""

from agents.ptsd_treatment_agents import PlanGenAgent, ImpactEvalAgent, StoryGenAgent
from services.habituation_service import HabituationService
from services.internal_dialogue_service import InternalDialogueService
from services.rule_compliance_service import RuleComplianceService
from services.tts_service import TTSService
from services.validation_service import ValidationService
from config.app_config import ExposureConfig
from utils.logging_setup import get_logger
from typing import Optional, Dict, Any, List
import time


class StoryGenerationService:
    """
    Orchestrates multiple agents to generate a personalized, safe story for the patient.
    After story generation, validates:
    - Habituation (anxiety reduction)
    - Narrative coherence
    - Internal dialogue
    - Rule compliance
    - Hebrew language
    Returns all feedback in the result dict.
    """
    def __init__(self, 
                 validation_service: Optional[ValidationService] = None,
                 tts_service: Optional[TTSService] = None):
        """
        Initialize story generation service with dependency injection
        
        Args:
            validation_service: Service for input validation
            tts_service: Service for TTS audio generation
            
            
        """
        # Initialize logger
        self.logger = get_logger(__name__)
        
        # Initialize agents
        self.plan_agent = PlanGenAgent()
        self.eval_agent = ImpactEvalAgent()
        self.story_agent = StoryGenAgent()
        
        # Initialize validation services (with dependency injection)
        self.validation_service = validation_service or ValidationService()
        self.tts_service = tts_service or TTSService()
        
        # Initialize feedback services
        self.habituation_service = HabituationService()
        self.dialogue_service = InternalDialogueService()
        self.rule_service = RuleComplianceService()
        
        # Load configuration
        self.config = ExposureConfig()
        
        self.logger.info("StoryGenerationService initialized with dependency injection")

    def format_patient_context(self, patient_profile: Dict[str, Any]) -> str:
        """
        Format patient profile information for agent consumption
        
        Args:
            patient_profile: Patient information dictionary
            
        Returns:
            Formatted string with patient context
        """
        try:
            lines = []
            lines.append(f"Name: {patient_profile.get('name', '')}")
            lines.append(f"Main PTSD symptoms: {', '.join(patient_profile.get('ptsd_symptoms', []))}")
            lines.append(f"Main avoidances: {', '.join(patient_profile.get('main_avoidances', []))}")
            
            if patient_profile.get('general_symptoms'):
                lines.append("General symptoms: " + ', '.join(f"{k}: {v}" for k, v in patient_profile['general_symptoms'].items()))
            
            if patient_profile.get('somatic'):
                somatic = patient_profile['somatic']
                somatic_str = '; '.join(f"{cat}: {', '.join(syms)}" for cat, syms in somatic.items())
                lines.append(f"Somatic symptoms: {somatic_str}")
            
            if patient_profile.get('pcl5'):
                max_pcl5 = max(enumerate(patient_profile['pcl5']), key=lambda x: x[1])
                lines.append(f"Most severe PCL-5 symptom: Question {max_pcl5[0]+1} (score {max_pcl5[1]})")
            
            if patient_profile.get('phq9'):
                max_phq9 = max(enumerate(patient_profile['phq9']), key=lambda x: x[1])
                lines.append(f"Most severe PHQ-9 symptom: Question {max_phq9[0]+1} (score {max_phq9[1]})")
            
            return '\n'.join(lines)
            
        except Exception as e:
            self.logger.error(f"Error formatting patient context: {e}")
            return f"Name: {patient_profile.get('name', 'Unknown')}"

    def generate_story(self, 
                      patient_profile: Dict[str, Any], 
                      exposure_stage: int, 
                      last_sud: Optional[float] = None, 
                      previous_parts: Optional[List[str]] = None, 
                      rules: Optional[List[str]] = None) -> Dict[str, Any]:
        """
        Generate a complete story with enhanced validation, TTS capabilities, and proper error handling
        
        Args:
            patient_profile: Patient information dictionary
            exposure_stage: Stage of exposure therapy (1-3)
            last_sud: Previous SUD score
            previous_parts: List of previous story parts
            rules: List of therapy rules to follow
            
        Returns:
            Dictionary containing story, plan, evaluation, audio file, and all feedback
            
        Raises:
            ValidationError: If input validation fails
        """
        start_time = time.time()
        
        try:
            # Validate all inputs
            self.logger.info(f"Starting story generation for exposure stage {exposure_stage}")
            self._validate_inputs(patient_profile, exposure_stage, last_sud, previous_parts, rules)
            
            # Generate the plan
            self.logger.debug("Generating exposure plan...")
            plan = self._generate_plan(patient_profile, exposure_stage, last_sud, rules)
            
            # Evaluate the plan
            self.logger.debug("Evaluating plan impact...")
            expected_sud, explanation = self._evaluate_plan(plan, patient_profile, last_sud, rules)
            
            # Generate the story
            self.logger.debug("Generating therapeutic story...")
            story = self._generate_story_content(exposure_stage, plan, previous_parts, rules)
            
            # Validate and enhance story content
            self.logger.debug("Validating story content...")
            feedback = self._validate_story_content(story)
            
            # Generate enhanced TTS audio
            self.logger.debug("Generating TTS audio...")
            audio_file = self._generate_audio(story, patient_profile)
            
            # Log performance metrics
            duration = time.time() - start_time
            self.logger.info(f"Story generation completed in {duration:.2f}s")
            
            result = {
                "plan": plan,
                "evaluation": {
                    "expected_sud": expected_sud,
                    "explanation": explanation
                },
                "story": story,
                "audio_file": audio_file,
                **feedback
            }
            
            self.logger.info(f"Story generated successfully for patient: {patient_profile.get('name', 'Unknown')}")
            return result
            
        except Exception as e:
            self.logger.error(f"Story generation failed: {e}", exc_info=True)
            raise

    def _validate_inputs(self, patient_profile: Dict[str, Any], exposure_stage: int, 
                        last_sud: Optional[float], previous_parts: Optional[List[str]], 
                        rules: Optional[List[str]]) -> None:
        """Validate all inputs using validation service"""
        self.validation_service.validate_patient_profile(patient_profile)
        self.validation_service.validate_exposure_stage(exposure_stage)
        self.validation_service.validate_sud_score(last_sud)
        self.validation_service.validate_previous_parts(previous_parts)
        self.validation_service.validate_rules(rules)
    
    def _generate_plan(self, patient_profile: Dict[str, Any], exposure_stage: int, 
                      last_sud: Optional[float], rules: Optional[List[str]]) -> str:
        """Generate exposure therapy plan"""
        target_sud_range = self._get_target_sud_range(exposure_stage)
        return self.plan_agent.generate_plan(
            part=exposure_stage,
            patient_data=str(patient_profile),
            target_sud_range=target_sud_range,
            previous_sud=last_sud,
            rules=rules
        )
    
    def _evaluate_plan(self, plan: str, patient_profile: Dict[str, Any], 
                      last_sud: Optional[float], rules: Optional[List[str]]) -> tuple:
        """Evaluate plan impact and expected SUD"""
        return self.eval_agent.evaluate_sud(
            plan=plan,
            patient_data=str(patient_profile),
            last_patient_sud=last_sud,
            rules=rules
        )
    
    def _generate_story_content(self, exposure_stage: int, plan: str, 
                               previous_parts: Optional[List[str]], 
                               rules: Optional[List[str]]) -> str:
        """Generate the therapeutic story content"""
        return self.story_agent.generate_story(
            part=exposure_stage,
            plan=plan,
            previous_parts=previous_parts,
            rules=rules
        )
    
    def _validate_story_content(self, story: str) -> Dict[str, Any]:
        """Validate story content with all feedback services"""
        return {
            "habituation_feedback": self.habituation_service.validate_habituation_curve(story),
            "dialogue_feedback": self.dialogue_service.validate_internal_dialogue(story),
            "rule_feedback": self.rule_service.aggregate_rule_validation(story),
            
        }
    
    def _generate_audio(self, story: str, patient_profile: Dict[str, Any]) -> Optional[str]:
        """Generate TTS audio file for the story"""
        try:
            return self.tts_service.generate_audio_file(story, patient_profile)
        except Exception as e:
            self.logger.error(f"TTS generation failed: {e}")
            return None
    
    def _get_target_sud_range(self, exposure_stage: int) -> tuple:
        """Get target SUD range based on exposure stage"""
        return self.config.SUD_RANGES.get(exposure_stage, self.config.DEFAULT_SUD_RANGE)