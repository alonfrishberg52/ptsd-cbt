export const API_BASE_URL = 'http://172.20.10.2:5000'; // Updated to use computer's IP for mobile access

export async function fetchPatients() {
  const res = await fetch(`${API_BASE_URL}/api/patients`);
  const data = await res.json();
  return data.patients || [];
}

export async function fetchStories(patientId) {
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
  const res = await fetch(`${API_BASE_URL}/api/patients/${patientId}`);
  const data = await res.json();
  return data.patient;
}
export async function createPatient(patient) {
  const res = await fetch(`${API_BASE_URL}/api/patients`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patient),
  });
  return res.json();
}
export async function updatePatient(patientId, update) {
  const res = await fetch(`${API_BASE_URL}/api/patients/${patientId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(update),
  });
  return res.json();
}
export async function patientLookup(name) {
  const res = await fetch(`${API_BASE_URL}/api/patient-lookup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  return res.json();
}

// Profile
export async function submitProfile(profile) {
  const res = await fetch(`${API_BASE_URL}/api/profile`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(profile),
  });
  return res.json();
}

// Plans
export async function fetchPlans() {
  const res = await fetch(`${API_BASE_URL}/api/plans`);
  const data = await res.json();
  return data.plans || [];
}
export async function fetchPlan(planId) {
  const res = await fetch(`${API_BASE_URL}/api/plans/${planId}`);
  const data = await res.json();
  return data.plan;
}
export async function createPlan(plan) {
  const res = await fetch(`${API_BASE_URL}/api/plans`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(plan),
  });
  return res.json();
}
export async function updatePlan(planId, update) {
  const res = await fetch(`${API_BASE_URL}/api/plans/${planId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(update),
  });
  return res.json();
}

// Stories
export async function fetchStory(storyId) {
  const res = await fetch(`${API_BASE_URL}/api/stories/${storyId}`);
  const data = await res.json();
  return data.story;
}
export async function createStory(story) {
  const res = await fetch(`${API_BASE_URL}/api/stories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(story),
  });
  return res.json();
}
export async function updateStory(storyId, update) {
  const res = await fetch(`${API_BASE_URL}/api/stories/${storyId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(update),
  });
  return res.json();
}

// SUD Feedback
export async function submitSudFeedback(feedback) {
  const res = await fetch(`${API_BASE_URL}/api/submit-sud-feedback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(feedback),
  });
  return res.json();
}
export async function fetchSudFeedback({ planId, patientId }) {
  const url = planId ? `${API_BASE_URL}/api/get-sud-feedback?plan_id=${planId}` : `${API_BASE_URL}/api/get-sud-feedback?patient_id=${patientId}`;
  const res = await fetch(url);
  const data = await res.json();
  return data.feedback || [];
}

// Audit
export async function fetchAudit() {
  const res = await fetch(`${API_BASE_URL}/api/audit`);
  const data = await res.json();
  return data.audit || [];
}

// Compliance
export async function fetchCompliance(storyId) {
  const res = await fetch(`${API_BASE_URL}/api/compliance/${storyId}`);
  const data = await res.json();
  return data.compliance;
}

// Patient Data Parsing
export async function parsePatientData(patient_data) {
  const res = await fetch(`${API_BASE_URL}/api/parse-patient-data`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ patient_data }),
  });
  return res.json();
}

// Exa Research APIs
export async function searchPTSDResearch(query) {
  const res = await fetch(`${API_BASE_URL}/api/research/ptsd`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  const data = await res.json();
  return data.results || [];
}

export async function searchCBTTechniques(technique) {
  const res = await fetch(`${API_BASE_URL}/api/research/cbt-techniques`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ technique }),
  });
  const data = await res.json();
  return data.results || [];
}

export async function fetchExposureTherapyMethods() {
  const res = await fetch(`${API_BASE_URL}/api/research/exposure-therapy`);
  const data = await res.json();
  return data.results || [];
}

export async function fetchSUDScaleResearch() {
  const res = await fetch(`${API_BASE_URL}/api/research/sud-scale`);
  const data = await res.json();
  return data.results || [];
}

export async function fetchNarrativeTherapy() {
  const res = await fetch(`${API_BASE_URL}/api/research/narrative-therapy`);
  const data = await res.json();
  return data.results || [];
}

export async function searchTherapistResources(topic) {
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
  const res = await fetch(`${API_BASE_URL}/api/start-scenario`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      patient_id: patientId,
      initial_sud: initialSud 
    }),
  });
  return res.json();
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