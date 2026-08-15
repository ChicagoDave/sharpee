/**
 * The force arbiter (ADR-318 D1–D3, D6; contracts.md §3)
 *
 * Decides which force wins when live forces disagree on an act. Pure —
 * it computes a verdict; the tick's bookkeeping (pressure.ts) mutates.
 *
 * The rules, in order:
 * - D2 default: no declared ordering between the colliding forces →
 *   whichever feed currently burns hotter wins. The declaration is the
 *   deviation.
 * - D3 temperament: the live binding's pair lines override intensity for
 *   exactly the pairs they name.
 * - D6 paralysis: two unexcepted duty feeds in live collision (one
 *   forbidding the act, one compelling it) → evasion, plus a verdict
 *   field the author channel turns into a warning naming both.
 *
 * Public interface: arbitrate.
 * Owner context: @sharpee/character / arbiter
 */

import { CharacterModelTrait, type Force, type TemperamentDef } from '@sharpee/world-model';
import type {
  ActCandidate,
  ArbiterContext,
  ArbiterVerdict,
  ArbiterAct,
  StancedReading,
} from './arbiter-types.js';
import { computeStancedReadings } from './force-feeds.js';

/** The act the 'against' side produces when it wins. */
function refusalOf(candidate: ActCandidate): ArbiterAct {
  return 'refuse';
}

/** Highest-intensity reading on a side; ties keep the earlier (feed-order) reading. */
function top(side: StancedReading[]): StancedReading | undefined {
  let best: StancedReading | undefined;
  for (const r of side) {
    if (!best || r.intensity > best.intensity) best = r;
  }
  return best;
}

/** Resolve the live temperament definition for the current states, if any. */
function liveTemperament(
  trait: CharacterModelTrait,
  ctx: ArbiterContext,
): TemperamentDef | undefined {
  const name = trait.activeTemperament(ctx.activeStates ?? []);
  if (!name) return undefined;
  return ctx.temperamentDefs?.[name];
}

/**
 * Arbitrate a candidate act against the character's live forces.
 *
 * @param trait - The arbitrating character's trait
 * @param candidate - The act under consideration
 * @param ctx - Caller-assembled classification and story data
 * @returns The verdict: winner, resulting act, readings, defeats, paralysis
 */
export function arbitrate(
  trait: CharacterModelTrait,
  candidate: ActCandidate,
  ctx: ArbiterContext,
): ArbiterVerdict {
  const stanced = computeStancedReadings(trait, candidate, ctx);
  const readings = stanced.map(({ stance: _stance, ...reading }) => reading);

  const liveFor = stanced.filter(r => r.live && r.stance === 'for');
  const liveAgainst = stanced.filter(r => r.live && r.stance === 'against');

  // D6 paralysis: unexcepted duty feeds live on BOTH sides. Temperament
  // orders forces, not principles — no ordering can break this tie.
  const dutyFor = liveFor.find(r => r.force === 'duty');
  const dutyAgainst = liveAgainst.find(r => r.force === 'duty');
  if (dutyFor && dutyAgainst) {
    return {
      winner: 'duty',
      act: 'evade',
      readings,
      defeats: [],
      paralysis: { principles: [dutyAgainst.feed, dutyFor.feed] },
    };
  }

  // No live collision: the act stands (or falls) uncontested.
  if (liveFor.length === 0 && liveAgainst.length === 0) {
    const strongest = top(stanced);
    return {
      winner: strongest?.force ?? 'desire',
      act: candidate.act,
      readings,
      defeats: [],
    };
  }
  if (liveAgainst.length === 0) {
    return { winner: top(liveFor)!.force, act: candidate.act, readings, defeats: [] };
  }
  if (liveFor.length === 0) {
    return { winner: top(liveAgainst)!.force, act: refusalOf(candidate), readings, defeats: [] };
  }

  // Live collision: D3 temperament pairs override, else D2 intensity.
  const forTop = top(liveFor)!;
  const againstTop = top(liveAgainst)!;
  const temperament = liveTemperament(trait, ctx);

  let winnerSide: 'for' | 'against';
  let temperamentApplied: ArbiterVerdict['temperamentApplied'];

  const pair = temperament?.pairs.find(([over, under]) =>
    (over === forTop.force && under === againstTop.force) ||
    (over === againstTop.force && under === forTop.force),
  );
  if (pair && temperament && forTop.force !== againstTop.force) {
    winnerSide = pair[0] === forTop.force ? 'for' : 'against';
    temperamentApplied = { name: temperament.name, pair: [pair[0], pair[1]] as [Force, Force] };
  } else if (forTop.intensity > againstTop.intensity) {
    winnerSide = 'for';
  } else {
    // Ties hold the line: on equal heat the character does not move.
    // Runtime-owned determinism, not authorable surface.
    winnerSide = 'against';
  }

  const losing = winnerSide === 'for' ? liveAgainst : liveFor;
  // D8: a live principle (or compelling obligation) that loses deposits.
  const defeats = losing
    .filter(r => r.feed.startsWith('principle:') || r.feed.startsWith('obligation:'))
    .map(r => ({ force: r.force, feed: r.feed }));

  return {
    winner: winnerSide === 'for' ? forTop.force : againstTop.force,
    act: winnerSide === 'for' ? candidate.act : refusalOf(candidate),
    readings,
    temperamentApplied,
    defeats,
  };
}
