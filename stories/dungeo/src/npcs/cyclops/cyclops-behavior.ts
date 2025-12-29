/**
 * Cyclops NPC Behavior (ADR-070)
 *
 * Simple guard behavior with speech response:
 * - Blocks northern passage in Cyclops Room
 * - Responds to "Odysseus" or "Ulysses" by fleeing in terror
 * - Combat-enabled but very difficult to kill
 *
 * The Cyclops is a reference to Greek mythology where Odysseus
 * blinded the cyclops Polyphemus and escaped by clinging to sheep.
 */

import { NpcBehavior, NpcContext, NpcAction } from '@sharpee/stdlib';
import { IFEntity, NpcTrait, CombatantTrait } from '@sharpee/world-model';
import { ISemanticEvent } from '@sharpee/core';

import { CyclopsMessages } from './cyclops-messages';
import { CyclopsCustomProperties, makeCyclopsFlee } from './cyclops-entity';

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
  onTurn(context: NpcContext): NpcAction[] {
    // Cyclops doesn't move or act on its own
    // It just guards the passage
    if (hasFled(context.npc)) {
      return [];
    }

    // Occasionally growl if player is visible
    if (context.playerVisible && context.random.chance(0.15)) {
      return [{
        type: 'emote',
        messageId: CyclopsMessages.GROWLS,
        data: { npcName: context.npc.name }
      }];
    }

    return [];
  },

  /**
   * When player enters the cyclops's room
   */
  onPlayerEnters(context: NpcContext): NpcAction[] {
    if (hasFled(context.npc)) {
      return [];
    }

    return [{
      type: 'emote',
      messageId: CyclopsMessages.BLOCKS,
      data: { npcName: context.npc.name }
    }];
  },

  /**
   * When player speaks to the cyclops
   * This is the key mechanic - saying "Odysseus" or "Ulysses" makes it flee
   */
  onSpokenTo(context: NpcContext, words: string): NpcAction[] {
    if (hasFled(context.npc)) {
      return [];
    }

    const lowerWords = words.toLowerCase();

    // Check for the magic words (Greek or Latin name of Odysseus)
    if (lowerWords.includes('odysseus') || lowerWords.includes('ulysses')) {
      const props = getCyclopsProps(context.npc);
      const roomId = props?.roomId ?? context.npcLocation;

      // Cyclops panics and flees!
      return [
        {
          type: 'emote',
          messageId: CyclopsMessages.PANICS,
          data: { npcName: context.npc.name }
        },
        {
          type: 'emote',
          messageId: CyclopsMessages.FLEES,
          data: { npcName: context.npc.name }
        },
        {
          type: 'custom',
          handler: (): ISemanticEvent[] => {
            // Make the cyclops flee and open the passage
            const events = makeCyclopsFlee(context.world, context.npc, roomId);

            // Add passage opens message
            events.push({
              id: `cyclops-flee-${Date.now()}`,
              type: 'game.message',
              entities: {},
              data: {
                messageId: CyclopsMessages.PASSAGE_OPENS
              },
              timestamp: Date.now(),
              narrate: true
            });

            return events;
          }
        }
      ];
    }

    // No response to other words
    return [{
      type: 'emote',
      messageId: CyclopsMessages.IGNORES,
      data: { npcName: context.npc.name }
    }];
  },

  /**
   * When cyclops is attacked
   */
  onAttacked(context: NpcContext, attacker: IFEntity): NpcAction[] {
    if (hasFled(context.npc)) {
      return [];
    }

    // Make combatant hostile (if not already)
    const combatant = context.npc.get(CombatantTrait);
    if (combatant) {
      combatant.hostile = true;
    }

    // Counter-attack
    return [
      {
        type: 'emote',
        messageId: CyclopsMessages.COUNTERATTACKS,
        data: { npcName: context.npc.name }
      },
      { type: 'attack', target: attacker.id }
    ];
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
