from agents.PTSDAgents import PlanGenAgent, ImpactEvalAgent, StoryGenAgent

class StoryGenerationService:
    """
    Orchestrates multiple agents to generate a personalized, safe story for the patient.
    """
    def __init__(self):
        self.plan_agent = PlanGenAgent()
        self.eval_agent = ImpactEvalAgent()
        self.story_agent = StoryGenAgent()

    def generate_story(self, patient_profile, exposure_stage, last_sud=None, previous_parts=None):
        """
        1. Generate a plan for the story using patient data and exposure stage.
        2. Evaluate the plan for SUD using the impact evaluation agent.
        3. Generate the story using the story agent.
        Returns: dict with plan, evaluation, and story.
        """
        word_counts = {1: 1000, 2: 2000, 3: 3000}
        word_count = word_counts.get(exposure_stage, 1000)

        # Add word count instruction to the patient profile for plan generation
        patient_profile_with_wordcount = dict(patient_profile)
        patient_profile_with_wordcount['word_count_instruction'] = (
            f"Please ensure the generated plan and story for this part is approximately {word_count} words long."
        )

        # Generate the plan (no word_count kwarg!)
        plan = self.plan_agent.generate_plan(
            part=exposure_stage,
            patient_data=patient_profile_with_wordcount,
            previous_plan=None,
            target_sud_range=None,
            previous_sud=last_sud,
            adjustment=None,
            previous_explanation=None
        )

        expected_sud, explanation = self.eval_agent.evaluate_sud(
            plan=plan,
            patient_data=patient_profile,
            last_patient_sud=last_sud
        )

        # If plan is a string, append the word count instruction for the story agent
        if isinstance(plan, str):
            plan_for_story = f"{plan}\n\nPlease ensure this story part is about {word_count} words."
        else:
            plan_for_story = plan  # If it's a dict or other type, handle as needed

        # Generate the story (no instruction kwarg!)
        story = self.story_agent.generate_story(
            part=exposure_stage,
            plan=plan_for_story,
            previous_parts=previous_parts
        )

        return {
            "plan": plan,
            "evaluation": {
                "expected_sud": expected_sud,
                "explanation": explanation
            },
            "story": story
        } 