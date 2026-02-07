/**
 * Sphere Taking Interceptor (ADR-118)
 *
 * Handles the cage/sphere puzzle in Dingy Closet:
 * - Cage not solved + robot present: Cage trap (blocked exits, 10-turn countdown)
 * - Cage not solved + robot absent: Immediate poison gas death
 * - Cage solved: Allow standard taking
 *
 * From MDL source (act3.mud:231-261):
 * <DEFINE SPHERE-FUNCTION ...>
 *   CAGESTR: "As you reach for the sphere, a steel cage falls..."
 *   Robot present → trapped + 10-turn countdown
 *   Robot absent → immediate poison death
 */

import {
  ActionInterceptor,
  InterceptorSharedData,
  InterceptorResult,
  CapabilityEffect,
  createEffect,
  IFEntity,
  WorldModel,
  IdentityTrait,
  RoomBehavior,
  Direction,
  NpcTrait
} from '@sharpee/world-model';
import { SphereTrait } from '../traits/sphere-trait';

// State keys
const CAGE_SOLVED_KEY = 'dungeo.cage.solved';
const CAGE_TRAPPED_KEY = 'dungeo.cage.trapped';
const CAGE_TURNS_KEY = 'dungeo.cage.turns';
const DINGY_CLOSET_ID_KEY = 'dungeo.cage.dingy_closet_id';

export { CAGE_SOLVED_KEY, CAGE_TRAPPED_KEY, CAGE_TURNS_KEY, DINGY_CLOSET_ID_KEY };

/**
 * Message IDs for cage puzzle
 */
export const CageMessages = {
  /** "As you reach for the sphere, a steel cage falls..." */
  CAGE_FALLS: 'dungeo.cage.falls',
  /** "The cage shakes and is hurled across the room." */
  CAGE_RAISED: 'dungeo.cage.raised',
  /** "Time passes...and you die from some obscure poisoning." */
  POISON_DEATH: 'dungeo.cage.poison_death',
  /** "As the robot reaches for the sphere, a steel cage falls..." */
  ROBOT_CRUSH: 'dungeo.cage.robot_crush',
  /** "The gas is getting thicker." */
  GAS_WARNING: 'dungeo.cage.gas_warning',
  /** Mung room message for poison gas */
  POISON_GAS_ROOM: 'dungeo.cage.poison_gas_room',
} as const;

/**
 * Find the robot entity in a given room
 */
function findRobotInRoom(world: WorldModel, roomId: string): IFEntity | null {
  const contents = world.getContents(roomId);
  for (const entity of contents) {
    const npcTrait = entity.get(NpcTrait);
    if (npcTrait?.behaviorId === 'robot') {
      return entity;
    }
  }
  return null;
}

/**
 * Block all exits from a room (cage trap)
 */
function blockAllExits(world: WorldModel, roomId: string): void {
  const room = world.getEntity(roomId);
  if (!room) return;
  const blockMessage = 'The cage is too strong to escape.';
  RoomBehavior.blockExit(room, Direction.NORTH, blockMessage);
  RoomBehavior.blockExit(room, Direction.SOUTH, blockMessage);
  RoomBehavior.blockExit(room, Direction.EAST, blockMessage);
  RoomBehavior.blockExit(room, Direction.WEST, blockMessage);
  RoomBehavior.blockExit(room, Direction.UP, blockMessage);
  RoomBehavior.blockExit(room, Direction.DOWN, blockMessage);
  RoomBehavior.blockExit(room, Direction.NORTHEAST, blockMessage);
  RoomBehavior.blockExit(room, Direction.NORTHWEST, blockMessage);
  RoomBehavior.blockExit(room, Direction.SOUTHEAST, blockMessage);
  RoomBehavior.blockExit(room, Direction.SOUTHWEST, blockMessage);
}

/**
 * Sphere Taking Interceptor
 *
 * preValidate blocks taking when the cage puzzle hasn't been solved.
 * When cage is solved, returns null to let stdlib taking proceed normally.
 */
export const SphereTakingInterceptor: ActionInterceptor = {
  preValidate(
    entity: IFEntity,
    world: WorldModel,
    actorId: string,
    sharedData: InterceptorSharedData
  ): InterceptorResult | null {
    const trait = entity.get(SphereTrait);
    if (!trait) return null;

    // Cage already solved - allow normal taking
    if (world.getStateValue(CAGE_SOLVED_KEY)) {
      return null;
    }

    // Already trapped - can't reach sphere under cage
    if (world.getStateValue(CAGE_TRAPPED_KEY)) {
      return {
        valid: false,
        error: CageMessages.CAGE_FALLS
      };
    }

    // Cage not solved - check for robot
    const sphereLocation = world.getLocation(entity.id);
    if (!sphereLocation) return null;

    const robot = findRobotInRoom(world, sphereLocation);

    if (robot) {
      // Robot IS in room - cage trap sequence
      // Block exits, set trapped state (daemon handles countdown)
      blockAllExits(world, trait.dingyClosetId);
      world.setStateValue(CAGE_TRAPPED_KEY, true);
      world.setStateValue(CAGE_TURNS_KEY, 0);

      // Store data for report phase
      sharedData.cageTrapped = true;

      return {
        valid: false,
        error: CageMessages.CAGE_FALLS
      };
    } else {
      // Robot NOT in room - immediate poison death
      world.setStateValue('dungeo.player.dead', true);
      world.setStateValue('dungeo.player.death_cause', 'cage_poison');

      sharedData.cagePoisonDeath = true;

      return {
        valid: false,
        error: CageMessages.POISON_DEATH
      };
    }
  },

  onBlocked(
    entity: IFEntity,
    world: WorldModel,
    actorId: string,
    _error: string,
    sharedData: InterceptorSharedData
  ): CapabilityEffect[] | null {
    const effects: CapabilityEffect[] = [];

    if (sharedData.cageTrapped) {
      // Cage trap message
      effects.push(
        createEffect('game.message', {
          messageId: CageMessages.CAGE_FALLS
        })
      );
    } else if (sharedData.cagePoisonDeath) {
      // Poison death message + death event
      effects.push(
        createEffect('game.message', {
          messageId: CageMessages.POISON_GAS_ROOM
        })
      );
      effects.push(
        createEffect('game.message', {
          messageId: CageMessages.POISON_DEATH
        })
      );
      effects.push(
        createEffect('emit', {
          type: 'game.player_death',
          data: {
            cause: 'cage_poison',
            messageId: CageMessages.POISON_DEATH
          }
        })
      );
    }

    return effects.length > 0 ? effects : null;
  }
};
