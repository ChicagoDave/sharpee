/**
 * claim-floor.ts — every tree line is a proof for every positive claim, and
 * a locked claim is checked at the card it was locked on (ADR-367 D5).
 *
 * Purpose: the tree run already replays every played line at the pinned
 * seed and has the world in hand after each card. The floor reads it there:
 * at every card it evaluates each positive claim no line has reached yet
 * and records the first line and turn that reaches it, so the claims tier
 * walks only what no line proves. At a card carrying `locks` it evaluates
 * each named claim there, the lock's own proof, and records whether it
 * held. A `never` claim is untouched — exhaustion proves it, never a line
 * (ADR-365 D3).
 *
 * The floor never writes. Its reading is report data the runner folds into
 * its verdicts (`held, by line …`) and its report; and `onCard` hands the
 * walker each lock's verdict at its card, which the walker merges into the
 * card's own result — a lock that does not hold is a failed card, in the
 * claim's words (ADR-367 D6). That failure is the one place a broken lock
 * is loud; the claims tier's verdicts still never gate (ADR-365 D9).
 *
 * Public interface: `createClaimFloor`, `ClaimFloor`, `ClaimFloorReading`,
 *   `ClaimFloorReach`, `ClaimPinResult`.
 * Owner context: @sharpee/branch-tester — the claims runner (ADR-365 D10).
 */

import type { StoryIR } from '@sharpee/chord';
import type { Claim, ClaimSet } from './claim-set.js';
import { claimHolds, claimNamesOf, clauseKeysByFiredOf, describeClaimMiss, entityIdByIrOf, type ClaimContext } from './claim-predicates.js';
import type { ClaimsTurnEvent, ClaimsWorld } from './claims-game.js';
import { readWorldSnapshot } from './claims-game.js';
import type { TreeCard } from '../tree-document.js';
import type { CardLockVerdict, TreeLine, TreeLineObserver, TreeWalkerGame } from '../tree-walker.js';

/** Where a line first reached a claim. */
export interface ClaimFloorReach {
  readonly lineId: string;
  readonly label: string;
  readonly turn: number;
  readonly cardId?: string;
}

/** One lock's check at its card. */
export interface ClaimPinResult {
  readonly claim: string;
  readonly lineId: string;
  readonly label: string;
  readonly turn: number;
  readonly cardId?: string;
  /** `held`, `not-held`, or `unknown-claim` when the fragment no longer declares the name. */
  readonly outcome: 'held' | 'not-held' | 'unknown-claim';
  /** What was so instead, in the claim's words, when not held (ADR-367 D6); absent when held. */
  readonly message?: string;
}

/** What the floor saw over one tree run. */
export interface ClaimFloorReading {
  /** Claim index to the first line and turn that reached it. */
  readonly reached: ReadonlyMap<number, ClaimFloorReach>;
  /** Every lock the run met, in run order. */
  readonly pins: readonly ClaimPinResult[];
}

/** The floor: hand `onCard` to the walker, read the result after the run. */
export interface ClaimFloor {
  readonly onCard: NonNullable<TreeLineObserver['onCard']>;
  reading(): ClaimFloorReading;
}

/** The slice of the walker's game the floor reads — bootstrap's `LoadedGame` shape. */
interface FloorGame {
  world?: unknown;
  lastEvents?: readonly ClaimsTurnEvent[];
}

/**
 * Build the floor for one claim set over one tree run.
 *
 * @param ir the compiled story the claims were lowered against
 * @param claimSet the normalized claims the manifest's fragment declares
 * @returns the walker hook and the reading
 */
export function createClaimFloor(ir: StoryIR, claimSet: ClaimSet): ClaimFloor {
  const clauseKeysByFired = clauseKeysByFiredOf(ir);
  const names = claimNamesOf(ir);
  const byName = new Map(claimSet.claims.map((claim) => [claim.name, claim]));
  const positive = claimSet.claims.filter((claim) => !claim.never);
  const reached = new Map<number, ClaimFloorReach>();
  const pins: ClaimPinResult[] = [];
  // The boot-time id map, per booted game: a line boots fresh, and ids are
  // the loader's per boot.
  const idMaps = new WeakMap<object, Map<string, string>>();

  const contextOf = (game: FloorGame): ClaimContext | undefined => {
    const world = game.world as ClaimsWorld | undefined;
    if (!world || typeof world.toJSON !== 'function') return undefined;
    let entityIdByIr = idMaps.get(game);
    if (!entityIdByIr) {
      entityIdByIr = entityIdByIrOf(world);
      idMaps.set(game, entityIdByIr);
    }
    return { world, snapshot: readWorldSnapshot(world), events: game.lastEvents ?? [], entityIdByIr, clauseKeysByFired };
  };

  const onCard = (info: { line: TreeLine; label: string; card: TreeCard; turn: number; game: TreeWalkerGame }): CardLockVerdict[] => {
    const { line, label, card, turn } = info;
    const locks = card.locks ?? [];
    const pending = positive.filter((claim) => !reached.has(claim.index));
    if (pending.length === 0 && locks.length === 0) return [];
    const ctx = contextOf(info.game as FloorGame);
    if (!ctx) return [];
    const where = { lineId: line.id, label, turn, ...(card.id !== undefined ? { cardId: card.id } : {}) };
    for (const claim of pending) {
      if (claimHolds(claim, ctx)) reached.set(claim.index, where);
    }
    // The lock's own proof (D5), and the card's verdict (D6): a pin that
    // does not hold fails the card it is on, in the claim's own words; a
    // pin to a name the fragment no longer declares is a broken lock too.
    const verdicts: CardLockVerdict[] = [];
    for (const name of locks) {
      const claim: Claim | undefined = byName.get(name);
      if (claim === undefined) {
        const message = 'the fragment declares no claim of that name';
        pins.push({ claim: name, ...where, outcome: 'unknown-claim', message });
        verdicts.push({ name, held: false, message });
      } else if (claimHolds(claim, ctx)) {
        pins.push({ claim: name, ...where, outcome: 'held' });
        verdicts.push({ name, held: true });
      } else {
        const message = describeClaimMiss(claim, ctx, names);
        pins.push({ claim: name, ...where, outcome: 'not-held', message });
        verdicts.push({ name, held: false, message });
      }
    }
    return verdicts;
  };

  return { onCard, reading: () => ({ reached, pins }) };
}
