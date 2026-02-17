/**
 * Cyclops NPC Entity Creation
 *
 * Creates the Cyclops entity with all required traits:
 * - IdentityTrait: "huge cyclops"
 * - ActorTrait: marks as actor (not player)
 * - NpcTrait: behavior, movement restrictions
 * - CombatantTrait: combat stats (very tough)
 *
 * The Cyclops guards the passage north to the Living Room.
 * It flees when the player says "Odysseus" or "Ulysses".
 */

import {
  WorldModel,
  IFEntity,
  IdentityTrait,
  ActorTrait,
  NpcTrait,
  CombatantTrait,
  EntityType,
  RoomBehavior,
  RoomTrait,
  Direction
} from '@sharpee/world-model';
import { ISemanticEvent } from '@sharpee/core';
import { CyclopsMessages } from './cyclops-messages';

/**
 * Cyclops state
 */
export type CyclopsState = 'GUARDING' | 'FLED' | 'DEAD';

/**
 * Custom properties stored in NpcTrait
 */
export interface CyclopsCustomProperties {
  state: CyclopsState;
  roomId: string;  // The room cyclops is guarding
}

/**
 * Create default cyclops properties
 */
export function createCyclopsCustomProperties(roomId: string): CyclopsCustomProperties {
  return {
    state: 'GUARDING',
    roomId
  };
}

/**
 * Create the Cyclops entity
 *
 * @param world The world model
 * @param roomId The Cyclops Room entity ID
 */
export function createCyclops(
  world: WorldModel,
  roomId: string
): IFEntity {
  const cyclops = world.createEntity('cyclops', EntityType.ACTOR);

  // Identity - matches Mainframe Zork description
  cyclops.add(new IdentityTrait({
    name: 'huge cyclops',
    aliases: ['cyclops', 'giant', 'monster', 'one-eyed giant', 'one-eyed monster'],
    description: 'A huge cyclops stands here, blocking the northern passage. Its single eye glares at you menacingly.',
    properName: false,
    article: 'a'
  }));

  // Actor - not the player
  cyclops.add(new ActorTrait({
    isPlayer: false
  }));

  // NPC behavior - uses custom 'cyclops' behavior
  cyclops.add(new NpcTrait({
    behaviorId: 'cyclops',
    isHostile: true,
    canMove: false,  // Cyclops guards this room
    customProperties: createCyclopsCustomProperties(roomId) as unknown as Record<string, unknown>
  }));

  // Combat - very tough, difficult to kill
  // Health 30 and skill 60 = very hard fight
  cyclops.add(new CombatantTrait({
    health: 30,
    maxHealth: 30,
    skill: 60,           // Very skilled (Thief is 70, Troll is 40)
    baseDamage: 8,       // Hits HARD with those fists
    armor: 2,            // Tough hide
    hostile: true,
    canRetaliate: true,
    dropsInventory: false,  // Cyclops has no items
    deathMessage: 'The cyclops crashes to the ground with a tremendous thud!'
  }));

  // Place cyclops in its room
  world.moveEntity(cyclops.id, roomId);

  // NOTE: .on handlers are dead code (events are messages, not pub/sub).
  // Cyclops death side effects should be handled via interceptor if needed.
  // Flee scoring is handled in makeCyclopsFlee() below.

  return cyclops;
}

/**
 * Make the cyclops flee - removes it from the game and opens passage
 */
export function makeCyclopsFlee(
  world: WorldModel,
  cyclops: IFEntity,
  roomId: string
): ISemanticEvent[] {
  const events: ISemanticEvent[] = [];

  // Unblock the north passage (Cyclops Room → Strange Passage)
  const cyclopsRoom = world.getEntity(roomId);
  if (cyclopsRoom) {
    RoomBehavior.unblockExit(cyclopsRoom, Direction.NORTH);
  }

  // Open the Living Room west exit (cyclops crashed through the nailed-shut door)
  // Traverse: Cyclops Room N → Strange Passage E → Living Room
  const strangePassageId = cyclopsRoom?.get(RoomTrait)?.exits[Direction.NORTH]?.destination;
  if (strangePassageId) {
    const strangePassage = world.getEntity(strangePassageId);
    const livingRoomId = strangePassage?.get(RoomTrait)?.exits[Direction.EAST]?.destination;
    if (livingRoomId) {
      const livingRoom = world.getEntity(livingRoomId);
      if (livingRoom) {
        const livingRoomTrait = livingRoom.get(RoomTrait);
        if (livingRoomTrait) {
          livingRoomTrait.exits[Direction.WEST] = { destination: strangePassageId };
        }
      }
    }
  }

  // Note: No bonus points for cyclops fleeing (not in FORTRAN source)

  // Update cyclops state
  const npcTrait = cyclops.get(NpcTrait);
  if (npcTrait?.customProperties) {
    (npcTrait.customProperties as unknown as CyclopsCustomProperties).state = 'FLED';
  }

  // Remove cyclops from the game (move to limbo/void)
  world.moveEntity(cyclops.id, 'void');

  return events;
}
