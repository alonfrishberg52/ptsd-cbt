"""
Hebrew text enhancement service for TTS optimization
Handles pronunciation fixes, gender adjustments, and context-aware improvements
"""

import json
import logging
import re
from typing import Dict, Any, Optional
from pathlib import Path
from config.app_config import HebrewConfig

logger = logging.getLogger(__name__)

class HebrewEnhancementService:
    """Service for enhancing Hebrew text for better TTS pronunciation"""
    
    def __init__(self):
        self.config = HebrewConfig()
        self.pronunciation_dict = self._load_pronunciation_dict()
        self.gender_fixes = self._load_gender_fixes()
        self.context_rules = self._load_context_rules()
    
    def _load_pronunciation_dict(self) -> Dict[str, Any]:
        """Load pronunciation dictionary from JSON file"""
        try:
            with open(self.config.PRONUNCIATION_DICT_FILE, 'r', encoding='utf-8') as f:
                data = json.load(f)
                logger.info("Pronunciation dictionary loaded successfully")
                return data
        except FileNotFoundError:
            logger.warning(f"Pronunciation dictionary not found: {self.config.PRONUNCIATION_DICT_FILE}")
            return {}
        except json.JSONDecodeError as e:
            logger.error(f"Error parsing pronunciation dictionary: {e}")
            return {}
    
    def _load_gender_fixes(self) -> Dict[str, Any]:
        """Load gender-specific fixes from JSON file"""
        try:
            with open(self.config.GENDER_FIXES_FILE, 'r', encoding='utf-8') as f:
                data = json.load(f)
                logger.info("Gender fixes loaded successfully")
                return data
        except FileNotFoundError:
            logger.warning(f"Gender fixes file not found: {self.config.GENDER_FIXES_FILE}")
            return {}
        except json.JSONDecodeError as e:
            logger.error(f"Error parsing gender fixes: {e}")
            return {}
    
    def _load_context_rules(self) -> Dict[str, Any]:
        """Load context-aware enhancement rules from JSON file"""
        try:
            with open(self.config.CONTEXT_RULES_FILE, 'r', encoding='utf-8') as f:
                data = json.load(f)
                logger.info("Context rules loaded successfully")
                return data
        except FileNotFoundError:
            logger.warning(f"Context rules file not found: {self.config.CONTEXT_RULES_FILE}")
            return {}
        except json.JSONDecodeError as e:
            logger.error(f"Error parsing context rules: {e}")
            return {}
    
    def enhance_text_for_tts(self, text: str, patient_gender: str = 'neutral') -> str:
        """
        Enhance Hebrew text for better TTS pronunciation
        
        Args:
            text: Hebrew text to enhance
            patient_gender: 'male', 'female', or 'neutral' for gender-appropriate language
            
        Returns:
            Enhanced text with better pronunciation markers
        """
        if not text or not isinstance(text, str):
            logger.warning("Invalid text provided for enhancement")
            return text or ""
        
        logger.debug(f"Enhancing text for gender: {patient_gender}")
        
        # Start with normalized text
        enhanced_text = text.strip()
        
        # Apply basic pronunciation fixes
        enhanced_text = self._apply_pronunciation_fixes(enhanced_text)
        
        # Apply gender-specific adjustments
        enhanced_text = self._apply_gender_fixes(enhanced_text, patient_gender)
        
        # Apply context-aware improvements
        enhanced_text = self._apply_context_rules(enhanced_text)
        
        # Add natural pauses and formatting
        enhanced_text = self._add_natural_pauses(enhanced_text)
        
        logger.debug(f"Text enhancement completed. Original: {len(text)} chars, Enhanced: {len(enhanced_text)} chars")
        return enhanced_text
    
    def _apply_pronunciation_fixes(self, text: str) -> str:
        """Apply basic pronunciation fixes from dictionary"""
        enhanced_text = text
        
        # Apply fixes from all categories in pronunciation dictionary
        for category, fixes in self.pronunciation_dict.items():
            if isinstance(fixes, dict):
                for original, enhanced in fixes.items():
                    enhanced_text = enhanced_text.replace(original, enhanced)
        
        return enhanced_text
    
    def _apply_gender_fixes(self, text: str, gender: str) -> str:
        """Apply gender-specific linguistic adjustments"""
        if gender not in ['male', 'female']:
            return text
        
        enhanced_text = text
        gender_key = f"{gender}_fixes"
        
        if gender_key in self.gender_fixes:
            fixes = self.gender_fixes[gender_key]
            for original, replacement in fixes.items():
                enhanced_text = enhanced_text.replace(original, replacement)
                logger.debug(f"Applied gender fix: {original} -> {replacement}")
        
        return enhanced_text
    
    def _apply_context_rules(self, text: str) -> str:
        """Apply context-aware pronunciation improvements"""
        enhanced_text = text
        
        if not self.context_rules:
            return enhanced_text
        
        # Apply sentence pattern enhancements
        sentence_patterns = self.context_rules.get('sentence_patterns', {})
        for pattern_type, pattern_data in sentence_patterns.items():
            patterns = pattern_data.get('patterns', [])
            enhancements = pattern_data.get('enhancements', {})
            
            # Check if text contains any of the patterns
            for pattern in patterns:
                if pattern in enhanced_text:
                    logger.debug(f"Found pattern '{pattern}' in text, applying {pattern_type} enhancements")
                    
                    # Apply specific enhancements for this pattern type
                    for original, enhanced in enhancements.items():
                        enhanced_text = enhanced_text.replace(original, enhanced)
        
        # Apply pause rules
        pause_rules = self.context_rules.get('pause_rules', {})
        
        # Add pauses before important words
        important_words = pause_rules.get('before_important_words', [])
        for word in important_words:
            enhanced_text = enhanced_text.replace(f" {word}", f" ...{word}")
        
        # Add breathing spaces
        breathing_words = pause_rules.get('breathing_space', [])
        for word in breathing_words:
            enhanced_text = enhanced_text.replace(word, f"{word}...")
        
        return enhanced_text
    
    def _add_natural_pauses(self, text: str) -> str:
        """Add natural pauses for better reading flow"""
        enhanced_text = text
        
        # Ensure proper spacing after punctuation
        enhanced_text = re.sub(r'([.!?])\\s*', r'\\1 ', enhanced_text)
        enhanced_text = re.sub(r',\\s*', ', ', enhanced_text)
        enhanced_text = re.sub(r':\\s*', ': ', enhanced_text)
        
        # Add line breaks between sentences for breathing pauses
        enhanced_text = re.sub(r'([.!?])\\s+([א-ת])', r'\\1\\n\\n\\2', enhanced_text)
        
        # Add subtle pauses in long sentences (more than 15 words)
        sentences = enhanced_text.split('.')
        enhanced_sentences = []
        
        for sentence in sentences:
            words = sentence.split()
            if len(words) > 15:
                # Add a pause in the middle of long sentences
                mid_point = len(words) // 2
                words.insert(mid_point, '...')
                sentence = ' '.join(words)
            enhanced_sentences.append(sentence)
        
        enhanced_text = '.'.join(enhanced_sentences)
        
        return enhanced_text
    
    def get_emotional_context(self, text: str) -> Dict[str, int]:
        """
        Analyze emotional context of the text
        
        Args:
            text: Text to analyze
            
        Returns:
            Dictionary with emotion scores
        """
        emotional_context = self.context_rules.get('emotional_context', {})
        emotions = {
            'anxiety': 0,
            'calm': 0,
            'strength': 0
        }
        
        text_lower = text.lower()
        
        # Count anxiety-related words
        anxiety_words = emotional_context.get('anxiety_words', [])
        emotions['anxiety'] = sum(1 for word in anxiety_words if word in text_lower)
        
        # Count calm-related words
        calm_words = emotional_context.get('calm_words', [])
        emotions['calm'] = sum(1 for word in calm_words if word in text_lower)
        
        # Count strength-related words
        strength_words = emotional_context.get('strength_words', [])
        emotions['strength'] = sum(1 for word in strength_words if word in text_lower)
        
        logger.debug(f"Emotional analysis: {emotions}")
        return emotions