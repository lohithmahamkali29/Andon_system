const express = require('express');
const router = express.Router();
const { Baydetail, SectionData, DailyRecord } = require('../models');
const { Op } = require('sequelize');

// Get all stations with fault status
router.get('/', async (req, res) => {
  try {
    console.log('🔍 API /stations called - checking database...');
    
    const { QueryTypes } = require('sequelize');
    
    const stations = await Baydetail.findAll({
      where: { isActive: true },
      order: [['stationName', 'ASC']],
    });

    const stationsWithStatus = await Promise.all(stations.map(async (station) => {
      const stationJSON = station.toJSON();
      
      // Use raw SQL query for section data instead of Sequelize include
      const rawSectionData = await SectionData.sequelize.query(
        'SELECT id, call_type as callType, fault_time as faultTime, resolved_time as resolvedTime, created_at as createdAt FROM section_data WHERE station_name = ? ORDER BY fault_time DESC',
        {
          replacements: [stationJSON.stationName],
          type: QueryTypes.SELECT
        }
      );
      
      console.log(`🔍 Raw sectionData for ${stationJSON.stationName}:`, rawSectionData.slice(0, 3));
      
      // Set the raw section data
      stationJSON.sectionData = rawSectionData;
      
      const faultStatus = {};
      let latestFaultTime = null;
      let latestResolvedTime = null;
      let latestFaultCalltype = null;
      let latestResolvedCalltype = null;

      // Process section data to find latest fault and resolved times
      if (stationJSON.sectionData && stationJSON.sectionData.length > 0) {
        // Filter out records with invalid dates and sort by fault time descending
        const validFaults = stationJSON.sectionData.filter(fault => fault.faultTime && !isNaN(new Date(fault.faultTime)));
        const sortedFaults = validFaults.sort((a, b) => new Date(b.faultTime) - new Date(a.faultTime));
        
        console.log(`📊 Processing ${validFaults.length}/${stationJSON.sectionData.length} valid fault records for ${stationJSON.stationName}`);
        
        for (const fault of sortedFaults) {
          console.log(`📋 Fault record:`, {
            callType: fault.callType,
            faultTime: fault.faultTime,
            resolvedTime: fault.resolvedTime,
            isResolved: !!fault.resolvedTime
          });
          
          // Only set active fault status for unresolved faults (resolved_time is NULL)
          if (!fault.resolvedTime) {
            faultStatus[fault.callType] = true;
            console.log(`🚨 Active fault: ${fault.callType}`);
          } else {
            console.log(`✅ Resolved fault: ${fault.callType}`);
          }
          
          // Get latest fault time (first in sorted array) - ensure valid date
          if (!latestFaultTime && fault.faultTime) {
            latestFaultTime = fault.faultTime;
            latestFaultCalltype = fault.callType;
          }
          
          // Find latest resolved time among all resolved faults - ensure valid date
          if (fault.resolvedTime && (!latestResolvedTime || new Date(fault.resolvedTime) > new Date(latestResolvedTime))) {
            latestResolvedTime = fault.resolvedTime;
            latestResolvedCalltype = fault.callType;
          }
        }
        
        console.log(`📊 Final fault status for ${stationJSON.stationName}:`, faultStatus);
      } else {
        console.log(`⚠️ No sectionData found for ${stationJSON.stationName}`);
      }

      return {
        ...stationJSON,
        faultStatus,
        latestFaultTime,
        latestResolvedTime,
        latestFaultCalltype,
        latestResolvedCalltype
      };
    }));

    res.json({
      success: true,
      stations: stationsWithStatus
    });

  } catch (error) {
    console.error('❌ Error fetching stations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch stations data'
    });
  }
});

// Add new station
router.post('/', async (req, res) => {
  const { stationName, plannedCount1, plannedCount2, plannedCount3, ipAddress, topic } = req.body;

  if (!stationName || !plannedCount1 || !plannedCount2 || !plannedCount3 || !ipAddress) {
    return res.status(400).json({ success: false, error: 'Missing required fields' });
  }

  try {
    const newStation = await Baydetail.create({
      stationName,
      firstShiftPlannedCount: plannedCount1,
      secondShiftPlannedCount: plannedCount2,
      thirdShiftPlannedCount: plannedCount3,
      ipAddress,
      topic: topic || ''
    });

    res.json({ success: true, message: 'Station added successfully', stationId: newStation.id });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ success: false, error: 'Station already exists' });
    }
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update existing station
router.put('/:stationName', async (req, res) => {
  const { stationName } = req.params;
  const decodedStationName = decodeURIComponent(stationName);
  const { plannedCount1, plannedCount2, plannedCount3, ipAddress, topic } = req.body;

  try {
    const station = await Baydetail.findOne({ where: { stationName: decodedStationName } });
    if (!station) {
      return res.status(404).json({ success: false, error: 'Station not found' });
    }

    await station.update({
      firstShiftPlannedCount: plannedCount1,
      secondShiftPlannedCount: plannedCount2,
      thirdShiftPlannedCount: plannedCount3,
      ipAddress,
      topic
    });

    res.json({ success: true, message: 'Station updated' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete a station
router.delete('/:stationName', async (req, res) => {
  const { stationName } = req.params;
  const decodedStationName = decodeURIComponent(stationName);

  try {
    const station = await Baydetail.findOne({ where: { stationName: decodedStationName } });
    if (!station) {
      return res.status(404).json({ success: false, error: 'Station not found' });
    }

    await Baydetail.destroy({ where: { stationName: decodedStationName } });
    await DailyRecord.destroy({ where: { stationName: decodedStationName } });
    await SectionData.destroy({ where: { stationName: decodedStationName } });

    res.json({ success: true, message: 'Station deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;