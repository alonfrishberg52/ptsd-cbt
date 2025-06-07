import React, { useState } from 'react';
import PropTypes from 'prop-types';

const containerStyle = { border: '1px solid #e2e8f0', borderRadius: 12, background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', marginBottom: 16, padding: 16, fontFamily: 'inherit' };
const tabStyle = isActive => ({ padding: '6px 12px', borderRadius: 8, border: isActive ? '1px solid #2563eb' : '1px solid #e5e7eb', background: isActive ? '#2563eb' : '#f9fafb', color: isActive ? '#fff' : '#1e293b', marginRight: 8, cursor: 'pointer', fontWeight: 500 });
const selectStyle = { padding: 6, borderRadius: 8, border: '1px solid #e5e7eb', marginLeft: 8 };
const timelineItemStyle = (highlight, past) => ({ padding: 8, borderRadius: 8, background: highlight ? '#dbeafe' : past ? '#f1f5f9' : '#fff', marginBottom: 8, border: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', fontSize: 14 });

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('he-IL');
}

/**
 * @typedef {Object} Session
 * @property {string} id
 * @property {string} patientName
 * @property {string} patientId
 * @property {string} date // ISO string
 * @property {string} time
 * @property {string} type
 * @property {boolean} completed
 */

/**
 * @typedef {Object} SessionCalendarTimelineProps
 * @property {Session[]} sessions
 * @property {Array<{id: string, name: string}>} patients
 */

/**
 * @param {SessionCalendarTimelineProps} props
 */
const SessionCalendarTimeline = ({ sessions, patients }) => {
  const [view, setView] = useState('calendar');
  const [selectedPatient, setSelectedPatient] = useState('all');
  const filteredSessions = selectedPatient === 'all' ? sessions : sessions.filter(s => s.patientId === selectedPatient);

  return (
    <div style={containerStyle}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
        <button style={tabStyle(view === 'calendar')} onClick={() => setView('calendar')}>📅 לוח שנה</button>
        <button style={tabStyle(view === 'timeline')} onClick={() => setView('timeline')}>🕒 ציר זמן</button>
        <select style={selectStyle} value={selectedPatient} onChange={e => setSelectedPatient(e.target.value)}>
          <option value="all">כל המטופלים</option>
          {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>
      {view === 'calendar' ? (
        <div style={{ minHeight: 80, color: '#64748b', fontSize: 14 }}>
          {/* Simple calendar: just list sessions by date */}
          {filteredSessions.length === 0 ? 'אין מפגשים להצגה.' :
            filteredSessions.map(s => (
              <div key={s.id} style={{ marginBottom: 8 }}>
                <span style={{ fontWeight: 600 }}>{formatDate(s.date)}</span> — {s.patientName} ({s.type}) {s.completed ? '✔️' : ''}
              </div>
            ))}
        </div>
      ) : (
        <div>
          {filteredSessions.length === 0 ? 'אין מפגשים להצגה.' :
            filteredSessions
              .sort((a, b) => new Date(a.date) - new Date(b.date))
              .map(s => {
                const now = new Date();
                const d = new Date(s.date);
                const highlight = d.toDateString() === now.toDateString();
                const past = d < now && !highlight;
                return (
                  <div key={s.id} style={timelineItemStyle(highlight, past)}>
                    <div><b>{s.patientName}</b> ({s.type})</div>
                    <div>{formatDate(s.date)} {s.time}</div>
                    <div>{s.completed ? 'הושלם ✔️' : 'לא הושלם'}</div>
                  </div>
                );
              })}
        </div>
      )}
    </div>
  );
};

SessionCalendarTimeline.propTypes = {
  sessions: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      patientName: PropTypes.string.isRequired,
      patientId: PropTypes.string.isRequired,
      date: PropTypes.string.isRequired,
      time: PropTypes.string.isRequired,
      type: PropTypes.string.isRequired,
      completed: PropTypes.bool.isRequired,
    })
  ).isRequired,
  patients: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
    })
  ).isRequired,
};

export default SessionCalendarTimeline; 