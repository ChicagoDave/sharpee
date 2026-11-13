/**
 * claims-walk.ts — one breadth-first walk of a story under a necessary set,
 * settling the claims declared under it (ADR-365 D2, D3, D4, D5).
 *
 * Purpose: fork the real engine through its save/restore hooks and walk the
 * reachable states breadth-first, trying from each state the commands the
 * set allows. Two states are one state when their identities are equal —
 * the world's snapshot cut to the set, minus a written ignore list
 * (`claim-identity`) — and they agree on which positive claims the path has
 * satisfied (D5): a path that read the
 * diary and one that did not must never merge, or the first to a later
 * claim is lost. The walk keeps the first path to each claim as its witness
 * and stops when every claim is settled (D4) or the frontier or a budget
 * runs out.
 *
 * A positive claim is held by its first witness and unproven otherwise. A
 * negative claim is violated by its first witness, held when the frontier
 * is exhausted without one, and unproven when a budget stopped the walk
 * first (D3) — a budget stop can never hold a negative claim. Neither can a
 * walk that never entered its set: when the player starts in a room the set
 * does not name and no allowed command leads into one it does, the frontier
 * runs out after one state with nothing tried. That walk stops as
 * `start-outside-set` and leaves every claim it did not witness unproven.
 *
 * Each verdict also carries how many of the set's things the claim can
 * never depend on under that set — the compiler's cone of influence (D12),
 * computed once before the walk. It is report data for the author who
 * trims the set; the walk, the identity, and the candidates never read it.
 *
 * Public interface: `walkClaims`, `ClaimsWalkOptions`.
 *   The walk reports in `claim-results`' shapes (`ClaimsWalkReport`,
 *   `ClaimVerdict`).
 * Owner context: @sharpee/branch-tester — the claims runner (ADR-365 D10).
 */

import { captureSave, restoreSave } from '@sharpee/transcript-tester';
import { claimCone, type IRClaim, type StoryIR } from '@sharpee/chord';
import type { Claim, ClaimGroup, NecessarySet } from './claim-set.js';
import { claimHolds, clauseKeysByFiredOf, entityIdByIrOf } from './claim-predicates.js';
import { candidateCommands, deriveCommandVocabulary } from './claim-candidates.js';
import type { CandidateBreadth, ClaimVerdict, ClaimsWalkReport, WalkStopReason } from './claim-results.js';
import type { ClaimsGame, ClaimsTurnEvent, WorldSnapshot } from './claims-game.js';
import { irIdOf, readWorldSnapshot } from './claims-game.js';
import { necessaryIdentity } from './claim-identity.js';

/** The budgets and breadth of one walk. */
export interface ClaimsWalkOptions {
  readonly breadth?: CandidateBreadth;
  readonly maxStates?: number;
  readonly maxSeconds?: number;
  readonly maxDepth?: number;
}

const DEFAULT_OPTIONS = { breadth: 'basic' as CandidateBreadth, maxStates: 5000, maxSeconds: 120, maxDepth: 40 };

/** Commands between two yields to the event loop. */
const YIELD_EVERY = 200;

/**
 * Walk one booted game under one claim group's set and settle its claims.
 *
 * The game is consumed: the walk forks it through the engine's save/restore
 * hooks and leaves it in whatever state it last restored.
 *
 * @param game a freshly booted game at the pinned seed
 * @param ir the compiled story, for the declared vocabulary
 * @param group the set to walk under and the claims to settle
 * @param options budgets and breadth; the defaults are the explorer's
 * @returns the walk's report with one verdict per claim
 */
/** The runner's discriminated predicate as the compiler's flat `IRClaim`, which the cone takes. */
function irClaimOf(claim: Claim): IRClaim {
  const out: IRClaim = { name: claim.name };
  if (claim.never) out.never = true;
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

export async function walkClaims(game: ClaimsGame, ir: StoryIR, group: ClaimGroup, options: ClaimsWalkOptions = {}): Promise<ClaimsWalkReport> {
  const { breadth, maxStates, maxSeconds, maxDepth } = { ...DEFAULT_OPTIONS, ...options };
  const { world, engine } = game;
  const set = group.set;
  const claims = group.claims;

  // D12: how many of the set's things each claim can never depend on. Computed
  // once here, before the walk, and read by nothing but the verdict.
  const inertByIndex = new Map(claims.map((claim) => [claim.index, claimCone(ir, irClaimOf(claim), set).inert.length]));

  // The opening turn, so the walk starts from the state a player sees.
  await game.executeCommand('look');

  const vocabulary = deriveCommandVocabulary(ir, engine);
  const nameByIrId = new Map<string, string>();
  for (const entity of world.getAllEntities()) {
    const irId = irIdOf(entity);
    if (irId !== undefined) nameByIrId.set(irId, entity.name);
  }
  const entityIdByIr = entityIdByIrOf(world);
  const clauseKeysByFired = clauseKeysByFiredOf(ir);

  const roomsSeen = new Set<string>();
  const noteRoom = () => {
    const player = world.playerCharacter;
    const room = player && world.getContainingRoom(player.id);
    if (room) roomsSeen.add(irIdOf(room) ?? room.id);
  };

  /** Claim index to the first path that satisfied it. */
  const witnesses = new Map<number, readonly string[]>();
  /** Evaluate every unsettled claim against the state just reached; returns the path's claim bits. */
  const noteClaims = (path: readonly string[], events: readonly ClaimsTurnEvent[], inherited: string, snapshot: WorldSnapshot): string => {
    if (claims.length === 0) return '';
    const bits = new Set(inherited ? inherited.split(',').map(Number) : []);
    for (const claim of claims) {
      if (witnesses.has(claim.index)) {
        if (!claim.never) bits.add(claim.index);
        continue;
      }
      if (!claim.never && bits.has(claim.index)) continue;
      if (!claimHolds(claim, { world, snapshot, events, entityIdByIr, clauseKeysByFired })) continue;
      witnesses.set(claim.index, path);
      if (!claim.never) bits.add(claim.index);
    }
    return [...bits].sort((a, b) => a - b).join(',');
  };
  const allClaimsSettled = () => claims.length > 0 && claims.every((claim) => witnesses.has(claim.index));
  const identityOf = (bits: string): string => {
    const snapshot = readWorldSnapshot(world);
    return `${necessaryIdentity(snapshot, set)}${claims.length ? `|${bits}` : ''}`;
  };

  noteRoom();
  const rootSnapshot = readWorldSnapshot(world);
  const rootBits = noteClaims([], [], '', rootSnapshot);
  const rootSave = await captureSave(engine);
  const seen = new Set<string>([`${necessaryIdentity(rootSnapshot, set)}${claims.length ? `|${rootBits}` : ''}`]);
  let queue: Array<{ save: unknown; path: readonly string[]; depth: number; bits: string }> = [{ save: rootSave, path: [], depth: 0, bits: rootBits }];

  let commandsExecuted = 0;
  let restores = 0;
  let saves = 1;
  let deadEnds = 0;
  const frontierByDepth: Record<number, number> = { 0: 1 };
  const walkStart = Date.now();
  let stopReason: WalkStopReason = 'frontier-exhausted';
  if (allClaimsSettled()) { stopReason = 'all-claims-settled'; queue = []; }

  const elapsedSeconds = () => (Date.now() - walkStart) / 1000;

  walk: while (queue.length > 0) {
    if (seen.size >= maxStates) { stopReason = 'max-states'; break; }
    if (elapsedSeconds() >= maxSeconds) { stopReason = 'max-seconds'; break; }
    const node = queue.shift()!;
    if (node.depth >= maxDepth) { stopReason = 'max-depth-reached'; continue; }

    await restoreSave(engine, node.save);
    restores++;
    const commands = candidateCommands(world, vocabulary, set, nameByIrId, breadth);
    if (commands.length === 0) deadEnds++;

    for (const command of commands) {
      if (seen.size >= maxStates) { stopReason = 'max-states'; break walk; }
      if (elapsedSeconds() >= maxSeconds) { stopReason = 'max-seconds'; break walk; }

      await restoreSave(engine, node.save);
      restores++;
      let turnEvents: readonly ClaimsTurnEvent[] = [];
      try {
        const result = await engine.executeTurn(command);
        turnEvents = result.events ?? [];
      } catch {
        // A refused turn is information about the state, not a failure of the walk.
      }
      commandsExecuted++;
      // The engine's turn resolves through microtasks alone, so a long walk
      // never reaches the macrotask queue on its own and starves whatever
      // hosts it — a test runner's worker channel timed out at a minute.
      // Yield to the event loop now and then.
      if (commandsExecuted % YIELD_EVERY === 0) await new Promise<void>((resolve) => setImmediate(resolve));
      const path = [...node.path, command];
      noteRoom();
      const bits = noteClaims(path, turnEvents, node.bits, readWorldSnapshot(world));
      const identity = identityOf(bits);
      if (!seen.has(identity)) {
        seen.add(identity);
        const save = await captureSave(engine);
        saves++;
        const depth = node.depth + 1;
        frontierByDepth[depth] = (frontierByDepth[depth] ?? 0) + 1;
        queue.push({ save, path, depth, bits });
      }
      if (allClaimsSettled()) { stopReason = 'all-claims-settled'; queue = []; break walk; }
    }
  }

  const walkMs = Date.now() - walkStart;
  // A frontier that ran out with the player never in a room of the set is
  // not an exhausted set: nothing under the set was tried.
  const setRooms = new Set(set.rooms);
  const enteredSet = [...roomsSeen].some((room) => setRooms.has(room));
  if (stopReason === 'frontier-exhausted' && !enteredSet) stopReason = 'start-outside-set';
  const exhausted = stopReason === 'frontier-exhausted' || stopReason === 'all-claims-settled';
  const verdicts: ClaimVerdict[] = claims.map((claim) => {
    const witness = witnesses.get(claim.index);
    const base = { set: group.label, index: claim.index, name: claim.name, never: claim.never, kind: claim.predicate.kind, thingsInSet: set.things.length, inertInSet: inertByIndex.get(claim.index) ?? 0 };
    if (witness !== undefined) {
      return { ...base, verdict: claim.never ? 'violated' : 'held', settledBy: 'witness', witness, depth: witness.length };
    }
    if (claim.never && exhausted) return { ...base, verdict: 'held', settledBy: 'exhaustion' };
    return { ...base, verdict: 'unproven', settledBy: exhausted ? 'exhaustion' : 'budget' };
  });

  return {
    set: group.label,
    necessary: { rooms: set.rooms.length, things: set.things.length, verbs: set.verbs.length },
    budgets: { maxStates, maxSeconds, maxDepth },
    breadth,
    stopReason,
    walkMs,
    statesDiscovered: seen.size,
    commandsExecuted,
    restores,
    saves,
    deadEnds,
    queueRemaining: queue.length,
    roomsReached: [...roomsSeen].sort(),
    frontierByDepth,
    claims: verdicts,
  };
}
