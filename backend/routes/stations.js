const express = require('express');
const router = express.Router();
const { Baydetail } = require('../models');

// Get all stations
router.get('/', async (req, res) => {
  try {
    const stations = await Baydetail.findAll({
      order: [['stationName', 'ASC']]
    });
    res.json(stations);
  } catch (error) {
    console.error('Error fetching stations:', error);
    res.status(500).json({ error: 'Failed to fetch stations' });
  }
});

// Create a new station
router.post('/', async (req, res) => {
  try {
    const {
      stationName,
      firstShiftPlannedCount,
      secondShiftPlannedCount,
      thirdShiftPlannedCount,
      ipAddress,
      topic,
      
    } = req.body;

    // Validate required fields
    if (!stationName || !ipAddress) {
      return res.status(400).json({ 
        error: 'Station name and IP address are required' 
      });
    }

    // Check if station already exists
    const existingStation = await Baydetail.findOne({
      where: { stationName }
    });

    if (existingStation) {
      return res.status(400).json({ 
        error: 'Station with this name already exists' 
      });
    }

    // Check if IP address is already in use
    const existingIP = await Baydetail.findOne({
      where: { ipAddress }
    });

    if (existingIP) {
      return res.status(400).json({ 
        error: 'IP address is already in use' 
      });
    }

    // Create new station
    const newStation = await Baydetail.create({
      stationName,
      firstShiftPlannedCount: firstShiftPlannedCount || 0,
      secondShiftPlannedCount: secondShiftPlannedCount || 0,
      thirdShiftPlannedCount: thirdShiftPlannedCount || 0,
      ipAddress,
      topic: topic || null,
      plannedCount: (firstShiftPlannedCount || 0) + (secondShiftPlannedCount || 0) + (thirdShiftPlannedCount || 0),
      actualCount: 0,
      efficiency: 0.0,
      isActive: true,
      isAlive: true
    });

    res.status(201).json({ 
      message: 'Station created successfully', 
      station: newStation 
    });

  } catch (error) {
    console.error('Error creating station:', error);
    res.status(500).json({ error: 'Failed to create station' });
  }
});

// Get a specific station by ID
router.get('/:id', async (req, res) => {
  try {
    const station = await Baydetail.findByPk(req.params.id);
    if (!station) {
      return res.status(404).json({ error: 'Station not found' });
    }
    res.json(station);
  } catch (error) {
    console.error('Error fetching station:', error);
    res.status(500).json({ error: 'Failed to fetch station' });
  }
});

// Update station status (e.g., activate/deactivate)
router.put('/:id/status', async (req, res) => {
  try {
    const station = await Baydetail.findByPk(req.params.id);
    if (!station) {
      return res.status(404).json({ error: 'Station not found' });
    }

    const { isActive, isAlive } = req.body;

    station.isActive = isActive ?? station.isActive;
    station.isAlive = isAlive ?? station.isAlive;

    await station.save();

    res.json({ message: 'Station status updated successfully', station });
  } catch (error) {
    console.error('Error updating station status:', error);
    res.status(500).json({ error: 'Failed to update station status' });
  }
});

// Update station (full update)
router.put('/:id', async (req, res) => {
  try {
    const station = await Baydetail.findByPk(req.params.id);
    if (!station) {
      return res.status(404).json({ error: 'Station not found' });
    }

    const {
      stationName,
      firstShiftPlannedCount,
      secondShiftPlannedCount,
      thirdShiftPlannedCount,
      ipAddress,
      topic
    } = req.body;

    // Validate required fields
    if (!stationName || !ipAddress) {
      return res.status(400).json({ 
        error: 'Station name and IP address are required' 
      });
    }

    // Check if new station name conflicts with existing station (excluding current station)
    if (stationName !== station.stationName) {
      const existingStation = await Baydetail.findOne({
        where: { stationName }
      });

      if (existingStation) {
        return res.status(400).json({ 
          error: 'Station with this name already exists' 
        });
      }
    }

    // Check if new IP address conflicts with existing station (excluding current station)
    if (ipAddress !== station.ipAddress) {
      const existingIP = await Baydetail.findOne({
        where: { ipAddress }
      });

      if (existingIP) {
        return res.status(400).json({ 
          error: 'IP address is already in use' 
        });
      }
    }

    // Update station
    station.stationName = stationName;
    station.firstShiftPlannedCount = firstShiftPlannedCount || 0;
    station.secondShiftPlannedCount = secondShiftPlannedCount || 0;
    station.thirdShiftPlannedCount = thirdShiftPlannedCount || 0;
    station.ipAddress = ipAddress;
    station.topic = topic || null;
    station.plannedCount = (firstShiftPlannedCount || 0) + (secondShiftPlannedCount || 0) + (thirdShiftPlannedCount || 0);

    await station.save();

    res.json({ 
      message: 'Station updated successfully', 
      station 
    });

  } catch (error) {
    console.error('Error updating station:', error);
    res.status(500).json({ error: 'Failed to update station' });
  }
});

// Delete a station
router.delete('/:id', async (req, res) => {
  try {
    const station = await Baydetail.findByPk(req.params.id);
    if (!station) {
      return res.status(404).json({ error: 'Station not found' });
    }

    await station.destroy();

    res.json({ 
      message: 'Station deleted successfully' 
    });

  } catch (error) {
    console.error('Error deleting station:', error);
    res.status(500).json({ error: 'Failed to delete station' });
  }
});

module.exports = router;
