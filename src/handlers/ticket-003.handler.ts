import { injectable, inject } from 'inversify';
import { Logger } from 'winston';
import { EventEmitter } from 'events';
import { performance } from 'perf_hooks';
import { createHash } from 'crypto';
import { promisify } from 'util';
import { RateLimiter } from 'rate-limiter-flexible';
import { CircuitBreaker } from 'opossum';
import { Histogram, Counter, register } from 'prom-client';

// Domain Events
export interface DomainEvent {
  aggregateId: string;
  eventType: string;
  eventVersion: number;
  occurredAt: Date;
  metadata: EventMetadata;
  payload: unknown;
}

export interface EventMetadata {
  correlationId: string;
  causationId: string;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface TicketCreatedEvent extends DomainEvent {
  eventType: 'TicketCreated';
  payload: {
    ticketId: string;
    title: string;
    description: string;
    priority: TicketPriority;
    status: TicketStatus;
    assigneeId?: string;
    reporterId: string;
    tags: string[];
    customFields: Record<string, unknown>;
  };
}

export interface TicketUpdatedEvent extends DomainEvent {
  eventType: 'TicketUpdated';
  payload: {
    ticketId: string;
    changes: Partial<TicketData>;
    previousValues: Partial<TicketData>;
  };
}

export interface TicketAssignedEvent extends DomainEvent {
  eventType: 'TicketAssigned';
  payload: {
    ticketId: string;
    assigneeId: string;
    previousAssigneeId?: string;
  };
}

export interface TicketStatusChangedEvent extends DomainEvent {
  eventType: 'TicketStatusChanged';
  payload: {
    ticketId: string;
    newStatus: TicketStatus;
    previousStatus: TicketStatus;
    reason?: string;
  };
}

// Commands
export interface Command {
  commandId: string;
  aggregateId: string;
  correlationId: string;
  timestamp: Date;
  userId: string;
}

export interface CreateTicketCommand extends Command {
  payload: {
    title: string;
    description: string;
    priority: TicketPriority;
    reporterId: string;
    assigneeId?: string;
    tags?: string[];
    customFields?: Record<string, unknown>;
  };
}

export interface UpdateTicketCommand extends Command {
  payload: {
    ticketId: string;
    updates: Partial<TicketData>;
  };
}

export interface AssignTicketCommand extends Command {
  payload: {
    ticketId: string;
    assigneeId: string;
  };
}

export interface ChangeTicketStatusCommand extends Command {
  payload: {
    ticketId: string;
    newStatus: TicketStatus;
    reason?: string;
  };
}

// Queries
export interface Query {
  queryId: string;
  correlationId: string;
  timestamp: Date;
  userId?: string;
}

export interface GetTicketByIdQuery extends Query {
  ticketId: string;
}

export interface SearchTicketsQuery extends Query {
  filters: TicketFilters;
  pagination: PaginationParams;
  sorting?: SortingParams;
}

export interface GetTicketHistoryQuery extends Query {
  ticketId: string;
  fromDate?: Date;
  toDate?: Date;
}

// Domain Models
export enum TicketPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export enum TicketStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  BLOCKED = 'BLOCKED',
  IN_REVIEW = 'IN_REVIEW',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED'
}

export interface TicketData {
  ticketId: string;
  title: string;
  description: string;
  priority: TicketPriority;
  status: TicketStatus;
  assigneeId?: string;
  reporterId: string;
  tags: string[];
  customFields: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

export interface TicketFilters {
  status?: TicketStatus[];
  priority?: TicketPriority[];
  assigneeId?: string[];
  reporterId?: string[];
  tags?: string[];
  createdAfter?: Date;
  createdBefore?: Date;
  searchText?: string;
}

export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface SortingParams {
  field: string;
  direction: 'ASC' | 'DESC';
}

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Repositories
export interface EventStore {
  appendEvents(events: DomainEvent[]): Promise<void>;
  getEvents(aggregateId: string, fromVersion?: number): Promise<DomainEvent[]>;
  getEventsByType(eventType: string, limit?: number): Promise<DomainEvent[]>;
}

export interface ReadModelRepository {
  save(ticket: TicketData): Promise<void>;
  findById(ticketId: string): Promise<TicketData | null>;
  search(filters: TicketFilters, pagination: PaginationParams, sorting?: SortingParams): Promise<PagedResult<TicketData>>;
  delete(ticketId: string): Promise<void>;
}

// Metrics
const commandProcessingTime = new Histogram({
  name: 'ticket_command_processing_duration_seconds',
  help: 'Duration of ticket command processing',
  labelNames: ['command_type', 'status'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5]
});

const queryProcessingTime = new Histogram({
  name: 'ticket_query_processing_duration_seconds',
  help: 'Duration of ticket query processing',
  labelNames: ['query_type', 'status'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5]
});

const eventCounter = new Counter({
  name: 'ticket_events_total',
  help: 'Total number of ticket events',
  labelNames: ['event_type']
});

const errorCounter = new Counter({
  name: 'ticket_errors_total',
  help: 'Total number of ticket processing errors',
  labelNames: ['operation', 'error_type']
});

// Command Handlers
@injectable()
export class TicketCommandHandler {
  private readonly eventEmitter: EventEmitter;
  private readonly rateLimiter: RateLimiter;
  private readonly circuitBreaker: CircuitBreaker;

  constructor(
    @inject('EventStore') private readonly eventStore: EventStore,
    @inject('ReadModelRepository') private readonly readModel: ReadModelRepository,
    @inject('Logger') private readonly logger: Logger,
    @inject('EventEmitter') eventEmitter: EventEmitter,
    @inject('RateLimiter') rateLimiter: RateLimiter
  ) {
    this.eventEmitter = eventEmitter;
    this.rateLimiter = rateLimiter;
    
    this.circuitBreaker = new CircuitBreaker(
      async (fn: Function) => fn(),
      {
        timeout: 5000,
        errorThresholdPercentage: 50,
        resetTimeout: 30000,
        rollingCountTimeout: 10000,
        rollingCountBuckets: 10,
        name: 'TicketCommandHandler'
      }
    );

    this.circuitBreaker.on('open', () => {
      this.logger.error('Circuit breaker opened for TicketCommandHandler');
    });
  }

  async handleCreateTicket(command: CreateTicketCommand): Promise<string> {
    const startTime = performance.now();
    const commandType = 'CreateTicket';

    try {
      // Rate limiting
      await this.rateLimiter.consume(command.userId, 1);

      // Input validation
      this.validateCreateTicketCommand(command);

      // Generate ticket ID
      const ticketId = this.generateTicketId();

      // Create domain event
      const event: TicketCreatedEvent = {
        aggregateId: ticketId,
        eventType: 'TicketCreated',
        eventVersion: 1,
        occurredAt: new Date(),
        metadata: {
          correlationId: command.correlationId,
          causationId: command.commandId,
          userId: command.userId
        },
        payload: {
          ticketId,
          title: this.sanitizeInput(command.payload.title),
          description: this.sanitizeInput(command.payload.description),
          priority: command.payload.priority,
          status: TicketStatus.OPEN,
          assigneeId: command.payload.assigneeId,
          reporterId: command.payload.reporterId,
          tags: command.payload.tags?.map(tag => this.sanitizeInput(tag)) || [],
          customFields: this.sanitizeCustomFields(command.payload.customFields || {})
        }
      };

      // Execute with circuit breaker
      await this.circuitBreaker.fire(async () => {
        // Persist event
        await this.eventStore.appendEvents([event]);

        // Update read model
        const ticket: TicketData = {
          ...event.payload,
          createdAt: event.occurredAt,
          updatedAt: event.occurredAt,
          version: 1
        };
        await this.readModel.save(ticket);
      });

      // Emit event for downstream processing
      this.eventEmitter.emit('ticket.created', event);

      // Record metrics
      commandProcessingTime.observe(
        { command_type: commandType, status: 'success' },
        (performance.now() - startTime) / 1000
      );
      eventCounter.inc({ event_type: 'TicketCreated' });

      this.logger.info('Ticket created successfully', {
        ticketId,
        correlationId: command.correlationId,
        userId: command.userId
      });

      return ticketId;
    } catch (error) {
      commandProcessingTime.observe(
        { command_type: commandType, status: 'error' },
        (performance.now() - startTime) / 1000
      );
      errorCounter.inc({ operation: commandType, error_type: error.constructor.name });

      this.logger.error('Failed to create ticket', {
        error: error.message,
        correlationId: command.correlationId,
        userId: command.userId
      });

      throw error;
    }
  }

  async handleUpdateTicket(command: UpdateTicketCommand): Promise<void> {
    const startTime = performance.now();
    const commandType = 'UpdateTicket';

    try {
      await this.rateLimiter.consume(command.userId, 1);

      this.validateUpdateTicketCommand(command);

      const currentTicket = await this.readModel.findById(command.payload.ticketId);
      if (!currentTicket) {
        throw new Error(`Ticket not found: ${command.payload.ticketId}`);
      }

      // Check optimistic locking
      if (command.payload.updates.version && command.payload.updates.version !== currentTicket.version) {
        throw new Error('Concurrent modification detected');
      }

      const previousValues: Partial<TicketData> = {};
      const changes: Partial<TicketData> = {};

      // Track changes
      Object.keys(command.payload.updates).forEach(key => {
        if (key !== 'version' && currentTicket[key] !== command.payload.updates[key]) {
          previousValues[key] = currentTicket[key];
          changes[key] = command.payload.updates[key];
        }
      });

      if (Object.keys(changes).length === 0) {
        return; // No changes to apply
      }

      const event: TicketUpdatedEvent = {
        aggregateId: command.payload.ticketId,
        eventType: 'TicketUpdated',
        eventVersion: currentTicket.version + 1,
        occurredAt: new Date(),
        metadata: {
          correlationId: command.correlationId,
          causationId: command.commandId,
          userId: command.userId
        },
        payload: {
          ticketId: command.payload.ticketId,
          changes: this.sanitizeTicketData(changes),
          previousValues
        }
      };

      await this.circuitBreaker.fire(async () => {
        await this.eventStore.appendEvents([event]);

        const updatedTicket: TicketData = {
          ...currentTicket,
          ...changes,
          updatedAt: event.occurredAt,
          version: event.eventVersion
        };
        await this.readModel.save(updatedTicket);
      });

      this.eventEmitter.emit('ticket.updated', event);

      commandProcessingTime.observe(
        { command_type: commandType, status: 'success' },
        (performance.now() - startTime) / 1000
      );
      eventCounter.inc({ event_type: 'TicketUpdated' });

      this.logger.info('Ticket updated successfully', {
        ticketId: command.payload.ticketId,
        changes: Object.keys(changes),
        correlationId: command.correlationId
      });
    } catch (error) {
      commandProcessingTime.observe(
        { command_type: commandType, status: 'error' },
        (performance.now() - startTime) / 1000
      );
      errorCounter.inc({ operation: commandType, error_type: error.constructor.name });

      this.logger.error('Failed to update ticket', {
        error: error.message,
        ticketId: command.payload.ticketId,
        correlationId: command.correlationId
      });

      throw error;
    }
  }

  async handleAssignTicket(command: AssignTicketCommand): Promise<void> {
    const startTime = performance.now();
    const commandType = 'AssignTicket';

    try {
      await this.rateLimiter.consume(command.userId, 1);

      this.validateAssignTicketCommand(command);

      const currentTicket = await this.readModel.findById(command.payload.ticketId);
      if (!currentTicket) {
        throw new Error(`Ticket not found: ${command.payload.ticketId}`);
      }

      if (currentTicket.assigneeId === command.payload.assigneeId) {
        return; // Already assigned to the same user
      }

      const event: TicketAssignedEvent = {
        aggregateId: command.payload.ticketId,
        eventType: 'TicketAssigned',
        eventVersion: currentTicket.version + 1,
        occurredAt: new Date(),
        metadata: {
          correlationId: command.correlationId,
          causationId: command.commandId,
          userId: command.userId
        },
        payload: {
          ticketId: command.payload.ticketId,
          assigneeId: command.payload.assigneeId,
          previousAssigneeId: