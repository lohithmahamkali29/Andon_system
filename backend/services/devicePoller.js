const axios = require('axios');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DATABASE_NAME = path.join(__dirname, '../database/andon_stations.db');
const POLL_INTERVAL_MS =1500;

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
      // Call type index mapping
      const callTypeIndexes = {
        PMD: 0,
        Quality: 2,
        Store: 6,
        JMD: 8,
        Production: 12
      };
      for (const station of stations) {
        const url = station.ipAddress.startsWith('http') ? station.ipAddress : `http://${station.ipAddress}`;
        try {
          console.log(`Polling ${url} for ${station.StationName}`);
          const response = await axios.get(url, { timeout: 3000 });
          const raw = response.data.trim();
          const arr = raw.replace(/[{}]/g, '').split(',').map(Number);

          // Update actualCount if Production index changes
          const productionIndex = callTypeIndexes.Production;
          const actualCount = arr.length > productionIndex ? arr[productionIndex] : undefined;
          if (typeof actualCount === 'number' && !isNaN(actualCount)) {
            db.run('UPDATE baydetails SET ActualCount=?, isalive=1 WHERE StationName=?', [actualCount, station.StationName], function(err) {
              if (!err) {
                console.log(`Updated actualCount for ${station.StationName}: ${actualCount}`);
              }
            });
          } else {
            db.run('UPDATE baydetails SET isalive=0 WHERE StationName=?', [station.StationName]);
          }

          // Track faults for all call types except Production
          if (!global.prevFaultStates) global.prevFaultStates = {};
          if (!global.prevFaultStates[station.StationName]) global.prevFaultStates[station.StationName] = {};

          Object.entries(callTypeIndexes).forEach(([callType, idx]) => {
            if (callType === 'Production') return; // skip actualCount
            if (arr.length > idx) {
              const faultValue = arr[idx];
              const prev = global.prevFaultStates[station.StationName][callType] ?? 1;
              if (faultValue === 0 && prev !== 0) {
                // Fault occurred
                db.run('INSERT INTO SectionData (StationName, calltype, FaultTime, ResolvedTime, DateTime, Shift) VALUES (?, ?, ?, NULL, ?, NULL)', [station.StationName, callType, new Date().toISOString(), new Date().toISOString()]);
                console.log(`⚠️ Fault started for ${station.StationName} (${callType})`);
              } else if (faultValue === 1 && prev === 0) {
                // Fault resolved
                db.run('UPDATE SectionData SET ResolvedTime=? WHERE StationName=? AND calltype=? AND ResolvedTime IS NULL', [new Date().toISOString(), station.StationName, callType], function(err) {
                  if (!err) {
                    console.log(`✅ Fault resolved for ${station.StationName} (${callType})`);
                  } else {
                    console.error(`❌ Error updating ResolvedTime for ${station.StationName} (${callType}):`, err.message);
                  }
                });
              }
              global.prevFaultStates[station.StationName][callType] = faultValue;
            }
          });
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