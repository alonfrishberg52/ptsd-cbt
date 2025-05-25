class RuleComplianceService:
    """
    Service to check rule compliance in a generated story.
    Usage: Call aggregate_rule_validation(story_text) and generate_compliance_report(story_text) after story generation. Returns feedback/report.
    """
    def aggregate_rule_validation(self, story_text):
        # Simple heuristic: check for required rule keywords
        required_keywords = ["בטיחות", "כלל", "אסור", "מותר", "חובה"]
        found = [kw for kw in required_keywords if kw in story_text]
        if found:
            return f"Rule compliance: found keywords: {', '.join(found)}."
        return "Warning: No explicit rule compliance keywords found."

    def generate_compliance_report(self, story_text):
        required_keywords = ["בטיחות", "כלל", "אסור", "מותר", "חובה"]
        found = [kw for kw in required_keywords if kw in story_text]
        missing = [kw for kw in required_keywords if kw not in story_text]
        return {
            "found": found,
            "missing": missing,
            "summary": f"Found: {', '.join(found)}; Missing: {', '.join(missing)}"
        } 