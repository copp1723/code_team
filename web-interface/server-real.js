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

// Store active processes and current repository
const activeProcesses = new Map();
const clients = new Set();
let currentRepository = '/Users/copp1723/Desktop/rylie-seo-hub-v2';

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
        path: currentRepository
      }));
      break;
      
    case 'check-master-status':
      checkMasterStatus(params.repository || currentRepository, ws);
      break;
      
    case 'init-master':
      initializeMaster(params.repository || currentRepository, ws);
      break;
      
    case 'load-tickets':
      loadTickets(params, ws);
      break;
      
    case 'auto-assign-all':
      autoAssignAllTickets(params, ws);
      break;
      
    case 'master-integration':
      runMasterIntegration(params.repository || currentRepository, ws);
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

// Real command implementations that actually run the scripts
function checkMasterStatus(repository, ws) {
  const masterFile = path.join(repository, '.master-agent.json');
  const exists = fs.existsSync(masterFile);
  
  ws.send(JSON.stringify({
    type: 'master-status',
    initialized: exists,
    repository: repository
  }));
}

function initializeMaster(repository, ws) {
  console.log(`Initializing master agent in ${repository}`);
  
  // Copy necessary files if they don't exist
  const orchestratorPath = '/Users/copp1723/Desktop/rylie-seo-hub-v2';
  const requiredFiles = ['master-agent.js', 'master-agent-config.json'];
  
  requiredFiles.forEach(file => {
    const sourcePath = path.join(orchestratorPath, file);
    const targetPath = path.join(repository, file);
    if (!fs.existsSync(targetPath) && fs.existsSync(sourcePath)) {
      fs.copyFileSync(sourcePath, targetPath);
      console.log(`Copied ${file} to ${repository}`);
    }
  });
  
  exec(`cd "${repository}" && node master-agent.js init`, (error, stdout, stderr) => {
    if (error) {
      ws.send(JSON.stringify({
        type: 'terminal-output',
        output: `Error initializing master: ${error.message}`
      }));
      return;
    }
    
    ws.send(JSON.stringify({
      type: 'terminal-output',
      output: stdout || 'Master agent initialized successfully'
    }));
    
    broadcast({
      type: 'master-initialized',
      repository: repository
    });
  });
}

function loadTickets(params, ws) {
  const { content, repository } = params;
  const ticketsFile = path.join(repository, 'uploaded-tickets.txt');
  
  // Save tickets to file
  fs.writeFileSync(ticketsFile, content);
  
  // Count tickets
  const ticketCount = (content.match(/TICKET-/g) || []).length;
  
  ws.send(JSON.stringify({
    type: 'tickets-loaded',
    count: ticketCount,
    repository: repository
  }));
}

function autoAssignAllTickets(params, ws) {
  const { mode, repository } = params;
  const ticketsFile = path.join(repository, 'uploaded-tickets.txt');
  
  console.log(`Auto-assigning tickets in ${repository} with mode: ${mode}`);
  
  // First, run the dispatcher to parse and assign tickets
  exec(`cd "${repository}" && node master-dispatcher.js assign uploaded-tickets.txt`, 
    (error, stdout, stderr) => {
      if (error) {
        ws.send(JSON.stringify({
          type: 'terminal-output',
          output: `Error assigning tickets: ${error.message}`
        }));
        return;
      }
      
      ws.send(JSON.stringify({
        type: 'terminal-output',
        output: stdout
      }));
      
      // If in full AI mode, start the AI agents
      if (mode === 'full') {
        startAIAgents(repository, ws);
      }
    }
  );
}

function startAIAgents(repository, ws) {
  console.log(`Starting AI agents in ${repository}`);
  
  // Read the dispatcher state to get assignments
  const stateFile = path.join(repository, '.master-dispatcher-state.json');
  
  if (fs.existsSync(stateFile)) {
    const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    const assignments = state.activeAssignments || {};
    
    // Start an AI agent for each assignment
    Object.entries(assignments).forEach(([ticketId, assignment]) => {
      if (assignment.status !== 'completed') {
        const agentType = assignment.agent;
        
        ws.send(JSON.stringify({
          type: 'terminal-output',
          output: `\n🤖 Starting AI ${agentType} agent for ${ticketId}...`
        }));
        
        // Run the AI agent
        const aiProcess = spawn('node', ['ai-agent.js', ticketId, agentType], {
          cwd: repository,
          env: { ...process.env, OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY }
        });
        
        aiProcess.stdout.on('data', (data) => {
          ws.send(JSON.stringify({
            type: 'terminal-output',
            output: data.toString()
          }));
          
          broadcast({
            type: 'agent-update',
            agent: agentType,
            status: 'working',
            output: data.toString()
          });
        });
        
        aiProcess.stderr.on('data', (data) => {
          ws.send(JSON.stringify({
            type: 'terminal-output',
            output: `Error: ${data.toString()}`
          }));
        });
        
        aiProcess.on('close', (code) => {
          ws.send(JSON.stringify({
            type: 'terminal-output',
            output: `\n✅ ${agentType} agent completed ${ticketId} (exit code: ${code})`
          }));
          
          // Mark ticket as completed
          exec(`cd "${repository}" && node master-dispatcher.js complete ${ticketId}`, 
            (error, stdout) => {
              if (!error) {
                broadcast({
                  type: 'ticket-update',
                  ticket: ticketId,
                  status: 'completed'
                });
              }
            }
          );
        });
        
        // Store the process
        activeProcesses.set(`${ticketId}-${agentType}`, aiProcess);
      }
    });
  }
}

function runMasterIntegration(repository, ws) {
  console.log(`Running master integration in ${repository}`);
  
  const integrationProcess = spawn('node', ['master-workflow.js', 'standardIntegration'], {
    cwd: repository
  });
  
  integrationProcess.stdout.on('data', (data) => {
    ws.send(JSON.stringify({
      type: 'terminal-output',
      output: data.toString()
    }));
  });
  
  integrationProcess.stderr.on('data', (data) => {
    ws.send(JSON.stringify({
      type: 'terminal-output',
      output: `Error: ${data.toString()}`
    }));
  });
  
  integrationProcess.on('close', (code) => {
    ws.send(JSON.stringify({
      type: 'integration-complete',
      exitCode: code
    }));
  });
  
  activeProcesses.set('master-integration', integrationProcess);
}

function executeTerminalCommand(command, ws) {
  // Parse the command to determine the repository
  let repository = currentRepository;
  let actualCommand = command;
  
  // Check if command includes a cd
  if (command.startsWith('cd ')) {
    const match = command.match(/cd\s+"?([^"]+)"?\s*&&\s*(.+)/);
    if (match) {
      repository = match[1];
      actualCommand = match[2];
    }
  }
  
  console.log(`Executing in ${repository}: ${actualCommand}`);
  
  exec(actualCommand, { cwd: repository }, (error, stdout, stderr) => {
    if (error) {
      ws.send(JSON.stringify({
        type: 'terminal-output',
        output: `Error: ${error.message}`
      }));
      return;
    }
    if (stderr) {
      ws.send(JSON.stringify({
        type: 'terminal-output',
        output: `Warning: ${stderr}`
      }));
    }
    ws.send(JSON.stringify({
      type: 'terminal-output',
      output: stdout
    }));
  });
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
  
  // Set the API key if available
  if (process.env.OPENROUTER_API_KEY) {
    console.log('✅ OpenRouter API key detected');
  } else {
    console.log('⚠️  No OPENROUTER_API_KEY found - AI features will not work');
  }
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
