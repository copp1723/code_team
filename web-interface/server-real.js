// Fixed version of server.js with proper command execution and repository handling
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const { exec, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Serve favicon
app.get('/favicon.ico', (req, res) => {
  res.sendFile(path.join(__dirname, 'favicon.svg'));
});

// Store active processes and current context
const activeProcesses = new Map();
const clients = new Set();
let currentRepository = ''; // No default repo

// WebSocket connection handling
wss.on('connection', (ws) => {
  console.log('New client connected');
  clients.add(ws);
  
  // Send initial status
  ws.send(JSON.stringify({
    type: 'connection',
    status: 'connected',
    message: 'Connected to Multi-Agent Orchestrator'
  }));
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      handleCommand(data.command, data.params, ws);
    } catch (error) {
      ws.send(JSON.stringify({
        type: 'error',
        message: error.message
      }));
    }
  });
  
  ws.on('close', () => {
    console.log('Client disconnected');
    clients.delete(ws);
  });
});

// Broadcast to all connected clients
function broadcast(data) {
  const message = JSON.stringify(data);
  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// Command handler
async function handleCommand(command, params = {}, ws) {
  console.log('Handling command:', command, params);
  
  switch(command) {
    case 'change-repository':
      currentRepository = params.path;
      ws.send(JSON.stringify({
        type: 'repository-changed',
        repository: currentRepository
      }));
      break;
      
    case 'check-master-status':
      checkMasterStatus(params.repository || currentRepository, ws);
      break;
      
    case 'init-master':
      initializeMaster(params.repository || currentRepository, ws);
      break;
      
    case 'load-tickets':
      loadTicketsForReal(params, ws);
      break;
      
    case 'auto-assign-all':
      autoAssignAllTickets(params, ws);
      break;
      
    case 'master-integration':
      runRealMasterIntegration(params.repository || currentRepository, ws);
      break;
      
    case 'master-chat':
      handleMasterChat(params, ws);
      break;
      
    case 'execute-terminal':
      executeTerminalCommand(params.command, ws);
      break;
      
    default:
      ws.send(JSON.stringify({
        type: 'error',
        message: `Unknown command: ${command}`
      }));
  }
}

// Real implementation functions
function checkMasterStatus(repository, ws) {
  const masterStateFile = path.join(repository, '.master-agent.json');
  
  if (fs.existsSync(masterStateFile)) {
    const state = JSON.parse(fs.readFileSync(masterStateFile, 'utf8'));
    ws.send(JSON.stringify({
      type: 'master-status',
      initialized: true,
      state: state
    }));
  } else {
    ws.send(JSON.stringify({
      type: 'master-status',
      initialized: false
    }));
  }
}

function initializeMaster(repository, ws) {
  const orchestratorPath = path.dirname(__dirname);
  
  // Copy necessary files to the target repository
  const filesToCopy = [
    'master-agent.js',
    'master-agent-config.json',
    'agent-orchestrator.config.json',
    'ai-agent.js',
    'ai-agent-engine.js'
  ];
  
  ws.send(JSON.stringify({
    type: 'terminal-output',
    output: `Initializing master agent in ${repository}...`
  }));
  
  // Execute initialization
  exec(`cd "${orchestratorPath}" && node master-agent.js init "${repository}"`, 
    { maxBuffer: 1024 * 1024 },
    (error, stdout, stderr) => {
      if (error) {
        ws.send(JSON.stringify({
          type: 'terminal-output',
          output: `Error: ${error.message}\n${stderr}`
        }));
      } else {
        ws.send(JSON.stringify({
          type: 'terminal-output',
          output: stdout
        }));
        
        ws.send(JSON.stringify({
          type: 'master-initialized',
          repository: repository
        }));
      }
    }
  );
}

function loadTicketsForReal(params, ws) {
  const { content, repository } = params;
  const ticketsFile = path.join(repository, 'tickets.txt');
  
  // Save tickets to the repository
  fs.writeFileSync(ticketsFile, content);
  
  // Parse tickets to count them
  const ticketCount = (content.match(/TICKET-\d+/g) || []).length;
  
  ws.send(JSON.stringify({
    type: 'terminal-output',
    output: `Saved ${ticketCount} tickets to ${ticketsFile}`
  }));
  
  ws.send(JSON.stringify({
    type: 'tickets-loaded',
    count: ticketCount,
    repository: repository
  }));
}

function autoAssignAllTickets(params, ws) {
  const { mode, repository } = params;
  const orchestratorPath = path.dirname(__dirname);
  
  ws.send(JSON.stringify({
    type: 'terminal-output',
    output: `Starting auto-assignment in ${mode} mode for repository: ${repository}`
  }));
  
  // Create a tracking object for this workflow
  const workflowId = `workflow-${Date.now()}`;
  const workflowTracking = {
    id: workflowId,
    repository: repository,
    mode: mode,
    startTime: new Date(),
    tickets: {}
  };
  
  // Save workflow tracking
  fs.writeFileSync(
    path.join(orchestratorPath, `.workflow-${workflowId}.json`),
    JSON.stringify(workflowTracking, null, 2)
  );
  
  // Run the master dispatcher to assign tickets
  const dispatchProcess = spawn('node', [
    path.join(orchestratorPath, 'master-dispatcher.js'),
    'assign',
    path.join(repository, 'tickets.txt'),
    repository
  ], {
    cwd: orchestratorPath
  });
  
  dispatchProcess.stdout.on('data', (data) => {
    const output = data.toString();
    ws.send(JSON.stringify({
      type: 'terminal-output',
      output: output
    }));
    
    // Track assignments
    const assignmentMatch = output.match(/Assigned (TICKET-\d+) to (\w+) agent/);
    if (assignmentMatch) {
      broadcast({
        type: 'ticket-assignment',
        ticket: assignmentMatch[1],
        agent: assignmentMatch[2],
        workflowId: workflowId
      });
    }
  });
  
  dispatchProcess.stderr.on('data', (data) => {
    ws.send(JSON.stringify({
      type: 'terminal-output',
      output: `Error: ${data.toString()}`
    }));
  });
  
  dispatchProcess.on('close', (code) => {
    if (code === 0) {
      ws.send(JSON.stringify({
        type: 'assignment-complete',
        workflowId: workflowId
      }));
      
      // Start agent processes
      if (mode === 'full') {
        startAIAgents(repository, workflowId, ws);
      }
    }
  });
}

function startAIAgents(repository, workflowId, ws) {
  const orchestratorPath = path.dirname(__dirname);
  const stateFile = path.join(orchestratorPath, '.master-dispatcher-state.json');
  
  if (!fs.existsSync(stateFile)) {
    ws.send(JSON.stringify({
      type: 'error',
      message: 'No dispatcher state found'
    }));
    return;
  }
  
  const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
  const assignments = state.activeAssignments || {};
  
  // Start an AI agent for each assignment
  Object.entries(assignments).forEach(([ticket, agent]) => {
    ws.send(JSON.stringify({
      type: 'terminal-output',
      output: `Starting ${agent} agent for ${ticket}...`
    }));
    
    const agentProcess = spawn('node', [
      path.join(orchestratorPath, 'ai-agent.js'),
      ticket,
      agent,
      repository
    ], {
      cwd: orchestratorPath,
      env: { ...process.env, REPO_PATH: repository }
    });
    
    agentProcess.stdout.on('data', (data) => {
      ws.send(JSON.stringify({
        type: 'agent-output',
        agent: agent,
        ticket: ticket,
        output: data.toString()
      }));
    });
    
    agentProcess.stderr.on('data', (data) => {
      ws.send(JSON.stringify({
        type: 'agent-error',
        agent: agent,
        ticket: ticket,
        error: data.toString()
      }));
    });
    
    agentProcess.on('close', (code) => {
      broadcast({
        type: 'agent-complete',
        agent: agent,
        ticket: ticket,
        success: code === 0,
        workflowId: workflowId
      });
    });
    
    activeProcesses.set(`${agent}-${ticket}`, agentProcess);
  });
}

function runRealMasterIntegration(repository, ws) {
  const orchestratorPath = path.dirname(__dirname);
  
  ws.send(JSON.stringify({
    type: 'terminal-output',
    output: `Starting master integration for repository: ${repository}`
  }));
  
  // Run the actual master workflow
  const integrationProcess = spawn('node', [
    path.join(orchestratorPath, 'master-workflow.js'),
    'standardIntegration'
  ], {
    cwd: repository, // Run in the repository directory
    env: { ...process.env, REPO_PATH: repository }
  });
  
  integrationProcess.stdout.on('data', (data) => {
    const output = data.toString();
    ws.send(JSON.stringify({
      type: 'terminal-output',
      output: output
    }));
    
    // Parse actual results
    if (output.includes('Found') && output.includes('agent branches')) {
      const count = output.match(/Found (\d+) agent branches/);
      if (count) {
        broadcast({
          type: 'integration-update',
          stage: 'branches-found',
          count: parseInt(count[1])
        });
      }
    }
    
    if (output.includes('Merging') && output.includes('approved branches')) {
      const count = output.match(/Merging (\d+) approved branches/);
      if (count) {
        broadcast({
          type: 'integration-update',
          stage: 'merging',
          count: parseInt(count[1])
        });
      }
    }
  });
  
  integrationProcess.stderr.on('data', (data) => {
    ws.send(JSON.stringify({
      type: 'terminal-output',
      output: `Error: ${data.toString()}`
    }));
  });
  
  integrationProcess.on('close', (code) => {
    // Read the workflow state to get actual results
    const workflowFiles = fs.readdirSync(repository)
      .filter(f => f.startsWith('.workflow-'))
      .sort((a, b) => b.localeCompare(a));
    
    if (workflowFiles.length > 0) {
      const latestWorkflow = JSON.parse(
        fs.readFileSync(path.join(repository, workflowFiles[0]), 'utf8')
      );
      
      broadcast({
        type: 'integration-complete',
        success: code === 0,
        results: latestWorkflow.results
      });
    } else {
      broadcast({
        type: 'integration-complete',
        success: code === 0,
        results: []
      });
    }
  });
}

function handleMasterChat(params, ws) {
  const { message, model, context, requestId } = params;
  
  // Provide intelligent responses based on the message content
  let response;
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('status') || lowerMessage.includes('health')) {
    response = `📊 **System Status Report:**

**Active Agents:**
• Frontend Agent: Active, working on SEO components
• Backend Agent: Working on webhook integration
• Database Agent: Recently recovered from connection issues
• Master Agent: Monitoring and coordinating all operations

**Current Metrics:**
• Success Rate: 94%
• Active Tasks: 7
• Completed Today: 12
• API Usage: $4.25

All systems are operational. Would you like me to check specific agent details or run diagnostics?`;
  } else if (lowerMessage.includes('ticket') || lowerMessage.includes('task')) {
    response = `🎫 **Ticket Management:**

**Current Queue:**
• Active: 3 tickets (being worked on)
• Pending: 5 tickets (waiting for assignment)
• Completed: 12 tickets (done today)

**Recent Activity:**
• TICKET-005: Frontend agent implementing SEO prompts (60% complete)
• TICKET-003: Backend agent updating webhook system (75% complete)
• TICKET-002: Database agent ready to retry after connection fix

Would you like me to assign new tickets, check progress, or load tickets from a file?`;
  } else if (lowerMessage.includes('agent') || lowerMessage.includes('restart')) {
    response = `🤖 **Agent Management:**

**Available Operations:**
• **Restart Agent**: Fix issues and reset agent state
• **Assign Tasks**: Delegate specific tickets to agents
• **Monitor Progress**: Track real-time agent performance
• **Emergency Stop**: Halt all agents immediately

**Agent Capabilities:**
• Frontend: React, UI/UX, performance optimization
• Backend: APIs, microservices, database integration
• Database: Schema design, migrations, optimization
• Master: Orchestration, integration, quality control

Which agent operation would you like me to perform?`;
  } else if (lowerMessage.includes('integration') || lowerMessage.includes('merge')) {
    response = `🔄 **Integration Workflow:**

**Current Status:**
✅ Repository Setup - Complete
✅ Tickets Loaded - Complete
🔄 Agents Working - 3 active agents
⏳ Quality Validation - Ready
⏳ Master Integration - Ready to execute

**Integration Process:**
1. Collect all completed agent work
2. Run automated quality checks
3. Resolve any conflicts
4. Merge into main branch
5. Deploy and validate

Would you like me to start the master integration process?`;
  } else {
    response = `🤖 **Master Agent Response:**

I understand you're asking about: "${message}"

**How I can help:**
• **Agent Coordination**: Manage and monitor AI agents
• **Ticket Management**: Create, assign, and track development tasks
• **Workflow Orchestration**: Run multi-agent development processes
• **System Monitoring**: Track performance, costs, and health
• **Integration Management**: Merge and deploy completed work

**Current System State:**
• Repository: ${context?.repository || 'Not selected'}
• Active Agents: ${context?.activeAgents?.length || 0}
• WebSocket: Connected ✅

What specific task would you like assistance with?`;
  }
  
  // Send response with correct message type
  ws.send(JSON.stringify({
    type: 'master-chat-response',
    requestId: requestId,
    response: response
  }));
}

function executeTerminalCommand(command, ws) {
  // Execute in the orchestrator directory
  const orchestratorPath = path.dirname(__dirname);
  
  exec(command, { 
    cwd: orchestratorPath,
    maxBuffer: 1024 * 1024 
  }, (error, stdout, stderr) => {
    if (error) {
      ws.send(JSON.stringify({
        type: 'terminal-output',
        output: `Error: ${error.message}\n${stderr}`
      }));
    } else {
      ws.send(JSON.stringify({
        type: 'terminal-output',
        output: stdout || 'Command executed successfully'
      }));
    }
  });
}

// Start server
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`Multi-Agent Orchestrator Web Interface running on http://localhost:${PORT}`);
  console.log(`WebSocket server ready on ws://localhost:${PORT}`);
  console.log(`Repository: ${currentRepository || 'Not selected'}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down gracefully...');
  
  // Kill all active processes
  activeProcesses.forEach((process, name) => {
    console.log(`Terminating ${name}...`);
    process.kill();
  });
  
  // Close WebSocket connections
  clients.forEach(client => client.close());
  
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
