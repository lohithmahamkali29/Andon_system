import React from 'react';

const EditStationModal = ({ 
  showEditStationModal, 
  setShowEditStationModal, 
  stations, 
  selectedStationNameForEdit, 
  setSelectedStationNameForEdit, 
  selectedStationForEdit, 
  setSelectedStationForEdit, 
  editStationData, 
  setEditStationData, 
  handleEditStation, 
  ipError, 
  setIpError, 
  isValidIpAddress 
}) => {
  if (!showEditStationModal) {
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
          <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold' }}>Edit Station</h2>
          <button 
            onClick={() => setShowEditStationModal(false)}
            style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#ef4444' }}
          >
            ×
          </button>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{marginBottom:'1rem'}}>
            <label style={{display:'block',marginBottom:'0.5rem',fontWeight:'bold'}}>
              Select Station:
            </label>
            <select
              value={selectedStationNameForEdit}
              onChange={e=>{
                const st = stations.find(s=>s.stationName===e.target.value);
                setSelectedStationNameForEdit(e.target.value);
                setSelectedStationForEdit(st);
                setEditStationData({
                  stationName: st.stationName,
                  plannedCount1: st.PlannedCount1 || '',
                  plannedCount2: st.PlannedCount2 || '',
                  plannedCount3: st.PlannedCount3 || '',
                  ipAddress:   st.ipAddress   || '',
                  topic:       st.topic       || ''
                });
              }}
              style={{width:'100%',padding:'0.75rem',border:'1px solid #d1d5db',
                      borderRadius:'0.25rem',fontSize:'1rem'}}
            >
              <option value="">-- Select a Station --</option>
              {stations.map(s=>(<option key={s.stationName} value={s.stationName}>{s.stationName}</option>))}
            </select>
          </div>
          {selectedStationForEdit && (
            <>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>First Shift Planned Count:</label>
                <input
                  type="number"
                  value={editStationData.plannedCount1}
                  onChange={(e) => setEditStationData({...editStationData, plannedCount1: e.target.value})}
                  style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '0.25rem', fontSize: '1rem' }}
                />
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Second Shift Planned Count:</label>
                <input
                  type="number"
                  value={editStationData.plannedCount2}
                  onChange={(e) => setEditStationData({...editStationData, plannedCount2: e.target.value})}
                  style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '0.25rem', fontSize: '1rem' }}
                />
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Third Shift Planned Count:</label>
                <input
                  type="number"
                  value={editStationData.plannedCount3}
                  onChange={(e) => setEditStationData({...editStationData, plannedCount3: e.target.value})}
                  style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '0.25rem', fontSize: '1rem' }}
                />
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>IP Address:</label>
                <input
                  type="text"
                  value={editStationData.ipAddress}
                  onChange={(e) => {
                    setEditStationData({...editStationData, ipAddress: e.target.value});
                    setIpError(isValidIpAddress(e.target.value) ? '' : 'Invalid IP address format');
                  }}
                  style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '0.25rem', fontSize: '1rem' }}
                />
                {ipError && <div style={{color:'red',fontSize:'0.9rem'}}>{ipError}</div>}
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Topic:</label>
                <input
                  type="text"
                  value={editStationData.topic}
                  onChange={(e) => setEditStationData({...editStationData, topic: e.target.value})}
                  style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '0.25rem', fontSize: '1rem' }}
                />
              </div>
            </>
          )}
        </div>
        
        <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
          {selectedStationForEdit && (
            <button
              onClick={handleEditStation}
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
              Update Station
            </button>
          )}
          <button
            onClick={() => setShowEditStationModal(false)}
            style={{
              flex: selectedStationForEdit ? 1 : 1,
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

export default EditStationModal;
