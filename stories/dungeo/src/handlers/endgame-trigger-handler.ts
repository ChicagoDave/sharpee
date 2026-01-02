/**
 * Endgame Trigger Handler - Crypt darkness ritual
 *
 * The endgame is triggered when the player:
 * 1. Is in the Crypt
 * 2. Has the crypt door closed
 * 3. Has the lamp off (darkness)
 * 4. Waits for 15 turns
 *
 * When triggered:
 * - A cloaked figure appears
 * - Player is teleported to Top of Stairs
 * - Score is reset to 15 (out of 100)
 * - Saving is disabled
 * - Player is given the elvish sword
 */

import { ISemanticEvent, EntityId } from '@sharpee/core';
import {
  WorldModel,
  IdentityTrait,
  OpenableTrait,
  LightSourceTrait,
  RoomTrait
} from '@sharpee/world-model';
import { ISchedulerService, Daemon, SchedulerContext } from '@sharpee/engine';

export const EndgameTriggerMessages = {
  DARKNESS_DESCENDS: 'dungeo.endgame.darkness_descends',
  CLOAKED_FIGURE: 'dungeo.endgame.cloaked_figure',
  TELEPORT: 'dungeo.endgame.teleport',
  ENDGAME_BEGINS: 'dungeo.endgame.begins',
} as const;

// State keys
const CRYPT_WAIT_TURNS_KEY = 'dungeo.endgame.cryptWaitTurns';
const ENDGAME_STARTED_KEY = 'game.endgameStarted';
const SAVING_DISABLED_KEY = 'game.savingDisabled';
const ENDGAME_SCORE_KEY = 'scoring.endgameScore';
const ENDGAME_MAX_SCORE_KEY = 'scoring.endgameMaxScore';

const TURNS_REQUIRED = 15;

/**
 * Check if the crypt door is closed
 */
function isCryptDoorClosed(world: WorldModel, cryptId: EntityId): boolean {
  // Find the crypt door
  const allEntities = world.getAllEntities();
  const cryptDoor = allEntities.find(e => {
    const identity = e.get(IdentityTrait);
    return identity?.name === 'crypt door';
  });

  if (!cryptDoor) return false;

  const openable = cryptDoor.get(OpenableTrait);
  return openable ? !openable.isOpen : false;
}

/**
 * Check if the room is dark (no active light sources)
 */
function isRoomDark(world: WorldModel, roomId: EntityId): boolean {
  const player = world.getPlayer();
  if (!player) return true;

  // Check room's isDark property
  const room = world.getEntity(roomId);
  if (!room) return true;

  const roomTrait = room.get(RoomTrait);
  if (!roomTrait?.isDark) return false; // Room has ambient light

  // Check if player has any lit light source
  const playerContents = world.getContents(player.id);
  for (const item of playerContents) {
    const lightSource = item.get(LightSourceTrait);
    if (lightSource?.isLit) {
      return false; // Player has a lit light source
    }
  }

  // Check for lit light sources in the room
  const roomContents = world.getContents(roomId);
  for (const item of roomContents) {
    const lightSource = item.get(LightSourceTrait);
    if (lightSource?.isLit) {
      return false;
    }
  }

  return true;
}

/**
 * Find the elvish sword entity
 */
function findElvishSword(world: WorldModel): EntityId | undefined {
  const allEntities = world.getAllEntities();
  const sword = allEntities.find(e => {
    const identity = e.get(IdentityTrait);
    return identity?.aliases?.includes('elvish sword') ||
           identity?.name === 'elvish sword';
  });
  return sword?.id;
}

/**
 * Trigger the endgame sequence
 */
function triggerEndgame(
  world: WorldModel,
  topOfStairsId: EntityId
): ISemanticEvent[] {
  const events: ISemanticEvent[] = [];
  const player = world.getPlayer();
  if (!player) return events;

  // Set endgame state flags
  world.setStateValue(ENDGAME_STARTED_KEY, true);
  world.setStateValue(SAVING_DISABLED_KEY, true);
  world.setStateValue(ENDGAME_SCORE_KEY, 15);
  world.setStateValue(ENDGAME_MAX_SCORE_KEY, 100);

  // Reset turn counter
  world.setStateValue(CRYPT_WAIT_TURNS_KEY, 0);

  // Give player the elvish sword if they don't have it
  const swordId = findElvishSword(world);
  if (swordId) {
    const swordLocation = world.getLocation(swordId);
    if (swordLocation !== player.id) {
      world.moveEntity(swordId, player.id);
    }
  }

  // Emit cloaked figure appearance
  events.push({
    id: `endgame-cloaked-figure-${Date.now()}`,
    type: 'game.message',
    timestamp: Date.now(),
    entities: {},
    data: {
      messageId: EndgameTriggerMessages.CLOAKED_FIGURE
    }
  });

  // Teleport player to Top of Stairs
  world.moveEntity(player.id, topOfStairsId);

  // Emit teleport event
  events.push({
    id: `endgame-teleport-${Date.now()}`,
    type: 'player.teleported',
    timestamp: Date.now(),
    entities: {
      actor: player.id,
      location: topOfStairsId
    },
    data: {
      messageId: EndgameTriggerMessages.TELEPORT,
      destination: topOfStairsId
    }
  });

  // Emit endgame begins event
  events.push({
    id: `endgame-begins-${Date.now()}`,
    type: 'game.message',
    timestamp: Date.now(),
    entities: {},
    data: {
      messageId: EndgameTriggerMessages.ENDGAME_BEGINS,
      score: 15,
      maxScore: 100
    }
  });

  return events;
}

/**
 * Register the endgame trigger handler
 */
export function registerEndgameTriggerHandler(
  scheduler: ISchedulerService,
  world: WorldModel,
  cryptId: EntityId,
  topOfStairsId: EntityId
): void {
  // Initialize state
  world.setStateValue(CRYPT_WAIT_TURNS_KEY, 0);

  // Create the daemon that checks for endgame trigger conditions
  const endgameTriggerDaemon: Daemon = {
    id: 'dungeo-endgame-trigger',
    name: 'Endgame Crypt Trigger',
    priority: 50, // Run after most other daemons

    condition: (context: SchedulerContext): boolean => {
      // Don't trigger if endgame already started
      if (context.world.getStateValue(ENDGAME_STARTED_KEY)) {
        return false;
      }

      // Only run if player is in the Crypt
      return context.playerLocation === cryptId;
    },

    run: (context: SchedulerContext): ISemanticEvent[] => {
      const { world } = context;
      const events: ISemanticEvent[] = [];

      // Check if crypt door is closed
      if (!isCryptDoorClosed(world, cryptId)) {
        // Reset counter if door is open
        world.setStateValue(CRYPT_WAIT_TURNS_KEY, 0);
        return events;
      }

      // Check if room is dark
      if (!isRoomDark(world, cryptId)) {
        // Reset counter if there's light
        world.setStateValue(CRYPT_WAIT_TURNS_KEY, 0);
        return events;
      }

      // Increment wait counter
      const currentTurns = (world.getStateValue(CRYPT_WAIT_TURNS_KEY) as number) || 0;
      const newTurns = currentTurns + 1;
      world.setStateValue(CRYPT_WAIT_TURNS_KEY, newTurns);

      // Emit atmosphere message at certain intervals
      if (newTurns === 5) {
        events.push({
          id: `endgame-darkness-1-${Date.now()}`,
          type: 'game.message',
          timestamp: Date.now(),
          entities: {},
          data: {
            messageId: EndgameTriggerMessages.DARKNESS_DESCENDS,
            turn: newTurns
          }
        });
      } else if (newTurns === 10) {
        events.push({
          id: `endgame-darkness-2-${Date.now()}`,
          type: 'game.message',
          timestamp: Date.now(),
          entities: {},
          data: {
            messageId: EndgameTriggerMessages.DARKNESS_DESCENDS,
            turn: newTurns
          }
        });
      }

      // Check if we've reached the required turns
      if (newTurns >= TURNS_REQUIRED) {
        return triggerEndgame(world, topOfStairsId);
      }

      return events;
    }
  };

  scheduler.registerDaemon(endgameTriggerDaemon);
}

/**
 * Get the current crypt wait turn count (for GDT debugging)
 */
export function getCryptWaitTurns(world: WorldModel): number {
  return (world.getStateValue(CRYPT_WAIT_TURNS_KEY) as number) || 0;
}

/**
 * Check if endgame has started
 */
export function isEndgameStarted(world: WorldModel): boolean {
  return world.getStateValue(ENDGAME_STARTED_KEY) === true;
}
