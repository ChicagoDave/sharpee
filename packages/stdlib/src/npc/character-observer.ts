/**
 * Character observation handler (ADR-141)
 *
 * Processes events witnessed by NPCs through the cognitive profile filter
 * and updates character model state accordingly.
 *
 * Public interface: observeEvent(), DefaultStateTransitions.
 * Owner context: stdlib / npc
 */

import { ISemanticEvent, EntityId } from '@sharpee/core';
import {
  IFEntity,
  WorldModel,
  TraitType,
  CharacterModelTrait,
  Mood,
  ThreatLevel,
} from '@sharpee/world-model';
import { CharacterMessages } from './character-messages';

// ---------------------------------------------------------------------------
// State transition rules
// ---------------------------------------------------------------------------

/** A default state transition triggered by an event type. */
export interface StateTransitionRule {
  /** Event type pattern to match (exact string match). */
  eventType: string;
  /** Threat delta when this event is observed. */
  threatDelta?: number;
  /** Mood valence delta. */
  moodValenceDelta?: number;
  /** Mood arousal delta. */
  moodArousalDelta?: number;
  /**
   * Disposition delta toward the event's actor.
   * Only applied when the event has an actor entity.
   */
  dispositionDelta?: number;
}

/**
 * Default state transition rules.
 *
 * Stories can override by providing their own rules array
 * to observeEvent(). These are sensible defaults per ADR-141:
 * violence increases threat, gifts improve disposition, etc.
 */
export const DefaultStateTransitions: StateTransitionRule[] = [
  // Violence
  { eventType: 'npc.attacked', threatDelta: 30, moodValenceDelta: -0.3, moodArousalDelta: 0.3 },
  { eventType: 'if.action.attacking', threatDelta: 20, moodValenceDelta: -0.2, moodArousalDelta: 0.2 },
  { eventType: 'npc.killed', threatDelta: 40, moodValenceDelta: -0.5, moodArousalDelta: 0.4 },

  // Kindness
  { eventType: 'if.action.giving', dispositionDelta: 10, moodValenceDelta: 0.1 },

  // Theft
  { eventType: 'if.action.taking', dispositionDelta: -5 },

  // Speech
  { eventType: 'npc.spoke', moodArousalDelta: 0.05 },
];

// ---------------------------------------------------------------------------
// Event creation helper
// ---------------------------------------------------------------------------

let eventCounter = 0;

function createCharacterEvent(
  type: string,
  npcId: EntityId,
  data: Record<string, unknown>,
): ISemanticEvent {
  return {
    id: `char_${++eventCounter}_${Date.now()}`,
    type,
    timestamp: Date.now(),
    entities: { actor: npcId },
    data,
  };
}

// ---------------------------------------------------------------------------
// Perception filter
// ---------------------------------------------------------------------------

/**
 * Filter an event through the NPC's cognitive profile.
 *
 * @param trait - The NPC's CharacterModelTrait
 * @param event - The incoming event
 * @returns 'pass' if the event should be processed, 'miss' if filtered out,
 *          'amplify' if the event should be processed with heightened impact
 */
export function filterPerception(
  trait: CharacterModelTrait,
  event: ISemanticEvent,
): 'pass' | 'miss' | 'amplify' {
  const mode = trait.cognitiveProfile.perception;

  if (mode === 'accurate') return 'pass';

  if (mode === 'filtered') {
    const filters = trait.perceptionFilters;
    if (!filters) return 'pass';

    const eventType = event.type;
    const eventTags = (event as { tags?: string[] }).tags ?? [];
    const allTokens = [eventType, ...eventTags];

    // Check misses
    for (const pattern of filters.misses) {
      if (allTokens.some(t => t.includes(pattern))) return 'miss';
    }

    // Check amplifies
    for (const pattern of filters.amplifies) {
      if (allTokens.some(t => t.includes(pattern))) return 'amplify';
    }

    return 'pass';
  }

  // augmented — events pass through; hallucinations are injected separately
  return 'pass';
}

// ---------------------------------------------------------------------------
// Hallucination injection
// ---------------------------------------------------------------------------

/**
 * Inject hallucinated facts for an NPC with augmented perception.
 *
 * Only injects when the NPC's current lucidity state matches
 * the perceived event's `when` condition.
 *
 * @param trait - The NPC's CharacterModelTrait
 * @param npcId - The NPC entity ID
 * @param turn - Current turn number
 * @returns Array of hallucination events (may be empty)
 */
export function injectHallucinations(
  trait: CharacterModelTrait,
  npcId: EntityId,
  turn: number,
): ISemanticEvent[] {
  if (trait.cognitiveProfile.perception !== 'augmented') return [];

  const events: ISemanticEvent[] = [];

  for (const [topic, perceived] of Object.entries(trait.perceivedEvents)) {
    if (trait.currentLucidityState === perceived.when) {
      // Only inject once — don't re-hallucinate known facts
      if (!trait.knows(topic)) {
        trait.addFact(topic, 'hallucinated', 'certain', turn);
        events.push(createCharacterEvent(
          CharacterMessages.HALLUCINATION_ONSET,
          npcId,
          { topic, content: perceived.content },
        ));
      }
    }
  }

  return events;
}

// ---------------------------------------------------------------------------
// Main observation handler
// ---------------------------------------------------------------------------

/**
 * Process an event observed by an NPC through the character model.
 *
 * 1. Checks for CharacterModelTrait (returns early if absent — opt-in).
 * 2. Filters event through cognitive profile perception mode.
 * 3. Adds witnessed fact to knowledge.
 * 4. Applies default state transition rules.
 * 5. Checks lucidity triggers.
 * 6. Injects hallucinated facts (augmented perception).
 * 7. Emits observable behavior events for state changes.
 *
 * @param npc - The NPC entity
 * @param event - The observed event
 * @param world - The world model
 * @param turn - Current turn number
 * @param rules - State transition rules (defaults to DefaultStateTransitions)
 * @returns Array of observable behavior events emitted by state changes
 */
export function observeEvent(
  npc: IFEntity,
  event: ISemanticEvent,
  world: WorldModel,
  turn: number,
  rules: StateTransitionRule[] = DefaultStateTransitions,
): ISemanticEvent[] {
  const trait = npc.get(TraitType.CHARACTER_MODEL) as CharacterModelTrait | undefined;
  if (!trait) return [];

  const emittedEvents: ISemanticEvent[] = [];

  // 1. Perception filter
  const perception = filterPerception(trait, event);
  if (perception === 'miss') return [];

  const amplify = perception === 'amplify' ? 2.0 : 1.0;

  // 2. Add witnessed fact
  const factTopic = event.type;
  if (!trait.knows(factTopic)) {
    trait.addFact(factTopic, 'witnessed', 'certain', turn);
    emittedEvents.push(createCharacterEvent(
      CharacterMessages.FACT_LEARNED,
      npc.id,
      { topic: factTopic, source: 'witnessed' },
    ));
  }

  // 3. Apply state transition rules
  const previousMood = trait.getMood();
  const previousThreat = trait.getThreat();

  for (const rule of rules) {
    if (rule.eventType !== event.type) continue;

    if (rule.threatDelta) {
      trait.adjustThreat(rule.threatDelta * amplify);
    }
    if (rule.moodValenceDelta) {
      trait.adjustMood(rule.moodValenceDelta * amplify, 0);
    }
    if (rule.moodArousalDelta) {
      trait.adjustMood(0, rule.moodArousalDelta * amplify);
    }
    if (rule.dispositionDelta && event.entities.actor) {
      trait.adjustDisposition(event.entities.actor, rule.dispositionDelta * amplify);
    }
  }

  // Emit mood change event if mood word changed
  const newMood = trait.getMood();
  if (newMood !== previousMood) {
    emittedEvents.push(createCharacterEvent(
      CharacterMessages.MOOD_CHANGED,
      npc.id,
      { from: previousMood, to: newMood },
    ));
  }

  // Emit threat change event if threat word changed
  const newThreat = trait.getThreat();
  if (newThreat !== previousThreat) {
    emittedEvents.push(createCharacterEvent(
      CharacterMessages.THREAT_CHANGED,
      npc.id,
      { from: previousThreat, to: newThreat },
    ));
  }

  // 4. Check lucidity triggers
  if (trait.lucidityConfig) {
    const previousState = trait.currentLucidityState;
    for (const [triggerName, trigger] of Object.entries(trait.lucidityConfig.triggers)) {
      // Trigger names can reference event types or predicate names
      if (event.type === triggerName || (trait.hasPredicate(triggerName) && trait.evaluate(triggerName))) {
        if (trigger.transition === 'immediate') {
          trait.enterLucidityState(trigger.target);
        }
        // 'next turn' transitions are handled by lucidity decay / tick processing
        // We store them as pending for the next tick cycle
        if (trigger.transition === 'next turn' && trait.currentLucidityState !== trigger.target) {
          trait.enterLucidityState(trigger.target);
        }
      }
    }

    if (trait.currentLucidityState !== previousState) {
      emittedEvents.push(createCharacterEvent(
        CharacterMessages.LUCIDITY_SHIFT,
        npc.id,
        { from: previousState, to: trait.currentLucidityState },
      ));
    }
  }

  // 5. Inject hallucinations (augmented perception)
  const hallucinationEvents = injectHallucinations(trait, npc.id, turn);
  emittedEvents.push(...hallucinationEvents);

  return emittedEvents;
}
