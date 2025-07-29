const express = require('express');
const router = express.Router();
const { sequelize } = require('../models');

// Get dashboard summary
router.get('/summary', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const stationsQuery = 'SELECT COUNT(*) as totalStations FROM baydetails WHERE isactive=1';
    const faultsQuery = 'SELECT COUNT(*) as totalFaults FROM SectionData WHERE DATE(DateTime)=:today';
    const resolvedQuery = 'SELECT COUNT(*) as resolvedFaults FROM SectionData WHERE DATE(DateTime)=:today AND ResolvedTime IS NOT NULL';
    const activeQuery = 'SELECT COUNT(*) as activeFaults FROM SectionData WHERE DATE(DateTime)=:today AND ResolvedTime IS NULL';
    const planQuery = 'SELECT SUM(PlannedCount1) as totalPlan FROM baydetails WHERE isactive=1';
    const downtimeQuery = 'SELECT SUM(totalDowntime) as totalDowntime FROM DailyRecord WHERE TodayDate=:today';

    const [stationResult] = await sequelize.query(stationsQuery, { type: sequelize.QueryTypes.SELECT });
    const [faultResult] = await sequelize.query(faultsQuery, { replacements: { today }, type: sequelize.QueryTypes.SELECT });
    const [resolvedResult] = await sequelize.query(resolvedQuery, { replacements: { today }, type: sequelize.QueryTypes.SELECT });
    const [activeResult] = await sequelize.query(activeQuery, { replacements: { today }, type: sequelize.QueryTypes.SELECT });
    const [planResult] = await sequelize.query(planQuery, { type: sequelize.QueryTypes.SELECT });
    const [downtimeResult] = await sequelize.query(downtimeQuery, { replacements: { today }, type: sequelize.QueryTypes.SELECT });

    res.json({
      success: true,
      summary: {
        totalStations: stationResult.totalStations || 0,
        totalFaults: faultResult.totalFaults || 0,
        resolvedFaults: resolvedResult.resolvedFaults || 0,
        activeFaults: activeResult.activeFaults || 0,
        totalPlanCount: planResult.totalPlan || 0,
        totalDowntime: downtimeResult.totalDowntime || 0
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
