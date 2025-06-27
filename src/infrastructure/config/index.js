/**
 * Configuration Management
 * Handles loading and validation of configuration
 */

const fs = require('fs');
const path = require('path');

class Configuration {
  constructor() {
    this.config = null;
    this.loaded = false;
  }

  static async load(configPath = null) {
    const instance = new Configuration();
    await instance.loadConfig(configPath);
    return instance;
  }

  async loadConfig(configPath = null) {
    // Load environment variables
    require('dotenv').config();

    // Determine config file path
    const defaultConfigPath = path.join(process.cwd(), 'config', 'orchestrator.json');
    const finalConfigPath = configPath || defaultConfigPath;

    // Load base configuration
    let fileConfig = {};
    if (fs.existsSync(finalConfigPath)) {
      try {
        fileConfig = JSON.parse(fs.readFileSync(finalConfigPath, 'utf8'));
      } catch (error) {
        console.warn(`Warning: Could not load config file ${finalConfigPath}:`, error.message);
      }
    }

    // Build configuration with environment variables taking precedence
    this.config = {
      // Orchestration settings
      orchestration: {
        maxConcurrentAgents: parseInt(process.env.MAX_CONCURRENT_AGENTS) || fileConfig.orchestration?.maxConcurrentAgents || 3,
        syncInterval: this.parseInterval(process.env.SYNC_INTERVAL) || fileConfig.orchestration?.syncInterval || 30000,
        autoSync: process.env.AUTO_SYNC !== 'false',
        ...fileConfig.orchestration
      },

      // Agent settings
      agents: {
        maxAgents: parseInt(process.env.MAX_AGENTS) || fileConfig.agents?.maxAgents || 10,
        heartbeatInterval: this.parseInterval(process.env.HEARTBEAT_INTERVAL) || fileConfig.agents?.heartbeatInterval || 30000,
        defaultCapabilities: process.env.DEFAULT_CAPABILITIES?.split(',') || fileConfig.agents?.defaultCapabilities || ['general'],
        ...fileConfig.agents
      },

      // API Configuration
      api: {
        openrouter: {
          apiKey: process.env.OPENROUTER_API_KEY,
          baseUrl: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
          timeout: parseInt(process.env.API_TIMEOUT) || 30000,
        },
        supermemory: {
          apiKey: process.env.SUPERMEMORY_API_KEY,
          baseUrl: process.env.SUPERMEMORY_BASE_URL || 'https://api.supermemory.ai',
          enabled: !!process.env.SUPERMEMORY_API_KEY,
        },
        ...fileConfig.api
      },

      // Project settings
      project: {
        path: process.env.PROJECT_PATH || fileConfig.project?.path || '../test-project',
        masterBranch: process.env.MASTER_BRANCH || fileConfig.project?.masterBranch || 'main',
        gitRemoteUrl: process.env.GIT_REMOTE_URL || fileConfig.project?.gitRemoteUrl,
        ...fileConfig.project
      },

      // AI Model Configuration
      models: {
        frontend: process.env.AI_MODEL_FRONTEND || fileConfig.models?.frontend || 'anthropic/claude-3-sonnet-20240229',
        backend: process.env.AI_MODEL_BACKEND || fileConfig.models?.backend || 'openai/gpt-4-turbo-preview',
        database: process.env.AI_MODEL_DATABASE || fileConfig.models?.database || 'anthropic/claude-3-opus-20240229',
        ...fileConfig.models
      },

      // Resource limits
      limits: {
        maxTokensPerHour: parseInt(process.env.MAX_TOKENS_PER_HOUR) || fileConfig.limits?.maxTokensPerHour || 100000,
        maxCostPerDay: parseFloat(process.env.MAX_COST_PER_DAY) || fileConfig.limits?.maxCostPerDay || 50.00,
        ...fileConfig.limits
      },

      // Web interface
      web: {
        port: parseInt(process.env.WEB_PORT) || fileConfig.web?.port || 8080,
        host: process.env.WEB_HOST || fileConfig.web?.host || 'localhost',
        enableWebSocket: process.env.ENABLE_WEBSOCKET !== 'false',
        ...fileConfig.web
      },

      // Logging
      logging: {
        level: process.env.LOG_LEVEL || fileConfig.logging?.level || 'info',
        toFile: process.env.LOG_TO_FILE === 'true',
        directory: process.env.LOG_DIRECTORY || fileConfig.logging?.directory || './logs',
        ...fileConfig.logging
      },

      // Security
      security: {
        corsOrigins: process.env.CORS_ORIGINS?.split(',') || fileConfig.security?.corsOrigins || ['http://localhost:3000'],
        rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW) || fileConfig.security?.rateLimitWindow || 15 * 60 * 1000,
        rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX) || fileConfig.security?.rateLimitMax || 100,
        ...fileConfig.security
      }
    };

    // Validate configuration
    this.validate();
    this.loaded = true;

    console.log('✅ Configuration loaded successfully');
    return this.config;
  }

  parseInterval(intervalString) {
    if (!intervalString) return null;
    
    const match = intervalString.match(/^(\d+)([smh])$/);
    if (!match) return null;

    const [, value, unit] = match;
    const multipliers = { s: 1000, m: 60000, h: 3600000 };
    return parseInt(value) * multipliers[unit];
  }

  validate() {
    const errors = [];

    // Validate required API keys
    if (!this.config.api.openrouter.apiKey) {
      errors.push('OPENROUTER_API_KEY is required');
    }

    // Validate numeric values
    if (this.config.orchestration.maxConcurrentAgents < 1) {
      errors.push('MAX_CONCURRENT_AGENTS must be at least 1');
    }

    if (this.config.web.port < 1 || this.config.web.port > 65535) {
      errors.push('WEB_PORT must be between 1 and 65535');
    }

    if (this.config.limits.maxTokensPerHour < 1000) {
      errors.push('MAX_TOKENS_PER_HOUR should be at least 1000');
    }

    if (this.config.limits.maxCostPerDay < 1) {
      errors.push('MAX_COST_PER_DAY should be at least 1');
    }

    // Validate paths exist
    if (!fs.existsSync(this.config.project.path)) {
      console.warn(`Warning: Project path does not exist: ${this.config.project.path}`);
    }

    if (errors.length > 0) {
      throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
    }
  }

  get(path) {
    return path.split('.').reduce((obj, key) => obj && obj[key], this.config);
  }

  set(path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    const target = keys.reduce((obj, key) => {
      if (!obj[key]) obj[key] = {};
      return obj[key];
    }, this.config);
    target[lastKey] = value;
  }

  getAll() {
    return this.config;
  }

  isLoaded() {
    return this.loaded;
  }

  // Environment helpers
  isDevelopment() {
    return process.env.NODE_ENV === 'development';
  }

  isProduction() {
    return process.env.NODE_ENV === 'production';
  }

  isTest() {
    return process.env.NODE_ENV === 'test';
  }
}

module.exports = { Configuration };
