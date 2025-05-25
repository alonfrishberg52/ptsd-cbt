import os
import markdown
import glob

def load_rules_from_markdown(directory):
    rules = {}
    for md_file in glob.glob(os.path.join(directory, '*.md')):
        with open(md_file, encoding='utf-8') as f:
            content = f.read()
            # You can use markdown.markdown(content) if you want HTML, or just keep as text
            rules[os.path.basename(md_file)] = content
    return rules

def get_rule_text(rules, rule_names):
    """Concatenate rule texts for a list of rule_names (filenames)."""
    return "\n\n".join(rules.get(name, '') for name in rule_names) 