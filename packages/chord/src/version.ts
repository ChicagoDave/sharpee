/**
 * version.ts — the Chord LANGUAGE version (ADR-257).
 *
 * Chord the language carries its own semantic version, **independent of the
 * `@sharpee/*` lockstep** package version: the `@sharpee/chord` npm package
 * rides the platform release train (3.x), while this tracks *the language* and
 * moves only when the author-visible surface changes.
 *
 * Hand-maintained — **not** stamped by the release tooling (`tsf version` /
 * repokit `stampVersions`). Bumped on semver rules (ADR-257 D2): a new construct
 * or additive syntax → **minor**; a removed/renamed construct or a syntax an
 * existing story relied on that no longer parses → **major**; a spec/doc
 * correction with no grammar change → **patch**. Compiler bug fixes, IR-shape
 * refactors, and platform releases do NOT bump it.
 *
 * Distinct from `IR_FORMAT` (ir.ts) — the loader's wire-compat gate. The two move
 * on different triggers (ADR-257 D3): a purely additive language feature bumps
 * this version without touching the format. The `chord.ebnf` surface pin
 * (`tests/language-version.test.ts`, ADR-257 D5) fails the build if the grammar
 * changes without a bump here.
 */
export const CHORD_LANGUAGE_VERSION = '1.0.0';
