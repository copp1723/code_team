/**
 * Environment Configuration Manager
 * Handles environment-specific settings and validation
 */

const path = require('path');
const fs = require('fs');

class Environment {
  constructor() {
    this.env = process.env.NODE_ENV || 'development';
    this.config = this.loadConfig();
  }

  loadConfig() {
    const baseConfig = {
      // API Configuration
      openrouter: {
        apiKey: process.env.OPENROUTER_API_KEY,
        baseUrl: 'https://openrouter.ai/api/v1',
        timeout: 30000,
      },

      // Supermemory Configuration
      supermemory: {
        apiKey: process.env.SUPERMEMORY_API_KEY,
        baseUrl: 'https://api.supermemory.ai',
        enabled: !!process.env.SUPERMEMORY_API_KEY,
      },

      // Project Configuration
      project: {
        path: process.env.PROJECT_PATH || '../test-project',
        masterBranch: process.env.MASTER_BRANCH || 'main',
        gitRemoteUrl: process.env.GIT_REMOTE_URL,
      },

      // Agent Configuration
      agents: {
        maxConcurrent: parseInt(process.env.MAX_CONCURRENT_AGENTS) || 3,
        syncInterval: process.env.SYNC_INTERVAL || '30m',
        models: {
          frontend: process.env.AI_MODEL_FRONTEND || 'anthropic/claude-3-sonnet-20240229',
          backend: process.env.AI_MODEL_BACKEND || 'openai/gpt-4-turbo-preview',
          database: process.env.AI_MODEL_DATABASE || 'anthropic/claude-3-opus-20240229',
        },
      },

      // Resource Limits
      limits: {
        maxTokensPerHour: parseInt(process.env.MAX_TOKENS_PER_HOUR) || 100000,
        maxCostPerDay: parseFloat(process.env.MAX_COST_PER_DAY) || 50.00,
      },

      // Web Interface
      web: {
        port: parseInt(process.env.WEB_PORT) || 8080,
        enableWebSocket: process.env.ENABLE_WEBSOCKET === 'true',
        host: process.env.WEB_HOST || 'localhost',
      },

      // Logging
      logging: {
        level: process.env.LOG_LEVEL || 'info',
        toFile: process.env.LOG_TO_FILE === 'true',
        directory: process.env.LOG_DIRECTORY || './logs',
      },

      // Security
      security: {
        corsOrigins: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : ['http://localhost:3000'],
        rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW) || 15 * 60 * 1000, // 15 minutes
        rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX) || 100,
      },
    };

    // Environment-specific overrides
    const envConfig = this.getEnvironmentConfig();
    return { ...baseConfig, ...envConfig };
  }

  getEnvironmentConfig() {
    switch (this.env) {
      case 'development':
        return {
          logging: { level: 'debug' },
          web: { 
            port: 8080,
            enableWebSocket: true,
          },
        };

      case 'production':
        return {
          logging: { 
            level: 'info',
            toFile: true,
          },
          web: {
            port: process.env.PORT || 3000,
            enableWebSocket: true,
          },
          security: {
            rateLimitWindow: 10 * 60 * 1000, // 10 minutes
            rateLimitMax: 50,
          },
        };

      case 'test':
        return {
          logging: { level: 'error' },
          web: { port: 0 }, // Random port for testing
          agents: { maxConcurrent: 1 },
        };

      default:
        return {};
    }
  }

  validate() {
    const errors = [];

    // Check required API keys
    if (!this.config.openrouter.apiKey) {
      errors.push('OPENROUTER_API_KEY is required');
    }

    // Check project path exists
    if (!fs.existsSync(this.config.project.path)) {
      errors.push(`Project path does not exist: ${this.config.project.path}`);
    }

    // Validate numeric values
    if (isNaN(this.config.agents.maxConcurrent) || this.config.agents.maxConcurrent < 1) {
      errors.push('MAX_CONCURRENT_AGENTS must be a positive number');
    }

    if (isNaN(this.config.web.port) || this.config.web.port < 1 || this.config.web.port > 65535) {
      errors.push('WEB_PORT must be a valid port number (1-65535)');
    }

    return errors;
  }

  get(key) {
    return key.split('.').reduce((obj, prop) => obj && obj[prop], this.config);
  }

  set(key, value) {
    const keys = key.split('.');
    const lastKey = keys.pop();
    const target = keys.reduce((obj, prop) => {
      if (!obj[prop]) obj[prop] = {};
      return obj[prop];
    }, this.config);
    target[lastKey] = value;
  }

  isDevelopment() {
    return this.env === 'development';
  }

  isProduction() {
    return this.env === 'production';
  }

  isTest() {
    return this.env === 'test';
  }

  getConfig() {
    return this.config;
  }
}

module.exports = new Environment();
