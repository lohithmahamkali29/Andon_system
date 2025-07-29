import React from 'react';

const Header = ({ isConnected, currentTime, formatTime, formatDate }) => {
  return (
    <div style={{
      backgroundColor: 'white',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      padding: '0.75rem 1rem',
      marginBottom: '0.5rem',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: '1rem'
    }}>
      {/* Left logos - JBM and Ogihara */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{
            width: '3rem', height: '3rem', borderRadius: '50%',
            backgroundColor: '#2563eb', display: 'flex', alignItems: 'center',
            justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: '1.5rem'
          }}>J</div>
          <span style={{ fontWeight: 'bold', fontSize: '1.5rem' }}>JBM</span>
          <span style={{ fontSize: '1rem', color: '#6b7280' }}>Group</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{
            width: '3rem', height: '3rem', borderRadius: '50%',
            backgroundColor: '#3b82f6', display: 'flex', alignItems: 'center',
            justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: '1.5rem'
          }}>O</div>
          <span style={{ fontWeight: 'bold', fontSize: '1.5rem', color: '#2563eb' }}>Ogihara</span>
        </div>
      </div>
      
      {/* Center title - matching Python styling */}
      <div style={{ textAlign: 'center', flex: 1 }}>
        <h1 style={{
          fontSize: '2.5rem',
          fontWeight: 'bold',
          color: '#1d4ed8',
          fontStyle: 'italic',
          margin: 0,
          fontFamily: 'Times New Roman'
        }}>Andon Dashboard</h1>
      </div>
      
      {/* Right date/time - matching Python format */}
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
          {formatDate(currentTime)}
        </div>
        <div style={{
          fontFamily: 'monospace', fontSize: '1.25rem', fontWeight: 'bold',
          backgroundColor: '#1f2937', color: '#00ff00', padding: '0.75rem',
          borderRadius: '0.25rem', border: '2px solid #374151', letterSpacing: '1px'
        }}>
          {formatTime(currentTime)}
        </div>
        <div style={{
          fontSize: '0.875rem',
          color: isConnected ? '#10b981' : '#ef4444',
          marginTop: '0.5rem'
        }}>
          {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
        </div>
      </div>
    </div>
  );
};

export default Header;
