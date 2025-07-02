/**
 * Debug event types for diagnostic information.
 * These are separate from semantic events and used for development/debugging.
 */

/**
 * Debug event emitted by various subsystems for diagnostic purposes.
 * These events are NOT part of the game's semantic event system.
 */
export interface DebugEvent {
  /** Unique identifier for this debug event */
  id: string;
  
  /** When the event was emitted */
  timestamp: number;
  
  /** Which subsystem emitted this event */
  subsystem: 'parser' | 'validator' | 'executor' | 'world-model' | 'text-service';
  
  /** Type of debug event within the subsystem */
  type: string;
  
  /** Event-specific data */
  data: any;
}

/**
 * Callback function for receiving debug events
 */
export type DebugEventCallback = (event: DebugEvent) => void;

/**
 * Context for debug event emission, passed to subsystems
 */
export interface DebugContext {
  /** Optional callback to emit debug events */
  emit?: DebugEventCallback;
  
  /** Whether debug events are enabled */
  enabled: boolean;
}

/**
 * Common debug event types by subsystem
 */
export const DebugEventTypes = {
  parser: {
    TOKEN_ANALYSIS: 'token_analysis',
    PATTERN_MATCH: 'pattern_match',
    CANDIDATE_SCORING: 'candidate_scoring',
  },
  validator: {
    ENTITY_RESOLUTION: 'entity_resolution',
    SCOPE_CHECK: 'scope_check',
    AMBIGUITY_RESOLUTION: 'ambiguity_resolution',
    VALIDATION_ERROR: 'validation_error',
  },
  executor: {
    ACTION_START: 'action_start',
    ACTION_COMPLETE: 'action_complete',
    ACTION_ERROR: 'action_error',
  },
  worldModel: {
    ENTITY_CHANGE: 'entity_change',
    RELATION_CHANGE: 'relation_change',
    PROPERTY_CHANGE: 'property_change',
  },
  textService: {
    TEMPLATE_SELECTION: 'template_selection',
    TEXT_GENERATION: 'text_generation',
    CHANNEL_ROUTING: 'channel_routing',
  },
} as const;
