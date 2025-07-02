/**
 * @sharpee/engine - Runtime engine for Sharpee IF Platform
 * 
 * This package provides:
 * - Game engine with turn management
 * - Command executor for orchestrating flow
 * - Event sequencing for proper ordering
 * - Game state management
 */

// Types
export * from './types';

// Story interface
export * from './story';

// Event sequencing
export * from './event-sequencer';

// Command execution
export * from './command-executor';

// Main engine
export * from './game-engine';

// Text service
export * from './text-service';

// Re-export commonly used items
export {
  GameEngine,
  createGameEngine,
  createStandardEngine,
  createEngineWithStory
} from './game-engine';

export {
  CommandExecutor,
  createCommandExecutor
} from './command-executor';

export {
  eventSequencer,
  EventSequenceUtils
} from './event-sequencer';
