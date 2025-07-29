# 8-Bit Data Array Parsing Logic

## Overview

The Andon system now processes 8-bit data arrays from devices in the format: `{1,4061,1,6010,0,0,0,0}`

## Data Array Structure

### Array Positions (0-indexed):
- **Position 1 (index 0)**: First value
- **Position 2 (index 1)**: Fault detection (0 = fault, 1 = ok)
- **Position 3 (index 2)**: Third value  
- **Position 4 (index 3)**: Actual count
- **Positions 5-8 (index 4-7)**: Additional data

### Example Data:
```
{1,4061,1,6010,0,0,0,0}
├─ Position 1: 1
├─ Position 2: 4061 (fault status)
├─ Position 3: 1
├─ Position 4: 6010 (actual count)
└─ Positions 5-8: 0,0,0,0
```

## Implementation Details

### Device Poller (`backend/services/devicePoller.js`)

#### Actual Count Processing:
```javascript
// Get actual count from 4th position (index 3)
const actualCount = arr.length > 3 ? arr[3] : undefined;
if (typeof actualCount === 'number' && !isNaN(actualCount)) {
  // Update database with actual count
  db.run('UPDATE baydetails SET ActualCount=?, isalive=1 WHERE StationName=?', 
         [actualCount, station.StationName]);
}
```

#### Fault Detection:
```javascript
// Using 2nd position (index 1) for fault detection
const calltypeMap = {
  "PMD": 1,
  "Quality": 1, 
  "Store": 1,
  "JMD": 1,
  "Production": 1
};

// Check fault status
const faultValue = arr[1]; // Position 2
if (faultValue === 0 && prev !== 0) {
  // Fault occurred
} else if (faultValue === 1 && prev === 0) {
  // Fault resolved
}
```

### Default Calltype Index Map

When creating new stations, the default mapping is:
```json
{
  "PMD": 1,
  "Quality": 1,
  "Store": 1,
  "JMD": 1,
  "Production": 1
}
```

This means all fault types are detected from position 2 (index 1) in the data array.

## Data Validation

### Valid Data Examples:
- `{1,4061,1,6010,0,0,0,0}` ✅ Normal operation
- `{1,0,1,5000,0,0,0,0}` ✅ Fault condition
- `{1,1,1,7500,0,0,0,0}` ✅ No fault condition

### Invalid Data Examples:
- `{1,4061,1}` ❌ Too short (no actual count)
- `{}` ❌ Empty array
- `{1,abc,1,6010}` ❌ Non-numeric values

## Testing

### Run the Test Script:
```bash
cd backend/scripts
node test-data-parsing.js
```

### Expected Output:
```
🧪 Testing 8-bit Data Array Parsing...

1. Testing: {1,4061,1,6010,0,0,0,0}
   Parsed array: [1,4061,1,6010,0,0,0,0]
   Array length: 8
   Actual Count (position 4): 6010
   Fault Status (position 2): 4061 (UNKNOWN)
   ✅ Valid actual count: 6010
   ❌ Invalid fault status: 4061

2. Testing: {1,0,1,5000,0,0,0,0}
   Parsed array: [1,0,1,5000,0,0,0,0]
   Array length: 8
   Actual Count (position 4): 5000
   Fault Status (position 2): 0 (FAULT)
   ✅ Valid actual count: 5000
   ✅ Valid fault status: 0
```

## Error Handling

### Missing Data:
- If position 4 doesn't exist: Actual count becomes `undefined`
- If position 2 doesn't exist: Fault status becomes `undefined`
- Station is marked as `isalive=0` if actual count is invalid

### Logging:
- Raw data arrays are logged for debugging
- Invalid data is logged with details
- Successful updates are logged with position information

## Migration Notes

### From Previous Version:
- **Before**: Actual count from last position, fault from various positions
- **After**: Actual count from position 4, fault from position 2
- **Impact**: Existing stations may need calltype_index_map updates

### Updating Existing Stations:
```sql
UPDATE baydetails 
SET calltype_index_map = '{"PMD":1,"Quality":1,"Store":1,"JMD":1,"Production":1}'
WHERE calltype_index_map LIKE '%0%' OR calltype_index_map LIKE '%2%';
```

## Troubleshooting

### Common Issues:

1. **Actual count not updating**:
   - Check if position 4 exists in data array
   - Verify data is numeric
   - Check device connectivity

2. **Fault detection not working**:
   - Verify position 2 contains 0 or 1
   - Check calltype_index_map configuration
   - Monitor fault state transitions

3. **Invalid data errors**:
   - Check device output format
   - Verify array length is sufficient
   - Monitor raw data logs

### Debug Commands:
```bash
# Check raw data parsing
node backend/scripts/test-data-parsing.js

# Monitor device poller logs
tail -f backend/logs/device-poller.log

# Check database updates
sqlite3 backend/database/andon_stations.db "SELECT StationName, ActualCount, isalive FROM baydetails;"
``` 