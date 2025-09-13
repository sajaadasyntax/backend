#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class PM2Manager {
  constructor() {
    this.appName = 'watergb-backend';
    this.ecosystemFile = 'ecosystem.config.js';
  }

  // Check if PM2 is installed
  checkPM2() {
    try {
      execSync('pm2 --version', { stdio: 'ignore' });
      return true;
    } catch (error) {
      console.error('❌ PM2 is not installed. Please install it first:');
      console.error('npm install -g pm2');
      return false;
    }
  }

  // Check if Prisma is available
  checkPrisma() {
    try {
      execSync('npx prisma --version', { stdio: 'ignore' });
      return true;
    } catch (error) {
      console.error('❌ Prisma is not available. Please install dependencies:');
      console.error('npm install');
      return false;
    }
  }

  // Generate Prisma client
  generatePrisma() {
    console.log('🔄 Generating Prisma client...');
    try {
      execSync('npx prisma generate', { stdio: 'inherit' });
      console.log('✅ Prisma client generated successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to generate Prisma client:', error.message);
      return false;
    }
  }

  // Push database schema
  pushDatabase() {
    console.log('🔄 Pushing database schema...');
    try {
      execSync('npx prisma db push', { stdio: 'inherit' });
      console.log('✅ Database schema pushed successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to push database schema:', error.message);
      return false;
    }
  }

  // Create necessary directories
  createDirectories() {
    const dirs = ['logs', 'pids'];
    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`📁 Created directory: ${dir}`);
      }
    });
  }

  // Start the application
  start() {
    console.log('🚀 Starting WaterGB Backend...');
    
    if (!this.checkPM2()) return false;
    if (!this.checkPrisma()) return false;
    
    this.createDirectories();
    
    if (!this.generatePrisma()) return false;
    if (!this.pushDatabase()) return false;
    
    try {
      execSync(`pm2 start ${this.ecosystemFile}`, { stdio: 'inherit' });
      console.log('✅ Backend started successfully');
      this.showStatus();
      return true;
    } catch (error) {
      console.error('❌ Failed to start backend:', error.message);
      return false;
    }
  }

  // Stop the application
  stop() {
    console.log('🛑 Stopping WaterGB Backend...');
    try {
      execSync(`pm2 stop ${this.appName}`, { stdio: 'inherit' });
      console.log('✅ Backend stopped successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to stop backend:', error.message);
      return false;
    }
  }

  // Restart the application
  restart() {
    console.log('🔄 Restarting WaterGB Backend...');
    try {
      execSync(`pm2 restart ${this.appName}`, { stdio: 'inherit' });
      console.log('✅ Backend restarted successfully');
      this.showStatus();
      return true;
    } catch (error) {
      console.error('❌ Failed to restart backend:', error.message);
      return false;
    }
  }

  // Reload the application (zero-downtime)
  reload() {
    console.log('🔄 Reloading WaterGB Backend...');
    try {
      execSync(`pm2 reload ${this.appName}`, { stdio: 'inherit' });
      console.log('✅ Backend reloaded successfully');
      this.showStatus();
      return true;
    } catch (error) {
      console.error('❌ Failed to reload backend:', error.message);
      return false;
    }
  }

  // Show application status
  showStatus() {
    console.log('\n📊 Application Status:');
    try {
      execSync('pm2 status', { stdio: 'inherit' });
    } catch (error) {
      console.error('❌ Failed to get status:', error.message);
    }
  }

  // Show logs
  showLogs(lines = 50) {
    console.log(`\n📋 Showing last ${lines} lines of logs:`);
    try {
      execSync(`pm2 logs ${this.appName} --lines ${lines}`, { stdio: 'inherit' });
    } catch (error) {
      console.error('❌ Failed to show logs:', error.message);
    }
  }

  // Monitor application
  monitor() {
    console.log('📊 Starting PM2 monitoring...');
    try {
      execSync('pm2 monit', { stdio: 'inherit' });
    } catch (error) {
      console.error('❌ Failed to start monitoring:', error.message);
    }
  }

  // Delete application from PM2
  delete() {
    console.log('🗑️  Deleting WaterGB Backend from PM2...');
    try {
      execSync(`pm2 delete ${this.appName}`, { stdio: 'inherit' });
      console.log('✅ Backend deleted from PM2');
      return true;
    } catch (error) {
      console.error('❌ Failed to delete backend:', error.message);
      return false;
    }
  }

  // Setup PM2 startup script
  setupStartup() {
    console.log('🔧 Setting up PM2 startup script...');
    try {
      execSync('pm2 startup', { stdio: 'inherit' });
      execSync(`pm2 save`, { stdio: 'inherit' });
      console.log('✅ PM2 startup script configured');
      return true;
    } catch (error) {
      console.error('❌ Failed to setup startup script:', error.message);
      return false;
    }
  }

  // Database operations
  migrate() {
    console.log('🔄 Running database migrations...');
    try {
      execSync('npx prisma migrate dev', { stdio: 'inherit' });
      console.log('✅ Database migrations completed');
      return true;
    } catch (error) {
      console.error('❌ Failed to run migrations:', error.message);
      return false;
    }
  }

  reset() {
    console.log('🔄 Resetting database...');
    try {
      execSync('npx prisma migrate reset --force', { stdio: 'inherit' });
      console.log('✅ Database reset completed');
      return true;
    } catch (error) {
      console.error('❌ Failed to reset database:', error.message);
      return false;
    }
  }

  // Seed database
  seed() {
    console.log('🌱 Seeding database...');
    try {
      execSync('node seed.js', { stdio: 'inherit' });
      console.log('✅ Database seeded successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to seed database:', error.message);
      return false;
    }
  }
}

// CLI interface
const manager = new PM2Manager();
const command = process.argv[2];

switch (command) {
  case 'start':
    manager.start();
    break;
  case 'stop':
    manager.stop();
    break;
  case 'restart':
    manager.restart();
    break;
  case 'reload':
    manager.reload();
    break;
  case 'status':
    manager.showStatus();
    break;
  case 'logs':
    const lines = parseInt(process.argv[3]) || 50;
    manager.showLogs(lines);
    break;
  case 'monitor':
    manager.monitor();
    break;
  case 'delete':
    manager.delete();
    break;
  case 'setup':
    manager.setupStartup();
    break;
  case 'migrate':
    manager.migrate();
    break;
  case 'reset':
    manager.reset();
    break;
  case 'seed':
    manager.seed();
    break;
  case 'deploy':
    console.log('🚀 Deploying to production...');
    manager.stop();
    manager.generatePrisma();
    manager.pushDatabase();
    manager.start();
    break;
  default:
    console.log(`
🌊 WaterGB Backend PM2 Manager

Usage: node pm2-manager.js <command>

Commands:
  start     - Start the backend application
  stop      - Stop the backend application
  restart   - Restart the backend application
  reload    - Reload the backend application (zero-downtime)
  status    - Show application status
  logs      - Show application logs (optional: number of lines)
  monitor   - Open PM2 monitoring interface
  delete    - Delete application from PM2
  setup     - Setup PM2 startup script
  migrate   - Run database migrations
  reset     - Reset database
  seed      - Seed database with initial data
  deploy    - Deploy to production

Examples:
  node pm2-manager.js start
  node pm2-manager.js logs 100
  node pm2-manager.js restart
    `);
}
