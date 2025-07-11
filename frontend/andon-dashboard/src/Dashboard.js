



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

import React, { useState, useEffect, useCallback, useRef } from 'react';
import io from 'socket.io-client';

const Dashboard = () => {
  const [stations, setStations] = useState({});
  const [dailyRecords, setDailyRecords] = useState({});
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [summary, setSummary] = useState({});
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeTab, setActiveTab] = useState('dashboard');
  const [activeSubTab, setActiveSubTab] = useState('');
  const navRef = useRef(null);
  const [showReportWindow, setShowReportWindow] = useState(false);
  const [selectedReport, setSelectedReport] = useState('Bay Details');
  const [downloadPath, setDownloadPath] = useState('');
  const [fileFormat, setFileFormat] = useState('.xlsx');
  const [fromDate, setFromDate] = useState(new Date());
  const [toDate, setToDate] = useState(new Date());
  const [reportData, setReportData] = useState([]);
  const [reportColumns, setReportColumns] = useState([]);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState(null);
  const [reportSuccess, setReportSuccess] = useState(false);
  const [reportMessage, setReportMessage] = useState('');
  const [reportType, setReportType] = useState('bay_details');
  const [showAddStationWindow, setShowAddStationWindow] = useState(false);
  const [showEditStationWindow, setShowEditStationWindow] = useState(false);

  const [newStationData, setNewStationData] = useState({ name: '' });
  const [stationEditData, setStationEditData] = useState({ name: '' });
  const [showShiftTimingsWindow, setShowShiftTimingsWindow] = useState(false);

  const [shiftTimings, setShiftTimings] = useState({
    shift1Start: '',
    shift2Start: '',
    shift3Start: ''
  });

// Add these functions as well:
const openAddStationWindow = () => setShowAddStationWindow(true);
const openEditStationWindow = () => setShowEditStationWindow(true);
const openDeleteStationWindow = () => alert("Delete logic not implemented yet");
const openEditShiftTimingsWindow = () => setShowShiftTimingsWindow(true);

const saveNewStation = () => {
  console.log("Saving station", newStationData);
  setShowAddStationWindow(false);
};

const saveStationEdit = () => {
  console.log("Updating station", stationEditData);
  setShowEditStationWindow(false);
};

const saveShiftTimings = () => {
  console.log("Shift timings saved:", shiftTimings);
  setShowShiftTimingsWindow(false);
};


  

  const reportOptions = {
    "Bay Details": "baydetails",
    "Section Data": "SectionData",
    "Daily_Production_Data": "DailyRecord"
  };
  

  const modalOverlayStyle = {
  position: 'fixed',
  top: 0, left: 0, right: 0, bottom: 0,
  backgroundColor: 'rgba(0,0,0,0.5)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 1002,
};

const modalContentStyle = {
  backgroundColor: '#fff',
  padding: '1rem',
  borderRadius: '8px',
  width: '400px',
  boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
  alignItems: 'center',
};

const modalHeaderStyle = {
  display: 'flex',
  // justifyContent: '',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '1rem',
  textAlign: 'center',
  pt: '0px',
  marginTop: '0px',
};

const closeBtnStyle = {
  background: 'none',
  border: 'none',
  fontSize: '20px',
  cursor: 'pointer',
  textAlign: 'center',
   pt: '0px',
   color: 'red',
   marginTop: '0px',
};

const saveBtnStyle = {
  width: '300px',
     height: '40px' , 
     borderRadius: '5px', 
     border: '1px solid #ccc', 
     padding: '5px', fontSize: '16px',
      boxSizing: 'border-box', 
      marginBottom: '10px',
       marginTop: '5px', 
       marginLeft: '5px',  
       textAlign: 'center', 
       justifyContent: 'center' , 
       display: 'flex', 
       flexDirection: 'column',
        gap: '0.5rem'
}
  

  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
  const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);
  // ===== Fixed Click Outside Handler =====
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (navRef.current && !navRef.current.contains(event.target)) {
        setActiveTab('');
        setActiveSubTab('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // ===== Fixed Toggle Function =====
  const toggleMenu = (menuName) => {
    if (activeTab === menuName) {
      setActiveTab('');
      setActiveSubTab('');
    } else {
      setActiveTab(menuName);
      setActiveSubTab('');
    }
  };



  const loadReportData = async () => {
    const tableName = reportOptions[selectedReport];
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/report?table=${tableName}&from=${fromDate.toISOString()}&to=${toDate.toISOString()}`);
      const data = await response.json();
      
      setReportData(data.rows);
      setReportColumns(data.columns);
    } catch (error) {
      console.error('Error loading report data:', error);
      // You might want to add error handling UI here
    }
  };
  
  const downloadData = async () => {
    if (!downloadPath) {
      alert('Please select a download directory');
      return;
    }
  
    const tableName = reportOptions[selectedReport];
    const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false }).replace(/:/g, '');
    const filename = `${tableName.substring(0, 5)}_${fromDate.toISOString().split('T')[0].replace(/-/g, '')}_${timestamp}${fileFormat}`;
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/report/download?table=${tableName}&from=${fromDate.toISOString()}&to=${toDate.toISOString()}&format=${fileFormat.substring(1)}`);
      const blob = await response.blob();
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      alert(`Data successfully saved as ${filename}`);
    } catch (error) {
      console.error('Error downloading report:', error);
      alert('Failed to download file');
    }
  };
  
  const browseDownloadPath = () => {
    // Note: In a real app, you'd need a proper file dialog solution
    // This is a simplified version for demonstration
    const path = prompt('Enter download directory path:');
    if (path) {
      setDownloadPath(path);
      // You might want to save this to localStorage or your backend
    }
  };
  

  const initializeStations = useCallback(() => {
    const initialStations = {};
    for (let i = 1; i <= 18; i++) {
      const stationName = `Station${i}`;
      initialStations[stationName] = {
        id: i,
        name: stationName,
        production: { state: 1, faultTime: null, resolvedTime: null },
        maintenance: { state: 1, faultTime: null, resolvedTime: null },
        quality: { state: 1, faultTime: null, resolvedTime: null },
        store: { state: 1, faultTime: null, resolvedTime: null },
        actualCount: 0,
        totalDowntime: 0,
        currentDowntime: 0,
        activeFaults: new Set(),
        efficiency: 0,
        isActive: true,
        isAlive: true
      };
    }
    setStations(initialStations);
  }, []);

  // Fetch initial data from Express API
  const fetchInitialData = useCallback(async () => {
    try {
      // Fetch daily records for today's downtime
      const dailyResponse = await fetch(`${API_BASE_URL}/api/data/dailyrecord`);
      const dailyData = await dailyResponse.json();
      
      const dailyByStation = {};
      const today = new Date().toISOString().split('T')[0];
      
      dailyData.forEach(record => {
        if (record.todayDate === today) {
          dailyByStation[record.stationName] = record;
        }
      });
      
      setDailyRecords(dailyByStation);

      // Fetch bay details for station information
      const bayResponse = await fetch(`${API_BASE_URL}/api/data/baydetail`);
      const bayData = await bayResponse.json();
      
      setStations(prev => {
        const updated = { ...prev };
        bayData.forEach(bay => {
          if (updated[bay.stationName]) {
            updated[bay.stationName].actualCount = bay.actualCount;
            updated[bay.stationName].efficiency = bay.efficiency;
            updated[bay.stationName].isActive = bay.isActive;
            updated[bay.stationName].isAlive = bay.isAlive;
            updated[bay.stationName].totalDowntime = dailyByStation[bay.stationName]?.totalDowntime || 0;
          }
        });
        return updated;
      });

      // Fetch current unresolved faults
      const sectionResponse = await fetch(`${API_BASE_URL}/api/data/sectiondata?date=${today}`);
      const sectionData = await sectionResponse.json();
      
      setStations(prev => {
        const updated = { ...prev };
        sectionData.forEach(section => {
          if (!section.resolvedTime && updated[section.stationName]) {
            const callType = section.callType.toLowerCase();
            updated[section.stationName][callType].state = 0;
            updated[section.stationName][callType].faultTime = new Date(section.faultTime);
            updated[section.stationName].activeFaults.add(callType);
          }
        });
        return updated;
      });

      // Fetch dashboard summary
      const summaryResponse = await fetch(`${API_BASE_URL}/api/dashboard/summary`);
      const summaryData = await summaryResponse.json();
      setSummary(summaryData);

    } catch (error) {
      console.error('Error fetching initial data:', error);
    }
  }, [API_BASE_URL]);

  // Socket.IO connection
  useEffect(() => {
    const connectSocket = () => {
      const newSocket = io(SOCKET_URL, {
        transports: ['websocket'],
        cors: {
          origin: "http://localhost:3000",
          methods: ["GET", "POST"]
        }
      });
      
      newSocket.on('connect', () => {
        console.log('✅ Socket.IO connected');
        setIsConnected(true);
      });
      
      newSocket.on('disconnect', () => {
        console.log('❌ Socket.IO disconnected');
        setIsConnected(false);
      });

      newSocket.on('connection_status', (data) => {
        console.log('Connection status:', data);
      });
      
      newSocket.on('station_update', (data) => {
        handleSocketMessage(data);
      });
      
      newSocket.on('error', (error) => {
        console.error('Socket.IO error:', error);
      });
      
      setSocket(newSocket);
    };

    connectSocket();

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [SOCKET_URL]);

  // Handle Socket.IO messages
  const handleSocketMessage = useCallback((message) => {
    console.log('Received socket message:', message);
    
    if (message.type === 'station_updates') {
      setStations(prev => {
        const updated = { ...prev };
        
        message.changes.forEach(change => {
          const station = updated[change.station];
          if (!station) return;
          
          const callType = change.callType.toLowerCase();
          
          if (change.type === 'fault') {
            // Fault occurred
            station[callType].state = 0;
            station[callType].faultTime = new Date(change.time);
            station[callType].resolvedTime = null;
            station.activeFaults.add(callType);
            
            console.log(`🚨 Fault detected: ${change.station} - ${change.callType}`);
          } else if (change.type === 'resolved') {
            // Fault resolved
            station[callType].state = 1;
            station[callType].resolvedTime = new Date(change.time);
            station.activeFaults.delete(callType);
            
            // Calculate and add downtime
            if (station[callType].faultTime) {
              const downtime = (station[callType].resolvedTime - station[callType].faultTime) / (1000 * 60); // minutes
              station.totalDowntime += downtime;
            }
            
            console.log(`✅ Fault resolved: ${change.station} - ${change.callType}`);
          }
        });
        
        // Update actual count if provided
        if (message.stationData && message.stationData.actualCount !== undefined) {
          const station = updated[message.stationData.station];
          if (station) {
            station.actualCount = message.stationData.actualCount;
          }
        }
        
        return updated;
      });
    }
  }, []);

  // Calculate current downtime for active faults
  const getCurrentDowntime = useCallback((station) => {
    let currentDowntime = 0;
    const now = new Date();
    
    station.activeFaults.forEach(callType => {
      if (station[callType].faultTime) {
        currentDowntime += (now - station[callType].faultTime) / (1000 * 60); // minutes
      }
    });
    
    return currentDowntime;
  }, []);

  // Get station background color based on active faults
  const getStationColor = useCallback((station) => {
    if (station.activeFaults.size > 0) {
      return '#ef4444';
    }
    if (!station.isActive) {
      return '#6b7280';
    }
    if (!station.isAlive) {
      return '#f59e0b';
    }
    return '#10b981';
  }, []);

  // Format time display
  const formatTime = (date) => {
    if (!date) return '--:--';
    return date.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // Format duration in minutes to readable format
  const formatDuration = (minutes) => {
    if (minutes < 60) {
      return `${Math.round(minutes)}m`;
    } else {
      const hours = Math.floor(minutes / 60);
      const mins = Math.round(minutes % 60);
      return `${hours}h ${mins}m`;
    }
  };

  // Manual fault testing functions
  const createTestFault = async (stationName, callType) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/sectiondata`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          stationName,
          callType,
          faultTime: new Date().toISOString()
        })
      });
      
      if (response.ok) {
        console.log(`Test fault created: ${stationName} - ${callType}`);
      }
    } catch (error) {
      console.error('Error creating test fault:', error);
    }
  };

  // Initialize on mount
  useEffect(() => {
    initializeStations();
    fetchInitialData();
  }, [initializeStations, fetchInitialData]);

  // Update current downtime every second for active faults
  useEffect(() => {
    const interval = setInterval(() => {
      setStations(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(stationName => {
          if (updated[stationName].activeFaults.size > 0) {
            updated[stationName].currentDowntime = getCurrentDowntime(updated[stationName]);
          } else {
            updated[stationName].currentDowntime = 0;
          }
        });
        return updated;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [getCurrentDowntime]);

  // Calculate totals
  const totalActualCount = Object.values(stations).reduce((total, station) => total + (station.actualCount || 0), 0);
  const totalPlanCount = summary?.totalPlanCount || 480;
  const hasActiveFaults = summary?.activeFaults > 0;
  const overallStatus = hasActiveFaults ? 'FAULT' : 'OK';

  // Format current date and time
  const currentDate = currentTime.toLocaleDateString('en-GB');
  const currentTimeString = currentTime.toLocaleTimeString('en-GB');

  // const openAddStationWindow = (station) => {
  //   console.log("Opening Add Station window");
  //   // Implement your add station logic here
  //   // For example, open a modal or navigate to a new page  
  //     const url = `/station/${station.id}`; // or absolute URL
  //     window.open(url, '_blank', 'width=600,height=400');

  // };

  // const openEditStationWindow = () => {
  //   console.log("Opening Edit Station window");
  //   // Implement your edit station logic here
  // };

  // const openDeleteStationWindow = () => {
  //   console.log("Opening Delete Station window");
  //   // Implement your delete station logic here
  // };

  // const openEditShiftTimingsWindow = () => {
  //   console.log("Opening Edit Shift Timings window");
  //   // Implement your shift timings logic here
  // };

  // Table view functions
  const viewTable = (tableName) => {
    console.log(`Viewing table: ${tableName}`);
    setActiveSubTab(tableName.toLowerCase());
    // Implement your table viewing logic here
  };

  // Reports function
  const viewReports = () => {
    console.log("Viewing reports");

    // Implement your reports logic here
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#e5e7eb', 
      padding: '0.5rem',
      fontFamily: 'Arial, sans-serif'
    }}>
      {/* Header - Responsive */}
      <div style={{
        backgroundColor: 'white',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        padding: '0.75rem 1rem',
        marginBottom: '0.5rem',
        display: 'flex',
        flexDirection: window.innerWidth < 768 ? 'column' : 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{
              width: '2rem', height: '2rem', borderRadius: '50%',
              backgroundColor: '#2563eb', display: 'flex', alignItems: 'center',
              justifyContent: 'center', color: 'white', fontWeight: 'bold'
            }}>J</div>
            <span style={{ fontWeight: 'bold', fontSize: '1.25rem' }}>JBM</span>
            <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Group</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{
              width: '2rem', height: '2rem', borderRadius: '50%',
              backgroundColor: '#3b82f6', display: 'flex', alignItems: 'center',
              justifyContent: 'center', color: 'white', fontWeight: 'bold'
            }}>O</div>
            <span style={{ fontWeight: 'bold', fontSize: '1.25rem', color: '#2563eb' }}>Ogihara</span>
          </div>
        </div>
        
        <div style={{ textAlign: 'center' }}>
          <h1 style={{
            fontSize: window.innerWidth < 768 ? '1.5rem' : '1.875rem',
            fontWeight: 'bold',
            color: '#1d4ed8',
            fontStyle: 'italic',
            margin: 0
          }}>Andon Dashboard</h1>
        </div>
        
        <div style={{ textAlign: window.innerWidth < 768 ? 'center' : 'right' }}>
          <div style={{ fontSize: '1.125rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
            {currentDate}
          </div>
          <div style={{
            fontFamily: 'monospace', fontSize: '1rem', fontWeight: 'bold',
            backgroundColor: '#1f2937', color: '#00ff00', padding: '0.5rem',
            borderRadius: '0.25rem', border: '2px solid #374151', letterSpacing: '1px'
          }}>
            {currentTimeString}
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
      {/* Navigation Bar */}
      <nav ref={navRef} // Properly attached ref
        style={{
          backgroundColor: '#1e40af',
          color: 'white',
          padding: '0.5rem',
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
          gap: '1rem'
        }}>
          {/* Stations Tab */}
          <li style={{ position: 'relative' }}>
            <button 
              onClick={() => toggleMenu('stations')}
              style={{
                backgroundColor: activeTab === 'stations' ? '#3b82f6' : 'transparent',
                color: 'white',
                border: 'none',
                padding: '0.5rem 1rem',
                borderRadius: '0.25rem',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              Stations
            </button>
            {activeTab === 'stations' && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                backgroundColor: 'white',
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                borderRadius: '0.25rem',
                zIndex: 10,
                width: '250px'
              }}>
                <div style={{
                  padding: '0.5rem',
                  borderBottom: '1px solid #e5e7eb'
                }}>
                  <button 
                    onClick={openAddStationWindow }
                    style={{
                      display: 'block',
                      width: '100%',
                      textAlign: 'left',
                      padding: '0.5rem',
                      backgroundColor: 'transparent',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    Add Station
                  </button>
                  <button 
                    onClick={openEditStationWindow}
                    style={{
                      display: 'block',
                      width: '100%',
                      textAlign: 'left',
                      padding: '0.5rem',
                      backgroundColor: 'transparent',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    Edit Station
                  </button>
                  <button 
                    onClick={openDeleteStationWindow}
                    style={{
                      display: 'block',
                      width: '100%',
                      textAlign: 'left',
                      padding: '0.5rem',
                      backgroundColor: 'transparent',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    Delete Station
                  </button>
                 <button 
                    onClick={() => setShowShiftTimingsWindow(true)}
                    style={{
                      display: 'block',
                      width: '100%',
                      textAlign: 'left',
                      padding: '0.5rem',
                      backgroundColor: 'transparent',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    Edit Shift Timings
                  </button>

                </div>
                <div style={{ padding: '0.5rem' }}>
                  <h4 style={{ margin: '0 0 0.5rem 0', color: '#374151' }}>Current Stations</h4>
                  <div style={{ 
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '0.25rem'
                  }}>
                    {Object.keys(stations).map(stationName => (
                      <div key={stationName} style={{
                        backgroundColor: '#e5e7eb',
                        padding: '0.25rem',
                        borderRadius: '0.25rem',
                        fontSize: '0.75rem',
                        textAlign: 'center'
                      }}>
                        {stationName}
                      </div>
                    ))}
                  </div>
                </div>
                
              </div>
            )}
          </li>

          {/* Data Views Tab */}
          <li style={{ position: 'relative' }}>
            <button 
              onClick={() => toggleMenu('data')}
              style={{
                backgroundColor: activeTab === 'data' ? '#3b82f6' : 'transparent',
                color: 'white',
                border: 'none',
                padding: '0.5rem 1rem',
                borderRadius: '0.25rem',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              Data Views
            </button>
            {activeTab === 'data' && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                backgroundColor: 'white',
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                borderRadius: '0.25rem',
                zIndex: 10,
                width: '200px'
              }}>
                <button 
                  onClick={() => viewTable('baydetails')}
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    padding: '0.5rem',
                    backgroundColor: activeSubTab === 'baydetails' ? '#e5e7eb' : 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#374151'
                  }}
                >
                  View BayDetails
                </button>
                <button 
                  onClick={() => viewTable('sectiondata')}
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    padding: '0.5rem',
                    backgroundColor: activeSubTab === 'sectiondata' ? '#e5e7eb' : 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#374151'
                  }}
                >
                  View SectionData
                </button>
                <button 
                  onClick={() => viewTable('dailyrecord')}
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    padding: '0.5rem',
                    backgroundColor: activeSubTab === 'dailyrecord' ? '#e5e7eb' : 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#374151'
                  }}
                >
                  View DailyRecord
                </button>
                <button 
                  onClick={() => viewTable('shiftdata')}
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    padding: '0.5rem',
                    backgroundColor: activeSubTab === 'shiftdata' ? '#e5e7eb' : 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#374151'
                  }}
                >
                  Shift Data
                </button>
                <button 
                  onClick={() => viewTable('shiftbaselines')}
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    padding: '0.5rem',
                    backgroundColor: activeSubTab === 'shiftbaselines' ? '#e5e7eb' : 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#374151'
                  }}
                >
                  Shift Baselines
                </button>
              </div>
            )}
          </li>

          {/* Reports Tab */}
          <li>
            <button 
              onClick={() => toggleMenu('reports')}
              style={{
                backgroundColor: activeTab === 'data' ? '#3b82f6' : 'transparent',
                color: 'white',
                border: 'none',
                padding: '0.5rem 1rem',
                borderRadius: '0.25rem',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              Reports 
            </button>
            {activeTab === 'reports' && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                margin: '0 15rem',
                backgroundColor: 'white',
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                borderRadius: '0.25rem',
                zIndex: 10,
                width: '200px'
              }}>
                <button 
                  onClick={() => setShowReportWindow(true)}
                  style={{
                    display: 'block',
                    width: 'fit-content',
                    textAlign: 'left',
                    padding: '0.5rem',
                    backgroundColor: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#374151'
                  }}
                >
                  Generate Report
                </button>
              </div>
            )}
          </li>
          
        </ul>
      </nav>
      {showReportWindow && (
  <div style={{
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '700px',
    height: '400px',
    backgroundColor: 'white',
    boxShadow: '0 0 20px rgba(0,0,0,0.2)',
    zIndex: 1001,
    display: 'grid',
    gridTemplateColumns: '180px 1fr'
  }}>
    {/* LEFT FRAME */}
    <div style={{
      backgroundColor: '#f0f0f0',
      padding: '8px',
      overflowY: 'auto'
    }}>
      {/* Report options */}
      <div style={{ marginBottom: '10px' }}>
        <select 
          value={selectedReport}
          onChange={(e) => setSelectedReport(e.target.value)}
          style={{ width: '100%', padding: '5px' }}
        >
          {Object.keys(reportOptions).map(option => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      </div>

      {/* Download Path */}
      <div style={{ marginBottom: '10px' }}>
        <label style={{ display: 'block', marginBottom: '5px' }}>Download Path:</label>
        <input
          type="text"
          value={downloadPath}
          onChange={(e) => setDownloadPath(e.target.value)}
          style={{ width: '100%', padding: '5px' }}
        />
        <button 
          onClick={browseDownloadPath}
          style={{ marginTop: '5px', padding: '5px 10px' }}
        >
          Browse
        </button>
      </div>

      {/* Format selection */}
      <div style={{ marginBottom: '10px' }}>
        <label style={{ display: 'block', marginBottom: '5px' }}>Select Format:</label>
        <select
          value={fileFormat}
          onChange={(e) => setFileFormat(e.target.value)}
          style={{ width: '100%', padding: '5px' }}
        >
          <option value=".xlsx">.xlsx</option>
          <option value=".csv">.csv</option>
        </select>
      </div>

      {/* Date selectors */}
      <div style={{ marginBottom: '10px' }}>
        <label style={{ display: 'block', marginBottom: '5px' }}>From Date:</label>
        <input
          type="date"
          value={fromDate.toISOString().split('T')[0]}
          onChange={(e) => setFromDate(new Date(e.target.value))}
          style={{ width: '100%', padding: '5px' }}
        />

        <label style={{ display: 'block', marginTop: '10px', marginBottom: '5px' }}>To Date:</label>
        <input
          type="date"
          value={toDate.toISOString().split('T')[0]}
          onChange={(e) => setToDate(new Date(e.target.value))}
          style={{ width: '100%', padding: '5px' }}
        />
      </div>

      {/* Download button */}
      <button 
        onClick={downloadData}
        style={{ 
          marginTop: '10px',
          padding: '5px 10px',
          backgroundColor: '#4CAF50',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        Download
      </button>
    </div>

    {/* RIGHT FRAME */}
    <div style={{
      padding: '5px',
      overflow: 'auto'
    }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ backgroundColor: '#f2f2f2' }}>
            {reportColumns.map(column => (
              <th key={column} style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {reportData.map((row, i) => (
            <tr key={i} style={{ borderBottom: '1px solid #ddd' }}>
              {reportColumns.map(column => (
                <td key={column} style={{ padding: '8px', border: '1px solid #ddd' }}>
                  {row[column]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    {/* Close button */}
    <button 
      onClick={() => setShowReportWindow(false)}
      style={{
        position: 'absolute',
        top: '5px',
        right: '5px',
        background: 'none',
        border: 'none',
        fontSize: '16px',
        cursor: 'pointer'
      }}
    >
      ×
    </button>
  </div>
)}


      {/* Station Header - Responsive */}
      <div style={{
        backgroundColor: '#374151',
        color: 'white',
        textAlign: 'center',
        padding: '1.5rem 1rem',
        marginBottom: '1rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <button style={{
          backgroundColor: '#3b82f6', color: 'white', padding: '0.5rem 1rem',
          border: 'none', borderRadius: '0.25rem', cursor: 'pointer'
        }}>◀</button>
        <h2 style={{
          fontSize: window.innerWidth < 768 ? '1.875rem' : '3rem',
          fontWeight: 'bold',
          margin: 0
        }}>Production Line</h2>
        <button style={{
          backgroundColor: '#3b82f6', color: 'white', padding: '0.5rem 1rem',
          border: 'none', borderRadius: '0.25rem', cursor: 'pointer'
        }}>▶</button>
      </div>

      {/* Metrics Grid - Responsive */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: window.innerWidth < 768 ? '1fr' : 'repeat(3, 1fr)',
        gap: '1rem',
        marginBottom: '1rem'
      }}>
        <div style={{
          backgroundColor: '#3b82f6', color: 'white', padding: '2rem',
          textAlign: 'center', borderRadius: '0.5rem', boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: '0 0 1rem 0' }}>Plan Count</h3>
          <p style={{ fontSize: '3rem', fontWeight: 'bold', margin: 0 }}>{totalPlanCount}</p>
        </div>

        <div style={{
          backgroundColor: '#059669', color: 'white', padding: '2rem',
          textAlign: 'center', borderRadius: '0.5rem', boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: '0 0 1rem 0' }}>Actual Count</h3>
          <p style={{ fontSize: '3rem', fontWeight: 'bold', margin: 0 }}>{totalActualCount}</p>
        </div>

        <div style={{
          backgroundColor: '#f59e0b', color: 'white', padding: '2rem',
          textAlign: 'center', borderRadius: '0.5rem', boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: '0 0 1rem 0' }}>Total Downtime</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0 }}>
            {formatDuration(summary?.totalDowntime || 0)}
          </p>
        </div>
      </div>

      {/* Bottom Row - Responsive */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: window.innerWidth < 768 ? '1fr' : 'repeat(2, 1fr)',
        gap: '1rem',
        marginBottom: '1rem'
      }}>
        <div style={{
          backgroundColor: '#7c3aed', color: 'white', padding: '2rem',
          textAlign: 'center', borderRadius: '0.5rem', boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: '0 0 1rem 0' }}>Total Faults</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0 }}>{summary?.totalFaults || 0}</p>
        </div>

        <div style={{
          backgroundColor: '#0d9488', color: 'white', padding: '2rem',
          textAlign: 'center', borderRadius: '0.5rem', boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: '0 0 1rem 0' }}>Resolved Faults</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0 }}>{summary?.resolvedFaults || 0}</p>
        </div>
      </div>

      {/* Active Faults Display */}
      {summary?.activeFaults > 0 && (
        <div style={{
          backgroundColor: '#ef4444', color: 'white', textAlign: 'center',
          padding: '1.5rem', borderRadius: '0.5rem', marginBottom: '1rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.5rem' }}>⚠</span>
            <span style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
              Active Faults: {summary.activeFaults}
            </span>
          </div>
        </div>
      )}

      {/* Status Bar - Removed extra space */}
      <div style={{
        backgroundColor: hasActiveFaults ? '#ef4444' : '#10b981',
        color: 'white', textAlign: 'center', padding: '1.5rem',
        borderRadius: '0.5rem', marginBottom: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
          <div style={{
            width: '1rem', height: '3.75rem', backgroundColor: 'white',
            borderRadius: '0.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <span style={{
              color: hasActiveFaults ? '#ef4444' : '#10b981',
              fontWeight: 'bold', fontSize: '0.75rem'
            }}>
              {hasActiveFaults ? '⚠' : '✓'}
            </span>
          </div>
          <span style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{overallStatus} Status</span>
        </div>
      </div>
 {showAddStationWindow && (
  <div style={modalOverlayStyle}>
    <div style={modalContentStyle}>
      <div style={modalHeaderStyle}>
        <h3 style={{textAlign: 'center'}}>Add Station</h3>
        <button onClick={() => setShowAddStationWindow(false)} style={closeBtnStyle}>×</button>
      </div>
      <div>
        <label>Station Name:</label>
        <input type="text" value={newStationData.name} onChange={(e) => setNewStationData({ ...newStationData, name: e.target.value })} />
        {/* Add more inputs as needed */}
      </div>
      <button onClick={saveNewStation} style={saveBtnStyle}>Save</button>
    </div>
  </div>
)}

{showEditStationWindow && (
  <div style={modalOverlayStyle}>
    <div style={modalContentStyle}>
      <div style={modalHeaderStyle}>
        <h3>Edit Station</h3>
        <button onClick={() => setShowEditStationWindow(false)} style={closeBtnStyle}>×</button>
      </div>
      <div>
        <label>Station Name:</label>
        <input type="text" value={stationEditData.name} onChange={(e) => setStationEditData({ ...stationEditData, name: e.target.value })} />
        {/* Add more edit fields */}
      </div>
      <button onClick={saveStationEdit}style={saveBtnStyle}>Update</button>
    </div>
  </div>
)}

{showShiftTimingsWindow && (
  <div style={modalOverlayStyle}>
    <div style={modalContentStyle}>
      <div style={modalHeaderStyle}>
        <h3 style={{textAlign: 'center',paddingLeft: '130px'}}>Shift Timings</h3>
        <button onClick={() => setShowShiftTimingsWindow(false)} style={closeBtnStyle}>×</button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' , alignItems: 'center', justifyContent: 'center', textAlign: 'center'}}>
        <label>Shift 1 Start:</label>
        <input type="time" value={shiftTimings.shift1Start} style={{ width: '300px', height: '40px' , borderRadius: '5px', border: '1px solid #ccc', padding: '5px', fontSize: '16px', boxSizing: 'border-box', marginBottom: '10px', marginTop: '5px', marginLeft: '5px',  textAlign: 'center', justifyContent: 'center' , display: 'flex', flexDirection: 'column', gap: '0.5rem',}} onChange={(e) => setShiftTimings({ ...shiftTimings, shift1Start: e.target.value })} />
        <label>Shift 2 Start:</label>
              <input type="time" value={shiftTimings.shift2Start} style={{ width: '300px', height: '40px' , borderRadius: '5px', border: '1px solid #ccc', padding: '5px', fontSize: '16px', boxSizing: 'border-box', marginBottom: '10px', marginTop: '5px', marginLeft: '5px',  textAlign: 'center', justifyContent: 'center' , display: 'flex', flexDirection: 'column', gap: '0.5rem',}} onChange={(e) => setShiftTimings({ ...shiftTimings, shift1Start: e.target.value })} />
        <label>Shift 3 Start:</label>
               <input type="time" value={shiftTimings.shift3Start} style={{ width: '300px', height: '40px' , borderRadius: '5px', border: '1px solid #ccc', padding: '5px', fontSize: '16px', boxSizing: 'border-box', marginBottom: '10px', marginTop: '5px', marginLeft: '5px',  textAlign: 'center', justifyContent: 'center' , display: 'flex', flexDirection: 'column', gap: '0.5rem',}} onChange={(e) => setShiftTimings({ ...shiftTimings, shift1Start: e.target.value })} />
      </div>
      <button onClick={saveShiftTimings}style={saveBtnStyle}/>
    </div>
  </div>
)}



    </div>
  );
};

export default Dashboard;