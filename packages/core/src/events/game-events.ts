/**
 * Game lifecycle events for tracking game state transitions
 * These events mark important milestones in a game session
 */

import { SemanticEvent } from './types';

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
 * Game event with lifecycle-specific data
 */
export interface GameEvent extends SemanticEvent {
  type: GameEventTypeValue;
  
  /**
   * Game-specific event data
   */
  payload: {
    /**
     * Current game state when event occurred
     */
    gameState?: 'initializing' | 'ready' | 'running' | 'ending' | 'ended';
    
    /**
     * Story information
     */
    story?: {
      id?: string;
      title?: string;
      author?: string;
      version?: string;
    };
    
    /**
     * Session information
     */
    session?: {
      startTime?: number;
      endTime?: number;
      turns?: number;
      score?: number;
      moves?: number;
    };
    
    /**
     * Victory/defeat conditions
     */
    ending?: {
      type?: 'victory' | 'defeat' | 'quit' | 'abort';
      reason?: string;
      achieved?: string[];  // List of achievements
      score?: number;
      maxScore?: number;
      ranking?: string;
    };
    
    /**
     * Error information for failure events
     */
    error?: {
      code?: string;
      message?: string;
      stack?: string;
    };
    
    /**
     * Additional context
     */
    metadata?: Record<string, unknown>;
  };
}

/**
 * Type guards for game events
 */
export function isGameEvent(event: SemanticEvent): event is GameEvent {
  return Object.values(GameEventType).includes(event.type as GameEventTypeValue);
}

export function isGameStartEvent(event: SemanticEvent): boolean {
  return isGameEvent(event) && (
    event.type === GameEventType.GAME_INITIALIZING ||
    event.type === GameEventType.GAME_INITIALIZED ||
    event.type === GameEventType.STORY_LOADING ||
    event.type === GameEventType.STORY_LOADED ||
    event.type === GameEventType.GAME_STARTING ||
    event.type === GameEventType.GAME_STARTED
  );
}

export function isGameEndEvent(event: SemanticEvent): boolean {
  return isGameEvent(event) && (
    event.type === GameEventType.GAME_ENDING ||
    event.type === GameEventType.GAME_ENDED ||
    event.type === GameEventType.GAME_WON ||
    event.type === GameEventType.GAME_LOST ||
    event.type === GameEventType.GAME_QUIT ||
    event.type === GameEventType.GAME_ABORTED
  );
}

/**
 * Helper functions to create game events
 */
export function createGameEvent(
  type: GameEventTypeValue,
  payload?: GameEvent['payload']
): GameEvent {
  return {
    id: `game-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type,
    timestamp: Date.now(),
    entities: {},
    payload: payload || {}
  };
}

// Specific event creators
export function createGameInitializingEvent(): GameEvent {
  return createGameEvent(GameEventType.GAME_INITIALIZING, {
    gameState: 'initializing'
  });
}

export function createGameInitializedEvent(): GameEvent {
  return createGameEvent(GameEventType.GAME_INITIALIZED, {
    gameState: 'ready'
  });
}

export function createStoryLoadingEvent(storyId?: string): GameEvent {
  return createGameEvent(GameEventType.STORY_LOADING, {
    story: { id: storyId }
  });
}

export function createStoryLoadedEvent(story: {
  id?: string;
  title?: string;
  author?: string;
  version?: string;
}): GameEvent {
  return createGameEvent(GameEventType.STORY_LOADED, {
    story,
    gameState: 'ready'
  });
}

export function createGameStartingEvent(story?: GameEvent['payload']['story']): GameEvent {
  return createGameEvent(GameEventType.GAME_STARTING, {
    story,
    gameState: 'ready'
  });
}

export function createGameStartedEvent(
  story?: GameEvent['payload']['story'],
  startTime?: number
): GameEvent {
  return createGameEvent(GameEventType.GAME_STARTED, {
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
  session?: GameEvent['payload']['session']
): GameEvent {
  return createGameEvent(GameEventType.GAME_ENDING, {
    gameState: 'ending',
    session,
    ending: { reason }
  });
}

export function createGameEndedEvent(
  endingType: 'victory' | 'defeat' | 'quit' | 'abort',
  session?: GameEvent['payload']['session'],
  ending?: GameEvent['payload']['ending']
): GameEvent {
  return createGameEvent(GameEventType.GAME_ENDED, {
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
  session?: GameEvent['payload']['session'],
  ending?: GameEvent['payload']['ending']
): GameEvent {
  return createGameEvent(GameEventType.GAME_WON, {
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
  session?: GameEvent['payload']['session']
): GameEvent {
  return createGameEvent(GameEventType.GAME_LOST, {
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
  session?: GameEvent['payload']['session']
): GameEvent {
  return createGameEvent(GameEventType.GAME_QUIT, {
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
  session?: GameEvent['payload']['session']
): GameEvent {
  return createGameEvent(GameEventType.GAME_ABORTED, {
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