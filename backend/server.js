require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { startPolling } = require('./services/devicePoller');
const { sequelize, connectDB } = require('./models');

const apiRouter = require('./routes/api');
const stationsRouter = require('./routes/stations');
const faultsRouter = require('./routes/faults');
const shiftRouter = require('./routes/shift');
const reportsRouter = require('./routes/reports');
const dashboardRouter = require('./routes/dashboard');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.static('public'));

// API Routes
app.use('/api', apiRouter);
app.use('/api/stations', stationsRouter);
app.use('/api/faults', faultsRouter);
app.use('/api/shift', shiftRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/dashboard', dashboardRouter);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err.stack);
  res.status(500).json({ 
    success: false, 
    error: 'Internal server error' 
  });
});

// Initialize and start server
async function startServer() {
  try {
    await connectDB();
    startPolling(); // Start device polling
    
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
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down server...');
  try {
    await sequelize.close();
    console.log('✅ Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error closing database:', error.message);
    process.exit(1);
  }
});

module.exports = app;
