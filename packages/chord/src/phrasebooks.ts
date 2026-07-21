/**
 * phrasebooks.ts — the packaged-phrasebook manifest registry (ADR-250 D3).
 *
 * Purpose: compile-time knowledge of the packaged phrasebooks a story may
 * `use` — name plus covered key list. This is the ADR-215
 * names-vs-mappings split applied to books: the manifest is DATA the
 * analyzer reads (so a key supplied only by a used book still passes the
 * missing-phrase gate), while the loader's data registry carries the
 * actual entries and is conformance-checked against these keys at load
 * (mismatch = LoadError). Initially empty — no books ship in this gate;
 * hosts and tests register through this seam.
 *
 * Public interface: PhrasebookManifest, PHRASEBOOK_REGISTRY.
 * Owner context: @sharpee/chord (language frontend; browser-safe).
 *
 * Invariants:
 * - Keys are story-namespace keys (single kebab-case words) — never
 *   dotted platform message IDs (ADR-250 D1, David 2026-07-21).
 */
export interface PhrasebookManifest {
  /** Single kebab-case book name (extension-name form). */
  name: string;
  /** Story-namespace keys the book covers — the book's documented surface. */
  keys: string[];
}

/** name → manifest. Mutable by design: hosts and tests register here. */
export const PHRASEBOOK_REGISTRY = new Map<string, PhrasebookManifest>();
