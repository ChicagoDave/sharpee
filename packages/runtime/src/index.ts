/**
 * @sharpee/runtime
 *
 * Headless Sharpee engine runtime for embedding in iframes.
 * Communicates with the parent frame (Lantern IDE) via postMessage.
 *
 * This package re-exports the full Sharpee API surface so that
 * eval'd story code can reference everything it needs from
 * window.Sharpee.
 */

// ─── Protocol (the postMessage contract) ──────────────────────────
export * from './protocol';

// ─── Bridge ───────────────────────────────────────────────────────
export { SharpeeRuntimeBridge } from './bridge';

// ─── Engine ───────────────────────────────────────────────────────
export {
  GameEngine,
  type Story,
  type StoryConfig,
  type CustomVocabulary,
  StoryWithEvents,
  validateStoryConfig,
  CommandExecutor,
  createCommandExecutor,
  eventSequencer,
  EventSequenceUtils,
  type SequencedEvent,
  VocabularyManager,
  SaveRestoreService,
  TurnEventProcessor,
  type NarrativeConfig,
  SharedDataKeys,
} from '@sharpee/engine';

// ─── Core types ───────────────────────────────────────────────────
export {
  QueryManager,
  createQueryManager,
  type IPendingQuery,
  type IQueryResponse,
  type IQueryHandler,
  type QueryValidator,
  QuerySource,
  QueryType,
  PlatformEventType,
  type IPlatformEvent,
  type ISaveContext,
  type IRestoreContext,
  type IQuitContext,
  type IRestartContext,
  type ISemanticEvent,
  isPlatformRequestEvent,
  createSaveCompletedEvent,
  createRestoreCompletedEvent,
  createQuitConfirmedEvent,
  createQuitCancelledEvent,
  createRestartCompletedEvent,
} from '@sharpee/core';

// ─── World model ──────────────────────────────────────────────────
// Re-export everything — traits, entities, behaviors, scope, capabilities
export * from '@sharpee/world-model';

// ─── IF domain ────────────────────────────────────────────────────
export {
  type LanguageProvider,
  type GrammarBuilder,
} from '@sharpee/if-domain';

// ─── Standard library ─────────────────────────────────────────────
export {
  Parser,
  type Token,
  type ValidatedCommand,
  type ParseError,
  CommandValidator,
} from '@sharpee/stdlib';

// Re-export stdlib action types and services
export {
  type Action,
  type ActionContext,
  PerceptionService,
} from '@sharpee/stdlib';

// ─── Parser ───────────────────────────────────────────────────────
export { EnglishParser } from '@sharpee/parser-en-us';

// ─── Language ─────────────────────────────────────────────────────
export { EnglishLanguageProvider } from '@sharpee/lang-en-us';

// ─── Text system ──────────────────────────────────────────────────
export type { ITextBlock, IDecoration, TextContent } from '@sharpee/text-blocks';
export {
  CORE_DECORATION_TYPES,
  CORE_BLOCK_KEYS,
  extractPlainText,
  isStatusBlock,
  isRoomBlock,
  isActionBlock,
} from '@sharpee/text-blocks';

export {
  type ITextService,
  createTextService,
  renderToString,
  renderStatusLine,
} from '@sharpee/text-service';

// ─── Plugins ──────────────────────────────────────────────────────
export {
  TurnPlugin,
  TurnPluginContext,
  type TurnPluginActionResult,
  PluginRegistry,
} from '@sharpee/plugins';

export { NpcPlugin } from '@sharpee/plugin-npc';
export { SchedulerPlugin } from '@sharpee/plugin-scheduler';
export { StateMachinePlugin } from '@sharpee/plugin-state-machine';

// ─── Services ─────────────────────────────────────────────────────
export {
  type IPerceptionService,
} from '@sharpee/if-services';

// ─── Event processor ──────────────────────────────────────────────
export {
  EffectProcessor,
} from '@sharpee/event-processor';
