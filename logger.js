const winston = require('winston');
const path = require('path');

// Create logs directory if it doesn't exist
const fs = require('fs');
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// Custom format for logs
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;
    if (Object.keys(meta).length > 0) {
      log += ` ${JSON.stringify(meta)}`;
    }
    return log;
  })
);

// Create logger instance
const logger = winston.createLogger({
  level: 'info',
  format: logFormat,
  defaultMeta: { service: 'watergb-backend' },
  transports: [
    // Write all logs to console
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    
    // Write all logs to combined.log
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    
    // Write error logs to error.log
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    
    // Write connectivity logs to connectivity.log
    new winston.transports.File({
      filename: path.join(logsDir, 'connectivity.log'),
      level: 'info',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ]
});

// Add specific logging methods for different types of events
logger.connectivity = (message, meta = {}) => {
  logger.info(`[CONNECTIVITY] ${message}`, { ...meta, type: 'connectivity' });
};

logger.request = (req, res, responseTime) => {
  const logData = {
    method: req.method,
    url: req.url,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent'),
    statusCode: res.statusCode,
    responseTime: responseTime,
    contentLength: res.get('Content-Length'),
    type: 'request'
  };
  
  if (res.statusCode >= 400) {
    logger.error(`[REQUEST] ${req.method} ${req.url} - ${res.statusCode}`, logData);
  } else {
    logger.info(`[REQUEST] ${req.method} ${req.url} - ${res.statusCode}`, logData);
  }
};

logger.database = (operation, table, duration, error = null) => {
  const logData = {
    operation,
    table,
    duration,
    type: 'database'
  };
  
  if (error) {
    logger.error(`[DATABASE] ${operation} on ${table} failed`, { ...logData, error: error.message });
  } else {
    logger.info(`[DATABASE] ${operation} on ${table} completed in ${duration}ms`, logData);
  }
};

logger.auth = (action, username, success, ip = null) => {
  const logData = {
    action,
    username,
    success,
    ip,
    type: 'authentication'
  };
  
  if (success) {
    logger.info(`[AUTH] ${action} successful for user: ${username}`, logData);
  } else {
    logger.warn(`[AUTH] ${action} failed for user: ${username}`, logData);
  }
};

logger.server = (message, meta = {}) => {
  logger.info(`[SERVER] ${message}`, { ...meta, type: 'server' });
};

logger.logError = (message, error = null, meta = {}) => {
  if (error) {
    logger.error(`[ERROR] ${message}`, { ...meta, error: error.message, stack: error.stack, type: 'error' });
  } else {
    logger.error(`[ERROR] ${message}`, { ...meta, type: 'error' });
  }
};

module.exports = logger;
