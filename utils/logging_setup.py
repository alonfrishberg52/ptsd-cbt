"""
Logging setup utility for PTSD therapy application
Configures structured logging with proper formatting and file rotation
"""

import logging
import logging.handlers
from pathlib import Path
from config.app_config import LoggingConfig
import colorlog
import structlog

def setup_structlog():
    """
    Set up structlog for structured (JSON) logging. Call this if you want JSON logs (e.g., for production).
    """
    structlog.configure(
        processors=[
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.stdlib.add_log_level,
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            structlog.processors.JSONRenderer()
        ],
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        wrapper_class=structlog.stdlib.BoundLogger,
        cache_logger_on_first_use=True,
    )

def setup_logging(log_level: str = None, use_color: bool = True, use_json: bool = False) -> None:
    """
    Set up application-wide logging configuration
    
    Args:
        log_level: Override default log level from config
        use_color: Use colored logs in console
        use_json: Use JSON logs (structlog) in console
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
    
    if use_color:
        color_formatter = colorlog.ColoredFormatter(
            '%(log_color)s%(asctime)s [%(levelname)s] %(name)s: %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S',
            log_colors={
                'DEBUG':    'cyan',
                'INFO':     'green',
                'WARNING':  'yellow',
                'ERROR':    'red',
                'CRITICAL': 'bold_red',
            },
            secondary_log_colors={},
            style='%'
        )
    else:
        color_formatter = logging.Formatter('%(asctime)s [%(levelname)s] %(name)s: %(message)s')
    
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
    
    # Console handler (color or JSON)
    console_handler = logging.StreamHandler()
    if use_json:
        # Use structlog for JSON logs
        setup_structlog()
        import sys
        json_handler = logging.StreamHandler(sys.stdout)
        json_handler.setFormatter(logging.Formatter('%(message)s'))
        json_handler.setLevel(getattr(logging, level.upper(), logging.INFO))
        handlers.append(json_handler)
    else:
        console_handler.setFormatter(color_formatter)
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
    if use_color:
        app_logger.info("Colored console logging enabled")
    if use_json:
        app_logger.info("JSON/structured logging enabled (structlog)")

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