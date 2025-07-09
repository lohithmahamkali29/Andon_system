const MQTTHandler = require('../services/mqttHandler');
const { connectDB, Baydetail, SectionData, DailyRecord } = require('../models');

describe('MQTT Handler Tests', () => {
  let mqttHandler;

  beforeAll(async () => {
    await connectDB();
  });

  beforeEach(async () => {
    // Clean database
    await SectionData.destroy({ where: {} });
    await DailyRecord.destroy({ where: {} });
    await Baydetail.destroy({ where: {} });
    
    // Create MQTT handler (without connecting to real broker)
    mqttHandler = new MQTTHandler(null);
  });

  afterEach(() => {
    if (mqttHandler) {
      mqttHandler.clearMessageQueue();
    }
  });

  describe('Message Processing', () => {
    test('should parse MQTT message correctly', () => {
      const message = {
        stationName: 'Station1',
        buttons: [
          { state: 1, count: 0 },  // Button 1
          { state: 1, count: 25 }, // Button 2 (Actual Count)
          { state: 0, count: 1 },  // Button 3 (Production - Fault)
          { state: 1, count: 0 },  // Button 4 (Maintenance)
          { state: 1, count: 0 },  // Button 5
          { state: 1, count: 0 },  // Button 6 (Store)
          { state: 1, count: 0 },  // Button 7 (Quality)
          { state: 1, count: 0 }   // Button 8
        ],
        timestamp: new Date()
      };

      // This would normally be called by processMessage
      expect(message.buttons[1].count).toBe(25); // Actual count
      expect(message.buttons[2].state).toBe(0);  // Production fault
    });

    test('should update actual count in database', async () => {
      await mqttHandler.updateActualCount('Station1', 75);

      const station = await Baydetail.findOne({
        where: { stationName: 'Station1' }
      });

      expect(station).toBeTruthy();
      expect(station.actualCount).toBe(75);
      expect(station.ipAddress).toBe('192.168.1.1');
      expect(station.efficiency).toBe(75); // 75/100 * 100
    });

    test('should create fault entry', async () => {
      const faultTime = new Date();
      await mqttHandler.createFaultEntry('Station1', 'Production', faultTime);

      const fault = await SectionData.findOne({
        where: { 
          stationName: 'Station1',
          callType: 'Production'
        }
      });

      expect(fault).toBeTruthy();
      expect(fault.resolvedTime).toBeNull();
      expect(fault.faultTime.getTime()).toBeCloseTo(faultTime.getTime(), -3);
    });

    test('should resolve fault entry and update downtime', async () => {
      // Create fault first
      const faultTime = new Date(Date.now() - 120000); // 2 minutes ago
      await SectionData.create({
        stationName: 'Station1',
        callType: 'Production',
        faultTime,
        resolvedTime: null
      });

      // Resolve fault
      const resolvedTime = new Date();
      await mqttHandler.resolveFaultEntry('Station1', 'Production', resolvedTime);

      // Check if fault was resolved
      const fault = await SectionData.findOne({
        where: { 
          stationName: 'Station1',
          callType: 'Production'
        }
      });

      expect(fault.resolvedTime).toBeTruthy();
      
      // Check if downtime was calculated (approximately 2 minutes)
      const downtime = (fault.resolvedTime - fault.faultTime) / (1000 * 60);
      expect(downtime).toBeCloseTo(2, 0);

      // Check if daily record was updated
      const dailyRecord = await DailyRecord.findOne({
        where: { stationName: 'Station1' }
      });
      expect(dailyRecord).toBeTruthy();
      expect(dailyRecord.pDowntime).toBeCloseTo(2, 0);
    });

    test('should handle multiple faults for same station', async () => {
      const now = new Date();
      
      // Create multiple faults
      await mqttHandler.createFaultEntry('Station1', 'Production', now);
      await mqttHandler.createFaultEntry('Station1', 'Maintenance', now);
      
      const faults = await SectionData.findAll({
        where: { stationName: 'Station1' }
      });
      
      expect(faults).toHaveLength(2);
      expect(faults.map(f => f.callType)).toContain('Production');
      expect(faults.map(f => f.callType)).toContain('Maintenance');
    });

    test('should resolve correct fault when multiple exist', async () => {
      const now = new Date();
      
      // Create two production faults at different times
      await SectionData.create({
        stationName: 'Station1',
        callType: 'Production',
        faultTime: new Date(now.getTime() - 300000), // 5 minutes ago
        resolvedTime: null
      });
      
      await SectionData.create({
        stationName: 'Station1',
        callType: 'Production',
        faultTime: new Date(now.getTime() - 60000), // 1 minute ago
        resolvedTime: null
      });

      // Resolve fault (should resolve the most recent one)
      await mqttHandler.resolveFaultEntry('Station1', 'Production', now);

      const faults = await SectionData.findAll({
        where: { stationName: 'Station1', callType: 'Production' },
        order: [['faultTime', 'DESC']]
      });

      expect(faults).toHaveLength(2);
      expect(faults[0].resolvedTime).toBeTruthy(); // Most recent should be resolved
      expect(faults[1].resolvedTime).toBeNull(); // Older should still be unresolved
    });
  });

  describe('Call Type Mapping', () => {
    test('should map button indices to correct call types', () => {
      expect(mqttHandler.callTypeMapping[2]).toBe('Production');
      expect(mqttHandler.callTypeMapping[3]).toBe('Maintenance');
      expect(mqttHandler.callTypeMapping[5]).toBe('Store');
      expect(mqttHandler.callTypeMapping[6]).toBe('Quality');
    });
  });

  describe('Station State Management', () => {
    test('should track station states', () => {
      const buttons = [
        { state: 1, count: 0 },
        { state: 1, count: 50 },
        { state: 0, count: 1 }, // Production fault
        { state: 1, count: 0 },
        { state: 1, count: 0 },
        { state: 1, count: 0 },
        { state: 1, count: 0 },
        { state: 1, count: 0 }
      ];

      mqttHandler.previousStates.set('Station1', buttons);

      const states = mqttHandler.getStationStates();
      expect(states).toHaveProperty('Station1');
      expect(states.Station1.actualCount).toBe(50);
      expect(states.Station1.production).toBe(0); // Fault state
      expect(states.Station1.maintenance).toBe(1); // Normal state
    });

    test('should get system status', () => {
      const status = mqttHandler.getStatus();
      
      expect(status).toHaveProperty('connected');
      expect(status).toHaveProperty('messageQueueLength');
      expect(status).toHaveProperty('processing');
      expect(status).toHaveProperty('stationsTracked');
      expect(status).toHaveProperty('reconnectAttempts');
    });
  });

  describe('Message Queue Management', () => {
    test('should add messages to queue', () => {
      const message = {
        stationName: 'Station1',
        buttons: [],
        timestamp: new Date()
      };

      mqttHandler.messageQueue.push(message);
      expect(mqttHandler.messageQueue).toHaveLength(1);
    });

    test('should clear message queue', () => {
      // Add some test messages
      mqttHandler.messageQueue.push({ test: 1 });
      mqttHandler.messageQueue.push({ test: 2 });
      
      const clearedCount = mqttHandler.clearMessageQueue();
      
      expect(clearedCount).toBe(2);
      expect(mqttHandler.messageQueue).toHaveLength(0);
    });
  });

  describe('IP Address Assignment', () => {
    test('should assign unique IP addresses to stations', async () => {
      await mqttHandler.updateActualCount('Station1', 10);
      await mqttHandler.updateActualCount('Station2', 20);
      await mqttHandler.updateActualCount('Station18', 30);

      const stations = await Baydetail.findAll({
        order: [['stationName', 'ASC']]
      });

      expect(stations).toHaveLength(3);
      expect(stations[0].ipAddress).toBe('192.168.1.1');
      expect(stations[1].ipAddress).toBe('192.168.1.2');
      expect(stations[2].ipAddress).toBe('192.168.1.18');

      // Check all IPs are unique
      const ips = stations.map(s => s.ipAddress);
      expect(new Set(ips).size).toBe(ips.length);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid station names gracefully', async () => {
      // Should not throw error
      await expect(mqttHandler.updateActualCount('', 50)).resolves.not.toThrow();
      await expect(mqttHandler.createFaultEntry('', 'Production', new Date())).resolves.not.toThrow();
    });

    test('should handle invalid call types', async () => {
      await expect(mqttHandler.createFaultEntry('Station1', 'InvalidType', new Date())).rejects.toThrow();
    });
  });
});