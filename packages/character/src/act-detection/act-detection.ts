/**
 * Act detection over the event stream (ADR-318 D4/D7/D12a)
 *
 * The runtime half of "a category the runtime cannot detect cannot be a
 * word": classifies semantic events at the three named stdlib sites into
 * act categories and face-acts, derives each witnessed act's deterministic
 * topic name (D12a — actor × act), and records witnessed acts as observer
 * knowledge so reputation travels by propagation (D7).
 *
 * Sites (ADR-318 Implementation):
 * - taking → steal-candidate: `if.event.taken` / `npc.took` where the item
 *   came out of another actor's possession
 * - combat → harm: `if.event.attacked` / `npc.attacked`
 * - reveal → topic delivery: `revealConfidedTopic` — called from the
 *   dialogue path, where delivery is knowable (prose is opaque; events are
 *   not tagged with what a line asserts)
 *
 * Public interface: detectActs, revealConfidedTopic, witnessActs,
 *   derivedTopicFor, DetectedAct.
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
  if (event.type === 'npc.took') {
    const { npc, from } = event.data as { npc?: string; from?: string };
    if (npc && from && world.getEntity(from)?.has(TraitType.ACTOR)) {
      acts.push({
        category: 'steal',
        actorId: npc,
        targetId: from,
        derivedTopic: derivedTopicFor(actorNameOf(world, npc), 'steal'),
      });
    }
  }

  // --- combat → harm ---
  if (event.type === 'if.event.attacked' || event.type === 'npc.attacked') {
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
