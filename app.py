"""
Flask application with MongoDB integration and text-to-speech capabilities for PTSD story generation.
"""

from flask import Flask, render_template, request, jsonify, send_file, session, redirect, flash, url_for
from flask_pymongo import PyMongo
from datetime import datetime, timedelta
import os
from agents.PTSDAgents import OrchestratorAgent, summarize_story_llm
from agents.PTSDEvalTools import PatientDataParser
from services.exposure import ExposureProgressionService
from services.exposure_plan_service import ExposurePlanService
from services.mcp_integration import mcp_provider
from services.mcp_knowledge_graph_client import mcp_client
from bson import ObjectId
import uuid
from flask_cors import CORS
import socket
from utils.exa_client import (
    search_ptsd_research, search_cbt_techniques, search_exposure_therapy_methods,
    search_sud_scale_research, search_narrative_therapy_ptsd, search_therapist_resources,
    search_patient_coping_strategies, search_trauma_triggers_management
)

app = Flask(__name__)
CORS(app, supports_credentials=True, resources={r"/*": {"origins": "*"}})
app.secret_key = os.environ.get('FLASK_SECRET_KEY', 'dev_secret_key')

# MongoDB configuration
app.config["MONGO_URI"] = "mongodb://localhost:27017/ptsd_stories"
mongo = PyMongo(app)

# Initialize the orchestrator
orchestrator = OrchestratorAgent(max_plan_trials=5, preferred_provider="openai")

# Ensure audio directory exists
AUDIO_DIR = os.path.join('static', 'audio')
os.makedirs(AUDIO_DIR, exist_ok=True)

exposure_plan_service = ExposurePlanService()
exposure_service = ExposureProgressionService()

# --- Audit logging helper ---
def log_audit(action_type, patient_name, details=None):
    mongo.db.audit.insert_one({
        'type': action_type,
        'patient_name': patient_name,
        'timestamp': datetime.utcnow(),
        'details': details or ''
    })

@app.route('/')
def root():
    return redirect('/welcome')

@app.route('/api/parse-patient-data', methods=['POST'])
def parse_patient_data():
    """Parse patient data and return structured information."""
    data = request.json
    patient_data = data.get('patient_data', '')
    
    try:
        parser = PatientDataParser()
        parsed_data = parser.parse(patient_data)
        # Store in session for later use
        session['parsed_patient_data'] = parsed_data
        # Store in MongoDB
        mongo.db.patient_data.insert_one({
            'data': parsed_data,
            'timestamp': datetime.utcnow()
        })
        
        return jsonify({
            'status': 'success',
            'data': parsed_data
        })
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 400

@app.route('/api/start-scenario', methods=['POST'])
def start_scenario():
    data = request.json
    initial_sud = data.get('initial_sud')
    if initial_sud is None:
        return jsonify({'status': 'error', 'message': 'Missing initial SUD value.'}), 400
    try:
        initial_sud = int(initial_sud)
    except Exception:
        return jsonify({'status': 'error', 'message': 'Invalid SUD value.'}), 400

    # Support both session-based (web) and request-based (mobile) patient_id
    patient_id = data.get('patient_id') or session.get('patient_id')
    if not patient_id:
        return jsonify({'status': 'error', 'message': 'No patient ID provided.'}), 400

    patient_profile = mongo.db.patients.find_one({'patient_id': patient_id}, {'_id': 0})
    if not patient_profile:
        return jsonify({'status': 'error', 'message': 'Patient profile not found.'}), 400

    # Generate first part
    result = exposure_service.story_service.generate_story(
        patient_profile=patient_profile,
        exposure_stage=1,
        last_sud=initial_sud,
        previous_parts=None
    )
    # Save to MongoDB
    story_doc = {
        'patient_id': patient_id,
        'stage': 1,
        'result': result,
        'sud': initial_sud,
        'timestamp': datetime.utcnow()
    }
    mongo.db.stories.insert_one(story_doc)
    log_audit('update_story', patient_profile.get('name', patient_id), f"Started scenario, SUD: {initial_sud}")
    
    # For mobile, return scenario state in response instead of session
    scenario_state = {
        'stage': 1,
        'sud_history': [initial_sud],
        'patient_id': patient_id
    }
    
    # Also save to session for web compatibility
    session['scenario_state'] = scenario_state
    
    return jsonify({
        'status': 'success',
        'stage': 1,
        'result': result,
        'scenario_state': scenario_state,
        'patient_name': patient_profile.get('name', 'Unknown')
    })

@app.route('/api/next-scenario', methods=['POST'])
def next_scenario():
    """Continue to next scenario/chapter with mobile compatibility"""
    data = request.get_json()
    
    # Mobile compatibility - accept patient_id in request body
    if 'patient_id' in data:
        patient_id = data['patient_id']
        current_sud = data.get('current_sud', 50)
        scenario_state = data.get('scenario_state', {})
    else:
        # Web compatibility - use session
        patient_id = session.get('current_patient_id')
        current_sud = data.get('current_sud', 50)
        scenario_state = session.get('scenario_state', {})
    
    if not patient_id:
        return jsonify({'status': 'error', 'message': 'לא נמצא מטופל פעיל'})
    
    try:
        # Update SUD in scenario state
        scenario_state['current_sud'] = current_sud
        
        # Get current stage
        current_stage = scenario_state.get('current_stage', 1)
        
        if current_stage >= 3:
            return jsonify({
                'status': 'done',
                'message': 'כל הפרקים הושלמו בהצלחה!'
            })
        
        # Move to next stage
        next_stage = current_stage + 1
        scenario_state['current_stage'] = next_stage
        
        # Generate next chapter
        next_story = generate_next_chapter(patient_id, scenario_state, next_stage)
        
        # Save updated scenario state
        session['scenario_state'] = scenario_state
        
        return jsonify({
            'status': 'success',
            'result': next_story,
            'stage': next_stage,
            'scenario_state': scenario_state
        })
        
    except Exception as e:
        print(f"Next scenario error: {e}")
        return jsonify({'status': 'error', 'message': 'שגיאה ביצירת הפרק הבא'})

@app.route('/api/stories', methods=['GET', 'POST'])
def api_stories():
    if request.method == 'GET':
        stories = list(mongo.db.stories.find({}, {'_id': 0}))
        return jsonify({'status': 'success', 'stories': stories})
    elif request.method == 'POST':
        try:
            story_data = request.json
            
            # Validate required fields
            if not story_data.get('patient_id'):
                return jsonify({'status': 'error', 'message': 'Patient ID is required'}), 400
            
            # Verify patient exists
            patient = mongo.db.patients.find_one({'patient_id': story_data['patient_id']}, {'name': 1, '_id': 0})
            if not patient:
                return jsonify({'status': 'error', 'message': 'Patient not found'}), 404
            
            # Generate unique story_id
            story_data['story_id'] = str(uuid.uuid4())
            
            # Set default values
            story_data.setdefault('story_type', 'exposure')
            story_data.setdefault('exposure_level', 1)
            story_data.setdefault('status', 'pending')
            story_data.setdefault('stage', 1)
            
            # Add timestamps
            story_data['created_at'] = datetime.utcnow()
            story_data['updated_at'] = datetime.utcnow()
            
            # If content provided, use it as initial story
            if story_data.get('content'):
                story_data['result'] = {
                    'story': story_data['content'],
                    'audio_file': None
                }
                # Create summary from content
                content_words = story_data['content'].split()
                story_data['summary'] = ' '.join(content_words[:30]) + ('...' if len(content_words) > 30 else '')
            else:
                # Generate story using the orchestrator/exposure service
                try:
                    patient_profile = mongo.db.patients.find_one({'patient_id': story_data['patient_id']}, {'_id': 0})
                    
                    # Use existing story generation service
                    result = exposure_service.story_service.generate_story(
                        patient_profile=patient_profile,
                        exposure_stage=int(story_data.get('exposure_level', 1)),
                        last_sud=5,  # Default SUD value
                        previous_parts=None
                    )
                    
                    story_data['result'] = result
                    # Create summary from generated story
                    if result and result.get('story'):
                        story_words = result['story'].split()
                        story_data['summary'] = ' '.join(story_words[:30]) + ('...' if len(story_words) > 30 else '')
                    
                except Exception as e:
                    # If story generation fails, create a placeholder
                    story_data['result'] = {
                        'story': f"סיפור חשיפה עבור {patient.get('name', 'מטופל')} - יוצר באופן אוטומטי",
                        'audio_file': None
                    }
                    story_data['summary'] = "סיפור חשיפה חדש ממתין לעריכה"
            
            # Insert story into database
            mongo.db.stories.insert_one(story_data)
            
            # Log audit trail
            log_audit('create_story', patient.get('name', story_data['patient_id']), 
                     f"Story created via API - Type: {story_data.get('story_type', 'unknown')}")
            
            return jsonify({
                'status': 'success', 
                'message': 'Story created successfully',
                'story_id': story_data['story_id'],
                'patient_name': patient.get('name', 'Unknown')
            })
            
        except Exception as e:
            return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/stories/list', methods=['GET'])
def get_stories():
    """Get all generated stories with proper formatting."""
    try:
        stories = list(mongo.db.stories.find({}, {'_id': 1, 'timestamp': 1, 'patient_id': 1, 'stage': 1, 'result': 1, 'story_id': 1, 'summary': 1, 'status': 1}))
        for s in stories:
            s['story_id'] = s.get('story_id', str(s['_id']))
            s['short_id'] = s['story_id'][-6:]
            # Recursively convert ObjectIds in all nested fields
            for key in s:
                s[key] = convert_objectids(s[key])
            # Ensure summary exists
            story_text = s.get('result', {}).get('story', '')
            if 'summary' not in s or not s.get('summary'):
                s['summary'] = ' '.join(story_text.split()[:30]) + ('...' if len(story_text.split()) > 30 else '')
            # Ensure feedback fields exist
            for fb_key in ['habituation_feedback', 'narrative_feedback', 'dialogue_feedback', 'rule_feedback', 'hebrew_feedback']:
                if fb_key not in s:
                    s[fb_key] = ''
        return jsonify({
            'status': 'success',
            'stories': stories
        })
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 400

@app.route('/dashboard/patients')
def dashboard_patients():
    patients = list(mongo.db.patients.find({}, {'_id': 0}))
    return render_template('dashboard/patient_list.html', patients=patients)

@app.route('/dashboard/plans')
def dashboard_plans():
    return render_template('dashboard/plan_review.html')

@app.route('/dashboard/patients/create', methods=['GET', 'POST'])
def create_patient():
    if request.method == 'POST':
        data = {
            'first_name': request.form.get('first_name'),
            'last_name': request.form.get('last_name'),
            'gender': request.form.get('gender'),
            'birthdate': request.form.get('birthdate'),
            'age': request.form.get('age'),
            'city': request.form.get('city'),
            'street': request.form.get('street'),
            'house_number': request.form.get('house_number'),
            'education': request.form.get('education'),
            'occupation': request.form.get('occupation'),
            'hobbies': request.form.getlist('hobbies'),
            'pet': request.form.get('pet'),
            'general_info': request.form.get('general_info', ''),
        }
        # PTSD symptoms (comma separated)
        ptsd_symptoms = request.form.get('ptsd_symptoms', '')
        data['ptsd_symptoms'] = [s.strip() for s in ptsd_symptoms.split(',') if s.strip()]
        # General symptoms (ratings)
        general_symptoms = {}
        for key, label in [
            ('intrusion', 'דחיקות'),
            ('arousal', 'ערנות'),
            ('thoughts', 'מחשבות טורדניות'),
            ('avoidance', 'הימנעויות'),
            ('mood', 'שינוי מצב רוח')
        ]:
            val = request.form.get(f'general_symptoms_{key}')
            if val:
                general_symptoms[key] = int(val)
        data['general_symptoms'] = general_symptoms
        # Main avoidances (comma separated)
        main_avoidances = request.form.get('main_avoidances', '')
        data['main_avoidances'] = [s.strip() for s in main_avoidances.split(',') if s.strip()]
        # Triggers (list of {name, SUD 0-100})
        triggers = request.form.getlist('triggers[]')
        triggers_sud = request.form.getlist('triggers_sud[]')
        data['triggers'] = [
            {'name': t, 'sud': int(s) if s else None}
            for t, s in zip(triggers, triggers_sud) if t.strip()
        ]
        # Avoidance situations (list of {name, SUD 0-100})
        avoidances = request.form.getlist('avoidances[]')
        avoidances_sud = request.form.getlist('avoidances_sud[]')
        data['avoidances'] = [
            {'name': a, 'sud': int(s) if s else None}
            for a, s in zip(avoidances, avoidances_sud) if a.strip()
        ]
        # Somatic symptoms (by category)
        somatic = {}
        for key in request.form:
            if key.startswith('somatic['):
                cat = key.split('[')[1].split(']')[0]
                somatic[cat] = request.form.getlist(key)
        data['somatic'] = somatic
        # PCL-5 (20 items, 0-4)
        pcl5 = [int(request.form.get(f'pcl5_{i}', 0)) for i in range(1, 21)]
        data['pcl5'] = pcl5
        # Depression (PHQ-9, 9 items, 0-3)
        phq9 = [int(request.form.get(f'phq9_{i}', 0)) for i in range(1, 10)]
        data['phq9'] = phq9
        # Generate a unique patient_id
        data['patient_id'] = str(uuid.uuid4())
        # Add a 'name' field for display
        data['name'] = f"{data.get('first_name', '')} {data.get('last_name', '')}".strip()
        parser = PatientDataParser()
        parsed_data = parser.parse(data)
        mongo.db.patients.insert_one(parsed_data)
        log_audit('add_patient', data['name'])
        flash('נוצר מטופל חדש בהצלחה!', 'success')
        return redirect(url_for('dashboard_patients'))
    return render_template('dashboard/patient_create.html')

@app.route('/dashboard/patients/<patient_id>')
def patient_profile(patient_id):
    patient = mongo.db.patients.find_one({'patient_id': patient_id}, {'_id': 0})
    if not patient:
        flash('מטופל לא נמצא', 'danger')
        return redirect(url_for('dashboard_patients'))
    return render_template('dashboard/patient_profile.html', patient=patient)

@app.route('/dashboard/patients/<patient_id>/edit', methods=['GET', 'POST'])
def edit_patient(patient_id):
    patient = mongo.db.patients.find_one({'patient_id': patient_id}, {'_id': 0})
    if not patient:
        flash('מטופל לא נמצא', 'danger')
        return redirect(url_for('dashboard_patients'))
    if request.method == 'POST':
        update = {
            'first_name': request.form.get('first_name'),
            'last_name': request.form.get('last_name'),
            'gender': request.form.get('gender'),
            'birthdate': request.form.get('birthdate'),
            'age': request.form.get('age'),
            'city': request.form.get('city'),
            'street': request.form.get('street'),
            'house_number': request.form.get('house_number'),
            'education': request.form.get('education'),
            'occupation': request.form.get('occupation'),
            'hobbies': request.form.getlist('hobbies'),
            'pet': request.form.get('pet'),
            'general_info': request.form.get('general_info', ''),
        }
        ptsd_symptoms = request.form.get('ptsd_symptoms', '')
        update['ptsd_symptoms'] = [s.strip() for s in ptsd_symptoms.split(',') if s.strip()]
        general_symptoms = {}
        for key, label in [
            ('intrusion', 'דחיקות'),
            ('arousal', 'ערנות'),
            ('thoughts', 'מחשבות טורדניות'),
            ('avoidance', 'הימנעויות'),
            ('mood', 'שינוי מצב רוח')
        ]:
            val = request.form.get(f'general_symptoms_{key}')
            if val:
                general_symptoms[key] = int(val)
        update['general_symptoms'] = general_symptoms
        main_avoidances = request.form.get('main_avoidances', '')
        update['main_avoidances'] = [s.strip() for s in main_avoidances.split(',') if s.strip()]
        update['name'] = f"{update.get('first_name', '')} {update.get('last_name', '')}".strip()
        # Triggers (list of {name, SUD 0-100})
        triggers = request.form.getlist('triggers[]')
        triggers_sud = request.form.getlist('triggers_sud[]')
        update['triggers'] = [
            {'name': t, 'sud': int(s) if s else None}
            for t, s in zip(triggers, triggers_sud) if t.strip()
        ]
        # Avoidance situations (list of {name, SUD 0-100})
        avoidances = request.form.getlist('avoidances[]')
        avoidances_sud = request.form.getlist('avoidances_sud[]')
        update['avoidances'] = [
            {'name': a, 'sud': int(s) if s else None}
            for a, s in zip(avoidances, avoidances_sud) if a.strip()
        ]
        # Somatic symptoms (by category)
        somatic = {}
        for key in request.form:
            if key.startswith('somatic['):
                cat = key.split('[')[1].split(']')[0]
                somatic[cat] = request.form.getlist(key)
        update['somatic'] = somatic
        # PCL-5 (20 items, 0-4)
        pcl5 = [int(request.form.get(f'pcl5_{i}', 0)) for i in range(1, 21)]
        update['pcl5'] = pcl5
        # Depression (PHQ-9, 9 items, 0-3)
        phq9 = [int(request.form.get(f'phq9_{i}', 0)) for i in range(1, 10)]
        update['phq9'] = phq9
        mongo.db.patients.update_one({'patient_id': patient_id}, {'$set': update})
        flash('פרטי המטופל עודכנו בהצלחה!', 'success')
        return redirect(url_for('dashboard_patients'))
    return render_template('dashboard/patient_create.html', patient=patient, edit_mode=True)

def convert_objectids(obj):
    if isinstance(obj, list):
        return [convert_objectids(item) for item in obj]
    elif isinstance(obj, dict):
        return {k: convert_objectids(v) for k, v in obj.items()}
    elif isinstance(obj, ObjectId):
        return str(obj)
    else:
        return obj

@app.route('/dashboard/stories')
def dashboard_stories():
    stories = list(mongo.db.stories.find({}, {'_id': 1, 'timestamp': 1, 'patient_id': 1, 'stage': 1, 'result': 1}))
    for s in stories:
        s['story_id'] = str(s['_id'])
        s['short_id'] = s['story_id'][-6:]
        # Recursively convert ObjectIds in all nested fields
        for key in s:
            s[key] = convert_objectids(s[key])
        # Ensure summary exists
        story_text = s.get('result', {}).get('story', '')
        if 'summary' not in s or not s.get('summary'):
            s['summary'] = ' '.join(story_text.split()[:30]) + ('...' if len(story_text.split()) > 30 else '')
        # Ensure feedback fields exist
        for fb_key in ['habituation_feedback', 'narrative_feedback', 'dialogue_feedback', 'rule_feedback', 'hebrew_feedback']:
            if fb_key not in s:
                s[fb_key] = ''
    patients = list(mongo.db.patients.find({}, {'_id': 0, 'patient_id': 1, 'name': 1}))
    # Determine next actionable chapter for each patient
    next_actionable = {}
    patient_stories = {}
    for s in stories:
        pid = s['patient_id']
        if pid not in patient_stories:
            patient_stories[pid] = []
        patient_stories[pid].append(s)
    for pid, s_list in patient_stories.items():
        s_list_sorted = sorted(s_list, key=lambda x: x.get('stage', 0))
        for s in s_list_sorted:
            if s.get('status') not in ['approved']:
                next_actionable[pid] = s['story_id']
                break
    # Attach compliance info if available
    for s in stories:
        compliance = mongo.db.compliance.find_one({'story_id': s['story_id']}, {'_id': 0})
        if compliance:
            s['compliance'] = compliance
    return render_template('dashboard/story_review.html', stories=stories, patients=patients, next_actionable=next_actionable)

@app.route('/dashboard/audit')
def dashboard_audit():
    return render_template('dashboard/audit.html')

@app.route('/dashboard/research')
def dashboard_research():
    return render_template('dashboard/research.html')

@app.route('/dashboard/compliance')
def dashboard_compliance():
    return render_template('dashboard/compliance.html')

@app.route('/dashboard')
def dashboard_summary():
    total_patients = mongo.db.patients.count_documents({})
    total_stories = mongo.db.stories.count_documents({})
    sud_feedback = list(mongo.db.session_feedback.find({}, {'_id': 0}).sort('timestamp', -1).limit(10))
    session_feedback = list(mongo.db.session_feedback.find({}, {'_id': 0}).sort('timestamp', -1).limit(10))
    patient_map = {p['patient_id']: p.get('name', p['patient_id']) for p in mongo.db.patients.find({}, {'patient_id': 1, 'name': 1, '_id': 0}) if 'patient_id' in p}
    for fb in session_feedback:
        fb['patient_name'] = patient_map.get(fb.get('patient_id'), fb.get('patient_id', ''))
    recent_activity = list(mongo.db.audit.find({}, {'_id': 0}).sort('timestamp', -1).limit(5))
    return render_template(
        'dashboard/summary_enhanced.html',
        total_patients=total_patients,
        total_stories=total_stories,
        sud_feedback=sud_feedback,
        session_feedback=session_feedback,
        recent_activity=recent_activity
    )

@app.route('/dashboard/enhanced')
def dashboard_enhanced():
    """Enhanced dashboard with modern UI and real-time features"""
    total_patients = mongo.db.patients.count_documents({})
    total_stories = mongo.db.stories.count_documents({})
    
    # Get session feedback with patient names
    session_feedback = list(mongo.db.session_feedback.find({}, {'_id': 0}).sort('timestamp', -1).limit(10))
    patient_map = {p['patient_id']: p.get('name', p['patient_id']) for p in mongo.db.patients.find({}, {'patient_id': 1, 'name': 1, '_id': 0}) if 'patient_id' in p}
    for fb in session_feedback:
        fb['patient_name'] = patient_map.get(fb.get('patient_id'), fb.get('patient_id', ''))
    
    # Get recent activity
    recent_activity = list(mongo.db.audit.find({}, {'_id': 0}).sort('timestamp', -1).limit(8))
    
    # Format timestamps for display
    from datetime import datetime
    for activity in recent_activity:
        if 'timestamp' in activity and isinstance(activity['timestamp'], datetime):
            activity['timestamp'] = activity['timestamp'].strftime('%d/%m/%Y %H:%M')
    
    for feedback in session_feedback:
        if 'timestamp' in feedback and isinstance(feedback['timestamp'], datetime):
            feedback['timestamp'] = feedback['timestamp'].strftime('%d/%m/%Y %H:%M')
    
    # Get SUD trend data for charts
    sud_data = list(mongo.db.stories.find({}, {'sud': 1, 'timestamp': 1, '_id': 0}).sort('timestamp', -1).limit(20))
    
    return render_template(
        'dashboard/summary_enhanced.html',
        total_patients=total_patients,
        total_stories=total_stories,
        session_feedback=session_feedback,
        recent_activity=recent_activity,
        sud_data=sud_data
    )

@app.route('/api/notifications', methods=['GET'])
def api_notifications():
    """Get system notifications for the dashboard"""
    try:
        # Check for high SUD values in recent sessions
        notifications = []
        
        # Check for patients with consistently high SUD
        high_sud_patients = list(mongo.db.stories.find(
            {'sud': {'$gte': 8}}, 
            {'patient_id': 1, 'sud': 1, 'timestamp': 1}
        ).sort('timestamp', -1).limit(5))
        
        for patient_story in high_sud_patients:
            patient = mongo.db.patients.find_one({'patient_id': patient_story['patient_id']}, {'name': 1})
            if patient:
                notifications.append({
                    'type': 'warning',
                    'message': f"רמת SUD גבוהה ({patient_story['sud']}) עבור {patient.get('name', 'מטופל')}"
                })
        
        # Check for patients who haven't had sessions recently
        from datetime import datetime, timedelta
        week_ago = datetime.utcnow() - timedelta(days=7)
        inactive_patients = list(mongo.db.patients.find({}, {'patient_id': 1, 'name': 1}))
        
        for patient in inactive_patients:
            recent_story = mongo.db.stories.find_one(
                {'patient_id': patient['patient_id'], 'timestamp': {'$gte': week_ago}}
            )
            if not recent_story:
                notifications.append({
                    'type': 'info',
                    'message': f"לא היה מפגש השבוע עבור {patient.get('name', 'מטופל')}"
                })
        
        # Limit notifications to avoid spam
        notifications = notifications[:5]
        
        return jsonify({
            'status': 'success',
            'notifications': notifications
        })
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@app.route('/api/dashboard', methods=['GET'])
def api_dashboard():
    # Aggregate stats (placeholder logic)
    total_patients = mongo.db.patients.count_documents({})
    active_plans = mongo.db.plans.count_documents({'status': 'active'})
    pending_stories = mongo.db.stories.count_documents({'status': 'pending'})
    compliance_alerts = mongo.db.compliance.count_documents({'summary': {'$ne': 'All rules passed.'}})
    recent_activity = list(mongo.db.audit.find({}, {'_id': 0}).sort('timestamp', -1).limit(5))
    return jsonify({
        'status': 'success',
        'summary': {
            'total_patients': total_patients,
            'active_plans': active_plans,
            'pending_stories': pending_stories,
            'compliance_alerts': compliance_alerts,
            'recent_activity': recent_activity
        }
    })

# --- API Endpoints for Therapist Dashboard ---

@app.route('/api/plans', methods=['GET', 'POST'])
def api_plans():
    if request.method == 'GET':
        # Placeholder: return all plans
        plans = list(mongo.db.plans.find({}, {'_id': 0}))
        return jsonify({'status': 'success', 'plans': plans})
    elif request.method == 'POST':
        plan_data = request.json
        mongo.db.plans.insert_one(plan_data)
        return jsonify({'status': 'success'})

@app.route('/api/plans/<plan_id>', methods=['GET', 'PUT'])
def api_plan_detail(plan_id):
    if request.method == 'GET':
        plan = mongo.db.plans.find_one({'plan_id': plan_id}, {'_id': 0})
        if not plan:
            return jsonify({'status': 'error', 'message': 'Plan not found'}), 404
        return jsonify({'status': 'success', 'plan': plan})
    elif request.method == 'PUT':
        update_data = request.json
        mongo.db.plans.update_one({'plan_id': plan_id}, {'$set': update_data})
        return jsonify({'status': 'success'})

@app.route('/api/stories/<story_id>', methods=['GET', 'PUT'])
def api_story_detail(story_id):
    if request.method == 'GET':
        story = mongo.db.stories.find_one({'story_id': story_id}, {'_id': 0})
        if not story:
            return jsonify({'status': 'error', 'message': 'Story not found'}), 404
        return jsonify({'status': 'success', 'story': story})
    elif request.method == 'PUT':
        update_data = request.json
        mongo.db.stories.update_one({'story_id': story_id}, {'$set': update_data})
        return jsonify({'status': 'success'})

@app.route('/api/audit', methods=['GET'])
def api_audit():
    logs = list(mongo.db.audit.find({}, {'_id': 0}))
    return jsonify({'status': 'success', 'audit': logs})

@app.route('/api/compliance/<story_id>', methods=['GET'])
def api_compliance(story_id):
    # Placeholder: return compliance report for a story
    compliance = mongo.db.compliance.find_one({'story_id': story_id}, {'_id': 0})
    if not compliance:
        compliance = {
            'story_id': story_id,
            'summary': 'All rules passed.',
            'details': [
                {'rule': 'Coping', 'status': 'Pass', 'details': 'All coping mechanisms validated'}
            ]
        }
    return jsonify({'status': 'success', 'compliance': compliance})

@app.route('/api/patients', methods=['GET', 'POST'])
def api_patients():
    if request.method == 'GET':
        patients = list(mongo.db.patients.find({}, {'_id': 0}))
        return jsonify({'status': 'success', 'patients': patients})
    elif request.method == 'POST':
        try:
            patient_data = request.json
            
            # Validate required fields
            required_fields = ['first_name', 'last_name', 'age']
            for field in required_fields:
                if not patient_data.get(field):
                    return jsonify({'status': 'error', 'message': f'Missing required field: {field}'}), 400
            
            # Generate unique patient_id
            patient_data['patient_id'] = str(uuid.uuid4())
            
            # Set default values for optional fields
            patient_data.setdefault('gender', '')
            patient_data.setdefault('birthdate', '')
            patient_data.setdefault('city', '')
            patient_data.setdefault('street', '')
            patient_data.setdefault('house_number', '')
            patient_data.setdefault('education', '')
            patient_data.setdefault('occupation', '')
            patient_data.setdefault('pet', '')
            patient_data.setdefault('general_info', '')
            
            # Handle arrays
            patient_data.setdefault('hobbies', [])
            patient_data.setdefault('ptsd_symptoms', [])
            patient_data.setdefault('main_avoidances', [])
            patient_data.setdefault('triggers', [])
            patient_data.setdefault('avoidances', [])
            
            # Handle nested objects
            patient_data.setdefault('general_symptoms', {})
            patient_data.setdefault('somatic', {})
            
            # Handle assessment scores
            patient_data.setdefault('pcl5', [0] * 20)
            patient_data.setdefault('phq9', [0] * 9)
            patient_data.setdefault('pcl5_total', 0)
            patient_data.setdefault('phq9_total', 0)
            
            # Add metadata
            from datetime import datetime
            patient_data['created_at'] = datetime.now()
            patient_data['updated_at'] = datetime.now()
            
            # Create composite name for easier search
            patient_data['name'] = f"{patient_data['first_name']} {patient_data['last_name']}"
            
            # Insert into database
            result = mongo.db.patients.insert_one(patient_data)
            
            if result.inserted_id:
                return jsonify({
                    'status': 'success', 
                    'message': 'Patient created successfully',
                    'patient_id': patient_data['patient_id']
                })
            else:
                return jsonify({'status': 'error', 'message': 'Failed to create patient'}), 500
                
        except Exception as e:
            print(f"Error creating patient: {str(e)}")
            return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/patients/<patient_id>', methods=['GET', 'PUT'])
def api_patient_detail(patient_id):
    if request.method == 'GET':
        patient = mongo.db.patients.find_one({'patient_id': patient_id}, {'_id': 0})
        if not patient:
            return jsonify({'status': 'error', 'message': 'Patient not found'}), 404
        return jsonify({'status': 'success', 'patient': patient})
    elif request.method == 'PUT':
        update_data = request.json
        mongo.db.patients.update_one({'patient_id': patient_id}, {'$set': update_data})
        return jsonify({'status': 'success'})

@app.route('/welcome', methods=['GET', 'POST'])
def welcome():
    error_message = None
    if request.method == 'POST':
        name = request.form.get('name', '').strip()
        if not name:
            error_message = 'יש להזין שם.'
        else:
            patient = mongo.db.patients.find_one({'name': name}, {'_id': 0})
            if not patient:
                # Try case-insensitive and partial match
                patient = mongo.db.patients.find_one(
                    {'name': {'$regex': f'^{name}$', '$options': 'i'}}, {'_id': 0}
                )
            if not patient:
                patient = mongo.db.patients.find_one(
                    {'name': {'$regex': name, '$options': 'i'}}, {'_id': 0}
                )
            if patient:
                session['patient_id'] = patient['patient_id']
                return redirect(url_for('pre_session'))
            else:
                error_message = 'מטופל לא נמצא'
    return render_template('welcome.html', error_message=error_message)

@app.route('/profile')
def profile():
    return render_template('profile.html')

@app.route('/pre-session')
def pre_session():
    return render_template('pre_session.html')

@app.route('/api/profile', methods=['POST'])
def api_profile():
    data = request.json
    if not data or not data.get('name') or not data.get('age'):
        return jsonify({'status': 'error', 'message': 'Missing required fields'}), 400
    # Save to MongoDB (patients collection)
    patient_id = data.get('name') + '_' + str(data.get('age'))
    data['patient_id'] = patient_id
    mongo.db.patients.update_one({'patient_id': patient_id}, {'$set': data}, upsert=True)
    return jsonify({'status': 'success', 'patient_id': patient_id})

@app.route('/api/submit-sud-feedback', methods=['POST'])
def submit_sud_feedback():
    data = request.json
    plan_id = data.get('plan_id')
    patient_id = data.get('patient_id')
    part_index = data.get('part_index')
    sud_value = data.get('sud_value')
    therapist_note = data.get('therapist_note')
    if not all([plan_id, patient_id, part_index, sud_value is not None]):
        return jsonify({'status': 'error', 'message': 'Missing required fields.'}), 400
    try:
        part_index = int(part_index)
        sud_value = int(sud_value)
    except Exception:
        return jsonify({'status': 'error', 'message': 'Invalid part_index or SUD value.'}), 400
    feedback_id = exposure_plan_service.submit_feedback(
        plan_id=plan_id,
        patient_id=patient_id,
        part_index=part_index,
        sud_value=sud_value,
        therapist_note=therapist_note
    )
    return jsonify({'status': 'success', 'feedback_id': feedback_id})

@app.route('/api/get-sud-feedback', methods=['GET'])
def get_sud_feedback():
    plan_id = request.args.get('plan_id')
    patient_id = request.args.get('patient_id')
    if plan_id:
        feedback = exposure_plan_service.get_feedback_for_plan(plan_id)
    elif patient_id:
        feedback = exposure_plan_service.get_feedback_for_patient(patient_id)
    else:
        return jsonify({'status': 'error', 'message': 'Missing plan_id or patient_id.'}), 400
    # Serialize feedback objects
    feedback_list = [
        {
            'feedback_id': f.feedback_id,
            'plan_id': f.plan_id,
            'patient_id': f.patient_id,
            'part_index': f.part_index,
            'sud_value': f.sud_value,
            'timestamp': f.timestamp,
            'therapist_note': f.therapist_note
        }
        for f in feedback
    ]
    return jsonify({'status': 'success', 'feedback': feedback_list})

@app.route('/api/patient-lookup', methods=['POST'])
def patient_lookup():
    data = request.json
    name = data.get('name', '').strip()
    if not name:
        return jsonify({'status': 'error', 'message': 'Missing name'}), 400

    # Try exact match first
    patient = mongo.db.patients.find_one({'name': name}, {'_id': 0})
    if not patient:
        # Try case-insensitive exact match
        patient = mongo.db.patients.find_one(
            {'name': {'$regex': f'^{name}$', '$options': 'i'}}, {'_id': 0}
        )
    if not patient:
        # Try partial match (anywhere in the name, case-insensitive)
        patient = mongo.db.patients.find_one(
            {'name': {'$regex': name, '$options': 'i'}}, {'_id': 0}
        )
    if not patient:
        return jsonify({'status': 'error', 'message': 'Patient not found'}), 404

    session['patient_id'] = patient['patient_id']
    return jsonify({'status': 'success', 'patient_id': patient['patient_id']})

@app.route('/session')
def session_page():
    patient_id = session.get('patient_id')
    if not patient_id:
        return redirect('/welcome')
    scenario_state = session.get('scenario_state', {})
    stage = scenario_state.get('stage', 1)
    story_doc = mongo.db.stories.find_one({'patient_id': patient_id, 'stage': stage}, sort=[('timestamp', -1)])
    story = story_doc['result']['story'] if story_doc else None
    audio_file = story_doc['result'].get('audio_file') if story_doc and 'result' in story_doc else None
    sud = scenario_state['sud_history'][-1] if 'sud_history' in scenario_state and scenario_state['sud_history'] else None
    session_complete = stage > 3
    return render_template('session.html', story=story, sud=sud, stage=stage, session_complete=session_complete, audio_file=audio_file)

@app.route('/feedback', methods=['GET', 'POST'])
def feedback():
    patient_id = session.get('patient_id')
    if not patient_id:
        return redirect('/welcome')
    if session.get('feedback_submitted'):
        return render_template('feedback_thanks.html')
    if request.method == 'POST':
        data = request.form
        feedback_data = {
            'patient_id': patient_id,
            'numeric': int(data.get('numeric', 0)),
            'text': data.get('text', ''),
            'timestamp': datetime.utcnow()
        }
        mongo.db.session_feedback.insert_one(feedback_data)
        mongo.db.patients.update_one({'patient_id': patient_id}, {'$push': {'feedback': feedback_data}})
        patient = mongo.db.patients.find_one({'patient_id': patient_id}, {'name': 1, '_id': 0})
        log_audit('feedback', patient.get('name', patient_id), f"Feedback: {feedback_data['numeric']}")
        session['feedback_submitted'] = True
        return render_template('feedback_thanks.html')
    return render_template('feedback.html')

@app.route('/api/story-action', methods=['POST'])
def api_story_action():
    data = request.json
    action = data.get('action')
    patient_id = data.get('patient_id')
    story_id = data.get('story_id')
    if not action or not patient_id or not story_id:
        return jsonify({'status': 'error', 'message': 'Missing data'}), 400
    story = mongo.db.stories.find_one({'_id': ObjectId(story_id), 'patient_id': patient_id})
    if not story:
        return jsonify({'status': 'error', 'message': 'Story not found'}), 404
    update = {}
    if action == 'approve':
        update['status'] = 'approved'
    elif action == 'reject':
        update['status'] = 'rejected'
    elif action == 'regenerate':
        # Placeholder: regenerate summary (first 30 words)
        story_text = story.get('result', {}).get('story', '')
        summary = ' '.join(story_text.split()[:30]) + ('...' if len(story_text.split()) > 30 else '')
        update['status'] = 'regenerated'
        update['summary'] = summary
    else:
        return jsonify({'status': 'error', 'message': 'Unknown action'}), 400
    mongo.db.stories.update_one({'_id': ObjectId(story_id)}, {'$set': update})
    return jsonify({'status': 'success', 'message': f'Story {action}d!'})


@app.route('/config.js')
def config_js():
    # Dynamically get the server's IP address for local network
    hostname = socket.gethostname()
    local_ip = socket.gethostbyname(hostname)
    api_base = f"http://{local_ip}:5000"
    js = f"window.API_BASE_URL = '{api_base}';"
    return js, 200, {'Content-Type': 'application/javascript'}

@app.route('/static/audio/<filename>')
def serve_audio(filename):
    """Serve audio files for mobile app TTS functionality"""
    try:
        audio_path = os.path.join('static', 'audio')
        return send_file(os.path.join(audio_path, filename), as_attachment=False)
    except Exception as e:
        return jsonify({'error': 'Audio file not found'}), 404

@app.route('/api/therapist/patients_overview')
def api_patients_overview():
    # Example: fetch all patients and their progress
    patients = list(mongo.db.patients.find({}, {'_id': 0, 'patient_id': 1, 'name': 1, 'avatar_url': 1, 'flagged': 1}))
    overview = []
    now = datetime.utcnow()
    week_ago = now - timedelta(days=7)
    for p in patients:
        patient_id = p.get('patient_id')
        if not patient_id:
            continue  # Skip patients without patient_id
        # Get last session date
        last_story = mongo.db.stories.find_one({'patient_id': patient_id}, sort=[('timestamp', -1)])
        last_session_date = last_story['timestamp'].isoformat() if last_story and 'timestamp' in last_story else None
        last_session_days_ago = None
        if last_story and 'timestamp' in last_story:
            last_session_days_ago = (now - last_story['timestamp']).days
        # Get last 5 SUDs
        suds = list(mongo.db.stories.find({'patient_id': patient_id}).sort('timestamp', -1).limit(5))
        sud_trend = [s.get('sud', None) for s in reversed(suds)]
        # High SUD trend: last 3 SUDs all >= 7
        high_sud_trend = False
        if len(sud_trend) >= 3 and all(s is not None and s >= 7 for s in sud_trend[-3:]):
            high_sud_trend = True
        # Progress: number of completed sessions (out of 3)
        progress = min(len([s for s in suds if s.get('stage')]), 3) * 33
        # Flagged
        flagged = p.get('flagged', False)
        # Latest session note
        notes = list(mongo.db.session_feedback.find({'patient_id': patient_id, 'therapist_note': {'$exists': True, '$ne': ''}}).sort('timestamp', -1).limit(1))
        latest_note = notes[0]['therapist_note'] if notes else None
        notes_count = mongo.db.session_feedback.count_documents({'patient_id': patient_id, 'therapist_note': {'$exists': True, '$ne': ''}})
        # --- New metrics ---
        # Usage logs
        usage_logs = list(mongo.db.usage_logs.find({'patient_id': patient_id}))
        total_app_time = sum(u.get('duration', 0) for u in usage_logs)
        weekly_app_time = sum(u.get('duration', 0) for u in usage_logs if u.get('timestamp') and u['timestamp'] >= week_ago)
        usage_hours = [u['timestamp'].hour for u in usage_logs if 'timestamp' in u]
        # Session difficulties (from stories or feedback)
        session_difficulties = [s.get('difficulty') for s in mongo.db.stories.find({'patient_id': patient_id}).sort('stage', 1) if s.get('difficulty') is not None]
        # Stories completed
        stories_completed = mongo.db.stories.count_documents({'patient_id': patient_id, 'status': 'completed'})
        # SUD by chapter
        sud_by_chapter = [s.get('sud') for s in mongo.db.stories.find({'patient_id': patient_id}).sort('stage', 1)]
        # Rewards (trophies/stars)
        rewards = mongo.db.rewards.count_documents({'patient_id': patient_id}) if 'rewards' in mongo.db.list_collection_names() else 0
        # Progress rate (sessions per week)
        session_timestamps = [s['timestamp'] for s in mongo.db.stories.find({'patient_id': patient_id}, {'timestamp': 1}) if 'timestamp' in s]
        progress_rate = 0.0
        if session_timestamps:
            session_timestamps.sort()
            total_weeks = max(1, (session_timestamps[-1] - session_timestamps[0]).days / 7)
            progress_rate = len(session_timestamps) / total_weeks if total_weeks > 0 else len(session_timestamps)
        # Hotspots (sessions much slower/faster than average)
        session_durations = [u.get('duration', 0) for u in usage_logs if 'session_index' in u]
        avg_duration = sum(session_durations) / len(session_durations) if session_durations else 0
        hotspots = [u['session_index'] for u in usage_logs if 'session_index' in u and ((u.get('duration', 0) > avg_duration * 1.5) or (u.get('duration', 0) < avg_duration * 0.5))]
        overview.append({
            'name': p.get('name', ''),
            'avatar_url': p.get('avatar_url'),
            'last_session_date': last_session_date,
            'last_session_days_ago': last_session_days_ago,
            'sud_trend': sud_trend,
            'high_sud_trend': high_sud_trend,
            'progress': progress,
            'flagged': flagged,
            'patient_id': patient_id,
            'latest_note': latest_note,
            'notes_count': notes_count,
            # New metrics
            'total_app_time': total_app_time,
            'weekly_app_time': weekly_app_time,
            'usage_hours': usage_hours,
            'session_difficulties': session_difficulties,
            'stories_completed': stories_completed,
            'sud_by_chapter': sud_by_chapter,
            'rewards': rewards,
            'progress_rate': progress_rate,
            'hotspots': hotspots
        })
    return jsonify({'status': 'success', 'patients': overview})

@app.route('/dashboard/patients_overview')
def dashboard_patients_overview():
    return render_template('dashboard/patients_overview.html')

# --- Exa AI Research Endpoints ---

@app.route('/api/research/ptsd', methods=['POST'])
def api_ptsd_research():
    """Search for PTSD research and clinical studies"""
    data = request.json
    query = data.get('query', '')
    if not query:
        return jsonify({'status': 'error', 'message': 'Query is required'}), 400
    
    try:
        results = search_ptsd_research(query)
        return jsonify({'status': 'success', 'results': results.results})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/research/cbt-techniques', methods=['POST'])
def api_cbt_techniques():
    """Search for CBT techniques"""
    data = request.json
    technique = data.get('technique', '')
    if not technique:
        return jsonify({'status': 'error', 'message': 'Technique name is required'}), 400
    
    try:
        results = search_cbt_techniques(technique)
        return jsonify({'status': 'success', 'results': results.results})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/research/exposure-therapy', methods=['GET'])
def api_exposure_therapy():
    """Search for exposure therapy methods"""
    try:
        results = search_exposure_therapy_methods()
        return jsonify({'status': 'success', 'results': results.results})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/research/sud-scale', methods=['GET'])
def api_sud_scale():
    """Search for SUD scale research"""
    try:
        results = search_sud_scale_research()
        return jsonify({'status': 'success', 'results': results.results})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/research/narrative-therapy', methods=['GET'])
def api_narrative_therapy():
    """Search for narrative therapy approaches"""
    try:
        results = search_narrative_therapy_ptsd()
        return jsonify({'status': 'success', 'results': results.results})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/resources/therapist', methods=['POST'])
def api_therapist_resources():
    """Search for therapist resources on specific topics"""
    data = request.json
    topic = data.get('topic', '')
    if not topic:
        return jsonify({'status': 'error', 'message': 'Topic is required'}), 400
    
    try:
        results = search_therapist_resources(topic)
        return jsonify({'status': 'success', 'results': results.results})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/resources/coping-strategies', methods=['GET'])
def api_coping_strategies():
    """Search for patient coping strategies"""
    try:
        results = search_patient_coping_strategies()
        return jsonify({'status': 'success', 'results': results.results})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/resources/trigger-management', methods=['GET'])
def api_trigger_management():
    """Search for trauma trigger management techniques"""
    try:
        results = search_trauma_triggers_management()
        return jsonify({'status': 'success', 'results': results.results})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

# --- MCP Knowledge Graph Integration ---

@app.route('/api/mcp/initialize-patient', methods=['POST'])
def api_mcp_initialize_patient():
    """Initialize patient in MCP Knowledge Graph"""
    data = request.json
    patient_id = data.get('patient_id')
    patient_data = data.get('patient_data')
    
    if not patient_id or not patient_data:
        return jsonify({'status': 'error', 'message': 'Patient ID and data are required'}), 400
    
    try:
        # Initialize in both knowledge graphs
        mcp_provider.initialize_patient_memory(patient_id, patient_data)
        
        log_audit('mcp_initialize', patient_data.get('name', patient_id), 'Patient initialized in MCP Knowledge Graph')
        
        return jsonify({
            'status': 'success',
            'message': 'Patient initialized in MCP Knowledge Graph',
            'patient_id': patient_id
        })
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/mcp/patient-context/<patient_id>', methods=['GET'])
def api_mcp_patient_context(patient_id):
    """Get comprehensive patient context from MCP Knowledge Graph"""
    try:
        session_type = request.args.get('session_type', 'general')
        context = mcp_provider.get_patient_context(patient_id, session_type)
        
        return jsonify({
            'status': 'success',
            'context': {
                'patient_id': context.patient_id,
                'session_type': context.session_type,
                'current_context': context.current_context,
                'historical_context': context.historical_context,
                'similar_cases': context.similar_cases,
                'recommendations': context.recommendations,
                'mcp_memory': context.mcp_memory,
                'metadata': context.metadata
            }
        })
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/mcp/session-memory', methods=['POST'])
def api_mcp_update_session():
    """Update session memory in MCP Knowledge Graph"""
    data = request.json
    patient_id = data.get('patient_id')
    session_data = data.get('session_data')
    
    if not patient_id or not session_data:
        return jsonify({'status': 'error', 'message': 'Patient ID and session data are required'}), 400
    
    try:
        mcp_provider.update_session_memory(patient_id, session_data)
        
        log_audit('mcp_session_update', patient_id, f"Session updated: {session_data.get('type', 'unknown')}")
        
        return jsonify({
            'status': 'success',
            'message': 'Session memory updated in MCP Knowledge Graph'
        })
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/mcp/search', methods=['POST'])
def api_mcp_search():
    """Search across both knowledge graphs"""
    data = request.json
    query = data.get('query', '')
    
    if not query:
        return jsonify({'status': 'error', 'message': 'Search query is required'}), 400
    
    try:
        results = mcp_provider.search_memory(query)
        
        return jsonify({
            'status': 'success',
            'results': results
        })
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/dev/mcp-memory')
def dev_mcp_memory():
    """Developer-only access to MCP Knowledge Graph memory"""
    # Simple developer authentication - in production, use proper auth
    dev_key = request.args.get('dev_key')
    if dev_key != 'mindshift_dev_2024':
        return "Access Denied - Developer Key Required", 403
    return render_template('dashboard/mcp_memory.html')

# --- Session Notes Endpoints ---

@app.route('/dashboard/session-notes')
def dashboard_session_notes():
    """Dashboard page for session notes with rich text editor"""
    return render_template('dashboard/session_notes.html')

@app.route('/api/session-notes/save', methods=['POST'])
def api_save_session_notes():
    """Save session notes to database"""
    data = request.json
    
    required_fields = ['patient_id', 'content']
    for field in required_fields:
        if not data.get(field):
            return jsonify({'status': 'error', 'message': f'{field} is required'}), 400
    
    try:
        from pymongo import MongoClient
        import uuid
        
        client = MongoClient('mongodb://localhost:27017/')
        db = client['ptsd_therapy']
        collection = db['session_notes']
        
        # Handle new session creation
        session_id = data.get('session_id')
        if session_id == 'new':
            # Create a new session ID
            session_id = f"s_{uuid.uuid4().hex[:8]}"
            session_date = data.get('session_date')
            session_level = data.get('session_level')
            
            if not session_date or not session_level:
                return jsonify({'status': 'error', 'message': 'Session date and level are required for new sessions'}), 400
        else:
            session_date = data.get('session_date', '')
            session_level = data.get('session_level', '')
        
        # Create session notes document
        session_notes = {
            'patient_id': data['patient_id'],
            'session_id': session_id,
            'session_date': session_date,
            'session_level': session_level,
            'content': data['content'],
            'plain_text': data.get('plain_text', ''),
            'word_count': int(data.get('word_count', 0)),
            'char_count': int(data.get('char_count', 0)),
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow(),
            'auto_save': data.get('auto_save', False)
        }
        
        # Check if notes for this session already exist
        existing_notes = collection.find_one({
            'patient_id': data['patient_id'],
            'session_id': session_id
        })
        
        if existing_notes:
            # Update existing notes
            session_notes['_id'] = existing_notes['_id']
            session_notes['created_at'] = existing_notes['created_at']
            collection.replace_one({'_id': existing_notes['_id']}, session_notes)
            action = 'updated'
        else:
            # Insert new notes
            result = collection.insert_one(session_notes)
            session_notes['_id'] = result.inserted_id
            action = 'created'
        
        # Log audit trail
        log_audit('session_notes_save', data['patient_id'], 
                 f"Session notes {action} for session {session_id}")
        
        return jsonify({
            'status': 'success',
            'message': f'Session notes {action} successfully',
            'notes_id': str(session_notes['_id']),
            'session_id': session_id,
            'action': action
        })
        
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/session-notes/load', methods=['GET'])
def api_load_session_notes():
    """Load session notes for a specific patient and date"""
    patient_id = request.args.get('patient_id')
    session_date = request.args.get('session_date')
    
    if not patient_id:
        return jsonify({'status': 'error', 'message': 'Patient ID is required'}), 400
    
    try:
        from pymongo import MongoClient
        client = MongoClient('mongodb://localhost:27017/')
        db = client['ptsd_therapy']
        collection = db['session_notes']
        
        query = {'patient_id': patient_id}
        if session_date:
            query['session_date'] = session_date
        
        # Get notes (most recent if no specific date)
        notes = collection.find(query).sort('created_at', -1).limit(1)
        notes_list = list(notes)
        
        if notes_list:
            note = notes_list[0]
            note['_id'] = str(note['_id'])  # Convert ObjectId to string
            return jsonify({
                'status': 'success',
                'notes': note
            })
        else:
            return jsonify({
                'status': 'success',
                'notes': None,
                'message': 'No notes found for this patient/session'
            })
            
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/session-notes/list/<patient_id>', methods=['GET'])
def api_list_session_notes(patient_id):
    """List all session notes for a patient"""
    try:
        from pymongo import MongoClient
        client = MongoClient('mongodb://localhost:27017/')
        db = client['ptsd_therapy']
        collection = db['session_notes']
        
        notes = collection.find({'patient_id': patient_id}).sort('session_date', -1)
        notes_list = []
        
        for note in notes:
            notes_list.append({
                'id': str(note['_id']),
                'session_date': note['session_date'],
                'word_count': note.get('word_count', 0),
                'char_count': note.get('char_count', 0),
                'created_at': note['created_at'].isoformat(),
                'updated_at': note['updated_at'].isoformat(),
                'preview': note.get('plain_text', '')[:100] + '...' if len(note.get('plain_text', '')) > 100 else note.get('plain_text', '')
            })
        
        return jsonify({
            'status': 'success',
            'notes': notes_list,
            'count': len(notes_list)
        })
        
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/session-notes/list/all', methods=['GET'])
def api_list_all_session_notes():
    """List all session notes with optional filtering"""
    try:
        from pymongo import MongoClient
        client = MongoClient('mongodb://localhost:27017/')
        db = client['ptsd_therapy']
        collection = db['session_notes']
        
        # Get filter parameters
        patient_id = request.args.get('patient_id')
        session_level = request.args.get('session_level')
        search_term = request.args.get('search')
        
        # Build query
        query = {}
        if patient_id:
            query['patient_id'] = patient_id
        
        # Get all notes
        notes = collection.find(query).sort('created_at', -1)
        notes_list = []
        
        for note in notes:
            note_data = {
                'id': str(note['_id']),
                'patient_id': note['patient_id'],
                'session_id': note.get('session_id', 'unknown'),
                'content': note.get('content', ''),
                'plain_text': note.get('plain_text', ''),
                'word_count': note.get('word_count', 0),
                'char_count': note.get('char_count', 0),
                'created_at': note['created_at'].isoformat(),
                'updated_at': note['updated_at'].isoformat(),
                'session_date': note.get('session_date', ''),
                'session_level': note.get('session_level', '')
            }
            
            # Apply search filter if provided
            if search_term:
                search_lower = search_term.lower()
                if (search_lower in note_data['plain_text'].lower() or 
                    search_lower in note_data.get('patient_id', '').lower()):
                    notes_list.append(note_data)
            else:
                notes_list.append(note_data)
        
        # Apply session level filter if provided
        if session_level:
            notes_list = [note for note in notes_list if note.get('session_level') == session_level]
        
        return jsonify({
            'status': 'success',
            'notes': notes_list,
            'count': len(notes_list)
        })
        
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

# --- Wellness Tracker Endpoints ---

@app.route('/dashboard/wellness-tracker')
def dashboard_wellness_tracker():
    """Dashboard page for wellness tracking with mood, anxiety, sleep, and activities"""
    return render_template('dashboard/wellness_tracker.html')

@app.route('/api/wellness/save-daily-log', methods=['POST'])
def api_save_wellness_log():
    """Save daily wellness log to database"""
    data = request.json
    
    try:
        from pymongo import MongoClient
        import uuid
        
        client = MongoClient('mongodb://localhost:27017/')
        db = client['ptsd_therapy']
        collection = db['wellness_logs']
        
        # Create wellness log document
        wellness_log = {
            'log_id': f"wl_{uuid.uuid4().hex[:8]}",
            'date': data.get('date'),
            'mood': int(data.get('mood', 5)),
            'anxiety': int(data.get('anxiety', 5)),
            'sleep_hours': float(data.get('sleepHours', 7)),
            'sleep_quality': data.get('sleepQuality', 'good'),
            'energy': int(data.get('energy', 5)),
            'activities': data.get('activities', []),
            'notes': data.get('notes', ''),
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow()
        }
        
        # Check if log for this date already exists
        existing_log = collection.find_one({'date': data.get('date')})
        
        if existing_log:
            # Update existing log
            wellness_log['_id'] = existing_log['_id']
            wellness_log['created_at'] = existing_log['created_at']
            collection.replace_one({'_id': existing_log['_id']}, wellness_log)
            action = 'updated'
        else:
            # Insert new log
            result = collection.insert_one(wellness_log)
            wellness_log['_id'] = result.inserted_id
            action = 'created'
        
        # Log audit trail
        log_audit('wellness_log_save', 'system', 
                 f"Wellness log {action} for date {data.get('date')}")
        
        return jsonify({
            'status': 'success',
            'message': f'Wellness log {action} successfully',
            'log_id': wellness_log['log_id'],
            'action': action
        })
        
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/wellness/daily-log/<date>', methods=['GET'])
def api_get_wellness_log(date):
    """Get wellness log for a specific date"""
    try:
        from pymongo import MongoClient
        client = MongoClient('mongodb://localhost:27017/')
        db = client['ptsd_therapy']
        collection = db['wellness_logs']
        
        log = collection.find_one({'date': date})
        
        if log:
            log['_id'] = str(log['_id'])  # Convert ObjectId to string
            return jsonify({
                'status': 'success',
                'log': log
            })
        else:
            return jsonify({
                'status': 'success',
                'log': None,
                'message': 'No log found for this date'
            })
            
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

# --- Mindfulness Endpoints ---

@app.route('/dashboard/mindfulness')
def dashboard_mindfulness():
    """Dashboard page for mindfulness and meditation with breathing exercises and timers"""
    return render_template('dashboard/mindfulness.html')

@app.route('/api/mindfulness/save-session', methods=['POST'])
def api_save_mindfulness_session():
    """Save mindfulness session to database"""
    data = request.json
    
    try:
        from pymongo import MongoClient
        import uuid
        
        client = MongoClient('mongodb://localhost:27017/')
        db = client['ptsd_therapy']
        collection = db['mindfulness_sessions']
        
        # Create mindfulness session document
        session = {
            'session_id': f"ms_{uuid.uuid4().hex[:8]}",
            'date': data.get('date'),
            'type': data.get('type'),  # breathing, meditation, relaxation
            'duration': int(data.get('duration', 0)),  # in minutes
            'completed': data.get('completed', True),
            'notes': data.get('notes', ''),
            'created_at': datetime.utcnow()
        }
        
        # Insert session
        result = collection.insert_one(session)
        session['_id'] = result.inserted_id
        
        # Log audit trail
        log_audit('mindfulness_session', 'system', 
                 f"Mindfulness session completed: {data.get('type')} for {data.get('duration')} minutes")
        
        return jsonify({
            'status': 'success',
            'message': 'Mindfulness session saved successfully',
            'session_id': session['session_id']
        })
        
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/mindfulness/sessions', methods=['GET'])
def api_get_mindfulness_sessions():
    """Get mindfulness sessions with optional filtering"""
    try:
        from pymongo import MongoClient
        client = MongoClient('mongodb://localhost:27017/')
        db = client['ptsd_therapy']
        collection = db['mindfulness_sessions']
        
        # Get filter parameters
        session_type = request.args.get('type')
        days = int(request.args.get('days', 30))  # Default last 30 days
        
        # Build query
        query = {}
        if session_type:
            query['type'] = session_type
        
        # Date filter
        from datetime import datetime, timedelta
        start_date = datetime.utcnow() - timedelta(days=days)
        query['created_at'] = {'$gte': start_date}
        
        # Get sessions
        sessions = collection.find(query).sort('created_at', -1)
        sessions_list = []
        
        for session in sessions:
            sessions_list.append({
                'id': str(session['_id']),
                'session_id': session['session_id'],
                'date': session['date'],
                'type': session['type'],
                'duration': session['duration'],
                'completed': session['completed'],
                'created_at': session['created_at'].isoformat()
            })
        
        return jsonify({
            'status': 'success',
            'sessions': sessions_list,
            'count': len(sessions_list)
        })
        
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/dashboard/mcp-memory')
def dashboard_mcp_memory():
    """Redirect to developer-only MCP Memory access"""
    return redirect('/dev/mcp-memory?dev_key=mindshift_dev_2024')

@app.route('/test-dashboard')
def test_dashboard():
    """Test page for dashboard functions"""
    try:
        with open('test_dashboard_functions.html', 'r', encoding='utf-8') as f:
            content = f.read()
        return content
    except FileNotFoundError:
        return '''
        <!DOCTYPE html>
        <html>
        <head><title>Test Page Not Found</title></head>
        <body>
            <h1>Test page not found</h1>
            <p>Please make sure test_dashboard_functions.html exists in the root directory.</p>
            <p><a href="/dashboard">Go to Dashboard</a></p>
        </body>
        </html>
        ''', 404

@app.route('/api/audit', methods=['GET'])
def audit():
    audit_data = list(mongo.db.audit_log.find({}, {'_id': 0}).sort('timestamp', -1).limit(100))
    return jsonify({'audit': audit_data})

# Session Management & Feedback APIs
@app.route('/api/session-feedback', methods=['POST', 'GET'])
def api_session_feedback():
    """Submit or retrieve session feedback"""
    if request.method == 'POST':
        try:
            data = request.get_json()
            
            # Enhanced feedback data structure
            feedback_doc = {
                # Session information
                'patient_id': data.get('patientId', 'unknown'),
                'patient_name': data.get('patientName', 'אנונימי'),
                'session_type': data.get('sessionType', 'מושלם'),
                'session_date': data.get('sessionDate'),
                'start_time': data.get('startTime'),
                'end_time': data.get('endTime'),
                'session_duration_minutes': data.get('sessionDuration', 0),
                'chapters_completed': data.get('chaptersCompleted', 0),
                
                # Ratings and feedback
                'final_sud': data.get('finalSUD', 50),
                'helpfulness_rating': data.get('helpfulness', 5),
                'comfort_rating': data.get('comfort', 5),
                'difficulty_rating': data.get('difficulty', 5),
                'improvement_rating': data.get('improvement', 5),
                'would_recommend': data.get('wouldRecommend', 'yes'),
                'comments': data.get('comments', ''),
                
                # Timestamps
                'submitted_at': data.get('submittedAt'),
                'created_at': datetime.utcnow(),
                'timestamp': datetime.utcnow()
            }
            
            # Save to MongoDB
            result = mongo.db.session_feedback.insert_one(feedback_doc)
            
            # Update patient's session count and last session date
            try:
                mongo.db.patients.update_one(
                    {'patient_id': feedback_doc['patient_id']},
                    {
                        '$set': {
                            'last_session_date': feedback_doc['created_at'],
                            'last_session_type': feedback_doc['session_type']
                        },
                        '$inc': {'session_count': 1}
                    }
                )
            except Exception as e:
                print(f"Error updating patient session count: {e}")
            
            return jsonify({
                'status': 'success',
                'message': 'משוב נשמר בהצלחה',
                'feedback_id': str(result.inserted_id)
            })
            
        except Exception as e:
            print(f"Session feedback submission error: {e}")
            return jsonify({
                'status': 'error',
                'message': 'שגיאה בשמירת המשוב'
            }), 500
    
    else:  # GET request
        try:
            # Get recent feedback for dashboard
            feedback_data = list(mongo.db.session_feedback.find(
                {},
                {'_id': 0}
            ).sort('created_at', -1).limit(50))
            
            # Calculate statistics
            total_feedback = len(feedback_data)
            completed_sessions = len([f for f in feedback_data if f.get('session_type') == 'מושלם'])
            avg_helpfulness = sum(f.get('helpfulness_rating', 0) for f in feedback_data) / max(total_feedback, 1)
            avg_improvement = sum(f.get('improvement_rating', 0) for f in feedback_data) / max(total_feedback, 1)
            recommendations = len([f for f in feedback_data if f.get('would_recommend') == 'yes'])
            
            return jsonify({
                'status': 'success',
                'feedback': feedback_data,
                'statistics': {
                    'total_feedback': total_feedback,
                    'completed_sessions': completed_sessions,
                    'completion_rate': round((completed_sessions / max(total_feedback, 1)) * 100, 1),
                    'avg_helpfulness': round(avg_helpfulness, 1),
                    'avg_improvement': round(avg_improvement, 1),
                    'recommendation_rate': round((recommendations / max(total_feedback, 1)) * 100, 1)
                }
            })
            
        except Exception as e:
            print(f"Session feedback retrieval error: {e}")
            return jsonify({
                'status': 'error',
                'message': 'שגיאה בטעינת נתוני המשוב'
            }), 500

@app.route('/api/exit-session', methods=['POST'])
def exit_session():
    """Handle session exit with tracking"""
    try:
        session_data = request.get_json()
        
        # Add timestamp and exit status
        session_data['exit_timestamp'] = datetime.utcnow().isoformat()
        session_data['session_status'] = 'exited'
        
        # Store in MongoDB
        result = mongo.db.session_exits.insert_one(session_data)
        
        return jsonify({
            'status': 'success',
            'message': 'יציאה מהמפגש נרשמה',
            'session_id': str(result.inserted_id)
        })
        
    except Exception as e:
        print(f"Exit session error: {e}")
        return jsonify({'status': 'error', 'message': 'שגיאה ברישום יציאה'})

@app.route('/api/previous-scenario', methods=['POST'])
def previous_scenario():
    """Navigate back to previous chapter"""
    try:
        data = request.get_json()
        patient_id = data.get('patient_id')
        scenario_state = data.get('scenario_state', {})
        target_stage = data.get('target_stage', 1)
        
        if not patient_id:
            return jsonify({'status': 'error', 'message': 'לא נמצא מטופל פעיל'})
        
        current_stage = scenario_state.get('current_stage', 1)
        
        # Validate target stage
        if target_stage >= current_stage:
            return jsonify({'status': 'error', 'message': 'לא ניתן לעבור לפרק עתידי'})
        
        if target_stage < 1:
            return jsonify({'status': 'error', 'message': 'מספר פרק לא תקין'})
        
        # Update scenario state
        scenario_state['current_stage'] = target_stage
        
        # Generate story for target stage
        story = generate_chapter_story(patient_id, scenario_state, target_stage)
        
        # Save updated scenario state
        session['scenario_state'] = scenario_state
        
        return jsonify({
            'status': 'success',
            'result': story,
            'stage': target_stage,
            'scenario_state': scenario_state
        })
        
    except Exception as e:
        print(f"Previous scenario error: {e}")
        return jsonify({'status': 'error', 'message': 'שגיאה בחזרה לפרק קודם'})

def generate_next_chapter(patient_id, scenario_state, stage):
    """Generate story for next chapter"""
    return generate_chapter_story(patient_id, scenario_state, stage)

def generate_chapter_story(patient_id, scenario_state, stage):
    """Generate story for specific chapter/stage"""
    try:
        # Get patient data
        patient = mongo.db.patients.find_one({'patient_id': patient_id})
        if not patient:
            raise Exception("Patient not found")
        
        # Build prompt based on stage and patient data
        trauma_context = patient.get('trauma_background', patient.get('general_info', 'טראומה כללית'))
        current_sud = scenario_state.get('current_sud', 50)
        patient_name = patient.get('name', 'המטופל')
        
        # Get patient's specific triggers and avoidances for more personalized content
        triggers = patient.get('triggers', [])
        avoidances = patient.get('avoidances', [])
        
        trigger_text = ', '.join([t.get('name', t) if isinstance(t, dict) else str(t) for t in triggers[:3]]) if triggers else "טריגרים כלליים"
        avoidance_text = ', '.join([a.get('name', a) if isinstance(a, dict) else str(a) for a in avoidances[:3]]) if avoidances else "הימנעויות כלליות"
        
        stage_prompts = {
            1: f"""צור פרק ראשון של סיפור טיפולי בעברית עבור {patient_name} עם רקע טראומה של {trauma_context}. 
            רמת SUD נוכחית: {current_sud}/100. 
            הטריגרים העיקריים: {trigger_text}.
            הפרק צריך להיות עדין ומכין את הקורא לחשיפה מדורגת, מתחיל ברמת חרדה נמוכה.
            הסיפור צריך להיות באורך של 300-400 מילים בעברית, עם דמויות וסיטואציות שהקורא יכול להזדהות איתן.
            התחל בסיטואציה בטוחה ויציבה שקשורה לרקע הטראומה בצורה עדינה.""",
            
            2: f"""צור פרק שני של סיפור טיפולי בעברית עבור {patient_name} עם רקע טראומה של {trauma_context}. 
            רמת SUD נוכחית: {current_sud}/100. 
            הטריגרים העיקריים: {trigger_text}.
            ההימנעויות העיקריות: {avoidance_text}.
            הפרק צריך להעמיק את החשיפה בצורה מדורגת ובטוחה, להגביר קלות את רמת החרדה.
            הסיפור צריך להיות באורך של 350-450 מילים בעברית.
            הכנס אלמנטים שקשורים לטריגרים בצורה הדרגתית ובטוחה, תוך מתן כלים להתמודדות.""",
            
            3: f"""צור פרק שלישי וסופי של סיפור טיפולי בעברית עבור {patient_name} עם רקע טראומה של {trauma_context}. 
            רמת SUD נוכחית: {current_sud}/100. 
            הטריגרים העיקריים: {trigger_text}.
            ההימנעויות העיקריות: {avoidance_text}.
            הפרק צריך לסגור את הסיפור בצורה חיובית ומעצימה, להראות התמודדות מוצלחת.
            הסיפור צריך להיות באורך של 400-500 מילים בעברית.
            הדגש את הכוח הפנימי, המשאבים הזמינים, והתקדמות שנעשתה. סיים בהודעה של תקווה וחיזוק."""
        }
        
        prompt = stage_prompts.get(stage, stage_prompts[1])
        
        # Use the orchestrator directly with the custom prompt
        try:
            # Generate story using the orchestrator's story generation with our custom prompt
            # Use the story generation agent directly with the detailed prompt
            story_text = orchestrator.story_gen.generate_story(
                part=stage,
                plan=prompt,  # Use our custom prompt as the plan
                previous_parts=[],
                rules=None
            )
            
            # Clean up the response if needed
            if isinstance(story_text, dict):
                story_text = story_text.get('story', story_text.get('content', str(story_text)))
            
        except Exception as orch_error:
            print(f"Orchestrator error: {orch_error}")
            # Fallback: Use a simple story template with the patient data
            story_text = f"""
{patient_name}, 

 זה של המסע הטיפולי שלך, אנו ממשיכים לצעוד יחד קדימה. 

אתה יודע שיש לך כוח פנימי עצום. הדרך להחלמה אינה קלה, אך כל צעד קטן הוא ניצחון.

היום, בעוד אתה קורא את המילים הללו, זכור שאתה לא לבד. יש לך משאבים, יש לך תמיכה, ויש לך את היכולת להתמודד.

{trauma_context} השפיע עליך, אך הוא לא מגדיר אותך. אתה הרבה יותר מהחוויות הקשות שעברת.

בואו נמשיך יחד, צעד אחר צעד, לקראת עתיד טוב יותר.

אתה חזק יותר ממה שאתה חושב.
"""
        
        # Generate TTS audio
        audio_file = None
        try:
            from services.story_gen import generate_audio_file
            audio_file = generate_audio_file(story_text, patient)
        except Exception as audio_error:
            print(f"TTS generation error: {audio_error}")
            # Continue without audio
        
        # Save the generated story to database
        story_doc = {
            'patient_id': patient_id,
            'stage': stage,
            'story': story_text,
            'audio_file': audio_file,
            'sud_level': current_sud,
            'timestamp': datetime.utcnow(),
            'prompt_used': prompt,
            'metadata': {
                'generated_at': datetime.utcnow().isoformat(),
                'sud_level': current_sud,
                'patient_id': patient_id,
                'trauma_context': trauma_context,
                'triggers': triggers,
                'avoidances': avoidances
            }
        }
        
        mongo.db.stories.insert_one(story_doc)
        
        return {
            'story': story_text,
            'audio_file': audio_file,
            'stage': stage,
            'metadata': story_doc['metadata']
        }
        
    except Exception as e:
        print(f"Generate chapter story error: {e}")
        return {
            'story': f'סיפור לפרק {stage} זמנית לא זמין. אנא נסה שוב.',
            'audio_file': None,
            'stage': stage,
            'metadata': {
                'error': str(e),
                'generated_at': datetime.utcnow().isoformat()
            }
        }

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000) 