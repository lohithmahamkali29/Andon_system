// scripts/setup-database.js
const { connectDB, Baydetail, DailyRecord, SectionData } = require('../models');
const path = require('path');
const fs = require('fs');

async function setupDatabase() {
  console.log('🔧 Setting up Andon System Database...\n');

  try {
    // Ensure database directory exists
    const dbDir = path.join(__dirname, '../database');
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
      console.log('📁 Created database directory');
    }

    // Connect to database
    await connectDB();

    // Force sync to recreate tables (use carefully in production)
    if (process.argv.includes('--force')) {
      console.log('⚠️  Force sync enabled - this will drop existing tables');
      await sequelize.sync({ force: true });
    } else {
      await sequelize.sync({ alter: true });
    }

    console.log('✅ Database setup completed successfully!\n');

    // Create initial stations if they don't exist
    await createInitialStations();

    console.log('🎉 Setup complete! You can now start the server.\n');
    
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    process.exit(1);
  }
}

async function createInitialStations() {
  console.log('📊 Creating initial station data...');

  try {
    for (let i = 1; i <= 18; i++) {
      const stationName = `Station${i}`;
      const ipAddress = `192.168.1.${i}`;

      await Baydetail.findOrCreate({
        where: { stationName },
        defaults: {
          plannedCount: 100,
          actualCount: 0,
          efficiency: 0.0,
          ipAddress,
          isActive: true,
          isAlive: true
        }
      });
    }

    console.log('✅ Initial stations created (18 stations)');

  } catch (error) {
    console.error('❌ Error creating initial stations:', error);
  }
}

// Run setup if called directly
if (require.main === module) {
  setupDatabase()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
}