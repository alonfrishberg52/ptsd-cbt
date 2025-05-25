from agents.PTSDAgents import PlanGenAgent, ImpactEvalAgent, StoryGenAgent
from services.habituation_service import HabituationService
from services.narrative_coherence_service import NarrativeCoherenceService
from services.internal_dialogue_service import InternalDialogueService
from services.rule_compliance_service import RuleComplianceService
from services.hebrew_service import HebrewService

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
        Generate a personalized story for the patient, using all clinical data and injected rules.
        - patient_profile: dict with all patient data
        - exposure_stage: int (1, 2, or 3)
        - last_sud: previous SUD value
        - previous_parts: list of previous story parts
        - rules: string of clinical rules to inject into the LLM prompt (from .cursorrules or other source)
        Returns: dict with plan, evaluation, story, and feedback from modular services and validators.
        """
        word_counts = {1: 1000, 2: 2000, 3: 3000}
        word_count = word_counts.get(exposure_stage, 1000)

        # Format patient context for LLM
        context = self.format_patient_context(patient_profile)
        patient_profile_with_wordcount = dict(patient_profile)
        patient_profile_with_wordcount['word_count_instruction'] = (
            f"Please ensure the generated plan and story for this part is approximately {word_count} words long."
        )

        # Generate the plan
        plan = self.plan_agent.generate_plan(
            part=exposure_stage,
            patient_data=context,
            previous_plan=None,
            target_sud_range=None,
            previous_sud=last_sud,
            adjustment=None,
            previous_explanation=None,
            rules=rules
        )

        expected_sud, explanation = self.eval_agent.evaluate_sud(
            plan=plan,
            patient_data=context,
            last_patient_sud=last_sud,
            rules=rules
        )

        # If plan is a string, append the word count instruction for the story agent
        if isinstance(plan, str):
            plan_for_story = f"{plan}\n\nPlease ensure this story part is about {word_count} words."
        else:
            plan_for_story = plan

        # Generate the story
        story = self.story_agent.generate_story(
            part=exposure_stage,
            plan=plan_for_story,
            previous_parts=previous_parts,
            rules=rules
        )

        # Post-process with modular services
        habituation_feedback = self.habituation_service.validate_habituation_curve(story)
        narrative_feedback = self.narrative_service.validate_narrative_structure(story)
        dialogue_feedback = self.dialogue_service.validate_internal_dialogue(story)
        rule_feedback = self.rule_service.aggregate_rule_validation(story)
        hebrew_feedback = self.hebrew_service.validate_hebrew_language(story)

        return {
            "plan": plan,
            "evaluation": {
                "expected_sud": expected_sud,
                "explanation": explanation
            },
            "story": story,
            "habituation_feedback": habituation_feedback,
            "narrative_feedback": narrative_feedback,
            "dialogue_feedback": dialogue_feedback,
            "rule_feedback": rule_feedback,
            "hebrew_feedback": hebrew_feedback
        } 