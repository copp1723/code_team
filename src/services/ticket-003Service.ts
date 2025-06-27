import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { Logger } from '../utils/logger';
import { MetricsCollector } from '../utils/metrics';
import { CacheManager } from '../utils/cache';
import { ValidationError, NotFoundError, ConflictError } from '../errors';
import { Transaction } from '../database/transaction';
import { EventStore } from '../infrastructure/eventStore';
import { QueryBus } from '../infrastructure/queryBus';
import { CommandBus } from '../infrastructure/commandBus';

/**
 * Domain Events for Ticket-003
 */
export enum DomainEventType {
  TICKET_CREATED = 'TICKET_CREATED',
  TICKET_UPDATED = 'TICKET_UPDATED',
  TICKET_ASSIGNED = 'TICKET_ASSIGNED',
  TICKET_RESOLVED = 'TICKET_RESOLVED',
  TICKET_CLOSED = 'TICKET_CLOSED',
  TICKET_REOPENED = 'TICKET_REOPENED',
  TICKET_COMMENTED = 'TICKET_COMMENTED',
  TICKET_PRIORITY_CHANGED = 'TICKET_PRIORITY_CHANGED'
}

export interface DomainEvent {
  id: string;
  aggregateId: string;
  type: DomainEventType;
  payload: any;
  metadata: {
    userId: string;
    timestamp: Date;
    version: number;
    correlationId: string;
  };
}

/**
 * Commands for Ticket-003
 */
export interface Command {
  id: string;
  type: string;
  payload: any;
  metadata: {
    userId: string;
    timestamp: Date;
    correlationId: string;
  };
}

export interface CreateTicketCommand extends Command {
  type: 'CREATE_TICKET';
  payload: {
    title: string;
    description: string;
    priority: TicketPriority;
    category: string;
    tags: string[];
    attachments?: string[];
  };
}

export interface UpdateTicketCommand extends Command {
  type: 'UPDATE_TICKET';
  payload: {
    ticketId: string;
    updates: Partial<{
      title: string;
      description: string;
      priority: TicketPriority;
      category: string;
      tags: string[];
    }>;
  };
}

export interface AssignTicketCommand extends Command {
  type: 'ASSIGN_TICKET';
  payload: {
    ticketId: string;
    assigneeId: string;
    reason?: string;
  };
}

export interface ResolveTicketCommand extends Command {
  type: 'RESOLVE_TICKET';
  payload: {
    ticketId: string;
    resolution: string;
    notes?: string;
  };
}

/**
 * Queries for Ticket-003
 */
export interface Query {
  id: string;
  type: string;
  parameters: any;
  metadata: {
    userId: string;
    timestamp: Date;
  };
}

export interface GetTicketByIdQuery extends Query {
  type: 'GET_TICKET_BY_ID';
  parameters: {
    ticketId: string;
  };
}

export interface SearchTicketsQuery extends Query {
  type: 'SEARCH_TICKETS';
  parameters: {
    filters: {
      status?: TicketStatus[];
      priority?: TicketPriority[];
      assigneeId?: string;
      category?: string[];
      tags?: string[];
      dateRange?: {
        from: Date;
        to: Date;
      };
    };
    pagination: {
      page: number;
      limit: number;
    };
    sort?: {
      field: string;
      order: 'asc' | 'desc';
    };
  };
}

/**
 * Domain Models
 */
export enum TicketStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
  REOPENED = 'REOPENED'
}

export enum TicketPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export interface Ticket {
  id: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  category: string;
  tags: string[];
  assigneeId?: string;
  reporterId: string;
  resolution?: string;
  attachments: string[];
  comments: Comment[];
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
  closedAt?: Date;
  version: number;
}

export interface Comment {
  id: string;
  ticketId: string;
  userId: string;
  content: string;
  attachments: string[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Command Handlers
 */
export class TicketCommandHandler {
  constructor(
    private eventStore: EventStore,
    private eventBus: EventEmitter,
    private logger: Logger,
    private metrics: MetricsCollector,
    private transaction: Transaction
  ) {}

  async handleCreateTicket(command: CreateTicketCommand): Promise<string> {
    const timer = this.metrics.startTimer('command.create_ticket.duration');
    
    try {
      // Validate command
      this.validateCreateTicketCommand(command);
      
      const ticketId = uuidv4();
      const event: DomainEvent = {
        id: uuidv4(),
        aggregateId: ticketId,
        type: DomainEventType.TICKET_CREATED,
        payload: {
          ...command.payload,
          id: ticketId,
          status: TicketStatus.OPEN,
          reporterId: command.metadata.userId,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        metadata: {
          ...command.metadata,
          version: 1
        }
      };

      await this.transaction.executeInTransaction(async (trx) => {
        await this.eventStore.append(event, trx);
        await this.publishEvent(event);
      });

      this.metrics.increment('command.create_ticket.success');
      this.logger.info('Ticket created', { ticketId, correlationId: command.metadata.correlationId });
      
      return ticketId;
    } catch (error) {
      this.metrics.increment('command.create_ticket.error');
      this.logger.error('Failed to create ticket', error as Error, { command });
      throw error;
    } finally {
      timer();
    }
  }

  async handleUpdateTicket(command: UpdateTicketCommand): Promise<void> {
    const timer = this.metrics.startTimer('command.update_ticket.duration');
    
    try {
      // Validate command
      this.validateUpdateTicketCommand(command);
      
      // Load current state from event store
      const events = await this.eventStore.getEvents(command.payload.ticketId);
      if (events.length === 0) {
        throw new NotFoundError(`Ticket ${command.payload.ticketId} not found`);
      }

      const currentVersion = events[events.length - 1].metadata.version;
      
      const event: DomainEvent = {
        id: uuidv4(),
        aggregateId: command.payload.ticketId,
        type: DomainEventType.TICKET_UPDATED,
        payload: {
          ...command.payload.updates,
          updatedAt: new Date()
        },
        metadata: {
          ...command.metadata,
          version: currentVersion + 1
        }
      };

      await this.transaction.executeInTransaction(async (trx) => {
        await this.eventStore.append(event, trx);
        await this.publishEvent(event);
      });

      this.metrics.increment('command.update_ticket.success');
      this.logger.info('Ticket updated', { 
        ticketId: command.payload.ticketId, 
        correlationId: command.metadata.correlationId 
      });
    } catch (error) {
      this.metrics.increment('command.update_ticket.error');
      this.logger.error('Failed to update ticket', error as Error, { command });
      throw error;
    } finally {
      timer();
    }
  }

  async handleAssignTicket(command: AssignTicketCommand): Promise<void> {
    const timer = this.metrics.startTimer('command.assign_ticket.duration');
    
    try {
      // Validate command
      this.validateAssignTicketCommand(command);
      
      // Load current state
      const events = await this.eventStore.getEvents(command.payload.ticketId);
      if (events.length === 0) {
        throw new NotFoundError(`Ticket ${command.payload.ticketId} not found`);
      }

      const currentVersion = events[events.length - 1].metadata.version;
      const currentState = this.buildTicketState(events);
      
      // Business rule: Cannot assign closed tickets
      if (currentState.status === TicketStatus.CLOSED) {
        throw new ConflictError('Cannot assign a closed ticket');
      }

      const event: DomainEvent = {
        id: uuidv4(),
        aggregateId: command.payload.ticketId,
        type: DomainEventType.TICKET_ASSIGNED,
        payload: {
          assigneeId: command.payload.assigneeId,
          previousAssigneeId: currentState.assigneeId,
          reason: command.payload.reason,
          assignedAt: new Date()
        },
        metadata: {
          ...command.metadata,
          version: currentVersion + 1
        }
      };

      await this.transaction.executeInTransaction(async (trx) => {
        await this.eventStore.append(event, trx);
        await this.publishEvent(event);
        
        // Update status to IN_PROGRESS if it was OPEN
        if (currentState.status === TicketStatus.OPEN) {
          const statusEvent: DomainEvent = {
            id: uuidv4(),
            aggregateId: command.payload.ticketId,
            type: DomainEventType.TICKET_UPDATED,
            payload: {
              status: TicketStatus.IN_PROGRESS,
              updatedAt: new Date()
            },
            metadata: {
              ...command.metadata,
              version: currentVersion + 2
            }
          };
          await this.eventStore.append(statusEvent, trx);
          await this.publishEvent(statusEvent);
        }
      });

      this.metrics.increment('command.assign_ticket.success');
      this.logger.info('Ticket assigned', { 
        ticketId: command.payload.ticketId,
        assigneeId: command.payload.assigneeId,
        correlationId: command.metadata.correlationId 
      });
    } catch (error) {
      this.metrics.increment('command.assign_ticket.error');
      this.logger.error('Failed to assign ticket', error as Error, { command });
      throw error;
    } finally {
      timer();
    }
  }

  async handleResolveTicket(command: ResolveTicketCommand): Promise<void> {
    const timer = this.metrics.startTimer('command.resolve_ticket.duration');
    
    try {
      // Validate command
      this.validateResolveTicketCommand(command);
      
      // Load current state
      const events = await this.eventStore.getEvents(command.payload.ticketId);
      if (events.length === 0) {
        throw new NotFoundError(`Ticket ${command.payload.ticketId} not found`);
      }

      const currentVersion = events[events.length - 1].metadata.version;
      const currentState = this.buildTicketState(events);
      
      // Business rule: Can only resolve tickets that are not already resolved or closed
      if (currentState.status === TicketStatus.RESOLVED || currentState.status === TicketStatus.CLOSED) {
        throw new ConflictError('Ticket is already resolved or closed');
      }

      const event: DomainEvent = {
        id: uuidv4(),
        aggregateId: command.payload.ticketId,
        type: DomainEventType.TICKET_RESOLVED,
        payload: {
          resolution: command.payload.resolution,
          notes: command.payload.notes,
          resolvedAt: new Date(),
          status: TicketStatus.RESOLVED
        },
        metadata: {
          ...command.metadata,
          version: currentVersion + 1
        }
      };

      await this.transaction.executeInTransaction(async (trx) => {
        await this.eventStore.append(event, trx);
        await this.publishEvent(event);
      });

      this.metrics.increment('command.resolve_ticket.success');
      this.logger.info('Ticket resolved', { 
        ticketId: command.payload.ticketId,
        correlationId: command.metadata.correlationId 
      });
    } catch (error) {
      this.metrics.increment('command.resolve_ticket.error');
      this.logger.error('Failed to resolve ticket', error as Error, { command });
      throw error;
    } finally {
      timer();
    }
  }

  private validateCreateTicketCommand(command: CreateTicketCommand): void {
    const { title, description, priority, category } = command.payload;
    
    if (!title || title.trim().length === 0) {
      throw new ValidationError('Title is required');
    }
    
    if (!description || description.trim().length === 0) {
      throw new ValidationError('Description is required');
    }
    
    if (!Object.values(TicketPriority).includes(priority)) {
      throw new ValidationError('Invalid priority');
    }
    
    if (!category || category.trim().length === 0) {
      throw new ValidationError('Category is required');
    }
    
    if (title.length > 200) {
      throw new ValidationError('Title must not exceed 200 characters');
    }
    
    if (description.length > 5000) {
      throw new ValidationError('Description must not exceed 5000 characters');
    }
  }

  private validateUpdateTicketCommand(command: UpdateTicketCommand): void {
    const { ticketId, updates } = command.payload;
    
    if (!ticketId) {
      throw new ValidationError('Ticket ID is required');
    }
    
    if (!updates || Object.keys(updates).length === 0) {
      throw new ValidationError('No updates provided');
    }
    
    if (updates.title !== undefined && (!updates.title || updates.title.trim().length === 0)) {
      throw new ValidationError('Title cannot be empty');
    }
    
    if (updates.priority !== undefined && !Object.values(TicketPriority).includes(updates.priority)) {
      throw new ValidationError('Invalid priority');
    }
  }

  private validateAssignTicketCommand(command: AssignTicketCommand): void {
    const { ticketId, assigneeId } = command.payload;
    
    if (!ticketId) {
      throw new ValidationError('Ticket ID is required');
    }
    
    if (!assigneeId) {
      throw new ValidationError('Assignee ID is required');
    }
  }

  private validateResolveTicketCommand(command: ResolveTicketCommand): void {
    const { ticketId, resolution } = command.payload;
    
    if (!ticketId) {
      throw new ValidationError('Ticket ID is required');
    }
    
    if (!resolution || resolution.trim().length ===