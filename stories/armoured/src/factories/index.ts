/**
 * Entity factories for the Armoured sample story.
 *
 * Factories encapsulate entity creation, ensuring consistent
 * trait composition across the codebase.
 */

export {
  createArmor,
  createWeapon,
  createAllArmor,
  createAllWeapons,
} from './equipment-factory';

export {
  createPracticeDummy,
  createWeaponRack,
  createArmorStands,
  createWorkbench,
} from './scenery-factory';
