/* utils/mqttClient.js */
const mqtt   = require('mqtt');
// Inline helpers since helpers.js is missing
const DEFAULT_MAP_STR = '{"PMD":0,"Quality":2,"Store":6,"JMD":8,"Production":12}';
const CALLTYPES = ['PMD', 'Quality', 'Store', 'JMD', 'Production'];
function parseDeviceResponse(payload) {
  // Parses a comma-separated string into an array of numbers
  return payload.split(',').map(Number);
}

let client;

/**
 * Initialise a single shared MQTT connection.
 *  - brokerUrl  e.g.  mqtt://localhost:1883
 *  - onUpdate   callback(stationName, actualCount, faultStatus)
 *  - db         sqlite handle so we can look up StationName ⇄ Topic
 */
function initMQTT(brokerUrl, db, onUpdate) {
  if (client) return client;                     // already running

  client = mqtt.connect(brokerUrl, {
    username: process.env.MQTT_USER,
    password: process.env.MQTT_PASS,
    clientId: `andon_server_${Math.random().toString(16).slice(2,8)}`
  });

  client.on('connect', () => console.log('🛰️  MQTT connected →', brokerUrl));
  client.on('error',  err => console.error('❌ MQTT', err.message));
  client.on('reconnect', () => console.log('🔄 MQTT reconnecting…'));

  // 1️⃣  Subscribe to every topic found in baydetails
  db.all('SELECT Topic FROM baydetails WHERE isactive=1 AND Topic IS NOT NULL', (e, rows)=>{
    if (e) return console.error('DB topic query',e.message);
    rows.forEach(r => r.Topic && client.subscribe(r.Topic));
  });

  // 2️⃣  Whenever a device publishes…
  client.on('message', (topic, payloadBuf) => {
    const payload = payloadBuf.toString().trim();               // e.g.  "1,223,0,1,1,…"
    db.get('SELECT StationName, calltype_index_map FROM baydetails WHERE Topic = ?', [topic], (e,row)=>{
      if (e || !row) return;                                    // unknown topic → ignore
      const map     = row.calltype_index_map ? JSON.parse(row.calltype_index_map) : JSON.parse(DEFAULT_MAP_STR);
      const arr     = parseDeviceResponse(payload);             // -> [1,223,0,1,1,…]

      /* Build faultStatus similar to the polling version */
      const faultStatus = {};
      CALLTYPES.forEach(ct=>{
        const idx = map[ct] ?? 0;
        faultStatus[ct] = (arr[idx] === 0);                     // 0 = fault
      });

      const actual = arr[ map.actual_count ?? 1 ] ?? 0;

      onUpdate(row.StationName, actual, faultStatus);           // push back to server.js
    });
  });

  return client;
}

module.exports = initMQTT;
