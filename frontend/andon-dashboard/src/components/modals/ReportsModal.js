import React from 'react';

const ReportsModal = ({ 
  showReportsModal, 
  setShowReportsModal, 
  handleViewTable, 
  downloadCSV 
}) => {
  if (!showReportsModal) {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1002,
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '2rem',
        borderRadius: '0.5rem',
        width: '500px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold' }}>Reports</h2>
          <button 
            onClick={() => setShowReportsModal(false)}
            style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#ef4444' }}
          >
            ×
          </button>
        </div>
        
        <div style={{ marginBottom: '2rem' }}>
          <p style={{ margin: '0 0 1rem 0', color: '#6b7280' }}>
            Generate reports for different data views. Select a report type below:
          </p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <button
              onClick={() => { handleViewTable('baydetails'); setShowReportsModal(false); }}
              style={{
                padding: '1rem',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '0.25rem',
                cursor: 'pointer',
                fontSize: '1rem',
                textAlign: 'left'
              }}
            >
              📊 Bay Details Report
            </button>
            
            <button
              onClick={() => { handleViewTable('SectionData'); setShowReportsModal(false); }}
              style={{
                padding: '1rem',
                backgroundColor: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '0.25rem',
                cursor: 'pointer',
                fontSize: '1rem',
                textAlign: 'left'
              }}
            >
              🔧 Section Data Report
            </button>
            
            <button
              onClick={() => { handleViewTable('DailyRecord'); setShowReportsModal(false); }}
              style={{
                padding: '1rem',
                backgroundColor: '#f59e0b',
                                   color: 'white',
                border: 'none',
                borderRadius: '0.25rem',
                cursor: 'pointer',
                fontSize: '1rem',
                textAlign: 'left'
              }}
            >
              📈 Daily Production Report
            </button>
            
            <button
              onClick={() => { handleViewTable('ShiftData'); setShowReportsModal(false); }}
              style={{
                padding: '1rem',
                backgroundColor: '#8b5cf6',
                color: 'white',
                border: 'none',
                borderRadius: '0.25rem',
                cursor: 'pointer',
                fontSize: '1rem',
                textAlign: 'left'
              }}
            >
              ⏰ Shift Data Report
            </button>
          </div>
        </div>
        
        <button
          onClick={downloadCSV}
          style={{
            width: '100%',
            backgroundColor: '#3498db',
            color: 'white',
            padding: '0.75rem',
            border: 'none',
            borderRadius: '0.25rem',
            fontSize: '1rem',
            fontWeight: 'bold',
            cursor: 'pointer'
          }}
        >
          Download CSV
        </button>

        <button
          onClick={() => setShowReportsModal(false)}
          style={{
            width: '100%',
            backgroundColor: '#6b7280',
            color: 'white',
            padding: '0.75rem',
            border: 'none',
            borderRadius: '0.25rem',
            fontSize: '1rem',
            fontWeight: 'bold',
            cursor: 'pointer'
          }}
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default ReportsModal;
