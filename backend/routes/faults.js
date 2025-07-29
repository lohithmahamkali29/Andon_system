const express = require('express');
const router = express.Router();
const { SectionData, Baydetail } = require('../models');

// Get all faults (active and resolved)
router.get('/', async (req, res) => {
  try {
    // Join SectionData with Baydetail to get station names
    const faults = await SectionData.findAll({
      include: [{
        model: Baydetail,
        as: 'station',
        attributes: ['stationName'],
      }],
      order: [['faultTime', 'DESC']]
    });

    // Map to desired format
    const faultList = faults.map(fault => ({
      stationName: fault.station?.stationName || fault.stationName,
      calltype: fault.callType,
      faultTime: fault.faultTime,
      resolvedTime: fault.resolvedTime,
      status: fault.resolvedTime ? 'resolved' : 'active'
    }));

    res.json({ success: true, faults: faultList });
  } catch (error) {
    console.error('Error fetching faults:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch faults' });
  }
});

module.exports = router;