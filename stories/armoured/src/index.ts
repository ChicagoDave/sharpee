/**
 * Armoured - A sample Sharpee story demonstrating trait composition.
 *
 * This story showcases the "Sharpee Way" of building equipment systems:
 * - Focused, single-responsibility traits (ArmorTrait, WeaponTrait, ValueTrait)
 * - Composition over inheritance (entities have traits, not class hierarchies)
 * - Type-safe data definitions (not positional tables)
 * - Factory functions for consistent entity creation
 *
 * Compare this to the Inform 7 approach:
 *   Armor is a kind of equipment. Armor is wearable. Armor has a number called AC.
 *
 * In Sharpee:
 *   armor.add(new WearableTrait());
 *   armor.add(new ArmorTrait({ armorClass: 15, slot: 'body' }));
 *
 * Both achieve the same result, but Sharpee provides:
 * - Compile-time type checking
 * - IDE autocomplete and refactoring
 * - Explicit composition (no hidden inheritance)
 * - Flexibility (spiked gauntlets can have ArmorTrait AND WeaponTrait)
 */

import { Story, StoryConfig } from '@sharpee/engine';
import { WorldModel, EntityType, IFEntity } from '@sharpee/world-model';
import { ActorTrait, IdentityTrait } from '@sharpee/world-model';

// Regions
import { createGuildHallRegion, GuildHallRoomIds } from './regions';

// Data
import { ALL_ARMOR, ALL_WEAPONS } from './data';

// Factories
import {
  createAllArmor,
  createAllWeapons,
  createPracticeDummy,
  createWeaponRack,
  createArmorStands,
  createWorkbench,
} from './factories';

// Traits
import { CombatantTrait } from './traits';

/**
 * The Armoured story implementation.
 */
class ArmouredStory implements Story {
  /**
   * Story configuration.
   */
  config: StoryConfig = {
    id: 'armoured',
    version: '0.1.0',
    title: 'Armoured',
    author: 'Sharpee Examples',
    description: 'A sample story demonstrating trait composition for equipment systems.',
    ifid: 'ARMOURED-SAMPLE-2026',
  };

  /**
   * Room IDs for reference after initialization.
   */
  private roomIds: GuildHallRoomIds | null = null;

  /**
   * Initialize the world with all entities.
   *
   * This is called by the engine before the game starts.
   * Here we create rooms, objects, and place everything.
   * Note: Player is created separately via createPlayer().
   */
  initializeWorld(world: WorldModel): void {
    // Create rooms
    this.roomIds = createGuildHallRegion(world);

    // Create scenery
    createWeaponRack(world, this.roomIds.armory);
    createArmorStands(world, this.roomIds.armory);
    createWorkbench(world, this.roomIds.armory);
    createPracticeDummy(world, this.roomIds.trainingYard);

    // Create all equipment in the armory
    createAllArmor(world, ALL_ARMOR, this.roomIds.armory);
    createAllWeapons(world, ALL_WEAPONS, this.roomIds.armory);
  }

  /**
   * Create the player entity.
   *
   * Called by the engine after initializeWorld.
   * The player is:
   * - An Actor (can perform actions)
   * - A Combatant (can engage in combat)
   */
  createPlayer(world: WorldModel): IFEntity {
    const player = world.createEntity('player', EntityType.ACTOR);

    player.add(
      new IdentityTrait({
        name: 'yourself',
        aliases: ['me', 'self'],
        description: 'A would-be adventurer, eager to prove yourself.',
      })
    );

    player.add(new ActorTrait());

    // Player is a combatant with modest starting stats
    player.add(
      new CombatantTrait({
        maxHealth: 20,
        currentHealth: 20,
        baseArmorClass: 10, // Unarmored
        attackBonus: 2,
      })
    );

    // Place player in the entrance hall
    if (this.roomIds) {
      world.moveEntity(player.id, this.roomIds.entranceHall);
    }

    return player;
  }
}

/**
 * Export the story instance.
 */
export const story = new ArmouredStory();
export default story;

// Re-export traits for external use
export * from './traits';
export * from './data';
