/**
 * Endgame Trigger Handler - Crypt darkness ritual
 *
 * The endgame is triggered when the player:
 * 1. Is in the Crypt (Tomb)
 * 2. The room is dark (lamp off, no other light source)
 * 3. Waits for 3 turns
 *
 * This matches FORTRAN behavior (clockr.for CEV20) — no door check,
 * just darkness + waiting in the Tomb.
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
  LightSourceTrait,
  SwitchableTrait,
  RoomTrait
} from '@sharpee/world-model';
import { ISchedulerService, Daemon, SchedulerContext } from '@sharpee/plugin-scheduler';

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

const TURNS_REQUIRED = 4; // 4 because the turn where the lamp is turned off also counts

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
 * Find an entity by name or alias
 */
function findEntityByName(world: WorldModel, name: string): EntityId | undefined {
  const allEntities = world.getAllEntities();
  const entity = allEntities.find(e => {
    const identity = e.get(IdentityTrait);
    return identity?.name === name || identity?.aliases?.includes(name);
  });
  return entity?.id;
}

/**
 * Strip player inventory, returning all items to their original locations.
 * FORTRAN: DO 20300 I=1,OLNT / CALL NEWSTA(I,0,OROOM(I),OCAN(I),0)
 *
 * Since we don't track original locations, items are moved to limbo (no parent).
 * The lamp and sword are then explicitly given back.
 */
function stripPlayerInventory(world: WorldModel, playerId: EntityId): void {
  const contents = world.getContents(playerId);
  for (const item of [...contents]) {
    world.moveEntity(item.id, null); // Move to limbo (nowhere)
  }
}

/**
 * Trigger the endgame sequence
 *
 * FORTRAN (clockr.for CEV20):
 * - Strip all items from player
 * - Give lamp and sword
 * - Reset lamp timer to 350 turns
 * - Teleport to Top of Stairs
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

  // Strip all player inventory (FORTRAN: NEWSTA all items back to original locations)
  stripPlayerInventory(world, player.id);

  // Give player the elvish sword
  const swordId = findEntityByName(world, 'elvish sword');
  if (swordId) {
    world.moveEntity(swordId, player.id);
  }

  // Give player the brass lantern with fresh batteries
  const lanternId = findEntityByName(world, 'brass lantern');
  if (lanternId) {
    world.moveEntity(lanternId, player.id);

    // Reset lamp fuel to 350 turns (FORTRAN: CTICK(CEVLNT)=350)
    const lantern = world.getEntity(lanternId);
    if (lantern) {
      const lightSource = lantern.get(LightSourceTrait);
      if (lightSource) {
        lightSource.fuelRemaining = 350;
        lightSource.isLit = true;
      }
      const switchable = lantern.get(SwitchableTrait);
      if (switchable) {
        switchable.isOn = true;
      }
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

  // Emit room description for Top of Stairs
  const topRoom = world.getEntity(topOfStairsId);
  if (topRoom) {
    const topRoomTrait = topRoom.get(RoomTrait);
    const topIdentity = topRoom.get(IdentityTrait);
    const roomName = topIdentity?.name || 'Top of Stairs';
    const roomDescription = topIdentity?.description || '';
    events.push({
      id: `endgame-room-desc-${Date.now()}`,
      type: 'if.event.room.description',
      timestamp: Date.now(),
      entities: { location: topOfStairsId },
      data: {
        roomId: topOfStairsId,
        roomName,
        roomDescription,
        includeContents: true,
        verbose: true,
        isDark: false,
        contents: []
      }
    });
  }

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

      // Check if room is dark (FORTRAN: only condition besides being in Tomb)
      if (!isRoomDark(world, cryptId)) {
        // Reset counter if there's light
        world.setStateValue(CRYPT_WAIT_TURNS_KEY, 0);
        return events;
      }

      // Increment wait counter
      const currentTurns = (world.getStateValue(CRYPT_WAIT_TURNS_KEY) as number) || 0;
      const newTurns = currentTurns + 1;
      world.setStateValue(CRYPT_WAIT_TURNS_KEY, newTurns);

      // Emit atmosphere message on turn 2
      if (newTurns === 2) {
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
