// Chat Interface for Master Agent Communication
class ChatInterface {
    constructor() {
        this.selectedModel = 'claude-4-sonnet';
        this.chatHistory = [];
        this.isStreaming = false;
        this.currentStreamingMessage = null;
        this.models = [
            { id: 'gpt-4.1', name: 'GPT 4.1', provider: 'openai' },
            { id: 'claude-4-sonnet', name: 'Claude 4 Sonnet', provider: 'anthropic' },
            { id: 'claude-4-opus', name: 'Claude 4 Opus', provider: 'anthropic' },
            { id: 'openai-o3-pro', name: 'OpenAI o3 Pro', provider: 'openai' },
            { id: 'qwen2.5-coder', name: 'Qwen2.5 Coder', provider: 'qwen' },
            { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', provider: 'google' },
            { id: 'deepseek-r1', name: 'DeepSeek R1', provider: 'deepseek' },
            { id: 'grok-3', name: 'Grok 3', provider: 'xai' },
            { id: 'deepseek-v3', name: 'DeepSeek V3', provider: 'deepseek' },
            { id: 'openai-codex-mini', name: 'OpenAI Codex Mini', provider: 'openai' },
            { id: 'minimax-m1-extended', name: 'MiniMax M1 Extended', provider: 'minimax' },
            { id: 'qwen3-30b-a3b', name: 'Qwen3 30B A3B', provider: 'qwen' }
        ];
    }
    
    init() {
        this.createChatSection();
        this.bindEventListeners();
        this.loadChatHistory();
    }
    
    createChatSection() {
        const chatHTML = `
                <div class="section-header">
                    <h2>🤖 Master Agent Chat</h2>
                    <p>Communicate directly with the Master Agent for guidance and commands</p>
                </div>
                
                <div class="chat-container">
                    <div class="chat-header">
                        <div class="model-selector">
                            <label>Model:</label>
                            <select id="chat-model-select" class="form-control">
                                ${this.models.map(model => `
                                    <option value="${model.id}" ${model.id === this.selectedModel ? 'selected' : ''}>
                                        ${model.name}
                                    </option>
                                `).join('')}
                            </select>
                        </div>
                        <div class="chat-actions">
                            <button class="btn btn-secondary" onclick="chatInterface.clearChat()">
                                🗑️ Clear Chat
                            </button>
                            <button class="btn btn-secondary" onclick="chatInterface.exportChat()">
                                📥 Export
                            </button>
                        </div>
                    </div>
                    
                    <div class="chat-messages" id="chat-messages">
                        <div class="chat-welcome">
                            <h3>👋 Welcome to Master Agent Chat</h3>
                            <p>I can help you with:</p>
                            <ul>
                                <li>Managing and assigning tickets to agents</li>
                                <li>Overseeing multi-agent workflows</li>
                                <li>Analyzing project status and progress</li>
                                <li>Coordinating agent collaboration</li>
                                <li>Providing architectural guidance</li>
                            </ul>
                            <div class="suggested-prompts">
                                <h4>Try asking:</h4>
                                <button class="prompt-suggestion" onclick="chatInterface.sendSuggestedPrompt('What is the current status of all active agents?')">
                                    What is the current status of all active agents?
                                </button>
                                <button class="prompt-suggestion" onclick="chatInterface.sendSuggestedPrompt('Can you analyze the tickets and suggest optimal agent assignments?')">
                                    Can you analyze the tickets and suggest optimal agent assignments?
                                </button>
                                <button class="prompt-suggestion" onclick="chatInterface.sendSuggestedPrompt('Show me the progress on TICKET-005')">
                                    Show me the progress on TICKET-005
                                </button>
                                <button class="prompt-suggestion" onclick="chatInterface.sendSuggestedPrompt('Run a full integration test on the current branches')">
                                    Run a full integration test on the current branches
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <div class="chat-input-container">
                        <div class="chat-input-wrapper">
                            <textarea 
                                id="chat-input" 
                                class="chat-input" 
                                placeholder="Ask the Master Agent anything..."
                                rows="3"
                            ></textarea>
                            <div class="chat-input-actions">
                                <button id="chat-send-btn" class="btn btn-primary" onclick="chatInterface.sendMessage()">
                                    Send
                                </button>
                            </div>
                        </div>
                        <div class="chat-status" id="chat-status"></div>
                    </div>
                </div>
        `;
        
        // Insert the HTML into the chat section
        const chatSection = document.getElementById('chat');
        if (chatSection) {
            chatSection.innerHTML = chatHTML;
        }
    }
    
    bindEventListeners() {
        // Model selector change
        document.addEventListener('change', (e) => {
            if (e.target.id === 'chat-model-select') {
                this.selectedModel = e.target.value;
                this.saveSettings();
            }
        });
        
        // Enter key to send
        document.addEventListener('keydown', (e) => {
            if (e.target.id === 'chat-input' && e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
    }
    
    sendSuggestedPrompt(prompt) {
        document.getElementById('chat-input').value = prompt;
        this.sendMessage();
    }
    
    async sendMessage() {
        const input = document.getElementById('chat-input');
        const message = input.value.trim();
        
        if (!message) return;
        
        // Clear input
        input.value = '';
        
        // Add user message to chat
        this.addMessage('user', message);
        
        // Show typing indicator
        this.showTypingIndicator();
        
        try {
            // Send to backend
            const response = await this.sendToMasterAgent(message);
            
            // Remove typing indicator
            this.hideTypingIndicator();
            
            // Add agent response
            this.addMessage('agent', response);
            
        } catch (error) {
            this.hideTypingIndicator();
            this.addMessage('error', `Error: ${error.message}`);
        }
    }
    
    async sendToMasterAgent(message) {
        // Send command to backend
        return new Promise((resolve, reject) => {
            if (ws && ws.readyState === WebSocket.OPEN) {
                const requestId = Date.now().toString();
                
                // Set up response handler
                const responseHandler = (event) => {
                    const data = JSON.parse(event.data);
                    if (data.type === 'chat-response' && data.requestId === requestId) {
                        ws.removeEventListener('message', responseHandler);
                        if (data.error) {
                            reject(new Error(data.error));
                        } else {
                            resolve(data.response);
                        }
                    }
                };
                
                ws.addEventListener('message', responseHandler);
                
                // Send message
                ws.send(JSON.stringify({
                    command: 'master-chat',
                    params: {
                        message,
                        model: this.selectedModel,
                        context: this.getContext(),
                        requestId
                    }
                }));
                
                // Timeout after 30 seconds
                setTimeout(() => {
                    ws.removeEventListener('message', responseHandler);
                    reject(new Error('Request timeout'));
                }, 30000);
                
            } else {
                // Fallback to HTTP request
                fetch('/api/master-chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        message,
                        model: this.selectedModel,
                        context: this.getContext()
                    })
                })
                .then(res => res.json())
                .then(data => {
                    if (data.error) {
                        reject(new Error(data.error));
                    } else {
                        resolve(data.response);
                    }
                })
                .catch(reject);
            }
        });
    }
    
    getContext() {
        // Get current context for the master agent
        return {
            repository: currentRepository,
            activeAgents: this.getActiveAgents(),
            recentTickets: this.getRecentTickets(),
            chatHistory: this.chatHistory.slice(-10) // Last 10 messages for context
        };
    }
    
    getActiveAgents() {
        // Get list of active agents (would be populated from actual state)
        return ['frontend', 'backend', 'database'];
    }
    
    getRecentTickets() {
        // Get recent tickets (would be populated from actual state)
        return ['TICKET-001', 'TICKET-002', 'TICKET-003', 'TICKET-004', 'TICKET-005'];
    }
    
    addMessage(type, content) {
        const messagesContainer = document.getElementById('chat-messages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${type}-message`;
        
        const timestamp = new Date().toLocaleTimeString();
        
        let messageHTML = '';
        
        switch(type) {
            case 'user':
                messageHTML = `
                    <div class="message-header">
                        <span class="message-sender">You</span>
                        <span class="message-time">${timestamp}</span>
                    </div>
                    <div class="message-content">${this.escapeHtml(content)}</div>
                `;
                break;
                
            case 'agent':
                messageHTML = `
                    <div class="message-header">
                        <span class="message-sender">🤖 Master Agent (${this.getModelName(this.selectedModel)})</span>
                        <span class="message-time">${timestamp}</span>
                    </div>
                    <div class="message-content">${this.formatAgentResponse(content)}</div>
                `;
                break;
                
            case 'error':
                messageHTML = `
                    <div class="message-header">
                        <span class="message-sender">⚠️ System</span>
                        <span class="message-time">${timestamp}</span>
                    </div>
                    <div class="message-content error-content">${this.escapeHtml(content)}</div>
                `;
                break;
        }
        
        messageDiv.innerHTML = messageHTML;
        
        // Remove welcome message if it exists
        const welcomeMessage = messagesContainer.querySelector('.chat-welcome');
        if (welcomeMessage) {
            welcomeMessage.remove();
        }
        
        messagesContainer.appendChild(messageDiv);
        
        // Scroll to bottom
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
        // Save to history
        this.chatHistory.push({
            type,
            content,
            timestamp: new Date().toISOString(),
            model: type === 'agent' ? this.selectedModel : null
        });
        
        this.saveChatHistory();
    }
    
    formatAgentResponse(content) {
        // Format the agent response with proper styling
        // Handle code blocks, lists, etc.
        let formatted = this.escapeHtml(content);
        
        // Format code blocks
        formatted = formatted.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
            return `<pre class="code-block"><code class="language-${lang || 'text'}">${code}</code></pre>`;
        });
        
        // Format inline code
        formatted = formatted.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');
        
        // Format bold
        formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        
        // Format lists
        formatted = formatted.replace(/^\* (.+)$/gm, '<li>$1</li>');
        formatted = formatted.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');
        
        // Format line breaks
        formatted = formatted.replace(/\n/g, '<br>');
        
        return formatted;
    }
    
    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }
    
    getModelName(modelId) {
        const model = this.models.find(m => m.id === modelId);
        return model ? model.name : modelId;
    }
    
    showTypingIndicator() {
        const messagesContainer = document.getElementById('chat-messages');
        const indicator = document.createElement('div');
        indicator.className = 'typing-indicator';
        indicator.id = 'typing-indicator';
        indicator.innerHTML = `
            <div class="typing-dots">
                <span></span>
                <span></span>
                <span></span>
            </div>
            <span class="typing-text">Master Agent is thinking...</span>
        `;
        messagesContainer.appendChild(indicator);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
    
    hideTypingIndicator() {
        const indicator = document.getElementById('typing-indicator');
        if (indicator) {
            indicator.remove();
        }
    }
    
    clearChat() {
        if (confirm('Clear all chat history?')) {
            const messagesContainer = document.getElementById('chat-messages');
            messagesContainer.innerHTML = '';
            this.chatHistory = [];
            this.saveChatHistory();
            this.createChatSection();
            location.reload(); // Reload to show welcome message
        }
    }
    
    exportChat() {
        const exportData = {
            exportDate: new Date().toISOString(),
            repository: currentRepository,
            messages: this.chatHistory
        };
        
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `master-agent-chat-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
    }
    
    saveChatHistory() {
        localStorage.setItem('masterAgentChatHistory', JSON.stringify(this.chatHistory));
    }
    
    loadChatHistory() {
        const saved = localStorage.getItem('masterAgentChatHistory');
        if (saved) {
            try {
                this.chatHistory = JSON.parse(saved);
            } catch (e) {
                console.error('Failed to load chat history:', e);
                this.chatHistory = [];
            }
        }
    }
    
    saveSettings() {
        localStorage.setItem('masterAgentChatSettings', JSON.stringify({
            selectedModel: this.selectedModel
        }));
    }
    
    loadSettings() {
        const saved = localStorage.getItem('masterAgentChatSettings');
        if (saved) {
            try {
                const settings = JSON.parse(saved);
                this.selectedModel = settings.selectedModel || 'claude-3-opus';
            } catch (e) {
                console.error('Failed to load settings:', e);
            }
        }
    }
}

// Create global instance
const chatInterface = new ChatInterface();
