// backend/routes/api.js - Enhanced API routes
const express = require('express');
const router = express.Router();

// Get table data (for data views)
router.get('/tables/:tableName', (req, res) => {
  const db = req.app.locals.db;
  const { tableName } = req.params;
  
  // Validate table name to prevent SQL injection
  const allowedTables = ['baydetails', 'SectionData', 'DailyRecord', 'ShiftData', 'ShiftBaselines'];
  if (!allowedTables.includes(tableName)) {
    return res.status(400).json({ error: 'Invalid table name' });
  }

  // Get table schema
  db.all(`PRAGMA table_info(${tableName})`, (err, columns) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    const columnNames = columns.map(col => col.name);

    // Get table data
    db.all(`SELECT * FROM ${tableName} ORDER BY id DESC LIMIT 1000`, (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      res.json({
        success: true,
        columns: columnNames,
        rows: rows
      });
    });
  });
});

// Get shift configuration
router.get('/shift-config', (req, res) => {
  const db = req.app.locals.db;
  
  db.get('SELECT * FROM ShiftConfig LIMIT 1', (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    res.json({ 
      success: true,
      config: row || {} 
    });
  });
});

// Update shift configuration
router.put('/shift-config', (req, res) => {
  const db = req.app.locals.db;
  const { shift1_start, shift1_end, shift2_start, shift2_end, shift3_start, shift3_end } = req.body;

  db.run(
    'UPDATE ShiftConfig SET shift1_start=?, shift1_end=?, shift2_start=?, shift2_end=?, shift3_start=?, shift3_end=? WHERE id=1',
    [shift1_start, shift1_end, shift2_start, shift2_end, shift3_start, shift3_end],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      res.json({ success: true, message: 'Shift timings updated successfully' });
    }
  );
});

// Get reports data
router.get('/reports/:reportType', (req, res) => {
  const db = req.app.locals.db;
  const { reportType } = req.params;
  const { fromDate, toDate } = req.query;

  let tableName, query, params = [];
  
  switch (reportType) {
    case 'baydetails':
      tableName = 'baydetails';
      query = 'SELECT *FROM baydetails';
      break;
    case 'SectionData':
      tableName = 'SectionData';
      query = 'SELECT * FROM SectionData WHERE DateTime BETWEEN ? AND ?';
      params = [fromDate, toDate];
      break;
    case 'DailyRecord':
      tableName = 'DailyRecord';
      query = 'SELECT * FROM DailyRecord WHERE TodayDate BETWEEN ? AND ?';
      params = [fromDate, toDate];
      break;
    default:
      return res.status(400).json({ error: 'Invalid report type' });
  }

  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    res.json({ 
      success: true,
      data: rows,
      reportType,
      fromDate,
      toDate
    });
  });
});

// Get dashboard summary
router.get('/dashboard/summary', async (req, res) => {
  const db = req.app.locals.db;
  
  try {
    // Get total stations
    const stationsQuery = 'SELECT COUNT(*) as totalStations FROM baydetails WHERE isactive=1';
    
    // Get today's data
    const today = new Date().toISOString().split('T')[0];
    const faultsQuery = 'SELECT COUNT(*) as totalFaults FROM SectionData WHERE DATE(DateTime)=?';
    const resolvedQuery = 'SELECT COUNT(*) as resolvedFaults FROM SectionData WHERE DATE(DateTime)=? AND ResolvedTime IS NOT NULL';
    const activeQuery = 'SELECT COUNT(*) as activeFaults FROM SectionData WHERE DATE(DateTime)=? AND ResolvedTime IS NULL';
    
    // Get total planned count for current shift
    const planQuery = 'SELECT SUM(PlannedCount1) as totalPlan FROM baydetails WHERE isactive=1';
    
    // Get total downtime
    const downtimeQuery = 'SELECT SUM(totalDowntime) as totalDowntime FROM DailyRecord WHERE TodayDate=?';

    // Execute all queries
    db.get(stationsQuery, (err, stationResult) => {
      if (err) return res.status(500).json({ error: err.message });
      
      db.get(faultsQuery, [today], (err, faultResult) => {
        if (err) return res.status(500).json({ error: err.message });
        
        db.get(resolvedQuery, [today], (err, resolvedResult) => {
          if (err) return res.status(500).json({ error: err.message });
          
          db.get(activeQuery, [today], (err, activeResult) => {
            if (err) return res.status(500).json({ error: err.message });
            
            db.get(planQuery, (err, planResult) => {
              if (err) return res.status(500).json({ error: err.message });
              
              db.get(downtimeQuery, [today], (err, downtimeResult) => {
                if (err) return res.status(500).json({ error: err.message });
                
                res.json({
                  success: true,
                  summary: {
                    totalStations: stationResult.totalStations || 0,
                    totalFaults: faultResult.totalFaults || 0,
                    resolvedFaults: resolvedResult.resolvedFaults || 0,
                    activeFaults: activeResult.activeFaults || 0,
                    totalPlanCount: planResult.totalPlan || 0,
                    totalDowntime: downtimeResult.totalDowntime || 0
                  }
                });
              });
            });
          });
        });
      });
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Test station connection
router.post('/test-connection', async (req, res) => {
  const { ipAddress } = req.body;
  
  if (!ipAddress) {
    return res.status(400).json({ error: 'IP address is required' });
  }

  try {
    const axios = require('axios');
    const url = ipAddress.startsWith('http') ? ipAddress : `http://${ipAddress}`;
    
    const response = await axios.get(url, { timeout: 1500 });
    
    res.json({
      success: true,
      status: response.status,
      data: response.data,
      message: 'Connection successful'
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Connection failed'
    });
  }
});

// Manual fault simulation (for testing)
router.post('/simulate-fault', (req, res) => {
  const io = req.app.locals.io;
  const { stationName, calltype, action } = req.body; // action: 'fault' or 'resolve'
  
  if (!stationName || !calltype || !action) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Emit test fault to all connected clients
  const faultData = {
    stationName,
    calltype,
    action,
    timestamp: new Date().toISOString(),
    test: true
  };

  io.emit('testFault', faultData);
  
  res.json({
    success: true,
    message: `Test ${action} sent for ${stationName} - ${calltype}`,
    data: faultData
  });
});

// Get system health
router.get('/health', (req, res) => {
  const db = req.app.locals.db;
  
  // Check database connection
  db.get('SELECT 1', (err) => {
    if (err) {
      return res.status(500).json({
        status: 'ERROR',
        database: 'disconnected',
        error: err.message
      });
    }
    
    res.json({
      status: 'OK',
      database: 'connected',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  });
});

module.exports = router;