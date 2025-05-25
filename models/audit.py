class AuditLog:
    def __init__(self, log_id, patient_id, action, timestamp, details, therapist_id):
        self.log_id = log_id
        self.patient_id = patient_id
        self.action = action
        self.timestamp = timestamp
        self.details = details  # Dict or string
        self.therapist_id = therapist_id 