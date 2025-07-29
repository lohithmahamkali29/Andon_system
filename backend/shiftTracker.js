const db = require('./database');

class ShiftTracker {
  constructor() {
    this.lastShiftInfo = null;
  }

  async checkShiftChange() {
    const currentShiftInfo = await this.getCurrentShiftInfo();
    
    if (this.lastShiftInfo === null) {
      this.lastShiftInfo = currentShiftInfo;
      return false;
    }
    
    const shiftChanged = (
      this.lastShiftInfo.shiftNum !== currentShiftInfo.shiftNum ||
      this.lastShiftInfo.shiftDate !== currentShiftInfo.shiftDate
    );
    
    if (shiftChanged) {
      console.log(`🔄 Shift change detected: ${this.lastShiftInfo.shiftNum}→${currentShiftInfo.shiftNum}`);
      this.lastShiftInfo = currentShiftInfo;
      return true;
    }
    
    return false;
  }

  async getCurrentShiftInfo() {
    // Get shift timings from database
    const shiftConfig = await db.getShiftConfig();
    if (!shiftConfig) {
      console.error('❌ No shift config found in database! Returning default shift info.');
      return { shiftNum: 1, shiftDate: (new Date()).toISOString().split('T')[0] };
    }
    
    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5); // HH:MM
    const currentDate = now.toISOString().split('T')[0]; // YYYY-MM-DD
    
    // Convert time strings to minutes for comparison
    const timeToMinutes = (timeStr) => {
      const [hours, minutes] = timeStr.split(':').map(Number);
      return hours * 60 + minutes;
    };
    
    const currentMinutes = timeToMinutes(currentTime);
    const s1Start = timeToMinutes(shiftConfig.shift1_start);
    const s1End = timeToMinutes(shiftConfig.shift1_end);
    const s2Start = timeToMinutes(shiftConfig.shift2_start);
    const s2End = timeToMinutes(shiftConfig.shift2_end);
    const s3Start = timeToMinutes(shiftConfig.shift3_start);
    const s3End = timeToMinutes(shiftConfig.shift3_end);
    
    // Shift 1: 05:30-14:20 (same day)
    if (s1Start <= currentMinutes && currentMinutes < s1End) {
      return { shiftNum: 1, shiftDate: currentDate };
    }
    
    // Shift 2: 14:20-00:10 (crosses midnight)
    if (s2End < s2Start) { // Crosses midnight
      if (currentMinutes >= s2Start) {
        return { shiftNum: 2, shiftDate: currentDate }; // Today
      } else if (currentMinutes < s2End) {
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        return { shiftNum: 2, shiftDate: yesterday.toISOString().split('T')[0] }; // Yesterday
      }
    } else if (s2Start <= currentMinutes && currentMinutes < s2End) {
      return { shiftNum: 2, shiftDate: currentDate };
    }
    
    // Shift 3: 00:10-05:30 (crosses midnight)
    if (s3End < s3Start) { // Crosses midnight
      if (currentMinutes >= s3Start) {
        return { shiftNum: 3, shiftDate: currentDate }; // Today
      } else if (currentMinutes < s3End) {
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        return { shiftNum: 3, shiftDate: yesterday.toISOString().split('T')[0] }; // Yesterday
      }
    } else if (s3Start <= currentMinutes && currentMinutes < s3End) {
      return { shiftNum: 3, shiftDate: currentDate };
    }
    
    // Default fallback (shouldn't happen with proper shift config)
    return { shiftNum: 1, shiftDate: currentDate };
  }
}

module.exports = new ShiftTracker(); 