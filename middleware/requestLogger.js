const logger = require('../logger');

// Request logging middleware
const requestLogger = (req, res, next) => {
  const startTime = Date.now();
  
  // Log incoming request
  logger.connectivity(`Incoming request: ${req.method} ${req.url}`, {
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent'),
    origin: req.get('Origin'),
    referer: req.get('Referer')
  });

  // Override res.end to capture response details
  const originalEnd = res.end;
  res.end = function(chunk, encoding) {
    const responseTime = Date.now() - startTime;
    
    // Log the request with response details
    logger.request(req, res, responseTime);
    
    // Call the original end method
    originalEnd.call(this, chunk, encoding);
  };

  next();
};

// Error logging middleware
const errorLogger = (err, req, res, next) => {
  logger.error(`Request error: ${req.method} ${req.url}`, err, {
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent'),
    body: req.body,
    query: req.query,
    params: req.params
  });
  
  next(err);
};

// CORS error logging
const corsErrorLogger = (req, res, next) => {
  const origin = req.get('Origin');
  const allowedOrigins = [
    'http://localhost:3000',
    'http://192.168.0.103:3000',
    'http://217.154.244.187:3000',
    'http://localhost:19006',
    'exp://192.168.0.103:19000',
    'exp://217.154.244.187:19000'
  ];

  if (origin && !allowedOrigins.includes(origin)) {
    logger.warn(`CORS blocked request from origin: ${origin}`, {
      origin,
      allowedOrigins,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent')
    });
  }

  next();
};

module.exports = {
  requestLogger,
  errorLogger,
  corsErrorLogger
};
