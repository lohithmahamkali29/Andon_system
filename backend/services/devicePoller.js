// backend/poller.js
const axios = require('axios');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DATABASE_NAME = path.join(__dirname, '../database/andon.db');
const POLL_INTERVAL_MS = 1500; // Match Python's 1.5 second interval

// Initialize state tracking at module level
let prevFaultStates = {};
let shiftBaselines = {};

// Database connection
let db;

// Direct polling function (no worker threads)
async function pollStationDirect(station, calltypeMap) {
  const url = station.ipAddress.startsWith('http') ? station.ipAddress : `http://${station.ipAddress}`;
  
  try {
    // Poll station with timeout
    const response = await axios.get(url, { timeout: 5000 }); // Match Python's 5s timeout
    const raw = response.data.trim();
    console.log(`📥 Raw data from ${url}:`, raw);
    if (raw.startsWith('<!DOCTYPE html>')) {
      console.warn(`⚠️ Received HTML from ${url} for ${station.stationName} - check endpoint!`);
      return;
    }
    
    // Parse response data (format: {1,4061,1,6010,...})
    const arr = raw.replace(/[{}]/g, '').split(',').map(Number);
    console.log(`✅ First 8 values from ${station.stationName}:`, arr.slice(0, 8));
    
    // Update station alive status
    await updateDb(`UPDATE baydetails SET is_alive=1 WHERE station_name=?`, [station.stationName]);
    
    // Process actual count (from position 1 in array, matching Python)
    const actualCountIndex = 1; // Matches Python's actual_count_index default
    if (arr.length > actualCountIndex) {
      const actualCount = arr[actualCountIndex];
      await updateDb('UPDATE baydetails SET actual_count=? WHERE station_name=?', [actualCount, station.stationName]);
      console.log(`⬆️ Updated actualCount for ${station.stationName}: ${actualCount}`);
      
      // Handle shift changes and calculate relative count (matching Python logic)
      await handleShiftCounting(station.stationName, actualCount);
    } else {
      console.warn(`⚠️ No valid actualCount found in data for ${station.stationName}`);
    }
    
    // Process calltype states (fault detection)
    await processCalltypeStates(station.stationName, arr, calltypeMap);
    
  } catch (error) {
    console.error(`❌ Polling failed for ${station.stationName}:`, error.message);
    await updateDb('UPDATE baydetails SET is_alive=0 WHERE station_name=?', [station.stationName]);
  }
}

async function handleShiftCounting(stationName, currentActualCount) {
  // Get current shift info (matching Python's shift tracker)
  const { shiftNum, shiftDate } = await getCurrentShiftInfo();
  
  // Initialize baseline if needed (matching Python logic)
  const baseline = await getShiftBaseline(stationName, shiftNum, shiftDate);
  if (baseline === null) {
    await setShiftBaseline(stationName, shiftNum, currentActualCount, shiftDate);
    return;
  }
  
  // Calculate shift-relative count (matches Python implementation)
  const shiftRelativeCount = Math.max(0, currentActualCount - baseline);
  
  // Update shift data (matches Python's update_shift_data)
  await updateShiftData(stationName, currentActualCount, shiftNum, shiftDate);
}

async function processCalltypeStates(stationName, dataArray, calltypeMap) {
  // Initialize previous states if not exists (matches Python's station_info['prevStates'])
  if (!prevFaultStates[stationName]) {
    prevFaultStates[stationName] = {};
    console.log(`🔧 Initialized empty prevFaultStates for ${stationName}`);
    
    // Initialize from current device state, not database
    // This ensures we start with the actual current state
    const callTypes = ['PMD', 'Quality', 'Store', 'JMD', 'Production'];
    for (const calltype of callTypes) {
      const index = calltypeMap[calltype] || 0;
      if (dataArray.length > index) {
        prevFaultStates[stationName][calltype] = dataArray[index];
        console.log(`🔧 Initialized ${calltype} prevState from current device state: ${dataArray[index]}`);
      } else {
        prevFaultStates[stationName][calltype] = 1; // Default to normal
      }
    }
    console.log(`🔧 Initial prevFaultStates for ${stationName}:`, prevFaultStates[stationName]);
    return; // Skip processing on first initialization to avoid false triggers
  }
  
  console.log(`🔍 BEFORE processing - prevFaultStates for ${stationName}:`, prevFaultStates[stationName]);
  
  // Process each calltype (matches Python's CALLTYPES list)
  const callTypes = ['PMD', 'Quality', 'Store', 'JMD', 'Production'];
  const now = new Date();
  
  console.log(`🔍 Processing fault states for ${stationName}, calltype map:`, calltypeMap);
  console.log(`📊 Raw data array:`, dataArray);
  
  for (const calltype of callTypes) {
    const index = calltypeMap[calltype] || 0; // Default to 0 if not in map
    
    if (dataArray.length > index) {
      const currentState = dataArray[index];
      // FIXED: Use the stored prevState, don't default to 1
      const prevState = prevFaultStates[stationName][calltype];
      
      console.log(`📊 ${stationName} ${calltype}: prevState=${prevState}, currentState=${currentState}, index=${index}, arrayValue=${dataArray[index]}`);
      
      // Fault detection logic (matches Python exactly)
      if (prevState === 1 && currentState === 0) {
        // Fault occurred
        console.log(`🚨 FAULT DETECTED: ${stationName} - ${calltype}`);
        await insertFaultRecord(stationName, calltype, now);
      } else if (prevState === 0 && currentState === 1) {
        // Fault resolved
        console.log(`✅ FAULT RESOLVED: ${stationName} - ${calltype}`);
        console.log(`🔄 Calling resolveFaultRecord for ${stationName} ${calltype}`);
        await resolveFaultRecord(stationName, calltype, now);
      } else {
        console.log(`➡️ No state change for ${stationName} ${calltype} (${prevState} → ${currentState})`);
      }
      
      // Update previous state
      prevFaultStates[stationName][calltype] = currentState;
      console.log(`🔄 Updated prevState for ${stationName} ${calltype}: ${currentState}`);
    }
  }
  
  console.log(`📋 AFTER processing - Final prevStates for ${stationName}:`, prevFaultStates[stationName]);
}

async function insertFaultRecord(stationName, calltype, faultTime) {
  try {
    const now = new Date().toISOString();
    const faultTimeStr = faultTime.toISOString();
    
    console.log(`📝 Inserting fault record:`);
    console.log(`   Station: ${stationName}`);
    console.log(`   Calltype: ${calltype}`);
    console.log(`   FaultTime: ${faultTimeStr}`);
    console.log(`   Now: ${now}`);
    
    // Validate parameters
    if (!stationName || !calltype || !faultTimeStr) {
      console.error('❌ Missing required parameters:', { stationName, calltype, faultTimeStr });
      return;
    }
    
    const params = [stationName, calltype, faultTimeStr, faultTimeStr, now, now];
    console.log(`📦 Parameters:`, params);
    
    await updateDb(
      `INSERT INTO section_data (station_name, call_type, fault_time, resolved_time, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`,
      params
    );
    console.log(`⚠️ Fault occurred for ${stationName} (${calltype}) at ${faultTimeStr}`);
  } catch (error) {
    console.error(`❌ Failed to insert fault for ${stationName} (${calltype}):`, error.message);
    console.error(`❌ Error details:`, error);
  }
}

async function resolveFaultRecord(stationName, calltype, resolvedTime) {
  try {
    const now = new Date().toISOString();
    const resolvedTimeStr = resolvedTime.toISOString();
    
    console.log(`🔧 Attempting to resolve fault for ${stationName} (${calltype})`);
    console.log(`🔧 Resolved time: ${resolvedTimeStr}`);
    
    // First, find the most recent unresolved fault
    const findQuery = `SELECT id FROM section_data WHERE station_name = ? AND call_type = ? AND resolved_time IS NULL ORDER BY id DESC LIMIT 1`;
    const findParams = [stationName, calltype];
    
    console.log(`🔍 Looking for unresolved fault:`, findParams);
    
    const unresolvedFault = await queryDb(findQuery, findParams);
    
    if (!unresolvedFault) {
      console.log(`⚠️ No unresolved ${calltype} fault found for ${stationName}`);
      return;
    }
    
    console.log(`🎯 Found unresolved fault ID: ${unresolvedFault.id}`);
    
    // Simple UPDATE by ID
    const updateQuery = `UPDATE section_data SET resolved_time = ?, updated_at = ? WHERE id = ?`;
    const updateParams = [resolvedTimeStr, now, unresolvedFault.id];
    
    console.log(`🔄 Updating fault ID ${unresolvedFault.id} with resolved_time: ${resolvedTimeStr}`);
    
    const result = await updateDb(updateQuery, updateParams);
    
    if (result.changes > 0) {
      console.log(`✅ SUCCESS: Fault resolved for ${stationName} (${calltype}) - Record ID ${unresolvedFault.id} updated`);
      
      // Verify the update worked
      const verifyQuery = `SELECT resolved_time FROM section_data WHERE id = ?`;
      const verification = await queryDb(verifyQuery, [unresolvedFault.id]);
      console.log(`✅ Verification - resolved_time now: ${verification ? verification.resolved_time : 'NOT FOUND'}`);
    } else {
      console.log(`❌ FAILED: No records updated for fault ID ${unresolvedFault.id}`);
    }
    
  } catch (error) {
    console.error(`❌ Failed to resolve fault for ${stationName} (${calltype}):`, error.message);
    console.error(`❌ Error stack:`, error.stack);
  }
}

// Database helper functions
async function updateDb(query, params) {
  return new Promise((resolve, reject) => {
    db.run(query, params, function(err) {
      if (err) {
        console.error('❌ Database update error:', err);
        reject(err);
      } else {
        console.log(`📝 Database update successful - changes: ${this.changes}, lastID: ${this.lastID}`);
        resolve(this);
      }
    });
  });
}

async function queryDb(query, params) {
  return new Promise((resolve, reject) => {
    db.get(query, params, (err, row) => {
      if (err) {
        console.error('❌ Database query error:', err);
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
}

// Ensure shift_data table exists
function ensureShiftDataTable() {
  db.run(`CREATE TABLE IF NOT EXISTS shift_data (
    station_name TEXT NOT NULL,
    shift_num INTEGER NOT NULL,
    shift_date TEXT NOT NULL,
    baseline_count INTEGER,
    current_count INTEGER,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (station_name, shift_num, shift_date)
  )`);
}

// Get shift baseline
async function getShiftBaseline(stationName, shiftNum, shiftDate) {
  try {
    const result = await queryDb(
      `SELECT baseline_count FROM shift_data WHERE station_name = ? AND shift_num = ? AND shift_date = ?`,
      [stationName, shiftNum, shiftDate]
    );
    return result ? result.baseline_count : null;
  } catch (error) {
    console.error(`❌ Failed to get baseline for ${stationName}:`, error.message);
    return null;
  }
}

// Set shift baseline
async function setShiftBaseline(stationName, shiftNum, baselineCount, shiftDate) {
  try {
    await updateDb(
      `INSERT OR REPLACE INTO shift_data (station_name, shift_num, shift_date, baseline_count) VALUES (?, ?, ?, ?)`,
      [stationName, shiftNum, shiftDate, baselineCount]
    );
  } catch (error) {
    console.error(`❌ Failed to set baseline for ${stationName}:`, error.message);
  }
}

// Update shift data
async function updateShiftData(stationName, currentCount, shiftNum, shiftDate) {
  try {
    await updateDb(
      `UPDATE shift_data SET current_count = ?, last_updated = CURRENT_TIMESTAMP WHERE station_name = ? AND shift_num = ? AND shift_date = ?`,
      [currentCount, stationName, shiftNum, shiftDate]
    );
  } catch (error) {
    console.error(`❌ Failed to update shift data for ${stationName}:`, error.message);
  }
}

// Main polling function - simplified without worker threads
function startPolling() {
  db = new sqlite3.Database(DATABASE_NAME);
  ensureShiftDataTable();
  
  console.log('🎯 Device polling service started');
  
  setInterval(async () => {
    try {
      // Get active stations with their calltype maps
      const stations = await new Promise((resolve, reject) => {
        db.all('SELECT station_name as stationName, ip_address as ipAddress, topic FROM baydetails WHERE is_active=1', (err, rows) => {
          if (err) reject(err);
          else resolve(rows.map(row => ({
            ...row,
            calltype_index_map: tryParseJson(row.topic) || 
                              {"PMD":0,"Quality":2,"Store":6,"JMD":8,"Production":12}
          })));
        });
      });
      
      console.log(`🔄 Polling ${stations.length} active stations...`);
      
      // Poll each station directly (no worker threads)
      for (const station of stations) {
        await pollStationDirect(station, station.calltype_index_map);
      }
      
    } catch (error) {
      console.error('❌ Polling cycle error:', error.message);
    }
  }, POLL_INTERVAL_MS);
}

// Direct polling function (no worker threads)
async function pollStationDirect(station, calltypeMap) {
  const url = station.ipAddress.startsWith('http') ? station.ipAddress : `http://${station.ipAddress}`;
  
  try {
    console.log(`📡 Polling ${url} for ${station.stationName}...`);
    
    // Poll station with timeout
    const response = await axios.get(url, { timeout: 5000 });
    const raw = response.data.trim();
    console.log(`📥 Raw data from ${url}:`, raw);
    
    if (raw.startsWith('<!DOCTYPE html>')) {
      console.warn(`⚠️ Received HTML from ${url} for ${station.stationName} - check endpoint!`);
      return;
    }
    
    // Parse response data (format: {1,4061,1,6010,...})
    const arr = raw.replace(/[{}]/g, '').split(',').map(Number);
    console.log(`✅ First 8 values from ${station.stationName}:`, arr.slice(0, 8));
    
    // Update station alive status
    await updateDb(`UPDATE baydetails SET is_alive=1 WHERE station_name=?`, [station.stationName]);
    
    // Process actual count (from position 1 in array, matching Python)
    const actualCountIndex = 1;
    if (arr.length > actualCountIndex) {
      const actualCount = arr[actualCountIndex];
      await updateDb('UPDATE baydetails SET actual_count=? WHERE station_name=?', [actualCount, station.stationName]);
      console.log(`⬆️ Updated actualCount for ${station.stationName}: ${actualCount}`);
      
      // Handle shift changes and calculate relative count
      await handleShiftCounting(station.stationName, actualCount);
    } else {
      console.warn(`⚠️ No valid actualCount found in data for ${station.stationName}`);
    }
    
    // Process calltype states (fault detection)
    await processCalltypeStates(station.stationName, arr, calltypeMap);
    
  } catch (error) {
    console.error(`❌ Polling failed for ${station.stationName}:`, error.message);
    await updateDb('UPDATE baydetails SET is_alive=0 WHERE station_name=?', [station.stationName]);
  }
}

// Helper to parse JSON with fallback
function tryParseJson(str) {
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}

// Shift management functions (matching Python implementation)
async function getCurrentShiftInfo() {
  try {
    // Get current time
    const now = new Date();
    const currentHour = now.getHours();
    const shiftDate = now.toISOString().split('T')[0]; // YYYY-MM-DD

    // Determine shift number based on time (example: 3 shifts per day)
    let shiftNum;
    if (currentHour >= 6 && currentHour < 14) {
      shiftNum = 1;   // Morning shift (6am-2pm)
    } else if (currentHour >= 14 && currentHour < 22) {
      shiftNum = 2;   // Afternoon shift (2pm-10pm)
    } else {
      shiftNum = 3;   // Night shift (10pm-6am)
    }

    // Return the shift information
    return { 
      shiftNum, 
      shiftDate,
      lastUpdated: now.toISOString() // Optional: for debugging
    };

  } catch (error) {
    console.error('❌ Failed to determine shift info:', error);
    // Return default values if there's an error
    return { 
      shiftNum: 1, 
      shiftDate: new Date().toISOString().split('T')[0] 
    };
  }
}

module.exports = { startPolling };