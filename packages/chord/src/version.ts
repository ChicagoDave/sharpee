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
 *
 * **1.1.0 is a recorded one-time override of D2** (ADR-261 Consequences,
 * 2026-07-23). ADR-261 D4's `use scoring` gate stops previously-valid stories
 * from compiling, which D2 defines as a *major*; the owner ruled it ships as a
 * minor anyway rather than amending the rule or softening the gate. The next
 * construct that stops compiling is still a major unless someone rules
 * otherwise again — the exception is cross-noted at ADR-257 D2 so it is
 * discoverable from the rule.
 *
 * **1.2.0** adds the `, announce <mode>` suffix on a `use` line (ADR-262 D3) —
 * purely additive optional grammar, so a minor bump by D2's ordinary rule.
 *
 * **1.3.0** adds the `use hunger` body (ADR-263 D1): `grows N each turn`,
 * `<band> at <n> [says <key>]` rungs, and `fatal at N` — additive grammar, a
 * minor bump.
 *
 * **1.4.0** adds numeric counters (ADR-264): `define counter` / per-entity
 * `counter`, `raise`/`lower … by N`, and counter comparisons in conditions
 * (word `is at least`/… and symbolic `>=`/`<=`/`>`/`<`) — additive, a minor bump.
 *
 * **2.0.0** converges the slot spelling on `the <name>` (ADR-267 D1/D15,
 * landing group 1): `define verb`'s `(something)` parens and `define action`'s
 * `:slot` colon are removed — previously-valid syntax stops parsing
 * (`parse.removed-slot-spelling`), a major bump by D2's ordinary rule.
 *
 * **2.1.0** adds landing group 2 (ADR-267 D8/D9/D10): `or`-alternation in
 * patterns (one rule, never split), `[word]` optional elements, and the
 * `the <slot> takes the rest of the line` greedy-slot declarative line —
 * additive grammar, a minor bump.
 */
export const CHORD_LANGUAGE_VERSION = '2.1.0';
