/**
 * conditions.ts — reading a gate's condition without running the story.
 *
 * Purpose: `<dir> is blocked while <cond>` needs two answers a static pass can
 * sometimes give and must otherwise refuse: does the condition hold when play
 * begins, and can the player make it stop holding. Everything this module cannot
 * model answers `unknown`, which the caller reads as "drop the check" — a gate
 * reported sealed on a guess is the most expensive wrong answer this surface can
 * give (ADR-321 D3, D4).
 *
 * Public interface: Truth, ConditionWorld, holdsAtStart, canBeFalsified.
 *
 * Owner context: @sharpee/world-index — the derivation package. No platform
 * contract.
 *
 * @packageDocumentation
 * @see ADR-321 D4: the `blocked while` polarity, named there because reading it
 *   backwards reported both of Fernhill's gates as permanently sealed
 */

import type { IRCondition, IREntity, IRValue } from '@sharpee/chord';
import { initialStateOf, platformStateHoldsAtStart } from './loader-semantics.js';

/** A three-valued answer: `unknown` means the analyzer declines to guess. */
export type Truth = 'true' | 'false' | 'unknown';

/** What a condition needs to know about the story around it. */
export interface ConditionWorld {
  /** Entity by id, or undefined when the id names nothing. */
  entity(id: string): IREntity | undefined;
  /** Whether an entity is a door kind — doors alone default to locked. */
  isDoor(id: string): boolean;
  /** Whether the player can act on an entity given what is reached so far. */
  canAct(id: string): boolean;
  /**
   * Whether a triggerable `change` writes the entity into (or out of) a state.
   *
   * @param entityId the entity whose state would change
   * @param state the state word in question
   * @param into true to ask whether something writes it *into* that state,
   *   false to ask whether something writes it *out*
   */
  canWriteState(entityId: string, state: string, into: boolean): boolean;
  /** A named condition's body, or undefined when the name resolves to nothing. */
  namedCondition(name: string): IRCondition | undefined;
}

/** Depth limit on named-condition expansion — a cycle is malformed IR, not a hang. */
const MAX_CONDITION_DEPTH = 16;

/**
 * The state word an `is` predicate tests for.
 *
 * @param value the predicate's object
 * @returns the state word, or undefined when the object is not a bare symbol
 */
function stateWordOf(value: IRValue): string | undefined {
  return value.kind === 'symbol' ? value.name : undefined;
}

/**
 * The entity an `is` predicate is about.
 *
 * @param value the predicate's subject
 * @returns the entity id, or undefined when the subject is not a fixed entity
 */
function subjectIdOf(value: IRValue): string | undefined {
  return value.kind === 'entity' ? value.id : undefined;
}

/** Flip a truth value, leaving `unknown` alone. */
function negate(truth: Truth): Truth {
  if (truth === 'true') return 'false';
  if (truth === 'false') return 'true';
  return 'unknown';
}

/** True when every member is `true`; false when any is `false`; else unknown. */
function all(truths: Truth[]): Truth {
  if (truths.some((t) => t === 'false')) return 'false';
  return truths.every((t) => t === 'true') ? 'true' : 'unknown';
}

/** True when any member is `true`; false when every one is `false`; else unknown. */
function any(truths: Truth[]): Truth {
  if (truths.some((t) => t === 'true')) return 'true';
  return truths.every((t) => t === 'false') ? 'false' : 'unknown';
}

/**
 * Whether an `<entity> is <state>` predicate holds when play begins.
 *
 * @param entityId the subject
 * @param word the state word
 * @param world the story around the condition
 * @returns whether the entity starts in that state, or unknown when neither a
 *   composed trait nor the entity's own state set owns the word
 */
function stateHoldsAtStart(entityId: string, word: string, world: ConditionWorld): Truth {
  const entity = world.entity(entityId);
  if (entity === undefined) return 'unknown';

  const platform = platformStateHoldsAtStart(entity, word, world.isDoor(entityId));
  if (platform !== undefined) return platform ? 'true' : 'false';

  const states = entity.states ?? [];
  if (!states.includes(word)) return 'unknown';
  return initialStateOf(states) === word ? 'true' : 'false';
}

/**
 * Whether the player can put an `<entity> is <state>` predicate into a given
 * truth value.
 *
 * A platform trait state is written by a standard action, so reaching the entity
 * is the whole requirement. An author's own state is written only by a `change`
 * statement, so something triggerable has to carry one.
 *
 * @param entityId the subject
 * @param word the state word
 * @param wantTrue true to ask whether the predicate can be made to hold
 * @param world the story around the condition
 * @returns whether the player can bring that about, or unknown when the word is
 *   owned by neither a composed trait nor the entity's own state set
 */
function stateCanBecome(
  entityId: string,
  word: string,
  wantTrue: boolean,
  world: ConditionWorld,
): Truth {
  const entity = world.entity(entityId);
  if (entity === undefined) return 'unknown';

  if (platformStateHoldsAtStart(entity, word, world.isDoor(entityId)) !== undefined) {
    return world.canAct(entityId) ? 'true' : 'false';
  }

  const states = entity.states ?? [];
  if (!states.includes(word)) return 'unknown';
  return world.canWriteState(entityId, word, wantTrue) ? 'true' : 'false';
}

/**
 * Whether a condition holds when play begins.
 *
 * @param condition the condition to read
 * @param world the story around it
 * @param depth named-condition expansion depth, for the cycle guard
 * @returns true, false, or unknown when the analyzer declines to model it
 */
export function holdsAtStart(
  condition: IRCondition,
  world: ConditionWorld,
  depth = 0,
): Truth {
  if (depth > MAX_CONDITION_DEPTH) return 'unknown';

  switch (condition.kind) {
    case 'and':
      return all(condition.operands.map((operand) => holdsAtStart(operand, world, depth + 1)));
    case 'or':
      return any(condition.operands.map((operand) => holdsAtStart(operand, world, depth + 1)));
    case 'not':
      return negate(holdsAtStart(condition.operand, world, depth + 1));
    case 'condition': {
      const body = world.namedCondition(condition.name);
      return body === undefined ? 'unknown' : holdsAtStart(body, world, depth + 1);
    }
    case 'predicate': {
      if (condition.pred !== 'is') return 'unknown';
      const subject = subjectIdOf(condition.subject);
      const word = stateWordOf(condition.object);
      if (subject === undefined || word === undefined) return 'unknown';
      const holds = stateHoldsAtStart(subject, word, world);
      return condition.negated ? negate(holds) : holds;
    }
    default:
      return 'unknown';
  }
}

/**
 * Whether the player can make a condition stop holding.
 *
 * @param condition the condition to read
 * @param world the story around it
 * @param depth named-condition expansion depth, for the cycle guard
 * @returns true, false, or unknown when the analyzer declines to model it
 */
export function canBeFalsified(
  condition: IRCondition,
  world: ConditionWorld,
  depth = 0,
): Truth {
  return canBecome(condition, false, world, depth);
}

/**
 * Whether the player can bring a condition to a given truth value.
 *
 * Falsifying a conjunction needs only one operand to give way; falsifying a
 * disjunction needs every one of them to.
 *
 * @param condition the condition to read
 * @param wantTrue the value the player is trying to bring about
 * @param world the story around it
 * @param depth named-condition expansion depth, for the cycle guard
 * @returns true, false, or unknown when the analyzer declines to model it
 */
function canBecome(
  condition: IRCondition,
  wantTrue: boolean,
  world: ConditionWorld,
  depth: number,
): Truth {
  if (depth > MAX_CONDITION_DEPTH) return 'unknown';

  switch (condition.kind) {
    case 'and': {
      const operands = condition.operands.map((operand) =>
        canBecome(operand, wantTrue, world, depth + 1),
      );
      return wantTrue ? all(operands) : any(operands);
    }
    case 'or': {
      const operands = condition.operands.map((operand) =>
        canBecome(operand, wantTrue, world, depth + 1),
      );
      return wantTrue ? any(operands) : all(operands);
    }
    case 'not':
      return canBecome(condition.operand, !wantTrue, world, depth + 1);
    case 'condition': {
      const body = world.namedCondition(condition.name);
      return body === undefined ? 'unknown' : canBecome(body, wantTrue, world, depth + 1);
    }
    case 'predicate': {
      if (condition.pred !== 'is') return 'unknown';
      const subject = subjectIdOf(condition.subject);
      const word = stateWordOf(condition.object);
      if (subject === undefined || word === undefined) return 'unknown';
      return stateCanBecome(subject, word, condition.negated ? !wantTrue : wantTrue, world);
    }
    default:
      return 'unknown';
  }
}
