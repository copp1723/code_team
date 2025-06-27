/**
 * @fileoverview Event definitions and handlers for TICKET-003 implementation
 * @module events/ticket-003
 * @implements {CQRS} Command Query Responsibility Segregation pattern
 * @implements {EventSourcing} Event sourcing for audit trail and state reconstruction
 */

import { EventEmitter } from 'events';
import { randomUUID } from 'crypto';
import { performance } from 'perf_hooks';

/**
 * Base event interface for all TICKET-003 events
 * @interface
 */
export interface ITicket003Event {
  readonly id: string;
  readonly aggregateId: string;
  readonly version: number;
  readonly timestamp: Date;
  readonly correlationId: string;
  readonly causationId?: string;
  readonly metadata: EventMetadata;
  readonly type: string;
  readonly payload: unknown;
}

/**
 * Event metadata for tracking and auditing
 * @interface
 */
export interface EventMetadata {
  readonly userId: string;
  readonly tenantId?: string;
  readonly source: string;
  readonly ipAddress?: string;
  readonly userAgent?: string;
  readonly traceId: string;
  readonly spanId: string;
}

/**
 * Event store interface for persistence
 * @interface
 */
export interface IEventStore {
  append(events: ITicket003Event[]): Promise<void>;
  getEvents(aggregateId: string, fromVersion?: number): Promise<ITicket003Event[]>;
  getSnapshot(aggregateId: string): Promise<AggregateSnapshot | null>;
  saveSnapshot(snapshot: AggregateSnapshot): Promise<void>;
}

/**
 * Aggregate snapshot for performance optimization
 * @interface
 */
export interface AggregateSnapshot {
  readonly aggregateId: string;
  readonly version: number;
  readonly state: unknown;
  readonly timestamp: Date;
}

/**
 * Base event class implementing common event functionality
 * @abstract
 */
export abstract class BaseTicket003Event implements ITicket003Event {
  public readonly id: string;
  public readonly timestamp: Date;
  public readonly correlationId: string;
  public readonly causationId?: string;

  constructor(
    public readonly aggregateId: string,
    public readonly version: number,
    public readonly metadata: EventMetadata,
    public readonly type: string,
    public readonly payload: unknown,
    causationId?: string
  ) {
    this.id = randomUUID();
    this.timestamp = new Date();
    this.correlationId = metadata.traceId;
    this.causationId = causationId;
    
    // Freeze the event to ensure immutability
    Object.freeze(this);
    Object.freeze(this.metadata);
    Object.freeze(this.payload);
  }
}

/**
 * Ticket created event
 * @class
 */
export class TicketCreatedEvent extends BaseTicket003Event {
  constructor(
    aggregateId: string,
    version: number,
    metadata: EventMetadata,
    payload: {
      title: string;
      description: string;
      priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
      assigneeId?: string;
      tags: string[];
      customFields?: Record<string, unknown>;
    },
    causationId?: string
  ) {
    super(aggregateId, version, metadata, 'TicketCreated', payload, causationId);
  }
}

/**
 * Ticket updated event
 * @class
 */
export class TicketUpdatedEvent extends BaseTicket003Event {
  constructor(
    aggregateId: string,
    version: number,
    metadata: EventMetadata,
    payload: {
      changes: Record<string, { oldValue: unknown; newValue: unknown }>;
      reason?: string;
    },
    causationId?: string
  ) {
    super(aggregateId, version, metadata, 'TicketUpdated', payload, causationId);
  }
}

/**
 * Ticket assigned event
 * @class
 */
export class TicketAssignedEvent extends BaseTicket003Event {
  constructor(
    aggregateId: string,
    version: number,
    metadata: EventMetadata,
    payload: {
      assigneeId: string;
      previousAssigneeId?: string;
      assignmentReason?: string;
    },
    causationId?: string
  ) {
    super(aggregateId, version, metadata, 'TicketAssigned', payload, causationId);
  }
}

/**
 * Ticket status changed event
 * @class
 */
export class TicketStatusChangedEvent extends BaseTicket003Event {
  constructor(
    aggregateId: string,
    version: number,
    metadata: EventMetadata,
    payload: {
      oldStatus: string;
      newStatus: string;
      transitionReason?: string;
      automatedTransition: boolean;
    },
    causationId?: string
  ) {
    super(aggregateId, version, metadata, 'TicketStatusChanged', payload, causationId);
  }
}

/**
 * Ticket comment added event
 * @class
 */
export class TicketCommentAddedEvent extends BaseTicket003Event {
  constructor(
    aggregateId: string,
    version: number,
    metadata: EventMetadata,
    payload: {
      commentId: string;
      content: string;
      attachments?: string[];
      isInternal: boolean;
      mentions?: string[];
    },
    causationId?: string
  ) {
    super(aggregateId, version, metadata, 'TicketCommentAdded', payload, causationId);
  }
}

/**
 * Event bus for publishing and subscribing to events
 * @class
 */
export class Ticket003EventBus extends EventEmitter {
  private static instance: Ticket003EventBus;
  private readonly subscribers: Map<string, Set<EventHandler>>;
  private readonly middleware: EventMiddleware[];
  private readonly metrics: EventMetrics;

  private constructor() {
    super();
    this.subscribers = new Map();
    this.middleware = [];
    this.metrics = new EventMetrics();
    
    // Set max listeners to prevent memory leaks
    this.setMaxListeners(100);
  }

  /**
   * Get singleton instance
   * @returns {Ticket003EventBus} Event bus instance
   */
  public static getInstance(): Ticket003EventBus {
    if (!Ticket003EventBus.instance) {
      Ticket003EventBus.instance = new Ticket003EventBus();
    }
    return Ticket003EventBus.instance;
  }

  /**
   * Subscribe to events
   * @param {string} eventType - Event type to subscribe to
   * @param {EventHandler} handler - Event handler function
   */
  public subscribe(eventType: string, handler: EventHandler): void {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, new Set());
    }
    
    this.subscribers.get(eventType)!.add(handler);
    this.on(eventType, handler);
  }

  /**
   * Unsubscribe from events
   * @param {string} eventType - Event type to unsubscribe from
   * @param {EventHandler} handler - Event handler function
   */
  public unsubscribe(eventType: string, handler: EventHandler): void {
    const handlers = this.subscribers.get(eventType);
    if (handlers) {
      handlers.delete(handler);
      this.removeListener(eventType, handler);
    }
  }

  /**
   * Publish event with middleware processing
   * @param {ITicket003Event} event - Event to publish
   * @returns {Promise<void>}
   */
  public async publish(event: ITicket003Event): Promise<void> {
    const startTime = performance.now();
    
    try {
      // Apply middleware
      let processedEvent = event;
      for (const mw of this.middleware) {
        processedEvent = await mw.process(processedEvent);
      }
      
      // Emit event
      this.emit(processedEvent.type, processedEvent);
      
      // Update metrics
      this.metrics.recordEvent(processedEvent.type, performance.now() - startTime);
      
    } catch (error) {
      this.metrics.recordError(event.type);
      throw new EventPublishError(`Failed to publish event: ${event.type}`, error);
    }
  }

  /**
   * Add middleware for event processing
   * @param {EventMiddleware} middleware - Middleware to add
   */
  public use(middleware: EventMiddleware): void {
    this.middleware.push(middleware);
  }

  /**
   * Get event metrics
   * @returns {EventMetricsData} Current metrics
   */
  public getMetrics(): EventMetricsData {
    return this.metrics.getMetrics();
  }
}

/**
 * Event handler type
 * @typedef
 */
export type EventHandler = (event: ITicket003Event) => void | Promise<void>;

/**
 * Event middleware interface
 * @interface
 */
export interface EventMiddleware {
  process(event: ITicket003Event): Promise<ITicket003Event>;
}

/**
 * Event validation middleware
 * @class
 */
export class EventValidationMiddleware implements EventMiddleware {
  private readonly validators: Map<string, EventValidator>;

  constructor() {
    this.validators = new Map();
    this.registerDefaultValidators();
  }

  /**
   * Process event through validation
   * @param {ITicket003Event} event - Event to validate
   * @returns {Promise<ITicket003Event>} Validated event
   */
  public async process(event: ITicket003Event): Promise<ITicket003Event> {
    const validator = this.validators.get(event.type);
    
    if (validator) {
      const validationResult = await validator.validate(event);
      if (!validationResult.isValid) {
        throw new EventValidationError(
          `Event validation failed: ${validationResult.errors.join(', ')}`,
          validationResult.errors
        );
      }
    }
    
    return event;
  }

  /**
   * Register event validator
   * @param {string} eventType - Event type
   * @param {EventValidator} validator - Validator instance
   */
  public registerValidator(eventType: string, validator: EventValidator): void {
    this.validators.set(eventType, validator);
  }

  /**
   * Register default validators
   * @private
   */
  private registerDefaultValidators(): void {
    // Add default validators for common event types
    this.registerValidator('TicketCreated', new TicketCreatedValidator());
    this.registerValidator('TicketUpdated', new TicketUpdatedValidator());
    this.registerValidator('TicketAssigned', new TicketAssignedValidator());
    this.registerValidator('TicketStatusChanged', new TicketStatusChangedValidator());
  }
}

/**
 * Event validator interface
 * @interface
 */
export interface EventValidator {
  validate(event: ITicket003Event): Promise<ValidationResult>;
}

/**
 * Validation result interface
 * @interface
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Base validator class
 * @abstract
 */
abstract class BaseEventValidator implements EventValidator {
  public async validate(event: ITicket003Event): Promise<ValidationResult> {
    const errors: string[] = [];
    
    // Common validations
    if (!event.id || !this.isValidUUID(event.id)) {
      errors.push('Invalid event ID');
    }
    
    if (!event.aggregateId || !this.isValidUUID(event.aggregateId)) {
      errors.push('Invalid aggregate ID');
    }
    
    if (event.version < 0) {
      errors.push('Invalid version number');
    }
    
    if (!event.metadata?.userId) {
      errors.push('Missing user ID in metadata');
    }
    
    // Type-specific validations
    const specificErrors = await this.validateSpecific(event);
    errors.push(...specificErrors);
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Type-specific validation
   * @abstract
   * @param {ITicket003Event} event - Event to validate
   * @returns {Promise<string[]>} Validation errors
   */
  protected abstract validateSpecific(event: ITicket003Event): Promise<string[]>;

  /**
   * Validate UUID format
   * @param {string} uuid - UUID to validate
   * @returns {boolean} Is valid UUID
   */
  protected isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }
}

/**
 * Ticket created event validator
 * @class
 */
class TicketCreatedValidator extends BaseEventValidator {
  protected async validateSpecific(event: ITicket003Event): Promise<string[]> {
    const errors: string[] = [];
    const payload = event.payload as any;
    
    if (!payload.title || payload.title.trim().length === 0) {
      errors.push('Title is required');
    }
    
    if (payload.title && payload.title.length > 255) {
      errors.push('Title exceeds maximum length');
    }
    
    if (!payload.priority || !['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(payload.priority)) {
      errors.push('Invalid priority');
    }
    
    if (!Array.isArray(payload.tags)) {
      errors.push('Tags must be an array');
    }
    
    return errors;
  }
}

/**
 * Ticket updated event validator
 * @class
 */
class TicketUpdatedValidator extends BaseEventValidator {
  protected async validateSpecific(event: ITicket003Event): Promise<string[]> {
    const errors: string[] = [];
    const payload = event.payload as any;
    
    if (!payload.changes || typeof payload.changes !== 'object') {
      errors.push('Changes object is required');
    }
    
    if (Object.keys(payload.changes).length === 0) {
      errors.push('At least one change is required');
    }
    
    return errors;
  }
}

/**
 * Ticket assigned event validator
 * @class
 */
class TicketAssignedValidator extends BaseEventValidator {
  protected async validateSpecific(event: ITicket003Event): Promise<string[]> {
    const errors: string[] = [];
    const payload = event.payload as any;
    
    if (!payload.assigneeId) {
      errors.push('Assignee ID is required');
    }
    
    return errors;
  }
}

/**
 * Ticket status changed event validator
 * @class
 */
class TicketStatusChangedValidator extends BaseEventValidator {
  protected async validateSpecific(event: ITicket003Event): Promise<string[]> {
    const errors: string[] = [];
    const payload = event.payload as any;
    
    if (!payload.oldStatus) {
      errors.push('Old status is required');
    }
    
    if (!payload.newStatus) {
      errors.push('New status is required');
    }
    
    if (payload.oldStatus === payload.newStatus) {
      errors.push('Old and new status cannot be the same');
    }
    
    if (typeof payload.automatedTransition !== 'boolean') {