#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Log monitoring script for WaterGB Backend
// This script monitors log files and provides real-time insights

const LOGS_DIR = path.join(__dirname, 'logs');
const LOG_FILES = {
  combined: path.join(LOGS_DIR, 'combined.log'),
  error: path.join(LOGS_DIR, 'error.log'),
  connectivity: path.join(LOGS_DIR, 'connectivity.log')
};

class LogMonitor {
  constructor() {
    this.watchers = new Map();
    this.stats = {
      totalRequests: 0,
      errorRequests: 0,
      authAttempts: 0,
      authSuccesses: 0,
      databaseOperations: 0,
      connectivityIssues: 0,
      lastActivity: null
    };
  }

  start() {
    console.log('🔍 WaterGB Log Monitor Started');
    console.log('================================');
    console.log(`📁 Monitoring logs in: ${LOGS_DIR}`);
    console.log('');

    // Check if logs directory exists
    if (!fs.existsSync(LOGS_DIR)) {
      console.log('❌ Logs directory not found. Creating...');
      fs.mkdirSync(LOGS_DIR, { recursive: true });
    }

    // Monitor each log file
    Object.entries(LOG_FILES).forEach(([name, filePath]) => {
      this.watchLogFile(name, filePath);
    });

    // Display stats every 30 seconds
    setInterval(() => {
      this.displayStats();
    }, 30000);

    // Initial stats display
    this.displayStats();
  }

  watchLogFile(name, filePath) {
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  Log file not found: ${name}.log`);
      return;
    }

    console.log(`👀 Watching: ${name}.log`);

    // Watch for file changes
    const watcher = fs.watchFile(filePath, { interval: 1000 }, (curr, prev) => {
      if (curr.mtime > prev.mtime) {
        this.processNewLogs(name, filePath);
      }
    });

    this.watchers.set(name, watcher);
  }

  processNewLogs(name, filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n').filter(line => line.trim());
      
      // Process only new lines (this is simplified - in production you'd track position)
      lines.forEach(line => {
        this.analyzeLogLine(line, name);
      });
    } catch (error) {
      console.error(`Error reading ${name}.log:`, error.message);
    }
  }

  analyzeLogLine(line, logType) {
    try {
      const log = JSON.parse(line);
      this.updateStats(log, logType);
    } catch (error) {
      // Handle non-JSON logs
      if (line.includes('REQUEST') || line.includes('API')) {
        this.stats.totalRequests++;
      }
      if (line.includes('ERROR') || line.includes('error')) {
        this.stats.errorRequests++;
      }
    }
  }

  updateStats(log, logType) {
    this.stats.lastActivity = new Date().toISOString();

    // Count requests
    if (log.type === 'request') {
      this.stats.totalRequests++;
      if (log.statusCode >= 400) {
        this.stats.errorRequests++;
      }
    }

    // Count authentication events
    if (log.type === 'authentication') {
      this.stats.authAttempts++;
      if (log.success) {
        this.stats.authSuccesses++;
      }
    }

    // Count database operations
    if (log.type === 'database') {
      this.stats.databaseOperations++;
    }

    // Count connectivity issues
    if (log.type === 'connectivity' && log.level === 'error') {
      this.stats.connectivityIssues++;
    }
  }

  displayStats() {
    console.clear();
    console.log('📊 WaterGB Backend Statistics');
    console.log('============================');
    console.log(`🕐 Last Activity: ${this.stats.lastActivity || 'None'}`);
    console.log('');
    console.log('📈 Request Statistics:');
    console.log(`   Total Requests: ${this.stats.totalRequests}`);
    console.log(`   Error Requests: ${this.stats.errorRequests}`);
    console.log(`   Success Rate: ${this.calculateSuccessRate()}%`);
    console.log('');
    console.log('🔐 Authentication Statistics:');
    console.log(`   Total Attempts: ${this.stats.authAttempts}`);
    console.log(`   Successful: ${this.stats.authSuccesses}`);
    console.log(`   Success Rate: ${this.calculateAuthSuccessRate()}%`);
    console.log('');
    console.log('🗄️  Database Statistics:');
    console.log(`   Operations: ${this.stats.databaseOperations}`);
    console.log('');
    console.log('🌐 Connectivity Statistics:');
    console.log(`   Issues: ${this.stats.connectivityIssues}`);
    console.log('');
    console.log('📁 Log Files:');
    Object.entries(LOG_FILES).forEach(([name, filePath]) => {
      const exists = fs.existsSync(filePath);
      const size = exists ? this.getFileSize(filePath) : 'N/A';
      console.log(`   ${name}.log: ${exists ? '✅' : '❌'} (${size})`);
    });
    console.log('');
    console.log('Press Ctrl+C to stop monitoring');
  }

  calculateSuccessRate() {
    if (this.stats.totalRequests === 0) return 0;
    return Math.round(((this.stats.totalRequests - this.stats.errorRequests) / this.stats.totalRequests) * 100);
  }

  calculateAuthSuccessRate() {
    if (this.stats.authAttempts === 0) return 0;
    return Math.round((this.stats.authSuccesses / this.stats.authAttempts) * 100);
  }

  getFileSize(filePath) {
    try {
      const stats = fs.statSync(filePath);
      const bytes = stats.size;
      if (bytes === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    } catch (error) {
      return 'Error';
    }
  }

  stop() {
    console.log('\n🛑 Stopping log monitor...');
    this.watchers.forEach((watcher, name) => {
      fs.unwatchFile(LOG_FILES[name]);
    });
    this.watchers.clear();
    console.log('✅ Log monitor stopped');
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  monitor.stop();
  process.exit(0);
});

// Start monitoring
const monitor = new LogMonitor();
monitor.start();
