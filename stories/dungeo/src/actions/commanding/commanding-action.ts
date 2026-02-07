/**
 * Commanding Action
 *
 * Handles player commands to NPCs, primarily the robot.
 * Parses "tell robot to X" / "robot, X" patterns and executes robot-specific commands.
 *
 * Based on FORTRAN Zork timefnc.for lines 954-984 (A2 - Robot handler).
 *
 * Robot can execute: WALK, TAKE, DROP, PUT, PUSH, THROW, TURN, LEAP
 * Robot says "Whirr, buzz, click!" before executing valid commands.
 * Unknown commands: "I am only a stupid robot and cannot perform that command."
 */

import { Action, ActionContext, ValidationResult } from '@sharpee/stdlib';
import { ISemanticEvent } from '@sharpee/core';
import { IdentityTrait, NpcTrait, RoomTrait, RoomBehavior, Direction } from '@sharpee/world-model';
import { CommandingMessages, COMMANDING_ACTION_ID } from './commanding-messages';
import { RobotMessages } from '../../npcs/robot/robot-messages';
import { getRobotProps, makeRobotPushButton } from '../../npcs/robot/robot-entity';
import {
  CageMessages,
  CAGE_TRAPPED_KEY,
  CAGE_SOLVED_KEY,
  CAGE_TURNS_KEY,
  DINGY_CLOSET_ID_KEY
} from '../../interceptors/sphere-taking-interceptor';

/**
 * Verbs the robot can execute (from FORTRAN timefnc.for lines 2977-2984)
 * Robot says "buzz, whirr, click!" then executes action normally.
 * Note: FOLLOW/STAY are Dungeon Master commands (A3), NOT robot commands.
 */
const ROBOT_EXECUTABLE_VERBS = [
  'walk', 'go', 'north', 'south', 'east', 'west', 'up', 'down', 'n', 's', 'e', 'w', 'u', 'd',
  'ne', 'nw', 'se', 'sw', 'northeast', 'northwest', 'southeast', 'southwest',
  'take', 'get', 'pick',
  'drop',
  'put',
  'push', 'press',
  'throw',
  'turn',
  'raise', 'lift',
  'leap', 'jump'
];

/**
 * Direction aliases for robot WALK command
 * Maps user input to Direction constants (uppercase)
 */
const DIRECTION_MAP: Record<string, string> = {
  'n': 'NORTH', 'north': 'NORTH',
  's': 'SOUTH', 'south': 'SOUTH',
  'e': 'EAST', 'east': 'EAST',
  'w': 'WEST', 'west': 'WEST',
  'u': 'UP', 'up': 'UP',
  'd': 'DOWN', 'down': 'DOWN',
  'ne': 'NORTHEAST', 'northeast': 'NORTHEAST',
  'nw': 'NORTHWEST', 'northwest': 'NORTHWEST',
  'se': 'SOUTHEAST', 'southeast': 'SOUTHEAST',
  'sw': 'SOUTHWEST', 'southwest': 'SOUTHWEST'
};

/**
 * Check if a room is the Machine Room (well area with triangular button)
 */
function isMachineRoom(room: any): boolean {
  if (!room) return false;
  const identity = room.get?.(IdentityTrait);
  if (!identity) return false;
  return identity.name === 'Machine Room' &&
         identity.description?.includes('triangular button');
}

/**
 * Find the Round Room entity
 */
function findRoundRoom(context: ActionContext): any | null {
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
 * Try to move the robot in a direction
 */
function executeRobotWalk(
  context: ActionContext,
  robot: any,
  direction: string
): ISemanticEvent[] {
  const events: ISemanticEvent[] = [];
  const robotLocation = context.world.getLocation(robot.id);
  if (!robotLocation) {
    events.push(context.event('game.message', {
      messageId: CommandingMessages.WHIRR_BUZZ_CLICK
    }));
    return events;
  }

  const robotRoom = context.world.getEntity(robotLocation);
  if (!robotRoom) {
    events.push(context.event('game.message', {
      messageId: CommandingMessages.WHIRR_BUZZ_CLICK
    }));
    return events;
  }

  // Get exits from RoomTrait
  const roomTrait = robotRoom.get(RoomTrait);
  const exits = roomTrait?.exits || {};
  const normalizedDir = DIRECTION_MAP[direction];
  const exitInfo = exits[normalizedDir as keyof typeof exits];
  const targetRoomId = exitInfo?.destination;

  if (!targetRoomId) {
    // No exit in that direction - just buzz
    events.push(context.event('game.message', {
      messageId: CommandingMessages.WHIRR_BUZZ_CLICK
    }));
    return events;
  }

  // Move the robot
  context.world.moveEntity(robot.id, targetRoomId);

  events.push(context.event('game.message', {
    messageId: CommandingMessages.WHIRR_BUZZ_CLICK
  }));

  // If player is in same room as robot's destination, describe robot arriving
  const playerLocation = context.world.getLocation(context.player.id);
  if (playerLocation === targetRoomId) {
    events.push(context.event('game.message', {
      messageId: RobotMessages.ARRIVES
    }));
  }

  return events;
}

/**
 * Try to have robot take an object
 */
function executeRobotTake(
  context: ActionContext,
  robot: any,
  objectName: string
): ISemanticEvent[] {
  const events: ISemanticEvent[] = [];
  const robotLocation = context.world.getLocation(robot.id);

  if (!robotLocation) {
    events.push(context.event('game.message', {
      messageId: CommandingMessages.WHIRR_BUZZ_CLICK
    }));
    return events;
  }

  // Find object by name in robot's location using getContents
  const roomContents = context.world.getContents(robotLocation);
  let targetObject: any = null;

  for (const entity of roomContents) {
    // Skip the robot itself
    if (entity.id === robot.id) continue;

    const identity = entity.get(IdentityTrait);
    if (!identity) continue;

    const name = identity.name?.toLowerCase() || '';
    const aliases = identity.aliases?.map((a: string) => a.toLowerCase()) || [];

    if (name.includes(objectName) || aliases.some((a: string) => a.includes(objectName))) {
      targetObject = entity;
      break;
    }
  }

  events.push(context.event('game.message', {
    messageId: CommandingMessages.WHIRR_BUZZ_CLICK
  }));

  if (targetObject) {
    // Check for sphere - robot taking sphere triggers robot crush death
    const targetIdentity = targetObject.get(IdentityTrait);
    if (targetIdentity?.name === 'white crystal sphere' &&
        !context.world.getStateValue(CAGE_SOLVED_KEY)) {
      return handleRobotTakeSphere(context, robot);
    }

    // Check if portable
    const isPortable = (targetObject as any).portable !== false;
    if (isPortable) {
      // Move object to robot (robot "carries" it)
      context.world.moveEntity(targetObject.id, robot.id);
      events.push(context.event('game.message', {
        messageId: RobotMessages.TAKES_OBJECT,
        objectName: targetIdentity?.name || 'object'
      }));
    }
  }

  return events;
}

/**
 * Try to have robot drop an object
 */
function executeRobotDrop(
  context: ActionContext,
  robot: any,
  objectName: string
): ISemanticEvent[] {
  const events: ISemanticEvent[] = [];
  const robotLocation = context.world.getLocation(robot.id);

  if (!robotLocation) {
    events.push(context.event('game.message', {
      messageId: CommandingMessages.WHIRR_BUZZ_CLICK
    }));
    return events;
  }

  // Find object by name in robot's inventory using getContents
  const robotContents = context.world.getContents(robot.id);
  let targetObject: any = null;

  for (const entity of robotContents) {
    const identity = entity.get(IdentityTrait);
    if (!identity) continue;

    const name = identity.name?.toLowerCase() || '';
    const aliases = identity.aliases?.map((a: string) => a.toLowerCase()) || [];

    if (name.includes(objectName) || aliases.some((a: string) => a.includes(objectName))) {
      targetObject = entity;
      break;
    }
  }

  events.push(context.event('game.message', {
    messageId: CommandingMessages.WHIRR_BUZZ_CLICK
  }));

  if (targetObject) {
    // Move object to robot's location
    context.world.moveEntity(targetObject.id, robotLocation);
    events.push(context.event('game.message', {
      messageId: RobotMessages.DROPS_OBJECT,
      objectName: targetObject.get(IdentityTrait)?.name || 'object'
    }));
  }

  return events;
}

/**
 * Unblock all exits from a room (cage puzzle solved)
 */
function unblockAllExits(world: any, roomId: string): void {
  const room = world.getEntity(roomId);
  if (!room) return;
  RoomBehavior.unblockExit(room, Direction.NORTH);
  RoomBehavior.unblockExit(room, Direction.SOUTH);
  RoomBehavior.unblockExit(room, Direction.EAST);
  RoomBehavior.unblockExit(room, Direction.WEST);
  RoomBehavior.unblockExit(room, Direction.UP);
  RoomBehavior.unblockExit(room, Direction.DOWN);
  RoomBehavior.unblockExit(room, Direction.NORTHEAST);
  RoomBehavior.unblockExit(room, Direction.NORTHWEST);
  RoomBehavior.unblockExit(room, Direction.SOUTHEAST);
  RoomBehavior.unblockExit(room, Direction.SOUTHWEST);
}

/**
 * Handle "raise cage" / "lift cage" command
 *
 * From MDL source (act3.mud:270-284):
 * Robot raises cage → cage hurled across room → sphere now takeable
 */
function handleRaiseCage(
  context: ActionContext,
  robot: any
): ISemanticEvent[] {
  const events: ISemanticEvent[] = [];
  const trapped = context.world.getStateValue(CAGE_TRAPPED_KEY);

  if (!trapped) {
    // Not trapped - nothing to raise
    events.push(context.event('game.message', {
      npc: robot.id,
      messageId: CommandingMessages.WHIRR_BUZZ_CLICK,
      npcName: 'robot'
    }));
    return events;
  }

  // Solve the cage puzzle!
  context.world.setStateValue(CAGE_TRAPPED_KEY, false);
  context.world.setStateValue(CAGE_SOLVED_KEY, true);
  context.world.setStateValue(CAGE_TURNS_KEY, 0);

  // Unblock exits from Dingy Closet
  const dingyClosetId = context.world.getStateValue(DINGY_CLOSET_ID_KEY) as string;
  if (dingyClosetId) {
    unblockAllExits(context.world, dingyClosetId);
  }

  // Emit cage raised message
  events.push(context.event('game.message', {
    npc: robot.id,
    messageId: CageMessages.CAGE_RAISED,
    npcName: 'robot'
  }));

  return events;
}

/**
 * Handle robot trying to take the sphere (cage not solved)
 *
 * From MDL source (act3.mud:249-255):
 * Robot reaches for sphere → cage falls → robot crushed + sphere destroyed
 */
function handleRobotTakeSphere(
  context: ActionContext,
  robot: any
): ISemanticEvent[] {
  const events: ISemanticEvent[] = [];

  // Robot crush message
  events.push(context.event('game.message', {
    messageId: CageMessages.ROBOT_CRUSH
  }));

  // Set player death state
  context.world.setStateValue('dungeo.player.dead', true);
  context.world.setStateValue('dungeo.player.death_cause', 'robot_crush');

  // Emit death event
  events.push(context.event('game.player_death', {
    cause: 'robot_crush',
    messageId: CageMessages.ROBOT_CRUSH
  }));

  return events;
}

/**
 * Handle robot-specific commands
 * Based on FORTRAN timefnc.for lines 954-984 (A2 - Robot handler)
 */
function handleRobotCommand(
  context: ActionContext,
  robot: any,
  command: string
): ISemanticEvent[] {
  const events: ISemanticEvent[] = [];
  const props = getRobotProps(robot);
  if (!props) {
    return [context.event('action.blocked', {
      actionId: COMMANDING_ACTION_ID,
      messageId: CommandingMessages.CANT_COMMAND
    })];
  }

  const words = command.split(/\s+/);
  const verb = words[0] || '';

  // Push button command (special case - carousel puzzle)
  if ((verb === 'push' || verb === 'press') && command.includes('button')) {
    // Check if already pushed
    if (props.buttonPushed) {
      events.push(context.event('game.message', {
        npc: robot.id,
        messageId: RobotMessages.ALREADY_PUSHED,
        npcName: 'robot'
      }));
      return events;
    }

    // Check if robot is in Machine Room
    const robotLocation = context.world.getLocation(robot.id);
    const robotRoom = robotLocation ? context.world.getEntity(robotLocation) : null;

    if (!isMachineRoom(robotRoom)) {
      events.push(context.event('game.message', {
        npc: robot.id,
        messageId: RobotMessages.NO_BUTTON,
        npcName: 'robot'
      }));
      return events;
    }

    // Push the button!
    events.push(context.event('game.message', {
      npc: robot.id,
      messageId: CommandingMessages.WHIRR_BUZZ_CLICK,
      npcName: 'robot'
    }));

    const roundRoom = findRoundRoom(context);
    if (roundRoom) {
      const buttonEvents = makeRobotPushButton(context.world, robot, roundRoom.id);
      events.push(...buttonEvents);
    } else {
      events.push(context.event('game.message', {
        npc: robot.id,
        messageId: RobotMessages.PUSHES_BUTTON,
        npcName: 'robot'
      }));
    }

    return events;
  }

  // Raise/lift cage command (cage puzzle solution)
  if ((verb === 'raise' || verb === 'lift') && command.includes('cage')) {
    return handleRaiseCage(context, robot);
  }

  // Direction commands (go north, n, walk south, etc.)
  if (verb === 'walk' || verb === 'go') {
    const direction = words[1] || '';
    if (DIRECTION_MAP[direction]) {
      return executeRobotWalk(context, robot, direction);
    }
  }

  // Bare direction (just "north", "n", etc.)
  if (DIRECTION_MAP[verb]) {
    return executeRobotWalk(context, robot, verb);
  }

  // Take/get commands
  if (verb === 'take' || verb === 'get' || verb === 'pick') {
    const objectName = words.slice(verb === 'pick' ? 2 : 1).join(' '); // "pick up X" vs "take X"
    if (objectName) {
      return executeRobotTake(context, robot, objectName);
    }
    // No object specified - just buzz
    events.push(context.event('game.message', {
      messageId: CommandingMessages.WHIRR_BUZZ_CLICK
    }));
    return events;
  }

  // Drop commands
  if (verb === 'drop') {
    const objectName = words.slice(1).join(' ');
    if (objectName) {
      return executeRobotDrop(context, robot, objectName);
    }
    events.push(context.event('game.message', {
      messageId: CommandingMessages.WHIRR_BUZZ_CLICK
    }));
    return events;
  }

  // Other executable verbs (put, push non-button, throw, turn, leap)
  // Robot says "buzz" but these don't have specific implementations
  if (ROBOT_EXECUTABLE_VERBS.includes(verb)) {
    events.push(context.event('game.message', {
      npc: robot.id,
      messageId: CommandingMessages.WHIRR_BUZZ_CLICK,
      npcName: 'robot'
    }));
    return events;
  }

  // Unknown command - robot can't do it
  events.push(context.event('game.message', {
    npc: robot.id,
    messageId: CommandingMessages.STUPID_ROBOT,
    npcName: 'robot'
  }));

  return events;
}

export const commandingAction: Action = {
  id: COMMANDING_ACTION_ID,
  group: 'communication',

  validate(context: ActionContext): ValidationResult {
    const npc = context.command.directObject?.entity;
    if (!npc) {
      return { valid: false, error: CommandingMessages.NO_TARGET };
    }

    // Check if target is an NPC (specifically, the robot for now)
    const identity = npc.get(IdentityTrait);
    if (identity?.name !== 'robot') {
      return { valid: false, error: CommandingMessages.CANT_COMMAND };
    }

    // Check visibility
    if (!context.canSee(npc)) {
      return { valid: false, error: CommandingMessages.CANT_SEE };
    }

    return { valid: true };
  },

  execute(context: ActionContext): void {
    const npc = context.command.directObject!.entity!;
    // Get command text from textSlots (greedy capture)
    const command = context.command.parsed?.textSlots?.get('command') || '';
    context.sharedData.robot = npc;
    context.sharedData.command = command.toLowerCase().trim();
  },

  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    return [context.event('game.message', {
      actionId: COMMANDING_ACTION_ID,
      messageId: result.error || CommandingMessages.CANT_COMMAND
    })];
  },

  report(context: ActionContext): ISemanticEvent[] {
    const { robot, command } = context.sharedData;
    return handleRobotCommand(context, robot, command);
  }
};
