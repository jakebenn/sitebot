class Logger {
  constructor() {
    this.logLevel = process.env.LOG_LEVEL || 'info';
    this.levels = { error: 0, warn: 1, info: 2, debug: 3 };
  }

  log(level, message, meta = {}) {
    if (this.levels[level] > this.levels[this.logLevel]) {
      return;
    }

    const logEntry = {
      timestamp: new Date().toISOString(),
      level: level.toUpperCase(),
      message,
      service: 'generic-chatbot',
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      ...meta
    };

    console.log(JSON.stringify(logEntry));
  }

  error(message, meta = {}) {
    this.log('error', message, meta);
  }

  warn(message, meta = {}) {
    this.log('warn', message, meta);
  }

  info(message, meta = {}) {
    this.log('info', message, meta);
  }

  debug(message, meta = {}) {
    this.log('debug', message, meta);
  }
}

module.exports = new Logger();
