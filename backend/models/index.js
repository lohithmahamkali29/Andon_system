const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');

// Initialize SQLite database
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, '../database/andon.db'),
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  define: {
    timestamps: true,
    underscored: true,
  }
});

// Define Baydetail model
const Baydetail = sequelize.define('Baydetail', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  stationName: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    field: 'station_name'
  },
  plannedCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'planned_count'
  },
  actualCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'actual_count'
  },
  efficiency: {
    type: DataTypes.FLOAT,
    defaultValue: 0.0
  },
  ipAddress: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    field: 'ip_address'
  },
  // New shift-related fields
  firstShiftPlannedCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'first_shift_planned_count'
  },
  secondShiftPlannedCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'second_shift_planned_count'
  },
  thirdShiftPlannedCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'third_shift_planned_count'
  },
  topic: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'topic'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active'
  },
  isAlive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_alive'
  },
  dateCreated: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'date_created'
  }
}, {
  tableName: 'baydetails',
  indexes: [
    {
      unique: true,
      fields: ['station_name']
    },
    {
      unique: true,
      fields: ['ip_address']
    }
  ]
});

// Define DailyRecord model
const DailyRecord = sequelize.define('DailyRecord', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  stationName: {
    type: DataTypes.STRING(50),
    allowNull: false,
    field: 'station_name'
  },
  todayDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'today_date'
  },
  mDowntime: {
    type: DataTypes.FLOAT,
    defaultValue: 0.0,
    field: 'm_downtime',
    comment: 'Maintenance downtime in minutes'
  },
  pDowntime: {
    type: DataTypes.FLOAT,
    defaultValue: 0.0,
    field: 'p_downtime',
    comment: 'Production downtime in minutes'
  },
  qDowntime: {
    type: DataTypes.FLOAT,
    defaultValue: 0.0,
    field: 'q_downtime',
    comment: 'Quality downtime in minutes'
  },
  sDowntime: {
    type: DataTypes.FLOAT,
    defaultValue: 0.0,
    field: 's_downtime',
    comment: 'Store downtime in minutes'
  },
  totalDowntime: {
    type: DataTypes.FLOAT,
    defaultValue: 0.0,
    field: 'total_downtime',
    comment: 'Total downtime in minutes'
  }
}, {
  tableName: 'daily_records',
  indexes: [
    {
      unique: true,
      fields: ['station_name', 'today_date']
    }
  ],
  hooks: {
    beforeSave: (record) => {
      // Auto-calculate total downtime
      record.totalDowntime = record.mDowntime + record.pDowntime + 
                           record.qDowntime + record.sDowntime;
    }
  }
});

// Define SectionData model  
const SectionData = sequelize.define('SectionData', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  stationName: {
    type: DataTypes.STRING(50),
    allowNull: false,
    field: 'station_name'
  },
  callType: {
    type: DataTypes.ENUM('Production', 'Maintenance', 'Quality', 'Store'),
    allowNull: false,
    field: 'call_type'
  },
  faultTime: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'fault_time'
  },
  resolvedTime: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'resolved_time'
  },
  dateTime: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'date_time'
  }
}, {
  tableName: 'section_data',
  indexes: [
    {
      fields: ['station_name', 'call_type']
    },
    {
      fields: ['fault_time']
    },
    {
      fields: ['resolved_time']
    }
  ]
});

// Define associations
Baydetail.hasMany(DailyRecord, { 
  foreignKey: 'stationName', 
  sourceKey: 'stationName',
  as: 'dailyRecords'
});

Baydetail.hasMany(SectionData, { 
  foreignKey: 'stationName', 
  sourceKey: 'stationName',
  as: 'sectionData'
});

DailyRecord.belongsTo(Baydetail, { 
  foreignKey: 'stationName', 
  targetKey: 'stationName',
  as: 'station'
});

SectionData.belongsTo(Baydetail, { 
  foreignKey: 'stationName', 
  targetKey: 'stationName',
  as: 'station'
});

// Database connection and sync
const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ SQLite database connected successfully');
    
    // Sync models (create tables if they don't exist)
    await sequelize.sync({ alter: process.env.NODE_ENV === 'development' });
    console.log('✅ Database models synchronized');
    
    return sequelize;
  } catch (error) {
    console.error('❌ Unable to connect to database:', error);
    process.exit(1);
  }
};

// Export models and connection
module.exports = {
  sequelize,
  connectDB,
  Baydetail,
  DailyRecord,
  SectionData
};