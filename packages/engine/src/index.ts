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

// Narrative settings (ADR-089)
export * from './narrative';

// Story interface
export * from './story';

// Event sequencing
export * from './event-sequencer';

// Command execution
export * from './command-executor';

// Main engine
export * from './game-engine';

// Scheduler (Daemons and Fuses - ADR-071)
export * from './scheduler';

// Note: Text service has been moved to @sharpee/text-service package

// Re-export commonly used items
export {
  GameEngine
} from './game-engine';

export {
  CommandExecutor,
  createCommandExecutor
} from './command-executor';

export {
  eventSequencer,
  EventSequenceUtils
} from './event-sequencer';
