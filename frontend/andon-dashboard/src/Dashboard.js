import React, { useState, useEffect, useCallback, useRef } from 'react';
import Header from './components/Header';
import NavigationBar from './components/NavigationBar';
import StationHeader from './components/StationHeader';
import StationDisplay from './components/StationDisplay';
import ActiveFaultsSidebar from './components/ActiveFaultsSidebar';
import AddStationModal from './components/modals/AddStationModal';
import EditStationModal from './components/modals/EditStationModal';
import DeleteStationModal from './components/modals/DeleteStationModal';
import ShiftTimingsModal from './components/modals/ShiftTimingsModal';
import ReportsModal from './components/modals/ReportsModal';
import TableModal from './components/modals/TableModal';

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
    const interval = setInterval(updateShift, 60000); // Update every minute
    
    return () => clearInterval(interval);
  }, [getCurrentShift]);

  // Update active faults when stations change (only show unresolved faults)
  useEffect(() => {
    const faults = [];
    stations.forEach(station => {
      if (station.faultStatus) {
        Object.entries(station.faultStatus).forEach(([calltype, status]) => {
          // Only add to sidebar if fault is truly active (status === true means unresolved)
          if (status === true) {
            faults.push({
              stationName: station.stationName,
              calltype: calltype,
              faultTime: station.latestFaultTime || 'Unknown',
              resolvedTime: null // Active faults have no resolved time
            });
          }
        });
      }
    });
    console.log('🔧 Active faults for sidebar:', faults); // Debug log
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
          console.log('📡 Raw API Response:', data.stations); // Debug log
          const mappedStations = (data.stations || []).map(mapStationFields);
          console.log('🗺️ Mapped Stations:', mappedStations); // Debug log
          setStations(mappedStations);
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

  // Toggle menu function
  const toggleMenu = (menuName) => {
    if (activeTab === menuName) {
      setActiveTab('');
    } else {
      setActiveTab(menuName);
    }
  };

  function isValidIpAddress(ip) {
    // Simple check - just ensure it's not empty and has some basic format
    return ip && ip.trim().length > 0;
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
      plannedCount1: station.PlannedCount1 ?? station.plannedCount1 ?? station.firstShiftPlannedCount ?? 0,
      plannedCount2: station.PlannedCount2 ?? station.plannedCount2 ?? station.secondShiftPlannedCount ?? 0,
      plannedCount3: station.PlannedCount3 ?? station.plannedCount3 ?? station.thirdShiftPlannedCount ?? 0,
      planCount: station.planCount ?? station.PlannedCount1 ?? station.firstShiftPlannedCount ?? 0,
      actualCount: station.actualCount ?? station.ActualCount ?? 0,
      totalDowntime: station.totalDowntime ?? station.TotalDowntime ?? 0,
      ipAddress: station.ipAddress,
      topic: station.topic,
      isActive: station.isActive ?? station.isactive,
      isAlive: station.isAlive ?? station.isalive,
      // Map fault-related data properly
      faultStatus: station.faultStatus || {},
      latestFaultTime: station.latestFaultTime,
      latestResolvedTime: station.latestResolvedTime,
      latestFaultCalltype: station.latestFaultCalltype,
      latestResolvedCalltype: station.latestResolvedCalltype,
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

  // Helper to get status bar info
  function getStatusBar(currentStation) {
    if (!currentStation) return { message: '✅ OK Status', color: '#27ae60' };
    
    const faultStatus = currentStation.faultStatus || {};
    const hasActiveFault = Object.values(faultStatus).some(v => v === true);

    // Show FAULT status only if there are active (unresolved) faults
    if (hasActiveFault) {
      const activeFaultTypes = Object.entries(faultStatus)
        .filter(([_, isActive]) => isActive === true)
        .map(([calltype]) => calltype);
      
      return {
        message: `🚨 ACTIVE FAULT: ${activeFaultTypes.join(', ')}`,
        color: '#e74c3c' // Red background for active faults
      };
    }
    
    // If no active faults, always show OK status (resolved faults don't affect this)
    return { 
      message: '✅ OK Status', 
      color: '#27ae60' 
    };
  }

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

  // Add a helper function to format ISO strings without T and Z
  function formatDisplayTime(timeString) {
    if (!timeString) return '--:--:--';
    // Remove T and Z, replace T with space
    return timeString.replace('T', ' ').replace('Z', '').split('.')[0];
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#ecf0f1', 
      padding: '0.5rem',
      fontFamily: 'Arial, sans-serif'
    }}>
      <Header 
        isConnected={isConnected} 
        currentTime={currentTime} 
        formatTime={formatTime} 
        formatDate={formatDate} 
      />

      <NavigationBar 
        navRef={navRef}
        activeTab={activeTab}
        toggleMenu={toggleMenu}
        stations={stations}
        setShowAddStationModal={setShowAddStationModal}
        openEditStationModal={openEditStationModal}
        openDeleteStationModal={openDeleteStationModal}
        setShowShiftTimingsModal={setShowShiftTimingsModal}
        handleViewTable={handleViewTable}
        setShowReportsModal={setShowReportsModal}
        showFaultsSidebar={showFaultsSidebar}
        setShowFaultsSidebar={setShowFaultsSidebar}
        activeFaults={activeFaults}
      />

      <StationHeader 
        prevSlide={prevSlide} 
        nextSlide={nextSlide} 
        stations={stations} 
      />

      <StationDisplay 
        currentStation={currentStation}
        getStationBgColor={getStationBgColor}
        currentShift={currentShift}
        getTotalDowntimeForStation={getTotalDowntimeForStation}
        getDuration={getDuration}
        getStatusBar={getStatusBar}
        formatDisplayTime={formatDisplayTime}
      />

      <ActiveFaultsSidebar 
        showFaultsSidebar={showFaultsSidebar}
        setShowFaultsSidebar={setShowFaultsSidebar}
        activeFaults={activeFaults}
        formatDisplayTime={formatDisplayTime}
      />

      <AddStationModal 
        showAddStationModal={showAddStationModal}
        setShowAddStationModal={setShowAddStationModal}
        newStationData={newStationData}
        setNewStationData={setNewStationData}
        handleAddStation={handleAddStation}
        ipError={ipError}
        setIpError={setIpError}
        isValidIpAddress={isValidIpAddress}
      />

      <EditStationModal 
        showEditStationModal={showEditStationModal}
        setShowEditStationModal={setShowEditStationModal}
        stations={stations}
        selectedStationNameForEdit={selectedStationNameForEdit}
        setSelectedStationNameForEdit={setSelectedStationNameForEdit}
        selectedStationForEdit={selectedStationForEdit}
        setSelectedStationForEdit={setSelectedStationForEdit}
        editStationData={editStationData}
        setEditStationData={setEditStationData}
        handleEditStation={handleEditStation}
        ipError={ipError}
        setIpError={setIpError}
        isValidIpAddress={isValidIpAddress}
      />

      <DeleteStationModal 
        showDeleteStationModal={showDeleteStationModal}
        setShowDeleteStationModal={setShowDeleteStationModal}
        stations={stations}
        selectedStationForDelete={selectedStationForDelete}
        setSelectedStationForDelete={setSelectedStationForDelete}
        handleDeleteStation={handleDeleteStation}
      />

      <ShiftTimingsModal 
        showShiftTimingsModal={showShiftTimingsModal}
        setShowShiftTimingsModal={setShowShiftTimingsModal}
        shiftTimings={shiftTimings}
        setShiftTimings={setShiftTimings}
        handleUpdateShiftTimings={handleUpdateShiftTimings}
      />

      <ReportsModal 
        showReportsModal={showReportsModal}
        setShowReportsModal={setShowReportsModal}
        handleViewTable={handleViewTable}
        downloadCSV={downloadCSV}
      />

      <TableModal 
        showTableModal={showTableModal}
        setShowTableModal={setShowTableModal}
        selectedTable={selectedTable}
        tableColumns={tableColumns}
        tableData={tableData}
        stations={stations}
        selectedReportStation={selectedReportStation}
        setSelectedReportStation={setSelectedReportStation}
        downloadCSV={downloadCSV}
      />
    </div>
  );
};

export default Dashboard;
