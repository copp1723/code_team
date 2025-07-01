# 🤖 Multi-Agent Orchestrator

A sophisticated AI-powered development system that uses multiple specialized agents to handle different aspects of software development, all coordinated by a master agent with final authority.

## 🌟 Features

- **Multiple Specialized Agents**: Frontend, Backend, Database, Integration, and Testing agents
- **AI-Powered Development**: Integrated with OpenRouter for access to GPT-4, Claude, and 300+ AI models  
- **Master Agent Authority**: Central coordinator that reviews and integrates all agent work
- **Web Dashboard**: Real-time monitoring and control interface
- **Intelligent Task Distribution**: Automatic assignment based on expertise
- **Conflict Resolution**: Smart handling of overlapping changes
- **Human Oversight**: Built-in approval workflows
- **Resource Monitoring**: Track API usage and costs

## 🚀 Quick Start

```bash
# 1. Clone and setup
git clone <repository-url>
cd multi-agent-orchestrator

# 2. Run automated setup
node quick-setup.js

# 3. Configure your API key
# Edit .env and add your OpenRouter API key
# Get one from: https://openrouter.ai/keys

# 4. Initialize master agent
node master-agent.js init

# 5. Start web interface
npm run web

# 6. Visit dashboard
# Open http://localhost:8080
```

## 📋 Prerequisites

- Node.js 14+ 
- Git
- OpenRouter API key ([Get one here](https://openrouter.ai/keys))

## 🏗️ Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Web Interface │────▶│  Master Agent   │────▶│  Target Project │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                       │                         ▲
         │                       ▼                         │
         │              ┌─────────────────┐               │
         └─────────────▶│   AI Agents     │───────────────┘
                        │ - Frontend      │
                        │ - Backend       │
                        │ - Database      │
                        └─────────────────┘
                                 │
                                 ▼
                        ┌─────────────────┐
                        │  OpenRouter AI  │
                        │ GPT-4, Claude   │
                        └─────────────────┘
```

## 🎯 Usage Examples

### Create and Assign a Ticket with AI

```bash
# Interactive mode
node ai-agent.js interactive

# Direct assignment
node ai-agent.js TICKET-001 frontend

# From ticket file
node ai-agent.js from-file tickets.txt
```

### Master Agent Commands

```bash
# Review all pending work
node master-agent.js review

# Integrate approved changes
node master-agent.js integrate

# Monitor system continuously  
node master-agent.js monitor

# Emergency override mode
node master-agent.js override
```

### Orchestrator Commands

```bash
# Check agent status
node orchestrator.js status

# Create agent branch
node orchestrator.js create frontend TICKET-001

# Sync agent with base
node orchestrator.js sync frontend

# Merge agent work
node orchestrator.js merge frontend "Implemented user auth"
```

## 🔧 Configuration

The Multi-Agent Orchestrator uses a unified JSON file for most of its configuration, supplemented by an `.env` file for secrets.

### 1. Main Configuration File (`agent-orchestrator.config.json`)

Create an `agent-orchestrator.config.json` file at the root of the project. This file defines project settings, agent behaviors, API integrations (excluding keys), resource limits, and more. The system will validate this file on startup and fail fast if critical settings are missing or invalid.

**Example `agent-orchestrator.config.json`:**

```json
{
  "projectPath": "../your-target-project",
  "projectMasterBranch": "main",
  "projectGitRemoteUrl": "https://github.com/your-username/your-target-project.git",
  "agents": {
    "maxConcurrent": 3,
    "syncInterval": "30m",
    "heartbeatInterval": "5m",
    "defaultCapabilities": ["general-coding"],
    "definitions": {
      "frontend": {
        "model": "anthropic/claude-3-sonnet-20240229",
        "workingPaths": ["src/frontend", "src/components", "src/pages"],
        "excludePaths": ["src/backend", "node_modules/"],
        "branchPrefix": "feature/frontend"
      },
      "backend": {
        "model": "openai/gpt-4-turbo-preview",
        "workingPaths": ["src/backend", "src/api", "src/services"],
        "excludePaths": ["src/frontend", "node_modules/"],
        "branchPrefix": "feature/backend"
      }
      // Add other agent definitions (database, testing, integration, general) as needed
    }
  },
  "api": {
    "openrouter": {
      "baseUrl": "https://openrouter.ai/api/v1",
      "timeout": 30000,
      "retries": 3
    },
    "supermemory": {
      "baseUrl": "https://api.supermemory.ai",
      "timeout": 30000,
      "enabled": false
    }
  },
  "git": {
    "branchPrefix": "agent/"
  },
  "resourceLimits": {
    "maxTokensPerHour": 100000,
    "maxCostPerDay": 50.00,
    "maxConcurrentTasks": 5
  },
  "web": {
    "port": 8080,
    "host": "localhost",
    "enableWebSocket": true,
    "staticPath": "./web-interface"
  },
  "logging": {
    "level": "info",
    "toFile": true,
    "directory": "./logs",
    "maxFileSize": "10MB",
    "maxFiles": 7
  },
  "//": "------ Optional Advanced Configuration ------",
  "masterAgent": {
    "branch": "master-integration"
    // Other master agent specific settings...
  },
  "agentCommunication": {
    "statusFile": ".agent-status.json"
    // Other communication settings...
  }
}
```

**Key Configuration Items in `agent-orchestrator.config.json`:**

*   **`projectPath`**: (Required) Relative or absolute path to your target codebase root.
*   **`projectMasterBranch`**: (Required) The main branch of your target project (e.g., "main", "master", "develop").
*   **`agents.definitions`**: (Required) An object where each key is an agent role (e.g., "frontend", "backend").
    *   Each agent definition **must** have:
        *   `model`: The AI model identifier (e.g., "openai/gpt-4-turbo-preview").
        *   `workingPaths`: An array of relative paths within `projectPath` where the agent is allowed to operate.
    *   Optional keys include `excludePaths`, `branchPrefix`.
*   **`api.openrouter.baseUrl`**: URL for the OpenRouter API.
*   **`web.port` / `web.host`**: For the orchestrator's web dashboard.
*   **`logging.level`**: Logging verbosity (e.g., "debug", "info", "error").

Refer to the `agent-orchestrator.config.json` file itself for a complete list of options and their structure. The system validates this configuration on startup and will provide specific error messages if required fields are missing or improperly formatted.

### 2. Environment Variables (`.env` file)

Create a `.env` file in the project root for secrets. This file is loaded automatically at startup. See `.env.example` for a template.

**Required Environment Variables:**

*   **`OPENROUTER_API_KEY`**: Your API key for OpenRouter.ai. This is essential for AI agent functionality.

**Optional Environment Variables:**

*   **`SUPERMEMORY_API_KEY`**: Your API key for Supermemory.ai, if you intend to use features that rely on it (and have `api.supermemory.enabled: true` in the JSON config).

### AI Models

Default AI models for different agent types are specified in `agent-orchestrator.config.json` under `agents.definitions.<agent_name>.model`. You can customize these as needed. The system leverages these models via OpenRouter.

### Configuration Validation

The application includes a robust configuration validation step at startup (`src/config.js`). If any critical configurations are missing (e.g., `projectPath`, OpenRouter API key, valid agent definitions), or if values are incorrectly formatted, the application will fail to start and will output detailed error messages to help you correct the setup. This fail-fast approach prevents unexpected runtime errors due to misconfiguration.

## 📊 Web Dashboard Features

- **Real-time Status**: Monitor all agents and their current tasks
- **Ticket Management**: Create, assign, and track tickets
- **AI Integration**: Choose between full AI, hybrid, or manual modes
- **Resource Monitoring**: Track API usage and costs
- **Terminal Access**: Execute commands directly from the UI
- **Report Generation**: Generate various system reports

## 🛠️ Development Workflow

1. **Create Ticket**: Define the task in tickets.txt or via web UI
2. **AI Analysis**: System analyzes complexity and requirements
3. **Agent Assignment**: Automatically assign to appropriate agent
4. **AI Development**: Agent generates code, tests, and documentation
5. **Validation**: AI validation layer checks code quality
6. **Master Review**: Master agent reviews all changes
7. **Integration**: Approved changes are merged to main

## 📝 Available NPM Scripts

```bash
npm start          # Start orchestrator
npm run master     # Run master agent
npm run ai-agent   # Run AI agent
npm run web        # Start web interface  
npm run test-ai    # Test OpenRouter connection
npm run setup      # Install all dependencies
npm run monitor    # Start resource monitoring
```

## 🔍 Troubleshooting

### "OPENROUTER_API_KEY not set"
Edit `.env` file and add your API key

### "Git command failed"
Ensure you're in a git repository: `git init`

### "Cannot find module"
Run `npm install` in both root and web-interface directories

### "Project path not found"
Update `localPath` in `agent-orchestrator.config.json`

## 📚 Documentation

- [Setup Guide](docs/SETUP_GUIDE.md)
- [Multi-Agent Guide](MULTI_AGENT_GUIDE.md) 
- [Agent Improvements](AGENT_IMPROVEMENTS.md)
- [API Documentation](docs/API.md)

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📄 License

MIT License - see LICENSE file for details

## 🙏 Acknowledgments

- OpenRouter for AI model access
- Next.js team for the framework
- All contributors to this project

---

**Note**: Remember to keep your API keys secure and never commit them to version control!
