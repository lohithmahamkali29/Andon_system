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
const { connectDB } = require('./models');
const DatabaseUtils = require('./utils/database');

// Import routes
const apiRoutes = require('./routes/api');
const stationRoutes = require('./routes/stations');

// Import MQTT handler (optional)
const MQTTHandler = require('./services/mqttHandler');

const app = express();
const server = http.createServer(app);

// WebSocket setup
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
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Routes
app.use('/api', apiRoutes);
app.use('/api/stations', stationRoutes);

// WebSocket handlers
io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);
  socket.emit('connection_status', {
    status: 'connected',
    timestamp: new Date().toISOString()
  });

  socket.on('station_update', async (data) => {
    try {
      console.log('Station update received:', data);
      socket.broadcast.emit('station_update', data);

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
    const faultDate = new Date(faultTime);
    const resolvedDate = new Date(resolvedTime);
    const downtimeMinutes = (resolvedDate - faultDate) / (1000 * 60);
    await DatabaseUtils.updateDowntime(stationName, callType, downtimeMinutes);
    console.log(`✅ Fault resolved: ${stationName} - ${callType} - ${downtimeMinutes.toFixed(2)} minutes`);
  } catch (error) {
    console.error('Error updating fault resolution:', error);
  }
}

// Graceful shutdown setup
let mqttHandler = null;

// Start the server
async function startServer() {
  try {
    await connectDB();

    // Optional MQTT init
    if (process.env.ENABLE_MQTT === 'true') {
      try {
        mqttHandler = new MQTTHandler(io);
        await mqttHandler.connect();
      } catch (err) {
        console.warn('⚠️ MQTT connection failed:', err.message);
      }
    } else {
      console.log('ℹ️ MQTT is disabled via .env (ENABLE_MQTT=false)');
    }

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

// Graceful shutdown hooks
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

async function shutdown(signal) {
  console.log(`\n🛑 Received ${signal}. Shutting down...`);
  try {
    if (mqttHandler) {
      await mqttHandler.disconnect();
    }
    server.close(() => {
      console.log('✅ HTTP server closed');
      process.exit(0);
    });
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = { app, server, io };
