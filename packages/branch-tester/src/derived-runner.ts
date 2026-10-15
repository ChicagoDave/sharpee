/**
 * derived-runner.ts — the derived rule-test runner (ADR-356 D3).
 *
 * Purpose: run the story's own rules as tests. `world-index` enumerates one
 * `ClauseBranch` per leaf path through every clause (D1); this module turns
 * each record into a test and runs it: boot a fresh world at the pinned
 * seed, ARRANGE the branch's precondition through the loader's `arrange()`
 * (D2 — never play to it), run the branch's one command through the real
 * parser and engine (ADR-293 D12), and assert every effect the body names
 * through the assertion core (ADR-340 D3). A refusal branch also asserts
 * the negative space: everything the guarded body would have changed is
 * still what it was arranged to be.
 *
 * Two halves, deliberately split. `planBranch` is pure: it maps a record to
 * arrange terms, a command, and claims, and names by shape anything it
 * cannot express — a non-floor precondition, a command no player types, a
 * body with nothing to assert. `runDerivedBranch` executes a plan against a
 * booted game. A SKIPPED outcome carries the shape and counts in the
 * denominator; it is never silently absent (D2, AC-4). A command the parser
 * cannot resolve — no vocabulary for the action, or a `command.failed`
 * turn — is a FAILED test naming the parse failure, not a skip (AC-7).
 *
 * Score and counter deltas are runner-side reads, not claim kinds (the plan's
 * decision): the runner reads the value after arranging and again after the
 * command and asserts the arithmetic. Endings and the player role are read
 * off the world the same way.
 *
 * Five implicit arrange terms make the typed command reachable, since the
 * enumerator records only what the clause itself guards: every closed
 * container enclosing the subject is opened (unlocked first), the player is
 * placed in the subject's room unless a term already places the player, a
 * standard action's own flag preconditions are satisfied (a door closed
 * and unlocked to open, a tool held to cut), the thing an entity-keyed
 * topic asks about is placed in the room with the speaker, since the parser
 * resolves it against what the player can see, and the thing a standard
 * action acts on is put where that action needs it — in the player's hands
 * for wearing, giving, showing and the other held-object actions, in the
 * player's room when another actor holds it otherwise. A subject still out
 * of the player's sight after that — darkness, concealment — is SKIPPED
 * `subject-unreachable`, never reported as a parse failure of the story.
 *
 * The typed command is the language pattern whose slots the subject can
 * fill: a person takes `[someone]`, anything else `[something]`. A slot the
 * clause leaves unnamed is filled from the arranged world before the
 * command is typed — the item a `must have` precondition holds, else what
 * the player carries; a person in the room, else the first declared person
 * brought in — and a slot nothing fills is SKIPPED `object-unreachable`.
 * A clause with a counterpart tail types the two-slot pattern naming both
 * nouns, the counterpart in hand when the subject is fixed (throwing the
 * letter at the bin); a readable thing's topics are typed as consulting,
 * a person's as asking.
 *
 * Three compositions of floor forms are arranged as compositions, not
 * named as shapes: a named condition expands to its body with `it` bound
 * to the clause subject; an `or` that must hold is arranged by its
 * leftmost operand that maps to floor forms (the witness rule — one leaf
 * per operand was rejected because it would change D1's denominator); and
 * an `and` that must fail is never arranged at all — its operands are read
 * after every write, and the branch runs only if one of them already fails
 * (the never-write-a-negation policy, applied to a conjunction). Arranging
 * is therefore two passes: every write first, then every check, so a later
 * write can never invalidate an earlier check. Within the writes, a thing
 * that must be `here` is placed last, once the player's room is settled.
 *
 * The vocabulary a standard verb is typed from is the booted game's own
 * language provider — one vocabulary, the one the parser will read — not a
 * language package imported here. The suite boots once up front to read it.
 *
 * Public interface: `runDerivedSuite`, `runDerivedBranch`, `planBranch`,
 * `derivedBranchLabel`, and the `DerivedPlan`, `DerivedOutcome`,
 * `DerivedSuiteResult`, `DerivedGame`, `DerivedGameLoader` types.
 * Owner context: @sharpee/branch-tester — the runtime that executes what
 * ADR-356 derives; beside `tree-walker.ts`, never inside it.
 *
 * References: ADR-356 D1/D2/D3/AC-2/AC-3/AC-4/AC-7; ADR-340 D3 (claims are
 * the assertion core's, imported); ADR-322 D8 (consume the derivation, do
 * not re-walk the IR); ADR-293 D12 (real path only).
 */

import type { IRCondition, IRStatement, IRValue, Span, StoryIR } from '@sharpee/chord';
import { collectClauseBranches, type BranchClause, type BranchPrecondition, type ClauseBranch } from '@sharpee/world-index';
import { arrange, CHORD_GONE_PREFIX, CHORD_IR_ID_ATTRIBUTE, CHORD_STATE_PREFIX, counterKey, parsePin } from '@sharpee/story-loader';
import { evaluateStateExpression, runCommand, type AssertionResult, type TestEventInfo, type TranscriptCommand } from '@sharpee/transcript-tester';
import { CHORD_STORY_STATE_KEYS } from './runner.js';

// ---------------------------------------------------------------------------
// Plans
// ---------------------------------------------------------------------------

/** One arrange term: a pin expression that must hold (written) or must not (checked, never written). */
export type ArrangeTerm =
  | { kind: 'pin'; expression: string; mustHold: boolean }
  /** `<entity>` shares the player's room — resolved against the live world, since the room is only known then. */
  | { kind: 'with-player'; entity: string; mustHold: boolean }
  /** The player stands where the subject is, so the command can reach it. Implicit; explicit terms win. */
  | { kind: 'player-to-subject'; subject: string }
  /** Every closed (and locked) container between the subject and its room is opened, so the command can reach it. Implicit. */
  | { kind: 'reach-subject'; subject: string }
  /**
   * The standard action's own preconditions on the subject's flags (a door
   * must be closed to open, a tool held to cut). Implicit; `keep` names the
   * state adjectives the clause itself pins on the subject, which this term
   * never overrides (a `refuse when locked` on opening keeps the lock).
   */
  | { kind: 'action-preconditions'; action: string; subject: string; keep: string[] }
  /**
   * A noun the command names is where the standard action needs it: `held`
   * puts it in the player's hands, `present` brings it into the player's
   * room when another actor holds it. Resolved against the live world after
   * the player is placed. Implicit; an explicit term that places the noun
   * wins.
   */
  | { kind: 'reach-noun'; entity: string; want: 'held' | 'present' }
  /**
   * An `and` that must fail: each operand as the terms that make it HOLD.
   * Never written — checked after every write, and satisfied when at least
   * one operand does not hold.
   */
  | { kind: 'some-fails'; operands: ArrangeTerm[][] };

/** A term that resolves to pin expressions against the live world — every kind but the read-only `some-fails`. */
type ResolvableTerm = Exclude<ArrangeTerm, { kind: 'some-fails' }>;

/**
 * A pattern slot the clause leaves unnamed, filled from the live world at
 * run time: `[something]` by a thing the player holds (the `must have` item
 * a precondition already arranged, else the first in the boot inventory),
 * `[someone]` by a person in the player's room, else the first declared
 * person brought in. `entity` is the IR id when the plan already chose.
 */
export interface SlotFiller {
  token: '[something]' | '[someone]';
  entity: string | null;
  /** What the slot must be, when the pattern says: the `in` / `on` of inserting and putting, the `with` of a lock. */
  role?: 'container' | 'supporter' | 'key';
}

/**
 * What drives the test: one typed command, or nothing (a boot branch asserts
 * the booted world). A standard-action command carries its unfilled slots
 * as `fillers`, resolved and substituted before the command is typed.
 */
export type CommandPlan =
  /** `counterpartLeads`: a counterpart tail's other noun takes the first slot, the one a held-object action needs in hand (ADR-372 D1). */
  | { kind: 'typed'; input: string; fillers?: SlotFiller[]; counterpartLeads?: boolean }
  | { kind: 'none' };

/** One claim the body's effects map to (ADR-356 D3's table). */
export type ClaimPlan =
  | { kind: 'pin'; expression: string }
  | { kind: 'score'; name: string; worth: number }
  | { kind: 'counter'; key: string; label: string; delta: number }
  | { kind: 'ending'; ending: 'victory' | 'defeat'; messageId?: string; cause?: string }
  | { kind: 'player'; entity: string };

/** A value a refused body would have changed, read before and after to prove it did not. */
export type NegativeRead =
  | { kind: 'state'; entity: string }
  | { kind: 'location'; entity: string }
  | { kind: 'gone'; entity: string }
  | { kind: 'score' }
  | { kind: 'counter'; key: string; label: string }
  | { kind: 'player' };

/** The plan for one branch: what to arrange, type, and claim — or why it cannot be run. */
export type DerivedPlan =
  | { kind: 'skip'; shape: string; detail: string }
  /** The command exists in the story and has no vocabulary the parser could resolve (AC-7). */
  | { kind: 'no-vocabulary'; detail: string }
  | {
      kind: 'run';
      arrange: ArrangeTerm[];
      command: CommandPlan;
      claims: ClaimPlan[];
      negativeSpace: NegativeRead[];
      /** Effect statements the table does not map — reported, never silently dropped. */
      unmapped: string[];
    };

// ---------------------------------------------------------------------------
// Outcomes
// ---------------------------------------------------------------------------

export type DerivedStatus = 'passed' | 'failed' | 'skipped' | 'error';

export interface DerivedClaimResult {
  claim: string;
  passed: boolean;
  message?: string;
}

export interface DerivedOutcome {
  branch: ClauseBranch;
  label: string;
  status: DerivedStatus;
  /** SKIPPED: the named shape (D2). */
  shape?: string;
  /** Why it was skipped, what failed at parse, or what the engine threw. */
  detail?: string;
  /** The command typed, when one ran. */
  command?: string;
  /** Expressions arranged, in order. */
  arranged: string[];
  claims: DerivedClaimResult[];
  span: Span | null;
  /**
   * The rooms the player stood in while this branch ran — after arranging
   * and after the command — as IR ids (ADR-356 D5's rooms ratio, the
   * arranged half). Absent when the branch never booted.
   */
  rooms?: string[];
}

export interface DerivedSuiteResult {
  outcomes: DerivedOutcome[];
  /** Equal to the enumerator's record count, by construction (AC-4's self-verification). */
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  errored: number;
  /** Every room any branch placed the player in, as IR ids, each once, in first-visit order. */
  roomsEntered: string[];
}

// ---------------------------------------------------------------------------
// The game seam
// ---------------------------------------------------------------------------

/** The trait fields the runner reads to arrange a standard action's preconditions. */
interface TraitFlags {
  isOpen?: boolean;
  isLocked?: boolean;
  isOn?: boolean;
  toolId?: string;
  keyId?: string;
  /** The identity trait's parser-facing words. */
  name?: string;
  aliases?: string[];
}

/** An entity as the runner reads it. `name` is what the parser resolves a typed noun against. */
export interface DerivedEntity {
  id: string;
  name: string;
  attributes: Record<string, unknown>;
  get(traitType: string): TraitFlags | undefined;
}

/** The world reads the runner makes itself — structural, so no engine class is imported. */
export interface DerivedWorld {
  getPlayer(): DerivedEntity | undefined;
  getEntity(id: string): DerivedEntity | undefined;
  getAllEntities(): DerivedEntity[];
  getLocation(entityId: string): string | undefined | null;
  getContainingRoom(entityId: string): { id: string } | undefined;
  canSee(observerId: string, targetId: string): boolean;
  getStateValue(key: string): unknown;
  getScore(): number;
  getEnding(): { kind: string; messageId?: string; cause?: string } | undefined;
}

/** A booted game: the world for arranging and reading, the engine for its vocabulary, plus the runner seam `runCommand` drives. */
export type DerivedGame = Parameters<typeof runCommand>[1] & { world: DerivedWorld; engine?: DerivedEngine };

/** Boots one fresh game at the pinned seed. Called once per branch, and once more up front for the vocabulary. */
export type DerivedGameLoader = () => Promise<DerivedGame>;

/** The language's patterns for a standard action id (`if.action.taking` → `take [something]`, …), or undefined when it has none. */
export type ActionPatterns = (actionId: string) => string[] | undefined;

/** The engine surface the vocabulary is read from — what bootstrap's `LoadedGame.engine` provides. */
export interface DerivedEngine {
  getLanguageProvider(): { getActionPatterns(actionId: string): string[] | undefined };
  /** The engine's turn counter — what a timer start is stamped with. */
  getContext?(): { currentTurn: number };
}

export interface DerivedRunOptions {
  /** Where standard verbs come from; defaults to the booted game's own language provider. */
  actionPatterns?: ActionPatterns;
  onOutcome?(outcome: DerivedOutcome): void;
}

// ---------------------------------------------------------------------------
// Planning
// ---------------------------------------------------------------------------

/** IR statement kinds whose effects the table maps; anything else is `unmapped`. */
const MAPPED_EFFECTS = new Set([
  'change', 'move', 'remove', 'change-player', 'win', 'lose', 'kill', 'phrase', 'refuse', 'emit', 'award', 'raise', 'lower',
]);

/**
 * Standard actions whose validate phase reads the subject's flags, and what
 * each needs of them — the preconditions the arrange floor's flags exist to
 * satisfy (ADR-356 D2). Read off the live trait at run time; an entity
 * without the trait gets no term.
 */
const STANDARD_PRECONDITIONS = new Set(['opening', 'closing', 'locking', 'unlocking', 'switching_on', 'switching_off', 'cutting', 'digging', 'burning']);

/** Room-lifecycle clauses fire on movement, not on a typed verb naming the room. */
const LIFECYCLE_ACTIONS = new Set(['entering', 'leaving']);

/**
 * Standard actions whose validate phase needs the thing acted on in the
 * player's hands (stdlib's `not_held` / `not_carrying` refusals). Every
 * other action reaches a thing in the room.
 */
const HELD_ACTIONS = new Set(['wearing', 'giving', 'showing', 'dropping', 'putting', 'inserting', 'throwing']);

/** The slot tokens a language pattern can carry. */
const SLOT_TOKEN = /\[(something|someone)\]/g;

/** Language slots that name a thing by its role in the action; any thing fills them. */
const THING_ROLE_SLOT = /\[(target|object|thing|weapon|container|clothing)\]/g;

/** Standard actions whose `with [something]` slot is the lockable's key. */
const KEYED_ACTIONS = new Set(['locking', 'unlocking']);

/**
 * Consequence ids with no grammar of their own, each typed as the verb that
 * causes it: a break is fired by attacking (or dropping a fragile thing, or
 * throwing it), and attacking needs nothing in hand (ADR-373 D3).
 */
const CONSEQUENCE_CAUSES: ReadonlyMap<string, string> = new Map([['breaking', 'attacking']]);

/**
 * The state adjectives the floor writes as trait flags, each with the trait
 * that carries it and its complement. A negated adjective is two-valued, so
 * it is written as its complement rather than checked (the floor's
 * never-write-a-negation policy is about states with more than two values).
 */
const STATE_ADJECTIVES: Record<string, { trait: string; complement: string }> = {
  open: { trait: 'openable', complement: 'closed' },
  closed: { trait: 'openable', complement: 'open' },
  locked: { trait: 'lockable', complement: 'unlocked' },
  unlocked: { trait: 'lockable', complement: 'locked' },
  on: { trait: 'switchable', complement: 'off' },
  off: { trait: 'switchable', complement: 'on' },
};

/** Effects that mutate the world — the ones a refusal's negative space reads. */
const MUTATING_EFFECTS = new Set(['change', 'move', 'remove', 'change-player', 'award', 'raise', 'lower']);

/**
 * Plan one branch: arrange terms from its precondition, the command that
 * fires it, and the claims its effects map to. Pure — nothing here touches a
 * world.
 *
 * An `after` clause reacts to an action that succeeded, so the guards of
 * the `on` clauses intercepting the same action on the same subject are
 * its preconditions too: each refused leaf of those clauses is a guard that
 * must HOLD for the reaction to fire. The enumerator records each clause on
 * its own terms (D1); the runner is where the two meet.
 *
 * @param branch the enumerated record
 * @param ir the story it came from (entity names, action grammars, score worths)
 * @param branches every enumerated branch of the story — siblings of the
 *   same clause give a refusal its negative space, and the intercepting
 *   clauses give an `after` clause its guards
 * @param actionPatterns the vocabulary standard verbs are typed from
 * @returns the plan, or the named reason there is none
 */
export function planBranch(
  branch: ClauseBranch,
  ir: StoryIR,
  branches: ClauseBranch[],
  actionPatterns: ActionPatterns
): DerivedPlan {
  const siblings = branches.filter((candidate) => sameClause(candidate, branch));
  const terms: ArrangeTerm[] = [];
  const intercepting = interceptingGuards(branch, branches);
  if ('intercepted' in intercepting) {
    return { kind: 'skip', shape: 'intercepted', detail: `\`${intercepting.intercepted}\` refuses every ${branch.clause.kind === 'on' ? branch.clause.action : 'firing'} of ${branch.subject ?? 'the story'} before the reaction` };
  }
  for (const precondition of [...intercepting.guards, ...branch.precondition]) {
    const mapped = preconditionTerms(precondition, { ir, subject: branch.subject, reading: false, expanding: [], clause: branch.clause });
    if ('shape' in mapped) return { kind: 'skip', shape: mapped.shape, detail: mapped.detail };
    terms.push(...mapped.terms);
  }

  const claims: ClaimPlan[] = [];
  const unmapped: string[] = [];
  const negativeSpace: NegativeRead[] = [];

  if (branch.leaf.kind === 'refused') {
    claims.push({ kind: 'pin', expression: `emitted ${branch.leaf.phraseKey}` });
    for (const sibling of siblings) {
      if (sibling === branch || sibling.leaf.kind === 'refused') continue;
      for (const effect of sibling.effects) {
        const read = negativeRead(effect, sibling.subject, ir);
        if (read && !negativeSpace.some((existing) => JSON.stringify(existing) === JSON.stringify(read))) {
          negativeSpace.push(read);
        }
      }
    }
  } else {
    for (const effect of branch.effects) {
      if (!MAPPED_EFFECTS.has(effect.kind)) {
        unmapped.push(effect.kind);
        continue;
      }
      if ('stmtWhen' in effect && effect.stmtWhen) {
        unmapped.push(`${effect.kind} (conditional)`);
        continue;
      }
      const claim = effectClaim(effect, branch.subject, ir);
      if (claim) claims.push(claim);
      else unmapped.push(effect.kind);
    }
    if (claims.length === 0) {
      return {
        kind: 'skip',
        shape: 'no-claims',
        detail: unmapped.length > 0 ? `nothing the table maps: ${unmapped.join(', ')}` : 'the body has no effects',
      };
    }
  }

  // Only a branch with something to claim needs a command; a body with
  // nothing to assert is named as such whatever its command looks like.
  const command = commandPlan(branch, ir, actionPatterns, settingValue(branch, ir, branches));
  if (command.kind === 'skip' || command.kind === 'no-vocabulary') return command;

  if (command.kind === 'none' && claims.some((claim) => claim.kind === 'pin' && claim.expression.startsWith('emitted '))) {
    return { kind: 'skip', shape: 'boot-emission', detail: 'a boot branch emits before any command is captured' };
  }

  // The command must reach its subject: open what encloses it, place the
  // player with it (unless a term already says where the player stands),
  // and satisfy the standard action's own preconditions on its flags.
  const reachTarget =
    command.kind !== 'typed' ? null
    : branch.command.kind === 'ask' ? branch.command.owner
    : branch.command.kind === 'action' && branch.command.object !== null ? branch.subject
    : null;
  if (reachTarget !== null) {
    terms.push({ kind: 'reach-subject', subject: reachTarget });
    if (!terms.some((term) => term.kind === 'pin' && term.mustHold && /^player\.location\s*=/.test(term.expression))) {
      terms.push({ kind: 'player-to-subject', subject: reachTarget });
    }
    // An entity-keyed topic is asked about the thing itself, and the parser
    // resolves "the boiler" against what the player can see — so the thing
    // stands in the room with the speaker, unless a term already places it.
    if (branch.command.kind === 'ask' && branch.command.filter.kind === 'entity') {
      const topicEntity = branch.command.filter.id;
      const placed = new RegExp(`^(${topicEntity}\\.location\\s*=|player\\.inventory contains ${topicEntity}$)`);
      if (!terms.some((term) => term.kind === 'pin' && term.mustHold && placed.test(term.expression))) {
        terms.push({ kind: 'with-player', entity: topicEntity, mustHold: true });
      }
    }
    if (branch.command.kind === 'action' && STANDARD_PRECONDITIONS.has(branch.command.action) && !ir.actions.some((action) => action.name === (branch.command as { action: string }).action)) {
      // The adjectives the clause pins on its subject, as they will hold
      // once arranged: a pinned `locked` stays locked, a negated `locked`
      // becomes `unlocked`.
      const keep: string[] = [];
      for (const term of terms) {
        if (term.kind !== 'pin') continue;
        const pin = parsePin(term.expression);
        if (pin.kind !== 'declared-state' || pin.name !== reachTarget || !(pin.state in STATE_ADJECTIVES)) continue;
        keep.push(term.mustHold !== pin.negated ? pin.state : STATE_ADJECTIVES[pin.state].complement);
      }
      terms.push({ kind: 'action-preconditions', action: branch.command.action, subject: reachTarget, keep });
    }
    // A thing the standard action acts on is where the action needs it —
    // in the player's hands, or in the room when another actor holds it —
    // unless a term already places it. A person subject (the viewer, the
    // recipient) stands in its own room, where the player was just placed.
    const standardAction = branch.command.kind === 'action' && !ir.actions.some((action) => action.name === (branch.command as { action: string }).action);
    // When a counterpart leads, it is the thing in hand and the subject is
    // only reached (ADR-372 D1).
    const leads = command.kind === 'typed' && command.counterpartLeads === true;
    const counterpart = branch.clause.kind === 'on' ? branch.clause.counterpart : undefined;
    const placedPin = (entity: string): RegExp => new RegExp(`^(${entity}\\.location\\s*=|player\\.inventory contains ${entity}$)`);
    if (standardAction && branch.command.kind === 'action' && !isPerson(ir, reachTarget)) {
      if (!terms.some((term) => term.kind === 'pin' && term.mustHold && placedPin(reachTarget).test(term.expression))) {
        terms.push({ kind: 'reach-noun', entity: reachTarget, want: HELD_ACTIONS.has(branch.command.action) && !leads ? 'held' : 'present' });
      }
    }
    if (standardAction && branch.command.kind === 'action' && leads && counterpart !== undefined && HELD_ACTIONS.has(branch.command.action)) {
      if (!terms.some((term) => term.kind === 'pin' && term.mustHold && placedPin(counterpart).test(term.expression))) {
        terms.push({ kind: 'reach-noun', entity: counterpart, want: 'held' });
      }
    }
  }

  return { kind: 'run', arrange: terms, command, claims, negativeSpace, unmapped };
}

/**
 * For an `after` clause, what every `on` clause intercepting the same
 * action on the same subject needs in order to let the action through: the
 * guard of each refused leaf — its last precondition, the condition that
 * fires that refusal — flipped so it does NOT fire (a `refuse when` guard
 * must fail; a `must` requirement must hold). An `on` clause that refuses
 * unconditionally intercepts every firing, and the reaction can never run.
 */
function interceptingGuards(branch: ClauseBranch, branches: ClauseBranch[]): { guards: BranchPrecondition[] } | { intercepted: string } {
  if (branch.clause.kind !== 'on' || branch.clause.clauseKind !== 'after') return { guards: [] };
  const action = branch.clause.action;
  const guards: BranchPrecondition[] = [];
  for (const candidate of branches) {
    if (candidate.subject !== branch.subject) continue;
    if (candidate.clause.kind !== 'on' || candidate.clause.clauseKind !== 'on' || candidate.clause.action !== action) continue;
    // ADR-371 D4: a `to <value>` refusal intercepts only that value. The
    // run types the branch's own tail, or a value no tail names, so a
    // refusal tailed to another value never fires on it.
    if (candidate.clause.valueTail !== undefined && candidate.clause.valueTail !== branch.clause.valueTail) continue;
    // ADR-372 D1: likewise a counterpart-tailed refusal intercepts only
    // commands naming that other noun.
    if (candidate.clause.counterpart !== undefined && candidate.clause.counterpart !== branch.clause.counterpart) continue;
    if (candidate.leaf.kind === 'refused') {
      const own = candidate.precondition[candidate.precondition.length - 1];
      if (own?.kind === 'condition') guards.push({ kind: 'condition', condition: own.condition, holds: !own.holds });
      continue;
    }
    const refusal = candidate.effects.find((effect) => effect.kind === 'refuse' && !('stmtWhen' in effect && effect.stmtWhen));
    if (refusal && refusal.kind === 'refuse') return { intercepted: refusal.phraseKey };
  }
  return { guards };
}

/** What a condition is mapped within: the story, the clause subject `it` binds to, and how the terms will be used. */
interface ConditionScope {
  ir: StoryIR;
  subject: string | null;
  /**
   * True inside an `and` that must fail: its operands are only ever READ
   * (the run proves one already fails), so an `or` that must hold cannot
   * stand in for its witness there — the read would answer for one
   * alternative while the guard answers for all of them.
   */
  reading: boolean;
  /** Named conditions being expanded, so a condition that names itself is a named shape and not a stack overflow. */
  expanding: string[];
  /** The branch's clause, when it has one — an ordinal is arranged by the clause's identity. */
  clause?: BranchClause;
}

/** The arrange terms one precondition record needs, or the shape it cannot be expressed in. */
function preconditionTerms(
  precondition: BranchPrecondition,
  scope: ConditionScope
): { terms: ArrangeTerm[] } | { shape: string; detail: string } {
  switch (precondition.kind) {
    case 'condition':
      return conditionTerms(precondition.condition, precondition.holds, scope);
    case 'state':
      return { terms: [{ kind: 'pin', expression: `${precondition.entity} is ${precondition.state}`, mustHold: true }] };
    case 'story-state':
      return { terms: [{ kind: 'pin', expression: `story.state = ${precondition.state}`, mustHold: true }] };
    case 'value':
      return { shape: 'select-value', detail: 'a `select on` over something other than a state' };
    case 'ordinal': {
      // The first firing is what a fresh world gives. A later one is the
      // clause's counter set to N-1 on that fresh world — the earlier
      // bodies never ran, which is the state the Nth body is proved in
      // (ADR-356 D2: arrange, never play to it).
      if (precondition.ordinal <= 1) return { terms: [] };
      const clause = scope.clause;
      if (clause === undefined || clause.kind !== 'on' || clause.clause === undefined) {
        return { shape: 'occurrence', detail: `the ${ordinalWord(precondition.ordinal)} firing of a clause with no position` };
      }
      const root = clause.root;
      const owner = root.kind === 'story' ? 'story' : root.kind === 'entity' ? root.id : `${root.entity} trait ${root.name}`;
      return { terms: [{ kind: 'pin', expression: `${owner} clause ${clause.clause} occurrence = ${precondition.ordinal - 1}`, mustHold: true }] };
    }
    case 'unfired':
      return { terms: [] };
    case 'alternative':
      return { shape: 'select-alternative', detail: `alternative ${precondition.index} of select ${precondition.id}` };
    case 'machine-state':
      return { shape: 'machine-state', detail: `${precondition.machine} in ${precondition.state}` };
  }
}

/**
 * The arrange terms a condition needs to hold (or to fail), or the shape it
 * cannot be expressed in.
 *
 * An `or` that must hold is arranged by its WITNESS: the leftmost operand
 * that maps to floor forms. Leftmost, not cheapest or first-by-form, so the
 * choice is deterministic and reads straight off the source. The rejected
 * alternative — one enumerated leaf per operand — would change ADR-356
 * D1's one-test-per-leaf denominator, which is not this runner's to move.
 *
 * An `and` that must fail chooses nothing: every operand is mapped as what
 * makes it hold, and the run reads them after every write, satisfied when
 * one already fails. That is the runner's existing never-write-a-negation
 * policy applied to a conjunction.
 */
function conditionTerms(
  condition: IRCondition,
  holds: boolean,
  scope: ConditionScope
): { terms: ArrangeTerm[] } | { shape: string; detail: string } {
  switch (condition.kind) {
    case 'and': {
      if (holds) {
        const terms: ArrangeTerm[] = [];
        for (const operand of condition.operands) {
          const mapped = conditionTerms(operand, true, scope);
          if ('shape' in mapped) return mapped;
          terms.push(...mapped.terms);
        }
        return { terms };
      }
      const operands: ArrangeTerm[][] = [];
      for (const operand of condition.operands) {
        const mapped = conditionTerms(operand, true, { ...scope, reading: true });
        if ('shape' in mapped) return mapped;
        operands.push(mapped.terms);
      }
      return { terms: [{ kind: 'some-fails', operands }] };
    }
    case 'or': {
      if (!holds) {
        const terms: ArrangeTerm[] = [];
        for (const operand of condition.operands) {
          const mapped = conditionTerms(operand, false, scope);
          if ('shape' in mapped) return mapped;
          terms.push(...mapped.terms);
        }
        return { terms };
      }
      if (scope.reading) {
        return { shape: 'condition-or', detail: 'an `or` inside a failed `and` has no single witness to read' };
      }
      let unmappable: { shape: string; detail: string } | null = null;
      for (const operand of condition.operands) {
        const mapped = conditionTerms(operand, true, scope);
        if ('shape' in mapped) {
          unmappable ??= mapped;
          continue;
        }
        return mapped;
      }
      return { shape: 'condition-or', detail: `no operand of the \`or\` maps to a floor form (${unmappable?.detail ?? 'empty'})` };
    }
    case 'not':
      return conditionTerms(condition.operand, !holds, scope);
    case 'condition': {
      const named = scope.ir.conditions.find((candidate) => candidate.name === condition.name);
      if (!named) return { shape: 'condition-condition', detail: `\`${condition.name}\` names no condition the story defines` };
      if (scope.expanding.includes(condition.name)) {
        return { shape: 'condition-condition', detail: `\`${condition.name}\` refers to itself` };
      }
      return conditionTerms(named.condition, holds, { ...scope, expanding: [...scope.expanding, condition.name] });
    }
    case 'story-state':
      return { terms: [{ kind: 'pin', expression: `story.state = ${condition.state}`, mustHold: holds }] };
    case 'predicate': {
      const effective = condition.negated ? !holds : holds;
      const left = valueName(condition.subject, scope.subject);
      const right = valueName(condition.object, scope.subject);
      if (left === null || right === null) {
        return { shape: `predicate-${condition.pred}`, detail: 'a predicate over something other than a named entity' };
      }
      switch (condition.pred) {
        case 'is':
          return { terms: [{ kind: 'pin', expression: `${left} is ${right}`, mustHold: effective }] };
        case 'is-in':
          return { terms: [{ kind: 'pin', expression: `${left}.location = ${right}`, mustHold: effective }] };
        case 'holds':
        case 'has':
          return { terms: [{ kind: 'pin', expression: `${left}.inventory contains ${right}`, mustHold: effective }] };
        case 'is-here':
          return { terms: [{ kind: 'with-player', entity: left, mustHold: effective }] };
        default:
          return { shape: `predicate-${condition.pred}`, detail: `\`${condition.pred}\` is not a floor form` };
      }
    }
    case 'timer-has':
      return { terms: [{ kind: 'pin', expression: `${condition.timer} has ${condition.what}`, mustHold: holds }] };
    case 'asked':
      return { terms: [{ kind: 'pin', expression: `it asked ${condition.word.replace('-', ' ')}`, mustHold: holds }] };
    case 'discussed':
      return { terms: [{ kind: 'pin', expression: `${condition.topic} was discussed`, mustHold: holds }] };
    default:
      return { shape: `condition-${condition.kind}`, detail: `\`${condition.kind}\` is not a floor form` };
  }
}

/**
 * The pin-grammar name of an IR value: the player, a named entity, the
 * clause's subject for `it`, a symbol or literal as its text; null for a
 * value with no name (a field, a counter, a slot).
 */
function valueName(value: IRValue, subject: string | null): string | null {
  switch (value.kind) {
    case 'player':
      return 'player';
    case 'entity':
      return value.id;
    case 'it':
      return subject;
    case 'story':
      return 'story';
    case 'symbol':
      return value.name;
    case 'literal':
      return value.value;
    default:
      return null;
  }
}

/** The command that fires the branch, or the named reason none can be typed. */
/**
 * The value a `setting` branch types (ADR-371 D4): the clause's own tail;
 * else the subject's first state that no tailed sibling clause on the same
 * subject names, so an untailed reaction is reached without tripping a
 * refusal tailed to another value. Undefined for every other action.
 * @param branch the branch being planned
 * @param ir the story
 * @param branches every branch of the story
 * @returns the state word to type after `to`
 */
function settingValue(branch: ClauseBranch, ir: StoryIR, branches: ClauseBranch[]): string | undefined {
  if (branch.clause.kind !== 'on' || branch.clause.action !== 'setting') return undefined;
  if (branch.clause.valueTail !== undefined) return branch.clause.valueTail;
  const states = ir.entities.find((entity) => entity.id === branch.subject)?.states ?? [];
  const tailed = new Set(
    branches
      .filter((candidate) => candidate.subject === branch.subject && candidate.clause.kind === 'on' && candidate.clause.action === 'setting')
      .map((candidate) => (candidate.clause.kind === 'on' ? candidate.clause.valueTail : undefined))
      .filter((tail): tail is string => tail !== undefined),
  );
  return states.find((state) => !tailed.has(state)) ?? states[0];
}

function commandPlan(
  branch: ClauseBranch,
  ir: StoryIR,
  actionPatterns: ActionPatterns,
  value?: string
): CommandPlan | { kind: 'skip'; shape: string; detail: string } | { kind: 'no-vocabulary'; detail: string } {
  const command = branch.command;
  switch (command.kind) {
    case 'boot':
      return { kind: 'none' };
    case 'any-turn':
      return { kind: 'typed', input: 'wait' };
    case 'ask': {
      const owner = entityName(ir, command.owner) ?? command.owner;
      const topic = command.filter.kind === 'text' ? command.filter.primary : entityName(ir, command.filter.id) ?? command.filter.id;
      // ADR-372 D4: a readable thing's topics answer consulting; asking is
      // a person's verb and refuses a book as no one to talk to.
      return { kind: 'typed', input: isPerson(ir, command.owner) ? `ask ${owner} about ${topic}` : `consult ${owner} about ${topic}` };
    }
    case 'action': {
      if (command.actor !== 'player') {
        return { kind: 'skip', shape: 'command-npc-action', detail: `${command.actor.entity} acts, not the player` };
      }
      if (LIFECYCLE_ACTIONS.has(command.action) && command.object !== null && isPlace(ir, command.object)) {
        return { kind: 'skip', shape: 'command-lifecycle', detail: `\`${command.action}\` a room fires on movement, not on a typed verb` };
      }
      const objectName = command.object === null ? null : entityName(ir, command.object) ?? command.object;
      const storyAction = ir.actions.find((action) => action.name === command.action);
      if (storyAction) {
        const pattern = storyAction.patterns[0];
        if (!pattern) return { kind: 'no-vocabulary', detail: `story action \`${command.action}\` declares no grammar` };
        const words: string[] = [];
        let filled = false;
        for (const part of pattern.parts) {
          if (part.optional) continue;
          if (part.kind === 'word') words.push(part.word);
          else if (part.kind === 'alt') words.push(part.words[0]);
          else if (objectName !== null && !filled && (command.role === null || part.word === command.role)) {
            words.push(objectName);
            filled = true;
          } else {
            return { kind: 'skip', shape: 'command-shape', detail: `slot \`${part.word}\` of \`${command.action}\` has no filler` };
          }
        }
        if (objectName !== null && !filled) {
          return { kind: 'skip', shape: 'command-shape', detail: `\`${command.action}\` has no slot for its subject` };
        }
        return { kind: 'typed', input: words.join(' ') };
      }
      const actionId = `if.action.${CONSEQUENCE_CAUSES.get(command.action) ?? command.action}`;
      const patterns = actionPatterns(actionId);
      if (!patterns || patterns.length === 0) {
        return { kind: 'no-vocabulary', detail: `no language pattern for ${actionId}` };
      }
      const slotsOf = (pattern: string): string[] => pattern.match(SLOT_TOKEN) ?? [];
      if (objectName === null || command.object === null) {
        const bare = patterns.find((candidate) => slotsOf(candidate).length === 0);
        if (!bare) return { kind: 'skip', shape: 'command-shape', detail: `no 0-object pattern for ${actionId}` };
        return { kind: 'typed', input: bare.trim() };
      }
      // The subject takes the slot of its kind — a person is `[someone]`,
      // anything else `[something]` — in the pattern with the fewest slots
      // that has one (the first such on ties, so the choice reads off the
      // language file). Every other slot is a filler the run chooses.
      // A person falls back to `[something]` when no pattern of the action
      // has a `[someone]` slot (attacking, examining, listening): a person
      // is a thing to those verbs.
      const fewestWith = (token: string): string | undefined => {
        let pattern: string | undefined;
        for (const candidate of patterns) {
          const slots = slotsOf(candidate);
          if (!slots.includes(token)) continue;
          if (pattern === undefined || slots.length < slotsOf(pattern).length) pattern = candidate;
        }
        return pattern;
      };
      let subjectToken = isPerson(ir, command.object) ? '[someone]' : '[something]';
      let pattern = fewestWith(subjectToken);
      if (!pattern && subjectToken === '[someone]') {
        subjectToken = '[something]';
        pattern = fewestWith(subjectToken);
      }
      // A lock is typed with its `with` slot: the key is decided from the
      // lockable at run time, and the slot is dropped when it names none.
      if (KEYED_ACTIONS.has(command.action)) {
        const keyed = patterns.find((candidate) => slotsOf(candidate).includes(subjectToken) && / with \[something\]$/.test(candidate));
        if (keyed) pattern = keyed;
      }
      if (!pattern) {
        return { kind: 'skip', shape: 'command-shape', detail: `no pattern of ${actionId} has a slot for its subject` };
      }
      // ADR-372 D1: a counterpart tail names the other noun, so the command
      // is a two-slot pattern with the counterpart in the slot the subject
      // does not take. Between two `[something]` slots the first is the
      // thing in hand: a fixed subject (scenery, a person, a place) takes the
      // second and the counterpart leads; any other subject leads.
      const counterpart = branch.clause.kind === 'on' ? branch.clause.counterpart : undefined;
      if (counterpart !== undefined) {
        const counterpartToken = isPerson(ir, counterpart) ? '[someone]' : '[something]';
        const wanted = [subjectToken, counterpartToken].sort().join(' ');
        // The language names some thing slots by role (`throw [something]
        // at [target]`); each is a `[something]` to the typed command.
        const paired = patterns
          .map((candidate) => candidate.replace(THING_ROLE_SLOT, '[something]'))
          .find((candidate) => [...slotsOf(candidate)].sort().join(' ') === wanted);
        if (!paired) {
          return { kind: 'skip', shape: 'command-shape', detail: `no pattern of ${actionId} has slots for its subject and ${counterpart}` };
        }
        const slots = slotsOf(paired);
        const subjectAt =
          subjectToken !== counterpartToken ? slots.indexOf(subjectToken)
          : isFixed(ir, command.object) && !isFixed(ir, counterpart) ? 1
          : 0;
        let at = 0;
        const typed = paired.replace(SLOT_TOKEN, (token) => (at++ === subjectAt ? objectName : token)).trim();
        return { kind: 'typed', input: typed, fillers: [{ token: counterpartToken, entity: counterpart }], counterpartLeads: subjectAt !== 0 };
      }
      // ADR-371 D4: a setting pattern's `[value]` takes the planned state word.
      const input = pattern.replace(subjectToken, objectName).replace('[value]', value ?? '[value]').trim();
      // The preposition before a slot names what fills it: `in` / `into` a
      // container, `on` / `onto` a supporter, `with` the lockable's key for
      // locking and unlocking. Any other slot takes any thing.
      const fillers: SlotFiller[] = [];
      for (const match of input.matchAll(/(?:\b(in|into|on|onto|with)\s+)?(\[(?:something|someone)\])/g)) {
        const token = match[2] as SlotFiller['token'];
        const preposition = match[1];
        const role =
          preposition === 'in' || preposition === 'into' ? 'container'
          : preposition === 'on' || preposition === 'onto' ? 'supporter'
          : preposition === 'with' && KEYED_ACTIONS.has(command.action) ? 'key'
          : undefined;
        fillers.push(role ? { token, entity: null, role } : { token, entity: null });
      }
      return fillers.length > 0 ? { kind: 'typed', input, fillers } : { kind: 'typed', input };
    }
    default:
      return { kind: 'skip', shape: `command-${command.kind}`, detail: 'no player command fires this branch' };
  }
}

/** The claim one effect statement maps to (ADR-356 D3's table), or null when it has none. */
function effectClaim(effect: IRStatement, subject: string | null, ir: StoryIR): ClaimPlan | null {
  switch (effect.kind) {
    case 'change': {
      const entity = valueName(effect.entity, subject);
      return entity ? { kind: 'pin', expression: `${entity} is ${effect.state}` } : null;
    }
    case 'move': {
      const entity = valueName(effect.entity, subject);
      const place = valueName(effect.place, subject);
      if (!entity || !place) return null;
      return place === 'player'
        ? { kind: 'pin', expression: `player.inventory contains ${entity}` }
        : { kind: 'pin', expression: `${entity}.location = ${place}` };
    }
    case 'remove': {
      const entity = valueName(effect.entity, subject);
      return entity ? { kind: 'pin', expression: `${entity} is gone` } : null;
    }
    case 'change-player': {
      const entity = valueName(effect.entity, subject);
      return entity ? { kind: 'player', entity } : null;
    }
    case 'win':
      return { kind: 'ending', ending: 'victory', ...(effect.phraseKey ? { messageId: effect.phraseKey } : {}) };
    case 'lose':
      return { kind: 'ending', ending: 'defeat', ...(effect.phraseKey ? { messageId: effect.phraseKey } : {}) };
    case 'kill':
      return { kind: 'ending', ending: 'defeat', cause: effect.phraseKey ?? 'killed' };
    case 'phrase':
    case 'refuse':
      return { kind: 'pin', expression: `emitted ${effect.phraseKey}` };
    case 'emit':
      return { kind: 'pin', expression: `emitted ${effect.event}` };
    case 'award': {
      if (effect.expression.length !== 1) return null;
      const name = effect.expression[0];
      const score = ir.scores.find((candidate) => candidate.name === name);
      return score ? { kind: 'score', name, worth: score.worth } : null;
    }
    case 'raise':
    case 'lower': {
      const owner = effect.owner === null ? null : valueName(effect.owner, subject);
      if (effect.owner !== null && owner === null) return null;
      const key = counterKey(effect.counter, owner === null || owner === 'player' ? undefined : owner);
      return { kind: 'counter', key, label: owner ? `${owner}'s ${effect.counter}` : effect.counter, delta: effect.kind === 'raise' ? effect.amount : -effect.amount };
    }
    default:
      return null;
  }
}

/** The world value one mutating effect would change, for a refusal's negative space. */
function negativeRead(effect: IRStatement, subject: string | null, ir: StoryIR): NegativeRead | null {
  if (!MUTATING_EFFECTS.has(effect.kind)) return null;
  const claim = effectClaim(effect, subject, ir);
  if (!claim) return null;
  switch (claim.kind) {
    case 'pin': {
      const pin = parsePin(claim.expression);
      if (pin.kind === 'declared-state') return { kind: 'state', entity: pin.name };
      if (pin.kind === 'location') return { kind: 'location', entity: pin.entity };
      if (pin.kind === 'contains') return { kind: 'location', entity: pin.item };
      if (pin.kind === 'gone') return { kind: 'gone', entity: pin.name };
      return null;
    }
    case 'score':
      return { kind: 'score' };
    case 'counter':
      return { kind: 'counter', key: claim.key, label: claim.label };
    case 'player':
      return { kind: 'player' };
    default:
      return null;
  }
}

/** Whether an IR entity is a room or a region. */
/** Whether the IR declares the entity `a person` — the kind that fills a `[someone]` slot. */
function isPerson(ir: StoryIR, irId: string): boolean {
  return ir.entities.find((entity) => entity.id === irId)?.kinds.some((kind) => kind.name === 'person') ?? false;
}

/** Whether the entity stays put for a held-object verb: scenery, a person, or a place. */
function isFixed(ir: StoryIR, irId: string): boolean {
  const entity = ir.entities.find((candidate) => candidate.id === irId);
  return entity !== undefined && (isPerson(ir, irId) || isPlace(ir, irId) || entity.traits.some((trait) => trait.name === 'scenery'));
}

function isPlace(ir: StoryIR, irId: string): boolean {
  const entity = ir.entities.find((candidate) => candidate.id === irId);
  return entity !== undefined && entity.kinds.some((kind) => kind.name === 'room' || kind.name === 'region');
}

const ORDINAL_WORDS = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth', 'eleventh', 'twelfth'];

/** `first` … `twelfth` as Chord spells an ordinal block; past those, `13th`. */
function ordinalWord(ordinal: number): string {
  return ORDINAL_WORDS[ordinal - 1] ?? `${ordinal}th`;
}

/** The display name of an IR entity, or undefined when the id names none. */
function entityName(ir: StoryIR, irId: string): string | undefined {
  return ir.entities.find((entity) => entity.id === irId)?.name;
}

/** A one-line label for a branch: subject, clause, leaf. */
export function derivedBranchLabel(branch: ClauseBranch, ir: StoryIR): string {
  const owner = branch.owner;
  const ownerName = owner.kind === 'entity' ? entityName(ir, owner.id) ?? owner.id : owner.kind === 'machine' ? owner.name : 'story';
  const subject = branch.subject === null ? ownerName : entityName(ir, branch.subject) ?? branch.subject;
  const clause = branch.clause;
  let clauseText: string;
  switch (clause.kind) {
    case 'on':
      clauseText = `${clause.clauseKind} ${clause.action}${clause.once ? ', once' : ''}`;
      break;
    case 'timer-clause':
      clauseText = `when ${clause.timer} expires`;
      break;
    case 'move-clause':
      clauseText = 'when it moves';
      break;
    case 'topic':
      clauseText = `topic ${clause.filter.kind === 'text' ? clause.filter.primary : clause.filter.id}`;
      break;
    case 'action':
      clauseText = `define action ${clause.action}`;
      break;
    case 'machine-transition':
      clauseText = `${clause.machine}: ${clause.from} → ${clause.to}`;
      break;
    case 'sequence-step':
      clauseText = `sequence ${clause.sequence} step`;
      break;
    case 'timer-meanwhile':
      clauseText = `${clause.timer} meanwhile`;
      break;
    case 'start-block':
      clauseText = 'before the game starts';
      break;
    case 'surface':
      clauseText = clause.surface;
      break;
  }
  const leaf = branch.leaf;
  const leafText =
    leaf.kind === 'through' ? '' :
    leaf.kind === 'refused' ? ` · refused ${leaf.phraseKey}` :
    leaf.kind === 'arm' ? ` · when ${leaf.value}` :
    leaf.kind === 'ordinal' ? ` · the ${ordinalWord(leaf.ordinal)} time` :
    leaf.kind === 'response' ? ` · answers ${leaf.phraseKey}` :
    ` · alternative ${leaf.index}`;
  return `${subject} · ${clauseText}${leafText}`;
}

// ---------------------------------------------------------------------------
// Execution
// ---------------------------------------------------------------------------

/**
 * Run every branch of a story: enumerate, plan, execute. One fresh boot per
 * branch, sequentially — the pinned seed makes the whole run deterministic.
 *
 * @param ir the compiled story
 * @param loadGame boots one fresh game at the pinned seed
 * @param options the language and an outcome observer
 * @returns every outcome, one per enumerated branch, with the tally
 */
export async function runDerivedSuite(
  ir: StoryIR,
  loadGame: DerivedGameLoader,
  options: DerivedRunOptions = {}
): Promise<DerivedSuiteResult> {
  const branches = collectClauseBranches(ir);
  const actionPatterns = options.actionPatterns ?? (await vocabularyOf(loadGame));
  const outcomes: DerivedOutcome[] = [];
  for (const branch of branches) {
    const outcome = await runDerivedBranch(branch, ir, branches, loadGame, actionPatterns);
    outcomes.push(outcome);
    options.onOutcome?.(outcome);
  }
  const count = (status: DerivedStatus): number => outcomes.filter((outcome) => outcome.status === status).length;
  const roomsEntered: string[] = [];
  for (const room of outcomes.flatMap((outcome) => outcome.rooms ?? [])) {
    if (!roomsEntered.includes(room)) roomsEntered.push(room);
  }
  return {
    outcomes,
    total: branches.length,
    passed: count('passed'),
    failed: count('failed'),
    skipped: count('skipped'),
    errored: count('error'),
    roomsEntered,
  };
}

/** The IR id of the room the player stands in, or undefined when offstage or unstamped. */
function playerRoomIrIdOf(world: DerivedWorld): string | undefined {
  const player = world.getPlayer();
  const room = player ? world.getContainingRoom(player.id) : undefined;
  const irId = room ? world.getEntity(room.id)?.attributes[CHORD_IR_ID_ATTRIBUTE] : undefined;
  return typeof irId === 'string' ? irId : undefined;
}

/**
 * The vocabulary of the game the loader boots: one throwaway boot, read
 * through the engine's own language provider.
 *
 * @throws when the loader's game carries no engine to read a language from
 */
async function vocabularyOf(loadGame: DerivedGameLoader): Promise<ActionPatterns> {
  const game = await loadGame();
  const provider = game.engine?.getLanguageProvider();
  if (!provider) {
    throw new Error('derived runner: the booted game exposes no engine language provider and no actionPatterns option was given');
  }
  return (actionId) => provider.getActionPatterns(actionId);
}

/** Whether two records are leaves of the same clause on the same subject. */
function sameClause(a: ClauseBranch, b: ClauseBranch): boolean {
  return a.subject === b.subject && JSON.stringify(a.owner) === JSON.stringify(b.owner) && JSON.stringify(a.clause) === JSON.stringify(b.clause);
}

/**
 * Run one branch: plan it, boot, arrange, run the command, assert.
 *
 * @param branch the record under test
 * @param ir the story it came from
 * @param branches every enumerated branch of the story (see `planBranch`)
 * @param loadGame boots one fresh game at the pinned seed
 * @param actionPatterns the vocabulary standard verbs are typed from
 * @returns the outcome, never a throw: an engine error is an `error` outcome
 */
export async function runDerivedBranch(
  branch: ClauseBranch,
  ir: StoryIR,
  branches: ClauseBranch[],
  loadGame: DerivedGameLoader,
  actionPatterns: ActionPatterns
): Promise<DerivedOutcome> {
  const label = derivedBranchLabel(branch, ir);
  const base = { branch, label, span: branch.span, arranged: [] as string[], claims: [] as DerivedClaimResult[] };
  const plan = planBranch(branch, ir, branches, actionPatterns);
  if (plan.kind === 'skip') return { ...base, status: 'skipped', shape: plan.shape, detail: plan.detail };
  if (plan.kind === 'no-vocabulary') return { ...base, status: 'failed', detail: `parse failure: ${plan.detail}` };

  let game: DerivedGame;
  try {
    game = await loadGame();
  } catch (error) {
    return { ...base, status: 'error', detail: `boot failed: ${error instanceof Error ? error.message : String(error)}` };
  }
  const world = game.world;

  // ── Arrange, pass one: every write ─────────────────────────────────────
  // Terms resolve in order because a later one reads what an earlier one
  // wrote (the player goes where the subject was just placed). A thing
  // that must be `here` is written last of all: "here" is wherever the
  // player finally stands, which the implicit placement decides. Anything
  // that is only checked waits for pass two, after the last write.
  const arranged: string[] = [];
  // A check is kept as its term, not its expression: a `here` that must
  // NOT hold is resolved only in pass two, against the room the player
  // finally stands in.
  const checks: ArrangeTerm[] = [];
  const isHereWrite = (term: ArrangeTerm): boolean => term.kind === 'with-player' && term.mustHold;
  const writesInOrder = [...plan.arrange.filter((term) => !isHereWrite(term)), ...plan.arrange.filter(isHereWrite)];
  let reachTarget: string | null = null;
  /** Whether the plan pins this very state to hold: a negation of it is then a contradiction the check pass names, never a write to undo. */
  const pinnedToHold = (expression: string): boolean => plan.arrange.some((other) => other.kind === 'pin' && other.mustHold && other.expression === expression);
  for (const term of writesInOrder) {
    // A negated two-valued state (a state adjective, a two-state entity, a
    // two-phase story) is written as its complement, not left to a read —
    // unless the same state is pinned to hold elsewhere in the plan.
    const complement = term.kind === 'pin' && !term.mustHold && !pinnedToHold(term.expression) ? pinComplement(term.expression, world, ir) : undefined;
    if (complement !== undefined) {
      const result = arrange(world as never, complement, { turn: game.engine?.getContext?.().currentTurn });
      if (!result.arranged) return { ...base, status: 'skipped', shape: result.shape, detail: result.detail ?? complement, arranged };
      arranged.push(complement);
      continue;
    }
    if (term.kind === 'some-fails' || ((term.kind === 'pin' || term.kind === 'with-player') && !term.mustHold)) {
      checks.push(term);
      continue;
    }
    const resolved = resolveTerm(term, world);
    if ('shape' in resolved) return { ...base, status: 'skipped', shape: resolved.shape, detail: resolved.detail, arranged };
    if (term.kind === 'reach-subject') reachTarget = term.subject;
    for (const expression of resolved.expressions) {
      // A timer started here is stamped with the engine's turn, as a story
      // `start` would be, so it first steps on the turn after the command.
      const result = arrange(world as never, expression, { turn: game.engine?.getContext?.().currentTurn });
      if (!result.arranged) {
        return { ...base, status: 'skipped', shape: result.shape, detail: result.detail ?? expression, arranged };
      }
      arranged.push(expression);
    }
  }

  // ── Arrange, pass two: every check ─────────────────────────────────────
  // Never written: the arranged world must already fail a negated term, and
  // must already fail some operand of a failed `and` — or the branch needs
  // a negation the floor does not arrange.
  for (const check of checks) {
    if (check.kind === 'some-fails') {
      let held = termHolds(check, world);
      if ('shape' in held) return { ...base, status: 'skipped', shape: held.shape, detail: held.detail, arranged };
      if (!held.holds) {
        // Every operand holds. A failed `and` is still never chosen among
        // many-valued states — but an operand whose state is two-valued (a
        // state adjective, a two-state entity, a two-phase story) has one
        // complement, the one write that makes the conjunction fail: the
        // leftmost such operand is written.
        const witness = check.operands
          .map((operand) =>
            operand.length === 1 && operand[0].kind === 'pin' && operand[0].mustHold && !pinnedToHold(operand[0].expression)
              ? pinComplement(operand[0].expression, world, ir)
              : undefined
          )
          .find((complement) => complement !== undefined);
        if (witness !== undefined) {
          const result = arrange(world as never, witness, { turn: game.engine?.getContext?.().currentTurn });
          if (!result.arranged) return { ...base, status: 'skipped', shape: result.shape, detail: result.detail ?? witness, arranged };
          arranged.push(witness);
          held = termHolds(check, world);
          if ('shape' in held) return { ...base, status: 'skipped', shape: held.shape, detail: held.detail, arranged };
        }
      }
      if (!held.holds) {
        const conjunction = check.operands.map((operand) => describeTerms(operand)).join(' and ');
        return { ...base, status: 'skipped', shape: 'negation', detail: `every operand of \`${conjunction}\` holds in the arranged world`, arranged };
      }
      continue;
    }
    const resolved = resolveTerm(check, world);
    if ('shape' in resolved) return { ...base, status: 'skipped', shape: resolved.shape, detail: resolved.detail, arranged };
    for (const expression of resolved.expressions) {
      const read = readPin(expression, world);
      if ('shape' in read) return { ...base, status: 'skipped', shape: read.shape, detail: read.detail, arranged };
      if (read.matches) {
        return { ...base, status: 'skipped', shape: 'negation', detail: `\`${expression}\` already holds in the arranged world`, arranged };
      }
    }
  }
  // With everything arranged, the subject must be in the player's sight —
  // what the floor cannot arrange (darkness, concealment) is a named gap,
  // not a parse failure to report against the story.
  if (reachTarget !== null) {
    const player = world.getPlayer();
    const subjectId = worldIdOf(world, reachTarget);
    if (player && subjectId && !world.canSee(player.id, subjectId)) {
      return { ...base, status: 'skipped', shape: 'subject-unreachable', detail: `${reachTarget} is not in the player's sight after arranging`, arranged };
    }
  }

  // ── Fillers: the slots the clause leaves unnamed, chosen from the arranged world
  // Each is chosen, arranged, and read for sight before the command is
  // typed — a slot nothing fills is a named gap, never a parse failure.
  let input = plan.command.kind === 'typed' ? plan.command.input : undefined;
  if (plan.command.kind === 'typed') {
    const action = branch.command.kind === 'action' ? branch.command.action : null;
    const intercepts = (irId: string): boolean =>
      action !== null &&
      branches.some((other) => other.subject === irId && other.clause.kind === 'on' && other.command.kind === 'action' && other.command.action === action);
    for (const filler of plan.command.fillers ?? []) {
      const chosen = chooseFiller(filler, plan, ir, world, reachTarget, intercepts);
      if ('shape' in chosen) return { ...base, status: 'skipped', shape: chosen.shape, detail: chosen.detail, arranged };
      if ('omit' in chosen) {
        input = input!.replace(new RegExp(`\\s+\\w+\\s+${filler.token.replace(/[[\]]/g, '\\$&')}$`), '').trim();
        continue;
      }
      for (const expression of chosen.expressions) {
        const result = arrange(world as never, expression, { turn: game.engine?.getContext?.().currentTurn });
        if (!result.arranged) {
          return { ...base, status: 'skipped', shape: result.shape, detail: result.detail ?? expression, arranged };
        }
        arranged.push(expression);
      }
      const player = world.getPlayer();
      const chosenId = worldIdOf(world, chosen.entity);
      if (player && chosenId && !world.canSee(player.id, chosenId)) {
        return { ...base, status: 'skipped', shape: 'object-unreachable', detail: `${chosen.entity} is not in the player's sight after arranging`, arranged };
      }
      const phrase = chosenId ? typedPhrase(world, chosenId) : { phrase: chosen.name };
      if ('shape' in phrase) return { ...base, status: 'skipped', shape: phrase.shape, detail: phrase.detail, arranged };
      input = input!.replace(filler.token, phrase.phrase);
    }
    // The subject, too, is typed by a name nothing else in sight answers to.
    if (reachTarget !== null && branch.command.kind === 'action') {
      const subjectId = worldIdOf(world, reachTarget);
      const written = entityName(ir, reachTarget);
      if (subjectId && written !== undefined) {
        const phrase = typedPhrase(world, subjectId);
        if ('shape' in phrase) return { ...base, status: 'skipped', shape: phrase.shape, detail: phrase.detail, arranged };
        if (phrase.phrase !== written) input = input!.replace(written, phrase.phrase);
      }
    }
  }

  // ── Rooms (ADR-356 D5): where arranging put the player, then where the command left them
  const rooms: string[] = [];
  const noteRoom = (): void => {
    const room = playerRoomIrIdOf(world);
    if (room !== undefined && !rooms.includes(room)) rooms.push(room);
  };
  noteRoom();

  // ── Baselines for the runner-side reads ────────────────────────────────
  const before = new Map<string, unknown>();
  for (const claim of plan.claims) {
    if (claim.kind === 'score') before.set('score', world.getScore());
    if (claim.kind === 'counter') before.set(claim.key, Number(world.getStateValue(claim.key) ?? 0));
  }
  const negativeBefore = plan.negativeSpace.map((read) => readNegative(read, world));

  // ── Run the one command ────────────────────────────────────────────────
  const pinAssertions = plan.claims.flatMap((claim) =>
    claim.kind === 'pin' ? [{ type: 'state-assert' as const, assertTrue: true, stateExpression: claim.expression }] : []
  );
  const claims: DerivedClaimResult[] = [];
  let command: string | undefined;
  let events: TestEventInfo[] = [];
  if (plan.command.kind === 'typed' && input !== undefined) {
    command = input;
    const transcriptCommand: TranscriptCommand = { lineNumber: 0, input: command, expectedOutput: [], assertions: pinAssertions };
    let result: Awaited<ReturnType<typeof runCommand>>;
    try {
      result = await runCommand(transcriptCommand, game, { storyStateKeys: CHORD_STORY_STATE_KEYS });
    } catch (error) {
      return { ...base, status: 'error', detail: error instanceof Error ? error.message : String(error), command, arranged, rooms };
    }
    noteRoom();
    events = result.actualEvents;
    const parseFailure = events.find((event) => event.type === 'command.failed' && event.data?.storyRule !== true);
    if (parseFailure) {
      return { ...base, status: 'failed', detail: `parse failure: ${String(parseFailure.data?.reason ?? 'command.failed')}`, command, arranged, rooms };
    }
    // A topic the character model withheld (ADR-310's arbitration answered
    // "unknown topic") is gated by a model the floor has no form for. Named
    // from the turn's own events — the one skip decided after the command.
    if (branch.command.kind === 'ask' && events.some((event) => event.type === 'character.author.arbitration')) {
      const asked = events.find((event) => event.type === 'if.event.asked');
      if (asked && asked.data?.messageId === 'if.action.asking.unknown_topic') {
        return { ...base, status: 'skipped', shape: 'topic-arbitrated', detail: `the character model withheld ${entityName(ir, branch.command.owner) ?? branch.command.owner}'s answer (arbitration, then unknown topic); not a floor form`, command, arranged, rooms };
      }
    }
    if (result.error) {
      return { ...base, status: 'error', detail: result.error, command, arranged, rooms };
    }
    for (const assertionResult of result.assertionResults) {
      claims.push(claimResult(assertionResult));
    }
  } else {
    // A boot branch: the world after boot is the state under test.
    for (const assertion of pinAssertions) {
      const read = evaluateStateExpression(assertion.stateExpression, world as never, CHORD_STORY_STATE_KEYS);
      claims.push({ claim: assertion.stateExpression, passed: read.matches, ...(read.matches ? {} : { message: read.details }) });
    }
  }

  // ── Runner-side reads ──────────────────────────────────────────────────
  for (const claim of plan.claims) {
    if (claim.kind === 'score') {
      const expected = (before.get('score') as number) + claim.worth;
      const actual = world.getScore();
      claims.push({ claim: `score = ${expected} (award ${claim.name})`, passed: actual === expected, ...(actual === expected ? {} : { message: `score is ${actual}` }) });
    } else if (claim.kind === 'counter') {
      const expected = (before.get(claim.key) as number) + claim.delta;
      const actual = Number(world.getStateValue(claim.key) ?? 0);
      claims.push({ claim: `${claim.label} = ${expected}`, passed: actual === expected, ...(actual === expected ? {} : { message: `${claim.label} is ${actual}` }) });
    } else if (claim.kind === 'ending') {
      const ending = world.getEnding();
      const text = `ending ${claim.ending}${claim.messageId ? ` ${claim.messageId}` : ''}${claim.cause ? ` (${claim.cause})` : ''}`;
      const passed =
        ending !== undefined &&
        ending.kind === claim.ending &&
        (claim.messageId === undefined || ending.messageId === claim.messageId) &&
        (claim.cause === undefined || ending.cause === claim.cause);
      claims.push({ claim: text, passed, ...(passed ? {} : { message: ending ? `ending is ${ending.kind}${ending.messageId ? ` ${ending.messageId}` : ''}${ending.cause ? ` (${ending.cause})` : ''}` : 'the story did not end' }) });
    } else if (claim.kind === 'player') {
      const player = world.getPlayer();
      const irId = player?.attributes[CHORD_IR_ID_ATTRIBUTE];
      const passed = irId === claim.entity;
      claims.push({ claim: `the player is ${claim.entity}`, passed, ...(passed ? {} : { message: `the player is ${String(irId ?? 'nobody')}` }) });
    }
  }
  plan.negativeSpace.forEach((read, index) => {
    const after = readNegative(read, world);
    const passed = JSON.stringify(after) === JSON.stringify(negativeBefore[index]);
    claims.push({ claim: `unchanged: ${negativeLabel(read)}`, passed, ...(passed ? {} : { message: `${negativeLabel(read)} changed from ${JSON.stringify(negativeBefore[index])} to ${JSON.stringify(after)}` }) });
  });

  const failed = claims.some((claim) => !claim.passed);
  // When the standard action itself refused (its blocked event carries a
  // reason and a stdlib message id), the body behind it never ran: say so,
  // so the red line names the cause and not only the state that stayed.
  const refusal = failed
    ? events.find((event) => typeof event.data?.reason === 'string' && String(event.data?.messageId ?? '').startsWith('if.action.'))
    : undefined;
  const details = [
    ...(refusal ? [`the standard action refused first: ${String(refusal.data?.messageId)}`] : []),
    ...(plan.unmapped.length > 0 ? [`not asserted: ${plan.unmapped.join(', ')}`] : []),
  ];
  return {
    ...base,
    status: failed ? 'failed' : 'passed',
    ...(details.length > 0 ? { detail: details.join('; ') } : {}),
    ...(command !== undefined ? { command } : {}),
    arranged,
    claims,
    rooms,
  };
}

/** Resolve a runtime term against the booted world into the pin expressions it needs. */
/**
 * Read one pin against the live world, never writing it.
 *
 * @returns whether it matches, or the shape of a pin no read is defined for
 */
function readPin(expression: string, world: DerivedWorld): { matches: boolean } | { shape: string; detail: string } {
  const pin = parsePin(expression);
  if (pin.kind === 'unrecognized' || pin.kind === 'occurrence' || pin.kind === 'topic-history' || pin.kind === 'timer-position') {
    return { shape: pin.kind === 'unrecognized' ? 'negation' : pin.kind, detail: `cannot read \`${expression}\` to prove it fails` };
  }
  return { matches: evaluateStateExpression(expression, world as never, CHORD_STORY_STATE_KEYS).matches };
}

/**
 * Whether one term holds in the world as arranged — a read, never a write.
 * A `some-fails` term holds when at least one of its operands does not;
 * an operand holds when every one of its terms does.
 */
function termHolds(term: ArrangeTerm, world: DerivedWorld): { holds: boolean } | { shape: string; detail: string } {
  if (term.kind === 'some-fails') {
    for (const operand of term.operands) {
      let operandHolds = true;
      for (const inner of operand) {
        const held = termHolds(inner, world);
        if ('shape' in held) return held;
        if (!held.holds) {
          operandHolds = false;
          break;
        }
      }
      if (!operandHolds) return { holds: true };
    }
    return { holds: false };
  }
  const resolved = resolveTerm(term, world);
  if ('shape' in resolved) return resolved;
  for (const expression of resolved.expressions) {
    const read = readPin(expression, world);
    if ('shape' in read) return read;
    if (read.matches !== resolved.mustHold) return { holds: false };
  }
  return { holds: true };
}

/** Source-shaped text for a term list, for a SKIPPED detail line: `a is x and not b.location = y and not (c is z and d is w)`. */
function describeTerms(terms: ArrangeTerm[]): string {
  return terms
    .map((term) => {
      switch (term.kind) {
        case 'pin':
          return term.mustHold ? term.expression : `not ${term.expression}`;
        case 'with-player':
          return term.mustHold ? `${term.entity} is here` : `${term.entity} is not here`;
        case 'some-fails':
          return `not (${term.operands.map((operand) => describeTerms(operand)).join(' and ')})`;
        default:
          return term.kind;
      }
    })
    .join(' and ');
}

function resolveTerm(
  term: ResolvableTerm,
  world: DerivedWorld
): { expressions: string[]; mustHold: boolean } | { shape: string; detail: string } {
  switch (term.kind) {
    case 'pin':
      return { expressions: [term.expression], mustHold: term.mustHold };
    case 'with-player': {
      const player = world.getPlayer();
      const room = player ? world.getContainingRoom(player.id) : undefined;
      if (!room) return { shape: 'player-offstage', detail: 'the player is in no room' };
      return { expressions: [`${term.entity}.location = ${room.id}`], mustHold: term.mustHold };
    }
    case 'player-to-subject': {
      const subjectId = worldIdOf(world, term.subject);
      if (!subjectId) return { shape: 'unrecognized', detail: `entity "${term.subject}" not found` };
      const room = world.getContainingRoom(subjectId);
      if (!room) return { shape: 'subject-offstage', detail: `${term.subject} is in no room, so no command reaches it` };
      return { expressions: [`player.location = ${room.id}`], mustHold: true };
    }
    case 'reach-subject': {
      const subjectId = worldIdOf(world, term.subject);
      if (!subjectId) return { shape: 'unrecognized', detail: `entity "${term.subject}" not found` };
      // Every closed container on the way up is opened (unlocked first if it
      // is locked) — the floor's own flags, written for the floor's reason.
      const expressions: string[] = [];
      let holder = world.getLocation(subjectId) ?? null;
      while (holder) {
        const entity = world.getEntity(holder);
        if (!entity) break;
        const openable = entity.get('openable');
        if (openable && openable.isOpen === false) {
          const lockable = entity.get('lockable');
          if (lockable && lockable.isLocked === true) expressions.push(`${holder}.isLocked = false`);
          expressions.push(`${holder}.isOpen = true`);
        }
        holder = world.getLocation(holder) ?? null;
      }
      return { expressions, mustHold: true };
    }
    case 'action-preconditions': {
      const subjectId = worldIdOf(world, term.subject);
      if (!subjectId) return { shape: 'unrecognized', detail: `entity "${term.subject}" not found` };
      const entity = world.getEntity(subjectId);
      if (!entity) return { shape: 'unrecognized', detail: `entity "${term.subject}" not found` };
      return { expressions: standardPreconditions(term.action, entity, term.keep), mustHold: true };
    }
    case 'reach-noun': {
      const player = world.getPlayer();
      const nounId = worldIdOf(world, term.entity);
      if (!player || !nounId) return { shape: 'unrecognized', detail: `entity "${term.entity}" not found` };
      if (term.want === 'held') {
        return { expressions: world.getLocation(nounId) === player.id ? [] : [`player.inventory contains ${term.entity}`], mustHold: true };
      }
      // `present`: only a thing another actor holds (directly, or in
      // something they carry) is out of the room's reach; it comes to the
      // room the player now stands in.
      if (!heldByAnotherActor(world, nounId, player.id)) return { expressions: [], mustHold: true };
      const room = world.getContainingRoom(player.id);
      if (!room) return { shape: 'player-offstage', detail: 'the player is in no room' };
      return { expressions: [`${term.entity}.location = ${room.id}`], mustHold: true };
    }
  }
}

/**
 * The one write that makes a negated pin hold, when its state is
 * two-valued: a state adjective of a trait the entity carries (`stove is
 * closed` → `stove is open`), a declared state of an entity that declares
 * exactly two (`stove is cold` → `stove is hot`), or the story's own phase
 * when it declares exactly two. Undefined for any other expression — a
 * many-valued state has no complement to choose.
 */
function pinComplement(expression: string, world: DerivedWorld, ir: StoryIR): string | undefined {
  const pin = parsePin(expression);
  if (pin.kind === 'story-state') {
    if (pin.operator !== '=') return undefined;
    const other = ir.story.states.length === 2 ? ir.story.states.find((state) => state !== pin.state) : undefined;
    return other === undefined ? undefined : `story.state = ${other}`;
  }
  if (pin.kind !== 'declared-state' || pin.negated || pin.name === 'story') return undefined;
  const adjective = STATE_ADJECTIVES[pin.state];
  const entityId = worldIdOf(world, pin.name);
  if (adjective && entityId && world.getEntity(entityId)?.get(adjective.trait) !== undefined) {
    return `${pin.name} is ${adjective.complement}`;
  }
  const declared = ir.entities.find((entity) => entity.id === pin.name)?.states ?? [];
  if (declared.length === 2 && declared.includes(pin.state)) {
    return `${pin.name} is ${declared.find((state) => state !== pin.state)}`;
  }
  return undefined;
}

/** Whether an actor other than `playerId` holds the entity, anywhere up its holder chain. */
function heldByAnotherActor(world: DerivedWorld, entityId: string, playerId: string): boolean {
  let holder = world.getLocation(entityId) ?? null;
  while (holder) {
    const entity = world.getEntity(holder);
    if (!entity) return false;
    if (entity.get('actor') !== undefined) return holder !== playerId;
    holder = world.getLocation(holder) ?? null;
  }
  return false;
}

/**
 * The words the parser matches a typed noun against: the identity name and
 * every alias, lowercased. The parser's first tier is an exact match on any
 * of these across everything in scope, so a phrase is typed safely when no
 * other entity in sight has it as an exact name or alias.
 */
function parserNames(entity: DerivedEntity): string[] {
  const identity = entity.get('identity');
  const names = [identity?.name ?? entity.name, ...(identity?.aliases ?? [])];
  return names.map((name) => name.toLowerCase());
}

/**
 * The phrase to type for an entity: its name when nothing else in the
 * player's sight answers to it exactly, else the first alias nothing else
 * answers to. A noun every one of whose names is also another's is a named
 * gap — the parser would prompt, and a prompt is not the rule under test.
 */
function typedPhrase(world: DerivedWorld, entityId: string): { phrase: string } | { shape: string; detail: string } {
  const player = world.getPlayer();
  const target = world.getEntity(entityId);
  if (!player || !target) return { phrase: entityId };
  const others = world.getAllEntities().filter((other) => other.id !== entityId && other.id !== player.id && world.canSee(player.id, other.id));
  const taken = new Map<string, DerivedEntity>();
  for (const other of others) for (const name of parserNames(other)) if (!taken.has(name)) taken.set(name, other);
  const identity = target.get('identity');
  const candidates = [identity?.name ?? target.name, ...(identity?.aliases ?? [])];
  const colliders: string[] = [];
  for (const candidate of candidates) {
    const collider = taken.get(candidate.toLowerCase());
    if (!collider) return { phrase: candidate };
    colliders.push(`"${candidate}" is also ${collider.name}`);
  }
  return { shape: 'name-ambiguous', detail: `every name of ${target.name} is another's in sight: ${colliders.join('; ')}` };
}

/** The IR id of a world entity, when the loader stamped one. */
function irIdOf(entity: DerivedEntity): string | undefined {
  const irId = entity.attributes[CHORD_IR_ID_ATTRIBUTE];
  return typeof irId === 'string' ? irId : undefined;
}

/**
 * Choose what fills one unnamed slot, from the arranged world — never from
 * the parse that would follow. `[something]`: the entity the plan chose, else
 * the thing a `must have` precondition already put in the player's hands,
 * else the first thing the player holds. `[someone]`: a person already in the
 * player's room, else the first person the story declares, to be brought in.
 * Deterministic: world order for what is held or present, declaration order
 * for who is brought.
 *
 * @returns the IR id, the name to type, and the expressions to arrange
 *   first; or the shape of a slot nothing fills
 */
function chooseFiller(
  filler: SlotFiller,
  plan: Extract<DerivedPlan, { kind: 'run' }>,
  ir: StoryIR,
  world: DerivedWorld,
  subject: string | null,
  intercepts: (irId: string) => boolean
): { entity: string; name: string; expressions: string[] } | { omit: true } | { shape: string; detail: string } {
  const player = world.getPlayer();
  if (!player) return { shape: 'player-offstage', detail: 'the player is in no room' };
  const named = (irId: string): string => entityName(ir, irId) ?? irId;
  if (filler.entity !== null) return { entity: filler.entity, name: named(filler.entity), expressions: [] };

  if (filler.role === 'key') {
    // The lockable names its key, or the slot is dropped: `unlock X` alone.
    const subjectId = subject === null ? undefined : worldIdOf(world, subject);
    const keyId = subjectId ? world.getEntity(subjectId)?.get('lockable')?.keyId : undefined;
    const key = keyId ? world.getEntity(keyId) : undefined;
    if (!key) return { omit: true };
    const irId = irIdOf(key) ?? key.id;
    const name = irIdOf(key) ? named(irId) : key.name;
    return { entity: irId, name, expressions: world.getLocation(key.id) === player.id ? [] : [`player.inventory contains ${irId}`] };
  }

  if (filler.role !== undefined) {
    // A holder the pattern asks for: the first container (or supporter) in
    // the player's room that is not the subject and not someone's hands.
    const room = world.getContainingRoom(player.id);
    if (!room) return { shape: 'player-offstage', detail: 'the player is in no room' };
    for (const entity of world.getAllEntities()) {
      const irId = irIdOf(entity);
      if (irId === undefined || irId === subject || entity.id === player.id || entity.get('actor') !== undefined) continue;
      if (entity.get(filler.role) === undefined || world.getContainingRoom(entity.id)?.id !== room.id || heldByAnotherActor(world, entity.id, player.id)) continue;
      // A closed container takes nothing: open it (unlocked first), the way
      // `reach-subject` opens what encloses the subject.
      const expressions: string[] = [];
      if (entity.get('openable')?.isOpen === false) {
        if (entity.get('lockable')?.isLocked === true) expressions.push(`${irId}.isLocked = false`);
        expressions.push(`${irId}.isOpen = true`);
      }
      return { entity: irId, name: named(irId), expressions };
    }
    return { shape: 'object-unreachable', detail: `nothing fills ${filler.token}: no ${filler.role} stands in the player's room` };
  }

  if (filler.token === '[something]') {
    // A thing with its own clause on this action would answer instead of
    // the subject's clause (giving the purse to Pieter is the purse's
    // refusal, not Pieter's), so such a thing fills the slot only when
    // nothing else the player holds can.
    const candidates: string[] = [];
    for (const term of plan.arrange) {
      const held = term.kind === 'pin' && term.mustHold ? /^player\.inventory contains (\S+)$/.exec(term.expression) : null;
      if (held && held[1] !== subject) candidates.push(held[1]);
    }
    for (const entity of world.getAllEntities()) {
      const irId = irIdOf(entity);
      if (irId !== undefined && irId !== subject && entity.get('actor') === undefined && world.getLocation(entity.id) === player.id) {
        candidates.push(irId);
      }
    }
    const chosen = candidates.find((irId) => !intercepts(irId)) ?? candidates[0];
    if (chosen !== undefined) return { entity: chosen, name: named(chosen), expressions: [] };
    return { shape: 'object-unreachable', detail: 'nothing fills [something]: the player holds nothing and no precondition names an item' };
  }

  const room = world.getContainingRoom(player.id);
  if (!room) return { shape: 'player-offstage', detail: 'the player is in no room' };
  for (const entity of world.getAllEntities()) {
    const irId = irIdOf(entity);
    if (irId !== undefined && irId !== subject && entity.id !== player.id && entity.get('actor') !== undefined && world.getContainingRoom(entity.id)?.id === room.id) {
      return { entity: irId, name: named(irId), expressions: [] };
    }
  }
  const playerIrId = irIdOf(player);
  for (const entity of ir.entities) {
    if (entity.id !== subject && entity.id !== playerIrId && isPerson(ir, entity.id) && worldIdOf(world, entity.id) !== undefined) {
      return { entity: entity.id, name: named(entity.id), expressions: [`${entity.id}.location = ${room.id}`] };
    }
  }
  return { shape: 'object-unreachable', detail: 'nothing fills [someone]: no person stands in the room and the story declares no other' };
}

/**
 * What a standard action's validate phase needs of its subject's flags, as
 * pin expressions — a door must be closed and unlocked to open, a key held
 * to lock or unlock, a tool held to cut or dig. Nothing for an entity that
 * lacks the trait: the action will refuse and the derived test will say so.
 * A flag whose adjective the clause pins itself (`keep`) is left as pinned.
 */
function standardPreconditions(action: string, entity: DerivedEntity, keep: string[] = []): string[] {
  const expressions: string[] = [];
  const openable = entity.get('openable');
  const lockable = entity.get('lockable');
  const switchable = entity.get('switchable');
  const kept = (adjective: string): boolean => keep.includes(adjective);
  switch (action) {
    case 'opening':
      if (lockable && lockable.isLocked === true && !kept('locked')) expressions.push(`${entity.id}.isLocked = false`);
      if (openable && openable.isOpen === true && !kept('open')) expressions.push(`${entity.id}.isOpen = false`);
      break;
    case 'closing':
      if (openable && openable.isOpen === false && !kept('closed')) expressions.push(`${entity.id}.isOpen = true`);
      break;
    case 'locking':
      if (openable && openable.isOpen === true && !kept('open')) expressions.push(`${entity.id}.isOpen = false`);
      if (lockable && lockable.isLocked === true && !kept('locked')) expressions.push(`${entity.id}.isLocked = false`);
      if (lockable?.keyId) expressions.push(`player.inventory contains ${lockable.keyId}`);
      break;
    case 'unlocking':
      if (lockable && lockable.isLocked === false && !kept('unlocked')) expressions.push(`${entity.id}.isLocked = true`);
      if (lockable?.keyId) expressions.push(`player.inventory contains ${lockable.keyId}`);
      break;
    case 'switching_on':
      if (switchable && switchable.isOn === true && !kept('on')) expressions.push(`${entity.id}.isOn = false`);
      break;
    case 'switching_off':
      if (switchable && switchable.isOn === false && !kept('off')) expressions.push(`${entity.id}.isOn = true`);
      break;
    case 'cutting':
    case 'digging':
    case 'burning': {
      // ADR-371 D2: burning is cutting's shape — the declared tool in hand.
      const gated = entity.get(action === 'cutting' ? 'cuttable' : action === 'digging' ? 'diggable' : 'flammable');
      if (gated?.toolId) expressions.push(`player.inventory contains ${gated.toolId}`);
      break;
    }
  }
  return expressions;
}

/** The world id of an IR id, or of the player. */
function worldIdOf(world: DerivedWorld, irId: string): string | undefined {
  if (irId === 'player') return world.getPlayer()?.id;
  return world.getAllEntities().find((entity) => entity.attributes[CHORD_IR_ID_ATTRIBUTE] === irId)?.id;
}

/** One negative-space value as it stands now. */
function readNegative(read: NegativeRead, world: DerivedWorld): unknown {
  switch (read.kind) {
    case 'state': {
      const id = worldIdOf(world, read.entity);
      const irId = id ? world.getEntity(id)?.attributes[CHORD_IR_ID_ATTRIBUTE] : undefined;
      return typeof irId === 'string' ? world.getStateValue(CHORD_STATE_PREFIX + irId) : undefined;
    }
    case 'location': {
      const id = worldIdOf(world, read.entity);
      return id ? world.getLocation(id) ?? null : undefined;
    }
    case 'gone': {
      const id = worldIdOf(world, read.entity);
      const irId = id ? world.getEntity(id)?.attributes[CHORD_IR_ID_ATTRIBUTE] : undefined;
      return typeof irId === 'string' ? world.getStateValue(CHORD_GONE_PREFIX + irId) === true : undefined;
    }
    case 'score':
      return world.getScore();
    case 'counter':
      return Number(world.getStateValue(read.key) ?? 0);
    case 'player':
      return world.getPlayer()?.attributes[CHORD_IR_ID_ATTRIBUTE];
  }
}

function negativeLabel(read: NegativeRead): string {
  switch (read.kind) {
    case 'state':
      return `${read.entity}'s state`;
    case 'location':
      return `${read.entity}'s location`;
    case 'gone':
      return `${read.entity} gone`;
    case 'score':
      return 'the score';
    case 'counter':
      return read.label;
    case 'player':
      return 'the player';
  }
}

/**
 * One claim's verdict from the assertion core's result. The core's message
 * repeats the expression it was given ("State assertion failed: <expr>.
 * <details>"); the row already names the claim, so only the details stay.
 */
function claimResult(result: AssertionResult): DerivedClaimResult {
  const claim = result.assertion.stateExpression ?? result.assertion.value ?? result.assertion.type;
  const message = result.message?.replace(/^\w+ assertion failed: .*?\.\s+/, '').trim();
  return {
    claim,
    passed: result.passed,
    ...(result.passed || !message ? {} : { message }),
  };
}
