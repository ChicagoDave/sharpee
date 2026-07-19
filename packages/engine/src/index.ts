/**
 * @sharpee/engine - Runtime engine for Sharpee IF Platform
 *
 * This package provides:
 * - Game engine with turn management
 * - Command executor for orchestrating flow
 * - Game state management
 */

// Types
export * from './types.js';

// Narrative settings (ADR-089)
export * from './narrative/index.js';

// Story interface
export * from './story.js';

// Command execution
export * from './command-executor.js';

// Universal capability dispatch (ADR-090 extension)
export * from './capability-dispatch-helper.js';

// Load-time room-snippet validation (ADR-209 AC-5)
export * from './snippet-validation.js';
export * from './combatant-health-validation.js';

// Parser interface for engine integration
export * from './parser-interface.js';

// Shared data keys for typed action communication
export * from './shared-data-keys.js';

// Main engine
export * from './game-engine.js';

// Plugin system (ADR-120)
export { PluginRegistry, TurnPlugin, TurnPluginContext } from '@sharpee/plugins';

// Scene evaluation (ADR-149)
export { SceneEvaluationPlugin } from './scene-evaluation-plugin.js';

// Extracted services
export * from './vocabulary-manager.js';
export * from './save-restore-service.js';
export * from './turn-event-processor.js';
export * from './platform-operations.js';

// Spatial sound propagation (ADR-172)
export * from './sound/index.js';

// Re-export commonly used items
export {
  GameEngine
} from './game-engine.js';

export {
  CommandExecutor,
  createCommandExecutor
} from './command-executor.js';
