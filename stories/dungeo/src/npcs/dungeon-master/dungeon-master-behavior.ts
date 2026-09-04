/**
 * Dungeon Master NPC Behavior (ADR-070; ADR-328 D5)
 *
 * The Dungeon Master is an ally in the endgame:
 * - Guards the door at Dungeon Entrance, asks trivia questions (via KNOCK/ANSWER)
 * - Follows player after trivia is passed
 * - Can be told to "stay" at Parapet for remote dial operation
 *
 * The commands ("follow", "stay", "set dial to N", "push button") are
 * Dungeo actions (`answer`, `set-dial`, `push-dial-button`); the behavior
 * only carries out the following, as a real `going` action run as the DM.
 */

import { type NpcBehavior, type NpcContext, IFActions } from '@sharpee/stdlib';
import { IFEntity, RoomTrait, NpcTrait, type DirectionType } from '@sharpee/world-model';

import { DungeonMasterMessages } from './dungeon-master-messages';
import {
  DungeonMasterCustomProperties,
  getDungeonMasterState,
} from './dungeon-master-entity';

/**
 * Get Dungeon Master custom properties from NPC
 */
function getDMProps(npc: IFEntity): DungeonMasterCustomProperties | null {
  const npcTrait = npc.get(NpcTrait);
  if (!npcTrait?.customProperties) return null;
  return npcTrait.customProperties as unknown as DungeonMasterCustomProperties;
}

/**
 * The Dungeon Master NPC behavior implementation
 */
export const dungeonMasterBehavior: NpcBehavior = {
  id: 'dungeon-master',
  name: 'Dungeon Master Behavior',

  /**
   * Main turn logic - DM follows player when in FOLLOWING state
   */
  onTurn(context: NpcContext): void {
    const state = getDungeonMasterState(context.world);

    // Only follow when in FOLLOWING state and player is elsewhere
    if (state !== 'FOLLOWING') {
      return;
    }

    // If player is in a different room, follow them
    if (context.playerLocation !== context.npcLocation) {
      // Check if there's a path to the player
      const currentRoom = context.world.getEntity(context.npcLocation);
      const roomTrait = currentRoom?.get(RoomTrait);

      if (roomTrait?.exits) {
        // Find an exit that leads toward the player
        for (const [direction, exit] of Object.entries(roomTrait.exits)) {
          if (exit && 'destination' in exit && exit.destination === context.playerLocation) {
            // Walk to the player's location — the real going action
            const went = context.act(IFActions.GOING, { direction: direction as DirectionType });
            if (went.success) {
              context.narrate(DungeonMasterMessages.FOLLOWING, { npcName: 'Dungeon Master' });
            }
            return;
          }
        }
      }
    }
  },

  /**
   * Get serializable state for save/load
   */
  getState(npc: IFEntity): Record<string, unknown> {
    const props = getDMProps(npc);
    return props ? { ...props } : {};
  },

  /**
   * Restore state after load
   */
  setState(npc: IFEntity, state: Record<string, unknown>): void {
    const npcTrait = npc.get(NpcTrait);
    if (npcTrait) {
      npcTrait.customProperties = state;
    }
  }
};
