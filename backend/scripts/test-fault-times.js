const axios = require('axios');

const API_BASE_URL = 'http://localhost:5000';

async function testFaultTimeLogic() {
  console.log('🧪 Testing Fault Time Logic...\n');

  try {
    // Test 1: Create a fault
    console.log('1️⃣ Creating a fault...');
    const faultResponse = await axios.post(`${API_BASE_URL}/api/simulate-fault`, {
      stationName: 'TestStation1',
      calltype: 'Production',
      action: 'fault'
    });
    console.log('✅ Fault created:', faultResponse.data.message);
    
    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Test 2: Check station data (should show fault time)
    console.log('\n2️⃣ Checking station data after fault...');
    const stationsResponse = await axios.get(`${API_BASE_URL}/api/stations`);
    const testStation = stationsResponse.data.stations.find(s => s.stationName === 'TestStation1');
    
    if (testStation) {
      console.log('📊 Station fault data:');
      console.log('   Fault Time:', testStation.faultTime);
      console.log('   Resolved Time:', testStation.resolvedTime);
      console.log('   Fault Status:', testStation.faultStatus);
    }
    
    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Test 3: Resolve the fault
    console.log('\n3️⃣ Resolving the fault...');
    const resolveResponse = await axios.post(`${API_BASE_URL}/api/simulate-fault`, {
      stationName: 'TestStation1',
      calltype: 'Production',
      action: 'resolve'
    });
    console.log('✅ Fault resolved:', resolveResponse.data.message);
    
    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Test 4: Check station data again (should show resolved time)
    console.log('\n4️⃣ Checking station data after resolution...');
    const stationsResponse2 = await axios.get(`${API_BASE_URL}/api/stations`);
    const testStation2 = stationsResponse2.data.stations.find(s => s.stationName === 'TestStation1');
    
    if (testStation2) {
      console.log('📊 Station fault data:');
      console.log('   Fault Time:', testStation2.faultTime);
      console.log('   Resolved Time:', testStation2.resolvedTime);
      console.log('   Fault Status:', testStation2.faultStatus);
    }
    
    // Test 5: Create another fault (should update fault time)
    console.log('\n5️⃣ Creating another fault...');
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
    
    const faultResponse2 = await axios.post(`${API_BASE_URL}/api/simulate-fault`, {
      stationName: 'TestStation1',
      calltype: 'Production',
      action: 'fault'
    });
    console.log('✅ Second fault created:', faultResponse2.data.message);
    
    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Test 6: Check station data (should show new fault time)
    console.log('\n6️⃣ Checking station data after second fault...');
    const stationsResponse3 = await axios.get(`${API_BASE_URL}/api/stations`);
    const testStation3 = stationsResponse3.data.stations.find(s => s.stationName === 'TestStation1');
    
    if (testStation3) {
      console.log('📊 Station fault data:');
      console.log('   Fault Time:', testStation3.faultTime);
      console.log('   Resolved Time:', testStation3.resolvedTime);
      console.log('   Fault Status:', testStation3.faultStatus);
    }
    
    console.log('\n🎉 Fault time logic test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Run the test
testFaultTimeLogic(); 