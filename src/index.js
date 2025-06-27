/**
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
    const agentManager = new AgentManager(config.getAll().agents);
    const orchestrator = new Orchestrator(agentManager, config.getAll().orchestration);
    
    // Start services
    await agentManager.initialize();
    await orchestrator.start();
    
    logger.info('Multi-Agent Orchestrator started successfully');
    
    // Store references for shutdown
    global.orchestrator = orchestrator;
    global.agentManager = agentManager;
    
    return { orchestrator, agentManager, config };
  } catch (error) {
    logger.error('Failed to start orchestrator', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  const logger = new Logger('Main');
  logger.info('Shutting down...');
  
  if (global.orchestrator) {
    await global.orchestrator.stop();
  }
  if (global.agentManager) {
    await global.agentManager.shutdown();
  }
  
  process.exit(0);
});

process.on('SIGTERM', async () => {
  const logger = new Logger('Main');
  logger.info('Received SIGTERM, shutting down...');
  
  if (global.orchestrator) {
    await global.orchestrator.stop();
  }
  if (global.agentManager) {
    await global.agentManager.shutdown();
  }
  
  process.exit(0);
});

// Start if run directly
if (require.main === module) {
  start();
}

module.exports = { start };
