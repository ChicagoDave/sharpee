/**
 * @sharpee/bridge
 *
 * Native engine bridge for Sharpee (ADR-135).
 * Runs as a Node.js subprocess, communicating with a native host
 * via newline-delimited JSON over stdin/stdout.
 *
 * This package re-exports the protocol types and the engine API
 * surface needed for story loading and bridge operation.
 */

// ─── Protocol (the stdin/stdout contract) ────────────────────────
export * from './protocol';

// ─── Bridge ──────────────────────────────────────────────────────
export { NativeEngineBridge } from './bridge';

// ─── Engine ──────────────────────────────────────────────────────
export {
  GameEngine,
  type Story,
  type StoryConfig,
  type CustomVocabulary,
  StoryWithEvents,
  validateStoryConfig,
  CommandExecutor,
  createCommandExecutor,
  VocabularyManager,
  SaveRestoreService,
  TurnEventProcessor,
  type NarrativeConfig,
  SharedDataKeys,
} from '@sharpee/engine';

// ─── Core types ──────────────────────────────────────────────────
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

// ─── World model ─────────────────────────────────────────────────
export * from '@sharpee/world-model';

// ─── IF domain ───────────────────────────────────────────────────
export {
  type LanguageProvider,
  type GrammarBuilder,
} from '@sharpee/if-domain';

// ─── Standard library ────────────────────────────────────────────
export {
  Parser,
  type Token,
  type ValidatedCommand,
  type ParseError,
  CommandValidator,
} from '@sharpee/stdlib';

export {
  type Action,
  type ActionContext,
  PerceptionService,
} from '@sharpee/stdlib';

// ─── Parser ──────────────────────────────────────────────────────
export { EnglishParser } from '@sharpee/parser-en-us';

// ─── Language ────────────────────────────────────────────────────
export { EnglishLanguageProvider } from '@sharpee/lang-en-us';

// ─── Text system ─────────────────────────────────────────────────
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

// ─── Plugins ─────────────────────────────────────────────────────
export {
  TurnPlugin,
  TurnPluginContext,
  type TurnPluginActionResult,
  PluginRegistry,
} from '@sharpee/plugins';

export { NpcPlugin } from '@sharpee/plugin-npc';
export { SchedulerPlugin } from '@sharpee/plugin-scheduler';
export { StateMachinePlugin } from '@sharpee/plugin-state-machine';

// ─── Services ────────────────────────────────────────────────────
export {
  type IPerceptionService,
} from '@sharpee/if-services';

// ─── Event processor ─────────────────────────────────────────────
export {
  EffectProcessor,
} from '@sharpee/event-processor';
