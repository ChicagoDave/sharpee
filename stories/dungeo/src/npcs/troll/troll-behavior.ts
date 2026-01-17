/**
 * Troll NPC Behavior (ADR-070)
 *
 * Custom behavior that extends the guard pattern with:
 * - Weapon recovery: 75% chance to pick up axe from room when disarmed
 * - Disarmed cowering: When weaponless, cower instead of attacking
 *
 * From MDL source (act1.254:182-195):
 * - If troll has axe: continue fighting (guard behavior)
 * - If axe in room and 75% chance: "recovers his bloody axe"
 * - If disarmed: "cowers in terror, pleading for his life"
 */

import { NpcBehavior, NpcContext, NpcAction, guardBehavior } from '@sharpee/stdlib';
import { CombatantTrait, IdentityTrait, TraitType } from '@sharpee/world-model';
import { TrollMessages } from './troll-messages';

/**
 * Check if the NPC has any weapon in inventory
 */
function hasWeapon(context: NpcContext): boolean {
  const inventory = context.npcInventory;
  return inventory.some(item => item.has && item.has(TraitType.WEAPON));
}

/**
 * Find the troll's axe in the current room (not in troll's inventory)
 */
function findAxeInRoom(context: NpcContext): string | null {
  const roomEntities = context.getEntitiesInRoom();

  for (const entity of roomEntities) {
    if (!entity.get) continue;

    const identity = entity.get(IdentityTrait);
    if (!identity) continue;

    // Check if it's an axe (by name or alias)
    const name = identity.name?.toLowerCase() || '';
    const aliases = identity.aliases || [];
    const allNames = [name, ...aliases.map(a => a.toLowerCase())];

    if (allNames.some(n => n.includes('axe'))) {
      // Make sure it's not in the troll's inventory
      if (context.world.getLocation(entity.id) === context.npcLocation) {
        return entity.id;
      }
    }
  }

  return null;
}

/**
 * Troll NPC behavior - extends guard behavior with weapon recovery
 */
export const trollBehavior: NpcBehavior = {
  id: 'troll',
  name: 'Troll Behavior',

  onTurn(context: NpcContext): NpcAction[] {
    // Check if NPC is alive and conscious (same as guard)
    const combatant = context.npc.get(TraitType.COMBATANT) as CombatantTrait | undefined;
    if (combatant && (!combatant.isAlive || !combatant.isConscious)) {
      return [];
    }

    // Check if we have a weapon
    const armed = hasWeapon(context);

    if (!armed) {
      // Try to recover axe from room (75% chance)
      const axeId = findAxeInRoom(context);

      if (axeId && context.random.chance(0.75)) {
        // Troll recovers the axe
        return [
          { type: 'take', target: axeId },
          {
            type: 'emote',
            messageId: TrollMessages.RECOVERS_AXE,
            data: { npcName: context.npc.name }
          }
        ];
      }

      // No weapon and couldn't recover - cower instead of attacking
      return [
        {
          type: 'emote',
          messageId: TrollMessages.COWERS,
          data: { npcName: context.npc.name }
        }
      ];
    }

    // Has weapon - delegate to guard behavior (attack if hostile and player visible)
    return guardBehavior.onTurn(context);
  },

  onPlayerEnters(context: NpcContext): NpcAction[] {
    // Delegate to guard behavior
    return guardBehavior.onPlayerEnters?.(context) || [];
  },

  onAttacked(context: NpcContext, attacker): NpcAction[] {
    // Delegate to guard behavior
    return guardBehavior.onAttacked?.(context, attacker) || [];
  },

  // State management for save/load
  getState(npc) {
    return {};
  },

  setState(_npc, _state) {
    // No additional state needed beyond standard NPC state
  }
};
