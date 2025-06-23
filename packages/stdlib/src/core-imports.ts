// packages/stdlib/src/core-imports.ts
/**
 * Controlled import boundary between Core and StdLib
 * 
 * This is the ONLY file in StdLib that should import from @sharpee/core.
 * All other files should import from this file instead.
 * 
 * Per refactor plan (2025-06-15):
 * - Core contains basic types and generic systems
 * - StdLib imports Core interfaces through this boundary
 */

// ============================================================================
// Basic Types (Core should contain these per refactor plan)
// ============================================================================
export {
  Entity,
  EntityId,
  EntityCreationParams,
  EntityOperationOptions
} from '@sharpee/core';

export {
  Relationship,
  RelationshipConfig,
  RelationshipConfigMap
} from '@sharpee/core';

export {
  AttributeValue,
  AttributeObject,
  AttributeArray,
  AttributeConfig,
  AttributeConfigMap
} from '@sharpee/core';

// ============================================================================
// Parser System (Now in StdLib - DO NOT import from Core)
// ============================================================================
// Parser has been moved to StdLib per refactor plan
// These exports are from StdLib's own parser implementation
export {
  ParsedCommand
} from './parser/core/types';

export {
  Grammar
} from './parser/core/grammar';

export {
  Parser,
  ParserFactory as ParserConfig
} from './parser/core/parser';

// ============================================================================
// Execution System (Generic parts from Core)
// ============================================================================
export {
  CommandResult,
  ExecutionContext,  // Note: GameContext is IF-specific and in StdLib
  CommandHandler,
  CommandRouter,
  CommandExecutionOptions
} from '@sharpee/core';

// ============================================================================
// Event System (Generic infrastructure from Core)
// ============================================================================
export {
  EventEmitter,
  EventListener,
  EventSource,
  SemanticEvent
} from '@sharpee/core';

export {
  createEvent,
  createEventSource,
  createEventEmitter
} from '@sharpee/core';

export {
  StandardEventTypes,
  StandardEventTags,
  EventCategories
} from '@sharpee/core';

export {
  TextService,
  createTextService
} from '@sharpee/core';

// ============================================================================
// Response Formatting (Now in StdLib - DO NOT import from Core)
// ============================================================================
// These are IF-specific and live in StdLib
export {
  formatResponse,
  formatList
} from './parser/languages/en-US/response-formatter';

export {
  StandardResponses
} from './parser/languages/en-US/response-templates';

// ============================================================================
// Rules System (Generic infrastructure from Core)
// ============================================================================
export {
  RuleSystem,
  Rule,
  RuleWorld,
  RuleResult,
  SimpleRuleSystem,
  EntityChange
} from '@sharpee/core';

export {
  createRuleSystem,
  createSimpleRuleSystem,
  createSimpleRuleWorld
} from '@sharpee/core';

// ============================================================================
// Channel System (Removed - text output handled via events)
// ============================================================================
// Channels have been removed from Core
// Text output is now handled through the event system

// ============================================================================
// Extension System (Generic infrastructure from Core)
// ============================================================================
export {
  Extension,
  AnyExtension,
  ExtensionType
} from '@sharpee/core';

// ============================================================================
// Movement Systems (Now in StdLib - DO NOT import from Core)
// ============================================================================
// These are IF-specific and live in StdLib
export {
  MOVEMENT_SYSTEMS,
  MovementSystem
} from './constants/movement-systems';

// ============================================================================
// Language System (Basic interface from Core)
// ============================================================================
export {
  LanguageProvider,
  ListFormatOptions,
  LanguageMetadata
} from '@sharpee/core';

// ============================================================================
// Core Version
// ============================================================================
// Version is not exported from core - remove this import
