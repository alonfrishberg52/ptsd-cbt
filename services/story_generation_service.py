from agents.PTSDAgents import PlanGenAgent, ImpactEvalAgent, StoryGenAgent
from services.exposure_plan_service import ExposurePlanService

class StoryGenerationService:
    def __init__(self, max_plan_trials=5):
        self.plan_agent = PlanGenAgent()
        self.eval_agent = ImpactEvalAgent()
        self.story_agent = StoryGenAgent()
        self.max_plan_trials = max_plan_trials
        self.exposure_plan_service = ExposurePlanService()

    def generate_story_part(self, patient_profile, plan_id, part_number, previous_plan=None, previous_parts=None, last_sud=None, feedback=None, trauma_type=None, symptoms=None):
        """
        Generate a story part using modular agents and strict clinical rules.
        - patient_profile: dict or str with patient triggers, SUDs, and context
        - plan_id: ID of the exposure plan
        - part_number: 1 (planning), 2 (exposure), 3 (resolution)
        - previous_plan: previous plan text (if adjusting)
        - previous_parts: list of previous story parts (for narrative coherence)
        - last_sud: last SUD reported by patient
        - feedback: patient feedback dict (optional)
        - trauma_type, symptoms: for rule selection
        Returns: dict with plan, evaluation, story, and safety notes
        """
        # 1. Get rules
        rules_text, rules_applied = self.exposure_plan_service.get_applicable_rules(patient_profile)
        # 2. Pass rules to agents
        plan = self.plan_agent.generate_plan(
            part=part_number,
            patient_data=patient_profile,
            previous_plan=previous_plan,
            target_sud_range=None,  # You can pass SUD targets if needed
            previous_sud=last_sud,
            adjustment=None,
            previous_explanation=None,
            rules=rules_text
        )
        expected_sud, explanation = self.eval_agent.evaluate_sud(
            plan=plan,
            patient_data=patient_profile,
            last_patient_sud=last_sud,
            rules=rules_text
        )
        story = self.story_agent.generate_story(
            part=part_number,
            plan=plan,
            previous_parts=previous_parts,
            rules=rules_text
        )
        # 3. Post-generation check (plan-based)
        safety_notes = []
        required_coping = ['breathing', 'self-talk']
        missing_coping = [c for c in required_coping if c not in getattr(plan, 'coping_mechanisms', [])]
        if missing_coping:
            safety_notes.append(f"Plan missing coping mechanisms: {', '.join(missing_coping)}")
        # Optionally, check the story for narrative safety mentions
        if 'בטיחות' not in story and 'safety' not in story:
            safety_notes.append('Story may be missing explicit safety instructions.')
        return {
            "plan": plan,
            "evaluation": {"expected_sud": expected_sud, "explanation": explanation},
            "story": story,
            "safety_notes": safety_notes,
            "rules_used": rules_applied,
            "debug_info": {
                "plan": plan,
                "expected_sud": expected_sud,
                "story": story
            }
        }

    def get_story(self, story_id):
        # Placeholder for story retrieval logic
        pass

    def update_story(self, story_id, update_data):
        # Placeholder for story update logic
        pass 