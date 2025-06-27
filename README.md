# Multi-Agent Orchestrator System

This directory contains the complete Multi-Agent Orchestrator system, consolidated from the rylie-seo-hub-v2 project.

## Directory Structure

```
multi-agent-orchestrator/
├── web-interface/          # Web dashboard and UI
│   ├── index.html         # Enhanced dashboard with results summary
│   ├── server.js          # Mock server for testing
│   └── server-real.js     # Real WebSocket server
├── core/                  # Core orchestration files
│   ├── orchestrator.js    # Main orchestrator
│   ├── master-agent.js    # Master agent with supreme authority
│   ├── ai-agent.js        # AI-powered autonomous agents
│   └── agent-task.js      # Task execution system
├── ai-system/            # AI integration
│   ├── ai-agent-engine.js # AI engine for code generation
│   ├── ai-workflow.js     # AI workflow automation
│   └── ai-validation-layer.js # AI validation system
├── support/              # Support systems
│   ├── failure-recovery.js # Failure detection and recovery
│   ├── human-oversight.js  # Human review system
│   └── resource-monitor.js # Resource usage monitoring
├── config/               # Configuration files
│   ├── agent-orchestrator.config.json
│   ├── master-agent-config.json
│   └── sprint-dependencies.json
├── docs/                 # Documentation
│   ├── MULTI_AGENT_GUIDE.md
│   ├── AGENT_IMPROVEMENTS.md
│   └── HANDOFF_MULTI_AGENT_AI_SYSTEM.md
└── scripts/              # Utility scripts
    ├── setup-agents.sh
    ├── start-ai.sh
    └── test-ai-setup.sh
```

## Quick Start

### 1. Launch the Web Interface
```bash
cd web-interface
npm install
npm start
```
Then open http://localhost:8080

### 2. Run AI Workflow (Interactive)
```bash
./start-ai.sh
```

### 3. Manual Orchestration
```bash
node orchestrator.js
```

### 4. Initialize Master Agent
```bash
node master-agent.js init
```

## Key Components

### Master Agent
- **File**: `master-agent.js`
- **Authority**: Supreme - can override any agent
- **Commands**:
  - `init` - Initialize master branch
  - `review` - Review pending work
  - `integrate` - Integrate approved changes
  - `override` - Enter override mode

### AI Agents
- **File**: `ai-agent.js`
- **Purpose**: Autonomous code generation
- **Usage**: `node ai-agent.js <ticket-id> <agent-type>`
- **Models**: Configurable via `ai-agent-engine.js`

### Orchestrator
- **File**: `orchestrator.js`
- **Purpose**: Coordinate multiple agents
- **Features**:
  - Agent assignment
  - Branch management
  - Conflict resolution
  - Status tracking

### Web Interface
- **Enhanced Dashboard** with workflow wizard
- **Results Summary** showing:
  - Completed tickets
  - Files changed
  - Agent performance
  - Execution timeline
- **Real-time Updates** via WebSocket

## Configuration

### Agent Configuration (`agent-orchestrator.config.json`)
- Define agent types and boundaries
- Set working paths and exclusions
- Configure conflict resolution

### Master Configuration (`master-agent-config.json`)
- Review standards
- Integration rules
- Automation settings

### Dependencies (`sprint-dependencies.json`)
- Ticket dependencies
- Parallel tracks
- Sprint scheduling

## Workflows

### 1. Full AI Mode
```bash
node ai-workflow.js
# Select option 1 for full AI automation
```

### 2. Hybrid Mode
```bash
node ai-workflow.js
# Select option 2 for AI-assisted development
```

### 3. Manual Mode
```bash
node orchestrator.js
# Traditional multi-agent without AI
```

## Testing

### Test AI Models
```bash
node test-models.js
```

### Test Direct API
```bash
node test-direct.js
```

### Test OpenRouter
```bash
node test-openrouter.js
```

## Environment Variables

Required for AI features:
```bash
export OPENROUTER_API_KEY="your-api-key"
```

## State Files

The system maintains several state files:
- `.agent-status.json` - Current agent status
- `.agent-locks.json` - File locking
- `.master-agent.json` - Master configuration
- `.pending-reviews.json` - Pending code reviews

## Monitoring

### Resource Monitor
```bash
node resource-monitor.js report
```

### Failure Recovery
```bash
node failure-recovery.js report
```

### Human Oversight
```bash
node human-oversight.js report
```

## Advanced Features

### Master Override
For emergency fixes across any codebase:
```bash
node master-agent.js override
```

### Batch Integration
Process multiple agent branches:
```bash
node master-workflow.js batchIntegration
```

### Continuous Monitoring
```bash
node master-agent.js monitor
```

## Troubleshooting

### Agent Conflicts
```bash
node analyze-conflicts.js
```

### Reset Agent State
```bash
rm .agent-*.json
node orchestrator.js init
```

### View Logs
```bash
tail -f .master-agent.log
```

## Future Enhancements

See `AGENT_IMPROVEMENTS.md` for planned features including:
- Distributed orchestration
- Advanced AI integration
- Performance optimizations
- Enhanced monitoring

## Support

For detailed documentation, see:
- `MULTI_AGENT_GUIDE.md` - Complete system guide
- `HANDOFF_MULTI_AGENT_AI_SYSTEM.md` - AI system details
- Web interface at http://localhost:8080
