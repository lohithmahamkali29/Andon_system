import React from 'react';

const NavigationBar = ({ 
  navRef, 
  activeTab, 
  toggleMenu, 
  stations, 
  setShowAddStationModal, 
  openEditStationModal, 
  openDeleteStationModal, 
  setShowShiftTimingsModal, 
  handleViewTable, 
  setShowReportsModal, 
  showFaultsSidebar, 
  setShowFaultsSidebar, 
  activeFaults 
}) => {
  return (
    <nav ref={navRef} style={{
      backgroundColor: '#1e40af',
      color: 'white',
      padding: '0.75rem',
      marginBottom: '1rem',
      borderRadius: '0.25rem',
      position: 'relative',
      zIndex: 1000
    }}>
      <ul style={{
        display: 'flex',
        listStyle: 'none',
        margin: 0,
        padding: 0,
        justifyContent: 'space-around', // Centers and spaces the 3 main options
        alignItems: 'center'
      }}>
        {/* Stations Dropdown */}
        <li style={{ position: 'relative', flex: 1, display: 'flex', justifyContent: 'center' }}>
          <button 
            onClick={() => toggleMenu('stations')}
            style={{
              backgroundColor: activeTab === 'stations' ? '#3b82f6' : 'transparent',
              color: 'white',
              border: 'none',
              padding: '0.75rem 1.5rem',
              borderRadius: '0.25rem',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '1.1rem'
            }}
          >
            Stations
          </button>
          {activeTab === 'stations' && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: '50%',
              transform: 'translateX(-50%)',
              backgroundColor: 'white',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
              borderRadius: '0.25rem',
              zIndex: 10,
              minWidth: '250px',
              color: '#374151'
            }}>
              <button onClick={() => { setShowAddStationModal(true); toggleMenu('stations'); }}
                style={{ display: 'block', width: '100%', textAlign: 'left', padding: '0.75rem', backgroundColor: 'transparent', border: 'none', cursor: 'pointer' }}>
                Add Station
              </button>
              <button onClick={openEditStationModal}
                style={{ display: 'block', width: '100%', textAlign: 'left', padding: '0.75rem', backgroundColor: 'transparent', border: 'none', cursor: 'pointer' }}>
                Edit Station
              </button>
              <button onClick={openDeleteStationModal}
                style={{ display: 'block', width: '100%', textAlign: 'left', padding: '0.75rem', backgroundColor: 'transparent', border: 'none', cursor: 'pointer' }}>
                Delete Station
              </button>
              <button onClick={() => { setShowShiftTimingsModal(true); toggleMenu('stations'); }}
                style={{ display: 'block', width: '100%', textAlign: 'left', padding: '0.75rem', backgroundColor: 'transparent', border: 'none', cursor: 'pointer' }}>
                Edit Shift Timings
              </button>
              <div style={{ padding: '0.75rem', borderTop: '1px solid #e5e7eb' }}>
                <h4 style={{ margin: '0 0 0.5rem 0', color: '#374151', fontSize: '0.875rem' }}>Current Stations ({stations.length})</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.25rem' }}>
                  {stations.map(station => (
                    <div key={station.stationName} style={{
                      backgroundColor: '#e5e7eb',
                      padding: '0.25rem',
                      borderRadius: '0.25rem',
                      fontSize: '0.75rem',
                      textAlign: 'center'
                    }}>
                      {station.stationName}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </li>

        {/* Data Views Dropdown */}
        <li style={{ position: 'relative', flex: 1, display: 'flex', justifyContent: 'center' }}>
          <button 
            onClick={() => toggleMenu('data')}
            style={{
              backgroundColor: activeTab === 'data' ? '#3b82f6' : 'transparent',
              color: 'white',
              border: 'none',
              padding: '0.75rem 1.5rem',
              borderRadius: '0.25rem',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '1.1rem'
            }}
          >
            Data Views
          </button>
          {activeTab === 'data' && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: '50%',
              transform: 'translateX(-50%)',
              backgroundColor: 'white',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
              borderRadius: '0.25rem',
              zIndex: 10,
              minWidth: '200px',
              color: '#374151'
            }}>
              <button onClick={() => handleViewTable('baydetails')}
                style={{ display: 'block', width: '100%', textAlign: 'left', padding: '0.75rem', backgroundColor: 'transparent', border: 'none', cursor: 'pointer' }}>
                View BayDetails
              </button>
              <button onClick={() => handleViewTable('SectionData')}
                style={{ display: 'block', width: '100%', textAlign: 'left', padding: '0.75rem', backgroundColor: 'transparent', border: 'none', cursor: 'pointer' }}>
                View SectionData
              </button>
              <button onClick={() => handleViewTable('DailyRecord')}
                style={{ display: 'block', width: '100%', textAlign: 'left', padding: '0.75rem', backgroundColor: 'transparent', border: 'none', cursor: 'pointer' }}>
                View DailyRecord
              </button>
              <button onClick={() => handleViewTable('ShiftData')}
                style={{ display: 'block', width: '100%', textAlign: 'left', padding: '0.75rem', backgroundColor: 'transparent', border: 'none', cursor: 'pointer' }}>
                Shift Data
              </button>
              <button onClick={() => handleViewTable('ShiftBaselines')}
                style={{ display: 'block', width: '100%', textAlign: 'left', padding: '0.75rem', backgroundColor: 'transparent', border: 'none', cursor: 'pointer' }}>
                Shift Baselines
              </button>
            </div>
          )}
        </li>

        {/* Reports */}
        <li style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
          <button 
            onClick={() => { setShowReportsModal(true); toggleMenu(null); }}
            style={{
              backgroundColor: 'transparent',
              color: 'white',
              border: 'none',
              padding: '0.75rem 1.5rem',
              borderRadius: '0.25rem',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '1.1rem'
            }}
          >
            Reports
          </button>
        </li>

        {/* Active Faults Button - NEW */}
        <li style={{ position: 'absolute', right: '1rem' }}>
          <button 
            onClick={() => setShowFaultsSidebar(!showFaultsSidebar)}
            style={{
              backgroundColor: activeFaults.length > 0 ? '#ef4444' : '#6b7280',
              color: 'white',
              border: 'none',
              padding: '0.5rem 1rem',
              borderRadius: '0.25rem',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            🚨 Faults ({activeFaults.length})
          </button>
        </li>
      </ul>
    </nav>
  );
};

export default NavigationBar;
