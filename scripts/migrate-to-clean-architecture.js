#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🚀 Starting Multi-Agent Orchestrator Migration...\n');

// Configuration for file categorization
const FILE_CATEGORIES = {
  agents: {
    pattern: /(agent|Agent)/,
    files: ['ai-agent.js', 'senior-ai-agent.js', 'master-agent.js'], // Removed senior-enhanced-agent.js
    destination: 'src/core/agents'
  },
  orchestration: {
    pattern: /(orchestrator|dispatcher|workflow)/i,
    files: ['orchestrator.js', 'enhanced-orchestrator.js', 'master-dispatcher.js', 'master-workflow.js'],
    destination: 'src/core/orchestration'
  },
  ai: {
    pattern: /(ai-|engine|validation)/,
    files: ['ai-agent-engine.js', 'ai-validation-layer.js', 'ai-workflow.js'],
    destination: 'src/core/ai'
  },
  web: {
    pattern: /(dashboard|web-interface)/,
    files: ['master-dashboard.html', 'web-interface'],
    destination: 'src/web'
  },
  infrastructure: {
    pattern: /(monitor|resource|memory|failure)/,
    files: ['resource-monitor.js', 'agent-memory-system.js', 'failure-recovery.js'],
    destination: 'src/infrastructure/monitoring'
  },
  scripts: {
    pattern: /(setup|start|test|quick)/,
    files: ['setup-agents.sh', 'start-ai.sh', 'test-setup.sh', 'quick-setup.js'],
    destination: 'scripts'
  },
  tests: {
    pattern: /test-/,
    files: ['test-models.js', 'test-direct.js', 'test-openrouter.js'],
    destination: 'tests'
  },
  deprecated: {
    pattern: /\.(old|bak|tmp)$/,
    files: ['.agent-locks.json', '.agent-status.json', 'tickets.txt'],
    destination: 'deprecated'
  }
};

// Create new directory structure
function createDirectoryStructure() {
  const directories = [
    'src/core/agents/base',
    'src/core/agents/specialized',
    'src/core/orchestration',
    'src/core/ai',
    'src/core/validation',
    'src/infrastructure/config',
    'src/infrastructure/storage',
    'src/infrastructure/logging',
    'src/infrastructure/monitoring',
    'src/api/rest/routes',
    'src/api/rest/middleware',
    'src/api/websocket/handlers',
    'src/api/cli/commands',
    'src/web/dashboard',
    'src/web/components',
    'src/web/assets',
    'tests/unit',
    'tests/integration',
    'tests/fixtures',
    'scripts',
    'docs',
    'config',
    'deprecated'
  ];

  directories.forEach(dir => {
    const fullPath = path.join(process.cwd(), dir);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
      console.log(`✅ Created: ${dir}`);
    }
  });
}

// Categorize and move files
function migrateFiles() {
  const rootFiles = fs.readdirSync(process.cwd());
  const migrated = [];
  const skipped = [];

  rootFiles.forEach(file => {
    const filePath = path.join(process.cwd(), file);
    const stat = fs.statSync(filePath);

    if (stat.isFile() && file !== 'package.json' && file !== '.env' && !file.startsWith('README')) {
      let moved = false;

      // Check each category
      for (const [category, config] of Object.entries(FILE_CATEGORIES)) {
        if (config.files.includes(file) || config.pattern.test(file)) {
          const destDir = path.join(process.cwd(), config.destination);
          const destPath = path.join(destDir, file);

          try {
            fs.copyFileSync(filePath, destPath);
            migrated.push({ file, category, destination: config.destination });
            moved = true;
            break;
          } catch (err) {
            console.error(`❌ Error moving ${file}: ${err.message}`);
          }
        }
      }

      if (!moved) {
        skipped.push(file);
      }
    }
  });

  console.log('\n📦 Migration Summary:');
  console.log(`✅ Migrated: ${migrated.length} files`);
  console.log(`⏭️  Skipped: ${skipped.length} files`);

  if (migrated.length > 0) {
    console.log('\n📁 Migrated Files:');
    migrated.forEach(({ file, destination }) => {
      console.log(`  ${file} → ${destination}/`);
    });
  }

  if (skipped.length > 0) {
    console.log('\n⚠️  Files requiring manual review:');
    skipped.forEach(file => console.log(`  - ${file}`));
  }
}

// Create consolidated agent implementation
function createConsolidatedAgent() {
  const agentTemplate = `/**
 * Base Agent Class
 * Consolidated from multiple agent implementations
 */

const EventEmitter = require('events');

class Agent extends EventEmitter {
  constructor(config = {}) {
    super();
    this.id = config.id || Math.random().toString(36).substr(2, 9);
    this.name = config.name || 'Agent';
    this.type = config.type || 'base';
    this.capabilities = config.capabilities || [];
    this.state = 'idle';
    this.memory = new Map();
    this.metrics = {
      tasksCompleted: 0,
      errors: 0,
      startTime: Date.now()
    };
  }

  async initialize() {
    this.state = 'ready';
    this.emit('agent:ready', { id: this.id, type: this.type });
  }

  async processTask(task) {
    this.state = 'processing';
    this.emit('task:started', task);

    try {
      const result = await this.execute(task);
      this.metrics.tasksCompleted++;
      this.emit('task:completed', { task, result });
      return result;
    } catch (error) {
      this.metrics.errors++;
      this.emit('task:error', { task, error });
      throw error;
    } finally {
      this.state = 'ready';
    }
  }

  async execute(task) {
    // Override in subclasses
    throw new Error('Execute method must be implemented by subclass');
  }

  getMetrics() {
    return {
      ...this.metrics,
      uptime: Date.now() - this.metrics.startTime
    };
  }
}

module.exports = Agent;
`;

  const seniorAgentTemplate = `/**
 * Senior Agent Implementation
 * Specialized agent with enhanced capabilities
 */

const Agent = require('./base/Agent');

class SeniorAgent extends Agent {
  constructor(config = {}) {
    super({
      ...config,
      type: 'senior',
      capabilities: ['planning', 'validation', 'orchestration', ...(config.capabilities || [])]
    });
    
    this.subordinates = new Map();
    this.taskQueue = [];
  }

  async execute(task) {
    // Enhanced execution with planning
    const plan = await this.createPlan(task);
    const results = await this.executePlan(plan);
    return this.consolidateResults(results);
  }

  async createPlan(task) {
    // Implement planning logic
    return {
      steps: [],
      dependencies: [],
      estimatedTime: 0
    };
  }

  async executePlan(plan) {
    // Execute plan steps
    return [];
  }

  consolidateResults(results) {
    // Merge and validate results
    return { success: true, data: results };
  }
}

module.exports = SeniorAgent;
`;

  fs.writeFileSync(
    path.join(process.cwd(), 'src/core/agents/base/Agent.js'),
    agentTemplate
  );

  fs.writeFileSync(
    path.join(process.cwd(), 'src/core/agents/specialized/SeniorAgent.js'),
    seniorAgentTemplate
  );

  console.log('✅ Created consolidated agent implementations');
}

// Create new package.json structure
function updatePackageJson() {
  const packagePath = path.join(process.cwd(), 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

  packageJson.main = 'src/index.js';
  packageJson.scripts = {
    start: 'node src/index.js',
    'start:dev': 'nodemon src/index.js',
    test: 'jest',
    'test:watch': 'jest --watch',
    lint: 'eslint src',
    'lint:fix': 'eslint src --fix',
    build: 'npm run lint && npm test',
    migrate: 'node scripts/migrate.js'
  };

  packageJson.jest = {
    testEnvironment: 'node',
    coverageDirectory: 'coverage',
    collectCoverageFrom: ['src/**/*.js'],
    testMatch: ['**/tests/**/*.test.js']
  };

  fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));
  console.log('✅ Updated package.json');
}

// Create index files
function createIndexFiles() {
  const mainIndex = `/**
 * Multi-Agent Orchestrator
 * Main entry point
 */

const { Orchestrator } = require('./core/orchestration');
const { AgentManager } = require('./core/agents');
const { Configuration } = require('./infrastructure/config');
const { Logger } = require('./infrastructure/logging');

async function start() {
  const logger = new Logger('Main');
  
  try {
    logger.info('Starting Multi-Agent Orchestrator...');
    
    // Load configuration
    const config = await Configuration.load();
    
    // Initialize components
    const agentManager = new AgentManager(config.agents);
    const orchestrator = new Orchestrator(agentManager, config.orchestration);
    
    // Start services
    await agentManager.initialize();
    await orchestrator.start();
    
    logger.info('Multi-Agent Orchestrator started successfully');
  } catch (error) {
    logger.error('Failed to start orchestrator', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Shutting down...');
  await orchestrator.stop();
  process.exit(0);
});

// Start if run directly
if (require.main === module) {
  start();
}

module.exports = { start };
`;

  fs.writeFileSync(
    path.join(process.cwd(), 'src/index.js'),
    mainIndex
  );

  console.log('✅ Created index files');
}

// Main migration function
async function migrate() {
  try {
    console.log('🔨 Creating directory structure...');
    createDirectoryStructure();

    console.log('\n📂 Migrating files...');
    migrateFiles();

    console.log('\n🏗️  Creating consolidated implementations...');
    createConsolidatedAgent();

    console.log('\n📝 Updating configuration...');
    updatePackageJson();
    createIndexFiles();

    console.log('\n✨ Migration completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Review migrated files in their new locations');
    console.log('2. Delete old files from root directory');
    console.log('3. Update import statements');
    console.log('4. Run tests to ensure everything works');
    console.log('5. Commit the new structure');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
migrate();