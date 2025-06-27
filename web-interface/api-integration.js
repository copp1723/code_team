/**
 * API Integration for Master Dashboard
 * Connects to OpenRouter and Supermemory APIs
 */

class APIIntegration {
    constructor() {
        this.openRouterApiKey = process.env.OPENROUTER_API_KEY || '';
        this.supermemoryApiKey = process.env.SUPERMEMORY_API_KEY || '';
        this.openRouterBaseUrl = 'https://openrouter.ai/api/v1';
        this.supermemoryBaseUrl = 'https://api.supermemory.ai/v1';
        
        // Initialize conversation context
        this.conversationHistory = [];
        this.systemContext = '';
        this.updateSystemContext();
    }

    /**
     * Update system context with current dashboard state
     */
    updateSystemContext() {
        const timestamp = new Date().toISOString();
        this.systemContext = `
You are the Master Agent for a multi-agent development orchestration system. Current system state as of ${timestamp}:

ACTIVE AGENTS:
- Frontend Agent: Working on TICKET-005 (SEO Components) - Status: Active, Health: Good
- Backend Agent: Working on TICKET-003 (Webhook System) - Status: Working, Health: Good  
- Database Agent: Recently recovered from connection timeout - Status: Recovering, Health: Warning
- Master Agent: Monitoring all operations - Status: Active, Health: Good

SYSTEM METRICS:
- Completed Tickets Today: 12
- Pending Tickets: 8
- Failed Tasks: 2
- Success Rate: 94%
- API Calls This Hour: 1,200
- Cost Today: $4.25
- CPU Usage: 32%
- Memory Usage: 1.2GB

CURRENT WORKFLOW STATUS:
1. ✅ Repository Setup - Completed
2. ✅ Tickets Loaded - Completed (8 tickets imported)
3. 🔄 Agents Working - In Progress (3 agents active)
4. ⏳ Quality Validation - Pending
5. ⏳ Master Integration - Pending

ACTIVE TICKETS:
- TICKET-003: Update Order Webhook (Backend Agent, 75% complete)
- TICKET-005: Add SEO Prompts (Frontend Agent, 60% complete)
- TICKET-002: Enhance Order Model (Database Agent, Failed - Retry pending)

You should provide helpful, actionable responses about system coordination, agent management, ticket status, integration planning, and troubleshooting. Be concise but informative.
`;
    }

    /**
     * Send message to OpenRouter API
     */
    async sendToOpenRouter(message, model = 'anthropic/claude-4-sonnet') {
        if (!this.openRouterApiKey) {
            throw new Error('OpenRouter API key not configured. Please set OPENROUTER_API_KEY environment variable.');
        }

        try {
            // Update system context with latest state
            this.updateSystemContext();

            // Prepare conversation history
            const messages = [
                {
                    role: 'system',
                    content: this.systemContext
                },
                ...this.conversationHistory,
                {
                    role: 'user',
                    content: message
                }
            ];

            const response = await fetch(`${this.openRouterBaseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.openRouterApiKey}`,
                    'Content-Type': 'application/json',
                    'X-Title': 'Multi-Agent Orchestrator Master Agent'
                },
                body: JSON.stringify({
                    model: model,
                    messages: messages,
                    temperature: 0.7,
                    max_tokens: 1000,
                    stream: false
                })
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`OpenRouter API error: ${response.status} - ${error}`);
            }

            const data = await response.json();
            const assistantMessage = data.choices[0].message.content;

            // Add to conversation history
            this.conversationHistory.push(
                { role: 'user', content: message },
                { role: 'assistant', content: assistantMessage }
            );

            // Keep conversation history manageable (last 10 exchanges)
            if (this.conversationHistory.length > 20) {
                this.conversationHistory = this.conversationHistory.slice(-20);
            }

            // Store conversation in Supermemory
            await this.storeInSupermemory({
                type: 'conversation',
                user_message: message,
                assistant_response: assistantMessage,
                model: model,
                timestamp: new Date().toISOString(),
                context: 'master_agent_dashboard'
            });

            return assistantMessage;

        } catch (error) {
            console.error('OpenRouter API error:', error);
            throw error;
        }
    }

    /**
     * Store conversation in Supermemory for persistence
     */
    async storeInSupermemory(data) {
        if (!this.supermemoryApiKey) {
            console.warn('Supermemory API key not configured. Conversation not stored.');
            return;
        }

        try {
            const response = await fetch(`${this.supermemoryBaseUrl}/memories`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.supermemoryApiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    content: JSON.stringify(data),
                    tags: ['master-agent', 'dashboard', 'conversation'],
                    metadata: {
                        source: 'multi-agent-orchestrator',
                        timestamp: data.timestamp,
                        model: data.model
                    }
                })
            });

            if (!response.ok) {
                console.warn('Failed to store in Supermemory:', response.status);
            }

        } catch (error) {
            console.warn('Supermemory storage error:', error);
        }
    }

    /**
     * Retrieve conversation history from Supermemory
     */
    async loadConversationHistory() {
        if (!this.supermemoryApiKey) return;

        try {
            const response = await fetch(`${this.supermemoryBaseUrl}/memories/search`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.supermemoryApiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    query: 'master-agent dashboard conversation',
                    tags: ['master-agent', 'conversation'],
                    limit: 10
                })
            });

            if (response.ok) {
                const data = await response.json();
                return data.memories || [];
            }

        } catch (error) {
            console.warn('Failed to load conversation history:', error);
        }

        return [];
    }

    /**
     * Get system insights using AI analysis
     */
    async getSystemInsights() {
        const insightPrompt = `
Based on the current system state, provide a brief analysis covering:
1. Overall system health and any concerns
2. Agent performance and recommendations
3. Ticket progress and potential blockers
4. Suggested next actions

Keep it concise and actionable.
`;

        return await this.sendToOpenRouter(insightPrompt, 'anthropic/claude-4-sonnet');
    }

    /**
     * Analyze ticket priorities and dependencies
     */
    async analyzeTicketPriorities(tickets) {
        const analysisPrompt = `
Analyze these tickets and provide priority recommendations:
${JSON.stringify(tickets, null, 2)}

Consider:
1. Dependencies between tickets
2. Business impact
3. Technical complexity
4. Resource availability

Provide a prioritized list with reasoning.
`;

        return await this.sendToOpenRouter(analysisPrompt, 'anthropic/claude-4-sonnet');
    }

    /**
     * Generate integration plan
     */
    async generateIntegrationPlan(completedTickets) {
        const planPrompt = `
Generate a safe integration plan for these completed tickets:
${JSON.stringify(completedTickets, null, 2)}

Include:
1. Integration order
2. Potential conflicts
3. Testing requirements
4. Rollback strategy
`;

        return await this.sendToOpenRouter(planPrompt, 'anthropic/claude-4-opus');
    }

    /**
     * Clear conversation history
     */
    clearConversationHistory() {
        this.conversationHistory = [];
    }
}

module.exports = { APIIntegration };
