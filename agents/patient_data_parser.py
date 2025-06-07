"""
PTSDEvalTools.py - Tools for parsing PTSD patient data from Hebrew text.
"""

import re
import json
from typing import Dict, List, Optional, Set, Union

class  PatientDataParser:
    """
    Parses Hebrew PTSD patient data to extract structured information for LLM processing.
    """
    
    def __init__(self):
        # Regular expressions for extracting different parts of patient data
        self.trigger_pattern = re.compile(r'(\d+)\s+(.*?)\s+([^\d\n]+)$', re.MULTILINE)
    
        
    def parse(self, patient: Dict) -> Dict:
        """
        Parse the patient dictionary and extract structured information.
        Args:
            patient: Dictionary with patient fields from the form
        Returns:
            Dictionary containing parsed patient information
        """
        # Copy all fields as base
        parsed = dict(patient)

        # If there is a free-text field (e.g., 'patient_data'), parse it for extra info
        patient_data = patient.get('patient_data', '')
        if patient_data:
            # Extract name and age from the form if available
            name = patient.get('first_name', 'Unknown')
            age = int(patient.get('age', 0)) if patient.get('age') else 0
            # Use the original regex-based parsing for triggers, symptoms, etc.
            background_pattern = re.compile(
                rf'^(.*?)(?=\n\n{name} סובל|\n{name} סובל|סובל מסימפטומים|דברים שמרגיעים|\Z)', 
                re.DOTALL
            )
            background_match = background_pattern.search(patient_data)
            background = background_match.group(1).strip() if background_match else ""
            symptoms_pattern = re.compile(
                rf'(?:{name} )?סובל מסימפטומים.*?:(.*?)(?=\n\n|\Z|\nדברים)', 
                re.DOTALL
            )
            symptoms_match = symptoms_pattern.search(patient_data)
            symptoms_text = symptoms_match.group(1).strip() if symptoms_match else ""
            symptoms = [s.strip() for s in symptoms_text.split('\n') if s.strip()]
            calming_pattern = re.compile(
                rf'דברים שמרגיעים את (?:{name}|.*?):(.*?)(?=\n\n|\Z|\n\d+)', 
                re.DOTALL
            )
            calming_match = calming_pattern.search(patient_data)
            calming_text = calming_match.group(1).strip() if calming_match else ""
            calming_methods = [c.strip() for c in calming_text.split('\n') if c.strip()]
            triggers = []
            for match in self.trigger_pattern.finditer(patient_data):
                sud_level = int(match.group(1))
                description = match.group(2).strip()
                trigger_term = match.group(3).strip()
                triggers.append({
                    "sud_level": sud_level,
                    "description": description,
                    "trigger_term": trigger_term
                })
            trauma_type = self._extract_trauma_type(background)
            limitations = self._extract_limitations(background)
            parsed.update({
                "background": background,
                "symptoms": symptoms,
                "calming_methods": calming_methods,
                "triggers": sorted(triggers, key=lambda x: x["sud_level"], reverse=True),
                "trauma_type": trauma_type,
                "functional_limitations": limitations
            })
        return parsed
    
    def _extract_trauma_type(self, background: str) -> str:
        """
        Extract the type of trauma from the background.
        
        Args:
            background: Background text
            
        Returns:
            Type of trauma described
        """
        trauma_types = ["פיגוע", "מלחמה", "התקפה", "תאונה", "פציעה", "אובדן", "קרב"]
        for trauma in trauma_types:
            if trauma in background:
                # Get surrounding context
                trauma_index = background.find(trauma)
                start = max(0, trauma_index - 15)
                end = min(len(background), trauma_index + 15)
                context = background[start:end]
                return context
        return ""
    
    def _extract_limitations(self, background: str) -> List[str]:
        """
        Extract functional limitations from the background.
        
        Args:
            background: Background text
            
        Returns:
            List of identified functional limitations
        """
        limitations = []
        limitation_indicators = [
            "מוגבל", "קשה לו", "נמנע", "מתקשה", "חרדה", "לא ישן", "לא יכול"
        ]
        
        sentences = re.split(r'[.!?]\s*', background)
        for sentence in sentences:
            for indicator in limitation_indicators:
                if indicator in sentence:
                    limitations.append(sentence.strip())
                    break
        
        return limitations
    



