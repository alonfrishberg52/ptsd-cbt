export const API_BASE_URL = 'http://10.100.102.3:5000';

export async function fetchPatients() {
  console.log('[API] GET', `${API_BASE_URL}/api/patients`);
  const res = await fetch(`${API_BASE_URL}/api/patients`);
  const data = await res.json();
  return data.patients || [];
}

export async function fetchStories(patientId) {
  console.log('[API] GET', `${API_BASE_URL}/api/stories`);
  const res = await fetch(`${API_BASE_URL}/api/stories`);
  const data = await res.json();
  // Filter stories by patientId
  return (data.stories || []).filter(s => s.patient_id === patientId);
}

export function getAudioUrl(audioFile) {
  return `${API_BASE_URL}/static/audio/${audioFile}`;
}

// Patients
export async function fetchPatient(patientId) {
  console.log('[API] GET', `${API_BASE_URL}/api/patients/${patientId}`);
  const res = await fetch(`${API_BASE_URL}/api/patients/${patientId}`);
  const data = await res.json();
  return data.patient;
}
export async function createPatient(patient) {
  console.log('[API] POST', `${API_BASE_URL}/api/patients`, patient);
  const res = await fetch(`${API_BASE_URL}/api/patients`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patient),
  });
  return res.json();
}
export async function updatePatient(patientId, update) {
  console.log('[API] PUT', `${API_BASE_URL}/api/patients/${patientId}`, update);
  const res = await fetch(`${API_BASE_URL}/api/patients/${patientId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(update),
  });
  return res.json();
}
export async function patientLookup(name) {
  console.log('[API] POST', `${API_BASE_URL}/api/patient-lookup`, { name });
  const res = await fetch(`${API_BASE_URL}/api/patient-lookup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  return res.json();
}

// Profile
export async function submitProfile(profile) {
  console.log('[API] POST', `${API_BASE_URL}/api/profile`, profile);
  const res = await fetch(`${API_BASE_URL}/api/profile`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(profile),
  });
  return res.json();
}

// Plans
export async function fetchPlans() {
  console.log('[API] GET', `${API_BASE_URL}/api/plans`);
  const res = await fetch(`${API_BASE_URL}/api/plans`);
  const data = await res.json();
  return data.plans || [];
}
export async function fetchPlan(planId) {
  console.log('[API] GET', `${API_BASE_URL}/api/plans/${planId}`);
  const res = await fetch(`${API_BASE_URL}/api/plans/${planId}`);
  const data = await res.json();
  return data.plan;
}
export async function createPlan(plan) {
  console.log('[API] POST', `${API_BASE_URL}/api/plans`, plan);
  const res = await fetch(`${API_BASE_URL}/api/plans`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(plan),
  });
  return res.json();
}
export async function updatePlan(planId, update) {
  console.log('[API] PUT', `${API_BASE_URL}/api/plans/${planId}`, update);
  const res = await fetch(`${API_BASE_URL}/api/plans/${planId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(update),
  });
  return res.json();
}

// Stories
export async function fetchStory(storyId) {
  console.log('[API] GET', `${API_BASE_URL}/api/stories/${storyId}`);
  const res = await fetch(`${API_BASE_URL}/api/stories/${storyId}`);
  const data = await res.json();
  return data.story;
}
export async function createStory(story) {
  console.log('[API] POST', `${API_BASE_URL}/api/stories`, story);
  const res = await fetch(`${API_BASE_URL}/api/stories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(story),
  });
  return res.json();
}
export async function updateStory(storyId, update) {
  console.log('[API] PUT', `${API_BASE_URL}/api/stories/${storyId}`, update);
  const res = await fetch(`${API_BASE_URL}/api/stories/${storyId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(update),
  });
  return res.json();
}

// SUD Feedback
export async function submitSudFeedback(feedback) {
  console.log('[API] POST', `${API_BASE_URL}/api/submit-sud-feedback`, feedback);
  const res = await fetch(`${API_BASE_URL}/api/submit-sud-feedback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(feedback),
  });
  return res.json();
}
export async function fetchSudFeedback({ planId, patientId }) {
  const url = planId ? `${API_BASE_URL}/api/get-sud-feedback?plan_id=${planId}` : `${API_BASE_URL}/api/get-sud-feedback?patient_id=${patientId}`;
  console.log('[API] GET', url);
  const res = await fetch(url);
  const data = await res.json();
  return data.feedback || [];
}

// Audit
export async function fetchAudit() {
  console.log('[API] GET', `${API_BASE_URL}/api/audit`);
  const res = await fetch(`${API_BASE_URL}/api/audit`);
  const data = await res.json();
  return data.audit || [];
}

// Compliance
export async function fetchCompliance(storyId) {
  console.log('[API] GET', `${API_BASE_URL}/api/compliance/${storyId}`);
  const res = await fetch(`${API_BASE_URL}/api/compliance/${storyId}`);
  const data = await res.json();
  return data.compliance;
}

// Patient Data Parsing
export async function parsePatientData(patient_data) {
  console.log('[API] POST', `${API_BASE_URL}/api/parse-patient-data`, { patient_data });
  const res = await fetch(`${API_BASE_URL}/api/parse-patient-data`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ patient_data }),
  });
  return res.json();
}

// Exa Research APIs
export async function searchPTSDResearch(query) {
  console.log('[API] POST', `${API_BASE_URL}/api/research/ptsd`, { query });
  const res = await fetch(`${API_BASE_URL}/api/research/ptsd`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  const data = await res.json();
  return data.results || [];
}

export async function searchCBTTechniques(technique) {
  console.log('[API] POST', `${API_BASE_URL}/api/research/cbt-techniques`, { technique });
  const res = await fetch(`${API_BASE_URL}/api/research/cbt-techniques`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ technique }),
  });
  const data = await res.json();
  return data.results || [];
}

export async function fetchExposureTherapyMethods() {
  console.log('[API] GET', `${API_BASE_URL}/api/research/exposure-therapy`);
  const res = await fetch(`${API_BASE_URL}/api/research/exposure-therapy`);
  const data = await res.json();
  return data.results || [];
}

export async function fetchSUDScaleResearch() {
  console.log('[API] GET', `${API_BASE_URL}/api/research/sud-scale`);
  const res = await fetch(`${API_BASE_URL}/api/research/sud-scale`);
  const data = await res.json();
  return data.results || [];
}

export async function fetchNarrativeTherapy() {
  console.log('[API] GET', `${API_BASE_URL}/api/research/narrative-therapy`);
  const res = await fetch(`${API_BASE_URL}/api/research/narrative-therapy`);
  const data = await res.json();
  return data.results || [];
}

export async function searchTherapistResources(topic) {
  console.log('[API] POST', `${API_BASE_URL}/api/resources/therapist`, { topic });
  const res = await fetch(`${API_BASE_URL}/api/resources/therapist`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topic }),
  });
  const data = await res.json();
  return data.results || [];
}

export async function fetchCopingStrategies() {
  const res = await fetch(`${API_BASE_URL}/api/resources/coping-strategies`);
  const data = await res.json();
  return data.results || [];
}

export async function fetchTriggerManagement() {
  const res = await fetch(`${API_BASE_URL}/api/resources/trigger-management`);
  const data = await res.json();
  return data.results || [];
}

// Scenario-based therapy session APIs
export async function startScenario(patientId, initialSud) {
  console.log('[API] POST', `${API_BASE_URL}/api/start-scenario`, { patient_id: patientId, initial_sud: initialSud });
  try {
    const res = await fetch(`${API_BASE_URL}/api/start-scenario`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patient_id: patientId, initial_sud: initialSud }),
    });
    const data = await res.json();
    console.log('[API] Response status:', res.status, 'body:', data);
    return data;
  } catch (err) {
    console.log('[API] ERROR calling /api/start-scenario:', err);
    throw err;
  }
}

export async function nextScenario(patientId, currentSud, scenarioState) {
  const res = await fetch(`${API_BASE_URL}/api/next-scenario`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      patient_id: patientId,
      current_sud: currentSud,
      scenario_state: scenarioState
    }),
  });
  return res.json();
}

// Session Management & Feedback APIs
export async function submitSessionFeedback(feedback) {
  const res = await fetch(`${API_BASE_URL}/api/session-feedback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(feedback),
  });
  return res.json();
}

export async function exitSession(sessionData) {
  const res = await fetch(`${API_BASE_URL}/api/exit-session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(sessionData),
  });
  return res.json();
}

export async function fetchSessionFeedback(patientId = null) {
  const url = patientId 
    ? `${API_BASE_URL}/api/session-feedback?patient_id=${patientId}`
    : `${API_BASE_URL}/api/session-feedback`;
  const res = await fetch(url);
  const data = await res.json();
  return data.feedback || [];
}

export async function previousScenario(patientId, scenarioState, targetStage) {
  const res = await fetch(`${API_BASE_URL}/api/previous-scenario`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      patient_id: patientId,
      scenario_state: scenarioState,
      target_stage: targetStage
    }),
  });
  return res.json();
}

// Disabled notifications API to prevent system overload
export async function fetchNotifications() {
  // Return empty array instead of making API calls
  console.log('Notifications API disabled to prevent system overload');
  return [];
} 