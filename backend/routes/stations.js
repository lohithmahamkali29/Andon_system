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

module.exports = router;
