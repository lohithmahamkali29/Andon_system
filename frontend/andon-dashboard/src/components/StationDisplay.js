import React from 'react';

const StationDisplay = ({ 
  currentStation, 
  getStationBgColor, 
  currentShift, 
  getTotalDowntimeForStation, 
  getDuration, 
  getStatusBar, 
  formatDisplayTime 
}) => {
  if (!currentStation) {
    return (
      <div style={{
        backgroundColor: 'white',
        padding: '4rem 2rem',
        borderRadius: '0.5rem',
        textAlign: 'center',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ color: '#6b7280', margin: 0, fontSize: '2rem' }}>
          No stations available to display
        </h2>
        <p style={{ color: '#9ca3af', marginTop: '1rem', fontSize: '1.25rem' }}>
          Use the 'Stations' menu to add a new station
        </p>
      </div>
    );
  }

  return (
    <div style={{
      backgroundColor: getStationBgColor(currentStation),
      padding: '2rem',
      borderRadius: '0.5rem',
      boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
      marginBottom: '1rem'
    }}>
      {/* Station Name Header with Shift - matching Python styling */}
      <div style={{
        backgroundColor: '#2c3e50',
        color: 'white',
        textAlign: 'center',
        padding: '1.5rem',
        marginBottom: '2rem',
        borderRadius: '0.5rem',
        border: '3px solid #34495e'
      }}>
        <h1 style={{
          fontSize: '4rem',
          fontWeight: 'bold',
          margin: 0
        }}>
          {currentStation.stationName}
        </h1>
        <div style={{
          fontSize: '1.5rem',
          marginTop: '0.5rem',
          color: '#ecf0f1'
        }}>
          {currentShift}
        </div>
      </div>

      {/* Metrics Cards Row - matching Python card colors and layout */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '1.5rem',
        marginBottom: '2rem'
      }}>
        {/* Plan Count Card - Blue */}
        <div style={{
          backgroundColor: '#3498db',
          color: 'white',
          padding: '2rem',
          borderRadius: '0.5rem',
          textAlign: 'center',
          border: '3px solid #2980b9',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: '0 0 1rem 0' }}>
            Plan Count
          </h3>
          <p style={{ fontSize: '3rem', fontWeight: 'bold', margin: 0 }}>
            {currentStation.planCount || 0}
          </p>
        </div>

        {/* Actual Count Card - Green */}
        <div style={{
          backgroundColor: '#478778',
          color: 'white',
          padding: '2rem',
          borderRadius: '0.5rem',
          textAlign: 'center',
          border: '3px solid #27ae60',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: '0 0 1rem 0' }}>
            Actual Count
          </h3>
          <p style={{ fontSize: '3rem', fontWeight: 'bold', margin: 0 }}>
            {currentStation.actualCount || 0}
          </p>
        </div>

        {/* Total Downtime Card - Orange */}
        <div style={{
          backgroundColor: '#f39c12',
          color: 'white',
          padding: '2rem',
          borderRadius: '0.5rem',
          textAlign: 'center',
          border: '3px solid #e67e22',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: '0 0 1rem 0' }}>
            Total Downtime
          </h3>
          <p style={{ fontSize: '2.5rem', fontWeight: 'bold', margin: 0 }}>
            {getTotalDowntimeForStation(currentStation)} mins
          </p>
        </div>
      </div>

      {/* Time Information Row - matching Python layout */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '1.5rem',
        marginBottom: '2rem'
      }}>
        {/* Fault Card */}
        <div style={{
          backgroundColor: '#9b59b6',
          color: 'white',
          padding: '2rem',
          borderRadius: '0.5rem',
          textAlign: 'center',
          border: '3px solid #8e44ad',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: '0 0 1rem 0' }}>
            Fault Time
          </h3>
          {currentStation.latestFaultTime && currentStation.latestFaultCalltype ? (
            <>
              <div style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>
                Calltype: <b>{currentStation.latestFaultCalltype}</b>
              </div>
              <div style={{ fontSize: '1rem' }}>
                Time: <b>{formatDisplayTime(currentStation.latestFaultTime)}</b>
              </div>
            </>
          ) : (
            <div style={{ fontSize: '1.1rem', color: '#ecf0f1' }}>No faults recorded</div>
          )}
        </div>

        {/* Resolved Card */}
        <div style={{
          backgroundColor: '#1abc9c',
          color: 'white',
          padding: '2rem',
          borderRadius: '0.5rem',
          textAlign: 'center',
          border: '3px solid #16a085',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: '0 0 1rem 0' }}>
          Resolved Time
          </h3>
          {currentStation.latestResolvedTime && currentStation.latestResolvedCalltype ? (
            <>
              <div style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>
                Calltype: <b>{currentStation.latestResolvedCalltype}</b>
              </div>
              <div style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>
                Time: <b>{formatDisplayTime(currentStation.latestResolvedTime)}</b>
              </div>
              {currentStation.latestFaultTime && (
                <div style={{ fontSize: '0.9rem', color: '#ecf0f1' }}>
                  Duration: {getDuration(currentStation.latestFaultTime, currentStation.latestResolvedTime)}
                </div>
              )}
            </>
          ) : (
            <div style={{ fontSize: '1.1rem', color: '#ecf0f1' }}>No resolutions recorded</div>
          )}
        </div>
      </div>

      {/* Status Bar - matching Python fault/ok status */}
      <div style={{
        backgroundColor: getStatusBar(currentStation).color,
        color: 'white',
        padding: '2rem',
        borderRadius: '0.5rem',
        textAlign: 'center',
        border: '3px solid rgba(0,0,0,0.1)',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
      }}>
        <p style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>
          {getStatusBar(currentStation).message}
        </p>
      </div>
    </div>
  );
};

export default StationDisplay;
