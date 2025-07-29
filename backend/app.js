// Start the device polling service
const { startPolling } = require('./services/devicePoller');
console.log('🚀 Starting device polling service...');
startPolling();