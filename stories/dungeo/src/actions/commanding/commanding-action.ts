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
import { IdentityTrait, NpcTrait } from '@sharpee/world-model';
import { CommandingMessages, COMMANDING_ACTION_ID } from './commanding-messages';
import { RobotMessages } from '../../npcs/robot/robot-messages';
import { getRobotProps, makeRobotPushButton } from '../../npcs/robot/robot-entity';

/**
 * Verbs the robot can execute (from FORTRAN)
 */
const ROBOT_VERBS = [
  'walk', 'go', 'north', 'south', 'east', 'west', 'up', 'down', 'n', 's', 'e', 'w', 'u', 'd',
  'take', 'get', 'pick',
  'drop',
  'put',
  'push', 'press',
  'throw',
  'turn',
  'leap', 'jump',
  'follow', 'come',
  'stay', 'wait'
];

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
 * Handle robot-specific commands
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

  // Follow commands
  if (verb === 'follow' || verb === 'come') {
    props.following = true;
    events.push(context.event('game.message', {
      npc: robot.id,
      messageId: CommandingMessages.WHIRR_BUZZ_CLICK,
      npcName: 'robot'
    }));
    return events;
  }

  // Stay/wait commands
  if (verb === 'stay' || verb === 'wait') {
    props.following = false;
    events.push(context.event('game.message', {
      npc: robot.id,
      messageId: RobotMessages.WAITS,
      npcName: 'robot'
    }));
    return events;
  }

  // Push button command
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
      // Fallback if round room not found
      events.push(context.event('game.message', {
        npc: robot.id,
        messageId: RobotMessages.PUSHES_BUTTON,
        npcName: 'robot'
      }));
    }

    return events;
  }

  // Known verbs the robot can do (but we only implement follow/stay/push for now)
  if (ROBOT_VERBS.includes(verb)) {
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
