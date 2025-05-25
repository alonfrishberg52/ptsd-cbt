class NarrativeCoherenceService:
    """
    Service to validate narrative structure and character consistency in a story part.
    Usage: Call validate_narrative_structure(story_part) and check_character_consistency(story_part) after story generation. Returns feedback strings.
    """
    def validate_narrative_structure(self, story):
        # Hebrew narrative markers (feel free to expand this list)
        beginnings = ["בהתחלה", "בתחילה", "כשהתחלתי", "לפני הכל", "בראשית"]
        middles = ["לאחר מכן", "אחר כך", "בהמשך", "ואז", "במהלך"]
        ends = ["בסוף", "לבסוף", "בסיום", "סיימתי", "ולבסוף", "בסיומו של"]

        has_beginning = any(word in story for word in beginnings)
        has_middle = any(word in story for word in middles)
        has_end = any(word in story for word in ends)

        score = sum([has_beginning, has_middle, has_end]) / 3
        if score == 1:
            status = "pass"
            summary = "מבנה נרטיבי מלא."
        elif score >= 0.67:
            status = "warn"
            summary = "מבנה נרטיבי חלקי."
        else:
            status = "fail"
            summary = "חסר מבנה נרטיבי ברור."

        details = []
        if not has_beginning: details.append("לא נמצא פתיח ברור.")
        if not has_middle: details.append("לא נמצא אמצע ברור.")
        if not has_end: details.append("לא נמצא סיום ברור.")

        return {
            "status": status,
            "score": score,
            "summary": summary,
            "details": details,
            "suggestions": [
                "וודא שלסיפור יש התחלה, אמצע וסוף ברורים."
            ] if status != "pass" else [],
            "evidence": []
        }

    def check_character_consistency(self, story_part):
        # Simple heuristic: check for repeated names (could be improved)
        import re
        names = re.findall(r'\b[A-Zא-ת][a-zא-ת]+\b', story_part)
        unique_names = set(names)
        if len(unique_names) > 1:
            return f"Multiple characters detected: {', '.join(unique_names)}. Check for consistency."
        return "Character consistency OK." 