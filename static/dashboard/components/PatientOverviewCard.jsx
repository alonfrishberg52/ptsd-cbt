import React from 'react';
import PropTypes from 'prop-types';

const cardStyle = {
  border: '1px solid #e2e8f0',
  borderRadius: 12,
  background: '#fff',
  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
  marginBottom: 16,
  overflow: 'hidden',
  fontFamily: 'inherit',
};
const headerStyle = { display: 'flex', alignItems: 'center', padding: 16, borderBottom: '1px solid #f1f5f9' };
const avatarStyle = { width: 48, height: 48, borderRadius: '50%', background: '#e0e7ff', color: '#3730a3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 22, marginRight: 16 };
const nameStyle = { fontWeight: 600, fontSize: 18 };
const statGrid = { display: 'flex', gap: 16, margin: '16px 0' };
const statBox = { flex: 1, textAlign: 'center' };
const badgeStyle = { background: '#fee2e2', color: '#b91c1c', borderRadius: 8, padding: '2px 8px', fontSize: 12, marginLeft: 8 };
const footerStyle = { borderTop: '1px solid #f1f5f9', padding: 12, display: 'flex', gap: 8 };
const btnStyle = { flex: 1, padding: '6px 0', border: '1px solid #e5e7eb', borderRadius: 8, background: '#f9fafb', cursor: 'pointer', fontWeight: 500, fontSize: 14 };

const PatientOverviewCard = ({ patient }) => (
  <div style={cardStyle}>
    <div style={headerStyle}>
      {patient.avatarUrl ? (
        <img src={patient.avatarUrl} alt={patient.name} style={avatarStyle} />
      ) : (
        <div style={avatarStyle}>{patient.initials}</div>
      )}
      <div>
        <div style={nameStyle}>{patient.name}
          {patient.flagged && <span style={badgeStyle}>⚠️ נדרש מעקב</span>}
        </div>
        <div style={{ fontSize: 13, color: '#64748b' }}>מפגש אחרון: {patient.lastSession}</div>
      </div>
    </div>
    <div style={statGrid}>
      {patient.stats.map((stat, i) => (
        <div key={i} style={statBox}>
          <div style={{ fontSize: 12, color: '#64748b' }}>{stat.label}</div>
          <div style={{ fontWeight: 600, fontSize: 16 }}>
            {stat.value} {stat.trend === 'up' ? '⬆️' : stat.trend === 'down' ? '⬇️' : ''}
          </div>
        </div>
      ))}
    </div>
    <div style={footerStyle}>
      <button style={btnStyle}>👁️ צפייה</button>
      <button style={btnStyle}>💬 הודעה</button>
      <button style={btnStyle}>🚩 סימון</button>
    </div>
  </div>
);

PatientOverviewCard.propTypes = {
  patient: PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    avatarUrl: PropTypes.string,
    initials: PropTypes.string.isRequired,
    lastSession: PropTypes.string.isRequired,
    stats: PropTypes.arrayOf(
      PropTypes.shape({
        label: PropTypes.string.isRequired,
        value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
        trend: PropTypes.oneOf(['up', 'down', null]),
        color: PropTypes.string,
      })
    ).isRequired,
    flagged: PropTypes.bool,
  }).isRequired,
};

export default PatientOverviewCard; 