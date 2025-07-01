const fs = require('fs');
const path = require('path');

// Load environment variables from .env file if present
require('dotenv').config();

const CONFIG_FILE_NAME = 'agent-orchestrator.config.json';

class ConfigManager {
  constructor() {
    this.config = null;
    this.loadAndValidate();
  }

  loadAndValidate() {
    const configPath = path.join(process.cwd(), CONFIG_FILE_NAME);

    if (!fs.existsSync(configPath)) {
      throw new Error(`Configuration file not found: ${configPath}. Please create it.`);
    }

    try {
      const rawConfig = fs.readFileSync(configPath, 'utf8');
      this.config = JSON.parse(rawConfig);
    } catch (error) {
      throw new Error(`Error parsing configuration file ${configPath}: ${error.message}`);
    }

    // Integrate API keys from environment variables
    this.config.api.openrouter.apiKey = process.env.OPENROUTER_API_KEY;
    this.config.api.supermemory.apiKey = process.env.SUPERMEMORY_API_KEY;
    // Supermemory enabled defaults to true if key is present, otherwise use config value or false
    this.config.api.supermemory.enabled = !!process.env.SUPERMEMORY_API_KEY || this.config.api.supermemory.enabled || false;


    // Validate the loaded configuration
    this.validate();
    console.log('Configuration loaded and validated successfully.');
  }

  parseInterval(intervalString) {
    if (!intervalString || typeof intervalString !== 'string') return null;

    const match = intervalString.match(/^(\d+)([smhd])$/); // s, m, h, d (days)
    if (!match) {
      console.warn(`Invalid interval string format: ${intervalString}. Expected format like '30m', '1h'.`);
      return null;
    }

    const value = parseInt(match[1]);
    const unit = match[2];
    const multipliers = { s: 1000, m: 60000, h: 3600000, d: 86400000 };

    if (isNaN(value) || !multipliers[unit]) {
        console.warn(`Could not parse interval: ${intervalString}`);
        return null;
    }
    return value * multipliers[unit];
  }

  validate() {
    const errors = [];

    // --- General Checks ---
    if (!this.config.projectPath || typeof this.config.projectPath !== 'string') {
      errors.push('`projectPath` is required and must be a string.');
    } else if (!fs.existsSync(this.config.projectPath)) {
      // This check might be too strict at initial load if the path is relative and CWD changes.
      // Consider making it a warning or checking at point of use.
      // For now, per instructions, failing fast.
      errors.push(`projectPath not found: ${this.config.projectPath}`);
    }

    // --- API Keys ---
    if (!this.config.api?.openrouter?.apiKey) {
      errors.push('OpenRouter API key (OPENROUTER_API_KEY) is missing. Get it from https://openrouter.ai/keys');
    }
    // SUPERMEMORY_API_KEY is optional, but if supermemory.enabled is true, it should be present.
    if (this.config.api?.supermemory?.enabled && !this.config.api?.supermemory?.apiKey) {
      errors.push('Supermemory is enabled but API key (SUPERMEMORY_API_KEY) is missing. Get it from https://supermemory.ai or set api.supermemory.enabled to false.');
    }

    // --- Agents Configuration ---
    if (!this.config.agents?.definitions || typeof this.config.agents.definitions !== 'object') {
      errors.push('`agents.definitions` is required and must be an object.');
    } else {
      for (const agentName in this.config.agents.definitions) {
        const agentConfig = this.config.agents.definitions[agentName];
        if (!agentConfig.model || typeof agentConfig.model !== 'string') {
          errors.push(`Agent '${agentName}' is missing a 'model' string.`);
        }
        if (!agentConfig.workingPaths || !Array.isArray(agentConfig.workingPaths) || agentConfig.workingPaths.length === 0) {
          errors.push(`Agent '${agentName}' must have at least one 'workingPaths' (non-empty array).`);
        } else {
          agentConfig.workingPaths.forEach(p => {
            if (typeof p !== 'string') errors.push(`Agent '${agentName}' has a non-string workingPath.`);
          });
        }
      }
    }

    // --- Numerical values and intervals ---
    if (typeof this.config.agents?.maxConcurrent !== 'number' || this.config.agents.maxConcurrent < 1) {
        errors.push('`agents.maxConcurrent` must be a positive number.');
    }
    if (this.parseInterval(this.config.agents?.syncInterval) === null && this.config.agents?.syncInterval !== undefined) {
        errors.push('`agents.syncInterval` is invalid. Use format like "30m", "1h".');
    }
     if (this.parseInterval(this.config.agents?.heartbeatInterval) === null && this.config.agents?.heartbeatInterval !== undefined) {
        errors.push('`agents.heartbeatInterval` is invalid. Use format like "30s", "5m".');
    }

    // --- Web Server ---
    if (typeof this.config.web?.port !== 'number' || this.config.web.port < 1 || this.config.web.port > 65535) {
        errors.push('`web.port` must be a valid port number (1-65535).');
    }

    // --- Resource Limits ---
    if (typeof this.config.resourceLimits?.maxTokensPerHour !== 'number' || this.config.resourceLimits.maxTokensPerHour < 0) {
        errors.push('`resourceLimits.maxTokensPerHour` must be a non-negative number.');
    }
    if (typeof this.config.resourceLimits?.maxCostPerDay !== 'number' || this.config.resourceLimits.maxCostPerDay < 0) {
        errors.push('`resourceLimits.maxCostPerDay` must be a non-negative number.');
    }
     if (typeof this.config.resourceLimits?.maxConcurrentTasks !== 'number' || this.config.resourceLimits.maxConcurrentTasks < 1) {
        errors.push('`resourceLimits.maxConcurrentTasks` must be a positive number.');
    }

    // --- Logging ---
    const validLogLevels = ['debug', 'info', 'warn', 'error'];
    if (!validLogLevels.includes(this.config.logging?.level)) {
        errors.push(`\`logging.level\` must be one of: ${validLogLevels.join(', ')}.`);
    }


    if (errors.length > 0) {
      throw new Error(`Configuration validation failed:\n- ${errors.join('\n- ')}`);
    }
  }

  get(key) {
    if (!this.config) {
      throw new Error('Configuration has not been loaded.');
    }
    if (!key) return this.config; // Return whole config if no key

    // Handle interval parsing on get
    const intervalKeys = [
        'agents.syncInterval',
        'agents.heartbeatInterval',
        'conflictResolution.updateFrequency',
        'security.rateLimitWindow'
        // Add other interval keys here if any
    ];

    if (intervalKeys.includes(key)) {
        const stringValue = key.split('.').reduce((obj, prop) => obj && obj[prop], this.config);
        return this.parseInterval(stringValue);
    }

    return key.split('.').reduce((obj, prop) => obj && obj[prop], this.config);
  }

  // Convenience getter for all agent definitions
  getAgentDefinitions() {
    return this.get('agents.definitions') || {};
  }

  // Convenience getter for a specific agent's config
  getAgentConfig(agentName) {
    const agentConfig = this.get(`agents.definitions.${agentName}`);
    if (!agentConfig) {
        console.warn(`Attempted to get configuration for unknown agent: ${agentName}`);
    }
    return agentConfig;
  }

  // Getter for project path that resolves it to an absolute path
  getProjectPathAbs() {
    const projectPath = this.get('projectPath');
    if (!projectPath) return null;
    if (path.isAbsolute(projectPath)) {
      return projectPath;
    }
    return path.resolve(process.cwd(), projectPath);
  }
}

// Export a singleton instance
const configManagerInstance = new ConfigManager();
module.exports = configManagerInstance;

// Example usage (for testing or direct script execution):
if (require.main === module) {
  try {
    console.log('--- Configuration Test ---');
    console.log('Project Path:', configManagerInstance.get('projectPath'));
    console.log('Project Path (Absolute):', configManagerInstance.getProjectPathAbs());
    console.log('OpenRouter API Key (should be undefined or your key):', configManagerInstance.get('api.openrouter.apiKey'));
    console.log('Frontend Agent Model:', configManagerInstance.get('agents.definitions.frontend.model'));
    console.log('Agent Sync Interval (ms):', configManagerInstance.get('agents.syncInterval')); // Will be parsed
    console.log('All config:', JSON.stringify(configManagerInstance.get(), null, 2));

    // Test validation by temporarily messing up a value (hypothetically)
    // configManagerInstance.config.web.port = -10; // This would require making config public or adding a set method
    // configManagerInstance.validate(); // This would throw
  } catch (error) {
    console.error('Error in config testing:', error.message);
    process.exit(1);
  }
}
