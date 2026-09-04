/**
 * Cyclops NPC Behavior (ADR-070; ADR-328 D5)
 *
 * Simple guard behavior:
 * - Blocks northern passage in Cyclops Room
 * - Growls at the player now and then; blocks the way when they enter
 * - Combat-enabled but very difficult to kill
 *
 * Saying "Odysseus" or "Ulysses" makes it flee — that is the `say`
 * action's mechanic (`actions/say`), not the behavior's.
 *
 * The Cyclops is a reference to Greek mythology where Odysseus
 * blinded the cyclops Polyphemus and escaped by clinging to sheep.
 */

import { type NpcBehavior, type NpcContext } from '@sharpee/stdlib';
import { IFEntity, NpcTrait } from '@sharpee/world-model';

import { CyclopsMessages } from './cyclops-messages';
import { CyclopsCustomProperties } from './cyclops-entity';
import { definePoint } from '@sharpee/core';

// ADR-293 D2: the cyclops's ambient growl roll.
const CYCLOPS_GROWL_POINT = definePoint('dungeo.cyclops.growl', { classes: ['yes', 'no'] });

/**
 * Get cyclops custom properties from NpcTrait
 */
function getCyclopsProps(npc: IFEntity): CyclopsCustomProperties | null {
  const trait = npc.get(NpcTrait);
  if (!trait?.customProperties) return null;
  return trait.customProperties as unknown as CyclopsCustomProperties;
}

/**
 * Check if the cyclops has already fled
 */
function hasFled(npc: IFEntity): boolean {
  const props = getCyclopsProps(npc);
  return props?.state === 'FLED';
}

/**
 * The Cyclops NPC behavior implementation
 */
export const cyclopsBehavior: NpcBehavior = {
  id: 'cyclops',
  name: 'Cyclops Behavior',

  /**
   * Main turn logic - cyclops is a stationary guard
   */
  onTurn(context: NpcContext): void {
    // Cyclops doesn't move or act on its own
    // It just guards the passage
    if (hasFled(context.npc)) {
      return;
    }

    // Occasionally growl if player is visible
    if (context.playerVisible && context.random.chance(CYCLOPS_GROWL_POINT, 0.15)) {
      context.narrate(CyclopsMessages.GROWLS, { npcName: context.npc.name });
    }
  },

  /**
   * When player enters the cyclops's room
   */
  onPlayerEnters(context: NpcContext): void {
    if (hasFled(context.npc)) {
      return;
    }

    context.narrate(CyclopsMessages.BLOCKS, { npcName: context.npc.name });
  },

  /**
   * Get serializable state for save/load
   */
  getState(npc: IFEntity): Record<string, unknown> {
    const trait = npc.get(NpcTrait);
    return trait?.customProperties ?? {};
  },

  /**
   * Restore state after load
   */
  setState(npc: IFEntity, state: Record<string, unknown>): void {
    const trait = npc.get(NpcTrait);
    if (trait) {
      trait.customProperties = state;
    }
  }
};
