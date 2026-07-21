/**
 * Prose pipeline — internal barrel for the engine package.
 *
 * Public interface: `ProsePipeline`, `createProsePipeline`,
 * `IProsePipeline`. Plus the decoration primitives and stage utilities
 * the pipeline class composes.
 *
 * Owner context: `@sharpee/engine` — internal prose pipeline.
 *
 * @see ADR-174 §Engine-internal prose pipeline
 */

// Pipeline class and factory.
export { ProsePipeline, createProsePipeline } from './pipeline.js';

// Service interface.
export type {
  IProsePipeline,
  SlotContributor,
  SlotEntry,
  SlotEntryGate,
} from './types.js';

// Render-context runtime for the phrase pipeline (ADR-192, W2).
export {
  createRenderWorld,
  createRenderContextFactory,
  type RenderContextFactory,
  type WorldModelLike,
} from './render-context.js';

// Decoration primitives (re-exported for convenience to engine code
// outside the prose-pipeline subdirectory; the canonical types live
// in `@sharpee/text-blocks`).
export {
  parseDecorations,
  resolveClassName,
  PLATFORM_VOCABULARY,
  PLATFORM_VOCABULARY_NAMES,
  type PlatformVocabularyName,
  type IDecoration,
  type TextContent,
} from './decorations/index.js';

// Stage utilities (handy in tests).
export { filterEvents } from './stages/filter.js';
export {
  sortEventsForProse,
  getChainMetadata,
} from './stages/sort.js';
export { createBlock, createBlocks, extractValue } from './assemble.js';

// Handler families.
export type {
  EventHandler,
  HandlerContext,
  ChainableEventData,
  GenericEventData,
} from './handlers/types.js';
// ADR-250 D4: the phrasebook read point's key builder + evaluator contract —
// imported by the story-loader registrar (the only other key-builder site).
export { phrasebookTemplateKey } from './phrase-render.js';
export type { PhrasebookResolution } from './phrase-render.js';
export {
  handleRoomDescription,
  handleRevealed,
  handleGameMessage,
  handleGenericEvent,
  handleGameStarted,
  handleAudibilityHeard,
  tryProcessDomainEventMessage,
  handleImplicitTake,
  handleCommandFailed,
  handleClientQuery,
} from './handlers/index.js';
