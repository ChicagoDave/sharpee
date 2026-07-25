# Session Plan: Implement ADR-271 (Chord grammar compiler pass-through and defects)

**Created**: 2026-07-25
**Overall scope**: Wire the Chord grammar compiler's dropped scope-constraint pipeline into a closed,
validated requirement-word set (D1); make constraints reach the parser via `.where()` (D2); give
`if-domain`'s `ActionGrammarBuilder` an action-centric `fullPattern()` emission path (D3); narrow the
`define verb` docs to the Phase A capability and back it with a docs-examples-load test (D4/D5); and
verify the five live constraint lines in `fernhill`/`friendly-zoo` change behavior as intended (D6).
Scope is exactly ADR-271's D1–D6 / acceptance 1–6 — ADR-267/268/269/270/272 are out of scope.
**Bounded contexts touched**: N/A — this is compiler/platform engineering (parser → analyzer → IR →
loader → grammar engine), not domain business logic. No `docs/ddd/notation.yaml` exists in this
project. Phase names below use the codebase's own precise vocabulary (requirement words, IR,
`ActionGrammarBuilder`, `forAction`, `.where()`) because that vocabulary is exact, not because DDD
framing applies.
**Key domain language**: N/A (see above) — technical vocabulary only: requirement word, scope
constraint, `ActionGrammarBuilder.fullPattern()`, registered `GrammarRule`, action-centric emission.

## References consulted
- `docs/architecture/adrs/adr-271-chord-grammar-compiler-pass-through.md` — ACCEPTED (14/14 READY), the source of this plan's D1–D6 decisions and acceptance items 1–6; scope boundary is exactly this ADR.
- `docs/architecture/adrs/adr-266-grammar-definition-parity.md` — umbrella; D14 sequencing puts ADR-271 first and independent of direction (iv); accepting the umbrella authorizes no code directly, only its named children.
- `/Users/david/repos/sharpee_v2/CLAUDE.md` — never auto-retry failed builds/tests (report and wait); platform changes (`packages/`) require prior discussion (satisfied here — ADR-271 is the discussion record); use `./repokit build` and `dist/cli/sharpee.js --test --chain`; don't modify working transcripts; never delete files without confirmation; `pnpm --filter '@sharpee/<pkg>' test <name>` (no `2>&1`).
- `docs/context/project-profile.md` — chord package test convention: assert on IR shape and specific diagnostic codes/spans, never "parse succeeded" alone; one-good-run rule for transcript suites (RNG flakes in combat/thief are not regressions, scope-constraint refusals are).
- `docs/context/session-20260725-1633-main.md` — most recent session wrote ADR-271 itself (DRAFT → now ACCEPTED per this session); its "Next steps" named exactly this implementation phase as what comes next, confirming no other in-flight work conflicts with this plan.

## Phase independence note

Phases 1 (D1), 2 (D3), and 5 (D4/D5) touch disjoint code (chord package, if-domain package, and
docs/loader-message respectively) and have **no dependency on each other** — they could run in any
order. Phase 3 (D2, the loader rewrite) depends on both Phase 1's requirement table and Phase 2's
`fullPattern()` existing. Phase 4 (D6 regression) depends on Phase 3's emission being live. The
sequence below runs 1 → 2 → 3 → 4 → 5 for a clean single-threaded session chain, but Phase 5 may be
pulled earlier or run in parallel with 1–4 without changing its content.

## Phases

### Phase 1: Closed requirement-word set (D1)
- **Tier**: Small
- **Budget**: 100
- **Domain focus**: `packages/chord` — parser hint, analyzer validation, exported requirement table
- **Entry state**: ADR-271 ACCEPTED. `packages/chord` builds clean on main. No prior changes to
  `parser.ts`, `analyzer.ts`, or `ir.ts` in this work.
- **Deliverable**:
  - A single exported table in the chord package: `{reachable: 'touchable', visible: 'visible', held: 'carried'}` (name TBD by implementer, e.g. `REQUIREMENT_PREDICATES`), owned once, no duplication.
  - Analyzer (`analyzer.ts` ~1242-1250) validates the requirement word against the table's keys; an unsupported word produces a new diagnostic `analysis.unknown-requirement` naming the offending word and listing the supported set, with a did-you-mean/fix-it suggestion (reuse the analyzer's existing suggestion mechanism if one exists).
  - Parser hint at `parser.ts:2452` rewritten to enumerate the actual set (`reachable`, `visible`, `held`) instead of the current vague hint.
  - Unit tests in the chord package asserting: (a) `analysis.unknown-requirement` fires with the correct code/word/span for an unsupported word (e.g. `the animal must be purple`), per project-profile convention — assert on diagnostic code and message content, not just "an error occurred"; (b) all three supported words (`reachable`, `visible`, `held`) continue to parse and analyze without diagnostics, with `IRActionDef.constraints` carrying the correct `{slot, requirement}` shape.
- **Exit state**: Chord package exports the requirement table; `analysis.unknown-requirement` is a real diagnostic covered by tests; the three supported words round-trip through parse→analyze→IR unchanged; `pnpm --filter '@sharpee/chord' test` green.
- **Acceptance coverage**: Acceptance item 2 (unsupported requirement word is a compile error, not a silent no-op).
- **Test gate**: `pnpm --filter '@sharpee/chord' test <name>` — new tests must assert on diagnostic code/span per project-profile chord conventions, not merely "no diagnostics."
- **Status**: DONE (2026-07-25 — `SCOPE_REQUIREMENT_PREDICATES` in catalog.ts, analyzer gate + typed IR, parser hint dynamic; tests/scope-requirements.test.ts 8/8; full chord suite 545/545)

### Phase 2: `ActionGrammarBuilder.fullPattern()` (D3, if-domain half)
- **Tier**: Small
- **Budget**: 100
- **Domain focus**: `packages/if-domain` — `ActionGrammarBuilder` interface and `GrammarEngine` emission
- **Entry state**: ADR-271 ACCEPTED. `packages/if-domain` builds clean. Independent of Phase 1 (different package, no shared files) — may run before, after, or interleaved with Phase 1.
- **Deliverable**:
  - Additive method on `ActionGrammarBuilder` (`grammar-builder.ts:332-416`): `fullPattern(pattern: string): ActionGrammarBuilder` — a complete pattern line, verb included, **not** crossed with `verbs()`.
  - `build()` in `grammar-engine.ts` (~291-432) emits `fullPattern()`-registered lines as their own `GrammarRule`s, with the action's shared configuration (`.where()` constraints, priority) applied to each emitted rule individually — no verb × template cross-product for these lines.
  - Unit tests in if-domain asserting the **registered rule shape**: a `fullPattern()` line plus a `.where()` constraint plus a priority produces a `GrammarRule` with all three attached correctly; multiple `fullPattern()` calls under one `forAction()` share the same action id.
- **Exit state**: `fullPattern()` exists on the builder interface and is implemented; if-domain test suite asserts on registered `GrammarRule` shape (not just that `build()` runs without throwing); `pnpm --filter '@sharpee/if-domain' test` green.
- **Acceptance coverage**: Acceptance item 3, if-domain half (the emission primitive the loader will consume in Phase 3 to complete this item).
- **Test gate**: `pnpm --filter '@sharpee/if-domain' test <name>`
- **Status**: DONE (2026-07-25 — `fullPattern()` interface + engine emission; slot-scoped config attaches only to lines carrying the slot; 5 new shape tests; if-domain suite 95/95)

### Phase 3: Loader emission rewrite (D2, and D3's loader half)
- **Tier**: Medium
- **Budget**: 250
- **Domain focus**: `packages/story-loader` — `extendParser` (`loader.ts:1102-1137`)
- **Entry state**: Phase 1 done (requirement table + exhaustive validation exist in chord). Phase 2
  done (`fullPattern()` exists in if-domain and is exported). `story-loader` currently depends on
  chord's IR and if-domain's `GrammarBuilder` — both are now ready to consume for real.
- **Deliverable**:
  - `extendParser` rewritten: one `forAction('chord.action.<name>')` call per `define action`.
  - Each `define action`'s grammar lines emitted via `.fullPattern()` at priority 150 (replacing the current flattened `.define(text).mapsTo(id).withPriority(150)` chain).
  - Bare-verb prefix rules stay at priority 140, unchanged, and carry no `.where()` constraint (the `refuse without` arm already owns the no-target case — D2 is explicit that these rules take no constraint).
  - `.where(slot, scope => scope.<predicate>())` attached once per constrained slot, applied to every emitted rule of that action carrying the slot, built from Phase 1's exhaustive requirement→predicate map. The switch/map carries a `never` check so an unmapped requirement word is a **type error**, not a silent gap.
  - The narrowed structural cast at `loader.ts:1103-1107` (declaring only `define`/`mapsTo`/`withPriority`) is retired in favor of the real `GrammarBuilder` surface.
  - Unit tests in story-loader asserting the registered rule set's shape end-to-end for a multi-pattern, multi-constraint `define action`: shared action id across all its rules, `.where()` present on the correct slots of every slotted rule, priorities 150/140 correctly split — not merely that the verbs parse.
- **Exit state**: `extendParser` no longer uses the narrowed cast; a `define action` with several grammar lines and a `the <slot> must be <requirement>` constraint produces one `forAction()` block whose rules carry the constraint; `pnpm --filter '@sharpee/story-loader' test` green. No platform build yet required — that's Phase 4.
- **Acceptance coverage**: Acceptance item 3 (full — registered rule shape, loader side) and the emission half of acceptance item 1 (constraints now reach the parser as `.where()`; the runtime refusal proof is Phase 4).
- **Test gate**: `pnpm --filter '@sharpee/story-loader' test <name>`
- **Status**: DONE (2026-07-25 — forAction/fullPattern emission + applyScopePredicate never-check; real-engine
  test harness (`tests/helpers/grammar-harness.ts`) replaces the mocked builder chain; story-loader suite
  380/380; one build fix: explicit ScopeBuilder annotation on the where() callback)

### Phase 4: Regression verification and refusal proof (D6, acceptance 1)
- **Tier**: Medium
- **Budget**: 200
- **Domain focus**: Platform build + `fernhill`/`friendly-zoo` transcript suites — the five live
  constraint lines (`fernhill` ×3: `creature`, `target` ×2; `friendly-zoo` ×2: `animal`)
- **Entry state**: Phase 3 done — loader emits `.where()`-gated rules for real. No platform build has
  run yet against the new emission path.
- **Deliverable**:
  - `./repokit build` (full platform rebuild — the new chord/if-domain/story-loader code must be in
    the bundle before transcript testing; per CLAUDE.md, always use `dist/cli/sharpee.js` for
    transcript testing, never the package-loaded path).
  - Run the `fernhill` and `friendly-zoo` transcript suites via
    `node dist/cli/sharpee.js --test --chain stories/fernhill/walkthroughs/wt-*.transcript` and the
    equivalent for `friendly-zoo` (plus each story's `tests/transcripts/*.transcript` unit-style
    tests).
  - Review every diff individually — **never batch-accept**. An unexpected new refusal is a finding
    to surface to the owner (no-get-it-done-assumptions), not something to accommodate by loosening
    a predicate or editing a transcript to route around it.
  - Add a new transcript test (unit-style, under `tests/transcripts/`) demonstrating acceptance
    item 1 directly: a command that previously resolved despite failing the taught scope constraint
    now gets refused by the parser.
- **Exit state**: Both suites pass (or every diff has been reviewed and is either an accepted,
  by-design refusal per D6, or has been escalated to the owner and resolved before this phase closes).
  New transcript test committed and green. If a build or transcript run fails unexpectedly: **report
  and wait** — do not loop fix→rebuild→retest without explicit go-ahead (CLAUDE.md MAJOR DIRECTIONS).
- **Acceptance coverage**: Acceptance item 1 (parse-time gating demonstrated by transcript) and
  acceptance item 6 (both suites pass, behavior changes individually reviewed).
- **Test gate**: `node dist/cli/sharpee.js --test --chain stories/fernhill/walkthroughs/wt-*.transcript`
  and the `friendly-zoo` equivalent, plus the new unit transcript.
- **Status**: DONE (2026-07-25) — via ADR-273 (see `docs/work/scope-reachability/plan.md`, all 4
  phases DONE): ReachabilityBehavior in world-model, stdlib delegation, resolver rewrite + article
  handling. Regression: fernhill 18/18 unit transcripts + wt 76/76, friendly-zoo 71+5/76 + wt 56/56,
  all diffs reviewed (none unexpected; cellar-dark passed as-is). Refusal proof committed:
  `stories/friendly-zoo/tests/transcripts/scope-constraint-gating.transcript` (5/5 — goats refused
  from the entrance with and without article, dispatched in the Petting Zoo). ADR-271 acceptance
  items 1 and 6 discharged. Transcript-format note: headers are bare `key: value` lines closed by
  ONE `---`; a leading `---` silently kills the header.

### Phase 5: `define verb` docs narrowing + docs-examples-load test (D4, D5)
- **Tier**: Small
- **Budget**: 100
- **Domain focus**: `website/.../vocabulary/define-verb/content.mdx`,
  `website/.../vocabulary/define-action/content.mdx`, and `loader.ts`'s `toVocabularyVerb` `LoadError`
  message. Independent of Phases 1–4 (no shared code path with the constraint pipeline) — may be
  pulled earlier or run in parallel.
- **Entry state**: ADR-271 ACCEPTED, Q-10 resolved by owner ruling (narrow the docs — already recorded
  in the ADR). No dependency on Phases 1–4's completion.
- **Deliverable**:
  - `define-verb/content.mdx` rewritten: remove the `sniff means smell (something)` example (it fails
    to load); keep the `hang or hook means put (something) on (something)` example (works,
    `cloak.story:82`); state plainly that Phase A maps only onto the two-slot prepositional
    `put … on …` pattern; add a forward note that general aliasing arrives with ADR-270's alteration
    model.
  - `loader.ts`'s `toVocabularyVerb` `LoadError` message updated to name the same Phase A limit, in the
    same words as the docs page (acceptance item 5's "same words" requirement).
  - New story-loader test (`docs-examples-load` or similar): reads both `content.mdx` files' ` ```chord `
    fences from the repo at test time, wraps each fence in a minimal story harness (story header, one
    room, player), and asserts every fence loads. Lands in this same phase/commit as the docs edit —
    against the current (pre-edit) page it must fail on the `sniff` fence, proving the test catches
    what D4 fixes.
  - Do **not** edit `define-action/content.mdx`'s enforcement claim (lines ~38-39) — Phase 3/4 makes
    that claim true; the page is already correct and needs no docs change, only test coverage.
- **Exit state**: Both pages' example fences load via the harness test; `LoadError` message and docs
  page state the same Phase A limit in the same words; `pnpm --filter '@sharpee/story-loader' test
  docs-examples-load` green.
- **Acceptance coverage**: Acceptance item 4 (no published example fails to load, verified by test)
  and acceptance item 5 (docs and `LoadError` agree on the same limit).
- **Test gate**: `pnpm --filter '@sharpee/story-loader' test docs-examples-load`
- **Status**: DONE (2026-07-25 — test written FIRST and shown to fail on the sniff fence pre-edit;
  page rewritten (hang/hook kept, sniff removed, limit stated, forward note to the grammar work);
  LoadError states the identical limit sentence (acceptance 5); harness includes `use scoring`
  (ADR-261 D4 gate — the petting example's `score` lines presuppose it, a legitimate story-config
  omission like room/player); define-action page untouched (its enforcement claim became TRUE via
  ADR-273). story-loader suite 62 files / 384 green. ALL SIX ADR-271 acceptance items now
  discharged.)
