// // frontend/andon-dashboard/src/Dashboard.js
// import React, { useState, useEffect, useCallback } from 'react';
// import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
// import './App.css';
// import io from 'socket.io-client';
// import DashboardUI from './components/DashboardUI.js';


// const Dashboard = () => {
//   const [stations, setStations] = useState({});
//   const [dailyRecords, setDailyRecords] = useState({});
//   const [socket, setSocket] = useState(null);
//   const [isConnected, setIsConnected] = useState(false);
//   const [summary, setSummary] = useState({});

//   const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
//   const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

//   // Initialize station data
//   const initializeStations = useCallback(() => {
//     const initialStations = {};
//     for (let i = 1; i <= 18; i++) {
//       const stationName = `Station${i}`;
//       initialStations[stationName] = {
//         id: i,
//         name: stationName,
//         production: { state: 1, faultTime: null, resolvedTime: null },
//         maintenance: { state: 1, faultTime: null, resolvedTime: null },
//         quality: { state: 1, faultTime: null, resolvedTime: null },
//         store: { state: 1, faultTime: null, resolvedTime: null },
//         actualCount: 0,
//         totalDowntime: 0,
//         currentDowntime: 0,
//         activeFaults: new Set(),
//         efficiency: 0,
//         isActive: true,
//         isAlive: true
//       };
//     }
//     setStations(initialStations);
//   }, []);

//   // Fetch initial data from Express API
//   const fetchInitialData = useCallback(async () => {
//     try {
//       // Fetch daily records for today's downtime
//       const dailyResponse = await fetch(`${API_BASE_URL}/api/data/dailyrecord`);
//       const dailyData = await dailyResponse.json();
      
//       const dailyByStation = {};
//       const today = new Date().toISOString().split('T')[0];
      
//       dailyData.forEach(record => {
//         if (record.todayDate === today) {
//           dailyByStation[record.stationName] = record;
//         }
//       });
      
//       setDailyRecords(dailyByStation);

//       // Fetch bay details for station information
//       const bayResponse = await fetch(`${API_BASE_URL}/api/data/baydetail`);
//       const bayData = await bayResponse.json();
      
//       setStations(prev => {
//         const updated = { ...prev };
//         bayData.forEach(bay => {
//           if (updated[bay.stationName]) {
//             updated[bay.stationName].actualCount = bay.actualCount;
//             updated[bay.stationName].efficiency = bay.efficiency;
//             updated[bay.stationName].isActive = bay.isActive;
//             updated[bay.stationName].isAlive = bay.isAlive;
//             updated[bay.stationName].totalDowntime = dailyByStation[bay.stationName]?.totalDowntime || 0;
//           }
//         });
//         return updated;
//       });

//       // Fetch current unresolved faults
//       const sectionResponse = await fetch(`${API_BASE_URL}/api/data/sectiondata?date=${today}`);
//       const sectionData = await sectionResponse.json();
      
//       setStations(prev => {
//         const updated = { ...prev };
//         sectionData.forEach(section => {
//           if (!section.resolvedTime && updated[section.stationName]) {
//             const callType = section.callType.toLowerCase();
//             updated[section.stationName][callType].state = 0;
//             updated[section.stationName][callType].faultTime = new Date(section.faultTime);
//             updated[section.stationName].activeFaults.add(callType);
//           }
//         });
//         return updated;
//       });

//       // Fetch dashboard summary
//       const summaryResponse = await fetch(`${API_BASE_URL}/api/dashboard/summary`);
//       const summaryData = await summaryResponse.json();
//       setSummary(summaryData);

//     } catch (error) {
//       console.error('Error fetching initial data:', error);
//     }
//   }, [API_BASE_URL]);

//   // Socket.IO connection
//   useEffect(() => {
//     const connectSocket = () => {
//       const newSocket = io(SOCKET_URL, {
//         transports: ['websocket'],
//         cors: {
//           origin: "http://localhost:3000",
//           methods: ["GET", "POST"]
//         }
//       });
      
//       newSocket.on('connect', () => {
//         console.log('✅ Socket.IO connected');
//         setIsConnected(true);
//       });
      
//       newSocket.on('disconnect', () => {
//         console.log('❌ Socket.IO disconnected');
//         setIsConnected(false);
//       });

//       newSocket.on('connection_status', (data) => {
//         console.log('Connection status:', data);
//       });
      
//       newSocket.on('station_update', (data) => {
//         handleSocketMessage(data);
//       });
      
//       newSocket.on('error', (error) => {
//         console.error('Socket.IO error:', error);
//       });
      
//       setSocket(newSocket);
//     };

//     connectSocket();

//     return () => {
//       if (socket) {
//         socket.disconnect();
//       }
//     };
//   }, [SOCKET_URL]);

//   // Handle Socket.IO messages
//   const handleSocketMessage = useCallback((message) => {
//     console.log('Received socket message:', message);
    
//     if (message.type === 'station_updates') {
//       setStations(prev => {
//         const updated = { ...prev };
        
//         message.changes.forEach(change => {
//           const station = updated[change.station];
//           if (!station) return;
          
//           const callType = change.callType.toLowerCase();
//           const now = new Date();
          
//           if (change.type === 'fault') {
//             // Fault occurred
//             station[callType].state = 0;
//             station[callType].faultTime = new Date(change.time);
//             station[callType].resolvedTime = null;
//             station.activeFaults.add(callType);
            
//             console.log(`🚨 Fault detected: ${change.station} - ${change.callType}`);
//           } else if (change.type === 'resolved') {
//             // Fault resolved
//             station[callType].state = 1;
//             station[callType].resolvedTime = new Date(change.time);
//             station.activeFaults.delete(callType);
            
//             // Calculate and add downtime
//             if (station[callType].faultTime) {
//               const downtime = (station[callType].resolvedTime - station[callType].faultTime) / (1000 * 60); // minutes
//               station.totalDowntime += downtime;
//             }
            
//             console.log(`✅ Fault resolved: ${change.station} - ${change.callType}`);
//           }
//         });
        
//         // Update actual count if provided
//         if (message.stationData && message.stationData.actualCount !== undefined) {
//           const station = updated[message.stationData.station];
//           if (station) {
//             station.actualCount = message.stationData.actualCount;
//           }
//         }
        
//         return updated;
//       });
//     }
//   }, []);

//   // Send station update via Socket.IO
//   const sendStationUpdate = useCallback((data) => {
//     if (socket && socket.connected) {
//       socket.emit('station_update', data);
//     }
//   }, [socket]);

//   // Calculate current downtime for active faults
//   const getCurrentDowntime = useCallback((station) => {
//     let currentDowntime = 0;
//     const now = new Date();
    
//     station.activeFaults.forEach(callType => {
//       if (station[callType].faultTime) {
//         currentDowntime += (now - station[callType].faultTime) / (1000 * 60); // minutes
//       }
//     });
    
//     return currentDowntime;
//   }, []);

//   // Get station background color based on active faults
//   const getStationColor = useCallback((station) => {
//     if (station.activeFaults.size > 0) {
//       return 'bg-red-500';
//     }
//     if (!station.isActive) {
//       return 'bg-gray-500';
//     }
//     if (!station.isAlive) {
//       return 'bg-yellow-500';
//     }
//     return 'bg-green-500';
//   }, []);

//   // Format time display
//   const formatTime = (date) => {
//     if (!date) return '--:--';
//     return date.toLocaleTimeString('en-US', { 
//       hour12: false, 
//       hour: '2-digit', 
//       minute: '2-digit' 
//     });
//   };

//   // Format duration in minutes to readable format
//   const formatDuration = (minutes) => {
//     if (minutes < 60) {
//       return `${Math.round(minutes)}m`;
//     } else {
//       const hours = Math.floor(minutes / 60);
//       const mins = Math.round(minutes % 60);
//       return `${hours}h ${mins}m`;
//     }
//   };

//   // Manual fault testing functions
//   const createTestFault = async (stationName, callType) => {
//     try {
//       const response = await fetch(`${API_BASE_URL}/api/sectiondata`, {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify({
//           stationName,
//           callType,
//           faultTime: new Date().toISOString()
//         })
//       });
      
//       if (response.ok) {
//         console.log(`Test fault created: ${stationName} - ${callType}`);
//       }
//     } catch (error) {
//       console.error('Error creating test fault:', error);
//     }
//   };

//   // Prepare chart data
//   const chartData = Object.values(stations).map(station => ({
//     name: station.name.replace('Station', 'S'),
//     actualCount: station.actualCount,
//     efficiency: station.efficiency
//   }));

//   // Initialize on mount
//   useEffect(() => {
//     initializeStations();
//     fetchInitialData();
//   }, [initializeStations, fetchInitialData]);

//   // Update current downtime every second for active faults
//   useEffect(() => {
//     const interval = setInterval(() => {
//       setStations(prev => {
//         const updated = { ...prev };
//         Object.keys(updated).forEach(stationName => {
//           if (updated[stationName].activeFaults.size > 0) {
//             updated[stationName].currentDowntime = getCurrentDowntime(updated[stationName]);
//           } else {
//             updated[stationName].currentDowntime = 0;
//           }
//         });
//         return updated;
//       });
//     }, 1000);

//     return () => clearInterval(interval);
//   }, [getCurrentDowntime]);

//   return (
//     <DashboardUI
//       stations={stations}
//       isConnected={isConnected}
//       summary={summary}
//       getStationColor={getStationColor}
//       createTestFault={createTestFault}
//       formatTime={formatTime}
//       formatDuration={formatDuration}
//       chartData={chartData}
//       API_BASE_URL={API_BASE_URL}
//       SOCKET_URL={SOCKET_URL}
//     />
  
//   );
// };

// export default Dashboard;

import React, { useState, useEffect } from 'react';

const DashboardUI = ({
  stations,
  isConnected,
  summary,
  getStationColor,
  formatTime,
  formatDuration,
  chartData
}) => {
  // State for current time that updates every second
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    // Cleanup interval on component unmount
    return () => clearInterval(timer);
  }, []);

  // Format current date and time
  const currentDate = currentTime.toLocaleDateString('en-GB');
  const currentTimeString = currentTime.toLocaleTimeString('en-GB');

  // Calculate total actual count from all stations
  const totalActualCount = stations ? Object.values(stations).reduce((total, station) => total + (station.actualCount || 0), 0) : 0;
  
  // Calculate total plan count (assuming a default or from summary)
  const totalPlanCount = summary?.totalPlanCount || 480;

  // Determine overall status
  const hasActiveFaults = summary?.activeFaults > 0;
  const overallStatus = hasActiveFaults ? 'FAULT' : 'OK';

  const containerStyle = {
    minHeight: '100vh',
    backgroundColor: '#e5e7eb',
    padding: '16px',
    fontFamily: 'Arial, sans-serif'
  };

  const headerStyle = {
    backgroundColor: 'white',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    padding: '16px',
    marginBottom: '4px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  };

  const logoStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '16px'
  };

  const logoCircleStyle = {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontWeight: 'bold',
    fontSize: '14px'
  };

  const titleStyle = {
    textAlign: 'center'
  };

  const navStyle = {
    display: 'flex',
    justifyContent: 'center',
    gap: '8px',
    marginBottom: '16px'
  };

  const buttonStyle = {
    backgroundColor: '#3b82f6',
    color: 'white',
    padding: '8px 16px',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer'
  };

  const stationHeaderStyle = {
    backgroundColor: '#374151',
    color: 'white',
    textAlign: 'center',
    padding: '32px 0',
    marginBottom: '16px',
    display:'flex',
    justifyContent: 'space-between',
    alignItems: 'center'

  };

  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '16px',
    marginBottom: '16px'
  };

  const bottomGridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '16px',
    marginBottom: '16px'
  };

  const cardStyle = {
    color: 'white',
    padding: '32px',
    textAlign: 'center',
    borderRadius: '8px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
  };

  const statusStyle = {
    color: 'white',
    padding: '24px',
    textAlign: 'center',
    borderRadius: '8px',
    marginBottom: '16px',
    backgroundColor: hasActiveFaults ? '#ef4444' : '#10b981'
  };

  const stationGridStyle = {
    backgroundColor: 'white',
    padding: '16px',
    borderRadius: '8px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
  };

  const stationsContainerStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '12px'
  };

  // Digital clock style for the time display
  const digitalClockStyle = {
    fontFamily: 'monospace',
    fontSize: '20px',
    fontWeight: 'bold',
    backgroundColor: '#1f2937',
    color: '#00ff00',
    padding: '8px 12px',
    borderRadius: '4px',
    border: '2px solid #374151',
    letterSpacing: '1px'
  };

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <div style={logoStyle}>
          <div style={logoStyle}>
            <div style={{...logoCircleStyle, backgroundColor: '#2563eb'}}>
              <span>J</span>
            </div>
            <span style={{fontWeight: 'bold', fontSize: '20px'}}>JBM</span>
            <span style={{fontSize: '14px', color: '#6b7280'}}>Group</span>
          </div>
          <div style={logoStyle}>
            <div style={{...logoCircleStyle, backgroundColor: '#3b82f6'}}>
              <span>O</span>
            </div>
            <span style={{fontWeight: 'bold', fontSize: '20px', color: '#2563eb'}}>Ogihara</span>
          </div>
        </div>
        
        <div style={titleStyle}>
          <h1 style={{fontSize: '30px', fontWeight: 'bold', color: '#1d4ed8', fontStyle: 'italic', margin: 0}}>
            Andon Dashboard
          </h1>
        </div>
        
        <div style={{textAlign: 'right'}}>
          <div style={{fontSize: '20px', fontWeight: 'bold', marginBottom: '8px'}}>{currentDate}</div>
          <div style={digitalClockStyle}>{currentTimeString}</div>
          <div style={{fontSize: '14px', color: isConnected ? '#10b981' : '#ef4444', marginTop: '8px'}}>
            {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
          </div>
        </div>
      </div>


      {/* Station Header */}
      <div style={stationHeaderStyle}>
         <button style={buttonStyle}>◀ </button>
        <h2 style={{fontSize: '48px', fontWeight: 'bold', margin: 0}}>Production Line</h2>
        <button style={buttonStyle}>▶</button>
      </div>

      {/* Metrics Grid */}
      <div style={gridStyle}>
        {/* Plan Count */}
        <div style={{...cardStyle, backgroundColor: '#3b82f6'}}>
          <h3 style={{fontSize: '24px', fontWeight: 'bold', marginBottom: '16px', margin: 0}}>Plan Count</h3>
          <p style={{fontSize: '48px', fontWeight: 'bold', margin: 0}}>{totalPlanCount}</p>
        </div>

        {/* Actual Count */}
        <div style={{...cardStyle, backgroundColor: '#059669'}}>
          <h3 style={{fontSize: '24px', fontWeight: 'bold', marginBottom: '16px', margin: 0}}>Actual Count</h3>
          <p style={{fontSize: '48px', fontWeight: 'bold', margin: 0}}>{totalActualCount}</p>
        </div>

        {/* Total Downtime */}
        <div style={{...cardStyle, backgroundColor: '#f59e0b'}}>
          <h3 style={{fontSize: '24px', fontWeight: 'bold', marginBottom: '16px', margin: 0}}>Total Downtime</h3>
          <p style={{fontSize: '32px', fontWeight: 'bold', margin: 0}}>
            {formatDuration ? formatDuration(summary?.totalDowntime || 0) : '0.0 mins'}
          </p>
        </div>
      </div>

      {/* Bottom Row */}
      <div style={bottomGridStyle}>
        {/* Total Faults */}
        <div style={{...cardStyle, backgroundColor: '#7c3aed'}}>
          <h3 style={{fontSize: '24px', fontWeight: 'bold', marginBottom: '16px', margin: 0}}>Total Faults</h3>
          <p style={{fontSize: '32px', fontWeight: 'bold', margin: 0}}>{summary?.totalFaults || 0}</p>
        </div>

        {/* Resolved Faults */}
        <div style={{...cardStyle, backgroundColor: '#0d9488'}}>
          <h3 style={{fontSize: '24px', fontWeight: 'bold', marginBottom: '16px', margin: 0}}>Resolved Faults</h3>
          <p style={{fontSize: '32px', fontWeight: 'bold', margin: 0}}>{summary?.resolvedFaults || 0}</p>
        </div>
      </div>

      {/* Active Faults Display */}
      {summary?.activeFaults > 0 && (
        <div style={{...statusStyle, backgroundColor: '#ef4444'}}>
          <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'}}>
            <span style={{fontSize: '24px'}}>⚠</span>
            <span style={{fontSize: '24px', fontWeight: 'bold'}}>Active Faults: {summary.activeFaults}</span>
          </div>
        </div>
      )}

      {/* Status Bar */}
      <div style={statusStyle}>
        <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'}}>
          <div style={{
            width: '24px',
            height: '100px',
            backgroundColor: 'white',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <span style={{
              color: hasActiveFaults ? '#ef4444' : '#10b981',
              fontWeight: 'bold'
            }}>
              {hasActiveFaults ? '⚠' : '✓'}
            </span>
          </div>
          <span style={{fontSize: '24px', fontWeight: 'bold'}}>{overallStatus} Status</span>
        </div>
      </div>

      {/* Stations Grid */}
      {stations && Object.keys(stations).length > 0 && (
        <div style={stationGridStyle}>
          <h2 style={{fontSize: '20px', fontWeight: 'bold', marginBottom: '16px', color: '#374151'}}>
            Station Details
          </h2>
          <div style={stationsContainerStyle}>
            {Object.values(stations).map((station) => (
              <div
                key={station.name}
                style={{
                  borderRadius: '8px',
                  padding: '12px',
                  color: 'white',
                  textAlign: 'center',
                  boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                  backgroundColor: '#6b7280' // Default gray, you can modify this
                }}
              >
                <h3 style={{fontWeight: 'bold', fontSize: '18px', margin: '0 0 8px 0'}}>{station.name}</h3>
                <p style={{fontSize: '14px', margin: '4px 0'}}>Actual: {station.actualCount || 0}</p>
                <p style={{fontSize: '14px', margin: '4px 0'}}>Eff: {station.efficiency || 0}%</p>
                <p style={{fontSize: '14px', margin: '4px 0'}}>
                  ⏱ Downtime: {formatDuration ? formatDuration(station.currentDowntime || 0) : '0 mins'}
                </p>
                <p style={{fontSize: '14px', margin: '4px 0'}}>
                  Faults: {station.activeFaults && station.activeFaults.size > 0 ? [...station.activeFaults].join(', ') : 'None'}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardUI;