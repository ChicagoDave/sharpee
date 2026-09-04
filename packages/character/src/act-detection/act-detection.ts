/**
 * Act detection over the event stream (ADR-318 D4/D7/D12a)
 *
 * The runtime half of "a category the runtime cannot detect cannot be a
 * word": classifies semantic events at the three named stdlib sites into
 * act categories and face-acts, derives each witnessed act's deterministic
 * topic name (D12a — actor × act), and records witnessed acts as observer
 * knowledge so reputation travels by propagation (D7).
 *
 * Sites (ADR-318 Implementation; statement site per ADR-320 D11):
 * - taking → steal-candidate: `if.event.taken` where the item
 *   came out of another actor's possession
 * - combat → harm: `if.event.attacked`
 * - reveal → topic delivery: `revealConfidedTopic` — called from the
 *   dialogue path, where delivery is knowable (prose is opaque; events are
 *   not tagged with what a line asserts)
 * - statement → witnessed claim: `witnessStatement` over `if.event.told`
 *   (ADR-320 D11 — the player's utterances are witnessed claims): every
 *   co-located modeled hearer records the statement under the fact-
 *   transfer rules, and a modeled speaker's claims-tagged statement mints
 *   on the speaker's own ledger — both sides can lie, one discipline
 *
 * Public interface: detectActs, revealConfidedTopic, witnessActs,
 *   witnessStatement, derivedTopicFor, DetectedAct.
 * Owner context: @sharpee/character / act-detection
 */

import { type ISemanticEvent } from '@sharpee/core';
import {
  WorldModel,
  TraitType,
  CharacterModelTrait,
  type IFEntity,
  type ActCategory,
  type FaceAct,
} from '@sharpee/world-model';
import { recordClaimDelivery, type ClaimTag } from '../conversation/claims.js';

/** A classified act, ready for arbitration input, minting, and the author channel. */
export interface DetectedAct {
  /** Exactly one of `category` / `faceAct` is set. */
  category?: ActCategory;
  faceAct?: FaceAct;
  actorId: string;
  targetId?: string;
  /** D12a derived deterministic topic name, e.g. 'the Steward stole'. */
  derivedTopic: string;
}

/** Past-tense phrases for the closed category vocabulary (D12a naming). */
const CATEGORY_PAST: Record<ActCategory, string> = {
  'betray a confidence': 'betrayed a confidence',
  'lie': 'lied',
  'harm': 'harmed',
  'steal': 'stole',
  'break a promise': 'broke a promise',
  'abandon': 'abandoned',
  'trespass': 'trespassed',
};

/** Past-tense phrases for the closed face-act vocabulary (D12a naming). */
const FACE_PAST: Record<FaceAct, string> = {
  'backs down': 'backed down',
  'shows fear': 'showed fear',
  'admits fault': 'admitted fault',
  'pleads': 'pleaded',
  'accepts insult': 'accepted insult',
  'caught lying': 'was caught lying',
};

/**
 * The deterministic platform-derived topic name for an act (D12a): the
 * actor and the act. The namespace is compile-checkable — actors ×
 * detectable acts is a closed set. Scene aliases (`witnessed as`) rename
 * at the Chord layer; pass the alias map at that integration.
 *
 * @param actorName - The acting entity's display name
 * @param act - The category or face-act performed
 * @returns The derived topic string, e.g. 'the Colonel backed down'
 */
export function derivedTopicFor(actorName: string, act: ActCategory | FaceAct): string {
  const past = (CATEGORY_PAST as Record<string, string>)[act] ?? (FACE_PAST as Record<string, string>)[act];
  return `${actorName} ${past}`;
}

function actorNameOf(world: WorldModel, actorId: string): string {
  // Topic identity must be stable and third-person: the player's display
  // name is the self-referential 'yourself', which reads as a fact about
  // the listener once the topic propagates NPC-to-NPC (ADR-310 D10).
  if (world.getPlayer()?.id === actorId) return 'the player';
  return world.getEntity(actorId)?.name ?? actorId;
}

/**
 * Classify one semantic event at the taking and combat sites. Pure —
 * reads world state, mutates nothing. The reveal site cannot be detected
 * from events (prose is opaque) and lives in `revealConfidedTopic`.
 *
 * @param event - A dispatched semantic event
 * @param world - The live world, for prior-holder and name lookups
 * @returns Zero or more classified acts
 */
export function detectActs(event: ISemanticEvent, world: WorldModel): DetectedAct[] {
  const acts: DetectedAct[] = [];

  // --- taking → steal-candidate ---
  if (event.type === 'if.event.taken') {
    const actorId = event.entities.actor;
    const from = (event.data as { fromLocation?: string } | undefined)?.fromLocation;
    if (actorId && from && from !== actorId) {
      const holder = world.getEntity(from);
      if (holder?.has(TraitType.ACTOR)) {
        acts.push({
          category: 'steal',
          actorId,
          targetId: from,
          derivedTopic: derivedTopicFor(actorNameOf(world, actorId), 'steal'),
        });
      }
    }
  }

  // --- combat → harm ---
  if (event.type === 'if.event.attacked') {
    const actorId = event.entities.actor;
    const targetId = (event.data as { target?: string } | undefined)?.target;
    if (actorId) {
      acts.push({
        category: 'harm',
        actorId,
        targetId,
        derivedTopic: derivedTopicFor(actorNameOf(world, actorId), 'harm'),
      });
    }
  }

  return acts;
}

/**
 * The reveal site (topic delivery): classify a speaker delivering a topic.
 * Called from the dialogue path, which alone knows what was delivered.
 * Pure — the caller owns any bookkeeping.
 *
 * @param speaker - The NPC delivering the topic
 * @param speakerTrait - The speaker's trait (holds the confided marker)
 * @param topic - The topic being delivered
 * @returns The betray-a-confidence act when the topic is marked confided
 */
export function revealConfidedTopic(
  speaker: IFEntity,
  speakerTrait: CharacterModelTrait,
  topic: string,
): DetectedAct | undefined {
  if (!speakerTrait.getFact(topic)?.confided) return undefined;
  return {
    category: 'betray a confidence',
    actorId: speaker.id,
    derivedTopic: derivedTopicFor(speaker.name, 'betray a confidence'),
  };
}

/**
 * The statement site (ADR-320 D11): a speaker's TELL/SAY lands in every
 * modeled hearer under the fact-transfer rules — the hearer records the
 * topic (`told`), a valued claim rides when one is asserted (the explicit
 * claim tag first, else the modeled speaker's own held value), and a
 * belief the hearer already holds is never displaced (belief revision is
 * D14 resistance territory). A modeled speaker's claims-tagged statement
 * additionally runs the lie-ledger mint rule per hearer-audience
 * (`recordClaimDelivery`) — the both-sides-can-lie symmetry — and every
 * hearer is recorded on the speaker's told-record.
 *
 * @param world - The live world (speaker trait lookup)
 * @param speakerId - The speaking actor (the player at the stdlib site)
 * @param topic - The normalized topic key the statement is about
 * @param hearers - Who heard it (co-located; the speaker is skipped)
 * @param turn - Current turn number
 * @param claims - The statement's claim tag, when an authored line asserts one
 * @returns Topics learned per hearer id, plus author-channel events from
 *   any ledger bookkeeping
 */
export function witnessStatement(
  world: WorldModel,
  speakerId: string,
  topic: string,
  hearers: readonly IFEntity[],
  turn: number,
  claims?: ClaimTag,
): { learned: Record<string, string[]>; authorEvents: ISemanticEvent[] } {
  const learned: Record<string, string[]> = {};
  const authorEvents: ISemanticEvent[] = [];
  const speakerTrait = world
    .getEntity(speakerId)
    ?.get(TraitType.CHARACTER_MODEL) as CharacterModelTrait | undefined;

  // The asserted value: an explicit claim tag first; else a modeled
  // speaker's held value rides, as in propagation's transfer.
  const claimFactId = claims?.factId ?? topic;
  const claimValue = claims?.value ?? speakerTrait?.getFactBelief(topic)?.value;

  for (const hearer of hearers) {
    if (hearer.id === speakerId) continue;
    const trait = hearer.get(TraitType.CHARACTER_MODEL) as CharacterModelTrait | undefined;
    if (!trait) continue;

    if (!trait.knows(topic)) {
      trait.addFact(topic, 'told', 'believes', turn);
      (learned[hearer.id] ??= []).push(topic);
    }
    if (claimValue !== undefined && !trait.hasFactBelief(claimFactId)) {
      trait.setFactBelief(claimFactId, {
        value: claimValue,
        confidence: 'believes',
        source: 'told',
        turnLearned: turn,
        resistance: 'none',
      });
    }
    if (speakerTrait) {
      speakerTrait.recordTold(hearer.id, topic);
      if (claims) {
        authorEvents.push(...recordClaimDelivery(speakerTrait, speakerId, hearer.id, claims, turn));
      }
    }
  }

  return { learned, authorEvents };
}

/**
 * Record witnessed acts as observer knowledge under their derived topic
 * names (D12a: coverage is total with zero authoring cost; D7: reputation
 * travels from here by `spreads`).
 *
 * @param acts - Acts detected this turn
 * @param observers - Entities that witnessed them (co-located, minus the actor)
 * @param turn - Current turn number
 * @returns Topic names actually learned, per observer id
 */
export function witnessActs(
  acts: readonly DetectedAct[],
  observers: readonly IFEntity[],
  turn: number,
): Record<string, string[]> {
  const learned: Record<string, string[]> = {};
  for (const act of acts) {
    for (const observer of observers) {
      if (observer.id === act.actorId) continue;
      const trait = observer.get(TraitType.CHARACTER_MODEL) as CharacterModelTrait | undefined;
      if (!trait || trait.knows(act.derivedTopic)) continue;
      trait.addFact(act.derivedTopic, 'witnessed', 'certain', turn);
      (learned[observer.id] ??= []).push(act.derivedTopic);
    }
  }
  return learned;
}
