const express = require('express');
const router = express.Router();
const { sequelize } = require('../models');

// Get reports data
router.get('/:reportType', async (req, res) => {
  const { reportType } = req.params;
  const { fromDate, toDate } = req.query;

  let query, params = {};
  
  switch (reportType) {
    case 'baydetails':
      query = 'SELECT * FROM baydetails';
      break;
    case 'SectionData':
      query = 'SELECT * FROM SectionData WHERE DateTime BETWEEN :fromDate AND :toDate';
      params = { fromDate, toDate };
      break;
    case 'DailyRecord':
      query = 'SELECT * FROM DailyRecord WHERE TodayDate BETWEEN :fromDate AND :toDate';
      params = { fromDate, toDate };
      break;
    default:
      return res.status(400).json({ error: 'Invalid report type' });
  }

  try {
    const rows = await sequelize.query(query, { replacements: params, type: sequelize.QueryTypes.SELECT });
    res.json({ 
      success: true,
      data: rows,
      reportType,
      fromDate,
      toDate
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
