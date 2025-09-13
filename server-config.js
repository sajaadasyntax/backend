// Server Configuration for 217.154.244.187
// This file contains configuration for deploying to the server

module.exports = {
  // Database Configuration
  // Update these with your actual database credentials
  DATABASE_URL: "postgresql://username:password@217.154.244.187:5432/watergb_db?schema=public",
  DIRECT_URL: "postgresql://username:password@217.154.244.187:5432/watergb_db?schema=public&pgbouncer=true&connect_timeout=15",
  
  // JWT Secret (use a strong secret in production)
  JWT_SECRET: "your-super-secret-jwt-key-for-production-change-this",
  
  // Server Configuration
  PORT: 3000,
  HOST: "0.0.0.0",
  
  // Environment
  NODE_ENV: "production",
  
  // CORS Origins
  CORS_ORIGINS: [
    'http://localhost:3000',
    'http://192.168.0.103:3000',
    'http://217.154.244.187:3000',
    'https://gwsudan.xyz',
    'http://gwsudan.xyz',
    'http://localhost:19006',
    'exp://192.168.0.103:19000',
    'exp://217.154.244.187:19000',
    'exp://gwsudan.xyz:19000',
    // Admin Panel URLs
    'http://localhost:3001',
    'https://admin.gwsudan.xyz',
    'http://admin.gwsudan.xyz',
    // Vercel Admin Panel URLs
    'https://admin-panel-oucm96sgv-sajaaads-projects.vercel.app',
    'https://admin-panel-oucm96sgv-sajaaads-projects.vercel.app/',
    // Wildcard for all Vercel deployments
    'https://*.vercel.app'
  ]
};
