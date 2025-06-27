// Supermemory Integration for Multi-Agent System
// Provides persistent, contextual memory across all agents

const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

class SupermemoryIntegration {
    constructor() {
        this.apiKey = process.env.SUPERMEMORY_API_KEY;
        this.baseUrl = process.env.SUPERMEMORY_BASE_URL || 'https://api.supermemory.ai/v1';
        this.collections = {
            tickets: 'agent-tickets',
            code: 'agent-code-snippets',
            patterns: 'agent-patterns',
            errors: 'agent-error-solutions',
            architecture: 'agent-architecture-decisions'
        };
    }

    // Store ticket and its solution
    async storeTicketSolution(ticketId, agentType, description, solution, code) {
        try {
            const memory = {
                ticketId,
                agentType,
                description,
                solution,
                code,
                timestamp: new Date().toISOString(),
                tags: this.extractTags(description),
                technologies: this.extractTechnologies(code)
            };

            const response = await axios.post(
                `${this.baseUrl}/collections/${this.collections.tickets}/documents`,
                memory,
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            console.log(`✅ Stored solution for ${ticketId} in Supermemory`);
            return response.data;
        } catch (error) {
            console.error('Failed to store in Supermemory:', error.message);
        }
    }

    // Search for similar tickets/solutions
    async findSimilarSolutions(description, agentType) {
        try {
            const response = await axios.post(
                `${this.baseUrl}/collections/${this.collections.tickets}/search`,
                {
                    query: description,
                    filter: { agentType },
                    limit: 5
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            return response.data.results || [];
        } catch (error) {
            console.error('Failed to search Supermemory:', error.message);
            return [];
        }
    }

    // Store reusable code patterns
    async storeCodePattern(pattern, description, useCase, agentType) {
        try {
            const memory = {
                pattern,
                description,
                useCase,
                agentType,
                usageCount: 1,
                timestamp: new Date().toISOString()
            };

            const response = await axios.post(
                `${this.baseUrl}/collections/${this.collections.patterns}/documents`,
                memory,
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            return response.data;
        } catch (error) {
            console.error('Failed to store pattern:', error.message);
        }
    }

    // Get agent's knowledge context
    async getAgentContext(agentType, topic) {
        try {
            const [tickets, patterns, errors] = await Promise.all([
                this.findSimilarSolutions(topic, agentType),
                this.searchPatterns(topic, agentType),
                this.searchErrorSolutions(topic, agentType)
            ]);

            return {
                previousWork: tickets,
                patterns: patterns,
                knownIssues: errors,
                summary: this.generateContextSummary(tickets, patterns, errors)
            };
        } catch (error) {
            console.error('Failed to get agent context:', error.message);
            return null;
        }
    }

    // Store error and its solution
    async storeErrorSolution(error, solution, context) {
        try {
            const memory = {
                error: error.message || error,
                solution,
                context,
                timestamp: new Date().toISOString(),
                resolved: true
            };

            const response = await axios.post(
                `${this.baseUrl}/collections/${this.collections.errors}/documents`,
                memory,
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            return response.data;
        } catch (err) {
            console.error('Failed to store error solution:', err.message);
        }
    }

    // Search for patterns
    async searchPatterns(query, agentType) {
        try {
            const response = await axios.post(
                `${this.baseUrl}/collections/${this.collections.patterns}/search`,
                {
                    query,
                    filter: { agentType },
                    limit: 3
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            return response.data.results || [];
        } catch (error) {
            console.error('Failed to search patterns:', error.message);
            return [];
        }
    }

    // Search error solutions
    async searchErrorSolutions(query, agentType) {
        try {
            const response = await axios.post(
                `${this.baseUrl}/collections/${this.collections.errors}/search`,
                {
                    query,
                    limit: 3
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            return response.data.results || [];
        } catch (error) {
            console.error('Failed to search error solutions:', error.message);
            return [];
        }
    }

    // Store architectural decisions
    async storeArchitectureDecision(decision, reasoning, impact, ticketId) {
        try {
            const memory = {
                decision,
                reasoning,
                impact,
                ticketId,
                timestamp: new Date().toISOString()
            };

            const response = await axios.post(
                `${this.baseUrl}/collections/${this.collections.architecture}/documents`,
                memory,
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            return response.data;
        } catch (error) {
            console.error('Failed to store architecture decision:', error.message);
        }
    }

    // Helper methods
    extractTags(description) {
        const keywords = ['api', 'frontend', 'backend', 'database', 'auth', 'test', 'ui', 'component'];
        return keywords.filter(keyword => description.toLowerCase().includes(keyword));
    }

    extractTechnologies(code) {
        const techs = [];
        if (code.includes('react')) techs.push('react');
        if (code.includes('express')) techs.push('express');
        if (code.includes('jwt')) techs.push('jwt');
        if (code.includes('postgres')) techs.push('postgresql');
        if (code.includes('mongodb')) techs.push('mongodb');
        return techs;
    }

    generateContextSummary(tickets, patterns, errors) {
        return `Found ${tickets.length} similar tickets, ${patterns.length} relevant patterns, and ${errors.length} known issues.`;
    }

    // Get cross-agent insights
    async getCrossAgentInsights(topic) {
        try {
            const response = await axios.post(
                `${this.baseUrl}/collections/${this.collections.tickets}/search`,
                {
                    query: topic,
                    limit: 10
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            const results = response.data.results || [];
            
            // Group by agent type
            const insights = {
                frontend: results.filter(r => r.agentType === 'frontend'),
                backend: results.filter(r => r.agentType === 'backend'),
                database: results.filter(r => r.agentType === 'database'),
                summary: `Cross-agent analysis: ${results.length} related implementations found`
            };

            return insights;
        } catch (error) {
            console.error('Failed to get cross-agent insights:', error.message);
            return null;
        }
    }
}

module.exports = { SupermemoryIntegration };