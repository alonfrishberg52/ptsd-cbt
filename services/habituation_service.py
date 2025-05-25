class HabituationService:
    """
    Service to validate that the story part includes a proper habituation (anxiety reduction) curve.
    Usage: Call validate_habituation_curve(story_part) after story generation. Returns feedback string.
    """
    def validate_habituation_curve(self, story_part):
        # Simple heuristic: check for keywords indicating reduction in anxiety
        keywords = ["הפחתה", "ירידה", "נרגע", "הקלה", "פוחת", "פחתה", "פחת"]
        if any(word in story_part for word in keywords):
            return "Habituation curve detected: story includes anxiety reduction."
        return "Warning: No clear habituation (anxiety reduction) detected in story."

    def track_sud_progression(self, story_id):
        """Stub for future SUD tracking logic."""
        pass 