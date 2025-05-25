class HebrewService:
    """
    Service to validate Hebrew language and cultural adaptation in a story part.
    Usage: Call validate_hebrew_language(story_part) after story generation. Returns feedback string.
    """
    def validate_hebrew_language(self, story_part):
        # Simple heuristic: count Hebrew letters
        import re
        hebrew_letters = re.findall(r'[א-ת]', story_part)
        total_letters = re.findall(r'\w', story_part)
        if total_letters and len(hebrew_letters) / len(total_letters) > 0.5:
            return "Hebrew language detected."
        return "Warning: Story may not be in Hebrew."

    def adapt_to_culture(self, story_part, culture_data):
        """Stub for future cultural adaptation logic."""
        pass 