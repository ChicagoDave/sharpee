/**
 * claims-walk.ts — one breadth-first walk of a story under a necessary set,
 * settling the claims declared under it (ADR-365 D2, D3, D4, D5).
 *
 * Purpose: fork the real engine through its save/restore hooks and walk the
 * reachable states breadth-first, trying from each state the commands the
 * set allows. Two states are one state when their identities are equal —
 * the world's snapshot cut to the set, minus a written ignore list
 * (`claim-identity`) — and they agree on which claims the path has
 * satisfied (D5): a path that read the
 * diary and one that did not must never merge, or the first to a later
 * claim is lost. The walk keeps the first path to each claim as its witness
 * and stops when every claim is settled (D4) or the frontier or a budget
 * runs out.
 *
 * A claim is held by its first witness and unproven otherwise (D3): by
 * exhaustion when the frontier ran out without one, by budget when a
 * budget stopped the walk first. A walk that never entered its set
 * exhausts nothing: when the player starts in a room the set does not name
 * and no allowed command leads into one it does, the frontier runs out
 * after one state with nothing tried. That walk stops as
 * `start-outside-set` and leaves every claim it did not witness unproven
 * by budget.
 *
 * A save or a restore the engine refuses stops the walk with a thrown error
 * naming the node: the walk never runs a command on a world it did not
 * restore, and never treats a state it could not save as walked.
 *
 * Each verdict also carries how many of the set's things the claim can
 * never depend on under that set — the compiler's cone of influence (D12),
 * computed once before the walk. It is report data for the author who
 * trims the set; the walk, the identity, and the candidates never read it.
 *
 * The breadth-first walk itself — forking, budgets, the refused save or
 * restore that stops it — is `walk/story-walk.ts`, which this module and
 * the lenses share (ADR-408 D3). This module is its claims client.
 *
 * Public interface: `walkClaims`, `ClaimsWalkOptions`.
 *   The walk reports in `claim-results`' shapes (`ClaimsWalkReport`,
 *   `ClaimVerdict`).
 * Owner context: @sharpee/branch-tester — the claims runner (ADR-365 D10).
 */

import { claimCone, type IRClaim, type StoryIR } from '@sharpee/chord';
import type { Claim, ClaimGroup } from './claim-set.js';
import { claimHolds, clauseKeysByFiredOf, entityIdByIrOf } from './claim-predicates.js';
import type { ClaimVerdict, ClaimsWalkReport, WalkStopReason } from './claim-results.js';
import type { ClaimsGame, ClaimsTurnEvent, WorldSnapshot } from './claims-game.js';
import { STORY_WALK_DEFAULTS, walkStory, type StoryWalkOptions, type StoryWalkTurn } from '../walk/story-walk.js';

/** The budgets and breadth of one walk: the shared walk's options. */
export type ClaimsWalkOptions = StoryWalkOptions;

const DEFAULT_OPTIONS = STORY_WALK_DEFAULTS;

/** The runner's discriminated predicate as the compiler's flat `IRClaim`, which the cone takes. */
function irClaimOf(claim: Claim): IRClaim {
  const out: IRClaim = { name: claim.name };
  const predicate = claim.predicate;
  switch (predicate.kind) {
    case 'ending':
      out.ending = predicate.ending.kind ? { kind: predicate.ending.kind } : {};
      break;
    case 'room':
      out.room = predicate.room;
      break;
    case 'placement':
      out.placement = { ...predicate.placement };
      break;
    case 'state':
      out.state = { ...predicate.state };
      break;
    case 'flag':
      out.flag = { thing: predicate.flag.thing, trait: predicate.flag.trait, field: predicate.flag.field, ...(typeof predicate.flag.value === 'boolean' ? { value: predicate.flag.value } : {}) };
      break;
    case 'fired':
      out.fired = predicate.fired;
      break;
    case 'event':
      out.event = { ...predicate.event };
      break;
  }
  return out;
}

/**
 * Walk one booted game under one claim group's set and settle its claims.
 *
 * The game is consumed: the walk forks it through the engine's save/restore
 * hooks and leaves it in whatever state it last restored.
 *
 * @param game a freshly booted game at the pinned seed; its opening is run
 *   here when it has not run yet
 * @param ir the compiled story, for the declared vocabulary
 * @param group the set to walk under and the claims to settle
 * @param options budgets and breadth; the defaults are the explorer's
 * @returns the walk's report with one verdict per claim
 * @throws when the engine refuses to save a state the walk must continue
 *   from, or to restore a node's save; the message names the node
 */
export async function walkClaims(game: ClaimsGame, ir: StoryIR, group: ClaimGroup, options: ClaimsWalkOptions = {}): Promise<ClaimsWalkReport> {
  const { breadth, maxStates, maxSeconds, maxDepth } = { ...DEFAULT_OPTIONS, ...options };
  const { world } = game;
  const set = group.set;
  const claims = group.claims;

  // D12: how many of the set's things each claim can never depend on. Computed
  // once here, before the walk, and read by nothing but the verdict.
  const inertByIndex = new Map(claims.map((claim) => [claim.index, claimCone(ir, irClaimOf(claim), set).inert.length]));

  // The opening runs before the claim lookups below read the world, as it
  // did before the walk was shared; `walkStory` leaves an opened game alone.
  if (game.openingPending) await game.runOpening();
  const entityIdByIr = entityIdByIrOf(world);
  const clauseKeysByFired = clauseKeysByFiredOf(ir);

  /** Claim index to the first path that satisfied it. */
  const witnesses = new Map<number, readonly string[]>();
  /** Evaluate every unsettled claim against the state just reached; returns the path's claim bits. */
  const noteClaims = (path: readonly string[], events: readonly ClaimsTurnEvent[], inherited: string, snapshot: WorldSnapshot): string => {
    if (claims.length === 0) return '';
    const bits = new Set(inherited ? inherited.split(',').map(Number) : []);
    for (const claim of claims) {
      // A bit is only ever added with its witness, so a claim without a
      // witness has no bit on any path.
      if (witnesses.has(claim.index)) {
        bits.add(claim.index);
        continue;
      }
      if (!claimHolds(claim, { world, snapshot, events, entityIdByIr, clauseKeysByFired })) continue;
      witnesses.set(claim.index, path);
      bits.add(claim.index);
    }
    return [...bits].sort((a, b) => a - b).join(',');
  };
  const allClaimsSettled = () => claims.length > 0 && claims.every((claim) => witnesses.has(claim.index));

  // The shared walk (`walkStory`) forks, budgets and stops; this client tags
  // each state with its path's claim bits (D5), read from the snapshot the
  // walk took once for that state, and stops when every claim is settled
  // (D4). With no claims the tag is unused, as it always was.
  const walked = await walkStory(game, ir, set, {
    label: 'claims walk',
    ...(claims.length ? { tagState: (turn: StoryWalkTurn) => noteClaims(turn.path, turn.events, turn.inheritedTag, turn.snapshot) } : {}),
    stopWhen: { reason: 'all-claims-settled', done: allClaimsSettled },
  }, { breadth, maxStates, maxSeconds, maxDepth });

  // A frontier that ran out with the player never in a room of the set is
  // not an exhausted set: nothing under the set was tried.
  const setRooms = new Set(set.rooms);
  const enteredSet = walked.roomsReached.some((room) => setRooms.has(room));
  let stopReason: WalkStopReason = walked.stopReason;
  if (stopReason === 'frontier-exhausted' && !enteredSet) stopReason = 'start-outside-set';
  const exhausted = stopReason === 'frontier-exhausted' || stopReason === 'all-claims-settled';
  const verdicts: ClaimVerdict[] = claims.map((claim) => {
    const witness = witnesses.get(claim.index);
    const base = { set: group.label, index: claim.index, name: claim.name, kind: claim.predicate.kind, thingsInSet: set.things.length, inertInSet: inertByIndex.get(claim.index) ?? 0 };
    if (witness !== undefined) {
      return { ...base, verdict: 'held', settledBy: 'witness', witness, depth: witness.length };
    }
    return { ...base, verdict: 'unproven', settledBy: exhausted ? 'exhaustion' : 'budget' };
  });

  return {
    set: group.label,
    necessary: { rooms: set.rooms.length, things: set.things.length, verbs: set.verbs.length },
    budgets: walked.budgets,
    breadth: walked.breadth,
    stopReason,
    walkMs: walked.walkMs,
    statesDiscovered: walked.statesDiscovered,
    commandsExecuted: walked.commandsExecuted,
    restores: walked.restores,
    saves: walked.saves,
    deadEnds: walked.deadEnds,
    queueRemaining: walked.queueRemaining,
    roomsReached: walked.roomsReached,
    frontierByDepth: walked.frontierByDepth,
    claims: verdicts,
  };
}
