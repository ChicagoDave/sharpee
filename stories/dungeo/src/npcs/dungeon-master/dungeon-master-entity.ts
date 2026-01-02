/**
 * Dungeon Master NPC Entity
 *
 * The Dungeon Master is an ally in the endgame who:
 * 1. Guards the door at Dungeon Entrance, asks trivia questions
 * 2. Follows the player through corridors after trivia is passed
 * 3. Can be told to "stay" at Parapet to operate the dial remotely
 *
 * Unlike the Thief/Troll, the Dungeon Master is not hostile.
 */

import {
  WorldModel,
  IFEntity,
  IdentityTrait,
  ActorTrait,
  NpcTrait,
  EntityType
} from '@sharpee/world-model';

/**
 * Dungeon Master behavior states
 */
export type DungeonMasterState =
  | 'GUARDING_DOOR'  // At Dungeon Entrance, asks trivia
  | 'FOLLOWING'      // Follows player through corridors
  | 'WAITING'        // Stays at current location (for dial puzzle)
  | 'OPERATING';     // Responding to remote commands at Parapet

/**
 * Custom properties for Dungeon Master NPC
 */
export interface DungeonMasterCustomProperties {
  state: DungeonMasterState;
  /** Whether trivia has been passed */
  triviaPassed: boolean;
  /** Whether trivia has been started */
  triviaStarted: boolean;
  /** Whether the door is open (trivia passed) */
  doorOpen: boolean;
}

/**
 * Create default custom properties
 */
export function createDungeonMasterCustomProperties(): DungeonMasterCustomProperties {
  return {
    state: 'GUARDING_DOOR',
    triviaPassed: false,
    triviaStarted: false,
    doorOpen: false
  };
}

/**
 * Create the Dungeon Master NPC entity
 *
 * @param world The world model
 * @param startRoomId The Dungeon Entrance room ID (where DM starts)
 */
export function createDungeonMaster(
  world: WorldModel,
  startRoomId: string
): IFEntity {
  const dm = world.createEntity('dungeon-master', EntityType.ACTOR);

  // Identity - based on FORTRAN descriptions
  dm.add(new IdentityTrait({
    name: 'Dungeon Master',
    aliases: [
      'dungeon master', 'master', 'dm', 'old man',
      'elderly man', 'strange man', 'man'
    ],
    description: 'A strange old man with a long, flowing beard and penetrating eyes. He carries himself with an air of quiet authority, as one who has seen much and knows more.',
    properName: true,
    article: 'the'
  }));

  // Actor - not the player
  dm.add(new ActorTrait({
    isPlayer: false
  }));

  // NPC behavior - uses custom 'dungeon-master' behavior
  dm.add(new NpcTrait({
    behaviorId: 'dungeon-master',
    isHostile: false,  // Never hostile - an ally
    canMove: true,
    forbiddenRooms: [],  // Can go anywhere in endgame
    customProperties: createDungeonMasterCustomProperties() as unknown as Record<string, unknown>
  }));

  // No combat trait - the Dungeon Master doesn't fight
  // No container trait - doesn't carry items

  // Initialize trivia state in world
  world.setStateValue('trivia.questionsAnswered', 0);
  world.setStateValue('trivia.wrongAttempts', 0);
  world.setStateValue('trivia.currentQuestion', -1);
  world.setStateValue('trivia.isComplete', false);
  world.setStateValue('trivia.passed', false);

  // Initialize DM state
  world.setStateValue('dungeonMaster.doorOpen', false);
  world.setStateValue('dungeonMaster.state', 'GUARDING_DOOR');

  // Place DM at the door (starts behind the door, visible through bars)
  // He's "at" the Dungeon Entrance but behind the door
  world.moveEntity(dm.id, startRoomId);

  return dm;
}

/**
 * Helper to get the Dungeon Master entity
 */
export function getDungeonMaster(world: WorldModel): IFEntity | undefined {
  const allEntities = world.getAllEntities();
  return allEntities.find((e: IFEntity) => {
    const identity = e.get(IdentityTrait);
    return identity?.name === 'Dungeon Master';
  });
}

/**
 * Helper to check if player has passed trivia
 */
export function hasPassedTrivia(world: WorldModel): boolean {
  return (world.getStateValue('trivia.passed') as boolean) ?? false;
}

/**
 * Helper to check if door is open
 */
export function isDoorOpen(world: WorldModel): boolean {
  return (world.getStateValue('dungeonMaster.doorOpen') as boolean) ?? false;
}

/**
 * Helper to get DM state
 */
export function getDungeonMasterState(world: WorldModel): DungeonMasterState {
  return (world.getStateValue('dungeonMaster.state') as DungeonMasterState) ?? 'GUARDING_DOOR';
}

/**
 * Helper to set DM state
 */
export function setDungeonMasterState(world: WorldModel, state: DungeonMasterState): void {
  world.setStateValue('dungeonMaster.state', state);

  // Also update the NPC trait's customProperties
  const dm = getDungeonMaster(world);
  if (dm) {
    const npcTrait = dm.get(NpcTrait);
    if (npcTrait && npcTrait.customProperties) {
      (npcTrait.customProperties as unknown as DungeonMasterCustomProperties).state = state;
    }
  }
}
