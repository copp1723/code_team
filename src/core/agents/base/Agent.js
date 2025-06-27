/**
 * Base Agent Class
 * Consolidated from multiple agent implementations
 */

const EventEmitter = require('events');

class Agent extends EventEmitter {
  constructor(config = {}) {
    super();
    this.id = config.id || Math.random().toString(36).substr(2, 9);
    this.name = config.name || 'Agent';
    this.type = config.type || 'base';
    this.capabilities = config.capabilities || [];
    this.state = 'idle';
    this.memory = new Map();
    this.metrics = {
      tasksCompleted: 0,
      errors: 0,
      startTime: Date.now()
    };
  }

  async initialize() {
    this.state = 'ready';
    this.emit('agent:ready', { id: this.id, type: this.type });
  }

  async processTask(task) {
    this.state = 'processing';
    this.emit('task:started', task);

    try {
      const result = await this.execute(task);
      this.metrics.tasksCompleted++;
      this.emit('task:completed', { task, result });
      return result;
    } catch (error) {
      this.metrics.errors++;
      this.emit('task:error', { task, error });
      throw error;
    } finally {
      this.state = 'ready';
    }
  }

  async execute(task) {
    // Override in subclasses
    throw new Error('Execute method must be implemented by subclass');
  }

  getMetrics() {
    return {
      ...this.metrics,
      uptime: Date.now() - this.metrics.startTime
    };
  }
}

module.exports = Agent;
