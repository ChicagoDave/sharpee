/**
 * Game lifecycle events for tracking game state transitions
 * These events mark important milestones in a game session
 */

import { ISemanticEvent } from './types';

// =============================================================================
// Typed Data Interfaces for Game Events (ADR-097 / IGameEvent Refactor)
// =============================================================================

/** Story metadata included in game events */
export interface GameEventStoryData {
  id?: string;
  title?: string;
  author?: string;
  version?: string;
}

/** Session tracking data */
export interface GameEventSessionData {
  startTime?: number;
  endTime?: number;
  turns?: number;
  score?: number;
  moves?: number;
}

/** Ending/conclusion data for game end events */
export interface GameEventEndingData {
  type?: 'victory' | 'defeat' | 'quit' | 'abort';
  reason?: string;
  achieved?: string[];
  score?: number;
  maxScore?: number;
  ranking?: string;
}

/** Error data for failure events */
export interface GameEventErrorData {
  code?: string;
  message?: string;
  stack?: string;
}

/** Game state values */
export type GameState = 'initializing' | 'ready' | 'running' | 'ending' | 'ended';

// Per-event typed data interfaces
// Named GameLifecycle* to avoid conflicts with event-registry.ts exports

export interface GameLifecycleInitializingData {
  gameState: 'initializing';
  [key: string]: unknown;
}

export interface GameLifecycleInitializedData {
  gameState: 'ready';
  [key: string]: unknown;
}

export interface GameLifecycleStoryLoadingData {
  story?: { id?: string };
  [key: string]: unknown;
}

export interface GameLifecycleStoryLoadedData {
  story: GameEventStoryData;
  gameState: 'ready';
  [key: string]: unknown;
}

export interface GameLifecycleStartingData {
  story?: GameEventStoryData;
  gameState: 'ready';
  [key: string]: unknown;
}

export interface GameLifecycleStartedData {
  story?: GameEventStoryData;
  gameState: 'running';
  session: {
    startTime: number;
    turns: number;
    moves: number;
  };
  [key: string]: unknown;
}

export interface GameLifecycleEndingData {
  gameState: 'ending';
  session?: GameEventSessionData;
  ending?: { reason?: string };
  [key: string]: unknown;
}

export interface GameLifecycleEndedData {
  gameState: 'ended';
  session?: GameEventSessionData & { endTime: number };
  ending: GameEventEndingData & { type: 'victory' | 'defeat' | 'quit' | 'abort' };
  [key: string]: unknown;
}

export interface GameLifecycleWonData {
  gameState: 'ended';
  session?: GameEventSessionData & { endTime: number };
  ending: GameEventEndingData & { type: 'victory' };
  [key: string]: unknown;
}

export interface GameLifecycleLostData {
  gameState: 'ended';
  session?: GameEventSessionData & { endTime: number };
  ending: { type: 'defeat'; reason: string };
  [key: string]: unknown;
}

export interface GameLifecycleQuitData {
  gameState: 'ended';
  session?: GameEventSessionData & { endTime: number };
  ending: { type: 'quit'; reason: string };
  [key: string]: unknown;
}

export interface GameLifecycleAbortedData {
  gameState: 'ended';
  session?: GameEventSessionData & { endTime: number };
  ending: { type: 'abort'; reason: string };
  error: { message: string };
  [key: string]: unknown;
}

export interface GameLifecycleSessionSavingData {
  saveId?: string;
  [key: string]: unknown;
}

export interface GameLifecycleSessionSavedData {
  saveId?: string;
  timestamp: number;
  [key: string]: unknown;
}

export interface GameLifecycleSessionRestoringData {
  saveId?: string;
  [key: string]: unknown;
}

export interface GameLifecycleSessionRestoredData {
  saveId?: string;
  timestamp: number;
  [key: string]: unknown;
}

export interface GameLifecycleInitFailedData {
  error: GameEventErrorData;
  [key: string]: unknown;
}

export interface GameLifecycleStoryLoadFailedData {
  story?: { id?: string };
  error: GameEventErrorData;
  [key: string]: unknown;
}

export interface GameLifecycleFatalErrorData {
  error: GameEventErrorData;
  [key: string]: unknown;
}

// =============================================================================
// Game Event Type Constants
// =============================================================================

/**
 * Game event types for lifecycle transitions
 */
export const GameEventType = {
  // Game start events
  GAME_INITIALIZING: 'game.initializing',        // Engine is setting up
  GAME_INITIALIZED: 'game.initialized',          // Engine ready, before story
  STORY_LOADING: 'game.story_loading',           // Story is being loaded
  STORY_LOADED: 'game.story_loaded',             // Story loaded successfully
  GAME_STARTING: 'game.starting',                // Game is about to start
  GAME_STARTED: 'game.started',                  // Game has started, ready for input
  
  // Game end events  
  GAME_ENDING: 'game.ending',                    // Game is about to end
  GAME_ENDED: 'game.ended',                      // Game has ended normally
  GAME_WON: 'game.won',                          // Player achieved victory
  GAME_LOST: 'game.lost',                        // Player was defeated
  GAME_QUIT: 'game.quit',                        // Player quit the game
  GAME_ABORTED: 'game.aborted',                  // Game ended abnormally
  
  // Session events
  SESSION_SAVING: 'game.session_saving',         // Save in progress
  SESSION_SAVED: 'game.session_saved',           // Save completed
  SESSION_RESTORING: 'game.session_restoring',   // Restore in progress  
  SESSION_RESTORED: 'game.session_restored',     // Restore completed
  
  // Error events
  INITIALIZATION_FAILED: 'game.initialization_failed',
  STORY_LOAD_FAILED: 'game.story_load_failed',
  FATAL_ERROR: 'game.fatal_error'
} as const;

export type GameEventTypeValue = typeof GameEventType[keyof typeof GameEventType];

/**
 * @deprecated Use ISemanticEvent with typed data interfaces instead.
 * Game events now use event.data, not a separate payload field.
 * See GameStartedData, GameEndedData, etc. for typed data access.
 * Will be removed in v1.0.0
 */
export interface IGameEvent extends ISemanticEvent {
  type: GameEventTypeValue;

  /**
   * @deprecated Use event.data instead. This field exists for backwards compatibility.
   */
  payload: {
    gameState?: GameState;
    story?: GameEventStoryData;
    session?: GameEventSessionData;
    ending?: GameEventEndingData;
    error?: GameEventErrorData;
    metadata?: Record<string, unknown>;
  };
}

/**
 * Check if an event is a game lifecycle event (any GameEventType).
 * Use specific type guards (isGameStartedEvent, etc.) for typed data access.
 */
export function isGameEvent(event: ISemanticEvent): boolean {
  return Object.values(GameEventType).includes(event.type as GameEventTypeValue);
}

/**
 * Check if an event is part of the game start sequence.
 */
export function isGameStartSequenceEvent(event: ISemanticEvent): boolean {
  return (
    event.type === GameEventType.GAME_INITIALIZING ||
    event.type === GameEventType.GAME_INITIALIZED ||
    event.type === GameEventType.STORY_LOADING ||
    event.type === GameEventType.STORY_LOADED ||
    event.type === GameEventType.GAME_STARTING ||
    event.type === GameEventType.GAME_STARTED
  );
}

/**
 * Check if an event is part of the game end sequence.
 */
export function isGameEndSequenceEvent(event: ISemanticEvent): boolean {
  return (
    event.type === GameEventType.GAME_ENDING ||
    event.type === GameEventType.GAME_ENDED ||
    event.type === GameEventType.GAME_WON ||
    event.type === GameEventType.GAME_LOST ||
    event.type === GameEventType.GAME_QUIT ||
    event.type === GameEventType.GAME_ABORTED
  );
}

/**
 * @deprecated Use isGameStartSequenceEvent instead
 */
export const isGameStartEvent = isGameStartSequenceEvent;

/**
 * @deprecated Use isGameEndSequenceEvent instead
 */
export const isGameEndEvent = isGameEndSequenceEvent;

// =============================================================================
// Helper Functions to Create Game Events
// =============================================================================

/**
 * Generate a unique event ID
 */
function generateEventId(): string {
  return `game-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create a generic game event with typed data.
 * Use specific creators (createGameStartedEvent, etc.) when possible for type safety.
 */
export function createGameEvent<T extends Record<string, unknown>>(
  type: GameEventTypeValue,
  data?: T
): ISemanticEvent {
  return {
    id: generateEventId(),
    type,
    timestamp: Date.now(),
    entities: {},
    data: data || {}
  };
}

// Specific event creators - all return ISemanticEvent with typed data

export function createGameInitializingEvent(): ISemanticEvent {
  return createGameEvent<GameLifecycleInitializingData>(GameEventType.GAME_INITIALIZING, {
    gameState: 'initializing'
  });
}

export function createGameInitializedEvent(): ISemanticEvent {
  return createGameEvent<GameLifecycleInitializedData>(GameEventType.GAME_INITIALIZED, {
    gameState: 'ready'
  });
}

export function createStoryLoadingEvent(storyId?: string): ISemanticEvent {
  return createGameEvent<GameLifecycleStoryLoadingData>(GameEventType.STORY_LOADING, {
    story: { id: storyId }
  });
}

export function createStoryLoadedEvent(story: GameEventStoryData): ISemanticEvent {
  return createGameEvent<GameLifecycleStoryLoadedData>(GameEventType.STORY_LOADED, {
    story,
    gameState: 'ready'
  });
}

export function createGameStartingEvent(story?: GameEventStoryData): ISemanticEvent {
  return createGameEvent<GameLifecycleStartingData>(GameEventType.GAME_STARTING, {
    story,
    gameState: 'ready'
  });
}

export function createGameStartedEvent(
  story?: GameEventStoryData,
  startTime?: number
): ISemanticEvent {
  return createGameEvent<GameLifecycleStartedData>(GameEventType.GAME_STARTED, {
    story,
    gameState: 'running',
    session: {
      startTime: startTime || Date.now(),
      turns: 0,
      moves: 0
    }
  });
}

export function createGameEndingEvent(
  reason?: string,
  session?: GameEventSessionData
): ISemanticEvent {
  return createGameEvent<GameLifecycleEndingData>(GameEventType.GAME_ENDING, {
    gameState: 'ending',
    session,
    ending: { reason }
  });
}

export function createGameEndedEvent(
  endingType: 'victory' | 'defeat' | 'quit' | 'abort',
  session?: GameEventSessionData,
  ending?: Partial<GameEventEndingData>
): ISemanticEvent {
  return createGameEvent<GameLifecycleEndedData>(GameEventType.GAME_ENDED, {
    gameState: 'ended',
    session: {
      ...session,
      endTime: Date.now()
    },
    ending: {
      ...ending,
      type: endingType
    }
  });
}

export function createGameWonEvent(
  session?: GameEventSessionData,
  ending?: Partial<GameEventEndingData>
): ISemanticEvent {
  return createGameEvent<GameLifecycleWonData>(GameEventType.GAME_WON, {
    gameState: 'ended',
    session: {
      ...session,
      endTime: Date.now()
    },
    ending: {
      ...ending,
      type: 'victory'
    }
  });
}

export function createGameLostEvent(
  reason: string,
  session?: GameEventSessionData
): ISemanticEvent {
  return createGameEvent<GameLifecycleLostData>(GameEventType.GAME_LOST, {
    gameState: 'ended',
    session: {
      ...session,
      endTime: Date.now()
    },
    ending: {
      type: 'defeat',
      reason
    }
  });
}

export function createGameQuitEvent(
  session?: GameEventSessionData
): ISemanticEvent {
  return createGameEvent<GameLifecycleQuitData>(GameEventType.GAME_QUIT, {
    gameState: 'ended',
    session: {
      ...session,
      endTime: Date.now()
    },
    ending: {
      type: 'quit',
      reason: 'Player quit'
    }
  });
}

export function createGameAbortedEvent(
  error: string,
  session?: GameEventSessionData
): ISemanticEvent {
  return createGameEvent<GameLifecycleAbortedData>(GameEventType.GAME_ABORTED, {
    gameState: 'ended',
    session: {
      ...session,
      endTime: Date.now()
    },
    ending: {
      type: 'abort',
      reason: error
    },
    error: {
      message: error
    }
  });
}

// =============================================================================
// Type Guards for Game Events
// =============================================================================

/** Type guard to check if an event has specific data type */
export function isGameStartedEvent(event: ISemanticEvent): event is ISemanticEvent & { data: GameLifecycleStartedData } {
  return event.type === GameEventType.GAME_STARTED;
}

export function isGameEndedEvent(event: ISemanticEvent): event is ISemanticEvent & { data: GameLifecycleEndedData } {
  return event.type === GameEventType.GAME_ENDED;
}

export function isGameWonEvent(event: ISemanticEvent): event is ISemanticEvent & { data: GameLifecycleWonData } {
  return event.type === GameEventType.GAME_WON;
}

export function isGameLostEvent(event: ISemanticEvent): event is ISemanticEvent & { data: GameLifecycleLostData } {
  return event.type === GameEventType.GAME_LOST;
}

export function isGameQuitEvent(event: ISemanticEvent): event is ISemanticEvent & { data: GameLifecycleQuitData } {
  return event.type === GameEventType.GAME_QUIT;
}

export function isGameAbortedEvent(event: ISemanticEvent): event is ISemanticEvent & { data: GameLifecycleAbortedData } {
  return event.type === GameEventType.GAME_ABORTED;
}