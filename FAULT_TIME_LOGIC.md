# Fault Time Logic Implementation

## Overview

This document describes the implementation of the fault time display logic in the Andon Dashboard system. The goal is to properly display fault times and resolved times according to the following requirements:

1. **Fault Time**: Display the time when a fault first occurred
2. **Resolved Time**: Update when the fault is resolved
3. **Persistence**: Fault time should not change until a new fault occurs
4. **Multiple Fault Types**: Handle different call types (PMD, Quality, Store, JMD, Production)

## Implementation Details

### Backend Changes

#### 1. Enhanced API Endpoint (`/api/stations`)

**File**: `backend/server.js`

The main stations API has been updated to properly track fault times:

- **Query**: Now fetches faults from the last 24 hours instead of only unresolved faults
- **Logic**: Tracks the most recent fault time per station/calltype combination
- **Active Faults**: Prioritizes active (unresolved) faults over resolved ones
- **Time Tracking**: Maintains the initial fault time until a new fault occurs

#### 2. Enhanced Device Poller

**File**: `backend/services/devicePoller.js`

The device poller has been improved to:

- **Multiple Call Types**: Support all call types (PMD, Quality, Store, JMD, Production)
- **Proper State Tracking**: Track previous fault states per station and call type
- **Accurate Resolution**: Resolve the most recent unresolved fault for each call type

#### 3. Test Endpoint

**File**: `backend/server.js`

Added `/api/simulate-fault` endpoint for testing:

```bash
# Create a fault
POST /api/simulate-fault
{
  "stationName": "Station1",
  "calltype": "Production",
  "action": "fault"
}

# Resolve a fault
POST /api/simulate-fault
{
  "stationName": "Station1", 
  "calltype": "Production",
  "action": "resolve"
}
```

### Frontend Changes

#### 1. Time Formatting

**File**: `frontend/andon-dashboard/src/Dashboard.js`

Added `formatFaultTime()` function to properly format time strings for display.

#### 2. UI Updates

- **Fault Date & Time Card**: Shows the initial fault date and time in DD/MM/YYYY, HH:MM:SS format
- **Resolved Date & Time Card**: Shows resolved date and time and duration when available
- **Active Faults Sidebar**: Displays properly formatted dates and times
- **Test Interface**: Added test buttons in Reports modal

## How It Works

### 1. Fault Creation
When a fault occurs:
1. Device poller detects fault condition (value = 0)
2. Creates new record in `SectionData` table with `FaultTime` set
3. `ResolvedTime` remains NULL
4. Frontend displays fault time immediately

### 2. Fault Resolution
When a fault is resolved:
1. Device poller detects resolution (value = 1)
2. Updates the most recent unresolved fault with `ResolvedTime`
3. Frontend updates to show resolved time and duration
4. Fault time remains unchanged

### 3. New Fault
When a new fault occurs:
1. Previous fault time is preserved (if resolved)
2. New fault time is set for the new fault
3. Frontend shows the new fault time

## Testing

### 1. Using the Test Script

Run the automated test:

```bash
cd backend/scripts
node test-fault-times.js
```

This script will:
- Create a test fault
- Check the fault time display
- Resolve the fault
- Check the resolved time display
- Create another fault
- Verify the fault time updates

### 2. Using the Frontend Test Interface

1. Open the dashboard
2. Navigate to a station
3. Open the Reports modal
4. Use the "Create Fault" and "Resolve Fault" buttons
5. Observe the fault time and resolved time changes

### 3. Manual API Testing

```bash
# Create a fault
curl -X POST http://localhost:5000/api/simulate-fault \
  -H "Content-Type: application/json" \
  -d '{"stationName":"Station1","calltype":"Production","action":"fault"}'

# Check station data
curl http://localhost:5000/api/stations

# Resolve the fault
curl -X POST http://localhost:5000/api/simulate-fault \
  -H "Content-Type: application/json" \
  -d '{"stationName":"Station1","calltype":"Production","action":"resolve"}'
```

## Expected Behavior

### Scenario 1: Single Fault
1. **Fault occurs at 10:30:15**
   - Fault Date & Time: 25/12/2024, 10:30:15
   - Resolved Date & Time: --:--:--
   - Status: ⚠️ FAULT: Production

2. **Fault resolved at 10:35:20**
   - Fault Date & Time: 25/12/2024, 10:30:15 (unchanged)
   - Resolved Date & Time: 25/12/2024, 10:35:20
   - Duration: 5m 5s
   - Status: ✅ OK Status

### Scenario 2: Multiple Faults
1. **First fault at 10:30:15, resolved at 10:35:20**
   - Fault Date & Time: 25/12/2024, 10:30:15
   - Resolved Date & Time: 25/12/2024, 10:35:20

2. **Second fault at 11:00:00**
   - Fault Date & Time: 25/12/2024, 11:00:00 (updated)
   - Resolved Date & Time: --:--:-- (cleared)

## Database Schema

The fault data is stored in the `SectionData` table:

```sql
CREATE TABLE SectionData (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  StationName TEXT,
  calltype TEXT,
  FaultTime DATETIME,
  ResolvedTime DATETIME,
  DateTime DATETIME,
  Shift INTEGER
);
```

## Troubleshooting

### Common Issues

1. **Fault time not updating**: Check if the device poller is running and detecting fault conditions
2. **Resolved time not showing**: Verify the fault resolution logic in the device poller
3. **Multiple call types not working**: Check the `calltype_index_map` configuration

### Debug Information

The frontend includes debug logging that shows fault data in the browser console:

```javascript
console.log(`🔍 Station ${station.stationName} fault data:`, {
  faultTime: station.faultTime,
  resolvedTime: station.resolvedTime,
  faultStatus: station.faultStatus
});
```

### Logs to Monitor

- Backend: Look for fault creation and resolution messages
- Device Poller: Check for polling status and fault detection
- Frontend: Monitor network requests to `/api/stations` 