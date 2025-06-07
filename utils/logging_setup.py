"""
Logging setup utility for PTSD therapy application
Configures structured logging with proper formatting and file rotation
"""

import logging
import logging.handlers
import os
from pathlib import Path
from config.app_config import LoggingConfig

def setup_logging(log_level: str = None) -> None:
    """
    Set up application-wide logging configuration
    
    Args:
        log_level: Override default log level from config
    """
    config = LoggingConfig()
    
    # Use provided log level or fall back to config
    level = log_level or config.LOG_LEVEL
    
    # Ensure logs directory exists
    log_file_path = Path(config.LOG_FILE)
    log_file_path.parent.mkdir(parents=True, exist_ok=True)
    
    # Create formatters
    detailed_formatter = logging.Formatter(
        config.LOG_FORMAT,
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    
    simple_formatter = logging.Formatter(
        '%(name)s - %(levelname)s - %(message)s'
    )
    
    # Create handlers
    handlers = []
    
    # File handler with rotation
    file_handler = logging.handlers.RotatingFileHandler(
        config.LOG_FILE,
        maxBytes=config.MAX_LOG_SIZE,
        backupCount=config.BACKUP_COUNT,
        encoding='utf-8'
    )
    file_handler.setFormatter(detailed_formatter)
    file_handler.setLevel(logging.DEBUG)
    handlers.append(file_handler)
    
    # Console handler for development
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(simple_formatter)
    console_handler.setLevel(getattr(logging, level.upper(), logging.INFO))
    handlers.append(console_handler)
    
    # Configure root logger
    logging.basicConfig(
        level=logging.DEBUG,
        handlers=handlers,
        force=True  # Override any existing configuration
    )
    
    # Set specific log levels for noisy third-party libraries
    logging.getLogger('gtts').setLevel(logging.WARNING)
    logging.getLogger('requests').setLevel(logging.WARNING)
    logging.getLogger('urllib3').setLevel(logging.WARNING)
    
    # Create application logger
    app_logger = logging.getLogger('ptsd_app')
    app_logger.info("Logging system initialized")
    app_logger.info(f"Log level: {level}")
    app_logger.info(f"Log file: {config.LOG_FILE}")

def get_logger(name: str) -> logging.Logger:
    """
    Get a configured logger for a specific module
    
    Args:
        name: Logger name (usually __name__)
        
    Returns:
        Configured logger instance
    """
    return logging.getLogger(f'ptsd_app.{name}')

def log_function_call(logger: logging.Logger, func_name: str, **kwargs):
    """
    Log function calls with parameters for debugging
    
    Args:
        logger: Logger instance
        func_name: Name of the function being called
        **kwargs: Function parameters to log
    """
    param_str = ', '.join(f"{k}={v}" for k, v in kwargs.items())
    logger.debug(f"Calling {func_name}({param_str})")

def log_performance(logger: logging.Logger, operation: str, duration: float, **metadata):
    """
    Log performance metrics
    
    Args:
        logger: Logger instance
        operation: Name of the operation
        duration: Duration in seconds
        **metadata: Additional metadata to log
    """
    metadata_str = ', '.join(f"{k}={v}" for k, v in metadata.items())
    logger.info(f"Performance: {operation} took {duration:.3f}s - {metadata_str}")

def log_error_with_context(logger: logging.Logger, error: Exception, context: dict = None):
    """
    Log errors with additional context
    
    Args:
        logger: Logger instance
        error: Exception that occurred
        context: Additional context information
    """
    context = context or {}
    context_str = ', '.join(f"{k}={v}" for k, v in context.items())
    logger.error(f"Error occurred: {error} - Context: {context_str}", exc_info=True)