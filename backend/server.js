require('dotenv').config();
// backend/server.js - Updated for existing project structure
// backend/server.js - FIXED VERSION with proper error handling
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const axios = require('axios');
const path = require('path');
const fs = require('fs');
const initMQTT = require('./utils/mqttClient');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
  }
});

const PORT = process.env.PORT || 5000;

// Ensure database directory exists
const dbDir = path.join(__dirname, 'database');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const DATABASE_NAME = path.join(dbDir, 'andon_stations.db');

// Middleware
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.static('public'));

// Constants
const CALLTYPES = ['PMD', 'Quality', 'Store', 'JMD', 'Production'];

// Global variables
let stationPollingActive = false;
let stationData = [];

// Database connection with error handling
let db;

function initializeDatabase() {
  console.log('🗄️  Initializing database at:', DATABASE_NAME);
  
  db = new sqlite3.Database(DATABASE_NAME, (err) => {
    if (err) {
      console.error('❌ Database connection error:', err.message);
      return;
    }
    console.log('✅ Connected to SQLite database');
  });

  // Create tables with error handling
  const tables = [
    {
      name: 'baydetails',
      sql: `CREATE TABLE IF NOT EXISTS baydetails (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        StationName TEXT UNIQUE,
        PlannedCount1 INTEGER DEFAULT 0,
        PlannedCount2 INTEGER DEFAULT 0,
        PlannedCount3 INTEGER DEFAULT 0,
        ActualCount INTEGER DEFAULT 0,
        Efficiency REAL DEFAULT 0.00,
        ipAddress TEXT,
        Topic TEXT,
        isactive BOOLEAN DEFAULT 1,
        isalive BOOLEAN DEFAULT 1,
        DateCreated DATETIME DEFAULT CURRENT_TIMESTAMP,
        totalDowntime REAL DEFAULT 0.00,
        calltype_index_map TEXT DEFAULT '{"PMD":0,"Quality":2,"Store":6,"JMD":8,"Production":12}'
      )`
    },
    {
      name: 'DailyRecord',
      sql: `CREATE TABLE IF NOT EXISTS DailyRecord (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        StationName TEXT,
        TodayDate DATE,
        Plan INTEGER DEFAULT 0,
        ActualCount INTEGER DEFAULT 0,
        Efficiency REAL DEFAULT 0.00,
        mDowntime REAL DEFAULT 0.0,
        pDowntime REAL DEFAULT 0.0,
        qDowntime REAL DEFAULT 0.0,
        sDowntime REAL DEFAULT 0.0,
        jDowntime REAL DEFAULT 0.0,
        totalDowntime REAL DEFAULT 0.0,
        shift INTEGER,
        FOREIGN KEY(StationName) REFERENCES baydetails(StationName)
      )`
    },
    {
      name: 'SectionData',
      sql: `CREATE TABLE IF NOT EXISTS SectionData (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        StationName TEXT,
        calltype TEXT,
        FaultTime DATETIME,
        ResolvedTime DATETIME,
        DateTime DATETIME,
        Shift INTEGER,
        FOREIGN KEY(StationName) REFERENCES baydetails(StationName)
      )`
    },
    {
      name: 'ShiftData',
      sql: `CREATE TABLE IF NOT EXISTS ShiftData (
        StationName TEXT UNIQUE,
        last_actual_count INTEGER DEFAULT 0,
        shift1_actual INTEGER DEFAULT 0,
        shift2_actual INTEGER DEFAULT 0,
        shift3_actual INTEGER DEFAULT 0,
        Date DATETIME,
        PRIMARY KEY(StationName)
      )`
    },
    {
      name: 'ShiftConfig',
      sql: `CREATE TABLE IF NOT EXISTS ShiftConfig (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        shift1_start TEXT DEFAULT '05:30',
        shift1_end TEXT DEFAULT '14:20',
        shift2_start TEXT DEFAULT '14:20',
        shift2_end TEXT DEFAULT '00:10',
        shift3_start TEXT DEFAULT '00:10',
        shift3_end TEXT DEFAULT '05:30'
      )`
    },
    {
      name: 'ShiftBaselines',
      sql: `CREATE TABLE IF NOT EXISTS ShiftBaselines (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        StationName TEXT,
        Shift INTEGER,
        Date DATE,
        BaselineCount INTEGER DEFAULT 0,
        CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(StationName, Shift, Date),
        FOREIGN KEY(StationName) REFERENCES baydetails(StationName)
      )`
    }
  ];

  // Create tables sequentially
  let tableIndex = 0;
  
  function createNextTable() {
    if (tableIndex >= tables.length) {
      // All tables created, now insert default shift config
      insertDefaultShiftConfig();
      return;
    }

    const table = tables[tableIndex];
    db.run(table.sql, (err) => {
      if (err) {
        console.error(`❌ Error creating table ${table.name}:`, err.message);
      } else {
        console.log(`✅ Table ${table.name} ready`);
      }
      tableIndex++;
      createNextTable();
    });
  }

  createNextTable();
}

function insertDefaultShiftConfig() {
  db.get('SELECT COUNT(*) as count FROM ShiftConfig', (err, row) => {
    if (err) {
      console.error('❌ Error checking ShiftConfig:', err.message);
      return;
    }

    if (row.count === 0) {
      db.run(`
        INSERT INTO ShiftConfig (shift1_start, shift1_end, shift2_start, shift2_end, shift3_start, shift3_end)
        VALUES ('05:30','14:20','14:20','00:10','00:10','05:30')
      `, (err) => {
        if (err) {
          console.error('❌ Error inserting default shift config:', err.message);
        } else {
          console.log('✅ Default shift config inserted');
        }
      });
    } else {
      console.log('✅ Shift config already exists');
    }
  });
}

// API Routes with proper error handling

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    database: db ? 'connected' : 'disconnected',
    polling: stationPollingActive,
    stations: stationData.length
  });
});

// Get all stations
app.get('/api/stations', (req, res) => {
  if (!db) {
    return res.status(500).json({ 
      success: false, 
      error: 'Database not initialized' 
    });
  }

  db.all('SELECT * FROM baydetails WHERE isactive=1', (err, rows) => {
    if (err) {
      console.error('❌ Database error:', err.message);
      return res.status(500).json({ 
        success: false, 
        error: err.message 
      });
    }

    const stations = rows.map(row => ({
      stationName: row.StationName,
      planCount: row.PlannedCount1 || 0,
      actualCount: row.ActualCount || 0,
      totalDowntime: row.totalDowntime || 0,
      ipAddress: row.ipAddress,
      topic: row.Topic,
      isActive: row.isactive,
      isAlive: row.isalive,
      faultStatus: {},
      faultTime: '',
      resolvedTime: '',
      calltypeIndexMap: row.calltype_index_map
    }));

    res.json({ 
      success: true,
      stations
    });
  });
});

// Add new station
app.post('/api/stations', (req, res) => {
  if (!db) {
    return res.status(500).json({ 
      success: false, 
      error: 'Database not initialized' 
    });
  }

  const { stationName, plannedCount1, plannedCount2, plannedCount3, ipAddress, topic } = req.body;

  if (!stationName || !plannedCount1 || !plannedCount2 || !plannedCount3 || !ipAddress) {
    return res.status(400).json({ 
      success: false, 
      error: 'Missing required fields: stationName, plannedCount1, plannedCount2, plannedCount3, ipAddress' 
    });
  }

  const defaultCalltypeMap = JSON.stringify({
    "PMD": 0,
    "Quality": 2,
    "Store": 6,
    "JMD": 8,
    "Production": 12
  });

  db.run(
    `INSERT INTO baydetails (StationName, PlannedCount1, PlannedCount2, PlannedCount3, ipAddress, Topic, isactive, isalive, calltype_index_map) 
     VALUES (?, ?, ?, ?, ?, ?, 1, 1, ?)`,
    [stationName, parseInt(plannedCount1), parseInt(plannedCount2), parseInt(plannedCount3), ipAddress, topic || '', defaultCalltypeMap],
    function(err) {
      if (err) {
        console.error('❌ Database error:', err.message);
        if (err.code === 'SQLITE_CONSTRAINT') {
          return res.status(400).json({ 
            success: false, 
            error: 'Station already exists' 
          });
        }
        return res.status(500).json({ 
          success: false, 
          error: err.message 
        });
      }

      // Create shift data entry
      db.run('INSERT OR IGNORE INTO ShiftData (StationName) VALUES (?)', [stationName], (err) => {
        if (err) {
          console.warn('⚠️ Warning: Could not create shift data entry:', err.message);
        }
      });
      
      console.log(`✅ Station '${stationName}' added successfully`);
      // Subscribe to topic if provided
      if (topic && mqtt) {
        mqtt.subscribe(topic);
      }
      res.json({ 
        success: true, 
        message: 'Station added successfully',
        stationId: this.lastID 
      });
    }
  );
});

// UPDATE an existing station
app.put('/api/stations/:stationName', (req, res) => {
  if (!db) return res.status(500).json({success:false,error:'DB not ready'});
  const { stationName } = req.params;
  const decodedStationName = decodeURIComponent(stationName);
  const { plannedCount1, plannedCount2, plannedCount3, ipAddress, topic } = req.body;

  db.run(
    `UPDATE baydetails
        SET PlannedCount1=?, PlannedCount2=?, PlannedCount3=?, ipAddress=?, Topic=?
      WHERE StationName=?`,
    [plannedCount1, plannedCount2, plannedCount3, ipAddress, topic, decodedStationName],
    function (err) {
      if (err) return res.status(500).json({success:false,error:err.message});
      if (this.changes === 0)
        return res.status(404).json({success:false,error:'Station not found'});
      res.json({success:true,message:'Station updated'});
      // push real-time update
      io.emit('stationUpdate', { stationName, plannedCount1, plannedCount2,
                                  plannedCount3, ipAddress, topic });
    });
});

// DELETE a station (and dependents)  –  fixed
app.delete('/api/stations/:stationName', (req, res) => {
  if (!db) return res.status(500).json({ success: false, error: 'DB not ready' });

  const { stationName } = req.params;

  // Query the topic before deleting
  db.get('SELECT Topic FROM baydetails WHERE StationName = ?', stationName, (err, row) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    const topic = row && row.Topic;

    db.run('DELETE FROM baydetails WHERE StationName = ?', stationName, function (err) {
      if (err)        return res.status(500).json({ success: false, error: err.message });
      if (this.changes === 0)
        return res.status(404).json({ success: false, error: 'Station not found' });

      // secondary tables – we don’t care if they had 0 rows
      const tables = ['ShiftData', 'ShiftBaselines', 'DailyRecord', 'SectionData'];
      tables.forEach(t => db.run(`DELETE FROM ${t} WHERE StationName = ?`, stationName));

      // Unsubscribe from topic if found
      if (topic && mqtt) {
        mqtt.unsubscribe(topic);
      }

      io.emit('stationUpdate', { stationName, deleted: true });
      res.json({ success: true, message: 'Station deleted' });
    });
  });
});


// Get shift configuration - FIXED
app.get('/api/shift-config', (req, res) => {
  if (!db) {
    return res.status(500).json({ 
      success: false, 
      error: 'Database not initialized' 
    });
  }

  db.get('SELECT * FROM ShiftConfig LIMIT 1', (err, row) => {
    if (err) {
      console.error('❌ Shift config database error:', err.message);
      return res.status(500).json({ 
        success: false, 
        error: 'Database error: ' + err.message 
      });
    }
    
    if (!row) {
      // Return default config if no data exists
      const defaultConfig = {
        id: 1,
        shift1_start: '05:30',
        shift1_end: '14:20',
        shift2_start: '14:20',
        shift2_end: '00:10',
        shift3_start: '00:10',
        shift3_end: '05:30'
      };
      
      console.log('⚠️ No shift config found, returning defaults');
      return res.json({ 
        success: true,
        config: defaultConfig 
      });
    }
    
    res.json({ 
      success: true,
      config: row 
    });
  });
});

// Update shift configuration
app.put('/api/shift-config', (req, res) => {
  if (!db) {
    return res.status(500).json({ 
      success: false, 
      error: 'Database not initialized' 
    });
  }

  const { shift1_start, shift1_end, shift2_start, shift2_end, shift3_start, shift3_end } = req.body;

  // Check if record exists
  db.get('SELECT id FROM ShiftConfig LIMIT 1', (err, row) => {
    if (err) {
      console.error('❌ Database error:', err.message);
      return res.status(500).json({ 
        success: false, 
        error: err.message 
      });
    }

    if (row) {
      // Update existing record
      db.run(
        'UPDATE ShiftConfig SET shift1_start=?, shift1_end=?, shift2_start=?, shift2_end=?, shift3_start=?, shift3_end=? WHERE id=?',
        [shift1_start, shift1_end, shift2_start, shift2_end, shift3_start, shift3_end, row.id],
        function(err) {
          if (err) {
            console.error('❌ Database error:', err.message);
            return res.status(500).json({ 
              success: false, 
              error: err.message 
            });
          }
          
          res.json({ 
            success: true, 
            message: 'Shift timings updated successfully' 
          });
        }
      );
    } else {
      // Insert new record
      db.run(
        'INSERT INTO ShiftConfig (shift1_start, shift1_end, shift2_start, shift2_end, shift3_start, shift3_end) VALUES (?, ?, ?, ?, ?, ?)',
        [shift1_start, shift1_end, shift2_start, shift2_end, shift3_start, shift3_end],
        function(err) {
          if (err) {
            console.error('❌ Database error:', err.message);
            return res.status(500).json({ 
              success: false, 
              error: err.message 
            });
          }
          
          res.json({ 
            success: true, 
            message: 'Shift timings created successfully' 
          });
        }
      );
    }
  });
});

// Get table data
app.get('/api/tables/:tableName', (req, res) => {
  if (!db) {
    return res.status(500).json({ 
      success: false, 
      error: 'Database not initialized' 
    });
  }

  const { tableName } = req.params;
  
  const allowedTables = ['baydetails', 'SectionData', 'DailyRecord', 'ShiftData', 'ShiftBaselines'];
  if (!allowedTables.includes(tableName)) {
    return res.status(400).json({ 
      success: false, 
      error: 'Invalid table name' 
    });
  }

  // Get table schema
  db.all(`PRAGMA table_info(${tableName})`, (err, columns) => {
    if (err) {
      console.error('❌ Database error:', err.message);
      return res.status(500).json({ 
        success: false, 
        error: err.message 
      });
    }

    const columnNames = columns.map(col => col.name);

    // Get table data
    db.all(`SELECT * FROM ${tableName} ORDER BY id DESC LIMIT 1000`, (err, rows) => {
      if (err) {
        console.error('❌ Database error:', err.message);
        return res.status(500).json({ 
          success: false, 
          error: err.message 
        });
      }

      res.json({
        success: true,
        columns: columnNames,
        rows: rows
      });
    });
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err.stack);
  res.status(500).json({ 
    success: false, 
    error: 'Internal server error: ' + err.message 
  });
});

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log('👤 User connected:', socket.id);

  socket.emit('connection_status', { 
    message: 'Connected to Andon Dashboard', 
    timestamp: new Date().toISOString() 
  });

  socket.on('disconnect', () => {
    console.log('👤 User disconnected:', socket.id);
  });
});

// Initialize and start server
async function startServer() {
  try {
    // After database is initialized and ready (after initializeDatabase() is called):
    let mqtt;
    function handleStationUpdate(stationName, actualCount, faultStatus) {
      db.run('UPDATE baydetails SET ActualCount=?, isalive=1 WHERE StationName=?',
             [actualCount, stationName]);
      io.emit('stationUpdate', { stationName, actualCount, faultStatus });
    }

    // Call this after DB is ready
    initializeDatabase();
    mqtt = initMQTT(process.env.MQTT_URL || 'mqtt://localhost:1883', db, handleStationUpdate);
    
    // Wait for database to be ready
    setTimeout(() => {
      console.log('📊 Database initialization complete');
    }, 2000);

    server.listen(PORT, () => {
      console.log('🚀 Andon Dashboard Server running on port', PORT);
      console.log('📊 Dashboard: http://localhost:' + PORT);
      console.log('🔌 WebSocket: ws://localhost:' + PORT);
      console.log('✅ Ready for frontend connections!');
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
  }
}

startServer();

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...');
  stationPollingActive = false;
  if (db) {
    db.close((err) => {
      if (err) {
        console.error('❌ Error closing database:', err.message);
      } else {
        console.log('✅ Database connection closed');
      }
    });
  }
  server.close(() => {
    console.log('✅ Server shut down gracefully');
    process.exit(0);
  });
});

module.exports = { app, db, io };