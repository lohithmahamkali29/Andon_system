import React from 'react';

const StationHeader = ({ prevSlide, nextSlide, stations }) => {
  return (
    <div style={{
      backgroundColor: '#374151',
      color: 'white',
      textAlign: 'center',
      padding: '1.5rem 1rem',
      marginBottom: '1rem',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderRadius: '0.5rem'
    }}>
      <button 
        onClick={prevSlide}
        disabled={stations.length <= 1}
        style={{
          backgroundColor: '#3b82f6', 
          color: 'white', 
          padding: '0.75rem 1.25rem',
          border: 'none', 
          borderRadius: '0.25rem', 
          cursor: stations.length > 1 ? 'pointer' : 'not-allowed',
          fontSize: '1rem',
          fontWeight: 'bold',
          opacity: stations.length > 1 ? 1 : 0.5
        }}
      >
        ◀ Previous
      </button>
      
      <h2 style={{
        fontSize: '3rem',
        fontWeight: 'bold',
        margin: 0,
        flex: 1
      }}>
        Production Line
      </h2>
      
      <button 
        onClick={nextSlide}
        disabled={stations.length <= 1}
        style={{
          backgroundColor: '#3b82f6', 
          color: 'white', 
          padding: '0.75rem 1.25rem',
          border: 'none', 
          borderRadius: '0.25rem', 
          cursor: stations.length > 1 ? 'pointer' : 'not-allowed',
          fontSize: '1rem',
          fontWeight: 'bold',
          opacity: stations.length > 1 ? 1 : 0.5
        }}
      >
        Next ▶
      </button>
    </div>
  );
};

export default StationHeader;
