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
export type { EngineIntrospection, ActionSummary, TraitSummary, BehaviorBindingSummary, MessageSummary } from './introspection/introspect.js';

// Narrative settings (ADR-089)
export * from './install/narrative/index.js';

// Story interface
export * from './install/story.js';

// Command execution
export * from './command/command-executor.js';

// Universal capability dispatch (ADR-090 extension)
export * from './command/capability-dispatch-helper.js';

// Story installation as an explicit step list (ADR-334 A1), with the two load-time validators
export * from './install/index.js';

// Parser interface for engine integration
export * from './ports/parser-interface.js';

// Shared data keys for typed action communication
export * from './command/shared-data-keys.js';

// Main engine
export * from './game-engine.js';

// Plugin system (ADR-120)
export { PluginRegistry, TurnPlugin, TurnPluginContext } from '@sharpee/plugins';

// Scene evaluation (ADR-149)
export { SceneEvaluationPlugin } from './plugins/scene-evaluation-plugin.js';
export { ActorTurnPlugin, ACTOR_TURN_PLUGIN_ID, LEGACY_NPC_PLUGIN_ID } from './plugins/actor-turn-plugin.js';

// Extracted services
export * from './ports/vocabulary-manager.js';
export * from './session/save-restore-service.js';
export * from './session/engine-random-service.js';
export * from './turn/turn-event-processor.js';
export * from './turn/platform-dispatcher.js';

// Spatial sound propagation (ADR-172)
export * from './sound/index.js';

// The turn as an explicit stage list (ADR-334)
export * from './turn/index.js';

// ADR-250 D4: phrasebook read-point seam (key builder + evaluator contract)
export { phrasebookTemplateKey } from './prose-pipeline/index.js';
export type { PhrasebookResolution } from './prose-pipeline/index.js';

// Re-export commonly used items
export {
  GameEngine
} from './game-engine.js';

export {
  CommandExecutor,
  createCommandExecutor
} from './command/command-executor.js';
