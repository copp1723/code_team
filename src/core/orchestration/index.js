/**
 * Core Orchestration Module
 * Main orchestrator class that coordinates multiple agents
 */

const { EventEmitter } = require('events');
const path = require('path');
const fs = require('fs');

class Orchestrator extends EventEmitter {
  constructor(agentManager, config = {}) {
    super();
    this.agentManager = agentManager;
    this.config = {
      maxConcurrentAgents: 3,
      syncInterval: 30000, // 30 seconds
      autoSync: true,
      ...config
    };
    this.running = false;
    this.activeWorkflows = new Map();
    this.syncTimer = null;
  }

  async start() {
    if (this.running) {
      throw new Error('Orchestrator is already running');
    }

    console.log('🚀 Starting Multi-Agent Orchestrator...');
    
    // Initialize agent manager
    if (!this.agentManager.isInitialized()) {
      await this.agentManager.initialize();
    }

    this.running = true;
    
    // Start periodic sync if enabled
    if (this.config.autoSync) {
      this.startPeriodicSync();
    }

    this.emit('started');
    console.log('✅ Multi-Agent Orchestrator started successfully');
  }

  async stop() {
    if (!this.running) {
      return;
    }

    console.log('🛑 Stopping Multi-Agent Orchestrator...');

    // Stop periodic sync
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }

    // Stop all active workflows
    for (const [workflowId, workflow] of this.activeWorkflows) {
      try {
        await this.stopWorkflow(workflowId);
      } catch (error) {
        console.error(`Error stopping workflow ${workflowId}:`, error.message);
      }
    }

    // Stop agent manager
    await this.agentManager.shutdown();

    this.running = false;
    this.emit('stopped');
    console.log('✅ Multi-Agent Orchestrator stopped');
  }

  startPeriodicSync() {
    this.syncTimer = setInterval(async () => {
      try {
        await this.syncAllAgents();
      } catch (error) {
        console.error('Error during periodic sync:', error.message);
        this.emit('error', error);
      }
    }, this.config.syncInterval);
  }

  async syncAllAgents() {
    if (!this.running) return;

    console.log('🔄 Running periodic agent sync...');
    const agents = this.agentManager.getAllAgents();
    
    for (const agent of agents) {
      try {
        await agent.sync();
      } catch (error) {
        console.error(`Error syncing agent ${agent.id}:`, error.message);
      }
    }
  }

  async createWorkflow(workflowConfig) {
    const workflowId = `workflow-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const workflow = {
      id: workflowId,
      config: workflowConfig,
      status: 'created',
      createdAt: new Date(),
      agents: [],
      tasks: workflowConfig.tasks || [],
      currentStep: 0
    };

    this.activeWorkflows.set(workflowId, workflow);
    this.emit('workflow-created', workflow);
    
    console.log(`📋 Created workflow ${workflowId}`);
    return workflowId;
  }

  async startWorkflow(workflowId) {
    const workflow = this.activeWorkflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    if (workflow.status !== 'created') {
      throw new Error(`Workflow ${workflowId} is not in created state`);
    }

    console.log(`🎬 Starting workflow ${workflowId}`);
    workflow.status = 'running';
    workflow.startedAt = new Date();

    try {
      // Assign agents to tasks
      await this.assignAgentsToTasks(workflow);
      
      // Start executing tasks
      await this.executeWorkflowTasks(workflow);
      
      this.emit('workflow-started', workflow);
    } catch (error) {
      workflow.status = 'failed';
      workflow.error = error.message;
      this.emit('workflow-failed', workflow);
      throw error;
    }

    return workflow;
  }

  async assignAgentsToTasks(workflow) {
    const availableAgents = this.agentManager.getAvailableAgents();
    
    for (let i = 0; i < workflow.tasks.length; i++) {
      const task = workflow.tasks[i];
      
      // Find best agent for this task
      const suitableAgent = this.findBestAgentForTask(task, availableAgents);
      
      if (!suitableAgent) {
        throw new Error(`No suitable agent found for task: ${task.name}`);
      }

      // Assign agent to task
      task.assignedAgent = suitableAgent.id;
      workflow.agents.push(suitableAgent.id);
      
      // Mark agent as busy
      suitableAgent.status = 'assigned';
      
      console.log(`👤 Assigned agent ${suitableAgent.id} to task: ${task.name}`);
    }
  }

  findBestAgentForTask(task, availableAgents) {
    // Simple selection based on agent capabilities
    for (const agent of availableAgents) {
      if (agent.status === 'available' && 
          agent.capabilities.includes(task.type || 'general')) {
        return agent;
      }
    }
    
    // Fallback to any available agent
    return availableAgents.find(agent => agent.status === 'available');
  }

  async executeWorkflowTasks(workflow) {
    console.log(`🔧 Executing ${workflow.tasks.length} tasks for workflow ${workflow.id}`);
    
    const concurrentTasks = Math.min(
      workflow.tasks.length,
      this.config.maxConcurrentAgents
    );

    // Execute tasks in batches
    for (let i = 0; i < workflow.tasks.length; i += concurrentTasks) {
      const batch = workflow.tasks.slice(i, i + concurrentTasks);
      
      // Execute batch concurrently
      const promises = batch.map(task => this.executeTask(workflow, task));
      
      try {
        await Promise.all(promises);
        workflow.currentStep = i + batch.length;
        this.emit('workflow-progress', workflow);
      } catch (error) {
        console.error(`Error executing task batch:`, error.message);
        throw error;
      }
    }

    workflow.status = 'completed';
    workflow.completedAt = new Date();
    this.emit('workflow-completed', workflow);
    console.log(`✅ Workflow ${workflow.id} completed successfully`);
  }

  async executeTask(workflow, task) {
    const agent = this.agentManager.getAgent(task.assignedAgent);
    if (!agent) {
      throw new Error(`Agent ${task.assignedAgent} not found`);
    }

    console.log(`🎯 Executing task: ${task.name} with agent: ${agent.id}`);
    
    try {
      task.status = 'running';
      task.startedAt = new Date();
      
      // Execute the task through the agent
      const result = await agent.executeTask(task);
      
      task.status = 'completed';
      task.completedAt = new Date();
      task.result = result;
      
      // Release agent
      agent.status = 'available';
      
      this.emit('task-completed', { workflow, task, result });
      console.log(`✅ Task completed: ${task.name}`);
      
      return result;
    } catch (error) {
      task.status = 'failed';
      task.error = error.message;
      agent.status = 'available';
      
      this.emit('task-failed', { workflow, task, error });
      console.error(`❌ Task failed: ${task.name} - ${error.message}`);
      throw error;
    }
  }

  async stopWorkflow(workflowId) {
    const workflow = this.activeWorkflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    console.log(`🛑 Stopping workflow ${workflowId}`);
    
    // Stop all agents working on this workflow
    for (const agentId of workflow.agents) {
      const agent = this.agentManager.getAgent(agentId);
      if (agent) {
        try {
          await agent.stop();
          agent.status = 'available';
        } catch (error) {
          console.error(`Error stopping agent ${agentId}:`, error.message);
        }
      }
    }

    workflow.status = 'stopped';
    workflow.stoppedAt = new Date();
    this.activeWorkflows.delete(workflowId);
    
    this.emit('workflow-stopped', workflow);
    console.log(`✅ Workflow ${workflowId} stopped`);
  }

  getWorkflow(workflowId) {
    return this.activeWorkflows.get(workflowId);
  }

  getAllWorkflows() {
    return Array.from(this.activeWorkflows.values());
  }

  getStatus() {
    return {
      running: this.running,
      activeWorkflows: this.activeWorkflows.size,
      totalAgents: this.agentManager.getAgentCount(),
      availableAgents: this.agentManager.getAvailableAgents().length,
      uptime: this.running ? Date.now() - this.startTime : 0
    };
  }

  // Event handlers for external integration
  onWorkflowCreated(callback) {
    this.on('workflow-created', callback);
  }

  onWorkflowCompleted(callback) {
    this.on('workflow-completed', callback);
  }

  onTaskCompleted(callback) {
    this.on('task-completed', callback);
  }

  onError(callback) {
    this.on('error', callback);
  }
}

module.exports = { Orchestrator };
