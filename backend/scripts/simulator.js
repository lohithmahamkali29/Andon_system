const mqtt = require('mqtt');
const moment = require('moment');

class MQTTStationSimulator {
  constructor(stationId, brokerUrl = 'mqtt://localhost:1883') {
    this.stationId = stationId;
    this.topic = `esp32/${stationId}`;
    this.brokerUrl = brokerUrl;
    
    // Initialize button states - all start as 1 (normal)
    this.buttons = Array(8).fill(null).map(() => ({ state: 1, count: 0 }));
    
    this.client = null;
    this.running = false;
    this.publishInterval = null;
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.client = mqtt.connect(this.brokerUrl, {
        clientId: `station_${this.stationId}_simulator`,
        clean: true
      });

      this.client.on('connect', () => {
        console.log(`✅ Station ${this.stationId} simulator connected`);
        resolve();
      });

      this.client.on('error', (error) => {
        console.error(`❌ Station ${this.stationId} simulator error:`, error);
        reject(error);
      });
    });
  }

  constructMessage() {
    const messageParts = [];
    this.buttons.forEach(button => {
      messageParts.push(button.state.toString(), button.count.toString());
    });
    return `{${messageParts.join(',')}}`;
  }

  simulateButtonPress(buttonIndex) {
    const button = this.buttons[buttonIndex];
    button.state = 1 - button.state; // Toggle between 0 and 1
    button.count += 1;
    
    const buttonNames = {
      0: 'Button1',
      1: 'ActualCount',
      2: 'Production',
      3: 'Maintenance',
      4: 'Button5',
      5: 'Store',
      6: 'Quality',
      7: 'Button8'
    };
    
    const state = button.state === 0 ? 'FAULT' : 'RESOLVED';
    console.log(`🔲 Station ${this.stationId}: ${buttonNames[buttonIndex]} - ${state} (Count: ${button.count})`);
  }

  simulateProductionCount() {
    // Randomly increase production count (button 2, index 1)
    if (Math.random() < 0.3) { // 30% chance
      this.buttons[1].count += Math.floor(Math.random() * 3) + 1;
    }
  }

  simulateRandomFaults() {
    // Critical buttons: 2, 3, 5, 6 (Production, Maintenance, Store, Quality)
    const criticalButtons = [2, 3, 5, 6];
    
    criticalButtons.forEach(buttonIdx => {
      if (Math.random() < 0.02) { // 2% chance per cycle
        this.simulateButtonPress(buttonIdx);
      }
    });
  }

  publishMessage() {
    if (!this.client || !this.client.connected) {
      console.warn(`⚠️ Station ${this.stationId}: MQTT client not connected`);
      return;
    }

    const message = this.constructMessage();
    this.client.publish(this.topic, message, (err) => {
      if (err) {
        console.error(`❌ Station ${this.stationId}: Failed to publish message`, err);
      } else {
        console.log(`📤 Station ${this.stationId}: ${message}`);
      }
    });
  }

  start() {
    if (this.running) return;
    
    this.running = true;
    this.publishInterval = setInterval(() => {
      this.simulateProductionCount();
      this.simulateRandomFaults();
      this.publishMessage();
    }, Math.random() * 10000 + 5000); // 5-15 seconds

    console.log(`🚀 Station ${this.stationId} simulator started`);
  }

  stop() {
    this.running = false;
    if (this.publishInterval) {
      clearInterval(this.publishInterval);
      this.publishInterval = null;
    }
    
    if (this.client) {
      this.client.end();
    }
    
    console.log(`🛑 Station ${this.stationId} simulator stopped`);
  }

  // Manual fault creation for testing
  createFault(callType) {
    const callTypeMapping = {
      'production': 2,
      'maintenance': 3,
      'store': 5,
      'quality': 6
    };
    
    const buttonIdx = callTypeMapping[callType.toLowerCase()];
    if (buttonIdx !== undefined) {
      // Only create fault if not already in fault state
      if (this.buttons[buttonIdx].state === 1) {
        this.simulateButtonPress(buttonIdx);
        this.publishMessage();
      }
    }
  }

  resolveFault(callType) {
    const callTypeMapping = {
      'production': 2,
      'maintenance': 3,
      'store': 5,
      'quality': 6
    };
    
    const buttonIdx = callTypeMapping[callType.toLowerCase()];
    if (buttonIdx !== undefined) {
      // Only resolve if currently in fault state
      if (this.buttons[buttonIdx].state === 0) {
        this.simulateButtonPress(buttonIdx);
        this.publishMessage();
      }
    }
  }
}

class MQTTSimulatorManager {
  constructor(numStations = 18, brokerUrl = 'mqtt://localhost:1883') {
    this.numStations = numStations;
    this.brokerUrl = brokerUrl;
    this.simulators = [];
  }

  async startAll() {
    console.log(`🚀 Starting ${this.numStations} station simulators...\n`);
    
    for (let i = 1; i <= this.numStations; i++) {
      try {
        const simulator = new MQTTStationSimulator(i, this.brokerUrl);
        await simulator.connect();
        simulator.start();
        this.simulators.push(simulator);
        
        // Small delay between starts
        await new Promise(resolve => setTimeout(resolve, 200));
        
      } catch (error) {
        console.error(`❌ Failed to start simulator for station ${i}:`, error);
      }
    }
    
    console.log(`\n✅ All ${this.simulators.length} simulators started!`);
  }

  stopAll() {
    console.log('\n🛑 Stopping all simulators...');
    
    this.simulators.forEach(simulator => simulator.stop());
    this.simulators = [];
    
    console.log('✅ All simulators stopped!');
  }

  createTestFault(stationId, callType) {
    const simulator = this.simulators.find(s => s.stationId === stationId);
    if (simulator) {
      simulator.createFault(callType);
    } else {
      console.warn(`⚠️ Simulator for station ${stationId} not found`);
    }
  }

  resolveTestFault(stationId, callType) {
    const simulator = this.simulators.find(s => s.stationId === stationId);
    if (simulator) {
      simulator.resolveFault(callType);
    } else {
      console.warn(`⚠️ Simulator for station ${stationId} not found`);
    }
  }

  async runDemo() {
    console.log('\n🎭 Running demo mode...\n');
    
    await this.startAll();
    
    // Wait for initial setup
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Create some demo faults
    const demoFaults = [
      { station: 1, callType: 'production' },
      { station: 3, callType: 'maintenance' },
      { station: 5, callType: 'quality' },
      { station: 7, callType: 'store' }
    ];
    
    console.log('🚨 Creating demo faults...');
    for (const fault of demoFaults) {
      this.createTestFault(fault.station, fault.callType);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    // Resolve some faults after 30 seconds
    setTimeout(() => {
      console.log('✅ Resolving some demo faults...');
      demoFaults.slice(0, 2).forEach(fault => {
        this.resolveTestFault(fault.station, fault.callType);
      });
    }, 30000);
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const numStations = parseInt(args.find(arg => arg.startsWith('--stations='))?.split('=')[1]) || 18;
  const brokerUrl = args.find(arg => arg.startsWith('--broker='))?.split('=')[1] || 'mqtt://localhost:1883';
  const demoMode = args.includes('--demo');
  
  const manager = new MQTTSimulatorManager(numStations, brokerUrl);
  
  try {
    if (demoMode) {
      await manager.runDemo();
    } else {
      await manager.startAll();
    }
    
    console.log('\n📋 Simulator running... Press Ctrl+C to stop\n');
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n🛑 Shutting down simulators...');
      manager.stopAll();
      process.exit(0);
    });
    
    // Keep running
    await new Promise(() => {});
    
  } catch (error) {
    console.error('❌ Error running simulator:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}