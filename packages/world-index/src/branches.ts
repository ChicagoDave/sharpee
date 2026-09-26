/**
 * branches.ts — the clause-branch enumerator: one record per leaf path
 * through every rule a Chord story declares.
 *
 * Purpose: a rule in a Chord story is a precondition, an action and a set of
 * effects, written once by the author. This module reads the compiled IR
 * and emits each of those as a `ClauseBranch` — the derived test case the
 * testing tier runs and the unit of the coverage denominator. It never
 * reads Chord source, never runs an engine, and never guesses: what it
 * cannot resolve it reports in a form a consumer can name as unarrangeable.
 *
 * A clause is a body of statements with something that fires it — an `on`
 * clause, a `when <timer> expires` clause, a topic row, a machine
 * transition, a sequence step, a timer's `meanwhile`, a `define action`, the
 * start block. A branch is one leaf path through that body: each guard
 * (`must`, `refuse when`, `without`) contributes its refusal leaf and adds
 * itself, passed, to the path of everything after it; each `select on` arm
 * and each `select` alternative is a leaf; each ordinal (`first time`) body
 * is a leaf; a level with no select contributes one through-leaf carrying
 * its straight statements. The guards-first rule the compiler enforces on
 * clause bodies is what makes "everything after the guard" well defined.
 *
 * The walk is total. It rides `forEachStatementRoot`, so it sees every
 * root `collectStateWriters` and `collectStateReaders` see, and within a
 * root it classifies clause nodes by shape rather than by a list of field
 * names. A statement-bearing node no shape names still yields branches,
 * under a `surface` clause labelled by its key path — a new construct in the
 * language shows up in the denominator as "something here is untested"
 * rather than vanishing from it.
 *
 * Spans follow the leaf's own node when it carries one (an arm, a guard
 * statement, an ordinal), else the enclosing clause's span, and the record
 * says which. A predicate condition carries no span of its own in today's
 * IR, so a refusal leaf points at its guard statement, never at the
 * condition inside it.
 *
 * Known approximation: a guard placed after a `select on` at the same level
 * does not add to the arms' preconditions. The compiler's phase-order rule
 * puts guards first, so this shape does not occur in compiled output.
 *
 * Public interface: collectClauseBranches, ClauseBranch, BranchClause,
 * BranchLeaf, BranchPrecondition, BranchCommand, SpanSource.
 *
 * Owner context: @sharpee/world-index — the derivation package. No platform
 * contract.
 *
 * References:
 * - ADR-356 D1: the story's rules are the test cases; the suite is derived
 *   from the compiled IR, one test per clause branch, in `world-index`.
 * - ADR-356 D5: completeness is measured against the IR — the record count
 *   here is the branches denominator.
 * - ADR-321 D2: IR types by direct import, so a schema change fails this
 *   package's build in the same commit.
 * - GH #517: the allowlist gap that made the total walk the rule here.
 * - GH #521: predicate conditions carry no span.
 *
 * @packageDocumentation
 */

import type {
  IRCondition,
  IRMachineTransition,
  IRStatement,
  IRTopicRow,
  IRValue,
  Span,
  StoryIR,
} from '@sharpee/chord';
import { forEachStatementRoot, targetOf, type WriterOwner } from './statements.js';

// ---------------------------------------------------------------------------
// Records
// ---------------------------------------------------------------------------

/** The clause a branch belongs to — what fires its body. */
export type BranchClause =
  | {
      kind: 'on';
      clauseKind: 'on' | 'after';
      action: string;
      actor: IRValue | null;
      binding: 'object' | 'role' | 'every-turn' | 'self';
      role: string | null;
      once: boolean;
    }
  | { kind: 'timer-clause'; timer: string }
  | { kind: 'move-clause'; mover: IRValue }
  | { kind: 'topic'; filter: IRTopicRow['filter'] }
  | { kind: 'action'; action: string }
  | {
      kind: 'machine-transition';
      machine: string;
      from: string;
      to: string;
      trigger: IRMachineTransition['trigger'];
    }
  | {
      kind: 'sequence-step';
      sequence: string;
      timing: 'at-turn' | 'later' | 'becomes';
      turns: number;
      anchor: { owner: string; state: string } | null;
    }
  | { kind: 'timer-meanwhile'; timer: string; chance: number | null }
  | { kind: 'start-block' }
  /** Any other statement-bearing node, named by its key path from its root. */
  | { kind: 'surface'; surface: string };

/** Which leaf path through the clause's body a branch is. */
export type BranchLeaf =
  | { kind: 'through' }
  | { kind: 'refused'; guard: 'must' | 'refuse-when' | 'without'; phraseKey: string; slot?: string }
  | { kind: 'arm'; value: string }
  | { kind: 'ordinal'; ordinal: number }
  | { kind: 'alternative'; id: string; index: number };

/** One term of what must be true for a branch to be the path taken. */
export type BranchPrecondition =
  /** A guard on the way to the leaf, and whether it must hold or fail. */
  | { kind: 'condition'; condition: IRCondition; holds: boolean }
  /** A `select on <entity>.state` arm — the entity is in this state. */
  | { kind: 'state'; entity: string; state: string }
  /** A `select on the story.state` arm — the story is in this phase. */
  | { kind: 'story-state'; state: string }
  /** A `select on` arm over something other than a resolvable state. */
  | { kind: 'value'; subject: IRValue; value: string }
  /** An ordinal body — this is the n-th firing. */
  | { kind: 'ordinal'; ordinal: number }
  /** A `, once` clause that has not yet fired. */
  | { kind: 'unfired' }
  /** A `select` strategy chose this alternative. */
  | { kind: 'alternative'; id: string; index: number }
  /** A machine is in the named state. */
  | { kind: 'machine-state'; machine: string; state: string };

/** What drives a branch — the one command, or schedule, that fires it. */
export type BranchCommand =
  /**
   * An action performed by an actor. `object` is the clause's subject when
   * the clause binds as the action's object; with `role` set, the subject
   * fills that named role of a story action instead.
   */
  | { kind: 'action'; actor: 'player' | { entity: string }; action: string; object: string | null; role: string | null }
  /** Fires on any turn — an every-turn clause or a condition-triggered transition. */
  | { kind: 'any-turn' }
  | { kind: 'timer-expires'; timer: string }
  | { kind: 'entity-moves'; mover: IRValue }
  | { kind: 'ask'; owner: string; filter: IRTopicRow['filter'] }
  | { kind: 'event'; event: string }
  | { kind: 'schedule'; timing: 'at-turn' | 'later' | 'becomes'; turns: number; anchor: { owner: string; state: string } | null }
  | { kind: 'timer-running'; timer: string }
  | { kind: 'boot' }
  /** No player command drives this surface directly (a conversation row, for one). */
  | { kind: 'none'; surface: string };

/** Where a branch's span came from. */
export type SpanSource = 'branch' | 'clause' | 'none';

/** One leaf path through one clause — a derived test case. */
export interface ClauseBranch {
  clause: BranchClause;
  leaf: BranchLeaf;
  /** What must be reachable for the clause to fire. */
  owner: WriterOwner;
  /** The entity the clause is about (`it` inside it), or null when nothing binds it. */
  subject: string | null;
  precondition: BranchPrecondition[];
  command: BranchCommand;
  /** The branch's body statements, unresolved — a consumer maps each to a claim. */
  effects: IRStatement[];
  span: Span | null;
  spanSource: SpanSource;
}

// ---------------------------------------------------------------------------
// Statement shapes
// ---------------------------------------------------------------------------

/** A node of unknown shape somewhere in the IR. */
type IRNode = Record<string, unknown>;

/**
 * Every `kind` the `IRStatement` union carries. A list is unavoidable here:
 * the generic classifier has to tell a statement body from any other array
 * of `kind`-bearing nodes (values, conditions, phrase variants). A kind
 * added to the union and not here is still walked when it sits beside a
 * known kind, and only a body made solely of new kinds would be missed.
 */
const STATEMENT_KINDS = new Set<string>([
  'refuse', 'phrase', 'emit', 'set', 'change', 'change-player', 'change-mood', 'change-feeling',
  'move', 'act', 'remove', 'award', 'raise', 'lower', 'set-counter', 'timer', 'win', 'lose',
  'kill', 'must', 'refuse-when', 'select-on', 'select-strategy', 'ordinal', 'each', 'then-open',
  'deflect', 'leave', 'hold-tongue',
]);

/** Whether a value is a walkable object or array. */
function isWalkable(node: unknown): node is IRNode | unknown[] {
  return typeof node === 'object' && node !== null;
}

/** Whether a value is a non-empty array of statement nodes. */
function isStatementList(value: unknown): value is IRStatement[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((item) => isWalkable(item) && !Array.isArray(item) && STATEMENT_KINDS.has(String(item.kind)))
  );
}

/** A node's span, if it carries one. */
function spanOf(node: IRNode | undefined): Span | null {
  const span = node?.span as Span | undefined;
  return span && typeof span.line === 'number' ? span : null;
}

// ---------------------------------------------------------------------------
// Leaves
// ---------------------------------------------------------------------------

/** One leaf path through a body, before it is joined to its clause. */
interface Leaf {
  leaf: BranchLeaf;
  pre: BranchPrecondition[];
  effects: IRStatement[];
  /** The leaf's own span, or null to inherit the clause's. */
  span: Span | null;
}

/**
 * The precondition an arm of a `select on` states.
 *
 * @param subject the select's subject value
 * @param value the arm's value word
 * @param itBinding the entity `it` refers to here, if any
 * @returns a state term when the subject is an entity's or the story's
 *   state, else an opaque value term
 */
function armTerm(subject: unknown, value: string, itBinding: string | undefined): BranchPrecondition {
  if (isWalkable(subject) && !Array.isArray(subject) && subject.kind === 'field' && subject.field === 'state') {
    const base = subject.base as IRNode | undefined;
    if (base?.kind === 'story') return { kind: 'story-state', state: value };
    const entity = targetOf(base, itBinding);
    if (entity !== undefined) return { kind: 'state', entity, state: value };
  }
  return { kind: 'value', subject: subject as IRValue, value };
}

/**
 * Every leaf path through a statement body.
 *
 * Guards add a refusal leaf and then join the path, passed, for everything
 * after them. A `select on` or `select` strategy replaces the level's
 * through-leaf with one leaf per arm or alternative, each carrying the
 * level's straight statements around its own. An ordinal adds leaves and
 * leaves the through-leaf in place, since the rest of the level still runs.
 *
 * @param body the statements, in source order
 * @param path the precondition terms already on the way here
 * @param itBinding the entity `it` refers to here, if any
 * @returns the leaves, in source order of the construct that produced each
 */
function leavesOf(body: IRStatement[], path: BranchPrecondition[], itBinding: string | undefined): Leaf[] {
  const straight: IRStatement[] = [];
  const guardLeaves: Leaf[] = [];
  /** Leaves from selects and ordinals, with where in `straight` their own effects belong. */
  const nested: Array<{ leaf: Leaf; at: number }> = [];
  let pre = path;
  let branched = false;

  for (const statement of body) {
    switch (statement.kind) {
      case 'must': {
        const { condition, phraseKey } = statement;
        guardLeaves.push({
          leaf: { kind: 'refused', guard: 'must', phraseKey },
          pre: [...pre, { kind: 'condition', condition, holds: false }],
          effects: [statement],
          span: spanOf(statement as unknown as IRNode),
        });
        pre = [...pre, { kind: 'condition', condition, holds: true }];
        break;
      }
      case 'refuse-when': {
        const { condition, phraseKey } = statement;
        guardLeaves.push({
          leaf: { kind: 'refused', guard: 'refuse-when', phraseKey },
          pre: [...pre, { kind: 'condition', condition, holds: true }],
          effects: [statement],
          span: spanOf(statement as unknown as IRNode),
        });
        pre = [...pre, { kind: 'condition', condition, holds: false }];
        break;
      }
      case 'select-on': {
        branched = true;
        for (const arm of statement.arms) {
          const term = armTerm(statement.subject, arm.value, itBinding);
          for (const inner of leavesOf(arm.body, [...pre, term], itBinding)) {
            const isThrough = inner.leaf.kind === 'through';
            nested.push({
              leaf: {
                leaf: isThrough ? { kind: 'arm', value: arm.value } : inner.leaf,
                pre: inner.pre,
                effects: inner.effects,
                span: isThrough ? spanOf(arm as unknown as IRNode) : inner.span,
              },
              at: straight.length,
            });
          }
        }
        break;
      }
      case 'select-strategy': {
        branched = true;
        statement.alternatives.forEach((alternative, index) => {
          const term: BranchPrecondition = { kind: 'alternative', id: statement.id, index };
          for (const inner of leavesOf(alternative, [...pre, term], itBinding)) {
            const isThrough = inner.leaf.kind === 'through';
            nested.push({
              leaf: {
                leaf: isThrough ? { kind: 'alternative', id: statement.id, index } : inner.leaf,
                pre: inner.pre,
                effects: inner.effects,
                span: isThrough ? spanOf(statement as unknown as IRNode) : inner.span,
              },
              at: straight.length,
            });
          }
        });
        break;
      }
      case 'ordinal': {
        const term: BranchPrecondition = { kind: 'ordinal', ordinal: statement.ordinal };
        for (const inner of leavesOf(statement.body, [...pre, term], itBinding)) {
          const isThrough = inner.leaf.kind === 'through';
          nested.push({
            leaf: {
              leaf: isThrough ? { kind: 'ordinal', ordinal: statement.ordinal } : inner.leaf,
              pre: inner.pre,
              effects: inner.effects,
              span: isThrough ? spanOf(statement as unknown as IRNode) : inner.span,
            },
            at: straight.length,
          });
        }
        break;
      }
      default:
        straight.push(statement);
    }
  }

  const leaves: Leaf[] = [...guardLeaves];
  for (const { leaf, at } of nested) {
    leaves.push({ ...leaf, effects: [...straight.slice(0, at), ...leaf.effects, ...straight.slice(at)] });
  }
  if (!branched) {
    leaves.push({ leaf: { kind: 'through' }, pre, effects: straight, span: null });
  }
  return leaves;
}

// ---------------------------------------------------------------------------
// Clauses
// ---------------------------------------------------------------------------

/** What a clause contributes to every branch it yields. */
interface ClauseFrame {
  clause: BranchClause;
  owner: WriterOwner;
  subject: string | null;
  command: BranchCommand;
  /** Terms every leaf of this clause carries, ahead of the body's own. */
  pre: BranchPrecondition[];
  body: IRStatement[];
  span: Span | null;
}

/**
 * Join a clause to each leaf of its body.
 *
 * @param frame the clause
 * @param into the accumulator to append to
 */
function emitClause(frame: ClauseFrame, into: ClauseBranch[]): void {
  for (const leaf of leavesOf(frame.body, frame.pre, frame.subject ?? undefined)) {
    const span = leaf.span ?? frame.span;
    into.push({
      clause: frame.clause,
      leaf: leaf.leaf,
      owner: frame.owner,
      subject: frame.subject,
      precondition: leaf.pre,
      command: frame.command,
      effects: leaf.effects,
      span,
      spanSource: leaf.span ? 'branch' : frame.span ? 'clause' : 'none',
    });
  }
}

/** A guard's `holds: true` term, or nothing when the clause has no guard. */
function guardTerms(condition: unknown): BranchPrecondition[] {
  return isWalkable(condition) && !Array.isArray(condition)
    ? [{ kind: 'condition', condition: condition as IRCondition, holds: true }]
    : [];
}

/** The actor a clause names, as a command actor. */
function actorOf(actor: unknown): 'player' | { entity: string } {
  if (isWalkable(actor) && !Array.isArray(actor) && actor.kind === 'entity' && typeof actor.id === 'string') {
    return { entity: actor.id };
  }
  return 'player';
}

/** The command an `on` clause fires on. */
function onClauseCommand(node: IRNode, subject: string | null): BranchCommand {
  const action = String(node.action);
  switch (node.binding) {
    case 'every-turn':
      return { kind: 'any-turn' };
    case 'self':
      return subject === null
        ? { kind: 'any-turn' }
        : { kind: 'action', actor: { entity: subject }, action, object: null, role: null };
    case 'role':
      return { kind: 'action', actor: actorOf(node.actor), action, object: subject, role: String(node.role) };
    default:
      return { kind: 'action', actor: actorOf(node.actor), action, object: subject, role: null };
  }
}

/** Shape tests for the clause nodes the classifier names. */
const isOnClause = (n: IRNode): boolean => typeof n.clauseKind === 'string' && Array.isArray(n.body);
const isTimerClause = (n: IRNode): boolean => typeof n.timer === 'string' && Array.isArray(n.body) && !('kind' in n);
const isMoveClause = (n: IRNode): boolean => isWalkable(n.mover) && Array.isArray(n.body);
const isTopicRow = (n: IRNode): boolean => isWalkable(n.filter) && Array.isArray(n.body) && !('kind' in n);
const isActionDef = (n: IRNode): boolean =>
  Array.isArray(n.patterns) && Array.isArray(n.musts) && Array.isArray(n.refusals) && Array.isArray(n.body);
const isMachineDef = (n: IRNode): boolean =>
  Array.isArray(n.roles) && Array.isArray(n.states) && typeof n.initialState === 'string';
const isSequenceDef = (n: IRNode): boolean => Array.isArray(n.steps) && typeof n.name === 'string';
const isTimerDef = (n: IRNode): boolean => typeof n.qualified === 'string' && 'meanwhile' in n;

/**
 * Every branch of a `define action`: its `must` lines and `refuse when`
 * lines are guards ahead of the body, and each `without` refusal is a leaf
 * of its own, since it fires on the command's shape rather than on state.
 */
function emitActionDef(node: IRNode, owner: WriterOwner, into: ClauseBranch[]): void {
  const action = String(node.name);
  const clause: BranchClause = { kind: 'action', action };
  const command: BranchCommand = { kind: 'action', actor: 'player', action, object: null, role: null };
  const span = spanOf(node);
  const guards: IRStatement[] = [];
  for (const must of node.musts as IRNode[]) {
    guards.push({ kind: 'must', condition: must.condition as IRCondition, phraseKey: String(must.phraseKey), span: must.span as Span });
  }
  for (const refusal of node.refusals as IRNode[]) {
    if (refusal.kind === 'when') {
      guards.push({ kind: 'refuse-when', condition: refusal.condition as IRCondition, phraseKey: String(refusal.phraseKey), span: refusal.span as Span });
    } else if (refusal.kind === 'without') {
      const phraseKey = String(refusal.phraseKey);
      const refuse: IRStatement = { kind: 'refuse', phraseKey, params: [], span: refusal.span as Span };
      const leafSpan = spanOf(refusal);
      into.push({
        clause,
        leaf: { kind: 'refused', guard: 'without', phraseKey, slot: String(refusal.slot) },
        owner,
        subject: null,
        precondition: [],
        command,
        effects: [refuse],
        span: leafSpan ?? span,
        spanSource: leafSpan ? 'branch' : span ? 'clause' : 'none',
      });
    }
  }
  emitClause({ clause, owner, subject: null, command, pre: [], body: [...guards, ...(node.body as IRStatement[])], span }, into);
}

/** Every transition of a `define machine`, its effects the exit and entry bodies it runs. */
function emitMachineDef(node: IRNode, owner: WriterOwner, into: ClauseBranch[]): void {
  const machine = String(node.name);
  const roles = new Map<string, string>();
  for (const role of node.roles as IRNode[]) roles.set(String(role.name), String(role.entity));
  const states = node.states as IRNode[];
  const byName = new Map(states.map((state) => [String(state.name), state]));
  for (const state of states) {
    const from = String(state.name);
    for (const transition of (state.transitions as IRNode[] | undefined) ?? []) {
      const to = String(transition.target);
      const trigger = transition.trigger as IRMachineTransition['trigger'];
      let command: BranchCommand;
      const pre: BranchPrecondition[] = [{ kind: 'machine-state', machine, state: from }];
      if (trigger.kind === 'action') {
        const target = trigger.target;
        const object = target === null ? null : target.startsWith('$') ? (roles.get(target.slice(1)) ?? target) : target;
        command = { kind: 'action', actor: 'player', action: trigger.action, object, role: null };
      } else if (trigger.kind === 'event') {
        command = { kind: 'event', event: trigger.event };
      } else {
        command = { kind: 'any-turn' };
        pre.push({ kind: 'condition', condition: trigger.condition, holds: true });
      }
      pre.push(...guardTerms(transition.condition));
      const body = [
        ...((state.onExit as IRStatement[] | undefined) ?? []),
        ...((byName.get(to)?.onEnter as IRStatement[] | undefined) ?? []),
      ];
      emitClause(
        {
          clause: { kind: 'machine-transition', machine, from, to, trigger },
          owner,
          subject: null,
          command,
          pre,
          body,
          span: spanOf(transition) ?? spanOf(state),
        },
        into,
      );
    }
  }
}

/** Every step of a `define sequence`; a `becomes` step's anchor is a state term. */
function emitSequenceDef(node: IRNode, owner: WriterOwner, into: ClauseBranch[]): void {
  const sequence = String(node.name);
  for (const step of node.steps as IRNode[]) {
    const timing = step.timing as 'at-turn' | 'later' | 'becomes';
    const turns = Number(step.turns);
    const anchor = (step.anchor as { owner: string; state: string } | null | undefined) ?? null;
    const pre: BranchPrecondition[] = [];
    if (anchor) {
      pre.push(anchor.owner === 'story' ? { kind: 'story-state', state: anchor.state } : { kind: 'state', entity: anchor.owner, state: anchor.state });
    }
    emitClause(
      {
        clause: { kind: 'sequence-step', sequence, timing, turns, anchor },
        owner,
        subject: null,
        command: { kind: 'schedule', timing, turns, anchor },
        pre,
        body: (step.body as IRStatement[] | undefined) ?? [],
        span: spanOf(step) ?? spanOf(node),
      },
      into,
    );
  }
}

/**
 * A timer's `meanwhile` body, if it has one — the timer's named turns carry
 * no statements of their own, so a timer without `meanwhile` yields nothing;
 * its `when <timer> expires` clauses are branches of the entity that holds them.
 */
function emitTimerDef(node: IRNode, storyOwner: WriterOwner, into: ClauseBranch[]): void {
  const meanwhile = node.meanwhile as { chance: number | null; body: IRStatement[] } | null;
  if (!meanwhile) return;
  const timer = String(node.qualified);
  // Timers sit at the story level of the IR whoever declared them; a timer
  // `for <entity>` is that entity's, and its body's `it` is that entity. A
  // timer for the player is always reachable, so it keeps the story owner.
  const declaredFor = typeof node.owner === 'string' && node.owner !== 'player' ? node.owner : null;
  const owner: WriterOwner = declaredFor === null ? storyOwner : { kind: 'entity', id: declaredFor };
  const pre: BranchPrecondition[] =
    meanwhile.chance === null ? [] : [{ kind: 'condition', condition: { kind: 'chance', n: meanwhile.chance }, holds: true }];
  emitClause(
    {
      clause: { kind: 'timer-meanwhile', timer, chance: meanwhile.chance },
      owner,
      subject: declaredFor,
      command: { kind: 'timer-running', timer },
      pre,
      body: meanwhile.body,
      span: spanOf(node),
    },
    into,
  );
}

/**
 * Classify every clause node under one root and emit its branches.
 *
 * Named shapes are handled whole and not descended into again. Anything
 * else that holds a statement list is a `surface` clause named by its key
 * path; its other keys are still walked, so a node with several bodies
 * (a conversation's beats and its parting body, say) yields each.
 *
 * @param node the subtree
 * @param path the key path from the root, for surface labels
 * @param owner what must be reachable for clauses here to fire
 * @param subject the entity `it` refers to here, if any
 * @param into the accumulator to append to
 */
function classify(node: unknown, path: string, owner: WriterOwner, subject: string | null, into: ClauseBranch[]): void {
  if (!isWalkable(node)) return;
  if (Array.isArray(node)) {
    node.forEach((child, index) => classify(child, `${path}[${index}]`, owner, subject, into));
    return;
  }
  const n = node as IRNode;
  const span = spanOf(n);

  if (isOnClause(n)) {
    emitClause(
      {
        clause: {
          kind: 'on',
          clauseKind: n.clauseKind as 'on' | 'after',
          action: String(n.action),
          actor: (n.actor as IRValue | null) ?? null,
          binding: n.binding as 'object' | 'role' | 'every-turn' | 'self',
          role: (n.role as string | null) ?? null,
          once: n.once === true,
        },
        owner,
        subject,
        command: onClauseCommand(n, subject),
        pre: [...(n.once === true ? [{ kind: 'unfired' } as BranchPrecondition] : []), ...guardTerms(n.condition)],
        body: n.body as IRStatement[],
        span,
      },
      into,
    );
    return;
  }
  if (isTimerClause(n)) {
    const timer = String(n.timer);
    emitClause(
      { clause: { kind: 'timer-clause', timer }, owner, subject, command: { kind: 'timer-expires', timer }, pre: guardTerms(n.condition), body: n.body as IRStatement[], span },
      into,
    );
    return;
  }
  if (isMoveClause(n)) {
    const mover = n.mover as IRValue;
    emitClause(
      { clause: { kind: 'move-clause', mover }, owner, subject, command: { kind: 'entity-moves', mover }, pre: guardTerms(n.condition), body: n.body as IRStatement[], span },
      into,
    );
    return;
  }
  if (isTopicRow(n) && subject !== null) {
    const filter = n.filter as IRTopicRow['filter'];
    emitClause(
      { clause: { kind: 'topic', filter }, owner, subject, command: { kind: 'ask', owner: subject, filter }, pre: [], body: n.body as IRStatement[], span },
      into,
    );
    return;
  }
  if (isActionDef(n)) {
    emitActionDef(n, owner, into);
    return;
  }
  if (isMachineDef(n)) {
    emitMachineDef(n, owner, into);
    return;
  }
  if (isSequenceDef(n)) {
    emitSequenceDef(n, owner, into);
    return;
  }
  if (isTimerDef(n)) {
    emitTimerDef(n, owner, into);
    return;
  }

  for (const key of Object.keys(n)) {
    const value = n[key];
    if (isStatementList(value)) {
      const surface = `${path}.${key}`;
      emitClause(
        { clause: { kind: 'surface', surface }, owner, subject, command: { kind: 'none', surface }, pre: guardTerms(n.condition), body: value, span },
        into,
      );
    } else {
      classify(value, `${path}.${key}`, owner, subject, into);
    }
  }
}

// ---------------------------------------------------------------------------
// Entry
// ---------------------------------------------------------------------------

/**
 * Every clause branch in the story — one record per leaf path through
 * every rule the author wrote.
 *
 * Walks every statement-bearing root (`forEachStatementRoot`): each entity,
 * each trait once per composing entity (so a trait's clauses expand to one
 * branch set per carrier, `it` bound to the carrier), each machine, and
 * every remaining top-level surface, the start block among them. Order is
 * the walk's order and depends only on the IR, so two calls over the same
 * IR return equal lists.
 *
 * @param ir the story IR
 * @returns every branch, in walk order; never throws on a well-formed IR
 */
export function collectClauseBranches(ir: StoryIR): ClauseBranch[] {
  const branches: ClauseBranch[] = [];
  const startBlock = ir.startBlock;
  forEachStatementRoot(ir, (root, owner, itBinding) => {
    if (root === startBlock && startBlock) {
      emitClause(
        { clause: { kind: 'start-block' }, owner, subject: null, command: { kind: 'boot' }, pre: [], body: startBlock.body, span: spanOf(startBlock as unknown as IRNode) },
        branches,
      );
      return;
    }
    const label = rootLabel(ir, root, owner, itBinding);
    classify(root, label, owner, itBinding ?? null, branches);
  });
  return branches;
}

/**
 * A readable label for a root, for `surface` clause paths.
 *
 * @param ir the story IR
 * @param root the subtree being visited
 * @param owner its owner
 * @param itBinding the entity `it` refers to there, if any
 * @returns the entity id, `trait:<name>@<composer>`, `machine:<name>`, or the top-level key
 */
function rootLabel(ir: StoryIR, root: unknown, owner: WriterOwner, itBinding: string | undefined): string {
  if (owner.kind === 'machine') return `machine:${owner.name}`;
  if (owner.kind === 'entity') {
    const trait = (ir.traits ?? []).find((candidate) => candidate === root);
    if (trait) return `trait:${trait.name}@${itBinding ?? owner.id}`;
    return owner.id;
  }
  const record = ir as unknown as IRNode;
  for (const key of Object.keys(record)) if (record[key] === root) return key;
  return 'story';
}

