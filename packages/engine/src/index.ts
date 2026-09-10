/**
 * @sharpee/engine — the package's public contract.
 *
 * Every name a consumer of `@sharpee/engine` can import is listed here by
 * name, from the module that declares it. There is no `export *`: a module
 * under `src/` is internal until a consumer needs one of its names, and
 * adding a name here is a recorded decision (ADR-342 D1, D3), pinned by
 * `tests/unit/public-surface.test.ts` (ADR-342 D5).
 *
 * Public interface: the 32 names below — the facade, what a story author
 * writes against, what a turn hands back, the turn's stage lists, the
 * services a host or test drives, the plugins, and the seams other
 * packages call by name.
 *
 * Owner context: the engine package boundary (`packages/engine`).
 */

// The facade
export { GameEngine, DEFAULT_TEXT_CAPABILITIES } from './game-engine.js';
export type { EngineConfig } from './types.js';

// What a story author writes against
export { StoryWithEvents, validateStoryConfig } from './install/story.js';
export type { Story, StoryConfig, CustomVocabulary, StoryEngine } from './install/story.js';
export type { NarrativeConfig } from './install/narrative/narrative-settings.js';
export type { ParsedCommandTransformer } from './command/command-executor.js';
export type { InputModeHandler } from './types.js';
export { SharedDataKeys } from './command/shared-data-keys.js';

// What a turn hands back
export type { GameContext, TurnResult } from './types.js';

// The turn as a named list (ADR-334)
export { TURN_STAGES, META_STAGES, SHARED_STAGES } from './turn/stages.js';
export type { TurnStage } from './turn/context.js';

// Services a host or a test drives directly
export { CommandExecutor, createCommandExecutor } from './command/command-executor.js';
export { EngineRandomService } from './session/engine-random-service.js';
export { SaveRestoreService, SAVE_FORMAT_VERSION } from './session/save-restore-service.js';
export type { ISaveRestoreStateProvider } from './session/save-restore-service.js';
export { VocabularyManager } from './ports/vocabulary-manager.js';

// Plugins
export { ActorTurnPlugin, ACTOR_TURN_PLUGIN_ID } from './plugins/actor-turn-plugin.js';
export { PluginRegistry } from '@sharpee/plugins';

// Seams another package calls by name
export { phrasebookTemplateKey } from './prose-pipeline/phrase-render.js';
export type { PhrasebookResolution } from './prose-pipeline/phrase-render.js';
export { lintUnusedSnippetEntries } from './install/validate-room-snippets.js';
