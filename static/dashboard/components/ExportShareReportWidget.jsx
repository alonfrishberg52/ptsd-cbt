import React, { useState } from 'react';
import PropTypes from 'prop-types';

const containerStyle = { border: '1px solid #e2e8f0', borderRadius: 12, background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', marginBottom: 16, padding: 16, fontFamily: 'inherit' };
const btnStyle = { padding: '6px 12px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#f9fafb', cursor: 'pointer', fontWeight: 500, fontSize: 14, marginRight: 8 };
const inputStyle = { width: '100%', padding: 6, borderRadius: 8, border: '1px solid #e5e7eb', marginTop: 8 };

/**
 * @typedef {Object} ExportShareReportWidgetProps
 * @property {function} onExportPDF
 * @property {function} onExportCSV
 * @property {function} onExportJSON
 * @property {function} onShareLink
 */

/**
 * @param {ExportShareReportWidgetProps} props
 */
const ExportShareReportWidget = ({ onExportPDF, onExportCSV, onExportJSON, onShareLink }) => {
  const [exportStatus, setExportStatus] = useState('');
  const [shareLink, setShareLink] = useState('');

  const handleExport = async (type) => {
    setExportStatus('');
    try {
      if (type === 'pdf') {
        await onExportPDF();
        setExportStatus('PDF ייצוא!');
      } else if (type === 'csv') {
        await onExportCSV();
        setExportStatus('CSV ייצוא!');
      } else if (type === 'json') {
        await onExportJSON();
        setExportStatus('JSON ייצוא!');
      }
    } catch (e) {
      setExportStatus('הייצוא נכשל.');
    }
  };

  const handleShare = async () => {
    setExportStatus('');
    try {
      const link = await onShareLink();
      setShareLink(link);
      setExportStatus('קישור שיתוף נוצר!');
    } catch (e) {
      setExportStatus('השיתוף נכשל.');
    }
  };

  return (
    <div style={containerStyle}>
      <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>ייצוא / שיתוף דוח</div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <button style={btnStyle} onClick={() => handleExport('pdf')}>⬇️ PDF</button>
        <button style={btnStyle} onClick={() => handleExport('csv')}>⬇️ CSV</button>
        <button style={btnStyle} onClick={() => handleExport('json')}>⬇️ JSON</button>
        <button style={btnStyle} onClick={handleShare}>🔗 שיתוף</button>
      </div>
      {exportStatus && (
        <div style={{ color: '#059669', fontSize: 14, marginBottom: 4 }}>{exportStatus}</div>
      )}
      {shareLink && (
        <input style={inputStyle} value={shareLink} readOnly />
      )}
    </div>
  );
};

ExportShareReportWidget.propTypes = {
  onExportPDF: PropTypes.func.isRequired,
  onExportCSV: PropTypes.func.isRequired,
  onExportJSON: PropTypes.func.isRequired,
  onShareLink: PropTypes.func.isRequired,
};

export default ExportShareReportWidget; 