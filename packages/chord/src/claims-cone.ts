/**
 * claims-cone.ts — a claim's cone of influence over its necessary set
 * (ADR-365 D12).
 *
 * Purpose: say which things in a claim's `needs` the claim can never depend
 * on under that set, so the author can trim a padded set. Two passes over
 * the rules `claims-cone-rules.ts` reads off the IR. The firing pass asks
 * what can happen at all when the walk can only stand in the set's rooms,
 * name the set's things, and type the set's verbs: it tracks the story's
 * and each entity's possible states, each thing's possible places, and
 * which timers can start, growing them to a fixed point and switching off
 * every rule and statement whose guard is false under them. The relevance
 * pass then walks backwards from the predicate's reads over the live
 * statements: a statement that writes a relevant fact makes its rule's
 * guards, trigger, and conditions relevant too, until nothing new is added.
 * A set thing none of whose facts became relevant is inert for the claim.
 *
 * Soundness: the walk's identity hashes nothing outside the set, so a thing
 * is safe to drop exactly when the predicate cannot depend on it (D3). Both
 * passes over-approximate — a construct the cone cannot model widens a
 * may-set or adds a wildcard read — so the only error possible is a kept
 * thing that could have gone, never an inert thing that mattered. The
 * result is a proposal; nothing here changes the set the walk runs (D2).
 *
 * Public interface: `claimCone`, `ClaimConeResult`, `ClaimConeKept`,
 *   `ClaimConeSet`.
 * Owner context: Chord language frontend. Browser-safe, filesystem-free.
 */

import type { IRClaim } from './claims.js';
import {
  ANY,
  ANY_ROOM,
  OFFSTAGE,
  extractRules,
  resolveValue,
  valueReads,
  type ConeRule,
  type ConeSet,
  type ConeStatement,
  type ConeTrigger,
  type ConeWrite,
  type Fact,
} from './claims-cone-rules.js';
import type { IRCondition, IREntity, StoryIR } from './ir.js';
import type { Span } from './span.js';

/** The set a claim is checked against: resolved ids and lowercase verbs. */
export type ClaimConeSet = ConeSet;

/** A set thing the claim may depend on, and the first reason the cone found. */
export interface ClaimConeKept {
  thing: string;
  /** What reads the thing, in words: `the guard on the Hall's east exit (story.chord:12)`. */
  reason: string;
  /** Where that reader is; null when the claim's own predicate names the thing. */
  span: Span | null;
}

/** What the cone found for one claim under one set. */
export interface ClaimConeResult {
  kept: ClaimConeKept[];
  /** Set things the claim cannot depend on under this set, in set order. */
  inert: string[];
  /** The set's things minus the inert ones, in set order — the proposed line. */
  trimmedThings: string[];
}

type Truth = 'true' | 'false' | 'maybe';

interface Reason {
  label: string;
  span: Span | null;
}

const WILDCARD_READS: readonly Fact[] = ['state:*', 'place:*', 'flag:*'];
const MAX_CONDITION_DEPTH = 24;

/**
 * Compute a claim's cone of influence over its effective set.
 *
 * @param ir the compiled story
 * @param claim the lowered claim (one predicate key set)
 * @param set the claim's effective set — its own `needs` where present, else the block's
 * @returns the kept things with reasons, the inert things, and the trimmed list
 */
export function claimCone(ir: StoryIR, claim: IRClaim, set: ClaimConeSet): ClaimConeResult {
  const rules = extractRules(ir, set);
  const world = new ConeWorld(ir, set);
  const live = world.fire(rules);
  const relevant = closure(predicateReads(claim), live, world);
  return report(set, relevant);
}

// ---------------------------------------------------------------------------
// the firing pass: what can happen under the set
// ---------------------------------------------------------------------------

/** The may-sets the firing pass grows, and the three-valued evaluator over them. */
class ConeWorld {
  private readonly entityById = new Map<string, IREntity>();
  private readonly roomIds = new Set<string>();
  private readonly declaredStates = new Map<string, Set<string>>();
  private readonly initiative = new Set<string>();
  private readonly setThings: Set<string>;
  private readonly mayStates = new Map<string, Set<string>>();
  private readonly mayPlaces = new Map<string, Set<string>>();
  /**
   * The places a thing may be that the walk did not choose: where it starts
   * and where rules put it. Reaching the thing depends on these holders;
   * a holder only a `put` or `give` of the walk's own could pick does not
   * count, since the walk can as well not have done it.
   */
  private readonly heldPlaces = new Map<string, Set<string>>();
  private readonly startedTimers = new Set<string>();
  private readonly placeChanged = new Set<string>();
  private widened = false;

  constructor(private readonly ir: StoryIR, set: ClaimConeSet) {
    this.setThings = new Set(set.things);
    const traitStates = new Map<string, string[]>((ir.traits ?? []).map((t) => [t.name, t.states ?? []]));
    for (const entity of ir.entities) {
      this.entityById.set(entity.id, entity);
      if (entity.kinds.some((k) => k.name === 'room')) this.roomIds.add(entity.id);
      if (entity.initiative?.length) this.initiative.add(entity.id);
      const states = [...(entity.states ?? [])];
      for (const t of entity.traits) states.push(...(traitStates.get(t.name) ?? []));
      if (states.length) {
        this.declaredStates.set(entity.id, new Set(states));
        this.mayStates.set(entity.id, new Set([states[0]]));
      }
      if (entity.placement) this.addPlace(entity.id, entity.placement.place);
      for (const member of entity.containing ?? []) this.addPlace(member.id, entity.id);
      for (const id of entity.carries ?? []) this.addPlace(id, entity.id);
      for (const id of entity.wears ?? []) this.addPlace(id, entity.id);
    }
    if (ir.story.states.length) {
      this.declaredStates.set('story', new Set(ir.story.states));
      this.mayStates.set('story', new Set([ir.story.states[0]]));
    }
    this.mayPlaces.set('player', new Set(set.rooms));
  }

  /**
   * Grow the may-sets to a fixed point and return every rule that can fire,
   * with the statements of its body that can run.
   */
  fire(rules: readonly ConeRule[]): Map<ConeRule, ConeStatement[]> {
    const live = new Map<ConeRule, ConeStatement[]>();
    let changed = true;
    while (changed) {
      changed = false;
      for (const rule of rules) {
        if (!this.triggerLive(rule.trigger)) continue;
        if (rule.guards.some((g) => this.evaluate(g.condition, rule.owner, 0) === 'false')) continue;
        if (rule.refusedBy.some((r) => r.guards.every((g) => this.evaluate(g.condition, rule.owner, 0) === 'true') && (r.when === null || this.evaluate(r.when.condition, rule.owner, 0) === 'true'))) continue;
        const statements = rule.body.filter((s) => s.whens.every((w) => this.evaluate(w, rule.owner, 0) !== 'false'));
        const before = live.get(rule);
        if (!before || before.length !== statements.length) {
          live.set(rule, statements);
          changed = true;
        }
        for (const s of statements) for (const w of s.writes) if (this.apply(w)) changed = true;
      }
    }
    return live;
  }

  /** Whether an id names a room. */
  isRoom(id: string): boolean {
    return this.roomIds.has(id);
  }

  /** Whether `word` is one of the entity's declared states (its own or a composed trait's). */
  hasDeclaredState(id: string, word: string): boolean {
    return this.declaredStates.get(id)?.has(word) ?? false;
  }

  /** The facts every chapter trigger reads — what a `chapter` condition depends on. */
  chapterReads(): Fact[] {
    const reads: Fact[] = [];
    for (const chapter of this.ir.chapters ?? []) {
      const t = chapter.trigger;
      if (t.kind === 'first-visit') reads.push('place:player');
      else if (t.kind === 'timer-expires') reads.push(`timer:${t.timer}`);
      else if (t.kind === 'becomes') reads.push(`state:${t.owner}`);
    }
    return reads;
  }

  /**
   * What acting on a thing depends on: its own place, the player's, and the
   * flags and places of everything that may hold it (a closed box, a pocket),
   * through the whole holder chain the firing pass found possible.
   */
  reachReads(id: string, visiting: Set<string> = new Set()): Fact[] {
    if (id === ANY) return [...WILDCARD_READS];
    if (id === 'player' || id === 'story') return ['place:player'];
    const reads: Fact[] = [`place:${id}`];
    if (visiting.has(id)) return reads;
    visiting.add(id);
    for (const place of this.heldPlaces.get(id) ?? []) {
      if (place === OFFSTAGE) continue;
      if (place === ANY) {
        reads.push(...WILDCARD_READS);
      } else if (place === 'player' || place === ANY_ROOM || this.roomIds.has(place)) {
        reads.push('place:player');
      } else {
        reads.push(`flag:${place}`, ...this.reachReads(place, visiting));
      }
    }
    return reads;
  }

  /** A `define condition` by name, with whether it leaves `it` free. */
  namedCondition(name: string): { condition: IRCondition; open: boolean } | undefined {
    return this.ir.conditions.find((c) => c.name === name);
  }

  // ---- triggers ----------------------------------------------------------

  private triggerLive(trigger: ConeTrigger): boolean {
    switch (trigger.kind) {
      case 'always':
        return true;
      case 'action': {
        if (!trigger.byPlayer) return true;
        if (!trigger.reachable) return false;
        if (trigger.owner === 'player' || trigger.owner === ANY) return true;
        if (this.roomIds.has(trigger.owner)) return this.mayBeIn('player', trigger.owner) !== 'false';
        return this.setThings.has(trigger.owner);
      }
      case 'timer':
        return this.startedTimers.has(trigger.timer);
      case 'moves':
        return trigger.mover === 'player' || trigger.mover === ANY || this.placeChanged.has(trigger.mover);
      case 'becomes':
        return this.mayHaveState(trigger.owner, trigger.state) !== 'false';
      case 'converse':
        return this.setThings.has(trigger.owner) || this.initiative.has(trigger.owner);
    }
  }

  // ---- writes ------------------------------------------------------------

  private apply(write: ConeWrite): boolean {
    if (write.fact === ANY) return this.widen();
    const colon = write.fact.indexOf(':');
    if (colon < 0) return false;
    const kind = write.fact.slice(0, colon);
    const id = write.fact.slice(colon + 1);
    switch (kind) {
      case 'state': {
        const value = write.value ?? ANY;
        if (id === ANY) {
          let changed = false;
          for (const [owner, states] of this.declaredStates) {
            if (value === ANY || states.has(value)) changed = this.addStates(owner, value === ANY ? [...states] : [value]) || changed;
          }
          return changed;
        }
        const declared = this.declaredStates.get(id);
        if (!declared) return false;
        return this.addStates(id, value === ANY ? [...declared] : [value]);
      }
      case 'place': {
        const value = write.value ?? ANY;
        if (id === ANY) {
          let changed = false;
          for (const entity of this.ir.entities) changed = this.addPlace(entity.id, ANY, true) || changed;
          return changed;
        }
        return this.addPlace(id, value, true, write.chosen === true);
      }
      case 'timer':
        if (write.value === 'started' && !this.startedTimers.has(id)) {
          this.startedTimers.add(id);
          return true;
        }
        return false;
      default:
        return false;
    }
  }

  private widen(): boolean {
    if (this.widened) return false;
    this.widened = true;
    for (const [id, states] of this.declaredStates) this.addStates(id, [...states]);
    for (const entity of this.ir.entities) this.addPlace(entity.id, ANY, true);
    this.addPlace('player', ANY, true);
    for (const timer of this.ir.timers ?? []) this.startedTimers.add(timer.qualified);
    return true;
  }

  private addStates(id: string, states: readonly string[]): boolean {
    let set = this.mayStates.get(id);
    if (!set) {
      set = new Set();
      this.mayStates.set(id, set);
    }
    let changed = false;
    for (const s of states) {
      if (!set.has(s)) {
        set.add(s);
        changed = true;
      }
    }
    return changed;
  }

  private addPlace(id: string, place: string, byRule = false, chosen = false): boolean {
    let set = this.mayPlaces.get(id);
    if (!set) {
      set = new Set();
      this.mayPlaces.set(id, set);
    }
    if (byRule) this.placeChanged.add(id);
    if (!chosen) {
      let held = this.heldPlaces.get(id);
      if (!held) {
        held = new Set();
        this.heldPlaces.set(id, held);
      }
      held.add(place);
    }
    if (set.has(place)) return false;
    set.add(place);
    return true;
  }

  // ---- the three-valued evaluator ----------------------------------------

  evaluate(condition: IRCondition, owner: string | null, depth: number): Truth {
    if (depth > MAX_CONDITION_DEPTH) return 'maybe';
    switch (condition.kind) {
      case 'and': {
        let all: Truth = 'true';
        for (const operand of condition.operands) {
          const t = this.evaluate(operand, owner, depth + 1);
          if (t === 'false') return 'false';
          if (t === 'maybe') all = 'maybe';
        }
        return all;
      }
      case 'or': {
        let any: Truth = 'false';
        for (const operand of condition.operands) {
          const t = this.evaluate(operand, owner, depth + 1);
          if (t === 'true') return 'true';
          if (t === 'maybe') any = 'maybe';
        }
        return any;
      }
      case 'not':
        return negate(this.evaluate(condition.operand, owner, depth + 1));
      case 'story-state':
        return this.mayHaveState('story', condition.state);
      case 'timer-has':
        return this.startedTimers.has(condition.timer) ? 'maybe' : 'false';
      case 'condition': {
        const named = this.namedCondition(condition.name);
        if (!named) return 'maybe';
        return this.evaluate(named.condition, owner, depth + 1);
      }
      case 'predicate':
        return this.evaluatePredicate(condition, owner);
      default:
        return 'maybe';
    }
  }

  private evaluatePredicate(condition: Extract<IRCondition, { kind: 'predicate' }>, owner: string | null): Truth {
    const subjects = resolveValue(condition.subject, { owner });
    const subject = subjects.length === 1 ? subjects[0] : ANY;
    if (subject === ANY) return 'maybe';
    let truth: Truth = 'maybe';
    switch (condition.pred) {
      case 'is': {
        if (condition.object.kind !== 'symbol') break;
        const word = condition.object.name;
        if (!this.hasDeclaredState(subject, word)) break;
        truth = this.mayHaveState(subject, word);
        break;
      }
      case 'is-in': {
        const places = resolveValue(condition.object, { owner });
        if (places.length !== 1 || places[0] === ANY) break;
        truth = this.mayBeIn(subject, places[0]);
        break;
      }
      case 'is-here': {
        const here = owner === null ? new Set([ANY]) : this.roomIds.has(owner) ? new Set([owner]) : this.mayRooms(owner, new Set());
        truth = overlap(this.mayRooms(subject, new Set()), here);
        break;
      }
      case 'has':
      case 'holds': {
        const objects = resolveValue(condition.object, { owner });
        if (objects.length !== 1 || objects[0] === ANY) break;
        truth = this.mayBeIn(objects[0], subject);
        break;
      }
      default:
        break;
    }
    return condition.negated ? negate(truth) : truth;
  }

  private mayHaveState(id: string, state: string): Truth {
    const states = this.mayStates.get(id);
    if (!states) return 'maybe';
    if (!states.has(state)) return 'false';
    return states.size === 1 ? 'true' : 'maybe';
  }

  /** Whether `thing` may be in `place` — a room by the room closure, anything else by direct containment. */
  private mayBeIn(thing: string, place: string): Truth {
    if (this.roomIds.has(place)) return overlap(this.mayRooms(thing, new Set()), new Set([place]));
    const places = this.mayPlaces.get(thing);
    if (!places) return 'false';
    if (places.has(ANY)) return 'maybe';
    if (!places.has(place)) return 'false';
    return places.size === 1 ? 'true' : 'maybe';
  }

  /** The rooms a thing may stand in, through whatever holds it; `*` when unknown. */
  private mayRooms(id: string, visiting: Set<string>): Set<string> {
    const rooms = new Set<string>();
    if (id === ANY || id === 'story') return new Set([ANY]);
    if (this.roomIds.has(id)) return new Set([id]);
    const places = this.mayPlaces.get(id);
    if (!places) return id === 'player' ? new Set([ANY]) : rooms;
    if (visiting.has(id)) return new Set([ANY]);
    visiting.add(id);
    for (const place of places) {
      if (place === OFFSTAGE) continue;
      if (place === ANY || place === ANY_ROOM) {
        rooms.add(ANY);
        continue;
      }
      if (this.roomIds.has(place)) {
        rooms.add(place);
        continue;
      }
      if (place === 'player' || this.entityById.has(place)) {
        for (const r of this.mayRooms(place, visiting)) rooms.add(r);
        continue;
      }
      rooms.add(ANY);
    }
    visiting.delete(id);
    return rooms;
  }
}

function negate(truth: Truth): Truth {
  if (truth === 'true') return 'false';
  if (truth === 'false') return 'true';
  return 'maybe';
}

/** Three-valued overlap of two room sets, either of which may hold `*`. */
function overlap(a: ReadonlySet<string>, b: ReadonlySet<string>): Truth {
  if (a.has(ANY) || b.has(ANY)) return a.size && b.size ? 'maybe' : 'false';
  let common = 0;
  for (const x of a) if (b.has(x)) common++;
  if (common === 0) return 'false';
  return a.size === 1 && b.size === 1 ? 'true' : 'maybe';
}

// ---------------------------------------------------------------------------
// the relevance pass: what the predicate can depend on
// ---------------------------------------------------------------------------

/**
 * The facts a claim's predicate reads. Every claim also reads `ending`: an
 * ending cuts a run short, so whatever brings one on or holds one off shapes
 * which states any claim can reach. A claim with no predicate reads everything.
 */
function predicateReads(claim: IRClaim): Fact[] {
  if (claim.room !== undefined) return ['place:player', 'ending'];
  if (claim.placement) return [`place:${claim.placement.thing}`, 'ending'];
  if (claim.state) return [`state:${claim.state.entity}`, 'ending'];
  if (claim.flag) return [`flag:${claim.flag.thing}`, 'ending'];
  if (claim.fired !== undefined) return [`fired:${claim.fired}`, 'ending'];
  if (claim.event) return claim.event.target ? [`event:${claim.event.type}`, `place:${claim.event.target}`, 'ending'] : [`event:${claim.event.type}`, 'ending'];
  if (claim.ending) return ['ending'];
  return [ANY];
}

function closure(seed: readonly Fact[], live: ReadonlyMap<ConeRule, ConeStatement[]>, world: ConeWorld): Map<Fact, Reason> {
  const relevant = new Map<Fact, Reason>();
  const predicate: Reason = { label: "the claim's predicate", span: null };
  for (const fact of seed) relevant.set(fact, predicate);

  const add = (facts: readonly Fact[], reason: Reason): boolean => {
    let changed = false;
    for (const fact of facts) {
      if (!relevant.has(fact)) {
        relevant.set(fact, reason);
        changed = true;
      }
    }
    return changed;
  };

  let changed = true;
  while (changed) {
    changed = false;
    for (const [rule, statements] of live) {
      for (const statement of statements) {
        if (!statement.writes.some((w) => matches(w.fact, relevant))) continue;
        // Each read is attributed to the line that reads it: the trigger to the rule, a guard to its own line, a `when` to its statement.
        const triggerReads: Fact[] = [];
        for (const read of rule.reads) triggerReads.push(...(read.startsWith('reach:') ? world.reachReads(read.slice('reach:'.length)) : [read]));
        if (add(triggerReads, { label: rule.label, span: rule.span })) changed = true;
        for (const guard of [...rule.guards, ...rule.readConditions]) {
          if (add(conditionReads(guard.condition, rule.owner, world, 0), { label: rule.label, span: guard.span })) changed = true;
        }
        const whenReads: Fact[] = [...statement.reads];
        for (const when of statement.whens) whenReads.push(...conditionReads(when, rule.owner, world, 0));
        if (add(whenReads, { label: statement.label, span: statement.span })) changed = true;
      }
    }
  }
  return relevant;
}

/** Whether a written fact is one the closure already depends on, wildcards on either side included. */
function matches(fact: Fact, relevant: ReadonlyMap<Fact, Reason>): boolean {
  if (relevant.has(ANY)) return true;
  if (fact === ANY) return relevant.size > 0;
  if (relevant.has(fact)) return true;
  const colon = fact.indexOf(':');
  if (colon < 0) return false;
  const kind = fact.slice(0, colon);
  if (relevant.has(`${kind}:*`)) return true;
  if (fact.slice(colon + 1) === ANY) {
    for (const key of relevant.keys()) if (key.startsWith(`${kind}:`)) return true;
  }
  return false;
}

/** The facts a condition reads, with `it` bound to the rule's owner. */
function conditionReads(condition: IRCondition, owner: string | null, world: ConeWorld, depth: number): Fact[] {
  if (depth > MAX_CONDITION_DEPTH) return [...WILDCARD_READS];
  switch (condition.kind) {
    case 'and':
    case 'or':
      return condition.operands.flatMap((c) => conditionReads(c, owner, world, depth + 1));
    case 'not':
      return conditionReads(condition.operand, owner, world, depth + 1);
    case 'story-state':
      return ['state:story'];
    case 'timer-has':
      return [`timer:${condition.timer}`];
    case 'chapter':
      return world.chapterReads();
    case 'condition': {
      const named = world.namedCondition(condition.name);
      if (!named) return [...WILDCARD_READS];
      if (named.open && owner === null) return [...WILDCARD_READS];
      return conditionReads(named.condition, owner, world, depth + 1);
    }
    case 'any-of':
    case 'none-of':
      return [...WILDCARD_READS];
    case 'satisfies':
      return [...WILDCARD_READS, ...resolveValue(condition.subject, { owner }).flatMap((id) => [`state:${id}`, `place:${id}`, `flag:${id}`])];
    case 'compare':
      return [...valueReads(condition.left, { owner }), ...valueReads(condition.right, { owner })];
    case 'feels':
      return [...resolveValue(condition.subject, { owner }), ...resolveValue(condition.target, { owner })].map((id) => `flag:${id}`);
    case 'knows-topic':
      return resolveValue(condition.subject, { owner }).map((id) => `flag:${id}`);
    case 'predicate':
      return predicateConditionReads(condition, owner, world);
    default:
      return [];
  }
}

function predicateConditionReads(condition: Extract<IRCondition, { kind: 'predicate' }>, owner: string | null, world: ConeWorld): Fact[] {
  const subjects = resolveValue(condition.subject, { owner });
  const objects = resolveValue(condition.object, { owner });
  switch (condition.pred) {
    case 'is':
      if (condition.object.kind === 'symbol') {
        const word = condition.object.name;
        return subjects.map((id) => (id === ANY || world.hasDeclaredState(id, word) ? `state:${id}` : `flag:${id}`));
      }
      return subjects.flatMap((id) => [`state:${id}`, `flag:${id}`]);
    case 'is-a':
      return [];
    case 'is-in':
      return subjects.map((id) => `place:${id}`);
    case 'is-here': {
      const reads = subjects.map((id) => `place:${id}`);
      if (owner !== null && !world.isRoom(owner)) reads.push(`place:${owner}`);
      if (owner === null) reads.push('place:player');
      return reads;
    }
    case 'has':
    case 'holds':
      return objects.map((id) => `place:${id}`);
    case 'wears':
      return objects.flatMap((id) => [`flag:${id}`, `place:${id}`]);
    case 'can-see':
    case 'can-reach':
      return [...objects.map((id) => `place:${id}`), ...subjects.map((id) => `place:${id}`)];
  }
}

// ---------------------------------------------------------------------------
// the report
// ---------------------------------------------------------------------------

function report(set: ClaimConeSet, relevant: ReadonlyMap<Fact, Reason>): ClaimConeResult {
  const kept: ClaimConeKept[] = [];
  const inert: string[] = [];
  const isWildcard = (key: Fact) => key === ANY || WILDCARD_READS.includes(key);
  for (const thing of set.things) {
    const isOwn = (key: Fact) => key === `state:${thing}` || key === `place:${thing}` || key === `flag:${thing}` || key.startsWith(`counter:${thing}.`) || key.startsWith(`fired:${thing}.`);
    // The earliest recorded reason wins: a wildcard that came first is what made the thing's own facts relevant.
    const first = firstOf(relevant, (key) => isOwn(key) || isWildcard(key));
    if (!first) {
      inert.push(thing);
      continue;
    }
    const text = isWildcard(first.key) ? `${describe(first.reason)}, which the cone cannot narrow` : describe(first.reason);
    kept.push({ thing, reason: text, span: first.reason.span });
  }
  return { kept, inert, trimmedThings: set.things.filter((t) => !inert.includes(t)) };
}

/** The earliest-recorded fact satisfying the test, with its reason; insertion order is discovery order. */
function firstOf(relevant: ReadonlyMap<Fact, Reason>, test: (key: Fact) => boolean): { key: Fact; reason: Reason } | undefined {
  for (const [key, reason] of relevant) if (test(key)) return { key, reason };
  return undefined;
}

function describe(reason: Reason): string {
  if (!reason.span) return reason.label;
  return `${reason.label} (${reason.span.file ?? 'the story'}:${reason.span.line})`;
}
