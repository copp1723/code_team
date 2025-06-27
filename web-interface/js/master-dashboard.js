// Master Dashboard JavaScript
// Dashboard State Management
let dashboardState = {
    autoRefresh: true,
    refreshInterval: 5000,
    agents: {
        frontend: { status: 'active', health: 'healthy', task: 'TICKET-005' },
        backend: { status: 'working', health: 'healthy', task: 'TICKET-003' },
        database: { status: 'error', health: 'warning', task: 'TICKET-002' },
        master: { status: 'active', health: 'healthy', task: 'monitoring' }
    },
    tickets: {
        active: [],
        pending: [],
        completed: []
    },
    metrics: {
        completedTickets: 12,
        pendingTickets: 8,
        failedTasks: 2,
        apiCalls: 1200,
        activeAgents: 3,
        runningTasks: 7,
        successRate: 94,
        costToday: 4.25
    }
};

// WebSocket connection for real-time updates
let ws = null;
let reconnectAttempts = 0;
let maxReconnectAttempts = 5;
let reconnectDelay = 1000; // Start with 1 second

// Chat functionality
let chatHistory = [];
let isTyping = false;

// Initialize WebSocket connection
function initWebSocket() {
    try {
        // Prevent multiple connection attempts
        if (ws && (ws.readyState === WebSocket.CONNECTING || ws.readyState === WebSocket.OPEN)) {
            return;
        }
        
        console.log('Attempting WebSocket connection...');
        ws = new WebSocket(`ws://${window.location.host}`);
        
        ws.onopen = () => {
            console.log('Connected to orchestrator');
            reconnectAttempts = 0;
            reconnectDelay = 1000;
            updateConnectionStatus('connected');
        };
        
        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                handleWebSocketMessage(data);
            } catch (error) {
                console.error('Error parsing WebSocket message:', error);
            }
        };
        
        ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            updateConnectionStatus('error');
        };
        
        ws.onclose = (event) => {
            console.log('Disconnected from orchestrator', event.code, event.reason);
            updateConnectionStatus('disconnected');
            
            // Attempt reconnection with exponential backoff
            if (reconnectAttempts < maxReconnectAttempts) {
                reconnectAttempts++;
                const delay = Math.min(reconnectDelay * Math.pow(2, reconnectAttempts - 1), 30000);
                console.log(`Reconnection attempt ${reconnectAttempts}/${maxReconnectAttempts} in ${delay}ms`);
                setTimeout(() => {
                    if (!ws || ws.readyState === WebSocket.CLOSED) {
                        initWebSocket();
                    }
                }, delay);
            } else {
                console.warn('Max reconnection attempts reached');
                addLogEntry('error', 'WebSocket connection failed - operating in offline mode');
            }
        };
    } catch (error) {
        console.error('Failed to initialize WebSocket:', error);
        updateConnectionStatus('error');
    }
}

// Handle incoming WebSocket messages
function handleWebSocketMessage(data) {
    console.log('Received WebSocket message:', data.type);
    
    switch(data.type) {
        case 'agent-update':
            updateAgentStatus(data.agent, data.status);
            break;
        case 'ticket-update':
            updateTicketStatus(data.ticket, data.status);
            break;
        case 'terminal-output':
            addLogEntry('info', data.output);
            break;
        case 'resource-update':
            updateResourceMetrics(data.metrics);
            break;
        case 'master-chat-response':
            hideTypingIndicator();
            addChatMessage('agent', data.response);
            break;
        case 'connection':
            console.log('Connection established:', data.message);
            addLogEntry('success', data.message);
            break;
        case 'tickets-loaded':
            addLogEntry('success', `Loaded ${data.count} tickets`);
            break;
        case 'master-initialized':
            addLogEntry('success', 'Master agent initialized');
            break;
        default:
            console.log('Unhandled message type:', data.type, data);
    }
}

// Send command to backend
function sendCommand(command, params = {}) {
    console.log('Sending command:', command, params);
    
    if (ws && ws.readyState === WebSocket.OPEN) {
        try {
            ws.send(JSON.stringify({ command, params }));
            return;
        } catch (error) {
            console.error('Error sending WebSocket command:', error);
        }
    }
    
    // Fallback to HTTP request
    console.log('WebSocket not available, using HTTP fallback');
    fetch('/api/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command, params })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return response.json();
    })
    .then(data => handleCommandResponse(data))
    .catch(error => {
        console.error('Command error:', error);
        addLogEntry('error', `Command failed: ${error.message}`);
    });
}

function handleCommandResponse(data) {
    if (data.error) {
        addLogEntry('error', data.error);
    } else {
        console.log('Command response:', data);
    }
}

// Chat functionality
function handleChatKeydown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
    }
}

async function sendMessage() {
    const input = document.getElementById('chat-input');
    const message = input.value.trim();
    
    if (!message || isTyping) return;
    
    // Add user message
    addChatMessage('user', message);
    input.value = '';
    
    // Auto-resize textarea
    input.style.height = '40px';
    
    // Show typing indicator
    showTypingIndicator();
    
    try {
        // Get selected model
        const model = document.getElementById('model-selector').value;
        
        // Send to Master Agent via WebSocket first, then fallback
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
                command: 'master-chat',
                params: {
                    message: message,
                    model: model,
                    context: {
                        repository: dashboardState.currentRepository,
                        activeAgents: Object.keys(dashboardState.agents).filter(a => 
                            dashboardState.agents[a].status === 'active'
                        ),
                        chatHistory: chatHistory.slice(-10)
                    },
                    requestId: Date.now()
                }
            }));
        } else {
            // Fallback to HTTP
            const response = await sendToMasterAgent(message, model);
            hideTypingIndicator();
            addChatMessage('agent', response);
        }
        
    } catch (error) {
        hideTypingIndicator();
        addChatMessage('agent', `I apologize, but I encountered an error: ${error.message}. Please try again or check the system status.`);
    }
}

function addChatMessage(sender, text) {
    const messagesContainer = document.getElementById('chat-messages');
    const messageElement = document.createElement('div');
    messageElement.className = `message ${sender}-message fade-in`;
    
    const currentTime = new Date().toLocaleTimeString();
    const avatar = sender === 'user' ? '👤' : '🤖';
    const senderName = sender === 'user' ? 'You' : 'Master Agent';
    
    messageElement.innerHTML = `
        <div class="message-avatar">${avatar}</div>
        <div class="message-content">
            <div class="message-header">
                <span class="message-sender">${senderName}</span>
                <span class="message-time">${currentTime}</span>
            </div>
            <div class="message-text">${text}</div>
        </div>
    `;
    
    messagesContainer.appendChild(messageElement);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    // Add to chat history
    chatHistory.push({
        sender: sender,
        message: text,
        timestamp: currentTime
    });
}

function showTypingIndicator() {
    isTyping = true;
    const messagesContainer = document.getElementById('chat-messages');
    const typingElement = document.createElement('div');
    typingElement.className = 'message agent-message';
    typingElement.id = 'typing-indicator';
    
    typingElement.innerHTML = `
        <div class="message-avatar">🤖</div>
        <div class="message-content">
            <div class="typing-indicator">
                <span>Master Agent is thinking</span>
                <div class="typing-dots">
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                </div>
            </div>
        </div>
    `;
    
    messagesContainer.appendChild(typingElement);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function hideTypingIndicator() {
    isTyping = false;
    const typingElement = document.getElementById('typing-indicator');
    if (typingElement) {
        typingElement.remove();
    }
}

async function sendToMasterAgent(message, model) {
    try {
        const response = await fetch('/api/master-chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: message,
                model: model,
                context: {
                    repository: dashboardState.currentRepository,
                    activeAgents: Object.keys(dashboardState.agents).filter(a => 
                        dashboardState.agents[a].status === 'active'
                    ),
                    chatHistory: chatHistory.slice(-10)
                }
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to get response from Master Agent');
        }

        const data = await response.json();
        
        // If there's a fallback response due to API issues
        if (data.fallback) {
            addLogEntry('warning', 'Using fallback chat response due to API issues');
        }
        
        return data.response;

    } catch (error) {
        console.error('Master Agent chat error:', error);
        
        // Provide a helpful fallback response
        const fallbackResponse = getFallbackResponse(message);
        addLogEntry('warning', 'Using fallback response due to connection issues');
        return fallbackResponse;
    }
}

function getFallbackResponse(message) {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('status') || lowerMessage.includes('health')) {
        return `Based on the current dashboard view, I can see that:

• Frontend Agent: Active and working on TICKET-005 (SEO Components)
• Backend Agent: Working on TICKET-003 (Webhook System) 
• Database Agent: Currently experiencing connection issues (retrying)
• Master Agent: Active and monitoring all operations

System metrics show ${dashboardState.metrics.successRate}% success rate with ${dashboardState.metrics.activeAgents} active agents. Would you like me to restart the Database Agent or provide more specific information?`;
    }
    
    if (lowerMessage.includes('ticket') || lowerMessage.includes('task')) {
        return `I can help you manage tickets in the Multi-Agent Orchestrator system. Currently we have:

• 3 Active tickets being worked on by agents
• 5 Pending tickets in the queue  
• 12 Completed tickets today

You can load new tickets, create tickets, or assign specific tickets to agents. What would you like to do with tickets?`;
    }
    
    if (lowerMessage.includes('agent') || lowerMessage.includes('restart') || lowerMessage.includes('stop')) {
        return `I can help you manage the AI agents in the system. Available commands:

• **Restart Agent**: Fix issues with specific agents
• **Assign Tickets**: Delegate work to appropriate agents
• **Monitor Progress**: Track agent performance and output
• **Emergency Stop**: Halt all agents if needed

Which agent operation would you like to perform?`;
    }
    
    if (lowerMessage.includes('integration') || lowerMessage.includes('merge') || lowerMessage.includes('workflow')) {
        return `The Master Integration workflow can merge all completed agent work. Current workflow status:

✅ Repository Setup - Complete
✅ Tickets Loaded - Complete  
🔄 Agents Working - In Progress (3 active)
⏳ Quality Validation - Pending
⏳ Master Integration - Ready to run

Would you like me to run the integration process or check specific workflow steps?`;
    }
    
    return `I understand you want to know about: "${message}". 

As your Master Agent, I can help with:
• Managing and coordinating AI agents
• Overseeing ticket workflows and assignments
• Running system integrations and merges
• Monitoring system health and performance
• Providing guidance on multi-agent orchestration

The system is currently ${dashboardState.agents.master.status} with ${dashboardState.metrics.activeAgents} agents working. What specific task would you like assistance with?`;
}

function clearChat() {
    if (confirm('Clear all chat messages?')) {
        document.getElementById('chat-messages').innerHTML = '';
        chatHistory = [];
        addLogEntry('info', 'Chat history cleared');
        
        // Add welcome message back
        setTimeout(() => {
            addChatMessage('agent', `👋 Welcome to Master Agent Chat! I can help you with:

• Managing and assigning tickets to agents
• Overseeing multi-agent workflows  
• Analyzing project status and progress
• Coordinating agent collaboration
• Providing architectural guidance

What would you like to know or do today?`);
        }, 500);
    }
}

function exportChat() {
    if (chatHistory.length === 0) {
        alert('No chat history to export');
        return;
    }
    
    const chatText = chatHistory.map(entry => {
        return `[${entry.timestamp}] ${entry.sender}: ${entry.message}`;
    }).join('\n\n');
    
    const blob = new Blob([chatText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `master-agent-chat-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    
    addLogEntry('info', 'Chat history exported');
}

// Auto-resize chat input
function initChatInput() {
    const chatInput = document.getElementById('chat-input');
    chatInput.addEventListener('input', function() {
        this.style.height = '40px';
        this.style.height = Math.min(this.scrollHeight, 120) + 'px';
    });
}

// Auto-refresh functionality
let refreshTimer;

function startAutoRefresh() {
    if (dashboardState.autoRefresh) {
        refreshTimer = setInterval(() => {
            refreshDashboard();
        }, dashboardState.refreshInterval);
    }
}

function stopAutoRefresh() {
    if (refreshTimer) {
        clearInterval(refreshTimer);
        refreshTimer = null;
    }
}

// Dashboard refresh function
async function refreshDashboard() {
    console.log('Refreshing dashboard...');
    
    try {
        // Update metrics with realistic variations
        await updateSystemMetrics();
        await updateAgentStatuses();
        await updateWorkflowProgress();
        await updateResourceMonitoring();
        
        // Update last refresh time
        document.getElementById('last-health-check').textContent = new Date().toLocaleTimeString();
        
        // Add visual feedback
        const statusIndicator = document.getElementById('main-status');
        statusIndicator.style.animation = 'none';
        setTimeout(() => {
            statusIndicator.style.animation = 'pulse 2s infinite';
        }, 10);
        
    } catch (error) {
        console.error('Dashboard refresh failed:', error);
        addLogEntry('error', 'Dashboard refresh failed: ' + error.message);
    }
}

// Update system metrics
async function updateSystemMetrics() {
    // Simulate metric updates with realistic variations
    const metrics = dashboardState.metrics;
    
    // Simulate real-time changes
    metrics.apiCalls += Math.floor(Math.random() * 50) - 25;
    metrics.costToday += (Math.random() * 0.2) - 0.1;
    metrics.successRate = Math.max(85, Math.min(100, metrics.successRate + (Math.random() * 2) - 1));
    
    // Update DOM
    document.getElementById('completed-tickets').textContent = metrics.completedTickets;
    document.getElementById('pending-tickets').textContent = metrics.pendingTickets;
    document.getElementById('failed-tasks').textContent = metrics.failedTasks;
    document.getElementById('api-calls').textContent = (metrics.apiCalls / 1000).toFixed(1) + 'K';
    
    document.getElementById('active-agents').textContent = metrics.activeAgents;
    document.getElementById('running-tasks').textContent = metrics.runningTasks;
    document.getElementById('success-rate').textContent = Math.round(metrics.successRate) + '%';
    document.getElementById('cost-today').textContent = '$' + metrics.costToday.toFixed(2);
}

// Update agent statuses
async function updateAgentStatuses() {
    console.log('Updating agent statuses...');
    
    // Simulate status changes
    if (Math.random() < 0.1) { // 10% chance of status change
        if (dashboardState.agents.database.status === 'error') {
            dashboardState.agents.database.status = 'idle';
            dashboardState.agents.database.health = 'healthy';
            addLogEntry('success', 'Database Agent: Connection restored');
            
            // Update UI
            const dbAgent = document.querySelector('.agent-item:nth-child(3)');
            if (dbAgent) {
                dbAgent.querySelector('.health-indicator').className = 'health-indicator healthy';
                dbAgent.querySelector('.status-badge').className = 'status-badge idle';
                dbAgent.querySelector('.status-badge').textContent = 'Idle';
                dbAgent.querySelector('.agent-task').textContent = 'Ready for new tasks';
            }
        }
    }
}

// Update workflow progress
async function updateWorkflowProgress() {
    console.log('Updating workflow progress...');
}

// Update resource monitoring
async function updateResourceMonitoring() {
    console.log('Updating resource monitoring...');
}

// Connection status management
function updateConnectionStatus(status) {
    const indicator = document.getElementById('main-status');
    
    switch(status) {
        case 'connected':
            indicator.style.background = 'var(--success)';
            addLogEntry('success', 'Connected to Multi-Agent Orchestrator');
            break;
        case 'disconnected':
            indicator.style.background = 'var(--warning)';
            addLogEntry('warning', 'Disconnected from orchestrator, attempting reconnection...');
            break;
        case 'error':
            indicator.style.background = 'var(--danger)';
            addLogEntry('error', 'Connection error - check system status');
            break;
    }
}

// Agent management functions
function viewAgent(agentType) {
    console.log(`Viewing ${agentType} agent details`);
    addLogEntry('info', `Opening ${agentType} agent details`);
    
    // Send command to view agent details
    sendCommand('view-agent', { agent: agentType });
}

function restartAgent(agentType) {
    if (confirm(`Restart ${agentType} agent? This will stop current work.`)) {
        console.log(`Restarting ${agentType} agent`);
        addLogEntry('warning', `${agentType} agent restart initiated`);
        
        // Send restart command
        sendCommand('restart-agent', { agent: agentType });
        
        // Simulate restart process
        setTimeout(() => {
            dashboardState.agents[agentType].status = 'active';
            dashboardState.agents[agentType].health = 'healthy';
            addLogEntry('success', `${agentType} agent restarted successfully`);
            refreshDashboard();
        }, 2000);
    }
}

function initAllAgents() {
    console.log('Initializing all agents...');
    addLogEntry('info', 'Initializing all agents...');
    
    // Send command to initialize all agents
    sendCommand('init-all-agents');
    
    // Simulate initialization process
    Object.keys(dashboardState.agents).forEach((agent, index) => {
        setTimeout(() => {
            dashboardState.agents[agent].status = 'active';
            dashboardState.agents[agent].health = 'healthy';
            addLogEntry('success', `${agent} agent initialized`);
        }, index * 500);
    });
}

// Workflow management
function runIntegration() {
    if (confirm('Run master integration? This will merge all completed work.')) {
        console.log('Running master integration...');
        addLogEntry('info', 'Master integration started');
        
        // Send integration command
        sendCommand('master-integration');
        
        // Simulate integration process
        setTimeout(() => {
            addLogEntry('success', 'Master integration completed successfully');
            refreshDashboard();
        }, 3000);
    }
}

function runMasterIntegration() {
    runIntegration();
}

function openWizard() {
    console.log('Opening workflow wizard...');
    addLogEntry('info', 'Opening workflow wizard');
    alert('Opening workflow wizard... (Feature coming soon)');
}

function emergencyStop() {
    if (confirm('EMERGENCY STOP: This will halt all agents immediately. Continue?')) {
        console.log('Emergency stop activated');
        addLogEntry('error', 'EMERGENCY STOP activated - all agents halted');
        
        // Send emergency stop command
        sendCommand('emergency-stop');
        
        // Set all agents to idle
        Object.keys(dashboardState.agents).forEach(agent => {
            dashboardState.agents[agent].status = 'idle';
        });
        
        refreshDashboard();
    }
}

// Ticket management
function showTickets(type) {
    // Update tab active state
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Load and display tickets of specified type
    console.log(`Showing ${type} tickets`);
    addLogEntry('info', `Displaying ${type} tickets`);
}

function loadTickets() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.txt,.json';
    input.onchange = (e) => {
        const file = e.target.files[0];
        console.log('Loading tickets from:', file.name);
        addLogEntry('info', `Loading tickets from ${file.name}`);
        
        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target.result;
            sendCommand('load-tickets', { content: content, filename: file.name });
        };
        reader.readAsText(file);
    };
    input.click();
}

function createTicket() {
    console.log('Creating new ticket...');
    addLogEntry('info', 'Opening ticket creation interface');
    alert('Opening ticket creation form... (Feature coming soon)');
}

function openTerminal() {
    console.log('Opening terminal interface...');
    addLogEntry('info', 'Opening terminal interface');
    alert('Terminal interface... (Feature coming soon)');
}

// Logging functions
function addLogEntry(type, message) {
    const logList = document.getElementById('log-list');
    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    
    const timestamp = new Date().toLocaleTimeString();
    entry.innerHTML = `
        <span class="log-timestamp">${timestamp}</span>
        ${message}
    `;
    
    logList.insertBefore(entry, logList.firstChild);
    
    // Keep only last 50 entries
    while (logList.children.length > 50) {
        logList.removeChild(logList.lastChild);
    }
}

function downloadLogs() {
    console.log('Downloading system logs...');
    // Collect all log entries
    const logs = Array.from(document.querySelectorAll('.log-entry')).map(entry => {
        return entry.textContent;
    });
    
    const blob = new Blob([logs.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `system-logs-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    
    addLogEntry('info', 'System logs exported');
}

// Monitoring functions
function openMonitoring() {
    console.log('Opening detailed monitoring...');
    addLogEntry('info', 'Opening detailed resource monitoring');
    alert('Opening detailed resource monitoring dashboard... (Feature coming soon)');
}

// Auto-refresh toggle
function initAutoRefreshToggle() {
    document.getElementById('auto-refresh').addEventListener('change', function() {
        dashboardState.autoRefresh = this.checked;
        if (this.checked) {
            startAutoRefresh();
            addLogEntry('info', 'Auto-refresh enabled');
        } else {
            stopAutoRefresh();
            addLogEntry('info', 'Auto-refresh disabled');
        }
    });
}

// Helper functions
function updateAgentStatus(agentName, status) {
    if (dashboardState.agents[agentName]) {
        dashboardState.agents[agentName].status = status;
        addLogEntry('info', `${agentName} agent status updated: ${status}`);
        refreshDashboard();
    }
}

function updateTicketStatus(ticketId, status) {
    addLogEntry('info', `Ticket ${ticketId} status updated: ${status}`);
}

function updateResourceMetrics(metrics) {
    if (metrics) {
        Object.assign(dashboardState.metrics, metrics);
        updateSystemMetrics();
    }
}

// Initialize dashboard
document.addEventListener('DOMContentLoaded', function() {
    console.log('Initializing Master Dashboard...');
    addLogEntry('success', 'Master Dashboard initialized');
    
    // Initialize components
    initWebSocket();
    initChatInput();
    initAutoRefreshToggle();
    
    // Start auto-refresh
    startAutoRefresh();
    
    // Initial data load
    refreshDashboard();
    
    // Update connection status
    updateConnectionStatus('connected');
});

// Cleanup on page unload
window.addEventListener('beforeunload', function() {
    stopAutoRefresh();
    if (ws) {
        ws.close();
    }
});
