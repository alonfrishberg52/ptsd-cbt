from pymongo import MongoClient
import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from utils.data_normalization import normalize_patient_data

client = MongoClient('mongodb://localhost:27017/')
db = client['ptsd_stories']
patients = db['patients']

all_patients = list(patients.find({}))

for p in all_patients:
    # Remove _id for normalization
    p_copy = p.copy()
    p_copy.pop('_id', None)
    normalized = normalize_patient_data(p_copy)
    # Only update if something changed
    if normalized != p_copy:
        patients.update_one({'_id': p['_id']}, {'$set': normalized})
        print(f"Updated {p.get('name', '')} ({p.get('patient_id', '')})")
    else:
        print(f"No change for {p.get('name', '')} ({p.get('patient_id', '')})")

print("Done.") 