
const { connectDB, Baydetail, DailyRecord, SectionData } = require('../models');
const moment = require('moment');

async function seedTestData() {
  console.log('🌱 Seeding test data...\n');

  try {
    await connectDB();

    // Clear existing data
    if (process.argv.includes('--clear')) {
      console.log('🗑️  Clearing existing data...');
      await SectionData.destroy({ where: {} });
      await DailyRecord.destroy({ where: {} });
      await Baydetail.destroy({ where: {} });
    }

    // Create stations
    console.log('📊 Creating station data...');
    for (let i = 1; i <= 18; i++) {
      await Baydetail.findOrCreate({
        where: { stationName: `Station${i}` },
        defaults: {
          plannedCount: 100,
          actualCount: Math.floor(Math.random() * 120),
          efficiency: Math.random() * 100,
          ipAddress: `192.168.1.${i}`,
          isActive: Math.random() > 0.1, // 90% active
          isAlive: Math.random() > 0.05  // 95% alive
        }
      });
    }

    // Create daily records for the past week
    console.log('📅 Creating daily records...');
    for (let i = 0; i < 7; i++) {
      const date = moment().subtract(i, 'days').format('YYYY-MM-DD');
      
      for (let stationNum = 1; stationNum <= 18; stationNum++) {
        await DailyRecord.findOrCreate({
          where: {
            stationName: `Station${stationNum}`,
            todayDate: date
          },
          defaults: {
            mDowntime: Math.random() * 60,
            pDowntime: Math.random() * 45,
            qDowntime: Math.random() * 30,
            sDowntime: Math.random() * 20
          }
        });
      }
    }

    // Create some fault events
    console.log('🚨 Creating fault events...');
    const callTypes = ['Production', 'Maintenance', 'Quality', 'Store'];
    
    for (let i = 0; i < 50; i++) {
      const stationNum = Math.floor(Math.random() * 18) + 1;
      const callType = callTypes[Math.floor(Math.random() * callTypes.length)];
      const faultTime = moment().subtract(Math.random() * 168, 'hours').toDate(); // Within past week
      
      // 80% chance of being resolved
      const isResolved = Math.random() > 0.2;
      const resolvedTime = isResolved ? 
        moment(faultTime).add(Math.random() * 120, 'minutes').toDate() : null;

      await SectionData.create({
        stationName: `Station${stationNum}`,
        callType,
        faultTime,
        resolvedTime
      });
    }

    console.log('✅ Test data seeded successfully!\n');
    console.log('📊 Summary:');
    console.log(`   - 18 stations created`);
    console.log(`   - ${7 * 18} daily records created`);
    console.log(`   - 50 fault events created`);
    console.log('\n🎉 Seeding complete!\n');

  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

// Run seeding if called directly
if (require.main === module) {
  seedTestData()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { seedTestData };