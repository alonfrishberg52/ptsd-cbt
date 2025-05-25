"""
Flask application with MongoDB integration and text-to-speech capabilities for PTSD story generation.
"""

from flask import Flask, render_template, request, jsonify, send_file, session, redirect, flash, url_for
from flask_pymongo import PyMongo
from gtts import gTTS
from datetime import datetime, timedelta
import os
from agents.PTSDAgents import OrchestratorAgent, summarize_story_llm
from agents.PTSDEvalTools import PatientDataParser
from services.exposure import ExposureProgressionService
from services.exposure_plan_service import ExposurePlanService
from bson import ObjectId
import uuid
from flask_cors import CORS
import socket

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

    patient_id = session.get('patient_id')
    if not patient_id:
        return jsonify({'status': 'error', 'message': 'No patient ID in session.'}), 400

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
    mongo.db.stories.insert_one({
        'patient_id': patient_id,
        'stage': 1,
        'result': result,
        'sud': initial_sud,
        'timestamp': datetime.utcnow()
    })
    log_audit('update_story', patient_profile.get('name', patient_id), f"Started scenario, SUD: {initial_sud}")
    session['scenario_state'] = {
        'stage': 1,
        'sud_history': [initial_sud]
    }
    return jsonify({
        'status': 'success',
        'stage': 1,
        'result': result
    })

@app.route('/api/next-scenario', methods=['POST'])
def next_scenario():
    data = request.json
    current_sud = data.get('current_sud')
    if current_sud is None:
        return jsonify({'status': 'error', 'message': 'Missing SUD value.'}), 400
    try:
        current_sud = int(current_sud)
    except Exception:
        return jsonify({'status': 'error', 'message': 'Invalid SUD value.'}), 400

    patient_id = session.get('patient_id')
    scenario_state = session.get('scenario_state')
    if not patient_id or not scenario_state:
        return jsonify({'status': 'error', 'message': 'No scenario in progress.'}), 400

    stage = scenario_state['stage'] + 1
    scenario_state['stage'] = stage
    scenario_state['sud_history'].append(current_sud)

    # If finished all 3 chapters, do NOT generate a new story, just return 'done'
    if stage > 3:
        session['scenario_state'] = scenario_state
        return jsonify({'status': 'done'})

    patient_profile = mongo.db.patients.find_one({'patient_id': patient_id}, {'_id': 0})
    previous_stories = list(mongo.db.stories.find({'patient_id': patient_id}).sort('stage', 1))
    previous_parts = [doc['result']['story'] for doc in previous_stories]

    result = exposure_service.story_service.generate_story(
        patient_profile=patient_profile,
        exposure_stage=stage,
        last_sud=current_sud,
        previous_parts=previous_parts
    )
    mongo.db.stories.insert_one({
        'patient_id': patient_id,
        'stage': stage,
        'result': result,
        'sud': current_sud,
        'timestamp': datetime.utcnow()
    })
    session['scenario_state'] = scenario_state
    return jsonify({
        'status': 'success',
        'stage': stage,
        'result': result
    })

@app.route('/api/stories', methods=['GET'])
def get_stories():
    """Get all generated stories."""
    try:
        stories = list(mongo.db.stories.find({}, {'_id': 0}))
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
    audit_logs = list(mongo.db.audit.find({}, {'_id': 0}).sort('timestamp', -1).limit(20))
    return render_template('dashboard/audit_log.html', audit_logs=audit_logs)

@app.route('/dashboard/compliance')
def dashboard_compliance():
    compliance_reports = list(mongo.db.compliance.find({}, {'_id': 0}).sort('timestamp', -1).limit(20))
    return render_template('dashboard/rule_compliance_report.html', compliance_reports=compliance_reports)

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
        'dashboard/summary.html',
        total_patients=total_patients,
        total_stories=total_stories,
        sud_feedback=sud_feedback,
        session_feedback=session_feedback,
        recent_activity=recent_activity
    )

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

@app.route('/api/stories', methods=['GET', 'POST'])
def api_stories():
    if request.method == 'GET':
        stories = list(mongo.db.stories.find({}, {'_id': 0}))
        return jsonify({'status': 'success', 'stories': stories})
    elif request.method == 'POST':
        story_data = request.json
        mongo.db.stories.insert_one(story_data)
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
        patient_data = request.json
        mongo.db.patients.insert_one(patient_data)
        return jsonify({'status': 'success'})

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
    sud = scenario_state['sud_history'][-1] if 'sud_history' in scenario_state and scenario_state['sud_history'] else None
    session_complete = stage > 3
    return render_template('session.html', story=story, sud=sud, stage=stage, session_complete=session_complete)

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

if __name__ == '__main__':
    app.run(debug=True) 