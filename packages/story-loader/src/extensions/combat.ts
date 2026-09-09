/**
 * combat.ts — the `use combat` registry entry.
 *
 * World-side only: `registerBasicCombat` installs the combat interceptors
 * and resolvers on the world at load. The `combatant`/`weapon` adjectives
 * lower onto world-model traits through the registry's field-route table,
 * so this entry carries no IR-shaped construction of its own.
 *
 * Public interface: COMBAT_EXTENSION.
 * Owner context: @sharpee/story-loader (language-neutral IR consumer).
 *
 * References:
 * - ADR-215 — the trusted extension registry and the combat spelling.
 */
import { registerBasicCombat } from '@sharpee/ext-basic-combat';
import type { ExtensionRegistration } from '../extension-registry.js';

export const COMBAT_EXTENSION: ExtensionRegistration = {
  registerWorld: (world) => registerBasicCombat(world),
};
