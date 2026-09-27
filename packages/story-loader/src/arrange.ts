/**
 * arrange.ts — the arrange primitive: a pin expression performed as a
 * write against a live world.
 *
 * Purpose: a derived rule test (ADR-356) proves a rule IN a state, and it
 * gets there by arranging the state directly — never by playing to it.
 * `arrange(world, expression)` takes an expression in the pin grammar
 * (`./pin-grammar.ts`, the same parser the assertion core reads claims
 * with) and performs the one write it names: a loader state key, a move,
 * or a trait flag. Nothing else. The runner that calls it never touches a
 * `chord.*` key itself, which keeps the promise `state-keys.ts` makes.
 *
 * The floor, and exactly the floor:
 *   story.state = <phase>                     → the story-phase key
 *   [the] <name> is <state>                   → the entity's declared-state key
 *   the story is <state>                      → the story-phase key
 *   <entity>.location = <place>               → a placement
 *   <entity>.inventory|contents contains <x>  → a placement into the entity
 *   <entity>.isOpen|isLocked|isOn = true|false → the trait flag
 *   <timer> has started|expired               → the timer's record
 *
 * A timer write mirrors the runtime's own verbs (`runtime/timers.ts`).
 * `has started` on an idle timer writes a running record stamped with the
 * current turn — `context.turn`, which the caller supplies, since a world
 * does not know what turn it is — so the timer, like one a story `start`
 * began, steps for the first time on the turn after; on a timer already
 * started it writes nothing, as `start` writes nothing. `has expired`
 * keeps the record and flips its phase, as expiry does; on an idle timer
 * it writes the expired record `interrupt` never would, because arranging
 * means making the state hold. A timer the story does not declare cannot
 * be told from the world alone — an absent record is what idle looks like
 * — so the write is honoured as named; a caller's expressions come from
 * the IR, which declares every timer they name.
 *
 * A placement is world construction, as it is at load: it goes through the
 * author model, which bypasses runtime containment rules (a closed trunk
 * may be arranged to hold its contents), and a placed entity that a Chord
 * `remove` had taken offstage is revived, exactly as the runtime's own
 * `move` revives it.
 *
 * `arrange` never throws and never guesses. A result is `{ arranged: true }`
 * or `{ arranged: false, shape, detail? }`, where `shape` names the form:
 * one of the three non-floor shapes the grammar recognizes and this floor
 * does not write (`occurrence`, `topic-history`, `timer-position`), or the
 * two read-only claim kinds (`emitted`, `gone`);
 * `negation` for a negated form, which names no single
 * state to arrange; or `unrecognized`, for text no form matches and for a
 * floor form the world cannot honour — an entity the story does not
 * declare, a state on an entity that declares none, a flag on an entity
 * without the trait. `detail` says which. The runner owns the distinction
 * between a SKIPPED branch and a failed one: it built the expression, so
 * an `unrecognized` on a form it knows it wrote is a fact about the world,
 * not the grammar.
 *
 * Names resolve against the world alone: `player` is the role holder; any
 * other name is tried as a compiled IR id (the attribute the loader stamps
 * on every entity it builds), then a world id, then a display name or
 * alias.
 *
 * Public interface: arrange(), ArrangeContext, ArrangeResult, ArrangeShape.
 * Owner context: @sharpee/story-loader — the owner of the keys and the
 * grammar; ADR-356 Q-1 put the primitive here for that reason.
 *
 * References: ADR-356 D2 (arrange, never play; the floor; never throws,
 * never guesses), Q-1 (home), Q-2 (the floor and the SKIPPED shapes; timer
 * phase joined the floor by the amendment of 2026-09-27), AC-5 (no writer
 * of loader keys outside this package); ADR-325 D3 (timer verbs and
 * records), Z6 as amended (a move back into the world revives a gone
 * entity).
 */

import {
  AuthorModel,
  IdentityTrait,
  LockableTrait,
  OpenableTrait,
  SwitchableTrait,
  TraitType,
  type IFEntity,
  type WorldModel,
} from '@sharpee/world-model';
import { parsePin, type ParsedPin } from './pin-grammar.js';
import {
  CHORD_GONE_PREFIX,
  CHORD_IR_ID_ATTRIBUTE,
  CHORD_STATE_PREFIX,
  CHORD_STORY_STATE_KEY,
  IDLE_TIMER_RECORD,
  timerKey,
  type TimerRecord,
} from './state-keys.js';

/** The named reasons an expression is not arranged. */
export type ArrangeShape =
  | 'occurrence'
  | 'topic-history'
  | 'timer-position'
  | 'emitted'
  | 'gone'
  | 'negation'
  | 'unrecognized';

/** The outcome of one arrange call. */
export type ArrangeResult =
  | { arranged: true }
  | { arranged: false; shape: ArrangeShape; detail?: string };

/** What a write may need beyond the world. */
export interface ArrangeContext {
  /** The engine's current turn: a timer started now is stamped with it and steps first on the turn after. */
  turn?: number;
}

/** The three trait flags the floor writes, by the pin property that names each. */
const FLAG_WRITERS: Record<string, (entity: IFEntity, value: boolean) => boolean> = {
  isOpen(entity, value) {
    const trait = entity.get(TraitType.OPENABLE) as OpenableTrait | undefined;
    if (!trait) return false;
    trait.isOpen = value;
    return true;
  },
  isLocked(entity, value) {
    const trait = entity.get(TraitType.LOCKABLE) as LockableTrait | undefined;
    if (!trait) return false;
    trait.isLocked = value;
    return true;
  },
  isOn(entity, value) {
    const trait = entity.get(TraitType.SWITCHABLE) as SwitchableTrait | undefined;
    if (!trait) return false;
    trait.isOn = value;
    return true;
  },
};

/**
 * Perform one pin expression as a write against the world.
 *
 * @param world the live world — freshly booted, for a derived test
 * @param expression a pin expression in the floor grammar
 * @param context the current turn, for a timer start; nothing else needs it
 * @returns `{ arranged: true }`, or the named reason it was not
 */
export function arrange(world: WorldModel, expression: string, context: ArrangeContext = {}): ArrangeResult {
  const pin = parsePin(expression);
  switch (pin.kind) {
    case 'unrecognized':
      return { arranged: false, shape: 'unrecognized', detail: `no form matches "${expression}"` };
    case 'occurrence':
    case 'topic-history':
    case 'timer-position':
      return { arranged: false, shape: pin.kind };
    case 'timer-phase':
      return arrangeTimerPhase(world, pin, context);
    case 'emitted':
    case 'gone':
      // Claims the assertion core reads (ADR-356 D3); nothing arranges them.
      return { arranged: false, shape: pin.kind, detail: `"${expression}" is a claim, not a state to arrange` };
    case 'story-state':
      if (pin.operator === '!=') return negation(expression);
      return arrangeStoryState(world, pin.state);
    case 'declared-state':
      if (pin.negated) return negation(expression);
      if (pin.name === 'story') return arrangeStoryState(world, pin.state);
      return arrangeDeclaredState(world, pin.name, pin.state);
    case 'location':
      if (pin.operator === '!=') return negation(expression);
      return arrangePlacement(world, pin.entity, pin.place);
    case 'contains':
      if (pin.operator === 'not-contains') return negation(expression);
      if (pin.collection !== 'inventory' && pin.collection !== 'contents') {
        return unrecognized(`"${pin.collection}" is not a collection the floor arranges (inventory, contents)`);
      }
      return arrangePlacement(world, pin.item, pin.entity);
    case 'property':
      if (pin.operator === '!=') return negation(expression);
      return arrangeFlag(world, pin);
  }
}

function negation(expression: string): ArrangeResult {
  return { arranged: false, shape: 'negation', detail: `"${expression}" names no single state to arrange` };
}

function unrecognized(detail: string): ArrangeResult {
  return { arranged: false, shape: 'unrecognized', detail };
}

/** `story.state = <phase>` — only for a story that declares phases. */
function arrangeStoryState(world: WorldModel, state: string): ArrangeResult {
  if (world.getStateValue(CHORD_STORY_STATE_KEY) === undefined) {
    return unrecognized('this story declares no states');
  }
  world.setStateValue(CHORD_STORY_STATE_KEY, state);
  return { arranged: true };
}

/** `[the] <name> is <state>` — only for a Chord entity that declares states. */
function arrangeDeclaredState(world: WorldModel, name: string, state: string): ArrangeResult {
  const entity = resolveEntity(world, name);
  if (!entity) return unrecognized(`entity "${name}" not found`);
  const irId = entity.attributes[CHORD_IR_ID_ATTRIBUTE];
  if (typeof irId !== 'string') {
    return unrecognized(`"${name}" is not a Chord entity (no IR id), so it has no states`);
  }
  if (world.getStateValue(CHORD_STATE_PREFIX + irId) === undefined) {
    return unrecognized(`"${name}" declares no states`);
  }
  world.setStateValue(CHORD_STATE_PREFIX + irId, state);
  return { arranged: true };
}

/**
 * A placement: `thing` goes into `place` through the author model, and a
 * gone flag on the thing is cleared, as the runtime's `move` clears it.
 */
function arrangePlacement(world: WorldModel, thingName: string, placeName: string): ArrangeResult {
  const thing = resolveEntity(world, thingName);
  if (!thing) return unrecognized(`entity "${thingName}" not found`);
  const place = resolveEntity(world, placeName);
  if (!place) return unrecognized(`entity "${placeName}" not found`);
  const author = new AuthorModel(world.getDataStore(), world);
  author.moveEntity(thing.id, place.id);
  const irId = thing.attributes[CHORD_IR_ID_ATTRIBUTE];
  if (typeof irId === 'string' && world.getStateValue(CHORD_GONE_PREFIX + irId) === true) {
    world.setStateValue(CHORD_GONE_PREFIX + irId, false);
  }
  return { arranged: true };
}

/**
 * `<timer> has started|expired` — the timer's record, written as the
 * runtime's verbs write it: a start stamps the current turn, expiry keeps
 * the record and flips its phase. A phase that already holds is left as
 * it is.
 */
function arrangeTimerPhase(world: WorldModel, pin: Extract<ParsedPin, { kind: 'timer-phase' }>, context: ArrangeContext): ArrangeResult {
  const key = timerKey(pin.timer);
  const record = (world.getStateValue(key) as TimerRecord | undefined) ?? IDLE_TIMER_RECORD;
  if (pin.what === 'started') {
    if (record.phase !== 'idle') return { arranged: true };
    if (context.turn === undefined) {
      return unrecognized(`starting ${pin.timer} needs the current turn, and the caller supplied none`);
    }
    const started: TimerRecord = { phase: 'running', index: 0, startedTurn: context.turn };
    world.setStateValue(key, started);
    return { arranged: true };
  }
  if (record.phase === 'expired') return { arranged: true };
  const expired: TimerRecord = { ...record, phase: 'expired' };
  world.setStateValue(key, expired);
  return { arranged: true };
}

/** `<entity>.isOpen|isLocked|isOn = true|false`. */
function arrangeFlag(world: WorldModel, pin: Extract<ParsedPin, { kind: 'property' }>): ArrangeResult {
  const writer = FLAG_WRITERS[pin.property];
  if (!writer) {
    return unrecognized(`"${pin.property}" is not a flag the floor arranges (isOpen, isLocked, isOn)`);
  }
  if (pin.value !== 'true' && pin.value !== 'false') {
    return unrecognized(`"${pin.value}" is not a flag value (true, false)`);
  }
  const entity = resolveEntity(world, pin.entity);
  if (!entity) return unrecognized(`entity "${pin.entity}" not found`);
  if (!writer(entity, pin.value === 'true')) {
    return unrecognized(`"${pin.entity}" has no trait carrying ${pin.property}`);
  }
  return { arranged: true };
}

/**
 * Resolve a pin name against the world: the player, an IR id, a world id,
 * a display name, an alias — in that order.
 */
function resolveEntity(world: WorldModel, name: string): IFEntity | undefined {
  if (name === 'player') {
    const player = world.getPlayer();
    if (player) return player;
  }
  const byWorldId = world.getEntity(name);
  if (byWorldId) return byWorldId;
  let byName: IFEntity | undefined;
  for (const entity of world.getAllEntities()) {
    if (entity.attributes[CHORD_IR_ID_ATTRIBUTE] === name) return entity;
    if (byName) continue;
    if (entity.name === name) {
      byName = entity;
      continue;
    }
    const identity = entity.get(TraitType.IDENTITY) as IdentityTrait | undefined;
    if (identity && (identity.name === name || identity.aliases?.includes(name))) byName = entity;
  }
  return byName;
}
