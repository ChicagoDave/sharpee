/**
 * claims-cone-rules.ts — flatten a story's IR into the rules the claim cone
 * reasons over (ADR-365 D12).
 *
 * Purpose: the cone needs every way the world can change, each with the
 * condition under which it fires. This module reads them off the IR into one
 * uniform shape: a rule has a trigger (what makes it run), an owner (what
 * `it` means inside it), guards (the clause's conditions), and a body of
 * statements, each carrying the facts it writes and the conditions that
 * gate it. The walk's own moves are rules too: an exit into a set room, and
 * each set verb applied to each set thing, as the standard action's effect.
 *
 * A fact is a string: `state:<id>`, `place:<id>`, `flag:<id>`,
 * `counter:<owner>.<name>`, `timer:<qualified>`, `fired:<id>.<action>`,
 * `event:<type>`, `ending`, `chapter`. `*` after the colon is a wildcard
 * (any entity's state); a bare `*` is anything at all. Wildcards are how an
 * unmodelled construct widens the cone instead of narrowing it.
 *
 * Public interface: `extractRules`, `resolveValue`, `valueReads`, `ANY`,
 *   `OFFSTAGE`, `ConeRule`, `ConeStatement`, `ConeWrite`, `ConeTrigger`,
 *   `ConeSet`, `Fact`, `ValueBinding`.
 * Owner context: Chord language frontend. Browser-safe, filesystem-free.
 */

import type {
  IRActionDef,
  IRCondition,
  IREntity,
  IRGoalStep,
  IROnClause,
  IRPatternPart,
  IRStatement,
  IRValue,
  StoryIR,
} from './ir.js';
import type { Span } from './span.js';
import { STDLIB_MANIFEST } from './stdlib-manifest.js';

/** A tracked fact about the world; see the module header for the forms. */
export type Fact = string;

/** `*` as an entity id: any entity — a slot, an `each` match, an unresolved reference. */
export const ANY = '*';
/** The place of a thing that is nowhere: offstage, removed, or never placed. */
export const OFFSTAGE = 'offstage';
/**
 * The place of a thing that is in some room, which one unknown: dropped,
 * moved to a random adjacent room, an actor who walked off. Unlike `*` it
 * is never inside a holder, so reaching it depends on no holder's flags.
 */
export const ANY_ROOM = 'room:*';

/** What makes a rule run. */
export type ConeTrigger =
  /** Runs on its own: the start block, an every-turn clause, the walk's own commands. */
  | { kind: 'always' }
  /**
   * An action clause: `on`/`after <actor> <action>` bound to `owner` (an entity
   * id, `player`, or `*`). `reachable` says whether some set verb (or a
   * direction) can perform the action at all.
   */
  | { kind: 'action'; action: string; owner: string; byPlayer: boolean; reachable: boolean }
  /** `when <timer> expires` and a timer's `meanwhile`: runs only once the timer has started. */
  | { kind: 'timer'; timer: string }
  /** `when <mover> moves`: runs only if the mover's place can change. */
  | { kind: 'moves'; mover: string }
  /** A `becomes` anchor: runs only if `owner` can reach `state`. */
  | { kind: 'becomes'; owner: string; state: string }
  /** A conversation body: topics, exchanges, scenes of `owner`. */
  | { kind: 'converse'; owner: string };

/** One fact a statement writes, with the value when the cone tracks values. */
export interface ConeWrite {
  fact: Fact;
  /** A state word, a place id, `offstage`, `started`, or `*` when unknown; null for untracked facts. */
  value: string | null;
  /**
   * A place the player's own two-object command chose (put it in the box,
   * give it to Tobias). The thing may be there, so conditions over it stay
   * open, but reaching it never depends on that holder: the walk can as
   * well not have put it there. A holder a rule chose is not optional.
   */
  chosen?: true;
}

/** One leaf statement with every condition gating it, innermost last. */
export interface ConeStatement {
  writes: ConeWrite[];
  whens: IRCondition[];
  /** Facts the statement reads besides its conditions (a `select on` subject, an `each` sweep). */
  reads: Fact[];
  span: Span;
  label: string;
}

/** A condition with the line it was written on, so a kept thing can name its reader. */
export interface ConeGuard {
  condition: IRCondition;
  span: Span;
}

/** One rule: how it fires, what `it` is, what gates it, what it does. */
export interface ConeRule {
  trigger: ConeTrigger;
  /** The entity `it` names inside the rule; null when there is none. */
  owner: string | null;
  /** Conditions that must hold for the rule to run at all; a false one switches the rule off. */
  guards: ConeGuard[];
  /**
   * Conditions the rule's effect depends on without gating it: a `must`, a
   * `refuse when`, an `on` clause that can refuse the standard action. They
   * are read, never evaluated, since a false one stops a refusal, not the rule.
   */
  readConditions: ConeGuard[];
  /**
   * Facts the trigger itself reads: `reach:<id>` for the thing acted on
   * (expanded by the cone to its place and every holder's flags), the
   * timer, the mover.
   */
  reads: Fact[];
  /**
   * The `on` clauses that refuse the action this rule rides on. When one of
   * them certainly fires — its guards all true and its refusal unconditional
   * or certainly true — the action never completes, so neither the standard
   * effect nor any `after` clause runs.
   */
  refusedBy: ConeRefusal[];
  body: ConeStatement[];
  span: Span;
  label: string;
}

/** One `on` clause that can refuse an action: its guards, and the refusal's own condition (null = unconditional). */
export interface ConeRefusal {
  guards: ConeGuard[];
  when: ConeGuard | null;
}

/** Zero or one guard from an optional condition. */
const guardsOf = (condition: IRCondition | null | undefined, span: Span): ConeGuard[] => (condition ? [{ condition, span }] : []);

/** The set a claim is checked against: resolved ids and lowercase verbs. */
export interface ConeSet {
  rooms: readonly string[];
  things: readonly string[];
  verbs: readonly string[];
}

/** How `it`, `the match`, and grammar slots resolve inside a rule. */
export interface ValueBinding {
  owner: string | null;
  slots?: ReadonlyMap<string, readonly string[]>;
}

/** Actions the walk performs by direction, never by a set verb. */
const MOVEMENT_ACTIONS = new Set(['going', 'entering', 'leaving', 'exiting']);

/**
 * The standard actions' effects on their object, by action name, for the
 * walk's commands and for `act` statements. Anything not listed is assumed
 * to change its object's flags and place.
 */
const STANDARD_EFFECTS: Readonly<Record<string, ReadonlyArray<'take' | 'displace' | 'flag' | 'consume' | 'move-actor' | 'none'>>> = {
  taking: ['take'],
  removing: ['take'],
  dropping: ['displace'],
  putting: ['displace'],
  inserting: ['displace'],
  giving: ['displace'],
  throwing: ['displace'],
  opening: ['flag'],
  closing: ['flag'],
  locking: ['flag'],
  unlocking: ['flag'],
  switching_on: ['flag'],
  switching_off: ['flag'],
  wearing: ['flag'],
  taking_off: ['flag'],
  reading: ['flag'],
  turning: ['flag'],
  pushing: ['flag', 'displace'],
  pulling: ['flag', 'displace'],
  eating: ['consume'],
  drinking: ['consume'],
  going: ['move-actor'],
  entering: ['move-actor'],
  exiting: ['move-actor'],
  climbing: ['move-actor'],
  examining: ['none'],
  looking: ['none'],
  listening: ['none'],
  smelling: ['none'],
  touching: ['none'],
  searching: ['none'],
  waiting: ['none'],
  talking: ['none'],
  asking: ['none'],
  telling: ['none'],
  showing: ['none'],
  inventory: ['none'],
  scoring: ['none'],
  helping: ['none'],
  thinking: ['none'],
};

/**
 * Resolve a value to the entity ids it may denote under a binding.
 *
 * @param value the IR value
 * @param binding what `it` and the slots mean here
 * @returns entity ids, `player`, `story`, or `*` when the value could be any entity; empty for literals and symbols
 */
export function resolveValue(value: IRValue, binding: ValueBinding): string[] {
  switch (value.kind) {
    case 'entity':
      return [value.id];
    case 'player':
      return ['player'];
    case 'story':
      return ['story'];
    case 'it':
      return [binding.owner ?? ANY];
    case 'match':
      return [ANY];
    case 'slot': {
      const bound = binding.slots?.get(value.name);
      return bound ? [...bound] : [ANY];
    }
    case 'field':
      return resolveValue(value.base, binding);
    case 'counter':
      return value.owner ? resolveValue(value.owner, binding) : ['story'];
    case 'literal':
    case 'symbol':
    case 'timer':
      return [];
  }
}

/**
 * Read a story's IR into the rules the cone walks, including the walk's own
 * commands under the set.
 *
 * @param ir the compiled story
 * @param set the claim's effective set
 * @returns every rule, in IR order, then the walk's pseudo-rules
 */
export function extractRules(ir: StoryIR, set: ConeSet): ConeRule[] {
  return new RuleExtractor(ir, set).extract();
}

class RuleExtractor {
  private readonly rules: ConeRule[] = [];
  private readonly entityById = new Map<string, IREntity>();
  private readonly entityByName = new Map<string, string>();
  private readonly actionsByName = new Map<string, IRActionDef>();
  private readonly roomIds = new Set<string>();
  private readonly setRooms: Set<string>;
  private readonly setThings: Set<string>;
  /** Per entity, per action: the conditions under which its `on` clauses can refuse or replace the standard action. */
  private readonly refusals = new Map<string, Map<string, ConeGuard[]>>();
  /** Per entity, per action: the `on` clauses whose refusal can be proven certain. */
  private readonly definiteRefusals = new Map<string, Map<string, ConeRefusal[]>>();
  /** `after` rules awaiting their action's refusals, attached once every clause is read. */
  private readonly afterRules: Array<{ rule: ConeRule; owner: string; action: string }> = [];

  constructor(private readonly ir: StoryIR, private readonly set: ConeSet) {
    for (const entity of ir.entities) {
      this.entityById.set(entity.id, entity);
      this.entityByName.set(entity.name.toLowerCase(), entity.id);
      for (const alias of entity.aka) if (!this.entityByName.has(alias.toLowerCase())) this.entityByName.set(alias.toLowerCase(), entity.id);
      if (entity.kinds.some((kind) => kind.name === 'room')) this.roomIds.add(entity.id);
    }
    for (const action of ir.actions ?? []) this.actionsByName.set(action.name, action);
    this.setRooms = new Set(set.rooms);
    this.setThings = new Set(set.things);
  }

  extract(): ConeRule[] {
    this.storyRules();
    for (const entity of this.ir.entities) this.entityRules(entity);
    this.traitRules();
    for (const { rule, owner, action } of this.afterRules) rule.refusedBy = this.definiteRefusals.get(owner)?.get(action) ?? [];
    this.timerRules();
    this.sequenceRules();
    this.machineRules();
    this.actionRules();
    this.walkRules();
    return this.rules;
  }

  // ---- the story's own clauses --------------------------------------------

  private storyRules(): void {
    const { ir } = this;
    if (ir.startBlock) {
      this.push({ kind: 'always' }, null, [], [], ir.startBlock.body, ir.startBlock.span, 'the start block');
    }
    for (const clause of ir.story.onClauses ?? []) this.onClauseRule(clause, null, []);
    for (const clause of ir.story.timerClauses ?? []) {
      this.push({ kind: 'timer', timer: clause.timer }, null, guardsOf(clause.condition, clause.span), [`timer:${clause.timer}`], clause.body, clause.span, 'a timer clause of the story');
    }
  }

  // ---- an entity's clauses ------------------------------------------------

  private entityRules(entity: IREntity): void {
    const owner = entity.id;
    for (const clause of entity.onClauses ?? []) this.onClauseRule(clause, owner, []);
    for (const clause of entity.timerClauses ?? []) {
      this.push({ kind: 'timer', timer: clause.timer }, owner, guardsOf(clause.condition, clause.span), [`timer:${clause.timer}`], clause.body, clause.span, `a timer clause of ${entity.name}`);
    }
    for (const clause of entity.moveClauses ?? []) {
      const movers = resolveValue(clause.mover, { owner });
      for (const mover of movers.length ? movers : [ANY]) {
        this.push({ kind: 'moves', mover }, owner, guardsOf(clause.condition, clause.span), [`place:${mover}`], clause.body, clause.span, `a move clause of ${entity.name}`);
      }
    }
    const reach = `reach:${owner}`;
    for (const row of entity.topics ?? []) {
      this.push({ kind: 'converse', owner }, owner, [], [reach], row.body, row.span, `a topic of ${entity.name}`, [{ fact: 'event:if.event.asked', value: null }]);
    }
    for (const row of entity.greetings ?? []) {
      this.push({ kind: 'always' }, owner, [], [reach], row.body, row.span, `a greeting of ${entity.name}`);
    }
    for (const exchange of entity.exchanges ?? []) {
      for (const row of exchange.rows) {
        this.push({ kind: 'converse', owner }, owner, [], [reach], row.body, row.span, `the exchange \`${exchange.name}\` of ${entity.name}`, [{ fact: 'event:if.event.asked', value: null }]);
      }
    }
    for (const row of entity.initiative ?? []) {
      this.push({ kind: 'always' }, owner, guardsOf(row.condition, row.span), [reach], row.body, row.span, `an initiative row of ${entity.name}`);
    }
    for (const conversation of entity.conversations ?? []) {
      const guards = guardsOf(conversation.opensWhen, conversation.span);
      const label = `the conversation \`${conversation.name}\` of ${entity.name}`;
      for (const beat of conversation.beats) {
        this.push({ kind: 'converse', owner }, owner, [...guards, ...guardsOf(beat.condition, beat.span)], [reach], beat.body, beat.span, label);
      }
      for (const body of [conversation.onParting, conversation.onResuming, conversation.onRefusing, conversation.conclusion]) {
        if (body && body.length) this.push({ kind: 'converse', owner }, owner, guards, [reach], body, conversation.span, label);
      }
    }
    for (const goal of entity.character?.goals ?? []) this.goalRule(entity, goal.activeWhen, goal.steps, goal.span);
    if (entity.deadly && this.setRooms.has(owner)) {
      this.pushLeaf({ kind: 'always' }, owner, [], [`place:player`], [{ fact: 'ending', value: null }], entity.deadly.span, `the deadly room ${entity.name}`);
    }
    if (entity.landing && this.setRooms.has(owner)) {
      this.pushLeaf({ kind: 'always' }, owner, [], [`place:player`], [{ fact: 'place:player', value: ANY_ROOM }], entity.landing.span, `the landing of ${entity.name}`);
    }
  }

  private goalRule(entity: IREntity, activeWhen: IRCondition | null, steps: readonly IRGoalStep[], span: Span): void {
    const owner = entity.id;
    const writes: ConeWrite[] = [];
    for (const step of steps) {
      switch (step.kind) {
        case 'move-to':
        case 'seek':
          writes.push({ fact: `place:${owner}`, value: ANY_ROOM });
          break;
        case 'acquire':
          writes.push({ fact: `place:${step.target}`, value: owner });
          break;
        case 'give':
          writes.push({ fact: `place:${step.item}`, value: step.target });
          break;
        case 'drop':
          writes.push({ fact: `place:${step.item}`, value: step.in ?? ANY_ROOM });
          break;
        case 'perform': {
          const objects = [step.slots.directObject, step.slots.indirectObject, step.slots.instrument].filter((v): v is string => typeof v === 'string');
          writes.push(...standardWrites(step.action, objects, owner));
          break;
        }
        case 'wait-for':
        case 'act':
        case 'say':
          break;
      }
    }
    if (writes.length) this.pushLeaf({ kind: 'always' }, owner, guardsOf(activeWhen, span), [`place:${owner}`], writes, span, `a goal of ${entity.name}`);
  }

  // ---- trait clauses, one instance per composing entity --------------------

  private traitRules(): void {
    for (const trait of this.ir.traits ?? []) {
      if (!trait.onClauses?.length) continue;
      for (const entity of this.ir.entities) {
        const composition = entity.traits.find((t) => t.name === trait.name);
        if (!composition) continue;
        const guards = guardsOf(composition.condition, composition.span);
        for (const clause of trait.onClauses) this.onClauseRule(clause, entity.id, guards, `the trait \`${trait.name}\` on ${entity.name}`);
      }
    }
  }

  private onClauseRule(clause: IROnClause, owner: string | null, extraGuards: ConeGuard[], where?: string): void {
    const guards = [...extraGuards, ...guardsOf(clause.condition, clause.span)];
    const ownerEntity = owner ? this.entityById.get(owner) : undefined;
    const ownerName = ownerEntity?.name ?? 'the story';
    const label = where ?? `\`${clause.clauseKind} … ${clause.action}\` of ${ownerName}`;
    if (clause.binding === 'every-turn') {
      this.push({ kind: 'always' }, owner, guards, [], clause.body, clause.span, `the every-turn clause of ${ownerName}`);
      return;
    }
    const byPlayer = clause.actor === null || clause.actor.kind === 'player' || (clause.binding === 'self' && ownerEntity?.isPlayable === true);
    const actorIsOwnerNpc = clause.binding === 'self' && !ownerEntity?.isPlayable;
    const triggerOwner = clause.binding === 'self' && ownerEntity?.isPlayable ? 'player' : owner ?? ANY;
    const trigger: ConeTrigger = { kind: 'action', action: clause.action, owner: triggerOwner, byPlayer: byPlayer && !actorIsOwnerNpc, reachable: this.verbReaches(clause.action) };
    const reads: Fact[] = [];
    if (owner && !ownerEntity?.isPlayable) reads.push(this.roomIds.has(owner) ? 'place:player' : `reach:${owner}`);
    const fired: ConeWrite[] = owner ? [{ fact: `fired:${owner}.${clause.action}`, value: null }] : [];
    const rule = this.push(trigger, owner, guards, reads, clause.body, clause.span, label, fired);
    if (owner && trigger.byPlayer && clause.clauseKind === 'after') this.afterRules.push({ rule, owner, action: clause.action });
    if (owner && trigger.byPlayer) {
      // An `on` clause may refuse or replace the standard action whenever its
      // conditions hold; a `must` or `refuse when` in either kind may refuse it.
      // The walk's own command on this owner reads all of them.
      const conditions = clause.clauseKind === 'on' ? [...guards, ...preconditionsOf(clause.body)] : preconditionsOf(clause.body);
      if (conditions.length) {
        const byAction = this.refusals.get(owner) ?? new Map<string, ConeGuard[]>();
        byAction.set(clause.action, [...(byAction.get(clause.action) ?? []), ...conditions]);
        this.refusals.set(owner, byAction);
      }
      if (clause.clauseKind === 'on') {
        const certain = definiteRefusalsOf(clause.body).map((when) => ({ guards, when }));
        if (certain.length) {
          const byAction = this.definiteRefusals.get(owner) ?? new Map<string, ConeRefusal[]>();
          byAction.set(clause.action, [...(byAction.get(clause.action) ?? []), ...certain]);
          this.definiteRefusals.set(owner, byAction);
        }
      }
    }
  }

  // ---- timers, sequences, machines ----------------------------------------

  private timerRules(): void {
    for (const timer of this.ir.timers ?? []) {
      if (!timer.meanwhile) continue;
      this.push({ kind: 'timer', timer: timer.qualified }, timer.owner, [], [`timer:${timer.qualified}`], timer.meanwhile.body, timer.span, `the \`meanwhile\` of timer ${timer.qualified}`);
    }
  }

  private sequenceRules(): void {
    for (const sequence of this.ir.sequences ?? []) {
      for (const step of sequence.steps) {
        const trigger: ConeTrigger = step.timing === 'becomes' && step.anchor ? { kind: 'becomes', owner: step.anchor.owner, state: step.anchor.state } : { kind: 'always' };
        const reads = trigger.kind === 'becomes' ? [`state:${trigger.owner}`] : [];
        this.push(trigger, null, [], reads, step.body, step.span, `a step of sequence \`${sequence.name}\``);
      }
    }
  }

  private machineRules(): void {
    for (const machine of this.ir.machines ?? []) {
      const label = `the machine \`${machine.name}\``;
      const slots = new Map<string, string[]>(machine.roles.map((role) => [role.name, [role.entity]]));
      for (const state of machine.states) {
        for (const transition of state.transitions) {
          const guards = guardsOf(transition.condition, transition.span);
          if (transition.trigger.kind === 'condition') guards.push({ condition: transition.trigger.condition, span: transition.span });
          const reads: Fact[] = transition.trigger.kind === 'action' && transition.trigger.target ? [`place:${roleTarget(transition.trigger.target, slots)}`] : [];
          this.pushLeaf({ kind: 'always' }, null, guards, reads, [{ fact: `machine:${machine.name}`, value: transition.target }], transition.span, label);
        }
        for (const body of [state.onEnter, state.onExit]) {
          if (body.length) this.push({ kind: 'always' }, null, [], [`machine:${machine.name}`], body, state.span, label, [], slots);
        }
      }
    }
  }

  // ---- story actions the walk can type ------------------------------------

  private actionRules(): void {
    for (const action of this.ir.actions ?? []) {
      if (!this.verbReaches(action.name)) continue;
      const preconditions: ConeGuard[] = [
        ...action.musts.map((must) => ({ condition: must.condition, span: must.span })),
        ...action.refusals.flatMap((r) => (r.kind === 'when' ? [{ condition: r.condition, span: r.span }] : [])),
      ];
      this.push({ kind: 'always' }, null, [], [], action.body, action.span, `the action \`${action.name}\``, [], undefined, preconditions);
    }
  }

  // ---- the walk's own moves: exits and standard commands -------------------

  private walkRules(): void {
    for (const roomId of this.set.rooms) {
      const room = this.entityById.get(roomId);
      if (!room) continue;
      for (const exit of room.exits ?? []) {
        if (!this.setRooms.has(exit.to)) continue;
        const blocks = (room.blockedExits ?? []).filter((b) => b.direction === exit.direction);
        if (blocks.some((b) => b.condition === null)) continue;
        const guards: ConeGuard[] = blocks.map((b) => ({ condition: b.condition as IRCondition, span: b.span }));
        const reads: Fact[] = ['place:player'];
        if (exit.via) reads.push(`flag:${exit.via}`, `place:${exit.via}`);
        const label = blocks.length ? `the guard on ${room.name}'s ${exit.direction} exit` : `${room.name}'s ${exit.direction} exit`;
        this.pushLeaf({ kind: 'always' }, roomId, guards, reads, [{ fact: 'place:player', value: exit.to }], exit.span, label);
      }
      for (const deadly of room.deadlyExits ?? []) {
        this.pushLeaf({ kind: 'always' }, roomId, guardsOf(deadly.condition, deadly.span), ['place:player'], [{ fact: 'ending', value: null }], deadly.span, `the deadly ${deadly.direction} exit of ${room.name}`);
      }
    }

    const standardActions = this.standardActionsReached();
    for (const thingId of this.set.things) {
      const thing = this.entityById.get(thingId);
      const name = thing?.name ?? thingId;
      const span = thing?.span ?? { line: 0, column: 0, endLine: 0, endColumn: 0 };
      const reads: Fact[] = [`reach:${thingId}`, ...this.configReads(thing)];
      const refusals = this.refusals.get(thingId);
      const otherThings = this.set.things.filter((id) => id !== thingId);
      for (const action of standardActions) {
        // A two-object command (put, insert, give) can land the thing in any other set thing.
        const writes = standardWrites(action, [thingId], 'player', TWO_OBJECT_ACTIONS.has(action) ? otherThings : []);
        if (!writes.length) continue;
        const readConditions = action.startsWith('unknown:') ? [...refusals?.values() ?? []].flat() : refusals?.get(action) ?? [];
        const refusedBy = action.startsWith('unknown:') ? [] : this.definiteRefusals.get(thingId)?.get(action) ?? [];
        const rule = this.pushLeaf({ kind: 'always' }, thingId, [], reads, writes, span, `the walk's \`${action}\` on ${name}`, readConditions);
        rule.refusedBy = refusedBy;
      }
    }
  }

  /** The entities a thing's trait settings name — a key, an instrument, a route — which the standard action may need in hand. */
  private configReads(thing: IREntity | undefined): Fact[] {
    const reads: Fact[] = [];
    for (const composition of thing?.traits ?? []) {
      for (const setting of composition.config) {
        if (setting.valueKind === 'name') {
          const id = this.entityByName.get(setting.value.toLowerCase());
          reads.push(id ? `reach:${id}` : 'place:*');
        } else if (setting.valueKind === 'list') {
          for (const id of setting.values ?? []) reads.push(`place:${id}`);
        }
      }
    }
    return reads;
  }

  /**
   * The standard actions some set verb reaches, the everyday ones first so a
   * kept thing's reason names `taking` before `removing`; an unknown verb
   * reaches every effect.
   */
  private standardActionsReached(): string[] {
    const shapes = STDLIB_MANIFEST.locales['en-US']?.grammarShapes ?? {};
    const reached = new Set<string>();
    for (const verb of this.set.verbs) {
      let matched = false;
      for (const [actionId, patterns] of Object.entries(shapes)) {
        if (patterns.some((pattern) => verbMatches(verb, leadingWords(pattern)))) {
          reached.add(actionId.replace(/^if\.action\./, ''));
          matched = true;
        }
      }
      if (!matched && !this.storyActionReached(verb)) reached.add(`unknown:${verb}`);
    }
    const rank = (action: string) => {
      const index = EVERYDAY_ACTIONS.indexOf(action);
      return index < 0 ? EVERYDAY_ACTIONS.length : index;
    };
    return [...reached].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
  }

  private storyActionReached(verb: string): boolean {
    for (const action of this.ir.actions ?? []) {
      if (action.patterns.some((pattern) => verbMatches(verb, patternLeadingWords(pattern.parts)))) return true;
    }
    return false;
  }

  /** Whether a set verb reaches a clause's action: a story action by its patterns, a standard one by the manifest. */
  verbReaches(action: string): boolean {
    if (MOVEMENT_ACTIONS.has(action)) return true;
    const story = this.actionsByName.get(action);
    if (story) return this.set.verbs.some((verb) => story.patterns.some((pattern) => verbMatches(verb, patternLeadingWords(pattern.parts))));
    const shapes = STDLIB_MANIFEST.locales['en-US']?.grammarShapes?.[`if.action.${action}`];
    if (!shapes) return true;
    return this.set.verbs.some((verb) => shapes.some((pattern) => verbMatches(verb, leadingWords(pattern))));
  }

  // ---- building rules -----------------------------------------------------

  private push(
    trigger: ConeTrigger,
    owner: string | null,
    guards: ConeGuard[],
    reads: Fact[],
    body: IRStatement[],
    span: Span,
    label: string,
    synthetic: ConeWrite[] = [],
    slots?: ReadonlyMap<string, readonly string[]>,
    readConditions: ConeGuard[] = [],
  ): ConeRule {
    const statements: ConeStatement[] = [];
    if (synthetic.length) statements.push({ writes: synthetic, whens: [], reads: [], span, label });
    this.flatten(body, [], { owner, slots }, statements, label);
    const rule: ConeRule = { trigger, owner, guards, readConditions: [...readConditions, ...preconditionsOf(body)], reads, refusedBy: [], body: statements, span, label };
    this.rules.push(rule);
    return rule;
  }

  private pushLeaf(trigger: ConeTrigger, owner: string | null, guards: ConeGuard[], reads: Fact[], writes: ConeWrite[], span: Span, label: string, readConditions: ConeGuard[] = []): ConeRule {
    const rule: ConeRule = { trigger, owner, guards, readConditions, reads, refusedBy: [], body: [{ writes, whens: [], reads: [], span, label }], span, label };
    this.rules.push(rule);
    return rule;
  }

  private flatten(body: IRStatement[], whens: IRCondition[], binding: ValueBinding, out: ConeStatement[], label: string): void {
    for (const stmt of body) {
      switch (stmt.kind) {
        case 'select-on': {
          const reads = resolveValue(stmt.subject, binding).map((id) => `state:${id}`);
          for (const arm of stmt.arms) {
            const before = out.length;
            this.flatten(arm.body, whens, binding, out, label);
            for (let i = before; i < out.length; i++) out[i].reads.push(...reads);
          }
          break;
        }
        case 'select-strategy':
          for (const alternative of stmt.alternatives) this.flatten(alternative, whens, binding, out, label);
          break;
        case 'ordinal':
          this.flatten(stmt.body, whens, binding, out, label);
          break;
        case 'each': {
          const before = out.length;
          this.flatten(stmt.body, whens, { owner: ANY, slots: binding.slots }, out, label);
          for (let i = before; i < out.length; i++) out[i].reads.push('state:*', 'place:*', 'flag:*');
          break;
        }
        default: {
          const stmtWhen = 'stmtWhen' in stmt && stmt.stmtWhen ? [stmt.stmtWhen] : [];
          const leaf = this.leaf(stmt, binding);
          if (leaf) out.push({ writes: leaf.writes, whens: [...whens, ...stmtWhen], reads: leaf.reads, span: stmt.span, label });
        }
      }
    }
  }

  /** The writes and extra reads of one leaf statement; null when it changes nothing the cone tracks. */
  private leaf(stmt: IRStatement, binding: ValueBinding): { writes: ConeWrite[]; reads: Fact[] } | null {
    switch (stmt.kind) {
      case 'change':
        return { writes: resolveValue(stmt.entity, binding).map((id) => ({ fact: `state:${id}`, value: stmt.state })), reads: [] };
      case 'change-player': {
        // The player is now wherever the new role holder stands.
        const holders = resolveValue(stmt.entity, binding);
        return { writes: [{ fact: 'place:player', value: holders.length === 1 ? holders[0] : ANY }], reads: [] };
      }
      case 'change-mood':
        return { writes: [{ fact: `flag:${binding.owner ?? ANY}`, value: null }], reads: [] };
      case 'change-feeling':
        return { writes: [{ fact: `flag:${binding.owner ?? ANY}`, value: null }], reads: resolveValue(stmt.target, binding).map((id) => `place:${id}`) };
      case 'set': {
        const target = stmt.target;
        if (target.kind === 'counter') {
          const owners = target.owner ? resolveValue(target.owner, binding) : ['story'];
          return { writes: owners.map((id) => ({ fact: `counter:${id}.${target.name}`, value: null })), reads: valueReads(stmt.value, binding) };
        }
        const bases = resolveValue(target, binding);
        return { writes: (bases.length ? bases : [ANY]).map((id) => ({ fact: `flag:${id}`, value: null })), reads: valueReads(stmt.value, binding) };
      }
      case 'move': {
        const place = placeOf(stmt.place, binding, this.roomIds);
        return { writes: resolveValue(stmt.entity, binding).map((id) => ({ fact: `place:${id}`, value: place })), reads: [] };
      }
      case 'wear':
      case 'take-off': {
        const actors = resolveValue(stmt.actor, binding);
        return {
          writes: resolveValue(stmt.item, binding).flatMap((id) => [{ fact: `flag:${id}`, value: null }, { fact: `place:${id}`, value: actors[0] ?? ANY }]),
          reads: [],
        };
      }
      case 'act':
        return this.actWrites(stmt, binding);
      case 'remove':
        return { writes: resolveValue(stmt.entity, binding).map((id) => ({ fact: `place:${id}`, value: OFFSTAGE })), reads: [] };
      case 'raise':
      case 'lower':
      case 'set-counter': {
        const owners = stmt.owner ? resolveValue(stmt.owner, binding) : ['story'];
        return { writes: owners.map((id) => ({ fact: `counter:${id}.${stmt.counter}`, value: null })), reads: [] };
      }
      case 'timer':
        return { writes: [{ fact: `timer:${stmt.timer}`, value: stmt.verb === 'start' || stmt.verb === 'restart' ? 'started' : 'stopped' }], reads: [] };
      case 'win':
      case 'lose':
      case 'kill':
        return { writes: [{ fact: 'ending', value: null }], reads: [] };
      case 'emit':
        return { writes: [{ fact: `event:${stmt.event}`, value: null }], reads: [] };
      case 'leave':
        return { writes: [{ fact: `place:${binding.owner ?? ANY}`, value: ANY_ROOM }], reads: [] };
      case 'award':
      case 'refuse':
      case 'phrase':
      case 'must':
      case 'refuse-when':
      case 'then-open':
      case 'deflect':
      case 'hold-tongue':
        return null;
      default:
        return { writes: [{ fact: ANY, value: ANY }], reads: [] };
    }
  }

  /** An `act` statement: a story action's body inlined with its slots bound, or a standard action's effects on its objects. */
  private actWrites(stmt: Extract<IRStatement, { kind: 'act' }>, binding: ValueBinding): { writes: ConeWrite[]; reads: Fact[] } {
    const actors = resolveValue(stmt.actor, binding);
    const actor = actors[0] ?? ANY;
    const slots = new Map<string, string[]>();
    const objects: string[] = [];
    for (const { slot, value } of stmt.slots) {
      const ids = resolveValue(value, binding);
      slots.set(slot, ids);
      objects.push(...ids);
    }
    const story = this.actionsByName.get(stmt.action);
    if (story) {
      const out: ConeStatement[] = [];
      this.flatten(story.body, [], { owner: binding.owner, slots }, out, `the action \`${story.name}\``);
      return { writes: out.flatMap((s) => s.writes), reads: [...out.flatMap((s) => s.reads), ...objects.map((id) => `place:${id}`)] };
    }
    // The first slot is the thing acted on; any later slot is where it may end up.
    const [first, ...rest] = stmt.slots.map(({ value }) => resolveValue(value, binding));
    return { writes: standardWrites(stmt.action, first ?? [], actor, rest.flat()), reads: objects.map((id) => `place:${id}`) };
  }
}

/** Standard actions whose second object is where the first may end up. */
const TWO_OBJECT_ACTIONS = new Set(['putting', 'inserting', 'giving', 'throwing', 'showing']);

/** The conditions of every `must` and `refuse when` in a body, at any depth, each with its line. */
function preconditionsOf(body: readonly IRStatement[]): ConeGuard[] {
  const out: ConeGuard[] = [];
  for (const stmt of body) {
    switch (stmt.kind) {
      case 'must':
      case 'refuse-when':
        out.push({ condition: stmt.condition, span: stmt.span });
        break;
      case 'select-on':
        for (const arm of stmt.arms) out.push(...preconditionsOf(arm.body));
        break;
      case 'select-strategy':
        for (const alternative of stmt.alternatives) out.push(...preconditionsOf(alternative));
        break;
      case 'ordinal':
      case 'each':
        out.push(...preconditionsOf(stmt.body));
        break;
      default:
        break;
    }
  }
  return out;
}

/**
 * The refusals an `on` clause body is certain to reach when it runs: a bare
 * `refuse` or a `refuse when <cond>` at the top level (null = unconditional,
 * else the condition), and a top-level `must <cond>` as `not <cond>`.
 * Nested statements are not certain to run and are left out.
 */
function definiteRefusalsOf(body: readonly IRStatement[]): Array<ConeGuard | null> {
  const out: Array<ConeGuard | null> = [];
  for (const stmt of body) {
    if (stmt.kind === 'refuse') out.push(null);
    else if (stmt.kind === 'refuse-when') out.push({ condition: stmt.condition, span: stmt.span });
    else if (stmt.kind === 'must') out.push({ condition: { kind: 'not', operand: stmt.condition }, span: stmt.span });
  }
  return out;
}

/** The standard actions in the order a reason should name them. */
const EVERYDAY_ACTIONS = [
  'taking', 'dropping', 'opening', 'closing', 'unlocking', 'locking', 'switching_on', 'switching_off',
  'wearing', 'taking_off', 'reading', 'eating', 'drinking', 'putting', 'inserting', 'giving', 'pushing', 'pulling', 'turning',
];

/** A machine role target (`$role`) to its bound entity id, else the id as written. */
function roleTarget(target: string, slots: ReadonlyMap<string, readonly string[]>): string {
  if (!target.startsWith('$')) return target;
  return slots.get(target.slice(1))?.[0] ?? ANY;
}

/**
 * The facts a value reads when evaluated: a field or counter of an entity, a timer.
 *
 * @param value the IR value
 * @param binding what `it` and the slots mean here
 * @returns the facts, empty for literals, symbols, and bare entity references
 */
export function valueReads(value: IRValue, binding: ValueBinding): Fact[] {
  switch (value.kind) {
    case 'field':
      return resolveValue(value.base, binding).map((id) => `flag:${id}`);
    case 'counter': {
      const owners = value.owner ? resolveValue(value.owner, binding) : ['story'];
      return owners.map((id) => `counter:${id}.${value.name}`);
    }
    case 'timer':
      return [`timer:${value.timer}`];
    default:
      return [];
  }
}

/**
 * Where a `move` puts its entity: an id, `player`, `offstage`, some room
 * (`adjacent-room`, or `here` with no owner), or `*` when a slot left it open.
 * `here` under a thing's clause is the thing's own room, read as "with it".
 */
function placeOf(place: IRValue, binding: ValueBinding, roomIds: ReadonlySet<string>): string {
  if (place.kind === 'symbol') {
    const word = place.name.toLowerCase();
    if (word === 'offstage' || word === 'nowhere' || word === 'away') return OFFSTAGE;
    if (word === 'here') {
      if (!binding.owner || binding.owner === ANY) return ANY_ROOM;
      return binding.owner;
    }
    return ANY_ROOM;
  }
  const ids = resolveValue(place, binding);
  if (ids.length !== 1) return ANY;
  return ids[0];
}

/**
 * The writes a standard action performs on its objects. `unknown:<verb>`
 * (a set verb no grammar shape recognises) and any action the table lacks
 * are taken to change each object's flags and place. A displaced object
 * lands in one of `destinations` when the command named them, else in some
 * room.
 */
function standardWrites(action: string, objects: readonly string[], actor: string, destinations: readonly string[] = []): ConeWrite[] {
  const effects = STANDARD_EFFECTS[action] ?? ['flag', 'displace'];
  const writes: ConeWrite[] = [];
  for (const effect of effects) {
    switch (effect) {
      case 'take':
        for (const id of objects) writes.push({ fact: `place:${id}`, value: actor });
        break;
      case 'displace':
        for (const id of objects) {
          if (destinations.length) for (const to of destinations) writes.push({ fact: `place:${id}`, value: to, ...(actor === 'player' ? { chosen: true } : {}) });
          else writes.push({ fact: `place:${id}`, value: ANY_ROOM });
        }
        break;
      case 'flag':
        for (const id of objects) writes.push({ fact: `flag:${id}`, value: null });
        break;
      case 'consume':
        for (const id of objects) writes.push({ fact: `place:${id}`, value: OFFSTAGE }, { fact: `flag:${id}`, value: null });
        break;
      case 'move-actor':
        writes.push({ fact: `place:${actor}`, value: ANY_ROOM });
        break;
      case 'none':
        break;
    }
  }
  return writes;
}

/** The literal words a grammar shape opens with, before its first slot (`take :item` → `take`). */
function leadingWords(pattern: string): string {
  const words: string[] = [];
  for (const word of pattern.trim().split(/\s+/)) {
    if (word.startsWith(':') || word.startsWith('[')) break;
    words.push(word.toLowerCase());
  }
  return words.join(' ');
}

/** The same, off an IR action pattern's parts; an alternation stops the prefix, since any of its words may open it. */
function patternLeadingWords(parts: readonly IRPatternPart[]): string {
  const words: string[] = [];
  for (const part of parts) {
    if (part.kind !== 'word') break;
    words.push(part.word.toLowerCase());
  }
  return words.join(' ');
}

/** A set verb reaches a shape when one is the other's word-prefix; an empty prefix (a slot-first shape) reaches every verb. */
function verbMatches(verb: string, prefix: string): boolean {
  const v = verb.trim().toLowerCase();
  if (prefix === '') return true;
  return prefix === v || prefix.startsWith(`${v} `) || v.startsWith(`${prefix} `);
}
