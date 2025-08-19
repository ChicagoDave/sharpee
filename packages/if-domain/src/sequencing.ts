/**
 * Domain types for event sequencing and turn management
 */

import { ISemanticEvent } from '@sharpee/core';

/**
 * Turn phases for event organization
 */
export type TurnPhase = 'pre' | 'main' | 'post' | 'reactions' | 'cleanup';

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
export interface SequencedEvent extends ISemanticEvent {
  sequence: EventSequence;
}

/**
 * Interface for event sequencing
 */
export interface EventSequencer {
  /**
   * Sequence events for a turn
   */
  sequence(events: ISemanticEvent[], turn: number, startOrder?: number): SequencedEvent[];
  
  /**
   * Get next order number
   */
  getNextOrder(turn: number): number;
  
  /**
   * Reset sequencing for a new turn
   */
  resetTurn(turn: number): void;
}
