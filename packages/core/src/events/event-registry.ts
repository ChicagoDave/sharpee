/**
 * Event Data Registry - Central type definitions for all semantic events
 *
 * This module defines the mapping between event type strings and their
 * corresponding data shapes. It serves as the single source of truth
 * for event data types across the Sharpee platform.
 *
 * @see ADR-082 for the design rationale
 *
 * ## Extensibility
 *
 * Packages can extend this registry using TypeScript declaration merging:
 *
 * ```typescript
 * declare module '@sharpee/core' {
 *   interface EventDataRegistry {
 *     'my.custom.event': MyCustomData;
 *   }
 * }
 * ```
 */

import { EntityId } from '../types/entity';

/**
 * Registry mapping event type strings to their data shapes.
 *
 * This interface is designed to be extended via declaration merging
 * by stdlib, stories, and other packages.
 */
export interface EventDataRegistry {
  // ============================================================
  // Query Events
  // ============================================================

  'query.pending': QueryPendingData;
  'query.invalid': QueryInvalidData;
  'query.response': QueryResponseData;

  // ============================================================
  // Message Events
  // ============================================================

  'message.success': MessageData;
  'message.failure': MessageData;
  'message.info': MessageData;
  'message.warning': MessageData;
  'message.debug': MessageData;

  // ============================================================
  // Game Lifecycle Events
  // ============================================================

  'game.initializing': EmptyData;
  'game.initialized': GameInitializedData;
  'game.starting': EmptyData;
  'game.started': GameStartedData;
  'game.ending': GameEndingData;
  'game.ended': GameEndedData;
  'game.won': GameEndedData;
  'game.lost': GameEndedData;
  'game.quit': EmptyData;
  'game.aborted': EmptyData;
  'game.pc_switched': PcSwitchedData;

  // ============================================================
  // Platform Events
  // ============================================================

  'platform.save_requested': SaveRequestedData;
  'platform.save_completed': SaveCompletedData;
  'platform.save_failed': SaveFailedData;
  'platform.restore_requested': RestoreRequestedData;
  'platform.restore_completed': RestoreCompletedData;
  'platform.restore_failed': RestoreFailedData;
  'platform.quit_requested': EmptyData;
  'platform.quit_confirmed': QuitConfirmedData;
  'platform.quit_cancelled': EmptyData;
  'platform.restart_requested': EmptyData;
  'platform.restart_completed': EmptyData;
  'platform.restart_cancelled': EmptyData;

  // ============================================================
  // Turn Events
  // ============================================================

  'turn.started': TurnData;
  'turn.ended': TurnData;

  // ============================================================
  // Quit Events (legacy, may overlap with platform)
  // ============================================================

  'quit.confirmed': QuitConfirmedData;
  'quit.cancelled': EmptyData;
}

// ============================================================
// Common Data Interfaces
// ============================================================

/**
 * Empty data for events that carry no payload.
 */
export interface EmptyData {}

/**
 * Standard message event data.
 */
export interface MessageData {
  messageId: string;
  params?: Record<string, unknown>;
}

// ============================================================
// Query Event Data
// ============================================================

export interface QueryPendingData {
  query: {
    id: string;
    messageId: string;
    messageParams?: Record<string, unknown>;
    options?: string[];
    validationType?: string;
  };
}

export interface QueryInvalidData {
  message?: string;
  hint?: string;
  queryId?: string;
}

export interface QueryResponseData {
  queryId: string;
  response: string | number | boolean;
}

// ============================================================
// Game Lifecycle Data
// ============================================================

export interface GameInitializedData {
  storyId?: string;
  storyTitle?: string;
  storyVersion?: string;
}

export interface GameStartedData {
  storyId?: string;
  storyTitle?: string;
  initialLocation?: EntityId;
}

export interface GameEndingData {
  reason?: string;
}

export interface GameEndedData {
  finalScore?: number;
  maxScore?: number;
  moves?: number;
  reason?: string;
  rank?: string;
}

export interface PcSwitchedData {
  previousPlayerId: string;
  newPlayerId: string;
}

// ============================================================
// Platform Event Data
// ============================================================

export interface SaveRequestedData {
  slotName?: string;
}

export interface SaveCompletedData {
  slotName?: string;
  timestamp?: number;
}

export interface SaveFailedData {
  slotName?: string;
  error?: string;
}

export interface RestoreRequestedData {
  slotName?: string;
}

export interface RestoreCompletedData {
  slotName?: string;
  timestamp?: number;
}

export interface RestoreFailedData {
  slotName?: string;
  error?: string;
}

export interface QuitConfirmedData {
  messageId?: string;
  finalScore?: number;
  maxScore?: number;
  moves?: number;
}

// ============================================================
// Turn Event Data
// ============================================================

export interface TurnData {
  turn: number;
}

// ============================================================
// Type Utilities
// ============================================================

/**
 * All known event type strings.
 */
export type EventType = keyof EventDataRegistry;

/**
 * Get the data type for a specific event type.
 */
export type EventDataFor<T extends EventType> = EventDataRegistry[T];
