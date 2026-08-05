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
 *
 * **2.2.0** adds landing group 3 (ADR-267 D11): typed slots — `the <slot>
 * is an instrument` / `is a topic` declarative lines (the closed two-word
 * set; `.slotType()` emission) — additive grammar, a minor bump.
 *
 * **2.3.0** adds landing group 4 (ADR-267 D12, one design per D5): per-
 * pattern `means <key> <value>` static-default lines and the `directions`
 * block bound to the `direction` slot (alias × pattern expansion,
 * `direction: <canonical>` defaults, standalone bare forms) — additive
 * grammar, a minor bump.
 *
 * **2.4.0** adds the grammar file (ADR-269 D8): a `grammar "<name>"` top-level
 * header declaring a file that carries `define action` grammar surfaces only —
 * behavior lines and story declarations are analyzer errors; the two headers
 * are mutually exclusive. Additive grammar, a minor bump.
 *
 * **2.5.0** adds the author alteration blocks (ADR-270 D2/D3/D6):
 * `extend action <name>` (grammar surfaces added to an existing action, story
 * tier) and `remove from action <name>` (standard-grammar shapes removed at
 * load; unmatched shapes are load errors). Additive grammar, a minor bump.
 *
 * **3.0.0** removes `define verb` (ADR-270 D7): `extend action` subsumes it
 * generally, and the Phase A stub's consumption path was dead (it registered
 * vocabulary that produced no grammar rule). Previously-valid syntax stops
 * parsing (`parse.removed-define-verb` fix-it) — a major bump by D2's
 * ordinary rule.
 *
 * **2.0.0 (owner consolidation ruling, 2026-07-26, session 52a8f4)** — a
 * recorded override of the monotonic history above, the second after 1.1.0:
 * the language has not shipped publicly, and the ADR-266 grammar-parity
 * program's landings (the interim 2.0.0–2.5.0 minors and the 3.0.0
 * define-verb major, all within two days) are ONE author-visible language
 * revision, not seven. The public language version is therefore **2.0.0**:
 * Chord 1.x is the pre-parity language, Chord 2.0.0 is the language with the
 * grammar surface complete (slot spelling, alternation/optional/greedy,
 * typed slots, means/directions, grammar files, alterations; `define verb`
 * gone). The entries above stay as the true landing history; the numbers
 * they carried were internal. Ordinary D2 rules resume from 2.0.0 —
 * cross-noted at ADR-257 D2.
 *
 * **2.1.0 (owner ruling, 2026-07-27, session 834109)** — ships alongside
 * Sharpee 4.1.0. The grammar surface (`chord.ebnf`) is unchanged — the pin
 * hash stands — so this is not a D2 grammar minor; the author-visible
 * language-experience change it names is the ADR-276 source-authoritative
 * diagnostics arc: every source-derivable error is now a collected compile
 * diagnostic with a span (16-entry census migrated; loader sites are
 * backstops), surfaced identically by `compose`, `compose --json`
 * (ADR-258 D5), and the browser boot compile. Third recorded departure
 * from D2's letter (after 1.1.0 and the 2.0.0 consolidation) —
 * cross-noted at ADR-257 D2.
 *
 * **2.2.0 (owner ruling, 2026-07-29, ADR-289)** — ships alongside Sharpee
 * 4.3.0. The grammar surface (`chord.ebnf`) is unchanged — the pin hash
 * stands — so this is not a D2 grammar minor. It names **four breaking
 * compile gates**, each refusing a construct that compiled before:
 *   - **D3** — a refusal outside the leading validate partition (after a
 *     non-refusal statement, or nested in a routing block) is an error.
 *   - **D5** — a second `define action` or `define trait` of the same name
 *     is a duplicate-name error.
 *   - **D6** — an exit, blocked exit, or deadly exit on a non-room block is
 *     an error.
 *   - **D2** — IR claiming `story language 2` must carry a compiler-assigned
 *     select id; there is no line-number fallback.
 * Four breaking gates would be a MAJOR by D2's letter; the owner ruled they
 * ship as a minor. **Fourth recorded departure from D2's letter** (after
 * 1.1.0, the 2.0.0 consolidation, and 2.1.0) — cross-noted at ADR-257 D2.
 *
 * **3.0.0 (ADR-298, 2026-08-03)** — the fielded story block. A breaking
 * header-grammar change, a MAJOR by D2's ordinary rule:
 *   - positional `story "Title" by "Author"` removed (`parse.removed-story-header`);
 *   - closed per-field schema — `title:`/`authors:`/`testers:`/`ifid:`/`id:`/
 *     `story-version:`/`prologue:`/`description:`, plus ADR-252 D3's six
 *     client-config keys `client:`/`theme:`/`template:`/`themes:`/
 *     `default-theme:`/`storage-prefix:` (D4-A1 amendment, GH #221 — landed
 *     as an interim 3.1.0 minor, folded into 3.0.0 by the freeze ruling
 *     below); unknown keys are a parse error (`parse.header-unknown-field`);
 *     `version:`/`blurb:`/`by:` are removed spellings with fix-its;
 *   - `prologue:`/`description:` take literal prose or a bare phrase
 *     reference (a lone kebab atom is always a reference);
 *   - missing `ifid:` warns at compile (`analysis.missing-ifid`), hard-errors
 *     at publish (ADR-284).
 * ADR-278's 3.0.0 reservation was released by owner ruling (2026-08-03) —
 * see the note in that ADR; Relations anchors the next major if pursued.
 *
 * ---
 *
 * ## Landing history → public versions (ADR-289 D8 §3.5)
 *
 * Three numbers in the history above are spent twice — once as an interim
 * landing number during the ADR-266 grammar-parity program, once as a
 * consolidated public version. That is honest but reads as a contradiction,
 * so the mapping is written down rather than reconstructed:
 *
 * | Number  | As landing history (internal)              | As a public version        |
 * | ------- | ------------------------------------------ | -------------------------- |
 * | `2.0.0` | ADR-267 D1/D15 slot-spelling convergence   | The consolidated post-parity language (2026-07-26 ruling) |
 * | `2.1.0` | ADR-267 D8/D9/D10 landing group 2          | ADR-276 source-authoritative diagnostics (2026-07-27 ruling) |
 * | `2.2.0` | ADR-267 D11 typed slots (landing group 3)  | ADR-289's four breaking compile gates (2026-07-29 ruling) |
 *
 * `2.3.0`–`2.5.0` and the interim `3.0.0` are landing history only; they were
 * never public versions. The public line is `1.x` → `2.0.0` → `2.1.0` →
 * `2.2.0` → `3.0.0` (ADR-298 — the interim landing `3.0.0` is history, the
 * public `3.0.0` is the fielded story block incl. the D4-A1 client-config
 * keys; ADR-278's reservation of the number was released 2026-08-03).
 *
 * **3.0.0 freeze (owner ruling, 2026-08-03, session f382ed)** — the interim
 * `3.1.0` (D4-A1's client-config keys, briefly public earlier the same day)
 * is folded back into `3.0.0`: nothing at 3.x has been published, so the
 * additive keys ship inside the major rather than as a separate minor —
 * the same consolidation species as the 2.0.0 ruling. The language is
 * **frozen at 3.0.0**. Package versioning is a separate track: the
 * `@sharpee/*` packages version in lockstep (currently 4.3.0; the next npm
 * publish is 4.4.0, continuing the 4.x line through the IDE work) and move
 * to **5.0.0** when the owner cuts the release — `5.0.0` is no longer
 * Relations-reserved (Relations renumbers when it lands; ADR-278 note).
 * Cross-noted at ADR-257 D2.
 *
 * **ADR-300 D10 folds into the freeze (2026-08-05, session 86e85a)** — the
 * `record` channel construct with `list of` members is additive grammar,
 * which D2 would ordinarily make a minor. It ships inside `3.0.0` under the
 * ruling above rather than as `3.1.0`: nothing at 3.x is published, so there
 * is no released surface a minor would distinguish, and re-minting the number
 * the freeze just retired would only re-create the confusion it settled. Only
 * `chord.ebnf` and its recorded hash move. **The next additive construct after
 * a 3.x publish takes an ordinary minor by D2** — the freeze is a
 * nothing-published exception, not a standing suspension of the rule.
 */
export const CHORD_LANGUAGE_VERSION = '3.0.0';
