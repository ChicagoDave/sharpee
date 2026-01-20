/**
 * Custom traits for the Armoured sample story.
 *
 * These traits demonstrate the Sharpee composition pattern:
 * - Each trait is focused on a single responsibility
 * - Entities compose multiple traits as needed
 * - No inheritance hierarchy - a sword can be both WeaponTrait and ValueTrait
 */

export { ArmorTrait } from './armor-trait';
export type { ArmorSlot } from './armor-trait';

export { WeaponTrait } from './weapon-trait';
export type { WeaponCategory, DamageType } from './weapon-trait';

export { ValueTrait } from './value-trait';

export { CombatantTrait } from './combatant-trait';
