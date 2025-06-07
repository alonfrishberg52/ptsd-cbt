
from pymongo import MongoClient

# Connect to your MongoDB
client = MongoClient('mongodb://localhost:27017/')
db = client['ptsd_stories']  # Use your DB name as in app.py
patients = db['patients']

# Mapping from Hebrew to English
gender_map = {
    'זכר': 'male',
    'נקבה': 'female',
    'נייטרלי': 'neutral'
}

# Find all patients with Hebrew gender values
query = {'gender': {'$in': list(gender_map.keys())}}
hebrew_patients = list(patients.find(query))

print("Patients with Hebrew gender values:")
for p in hebrew_patients:
    print(f"Name: {p.get('name', '')}, Gender: {p.get('gender', '')}")

# Update each patient
for p in hebrew_patients:
    hebrew_gender = p.get('gender')
    english_gender = gender_map.get(hebrew_gender, 'neutral')
    result = patients.update_one(
        {'_id': p['_id']},
        {'$set': {'gender': english_gender}}
    )
    print(f"Updated {p.get('name', '')}: {hebrew_gender} → {english_gender}")

print("Done.")