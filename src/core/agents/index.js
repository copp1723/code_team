/**
 * Agent Manager
 * Manages the lifecycle and coordination of all agents
 */

const { EventEmitter } = require('events');
const fs = require('fs');
const path = require('path');

class Agent {
  constructor(id, config) {
    this.id = id;
    this.config = config;
    this.status = 'available'; // available, assigned, busy, error
    this.capabilities = config.capabilities || ['general'];
    this.currentTask = null;
    this.createdAt = new Date();
    this.lastActivity = new Date();
  }

  async executeTask(task) {
    this.status = 'busy';
    this.currentTask = task;
    this.lastActivity = new Date();

    try {
      // Simulate task execution - in real implementation, this would
      // interface with actual AI agents or processing systems
      console.log(`Agent ${this.id} executing task: ${task.name}`);
      
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
      
      const result = {
        taskId: task.id || task.name,
        agentId: this.id,
        status: 'completed',
        output: `Task ${task.name} completed by agent ${this.id}`,
        timestamp: new Date(),
        processingTime: Date.now() - this.lastActivity.getTime()
      };

      this.status = 'available';
      this.currentTask = null;
      this.lastActivity = new Date();

      return result;
    } catch (error) {
      this.status = 'error';
      this.currentTask = null;
      throw error;
    }
  }

  async stop() {
    console.log(`Stopping agent ${this.id}`);
    this.status = 'stopped';
    this.currentTask = null;
  }

  async sync() {
    // Update last activity
    this.lastActivity = new Date();
    
    // In real implementation, this would sync with external systems
    console.log(`Agent ${this.id} synced at ${this.lastActivity.toISOString()}`);
  }

  getStatus() {
    return {
      id: this.id,
      status: this.status,
      capabilities: this.capabilities,
      currentTask: this.currentTask,
      lastActivity: this.lastActivity,
      uptime: Date.now() - this.createdAt.getTime()
    };
  }
}

class AgentManager extends EventEmitter {
  constructor(config = {}) {
    super();
    this.agents = new Map();
    this.config = {
      maxAgents: 10,
      defaultCapabilities: ['general'],
      heartbeatInterval: 30000, // 30 seconds
      ...config
    };
    this.initialized = false;
    this.heartbeatTimer = null;
  }

  async initialize() {
    if (this.initialized) {
      return;
    }

    console.log('🤖 Initializing Agent Manager...');

    // Create default agents if none exist
    if (this.agents.size === 0) {
      await this.createDefaultAgents();
    }

    // Start heartbeat monitoring
    this.startHeartbeat();

    this.initialized = true;
    this.emit('initialized');
    console.log(`✅ Agent Manager initialized with ${this.agents.size} agents`);
  }

  async createDefaultAgents() {
    const defaultAgents = [
      {
        id: 'frontend-agent',
        capabilities: ['frontend', 'react', 'javascript', 'css'],
        name: 'Frontend Developer Agent'
      },
      {
        id: 'backend-agent',
        capabilities: ['backend', 'nodejs', 'api', 'database'],
        name: 'Backend Developer Agent'
      },
      {
        id: 'fullstack-agent',
        capabilities: ['frontend', 'backend', 'fullstack'],
        name: 'Full Stack Developer Agent'
      }
    ];

    for (const agentConfig of defaultAgents) {
      await this.createAgent(agentConfig.id, agentConfig);
    }
  }

  async createAgent(id, config = {}) {
    if (this.agents.has(id)) {
      throw new Error(`Agent with id ${id} already exists`);
    }

    if (this.agents.size >= this.config.maxAgents) {
      throw new Error(`Maximum number of agents (${this.config.maxAgents}) reached`);
    }

    const agent = new Agent(id, {
      ...config,
      capabilities: config.capabilities || this.config.defaultCapabilities
    });

    this.agents.set(id, agent);
    this.emit('agent-created', agent);
    
    console.log(`👤 Created agent: ${id}`);
    return agent;
  }

  async removeAgent(id) {
    const agent = this.agents.get(id);
    if (!agent) {
      throw new Error(`Agent ${id} not found`);
    }

    // Stop the agent first
    await agent.stop();

    this.agents.delete(id);
    this.emit('agent-removed', agent);
    
    console.log(`🗑️ Removed agent: ${id}`);
  }

  getAgent(id) {
    return this.agents.get(id);
  }

  getAllAgents() {
    return Array.from(this.agents.values());
  }

  getAvailableAgents() {
    return this.getAllAgents().filter(agent => agent.status === 'available');
  }

  getBusyAgents() {
    return this.getAllAgents().filter(agent => agent.status === 'busy');
  }

  getAgentsByCapability(capability) {
    return this.getAllAgents().filter(agent => 
      agent.capabilities.includes(capability)
    );
  }

  getAgentCount() {
    return this.agents.size;
  }

  async assignTask(taskId, agentId, taskConfig) {
    const agent = this.getAgent(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    if (agent.status !== 'available') {
      throw new Error(`Agent ${agentId} is not available (current status: ${agent.status})`);
    }

    const task = {
      id: taskId,
      ...taskConfig,
      assignedAt: new Date(),
      agentId: agentId
    };

    try {
      const result = await agent.executeTask(task);
      this.emit('task-completed', { agent, task, result });
      return result;
    } catch (error) {
      this.emit('task-failed', { agent, task, error });
      throw error;
    }
  }

  async findBestAgentForTask(taskConfig) {
    const requiredCapability = taskConfig.type || 'general';
    
    // First, try to find agents with specific capability
    let suitableAgents = this.getAvailableAgents().filter(agent =>
      agent.capabilities.includes(requiredCapability)
    );

    // If no specific agents, fall back to general agents
    if (suitableAgents.length === 0) {
      suitableAgents = this.getAvailableAgents().filter(agent =>
        agent.capabilities.includes('general')
      );
    }

    if (suitableAgents.length === 0) {
      return null;
    }

    // Return the least recently used agent
    return suitableAgents.reduce((best, current) =>
      current.lastActivity < best.lastActivity ? current : best
    );
  }

  async autoAssignTask(taskConfig) {
    const agent = await this.findBestAgentForTask(taskConfig);
    if (!agent) {
      throw new Error('No suitable agent available for task');
    }

    return await this.assignTask(taskConfig.id || Date.now().toString(), agent.id, taskConfig);
  }

  startHeartbeat() {
    this.heartbeatTimer = setInterval(async () => {
      try {
        await this.performHeartbeat();
      } catch (error) {
        console.error('Error during heartbeat:', error.message);
        this.emit('error', error);
      }
    }, this.config.heartbeatInterval);
  }

  async performHeartbeat() {
    console.log('💓 Agent Manager heartbeat');
    
    // Sync all agents
    const syncPromises = this.getAllAgents().map(agent => agent.sync());
    await Promise.all(syncPromises);

    // Emit status update
    this.emit('heartbeat', this.getStatus());
  }

  async shutdown() {
    console.log('🛑 Shutting down Agent Manager...');

    // Stop heartbeat
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    // Stop all agents
    const stopPromises = this.getAllAgents().map(agent => agent.stop());
    await Promise.all(stopPromises);

    this.initialized = false;
    this.emit('shutdown');
    console.log('✅ Agent Manager shutdown complete');
  }

  getStatus() {
    const agents = this.getAllAgents();
    const statusCounts = agents.reduce((counts, agent) => {
      counts[agent.status] = (counts[agent.status] || 0) + 1;
      return counts;
    }, {});

    return {
      initialized: this.initialized,
      totalAgents: agents.length,
      statusCounts,
      capabilities: [...new Set(agents.flatMap(agent => agent.capabilities))],
      lastHeartbeat: new Date()
    };
  }

  isInitialized() {
    return this.initialized;
  }

  // Event handler helpers
  onAgentCreated(callback) {
    this.on('agent-created', callback);
  }

  onTaskCompleted(callback) {
    this.on('task-completed', callback);
  }

  onTaskFailed(callback) {
    this.on('task-failed', callback);
  }

  onError(callback) {
    this.on('error', callback);
  }
}

module.exports = { AgentManager, Agent };
