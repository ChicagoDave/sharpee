/**
 * Prose pipeline — internal barrel for the engine package.
 *
 * Public interface: `ProsePipeline`, `createProsePipeline`,
 * `ITextService`. Plus the decoration primitives and stage utilities
 * the pipeline class composes.
 *
 * Owner context: `@sharpee/engine` — internal prose pipeline.
 *
 * @see ADR-174 §Engine-internal prose pipeline
 */

// Pipeline class and factory.
export { ProsePipeline, createProsePipeline } from './pipeline';

// Service interface.
export type { ITextService } from './types';

// Render-context runtime for the phrase pipeline (ADR-192, W2).
export {
  createRenderWorld,
  createRenderContextFactory,
  type RenderContextFactory,
  type WorldModelLike,
} from './render-context';

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
} from './decorations';

// Stage utilities (handy in tests).
export { filterEvents } from './stages/filter';
export {
  sortEventsForProse,
  getChainMetadata,
} from './stages/sort';
export { createBlock, createBlocks, extractValue } from './assemble';

// Handler families.
export type {
  EventHandler,
  HandlerContext,
  ChainableEventData,
  GenericEventData,
} from './handlers/types';
export {
  handleRoomDescription,
  handleRevealed,
  handleGameMessage,
  handleGenericEvent,
  handleGameStarted,
  handleHelpDisplayed,
  handleAboutDisplayed,
  handleAudibilityHeard,
  tryProcessDomainEventMessage,
  handleImplicitTake,
  handleCommandFailed,
  handleClientQuery,
} from './handlers';
