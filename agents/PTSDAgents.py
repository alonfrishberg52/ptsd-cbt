"""PTSD treatment agents for generating and managing exposure scenarios."""

import os
import json
from typing import Dict, List, Tuple
from openai import OpenAI
import requests
from dotenv import load_dotenv
from utils.prompt_loader import load_prompt
load_dotenv()

# Initialize OpenAI client
openai_client = OpenAI(
    api_key=os.getenv("OPENAI_API_KEY"),
    base_url="https://api.openai.com/v1"
)

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3")

class UnifiedLLMClient:
    """Unified client that handles OpenAI and Ollama (free local LLM) with automatic fallback."""
    
    def __init__(self):
        self.openai_client = openai_client
        self.use_openai_first = True  # Try OpenAI first, fallback to Ollama
        self.use_ollama_first = False
    
    def set_primary_provider(self, provider: str):
        """Set which provider to try first ('openai' or 'ollama')."""
        if provider.lower() == 'openai':
            self.use_openai_first = True
            self.use_ollama_first = False
        elif provider.lower() == 'ollama':
            self.use_openai_first = False
            self.use_ollama_first = True
        else:
            raise ValueError("Provider must be 'openai' or 'ollama'")
    
    def get_current_primary_provider(self):
        if self.use_openai_first:
            return 'openai'
        elif self.use_ollama_first:
            return 'ollama'
        return 'openai'
    
    def chat_completion(self, messages, **kwargs):
        max_tokens = kwargs.pop('max_tokens', 2000)
        temperature = kwargs.pop('temperature', 0.7)
        model = kwargs.pop('model', 'gpt-4o')
        
        # Provider order: primary, then fallback
        provider_order = []
        if self.use_openai_first:
            provider_order = ['openai', 'ollama']
        elif self.use_ollama_first:
            provider_order = ['ollama', 'openai']
        else:
            provider_order = ['openai', 'ollama']
        
        last_exception = None
        for provider in provider_order:
            try:
                if provider == 'openai':
                    return self._openai_completion(messages, model, max_tokens, temperature, **kwargs)
                elif provider == 'ollama':
                    return self._ollama_completion(messages, max_tokens, temperature)
            except Exception as e:
                print(f"{provider.capitalize()} request failed: {e}")
                last_exception = e
                continue
        raise RuntimeError(f"All providers failed. Last error: {last_exception}")

    def _openai_completion(self, messages, model, max_tokens, temperature, **kwargs):
        completion = self.openai_client.chat.completions.create(
            model=model,
            messages=messages,
            max_tokens=max_tokens,
            temperature=temperature,
            top_p=kwargs.get('top_p', 0.95),
            frequency_penalty=kwargs.get('frequency_penalty', 0),
            presence_penalty=kwargs.get('presence_penalty', 0),
            stop=kwargs.get('stop'),
            stream=False
        )
        return {
            'content': completion.choices[0].message.content,
            'provider': 'openai',
            'model': model,
            'raw_response': json.loads(completion.to_json())
        }

    def _ollama_completion(self, messages, max_tokens, temperature):
        """Call Ollama local LLM via HTTP API."""
        prompt = self._ollama_prompt_from_messages(messages)
        payload = {
            "model": OLLAMA_MODEL,
            "prompt": prompt,
            "stream": False,
            "options": {
                "num_predict": max_tokens,
                "temperature": temperature
            }
        }
        response = requests.post(f"{OLLAMA_BASE_URL}/api/generate", json=payload, timeout=120)
        response.raise_for_status()
        data = response.json()
        return {
            'content': data.get('response', ''),
            'provider': 'ollama',
            'model': OLLAMA_MODEL,
            'raw_response': data
        }
    
    def _ollama_prompt_from_messages(self, messages):
        prompt = ""
        for msg in messages:
            role = msg.get('role', '')
            if isinstance(msg['content'], str):
                content = msg['content']
            elif isinstance(msg['content'], list):
                content = " ".join([item.get('text', '') for item in msg['content'] if isinstance(item, dict)])
            else:
                content = str(msg['content'])
            if role == 'system':
                prompt += f"[SYSTEM]\n{content}\n"
            elif role == 'user':
                prompt += f"[USER]\n{content}\n"
            elif role == 'assistant':
                prompt += f"[ASSISTANT]\n{content}\n"
        return prompt

# Initialize unified client
client = UnifiedLLMClient()

class OrchestratorAgent:
    """Manages the execution of other agents to generate PTSD exposure scenarios."""
    
    def __init__(self, max_plan_trials: int = 5, preferred_provider: str = "openai"):
        self.plan_gen = PlanGenAgent()
        self.impact_eval = ImpactEvalAgent()
        self.story_gen = StoryGenAgent()
        self.patient_data = None
        self.current_sud = None
        self.max_plan_trials = max_plan_trials
        self.output_dir = "generated_stories"
        
        # Set preferred provider
        client.set_primary_provider(preferred_provider)
        
        # Create output directory if it doesn't exist
        if not os.path.exists(self.output_dir):
            os.makedirs(self.output_dir)
        
    def set_preferred_provider(self, provider: str):
        """Set the preferred LLM provider ('openai' or 'ollama')."""
        client.set_primary_provider(provider)
        print(f"Preferred provider set to: {provider}")
    
    def get_current_provider(self):
        """Get the current primary provider."""
        return client.get_current_primary_provider()
    
    def set_patient_data(self, patient_data: str):
        """Set the patient data to be used for generating scenarios."""
        self.patient_data = patient_data
        
    def generate_scenario(self, feedback_callback) -> str:
        """Generate a complete three-part exposure scenario.
        
        Args:
            feedback_callback: Function to get SUD feedback from patient after each part
            
        Returns:
            The complete generated scenario
        """
        if not self.patient_data:
            raise ValueError("Patient data must be set before generating scenarios")
            
        # Get initial SUD level
        self.current_sud = feedback_callback("Please rate your current SUD level (0-100):")
            
        scenario = []
        desired_sud_ranges = {
            1: (50, 70),  # Part 1
            2: (60, 80),  # Part 2
            3: (0, 40)    # Part 3
        }
        
        for part in range(1, 4):
            min_sud, max_sud = desired_sud_ranges[part]
            plan = None
            expected_sud = None
            
            print(f"\n=== Generating Part {part} ===")
            print(f"Target SUD range: {min_sud}-{max_sud}")
            print(f"Starting from SUD level: {self.current_sud}")
            
            # Generate plan until expected SUD is in desired range or max trials reached
            trials = 0
            while trials < self.max_plan_trials:
                print(f"\nAttempt {trials + 1}/{self.max_plan_trials}:")
                
                adjustment = None if not plan else "increase" if expected_sud < min_sud else "decrease"
                previous_plan = plan
                previous_explanation = explanation if 'explanation' in locals() else None
                
                if adjustment:
                    print(f"Adjusting triggers: {adjustment}")
                
                plan = self.plan_gen.generate_plan(
                    part, 
                    self.patient_data,
                    previous_plan if adjustment else None,
                    (min_sud, max_sud),
                    expected_sud,
                    adjustment,
                    previous_explanation
                )
                
                with open(os.path.join(self.output_dir, f"part{part}_plan.txt"), "w", encoding="utf-8") as f:
                    f.write(plan)

                expected_sud, explanation = self.impact_eval.evaluate_sud(
                    plan,
                    self.patient_data,
                    self.current_sud
                )
                
                print(f"Expected SUD: {expected_sud} (target: {min_sud}-{max_sud})")
                
                if min_sud <= expected_sud <= max_sud:
                    print("SUD level in target range ✓")
                    break
                
                print(f"SUD level {'too low' if expected_sud < min_sud else 'too high'}, retrying...")
                trials += 1
            
            if trials == self.max_plan_trials:
                raise RuntimeError(f"Failed to generate plan with desired SUD range ({min_sud}-{max_sud}) after {self.max_plan_trials} attempts")
            
            print("\nGenerating final story from approved plan...")
            story = self.story_gen.generate_story(
                part, 
                plan,
                scenario if scenario else None  # Pass previous parts if they exist
            )
            scenario.append(story)
                       
            # Write story to file
            story_file = os.path.join(self.output_dir, f"part{part}.txt")
            with open(story_file, "w", encoding="utf-8") as f:
                f.write(story)
            
            # Get patient feedback and save it
            self.current_sud = feedback_callback(f"Part {part} complete. Please rate your SUD level (0-100):")
            with open(os.path.join(self.output_dir, f"part{part}_sud.txt"), "w", encoding="utf-8") as f:
                f.write(str(self.current_sud))
            
        return "\n\n".join(scenario)

class PlanGenAgent:
    """Generates exposure scenario plans."""
    
    def __init__(self):
        self._prompt = load_prompt('plan_gen_prompt.txt')
            
    def generate_plan(self, part: int, patient_data: str, previous_plan: str = None, 
                     target_sud_range: tuple = None, previous_sud: int = None, 
                     adjustment: str = None, previous_explanation: str = None, rules: str = None) -> str:
        """Generate a plan for the specified scenario part.
        
        Args:
            part: The part number (1-3)
            patient_data: Description of patient's triggers and history
            previous_plan: The previous plan that needs adjustment (if any)
            target_sud_range: Tuple of (min_sud, max_sud) for the target range
            previous_sud: The SUD level evaluated for the previous plan
            adjustment: Optional direction to adjust trigger intensity ("increase"/"decrease")
            rules: String of rules to follow
        Returns:
            A structured plan for the scenario part
        """
        print(f"\nPlanGenAgent: Generating plan for part {part}")
        print(f"Adjustment needed: {adjustment if adjustment else 'None'}")
        
        # Create chat prompt with system role and context
        messages = [
            {
                "role": "system",
                "content": [
                    {
                        "type": "text",
                        "text": self._prompt + (f"\n\nRules to follow:\n{rules}" if rules else "")
                    }
                ]
            },
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": (f"Patient description:\n{patient_data}\n\n"
                               f"Previous plan to adjust:\n{previous_plan if previous_plan else 'None'}\n"
                               f"Previous plan SUD level: {previous_sud if previous_sud else 'N/A'}\n"
                               f"Previous analysis: {previous_explanation if previous_explanation else 'N/A'}\n"
                               f"Target SUD range: {f'{target_sud_range[0]}-{target_sud_range[1]}' if target_sud_range else 'N/A'}\n\n"
                               f"Adjustment needed: {adjustment if adjustment else 'None'}\n"
                               f"Generate plan for part {part}")
                    }
                ]
            }
        ]
        
        # Generate completion using Azure OpenAI
        completion = client.chat_completion(
            messages,
            max_tokens=2000,
            temperature=0.7,
            model="gpt-4o"  # Use the deployment name from environment variable
        )
        
        # Extract and return the generated plan
        generated_plan = completion['content']

        with open("generated_stories/plan_gen_response.txt", "w", encoding="utf-8") as f:
            f.write("Plan:\n" + str(messages) + "\n\n")
            f.write(generated_plan)

        return generated_plan

class ImpactEvalAgent:
    """Evaluates expected SUD levels for scenario plans."""
    
    def __init__(self):
        self._prompt = load_prompt('impact_eval_prompt.txt')
            
    def evaluate_sud(self, plan: str, patient_data: str, last_patient_sud: int = None, rules: str = None) -> tuple[int, str]:
        """Evaluate expected SUD level for a scenario plan.
        
        Args:
            plan: The scenario plan to evaluate
            patient_data: Patient's trigger and history information
            last_patient_sud: The patient's reported SUD level from the last story part.
                            This helps calibrate expectations based on actual responses.
            rules: String of rules to follow
        Returns:
            Expected SUD level (0-100)
        """
        print("\nImpactEvalAgent: Evaluating expected SUD level")
        print(f"Previous SUD level: {last_patient_sud if last_patient_sud is not None else 'Initial assessment'}")
        
        # Create chat prompt with system role and context
        messages = [
            {
                "role": "system",
                "content": [
                    {
                        "type": "text",
                        "text": self._prompt + (f"\n\nRules to follow:\n{rules}" if rules else "")
                    }
                ]
            },
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": f"Plan:\n{plan}\n\nPatient Data:\n{patient_data}\n\nLast SUD Level: {last_patient_sud if last_patient_sud is not None else 'Initial assessment'}"
                    }
                ]
            }
        ]
        
        # Generate completion using OpenAI or Ollama
        completion = client.chat_completion(messages, max_tokens=1000, temperature=0.3)
        provider = completion.get('provider', 'openai')
        content = completion['content']
        # Save the complete response
        with open("generated_stories/impact_eval_response.txt", "w", encoding="utf-8") as f:
            f.write("Prompt:\n" + str(messages))
            f.write(f"\n\nProvider: {provider}\n")
            f.write("\n\nCompletion:\n" + content)

        try:
            # For both OpenAI and Ollama, try to parse as JSON first
            response = json.loads(content)
            return response["expectedSUD"], response["explanation"]
        except Exception as e:
            print(f"Failed to parse impact evaluation response as JSON: {e}")
            print(f"Response was: {content}")
            # Try to heuristically extract a number and explanation from Ollama/free-form output
            import re
            match = re.search(r'(\d{1,3})', content)
            expected_sud = int(match.group(1)) if match else 50
            explanation = content
            return expected_sud, explanation

class StoryGenAgent:
    """Generates detailed scenario descriptions from plans."""
    
    def __init__(self):
        self._prompt = load_prompt('story_gen_prompt.txt')
            
    def generate_story(self, part: int, plan: str, previous_parts: List[str] = None, rules: str = None) -> str:
        """Generate a detailed story from a scenario plan.
        
        Args:
            part: The part number (1-3)
            plan: The approved plan to expand into a story
            previous_parts: List of previous story parts (if any)
            rules: String of rules to follow
        Returns:
            A detailed scenario description in Hebrew
        """
        print(f"\nStoryGenAgent: Generating story for part {part}")
        print(f"Generating approximately 1000 words...")
        
        # Create chat prompt with system role and context
        messages = [
            {
                "role": "system",
                "content": [
                    {
                        "type": "text",
                        "text": self._prompt + (f"\n\nRules to follow:\n{rules}" if rules else "")
                    }
                ]
            },
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": (
                            f"Previous parts:\n{''.join(previous_parts) if previous_parts else 'None'}\n\n"
                            f"Generate part {part} (please write a story of at least 1000 words, detailed, engaging, and in Hebrew):\n{plan}\n"
                            f"The story MUST be at least 1000 words."
                        )
                    }
                ]
            }
        ]
        
        # Generate completion using OpenAI
        completion = client.chat_completion(
            messages,
            max_tokens=3000,
            temperature=0.7,
            model=os.getenv("DEPLOYMENT_NAME", "gpt-4o")  # Use the deployment name from environment variable
        )
        
        # Extract and return the generated story
        with open("generated_stories/story_gen_response.txt", "w", encoding="utf-8") as f:
            f.write("Prompt:\n" + str(messages))
            f.write("\n\nCompletion:\n" + completion['content'])

        return completion['content']

