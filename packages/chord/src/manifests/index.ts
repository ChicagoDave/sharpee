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
import { COMBAT_MANIFEST } from './combat';
import { NPC_MANIFEST } from './npc';
import { STATE_MACHINES_MANIFEST } from './state-machines';
import type { ExtensionManifest, ManifestAdjective } from './types';

export type { ExtensionManifest, ManifestAdjective, ManifestField } from './types';
export { COMBAT_MANIFEST } from './combat';
export { NPC_MANIFEST } from './npc';
export { STATE_MACHINES_MANIFEST } from './state-machines';

/**
 * Name → manifest, for every extension the language knows. `use`-gated
 * manifests need their `use` line; `core: true` manifests (npc) are always
 * admitted and refuse a `use` line.
 */
export const EXTENSION_MANIFESTS: ReadonlyMap<string, ExtensionManifest> = new Map(
  [COMBAT_MANIFEST, NPC_MANIFEST, STATE_MACHINES_MANIFEST].map((m) => [m.name, m]),
);

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
