/**
 * Engine-specific types and interfaces
 * 
 * The engine manages game state, turn execution, and event sequencing
 */

import { SemanticEvent } from '@sharpee/core';
import { ParsedCommand } from '@sharpee/world-model';
import { WorldChange } from '@sharpee/world-model';
import { IFEntity } from '@sharpee/world-model';

/**
 * Extended event with turn sequencing
 */
export interface SequencedEvent extends SemanticEvent {
  /**
   * Turn and sequence information
   */
  sequence: {
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
  };
}

/**
 * Result of executing a turn
 */
export interface TurnResult {
  /**
   * Turn number
   */
  turn: number;
  
  /**
   * Command that was executed
   */
  command: ParsedCommand;
  
  /**
   * All events generated this turn (in sequence)
   */
  events: SequencedEvent[];
  
  /**
   * World changes that occurred
   */
  worldChanges: WorldChange[];
  
  /**
   * Whether the turn succeeded
   */
  success: boolean;
  
  /**
   * Error if turn failed
   */
  error?: Error;
  
  /**
   * Timing information
   */
  timing?: {
    start: number;
    end: number;
    duration: number;
  };
}

/**
 * Game context for execution
 */
export interface GameContext {
  /**
   * Current turn number
   */
  currentTurn: number;
  
  /**
   * Player entity
   */
  player: IFEntity;
  
  /**
   * Turn history
   */
  history: TurnResult[];
  
  /**
   * Game metadata
   */
  metadata: {
    title?: string;
    author?: string;
    version?: string;
    started: Date;
    lastPlayed: Date;
  };
  
  /**
   * Custom game state
   */
  customState?: Record<string, unknown>;
}

/**
 * Engine configuration
 */
export interface EngineConfig {
  /**
   * Maximum turns to keep in history
   */
  maxHistory?: number;
  
  /**
   * Whether to validate events before processing
   */
  validateEvents?: boolean;
  
  /**
   * Whether to emit timing information
   */
  collectTiming?: boolean;
  
  /**
   * Custom error handler
   */
  onError?: (error: Error, context: GameContext) => void;
  
  /**
   * Event interceptor for debugging
   */
  onEvent?: (event: SequencedEvent) => void;
  
  /**
   * Debug mode - shows more detailed output
   */
  debug?: boolean;
}

/**
 * Game state that can be saved/loaded
 */
export interface GameState {
  /**
   * Engine version
   */
  version: string;
  
  /**
   * Current turn
   */
  turn: number;
  
  /**
   * World model state
   */
  world: unknown; // Serialized world state
  
  /**
   * Game context
   */
  context: GameContext;
  
  /**
   * Timestamp
   */
  saved: Date;
}

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
 * Event sequencer interface
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
