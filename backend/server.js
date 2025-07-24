require('dotenv').config();
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const devicePoller = require('./services/devicePoller');


const app = express();

// Mount device poller routes
app.use('/api', devicePoller.router);
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

// Database connection
let db;

function initializeDatabase() {
  console.log('🗄️  Initializing database at:', DATABASE_NAME);
  
  db = new sqlite3.Database(DATABASE_NAME, (err) => {
    if (err) {
      console.error('❌ Database connection error:', err.message);
      process.exit(1);
    }
    console.log('✅ Connected to SQLite database');
  });

  // Create tables
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

  // Execute table creation sequentially
  const createTables = async () => {
    for (const table of tables) {
      try {
        await new Promise((resolve, reject) => {
          db.run(table.sql, (err) => {
            if (err) reject(err);
            else resolve();
          });
        });
        console.log(`✅ Table ${table.name} ready`);
      } catch (err) {
        console.error(`❌ Error creating table ${table.name}:`, err.message);
      }
    }
    
    // Insert default shift config
    db.get('SELECT COUNT(*) as count FROM ShiftConfig', (err, row) => {
      if (err) {
        console.error('❌ Error checking ShiftConfig:', err.message);
        return;
      }

      if (!row || row.count === 0) {
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
      }
    });
  };

  createTables();
}

// API Routes

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    database: db ? 'connected' : 'disconnected'
  });
});

// Get all stations with fault status
app.get('/api/stations', (req, res) => {
  if (!db) {
    return res.status(500).json({ 
      success: false, 
      error: 'Database not initialized' 
    });
  }

  // Get all active stations
  db.all('SELECT * FROM baydetails WHERE isactive=1', (err, stations) => {
    if (err) {
      console.error('❌ Database error:', err.message);
      return res.status(500).json({ 
        success: false, 
        error: err.message 
      });
    }

    // Get recent faults (last 24 hours)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    db.all('SELECT * FROM SectionData WHERE DateTime > ? ORDER BY DateTime DESC', [yesterday], (faultErr, faults) => {
      if (faultErr) {
        console.error('❌ Fault query error:', faultErr.message);
        return res.status(500).json({ 
          success: false, 
          error: faultErr.message 
        });
      }

      // Map faults to stations
      const stationMap = {};
      stations.forEach(station => {
        stationMap[station.StationName] = {
          stationName: station.StationName,
          planCount: station.PlannedCount1 || 0,
          actualCount: station.ActualCount || 0,
          totalDowntime: station.totalDowntime || 0,
          ipAddress: station.ipAddress,
          topic: station.Topic,
          isActive: station.isactive,
          isAlive: station.isalive,
          faultStatus: {},
          faultTime: null,
          resolvedTime: null,
          calltypeIndexMap: JSON.parse(station.calltype_index_map || '{}')
        };
      });

      // Set fault status
      faults.forEach(fault => {
        if (stationMap[fault.StationName]) {
          const station = stationMap[fault.StationName];
          
          // Initialize fault tracking for this calltype if not exists
          if (!station.faultStatus[fault.calltype]) {
            station.faultStatus[fault.calltype] = false;
          }
          
          // Check if this is an active fault (no resolve time)
          if (!fault.ResolvedTime) {
            station.faultStatus[fault.calltype] = true;
            
            // Update fault time if this is more recent
            const faultTime = new Date(fault.FaultTime);
            if (!station.faultTime || faultTime > new Date(station.faultTime)) {
              station.faultTime = fault.FaultTime;
              station.resolvedTime = null;
            }
          } else {
            // This is a resolved fault - only update if we don't have an active fault for this type
            if (!station.faultStatus[fault.calltype]) {
              const faultTime = new Date(fault.FaultTime);
              if (!station.faultTime || faultTime > new Date(station.faultTime)) {
                station.faultTime = fault.FaultTime;
                station.resolvedTime = fault.ResolvedTime;
              }
            }
          }
        }
      });

      // Convert to array
      const stationData = Object.values(stationMap);
      
      // Set default fault status for all calltypes
      stationData.forEach(station => {
        CALLTYPES.forEach(calltype => {
          if (station.faultStatus[calltype] === undefined) {
            station.faultStatus[calltype] = false;
          }
        });
      });

      res.json({ 
        success: true,
        stations: stationData
      });
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
      error: 'Missing required fields' 
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
    [stationName, plannedCount1, plannedCount2, plannedCount3, ipAddress, topic || '', defaultCalltypeMap],
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
      db.run('INSERT OR IGNORE INTO ShiftData (StationName) VALUES (?)', [stationName]);
      
      console.log(`✅ Station '${stationName}' added successfully`);
      res.json({ 
        success: true, 
        message: 'Station added successfully',
        stationId: this.lastID 
      });
    }
  );
});

// Update existing station
app.put('/api/stations/:stationName', (req, res) => {
  if (!db) return res.status(500).json({success: false, error: 'Database not ready'});
  
  const { stationName } = req.params;
  const decodedStationName = decodeURIComponent(stationName);
  const { plannedCount1, plannedCount2, plannedCount3, ipAddress, topic } = req.body;

  db.run(
    `UPDATE baydetails
     SET PlannedCount1=?, PlannedCount2=?, PlannedCount3=?, ipAddress=?, Topic=?
     WHERE StationName=?`,
    [plannedCount1, plannedCount2, plannedCount3, ipAddress, topic, decodedStationName],
    function (err) {
      if (err) return res.status(500).json({success: false, error: err.message});
      if (this.changes === 0) {
        return res.status(404).json({success: false, error: 'Station not found'});
      }
      
      res.json({success: true, message: 'Station updated'});
    }
  );
});

// Delete a station
app.delete('/api/stations/:stationName', (req, res) => {
  if (!db) return res.status(500).json({ success: false, error: 'Database not ready' });

  const { stationName } = req.params;
  const decodedStationName = decodeURIComponent(stationName);

  db.run('DELETE FROM baydetails WHERE StationName = ?', decodedStationName, function (err) {
    if (err) return res.status(500).json({ success: false, error: err.message });
    if (this.changes === 0) {
      return res.status(404).json({ success: false, error: 'Station not found' });
    }

    // Delete related data
    const tables = ['ShiftData', 'ShiftBaselines', 'DailyRecord', 'SectionData'];
    tables.forEach(t => {
      db.run(`DELETE FROM ${t} WHERE StationName = ?`, decodedStationName);
    });
    
    res.json({ success: true, message: 'Station deleted' });
  });
});

// Get shift configuration
app.get('/api/shift-config', (req, res) => {
  if (!db) {
    return res.status(500).json({ 
      success: false, 
      error: 'Database not initialized' 
    });
  }

  db.get('SELECT * FROM ShiftConfig LIMIT 1', (err, row) => {
    if (err) {
      console.error('❌ Shift config error:', err.message);
      return res.status(500).json({ 
        success: false, 
        error: err.message 
      });
    }
    
    if (!row) {
      // Return default config
      return res.json({ 
        success: true,
        config: {
          shift1_start: '05:30',
          shift1_end: '14:20',
          shift2_start: '14:20',
          shift2_end: '00:10',
          shift3_start: '00:10',
          shift3_end: '05:30'
        }
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

    // Get table data (last 1000 records)
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
    error: 'Internal server error' 
  });
});

// Initialize and start server
function startServer() {
  try {
    initializeDatabase();
    devicePoller.startPolling(); // Start device polling
    
    // Start HTTP server
    app.listen(PORT, () => {
      console.log('🚀 Andon Dashboard Server running on port', PORT);
      console.log('📊 Dashboard: http://localhost:' + PORT);
      console.log('✅ Ready for frontend connections!');
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...');
  if (db) {
    db.close((err) => {
      if (err) console.error('❌ Error closing database:', err.message);
      else console.log('✅ Database connection closed');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
});

module.exports = app;