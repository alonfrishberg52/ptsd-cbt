from models.audit import AuditLog
import uuid
import datetime
from pymongo import MongoClient

class AuditService:
    def __init__(self):
        self.logs = []  # In-memory list of AuditLog

    def log_action(self, log_data):
        log_id = str(uuid.uuid4())
        timestamp = datetime.datetime.utcnow().isoformat()
        log = AuditLog(
            log_id=log_id,
            patient_id=log_data.get('patient_id'),
            action=log_data.get('action'),
            timestamp=timestamp,
            details=log_data.get('details'),
            therapist_id=log_data.get('therapist_id')
        )
        self.logs.append(log)
        return log_id

    def get_audit_log(self, patient_id=None):
        if patient_id:
            return [log for log in self.logs if log.patient_id == patient_id]
        return self.logs

    def review_audit_entry(self, log_id):
        for log in self.logs:
            if log.log_id == log_id:
                return log
        return None

client = MongoClient("mongodb://localhost:27017/")
db = client['ptsd_stories']
patients = db.patients.find({})

for p in patients:
    update = {}
    if 'patient_id' not in p:
        update['patient_id'] = str(uuid.uuid4())
    if 'name' not in p:
        first = p.get('first_name', '')
        last = p.get('last_name', '')
        update['name'] = f"{first} {last}".strip()
    if update:
        db.patients.update_one({'_id': p['_id']}, {'$set': update})

i = {p['patient_id']: p.get('name', p['patient_id']) for p in db.patients.find({}, {'patient_id': 1, 'name': 1, '_id': 0}) if 'patient_id' in p} 