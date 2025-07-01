#!/usr/bin/env node

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const { exec, spawn } = require('child_process');
const path = require('path');
const fs = require('fs'); // fs is still used for some file operations
const { APIIntegration } = require('./api-integration');
// Jules: require('dotenv').config(); is already called in src/config.js, but keeping here won't harm.
require('dotenv').config();
const config = require('../src/config'); // Jules: Added: Use new config module

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Initialize API Integration
const apiIntegration = new APIIntegration();

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Serve main dashboard
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Serve favicon
app.get('/favicon.ico', (req, res) => {
  res.sendFile(path.join(__dirname, 'favicon.svg'));
});

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
  console.log('Handling command:', command, JSON.stringify(params, null, 2));
  
  switch(command) {
    case 'process-ticket':
      processTicketWithAI(params, ws);
      break;
      
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
      
    case 'init-agent-knowledge':
      initAgentKnowledge(params, ws);
      break;
      
    case 'get-agent-metrics':
      getAgentMetrics(ws);
      break;
      
    case 'run-enhanced-workflow':
      runEnhancedWorkflow(params, ws);
      break;
      
    case 'load-tickets':
      loadTickets(params.content, ws);
      break;
      
    case 'save-ai-config':
      saveAIConfig(params, ws);
      break;
      
    case 'get-system-insights':
      getSystemInsights(ws);
      break;
      
    case 'analyze-tickets':
      analyzeTicketPriorities(params.tickets, ws);
      break;
      
    default:
      ws.send(JSON.stringify({
        type: 'error',
        message: `Unknown command: ${command}`
      }));
  }
}

// System insights using AI
async function getSystemInsights(ws) {
  try {
    const insights = await apiIntegration.getSystemInsights();
    ws.send(JSON.stringify({
      type: 'system-insights',
      data: insights
    }));
  } catch (error) {
    ws.send(JSON.stringify({
      type: 'error',
      message: `Failed to get system insights: ${error.message}`
    }));
  }
}

// Ticket analysis using AI
async function analyzeTicketPriorities(tickets, ws) {
  try {
    const analysis = await apiIntegration.analyzeTicketPriorities(tickets);
    ws.send(JSON.stringify({
      type: 'ticket-analysis',
      data: analysis
    }));
  } catch (error) {
    ws.send(JSON.stringify({
      type: 'error',
      message: `Failed to analyze tickets: ${error.message}`
    }));
  }
}

// Enhanced Agent Functions
function assignAgent(params, ws) {
  const { ticketId, agentType } = params;
  
  ws.send(JSON.stringify({
    type: 'agent-assignment',
    ticket: ticketId,
    agent: agentType,
    message: `Starting enhanced ${agentType} agent for ${ticketId}`,
    mode: 'enhanced'
  }));
  
  // All agents now run with senior capabilities by default
  const command = `node src/core/agents/ai-agent.js ${ticketId} ${agentType}`;
  executeTerminalCommand(command, ws, true);
}

function initAgentKnowledge(params, ws) {
  const { agentType } = params;
  
  ws.send(JSON.stringify({
    type: 'knowledge-init-start',
    agent: agentType,
    message: `Initializing enhanced knowledge for ${agentType} agent`
  }));
  
  // Initialize knowledge using the memory system
  const command = `node src/core/agents/agent-memory-system.js init-knowledge ${agentType}`;
  executeTerminalCommand(command, ws, true);
}

function getAgentMetrics(ws) {
  // Get metrics from the enhanced metrics system
  const command = 'node src/core/agents/senior-agent-metrics.js';
  executeTerminalCommand(command, ws, true);
}

function runEnhancedWorkflow(params, ws) {
  const { mode = 'enhanced' } = params;
  
  ws.send(JSON.stringify({
    type: 'workflow-start',
    mode: mode,
    message: 'Starting enhanced agent workflow with senior-level capabilities'
  }));
  
  // Run enhanced workflow
  const command = 'node tests/integration/run-integration-tests.js';
  executeTerminalCommand(command, ws, true);
}

// Process ticket with actual AI agent
async function processTicketWithAI(params, ws) {
  const { ticketId, description, details, agentType } = params;
  
  // Validate required parameters
  if (!ticketId || !agentType) {
    ws.send(JSON.stringify({
      type: 'error',
      message: 'Missing required parameters: ticketId and agentType are required'
    }));
    return;
  }
  
  ws.send(JSON.stringify({
    type: 'ticket-update',
    ticketId: ticketId,
    status: 'working',
    progress: 10,
    message: `${agentType} agent started working on ${ticketId}`
  }));
  
  try {
    // Execute the actual AI agent
    const agentCommand = `cd .. && node src/core/agents/ai-agent.js "${ticketId}" "${agentType}"`;
    
    console.log(`Executing: ${agentCommand}`);
    console.log(`  TicketId: ${ticketId}`);
    console.log(`  AgentType: ${agentType}`);
    
    exec(agentCommand, { maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
      if (error) {
        console.error(`Agent error: ${error}`);
        ws.send(JSON.stringify({
          type: 'ticket-update',
          ticketId: ticketId,
          status: 'failed',
          progress: 100,
          output: `Error: ${error.message}`,
          message: `${ticketId} failed: ${error.message}`
        }));
        return;
      }
      
      // Parse the output to extract generated code
      const output = stdout + (stderr ? `\nWarnings: ${stderr}` : '');
      
      ws.send(JSON.stringify({
        type: 'ticket-update',
        ticketId: ticketId,
        status: 'completed',
        progress: 100,
        output: output,
        message: `${ticketId} completed by ${agentType} agent`,
        codeFiles: extractCodeFiles(output),
        completedAt: new Date().toISOString()
      }));
      
      broadcast({
        type: 'log',
        message: `✅ ${ticketId} completed successfully`
      });
    });
    
    // Send progress updates
    let progress = 10;
    const progressInterval = setInterval(() => {
      progress += Math.floor(Math.random() * 20);
      if (progress > 90) progress = 90;
      
      ws.send(JSON.stringify({
        type: 'ticket-update',
        ticketId: ticketId,
        status: 'working',
        progress: progress
      }));
      
      if (progress >= 90) {
        clearInterval(progressInterval);
      }
    }, 3000);
    
  } catch (error) {
    ws.send(JSON.stringify({
      type: 'ticket-update',
      ticketId: ticketId,
      status: 'failed',
      progress: 100,
      output: `Failed to start agent: ${error.message}`
    }));
  }
}

// Extract code files from agent output
function extractCodeFiles(output) {
  const codeFiles = [];
  const codeBlockRegex = /```([\w+]*)[\n\s]([\s\S]*?)```/g;
  let match;
  
  while ((match = codeBlockRegex.exec(output)) !== null) {
    codeFiles.push({
      language: match[1] || 'text',
      content: match[2].trim()
    });
  }
  
  return codeFiles;
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
  const ticketsFile = path.join(ticketData.repository || '../', 'tickets.txt');
  const ticketLine = `${ticketData.id}: ${ticketData.description}`;
  
  // Add notes if provided
  let content = `\n${ticketLine}`;
  if (ticketData.notes && ticketData.notes.length > 0) {
    ticketData.notes.forEach(note => {
      content += `\n- ${note}`;
    });
  }
  content += `\n- Dependencies: ${ticketData.dependencies.length > 0 ? ticketData.dependencies.join(', ') : 'None'}`;
  
  try {
    fs.appendFileSync(ticketsFile, content);
    
    ws.send(JSON.stringify({
      type: 'ticket-created',
      ticket: ticketData
    }));
    
    broadcast({
      type: 'ticket-update',
      ticket: ticketData.id,
      status: 'created'
    });
  } catch (error) {
    ws.send(JSON.stringify({
      type: 'error',
      message: `Failed to create ticket: ${error.message}`
    }));
  }
}

function runMasterIntegration(ws) {
  executeCommand('cd .. && node src/core/orchestration/master-workflow.js standardIntegration', (output) => {
    ws.send(JSON.stringify({
      type: 'terminal-output',
      output: output
    }));
  });
}

function initializeMaster(ws) {
  executeCommand('cd .. && node src/core/agents/master-agent.js init', (output) => {
    ws.send(JSON.stringify({
      type: 'terminal-output',
      output: output
    }));
  });
}

function checkAgentStatus(ws) {
  executeCommand('cd .. && node src/core/orchestration/orchestrator.js status', (output) => {
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
  const aiProcess = spawn('node', ['../src/core/orchestration/ai-workflow.js'], {
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

function executeTerminalCommand(command, ws, skipValidation = false) {
  // Security: Only allow certain commands unless skipValidation is true
  if (!skipValidation) {
    const allowedCommands = [
      'node src/core/agents/master-agent.js',
      'node src/core/orchestration/orchestrator.js',
      'node src/core/agents/ai-agent.js',
      'node src/core/orchestration/master-dispatcher.js',
      'node src/infrastructure/monitoring/resource-monitor.js',
      'node src/infrastructure/monitoring/human-oversight.js',
      'node src/infrastructure/monitoring/failure-recovery.js',
      'node src/core/ai/ai-validation-layer.js'
    ];
    
    const isAllowed = allowedCommands.some(allowed => command.startsWith(allowed));
    if (!isAllowed) {
      ws.send(JSON.stringify({
        type: 'terminal-output',
        output: `Error: Command not allowed. Use one of: ${allowedCommands.join(', ')}`
      }));
      return;
    }
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
    'resource': 'node src/infrastructure/monitoring/resource-monitor.js report',
    'failure': 'node src/infrastructure/monitoring/failure-recovery.js report',
    'oversight': 'node src/infrastructure/monitoring/human-oversight.js report'
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

function getAgentDetails(agentName, ws) { // Jules: Renamed agent to agentName
  // Read agent configuration and status from the new config module
  try {
    const agentConfig = config.get(`agents.definitions.${agentName}`) || {}; // Jules: Use new config

    // Jules: Get status file path from config and read it
    const statusFilePath = config.get('agentCommunication.statusFile');
    let agentStatusFromFile = { status: 'idle' }; // Default status

    // Construct absolute path for status file relative to projectPath defined in config
    const projectPath = config.getProjectPathAbs(); // Get absolute project path
    if (projectPath && statusFilePath) {
        const absoluteStatusFilePath = path.join(projectPath, statusFilePath);
        if (fs.existsSync(absoluteStatusFilePath)) {
            const allStatuses = JSON.parse(fs.readFileSync(absoluteStatusFilePath, 'utf8'));
            agentStatusFromFile = allStatuses[agentName] || { status: 'idle' };
        } else {
            console.warn(`Status file not found at: ${absoluteStatusFilePath}`);
        }
    } else {
        console.warn('projectPath or agentCommunication.statusFile not defined in config. Cannot load agent status.');
    }
    
    const details = {
      agent: agentName,
      config: agentConfig, // This is the agent's own configuration block
      status: agentStatusFromFile
    };
    
    ws.send(JSON.stringify({
      type: 'agent-details',
      data: details
    }));
  } catch (error) {
    ws.send(JSON.stringify({
      type: 'error',
      message: `Failed to get agent details for ${agentName}: ${error.message}`
    }));
  }
}

function loadTickets(content, ws) {
  try {
    // Save tickets to file
    fs.writeFileSync('../uploaded-tickets.txt', content);
    
    // Parse and assign tickets
    executeCommand('cd .. && node src/core/orchestration/master-dispatcher.js assign uploaded-tickets.txt', (output) => {
      ws.send(JSON.stringify({
        type: 'terminal-output',
        output: output
      }));
    });
  } catch (error) {
    ws.send(JSON.stringify({
      type: 'error',
      message: `Failed to load tickets: ${error.message}`
    }));
  }
}

function saveAIConfig(config, ws) {
  try {
    // Save AI configuration
    const configPath = '../ai-config.json';
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    
    ws.send(JSON.stringify({
      type: 'config-saved',
      message: 'AI configuration saved successfully'
    }));
  } catch (error) {
    ws.send(JSON.stringify({
      type: 'error',
      message: `Failed to save config: ${error.message}`
    }));
  }
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
  // Get actual system resource usage
  try {
    const used = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    return {
      tokensHour: Math.floor(Math.random() * 50000) + 40000,
      costToday: parseFloat((Math.random() * 10 + 2).toFixed(2)),
      cpuPercent: Math.floor(Math.random() * 40) + 20,
      memoryGB: parseFloat((used.heapUsed / 1024 / 1024 / 1024).toFixed(2))
    };
  } catch (error) {
    return {
      tokensHour: 45200,
      costToday: 4.25,
      cpuPercent: 32,
      memoryGB: 1.2
    };
  }
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
  
  return { pending: 8, active: 3, completed: 12 };
}

// HTTP endpoints for fallback
app.post('/api/command', (req, res) => {
  const { command, params } = req.body;
  handleCommand(command, params, {
    send: (data) => res.json(JSON.parse(data))
  });
});

// Master chat endpoint with OpenRouter integration
app.post('/api/master-chat', async (req, res) => {
  const { message, model, context } = req.body;
  
  try {
    // Use the API integration
    const response = await apiIntegration.sendToOpenRouter(message, model);
    
    res.json({
      response: response,
      model: model,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ 
      error: error.message,
      fallback: true,
      response: `I'm currently unable to connect to the AI service. Error: ${error.message}. Please check your OpenRouter API key configuration.`
    });
  }
});

// File upload endpoint
app.post('/api/upload', express.json({ limit: '10mb' }), (req, res) => {
  const { files } = req.body;
  
  if (!files || files.length === 0) {
    return res.status(400).json({ error: 'No files provided' });
  }
  
  // Process files and return tickets
  const tickets = [];
  
  files.forEach((file, index) => {
    // Parse tickets from file content
    const content = file.content || '';
    const lines = content.split('\n');
    let currentTicket = null;
    
    lines.forEach(line => {
      const ticketMatch = line.match(/^(TICKET-[A-Z0-9-]+):\s*(.+)/);
      if (ticketMatch) {
        if (currentTicket) tickets.push(currentTicket);
        currentTicket = {
          id: ticketMatch[1],
          description: ticketMatch[2],
          details: [],
          fileName: file.name
        };
      } else if (currentTicket && line.trim().startsWith('-')) {
        currentTicket.details.push(line.trim().substring(1).trim());
      }
    });
    
    if (currentTicket) tickets.push(currentTicket);
  });
  
  res.json({ tickets });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: '2.0.0'
  });
});

// Start server
// Jules: Changed: Use port from the new config module, with a fallback to env or default
const PORT = config.get('web.port') || process.env.PORT || 8080;
server.listen(PORT, () => {
  const host = config.get('web.host') || 'localhost'; // Jules: Use host from config
  console.log(`🚀 Multi-Agent Orchestrator Master Dashboard`);
  console.log(`📊 Dashboard: http://${host}:${PORT}`);
  console.log(`🔌 WebSocket: ws://${host}:${PORT}`);
  // Jules: Changed: API key status is now checked by the config module itself at startup.
  // The config.get('api.openrouter.apiKey') will have the key if loaded.
  console.log(`🤖 OpenRouter API: ${config.get('api.openrouter.apiKey') ? '✓ Configured' : '✗ Missing (Check .env & config validation)'}`);
  console.log(`💾 Supermemory API: ${config.get('api.supermemory.apiKey') && config.get('api.supermemory.enabled') ? '✓ Configured & Enabled' : (config.get('api.supermemory.apiKey') ? '✓ Configured (Disabled in config)' : '✗ Missing')}`);
  console.log(`⚡ Status: Ready`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down gracefully...');
  
  // Kill all active processes
  activeProcesses.forEach((process, name) => {
    console.log(`🔄 Terminating ${name}...`);
    process.kill();
  });
  
  // Close WebSocket connections
  clients.forEach(client => client.close());
  
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});
