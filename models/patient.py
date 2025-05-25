class Patient:
    """
    Patient data model.
    """
    def __init__(self, patient_id, name, triggers, coping_toolkit, contraindications, goals, language, culture):
        self.patient_id = patient_id
        self.name = name
        self.triggers = triggers  # List of dicts: {name, SUD}
        self.coping_toolkit = coping_toolkit  # List of techniques
        self.contraindications = contraindications  # List
        self.goals = goals  # List or string
        self.language = language
        self.culture = culture 