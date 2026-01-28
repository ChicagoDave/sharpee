/**
 * Endgame Laser Puzzle Handler
 *
 * Mechanics:
 * 1. Small Room has a laser beam that blocks progress
 * 2. DROP SWORD in Small Room breaks the beam
 * 3. Stone Room button only works when laser is disabled
 * 4. Pressing the button enables passage to the Hallway
 *
 * Based on Dungeon FORTRAN messages #703-704
 */

import { ISemanticEvent, EntityId } from '@sharpee/core';
import {
  WorldModel,
  IdentityTrait
} from '@sharpee/world-model';
import { ISchedulerService, Daemon, SchedulerContext } from '@sharpee/plugin-scheduler';

export const LaserPuzzleMessages = {
  BEAM_BROKEN: 'dungeo.endgame.beam_broken',
  BEAM_ACTIVE: 'dungeo.endgame.beam_active',
  BUTTON_LASER_ACTIVE: 'dungeo.endgame.button_laser_active',
  BUTTON_PRESSED: 'dungeo.endgame.button_pressed',
  BUTTON_ALREADY_PRESSED: 'dungeo.endgame.button_already_pressed',
  LOOK_BEAM_ACTIVE: 'dungeo.endgame.look_beam_active',
  LOOK_BEAM_BROKEN: 'dungeo.endgame.look_beam_broken',
} as const;

// State keys
const LASER_ACTIVE_KEY = 'endgame.laserBeamActive';
const BUTTON_PRESSED_KEY = 'endgame.stoneButtonPressed';
const BEAM_JUST_BROKEN_KEY = 'endgame.beamJustBroken';
const BUTTON_JUST_PRESSED_KEY = 'endgame.buttonJustPressed';
const BUTTON_BLOCKED_KEY = 'endgame.buttonBlocked';

/**
 * Check if the laser beam is active
 */
export function isLaserActive(world: WorldModel): boolean {
  return world.getStateValue(LASER_ACTIVE_KEY) === true;
}

/**
 * Check if the stone button has been pressed
 */
export function isStoneButtonPressed(world: WorldModel): boolean {
  return world.getStateValue(BUTTON_PRESSED_KEY) === true;
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
 * Register the laser puzzle event handlers
 */
export function registerLaserPuzzleHandler(
  _engine: any,
  world: WorldModel,
  smallRoomId: EntityId,
  stoneRoomId: EntityId,
  scheduler?: ISchedulerService
): void {
  // Handler for DROP action in Small Room (sword breaks beam)
  // Note: Use `world` from closure for type compatibility with WorldModel
  world.registerEventHandler('if.event.dropped', (event: ISemanticEvent) => {
    const player = world.getPlayer();
    if (!player) return;

    // Get location from event data
    const data = event.data as Record<string, any> | undefined;
    const locationId = data?.location || data?.locationId;

    // Check if action occurred in Small Room
    if (locationId !== smallRoomId) return;

    // Check if laser is still active
    if (!isLaserActive(world)) return;

    // Check if dropped item is the sword
    const droppedId = data?.itemId || event.entities?.target;
    const swordId = findElvishSword(world);

    if (droppedId !== swordId) return;

    // Break the laser beam!
    world.setStateValue(LASER_ACTIVE_KEY, false);
    world.setStateValue(BEAM_JUST_BROKEN_KEY, true);
  });

  // Handler for PUSH action on stone button
  world.registerEventHandler('if.event.pushed', (event: ISemanticEvent) => {
    const player = world.getPlayer();
    if (!player) return;

    // Get location from player position
    const playerLocation = world.getLocation(player.id);
    if (playerLocation !== stoneRoomId) return;

    // Check if the pushed object is the stone button
    const pushedEntity = event.entities?.target;
    if (!pushedEntity) return;

    const entity = world.getEntity(pushedEntity);
    if (!entity) return;

    const identity = entity.get(IdentityTrait);
    if (!identity?.name?.includes('stone button')) return;

    // Check if laser is still active
    if (isLaserActive(world)) {
      world.setStateValue(BUTTON_BLOCKED_KEY, true);
      return;
    }

    // Check if button already pressed
    if (isStoneButtonPressed(world)) {
      return;
    }

    // Press the button!
    world.setStateValue(BUTTON_PRESSED_KEY, true);
    world.setStateValue(BUTTON_JUST_PRESSED_KEY, true);
  });

  // If scheduler available, register daemon for feedback messages
  if (scheduler) {
    const laserFeedbackDaemon: Daemon = {
      id: 'dungeo-laser-feedback',
      name: 'Laser Puzzle Feedback',
      priority: 30,

      condition: (context: SchedulerContext): boolean => {
        const { world: w } = context;
        return (
          w.getStateValue(BEAM_JUST_BROKEN_KEY) === true ||
          w.getStateValue(BUTTON_JUST_PRESSED_KEY) === true ||
          w.getStateValue(BUTTON_BLOCKED_KEY) === true
        );
      },

      run: (context: SchedulerContext): ISemanticEvent[] => {
        const { world: w } = context;
        const events: ISemanticEvent[] = [];

        if (w.getStateValue(BEAM_JUST_BROKEN_KEY)) {
          events.push({
            id: `laser-broken-${Date.now()}`,
            type: 'game.message',
            timestamp: Date.now(),
            entities: {},
            data: {
              messageId: LaserPuzzleMessages.BEAM_BROKEN
            }
          });
          w.setStateValue(BEAM_JUST_BROKEN_KEY, false);
        }

        if (w.getStateValue(BUTTON_JUST_PRESSED_KEY)) {
          events.push({
            id: `button-pressed-${Date.now()}`,
            type: 'game.message',
            timestamp: Date.now(),
            entities: {},
            data: {
              messageId: LaserPuzzleMessages.BUTTON_PRESSED
            }
          });
          w.setStateValue(BUTTON_JUST_PRESSED_KEY, false);
        }

        if (w.getStateValue(BUTTON_BLOCKED_KEY)) {
          events.push({
            id: `button-blocked-${Date.now()}`,
            type: 'game.message',
            timestamp: Date.now(),
            entities: {},
            data: {
              messageId: LaserPuzzleMessages.BUTTON_LASER_ACTIVE
            }
          });
          w.setStateValue(BUTTON_BLOCKED_KEY, false);
        }

        return events;
      }
    };

    scheduler.registerDaemon(laserFeedbackDaemon);
  }
}
