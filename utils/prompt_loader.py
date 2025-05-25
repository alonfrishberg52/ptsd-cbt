import os

PROMPT_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'prompts')

def load_prompt(prompt_name):
    """
    Load a prompt file from the prompts directory by filename.
    Usage: load_prompt('plan_gen_prompt.txt')
    """
    path = os.path.join(PROMPT_DIR, prompt_name)
    if not os.path.exists(path):
        raise FileNotFoundError(f"Prompt file not found: {path}")
    with open(path, 'r', encoding='utf-8') as f:
        return f.read()
