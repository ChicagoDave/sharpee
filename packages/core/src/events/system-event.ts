/**
 * System events are used for debugging, monitoring, and system-level notifications.
 * These are separate from SemanticEvents which represent story-meaningful occurrences.
 */

/**
 * System event for debugging and monitoring
 */
export interface ISystemEvent {
  /**
   * Unique identifier for this event instance
   */
  id: string;

  /**
   * Timestamp when the event occurred
   */
  timestamp: number;

  /**
   * Which subsystem emitted this event
   */
  subsystem: string;

  /**
   * Type of system event (e.g., 'parse_attempt', 'validation_error', 'entity_resolved')
   */
  type: string;

  /**
   * Event-specific data
   */
  data: unknown;

  /**
   * Optional severity level
   */
  severity?: 'debug' | 'info' | 'warning' | 'error';

  /**
   * Optional correlation ID to track related events
   */
  correlationId?: string;
}

/**
 * Common subsystem identifiers
 */
export const Subsystems = {
  PARSER: 'parser',
  VALIDATOR: 'validator',
  EXECUTOR: 'executor',
  WORLD_MODEL: 'world-model',
  TEXT_SERVICE: 'text-service',
  EVENT_PROCESSOR: 'event-processor',
  RULE_ENGINE: 'rule-engine',
} as const;

export type SubsystemType = typeof Subsystems[keyof typeof Subsystems];

/**
 * Helper to create a system event with common fields
 */
export function createSystemEvent(
  subsystem: string,
  type: string,
  data: unknown,
  options?: {
    severity?: ISystemEvent['severity'];
    correlationId?: string;
  }
): ISystemEvent {
  return {
    id: generateEventId(),
    timestamp: Date.now(),
    subsystem,
    type,
    data,
    ...options
  };
}

/**
 * Simple ID generator for events
 * In production, might use UUID or similar
 */
let eventCounter = 0;
function generateEventId(): string {
  return `sys_${Date.now()}_${++eventCounter}`;
}

/**
 * Type guard to check if an object is a SystemEvent
 */
export function isSystemEvent(obj: unknown): obj is ISystemEvent {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'timestamp' in obj &&
    'subsystem' in obj &&
    'type' in obj &&
    'data' in obj
  );
}
