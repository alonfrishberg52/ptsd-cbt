import os
from pathlib import Path

PROMPT_DIR = Path(__file__).resolve().parent.parent / 'prompts'

def load_prompt(prompt_name):
    """
    Load a prompt file from the prompts directory by filename.
    Usage: load_prompt('plan_gen_prompt.txt')
    """
    path = PROMPT_DIR / prompt_name
    if not path.exists():
        raise FileNotFoundError(f"Prompt file not found: {path}")
    with open(path, 'r', encoding='utf-8') as f:
        return f.read()
