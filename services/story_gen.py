from agents.PTSDAgents import PlanGenAgent, ImpactEvalAgent, StoryGenAgent
from services.habituation_service import HabituationService
from services.narrative_coherence_service import NarrativeCoherenceService
from services.internal_dialogue_service import InternalDialogueService
from services.rule_compliance_service import RuleComplianceService
from services.hebrew_service import HebrewService
import uuid
from gtts import gTTS
import os
import re
from typing import Optional, Dict, Any

def enhance_hebrew_text_for_tts(text: str, patient_gender: str = 'neutral') -> str:
    """
    Enhance Hebrew text for better TTS pronunciation
    
    Args:
        text: Hebrew text to enhance
        patient_gender: 'male', 'female', or 'neutral' for gender-appropriate language
        
    Returns:
        Enhanced text with better pronunciation markers
    """
    
    # Normalize Hebrew text
    enhanced_text = text.strip()
    
    # Add pronunciation helpers for common Hebrew patterns
    pronunciation_fixes = {
        # Common word stress patterns
        'לא ': 'לא ',  # Ensure proper spacing
        'את ': 'את ',  # Clear pronunciation of direct object marker
        'של ': 'של ',  # Possessive marker
        'על ': 'על ',  # Preposition
        'אל ': 'אל ',  # Preposition
        'בשביל': 'בשביל',  # For the sake of
        'בגלל': 'בגלל',    # Because of
        
        # Therapeutic vocabulary with proper stress
        'חרדה': 'חרדה',      # Anxiety
        'פחד': 'פחד',        # Fear
        'כוח': 'כוח',        # Strength
        'אמונה': 'אמונה',    # Faith/Belief
        'תקווה': 'תקווה',    # Hope
        'הבנה': 'הבנה',      # Understanding
        'רגש': 'רגש',        # Emotion
        'מחשבה': 'מחשבה',   # Thought
        'נשימה': 'נשימה',   # Breathing
        'הרפיה': 'הרפיה',   # Relaxation
        
        # Common therapy phrases
        'אתה חזק': 'אתה חזק',           # You are strong
        'זה יעבור': 'זה יעבור',         # This will pass
        'אתה לא לבד': 'אתה לא לבד',   # You are not alone
        'כל צעד קטן': 'כל צעד קטן',   # Every small step
    }
    
    # Apply pronunciation fixes
    for original, enhanced in pronunciation_fixes.items():
        enhanced_text = enhanced_text.replace(original, enhanced)
    
    # Gender-specific adjustments
    if patient_gender == 'female':
        # Adjust verbs and adjectives for feminine forms
        gender_fixes = {
            'אתה ': 'את ',           # You (masc) -> You (fem)
            'אתה.': 'את.',           # You at end of sentence
            'אתה,': 'את,',           # You with comma
            'חזק': 'חזקה',           # Strong (masc) -> Strong (fem)
            'יכול': 'יכולה',         # Can (masc) -> Can (fem)
            'מוכן': 'מוכנה',         # Ready (masc) -> Ready (fem)
            'עייף': 'עייפה',         # Tired (masc) -> Tired (fem)
        }
        
        for masc, fem in gender_fixes.items():
            enhanced_text = enhanced_text.replace(masc, fem)
    
    # Add natural pauses for better reading flow
    enhanced_text = re.sub(r'([.!?])\s*', r'\1 ', enhanced_text)  # Ensure space after punctuation
    enhanced_text = re.sub(r',\s*', ', ', enhanced_text)          # Ensure space after commas
    enhanced_text = re.sub(r':\s*', ': ', enhanced_text)          # Ensure space after colons
    
    # Add breathing pauses in long sentences
    enhanced_text = re.sub(r'([.!?])\s+([א-ת])', r'\1\n\n\2', enhanced_text)  # Line breaks between sentences
    
    return enhanced_text

def generate_audio_file(text: str, patient_data: Optional[Dict[str, Any]] = None) -> Optional[str]:
    """
    Generate high-quality Hebrew TTS audio file with therapeutic voice settings
    
    Args:
        text: Hebrew text to convert to speech
        patient_data: Optional patient data for gender-appropriate voice
        
    Returns:
        Audio filename if successful, None if failed
    """
    
    try:
        # Determine patient gender for voice selection
        patient_gender = 'neutral'
        if patient_data:
            patient_gender = patient_data.get('gender', 'neutral')
        
        # Enhance text for better Hebrew pronunciation
        enhanced_text = enhance_hebrew_text_for_tts(text, patient_gender)
        
        # Configure TTS settings for therapeutic use
        tts_config = {
            'text': enhanced_text,
            'lang': 'iw',  # Hebrew language code
            'slow': False,  # Normal speed - we'll control speed in player
            'tld': 'com'    # Use google.com for better Hebrew support
        }
        
        # Generate TTS
        tts = gTTS(**tts_config)
        
        # Create unique filename
        audio_file = f"therapy_story_{uuid.uuid4().hex[:8]}.mp3"
        audio_path = os.path.join('static', 'audio', audio_file)
        
        # Ensure directory exists
        os.makedirs(os.path.dirname(audio_path), exist_ok=True)
        
        # Save audio file
        tts.save(audio_path)
        
        # Verify file was created
        if os.path.exists(audio_path) and os.path.getsize(audio_path) > 0:
            return audio_file
        else:
            print(f"TTS file creation failed or empty: {audio_path}")
            return None
            
    except Exception as e:
        print(f"TTS generation error: {e}")
        return None

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
    def __init__(self):
        self.plan_agent = PlanGenAgent()
        self.eval_agent = ImpactEvalAgent()
        self.story_agent = StoryGenAgent()
        self.habituation_service = HabituationService()
        self.narrative_service = NarrativeCoherenceService()
        self.dialogue_service = InternalDialogueService()
        self.rule_service = RuleComplianceService()
        self.hebrew_service = HebrewService()

    def format_patient_context(self, patient_profile):
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
        # Add more fields as needed
        return '\n'.join(lines)

    def generate_story(self, patient_profile, exposure_stage, last_sud=None, previous_parts=None, rules=None):
        """
        Generate a complete story with enhanced TTS capabilities
        """
        # Generate the plan
        plan = self.plan_agent.generate_plan(
            part=exposure_stage,
            patient_data=str(patient_profile),
            target_sud_range=self._get_target_sud_range(exposure_stage),
            previous_sud=last_sud,
            rules=rules
        )

        # Evaluate the plan
        expected_sud, explanation = self.eval_agent.evaluate_sud(
            plan=plan,
            patient_data=str(patient_profile),
            last_patient_sud=last_sud,
            rules=rules
        )

        # Generate the story
        story = self.story_agent.generate_story(
            part=exposure_stage,
            plan=plan,
            previous_parts=previous_parts,
            rules=rules
        )

        # Post-process with modular services
        habituation_feedback = self.habituation_service.validate_habituation_curve(story)
        narrative_feedback = self.narrative_service.validate_narrative_structure(story)
        dialogue_feedback = self.dialogue_service.validate_internal_dialogue(story)
        rule_feedback = self.rule_service.aggregate_rule_validation(story)
        hebrew_feedback = self.hebrew_service.validate_hebrew_language(story)

        # Generate enhanced TTS audio with patient data
        audio_file = generate_audio_file(story, patient_profile)

        return {
            "plan": plan,
            "evaluation": {
                "expected_sud": expected_sud,
                "explanation": explanation
            },
            "story": story,
            "audio_file": audio_file,
            "habituation_feedback": habituation_feedback,
            "narrative_feedback": narrative_feedback,
            "dialogue_feedback": dialogue_feedback,
            "rule_feedback": rule_feedback,
            "hebrew_feedback": hebrew_feedback
        }

    def _get_target_sud_range(self, exposure_stage):
        """Get target SUD range based on exposure stage"""
        sud_ranges = {
            1: (30, 50),  # Gentle introduction
            2: (40, 70),  # Moderate exposure
            3: (20, 40),  # Resolution and calming
        }
        return sud_ranges.get(exposure_stage, (30, 50)) 