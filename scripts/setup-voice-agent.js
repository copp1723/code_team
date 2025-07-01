#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Function to prompt user for input
function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise(resolve => rl.question(query, ans => {
    rl.close();
    resolve(ans);
  }));
}

async function setupVoiceAgentConfig() {
  console.log('🎤 Setting up configuration for a Voice Agent...');

  const projectPath = await askQuestion('Enter the project path for this voice agent (e.g., ./my-voice-app): ') || './voice-agent-project';
  const agentName = await askQuestion('Enter a name for this voice agent (default: voice-primary): ') || 'voice-primary';
  const model = await askQuestion('Enter the AI model for this agent (default: openai/gpt-4-turbo-preview): ') || 'openai/gpt-4-turbo-preview';

  const voiceAgentConfig = {
    projectPath: path.resolve(projectPath), // Store absolute path
    projectMasterBranch: "main",
    projectGitRemoteUrl: "", // User should fill this if needed
    agents: {
      maxConcurrent: 1,
      syncInterval: "1h",
      heartbeatInterval: "5m",
      defaultCapabilities: ["voice-processing", "nlp", "dialogue-management"],
      definitions: {
        [agentName]: {
          model: model,
          workingPaths: ["src/", "audio_files/", "scripts/"],
          excludePaths: ["node_modules/", "docs/"],
          branchPrefix: `agent/${agentName}`
        }
      }
    },
    api: {
      openrouter: {
        // API Key will be from OPENROUTER_API_KEY env var when the agent runs
        baseUrl: "https://openrouter.ai/api/v1",
        timeout: 30000,
        retries: 3
      },
      supermemory: {
        // API Key will be from SUPERMEMORY_API_KEY env var
        baseUrl: "https://api.supermemory.ai",
        timeout: 30000,
        enabled: false // Voice agents might not need supermemory by default
      }
    },
    git: {
      branchPrefix: `agent/${agentName}/` // Specific prefix for this agent's tasks
    },
    resourceLimits: {
      maxTokensPerHour: 50000,
      maxCostPerDay: 10.00,
      maxConcurrentTasks: 1
    },
    web: { // May not be applicable for all voice agents, but good to have schema consistency
      port: 8081, // Different port to avoid conflict if run alongside main orchestrator
      host: "localhost",
      enableWebSocket: false,
      staticPath: "./web"
    },
    logging: {
      level: "info",
      toFile: true,
      directory: "./logs",
      maxFileSize: "5MB",
      maxFiles": 5
    },
    security: {
      corsOrigins: [],
      rateLimitWindow: 900000,
      rateLimitMax: 100
    },
    // Minimal or no masterAgent/hierarchy for a specific voice agent config
    masterAgent: {},
    agentHierarchy: {},
    integrationPipeline: {},
    conflictResolution: {
        autoMergeStrategy: "rebase",
        conflictHandling: "manual",
        updateFrequency: "1h",
        priorityOrder: [agentName]
    },
    agentCommunication: {
      updateChannel: "filesystem",
      statusFile: ".voice-agent-status.json", // Unique status file
      lockFile": ".voice-agent-locks.json"   // Unique lock file
    }
  };

  const configFilePath = path.join(process.cwd(), 'agent-orchestrator.config.json');

  try {
    fs.writeFileSync(configFilePath, JSON.stringify(voiceAgentConfig, null, 2));
    console.log(`\n✅ Voice agent configuration file created at: ${configFilePath}`);
    console.log(`\nNext Steps:`);
    console.log(`1. If this voice agent needs to interact with a git repository, update 'projectGitRemoteUrl' in the generated file.`);
    console.log(`2. Ensure you have OPENROUTER_API_KEY (and SUPERMEMORY_API_KEY if enabled) set in the environment where this agent will run.`);
    console.log(`3. You can now use this configuration to run a voice agent process.`);

  } catch (error) {
    console.error(`❌ Error writing configuration file: ${error.message}`);
  }
}

if (require.main === module) {
  setupVoiceAgentConfig().catch(console.error);
}

module.exports = setupVoiceAgentConfig;
