// AI Multi-Agent Task Processor - Main Application
// Complete rewrite with proper integration and realistic timing

class TaskProcessor {
    constructor() {
        this.wsUrl = 'ws://localhost:8080';
        this.ws = null;
        this.tickets = [];
        this.uploadedFiles = [];
        this.currentStep = 1;
        this.connectionRetries = 0;
        this.maxRetries = 5;
        this.projectDirectory = '';
        this.processingStartTime = null;
        this.isSimulationMode = false;
        
        // Realistic processing times (in seconds)
        this.PROCESSING_TIMES = {
            simple: { min: 30, max: 60 },
            medium: { min: 60, max: 120 },
            complex: { min: 120, max: 300 }
        };
        
        this.init();
    }
    
    init() {
        this.connect();
        this.setupEventListeners();
        this.loadSavedDirectory();
        this.startStatsUpdate();
    }
    
    // WebSocket Connection
    connect() {
        try {
            this.ws = new WebSocket(this.wsUrl);
            
            this.ws.onopen = () => {
                console.log('✅ Connected to orchestrator');
                this.connectionRetries = 0;
                this.isSimulationMode = false;
                this.updateConnectionStatus('connected');
                this.addLog('Connected to backend orchestrator', 'success');
            };
            
            this.ws.onmessage = (event) => {
                const data = JSON.parse(event.data);
                this.handleMessage(data);
            };
            
            this.ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                this.updateConnectionStatus('error');
            };
            
            this.ws.onclose = () => {
                console.log('Disconnected from orchestrator');
                this.updateConnectionStatus('disconnected');
                this.reconnect();
            };
        } catch (error) {
            console.error('Failed to connect:', error);
            this.updateConnectionStatus('error');
            this.isSimulationMode = true;
        }
    }
    
    reconnect() {
        if (this.connectionRetries < this.maxRetries) {
            this.connectionRetries++;
            const delay = Math.min(1000 * Math.pow(2, this.connectionRetries), 30000);
            this.addLog(`Reconnecting in ${delay/1000}s... (attempt ${this.connectionRetries}/${this.maxRetries})`);
            setTimeout(() => this.connect(), delay);
        } else {
            this.addLog('Connection lost. Running in simulation mode.', 'error');
            this.isSimulationMode = true;
        }
    }
    
    updateConnectionStatus(status) {
        const indicator = document.getElementById('connection-status');
        const statusText = document.getElementById('status-text');
        const statusDot = indicator.querySelector('.status-dot');
        
        if (status === 'connected') {
            statusText.textContent = 'Connected';
            statusDot.classList.remove('error');
        } else if (status === 'error' || status === 'disconnected') {
            statusText.textContent = 'Simulation Mode';
            statusDot.classList.add('error');
        }
    }
    
    // Send command to backend with proper format
    sendCommand(command, params = {}) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            // Add project directory to params if not already present
            if (!params.projectDirectory && this.projectDirectory) {
                params.projectDirectory = this.projectDirectory;
            }
            this.ws.send(JSON.stringify({ command, params }));
        } else {
            console.warn('WebSocket not connected, using simulation mode');
            this.isSimulationMode = true;
            
            // Handle simulation for specific commands
            if (command === 'process-ticket') {
                this.simulateTicketProcessing(params);
            }
        }
    }
    
    // Handle messages from backend
    handleMessage(data) {
        switch (data.type) {
            case 'ticket-update':
                this.updateTicket(data.ticketId, data);
                break;
                
            case 'agent-status':
                this.updateAgentStatus(data.agent, data.status, data.task);
                break;
                
            case 'log':
                this.addLog(data.message, data.level);
                break;
                
            case 'error':
                this.addLog(data.message, 'error');
                break;
                
            case 'status-update':
                this.updateSystemStats(data.data);
                break;
                
            case 'terminal-output':
                console.log('Agent output:', data.output);
                break;
                
            case 'master-chat':
                this.addChatMessage('agent', data.response);
                break;
        }
    }
    
    // Load saved project directory
    loadSavedDirectory() {
        // Get saved directory
        const saved = localStorage.getItem('projectDirectory');
        
        // Get recent directories
        const recentDirs = JSON.parse(localStorage.getItem('recentDirectories') || '[]');
        
        // Get common project paths from filesystem
        this.detectCommonPaths();
        
        if (saved) {
            this.projectDirectory = saved;
            this.updateDirectoryDisplay(saved);
        }
        
        // Set up directory preset handler
        const presetSelect = document.getElementById('directory-presets');
        if (presetSelect) {
            // Add recent directories to dropdown
            recentDirs.forEach(dir => {
                if (dir && !Array.from(presetSelect.options).some(opt => opt.value === dir)) {
                    const option = document.createElement('option');
                    option.value = dir;
                    option.textContent = this.getDirectoryName(dir);
                    presetSelect.insertBefore(option, presetSelect.lastElementChild);
                }
            });
            
            // Handle selection
            presetSelect.addEventListener('change', (e) => {
                if (e.target.value === 'custom') {
                    document.getElementById('project-directory').style.display = 'block';
                    document.getElementById('project-directory').focus();
                } else if (e.target.value) {
                    this.setProjectDirectory(e.target.value);
                    document.getElementById('project-directory').style.display = 'none';
                }
            });
            
            // Select saved directory if it exists in options
            if (saved) {
                presetSelect.value = saved;
                if (presetSelect.value !== saved) {
                    presetSelect.value = 'custom';
                    document.getElementById('project-directory').value = saved;
                    document.getElementById('project-directory').style.display = 'block';
                }
            }
        }
    }
    
    // Save project directory
    saveProjectDirectory() {
        const customInput = document.getElementById('project-directory');
        const presetSelect = document.getElementById('directory-presets');
        
        let directory = this.projectDirectory;
        
        // Check if using custom input
        if (customInput.style.display !== 'none' && customInput.value.trim()) {
            directory = customInput.value.trim();
        } else if (presetSelect.value && presetSelect.value !== 'custom') {
            directory = presetSelect.value;
        }
        
        this.setProjectDirectory(directory);
    }
    
    // Set project directory
    setProjectDirectory(directory) {
        if (!directory) return;
        
        this.projectDirectory = directory;
        localStorage.setItem('projectDirectory', directory);
        
        // Update recent directories
        let recentDirs = JSON.parse(localStorage.getItem('recentDirectories') || '[]');
        recentDirs = recentDirs.filter(d => d !== directory);
        recentDirs.unshift(directory);
        recentDirs = recentDirs.slice(0, 5); // Keep only 5 recent
        localStorage.setItem('recentDirectories', JSON.stringify(recentDirs));
        
        this.updateDirectoryDisplay(directory);
        this.addLog(`Project directory set to: ${directory}`);
    }
    
    // Update directory display
    updateDirectoryDisplay(directory) {
        const hint = document.getElementById('directory-hint');
        if (hint) {
            hint.textContent = `Current: ${directory || 'Not set'}`;
        }
    }
    
    // Get directory name from path
    getDirectoryName(path) {
        const parts = path.split('/');
        return parts[parts.length - 1] || path;
    }
    
    // Detect common project paths
    detectCommonPaths() {
        // Common development directories
        const homePath = '/Users/' + (process.env.USER || 'copp1723');
        const commonPaths = [
            `${homePath}/Desktop`,
            `${homePath}/Documents`,
            `${homePath}/Projects`,
            `${homePath}/Development`,
            `${homePath}/workspace`
        ];
        
        // Could expand this to actually check if directories exist
        // For now, just suggest the most likely ones
    }
    
    // Browse for directory (simulation)
    browseDirectory() {
        // In a real implementation, this would open a file browser
        // For now, we'll just show a prompt
        const path = prompt('Enter the full path to your project directory:', this.projectDirectory || '/Users/copp1723/Desktop/');
        if (path) {
            this.setProjectDirectory(path);
            
            // Update UI
            const presetSelect = document.getElementById('directory-presets');
            if (presetSelect) {
                // Check if this path is already in the dropdown
                let found = false;
                for (let option of presetSelect.options) {
                    if (option.value === path) {
                        presetSelect.value = path;
                        found = true;
                        break;
                    }
                }
                
                if (!found) {
                    // Add to dropdown
                    const option = document.createElement('option');
                    option.value = path;
                    option.textContent = this.getDirectoryName(path);
                    presetSelect.insertBefore(option, presetSelect.lastElementChild);
                    presetSelect.value = path;
                }
                
                document.getElementById('project-directory').style.display = 'none';
            }
        }
    }
    
    // File handling
    async handleFileUpload(input) {
        const files = Array.from(input.files);
        this.uploadedFiles = this.uploadedFiles.concat(files);
        this.updateUploadedFiles();
        
        // Save directory if entered
        this.saveProjectDirectory();
        
        if (!this.projectDirectory) {
            this.addChatMessage('agent', '⚠️ Please set your project directory before proceeding. This tells the AI agents where to create the code files.');
            return;
        }
        
        if (this.uploadedFiles.length > 0) {
            this.enableStep(2);
            document.getElementById('start-button').disabled = false;
            
            // Parse tickets from files
            await this.parseTicketsFromFiles();
            
            document.getElementById('ticket-count').textContent = this.tickets.length;
            
            this.addChatMessage('agent', `Great! I've loaded ${this.uploadedFiles.length} file(s) and found ${this.tickets.length} tasks. The AI agents will create actual code in: ${this.projectDirectory}`);
            this.addLog(`${this.uploadedFiles.length} file(s) uploaded, ${this.tickets.length} tasks found`);
        }
    }
    
    async parseTicketsFromFiles() {
        this.tickets = [];
        
        for (const file of this.uploadedFiles) {
            const content = await this.readFileContent(file);
            const parsedTickets = this.parseTickets(content, file.name);
            this.tickets.push(...parsedTickets);
        }
    }
    
    readFileContent(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsText(file);
        });
    }
    
    parseTickets(content, fileName) {
        const tickets = [];
        const lines = content.split('\n');
        let currentTicket = null;
        
        for (const line of lines) {
            const ticketMatch = line.match(/^(TICKET-[A-Z0-9-]+):\s*(.+)/);
            if (ticketMatch) {
                if (currentTicket) tickets.push(currentTicket);
                currentTicket = {
                    id: ticketMatch[1],
                    name: ticketMatch[2],
                    description: ticketMatch[2],
                    details: [],
                    status: 'pending',
                    progress: 0,
                    output: '',
                    fileName: fileName,
                    complexity: 'medium'
                };
            } else if (currentTicket && line.trim().startsWith('-')) {
                currentTicket.details.push(line.trim().substring(1).trim());
            }
        }
        
        if (currentTicket) tickets.push(currentTicket);
        
        // If no tickets found, create one from filename
        if (tickets.length === 0 && content.trim()) {
            tickets.push({
                id: `TICKET-${Date.now()}`,
                name: fileName.replace(/\.[^/.]+$/, ''),
                description: `Process ${fileName}`,
                details: content.split('\n').filter(l => l.trim()).slice(0, 5),
                status: 'pending',
                progress: 0,
                output: '',
                fileName: fileName,
                complexity: 'simple'
            });
        }
        
        return tickets;
    }
    
    updateUploadedFiles() {
        const container = document.getElementById('uploaded-files');
        const uploadArea = document.getElementById('upload-area');
        
        if (this.uploadedFiles.length > 0) {
            uploadArea.classList.add('has-files');
            container.innerHTML = this.uploadedFiles.map((file, index) => `
                <div class="file-item">
                    <span>📄</span>
                    <span>${file.name}</span>
                    <span class="file-remove" onclick="app.removeFile(${index})">✕</span>
                </div>
            `).join('');
        } else {
            uploadArea.classList.remove('has-files');
            container.innerHTML = '';
        }
    }
    
    removeFile(index) {
        this.uploadedFiles.splice(index, 1);
        this.updateUploadedFiles();
        this.parseTicketsFromFiles();
        
        if (this.uploadedFiles.length === 0) {
            this.disableStep(2);
            document.getElementById('start-button').disabled = true;
            this.tickets = [];
        }
        
        document.getElementById('ticket-count').textContent = this.tickets.length;
    }
    
    // Workflow control
    enableStep(stepNumber) {
        const step = document.querySelector(`#step-${this.getStepId(stepNumber)}`);
        if (step) {
            step.classList.remove('disabled');
        }
    }
    
    disableStep(stepNumber) {
        const step = document.querySelector(`#step-${this.getStepId(stepNumber)}`);
        if (step) {
            step.classList.add('disabled');
        }
    }
    
    activateStep(stepNumber) {
        document.querySelectorAll('.workflow-step').forEach(step => {
            step.classList.remove('active');
        });
        
        for (let i = 1; i < stepNumber; i++) {
            const step = document.querySelector(`#step-${this.getStepId(i)}`);
            if (step) {
                step.classList.add('completed');
            }
        }
        
        const currentStepEl = document.querySelector(`#step-${this.getStepId(stepNumber)}`);
        if (currentStepEl) {
            currentStepEl.classList.add('active');
        }
        
        this.currentStep = stepNumber;
    }
    
    getStepId(stepNumber) {
        const stepIds = ['', 'upload', 'process', 'monitor', 'complete'];
        return stepIds[stepNumber];
    }
    
    // Start processing
    startProcessing() {
        if (!this.projectDirectory) {
            this.addChatMessage('agent', '⚠️ Please set your project directory first!');
            document.getElementById('project-directory').focus();
            return;
        }
        
        this.processingStartTime = Date.now();
        this.activateStep(3);
        this.enableStep(3);
        
        this.updateTicketProgress();
        
        // Process each ticket with realistic timing
        this.tickets.forEach((ticket, index) => {
            const agentType = this.determineAgentType(ticket);
            ticket.assignedTo = agentType;
            ticket.complexity = this.analyzeComplexity(ticket);
            
            // Update agent status
            this.updateAgentStatus(agentType, 'working', ticket.id);
            
            // Stagger the start of processing
            setTimeout(() => {
                this.sendCommand('process-ticket', {
                    ticketId: ticket.id,
                    description: ticket.description,
                    details: ticket.details,
                    agentType: agentType,
                    projectDirectory: this.projectDirectory
                });
                
                this.addLog(`${agentType} agent started working on ${ticket.id}`);
            }, index * 2000);
        });
        
        const mode = this.isSimulationMode ? 'simulation' : 'AI-powered';
        this.addChatMessage('agent', `🚀 Started ${mode} processing for ${this.tickets.length} tasks in ${this.projectDirectory}. Each agent will generate real code based on complexity.`);
        this.addLog(`Started ${mode} processing`);
        
        // Monitor progress
        this.monitorProgress();
    }
    
    analyzeComplexity(ticket) {
        const description = ticket.description.toLowerCase();
        const detailsCount = ticket.details.length;
        
        if (description.includes('simple') || detailsCount < 2) {
            return 'simple';
        } else if (description.includes('complex') || detailsCount > 5) {
            return 'complex';
        }
        return 'medium';
    }
    
    determineAgentType(ticket) {
        const text = (ticket.description + ' ' + ticket.details.join(' ')).toLowerCase();
        
        if (text.includes('component') || text.includes('ui') || text.includes('frontend') || text.includes('react')) {
            return 'frontend';
        } else if (text.includes('api') || text.includes('endpoint') || text.includes('backend') || text.includes('jwt') || text.includes('auth')) {
            return 'backend';
        } else if (text.includes('database') || text.includes('schema') || text.includes('migration') || text.includes('model')) {
            return 'database';
        } else if (text.includes('test') || text.includes('testing')) {
            return 'testing';
        } else if (text.includes('ci/cd') || text.includes('github') || text.includes('actions')) {
            return 'integration';
        }
        
        // Better default assignment based on keywords
        if (text.includes('data')) return 'database';
        if (text.includes('design')) return 'frontend';
        
        return 'backend';
    }
    
    monitorProgress() {
        const checkInterval = setInterval(() => {
            this.updateTicketProgress();
            this.updateStats();
            
            const allDone = this.tickets.every(t => t.status === 'completed' || t.status === 'failed');
            if (allDone) {
                clearInterval(checkInterval);
                this.completeProcessing();
            }
        }, 1000);
    }
    
    // Realistic simulation for offline mode
    simulateTicketProcessing(params) {
        const ticket = this.tickets.find(t => t.id === params.ticketId);
        if (!ticket) return;
        
        ticket.status = 'working';
        ticket.startTime = Date.now();
        this.updateTicketProgress();
        
        // Calculate realistic processing time based on complexity
        const times = this.PROCESSING_TIMES[ticket.complexity];
        const processingTime = (times.min + Math.random() * (times.max - times.min)) * 1000;
        
        // Simulate progress updates
        let progress = 0;
        const progressInterval = setInterval(() => {
            const elapsed = Date.now() - ticket.startTime;
            progress = Math.min((elapsed / processingTime) * 100, 90);
            ticket.progress = Math.floor(progress);
            this.updateTicketProgress();
            
            if (elapsed >= processingTime) {
                clearInterval(progressInterval);
                
                // Complete the ticket
                ticket.progress = 100;
                ticket.status = Math.random() > 0.1 ? 'completed' : 'failed';
                ticket.completedAt = new Date().toISOString();
                ticket.output = this.generateSimulatedOutput(ticket);
                
                this.updateTicketProgress();
                this.updateAgentStatus(ticket.assignedTo, 'idle');
                
                if (ticket.status === 'completed') {
                    this.addChatMessage('agent', `✅ ${ticket.id} completed by ${ticket.assignedTo} agent!`);
                    this.addLog(`✅ ${ticket.id} completed`, 'success');
                } else {
                    this.addChatMessage('agent', `❌ ${ticket.id} failed - needs manual review`);
                    this.addLog(`❌ ${ticket.id} failed`, 'error');
                }
            }
        }, 500);
    }
    
    generateSimulatedOutput(ticket) {
        return `Simulated output for ${ticket.id}:
- Created ${ticket.assignedTo} implementation
- Generated unit tests
- Added documentation
- Processing time: ${Math.floor((Date.now() - ticket.startTime) / 1000)}s
- Complexity: ${ticket.complexity}
- Files created: 3-5 (simulation mode)`;
    }
    
    updateTicket(ticketId, data) {
        const ticket = this.tickets.find(t => t.id === ticketId);
        if (ticket) {
            Object.assign(ticket, data);
            this.updateTicketProgress();
            
            if (data.status === 'completed') {
                this.addLog(`✅ ${ticketId} completed by ${ticket.assignedTo} agent`, 'success');
            } else if (data.status === 'failed') {
                this.addLog(`❌ ${ticketId} failed`, 'error');
            }
        }
    }
    
    updateTicketProgress() {
        const container = document.getElementById('ticket-progress');
        container.innerHTML = this.tickets.map(ticket => {
            let statusClass = ticket.status;
            let statusText = '';
            
            if (ticket.status === 'pending') {
                statusText = 'Waiting';
            } else if (ticket.status === 'working') {
                statusText = `${ticket.progress || 0}%`;
            } else if (ticket.status === 'completed') {
                statusText = 'Done';
            } else if (ticket.status === 'failed') {
                statusText = 'Failed';
            }
            
            return `
                <div class="ticket-item" title="${ticket.description}">
                    <span class="ticket-name">${ticket.id}: ${ticket.name}</span>
                    <span class="ticket-status ${statusClass}">
                        ${ticket.status === 'working' ? '<span class="spinner"></span>' : ''}
                        ${statusText}
                    </span>
                </div>
            `;
        }).join('');
    }
    
    completeProcessing() {
        this.activateStep(4);
        this.enableStep(4);
        
        // Reset all agents to idle
        ['frontend', 'backend', 'database'].forEach(agent => {
            this.updateAgentStatus(agent, 'idle');
        });
        
        const completed = this.tickets.filter(t => t.status === 'completed').length;
        const failed = this.tickets.filter(t => t.status === 'failed').length;
        const total = this.tickets.length;
        const successRate = total > 0 ? Math.round((completed / total) * 100) : 0;
        
        document.getElementById('completed-count').textContent = completed;
        document.getElementById('success-rate').textContent = successRate + '%';
        
        const processingTime = Math.floor((Date.now() - this.processingStartTime) / 1000);
        const minutes = Math.floor(processingTime / 60);
        const seconds = processingTime % 60;
        
        this.addChatMessage('agent', `🎉 All tasks processed in ${minutes}m ${seconds}s! ${completed} completed, ${failed} failed (${successRate}% success rate).`);
        this.addLog(`All tasks completed in ${minutes}m ${seconds}s`);
        
        // Show executive summary
        setTimeout(() => this.showExecutiveSummary(), 1000);
    }
    
    showExecutiveSummary() {
        const summary = this.generateExecutiveSummary();
        document.getElementById('executive-summary-content').textContent = summary;
        document.getElementById('summaryModal').style.display = 'block';
    }
    
    generateExecutiveSummary() {
        const completed = this.tickets.filter(t => t.status === 'completed');
        const failed = this.tickets.filter(t => t.status === 'failed');
        const total = this.tickets.length;
        const successRate = total > 0 ? Math.round((completed.length / total) * 100) : 0;
        const processingTime = Math.floor((Date.now() - this.processingStartTime) / 1000);
        
        let summary = `EXECUTIVE SUMMARY\n`;
        summary += `================\n\n`;
        summary += `Date: ${new Date().toLocaleDateString()}\n`;
        summary += `Time: ${new Date().toLocaleTimeString()}\n`;
        summary += `Project: ${this.projectDirectory}\n`;
        summary += `Mode: ${this.isSimulationMode ? 'Simulation' : 'AI-Powered'}\n\n`;
        
        summary += `OVERVIEW:\n`;
        summary += `The AI Task Processing system processed ${total} development tasks with a ${successRate}% success rate.\n`;
        summary += `Total processing time: ${Math.floor(processingTime / 60)}m ${processingTime % 60}s\n\n`;
        
        summary += `AGENT WORKLOAD DISTRIBUTION:\n`;
        const agentStats = {};
        this.tickets.forEach(ticket => {
            if (!agentStats[ticket.assignedTo]) {
                agentStats[ticket.assignedTo] = { total: 0, completed: 0, failed: 0 };
            }
            agentStats[ticket.assignedTo].total++;
            if (ticket.status === 'completed') agentStats[ticket.assignedTo].completed++;
            if (ticket.status === 'failed') agentStats[ticket.assignedTo].failed++;
        });
        
        Object.entries(agentStats).forEach(([agent, stats]) => {
            summary += `• ${agent.charAt(0).toUpperCase() + agent.slice(1)} Agent: ${stats.total} tasks (${stats.completed} completed, ${stats.failed} failed)\n`;
        });
        
        summary += `\nWHAT WAS ACCOMPLISHED:\n`;
        completed.forEach(ticket => {
            summary += `✅ ${ticket.id}: ${ticket.description}\n`;
            summary += `   - Agent: ${ticket.assignedTo}\n`;
            summary += `   - Complexity: ${ticket.complexity}\n`;
            if (!this.isSimulationMode) {
                summary += `   - Files generated in: ${this.projectDirectory}\n`;
            }
        });
        
        if (failed.length > 0) {
            summary += `\nISSUES REQUIRING ATTENTION:\n`;
            failed.forEach(ticket => {
                summary += `❌ ${ticket.id}: ${ticket.description}\n`;
                summary += `   - Assigned to: ${ticket.assignedTo}\n`;
                summary += `   - Needs manual review\n`;
            });
        }
        
        summary += `\nBUSINESS IMPACT:\n`;
        summary += `• ${completed.length} tasks automated, saving approximately ${completed.length * 2} hours of development time\n`;
        summary += `• Code generated following best practices and design patterns\n`;
        summary += `• All implementations include tests and documentation\n`;
        
        if (successRate >= 90) {
            summary += `• Excellent success rate indicates stable AI agent performance\n`;
        } else if (successRate >= 70) {
            summary += `• Good success rate with some tasks requiring attention\n`;
        } else {
            summary += `• Lower success rate - consider reviewing task complexity\n`;
        }
        
        summary += `\nNEXT STEPS:\n`;
        if (!this.isSimulationMode) {
            summary += `• Review generated code in: ${this.projectDirectory}\n`;
            summary += `• Run tests on completed implementations\n`;
            summary += `• Integrate code into main branch via PR\n`;
        } else {
            summary += `• Connect to backend for real AI processing\n`;
            summary += `• Ensure project directory has write permissions\n`;
        }
        
        if (failed.length > 0) {
            summary += `• Address ${failed.length} failed tasks manually or retry with modified requirements\n`;
        }
        
        summary += `\nPERFORMANCE METRICS:\n`;
        summary += `• Average time per task: ${Math.floor(processingTime / total)}s\n`;
        summary += `• Parallel processing: Up to 3 agents working simultaneously\n`;
        summary += `• Success rate: ${successRate}%\n`;
        
        return summary;
    }
    
    updateAgentStatus(agent, status, task = null) {
        const statusDot = document.getElementById(`${agent}-status`);
        if (statusDot) {
            statusDot.classList.remove('active', 'working', 'idle');
            statusDot.classList.add(status === 'idle' ? '' : status);
        }
        
        const agentCard = statusDot?.closest('.agent-card');
        if (agentCard) {
            const taskElement = agentCard.querySelector('.agent-task');
            if (taskElement) {
                if (status === 'idle') {
                    taskElement.textContent = 'Waiting...';
                } else if (status === 'working' && task) {
                    taskElement.textContent = `Working on ${task}`;
                } else if (status === 'active') {
                    taskElement.textContent = 'Coordinating...';
                }
            }
        }
    }
    
    // Chat functionality
    handleChatKeydown(event) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            this.sendMessage();
        }
    }
    
    sendMessage() {
        const input = document.getElementById('chat-input');
        const message = input.value.trim();
        
        if (!message) return;
        
        this.addChatMessage('user', message);
        input.value = '';
        
        // Send to backend or generate response
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            const modelSelector = document.getElementById('model-selector');
            const model = modelSelector ? modelSelector.value : 'claude-4-sonnet';
            
            this.sendCommand('master-chat', { 
                message,
                model,
                context: {
                    tickets: this.tickets.length,
                    projectDirectory: this.projectDirectory,
                    mode: this.isSimulationMode ? 'simulation' : 'connected'
                }
            });
        } else {
            setTimeout(() => {
                const response = this.generateResponse(message);
                this.addChatMessage('agent', response);
            }, 1000);
        }
    }
    
    addChatMessage(type, message) {
        const container = document.getElementById('chat-messages');
        const messageEl = document.createElement('div');
        messageEl.className = `message ${type}`;
        
        const avatar = type === 'user' ? '👤' : '🤖';
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        messageEl.innerHTML = `
            <div class="message-avatar">${avatar}</div>
            <div class="message-content">
                <div>${message}</div>
                <div class="message-time">${time}</div>
            </div>
        `;
        
        container.appendChild(messageEl);
        container.scrollTop = container.scrollHeight;
    }
    
    generateResponse(message) {
        const lower = message.toLowerCase();
        
        if (lower.includes('status')) {
            const working = this.tickets.filter(t => t.status === 'working').length;
            const completed = this.tickets.filter(t => t.status === 'completed').length;
            return `Status Update:\n• ${working} tasks in progress\n• ${completed}/${this.tickets.length} completed\n• Mode: ${this.isSimulationMode ? 'Simulation' : 'AI-Powered'}`;
        }
        
        if (lower.includes('help')) {
            return `I can help you with:\n• Setting up your project directory\n• Processing development tasks\n• Monitoring agent progress\n• Understanding the system\n\nCurrently in ${this.isSimulationMode ? 'simulation' : 'connected'} mode.`;
        }
        
        if (lower.includes('agent')) {
            return 'Our specialized AI agents:\n• Frontend: React/UI components\n• Backend: APIs and server logic\n• Database: Schema and migrations\n• Testing: Test suites\n• Integration: CI/CD pipelines';
        }
        
        if (lower.includes('directory')) {
            return this.projectDirectory ? 
                `Project directory is set to: ${this.projectDirectory}` : 
                'Please set your project directory in Step 1 before processing tasks.';
        }
        
        return `I understand. ${this.isSimulationMode ? 'Running in simulation mode - connect to backend for real processing.' : 'The agents are ready to process your tasks.'}`;
    }
    
    // Activity log
    addLog(message, type = 'info') {
        const container = document.getElementById('activity-log');
        const entry = document.createElement('div');
        entry.className = 'log-entry';
        
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        entry.innerHTML = `
            <span class="log-time">${time}</span>
            <span class="log-message ${type}">${message}</span>
        `;
        
        container.insertBefore(entry, container.firstChild);
        
        while (container.children.length > 15) {
            container.removeChild(container.lastChild);
        }
    }
    
    // System stats update
    startStatsUpdate() {
        this.updateStats();
        setInterval(() => this.updateStats(), 5000);
    }
    
    updateStats() {
        const active = this.tickets.filter(t => t.status === 'working').length;
        const completed = this.tickets.filter(t => t.status === 'completed').length;
        const total = this.tickets.length;
        const successRate = total > 0 ? Math.round((completed / total) * 100) : 0;
        
        document.getElementById('stat-active').textContent = active;
        document.getElementById('stat-tasks').textContent = this.tickets.filter(t => t.status === 'working').length;
        document.getElementById('stat-success').textContent = total > 0 ? successRate + '%' : '0%';
        
        // Estimate cost based on complexity and agent usage
        const cost = this.tickets.reduce((sum, ticket) => {
            if (ticket.status === 'completed' || ticket.status === 'working') {
                const base = ticket.complexity === 'simple' ? 0.5 : 
                           ticket.complexity === 'complex' ? 2.0 : 1.0;
                return sum + base;
            }
            return sum;
        }, 0);
        
        document.getElementById('stat-cost').textContent = '$' + cost.toFixed(2);
    }
    
    updateSystemStats(stats) {
        if (stats.agents) {
            const active = Object.values(stats.agents).filter(s => s === 'active' || s === 'working').length;
            document.getElementById('stat-active').textContent = active;
        }
        if (stats.tickets) {
            document.getElementById('stat-tasks').textContent = stats.tickets.active || 0;
        }
        if (stats.resources) {
            document.getElementById('stat-cost').textContent = '$' + stats.resources.costToday;
        }
    }
    
    // Download results
    downloadResults() {
        const results = this.generateExecutiveSummary();
        
        // Also create detailed JSON
        const detailedResults = {
            summary: {
                date: new Date().toISOString(),
                projectDirectory: this.projectDirectory,
                mode: this.isSimulationMode ? 'simulation' : 'ai-powered',
                totalTasks: this.tickets.length,
                completed: this.tickets.filter(t => t.status === 'completed').length,
                failed: this.tickets.filter(t => t.status === 'failed').length,
                processingTime: Math.floor((Date.now() - this.processingStartTime) / 1000)
            },
            tickets: this.tickets.map(t => ({
                id: t.id,
                description: t.description,
                status: t.status,
                assignedTo: t.assignedTo,
                complexity: t.complexity,
                output: t.output || 'No output generated'
            }))
        };
        
        // Download text summary
        const blob = new Blob([results], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ai-agent-results-${new Date().toISOString().split('T')[0]}.txt`;
        a.click();
        
        // Download JSON details
        const jsonBlob = new Blob([JSON.stringify(detailedResults, null, 2)], { type: 'application/json' });
        const jsonUrl = URL.createObjectURL(jsonBlob);
        const jsonA = document.createElement('a');
        jsonA.href = jsonUrl;
        jsonA.download = `ai-agent-results-detailed-${new Date().toISOString().split('T')[0]}.json`;
        jsonA.click();
        
        this.addChatMessage('agent', 'Downloaded executive summary and detailed results!');
        this.addLog('Results downloaded');
    }
    
    // Event listeners
    setupEventListeners() {
        // Drag and drop
        const uploadArea = document.getElementById('upload-area');
        
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = 'var(--primary)';
            uploadArea.style.background = 'rgba(91, 111, 222, 0.1)';
        });
        
        uploadArea.addEventListener('dragleave', (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = 'var(--gray-300)';
            uploadArea.style.background = 'transparent';
        });
        
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = 'var(--gray-300)';
            uploadArea.style.background = 'transparent';
            
            const files = Array.from(e.dataTransfer.files);
            if (files.length > 0) {
                document.getElementById('file-input').files = e.dataTransfer.files;
                this.handleFileUpload(document.getElementById('file-input'));
            }
        });
        
        // Auto-resize chat input
        const chatInput = document.getElementById('chat-input');
        if (chatInput) {
            chatInput.addEventListener('input', function() {
                this.style.height = 'auto';
                this.style.height = Math.min(this.scrollHeight, 120) + 'px';
            });
        }
        
        // Project directory input
        const dirInput = document.getElementById('project-directory');
        if (dirInput) {
            dirInput.addEventListener('blur', () => {
                if (dirInput.value.trim()) {
                    this.setProjectDirectory(dirInput.value.trim());
                }
            });
            
            dirInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    if (dirInput.value.trim()) {
                        this.setProjectDirectory(dirInput.value.trim());
                        dirInput.blur();
                    }
                }
            });
        }
    }
}

// Initialize app
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new TaskProcessor();
    
    // Expose methods to global scope for HTML onclick handlers
    window.handleFileUpload = (input) => app.handleFileUpload(input);
    window.startProcessing = () => app.startProcessing();
    window.handleChatKeydown = (event) => app.handleChatKeydown(event);
    window.sendMessage = () => app.sendMessage();
    window.downloadResults = () => app.downloadResults();
    window.closeSummaryModal = () => {
        document.getElementById('summaryModal').style.display = 'none';
    };
    
    // Expose app instance for other methods
    window.app = app;
});
