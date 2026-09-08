/**
 * The observe sub-step: the player action's events reach every co-located
 * modeled NPC through the observer (perception, witnessed facts, mood and
 * threat transitions, lucidity triggers), acts are detected and their
 * derived topics land as witnessed knowledge, and a TELL lands as a
 * witnessed claim. Detected acts go on the surface for the scenes sub-step.
 *
 * Public interface: runObserveSubStep.
 * Owner context: @sharpee/character — act detection.
 *
 * References:
 *   ADR-141 — the observer; ADR-310 Phase 5 wired it into the tick.
 *   ADR-318 D4/D12a — act detection and `witnessed as` aliases.
 *   ADR-320 D11 — the statement site: a TELL as a witnessed claim.
 *   ADR-339 D1 — this body moved here from tick-phases.ts unchanged.
 */

import type { ISemanticEvent } from '@sharpee/core';
import { type IFEntity, TraitType } from '@sharpee/world-model';
import { observeEvent } from '@sharpee/stdlib';
import { normalizeTopic } from '@sharpee/chord';
import { detectActs, witnessActs, witnessStatement } from './index.js';
import { type TickContext, type SceneTickSurface, createEvent } from '../tick-support.js';
import type { CharacterPhaseRegistry } from '../tick-phases.js';

// ---------------------------------------------------------------------------
// Observe sub-step (ADR-141 observer, wired per ADR-310 Phase 5)
// ---------------------------------------------------------------------------

/**
 * Forward the player action's events to co-located character-model NPCs
 * through stdlib's `observeEvent` (perception filter, witnessed-fact
 * recording, mood/threat/disposition transitions, lucidity triggers),
 * and classify them through act detection (ADR-318 D4/D12a): a detected
 * act's derived topic — story-aliased via `witnessed as` — lands as
 * witnessed knowledge on the same co-located observers, so reputation
 * travels by propagation. Room-scoped: the events happened where the
 * player acted. NPCs without the trait are untouched (ADR-310 D7).
 */
export function runObserveSubStep(
  npcs: IFEntity[],
  ctx: TickContext,
  registry: CharacterPhaseRegistry,
  surface: SceneTickSurface,
): ISemanticEvent[] {
  const events: ISemanticEvent[] = [];
  const { world, turn, playerLocation, actionEvents } = ctx;
  if (!actionEvents?.length) return events;

  const observers = npcs.filter(
    (npc) => npc.has(TraitType.CHARACTER_MODEL) && world.getLocation(npc.id) === playerLocation,
  );
  if (observers.length === 0) return events;

  for (const event of actionEvents) {
    for (const npc of observers) {
      events.push(...observeEvent(npc, event, world, turn));
    }
    // Act detection at the taking/combat sites (the reveal site rides
    // the dialogue path, where delivery is knowable).
    const acts = detectActs(event, world).map((act) => ({
      ...act,
      derivedTopic: registry.witnessedAliasFor(
        act.actorId,
        (act.category ?? act.faceAct)!,
        act.derivedTopic,
      ),
    }));
    if (acts.length > 0) {
      const learned = witnessActs(acts, observers, turn);
      if (Object.keys(learned).length > 0) {
        events.push(createEvent('character.author.act_witnessed', {
          acts: acts.map((a) => ({ act: a.category ?? a.faceAct, actorId: a.actorId, topic: a.derivedTopic })),
          learned,
        }));
      }
      // Phase 8: acts feed the scenes sub-step — the world-act
      // interruption (D8's exemption) and witnessed-event occasions (D7).
      for (const act of acts) {
        surface.acts.push({
          actorId: act.actorId,
          action: (act.category ?? act.faceAct)!,
          eventId: event.id,
          roomId: playerLocation,
        });
      }
    }

    // The statement site (ADR-320 D11): the player's TELL lands as a
    // witnessed claim in every co-located modeled hearer. Claims tags for
    // authored lines ride the loader's dialogue path, not this event.
    if (event.type === 'if.event.told') {
      const speakerId = event.entities.actor;
      const topicText = (event.data as { topic?: string } | undefined)?.topic;
      if (speakerId && topicText) {
        const statement = witnessStatement(
          world, speakerId, normalizeTopic(topicText), observers, turn,
        );
        if (Object.keys(statement.learned).length > 0) {
          events.push(createEvent('character.author.statement_witnessed', {
            speakerId,
            topic: normalizeTopic(topicText),
            learned: statement.learned,
          }));
        }
        events.push(...statement.authorEvents);
      }
    }
  }

  return events;
}
