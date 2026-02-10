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
  StandardCapabilities
} from '@sharpee/world-model';
import { ISemanticEvent } from '@sharpee/core';
import { ThiefMessages } from './thief-messages';
import { createEmptyFrame } from '../../objects/thiefs-canvas-objects';

// Thief disabled key (duplicated here to avoid circular import with thief-helpers)
const THIEF_DISABLED_KEY = 'dungeo.thief.disabled';

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

// Event ID counter
let eventCounter = 0;
function generateEventId(): string {
  return `thief-evt-${Date.now()}-${++eventCounter}`;
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

  // Death handler - canonical MDL thief death (melee.mud:272-280, act1.mud:1272-1296)
  (thief as any).on = {
    'if.event.death': (_event: ISemanticEvent, w: WorldModel): ISemanticEvent[] => {
      const events: ISemanticEvent[] = [];
      const thiefRoom = w.getLocation(thief.id) ?? null;

      // Add score for defeating the thief
      const scoring = w.getCapability(StandardCapabilities.SCORING);
      if (scoring) {
        scoring.scoreValue = (scoring.scoreValue || 0) + 25;
        if (!scoring.achievements) {
          scoring.achievements = [];
        }
        scoring.achievements.push('Defeated the thief');

        // ADR-078: Hidden max points system
        // The death of the thief "alters reality" - max score increases from 616 to 650
        // The canvas treasure (34 pts) becomes achievable
        scoring.thiefDead = true;
        scoring.maxScore = 650;
        scoring.realityAlteredPending = true;  // Will show message on next SCORE
      }

      // Drop thief's inventory to the floor BEFORE removing the entity.
      // (Death handler fires from combatant.kill(), which is called BEFORE
      // the melee interceptor's own inventory drop code. We must do it here
      // so items are safely on the floor before the entity is removed.)
      const stilettoId = thief.attributes.stilettoId as string | undefined;
      const contents = w.getContents(thief.id);
      const droppedItems: string[] = [];
      for (const item of contents) {
        if (item.id === stilettoId) continue; // stiletto disappears with body
        w.moveEntity(item.id, thiefRoom);
        droppedItems.push(item.id);
      }

      if (droppedItems.length > 0) {
        events.push({
          id: generateEventId(),
          type: 'game.message',
          entities: {},
          data: { messageId: ThiefMessages.DROPS_LOOT },
          timestamp: Date.now(),
          narrate: true
        });
      }

      // ADR-078: Spawn the empty frame in the Treasure Room
      const frame = createEmptyFrame(w);
      w.moveEntity(frame.id, lairRoomId);

      events.push({
        id: generateEventId(),
        type: 'game.message',
        entities: {},
        data: { messageId: ThiefMessages.FRAME_SPAWNS },
        timestamp: Date.now(),
        narrate: true
      });

      // Canonical MDL melee.mud:274-277: Body disappears in black fog
      events.push({
        id: generateEventId(),
        type: 'game.message',
        entities: {},
        data: { messageId: ThiefMessages.BLACK_FOG },
        timestamp: Date.now(),
        narrate: true
      });

      // Remove stiletto and thief entity (carcass disappears in fog)
      if (stilettoId) {
        w.removeEntity(stilettoId);
      }
      w.removeEntity(thief.id);

      // Disable thief daemon permanently
      w.getDataStore().state[THIEF_DISABLED_KEY] = true;

      return events;
    }
  };

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
