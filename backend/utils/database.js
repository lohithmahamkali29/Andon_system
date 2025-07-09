require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');

// Import models and utilities
const { connectDB } = require('../models');
// const DatabaseUtils = require('../utils/database');

// Import routes
const apiRoutes = require('../routes/api');
const stationRoutes = require('../routes/stations');

// Import MQTT handler
const MQTTHandler = require('../services/mqttHandler');

const app = express();
const server = http.createServer(app);

// Socket.IO setup with CORS
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Middleware
app.use(helmet());
app.use(compression());
app.use(morgan('combined'));

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files (for production)
app.use(express.static(path.join(__dirname, 'public')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API Routes
app.use('/api', apiRoutes);
app.use('/api/stations', stationRoutes);

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);
  
  // Send initial data to new client
  socket.emit('connection_status', { 
    status: 'connected', 
    timestamp: new Date().toISOString() 
  });
  
  // Handle station updates from client
  socket.on('station_update', async (data) => {
    try {
      console.log('Station update received:', data);
      
      // Broadcast to all clients
      socket.broadcast.emit('station_update', data);
      
      // Process and save to database if needed
      if (data.type === 'fault_resolved') {
        await handleFaultResolution(data);
      }
      
    } catch (error) {
      console.error('Error handling station update:', error);
      socket.emit('error', { message: 'Failed to process station update' });
    }
  });
  
  socket.on('disconnect', () => {
    console.log(`🔌 Client disconnected: ${socket.id}`);
  });
});

// Handle fault resolution
async function handleFaultResolution(data) {
  const { stationName, callType, faultTime, resolvedTime } = data;
  
  try {
    // Calculate downtime in minutes
    const faultDate = new Date(faultTime);
    const resolvedDate = new Date(resolvedTime);
    const downtimeMinutes = (resolvedDate - faultDate) / (1000 * 60);
    
    // Update daily record
    await DatabaseUtils.updateDowntime(stationName, callType, downtimeMinutes);
    
    console.log(`✅ Fault resolved: ${stationName} - ${callType} - ${downtimeMinutes.toFixed(2)} minutes`);
    
  } catch (error) {
    console.error('Error updating fault resolution:', error);
  }
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Express error:', err.stack);
  
  if (err.name === 'SequelizeValidationError') {
    return res.status(400).json({
      error: 'Validation Error',
      details: err.errors.map(e => ({ field: e.path, message: e.message }))
    });
  }
  
  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(409).json({
      error: 'Duplicate Entry',
      message: 'A record with this information already exists'
    });
  }
  
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Not Found',
    message: `Route ${req.originalUrl} not found` 
  });
});

// Initialize MQTT handler
let mqttHandler;

// Start server
async function startServer() {
  try {
    // Connect to database
    await connectDB();
    
    // Initialize MQTT handler
    mqttHandler = new MQTTHandler(io);
    await mqttHandler.connect();
    
    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => {
      console.log(`
🚀 Andon System Server Started
📡 Server running on port ${PORT}
🌍 Environment: ${process.env.NODE_ENV || 'development'}
🔗 WebSocket: ws://localhost:${PORT}
📊 API: http://localhost:${PORT}/api
🏥 Health: http://localhost:${PORT}/health
      `);
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

async function gracefulShutdown(signal) {
  console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
  
  try {
    // Close MQTT connection
    if (mqttHandler) {
      await mqttHandler.disconnect();
    }
    
    // Close server
    server.close(() => {
      console.log('✅ HTTP server closed');
      process.exit(0);
    });
    
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
}

// Start the server
if (require.main === module) {
  startServer();
}

module.exports = { app, server, io };