/**
 * The influence sub-step: influences in force are expired first, by
 * separation and by the clock, so one that recurs this turn re-transitions;
 * then every room's passive influences are evaluated and each exertion's
 * outcome is recorded on the trait that homes it, with witnessed and
 * resisted events minted on transitions only.
 *
 * Public interface: runInfluenceSubStep.
 * Owner context: @sharpee/character — influence.
 *
 * References:
 *   ADR-146 — influence and resistance.
 *   ADR-310 D8/D17 — events mark transitions, records mark levels; the home rule.
 *   ADR-339 D1 — this body moved here from tick-phases.ts unchanged.
 */

import type { ISemanticEvent, EntityId } from '@sharpee/core';
import { type IFEntity, type WorldModel, TraitType, type CharacterModelTrait } from '@sharpee/world-model';
import {
  type InfluenceRoomEntity,
  type PassiveInfluenceExertion,
  evaluatePassiveInfluences,
  trackInfluence,
  expireInfluencesForTurn,
  expireInfluencesBySeparation,
} from './index.js';
import { type TickContext, createEvent } from '../tick-support.js';
import type { CharacterPhaseRegistry } from '../tick-phases.js';

// ---------------------------------------------------------------------------
// Influence sub-step (ADR-146)
// ---------------------------------------------------------------------------

export function runInfluenceSubStep(
  npcs: IFEntity[],
  ctx: TickContext,
  registry: CharacterPhaseRegistry,
): ISemanticEvent[] {
  const events: ISemanticEvent[] = [];
  const { world, turn, playerLocation, playerId } = ctx;

  // Expire BEFORE evaluating (ADR-310 D8): separation ends 'while present'
  // records, the clock ends momentary/lingering ones — so an influence that
  // recurs this turn (re-entry, momentary re-exertion) re-transitions into
  // force below and its witnessed phrase re-fires the turn it recurs.
  for (const npc of npcs) {
    const trait = npc.get(TraitType.CHARACTER_MODEL) as CharacterModelTrait | undefined;
    if (!trait) continue;

    const separated = expireInfluencesBySeparation(trait, npc.id, id => world.getLocation(id));
    const lapsed = expireInfluencesForTurn(trait, turn, (effect, pred) => {
      // A clear condition evaluates against the effect's TARGET
      const targetId = effect.target ?? npc.id;
      const targetEntity = world.getEntity(targetId);
      const targetTrait = targetEntity?.get(TraitType.CHARACTER_MODEL) as CharacterModelTrait | undefined;
      return targetTrait ? targetTrait.evaluate(pred) : false;
    });

    for (const effect of [...separated, ...lapsed]) {
      const targetId = effect.target ?? npc.id;
      const target = world.getEntity(targetId);
      const targetLoc = target ? world.getLocation(target.id) : undefined;
      // ADR-328 D3: no room gate — the release line fires wherever the
      // player is, carrying the target's room so the engine tags presence.
      {
        // Opt-in release line (David's ruling 2026-08-16): the authored
        // `expired` phrase key rides as messageId; absent = silent, and
        // the payload stays byte-identical to the pre-ruling shape.
        const influenceDef = registry
          .getConfig(effect.influencerId)
          ?.influenceDefs?.find(d => d.name === effect.influenceName);
        const influencer = world.getEntity(effect.influencerId);
        events.push(createEvent('character.influence.expired', {
          influenceName: effect.influenceName,
          targetId,
          targetName: target?.name ?? targetId,
          ...(influenceDef?.expired !== undefined
            ? {
                messageId: influenceDef.expired,
                influencerId: effect.influencerId,
                influencerName: influencer?.name ?? effect.influencerId,
              }
            : {}),
        }, effect.influencerId, targetLoc));
      }
    }
  }

  // Group entities by room
  const roomEntities = new Map<string, InfluenceRoomEntity[]>();
  for (const npc of npcs) {
    const loc = world.getLocation(npc.id);
    if (!loc) continue;

    const config = registry.getConfig(npc.id);
    const trait = npc.get(TraitType.CHARACTER_MODEL) as CharacterModelTrait;

    roomEntities.set(loc, [
      ...(roomEntities.get(loc) ?? []),
      {
        id: npc.id,
        influences: config?.influenceDefs ?? [],
        resistances: config?.resistanceDefs ?? [],
        evaluatePredicate: (pred: string) => trait ? trait.evaluate(pred) : false,
      },
    ]);
  }

  // Add player as potential target in their room
  const playerList = roomEntities.get(playerLocation) ?? [];
  playerList.push({
    id: playerId,
    influences: [],
    resistances: [],
    evaluatePredicate: () => false,
  });
  roomEntities.set(playerLocation, playerList);

  // Evaluate passive influences per room
  for (const [roomId, entities] of roomEntities) {
    const results = evaluatePassiveInfluences(entities);
    handleInfluenceResults(results, roomId, registry, world, turn, events);
  }

  return events;
}

/**
 * Process influence exertions: record per-target outcomes on the trait
 * that homes them (target's trait; exerter's trait for the player — ADR-310
 * D17 home rule) and mint witnessed/resisted events on transitions only
 * (ADR-310 D8 — events mark transitions, records mark levels). One
 * witnessed event per exertion, however many targets it newly took hold
 * on; one resisted event per target on that target's own flip.
 *
 * @param exertions - Influence exertion results for one room
 * @param roomId - The room where influences were evaluated
 * @param registry - Character phase registry for configs
 * @param world - World model for entity lookups
 * @param turn - Current turn number
 * @param events - Accumulator for narration events (ADR-328 D3: tagged, not dropped)
 */
function handleInfluenceResults(
  exertions: PassiveInfluenceExertion[],
  roomId: string,
  registry: CharacterPhaseRegistry,
  world: WorldModel,
  turn: number,
  events: ISemanticEvent[],
): void {
  for (const exertion of exertions) {
    if (exertion.status !== 'exerted') continue;

    const influencerConfig = registry.getConfig(exertion.influencerId);
    const influenceDef = influencerConfig?.influenceDefs?.find(
      d => d.name === exertion.influenceName,
    );
    const influencerEntity = world.getEntity(exertion.influencerId);
    const influencerTrait = influencerEntity?.get(TraitType.CHARACTER_MODEL) as CharacterModelTrait | undefined;

    const newlyApplied: EntityId[] = [];

    for (const outcome of exertion.targets) {
      // Resolve the home trait per the D17 home rule
      const targetEntity = world.getEntity(outcome.targetId);
      const targetTrait = targetEntity?.get(TraitType.CHARACTER_MODEL) as CharacterModelTrait | undefined;
      const homeTrait = targetTrait ?? influencerTrait;
      if (!homeTrait) continue;

      const transitioned = trackInfluence(
        homeTrait, exertion.influenceName, exertion.influencerId, exertion.effect, {
          duration: influenceDef?.duration ?? 'while present',
          turn,
          status: outcome.status,
          lingeringTurns: influenceDef?.lingeringTurns,
          clearCondition: influenceDef?.lingeringClearCondition,
          ...(targetTrait ? {} : { target: outcome.targetId }),
        });
      if (!transitioned) continue;

      if (outcome.status === 'applied') {
        newlyApplied.push(outcome.targetId);
      } else if (exertion.resisted) {
        // ADR-328 D3: no room gate — tagged by the room, not dropped.
        events.push(createEvent('character.influence.resisted', {
          influencerId: exertion.influencerId, targetId: outcome.targetId,
          influenceName: exertion.influenceName, messageId: exertion.resisted,
          influencerName: influencerEntity?.name ?? exertion.influencerId,
          targetName: targetEntity?.name ?? outcome.targetId,
        }, exertion.influencerId, roomId));
      }
    }

    if (newlyApplied.length > 0 && exertion.witnessed) {
      // ADR-328 D3: no room gate — tagged by the room, not dropped.
      const firstTarget = world.getEntity(newlyApplied[0]);
      events.push(createEvent('character.influence.applied', {
        influencerId: exertion.influencerId,
        targetId: newlyApplied[0],
        targetIds: [...newlyApplied],
        influenceName: exertion.influenceName, messageId: exertion.witnessed,
        influencerName: influencerEntity?.name ?? exertion.influencerId,
        targetName: firstTarget?.name ?? newlyApplied[0],
      }, exertion.influencerId, roomId));
    }
  }
}
