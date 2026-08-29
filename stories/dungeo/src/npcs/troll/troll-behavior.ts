/**
 * Troll NPC Behavior (ADR-070; ADR-328 D5)
 *
 * Custom behavior that extends the guard pattern with:
 * - Weapon recovery: 75% chance to pick up axe from room when disarmed
 * - Disarmed cowering: When weaponless, cower instead of attacking
 *
 * From MDL source (act1.254:182-195):
 * - If troll has axe: continue fighting (guard behavior)
 * - If axe in room and 75% chance: "recovers his bloody axe"
 * - If disarmed: "cowers in terror, pleading for his life"
 *
 * Every act is the real standard action run as the troll: recovering the
 * axe is `taking`, the guard's blow is `attacking` through the melee
 * interceptor on the hero.
 */

import { type NpcBehavior, type NpcContext, guardBehavior, IFActions } from '@sharpee/stdlib';
import { HealthTrait, HealthBehavior, IdentityTrait, TraitType } from '@sharpee/world-model';
import { TrollMessages } from './troll-messages';
import { definePoint } from '@sharpee/core';

// ADR-293 D2: the troll's axe-recovery roll draws on its own declared point.
const TROLL_AXE_RECOVERY_POINT = definePoint('dungeo.troll.axe-recovery', { classes: ['yes', 'no'] });

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

  onTurn(context: NpcContext): void {
    // Check if NPC is alive and conscious (life-state on HealthTrait — ADR-226)
    const health = context.npc.get(TraitType.HEALTH) as HealthTrait | undefined;
    if (health && !HealthBehavior.canAct(health)) {
      return;
    }

    // Check if we have a weapon
    const armed = hasWeapon(context);

    if (!armed) {
      // Try to recover axe from room (75% chance)
      const axeId = findAxeInRoom(context);
      const axe = axeId ? context.world.getEntity(axeId) : undefined;

      if (axe && context.random.chance(TROLL_AXE_RECOVERY_POINT, 0.75)) {
        // Troll recovers the axe — a real take, refusable like any other
        const took = context.act(IFActions.TAKING, { directObject: axe });
        if (took.success) {
          context.narrate(TrollMessages.RECOVERS_AXE, { npcName: context.npc.name });
          return;
        }
      }

      // No weapon and couldn't recover - cower instead of attacking
      context.narrate(TrollMessages.COWERS, { npcName: context.npc.name });
      return;
    }

    // Has weapon - delegate to guard behavior (attack if hostile and player visible)
    guardBehavior.onTurn(context);
  },

  onPlayerEnters(context: NpcContext): void {
    // Delegate to guard behavior
    guardBehavior.onPlayerEnters?.(context);
  },

  // State management for save/load
  getState(_npc) {
    return {};
  },

  setState(_npc, _state) {
    // No additional state needed beyond standard NPC state
  }
};
