/**
 * Robot NPC Entity
 *
 * A mechanical robot that can follow the player and push buttons
 * when commanded. Essential for solving the Round Room carousel puzzle.
 */

import {
  WorldModel,
  IFEntity,
  IdentityTrait,
  ActorTrait,
  NpcTrait,
  EntityType
} from '@sharpee/world-model';
import { ISemanticEvent } from '@sharpee/core';
import { RobotMessages } from './robot-messages';
import { RoundRoomTrait } from '../../traits';

/**
 * Robot state stored in NpcTrait.customProperties
 */
export interface RobotCustomProperties {
  /** Is the robot following the player? */
  following: boolean;
  /** Has the robot pushed the triangular button? */
  buttonPushed: boolean;
  /** Room ID where robot was created */
  homeRoomId: string;
}

/**
 * Create the Robot NPC entity
 */
export function createRobot(world: WorldModel, roomId: string): IFEntity {
  const robot = world.createEntity('robot', EntityType.ACTOR);

  robot.add(new IdentityTrait({
    name: 'robot',
    aliases: ['robot', 'mechanical man', 'machine', 'mechanical device'],
    description: 'A metallic robot with a hinged panel on its chest. It appears to be waiting for instructions.',
    properName: false,
    article: 'a'
  }));

  robot.add(new ActorTrait({
    isPlayer: false
  }));

  const customProps: RobotCustomProperties = {
    following: false,
    buttonPushed: false,
    homeRoomId: roomId
  };

  robot.add(new NpcTrait({
    behaviorId: 'robot',
    isHostile: false,
    canMove: true,
    customProperties: customProps as unknown as Record<string, unknown>
  }));

  world.moveEntity(robot.id, roomId);
  return robot;
}

/**
 * Get the Robot's custom properties
 */
export function getRobotProps(robot: IFEntity): RobotCustomProperties | null {
  const npcTrait = robot.get(NpcTrait);
  if (!npcTrait?.customProperties) return null;
  return npcTrait.customProperties as unknown as RobotCustomProperties;
}

/**
 * Make the robot push the triangular button in the Machine Room
 * This fixes the Round Room carousel
 */
export function makeRobotPushButton(
  world: WorldModel,
  robot: IFEntity,
  roundRoomId: string
): ISemanticEvent[] {
  const events: ISemanticEvent[] = [];
  const props = getRobotProps(robot);

  if (!props) return events;

  // Mark button as pushed
  props.buttonPushed = true;

  // Fix the Round Room
  const roundRoom = world.getEntity(roundRoomId);
  if (roundRoom) {
    const trait = roundRoom.get(RoundRoomTrait);
    if (trait) {
      trait.isFixed = true;
    }
  }

  // Activate Low Room carousel (canonical: button toggles CAROUSEL-FLIP to TRUE,
  // which fixes Round Room but randomizes Low Room exits — player doesn't need Low Room anymore)
  world.setStateValue('dungeo.carousel.active', true);

  // Emit success events
  events.push({
    id: `robot-push-button-${Date.now()}`,
    type: 'game.message',
    timestamp: Date.now(),
    entities: { actor: robot.id },
    data: {
      npc: robot.id,
      messageId: RobotMessages.PUSHES_BUTTON,
      npcName: 'robot'
    },
    narrate: true
  });

  events.push({
    id: `carousel-fixed-${Date.now()}`,
    type: 'game.message',
    timestamp: Date.now(),
    entities: {},
    data: {
      messageId: RobotMessages.CAROUSEL_FIXED
    },
    narrate: true
  });

  return events;
}
