/**
 * Force feeds (ADR-318 D1) — how each of the five forces reads its
 * intensity off the trait and the arbitration context.
 *
 * All formulas are runtime-owned (rule 4: the runtime boils the pot).
 * Intensities are 0..1. A force is live when its feed is off-baseline.
 *
 * Public interface: computeStancedReadings, PRINCIPLE_DUTY_INTENSITY.
 * Owner context: @sharpee/character / arbiter
 */

import {
  CharacterModelTrait,
  valueToThreat,
  valueToDisposition,
  type PrincipleDecl,
} from '@sharpee/world-model';
import type { ActCandidate, ArbiterContext, StancedReading } from './arbiter-types.js';
import { exceptLifts, scopeMatches } from './scope.js';

/**
 * Principles and obligations burn at a strong fixed baseline (ADR-318 D4:
 * "a principle is a strong habit until character makes it a commitment").
 * Threat must reach 'cornered' (0.8) to outburn one on intensity alone.
 */
export const PRINCIPLE_DUTY_INTENSITY = 0.7;

/** Honor binds at the same strong baseline when declared audience is present (D7). */
export const HONOR_INTENSITY = 0.7;

/** Fear's live threshold — the 'uneasy' boundary on the 0..1 scale. */
const FEAR_LIVE_THRESHOLD = 0.2;

/** Love's live threshold — the 'wary of'/'likes' boundary magnitude on 0..1. */
const LOVE_LIVE_THRESHOLD = 0.2;

/**
 * Whether a principle applies: its category is among the committed ones,
 * its scope (if any) covers the act's object, and its `except` (if any)
 * does not lift it — both interpreted over the canonical scope-string
 * idiom (ADR-318 D4; Phase 6 retires the old `trait.evaluate(except)`
 * placeholder). A scoped principle with no known act object stays in
 * force (conservative both ways: scope can't be shown to miss, except
 * can't be shown to lift).
 */
function principleApplies(
  principle: PrincipleDecl,
  committed: readonly string[],
  ctx: ArbiterContext,
): boolean {
  if (!committed.includes(principle.category)) return false;
  if (principle.scope && ctx.actObjectId !== undefined
      && !scopeMatches(principle.scope, ctx.actObjectId, ctx.isKindMember)) {
    return false;
  }
  if (principle.except && exceptLifts(principle.except, ctx.actObjectId, ctx.isKindMember)) {
    return false;
  }
  return true;
}

/** Attribution slug: 'betray a confidence' → 'never-betray-a-confidence'. */
function principleFeed(principle: PrincipleDecl): string {
  return `principle:never-${principle.category.replace(/ /g, '-')}`;
}

/**
 * Compute every force reading for a candidate, each with the side of the
 * act it pushes. Pure — reads trait state, mutates nothing.
 *
 * @param trait - The arbitrating character's trait
 * @param candidate - The act under consideration
 * @param ctx - Caller-assembled classification and story data
 * @returns Readings in force order: fear, desire, duty, honor, love
 */
export function computeStancedReadings(
  trait: CharacterModelTrait,
  candidate: ActCandidate,
  ctx: ArbiterContext,
): StancedReading[] {
  const readings: StancedReading[] = [];

  // --- fear: threat level and high-arousal negative mood (D1) ---
  const threatIntensity = trait.threatValue / 100;
  const moodFear = trait.moodValence < 0 ? trait.moodArousal * -trait.moodValence : 0;
  const fearIntensity = Math.max(threatIntensity, moodFear);
  readings.push({
    force: 'fear',
    intensity: fearIntensity,
    live: fearIntensity >= FEAR_LIVE_THRESHOLD,
    feed: threatIntensity >= moodFear
      ? `threat:${valueToThreat(trait.threatValue)}`
      : `mood:${trait.getMood()}`,
    // Fear pushes submission in dialogue and risk-aversion in goals.
    stance: candidate.kind === 'dialogue' ? 'for' : 'against',
  });

  // --- desire: active goals (D1) — the caller supplies the goal's bearing ---
  if (ctx.desire) {
    readings.push({
      force: 'desire',
      intensity: ctx.desire.intensity,
      live: ctx.desire.intensity > 0,
      feed: ctx.desire.feed,
      stance: ctx.desire.stance,
    });
  }

  // --- duty: principles and obligations (D1, D4, D5) ---
  for (const principle of trait.principles) {
    if (principleApplies(principle, ctx.commits ?? [], ctx)) {
      readings.push({
        force: 'duty',
        intensity: PRINCIPLE_DUTY_INTENSITY,
        live: true,
        feed: principleFeed(principle),
        stance: 'against',
      });
    }
    if (principleApplies(principle, ctx.refusalCommits ?? [], ctx)) {
      readings.push({
        force: 'duty',
        intensity: PRINCIPLE_DUTY_INTENSITY,
        live: true,
        feed: principleFeed(principle),
        stance: 'for',
      });
    }
  }
  for (const obligation of trait.obligations) {
    if (ctx.satisfies?.includes(obligation.kind)) {
      readings.push({
        force: 'duty',
        intensity: PRINCIPLE_DUTY_INTENSITY,
        live: true,
        feed: `obligation:${obligation.kind.replace(/ /g, '-')}`,
        stance: 'for',
      });
    }
  }

  // --- honor: face-acts before declared audience (D1, D7 — sees the room) ---
  if (trait.honor && candidate.audiencePresent.length > 0) {
    const bound = new Set(trait.honor.faceActs);
    const complyShame = (ctx.complyFaceActs ?? []).find(a => bound.has(a));
    if (complyShame) {
      readings.push({
        force: 'honor',
        intensity: HONOR_INTENSITY,
        live: true,
        feed: `face:${complyShame.replace(/ /g, '-')}`,
        stance: 'against',
      });
    }
    const refuseShame = (ctx.refuseFaceActs ?? []).find(a => bound.has(a));
    if (refuseShame) {
      readings.push({
        force: 'honor',
        intensity: HONOR_INTENSITY,
        live: true,
        feed: `face:${refuseShame.replace(/ /g, '-')}`,
        stance: 'for',
      });
    }
  }

  // --- love: disposition toward the entities in play (D1) ---
  if (ctx.audienceId !== undefined) {
    const disposition = trait.dispositions[ctx.audienceId] ?? 0;
    const loveIntensity = Math.abs(disposition) / 100;
    if (loveIntensity > 0) {
      readings.push({
        force: 'love',
        intensity: loveIntensity,
        live: loveIntensity >= LOVE_LIVE_THRESHOLD,
        feed: `disposition:${valueToDisposition(disposition).replace(/ /g, '-')}`,
        stance: disposition > 0 ? 'for' : 'against',
      });
    }
  }

  return readings;
}
