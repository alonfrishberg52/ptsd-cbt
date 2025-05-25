class SUDFeedback:
    def __init__(self, feedback_id, plan_id, patient_id, part_index, sud_value, timestamp, therapist_note=None):
        self.feedback_id = feedback_id
        self.plan_id = plan_id
        self.patient_id = patient_id
        self.part_index = part_index  # 1, 2, or 3
        self.sud_value = sud_value  # 0-100
        self.timestamp = timestamp
        self.therapist_note = therapist_note 