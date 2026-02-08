/**
 * Combat Disengagement Handler (Phase 4a)
 *
 * When the player leaves a room containing a villain they were fighting,
 * combat disengages per canonical MDL behavior (melee.137:84-96):
 *
 * - Villain fully heals (OSTRENGTH restored to base)
 * - Both stagger flags cleared (hero and villain)
 * - Villain unconscious flag cleared
 * - Thief engrossed flag cleared
 * - Player wounds are NOT healed (ASTRENGTH persists)
 *
 * This creates asymmetric pressure: the villain recovers instantly,
 * but the player must wait for the cure daemon to heal.
 */

import { ISemanticEvent } from '@sharpee/core';
import { EventProcessor } from '@sharpee/event-processor';
import { WorldModel, CombatantTrait } from '@sharpee/world-model';
import { MELEE_STATE, getBaseOstrength } from '../combat/melee-state';

/**
 * Register the combat disengagement event handler.
 *
 * Listens for if.event.actor_moved and resets combat state
 * for any villains in the room the player just left.
 */
export function registerCombatDisengagementHandler(
  eventProcessor: EventProcessor,
  world: WorldModel
): void {
  eventProcessor.registerHandler('if.event.actor_moved', (event: ISemanticEvent) => {
    const data = event.data as { fromRoom?: string; toRoom?: string } | undefined;
    if (!data?.fromRoom) return [];

    // Only handle player movement, not NPC movement
    const player = world.getPlayer();
    if (!player) return [];

    // Check the player actually moved (they should be in toRoom now)
    const playerLocation = world.getLocation(player.id);
    if (playerLocation !== data.toRoom) return [];

    // Scan the departure room for alive combatants that were in combat
    const roomContents = world.getContents(data.fromRoom);
    for (const entity of roomContents) {
      const combatant = entity.get(CombatantTrait);
      if (!combatant || !combatant.isAlive) continue;

      // Check if this villain was engaged in melee combat
      // (meleeOstrength is set by the interceptor on first combat)
      const currentOstrength = entity.attributes[MELEE_STATE.VILLAIN_OSTRENGTH];
      if (typeof currentOstrength !== 'number') continue;

      // Restore villain to full health
      const baseOstrength = getBaseOstrength(entity);
      entity.attributes[MELEE_STATE.VILLAIN_OSTRENGTH] = baseOstrength;

      // Clear villain combat flags
      entity.attributes[MELEE_STATE.VILLAIN_STAGGERED] = false;
      entity.attributes[MELEE_STATE.VILLAIN_UNCONSCIOUS] = false;

      // Clear thief engrossed flag if applicable
      if (entity.attributes.thiefEngrossed) {
        entity.attributes.thiefEngrossed = false;
      }
    }

    // Clear player's stagger flag (but NOT wound adjust — wounds persist)
    player.attributes[MELEE_STATE.STAGGERED] = false;

    // Silent — canonical MDL has no disengagement message
    return [];
  });
}
