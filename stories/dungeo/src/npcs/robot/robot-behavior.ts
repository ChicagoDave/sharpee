/**
 * Robot NPC Behavior (ADR-070; ADR-328 D5)
 *
 * A commandable robot that follows the player when told to. The commands
 * themselves ("follow me", "push button", "stay") are Dungeo actions —
 * the behavior only carries out the following, as a real `going` action
 * run as the robot.
 *
 * The robot is essential for the Round Room puzzle - it must push
 * the triangular button to stop the carousel.
 */

import { type NpcBehavior, type NpcContext, IFActions } from '@sharpee/stdlib';
import { IFEntity, NpcTrait, RoomTrait, type DirectionType } from '@sharpee/world-model';

import { RobotMessages } from './robot-messages';
import { getRobotProps } from './robot-entity';

/**
 * The Robot NPC behavior implementation
 */
export const robotBehavior: NpcBehavior = {
  id: 'robot',
  name: 'Robot Behavior',

  /**
   * Main turn logic - robot follows player if in following mode
   */
  onTurn(context: NpcContext): void {
    const props = getRobotProps(context.npc);
    if (!props) return;

    // If following and player is in a different room, try to follow
    if (props.following && context.playerLocation !== context.npcLocation) {
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
              context.narrate(RobotMessages.FOLLOWS, { npcName: 'robot' });
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
    const props = getRobotProps(npc);
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
