module.exports = {
  apps: [
    {
      name: 'watergb-backend',
      script: 'server.js',
      instances: 1,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'development',
        PORT: 3000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      // Prisma setup
      pre_setup: 'npx prisma generate',
      post_setup: 'npx prisma db push',
      
      // Logging
      log_file: './logs/combined.log',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      // Auto restart
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      
      // Health monitoring
      min_uptime: '10s',
      max_restarts: 10,
      
      // Environment variables
      env_file: '.env',
      
      // Graceful shutdown
      kill_timeout: 5000,
      listen_timeout: 3000,
      
      // Prisma commands
      pre_start: 'npx prisma generate && npx prisma db push',
      post_start: 'echo "Backend started successfully"',
      pre_stop: 'echo "Stopping backend..."',
      post_stop: 'echo "Backend stopped"',
      
      // Error handling
      merge_logs: true,
      time: true,
      
      // Process management
      pid_file: './pids/watergb-backend.pid',
      
      // Advanced options
      node_args: '--max-old-space-size=1024',
      
      // Health check
      health_check_grace_period: 3000,
      health_check_interval: 30000,
      
      // Prisma specific
      prisma: {
        generate: true,
        push: true,
        migrate: false // Set to true if you want to run migrations on start
      }
    }
  ],

  // Deployment configuration
  deploy: {
    production: {
      user: 'root',
      host: '217.154.244.187',
      ref: 'origin/main',
      repo: 'git@github.com:your-username/watergb.git',
      path: '/var/www/watergb',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && npx prisma generate && npx prisma db push && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    }
  }
};
