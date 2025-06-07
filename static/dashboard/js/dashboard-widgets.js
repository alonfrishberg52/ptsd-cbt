import React from 'react';
import { createRoot } from 'react-dom/client';
import PatientOverviewCard from '../components/PatientOverviewCard';
import SessionCalendarTimeline from '../components/SessionCalendarTimeline';
import ExportShareReportWidget from '../components/ExportShareReportWidget';

// Example demo data (replace with real data integration)
const demoPatient = {
  id: '1',
  name: 'דנה כהן',
  avatarUrl: '',
  initials: 'דכ',
  lastSession: '2024-06-01',
  stats: [
    { label: 'SUD', value: 4, trend: 'down', color: 'success' },
    { label: 'Compliance', value: '95%', trend: 'up', color: 'success' },
    { label: 'Sessions', value: 12, color: 'default' },
  ],
  flagged: true,
};

const demoSessions = [
  { id: 's1', patientName: 'דנה כהן', patientId: '1', date: '2024-06-01', time: '10:00', type: 'Individual', completed: true },
  { id: 's2', patientName: 'דנה כהן', patientId: '1', date: '2024-06-08', time: '10:00', type: 'Individual', completed: false },
];
const demoPatients = [ { id: '1', name: 'דנה כהן' } ];

function handleExportPDF() { return Promise.resolve(); }
function handleExportCSV() { return Promise.resolve(); }
function handleExportJSON() { return Promise.resolve(); }
function handleShareLink() { return Promise.resolve('https://example.com/share/123'); }

// Mount PatientOverviewCard
const patientCardRoot = document.getElementById('react-patient-card-widget');
if (patientCardRoot) {
  createRoot(patientCardRoot).render(<PatientOverviewCard patient={demoPatient} />);
}

// Mount SessionCalendarTimeline
const sessionCalendarRoot = document.getElementById('react-session-calendar-widget');
if (sessionCalendarRoot) {
  createRoot(sessionCalendarRoot).render(
    <SessionCalendarTimeline sessions={demoSessions} patients={demoPatients} />
  );
}

// Mount ExportShareReportWidget
const exportWidgetRoot = document.getElementById('react-export-widget');
if (exportWidgetRoot) {
  createRoot(exportWidgetRoot).render(
    <ExportShareReportWidget
      onExportPDF={handleExportPDF}
      onExportCSV={handleExportCSV}
      onExportJSON={handleExportJSON}
      onShareLink={handleShareLink}
    />
  );
} 