// packages/stdlib/src/stdlib-imports.ts
/**
 * Controlled import boundary for StdLib
 * This file defines what StdLib imports from Core and re-exports for internal use.
 * 
 * IMPORTANT: No other file in StdLib should import directly from @sharpee/core!
 * All Core imports should go through this file.
 */

// ============================================================================
// Event System (Infrastructure - OK to import)
// ============================================================================
export {
  SemanticEvent,
  EventSource,
  EventListener,
  EventEmitter,
  createEvent,
  createEventSource,
  createEventEmitter,
  StandardEventTypes,
  StandardEventTags,
  EventCategories
} from '@sharpee/core/events';

// ============================================================================
// Channel System (Infrastructure - OK to import)
// ============================================================================
export {
  Channel,
  ChannelDefinition,
  ChannelManager,
  ChannelMessage,
  createChannelManager,
  createTextFormatter
} from '@sharpee/core/channels';

// ============================================================================
// Extension System (Infrastructure - OK to import)
// ============================================================================
export {
  Extension,
  AnyExtension,
  ExtensionType
} from '@sharpee/core/extensions';

// ============================================================================
// Language System (Infrastructure - OK to import)
// ============================================================================
export {
  LanguageProvider,
  ListFormatOptions,
  LanguageMetadata
} from '@sharpee/core/language';

// ============================================================================
// TEMPORARY: Entity/Type imports (These should be moved to StdLib)
// ============================================================================
// TODO: These imports indicate a design flaw. Entity concepts are domain-specific
// and should not be in Core. Plan to move these to StdLib's own type system.
export {
  Entity,
  EntityId,
  EntityCreationParams,
  EntityOperationOptions
} from '@sharpee/core/types';

// ============================================================================
// TEMPORARY: Execution imports (Should be IF-specific in StdLib)
// ============================================================================
export {
  CommandResult,
  ExecutionContext,
  CommandHandler,
  CommandRouter,
  CommandExecutionOptions
} from '@sharpee/core/execution';

// ============================================================================
// DO NOT IMPORT: Parser (Moved to StdLib)
// ============================================================================
// Parser is IF-specific and lives in StdLib now

// ============================================================================
// DO NOT IMPORT: Rules (Probably should be in StdLib)
// ============================================================================
// Rules system seems IF-specific and might need to move

/**
 * Version from Core
 */
export { version } from '@sharpee/core';
