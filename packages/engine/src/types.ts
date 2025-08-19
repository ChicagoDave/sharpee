/**
 * Engine-specific types and interfaces
 * 
 * The engine manages game state, turn execution, and event sequencing
 */

import { ISemanticEvent } from '@sharpee/core';
import { IParsedCommand, IFEntity } from '@sharpee/world-model';

/**
 * Basic game event (before sequencing)
 */
export interface GameEvent {
  type: string;
  data: any;
  metadata?: Record<string, any>;
}

/**
 * Sequenced event with turn and ordering information
 */
export interface SequencedEvent extends GameEvent {
  sequence: number;
  timestamp: Date;
  turn: number;
  scope: 'turn' | 'global' | 'system';
  source?: string;
}

/**
 * Timing data for performance tracking
 */
export interface TimingData {
  parsing?: number;
  execution?: number;
  processing?: number;
  total: number;
  custom?: Record<string, number>;
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
   * Raw input string
   */
  input: string;
  
  /**
   * All events generated this turn (in sequence)
   */
  events: SequencedEvent[];
  
  /**
   * Whether the turn succeeded
   */
  success: boolean;
  
  /**
   * Error message if turn failed
   */
  error?: string;
  
  /**
   * Timing information
   */
  timing?: TimingData;
  
  /**
   * The action ID that was executed (if any)
   */
  actionId?: string;
  
  /**
   * The parsed command (if successfully parsed)
   */
  parsedCommand?: any;
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


