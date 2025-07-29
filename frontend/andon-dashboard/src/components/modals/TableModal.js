import React from 'react';

const TableModal = ({ 
  showTableModal, 
  setShowTableModal, 
  selectedTable, 
  tableColumns, 
  tableData, 
  stations, 
  selectedReportStation, 
  setSelectedReportStation, 
  downloadCSV 
}) => {
  if (!showTableModal) {
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
        width: '90vw',
        maxWidth: '900px',
        maxHeight: '80vh',
        overflow: 'auto',
        position: 'relative'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold' }}>{selectedTable} Table</h2>
          <button 
            onClick={() => setShowTableModal(false)}
            style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#ef4444' }}
          >
            ×
          </button>
        </div>
        {/* Station selection dropdown */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ fontWeight: 'bold', marginRight: '1rem' }}>Select Station:</label>
          <select
            value={selectedReportStation}
            onChange={e => setSelectedReportStation(e.target.value)}
            style={{ padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid #d1d5db', fontSize: '1rem' }}
          >
            <option value="">-- Select a Station --</option>
            {stations.map(st => (
              <option key={st.stationName} value={st.stationName}>{st.stationName}</option>
            ))}
          </select>
        </div>
        {/* Only show table and download if a station is selected */}
        {selectedReportStation && (
          <>
            <div style={{ overflowX: 'auto', marginBottom: '1rem' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {tableColumns.map(col => (
                      <th key={col} style={{ border: '1px solid #d1d5db', padding: '0.5rem', background: '#f3f4f6', fontWeight: 'bold' }}>{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tableData.filter(row => row.StationName === selectedReportStation || row.stationName === selectedReportStation).map((row, idx) => (
                    <tr key={idx}>
                      {tableColumns.map(col => (
                        <td key={col} style={{ border: '1px solid #d1d5db', padding: '0.5rem' }}>{row[col]}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Download CSV button below the table, only if data is present */}
            {tableData && tableData.length > 0 && tableColumns && tableColumns.length > 0 && (
              <button
                onClick={() => downloadCSV(selectedReportStation)}
                style={{
                  width: '100%',
                  backgroundColor: '#3498db',
                  color: 'white',
                  padding: '0.75rem',
                  border: 'none',
                  borderRadius: '0.25rem',
                  fontSize: '1rem',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  marginTop: '1rem'
                }}
              >
                Download CSV
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default TableModal;
