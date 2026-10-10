/**
 * claims-walk.ts — one breadth-first walk of a story under a necessary set,
 * settling the claims declared under it (ADR-365 D2, D3, D4, D5).
 *
 * Purpose: fork the real engine through its save/restore hooks and walk the
 * reachable states breadth-first, trying from each state the commands the
 * set allows. Two states are one state when they agree on the player's
 * place, the placement and state of every necessary thing, the story's own
 * state, the score, the stateful trait flags of necessary things — and on
 * which positive claims the path has satisfied (D5): a path that read the
 * diary and one that did not must never merge, or the first to a later
 * claim is lost. The walk keeps the first path to each claim as its witness
 * and stops when every claim is settled (D4) or the frontier or a budget
 * runs out.
 *
 * A positive claim is held by its first witness and unproven otherwise. A
 * negative claim is violated by its first witness, held when the frontier
 * is exhausted without one, and unproven when a budget stopped the walk
 * first (D3) — a budget stop can never hold a negative claim.
 *
 * Public interface: `walkClaims`, `necessaryIdentity`, `ClaimsWalkOptions`,
 *   `ClaimsWalkReport`, `ClaimVerdict`, `ClaimOutcome`, `WalkStopReason`.
 * Owner context: @sharpee/branch-tester — the claims runner (ADR-365 D10).
 */

import { createHash } from 'node:crypto';
import { CHORD_IR_ID_ATTRIBUTE, CHORD_STATE_PREFIX, CHORD_STORY_STATE_KEY } from '@sharpee/story-loader';
import { captureSave, restoreSave } from '@sharpee/transcript-tester';
import type { StoryIR } from '@sharpee/chord';
import type { ClaimGroup, ClaimKind, NecessarySet } from './claim-set.js';
import { claimHolds } from './claim-predicates.js';
import { candidateCommands, deriveCommandVocabulary, type CandidateBreadth } from './claim-candidates.js';
import type { ClaimsGame, ClaimsTurnEvent, WorldSnapshot } from './claims-game.js';
import { irIdOf, readWorldSnapshot } from './claims-game.js';

/** Why a walk stopped. Only the first two exhaust the frontier. */
export type WalkStopReason = 'frontier-exhausted' | 'all-claims-settled' | 'max-states' | 'max-seconds' | 'max-depth-reached';

/** The three outcomes of a claim (ADR-322 D11's held / violated / unproven). */
export type ClaimOutcome = 'held' | 'violated' | 'unproven';

/** One claim's verdict after its walk. */
export interface ClaimVerdict {
  readonly set: string;
  readonly index: number;
  readonly name: string;
  readonly never: boolean;
  readonly kind: ClaimKind;
  readonly verdict: ClaimOutcome;
  /** How the verdict was reached: a witness path, the frontier's exhaustion, or a budget stop that left it open. */
  readonly settledBy: 'witness' | 'exhaustion' | 'budget';
  /** The first path to a state satisfying the claim — present with `settledBy: 'witness'`. */
  readonly witness?: readonly string[];
  readonly depth?: number;
  /** How many things the claim's set carries — each independent one doubles the states to exhaust. */
  readonly thingsInSet: number;
}

/** The budgets and breadth of one walk. */
export interface ClaimsWalkOptions {
  readonly breadth?: CandidateBreadth;
  readonly maxStates?: number;
  readonly maxSeconds?: number;
  readonly maxDepth?: number;
}

/** What one walk reports. */
export interface ClaimsWalkReport {
  readonly set: string;
  readonly necessary: { readonly rooms: number; readonly things: number; readonly verbs: number };
  readonly budgets: { readonly maxStates: number; readonly maxSeconds: number; readonly maxDepth: number };
  readonly breadth: CandidateBreadth;
  readonly stopReason: WalkStopReason;
  readonly walkMs: number;
  readonly statesDiscovered: number;
  readonly commandsExecuted: number;
  readonly restores: number;
  readonly saves: number;
  readonly deadEnds: number;
  readonly queueRemaining: number;
  readonly roomsReached: readonly string[];
  readonly frontierByDepth: Readonly<Record<number, number>>;
  readonly claims: readonly ClaimVerdict[];
}

const DEFAULT_OPTIONS = { breadth: 'basic' as CandidateBreadth, maxStates: 5000, maxSeconds: 120, maxDepth: 40 };

/** Commands between two yields to the event loop. */
const YIELD_EVERY = 200;

/**
 * Traits whose data is game state a player can change. Everything else on
 * an entity (identity prose, scenery marking, a room's visited flag) is
 * immutable or presentation. `readable` is deliberately absent: reading
 * changes nothing a rule reads, which is why a claim about it needs its own
 * bit in the identity.
 */
const STATEFUL_TRAITS = new Set([
  'openable', 'lockable', 'switchable', 'wearable', 'edible', 'health',
  'container', 'supporter', 'lightSource', 'equipped', 'combatant',
]);

function sha1(text: string): string {
  return createHash('sha1').update(text).digest('hex');
}

/**
 * Hash a world as one state under a necessary set: the player's containment,
 * the containment and Chord state of every necessary thing, the story's own
 * state, the score ledger, and the stateful trait flags of necessary
 * things. Nothing outside the set can tell two worlds apart.
 *
 * @param snapshot the parsed world snapshot
 * @param set the necessary set
 * @returns a hex digest
 */
export function necessaryIdentity(snapshot: WorldSnapshot, set: NecessarySet): string {
  const things = new Set(set.things);
  const irById = new Map<string, string>();
  for (const row of snapshot.entities ?? []) {
    const irId = row.entity?.attributes?.[CHORD_IR_ID_ATTRIBUTE];
    if (typeof irId === 'string') irById.set(row.id, irId);
  }

  const pairs: string[] = [];
  for (const row of snapshot.spatialIndex?.parentToChildren ?? []) {
    for (const child of row.children ?? []) {
      if (child === snapshot.playerId) { pairs.push(`${row.parent}>${child}`); continue; }
      const irId = irById.get(child);
      if (irId !== undefined && things.has(irId)) pairs.push(`${row.parent}>${child}`);
    }
  }
  pairs.sort();

  const kept: Array<[string, unknown]> = [];
  for (const [key, value] of Object.entries(snapshot.state ?? {})) {
    if (key === CHORD_STORY_STATE_KEY) { kept.push([key, value]); continue; }
    if (!key.startsWith(CHORD_STATE_PREFIX)) continue;
    if (things.has(key.slice(CHORD_STATE_PREFIX.length))) kept.push([key, value]);
  }
  kept.sort((a, b) => (a[0] < b[0] ? -1 : 1));

  const flags: string[] = [];
  for (const row of snapshot.entities ?? []) {
    const irId = irById.get(row.id);
    if (irId === undefined || !things.has(irId)) continue;
    const keep: string[] = [];
    for (const trait of row.entity?.traits ?? []) {
      if (typeof trait.type === 'string' && STATEFUL_TRAITS.has(trait.type)) keep.push(JSON.stringify(trait));
    }
    if (keep.length) flags.push(`${row.id}=${keep.sort().join(',')}`);
  }
  flags.sort();

  return sha1([
    `loc:${pairs.join(',')}`,
    `state:${JSON.stringify(kept)}`,
    `score:${JSON.stringify(snapshot.scoreLedger ?? null)}`,
    `flags:${flags.join(';')}`,
  ].join('|'));
}

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
export async function walkClaims(game: ClaimsGame, ir: StoryIR, group: ClaimGroup, options: ClaimsWalkOptions = {}): Promise<ClaimsWalkReport> {
  const { breadth, maxStates, maxSeconds, maxDepth } = { ...DEFAULT_OPTIONS, ...options };
  const { world, engine } = game;
  const set = group.set;
  const claims = group.claims;

  // The opening turn, so the walk starts from the state a player sees.
  await game.executeCommand('look');

  const vocabulary = deriveCommandVocabulary(ir, engine);
  const nameByIrId = new Map<string, string>();
  const entityIdByIr = new Map<string, string>();
  for (const entity of world.getAllEntities()) {
    const irId = irIdOf(entity);
    if (irId === undefined) continue;
    nameByIrId.set(irId, entity.name);
    entityIdByIr.set(irId, entity.id);
  }

  const roomsSeen = new Set<string>();
  const noteRoom = () => {
    const player = world.getPlayer();
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
      if (!claimHolds(claim, { world, snapshot, events, entityIdByIr })) continue;
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
  const exhausted = stopReason === 'frontier-exhausted' || stopReason === 'all-claims-settled';
  const verdicts: ClaimVerdict[] = claims.map((claim) => {
    const witness = witnesses.get(claim.index);
    const base = { set: group.label, index: claim.index, name: claim.name, never: claim.never, kind: claim.predicate.kind, thingsInSet: set.things.length };
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
