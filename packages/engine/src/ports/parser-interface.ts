/**
 * The engine's parser port: one shape the engine talks to, whatever
 * parser it was given.
 *
 * The domain `Parser` contract (`@sharpee/if-domain`) promises `parse`
 * and `tokenize`. The engine also wants five more things from a parser —
 * world context for scope-aware resolution, a platform-event emitter for
 * parser debugging, and the pronoun context that makes `it` mean
 * something next turn. `EnglishParser` provides all five; a test double
 * may provide none. `adaptParser` normalizes the injected parser once,
 * at construction, into an `EngineParser` on which every method exists:
 * each is bound to the parser's own when present and to a no-op
 * otherwise. The facade, the executor, and the turn stages hold the
 * adapter, so "what if the parser lacks a method" is answered in exactly
 * one place — here — and nowhere else in the package.
 *
 * Public interface (package-internal; not exported from `index.ts`):
 * `IEngineAwareParser`, `EngineParser`, `adaptParser`.
 *
 * Owner context: `@sharpee/engine` — the seam onto the parser.
 */

import type { IParser, IValidatedCommand, WorldModel } from '@sharpee/world-model';
import type { ISemanticEvent } from '@sharpee/core';

/**
 * What a parser may additionally offer the engine. Every method is
 * optional: this is the shape the engine probes, not the shape it calls.
 */
export interface IEngineAwareParser extends IParser {
  /**
   * Set the world context for scope-constraint evaluation, before a
   * parse, so entity resolution can see visibility and reachability.
   * @param world the current world model
   * @param actorId the player's entity id
   * @param currentLocation the player's current location id
   */
  setWorldContext?(world: WorldModel, actorId: string, currentLocation: string): void;

  /**
   * Set the platform-event emitter for parser debugging; the parser
   * emits debug events during parsing while one is set.
   * @param emitter the sink, or `undefined` to disable
   */
  setPlatformEventEmitter?(emitter: ((event: ISemanticEvent) => void) | undefined): void;

  /**
   * Record the entities a successful command resolved, so pronouns
   * (`it`, `them`, `him`, `her`) refer to them afterwards.
   * @param command the validated command with resolved entity ids
   * @param turnNumber the current turn, for context decay
   */
  updatePronounContext?(command: IValidatedCommand, turnNumber: number): void;

  /**
   * Record one entity as the pronoun referent by id and text — what a
   * refused turn names (GH #97).
   * @param entityId the entity's id
   * @param text the text the player used for it
   * @param turnNumber the current turn, for context decay
   */
  registerPronounEntity?(entityId: string, text: string, turnNumber: number): void;

  /** Clear the pronoun context, on restart or player switch. */
  resetPronounContext?(): void;
}

/**
 * The shape the engine calls: `parse` plus the five engine-facing
 * methods, every one present. Produced by `adaptParser`.
 */
export interface EngineParser extends IParser {
  setWorldContext(world: WorldModel, actorId: string, currentLocation: string): void;
  setPlatformEventEmitter(emitter: ((event: ISemanticEvent) => void) | undefined): void;
  updatePronounContext(command: IValidatedCommand, turnNumber: number): void;
  registerPronounEntity(entityId: string, text: string, turnNumber: number): void;
  resetPronounContext(): void;
}

const ENGINE_METHODS = [
  'setWorldContext',
  'setPlatformEventEmitter',
  'updatePronounContext',
  'registerPronounEntity',
  'resetPronounContext',
] as const;

type EngineMethod = (typeof ENGINE_METHODS)[number];

/** Whether the parser already offers the method as a function. */
function offers(parser: IParser, method: EngineMethod): boolean {
  return typeof (parser as IEngineAwareParser)[method] === 'function';
}

/**
 * Normalize a parser into the shape the engine calls.
 *
 * A parser that already offers all five engine-facing methods is
 * returned as it is — it is an `EngineParser` already, and wrapping it
 * would only add a hop. Otherwise a wrapper is returned whose `parse`
 * forwards to the parser, whose present methods forward with the same
 * arguments, and whose absent methods do nothing. Adapting the result
 * again returns it unchanged.
 * @param parser the injected parser, at minimum `parse`
 * @returns a parser on which every engine-facing method exists
 */
export function adaptParser(parser: IParser): EngineParser {
  if (ENGINE_METHODS.every((method) => offers(parser, method))) {
    return parser as EngineParser;
  }
  const aware = parser as IEngineAwareParser;
  const noop = () => {};
  return {
    parse: (input: string) => parser.parse(input),
    setWorldContext: aware.setWorldContext
      ? (world, actorId, currentLocation) => aware.setWorldContext!(world, actorId, currentLocation)
      : noop,
    setPlatformEventEmitter: aware.setPlatformEventEmitter
      ? (emitter) => aware.setPlatformEventEmitter!(emitter)
      : noop,
    updatePronounContext: aware.updatePronounContext
      ? (command, turnNumber) => aware.updatePronounContext!(command, turnNumber)
      : noop,
    registerPronounEntity: aware.registerPronounEntity
      ? (entityId, text, turnNumber) => aware.registerPronounEntity!(entityId, text, turnNumber)
      : noop,
    resetPronounContext: aware.resetPronounContext ? () => aware.resetPronounContext!() : noop,
  };
}
