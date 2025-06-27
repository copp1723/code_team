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

### Agent Configuration (`agent-orchestrator.config.json`)

```json
{
  "agents": {
    "frontend": {
      "workingPaths": ["src/components", "src/pages"],
      "excludePaths": ["src/server", "prisma"]
    }
  }
}
```

### AI Models (`ai-agent-engine.js`)

The system uses intelligent model selection based on task complexity:
- **Simple tasks**: GPT-4.1 Mini, Gemini 2.5 Flash
- **Complex tasks**: GPT-4.1, Claude Opus 4
- **Code review**: Claude Sonnet 4
- **Algorithms**: DeepSeek R1

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
