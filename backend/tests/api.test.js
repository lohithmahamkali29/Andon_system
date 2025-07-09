
const request = require('supertest');
const { app } = require('../server');
const { connectDB, Baydetail, DailyRecord, SectionData } = require('../models');

describe('Andon API Tests', () => {
  let server;

  beforeAll(async () => {
    // Connect to test database
    await connectDB();
    server = app.listen(0); // Use random port for testing
  });

  afterAll(async () => {
    if (server) {
      server.close();
    }
  });

  beforeEach(async () => {
    // Clean database before each test
    await SectionData.destroy({ where: {} });
    await DailyRecord.destroy({ where: {} });
    await Baydetail.destroy({ where: {} });
  });

  describe('Health Check', () => {
    test('GET /health should return system status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'OK');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
    });
  });

  describe('Baydetail API', () => {
    test('GET /api/data/baydetail should return empty array initially', async () => {
      const response = await request(app)
        .get('/api/data/baydetail')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(0);
    });

    test('POST /api/baydetail should create new station', async () => {
      const stationData = {
        stationName: 'TestStation1',
        plannedCount: 100,
        actualCount: 50,
        ipAddress: '192.168.1.100'
      };

      const response = await request(app)
        .post('/api/baydetail')
        .send(stationData)
        .expect(201);

      expect(response.body).toHaveProperty('stationName', 'TestStation1');
      expect(response.body).toHaveProperty('ipAddress', '192.168.1.100');
    });

    test('POST /api/baydetail should reject duplicate station name', async () => {
      const stationData = {
        stationName: 'TestStation1',
        ipAddress: '192.168.1.100'
      };

      // Create first station
      await request(app)
        .post('/api/baydetail')
        .send(stationData)
        .expect(201);

      // Try to create duplicate
      await request(app)
        .post('/api/baydetail')
        .send({ ...stationData, ipAddress: '192.168.1.101' })
        .expect(409);
    });

    test('POST /api/baydetail should reject duplicate IP address', async () => {
      const stationData = {
        stationName: 'TestStation1',
        ipAddress: '192.168.1.100'
      };

      // Create first station
      await request(app)
        .post('/api/baydetail')
        .send(stationData)
        .expect(201);

      // Try to create duplicate IP
      await request(app)
        .post('/api/baydetail')
        .send({ ...stationData, stationName: 'TestStation2' })
        .expect(409);
    });

    test('POST /api/baydetail should validate required fields', async () => {
      const response = await request(app)
        .post('/api/baydetail')
        .send({
          // Missing stationName and ipAddress
          plannedCount: 100
        })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation Error');
    });
  });

  describe('Station Status API', () => {
    test('GET /api/station/:id/status should create station if not exists', async () => {
      const response = await request(app)
        .get('/api/station/1/status')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('station');
      expect(response.body.station).toHaveProperty('name', 'Station1');
      expect(response.body.station).toHaveProperty('actualCount', 0);
    });

    test('GET /api/station/:id/status should use unique IP addresses', async () => {
      // Test multiple stations get unique IPs
      const response1 = await request(app).get('/api/station/1/status');
      const response2 = await request(app).get('/api/station/2/status');

      // Check stations were created in database
      const stations = await Baydetail.findAll();
      expect(stations).toHaveLength(2);
      
      const ips = stations.map(s => s.ipAddress);
      expect(ips).toContain('192.168.1.1');
      expect(ips).toContain('192.168.1.2');
      expect(new Set(ips).size).toBe(2); // All IPs should be unique
    });
  });

  describe('Section Data API', () => {
    beforeEach(async () => {
      // Create test station
      await Baydetail.create({
        stationName: 'TestStation1',
        ipAddress: '192.168.1.100',
        plannedCount: 100,
        actualCount: 0
      });
    });

    test('POST /api/sectiondata should create fault entry', async () => {
      const faultData = {
        stationName: 'TestStation1',
        callType: 'Production',
        faultTime: new Date().toISOString()
      };

      const response = await request(app)
        .post('/api/sectiondata')
        .send(faultData)
        .expect(201);

      expect(response.body).toHaveProperty('stationName', 'TestStation1');
      expect(response.body).toHaveProperty('callType', 'Production');
      expect(response.body.resolvedTime).toBeNull();
    });

    test('POST /api/sectiondata should validate call types', async () => {
      const faultData = {
        stationName: 'TestStation1',
        callType: 'InvalidCallType',
        faultTime: new Date().toISOString()
      };

      await request(app)
        .post('/api/sectiondata')
        .send(faultData)
        .expect(500); // Should fail due to invalid enum value
    });

    test('PUT /api/sectiondata/:id/resolve should resolve fault', async () => {
      // Create fault first
      const faultTime = new Date(Date.now() - 60000); // 1 minute ago
      const fault = await SectionData.create({
        stationName: 'TestStation1',
        callType: 'Production',
        faultTime
      });

      const response = await request(app)
        .put(`/api/sectiondata/${fault.id}/resolve`)
        .send({ resolvedTime: new Date().toISOString() })
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('downtimeMinutes');
      expect(parseFloat(response.body.downtimeMinutes)).toBeGreaterThan(0);
    });

    test('PUT /api/sectiondata/:id/resolve should reject already resolved faults', async () => {
      // Create resolved fault
      const fault = await SectionData.create({
        stationName: 'TestStation1',
        callType: 'Production',
        faultTime: new Date(Date.now() - 120000),
        resolvedTime: new Date(Date.now() - 60000)
      });

      await request(app)
        .put(`/api/sectiondata/${fault.id}/resolve`)
        .send({ resolvedTime: new Date().toISOString() })
        .expect(400);
    });
  });

  describe('Dashboard Summary API', () => {
    beforeEach(async () => {
      // Create test data
      await Baydetail.create({
        stationName: 'TestStation1',
        actualCount: 50,
        efficiency: 75.5,
        ipAddress: '192.168.1.100',
        isActive: true
      });

      await Baydetail.create({
        stationName: 'TestStation2',
        actualCount: 30,
        efficiency: 60.0,
        ipAddress: '192.168.1.101',
        isActive: false
      });

      // Create unresolved fault
      await SectionData.create({
        stationName: 'TestStation1',
        callType: 'Production',
        faultTime: new Date(),
        resolvedTime: null
      });
    });

    test('GET /api/dashboard/summary should return summary statistics', async () => {
      const response = await request(app)
        .get('/api/dashboard/summary')
        .expect(200);

      expect(response.body).toHaveProperty('totalStations', 2);
      expect(response.body).toHaveProperty('activeStations', 1);
      expect(response.body).toHaveProperty('totalProduction', 80);
      expect(response.body).toHaveProperty('activeFaults', 1);
      expect(response.body).toHaveProperty('faultsByType');
      expect(response.body.faultsByType).toHaveProperty('Production', 1);
    });
  });

  describe('Daily Record API', () => {
    beforeEach(async () => {
      const today = new Date().toISOString().split('T')[0];
      
      await DailyRecord.create({
        stationName: 'TestStation1',
        todayDate: today,
        mDowntime: 30,
        pDowntime: 45,
        qDowntime: 15,
        sDowntime: 10
      });
    });

    test('GET /api/data/dailyrecord should return daily records', async () => {
      const response = await request(app)
        .get('/api/data/dailyrecord')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(1);
      expect(response.body[0]).toHaveProperty('stationName', 'TestStation1');
      expect(response.body[0]).toHaveProperty('totalDowntime', 100); // Auto-calculated
    });
  });

  describe('Section Data Filtering', () => {
    beforeEach(async () => {
      const today = new Date();
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

      await SectionData.create({
        stationName: 'TestStation1',
        callType: 'Production',
        faultTime: today,
        resolvedTime: null
      });

      await SectionData.create({
        stationName: 'TestStation1',
        callType: 'Maintenance',
        faultTime: yesterday,
        resolvedTime: yesterday
      });
    });

    test('GET /api/data/sectiondata should return all records without date filter', async () => {
      const response = await request(app)
        .get('/api/data/sectiondata')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(2);
    });

    test('GET /api/data/sectiondata should filter by date', async () => {
      const today = new Date().toISOString().split('T')[0];
      
      const response = await request(app)
        .get(`/api/data/sectiondata?date=${today}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(1);
      expect(response.body[0]).toHaveProperty('callType', 'Production');
    });
  });
});
