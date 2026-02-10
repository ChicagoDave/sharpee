/**
 * Treasure Room Handler
 *
 * Canonical MDL behavior (act1.mud:1387-1420): When the player enters the
 * Treasure Room (thief's lair), the thief is summoned there if not already
 * present. The thief becomes hostile and guards the room.
 *
 * MDL message: "You hear a scream of anguish as you violate the robber's
 * hideaway. Using passages unknown to you, he rushes to its defense."
 */

import { ISemanticEvent } from '@sharpee/core';
import { EventProcessor } from '@sharpee/event-processor';
import { WorldModel, CombatantTrait, IdentityTrait } from '@sharpee/world-model';

/**
 * Register the Treasure Room entry handler.
 *
 * When the player enters the Treasure Room and the thief is alive but
 * elsewhere, the thief is teleported to the room and made hostile.
 */
export function registerTreasureRoomHandler(
  eventProcessor: EventProcessor,
  world: WorldModel,
  treasureRoomId: string
): void {
  eventProcessor.registerHandler('if.event.actor_moved', (event: ISemanticEvent) => {
    const data = event.data as { actor?: { id: string }; toRoom?: string } | undefined;
    if (!data?.toRoom || data.toRoom !== treasureRoomId) return [];

    // Only handle player movement (actor_moved uses actor.id, not actorId)
    const player = world.getPlayer();
    if (!player || data.actor?.id !== player.id) return [];

    // Find the thief entity (name is 'seedy-looking thief', alias 'thief')
    const thief = world.getAllEntities().find(e => {
      const identity = e.get(IdentityTrait);
      if (!identity) return false;
      return identity.name === 'seedy-looking thief' ||
        identity.aliases?.includes('thief');
    });
    if (!thief) return [];

    // Check if thief is alive
    const combatant = thief.get(CombatantTrait);
    if (!combatant || !combatant.isAlive) return [];

    // If thief is already in the Treasure Room, nothing to do
    const thiefLocation = world.getLocation(thief.id);
    if (thiefLocation === treasureRoomId) return [];

    // Summon thief to Treasure Room (canonical MDL: rushes to defense)
    world.moveEntity(thief.id, treasureRoomId);

    // Make thief hostile
    combatant.hostile = true;

    // Emit summoning message
    return [{
      type: 'message' as const,
      id: 'dungeo.treasure_room.thief_summoned'
    }];
  });
}
