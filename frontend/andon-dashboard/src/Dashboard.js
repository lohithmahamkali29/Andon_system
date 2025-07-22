import React, { useState, useEffect, useCallback, useRef } from 'react';


const Dashboard = () => {
  // State management
  const [stations, setStations] = useState([]);
  const [currentStationIndex, setCurrentStationIndex] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeTab, setActiveTab] = useState('');
  const [autoSlideActive, setAutoSlideActive] = useState(true);
  const [currentShift, setCurrentShift] = useState('');
  const [activeFaults, setActiveFaults] = useState([]);
  const [showFaultsSidebar, setShowFaultsSidebar] = useState(false);
  const autoSlideRef = useRef(null);
  const navRef = useRef(null);
 
  // Modal states
  const [showAddStationModal, setShowAddStationModal] = useState(false);
  const [showEditStationModal, setShowEditStationModal] = useState(false);
  const [showDeleteStationModal, setShowDeleteStationModal] = useState(false);
  const [showShiftTimingsModal, setShowShiftTimingsModal] = useState(false);
  const [showTableModal, setShowTableModal] = useState(false);
  const [showReportsModal, setShowReportsModal] = useState(false);
  const [selectedStationNameForEdit, setSelectedStationNameForEdit] = useState('');
  
  // Additional states for edit/delete
  const [selectedStationForEdit, setSelectedStationForEdit] = useState(null);
  const [selectedStationForDelete, setSelectedStationForDelete] = useState(null);
  const [editStationData, setEditStationData] = useState({
    stationName: '',
    plannedCount1: '',
    plannedCount2: '',
    plannedCount3: '',
    ipAddress: '',
    topic: ''
  });
  
  // Form states
  const [newStationData, setNewStationData] = useState({
    stationName: '',
    plannedCount1: '',
    plannedCount2: '',
    plannedCount3: '',
    ipAddress: '',
    topic: ''
  });
  
  const [shiftTimings, setShiftTimings] = useState({
    shift1_start: '05:30',
    shift1_end: '14:20',
    shift2_start: '14:20',
    shift2_end: '00:10',
    shift3_start: '00:10',
    shift3_end: '05:30'
  });
  
  const [tableData, setTableData] = useState([]);
  const [tableColumns, setTableColumns] = useState([]);
  const [selectedTable, setSelectedTable] = useState('');

  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  // Add state for selected report station
  const [selectedReportStation, setSelectedReportStation] = useState('');

  // Function to determine current shift based on time
  const getCurrentShift = useCallback(() => {
    const now = new Date();
    const currentTimeStr = now.toTimeString().slice(0, 5); // HH:MM format
    
    // Convert time strings to comparable minutes since midnight
    const timeToMinutes = (timeStr) => {
      const [hours, minutes] = timeStr.split(':').map(Number);
      return hours * 60 + minutes;
    };
    
    const currentMinutes = timeToMinutes(currentTimeStr);
    const shift1Start = timeToMinutes(shiftTimings.shift1_start);
    const shift1End = timeToMinutes(shiftTimings.shift1_end);
    const shift2Start = timeToMinutes(shiftTimings.shift2_start);
    const shift2End = timeToMinutes(shiftTimings.shift2_end);
    const shift3Start = timeToMinutes(shiftTimings.shift3_start);
    const shift3End = timeToMinutes(shiftTimings.shift3_end);
    
    // Handle overnight shifts
    if (shift1End < shift1Start) { // Shift 1 crosses midnight
      if (currentMinutes >= shift1Start || currentMinutes < shift1End) return 'Shift 1';
    } else {
      if (currentMinutes >= shift1Start && currentMinutes < shift1End) return 'Shift 1';
    }
    
    if (shift2End < shift2Start) { // Shift 2 crosses midnight
      if (currentMinutes >= shift2Start || currentMinutes < shift2End) return 'Shift 2';
    } else {
      if (currentMinutes >= shift2Start && currentMinutes < shift2End) return 'Shift 2';
    }
    
    if (shift3End < shift3Start) { // Shift 3 crosses midnight
      if (currentMinutes >= shift3Start || currentMinutes < shift3End) return 'Shift 3';
    } else {
      if (currentMinutes >= shift3Start && currentMinutes < shift3End) return 'Shift 3';
    }
    
    return 'Unknown Shift';
  }, [shiftTimings]);

  // Update current shift
  useEffect(() => {
    const updateShift = () => {
      setCurrentShift(getCurrentShift());
    };
    
    updateShift();
    const interval = setInterval(updateShift,1000); // Update every minute
    
    return () => clearInterval(interval);
  }, [getCurrentShift]);

  // Update active faults when stations change
  useEffect(() => {
    const faults = [];
    stations.forEach(station => {
      if (station.faultStatus) {
        Object.entries(station.faultStatus).forEach(([calltype, status]) => {
          if (status === true) {
            faults.push({
              stationName: station.stationName,
              calltype: calltype,
              faultTime: station.faultTime ? formatTime(new Date(station.faultTime)) : 'Unknown',
              resolvedTime: station.resolvedTime ? formatTime(new Date(station.resolvedTime)) : null
            });
          }
        });
      }
    });
    setActiveFaults(faults);
  }, [stations]);

  // Auto-slide functionality (matching Python behavior)
  const startAutoSlide = useCallback(() => {
    if (stations.length > 1 && autoSlideActive) {
      autoSlideRef.current = setInterval(() => {
        setCurrentStationIndex(prev => (prev + 1) % stations.length);
      }, 3000); // 3 seconds for better viewing
    }
  }, [stations.length, autoSlideActive]);

  const stopAutoSlide = () => {
    if (autoSlideRef.current) {
      clearInterval(autoSlideRef.current);
      autoSlideRef.current = null;
    }
  };

  // Navigation functions
  const nextSlide = () => {
    stopAutoSlide();
    setCurrentStationIndex(prev => (prev + 1) % stations.length);
    setAutoSlideActive(true);
  };

  const prevSlide = () => {
    stopAutoSlide();
    setCurrentStationIndex(prev => (prev - 1 + stations.length) % stations.length);
    setAutoSlideActive(true);
  };

  // HTTP Polling Implementation (replaces WebSocket)
  useEffect(() => {
    let isMounted = true;
    const POLL_INTERVAL = 5000; // Poll every 5 seconds
    
    const pollStations = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/stations`);
        const data = await response.json();
        
        if (isMounted && data.success) {
          setStations((data.stations || []).map(mapStationFields));
          setIsConnected(true);
        }
      } catch (error) {
        if (isMounted) setIsConnected(false);
        console.error('Polling error:', error);
      }
    };

    // Initial fetch
    pollStations();
    
    // Set up polling interval
    const intervalId = setInterval(pollStations, POLL_INTERVAL);
    
    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [API_BASE_URL]);

  // Update time every second (matching Python)
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Auto-slide effect
  useEffect(() => {
    startAutoSlide();
    return () => stopAutoSlide();
  }, [startAutoSlide]);

  // Click outside handler for navigation
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (navRef.current && !navRef.current.contains(event.target)) {
        setActiveTab('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Fetch initial station data
  const fetchStations = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/stations`);
      const data = await response.json();
      
      if (data.success) {
        setStations((data.stations || []).map(mapStationFields));
        console.log(`📋 Loaded ${data.stations?.length || 0} stations`);
      }
    } catch (error) {
      console.error('Error fetching stations:', error);
    }
  }, [API_BASE_URL]);

  // Fetch shift timings
  const fetchShiftTimings = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/shift-config`);
      const data = await response.json();
      
      if (data.success && data.config) {
        setShiftTimings(data.config);
      }
    } catch (error) {
      console.error('Error fetching shift timings:', error);
    }
  }, [API_BASE_URL]);

  useEffect(() => {
    fetchStations();
    fetchShiftTimings();
  }, [fetchStations, fetchShiftTimings]);

  // Add station
  const handleAddStation = async () => {
    if (!isValidIpAddress(newStationData.ipAddress)) {
      setIpError('Invalid IP address format');
      return;
    }
    try {
      const response = await fetch(`${API_BASE_URL}/api/stations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newStationData),
      });

      const result = await response.json();

      if (result.success) {
        setShowAddStationModal(false);
        setNewStationData({
          stationName: '',
          plannedCount1: '',
          plannedCount2: '',
          plannedCount3: '',
          ipAddress: '',
          topic: ''
        });
        fetchStations(); // Reload stations
        alert('Station added successfully!');
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error adding station:', error);
      alert('Error adding station');
    }
  };

  // Edit station functions
  const openEditStationModal = () => {
    if (stations.length === 0) {
      alert('No stations available to edit');
      return;
    }
    setSelectedStationNameForEdit('');          // force user to pick
    setSelectedStationForEdit(null);
    setShowEditStationModal(true);
    setActiveTab('');
  };

  const handleEditStation = async () => {
    if (!selectedStationForEdit) return;

    if (!selectedStationForEdit.stationName) {
      alert('Invalid station data - station name is missing');
      return;
    }

    if (!isValidIpAddress(editStationData.ipAddress)) {
      setIpError('Invalid IP address format');
      return;
    }

    try {
      console.log('Updating station:', selectedStationForEdit.stationName);
      const response = await fetch(`${API_BASE_URL}/api/stations/${encodeURIComponent(selectedStationForEdit.stationName)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editStationData),
      });

      const result = await response.json();

      if (result.success) {
        setShowEditStationModal(false);
        setSelectedStationForEdit(null);
        setSelectedStationNameForEdit('');
        fetchStations(); // Reload stations
        alert('Station updated successfully!');
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error updating station:', error);
      alert('Error updating station');
    }
  };

  // Delete station functions
  const openDeleteStationModal = () => {
    if (stations.length === 0) {
      alert('No stations available to delete');
      return;
    }
    setSelectedStationForDelete(null); // Reset selection
    setShowDeleteStationModal(true);
    setActiveTab('');
  };

  const handleDeleteStation = async () => {
    if (!selectedStationForDelete) {
      alert('Please select a station to delete');
      return;
    }

    if (!selectedStationForDelete.stationName) {
      alert('Invalid station data - station name is missing');
      return;
    }

    try {
      const stationName = selectedStationForDelete.stationName;
      const encodedStationName = encodeURIComponent(stationName);
      const url = `${API_BASE_URL}/api/stations/${encodedStationName}`;
      
      console.log('Deleting station:', stationName);
      console.log('Encoded station name:', encodedStationName);
      console.log('Full URL:', url);
      
      const response = await fetch(url, {
        method: 'DELETE',
      });

      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);

      const result = await response.json();
      console.log('Response result:', result);

      if (result.success) {
        setShowDeleteStationModal(false);
        setSelectedStationForDelete(null);
        fetchStations(); // Reload stations
        alert('Station deleted successfully!');
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error deleting station:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack
      });
      alert('Error deleting station');
    }
  };

  // Update shift timings
  const handleUpdateShiftTimings = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/shift-config`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(shiftTimings),
      });

      const result = await response.json();

      if (result.success) {
        setShowShiftTimingsModal(false);
        alert('Shift timings updated successfully!');
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error updating shift timings:', error);
      alert('Error updating shift timings');
    }
  };

  // View table data
  const handleViewTable = async (tableName) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/tables/${tableName}`);
      const data = await response.json();
      
      if (data.success) {
        setTableData(data.rows || []);
        setTableColumns(data.columns || []);
        setSelectedTable(tableName);
        setShowTableModal(true);
        setActiveTab(''); // Close dropdown
      }
    } catch (error) {
      console.error('Error fetching table data:', error);
    }
  };

  // Get current station
  const currentStation = stations[currentStationIndex];

  // Format time (matching Python format)
  const formatTime = (date) => {
    return date.toLocaleTimeString('en-GB', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-GB');
  };

  // Get station color based on fault status (matching Python logic)
  const getStationBgColor = (station) => {
    if (!station) return '#f0f8ff';
    
    const hasActiveFault = station.faultStatus && Object.values(station.faultStatus).some(status => status === true);
    return hasActiveFault ? '#ffe6e6' : '#f0f8ff';
  };

  const getStatusColor = (station) => {
    if (!station) return '#27ae60';
    
    const hasActiveFault = station.faultStatus && Object.values(station.faultStatus).some(status => status === true);
    return hasActiveFault ? '#e74c3c' : '#27ae60';
  };

  const getStatusText = (station) => {
    if (!station) return '✅ OK Status';
    
    const hasActiveFault = station.faultStatus && Object.values(station.faultStatus).some(status => status === true);
    
    if (hasActiveFault) {
      const activeFaults = Object.entries(station.faultStatus )
        .filter(([_, status]) => status === true)
        .map(([calltype]) => calltype);
      return `⚠️ FAULT: ${activeFaults.join(', ')}`;
    }
    
    return '✅ OK Status';
  };

  // Toggle menu function
  const toggleMenu = (menuName) => {
    if (activeTab === menuName) {
      setActiveTab('');
    } else {
      setActiveTab(menuName);
    }
  };

  function isValidIpAddress(ip) {
    // Accepts IPv4 with optional /path (e.g., 192.168.1.100 or 192.168.1.100/data)
    return /^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)(\/\w+)?$/.test(ip);
  }

  const [ipError, setIpError] = useState('');

  // Add a helper function:
  function getDuration(faultTime, resolvedTime) {
    if (!faultTime || !resolvedTime) return '';
    const start = new Date(faultTime);
    const end = new Date(resolvedTime);
    const diffMs = end - start;
    if (isNaN(diffMs) || diffMs < 0) return '';
    const mins = Math.floor(diffMs / 60000);
    const secs = Math.floor((diffMs % 60000) / 1000);
    return `${mins}m ${secs}s`;
  }

  // Helper to map backend fields to camelCase
  function mapStationFields(station) {
    return {
      stationName: station.stationName,
      plannedCount1: station.PlannedCount1 ?? station.plannedCount1 ?? 0,
      plannedCount2: station.PlannedCount2 ?? station.plannedCount2 ?? 0,
      plannedCount3: station.PlannedCount3 ?? station.plannedCount3 ?? 0,
      planCount: station.planCount ?? station.PlannedCount1 ?? 0,
      actualCount: station.actualCount ?? station.ActualCount ?? 0,
      totalDowntime: station.totalDowntime ?? station.TotalDowntime ?? 0,
      ipAddress: station.ipAddress,
      topic: station.topic,
      isActive: station.isActive ?? station.isactive,
      isAlive: station.isAlive ?? station.isalive,
      faultStatus: station.faultStatus,
      faultTime: station.faultTime,
      resolvedTime: station.resolvedTime,
      calltypeIndexMap: station.calltypeIndexMap ?? station.calltype_index_map
    };
  }

  // For downtime, sum all resolved fault durations for the current station:
  function getTotalDowntimeForStation(station) {
    if (!station || !Array.isArray(activeFaults)) return 0;
    let totalMs = 0;
    activeFaults.forEach(fault => {
      if (fault.stationName === station.stationName && fault.faultTime && fault.resolvedTime) {
        const start = new Date(fault.faultTime);
        const end = new Date(fault.resolvedTime);
        const diff = end - start;
        if (!isNaN(diff) && diff > 0) totalMs += diff;
      }
    });
    return Math.round(totalMs / 60000); // minutes
  }

  // Status bar logic:
  const [statusBar, setStatusBar] = useState({ message: 'Status OK', color: 'green' });
  useEffect(() => {
    // Watch for resolved faults
    if (activeFaults.some(f => f.resolvedTime && Date.now() - new Date(f.resolvedTime).getTime() < 2000)) {
      setStatusBar({ message: 'Error resolved!', color: 'green' });
      const timer = setTimeout(() => setStatusBar({ message: 'Status OK', color: 'green' }), 1000);
      return () => clearTimeout(timer);
    }
  }, [activeFaults]);

  // Implement downloadCSV:
  function downloadCSV(stationName) {
    if (!tableData || !tableColumns) return;
    const filtered = tableData.filter(row => row.StationName === stationName || row.stationName === stationName);
    const csvRows = [tableColumns.join(',')];
    filtered.forEach(row => {
      csvRows.push(tableColumns.map(col => JSON.stringify(row[col] ?? '')).join(','));
    });
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedTable || 'report'}_${stationName}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#ecf0f1', 
      padding: '0.5rem',
      fontFamily: 'Arial, sans-serif'
    }}>
      {/* Header - matching Python layout exactly */}
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

      {/* Navigation Bar - IMPROVED with centered layout */}
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
                <button onClick={() => { setShowAddStationModal(true); setActiveTab(''); }}
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
                <button onClick={() => { setShowShiftTimingsModal(true); setActiveTab(''); }}
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
              onClick={() => { setShowReportsModal(true); setActiveTab(''); }}
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

      {/* Station Header with Navigation - matching Python layout */}
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

      {/* Main Station Display - exact layout match with Python */}
      {currentStation ? (
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
            {/* Fault Time Card - Purple */}
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
              <p style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>
                {currentStation.faultTime || '--:--:--'}
              </p>
            </div>

            {/* Resolved Time Card - Teal */}
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
              <p style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>
                {currentStation.resolvedTime || '--:--:--'} (Duration: {getDuration(currentStation.faultTime, currentStation.resolvedTime)})
              </p>
            </div>
          </div>

          {/* Status Bar - matching Python fault/ok status */}
          <div style={{
            backgroundColor: getStatusColor(currentStation),
            color: 'white',
            padding: '2rem',
            borderRadius: '0.5rem',
            textAlign: 'center',
            border: '3px solid rgba(0,0,0,0.1)',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
          }}>
            <p style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>
              {getStatusText(currentStation)}
            </p>
          </div>
        </div>
      ) : (
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
      )}

      {/* Active Faults Sidebar */}
      {showFaultsSidebar && (
        <div style={{
          position: 'fixed',
          top: 0,
          right: 0,
          height: '100vh',
          width: '350px',
          backgroundColor: 'white',
          boxShadow: '-4px 0 6px rgba(0,0,0,0.1)',
          zIndex: 1001,
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{
            backgroundColor: '#ef4444',
            color: 'white',
            padding: '1rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <h3 style={{ margin: 0, fontSize: '1.25rem' }}>Active Faults</h3>
            <button 
              onClick={() => setShowFaultsSidebar(false)}
              style={{
                backgroundColor: 'transparent',
                border: 'none',
                color: 'white',
                fontSize: '1.5rem',
                cursor: 'pointer'
              }}
            >
              ×
            </button>
          </div>
          
          <div style={{
            flex: 1,
            overflow: 'auto',
            padding: '1rem'
          }}>
            {activeFaults.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '2rem',
                color: '#6b7280'
              }}>
                <p style={{ fontSize: '1.25rem', margin: 0 }}>✅ No active faults</p>
                <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>All stations are operating normally</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {activeFaults.map((fault, index) => (
                  <div key={index} style={{
                    backgroundColor: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: '0.5rem',
                    padding: '1rem'
                  }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '0.5rem'
                    }}>
                      <h4 style={{ margin: 0, color: '#dc2626', fontWeight: 'bold' }}>
                        {fault.stationName}
                      </h4>
                      <span style={{
                        backgroundColor: '#dc2626',
                        color: 'white',
                        padding: '0.25rem 0.5rem',
                        borderRadius: '0.25rem',
                        fontSize: '0.75rem',
                        fontWeight: 'bold'
                      }}>
                        {fault.calltype}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                      <p style={{ margin: '0.25rem 0' }}>
                        <strong>Fault Time:</strong> {fault.faultTime}
                      </p>
                      {fault.resolvedTime && (
                        <p style={{ margin: '0.25rem 0' }}>
                          <strong>Resolved:</strong> {fault.resolvedTime}
                        </p>
                      )}
                      {!fault.resolvedTime && (
                        <p style={{ margin: '0.25rem 0', color: '#dc2626' }}>
                          <strong>Status:</strong> Ongoing
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Station Modal */}
      {showAddStationModal && (
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
      )}

      {/* Shift Timings Modal */}
      {showShiftTimingsModal && (
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
      )}

      {/* Edit Station Modal */}
      {showEditStationModal && (
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
                  {stations.map(s=>(
                    <option key={s.stationName} value={s.stationName}>{s.stationName}</option>
                  ))}
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
      )}

      {/* Delete Station Modal - IMPROVED with station selection */}
      {showDeleteStationModal && (
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
      )}

      {/* Reports Modal */}
      {showReportsModal && (
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
            width: '500px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold' }}>Reports</h2>
              <button 
                onClick={() => setShowReportsModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#ef4444' }}
              >
                ×
              </button>
            </div>
            
            <div style={{ marginBottom: '2rem' }}>
              <p style={{ margin: '0 0 1rem 0', color: '#6b7280' }}>
                Generate reports for different data views. Select a report type below:
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <button
                  onClick={() => { handleViewTable('baydetails'); setShowReportsModal(false); }}
                  style={{
                    padding: '1rem',
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.25rem',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    textAlign: 'left'
                  }}
                >
                  📊 Bay Details Report
                </button>
                
                <button
                  onClick={() => { handleViewTable('SectionData'); setShowReportsModal(false); }}
                  style={{
                    padding: '1rem',
                    backgroundColor: '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.25rem',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    textAlign: 'left'
                  }}
                >
                  🔧 Section Data Report
                </button>
                
                <button
                  onClick={() => { handleViewTable('DailyRecord'); setShowReportsModal(false); }}
                  style={{
                    padding: '1rem',
                    backgroundColor: '#f59e0b',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.25rem',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    textAlign: 'left'
                  }}
                >
                  📈 Daily Production Report
                </button>
                
                <button
                  onClick={() => { handleViewTable('ShiftData'); setShowReportsModal(false); }}
                  style={{
                    padding: '1rem',
                    backgroundColor: '#8b5cf6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.25rem',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    textAlign: 'left'
                  }}
                >
                  ⏰ Shift Data Report
                </button>
              </div>
            </div>
            
            <button
              onClick={downloadCSV}
              style={{
                width: '100%',
                backgroundColor: '#3498db',
                color: 'white',
                padding: '0.75rem',
                border: 'none',
                borderRadius: '0.25rem',
                fontSize: '1rem',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              Download CSV
            </button>

            <button
              onClick={() => setShowReportsModal(false)}
              style={{
                width: '100%',
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
              Close
            </button>
          </div>
        </div>
      )}

      {/* Table Modal */}
      {showTableModal && (
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
            width: '90vw',
            maxWidth: '900px',
            maxHeight: '80vh',
            overflow: 'auto',
            position: 'relative'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold' }}>{selectedTable} Table</h2>
              <button 
                onClick={() => setShowTableModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#ef4444' }}
              >
                ×
              </button>
            </div>
            {/* Station selection dropdown */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ fontWeight: 'bold', marginRight: '1rem' }}>Select Station:</label>
              <select
                value={selectedReportStation}
                onChange={e => setSelectedReportStation(e.target.value)}
                style={{ padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid #d1d5db', fontSize: '1rem' }}
              >
                <option value="">-- Select a Station --</option>
                {stations.map(st => (
                  <option key={st.stationName} value={st.stationName}>{st.stationName}</option>
                ))}
              </select>
            </div>
            {/* Only show table and download if a station is selected */}
            {selectedReportStation && (
              <>
                <div style={{ overflowX: 'auto', marginBottom: '1rem' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        {tableColumns.map(col => (
                          <th key={col} style={{ border: '1px solid #d1d5db', padding: '0.5rem', background: '#f3f4f6', fontWeight: 'bold' }}>{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {tableData.filter(row => row.StationName === selectedReportStation || row.stationName === selectedReportStation).map((row, idx) => (
                        <tr key={idx}>
                          {tableColumns.map(col => (
                            <td key={col} style={{ border: '1px solid #d1d5db', padding: '0.5rem' }}>{row[col]}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {/* Download CSV button below the table, only if data is present */}
                {tableData && tableData.length > 0 && tableColumns && tableColumns.length > 0 && (
                  <button
                    onClick={() => downloadCSV(selectedReportStation)}
                    style={{
                      width: '100%',
                      backgroundColor: '#3498db',
                      color: 'white',
                      padding: '0.75rem',
                      border: 'none',
                      borderRadius: '0.25rem',
                      fontSize: '1rem',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      marginTop: '1rem'
                    }}
                  >
                    Download CSV
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;