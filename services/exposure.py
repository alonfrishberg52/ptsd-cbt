from services.story_gen import StoryGenerationService

class ExposureProgressionService:
    """
    Manages the exposure plan, tracks progress, and adjusts difficulty.
    """
    def __init__(self):
        self.story_service = StoryGenerationService()
        # In-memory store for demo; replace with DB in production
        self.patient_progress = {}  # patient_id: {stage, sud_history, feedback, therapist_override}

    def get_current_stage(self, patient_id):
        """Get the current exposure stage for a patient."""
        progress = self.patient_progress.get(patient_id, {})
        return progress.get('stage', 1)  # Default to stage 1 (planning)

    def advance_stage(self, patient_id, last_sud, feedback=None, therapist_override=None, trauma_type=None, symptoms=None):
        """
        Advance the patient to the next exposure stage, or repeat/pause based on SUD/feedback and rules.
        Returns: dict with next_stage, recommendation, and safety_notes
        """
        # Rule-based SUD targets
        sud_targets = {
            1: (50, 70),
            2: (60, 80),
            3: (0, 40)
        }
        progress = self.patient_progress.setdefault(patient_id, {'stage': 1, 'sud_history': [], 'feedback': [], 'therapist_override': None})
        current_stage = progress['stage']
        min_sud, max_sud = sud_targets.get(current_stage, (0, 100))
        safety_notes = []
        # Therapist override always takes precedence
        if therapist_override is not None:
            progress['stage'] = therapist_override
            return {'next_stage': therapist_override, 'recommendation': 'Therapist override', 'safety_notes': []}
        # Adaptive logic
        if last_sud is not None:
            progress['sud_history'].append({'stage': current_stage, 'sud': last_sud})
        if feedback:
            progress['feedback'].append({'stage': current_stage, 'feedback': feedback})
        # Progression logic
        if last_sud is None:
            recommendation = 'No SUD reported. Stay at current stage.'
            next_stage = current_stage
        elif min_sud <= last_sud <= max_sud and (not feedback or feedback.get('distress') is not True):
            # SUD in target range and no distress
            next_stage = min(current_stage + 1, 3)
            recommendation = 'Progress to next stage.' if next_stage > current_stage else 'Stay at final stage.'
        elif last_sud > max_sud or (feedback and feedback.get('distress')):
            # SUD too high or distress reported
            next_stage = current_stage
            safety_notes.append('High SUD or distress: repeat stage, insert extra coping/safety, flag for therapist review.')
            recommendation = 'Repeat current stage with extra coping/safety.'
        elif last_sud < min_sud:
            # SUD too low (may indicate under-exposure)
            next_stage = current_stage
            safety_notes.append('Low SUD: consider increasing exposure if clinically appropriate.')
            recommendation = 'Repeat or increase exposure (therapist to decide).'
        else:
            next_stage = current_stage
            recommendation = 'No change.'
        progress['stage'] = next_stage
        return {'next_stage': next_stage, 'recommendation': recommendation, 'safety_notes': safety_notes}

    def record_progress(self, patient_id, data):
        """Record progress or feedback for a patient."""
        progress = self.patient_progress.setdefault(patient_id, {'stage': 1, 'sud_history': [], 'feedback': [], 'therapist_override': None})
        if 'sud' in data:
            progress['sud_history'].append({'stage': progress['stage'], 'sud': data['sud']})
        if 'feedback' in data:
            progress['feedback'].append({'stage': progress['stage'], 'feedback': data['feedback']})
        if 'therapist_override' in data:
            progress['therapist_override'] = data['therapist_override']
        return True 