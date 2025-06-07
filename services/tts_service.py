"""
Text-to-Speech service for PTSD therapy application
Handles Hebrew TTS generation with enhanced pronunciation and caching
"""

import os
import logging
import hashlib
from datetime import datetime
from typing import Optional, Dict, Any
from pathlib import Path
from gtts import gTTS

from config.app_config import TTSConfig
from services.validation_service import ValidationService, ValidationError
from services.hebrew_enhancement_service import HebrewEnhancementService

logger = logging.getLogger(__name__)

class TTSError(Exception):
    """Custom exception for TTS-related errors"""
    pass

class TTSService:
    """Service for generating high-quality Hebrew TTS audio files"""
    
    def __init__(self, 
                 validation_service: Optional[ValidationService] = None,
                 hebrew_service: Optional[HebrewEnhancementService] = None):
        """
        Initialize TTS service with dependency injection
        
        Args:
            validation_service: Service for input validation
            hebrew_service: Service for Hebrew text enhancement
        """
        self.config = TTSConfig()
        self.validation_service = validation_service or ValidationService()
        self.hebrew_service = hebrew_service or HebrewEnhancementService()
        self._audio_cache = {}  # Simple in-memory cache
        
        # Ensure audio directory exists
        self._ensure_audio_directory()
    
    def _ensure_audio_directory(self) -> None:
        """Ensure the audio output directory exists"""
        audio_dir = Path(self.config.AUDIO_DIR)
        try:
            audio_dir.mkdir(parents=True, exist_ok=True)
            logger.info(f"Audio directory ready: {audio_dir}")
        except OSError as e:
            logger.error(f"Failed to create audio directory {audio_dir}: {e}")
            raise TTSError(f"Cannot create audio directory: {e}")
    
    def _get_cache_key(self, text: str, gender: str) -> str:
        """Generate cache key for text and gender combination"""
        content = f"{text}_{gender}"
        return hashlib.md5(content.encode('utf-8')).hexdigest()
    
    def _get_voice_config(self, gender: str) -> Dict[str, Any]:
        """
        Get TTS voice configuration based on gender
        
        Args:
            gender: Patient gender for voice selection
            
        Returns:
            Voice configuration dictionary
        """
        if gender in self.config.VOICE_SETTINGS:
            config = self.config.VOICE_SETTINGS[gender].copy()
            logger.debug(f"Using voice config for gender '{gender}': {config}")
            return config
        else:
            logger.warning(f"Unknown gender '{gender}', using neutral voice")
            return self.config.VOICE_SETTINGS['neutral'].copy()
    
    def generate_audio_file(self, 
                          text: str, 
                          patient_data: Optional[Dict[str, Any]] = None,
                          use_cache: bool = True) -> Optional[str]:
        """
        Generate high-quality Hebrew TTS audio file
        
        Args:
            text: Hebrew text to convert to speech
            patient_data: Optional patient data for personalization
            use_cache: Whether to use cached audio files
            
        Returns:
            Audio filename if successful, None if failed
            
        Raises:
            TTSError: If TTS generation fails
            ValidationError: If input validation fails
        """
        try:
            # Validate input text
            self.validation_service.validate_text_for_tts(text)
            
            # Determine patient gender
            patient_gender = 'neutral'
            if patient_data and isinstance(patient_data, dict):
                patient_gender = patient_data.get('gender', 'neutral')
                logger.debug(f"Using patient gender: {patient_gender}")
            
            # Check cache first
            cache_key = self._get_cache_key(text, patient_gender)
            if use_cache and cache_key in self._audio_cache:
                cached_file = self._audio_cache[cache_key]
                if self._verify_audio_file(cached_file):
                    logger.info(f"Using cached audio file: {cached_file}")
                    return cached_file
                else:
                    # Remove invalid cache entry
                    del self._audio_cache[cache_key]
                    logger.warning(f"Removed invalid cached file: {cached_file}")
            
            # Enhance text for better Hebrew pronunciation
            enhanced_text = self.hebrew_service.enhance_text_for_tts(text, patient_gender)
            logger.debug(f"Text enhanced from {len(text)} to {len(enhanced_text)} characters")
            
            # Get voice configuration
            voice_config = self._get_voice_config(patient_gender)
            
            # Configure TTS settings
            tts_config = {
                'text': enhanced_text,
                **voice_config
            }
            
            # Generate TTS
            logger.info("Generating TTS audio...")
            tts = gTTS(**tts_config)
            
            # Create unique filename
            audio_file = self._generate_filename()
            audio_path = Path(self.config.AUDIO_DIR) / audio_file
            
            # Save audio file
            tts.save(str(audio_path))
            logger.info(f"TTS audio saved: {audio_file}")
            
            # Verify file was created successfully
            if not self._verify_audio_file(audio_file):
                raise TTSError(f"TTS file creation failed or file is empty: {audio_path}")
            
            # Cache the result
            if use_cache:
                self._audio_cache[cache_key] = audio_file
                logger.debug(f"Audio file cached with key: {cache_key}")
            
            # Log emotional context for therapy insights
            emotions = self.hebrew_service.get_emotional_context(text)
            logger.info(f"Audio generated with emotional context: {emotions}")
            
            return audio_file
            
        except ValidationError:
            # Re-raise validation errors
            raise
        except Exception as e:
            logger.error(f"TTS generation error: {e}")
            raise TTSError(f"Failed to generate TTS audio: {e}")
    
    def _generate_filename(self) -> str:
        """Generate unique filename for audio file"""
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S_%f')[:-3]  # Include milliseconds
        return f"{self.config.FILE_PREFIX}_{timestamp}{self.config.FILE_EXTENSION}"
    
    def _verify_audio_file(self, audio_file: str) -> bool:
        """
        Verify that audio file exists and is valid
        
        Args:
            audio_file: Filename of the audio file
            
        Returns:
            True if file is valid, False otherwise
        """
        audio_path = Path(self.config.AUDIO_DIR) / audio_file
        
        try:
            if not audio_path.exists():
                logger.warning(f"Audio file does not exist: {audio_path}")
                return False
            
            if audio_path.stat().st_size == 0:
                logger.warning(f"Audio file is empty: {audio_path}")
                return False
            
            # Basic file format check
            if not audio_file.endswith(self.config.FILE_EXTENSION):
                logger.warning(f"Audio file has wrong extension: {audio_file}")
                return False
            
            return True
            
        except OSError as e:
            logger.error(f"Error verifying audio file {audio_path}: {e}")
            return False
    
    def clear_cache(self) -> None:
        """Clear the audio cache"""
        self._audio_cache.clear()
        logger.info("Audio cache cleared")
    
    def get_cache_info(self) -> Dict[str, Any]:
        """
        Get information about the current cache state
        
        Returns:
            Dictionary with cache statistics
        """
        return {
            'cache_size': len(self._audio_cache),
            'cached_files': list(self._audio_cache.values())
        }
    
    def cleanup_old_files(self, max_age_hours: int = 24) -> int:
        """
        Clean up old audio files
        
        Args:
            max_age_hours: Maximum age of files to keep in hours
            
        Returns:
            Number of files deleted
        """
        audio_dir = Path(self.config.AUDIO_DIR)
        deleted_count = 0
        cutoff_time = datetime.now().timestamp() - (max_age_hours * 3600)
        
        try:
            for audio_file in audio_dir.glob(f"{self.config.FILE_PREFIX}_*{self.config.FILE_EXTENSION}"):
                if audio_file.stat().st_mtime < cutoff_time:
                    audio_file.unlink()
                    deleted_count += 1
                    logger.debug(f"Deleted old audio file: {audio_file.name}")
            
            logger.info(f"Cleanup completed: {deleted_count} files deleted")
            return deleted_count
            
        except OSError as e:
            logger.error(f"Error during cleanup: {e}")
            return 0