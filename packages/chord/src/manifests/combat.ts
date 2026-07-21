/**
 * combat.ts — the `use combat` vocabulary manifest (ADR-215).
 *
 * Purpose: the NAMES half of the names-vs-mappings split — the words and
 * typed `with`-fields the `combat` extension contributes to the composable
 * catalog when a story declares `use combat`. Pure data, zero platform
 * imports (the analyzer consumes it; the browser-safe boundary holds).
 * The adjective→trait field routing (the mappings half) lives in
 * @sharpee/story-loader; a conformance test there pins the two together.
 *
 * Public interface: COMBAT_MANIFEST.
 * Owner context: @sharpee/chord (language frontend; browser-safe).
 */
import type { ExtensionManifest } from './types.js';

export const COMBAT_MANIFEST: ExtensionManifest = {
  name: 'combat',
  traitAdjectives: [
    {
      word: 'combatant',
      fields: [
        // health/max-health route to the required HealthTrait (ADR-226 —
        // life-state lives there, not on CombatantTrait); the rest are
        // CombatantTrait stats. Routing is the loader's business.
        { key: 'health', valueKind: 'number' },
        { key: 'max-health', valueKind: 'number' },
        { key: 'skill', valueKind: 'number' },
        { key: 'base-damage', valueKind: 'number' },
        { key: 'armor', valueKind: 'number' },
        { key: 'attack-power', valueKind: 'number' },
        { key: 'defense', valueKind: 'number' },
        { key: 'experience-value', valueKind: 'number' },
        { key: 'hostile', valueKind: 'word' },
        { key: 'can-retaliate', valueKind: 'word' },
        { key: 'drops-inventory', valueKind: 'word' },
        { key: 'is-undead', valueKind: 'word' },
      ],
    },
    {
      word: 'weapon',
      fields: [
        { key: 'damage', valueKind: 'number' },
        { key: 'skill-bonus', valueKind: 'number' },
        { key: 'is-blessed', valueKind: 'word' },
        { key: 'glows-near-danger', valueKind: 'word' },
      ],
    },
  ],
};
