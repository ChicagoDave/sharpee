/**
 * Basic NPC Combat Resolver
 *
 * Wraps CombatService as an NpcCombatResolver for NPC→PC (and NPC→NPC) attacks.
 * Used by npc-service.ts executeAttack() when registered.
 */

import { ISemanticEvent, SeededRandom, createSeededRandom } from '@sharpee/core';
import {
  IFEntity,
  WorldModel,
  TraitType,
} from '@sharpee/world-model';
import { findWieldedWeapon, nounPhraseFor, killPlayer } from '@sharpee/stdlib';
import type { NpcCombatResolver } from '@sharpee/stdlib';
import { CombatService, applyCombatResult } from './combat-service.js';
import { CombatMessages } from './combat-messages.js';

/**
 * Module-level random instance for NPC combat rolls.
 */
const npcCombatRandom: SeededRandom = createSeededRandom();

let eventCounter = 0;

/**
 * Create a semantic event (mirrors npc-service's createEvent pattern).
 */
function createEvent(
  type: string,
  data: Record<string, unknown>,
  sourceId?: string
): ISemanticEvent {
  return {
    id: `npc-combat-${Date.now()}-${++eventCounter}`,
    type,
    data,
    entities: {
      actor: sourceId,
    },
    timestamp: Date.now(),
  };
}

/**
 * Basic NPC combat resolver using CombatService.
 *
 * Resolves NPC attacks using the skill-based probability system.
 * Returns semantic events for the attack result and optional death.
 */
export const basicNpcResolver: NpcCombatResolver = (
  npc: IFEntity,
  target: IFEntity,
  world: WorldModel,
  random: SeededRandom
): ISemanticEvent[] => {
  const events: ISemanticEvent[] = [];

  // Only resolve for combatant targets
  if (!target.has(TraitType.COMBATANT)) {
    events.push(createEvent(
      'npc.attacked',
      {
        npc: npc.id,
        target: target.id,
      },
      npc.id
    ));
    return events;
  }

  const combatService = new CombatService();

  // Find NPC's weapon
  const npcInventory = world.getContents(npc.id);
  const weapon = findWieldedWeapon(npc, world) ||
    npcInventory.find(item => item.has(TraitType.WEAPON));

  const combatResult = combatService.resolveAttack({
    attacker: npc,
    target,
    weapon: weapon || undefined,
    world,
    random,
  });

  // ADR-227 Decision 5 / AC-5: a player killed by an NPC routes through the
  // canonical sink (killPlayer → if.event.player.died → engine game-over), not
  // the legacy unrouted if.event.death. killPlayer must run BEFORE
  // applyCombatResult: that call also flips HealthTrait.dead for a killed
  // target, which would trip killPlayer's already-dead idempotence guard and
  // swallow the canonical event.
  const isPlayerKill = combatResult.targetKilled && target.id === world.getPlayer()?.id;
  let playerDeathEvent: ISemanticEvent | null = null;
  if (isPlayerKill) {
    playerDeathEvent = killPlayer(world, target, {
      cause: 'combat',
      messageId: CombatMessages.PLAYER_DIED,
      terminal: true,
    });
  }

  // Apply combat result to target
  applyCombatResult(target, combatResult, world);

  // Emit attack event with combat result
  const npcMessageId = combatResult.messageId.replace('combat.attack.', 'npc.combat.attack.');
  events.push(createEvent(
    'npc.attacked',
    {
      npc: npc.id,
      speaker: nounPhraseFor(npc),
      target: target.id,
      targetName: target.name,
      hit: combatResult.hit,
      damage: combatResult.damage,
      messageId: npcMessageId,
      targetKilled: combatResult.targetKilled,
      targetKnockedOut: combatResult.targetKnockedOut,
    },
    npc.id
  ));

  // If target was killed, emit death event
  if (combatResult.targetKilled) {
    if (isPlayerKill) {
      if (playerDeathEvent) events.push(playerDeathEvent);
    } else {
      // NPC-target kills keep the generic death event (unchanged).
      events.push(createEvent(
        'if.event.death',
        {
          target: target.id,
          targetName: target.name,
          killedBy: npc.id,
        },
        npc.id
      ));
    }
  }

  return events;
};
