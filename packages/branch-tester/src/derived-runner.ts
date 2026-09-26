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
 * Three implicit arrange terms make the typed command reachable, since the
 * enumerator records only what the clause itself guards: every closed
 * container enclosing the subject is opened (unlocked first), the player is
 * placed in the subject's room unless a term already places the player, and
 * a standard action's own flag preconditions are satisfied (a door closed
 * and unlocked to open, a tool held to cut). A subject still out of the
 * player's sight after that — darkness, concealment — is SKIPPED
 * `subject-unreachable`, never reported as a parse failure of the story.
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
import { collectClauseBranches, type BranchPrecondition, type ClauseBranch } from '@sharpee/world-index';
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
  /** The standard action's own preconditions on the subject's flags (a door must be closed to open, a tool held to cut). Implicit. */
  | { kind: 'action-preconditions'; action: string; subject: string };

/** What drives the test: one typed command, or nothing (a boot branch asserts the booted world). */
export type CommandPlan = { kind: 'typed'; input: string } | { kind: 'none' };

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
}

/** An entity as the runner reads it. */
export interface DerivedEntity {
  id: string;
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
const STANDARD_PRECONDITIONS = new Set(['opening', 'closing', 'locking', 'unlocking', 'switching_on', 'switching_off', 'cutting', 'digging']);

/** Room-lifecycle clauses fire on movement, not on a typed verb naming the room. */
const LIFECYCLE_ACTIONS = new Set(['entering', 'leaving']);

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
  for (const precondition of [...interceptingGuards(branch, branches), ...branch.precondition]) {
    const mapped = preconditionTerms(precondition, branch.subject);
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
  const command = commandPlan(branch, ir, actionPatterns);
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
    if (branch.command.kind === 'action' && STANDARD_PRECONDITIONS.has(branch.command.action) && !ir.actions.some((action) => action.name === (branch.command as { action: string }).action)) {
      terms.push({ kind: 'action-preconditions', action: branch.command.action, subject: reachTarget });
    }
  }

  return { kind: 'run', arrange: terms, command, claims, negativeSpace, unmapped };
}

/**
 * For an `after` clause, the guards of every `on` clause intercepting the
 * same action on the same subject, each flipped to "must hold" — the
 * reaction fires only once every interception let the action through.
 */
function interceptingGuards(branch: ClauseBranch, branches: ClauseBranch[]): BranchPrecondition[] {
  if (branch.clause.kind !== 'on' || branch.clause.clauseKind !== 'after') return [];
  const action = branch.clause.action;
  const guards: BranchPrecondition[] = [];
  for (const candidate of branches) {
    if (candidate.subject !== branch.subject || candidate.leaf.kind !== 'refused') continue;
    if (candidate.clause.kind !== 'on' || candidate.clause.clauseKind !== 'on' || candidate.clause.action !== action) continue;
    for (const precondition of candidate.precondition) {
      if (precondition.kind === 'condition' && !precondition.holds) {
        guards.push({ kind: 'condition', condition: precondition.condition, holds: true });
      }
    }
  }
  return guards;
}

/** The arrange terms one precondition record needs, or the shape it cannot be expressed in. */
function preconditionTerms(
  precondition: BranchPrecondition,
  subject: string | null
): { terms: ArrangeTerm[] } | { shape: string; detail: string } {
  switch (precondition.kind) {
    case 'condition':
      return conditionTerms(precondition.condition, precondition.holds, subject);
    case 'state':
      return { terms: [{ kind: 'pin', expression: `${precondition.entity} is ${precondition.state}`, mustHold: true }] };
    case 'story-state':
      return { terms: [{ kind: 'pin', expression: `story.state = ${precondition.state}`, mustHold: true }] };
    case 'value':
      return { shape: 'select-value', detail: 'a `select on` over something other than a state' };
    case 'ordinal':
      // The first firing is what a fresh world gives; any later one is an
      // occurrence count the floor does not arrange.
      return precondition.ordinal <= 1
        ? { terms: [] }
        : { shape: 'occurrence', detail: `the ${precondition.ordinal}th firing` };
    case 'unfired':
      return { terms: [] };
    case 'alternative':
      return { shape: 'select-alternative', detail: `alternative ${precondition.index} of select ${precondition.id}` };
    case 'machine-state':
      return { shape: 'machine-state', detail: `${precondition.machine} in ${precondition.state}` };
  }
}

/** The arrange terms a condition needs to hold (or to fail), or the shape it cannot be expressed in. */
function conditionTerms(
  condition: IRCondition,
  holds: boolean,
  subject: string | null
): { terms: ArrangeTerm[] } | { shape: string; detail: string } {
  switch (condition.kind) {
    case 'and': {
      if (!holds) return { shape: 'condition-not-and', detail: 'which operand of an `and` fails is a guess' };
      const terms: ArrangeTerm[] = [];
      for (const operand of condition.operands) {
        const mapped = conditionTerms(operand, true, subject);
        if ('shape' in mapped) return mapped;
        terms.push(...mapped.terms);
      }
      return { terms };
    }
    case 'or': {
      if (holds) return { shape: 'condition-or', detail: 'which operand of an `or` holds is a guess' };
      const terms: ArrangeTerm[] = [];
      for (const operand of condition.operands) {
        const mapped = conditionTerms(operand, false, subject);
        if ('shape' in mapped) return mapped;
        terms.push(...mapped.terms);
      }
      return { terms };
    }
    case 'not':
      return conditionTerms(condition.operand, !holds, subject);
    case 'story-state':
      return { terms: [{ kind: 'pin', expression: `story.state = ${condition.state}`, mustHold: holds }] };
    case 'predicate': {
      const effective = condition.negated ? !holds : holds;
      const left = valueName(condition.subject, subject);
      const right = valueName(condition.object, subject);
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
function commandPlan(
  branch: ClauseBranch,
  ir: StoryIR,
  actionPatterns: ActionPatterns
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
      return { kind: 'typed', input: `ask ${owner} about ${topic}` };
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
      const actionId = `if.action.${command.action}`;
      const patterns = actionPatterns(actionId);
      if (!patterns || patterns.length === 0) {
        return { kind: 'no-vocabulary', detail: `no language pattern for ${actionId}` };
      }
      const wanted = objectName === null ? 0 : 1;
      const pattern = patterns.find((candidate) => (candidate.match(/\[something\]/g) ?? []).length === wanted);
      if (!pattern) {
        return { kind: 'skip', shape: 'command-shape', detail: `no ${wanted}-object pattern for ${actionId}` };
      }
      return { kind: 'typed', input: pattern.replace('[something]', objectName ?? '').trim() };
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
function isPlace(ir: StoryIR, irId: string): boolean {
  const entity = ir.entities.find((candidate) => candidate.id === irId);
  return entity !== undefined && entity.kinds.some((kind) => kind.name === 'room' || kind.name === 'region');
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
    leaf.kind === 'ordinal' ? ` · the ${leaf.ordinal}th time` :
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

  // ── Arrange ────────────────────────────────────────────────────────────
  const arranged: string[] = [];
  let reachTarget: string | null = null;
  for (const term of plan.arrange) {
    const resolved = resolveTerm(term, world);
    if ('shape' in resolved) return { ...base, status: 'skipped', shape: resolved.shape, detail: resolved.detail, arranged };
    if (term.kind === 'reach-subject') reachTarget = term.subject;
    for (const expression of resolved.expressions) {
      if (resolved.mustHold) {
        const result = arrange(world as never, expression);
        if (!result.arranged) {
          return { ...base, status: 'skipped', shape: result.shape, detail: result.detail ?? expression, arranged };
        }
        arranged.push(expression);
      } else {
        // Never written: a fresh world must already fail it, or the branch
        // needs a negation the floor does not arrange.
        const pin = parsePin(expression);
        if (pin.kind === 'unrecognized' || pin.kind === 'occurrence' || pin.kind === 'topic-history' || pin.kind === 'timer-phase' || pin.kind === 'timer-position') {
          return { ...base, status: 'skipped', shape: pin.kind === 'unrecognized' ? 'negation' : pin.kind, detail: `cannot read \`${expression}\` to prove it fails`, arranged };
        }
        const read = evaluateStateExpression(expression, world as never, CHORD_STORY_STATE_KEYS);
        if (read.matches) {
          return { ...base, status: 'skipped', shape: 'negation', detail: `\`${expression}\` already holds in the booted world`, arranged };
        }
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
  if (plan.command.kind === 'typed') {
    command = plan.command.input;
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
  return {
    ...base,
    status: failed ? 'failed' : 'passed',
    ...(plan.unmapped.length > 0 ? { detail: `not asserted: ${plan.unmapped.join(', ')}` } : {}),
    ...(command !== undefined ? { command } : {}),
    arranged,
    claims,
    rooms,
  };
}

/** Resolve a runtime term against the booted world into the pin expressions it needs. */
function resolveTerm(
  term: ArrangeTerm,
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
      return { expressions: standardPreconditions(term.action, entity), mustHold: true };
    }
  }
}

/**
 * What a standard action's validate phase needs of its subject's flags, as
 * pin expressions — a door must be closed and unlocked to open, a key held
 * to lock or unlock, a tool held to cut or dig. Nothing for an entity that
 * lacks the trait: the action will refuse and the derived test will say so.
 */
function standardPreconditions(action: string, entity: DerivedEntity): string[] {
  const expressions: string[] = [];
  const openable = entity.get('openable');
  const lockable = entity.get('lockable');
  const switchable = entity.get('switchable');
  switch (action) {
    case 'opening':
      if (lockable && lockable.isLocked === true) expressions.push(`${entity.id}.isLocked = false`);
      if (openable && openable.isOpen === true) expressions.push(`${entity.id}.isOpen = false`);
      break;
    case 'closing':
      if (openable && openable.isOpen === false) expressions.push(`${entity.id}.isOpen = true`);
      break;
    case 'locking':
      if (openable && openable.isOpen === true) expressions.push(`${entity.id}.isOpen = false`);
      if (lockable && lockable.isLocked === true) expressions.push(`${entity.id}.isLocked = false`);
      if (lockable?.keyId) expressions.push(`player.inventory contains ${lockable.keyId}`);
      break;
    case 'unlocking':
      if (lockable && lockable.isLocked === false) expressions.push(`${entity.id}.isLocked = true`);
      if (lockable?.keyId) expressions.push(`player.inventory contains ${lockable.keyId}`);
      break;
    case 'switching_on':
      if (switchable && switchable.isOn === true) expressions.push(`${entity.id}.isOn = false`);
      break;
    case 'switching_off':
      if (switchable && switchable.isOn === false) expressions.push(`${entity.id}.isOn = true`);
      break;
    case 'cutting':
    case 'digging': {
      const gated = entity.get(action === 'cutting' ? 'cuttable' : 'diggable');
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
