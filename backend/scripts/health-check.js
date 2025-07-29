
const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

class HealthChecker {
  constructor() {
    this.checks = [];
    this.results = {
      passed: 0,
      failed: 0,
      total: 0
    };
  }

  async runAllChecks() {
    console.log('🔍 Andon System Health Check');
    console.log('=' .repeat(50));
    console.log();

    // System checks
    await this.checkNodeVersion();
    await this.checkNpmVersion();
    await this.checkProjectStructure();
    
    // Service checks
    await this.checkExpressBackend();
    await this.checkReactFrontend();
    
    // Database checks
    await this.checkDatabase();
    await this.checkDatabaseTables();
    
    // API checks
    await this.checkAPIEndpoints();
    
    // Dependencies checks
    await this.checkBackendDependencies();
    await this.checkFrontendDependencies();

    this.printSummary();
  }

  async check(name, checkFunction) {
    try {
      const result = await checkFunction();
      if (result) {
        console.log(`✅ ${name}: OK`);
        this.results.passed++;
      } else {
        console.log(`❌ ${name}: Failed`);
        this.results.failed++;
      }
    } catch (error) {
      console.log(`❌ ${name}: Error - ${error.message}`);
      this.results.failed++;
    }
    this.results.total++;
  }

  async checkNodeVersion() {
    await this.check('Node.js Version', async () => {
      return await this.runCommand('node', ['--version']);
    });
  }

  async checkNpmVersion() {
    await this.check('npm Version', async () => {
      return await this.runCommand('npm', ['--version']);
    });
  }

  async checkProjectStructure() {
    await this.check('Project Structure', () => {
      const requiredPaths = [
        'package.json',
        'server.js',
        'models',
        'routes',
        'services',
        '../frontend/andon-dashboard/package.json',
        '../frontend/andon-dashboard/src'
      ];

      return requiredPaths.every(filePath => {
        const exists = fs.existsSync(path.join(__dirname, '..', filePath));
        if (!exists) {
          console.log(`   Missing: ${filePath}`);
        }
        return exists;
      });
    });
  }

  async checkExpressBackend() {
    await this.check('Express Backend (Port 5000)', async () => {
      return await this.checkPort(5000);
    });
  }

  async checkReactFrontend() {
    await this.check('React Frontend (Port 3000)', async () => {
      return await this.checkPort(3000);
    });
  }

  async checkDatabase() {
    await this.check('SQLite Database', () => {
      const dbPath = path.join(__dirname, '../database/andon.db');
      return fs.existsSync(dbPath);
    });
  }

  async checkDatabaseTables() {
    await this.check('Database Tables', async () => {
      try {
        const { Baydetail, DailyRecord, SectionData } = require('../models');
        
        // Try to count records in each table
        const bayCount = await Baydetail.count();
        const dailyCount = await DailyRecord.count();
        const sectionCount = await SectionData.count();
        
        console.log(`   Baydetail records: ${bayCount}`);
        console.log(`   DailyRecord records: ${dailyCount}`);
        console.log(`   SectionData records: ${sectionCount}`);
        
        return true;
      } catch (error) {
        console.log(`   Database error: ${error.message}`);
        return false;
      }
    });
  }

  async checkAPIEndpoints() {
    const endpoints = [
      { url: 'http://localhost:5000/health', name: 'Health Endpoint' },
      { url: 'http://localhost:5000/api/data/baydetail', name: 'Baydetail API' },
      { url: 'http://localhost:5000/api/data/dailyrecord', name: 'Daily Record API' },
      { url: 'http://localhost:5000/api/dashboard/summary', name: 'Dashboard API' }
    ];

    for (const endpoint of endpoints) {
      await this.check(endpoint.name, async () => {
        return await this.checkHTTPEndpoint(endpoint.url);
      });
    }
  }

  async checkBackendDependencies() {
    await this.check('Backend Dependencies', () => {
      const packagePath = path.join(__dirname, '../package.json');
      if (!fs.existsSync(packagePath)) return false;
      
      const nodeModulesPath = path.join(__dirname, '../node_modules');
      return fs.existsSync(nodeModulesPath);
    });
  }

  async checkFrontendDependencies() {
    await this.check('Frontend Dependencies', () => {
      const packagePath = path.join(__dirname, '../../frontend/andon-dashboard/package.json');
      if (!fs.existsSync(packagePath)) return false;
      
      const nodeModulesPath = path.join(__dirname, '../../frontend/andon-dashboard/node_modules');
      return fs.existsSync(nodeModulesPath);
    });
  }

  async checkPort(port) {
    return new Promise((resolve) => {
      const server = http.createServer();
      
      server.listen(port, () => {
        server.close();
        resolve(false); // Port is free (service not running)
      });
      
      server.on('error', () => {
        resolve(true); // Port is in use (service is running)
      });
    });
  }

  async checkHTTPEndpoint(url) {
    return new Promise((resolve) => {
      const urlObj = new URL(url);
      const options = {
        hostname: urlObj.hostname,
        port: urlObj.port,
        path: urlObj.pathname + urlObj.search,
        method: 'GET',
        timeout: 5000
      };

      const req = http.request(options, (res) => {
        resolve(res.statusCode === 200);
      });

      req.on('error', () => resolve(false));
      req.on('timeout', () => resolve(false));
      
      req.end();
    });
  }

  async runCommand(command, args) {
    return new Promise((resolve) => {
      const process = spawn(command, args, { stdio: 'pipe' });
      
      process.on('close', (code) => {
        resolve(code === 0);
      });
      
      process.on('error', () => {
        resolve(false);
      });
    });
  }

  printSummary() {
    console.log();
    console.log('📊 Health Check Summary');
    console.log('=' .repeat(30));
    console.log(`Total Checks: ${this.results.total}`);
    console.log(`✅ Passed: ${this.results.passed}`);
    console.log(`❌ Failed: ${this.results.failed}`);
    
    const percentage = Math.round((this.results.passed / this.results.total) * 100);
    console.log(`📈 Success Rate: ${percentage}%`);
    
    if (this.results.failed === 0) {
      console.log();
      console.log('🎉 All checks passed! Your Andon system is healthy.');
    } else {
      console.log();
      console.log('⚠️  Some issues found. Please address the failed checks above.');
      console.log();
      console.log('🔧 Common fixes:');
      console.log('   - Start missing services with start-all.bat');
      console.log('   - Run setup.bat if database is missing');
      console.log('   - Install dependencies with npm install');
      console.log('   - Check firewall settings for port access');
    }
  }
}

// Run health check if called directly
if (require.main === module) {
  const checker = new HealthChecker();
  checker.runAllChecks()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Health check failed:', error);
      process.exit(1);
    });
}

module.exports = HealthChecker;