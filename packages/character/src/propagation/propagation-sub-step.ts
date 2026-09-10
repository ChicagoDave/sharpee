/**
 * The propagation sub-step: in every room holding two or more modeled NPCs
 * with a propagation profile, each speaker's transfers to each listener are
 * evaluated and applied. A wrappable pair's transfer becomes a scene move on
 * the surface; an ambient transfer narrates directly; an arrival the story
 * narrates itself is queued for the arrival reactions instead.
 *
 * Public interface: runPropagationSubStep.
 * Owner context: @sharpee/character — propagation.
 *
 * References:
 *   ADR-144 — knowledge propagation between co-located NPCs.
 *   ADR-320 Phase 8 (D10) — propagation made visible as scene moves.
 *   ADR-328 D3 — narration is tagged by room, never dropped.
 *   GH #353 — arrival-narrated topics: the story reacts, the platform stands down.
 *   ADR-339 D1 — this body moved here from tick-phases.ts unchanged.
 */

import type { ISemanticEvent } from '@sharpee/core';
import { type IFEntity, type WorldModel, TraitType, type CharacterModelTrait } from '@sharpee/world-model';
import {
  type PropagationContext,
  type RoomOccupant,
  evaluatePropagation,
  transferFact,
  getVisibilityResult,
} from './index.js';
import { type TickContext, type SceneTickSurface, createEvent, sceneWrappable } from '../tick-support.js';
import type { CharacterPhaseRegistry } from '../tick-phases.js';

// ---------------------------------------------------------------------------
// Propagation sub-step (ADR-144)
// ---------------------------------------------------------------------------

export function runPropagationSubStep(
  npcs: IFEntity[],
  ctx: TickContext,
  registry: CharacterPhaseRegistry,
  surface: SceneTickSurface,
): ISemanticEvent[] {
  const events: ISemanticEvent[] = [];
  const { world, turn } = ctx;

  // Group NPCs by room
  const roomNpcs = new Map<string, IFEntity[]>();
  for (const npc of npcs) {
    const loc = world.getLocation(npc.id);
    if (!loc) continue;
    const config = registry.getConfig(npc.id);
    if (!config?.propagationProfile) continue;
    if (!npc.has(TraitType.CHARACTER_MODEL)) continue;
    const list = roomNpcs.get(loc) ?? [];
    list.push(npc);
    roomNpcs.set(loc, list);
  }

  for (const [roomId, roomNpcList] of roomNpcs) {
    if (roomNpcList.length < 2) continue;
    handleRoomPropagation(roomId, roomNpcList, registry, world, turn, events, surface);
  }

  return events;
}

/**
 * Evaluate propagation for all speaker/listener pairs in a single room.
 *
 * @param roomId - The room entity ID
 * @param roomNpcList - NPCs co-located in this room
 * @param registry - Character phase registry for configs
 * @param world - World model for entity lookups
 * @param turn - Current turn number
 * @param events - Accumulator for narration events (ADR-328 D3: tagged, not dropped)
 */
function handleRoomPropagation(
  roomId: string,
  roomNpcList: IFEntity[],
  registry: CharacterPhaseRegistry,
  world: WorldModel,
  turn: number,
  events: ISemanticEvent[],
  surface: SceneTickSurface,
): void {
  for (const speaker of roomNpcList) {
    const config = registry.getConfig(speaker.id)!;
    const trait = speaker.get(TraitType.CHARACTER_MODEL) as CharacterModelTrait;
    if (!trait || !config.propagationProfile) continue;

    const listeners: RoomOccupant[] = roomNpcList
      .filter(n => n.id !== speaker.id)
      .map(n => ({
        id: n.id,
        trait: n.get(TraitType.CHARACTER_MODEL) as CharacterModelTrait,
        profile: registry.getConfig(n.id)?.propagationProfile,
      }));

    const propContext: PropagationContext = {
      speaker: { id: speaker.id, trait, profile: config.propagationProfile },
      listeners,
      turn,
    };

    const transfers = evaluatePropagation(propContext);

    for (const transfer of transfers) {
      recordTransfer(transfer, speaker, trait, roomId, registry, world, turn, events, surface);
    }
  }
}

/**
 * Apply a single propagation transfer and emit a witnessed event if visible.
 *
 * @param transfer - The propagation transfer to apply
 * @param speaker - The speaking NPC entity
 * @param speakerTrait - The speaker's trait (told-record home, ADR-310 D17)
 * @param roomId - The room where propagation occurs
 * @param registry - Character phase registry for configs
 * @param world - World model for entity lookups
 * @param turn - Current turn number
 * @param events - Accumulator for narration events (ADR-328 D3: tagged, not dropped)
 */
function recordTransfer(
  transfer: ReturnType<typeof evaluatePropagation>[number],
  speaker: IFEntity,
  speakerTrait: CharacterModelTrait,
  roomId: string,
  registry: CharacterPhaseRegistry,
  world: WorldModel,
  turn: number,
  events: ISemanticEvent[],
  surface: SceneTickSurface,
): void {
  const listenerEntity = world.getEntity(transfer.listenerId);
  if (!listenerEntity) return;
  const listenerTrait = listenerEntity.get(TraitType.CHARACTER_MODEL) as CharacterModelTrait;
  if (!listenerTrait) return;

  const listenerConfig = registry.getConfig(transfer.listenerId);
  const receivesAs = listenerConfig?.propagationProfile?.receives ?? 'as fact';

  const result = transferFact(transfer, speakerTrait, listenerTrait, turn, receivesAs);

  // The story narrates this arrival itself when the listener has a
  // turn-triggered rule gated on knowing this topic: that rule fires on the
  // same tick the fact lands, in the author's own words. The platform's
  // generic summary would describe the identical moment a second time —
  // Kemp's staged blow-up, immediately followed by "Richard Burbage mentions
  // something to Will Kemp." The transfer still happens; only the platform's
  // narration of it stands down.
  const authorNarratesArrival =
    listenerConfig?.arrivalNarratedTopics?.has(transfer.topic) ?? false;

  // GH #353: the story reacts to that arrival on THIS tick — the contract
  // `arrivalNarratedTopics` names — but after the tick's own sub-steps, so
  // the reaction is queued on the surface and run last (see
  // runArrivalReactions). The scheduler's own pass of the clause (whatever
  // band it runs in, ADR-332) then finds a `, once` clause already spent.
  // Both paths below queue it: the reaction is about the fact landing, not
  // about how the line travels.
  if (!result.alreadyKnew && authorNarratesArrival) {
    surface.arrivals.push({
      listenerId: transfer.listenerId,
      speakerId: speaker.id,
      topic: transfer.topic,
      roomId,
      turn,
    });
  }

  // ADR-320 Phase 8 (D10 — "propagation made visible"): a wrappable
  // pair's transfer becomes a scene move; its observable surface is the
  // sound path ONLY, so the legacy same-room event does not mint. Ambient
  // transfers (no runtime, unmodeled party, party seated elsewhere) keep
  // today's path byte-identically.
  if (sceneWrappable(world, speaker.id, transfer.listenerId)) {
    const visibility = getVisibilityResult(transfer, 'present');
    surface.transfers.push({
      speakerId: speaker.id,
      listenerId: transfer.listenerId,
      topic: transfer.topic,
      roomId,
      coloring: transfer.coloring,
      ...(!result.alreadyKnew && !authorNarratesArrival && visibility.messageId
        ? {
            soundMessageId: visibility.messageId,
            soundParams: {
              speakerId: speaker.id,
              listenerId: transfer.listenerId,
              topic: transfer.topic,
              speakerName: speaker.name,
              listenerName: listenerEntity.name,
            },
          }
        : {}),
    });
    return;
  }

  // ADR-328 D3: no room gate — the event fires wherever the player is,
  // carrying the room it happened in so the engine funnel tags presence
  // and the client decides what to show.
  if (!result.alreadyKnew && !authorNarratesArrival) {
    const visibility = getVisibilityResult(transfer, 'present');
    if (visibility.messageId) {
      events.push(createEvent('character.propagation.witnessed', {
        speakerId: speaker.id,
        listenerId: transfer.listenerId,
        topic: transfer.topic,
        messageId: visibility.messageId,
        speakerName: speaker.name,
        listenerName: listenerEntity.name,
      }, speaker.id, roomId));
    }
  }
}
