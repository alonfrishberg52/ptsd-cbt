from utils.logging_setup import get_logger
from datetime import datetime
from flask import current_app
from pymongo import ASCENDING, DESCENDING
from services.validation_service import ValidationService, ValidationError

logger = get_logger(__name__)

class FeedbackService:
    """
    Collects and processes SUD ratings and other feedback.
    Handles both web and mobile feedback schemas.
    """
    def __init__(self, mongo_instance=None):
        self.validation = ValidationService()
        self.mongo = mongo_instance

    def record_feedback(self, patient_id, feedback: dict) -> str:
        """Record SUD or other feedback for a patient. Returns feedback_id."""
        if self.mongo:
            db = self.mongo.db
        else:
            db = current_app.extensions['pymongo'].db
        feedback_doc = dict(feedback)
        feedback_doc['patient_id'] = patient_id
        feedback_doc['timestamp'] = feedback_doc.get('timestamp', datetime.utcnow())
        feedback_doc['created_at'] = datetime.utcnow()
        # Validate numeric fields if present
        try:
            if 'numeric' in feedback_doc:
                self.validation.validate_sud_score(feedback_doc['numeric'])
            if 'final_sud' in feedback_doc:
                self.validation.validate_sud_score(feedback_doc['final_sud'])
        except ValidationError as e:
            logger.warning(f"Invalid feedback for patient {patient_id}: {e}")
            raise
        # Insert into session_feedback collection
        result = db.session_feedback.insert_one(feedback_doc)
        logger.info(f"Saved feedback for patient {patient_id} (feedback_id={result.inserted_id})")
        # Optionally, update patient doc with feedback summary
        db.patients.update_one({'patient_id': patient_id}, {'$push': {'feedback': feedback_doc}})
        return str(result.inserted_id)

    def get_feedback_history(self, patient_id: str) -> list:
        """Retrieve feedback history for a patient, sorted by date (newest first)."""
        if self.mongo:
            db = self.mongo.db
        else:
            db = current_app.extensions['pymongo'].db
        feedbacks = list(db.session_feedback.find({'patient_id': patient_id}).sort('created_at', DESCENDING))
        logger.info(f"Fetched {len(feedbacks)} feedback entries for patient {patient_id}")
        return feedbacks

    def get_recent_feedback(self, limit=10) -> list:
        """Get recent feedback for dashboard or analytics."""
        if self.mongo:
            db = self.mongo.db
        else:
            db = current_app.extensions['pymongo'].db
        feedbacks = list(db.session_feedback.find({}).sort('created_at', DESCENDING).limit(limit))
        logger.info(f"Fetched {len(feedbacks)} recent feedback entries for dashboard")
        return feedbacks 