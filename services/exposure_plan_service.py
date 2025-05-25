from models.exposure_plan import ExposurePlan
from models.sud_feedback import SUDFeedback
import uuid
import datetime
from utils.rule_loader import load_rules_from_markdown, get_rule_text

class ExposurePlanService:
    def __init__(self):
        # In-memory store for demo; replace with DB in production
        self.plans = {}  # plan_id: ExposurePlan
        self.sud_feedback = []  # List of SUDFeedback
        # Load rules from markdown directory (adjust path as needed)
        self.rules = load_rules_from_markdown('cursorrules/ptsd-cbt/core-rules')

    def get_applicable_rules(self, patient_profile):
        # Example: always use core, add advanced/context based on patient
        rule_names = ['_index.md', 'overall-context.md']
        if patient_profile.get('trauma_type') == 'complex':
            rule_names.append('advanced-cbt.md')
        # Add more logic as needed
        return get_rule_text(self.rules, rule_names), rule_names

    def create_plan(self, patient_id, plan_data, patient_profile):
        rules_text, rules_applied = self.get_applicable_rules(patient_profile)
        plan_id = str(uuid.uuid4())
        plan = ExposurePlan(
            plan_id=plan_id,
            patient_id=patient_id,
            plan_details=plan_data.get('plan_details'),
            segments=plan_data.get('segments', []),
            anxiety_curve=plan_data.get('anxiety_curve', []),
            validation_checklist=plan_data.get('validation_checklist', {}),
            rules_applied=rules_applied,
            coping_mechanisms=plan_data.get('coping_mechanisms', [])
        )
        self.plans[plan_id] = plan
        return plan_id

    def get_plan(self, plan_id):
        """Retrieve an exposure plan by ID."""
        return self.plans.get(plan_id)

    def update_plan(self, plan_id, update_data):
        """Update an existing exposure plan."""
        plan = self.plans.get(plan_id)
        if not plan:
            return False
        for key, value in update_data.items():
            if hasattr(plan, key):
                setattr(plan, key, value)
        return True

    def validate_plan(self, plan_id):
        plan = self.plans.get(plan_id)
        if not plan:
            return {'valid': False, 'errors': ['Plan not found']}
        errors = []
        # Example: Check segments and SUD curve
        if not plan.segments or not isinstance(plan.segments, list):
            errors.append('Plan must have a list of segments.')
        if not plan.anxiety_curve or not isinstance(plan.anxiety_curve, (list, dict)):
            errors.append('Plan must have an anxiety curve.')
        # Example: Check SUD range for each segment
        for i, seg in enumerate(plan.segments):
            sud = seg.get('expected_sud')
            if sud is not None and (sud < 0 or sud > 100):
                errors.append(f'Segment {i+1} has invalid SUD: {sud}')
        # Example: Check rule compliance (coping mechanisms)
        required_coping = ['breathing', 'self-talk']
        for coping in required_coping:
            if coping not in plan.coping_mechanisms:
                errors.append(f'Missing coping: {coping}')
        if not plan.validation_checklist:
            errors.append('Validation checklist missing.')
        return {'valid': len(errors) == 0, 'errors': errors}

    # SUD Feedback Methods
    def submit_feedback(self, plan_id, patient_id, part_index, sud_value, therapist_note=None):
        feedback_id = str(uuid.uuid4())
        timestamp = datetime.datetime.utcnow().isoformat()
        feedback = SUDFeedback(
            feedback_id=feedback_id,
            plan_id=plan_id,
            patient_id=patient_id,
            part_index=part_index,
            sud_value=sud_value,
            timestamp=timestamp,
            therapist_note=therapist_note
        )
        self.sud_feedback.append(feedback)
        return feedback_id

    def get_feedback_for_plan(self, plan_id):
        return [f for f in self.sud_feedback if f.plan_id == plan_id]

    def get_feedback_for_patient(self, patient_id):
        return [f for f in self.sud_feedback if f.patient_id == patient_id] 