/**
 * Effect types for ADR-075: Effects-Based Handler Pattern
 *
 * Effects are intents, not mutations. They describe what should happen, not how.
 * Handlers return effects, which are validated and applied by EffectProcessor.
 */

import { ISemanticEvent } from '@sharpee/core';

/**
 * Effect for adding/subtracting score
 */
export interface ScoreEffect {
  type: 'score';
  points: number;
  reason?: string;
}

/**
 * Effect for setting a world flag
 */
export interface FlagEffect {
  type: 'flag';
  name: string;
  value: boolean;
}

/**
 * Effect for emitting a message to the player
 */
export interface MessageEffect {
  type: 'message';
  id: string;
  data?: Record<string, unknown>;
}

/**
 * Effect for emitting another semantic event
 */
export interface EmitEffect {
  type: 'emit';
  event: ISemanticEvent;
}

/**
 * Effect for scheduling a daemon/fuse
 */
export interface ScheduleEffect {
  type: 'schedule';
  daemon: string;
  turns: number;
}

/**
 * Effect for unblocking an exit
 */
export interface UnblockEffect {
  type: 'unblock';
  exit: string;
  room: string;
}

/**
 * Effect for blocking an exit
 */
export interface BlockEffect {
  type: 'block';
  exit: string;
  room: string;
  reason?: string;
}

/**
 * Effect for moving an entity
 */
export interface MoveEntityEffect {
  type: 'move_entity';
  entityId: string;
  destination: string | null;
}

/**
 * Effect for updating an entity's state
 */
export interface UpdateEntityEffect {
  type: 'update_entity';
  entityId: string;
  updates: Record<string, unknown>;
}

/**
 * Effect for setting world state value
 */
export interface SetStateEffect {
  type: 'set_state';
  key: string;
  value: unknown;
}

/**
 * Effect for updating room exits
 */
export interface UpdateExitsEffect {
  type: 'update_exits';
  roomId: string;
  exits: Record<string, { destination: string } | null>;
}

/**
 * Union type of all effects
 */
export type Effect =
  | ScoreEffect
  | FlagEffect
  | MessageEffect
  | EmitEffect
  | ScheduleEffect
  | UnblockEffect
  | BlockEffect
  | MoveEntityEffect
  | UpdateEntityEffect
  | SetStateEffect
  | UpdateExitsEffect;

/**
 * Error from effect validation
 */
export interface EffectError {
  effect: Effect;
  reason: string;
}

/**
 * Result of processing effects
 */
export interface EffectResult {
  success: boolean;
  errors: EffectError[];
  applied: Effect[];
  /** Events emitted via EmitEffect (for adding to turn events) */
  emittedEvents?: ISemanticEvent[];
}
