const express = require('express');
const router = express.Router();
const { sequelize } = require('../models');

// Get shift configuration
router.get('/config', async (req, res) => {
  try {
    const config = await sequelize.query('SELECT * FROM ShiftConfig LIMIT 1', { type: sequelize.QueryTypes.SELECT });
    res.json({ 
      success: true,
      config: config[0] || {} 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update shift configuration
router.put('/config', async (req, res) => {
  const { shift1_start, shift1_end, shift2_start, shift2_end, shift3_start, shift3_end } = req.body;
  try {
    await sequelize.query(
      'UPDATE ShiftConfig SET shift1_start=?, shift1_end=?, shift2_start=?, shift2_end=?, shift3_start=?, shift3_end=? WHERE id=1',
      { replacements: [shift1_start, shift1_end, shift2_start, shift2_end, shift3_start, shift3_end], type: sequelize.QueryTypes.UPDATE }
    );
    res.json({ success: true, message: 'Shift timings updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
