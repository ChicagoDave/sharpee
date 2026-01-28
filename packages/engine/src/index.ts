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

// Universal capability dispatch (ADR-090 extension)
export * from './capability-dispatch-helper';

// Parser interface for engine integration
export * from './parser-interface';

// Shared data keys for typed action communication
export * from './shared-data-keys';

// Main engine
export * from './game-engine';

// Plugin system (ADR-120)
export { PluginRegistry, TurnPlugin, TurnPluginContext } from '@sharpee/plugins';

// Extracted services (Phase 4 remediation)
export * from './vocabulary-manager';
export * from './save-restore-service';
export * from './turn-event-processor';
export * from './platform-operations';

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
