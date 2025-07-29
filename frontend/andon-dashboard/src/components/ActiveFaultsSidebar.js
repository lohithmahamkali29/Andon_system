import React from 'react';

const ActiveFaultsSidebar = ({ showFaultsSidebar, setShowFaultsSidebar, activeFaults, formatDisplayTime }) => {
  if (!showFaultsSidebar) {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      right: 0,
      height: '100vh',
      width: '350px',
      backgroundColor: 'white',
      boxShadow: '-4px 0 6px rgba(0,0,0,0.1)',
      zIndex: 1001,
      display: 'flex',
      flexDirection: 'column'
    }}>
      <div style={{
        backgroundColor: '#ef4444',
        color: 'white',
        padding: '1rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <h3 style={{ margin: 0, fontSize: '1.25rem' }}>Active Faults</h3>
        <button 
          onClick={() => setShowFaultsSidebar(false)}
          style={{
            backgroundColor: 'transparent',
            border: 'none',
            color: 'white',
            fontSize: '1.5rem',
            cursor: 'pointer'
          }}
        >
          ×
        </button>
      </div>
      
      <div style={{
        flex: 1,
        overflow: 'auto',
        padding: '1rem'
      }}>
        {activeFaults.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '2rem',
            color: '#6b7280'
          }}>
            <p style={{ fontSize: '1.25rem', margin: 0 }}>✅ No active faults</p>
            <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>All stations are operating normally</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {activeFaults.map((fault, index) => (
              <div key={index} style={{
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '0.5rem',
                padding: '1rem'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '0.5rem'
                }}>
                  <h4 style={{ margin: 0, color: '#dc2626', fontWeight: 'bold' }}>
                    {fault.stationName}
                  </h4>
                  <span style={{
                    backgroundColor: '#dc2626',
                    color: 'white',
                    padding: '0.25rem 0.5rem',
                    borderRadius: '0.25rem',
                    fontSize: '0.75rem',
                    fontWeight: 'bold'
                  }}>
                    {fault.calltype}
                  </span>
                </div>
                <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                  <p style={{ margin: '0.25rem 0' }}>
                    <strong>Fault Time:</strong> {formatDisplayTime(fault.faultTime)}
                  </p>
                  {fault.resolvedTime && (
                    <p style={{ margin: '0.25rem 0' }}>
                      <strong>Resolved:</strong> {formatDisplayTime(fault.resolvedTime)}
                    </p>
                  )}
                  {!fault.resolvedTime && (
                    <p style={{ margin: '0.25rem 0', color: '#dc2626' }}>
                      <strong>Status:</strong> Ongoing
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ActiveFaultsSidebar;
