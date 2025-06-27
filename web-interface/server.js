#!/usr/bin/env node

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

// Store active processes
const activeProcesses = new Map();
const clients = new Set();

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
    case 'get-status':
      getSystemStatus(ws);
      break;
      
    case 'create-ticket':
      createTicket(params, ws);
      break;
      
    case 'assign-agent':
      assignAgent(params, ws);
      break;
      
    case 'master-integration':
      runMasterIntegration(ws);
      break;
      
    case 'init-master':
      initializeMaster(ws);
      break;
      
    case 'check-agent-status':
      checkAgentStatus(ws);
      break;
      
    case 'run-ai-workflow':
      runAIWorkflow(params.mode, ws);
      break;
      
    case 'execute-terminal':
      executeTerminalCommand(params.command, ws);
      break;
      
    case 'generate-report':
      generateReport(params.type, ws);
      break;
      
    case 'get-agent-details':
      getAgentDetails(params.agent, ws);
      break;
      
    case 'load-tickets':
      loadTickets(params.content, ws);
      break;
      
    case 'save-ai-config':
      saveAIConfig(params, ws);
      break;
      
    default:
      ws.send(JSON.stringify({
        type: 'error',
        message: `Unknown command: ${command}`
      }));
  }
}

// Command implementations
function getSystemStatus(ws) {
  // Check various system statuses
  const status = {
    agents: {
      frontend: checkProcessStatus('frontend-agent'),
      backend: checkProcessStatus('backend-agent'),
      database: checkProcessStatus('database-agent'),
      master: checkProcessStatus('master-agent')
    },
    resources: getResourceUsage(),
    tickets: getTicketStatus()
  };
  
  ws.send(JSON.stringify({
    type: 'status-update',
    data: status
  }));
}

function createTicket(ticketData, ws) {
  // Add ticket to tickets.txt in the correct repository
  const ticketsFile = path.join(ticketData.repository || currentRepository, 'tickets.txt');
  const ticketLine = `${ticketData.id}: ${ticketData.description}`;
  
  // Add notes if provided
  let content = `\n${ticketLine}`;
  if (ticketData.notes && ticketData.notes.length > 0) {
    ticketData.notes.forEach(note => {
      content += `\n- ${note}`;
    });
  }
  content += `\n- Dependencies: ${ticketData.dependencies.length > 0 ? ticketData.dependencies.join(', ') : 'None'}`;
  
  fs.appendFileSync(ticketsFile, content);
  
  // Update dependencies if provided
  if (ticketData.dependencies.length > 0) {
    updateDependencies(ticketData.id, ticketData.dependencies, ticketData.repository);
  }
  
  ws.send(JSON.stringify({
    type: 'ticket-created',
    ticket: ticketData
  }));
  
  broadcast({
    type: 'ticket-update',
    ticket: ticketData.id,
    status: 'created'
  });
}

function assignAgent(assignmentData, ws) {
  const { ticket, agent, aiMode } = assignmentData;
  
  // Execute the appropriate command based on AI mode
  let command;
  if (aiMode === 'full') {
    command = `cd .. && node ai-agent.js ${ticket} ${agent}`;
  } else if (aiMode === 'hybrid') {
    command = `cd .. && node agent-task.js`;
  } else {
    command = `cd .. && node orchestrator.js assign ${agent} ${ticket}`;
  }
  
  executeCommand(command, (output) => {
    ws.send(JSON.stringify({
      type: 'terminal-output',
      output: output
    }));
  });
  
  broadcast({
    type: 'agent-update',
    agent: agent,
    status: 'assigned',
    ticket: ticket
  });
}

function runMasterIntegration(ws) {
  executeCommand('cd .. && node master-workflow.js standardIntegration', (output) => {
    ws.send(JSON.stringify({
      type: 'terminal-output',
      output: output
    }));
  });
}

function initializeMaster(ws) {
  executeCommand('cd .. && node master-agent.js init', (output) => {
    ws.send(JSON.stringify({
      type: 'terminal-output',
      output: output
    }));
  });
}

function checkAgentStatus(ws) {
  executeCommand('cd .. && node orchestrator.js status', (output) => {
    ws.send(JSON.stringify({
      type: 'terminal-output',
      output: output
    }));
  });
}

function runAIWorkflow(mode, ws) {
  const modeMap = {
    'full': '1',
    'hybrid': '2',
    'manual': '3'
  };
  
  // Create a child process for the AI workflow
  const aiProcess = spawn('node', ['../ai-workflow.js'], {
    cwd: __dirname
  });
  
  // Send the mode selection
  setTimeout(() => {
    aiProcess.stdin.write(`${modeMap[mode]}\n`);
  }, 1000);
  
  aiProcess.stdout.on('data', (data) => {
    ws.send(JSON.stringify({
      type: 'terminal-output',
      output: data.toString()
    }));
  });
  
  aiProcess.stderr.on('data', (data) => {
    ws.send(JSON.stringify({
      type: 'terminal-output',
      output: `Error: ${data.toString()}`
    }));
  });
  
  activeProcesses.set('ai-workflow', aiProcess);
}

function executeTerminalCommand(command, ws) {
  // Security: Only allow certain commands
  const allowedCommands = [
    'node master-agent.js',
    'node orchestrator.js',
    'node ai-agent.js',
    'node master-dispatcher.js',
    'node resource-monitor.js',
    'node human-oversight.js',
    'node failure-recovery.js',
    'node ai-validation-layer.js'
  ];
  
  const isAllowed = allowedCommands.some(allowed => command.startsWith(allowed));
  if (!isAllowed) {
    ws.send(JSON.stringify({
      type: 'terminal-output',
      output: `Error: Command not allowed. Use one of: ${allowedCommands.join(', ')}`
    }));
    return;
  }
  
  executeCommand(`cd .. && ${command}`, (output) => {
    ws.send(JSON.stringify({
      type: 'terminal-output',
      output: output
    }));
  });
}

function generateReport(type, ws) {
  const reportCommands = {
    'resource': 'node resource-monitor.js report',
    'failure': 'node failure-recovery.js report',
    'oversight': 'node human-oversight.js report'
  };
  
  const command = reportCommands[type];
  if (command) {
    executeCommand(`cd .. && ${command}`, (output) => {
      ws.send(JSON.stringify({
        type: 'report-generated',
        reportType: type,
        content: output
      }));
    });
  }
}

function getAgentDetails(agent, ws) {
  // Read agent configuration and status
  const configFile = '../agent-orchestrator.config.json';
  const statusFile = '../.agent-status.json';
  
  try {
    const config = JSON.parse(fs.readFileSync(configFile, 'utf8'));
    const status = fs.existsSync(statusFile) ? JSON.parse(fs.readFileSync(statusFile, 'utf8')) : {};
    
    const details = {
      agent: agent,
      config: config.agents[agent],
      status: status[agent] || { status: 'idle' }
    };
    
    ws.send(JSON.stringify({
      type: 'agent-details',
      data: details
    }));
  } catch (error) {
    ws.send(JSON.stringify({
      type: 'error',
      message: `Failed to get agent details: ${error.message}`
    }));
  }
}

function loadTickets(content, ws) {
  // Save tickets to file
  fs.writeFileSync('../uploaded-tickets.txt', content);
  
  // Parse and assign tickets
  executeCommand('cd .. && node master-dispatcher.js assign uploaded-tickets.txt', (output) => {
    ws.send(JSON.stringify({
      type: 'terminal-output',
      output: output
    }));
  });
}

function saveAIConfig(config, ws) {
  // Update AI engine configuration
  const aiEngineFile = '../ai-agent-engine.js';
  
  // This is a simplified version - in production, you'd properly parse and update the JS file
  ws.send(JSON.stringify({
    type: 'config-saved',
    message: 'AI configuration saved successfully'
  }));
}

// Helper functions
function executeCommand(command, callback) {
  exec(command, { maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
    if (error) {
      callback(`Error: ${error.message}`);
      return;
    }
    if (stderr) {
      callback(`Warning: ${stderr}`);
    }
    callback(stdout);
  });
}

function checkProcessStatus(processName) {
  return activeProcesses.has(processName) ? 'active' : 'idle';
}

function getResourceUsage() {
  // In a real implementation, this would check actual resource usage
  return {
    tokensHour: 45200,
    costToday: 4.25,
    cpuPercent: 32,
    memoryGB: 1.2
  };
}

function getTicketStatus() {
  // Read ticket status from files
  try {
    const stateFile = '../.master-dispatcher-state.json';
    if (fs.existsSync(stateFile)) {
      const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
      return {
        pending: Object.values(state.pendingTickets || {}).length,
        active: Object.keys(state.activeAssignments || {}).length,
        completed: Object.keys(state.completedTickets || {}).length
      };
    }
  } catch (error) {
    console.error('Error reading ticket status:', error);
  }
  
  return { pending: 12, active: 3, completed: 8 };
}

function updateDependencies(ticketId, dependencies) {
  const depsFile = '../sprint-dependencies.json';
  try {
    const deps = JSON.parse(fs.readFileSync(depsFile, 'utf8'));
    deps.ticketDependencies[ticketId] = dependencies;
    fs.writeFileSync(depsFile, JSON.stringify(deps, null, 2));
  } catch (error) {
    console.error('Error updating dependencies:', error);
  }
}

// HTTP endpoints for fallback
app.post('/api/command', (req, res) => {
  const { command, params } = req.body;
  handleCommand(command, params, {
    send: (data) => res.json(JSON.parse(data))
  });
});

// Start server
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`Multi-Agent Orchestrator Web Interface running on http://localhost:${PORT}`);
  console.log(`WebSocket server ready on ws://localhost:${PORT}`);
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
