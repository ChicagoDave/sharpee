# Plan: ADR-289 — Chord routing is decided once

**ADR**: `docs/architecture/adrs/adr-289-chord-routing-decided-once.md` (ACCEPTED, D1–D10, 23 acceptance criteria)
**Packages touched**: `packages/chord`, `packages/story-loader` (+ `version.ts`, docs close-out)
**Platform change**: approved in principle by the ADR's acceptance; confirm before each phase that touches `packages/`.
**Reviewed**: `/devarch:plan-review` 2026-07-29 — 1 CONTRADICTION + 6 TENSIONs, all folded (see "Review findings folded" below).

## References consulted

- ADR-289 (this plan's source) — D1–D10, Acceptance 1–23, Consequences
- ADR-276 — two-layer gate pattern (compile gate + loader backstop); its `loader.ts` LoadError census (50) must be re-audited; its corpus gate is the precedent for verifying new compile gates
- ADR-275 D6 — "refuse when arm" wording; D3 must not disturb it (AC11)
- ADR-257 D2/D3/D5 — versioning rule, the language-version/IR-format split, and the `chord.ebnf` surface pin; needs the fourth-departure cross-note
- ADR-278 — Relations; keeps its `3.0.0`/`5.0.0` reservation, needs an "additive syntax = minor" note
- ADR-228 — the validate/mutations/reports partition D1 hardens; its standing rule that observable-ordering changes need transcript coverage
- ADR-264 — counters; the seeding path D4 extends (D1: "each entity instance carries its own value" — the player is an entity)

## Phase ordering rationale

D9 requires the harness be written **failing, first, before any fix** — and admits no
exception, so nothing precedes it, including D7. The NUL-byte fix lands immediately
after, as its own commit, because `runtime.ts` is invisible to grep today and every
later phase reads that file.

---

## Phase 1 — The failing harness, then unblock search (D9, D7) — Small

**Entry**: none.
**Work**, strictly in this order, two commits:
1. New two-pass golden harness: every statement construct through an interceptor body,
   asserting the mutations pass and the reports pass agree on routing. Committed **red**,
   failing against H1's `cycling` case. No production code touched in this commit.
2. `runtime.ts:304` — literal NULs → `' '`. Semantics unchanged.

**Exit**: harness exists and fails on the cycling case (commit 1);
`grep -c decideStrategy packages/story-loader/src/runtime.ts` is non-zero (commit 2, AC16);
no routing code changed.
**Covers**: AC16, AC19 (surface established).

## Phase 2 — D1: one decision record, resolved pre-mutation — Large

**Entry**: Phase 1 harness red.
**Work** (revised mid-phase — see "D1 amended" below):
- New `packages/story-loader/src/decisions.ts` — `RoutingDecision`, `DecisionRecord`,
  and a `DecisionLedger` with three modes: record (mutations pass), replay (reports
  pass), live (single-pass contexts and `each` bodies).
- `execStatements` resolves all five constructs through the ledger: `select-on` arm,
  `select-strategy` alternative, `ordinal` match, `each` match set, statement `when`.
- `decideStrategy` consumes its counter exactly once per firing, in the mutations pass.
- The `when` suffix is evaluated before the phase gate, so the mutations pass decides
  and records the suffix of a report-only statement at its position.
- `snapshotDecisions` is deleted, not extended. Single-pass sites record nothing.
- Correct the wrong comment at `runtime.ts:1594-1597`.
- `each` bodies run under a live ledger in both passes — the caveat stays, and becomes
  load-bearing rather than incidental.

**D1 amended (2026-07-29).** The first implementation followed D1's letter — a
pre-mutation snapshot taken at `postValidate` — and regressed `stories/fernhill`
495/495 → 116 failures. `change it to softened when it has the sherry bottle` is true
only after the standard action runs, which happens after validate. The amendment:
**the mutations pass is the decision pass**, each decision made at the statement's own
position. AC7 and fernhill are then the same rule, not opposing ones. Recorded in the
ADR as a D1 amendment.

**Exit**: harness green for all five constructs; reverting the snapshot for any one
construct turns it red again. **Plus a transcript gate** — D1 changes which text is
narrated (AC1), an observable-ordering change, so per ADR-228 §Consequences this phase
carries transcript coverage of a `cycling` select in an `on` clause and one
walkthrough-chain run. Do not defer the chain run to Phase 5.
**Covers**: AC1, AC2, AC7, AC19.

## Phase 3 — D2: compiler-assigned select ids, IR format 2 — Large

**Entry**: Phase 2 done (the counter is consumed once, so the key change lands on stable routing).
**Work**:
- Compiler assigns each select block `<owner-id>.<clause-index>.<statement-path>`;
  bare-digit shape reserved forever.
- Occurrence key → `chord.occurrence.select.<id>`; trait-clause selects key per composing entity.
- `IR_FORMAT` → `story language 2`.
- Loader backstop: id-less select inside `story language 2` IR → `LoadError` naming the
  compiler gate. No line-number fallback. **Place this throw in `loader.ts`**, alongside
  the existing format gate (`:254`) — ADR-276's census is `loader.ts`-scoped, and AC20's
  count only reaches 52 if this and D6's backstop both live there.
- Sweep `/^chord\.occurrence\.select\.\d+$/` **only** — never a `chord.occurrence.select.*` glob.
  Runs on **load and restore**. `SAVE_FORMAT_VERSION` unchanged, no migration reader.

**Exit**: old saves restore clean with selects at first alternative and no bare-digit keys
surviving; new saves round-trip counters intact.
**Covers**: AC3, AC4, AC5, AC6.
**Open**: the concrete resolution of `clause-index` and `statement-path` is pinned at the
top of this phase, before anything is built on it.
**Noted tension** (does not change the work): ADR-289 D2 says the Chord *language* version
does not move for this IR break, while ADR-257 D3 says an IR break "is at least a language
minor." The net version is 2.2.0 either way via D10, so the outcome is unaffected — but if
Phase 6 ever ships without D10, revisit this.

## Phase 4 — D3 refusal gate + D10 open-condition vocabulary (analyzer) — Medium

**Entry**: Phase 2 done (D3's per-arm `{mutated}` branching mirrors D1's arm model).
**Work**:
- `checkPhaseOrder` counts `raise`/`lower` as mutations.
- `{mutated}` branched per `select-on` arm and per `select-strategy` alternative.
- Refusal outside the leading validate partition — after any non-refusal statement, or
  nested in any routing block — is a spanned **error** naming where it must move.
- Parser's `after`-clause refusal ban gets the same descent (`blockKeyword` currently
  replaced when descending into `select`/`ordinal`).
- D10: an unbound subject validates against the union of every trait/entity-declared state;
  nearest-match suggestion draws from the union. Analyzer-gate change only —
  `symbolHolds` (`evaluator.ts:251`) already resolves per candidate.

**Exit**: dead refusals are compile errors; arm-two refusals are not falsely accused;
ADR-275 D6's fail-open behavior is unchanged and pinned by a test.
**Covers**: AC8, AC9, AC10, AC11, AC17, AC18.

## Phase 5 — D4 player parity + D5 registerUnique + D6 exit gate — Medium

**Entry**: Phase 4 done (D5/D6 are gates in the same analyzer surface).
**Work**:
- D4: seed `states[0]` and per-entity counter `starts` for the player (ADR-264 D1 — the
  player is an entity and the omission is not a design). Placement unifies by **deleting**
  two special cases — `loader.ts:416` drops `!== 'starts-in'`, `finalizePlayer`
  (`:645-648`) drops `=== 'starts-in'`; first-declared-room fallback kept only for a
  player with no placement line. No analyzer gate either way.
- D5: one `registerUnique(namespace, name, span, code)` replaces seven hand-rolled
  duplicate gates; `define action` and `define trait` register through it.
- D6: exits on non-room entities are an analyzer error, with a loader defensive throw
  (ADR-276 two-layer). **The throw goes in `loader.ts`** — see Phase 3's note on AC20's
  count. Blocked and deadly exits ride the same gate.

**Exit**: ACs below pass, and the **full ADR-276 corpus** stays green — dungeo units +
walkthrough chain, cloak, fernhill, friendly-zoo, nautical, acceptance stories. ADR-289
names only Dungeo and the zoo tutorial; ADR-276 is the precedent this ADR follows for
shipping new compile gates as a minor, and D3/D5/D6 are strictly stricter gates, so the
wider corpus is the honest bar. D4 is the only decision here that changes stories that
compile today.
**Covers**: AC12, AC13, AC14, AC15.

## Phase 6 — D8 disposition, version bump, cross-ADR close-out — Medium

**Entry**: Phases 2–5 done.
**Work**:
- D8 shipping items: L1 (`recoverToTopLevel` missing `extend`/`remove`), L2 (`lex()` comment
  drift), L5 (trait double-add guards in `applyTraitAdjectives`), L7 (hunger duplicate band
  ids / `fatal` rung), L8 (`registerPresentEntries` gate for a room owner),
  `Evaluator.isWithin` visited-set guard.
- `isStatementLine` misparse diagnostic gains the second line naming both remedies
  (capitalize or quote). Heuristic itself unchanged.
- `version.ts` version-history table (landing history → public versions). **It must
  disambiguate `2.2.0` as well as `2.0.0`/`2.1.0`** — `version.ts:51-53` already spends
  `2.2.0` on the ADR-267 D11 typed-slots landing, so the number this work assigns is the
  third double-used one, not the first. ADR-289 D8 names only the first two.
- `CHORD_LANGUAGE_VERSION` → `2.2.0`; entry names the four breaking gates (D3, D5, D6,
  plus D2's required id) and records the fourth departure from ADR-257 D2's letter.
- **`packages/chord/tests/language-version.test.ts`: update `PINNED.languageVersion` to
  `'2.2.0'` and leave `PINNED.ebnfSha256` untouched.** The test asserts
  `CHORD_LANGUAGE_VERSION === PINNED.languageVersion` against a hard-coded literal
  (`:22-28`), so AC23 cannot pass on the version bump alone. `chord.ebnf` itself is
  unchanged — the hash stands, exactly as it did for 2.1.0.
- Sharpee lockstep → 4.3.0 (`tsf version`).
- ADR-276 census re-audit, addendum updated **in this commit**. Expected 50 → 52; confirm
  both new backstops landed in `loader.ts` (Phases 3 and 5) before recording the count.
  `evaluator.ts`'s 12 `LoadError` sites are outside the audited census and stay outside it.
- ADR-257 D2 cross-note; ADR-278 "relations are additive syntax, therefore a minor" note.

**Exit**: every review item is shipped, deferred, declined, or out of scope with none unrecorded.
**Covers**: AC20, AC21, AC22, AC23.

---

## Review findings folded (plan-review, 2026-07-29)

| Finding | Where folded |
| --- | --- |
| CONTRADICTION — D7 ahead of D9's harness | Phase 1 reordered: harness red first, D7 as commit 2 |
| Pin test hard-codes the language version | Phase 6 names the `PINNED.languageVersion` edit |
| `2.2.0` already used in landing history | Phase 6 requires the D8 table to disambiguate it |
| D1 changes narration with no transcript gate | Phase 2 exit gains transcript + chain coverage |
| Corpus gate narrower than ADR-276's precedent | Phase 5 exit widened to the full ADR-276 corpus |
| ADR-257 D3 "IR break is at least a minor" | Recorded as a noted tension in Phase 3 |
| 50 → 52 assumes both backstops in `loader.ts` | Placement pinned in Phases 3 and 5; confirmed in Phase 6 |

## Deferred by the ADR (do not implement here)

L3, L4, L6, L9; the non-null assertions and `as never` span casts; the table-driven
`parseCreate` dispatcher; `parseConfigSettings`/`parseEmitFields` folding; the four
monolith splits; `identity.ts` unification; the `Scope` named-builder replacement.
The `each`-body live-decision caveat (widening the key to `(statement, match)`).

## Risks

1. **D2's id derivation is the least specified decision.** `clause-index` and
   `statement-path` need a concrete rule that survives `import` splicing and trait
   composition — the exact thing the line-number key got wrong.
2. **D4 changes runtime behavior for currently-compiling stories.** The corpus run is the
   gate, not a nicety.
3. **The 2.2.0 bump is lockstep with a Sharpee 4.3.0 publish** — a release decision, not
   purely a code one. Confirm timing before Phase 6 lands.
4. `runtime.ts` (2196 lines), `loader.ts` (2542), `analyzer.ts` (4307), `parser.ts` (4616)
   are large; the ADR explicitly forbids splitting them as part of this work.
