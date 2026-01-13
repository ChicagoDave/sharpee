/**
 * Sharpee - Interactive Fiction Engine
 * 
 * Main entry point that aggregates all packages for easy consumption
 */

// Re-export main types and classes that platforms need
export { 
  GameEngine,
  type Story,
  type SequencedEvent,
  type StoryConfig 
} from '@sharpee/engine';

export {
  type WorldModel,
  type IFEntity
} from '@sharpee/world-model';

// Query system and platform events from core
export {
  QueryManager,
  createQueryManager,
  type IPendingQuery as PendingQuery,
  type IQueryResponse as QueryResponse,
  type IQueryHandler as QueryHandler,
  type QueryValidator,
  QuerySource,
  QueryType,
  PlatformEventType,
  type IPlatformEvent as PlatformEvent,
  type ISaveContext as SaveContext,
  type IRestoreContext as RestoreContext,
  type IQuitContext as QuitContext,
  type IRestartContext as RestartContext,
  type ISemanticEvent as SemanticEvent,
  isPlatformRequestEvent,
  createSaveCompletedEvent,
  createRestoreCompletedEvent,
  createQuitConfirmedEvent,
  createQuitCancelledEvent,
  createRestartCompletedEvent
} from '@sharpee/core';

export {
  Parser,
  type Token,
  type ValidatedCommand,
  type ParseError,
  CommandValidator
} from '@sharpee/stdlib';

// Language support
export { EnglishLanguageProvider } from '@sharpee/lang-en-us';

// Parser support
export { EnglishParser } from '@sharpee/parser-en-us';

// Text services (ADR-096)
export {
  type ITextService,
  createTextService,
  renderToString,
  renderStatusLine,
} from '@sharpee/text-service';

// Text blocks (ADR-096)
export type { ITextBlock, IDecoration, TextContent } from '@sharpee/text-blocks';
