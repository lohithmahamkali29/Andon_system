import React from 'react';

const DeleteStationModal = ({ 
  showDeleteStationModal, 
  setShowDeleteStationModal, 
  stations, 
  selectedStationForDelete, 
  setSelectedStationForDelete, 
  handleDeleteStation 
}) => {
  if (!showDeleteStationModal) {
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
          <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold', color: '#ef4444' }}>Delete Station</h2>
          <button 
            onClick={() => setShowDeleteStationModal(false)}
            style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#ef4444' }}
          >
            ×
          </button>
        </div>
        
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Select Station to Delete:</label>
            <select
              value={selectedStationForDelete?.stationName || ''}
              onChange={(e) => {
                const station = stations.find(s => s.stationName === e.target.value);
                setSelectedStationForDelete(station);
              }}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.25rem',
                fontSize: '1rem',
                backgroundColor: 'white'
              }}
            >
              <option value="">-- Select a Station --</option>
              {stations.map(station => (
                <option key={station.stationName} value={station.stationName}>
                  {station.stationName}
                </option>
              ))}
            </select>
          </div>
          
          {selectedStationForDelete && (
            <>
              <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '0.5rem', padding: '1rem', marginBottom: '1rem' }}>
                <p style={{ margin: 0, color: '#dc2626', fontWeight: 'bold' }}>⚠️ Warning: This action cannot be undone!</p>
              </div>
              <p style={{ margin: 0, fontSize: '1rem' }}>
                Are you sure you want to delete station <strong>"{selectedStationForDelete.stationName}"</strong>?
              </p>
              <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.875rem', color: '#6b7280' }}>
                This will permanently remove all associated data including fault records, shift data, and daily records.
              </p>
            </>
          )}
        </div>
        
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button
            onClick={handleDeleteStation}
            disabled={!selectedStationForDelete}
            style={{
              flex: 1,
              backgroundColor: selectedStationForDelete ? '#ef4444' : '#d1d5db',
              color: 'white',
              padding: '0.75rem',
              border: 'none',
              borderRadius: '0.25rem',
              fontSize: '1rem',
              fontWeight: 'bold',
              cursor: selectedStationForDelete ? 'pointer' : 'not-allowed'
            }}
          >
            Delete Station
          </button>
          <button
            onClick={() => setShowDeleteStationModal(false)}
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

export default DeleteStationModal;
