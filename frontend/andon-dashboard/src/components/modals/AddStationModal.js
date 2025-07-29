import React from 'react';

const AddStationModal = ({ 
  showAddStationModal, 
  setShowAddStationModal, 
  newStationData, 
  setNewStationData, 
  handleAddStation, 
  ipError, 
  setIpError, 
  isValidIpAddress 
}) => {
  if (!showAddStationModal) {
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
        width: '500px',
        maxHeight: '80vh',
        overflow: 'auto'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold' }}>Add Station</h2>
          <button 
            onClick={() => setShowAddStationModal(false)}
            style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#ef4444' }}
          >
            ×
          </button>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Station Name:</label>
            <input
              type="text"
              value={newStationData.stationName}
              onChange={(e) => setNewStationData({...newStationData, stationName: e.target.value})}
              style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '0.25rem', fontSize: '1rem' }}
            />
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>First Shift Planned Count:</label>
            <input
              type="number"
              value={newStationData.plannedCount1}
              onChange={(e) => setNewStationData({...newStationData, plannedCount1: e.target.value})}
              style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '0.25rem', fontSize: '1rem' }}
            />
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Second Shift Planned Count:</label>
            <input
              type="number"
              value={newStationData.plannedCount2}
              onChange={(e) => setNewStationData({...newStationData, plannedCount2: e.target.value})}
              style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '0.25rem', fontSize: '1rem' }}
            />
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Third Shift Planned Count:</label>
            <input
              type="number"
              value={newStationData.plannedCount3}
              onChange={(e) => setNewStationData({...newStationData, plannedCount3: e.target.value})}
              style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '0.25rem', fontSize: '1rem' }}
            />
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>IP Address:</label>
            <input
              type="text"
              value={newStationData.ipAddress}
              onChange={(e) => {
                setNewStationData({...newStationData, ipAddress: e.target.value});
                setIpError(isValidIpAddress(e.target.value) ? '' : 'Invalid IP address format');
              }}
              placeholder="192.168.1.100/data"
              style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '0.25rem', fontSize: '1rem' }}
            />
            {ipError && <div style={{color:'red',fontSize:'0.9rem'}}>{ipError}</div>}
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Topic:</label>
            <input
              type="text"
              value={newStationData.topic}
              onChange={(e) => setNewStationData({...newStationData, topic: e.target.value})}
              style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '0.25rem', fontSize: '1rem' }}
            />
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
          <button
            onClick={handleAddStation}
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
            Add Station
          </button>
          <button
            onClick={() => setShowAddStationModal(false)}
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

export default AddStationModal;
