/**
 * Extended parser interface for engine integration
 *
 * The base IParser interface (from world-model) defines only the parse() method.
 * This interface extends it with optional methods that the engine can use when
 * available, replacing duck-typing with proper type guards.
 */

import type { IParser, IValidatedCommand, WorldModel } from '@sharpee/world-model';
import type { ISemanticEvent } from '@sharpee/core';

/**
 * Extended parser interface for engine integration.
 *
 * Parsers can optionally implement these methods to enable:
 * - World-aware scope constraints (setWorldContext)
 * - Debug event emission (setPlatformEventEmitter)
 * - Pronoun resolution (updatePronounContext, resetPronounContext)
 */
export interface IEngineAwareParser extends IParser {
  /**
   * Set the world context for scope constraint evaluation.
   * Called before parsing to enable entity resolution based on
   * visibility, reachability, etc.
   *
   * @param world The current world model
   * @param actorId The player's entity ID
   * @param currentLocation The player's current location ID
   */
  setWorldContext?(world: WorldModel, actorId: string, currentLocation: string): void;

  /**
   * Set platform event emitter for parser debugging.
   * When set, parser emits debug events during parsing.
   *
   * @param emitter Function to emit events, or undefined to disable
   */
  setPlatformEventEmitter?(emitter: ((event: ISemanticEvent) => void) | undefined): void;

  /**
   * Update pronoun context after successful command execution.
   * Called by the engine to track entities referenced by pronouns
   * like "it", "them", "him", "her".
   *
   * @param command The validated command with resolved entity IDs
   * @param turnNumber Current turn number for context decay
   */
  updatePronounContext?(command: IValidatedCommand, turnNumber: number): void;

  /**
   * Reset the pronoun context.
   * Called on game restart or when context should be cleared.
   */
  resetPronounContext?(): void;
}

/**
 * Type guard to check if a parser implements engine-aware methods.
 *
 * @param parser The parser to check
 * @returns True if the parser has any engine-aware methods
 */
export function isEngineAwareParser(parser: IParser): parser is IEngineAwareParser {
  return (
    'setWorldContext' in parser ||
    'setPlatformEventEmitter' in parser ||
    'updatePronounContext' in parser ||
    'resetPronounContext' in parser
  );
}

/**
 * Type guard for parser with world context support.
 */
export function hasWorldContext(parser: IParser): parser is IEngineAwareParser & { setWorldContext: NonNullable<IEngineAwareParser['setWorldContext']> } {
  return 'setWorldContext' in parser && typeof (parser as IEngineAwareParser).setWorldContext === 'function';
}

/**
 * Type guard for parser with pronoun context support.
 */
export function hasPronounContext(parser: IParser): parser is IEngineAwareParser & {
  updatePronounContext: NonNullable<IEngineAwareParser['updatePronounContext']>;
  resetPronounContext: NonNullable<IEngineAwareParser['resetPronounContext']>;
} {
  return (
    'updatePronounContext' in parser &&
    'resetPronounContext' in parser &&
    typeof (parser as IEngineAwareParser).updatePronounContext === 'function' &&
    typeof (parser as IEngineAwareParser).resetPronounContext === 'function'
  );
}

/**
 * Type guard for parser with platform event emitter support.
 */
export function hasPlatformEventEmitter(parser: IParser): parser is IEngineAwareParser & {
  setPlatformEventEmitter: NonNullable<IEngineAwareParser['setPlatformEventEmitter']>;
} {
  return (
    'setPlatformEventEmitter' in parser &&
    typeof (parser as IEngineAwareParser).setPlatformEventEmitter === 'function'
  );
}
