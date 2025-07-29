const express = require('express');
const router = express.Router();
const { sequelize } = require('../models');

// Get table data (for data views)
router.get('/tables/:tableName', async (req, res) => {
  const { tableName } = req.params;
  
  // Validate table name to prevent SQL injection
  const allowedTables = ['baydetails', 'section_data', 'daily_records', 'ShiftData', 'ShiftBaselines'];
  if (!allowedTables.includes(tableName)) {
    return res.status(400).json({ error: 'Invalid table name' });
  }

  try {
    const columns = await sequelize.query(`PRAGMA table_info(${tableName})`, { type: sequelize.QueryTypes.SELECT });
    const columnNames = columns.map(col => col.name);
    const rows = await sequelize.query(`SELECT * FROM ${tableName} ORDER BY id DESC LIMIT 1000`, { type: sequelize.QueryTypes.SELECT });

    res.json({
      success: true,
      columns: columnNames,
      rows: rows
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
    
    const response = await axios.get(url, { timeout: 5000 });
    
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
router.get('/health', async (req, res) => {
  try {
    await sequelize.authenticate();
    res.json({
      status: 'OK',
      database: 'connected',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      database: 'disconnected',
      error: error.message
    });
  }
});

// Shift configuration endpoints
router.get('/shift-config', (req, res) => {
  // Default shift timings
  const defaultConfig = {
    shift1_start: '05:30',
    shift1_end: '14:20',
    shift2_start: '14:20',
    shift2_end: '00:10',
    shift3_start: '00:10',
    shift3_end: '05:30'
  };
  
  res.json({
    success: true,
    config: defaultConfig
  });
});

router.put('/shift-config', (req, res) => {
  const { shift1_start, shift1_end, shift2_start, shift2_end, shift3_start, shift3_end } = req.body;
  
  // In a real application, you would save this to database
  // For now, just return success
  res.json({
    success: true,
    message: 'Shift configuration updated',
    config: {
      shift1_start,
      shift1_end,
      shift2_start,
      shift2_end,
      shift3_start,
      shift3_end
    }
  });
});

module.exports = router;
