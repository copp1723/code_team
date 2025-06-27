# Multi-Agent Orchestrator Web Interface

A modern web-based dashboard for controlling and monitoring your multi-agent AI development system.

## Features

### 🎯 Dashboard
- Real-time system status
- Active agent monitoring
- Resource usage tracking
- Quick action buttons

### 🤖 Agent Management
- View all agents (Frontend, Backend, Database, Integration, Testing, Master)
- Assign tickets to agents
- Monitor agent activity
- Initialize master agent oversight

### 📋 Ticket Management
- Create new tickets
- View pending, active, and completed tickets
- Load tickets from file
- Track dependencies

### 🧠 AI Workflow Control
- **Full AI Mode**: Autonomous ticket implementation
- **Hybrid Mode**: AI assists human developers
- **Manual Mode**: Traditional multi-agent without AI
- Configure AI models (GPT-4.1, Claude 4, etc.)

### 📊 System Monitoring
- Token usage tracking
- Cost monitoring ($50/day limit)
- CPU and memory usage
- Generate detailed reports

### 💻 Integrated Terminal
- Execute commands directly from the UI
- Real-time output display
- Secure command filtering

## Installation

1. Navigate to the web interface directory:
```bash
cd /Users/copp1723/Desktop/multi-agent-orchestrator/web-interface
```

2. Install dependencies:
```bash
npm install
```

3. Start the server:
```bash
chmod +x start.sh
./start.sh
```

Or manually:
```bash
export OPENROUTER_API_KEY="your-key-here"
npm start
```

## Usage

1. Open your browser to: `http://localhost:8080`

2. Use the navigation sidebar to access different sections:
   - **Dashboard**: Overview and quick actions
   - **Agents**: Manage AI agents
   - **Tickets**: Create and track tickets
   - **AI Workflow**: Configure and run AI workflows
   - **Monitoring**: Track resource usage
   - **Terminal**: Execute commands

### Quick Start

1. **Create a Ticket**:
   - Click "Create Ticket" on the dashboard
   - Enter ticket details and dependencies
   - Click "Create"

2. **Assign to AI Agent**:
   - Click "Assign Agent"
   - Select ticket and agent type
   - Choose AI mode (Full/Hybrid/Manual)
   - Click "Assign"

3. **Monitor Progress**:
   - View active agents in the Agents section
   - Check terminal output for real-time updates
   - Monitor resource usage in Monitoring section

4. **Run Integration**:
   - Click "Run Integration" when agents complete work
   - Master agent will merge all changes

## Terminal Commands

Available commands in the integrated terminal:
- `node master-agent.js [command]` - Master agent control
- `node orchestrator.js [command]` - Agent orchestration
- `node ai-agent.js [ticket] [agent]` - Run AI agent
- `node master-dispatcher.js [command]` - Ticket dispatcher
- `node resource-monitor.js [command]` - Resource monitoring
- `node human-oversight.js [command]` - Human review queue
- `node failure-recovery.js [command]` - Failure recovery
- `node ai-validation-layer.js [file]` - Validate AI code

## Architecture

```
web-interface/
├── index.html          # Main UI (single page application)
├── server.js           # Express + WebSocket server
├── package.json        # Dependencies
├── start.sh           # Start script
└── README.md          # This file
```

## Security

- Command execution is restricted to allowed commands only
- WebSocket connections are authenticated
- File system access is limited to the orchestrator directory
- API key is kept secure in environment variables

## Customization

### Adding New Commands

Edit `server.js` to add new allowed commands:
```javascript
const allowedCommands = [
  'node your-new-command.js',
  // ... existing commands
];
```

### Modifying UI

Edit `index.html` to:
- Add new sections
- Change styling (CSS variables in `:root`)
- Add new action cards
- Modify forms

### WebSocket Events

The system uses WebSocket for real-time updates:
- `agent-update`: Agent status changes
- `ticket-update`: Ticket status changes
- `terminal-output`: Command output
- `resource-update`: Resource usage updates

## Troubleshooting

### Server won't start
- Check if port 8080 is available
- Ensure Node.js is installed
- Verify dependencies: `npm install`

### WebSocket connection fails
- Check firewall settings
- Ensure server is running
- Try refreshing the browser

### Commands not working
- Verify you're in the correct directory
- Check that parent scripts exist
- Ensure OPENROUTER_API_KEY is set

## Future Enhancements

- [ ] Authentication system
- [ ] Multi-user support
- [ ] Persistent storage (database)
- [ ] Real-time collaboration
- [ ] Mobile responsive design
- [ ] Dark mode toggle
- [ ] Export reports as PDF
- [ ] Slack/Discord notifications
- [ ] Docker containerization
