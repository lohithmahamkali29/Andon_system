// Test script for 8-bit data array parsing
// Simulates the data format: {1,4061,1,6010,0,0,0,0}

function testDataParsing() {
  console.log('🧪 Testing 8-bit Data Array Parsing...\n');

  // Test data arrays
  const testArrays = [
    '{1,4061,1,6010,0,0,0,0}',  // Normal case
    '{1,0,1,5000,0,0,0,0}',     // Fault case (position 2 = 0)
    '{1,1,1,7500,0,0,0,0}',     // No fault case (position 2 = 1)
    '{1,4061,1,6010}',          // Shorter array
    '{1,4061,1}',               // Very short array
    '{}'                        // Empty array
  ];

  testArrays.forEach((testData, index) => {
    console.log(`\n${index + 1}. Testing: ${testData}`);
    
    // Parse the data (same logic as devicePoller.js)
    const raw = testData.trim();
    const arr = raw.replace(/[{}]/g, '').split(',').map(Number);
    
    console.log(`   Parsed array: [${arr.join(',')}]`);
    console.log(`   Array length: ${arr.length}`);
    
    // Get actual count from 4th position (index 3)
    const actualCount = arr.length > 3 ? arr[3] : undefined;
    console.log(`   Actual Count (position 4): ${actualCount}`);
    
    // Get fault status from 2nd position (index 1)
    const faultValue = arr.length > 1 ? arr[1] : undefined;
    console.log(`   Fault Status (position 2): ${faultValue} (${faultValue === 0 ? 'FAULT' : faultValue === 1 ? 'OK' : 'UNKNOWN'})`);
    
    // Validate data
    if (typeof actualCount === 'number' && !isNaN(actualCount)) {
      console.log(`   ✅ Valid actual count: ${actualCount}`);
    } else {
      console.log(`   ❌ Invalid actual count: ${actualCount}`);
    }
    
    if (typeof faultValue === 'number' && (faultValue === 0 || faultValue === 1)) {
      console.log(`   ✅ Valid fault status: ${faultValue}`);
    } else {
      console.log(`   ❌ Invalid fault status: ${faultValue}`);
    }
  });

  console.log('\n📋 Summary:');
  console.log('- Position 1 (index 0): First value');
  console.log('- Position 2 (index 1): Fault detection (0=fault, 1=ok)');
  console.log('- Position 3 (index 2): Third value');
  console.log('- Position 4 (index 3): Actual count');
  console.log('- Positions 5-8 (index 4-7): Additional data');
}

// Run the test
testDataParsing(); 