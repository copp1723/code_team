/**
 * Logging Infrastructure
 * Provides centralized logging with multiple outputs
 */

const fs = require('fs');
const path = require('path');

class Logger {
  constructor(component = 'System') {
    this.component = component;
    this.levels = {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3
    };
    
    // Get log level from environment or default to info
    this.logLevel = process.env.LOG_LEVEL || 'info';
    this.logToFile = process.env.LOG_TO_FILE === 'true';
    this.logDirectory = process.env.LOG_DIRECTORY || './logs';
    
    // Ensure log directory exists
    if (this.logToFile) {
      this.ensureLogDirectory();
    }
  }

  ensureLogDirectory() {
    if (!fs.existsSync(this.logDirectory)) {
      fs.mkdirSync(this.logDirectory, { recursive: true });
    }
  }

  shouldLog(level) {
    return this.levels[level] <= this.levels[this.logLevel];
  }

  formatMessage(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const upperLevel = level.toUpperCase().padEnd(5);
    const component = this.component.padEnd(12);
    
    let formatted = `[${timestamp}] ${upperLevel} [${component}] ${message}`;
    
    if (data) {
      if (typeof data === 'object') {
        formatted += '\n' + JSON.stringify(data, null, 2);
      } else {
        formatted += ` ${data}`;
      }
    }
    
    return formatted;
  }

  writeToFile(level, formattedMessage) {
    if (!this.logToFile) return;

    const date = new Date().toISOString().split('T')[0];
    const fileName = `${date}.log`;
    const filePath = path.join(this.logDirectory, fileName);
    
    try {
      fs.appendFileSync(filePath, formattedMessage + '\n');
    } catch (error) {
      console.error('Failed to write to log file:', error.message);
    }
  }

  writeToConsole(level, formattedMessage) {
    const colors = {
      error: '\x1b[31m', // Red
      warn: '\x1b[33m',  // Yellow
      info: '\x1b[36m',  // Cyan
      debug: '\x1b[90m'  // Gray
    };
    
    const resetColor = '\x1b[0m';
    const coloredMessage = `${colors[level] || ''}${formattedMessage}${resetColor}`;
    
    if (level === 'error') {
      console.error(coloredMessage);
    } else if (level === 'warn') {
      console.warn(coloredMessage);
    } else {
      console.log(coloredMessage);
    }
  }

  log(level, message, data = null) {
    if (!this.shouldLog(level)) return;
    
    const formattedMessage = this.formatMessage(level, message, data);
    
    // Always write to console
    this.writeToConsole(level, formattedMessage);
    
    // Write to file if enabled
    this.writeToFile(level, formattedMessage);
  }

  error(message, data = null) {
    this.log('error', message, data);
  }

  warn(message, data = null) {
    this.log('warn', message, data);
  }

  info(message, data = null) {
    this.log('info', message, data);
  }

  debug(message, data = null) {
    this.log('debug', message, data);
  }

  // Performance timing methods
  time(label) {
    if (!this._timers) this._timers = new Map();
    this._timers.set(label, Date.now());
  }

  timeEnd(label) {
    if (!this._timers || !this._timers.has(label)) {
      this.warn(`Timer '${label}' does not exist`);
      return;
    }
    
    const duration = Date.now() - this._timers.get(label);
    this._timers.delete(label);
    this.info(`Timer '${label}': ${duration}ms`);
    return duration;
  }

  // HTTP request logging
  logRequest(req, res, duration) {
    const method = req.method;
    const url = req.url;
    const status = res.statusCode;
    const userAgent = req.get('User-Agent') || 'Unknown';
    
    const message = `${method} ${url} ${status} - ${duration}ms`;
    const data = {
      method,
      url,
      status,
      duration,
      userAgent,
      ip: req.ip || req.connection.remoteAddress
    };
    
    if (status >= 400) {
      this.warn(message, data);
    } else {
      this.info(message, data);
    }
  }

  // Create child logger with different component name
  child(component) {
    return new Logger(`${this.component}:${component}`);
  }

  // Utility method to log system status
  logSystemStatus(status) {
    this.info('System Status', {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      ...status
    });
  }
}

// Static factory methods
Logger.create = (component) => new Logger(component);

Logger.middleware = () => {
  const logger = new Logger('HTTP');
  
  return (req, res, next) => {
    const start = Date.now();
    
    res.on('finish', () => {
      const duration = Date.now() - start;
      logger.logRequest(req, res, duration);
    });
    
    next();
  };
};

module.exports = { Logger };
