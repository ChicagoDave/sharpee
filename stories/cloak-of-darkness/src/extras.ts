/**
 * extras.ts — TS escape hatch for cloak.story (ADR-210 §5.6).
 *
 * Bound by `define text garbled from "./extras.ts"`: the loader binds the
 * named export to the `{garbled}` marker in the `message-trampled` phrase.
 * Deterministic on purpose — the golden transcript gate (AC-1) and seeded
 * replay (AC-5) require byte-identical output across runs.
 *
 * Public interface: garbled (a PhraseProducer, ADR-196).
 * Owner context: @sharpee/story-cloak-of-darkness (story content).
 */
import type { PhraseProducer } from '@sharpee/if-domain';

/** The winning message half-trampled into the sawdust. */
export const garbled: PhraseProducer = () => ({
  kind: 'literal',
  text: 'Y.u h..e w.n',
});
