/**
 * Game data definitions for the Armoured sample story.
 *
 * This demonstrates the Sharpee approach to data:
 * - Typed TypeScript objects (not positional tables)
 * - IDE support for autocomplete and refactoring
 * - Compile-time validation
 * - Can be loaded from JSON/YAML if desired
 */

export { BODY_ARMOR, SHIELDS, ALL_ARMOR } from './armor-data';
export type { ArmorDefinition } from './armor-data';

export { MELEE_WEAPONS, RANGED_WEAPONS, ALL_WEAPONS } from './weapon-data';
export type { WeaponDefinition } from './weapon-data';
