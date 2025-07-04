"""PTSD treatment agents for generating and managing exposure scenarios."""

import os
import json
from typing import Dict, List, Tuple, Optional
from openai import OpenAI
import requests
from pymongo import MongoClient
from dotenv import load_dotenv
from utils.prompt_loader import load_prompt
from utils.logging_setup import get_logger
load_dotenv()

# Set up logging
logger = get_logger(__name__)

# Initialize OpenAI client
# openai_client = OpenAI(
#     api_key=os.getenv("OPENAI_API_KEY"),
#     base_url="https://api.openai.com/v1"
# )

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3")

# MongoDB configuration
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/ptsd_stories")
mongo_client = MongoClient(MONGO_URI)
mongo_db = mongo_client.get_database()

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
        # client.set_primary_provider(preferred_provider)
        
        # Create output directory if it doesn't exist
        if not os.path.exists(self.output_dir):
            os.makedirs(self.output_dir)
        
    def set_preferred_provider(self, provider: str):
        """Set the preferred LLM provider ('openai' or 'ollama')."""
        # client.set_primary_provider(provider)
        logger.info(f"Preferred provider set to: {provider}")
    
    def get_current_provider(self):
        """Get the current primary provider."""
        # return client.get_current_primary_provider()
        return "openai"  # Placeholder return, actual implementation needed
    
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
            logger.error("Patient data must be set before generating scenarios")
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
            
            logger.info(f"Generating Part {part} (Target SUD: {min_sud}-{max_sud}, Starting SUD: {self.current_sud})")
            
            # Generate plan until expected SUD is in desired range or max trials reached
            trials = 0
            while trials < self.max_plan_trials:
                logger.info(f"Plan generation attempt {trials + 1}/{self.max_plan_trials} for part {part}")
                
                adjustment = None if not plan else "increase" if expected_sud < min_sud else "decrease"
                previous_plan = plan
                previous_explanation = explanation if 'explanation' in locals() else None
                
                if adjustment:
                    logger.info(f"Adjusting triggers: {adjustment}")
                
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
                
                logger.info(f"Expected SUD: {expected_sud} (target: {min_sud}-{max_sud})")
                
                if min_sud <= expected_sud <= max_sud:
                    logger.info("SUD level in target range. Proceeding to story generation.")
                    break
                
                logger.warning(f"SUD level {'too low' if expected_sud < min_sud else 'too high'}, retrying...")
                trials += 1
            
            if trials == self.max_plan_trials:
                logger.error(f"Failed to generate plan with desired SUD range ({min_sud}-{max_sud}) after {self.max_plan_trials} attempts")
                raise RuntimeError(f"Failed to generate plan with desired SUD range ({min_sud}-{max_sud}) after {self.max_plan_trials} attempts")
            
            logger.info("Generating final story from approved plan...")
            story = self.story_gen.generate_story(
                part, 
                plan,
                scenario if scenario else None,  # Pass previous parts if they exist
                rules=None,
                min_words=1000,
                patient_context=""
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
        logger.info(f"PlanGenAgent: Generating plan for part {part} (Adjustment: {adjustment if adjustment else 'None'})")
        
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
        logger.info("ImpactEvalAgent: Evaluating expected SUD level")
        logger.debug(f"Previous SUD level: {last_patient_sud if last_patient_sud is not None else 'Initial assessment'}")
        
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
            logger.error(f"Failed to parse impact evaluation response as JSON: {e}", exc_info=True)
            logger.error(f"Response was: {content}")
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
    
    def _get_patient_from_mongo(self, patient_id: str) -> Optional[Dict]:
        """Fetch patient data from MongoDB patients collection."""
        try:
            patient = mongo_db.patients.find_one({'patient_id': patient_id}, {'_id': 0})
            if patient:
                logger.info(f"Successfully retrieved patient data for ID: {patient_id}")
                return patient
            else:
                logger.warning(f"No patient found with ID: {patient_id}")
                return None
        except Exception as e:
            logger.error(f"Error fetching patient from MongoDB: {e}")
            return None
    
    def _get_hebrew_pronoun(self, gender: str) -> str:
        """Get the correct Hebrew pronoun based on gender."""
        gender_pronouns = {
            'male': 'אתה',
            'female': 'את', 
            'neutral': 'אתה'  # Default to male form for neutral
        }
        return gender_pronouns.get(gender.lower(), 'אתה')
    
    def _format_patient_data_for_prompt(self, patient: Dict) -> str:
        """Format patient data from MongoDB into a comprehensive text for the AI prompt."""
        if not patient:
            return "לא נמצא מידע על המטופל"
        
        # Extract and format patient information
        formatted_data = []
        
        # Basic info
        name = patient.get('name', 'לא צוין')
        gender = patient.get('gender', 'neutral')
        age = patient.get('age', 'לא צוין')
        pronoun = self._get_hebrew_pronoun(gender)
        
        formatted_data.append(f"שם המטופל: {name}")
        formatted_data.append(f"גיל: {age}")
        formatted_data.append(f"מין: {gender}")
        formatted_data.append(f"כינוי: {pronoun}")
        
        # Professional/personal info
        if patient.get('occupation'):
            formatted_data.append(f"מקצוע: {patient['occupation']}")
        
        if patient.get('marital_status'):
            formatted_data.append(f"מצב משפחתי: {patient['marital_status']}")
        
        if patient.get('children'):
            formatted_data.append(f"ילדים: {patient['children']}")
        
        # Trauma and triggers
        if patient.get('trauma_type'):
            formatted_data.append(f"סוג טראומה: {patient['trauma_type']}")
        
        if patient.get('trauma_description'):
            formatted_data.append(f"תיאור הטראומה: {patient['trauma_description']}")
        
        # Main symptoms/triggers
        if patient.get('ptsd_symptoms'):
            symptoms = patient['ptsd_symptoms']
            if isinstance(symptoms, list):
                formatted_data.append(f"תסמיני PTSD: {', '.join(symptoms)}")
            else:
                formatted_data.append(f"תסמיני PTSD: {symptoms}")
        
        if patient.get('main_avoidances'):
            avoidances = patient['main_avoidances']
            if isinstance(avoidances, list):
                formatted_data.append(f"התנהגויות הימנעות: {', '.join(avoidances)}")
            else:
                formatted_data.append(f"התנהגויות הימנעות: {avoidances}")
        
        if patient.get('triggers'):
            triggers = patient['triggers']
            if isinstance(triggers, list):
                # Handle both string triggers and dict triggers with SUD levels
                trigger_strs = []
                for trigger in triggers:
                    if isinstance(trigger, dict):
                        if 'name' in trigger:
                            trigger_strs.append(trigger['name'])
                        elif 'trigger' in trigger:
                            trigger_strs.append(trigger['trigger'])
                    else:
                        trigger_strs.append(str(trigger))
                formatted_data.append(f"טריגרים ספציפיים: {', '.join(trigger_strs)}")
            else:
                formatted_data.append(f"טריגרים ספציפיים: {triggers}")
        
        # Coping mechanisms and strengths
        if patient.get('coping_mechanisms'):
            coping = patient['coping_mechanisms']
            if isinstance(coping, list):
                formatted_data.append(f"מנגנוני התמודדות: {', '.join(coping)}")
            else:
                formatted_data.append(f"מנגנוני התמודדות: {coping}")
        
        if patient.get('strengths'):
            strengths = patient['strengths']
            if isinstance(strengths, list):
                formatted_data.append(f"חוזקות אישיות: {', '.join(strengths)}")
            else:
                formatted_data.append(f"חוזקות אישיות: {strengths}")
        
        # Hobbies and interests
        if patient.get('hobbies'):
            hobbies = patient['hobbies']
            if isinstance(hobbies, list):
                formatted_data.append(f"תחביבים: {', '.join(hobbies)}")
            else:
                formatted_data.append(f"תחביבים: {hobbies}")
        
        # Treatment goals
        if patient.get('treatment_goals'):
            goals = patient['treatment_goals']
            if isinstance(goals, list):
                formatted_data.append(f"מטרות טיפול: {', '.join(goals)}")
            else:
                formatted_data.append(f"מטרות טיפול: {goals}")
        
        # Additional context
        if patient.get('background'):
            formatted_data.append(f"רקע נוסף: {patient['background']}")
        
        if patient.get('notes'):
            formatted_data.append(f"הערות: {patient['notes']}")
        
        # Join all formatted data
        return "\n".join(formatted_data)
            
    def generate_story(self, part: int, plan: str, previous_parts: List[str] = None, rules: str = None, min_words: int = 1000, patient_id: str = None, patient_context: str = "") -> str:
        logger.info(f"StoryGenAgent: Generating DEEPLY PERSONALIZED story for part {part} (min words: {min_words})")
        
        # Fetch real patient data from MongoDB if patient_id is provided
        real_patient_data = None
        if patient_id:
            real_patient_data = self._get_patient_from_mongo(patient_id)
            if real_patient_data:
                # Use MongoDB data and format it for the AI
                formatted_patient_data = self._format_patient_data_for_prompt(real_patient_data)
                logger.info(f"Using real patient data from MongoDB for patient_id: {patient_id}")
                logger.debug(f"Formatted patient data: {formatted_patient_data}")
            else:
                logger.warning(f"Could not retrieve patient data for patient_id: {patient_id}, falling back to patient_context")
                formatted_patient_data = patient_context
        else:
            logger.info("No patient_id provided, using patient_context parameter")
            formatted_patient_data = patient_context
        
        # Use the formatted patient data from MongoDB as the primary source
        # This now contains real, structured patient information
        full_patient_context = formatted_patient_data
        
        # Create intelligent summary of previous parts that maintains personal continuity
        previous_summary = ""
        if previous_parts:
            # Don't just truncate - create meaningful summary
            joined = " ".join(previous_parts)
            if len(joined) > 300:
                previous_summary = f"""
סיכום החלקים הקודמים עם המשכיות אישית:
{joined[:300]}...

התקדמות עד כה: בחלקים הקודמים הצלחת להתמודד עם אתגרים והוכחת לעצמך את היכולת שלך להתגבר על הקשיים.
אלמנטים אישיים לשמירה: שמור על החוזקות שגילית בחלקים הקודמים והמשך לבנות עליהם.
"""
            else:
                previous_summary = f"החלקים הקודמים: {joined}"

        # Enhanced personalization prompt that works with ACTUAL patient data
        enhanced_system_prompt = f"""
אתה מטפל PTSD מומחה ביצירת סיפורים טיפוליים מותאמים אישית.

המטרה המרכזית: ליצור סיפור שמשקף בדיוק את המידע האישי הספציפי של המטופל.

{self._prompt}

הנחיות להתאמה אישית מבוססת נתונים אמיתיים:

1. נתח בעמקות את כל המידע על המטופל שסופק
2. זהה פרטים אישיים ספציפיים: שם, גיל, מקצוע, מצב משפחתי, תחביבים, חוזקות
3. זהה את הטריגרים הספציפיים וההימנעויות המדויקות
4. זהה את הסיטואציות והמקומות הרלוונטיים לחיי המטופל
5. שלב את כל הפרטים הללו באופן טבעי ומשמעותי בסיפור
6. התייחס לרקע התרבותי והאישי הספציפי
7. השתמש בדוגמאות מעולמו האמיתי של המטופל
8. צור קשרים בין התוכן הטיפולי לחיים האמיתיים שלו

הנחיות עדינות לשילוב טריגרים ותסמינים:
- שלב את הטריגרים והתסמינים של המטופל בעדינות, דרך תיאורים של סיטואציות, רגשות או אווירה, מבלי להזכיר אותם במפורש או לתייג אותם.
- אל תשתמש בשפה קלינית או ישירה (למשל: "בגלל ה-PTSD שלך" או "אתה מפחד מצעקות").
- תן לקורא להבין את הקשיים דרך החוויה, לא דרך הסבר ישיר.
- הימנע מאזכור מפורש של אבחנה או רשימת טריגרים.

כללי יצירה:
- כתוב בגוף שני ("אתה") לאורך כל הסיפור
- שלב פרטים אישיים באופן טבעי ולא מאולץ
- הראה הבנה עמיקה של המטופל כאדם ייחודי
- התייחס לחוזקות ולמשאבים האישיים שלו
- צור סיפור שמרגיש אמיתי ורלוונטי דווקא לו

{f"כללים נוספים: {rules}" if rules else ""}
"""

        # Enhanced user prompt that emphasizes using actual patient data
        user_prompt = f"""
מידע מלא על המטופל (השתמש בכל הפרטים הספציפיים הללו בסיפור):
{full_patient_context}

{previous_summary}

תוכנית החשיפה לחלק {part}:
{plan}

צור סיפור טיפולי של לפחות {min_words} מילים שמותאם בדיוק למטופל הזה בהתבסס על המידע האמיתי שלו.

דרישות חובה:
1. השתמש בפרטים האישיים הספציפיים שצוינו
2. התייחס למצבים ולמקומות מחייו האמיתיים
3. שלב את הטריגרים והאתגרים הספציפיים שלו
4. הראה הבנה עמיקה של האישיות והרקע שלו
5. צור חיבורים משמעותיים בין הטיפול לחיים שלו
6. השתמש בשפה ובטון שמתאימים לו אישית

הסיפור חייב להרגיש כמו שנכתב במיוחד עבור המטופל הספציפי הזה, לא כמו סיפור גנרי.
"""

        messages = [
            {
                "role": "system",
                "content": enhanced_system_prompt
            },
            {
                "role": "user", 
                "content": user_prompt
            }
        ]
        
        completion = client.chat_completion(
            messages,
            max_tokens=4000,  # Increased for detailed personalization
            temperature=0.8,  # Higher for more creative personalization
            model=os.getenv("DEPLOYMENT_NAME", "gpt-4o")
        )
        
        content = completion['content']
        
        # Analyze personalization quality based on actual patient data usage
        personalization_analysis = self._analyze_personalization_quality(content, full_patient_context)
        
        logger.info(f"Personalization analysis: {personalization_analysis}")
        
        # Save enhanced debugging info
        with open("generated_stories/story_gen_response.txt", "w", encoding="utf-8") as f:
            f.write("DEEPLY PERSONALIZED STORY GENERATION\n")
            f.write("=" * 60 + "\n")
            f.write(f"Full Patient Context Used:\n{full_patient_context}\n\n")
            f.write(f"Personalization Analysis: {personalization_analysis}\n\n")
            f.write("Enhanced Prompt:\n" + str(messages))
            f.write("\n\nGenerated Story:\n" + content)
        
        return content
    
    def _analyze_personalization_quality(self, story: str, patient_data: str) -> str:
        """Analyze how well the story uses actual patient data for personalization."""
        analysis = []
        
        # Extract key info from patient data
        patient_lower = patient_data.lower()
        story_lower = story.lower()
        
        # Check for specific personal elements
        import re
        
        # Names
        names = re.findall(r'(?:שם|name)[:\s]*([א-ת\w]+)', patient_data, re.IGNORECASE)
        if names and any(name.lower() in story_lower for name in names):
            analysis.append("✓ השתמש בשם האישי")
        
        # Ages
        ages = re.findall(r'(?:גיל|age|בן|בת)[:\s]*(\d+)', patient_data)
        if ages and any(age in story for age in ages):
            analysis.append("✓ התייחס לגיל")
        
        # Occupations
        occupations = ['מורה', 'חייל', 'רופא', 'אחות', 'מהנדס', 'עורך דין', 'נהג', 'סטודנט', 'teacher', 'soldier', 'doctor', 'nurse', 'engineer', 'lawyer', 'driver', 'student']
        found_occupations = [occ for occ in occupations if occ in patient_lower and occ in story_lower]
        if found_occupations:
            analysis.append(f"✓ שילב מקצוע: {found_occupations[0]}")
        
        # Specific triggers or situations mentioned
        triggers = re.findall(r'(?:טריגר|trigger|פחד|fear)[:\s]*([א-ת\w\s]+)', patient_data, re.IGNORECASE)
        trigger_matches = 0
        for trigger_text in triggers:
            trigger_words = trigger_text.split()[:3]  # Take first 3 words
            if any(word.lower() in story_lower for word in trigger_words if len(word) > 2):
                trigger_matches += 1
        if trigger_matches > 0:
            analysis.append(f"✓ שילב {trigger_matches} טריגרים ספציפיים")
        
        # Family or personal context
        family_words = ['בן', 'בת', 'נשוי', 'רווק', 'משפחה', 'ילדים', 'married', 'single', 'family', 'children']
        family_found = any(word in patient_lower and word in story_lower for word in family_words)
        if family_found:
            analysis.append("✓ התייחס למצב משפחתי/אישי")
        
        # Location or environmental details
        locations = re.findall(r'(?:מגור|גר|עובד|city|work)[:\s]*([א-ת\w\s]+)', patient_data, re.IGNORECASE)
        if locations and any(loc.lower() in story_lower for loc in locations):
            analysis.append("✓ שילב פרטי מיקום/סביבה")
        
        if not analysis:
            analysis.append("⚠ לא זוהו שימושים ברורים במידע האישי")
        
        return " | ".join(analysis)

def summarize_story_llm(text: str) -> str:
    """Summarize a story using the LLM client (OpenAI/Ollama)."""
    prompt = (
        "סכם את הסיפור הבא עבור קלינאי PTSD. הדגש את עיקרי החוויה, הרגשות, וההתקדמות הטיפולית. סכם ב-3-4 משפטים.\n\n" + text
    )
    messages = [
        {"role": "system", "content": "אתה מסכם סיפורים טיפוליים עבור קלינאים בעברית."},
        {"role": "user", "content": prompt}
    ]
    completion = client.chat_completion(messages, max_tokens=200, temperature=0.4, model="gpt-4o")
    return completion['content'].strip()

