const axios = require('axios');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const express = require('express');
const router = express.Router();

const DATABASE_NAME = path.join(__dirname, '../database/andon_stations.db');
const POLL_INTERVAL_MS = 1000;

// Default calltype index mapping
const DEFAULT_CALLTYPE_MAP = {
  "PMD": 0,
  "Quality": 2,
  "Store": 6,
  "JMD": 8,
  "Production": 12
};

let db;
let pollerInterval = null;

// Handle fault status changes
router.post('/fault-status', (req, res) => {
  if (!db) {
    return res.status(500).json({ 
      success: false, 
      error: 'Database not initialized' 
    });
  }

  const { stationName, calltype, action } = req.body;
  
  if (!stationName || !calltype || !action) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: stationName, calltype, and action'
    });
  }

  if (action === 'resolve') {
    // Update existing fault record with resolve time
    const resolveTime = new Date().toISOString().replace('T', ' ').replace('Z', '');
    db.run(
      'UPDATE SectionData SET ResolvedTime = ? WHERE StationName = ? AND calltype = ? AND ResolvedTime IS NULL',
      [resolveTime, stationName, calltype],
      function(err) {
        if (err) {
          console.error('❌ Error resolving fault:', err);
          return res.status(500).json({
            success: false,
            error: err.message
          });
        }
        res.json({
          success: true,
          message: `Fault resolved for ${stationName} - ${calltype}`,
          resolveTime
        });
      }
    );
  } else if (action === 'fault') {
    // Create new fault record
    const now = new Date();
    const faultTime = now.toISOString().replace('T', ' ').replace('Z', '');
    
    // Get current shift
    db.get('SELECT * FROM ShiftConfig LIMIT 1', (err, shiftConfig) => {
      if (err) {
        return res.status(500).json({
          success: false,
          error: 'Error getting shift configuration'
        });
      }
      
      // Calculate current shift
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const currentTime = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
      
      let currentShift = 1; // Default to shift 1
      if (currentTime >= shiftConfig.shift2_start && currentTime < shiftConfig.shift2_end) {
        currentShift = 2;
      } else if (currentTime >= shiftConfig.shift3_start && currentTime < shiftConfig.shift3_end) {
        currentShift = 3;
      }
      
      // Insert fault record with shift
      db.run(
        'INSERT INTO SectionData (StationName, calltype, FaultTime, DateTime, Shift) VALUES (?, ?, ?, ?, ?)',
        [stationName, calltype, faultTime, faultTime, currentShift],
        function(err) {
          if (err) {
            console.error('❌ Error creating fault:', err);
            return res.status(500).json({
              success: false,
              error: err.message
            });
          }
          res.json({
            success: true,
            message: `Fault created for ${stationName} - ${calltype}`,
            faultTime
          });
        }
      );
    });
  } else {
    return res.status(400).json({
      success: false,
      error: 'Invalid action. Must be either "fault" or "resolve"'
    });
  }
});

// Function to start polling
function startPolling() {
  if (!db) {
    db = new sqlite3.Database(DATABASE_NAME);
  }

  async function pollStations() {
    try {
      // Get all active stations
      const stations = await new Promise((resolve, reject) => {
        db.all('SELECT * FROM baydetails WHERE isactive=1', (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });

      for (const station of stations) {
        try {
          const response = await axios.get(`http://${station.ipAddress}/data`, { timeout: 1000 });
          const arr = response.data;
          console.log(`📊 Raw data from ${station.StationName}:`, JSON.stringify(arr));

          // Get the station's calltype map
          const calltypeMap = JSON.parse(station.calltype_index_map || JSON.stringify(DEFAULT_CALLTYPE_MAP));
          
          // Update actualCount if Production index exists
          const productionIndex = calltypeMap.Production;
          console.log(`🔍 Production index for ${station.StationName}:`, productionIndex);
          
          if (typeof productionIndex === 'number' && arr.length > productionIndex) {
            const actualCount = arr[productionIndex];
            console.log(`📈 Extracted actualCount for ${station.StationName}:`, actualCount, `(from index ${productionIndex})`);
            
            if (typeof actualCount === 'number' && !isNaN(actualCount)) {
              // Get current shift
              const now = new Date();
              const currentHour = now.getHours();
              const currentMinute = now.getMinutes();
              const currentTime = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;

              // Get shift configuration
              const shiftConfig = await new Promise((resolve, reject) => {
                db.get('SELECT * FROM ShiftConfig LIMIT 1', (err, row) => {
                  if (err) reject(err);
                  else resolve(row);
                });
              });

              let currentShift = 1;
              if (currentTime >= shiftConfig.shift2_start && currentTime < shiftConfig.shift2_end) {
                currentShift = 2;
              } else if (currentTime >= shiftConfig.shift3_start && currentTime < shiftConfig.shift3_end) {
                currentShift = 3;
              }

              // Update both baydetails and ShiftData
              console.log(`💾 Updating database for ${station.StationName} with actualCount:`, actualCount);
              await Promise.all([
                new Promise((resolve, reject) => {
                  db.run('UPDATE baydetails SET ActualCount=?, isalive=1 WHERE StationName=?', 
                    [actualCount, station.StationName], 
                    (err) => {
                      if (err) {
                        console.error(`❌ Error updating baydetails:`, err);
                        reject(err);
                      } else {
                        console.log(`✅ Successfully updated baydetails for ${station.StationName}`);
                        resolve();
                      }
                    }
                  );
                }),
                new Promise((resolve, reject) => {
                  const shiftColumn = `shift${currentShift}_actual`;
                  db.run(
                    `UPDATE ShiftData SET ${shiftColumn}=?, last_actual_count=?, Date=CURRENT_TIMESTAMP WHERE StationName=?`,
                    [actualCount, actualCount, station.StationName],
                    (err) => err ? reject(err) : resolve()
                  );
                })
              ]);

              console.log(`✅ Updated counts for ${station.StationName}: actual=${actualCount}, shift${currentShift}=${actualCount}`);
            }
          }

          // Process other indices for fault status
          Object.entries(calltypeMap).forEach(([callType, idx]) => {
            if (callType === 'Production') return; // Skip production count
            
            const value = arr[idx];
            const prev = global.prevFaultStates?.[station.StationName]?.[callType] ?? 1;
            
            if (value === 0 && prev === 1) {
              // Fault started
              const faultDateTime = new Date().toISOString().replace('T', ' ').replace('Z', '');
              db.run(
                'INSERT INTO SectionData (StationName, calltype, FaultTime, DateTime, Shift) VALUES (?, ?, ?, ?, ?)',
                [station.StationName, callType, faultDateTime, faultDateTime, currentShift]
              );
              console.log(`⚠️ Fault started for ${station.StationName} (${callType})`);
            } else if (value === 1 && prev === 0) {
              // Fault resolved
              const resolveDateTime = new Date().toISOString().replace('T', ' ').replace('Z', '');
              db.run(
                'UPDATE SectionData SET ResolvedTime=? WHERE StationName=? AND calltype=? AND ResolvedTime IS NULL',
                [resolveDateTime, station.StationName, callType]
              );
              console.log(`✅ Fault resolved for ${station.StationName} (${callType})`);
            }
            
            // Update previous state
            if (!global.prevFaultStates) global.prevFaultStates = {};
            if (!global.prevFaultStates[station.StationName]) global.prevFaultStates[station.StationName] = {};
            global.prevFaultStates[station.StationName][callType] = value;
          });

        } catch (error) {
          console.error(`❌ Error polling station ${station.StationName}:`, error.message);
          // Mark station as not alive
          db.run('UPDATE baydetails SET isalive=0 WHERE StationName=?', [station.StationName]);
        }
      }
    } catch (error) {
      console.error('❌ Error in polling cycle:', error);
    }
  }

  // Start polling interval
  pollerInterval = setInterval(pollStations, POLL_INTERVAL_MS);
  console.log('✅ Device polling started');
}

module.exports = {
  startPolling,
  router
};