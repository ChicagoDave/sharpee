/**
 * Dungeon Master NPC Behavior (ADR-070)
 *
 * The Dungeon Master is an ally in the endgame:
 * - Guards the door at Dungeon Entrance, asks trivia questions (via KNOCK/ANSWER)
 * - Follows player after trivia is passed
 * - Can be told to "stay" at Parapet for remote dial operation
 * - Responds to "tell master set dial to N" and "tell master push button"
 */

import { NpcBehavior, NpcContext, NpcAction } from '@sharpee/stdlib';
import { IFEntity, IdentityTrait, RoomTrait, NpcTrait } from '@sharpee/world-model';
import { ISemanticEvent } from '@sharpee/core';

import { DungeonMasterMessages } from './dungeon-master-messages';
import {
  DungeonMasterState,
  DungeonMasterCustomProperties,
  getDungeonMasterState,
  setDungeonMasterState
} from './dungeon-master-entity';

// Event ID counter
let eventCounter = 0;
function generateEventId(): string {
  return `dm-evt-${Date.now()}-${++eventCounter}`;
}

/**
 * Get Dungeon Master custom properties from NPC
 */
function getDMProps(npc: IFEntity): DungeonMasterCustomProperties | null {
  const npcTrait = npc.get(NpcTrait);
  if (!npcTrait?.customProperties) return null;
  return npcTrait.customProperties as unknown as DungeonMasterCustomProperties;
}

/**
 * Check if a room is the Parapet
 */
function isParapet(room: IFEntity | undefined): boolean {
  if (!room) return false;
  const identity = room.get(IdentityTrait);
  return identity?.name === 'Parapet';
}

/**
 * Check if a room is in the endgame corridor area
 */
function isEndgameCorridor(room: IFEntity | undefined): boolean {
  if (!room) return false;
  const identity = room.get(IdentityTrait);
  if (!identity) return false;

  const corridorNames = [
    'Narrow Corridor',
    'East-West Corridor',
    'Parapet',
    'Prison Cell',
    'Treasury of Zork'
  ];
  return corridorNames.includes(identity.name);
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
  onTurn(context: NpcContext): NpcAction[] {
    const state = getDungeonMasterState(context.world);

    // Only follow when in FOLLOWING state and player is elsewhere
    if (state !== 'FOLLOWING') {
      return [];
    }

    // If player is in a different room, follow them
    if (context.playerLocation !== context.npcLocation) {
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
              messageId: DungeonMasterMessages.FOLLOWING,
              data: { npcName: 'Dungeon Master' }
            }];
          }
        }
      }
    }

    return [];
  },

  /**
   * When player speaks to the Dungeon Master
   */
  onSpokenTo(context: NpcContext, words: string): NpcAction[] {
    const props = getDMProps(context.npc);
    if (!props) return [];

    const lowerWords = words.toLowerCase().trim();
    const state = getDungeonMasterState(context.world);

    // "follow" / "follow me" / "come"
    if (lowerWords.includes('follow') ||
        lowerWords === 'come' ||
        lowerWords === 'come with me') {
      // Only follow if trivia is passed
      if (!props.triviaPassed) {
        return [{
          type: 'emote',
          messageId: DungeonMasterMessages.NO_ANSWER_YET,
          data: { npcName: 'Dungeon Master' }
        }];
      }

      setDungeonMasterState(context.world, 'FOLLOWING');
      return [{
        type: 'emote',
        messageId: DungeonMasterMessages.FOLLOWING,
        data: { npcName: 'Dungeon Master' }
      }];
    }

    // "stay" / "wait"
    if (lowerWords === 'stay' ||
        lowerWords === 'wait' ||
        lowerWords.includes('stay here') ||
        lowerWords.includes('wait here')) {
      setDungeonMasterState(context.world, 'WAITING');
      return [{
        type: 'emote',
        messageId: DungeonMasterMessages.STAYING,
        data: { npcName: 'Dungeon Master' }
      }];
    }

    // "set dial to N" or "turn dial to N"
    const dialMatch = lowerWords.match(/(?:set|turn)\s+dial\s+to\s+(\d)/);
    if (dialMatch) {
      return handleSetDial(context, parseInt(dialMatch[1], 10));
    }

    // "push button" / "press button"
    if (lowerWords.includes('push button') ||
        lowerWords.includes('press button') ||
        lowerWords.includes('push the button') ||
        lowerWords.includes('press the button')) {
      return handlePushButton(context);
    }

    // Unknown command - DM is silent but acknowledging
    return [{
      type: 'emote',
      messageId: DungeonMasterMessages.CANNOT_DO_THAT,
      data: { npcName: 'Dungeon Master' }
    }];
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
      (npcTrait as any).customProperties = state;
    }
  }
};

/**
 * Handle "set dial to N" command
 */
function handleSetDial(context: NpcContext, dialValue: number): NpcAction[] {
  // Must be valid dial value (1-8)
  if (dialValue < 1 || dialValue > 8) {
    return [{
      type: 'emote',
      messageId: DungeonMasterMessages.CANNOT_DO_THAT,
      data: { npcName: 'Dungeon Master' }
    }];
  }

  // DM must be at Parapet to set dial
  const currentRoom = context.world.getEntity(context.npcLocation);
  if (!isParapet(currentRoom)) {
    return [{
      type: 'emote',
      messageId: DungeonMasterMessages.CANNOT_DO_THAT,
      data: { npcName: 'Dungeon Master' }
    }];
  }

  // Set the dial
  context.world.setStateValue('parapet.dialSetting', dialValue);

  return [{
    type: 'custom',
    handler: (): ISemanticEvent[] => [{
      id: generateEventId(),
      type: 'game.message',
      entities: { actor: context.npc.id },
      data: {
        messageId: DungeonMasterMessages.SETS_DIAL,
        params: { dialValue }
      },
      timestamp: Date.now(),
      narrate: true
    }]
  }];
}

/**
 * Handle "push button" command at Parapet
 */
function handlePushButton(context: NpcContext): NpcAction[] {
  // DM must be at Parapet to push button
  const currentRoom = context.world.getEntity(context.npcLocation);
  if (!isParapet(currentRoom)) {
    return [{
      type: 'emote',
      messageId: DungeonMasterMessages.CANNOT_DO_THAT,
      data: { npcName: 'Dungeon Master' }
    }];
  }

  // Get current dial setting and activate cell rotation
  const dialSetting = (context.world.getStateValue('parapet.dialSetting') as number) ?? 1;
  const previousCell = (context.world.getStateValue('parapet.activatedCell') as number) ?? 0;

  // Update the activated cell
  context.world.setStateValue('parapet.activatedCell', dialSetting);

  return [{
    type: 'custom',
    handler: (): ISemanticEvent[] => {
      const events: ISemanticEvent[] = [];

      // Emit button push message
      events.push({
        id: generateEventId(),
        type: 'game.message',
        entities: { actor: context.npc.id },
        data: {
          messageId: DungeonMasterMessages.PUSHES_BUTTON,
          params: { dialValue: dialSetting }
        },
        timestamp: Date.now(),
        narrate: true
      });

      // If cell 4 is now activated, the bronze door becomes visible
      if (dialSetting === 4) {
        context.world.setStateValue('prisonCell.bronzeDoorVisible', true);
      } else if (previousCell === 4) {
        // If cell 4 was previously activated and now isn't, hide the door
        context.world.setStateValue('prisonCell.bronzeDoorVisible', false);
      }

      return events;
    }
  }];
}
