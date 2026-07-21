/**
 * phrasebook-data.ts — the packaged-phrasebook DATA registry (ADR-250 D3).
 *
 * Purpose: load-time entries for `use phrasebook` books — the data half of
 * the ADR-215-style names-vs-mappings split. The compile-time manifest
 * (name + key list) lives in @sharpee/chord's PHRASEBOOK_REGISTRY; at
 * bind, each used book must be present HERE and its entry keys must equal
 * the manifest keys (conformance — LoadError on mismatch). Initially
 * empty: no books ship in this gate; hosts and tests register through
 * this seam.
 *
 * Public interface: PhrasebookData, PHRASEBOOK_DATA.
 * Owner context: @sharpee/story-loader.
 *
 * Invariants:
 * - Entry keys are story-namespace keys (never dotted platform IDs) —
 *   validated at bind, since packaged data never went through the story
 *   compiler's gates.
 */
import type { IRPhrase } from '@sharpee/chord';

/** One packaged book's entries (pure DATA — a book is never code). */
export interface PhrasebookData {
  entries: Record<string, IRPhrase>;
}

/** name → packaged entries. Mutable by design: hosts and tests register here. */
export const PHRASEBOOK_DATA = new Map<string, PhrasebookData>();
