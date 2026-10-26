/**
 * index.ts — the extension-manifest registry (ADR-215), compile-time side.
 *
 * Purpose: the closed set of trusted-extension vocabulary manifests the
 * analyzer resolves `use <name>` against. Growing this set is a grammar
 * change (chord-grammar-changes.md governance). The loader's trusted
 * runtime registry (@sharpee/story-loader) must carry exactly these names —
 * the manifest-conformance test asserts the two registries agree.
 *
 * Public interface: EXTENSION_MANIFESTS, manifestForAdjective; re-exports
 * the manifest types.
 * Owner context: @sharpee/chord (language frontend; browser-safe).
 */
import { CHAPTERS_MANIFEST } from './chapters.js';
import { COMBAT_MANIFEST } from './combat.js';
import { EXPANSES_MANIFEST } from './expanses.js';
import { SAILING_MANIFEST } from './sailing.js';
import { HUNGER_MANIFEST } from './hunger.js';
import { NPC_MANIFEST } from './npc.js';
import { SCORING_MANIFEST } from './scoring.js';
import { STATE_MACHINES_MANIFEST } from './state-machines.js';
import type { ExtensionManifest, ManifestAdjective } from './types.js';

export type { ExtensionManifest, ManifestAdjective, ManifestField } from './types.js';
export { CHAPTERS_MANIFEST } from './chapters.js';
export { COMBAT_MANIFEST } from './combat.js';
export { EXPANSES_MANIFEST } from './expanses.js';
export { SAILING_MANIFEST } from './sailing.js';
export { HUNGER_MANIFEST } from './hunger.js';
export { NPC_MANIFEST } from './npc.js';
export { SCORING_MANIFEST } from './scoring.js';
export { STATE_MACHINES_MANIFEST } from './state-machines.js';

/**
 * Name → manifest, for every extension the language knows. `use`-gated
 * manifests need their `use` line; `core: true` manifests (npc,
 * state-machines) are always admitted and refuse a `use` line.
 */
export const EXTENSION_MANIFESTS: ReadonlyMap<string, ExtensionManifest> = new Map(
  [CHAPTERS_MANIFEST, COMBAT_MANIFEST, EXPANSES_MANIFEST, HUNGER_MANIFEST, NPC_MANIFEST, SAILING_MANIFEST, SCORING_MANIFEST, STATE_MACHINES_MANIFEST].map((m) => [m.name, m]),
);

/** The manifest contributing a kind noun (`expanse`), or null for a core kind or an unknown word. */
export function manifestForKindNoun(word: string): ExtensionManifest | null {
  for (const manifest of EXTENSION_MANIFESTS.values()) {
    if (manifest.kindNouns?.includes(word)) return manifest;
  }
  return null;
}

/** The manifest contributing a movement type (`open`), or null for a base type or an unknown word. */
export function manifestForMovementType(word: string): ExtensionManifest | null {
  for (const manifest of EXTENSION_MANIFESTS.values()) {
    if (manifest.movementTypes?.includes(word)) return manifest;
  }
  return null;
}

/**
 * The manifest (and adjective entry) contributing a trait-adjective word,
 * or null when no extension owns the word.
 * @param word a composition adjective as written (`combatant`)
 */
export function manifestForAdjective(
  word: string,
): { manifest: ExtensionManifest; adjective: ManifestAdjective } | null {
  for (const manifest of EXTENSION_MANIFESTS.values()) {
    const adjective = manifest.traitAdjectives.find((a) => a.word === word);
    if (adjective) return { manifest, adjective };
  }
  return null;
}
