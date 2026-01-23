import { WorldModel, EntityType, IFEntity } from '@sharpee/world-model';
import { IdentityTrait, SceneryTrait } from '@sharpee/world-model';

import { CombatantTrait } from '../traits';

/**
 * Create the practice dummy in the training yard.
 *
 * The dummy is:
 * - Scenery: can't be taken
 * - Combatant: can be attacked (for practice)
 *
 * This shows how even non-equipment entities use trait composition.
 */
export function createPracticeDummy(
  world: WorldModel,
  locationId: string
): IFEntity {
  const dummy = world.createEntity('practice-dummy', EntityType.SCENERY);

  dummy.add(
    new IdentityTrait({
      name: 'practice dummy',
      aliases: ['dummy', 'training dummy', 'wooden dummy', 'target'],
      description:
        'A wooden post topped with a padded torso shape. ' +
        'Years of practice strikes have left it battered but functional. ' +
        'It stands ready to receive your attacks.',
    })
  );

  // Scenery: fixed in place, can't be taken
  dummy.add(new SceneryTrait());

  // Combatant: can be attacked (but doesn't fight back)
  dummy.add(
    new CombatantTrait({
      maxHealth: 100,
      currentHealth: 100,
      baseArmorClass: 5, // Easy to hit
      attackBonus: 0,
    })
  );

  world.moveEntity(dummy.id, locationId);

  return dummy;
}

/**
 * Create the weapon rack in the armory.
 */
export function createWeaponRack(
  world: WorldModel,
  locationId: string
): IFEntity {
  const rack = world.createEntity('weapon-rack', EntityType.SCENERY);

  rack.add(
    new IdentityTrait({
      name: 'weapon rack',
      aliases: ['rack', 'weapons rack', 'display'],
      description:
        'A sturdy wooden rack mounted on the wall, with slots and hooks ' +
        'designed to hold various weapons. Several weapons rest here, ' +
        'ready to be taken.',
    })
  );

  rack.add(new SceneryTrait());

  world.moveEntity(rack.id, locationId);

  return rack;
}

/**
 * Create the armor stands in the armory.
 */
export function createArmorStands(
  world: WorldModel,
  locationId: string
): IFEntity {
  const stands = world.createEntity('armor-stands', EntityType.SCENERY);

  stands.add(
    new IdentityTrait({
      name: 'armor stands',
      aliases: ['stands', 'armor display', 'mannequins'],
      description:
        'Wooden mannequins of various sizes display different types of armor. ' +
        'Each suit is carefully arranged to show off its construction.',
    })
  );

  stands.add(new SceneryTrait());

  world.moveEntity(stands.id, locationId);

  return stands;
}

/**
 * Create the workbench in the armory.
 */
export function createWorkbench(
  world: WorldModel,
  locationId: string
): IFEntity {
  const bench = world.createEntity('workbench', EntityType.SCENERY);

  bench.add(
    new IdentityTrait({
      name: 'workbench',
      aliases: ['bench', 'work bench', 'table'],
      description:
        'A heavy wooden workbench scarred with cuts and burns from years of use. ' +
        'Various tools hang from hooks above it: hammers, tongs, whetstones, ' +
        'and leather-working implements.',
    })
  );

  bench.add(new SceneryTrait());

  world.moveEntity(bench.id, locationId);

  return bench;
}
