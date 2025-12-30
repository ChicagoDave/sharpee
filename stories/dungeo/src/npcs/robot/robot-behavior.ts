/**
 * Robot NPC Behavior (ADR-070)
 *
 * A commandable robot that can:
 * - Follow the player when told "follow me" or "come"
 * - Push buttons when told "push button"
 * - Stay when told "stay" or "wait"
 *
 * The robot is essential for the Round Room puzzle - it must push
 * the triangular button to stop the carousel.
 */

import { NpcBehavior, NpcContext, NpcAction } from '@sharpee/stdlib';
import { IFEntity, IdentityTrait, RoomTrait, Direction } from '@sharpee/world-model';
import { ISemanticEvent } from '@sharpee/core';

import { RobotMessages } from './robot-messages';
import { getRobotProps, makeRobotPushButton, RobotCustomProperties } from './robot-entity';

/**
 * Check if a room is the Machine Room (well area)
 */
function isMachineRoomWell(room: IFEntity | undefined): boolean {
  if (!room) return false;
  const identity = room.get(IdentityTrait);
  if (!identity) return false;
  // Check for the well area machine room (not coal mine one)
  return identity.name === 'Machine Room' &&
         identity.description?.includes('triangular button');
}

/**
 * Find the Round Room entity
 */
function findRoundRoom(context: NpcContext): IFEntity | null {
  const entities = context.world.getAllEntities();
  for (const entity of entities) {
    const identity = entity.get(IdentityTrait);
    if (identity?.name === 'Round Room') {
      return entity;
    }
  }
  return null;
}

/**
 * The Robot NPC behavior implementation
 */
export const robotBehavior: NpcBehavior = {
  id: 'robot',
  name: 'Robot Behavior',

  /**
   * Main turn logic - robot follows player if in following mode
   */
  onTurn(context: NpcContext): NpcAction[] {
    const props = getRobotProps(context.npc);
    if (!props) return [];

    // If following and player is in a different room, try to follow
    if (props.following && context.playerLocation !== context.npcLocation) {
      // Check if there's a path to the player
      const currentRoom = context.world.getEntity(context.npcLocation);
      const roomTrait = currentRoom?.get(RoomTrait);

      if (roomTrait?.exits) {
        // Find an exit that leads toward the player
        for (const [_dir, exit] of Object.entries(roomTrait.exits)) {
          if (exit && 'destination' in exit && exit.destination === context.playerLocation) {
            // Move to the player's location
            context.world.moveEntity(context.npc.id, context.playerLocation);
            return [{
              type: 'emote',
              messageId: RobotMessages.FOLLOWS,
              data: { npcName: 'robot' }
            }];
          }
        }
      }
    }

    return [];
  },

  /**
   * When player speaks to the robot - primary interaction method
   */
  onSpokenTo(context: NpcContext, words: string): NpcAction[] {
    const props = getRobotProps(context.npc);
    if (!props) return [];

    const lowerWords = words.toLowerCase();

    // "push button" / "press button"
    if (lowerWords.includes('push button') ||
        lowerWords.includes('press button') ||
        lowerWords.includes('push the button') ||
        lowerWords.includes('press the button')) {
      return handlePushButton(context, props);
    }

    // "follow" / "follow me" / "come"
    if (lowerWords.includes('follow') ||
        lowerWords === 'come' ||
        lowerWords === 'come with me') {
      props.following = true;
      return [{
        type: 'emote',
        messageId: RobotMessages.COMMAND_UNDERSTOOD,
        data: { npcName: 'robot', command: 'follow' }
      }];
    }

    // "stay" / "wait"
    if (lowerWords === 'stay' ||
        lowerWords === 'wait' ||
        lowerWords.includes('stay here') ||
        lowerWords.includes('wait here')) {
      props.following = false;
      return [{
        type: 'emote',
        messageId: RobotMessages.WAITS,
        data: { npcName: 'robot' }
      }];
    }

    // Unknown command
    return [{
      type: 'emote',
      messageId: RobotMessages.COMMAND_UNKNOWN,
      data: { npcName: 'robot' }
    }];
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
    const npcTrait = npc.get('npc');
    if (npcTrait) {
      (npcTrait as any).customProperties = state;
    }
  }
};

/**
 * Handle the "push button" command
 */
function handlePushButton(context: NpcContext, props: RobotCustomProperties): NpcAction[] {
  // Check if already pushed
  if (props.buttonPushed) {
    return [{
      type: 'emote',
      messageId: RobotMessages.ALREADY_PUSHED,
      data: { npcName: 'robot' }
    }];
  }

  // Check if robot is in the Machine Room (well area)
  const currentRoom = context.world.getEntity(context.npcLocation);
  if (!isMachineRoomWell(currentRoom)) {
    return [{
      type: 'emote',
      messageId: RobotMessages.NO_BUTTON,
      data: { npcName: 'robot' }
    }];
  }

  // Push the button!
  const roundRoom = findRoundRoom(context);
  if (roundRoom) {
    return [{
      type: 'custom',
      handler: (): ISemanticEvent[] => {
        return makeRobotPushButton(context.world, context.npc, roundRoom.id);
      }
    }];
  }

  // Fallback - no round room found
  return [{
    type: 'emote',
    messageId: RobotMessages.PUSHES_BUTTON,
    data: { npcName: 'robot' }
  }];
}
