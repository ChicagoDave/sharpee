/**
 * Thief NPC Entity Creation
 *
 * Creates the Thief entity with all required traits:
 * - IdentityTrait: "seedy-looking thief"
 * - ActorTrait: marks as actor (not player)
 * - NpcTrait: behavior, movement, room restrictions
 * - CombatantTrait: combat stats (skill 70, high difficulty)
 * - ContainerTrait: holds stolen items
 *
 * The Thief starts in the Treasure Room (his lair).
 */

import {
  WorldModel,
  IFEntity,
  IdentityTrait,
  ActorTrait,
  NpcTrait,
  CombatantTrait,
  ContainerTrait,
  WeaponTrait,
  EntityType,
} from '@sharpee/world-model';

/**
 * Thief state machine states
 */
export type ThiefState =
  | 'WANDERING'   // Random movement, looking for loot
  | 'STALKING'    // Following player (has seen valuables)
  | 'STEALING'    // Actively taking items
  | 'RETURNING'   // Heading back to lair with loot
  | 'FIGHTING'    // In combat
  | 'FLEEING'     // Low health, escaping
  | 'DISABLED';   // GDT NR command disabled

/**
 * Custom properties stored in NpcTrait for state management
 */
export interface ThiefCustomProperties {
  state: ThiefState;
  lairRoomId: string;
  turnsWithEgg: number;        // Counter for egg-opening timer
  turnsInRoom: number;         // How long thief has lingered in current room
  lastKnownPlayerRoom: string | null;  // For stalking behavior
  stealCooldown: number;       // Turns before can steal again
  hasBeenAttacked: boolean;    // Triggers permanent hostility
}

/**
 * Default custom properties for thief initialization
 */
export function createThiefCustomProperties(lairRoomId: string): ThiefCustomProperties {
  return {
    state: 'WANDERING',
    lairRoomId,
    turnsWithEgg: 0,
    turnsInRoom: 0,
    lastKnownPlayerRoom: null,
    stealCooldown: 0,
    hasBeenAttacked: false
  };
}

/**
 * Create the Thief entity
 *
 * @param world The world model
 * @param lairRoomId The Treasure Room entity ID (thief's home base)
 * @param forbiddenRooms Room IDs the thief cannot enter (surface rooms)
 */
export function createThief(
  world: WorldModel,
  lairRoomId: string,
  forbiddenRooms: string[] = []
): IFEntity {
  const thief = world.createEntity('thief', EntityType.ACTOR);

  // Identity - matches Mainframe Zork description
  thief.add(new IdentityTrait({
    name: 'seedy-looking thief',
    aliases: ['thief', 'robber', 'seedy thief', 'seedy gentleman', 'gentleman', 'man'],
    description: 'A seedy-looking gentleman, shabbily dressed but with an air of confidence. His eyes dart about, assessing everything of value.',
    properName: false,
    article: 'a'
  }));

  // Actor - not the player
  thief.add(new ActorTrait({
    isPlayer: false
  }));

  // NPC behavior - uses custom 'thief' behavior
  thief.add(new NpcTrait({
    behaviorId: 'thief',
    isHostile: false,  // Becomes hostile when attacked or in late-game
    canMove: true,
    forbiddenRooms,
    customProperties: createThiefCustomProperties(lairRoomId) as unknown as Record<string, unknown>
  }));

  // Combat - high skill, dangerous opponent
  // Skill 70 = very difficult (Troll is 40)
  thief.add(new CombatantTrait({
    health: 25,
    maxHealth: 25,
    skill: 70,           // Very skilled fighter
    baseDamage: 4,       // Stiletto damage
    armor: 0,
    hostile: false,      // Not initially hostile
    canRetaliate: true,
    dropsInventory: true,
    deathMessage: 'The thief falls to the ground, a look of surprise frozen on his face.'
  }));

  // Container - thief can hold stolen items
  thief.add(new ContainerTrait({
    capacity: { maxItems: 50, maxWeight: 500 }
  }));

  // Death side effects are handled in handleVillainDeath() in melee-interceptor.ts.
  // Entity `.on` handlers are dead code in Sharpee (events are messages, not pub/sub).

  // Place thief in his lair initially
  world.moveEntity(thief.id, lairRoomId);

  // Create the stiletto weapon in thief's inventory
  const stiletto = createStilettoForThief(world, thief.id);
  thief.attributes.stilettoId = stiletto.id;

  return thief;
}

/**
 * Create the Thief's stiletto weapon
 */
function createStilettoForThief(world: WorldModel, thiefId: string): IFEntity {
  const stiletto = world.createEntity('stiletto', EntityType.ITEM);

  stiletto.add(new IdentityTrait({
    name: 'nasty stiletto',
    aliases: ['stiletto', 'knife', 'dagger', 'nasty knife', 'thief knife'],
    description: 'A long, thin, wickedly sharp knife. The kind of weapon favored by cutthroats and thieves.',
    properName: false,
    article: 'a'
  }));

  stiletto.add(new WeaponTrait({
    damage: 6,
    skillBonus: 10,  // Thief is skilled with his blade
    weaponType: 'piercing'
  }));

  // Not a treasure (no TreasureTrait) - thief won't try to "steal" his own weapon

  // Place in thief's inventory
  world.moveEntity(stiletto.id, thiefId);

  return stiletto;
}
