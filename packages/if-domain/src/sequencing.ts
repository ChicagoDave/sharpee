/**
 * Domain types for event sequencing and turn management
 */

import { SemanticEvent } from '@sharpee/core';

/**
 * Turn phases for event organization
 */
export enum TurnPhase {
  /**
   * Pre-turn setup (before action)
   */
  PRE = 'pre',
  
  /**
   * Main action execution
   */
  MAIN = 'main',
  
  /**
   * Post-action consequences
   */
  POST = 'post',
  
  /**
   * Cleanup and maintenance
   */
  CLEANUP = 'cleanup'
}

/**
 * Sequence information for an event
 */
export interface EventSequence {
  /**
   * Turn number (increments each command)
   */
  turn: number;
  
  /**
   * Order within the turn (1, 2, 3...)
   */
  order: number;
  
  /**
   * Sub-order for nested events (1.1, 1.2, etc.)
   */
  subOrder?: number;
  
  /**
   * Phase of turn execution
   */
  phase?: TurnPhase;
}

/**
 * Event with sequencing information
 */
export interface SequencedEvent extends SemanticEvent {
  sequence: EventSequence;
}

/**
 * Interface for event sequencing
 */
export interface EventSequencer {
  /**
   * Sequence events for a turn
   */
  sequence(events: SemanticEvent[], turn: number, startOrder?: number): SequencedEvent[];
  
  /**
   * Get next order number
   */
  getNextOrder(turn: number): number;
  
  /**
   * Reset sequencing for a new turn
   */
  resetTurn(turn: number): void;
}
