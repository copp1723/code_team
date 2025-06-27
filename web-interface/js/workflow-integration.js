// Workflow UI Backend Integration
// Connects the new workflow interface to the existing multi-agent orchestrator

class WorkflowIntegration {
    constructor() {
        this.wsUrl = 'ws://localhost:8080';
        this.apiUrl = 'http://localhost:8080/api';
        this.ws = null;
        this.tickets = [];
        this.agents = {
            frontend: { status: 'idle', currentTask: null },
            backend: { status: 'idle', currentTask: null },
            database: { status: 'idle', currentTask: null },
            master: { status: 'active', currentTask: 'coordinating' }
        };
    }

    // Initialize WebSocket connection
    connect() {
        try {
            this.ws = new WebSocket(this.wsUrl);
            
            this.ws.onopen = () => {
                console.log('Connected to orchestrator');
                this.updateUI('Connected to backend', 'success');
            };
            
            this.ws.onmessage = (event) => {
                const data = JSON.parse(event.data);
                this.handleMessage(data);
            };
            
            this.ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                this.updateUI('Connection error - using simulation mode', 'warning');
            };
            
            this.ws.onclose = () => {
                console.log('Disconnected from orchestrator');
                this.updateUI('Disconnected - using simulation mode', 'warning');
            };
        } catch (error) {
            console.error('Failed to connect:', error);
            this.updateUI('Running in simulation mode', 'info');
        }
    }

    // Send command to backend
    sendCommand(command, params) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ command, params }));
        } else {
            // Fallback to API
            fetch(`${this.apiUrl}/${command}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ params })
            }).catch(error => {
                console.error('API call failed:', error);
                // Continue with simulation
            });
        }
    }

    // Handle messages from backend
    handleMessage(data) {
        switch (data.type) {
            case 'agent-status':
                this.updateAgentStatus(data.agent, data.status, data.task);
                break;
            case 'ticket-update':
                this.updateTicket(data.ticketId, data);
                break;
            case 'log':
                this.addLog(data.message);
                break;
            case 'chat-response':
                this.addChatMessage('agent', data.message);
                break;
        }
    }

    // Process uploaded files
    async processFiles(files) {
        // Create file objects with content
        const fileData = [];
        
        for (const file of files) {
            const content = await this.readFileContent(file);
            fileData.push({
                name: file.name,
                content: content
            });
        }
        
        const formData = { files: fileData };

        try {
            const response = await fetch(`${this.apiUrl}/upload`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                const result = await response.json();
                this.tickets = result.tickets;
                return result.tickets;
            }
        } catch (error) {
            console.error('Upload failed:', error);
        }

        // Fallback: Create tickets locally
        return this.parseTicketsLocally(files);
    }
    
    // Read file content
    async readFileContent(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsText(file);
        });
    }
    
    // Parse tickets locally as fallback
    async parseTicketsLocally(files) {
        const tickets = [];
        
        for (const file of files) {
            const content = await this.readFileContent(file);
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
        }
        
        return tickets;
    }

    // Extract task description from filename
    extractTaskFromFilename(filename) {
        const name = filename.replace(/\.[^/.]+$/, ''); // Remove extension
        return name.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    // Start agent processing
    startProcessing(tickets) {
        if (!tickets || tickets.length === 0) {
            console.warn('No tickets to process');
            return;
        }
        
        this.tickets = tickets;
        
        // Send each ticket to the appropriate agent
        tickets.forEach(ticket => {
            // Validate ticket has required fields
            if (!ticket.id || !ticket.description) {
                console.warn('Invalid ticket:', ticket);
                return;
            }
            
            // Determine agent type from ticket content
            const agentType = this.determineAgentType(ticket);
            ticket.assignedTo = agentType;
            
            // Send to backend to process with AI
            this.sendCommand('process-ticket', {
                ticketId: ticket.id,
                description: ticket.description,
                details: ticket.details || [],
                agentType: agentType
            });
            
            this.addLog(`Assigned ${ticket.id} to ${agentType} agent`);
        });
        
        // Update UI
        this.updateAgentStatus('frontend', 'working');
        this.updateAgentStatus('backend', 'working');
        this.updateAgentStatus('database', 'working');
    }
    
    // Determine which agent should handle the ticket
    determineAgentType(ticket) {
        const description = (ticket.description || '').toLowerCase();
        const details = (ticket.details || []).join(' ').toLowerCase();
        const fullText = description + ' ' + details;
        
        if (fullText.includes('test') || fullText.includes('coverage') || fullText.includes('pytest')) {
            return 'testing';
        } else if (fullText.includes('api') || fullText.includes('endpoint') || fullText.includes('jwt') || fullText.includes('auth')) {
            return 'backend';
        } else if (fullText.includes('component') || fullText.includes('ui') || fullText.includes('react')) {
            return 'frontend';
        } else if (fullText.includes('schema') || fullText.includes('database') || fullText.includes('migration')) {
            return 'database';
        } else if (fullText.includes('ci/cd') || fullText.includes('github') || fullText.includes('deployment')) {
            return 'integration';
        }
        
        // Default to backend for general tasks
        return 'backend';
    }

    // Update agent status in UI
    updateAgentStatus(agent, status, task = null) {
        this.agents[agent] = { status, currentTask: task };
        
        // Update UI elements
        const statusDot = document.getElementById(`${agent}-status`);
        if (statusDot) {
            statusDot.classList.remove('active', 'working', 'idle');
            statusDot.classList.add(status);
        }
        
        const agentCard = statusDot?.closest('.agent-card');
        if (agentCard) {
            const taskElement = agentCard.querySelector('.agent-task');
            if (taskElement) {
                taskElement.textContent = task || (status === 'idle' ? 'Waiting...' : 'Working...');
            }
        }
    }

    // Update ticket progress
    updateTicket(ticketId, data) {
        const ticket = this.tickets.find(t => t.id === ticketId);
        if (ticket) {
            // Update ticket with all provided data
            Object.assign(ticket, {
                status: data.status || ticket.status,
                progress: data.progress || ticket.progress,
                output: data.output || ticket.output,
                codeFiles: data.codeFiles || ticket.codeFiles,
                assignedTo: data.assignedTo || ticket.assignedTo,
                completedAt: data.completedAt || ticket.completedAt
            });
            
            // Update the global tickets array if it exists
            if (window.tickets) {
                const globalTicket = window.tickets.find(t => t.id === ticketId);
                if (globalTicket) {
                    Object.assign(globalTicket, ticket);
                }
            }
            
            // Trigger UI update
            if (window.updateTicketProgress) {
                window.updateTicketProgress();
            }
        }
    }

    // Add log entry
    addLog(message) {
        if (window.addLog) {
            window.addLog(message);
        }
    }

    // Add chat message
    addChatMessage(type, message) {
        if (window.addChatMessage) {
            window.addChatMessage(type, message);
        }
    }

    // Update UI status
    updateUI(message, type = 'info') {
        console.log(`[${type.toUpperCase()}] ${message}`);
        this.addLog(message);
    }

    // Send chat message to backend
    async sendChatMessage(message) {
        const modelSelector = document.getElementById('model-selector');
        const selectedModel = modelSelector ? modelSelector.value : 'claude-4-sonnet';
        
        // Model mapping - using valid OpenRouter model IDs
        const modelMap = {
            'gpt-4.1': 'openai/gpt-4-turbo',
            'claude-4-sonnet': 'anthropic/claude-3.5-sonnet',
            'claude-4-opus': 'anthropic/claude-3-opus',
            'openai-o3-pro': 'openai/gpt-4-turbo',
            'qwen2.5-coder': 'qwen/qwen-2.5-coder-32b-instruct',
            'gemini-2.0-flash': 'google/gemini-2.0-flash-exp:free',
            'deepseek-r1': 'deepseek/deepseek-r1',
            'minimax-m1-extended': 'minimax/minimax-01',
            'deepseek-v3': 'deepseek/deepseek-chat',
            'openai-codex-mini': 'openai/gpt-3.5-turbo',
            'qwen3-30b': 'qwen/qwen-2.5-7b-instruct'
        };
        
        this.sendCommand('chat', { 
            message, 
            model: modelMap[selectedModel] || modelMap['claude-4-sonnet'],
            agent: 'master'
        });
        
        // Fallback response if no backend
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            setTimeout(() => {
                const response = this.generateSmartResponse(message);
                this.addChatMessage('agent', response);
            }, 1000);
        }
    }

    // Generate intelligent responses when offline
    generateSmartResponse(message) {
        const lower = message.toLowerCase();
        
        if (lower.includes('status')) {
            const active = Object.values(this.agents).filter(a => a.status !== 'idle').length;
            const completed = this.tickets.filter(t => t.status === 'completed').length;
            return `Status Update:\n• ${active} agents active\n• ${completed}/${this.tickets.length} tasks completed\n• System running smoothly`;
        }
        
        if (lower.includes('help')) {
            return 'I can help you with:\n• Processing tasks from uploaded files\n• Monitoring agent progress\n• Answering questions about the system\n• Troubleshooting issues\n\nWhat would you like to know?';
        }
        
        if (lower.includes('agent')) {
            return 'Our AI agents specialize in:\n• Frontend Agent: UI/UX and React components\n• Backend Agent: APIs and server logic\n• Database Agent: Data models and queries\n• Master Agent: Coordination and quality control';
        }
        
        if (lower.includes('error') || lower.includes('problem')) {
            return 'I can help troubleshoot! Common solutions:\n• Check if all agents are active\n• Verify file format is supported\n• Try restarting the specific agent\n• Check the activity log for details';
        }
        
        return `I understand you're asking about "${message}". The agents are currently working on your tasks. You can check the progress panel to see real-time updates.`;
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.workflowIntegration = new WorkflowIntegration();
    window.workflowIntegration.connect();
    
    // Override the existing functions to use integration
    const originalHandleFileUpload = window.handleFileUpload;
    window.handleFileUpload = async function(input) {
        const files = Array.from(input.files);
        
        // Process through backend
        const tickets = await window.workflowIntegration.processFiles(files);
        window.tickets = tickets;
        
        // Continue with original flow
        originalHandleFileUpload(input);
    };
    
    const originalStartProcessing = window.startProcessing;
    window.startProcessing = function() {
        // Send to backend
        window.workflowIntegration.startProcessing(window.tickets);
        
        // Continue with original flow
        originalStartProcessing();
    };
    
    const originalSendMessage = window.sendMessage;
    window.sendMessage = function() {
        const input = document.getElementById('chat-input');
        const message = input.value.trim();
        
        if (!message) return;
        
        // Add user message
        window.addChatMessage('user', message);
        input.value = '';
        
        // Send to backend
        window.workflowIntegration.sendChatMessage(message);
    };
});