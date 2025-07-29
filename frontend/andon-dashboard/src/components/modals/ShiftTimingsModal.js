import React from 'react';

const ShiftTimingsModal = ({ 
  showShiftTimingsModal, 
  setShowShiftTimingsModal, 
  shiftTimings, 
  setShiftTimings, 
  handleUpdateShiftTimings 
}) => {
  if (!showShiftTimingsModal) {
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
        width: '400px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold' }}>Edit Shift Timings</h2>
          <button 
            onClick={() => setShowShiftTimingsModal(false)}
            style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#ef4444' }}
          >
            ×
          </button>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Shift 1 Start (HH:MM):</label>
            <input
              type="time"
              value={shiftTimings.shift1_start}
              onChange={(e) => setShiftTimings({...shiftTimings, shift1_start: e.target.value})}
              style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '0.25rem', fontSize: '1rem' }}
            />
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Shift 1 End (HH:MM):</label>
            <input
              type="time"
              value={shiftTimings.shift1_end}
              onChange={(e) => setShiftTimings({...shiftTimings, shift1_end: e.target.value})}
              style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '0.25rem', fontSize: '1rem' }}
            />
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Shift 2 Start (HH:MM):</label>
            <input
              type="time"
              value={shiftTimings.shift2_start}
              onChange={(e) => setShiftTimings({...shiftTimings, shift2_start: e.target.value})}
              style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '0.25rem', fontSize: '1rem' }}
            />
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Shift 2 End (HH:MM):</label>
            <input
              type="time"
              value={shiftTimings.shift2_end}
              onChange={(e) => setShiftTimings({...shiftTimings, shift2_end: e.target.value})}
              style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '0.25rem', fontSize: '1rem' }}
            />
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Shift 3 Start (HH:MM):</label>
            <input
              type="time"
              value={shiftTimings.shift3_start}
              onChange={(e) => setShiftTimings({...shiftTimings, shift3_start: e.target.value})}
              style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '0.25rem', fontSize: '1rem' }}
            />
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Shift 3 End (HH:MM):</label>
            <input
              type="time"
              value={shiftTimings.shift3_end}
              onChange={(e) => setShiftTimings({...shiftTimings, shift3_end: e.target.value})}
              style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '0.25rem', fontSize: '1rem' }}
            />
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
          <button
            onClick={handleUpdateShiftTimings}
            style={{
              flex: 1,
              backgroundColor: '#10b981',
              color: 'white',
              padding: '0.75rem',
              border: 'none',
              borderRadius: '0.25rem',
              fontSize: '1rem',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            Save Changes
          </button>
          <button
            onClick={() => setShowShiftTimingsModal(false)}
            style={{
              flex: 1,
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
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShiftTimingsModal;
