class Story:
    def __init__(self, story_id, patient_id, plan_id, parts, sud_progression, compliance_report):
        self.story_id = story_id
        self.patient_id = patient_id
        self.plan_id = plan_id
        self.parts = parts  # List of dicts: {part_number, text, feedback}
        self.sud_progression = sud_progression  # List of SUD values
        self.compliance_report = compliance_report  # Dict or object 