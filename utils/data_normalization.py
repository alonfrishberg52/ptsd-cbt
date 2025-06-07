# utils/data_normalization.py

HEBREW_TO_ENGLISH_GENDER = {
    'זכר': 'male',
    'נקבה': 'female',
    'נייטרלי': 'neutral',
    'אחר': 'other',
    '': '',
    None: ''
}

HEBREW_TO_ENGLISH_EDUCATION = {
    'תיכון': 'high_school',
    'אקדמאי': 'academic',
    'חטיבת ביניים': 'middle_school',
    'יסודי': 'elementary',
    'אחר': 'other',
    '': '',
    None: ''
}

HEBREW_TO_ENGLISH_OCCUPATION = {
    'סטודנט': 'student',
    'עובד': 'employed',
    'מובטל': 'unemployed',
    'פנסיונר': 'retired',
    'אחר': 'other',
    '': '',
    None: ''
}

HEBREW_TO_ENGLISH_PET = {
    'כלב': 'dog',
    'חתול': 'cat',
    'אין': 'none',
    'אחר': 'other',
    '': '',
    None: ''
}

# Example mapping for somatic symptoms (expand as needed)
HEBREW_TO_ENGLISH_SOMATIC = {
    'קוצר נשימה': 'shortness_of_breath',
    'תחושת מחנק': 'choking_sensation',
    'צורך באוויר': 'need_for_air',
    'נשימה מהירה': 'rapid_breathing',
    'קשיי בליעה': 'swallowing_difficulties',
    'גוש בגרון': 'lump_in_throat',
    'צרבת': 'heartburn',
    'כאבי בטן': 'abdominal_pain',
    'בחילות': 'nausea',
    'הקאות': 'vomiting',
    'קרקורים בבטן': 'stomach_rumbling',
    'שלשולים': 'diarrhea',
    'עצירות': 'constipation',
    'ירידה במשקל': 'weight_loss',
    # Add more as needed
}

def normalize_somatic(somatic):
    """Recursively normalize somatic symptoms dictionary."""
    if not isinstance(somatic, dict):
        return somatic
    normalized = {}
    for cat, symptoms in somatic.items():
        normalized_symptoms = [HEBREW_TO_ENGLISH_SOMATIC.get(s, s) for s in symptoms]
        normalized[cat] = normalized_symptoms
    return normalized

def normalize_patient_data(data):
    # Normalize gender
    gender = data.get('gender', '')
    data['gender'] = HEBREW_TO_ENGLISH_GENDER.get(gender, gender)

    # Normalize education
    education = data.get('education', '')
    data['education'] = HEBREW_TO_ENGLISH_EDUCATION.get(education, education)

    # Normalize occupation
    occupation = data.get('occupation', '')
    data['occupation'] = HEBREW_TO_ENGLISH_OCCUPATION.get(occupation, occupation)

    # Normalize pet
    pet = data.get('pet', '')
    data['pet'] = HEBREW_TO_ENGLISH_PET.get(pet, pet)

    # Normalize somatic symptoms
    if 'somatic' in data:
        data['somatic'] = normalize_somatic(data['somatic'])

    # Add more field normalizations as needed...

    return data 