class InternalDialogueService:
    """
    Service to validate the presence and quality of internal dialogue in a story part.
    Usage: Call validate_internal_dialogue(story_part) after story generation. Returns feedback string.
    """
    def validate_internal_dialogue(self, story_part):
        # Simple heuristic: look for first-person thought phrases
        keywords = ["אני חושב", "חשבתי", "הרגשתי", "הבנתי", "אמרתי לעצמי", "שאלתי את עצמי"]
        if any(word in story_part for word in keywords):
            return "Internal dialogue detected in story."
        return "Warning: No internal dialogue detected in story."

    def analyze_dialogue_progression(self, story_id):
        """Stub for future dialogue progression analysis."""
        pass 