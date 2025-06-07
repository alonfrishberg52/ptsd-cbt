"""
Application configuration settings
Centralizes hard-coded values for better maintainability
"""

import os
from typing import Dict, Tuple, Any

class TTSConfig:
    """Text-to-Speech configuration"""
    LANGUAGE_CODE = 'iw'  # Hebrew language code
    SLOW_SPEECH = False
    TLD = 'com'  # Use google.com for better Hebrew support
    AUDIO_DIR = 'static/audio'
    FILE_PREFIX = 'therapy_story'
    FILE_EXTENSION = '.mp3'
    
    # Voice settings based on gender
    VOICE_SETTINGS = {
        'male': {
            'lang': 'iw',
            'tld': 'com',
            'slow': False
        },
        'female': {
            'lang': 'iw', 
            'tld': 'com',
            'slow': False
        },
        'neutral': {
            'lang': 'iw',
            'tld': 'com', 
            'slow': False
        }
    }

class ExposureConfig:
    """Exposure therapy configuration"""
    SUD_RANGES = {
        1: (30, 50),  # Gentle introduction
        2: (40, 70),  # Moderate exposure
        3: (20, 40),  # Resolution and calming
    }
    
    DEFAULT_SUD_RANGE = (30, 50)
    VALID_EXPOSURE_STAGES = [1, 2, 3]

class ValidationConfig:
    """Input validation configuration"""
    REQUIRED_PATIENT_FIELDS = ['name']
    VALID_GENDERS = ['male', 'female', 'neutral']
    MAX_TEXT_LENGTH = 10000  # Maximum length for TTS text
    MIN_TEXT_LENGTH = 1
    
    # Patient profile validation rules
    PATIENT_PROFILE_SCHEMA = {
        'name': str,
        'ptsd_symptoms': list,
        'main_avoidances': list,
        'general_symptoms': dict,
        'somatic': dict,
        'pcl5': list,
        'phq9': list,
        'gender': str
    }

class LoggingConfig:
    """Logging configuration"""
    LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')
    LOG_FORMAT = '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    LOG_FILE = 'logs/ptsd_app.log'
    MAX_LOG_SIZE = 10 * 1024 * 1024  # 10MB
    BACKUP_COUNT = 5

class HebrewConfig:
    """Hebrew language processing configuration"""
    PRONUNCIATION_DICT_FILE = 'config/hebrew_pronunciation.json'
    GENDER_FIXES_FILE = 'config/hebrew_gender_fixes.json'
    CONTEXT_RULES_FILE = 'config/hebrew_context_rules.json'