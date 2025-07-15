const axios = require('axios');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DATABASE_NAME = path.join(__dirname, '../database/andon_stations.db');
const POLL_INTERVAL_MS = 5000;

let db;
let pollerInterval = null;

function startPolling() {
  if (pollerInterval) return; // Already running
  db = new sqlite3.Database(DATABASE_NAME, (err) => {
    if (err) {
      console.error('❌ DevicePoller DB error:', err.message);
      return;
    }
    console.log('✅ DevicePoller connected to DB');
  });

  pollerInterval = setInterval(async () => {
    db.all('SELECT StationName, ipAddress FROM baydetails WHERE isactive=1', async (err, stations) => {
      if (err) {
        console.error('❌ DevicePoller DB read error:', err.message);
        return;
      }
      for (const station of stations) {
        const url = station.ipAddress.startsWith('http') ? station.ipAddress : `http://${station.ipAddress}`;
        try {
          console.log(`Polling ${url} for ${station.StationName}`);
          const response = await axios.get(url, { timeout: 3000 });
          const raw = response.data.trim();
          // Parse string like {1,4061,1,6010,...} and get the last value
          const arr = raw.replace(/[{}]/g, '').split(',').map(Number);
          const actualCount = arr.length > 0 ? arr[arr.length - 1] : undefined;
          if (typeof actualCount === 'number' && !isNaN(actualCount)) {
            db.run('UPDATE baydetails SET ActualCount=?, isalive=1 WHERE StationName=?', [actualCount, station.StationName], function(err) {
              if (!err) {
                console.log(`Updated actualCount for ${station.StationName}: ${actualCount}`);
              }
            });
          } else {
            db.run('UPDATE baydetails SET isalive=0 WHERE StationName=?', [station.StationName]);
          }

          // Example: Use index 2 for a fault type (adjust as needed)
          // If arr[2] === 0, create a fault; if it changes from 0 to 1, resolve it
          // You can add more indices for other fault types
          const faultIndex = 2; // Example: change as needed
          const callType = 'Production'; // Example: change as needed
          if (arr.length > faultIndex) {
            const faultValue = arr[faultIndex];
            // Use a simple in-memory map to track previous state (per station)
            if (!global.prevFaultStates) global.prevFaultStates = {};
            const prev = global.prevFaultStates[station.StationName] || 1;
            if (faultValue === 0 && prev !== 0) {
              // Fault occurred
              db.run('INSERT INTO SectionData (StationName, calltype, FaultTime, ResolvedTime, DateTime, Shift) VALUES (?, ?, ?, NULL, ?, NULL)', [station.StationName, callType, new Date().toISOString(), new Date().toISOString()]);
              console.log(`⚠️ Fault started for ${station.StationName} (${callType})`);
            } else if (faultValue === 1 && prev === 0) {
              // Fault resolved
              db.run('UPDATE SectionData SET ResolvedTime=? WHERE StationName=? AND calltype=? AND ResolvedTime IS NULL', [new Date().toISOString(), station.StationName, callType]);
              console.log(`✅ Fault resolved for ${station.StationName} (${callType})`);
            }
            global.prevFaultStates[station.StationName] = faultValue;
          }
        } catch (error) {
          db.run('UPDATE baydetails SET isalive=0 WHERE StationName=?', [station.StationName]);
          console.error(`❌ Polling failed for ${station.StationName} (${station.ipAddress}):`, error.toString());
        }
      }
    });
  }, POLL_INTERVAL_MS);
  console.log('🚦 Device polling started (interval:', POLL_INTERVAL_MS, 'ms)');
}

module.exports = { startPolling }; 