/**
 * Engine public-API surface, shared between transport packages.
 *
 * `@sharpee/runtime` (postMessage / iframe transport) and
 * `@sharpee/bridge` (stdin/stdout JSON / Node-subprocess transport)
 * both expose the same set of engine + world-model + stdlib + plugins
 * symbols to their consumers. They differ only in the transport
 * machinery they wrap that surface in.
 *
 * Defining the surface here lets a new public symbol land in one
 * place; both transports pick it up by re-export rather than each
 * needing a manual edit. Without this file the two `index.ts` files
 * drifted in lockstep — a real maintenance burden, not a Sonar nit.
 *
 * Owner context: `@sharpee/sharpee` (the meta-package that aggregates
 * everything). Only `runtime` and `bridge` are expected consumers;
 * other clients should depend on `@sharpee/sharpee` itself or the
 * underlying packages directly.
 */

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
// Re-export everything — traits, entities, behaviors, scope, capabilities.
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
  type Action,
  type ActionContext,
  PerceptionService,
} from '@sharpee/stdlib';

// ─── Parser ───────────────────────────────────────────────────────
export { EnglishParser } from '@sharpee/parser-en-us';

// ─── Language ─────────────────────────────────────────────────────
export { EnglishLanguageProvider } from '@sharpee/lang-en-us';

// ─── Text system ──────────────────────────────────────────────────
// `CORE_DECORATION_TYPES` removed per ADR-174 — vocabulary is now
// engine-internal in `@sharpee/engine/src/prose-pipeline/decorations/`.
export type { ITextBlock, IDecoration, TextContent } from '@sharpee/text-blocks';
export {
  CORE_BLOCK_KEYS,
  extractPlainText,
  isStatusBlock,
  isRoomBlock,
  isActionBlock,
} from '@sharpee/text-blocks';

// ADR-174 Phase 2 — wire-production helpers ship from
// @sharpee/channel-service (per OQ-1 resolution). Dead
// ITextService / createTextService / TextService re-exports were
// dropped: engine has its own engine-private ITextService and no
// first-party consumer instantiates a text-service post-Phase-1.
export { renderToString, renderStatusLine } from '@sharpee/channel-service';
export type { CLIRenderOptions } from '@sharpee/channel-service';

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
