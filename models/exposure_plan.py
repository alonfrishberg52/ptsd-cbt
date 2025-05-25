class ExposurePlan:
    def __init__(self, plan_id, patient_id, plan_details, segments, anxiety_curve, validation_checklist, rules_applied=None, coping_mechanisms=None):
        self.plan_id = plan_id
        self.patient_id = patient_id
        self.plan_details = plan_details  # Dict or structured object
        self.segments = segments  # List of dicts/objects
        self.anxiety_curve = anxiety_curve  # List or dict
        self.validation_checklist = validation_checklist  # Dict or list
        self.rules_applied = rules_applied or []  # List of rule names/ids
        self.coping_mechanisms = coping_mechanisms or []

    def to_dict(self):
        return self.__dict__

    @classmethod
    def from_dict(cls, d):
        return cls(**d) 