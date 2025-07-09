// services/mqttHandler.js
const mqtt = require('mqtt');
const { Baydetail, DailyRecord, SectionData } = require('../models');
const DatabaseUtils = require('../utils/database');
const moment = require('moment');

class MQTTHandler {
  constructor(io) {
    this.client = null;
    this.io = io; // Socket.IO instance
    this.previousStates = new Map(); // Store previous button states for each station
    this.messageQueue = [];
    this.processing = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    
    // Call type mapping (button index to call type)
    this.callTypeMapping = {
      2: 'Production',   // Button 3
      3: 'Maintenance',  // Button 4
      5: 'Store',        // Button 6
      6: 'Quality'       // Button 7
    };
  }

  async connect(brokerUrl = 'mqtt://localhost:1883', options = {}) {
    try {
      const defaultOptions = {
        clientId: `andon_server_${Math.random().toString(16).substr(2, 8)}`,
        clean: true,
        connectTimeout: 30000,
        reconnectPeriod: 5000,
        ...options
      };

      console.log(`🔌 Connecting to MQTT broker: ${brokerUrl}`);
      this.client = mqtt.connect(brokerUrl, defaultOptions);

      this.client.on('connect', () => {
        console.log('✅ MQTT connected successfully');
        this.reconnectAttempts = 0;
        
        // Subscribe to all ESP32 topics
        this.client.subscribe('esp32/+', (err) => {
          if (err) {
            console.error('❌ MQTT subscription error:', err);
          } else {
            console.log('📡 Subscribed to esp32/+ topics');
          }
        });
      });

      this.client.on('message', (topic, message) => {
        this.handleMessage(topic, message);
      });

      this.client.on('error', (error) => {
        console.error('❌ MQTT error:', error);
      });

      this.client.on('offline', () => {
        console.log('📴 MQTT client offline');
      });

      this.client.on('reconnect', () => {
        this.reconnectAttempts++;
        console.log(`🔄 MQTT reconnect attempt ${this.reconnectAttempts}`);
        
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          console.log('❌ Max MQTT reconnect attempts reached');
          this.client.end();
        }
      });

      // Start message processor
      this.startMessageProcessor();

    } catch (error) {
      console.error('❌ MQTT connection error:', error);
      throw error;
    }
  }

  handleMessage(topic, message) {
    try {
      // Extract station number from topic (esp32/1 -> Station1)
      const topicParts = topic.split('/');
      if (topicParts.length !== 2 || topicParts[0] !== 'esp32') {
        return;
      }

      const stationNum = topicParts[1];
      const stationName = `Station${stationNum}`;

      // Parse message: "{0,2,1,25,0,13,1,2,1,100,0,21,1,0,1,0}"
      const messageStr = message.toString();
      const messageData = messageStr.replace(/[{}]/g, '').split(',');

      if (messageData.length !== 16) { // 8 buttons * 2 values each
        console.error('❌ Invalid MQTT message format:', messageStr);
        return;
      }

      // Parse button states and counts
      const buttons = [];
      for (let i = 0; i < 16; i += 2) {
        const state = parseInt(messageData[i]);
        const count = parseInt(messageData[i + 1]);
        buttons.push({ state, count });
      }

      // Add to processing queue
      this.messageQueue.push({
        stationName,
        buttons,
        timestamp: new Date()
      });

    } catch (error) {
      console.error('❌ Error processing MQTT message:', error);
    }
  }

  startMessageProcessor() {
    setInterval(() => {
      if (!this.processing && this.messageQueue.length > 0) {
        this.processing = true;
        this.processNextMessage();
      }
    }, 100); // Process every 100ms
  }

  async processNextMessage() {
    try {
      if (this.messageQueue.length === 0) {
        this.processing = false;
        return;
      }

      const message = this.messageQueue.shift();
      await this.processMessage(message);

      // Continue processing if there are more messages
      if (this.messageQueue.length > 0) {
        setImmediate(() => this.processNextMessage());
      } else {
        this.processing = false;
      }

    } catch (error) {
      console.error('❌ Error in message processor:', error);
      this.processing = false;
    }
  }

  async processMessage(message) {
    const { stationName, buttons, timestamp } = message;

    try {
      // Get previous state for this station
      const prevButtons = this.previousStates.get(stationName) || [];

      // Update ActualCount (button 2, index 1)
      const actualCount = buttons[1].count;
      await this.updateActualCount(stationName, actualCount);

      // Check critical buttons for state changes
      const changes = [];

      for (const [buttonIdx, callType] of Object.entries(this.callTypeMapping)) {
        const idx = parseInt(buttonIdx);
        const currentState = buttons[idx].state;
        const prevState = prevButtons[idx] ? prevButtons[idx].state : 1;

        if (currentState !== prevState) {
          if (currentState === 0 && prevState === 1) {
            // Fault occurred (1 -> 0)
            await this.createFaultEntry(stationName, callType, timestamp);
            changes.push({
              station: stationName,
              callType,
              type: 'fault',
              time: timestamp.toISOString()
            });
          } else if (currentState === 1 && prevState === 0) {
            // Fault resolved (0 -> 1)
            await this.resolveFaultEntry(stationName, callType, timestamp);
            changes.push({
              station: stationName,
              callType,
              type: 'resolved',
              time: timestamp.toISOString()
            });
          }
        }
      }

      // Store current state for next comparison
      this.previousStates.set(stationName, buttons);

      // Send WebSocket message if there were changes
      if (changes.length > 0) {
        this.sendWebSocketMessage({
          type: 'station_updates',
          changes,
          stationData: {
            station: stationName,
            actualCount,
            buttons
          }
        });
      }

    } catch (error) {
      console.error(`❌ Error processing message for ${message.stationName}:`, error);
    }
  }

  async updateActualCount(stationName, actualCount) {
    try {
      // Extract station number for unique IP generation
      const stationNum = stationName.replace('Station', '');
      const stationIp = `192.168.1.${stationNum}`;

      const [bayDetail, created] = await Baydetail.findOrCreate({
        where: { stationName },
        defaults: {
          plannedCount: 100,
          actualCount,
          efficiency: 0.0,
          ipAddress: stationIp,
          isActive: true,
          isAlive: true
        }
      });

      if (!created && bayDetail.actualCount !== actualCount) {
        bayDetail.actualCount = actualCount;
        bayDetail.efficiency = bayDetail.plannedCount > 0 ? 
          (actualCount / bayDetail.plannedCount * 100) : 0;
        await bayDetail.save();
      }

    } catch (error) {
      console.error('❌ Error updating actual count:', error);
    }
  }

  async createFaultEntry(stationName, callType, faultTime) {
    try {
      await SectionData.create({
        stationName,
        callType,
        faultTime,
        resolvedTime: null
      });

      console.log(`🚨 Fault created: ${stationName} - ${callType} at ${faultTime.toISOString()}`);

    } catch (error) {
      console.error('❌ Error creating fault entry:', error);
    }
  }

  async resolveFaultEntry(stationName, callType, resolvedTime) {
    try {
      // Find the most recent unresolved fault for this station and call type
      const faultEntry = await SectionData.findOne({
        where: {
          stationName,
          callType,
          resolvedTime: null
        },
        order: [['faultTime', 'DESC']]
      });

      if (faultEntry) {
        faultEntry.resolvedTime = resolvedTime;
        await faultEntry.save();

        // Calculate downtime in minutes
        const downtimeMinutes = (resolvedTime - faultEntry.faultTime) / (1000 * 60);

        // Update daily record
        await DatabaseUtils.updateDowntime(
          stationName, 
          callType, 
          downtimeMinutes,
          moment(resolvedTime).format('YYYY-MM-DD')
        );

        console.log(`✅ Fault resolved: ${stationName} - ${callType} - ${downtimeMinutes.toFixed(2)} minutes`);

      } else {
        console.warn(`⚠️ No unresolved fault found for ${stationName} - ${callType}`);
      }

    } catch (error) {
      console.error('❌ Error resolving fault entry:', error);
    }
  }

  sendWebSocketMessage(message) {
    try {
      if (this.io) {
        this.io.emit('station_update', message);
      }
    } catch (error) {
      console.error('❌ Error sending WebSocket message:', error);
    }
  }

  async disconnect() {
    try {
      if (this.client) {
        this.client.end();
        console.log('✅ MQTT client disconnected');
      }
    } catch (error) {
      console.error('❌ Error disconnecting MQTT client:', error);
    }
  }

  // Manual methods for testing
  async publishTestMessage(stationId, buttons = null) {
    if (!this.client || !this.client.connected) {
      throw new Error('MQTT client not connected');
    }

    const defaultButtons = buttons || [
      { state: 1, count: 0 },  // Button 1
      { state: 1, count: Math.floor(Math.random() * 100) }, // Button 2 (Actual Count)
      { state: 1, count: 0 },  // Button 3 (Production)
      { state: 1, count: 0 },  // Button 4 (Maintenance)
      { state: 1, count: 0 },  // Button 5
      { state: 1, count: 0 },  // Button 6 (Store)
      { state: 1, count: 0 },  // Button 7 (Quality)
      { state: 1, count: 0 }   // Button 8
    ];

    const messageData = [];
    defaultButtons.forEach(button => {
      messageData.push(button.state.toString(), button.count.toString());
    });

    const message = `{${messageData.join(',')}}`;
    const topic = `esp32/${stationId}`;

    this.client.publish(topic, message);
    console.log(`📤 Test message published to ${topic}: ${message}`);
  }

  // Create fault for testing
  async createTestFault(stationId, callType) {
    const stationName = `Station${stationId}`;
    
    // Get current state
    const currentButtons = this.previousStates.get(stationName) || [];
    
    // Find button index for call type
    const buttonIdx = Object.keys(this.callTypeMapping).find(
      key => this.callTypeMapping[key] === callType
    );

    if (!buttonIdx) {
      throw new Error(`Invalid call type: ${callType}`);
    }

    // Create buttons array with fault
    const testButtons = Array(8).fill(null).map((_, i) => ({ state: 1, count: 0 }));
    testButtons[parseInt(buttonIdx)].state = 0; // Set fault state
    testButtons[1].count = Math.floor(Math.random() * 100); // Random actual count

    await this.publishTestMessage(stationId, testButtons);
  }

  // Resolve fault for testing
  async resolveTestFault(stationId, callType) {
    const stationName = `Station${stationId}`;
    
    // Find button index for call type
    const buttonIdx = Object.keys(this.callTypeMapping).find(
      key => this.callTypeMapping[key] === callType
    );

    if (!buttonIdx) {
      throw new Error(`Invalid call type: ${callType}`);
    }

    // Create buttons array with resolved state
    const testButtons = Array(8).fill(null).map((_, i) => ({ state: 1, count: 0 }));
    testButtons[parseInt(buttonIdx)].state = 1; // Set resolved state
    testButtons[1].count = Math.floor(Math.random() * 100); // Random actual count

    await this.publishTestMessage(stationId, testButtons);
  }

  // Get system status
  getStatus() {
    return {
      connected: this.client && this.client.connected,
      reconnectAttempts: this.reconnectAttempts,
      messageQueueLength: this.messageQueue.length,
      processing: this.processing,
      stationsTracked: this.previousStates.size
    };
  }

  // Get station states
  getStationStates() {
    const states = {};
    this.previousStates.forEach((buttons, stationName) => {
      states[stationName] = {
        actualCount: buttons[1] ? buttons[1].count : 0,
        production: buttons[2] ? buttons[2].state : 1,
        maintenance: buttons[3] ? buttons[3].state : 1,
        store: buttons[5] ? buttons[5].state : 1,
        quality: buttons[6] ? buttons[6].state : 1
      };
    });
    return states;
  }

  // Clear message queue (emergency use)
  clearMessageQueue() {
    const queueLength = this.messageQueue.length;
    this.messageQueue = [];
    console.log(`🗑️ Cleared ${queueLength} messages from queue`);
    return queueLength;
  }

  // Force reconnect
  async forceReconnect() {
    console.log('🔄 Forcing MQTT reconnection...');
    if (this.client) {
      this.client.end(true);
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
    await this.connect();
  }
}

module.exports = MQTTHandler;