const express = require('express');
const router = express.Router();
const { Baydetail, DailyRecord, SectionData } = require('../models');
const DatabaseUtils = require('../utils/database');
const { Op } = require('sequelize');
const moment = require('moment');

// Get all baydetail data
router.get('/data/baydetail', async (req, res) => {
  try {
    const baydetails = await Baydetail.findAll({
      order: [['stationName', 'ASC']]
    });
    
    res.json(baydetails);
  } catch (error) {
    console.error('Error fetching baydetail data:', error);
    res.status(500).json({ error: 'Failed to fetch baydetail data' });
  }
});

// Add other routes here...

module.exports = router; // ✅ this is the fix
