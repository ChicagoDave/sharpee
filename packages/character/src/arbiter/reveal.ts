/**
 * Confided-topic reveal arbitration (ADR-318 — the reveal site)
 *
 * The assembled arbitration for the dialogue reveal gate: asked about a
 * topic held `confided`, complying commits `betray a confidence` and
 * satisfies `answers honestly`; the arbiter weighs principles, honor
 * (the room is the audience), temperament, fear, and disposition, and
 * the verdict's bookkeeping (pressure deposits, paralysis warning,
 * author-channel attribution) happens here so every dialogue surface
 * shares one implementation.
 *
 * Public interface: arbitrateConfidedReveal, RevealArbitration.
 * Owner context: @sharpee/character / arbiter
 */

import { type ISemanticEvent } from '@sharpee/core';
import { CharacterModelTrait, type TemperamentDef } from '@sharpee/world-model';
import { createAuthorEvent } from '../conversation/author-events.js';
import { arbitrate } from './arbiter.js';
import type { ArbiterContext, ArbiterVerdict } from './arbiter-types.js';
import { depositPressure } from './pressure.js';
import type { KindMembership } from './scope.js';

/** What the reveal gate needs from the asking site. */
export interface RevealArbitrationInput {
  /** The asked NPC's trait. */
  trait: CharacterModelTrait;
  /** The asked NPC's entity id (author-channel attribution). */
  npcId: string;
  /** The conversing actor (the ledger audience and the act's object). */
  askerId: string;
  /** The canonical topic string being asked about. */
  topic: string;
  /** Entity ids present in the room — honor sees the room (D7). */
  audiencePresent: readonly string[];
  /** The NPC's active entity states, for temperament `while` bindings. */
  activeStates?: readonly string[];
  /** Authored temperament definitions (CharacterPhaseRegistry). */
  temperamentDefs?: Readonly<Record<string, TemperamentDef>>;
  /** Kind membership for classifier scopes (the story oracle's slot). */
  isKindMember?: KindMembership;
}

/** The gate's outcome: the verdict, the reveal decision, and its author events. */
export interface RevealArbitration {
  verdict: ArbiterVerdict;
  /** True exactly when the verdict's act is `comply` — the row may deliver. */
  reveal: boolean;
  /** Arbitration + deposit + paralysis events (ADR-318 D11). */
  authorEvents: ISemanticEvent[];
}

/**
 * Arbitrate revealing a confided topic, with bookkeeping.
 *
 * @param input - The asking site's context
 * @returns The arbitration, or null when the topic is not held confided
 *   (no gate — the row proceeds untouched)
 */
export function arbitrateConfidedReveal(input: RevealArbitrationInput): RevealArbitration | null {
  const { trait, npcId, askerId, topic } = input;
  if (!trait.getFact(topic)?.confided) return null;

  const ctx: ArbiterContext = {
    commits: ['betray a confidence'],
    satisfies: ['answers honestly'],
    audienceId: askerId,
    actObjectId: askerId,
    ...(input.activeStates ? { activeStates: input.activeStates } : {}),
    ...(input.temperamentDefs ? { temperamentDefs: input.temperamentDefs } : {}),
    ...(input.isKindMember ? { isKindMember: input.isKindMember } : {}),
  };
  const verdict = arbitrate(trait, {
    kind: 'dialogue',
    act: 'comply',
    topicId: topic,
    audiencePresent: [...input.audiencePresent],
  }, ctx);

  const authorEvents: ISemanticEvent[] = [
    createAuthorEvent('character.author.arbitration', npcId, {
      site: 'reveal',
      topic,
      winner: verdict.winner,
      act: verdict.act,
      readings: verdict.readings,
      ...(verdict.temperamentApplied ? { temperamentApplied: verdict.temperamentApplied } : {}),
      ...(verdict.defeats.length > 0 ? { defeats: verdict.defeats } : {}),
    }),
  ];

  if (verdict.paralysis) {
    authorEvents.push(createAuthorEvent('character.author.paralysis_warning', npcId, {
      topic,
      principles: verdict.paralysis.principles,
    }));
  }

  // D8: losing live principles/obligations deposit conscience pressure.
  const transition = depositPressure(trait, verdict);
  if (verdict.defeats.length > 0) {
    authorEvents.push(createAuthorEvent('character.author.pressure_deposit', npcId, {
      feed: verdict.defeats.map((d) => d.feed).join(','),
      value: trait.pressure.value,
      band: trait.pressure.band,
      ...(transition ? { transition } : {}),
    }));
  }

  return { verdict, reveal: verdict.act === 'comply', authorEvents };
}
