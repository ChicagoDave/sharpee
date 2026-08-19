# Session Plan: Implement ADR-321 — The World Index (Map, Reach, Incomplete)

**Created**: 2026-08-19
**Plan Status**: ACTIVE
**Overall scope**: Build the World Index feature end to end: a new `packages/world-index`
derivation package that statically analyzes a compiled Chord Story IR for map topology,
obstacle-aware reachability, and vocabulary gaps; a synthetic-corpus timing gate (AC-8);
the new World tab in the macOS IDE; and, last, retirement of the superseded
`tools/vscode-ext/src/world-explorer.ts`. Source of truth is
`docs/architecture/adrs/adr-321-world-index.md` (ACCEPTED, session 317706). This plan is
the implementation authorization step the ADR withholds from acceptance itself — each
phase still requires David's go-ahead before work starts (DEVARCH rule 5), and any phase
touching `packages/` additionally requires the CLAUDE.md platform-change discussion before
implementation.
**Bounded contexts touched**: N/A — this is a new derivation package plus an IDE surface,
not a change to Sharpee's domain-behavior contexts (traits/behaviors/actions). It has no
new aggregates or commands/events of its own. The phase names below borrow ADR-321's own
vocabulary (Map, Reach, Incomplete, World Index) because that vocabulary is this feature's
ubiquitous language, not because DDD bounded-context decomposition applies.
**Key domain language**: World Index, Map / Reach / Incomplete (the three views), Story IR,
loader semantics (D3), fixed point (locks+gates, D4), candidate list (D6), World tab
(D8) — the source-level *suppression* syntax (D6a) is explicitly out of scope for this plan.

## References consulted
- `docs/architecture/adrs/adr-321-world-index.md` — the governing ADR; imposes D1 (exactly
  three views, nothing else), D2 (new workspace package, direct `@sharpee/chord` IR import,
  no Swift reimplementation), D3 (model loader semantics, never literal IR rows — drop a
  check rather than guess), D4 (Reach is one obstacle-aware fixed point over locks and gates
  together, not two passes), D6a (suppression is out of scope here, stays for a future ADR),
  D8 (World tab is a sibling of Index, not part of it), D9 (extension deletion is last, only
  after the tab renders), and the stated sequencing (package+tests, then tab, then deletion).
- `docs/architecture/adrs/adr-131-automated-world-explorer.md` — SUPERSEDED IN PART by
  ADR-321; its own consequence is the constraint this plan's last phase discharges (the
  `tools/vscode-ext` static-analysis copy is not deleted until the World tab renders).
- `docs/architecture/adrs/adr-303-convergent-paths-and-unwinnable-states.md` — D2 rules the
  transcript tree models the test suite and never the story, which is why World Index is
  not a Testing tab view (ADR-321 D8 restates this); D6 is where ADR-131's static half was
  previously widened, now subsumed by this ADR.
- `docs/architecture/adrs/adr-093-i18n-entity-vocabulary.md` — the vocabulary/adjective
  source ADR-321 D5 builds on; confirms `IdentityTrait.adjectives` is redundant with the
  validator's name-word derivation, which is the rule the Incomplete phase must implement
  (not `adjectives`, not a new lexicon).
- `docs/architecture/adrs/adr-210-story-language.md` — defines the Chord Story IR this
  package reads; the package's IR types come from `@sharpee/chord`, not a hand-rolled shape.
- `docs/architecture/adrs/adr-297-ide-appearance.md` — ACCEPTED; governs the IDE chrome the
  new World tab must match (tab strip conventions already followed by Index/Diagnosis).
- `docs/architecture/adrs/adr-308-testing-navigation.md` — DRAFT; a different graph over the
  test suite, not the story. Cited here only so the two are not conflated during the IDE
  phase — no constraint on this plan beyond staying out of its way.
- `docs/context/project-profile.md` — pnpm workspace conventions; documents the root
  `package.json` workspaces array as stale and untrusted, with `pnpm-workspace.yaml`'s
  `packages/*` glob as the real source of truth — this overrides ADR-321's own Implementation
  table, which names the root `package.json` as a sixth registration point for a new package
  (see Phase 1's Deliverable for the resulting correction).
- `docs/context/session-20260819-0126-main.md` (most recent session) — no open items or
  blockers carry into this plan; the `.current-plan` pointer was released clean.

(No `docs/proposals/` entries name this work — `docs-consolidation.md`, `phase-6-fallout.md`,
and `tracker-low-hanging-fruit.md` are unrelated, so nothing here was planned from a proposal
item.)

**CLAUDE.md constraints folded in directly** (not ADRs, but binding): never delete a file
without confirmation (governs Phase 7); platform changes (`packages/`) require discussion
before implementation (governs Phases 1–5); no CI gates for Sharpee (AC-6/AC-8/D6b tests run
locally and via `repokit`, never wired into a CI workflow); `-derivedDataPath ./DerivedData`
for any `tools/ide` xcodebuild run (governs Phase 6).

## Phases

### Phase 1: `packages/world-index` scaffold, IR loading, and loader-semantics module (D2, D3, AC-6)
- **Tier**: Medium
- **Budget**: 250 tool calls
- **Domain focus**: package boundary and the D3 loader-semantics table — the correctness
  surface every later phase depends on.
- **Entry state**: ADR-321 accepted; David has approved starting platform work in
  `packages/` for this phase (CLAUDE.md platform-change discussion). No code yet exists
  under `packages/world-index`.
- **Deliverable**: new TypeScript workspace package registered at all points that are
  actually live in this repo — `ts-forge.config.json`, `packages/sharpee/package.json`,
  `packages/sharpee/src/index.ts`, `packages/sharpee/tsconfig.json`, and the package's own
  `tsconfig.json`. **Not** the root `package.json` workspaces array: ADR-321's own module
  table names it as a sixth registration point, but `docs/context/project-profile.md`
  documents that array as stale and untrusted (it still lists `packages/forge`,
  `packages/cli`, `packages/web-client`, `packages/dev-tools`, `packages/platforms/*`, none
  of which exist on disk) — `pnpm-workspace.yaml` is the real source of truth, and its
  `packages/*` glob already covers `packages/world-index` with no edit needed. Editing the
  known-stale array would add one accurate line to a file the project has already decided
  not to trust. The package imports `@sharpee/chord` IR types directly — no hand-rolled IR
  shape. A `loader-semantics.ts` module encodes each row of D3's table as a
  named, independently testable rule (`states[0]` is implicit initial; every exit is
  mirrored by `connectRooms`; doors default `isLocked: true`, other lockables do not;
  `starts unlocked`/`starts locked` override; `locked`/`open`/`on` are trait states, not
  author states; `lit` is readable but not startable), each rule's test reading platform
  behavior rather than asserting against the cited line number. AC-6 (one test per D3 row)
  passes. The prototype `docs/work/explorer/world-index.js` is the reference for behavior,
  not code to port verbatim — it is untested JavaScript outside the workspace and is
  consulted, not copied.
- **Exit state**: `pnpm --filter @sharpee/world-index test` passes with AC-6 green; the
  package builds under `./repokit build` (or `tsf build`) with no other package broken by
  the six-point registration; IR types are imported, not redeclared.
- **Status**: DONE (2026-08-19, session 317706)
- **Outcome**: `packages/world-index` created with `src/loader-semantics.ts` (all six D3
  rules as named pure functions), `src/story.ts` (IR loading, entity classification,
  `StoryIRReadError` for AC-9), `src/index.ts`, and `tests/loader-semantics.test.ts`.
  **AC-6 green: 14/14.** `npx tsf build` clean across the whole tree; both `local` and `esm`
  targets emitted.
- **Registration correction — one point, not five.** This phase's Deliverable said five
  live registration points. The true number for a package of this kind is **one**:
  `ts-forge.config.json`. The other four were the umbrella's `package.json`, `index.ts`,
  and `tsconfig.json` — and the umbrella is the story-runtime import contract (ADR-178),
  not a registry of every package. Verified against the closest peer: `@sharpee/ide-protocol`,
  also a tooling package depending on `@sharpee/chord`, is in `ts-forge.config.json` alone and
  in none of the umbrella's files. The six-point checklist applies to a runtime package an
  author imports; this one is shelled out to by the IDE. ADR-321's module table is corrected
  to match.
- **Notes**: the AC-6 tests drive the real Chord compiler (`compile()` from `@sharpee/chord`)
  rather than fixtures on disk, so they are real-path by construction (DEVARCH 13a). Two
  fixture-authoring facts surfaced and are worth keeping: the `story "T" by "A"` header is
  retired in favour of the fielded form (ADR-298), and Chord refuses a door that no
  `through` exit line connects.

### Phase 2: Map and Reach derivation — the D4 fixed point and D7 auto-layout (AC-1..AC-5) — CURRENT
- **Tier**: Large
- **Budget**: 400 tool calls
- **Domain focus**: Reach (obstacle-aware, not topological) and Map (compass-grid auto-layout
  with collision resolution). This is the ADR's most expensive and most failure-prone logic —
  D4 names the exact false finding (the `blocked while` polarity inversion) this phase must
  not reintroduce — so it gets its own full-size phase rather than being folded into scaffold
  or Incomplete work.
- **Entry state**: Phase 1 complete; loader-semantics module available and tested.
- **Deliverable**: the Reach analyzer as one fixed point over locks and gates together (not
  two passes) — a door opens only when its key is reachable first, a gate opens only when a
  triggerable `change` statement moves the entity out of the blocking state, iterated to
  convergence; the Map analyzer walks exits from the start room on a compass grid with
  collision resolution (pushing collided rooms to free adjacent cells) and persisted
  per-story manual position overrides for cases the solver renders badly. Fault-injection
  tests against `branch-stories/fernhill/fernhill.story` (built to `.ir.json`) cover AC-1
  (all three corpus stories — Fernhill, `stories/thealderman` — the Alderman, and
  `branch-stories/ides-of-march` — clean, zero Reach findings, unmodified), AC-2 (key
  moved inside the room it opens → that room unreached, reason named, key+dependent items
  reported stranded), AC-3 (exit to nowhere → one broken-exit finding, room count does not
  inflate — this is the regression for the 14-of-13 count bug), AC-4 (cleared
  `descriptionKey` → reachable-but-nothing-to-read finding), and AC-5 (Fernhill's two real
  gates report openable, not sealed — the polarity-guard regression).
- **Exit state**: AC-1 through AC-5 all pass against real story IR (not synthetic fixtures);
  Fernhill's known collision (Study vs. Folly Hill) is handled by the spaced-grid resolution,
  not silently dropped.
- **Status**: CURRENT (since 2026-08-19)

### Phase 3: Incomplete derivation — vocabulary check and candidate-list heuristic (D5, D6, D6b, AC-7)
- **Tier**: Medium
- **Budget**: 250 tool calls
- **Domain focus**: vocabulary resolution, matched to the parser's own resolution algorithm
  rather than a bespoke NLP pass — a distinct correctness domain from Phase 2's graph
  analysis, kept separate under cohesive-modularity (one reason to change per module).
- **Entry state**: Phase 1 complete (loader-semantics + IR loading available). Independent
  of Phase 2 — no dependency on the Reach/Map fixed point, so it may be built in either
  order relative to Phase 2 if David prefers; this plan sequences it after Phase 2 only
  because Phase 2 is the higher-risk correctness work.
- **Deliverable**: a noun-phrase extractor over authored descriptions, resolved against
  `name content words + alias content words + authored adjectives` — the same vocabulary set
  `stdlib/src/validation/command-validator.ts` builds (not `IdentityTrait.adjectives`, which
  ADR-093 confirms is redundant). Three distinct failure classes reported separately —
  missing word, ambiguous, no object — framed as a candidate list ("places a player will
  reach for something that isn't there"), never as errors (D6). The extractor's stop and
  boundary lists are documented as the specification, tuned for recall over precision (D6b),
  and pinned by a corpus test against the repository's three Chord stories with expected
  findings recorded (Fernhill's 17 missing-word cases including *hurricane lamp* and
  *iron poker*, the *study door* ambiguity, and the `scrollwork`/`keyhole`/`bolt`/`cache`
  no-object cases). AC-7 covers the canonical adjective cases (`red ball`/`green
  ball`/`blue ball` disambiguation, `potted plant` matching all three of `plant`, `potted
  plant`, `potted`) with no `adjectives` field declared on any fixture.
- **Exit state**: AC-7 passes; the D6b corpus test is green and documents its own stop/
  boundary lists inline so tuning drift is visible in a future diff. No suppression
  mechanism is implemented — every finding, every build, exactly as D6a specifies for this
  ADR's scope.
- **Status**: PENDING

### Phase 4: Subprocess JSON contract and failure-state handling (AC-9)
- **Tier**: Small
- **Budget**: 100 tool calls
- **Domain focus**: the IDE↔analyzer boundary — a versioned stdout contract, not a new
  domain concept.
- **Entry state**: Phases 1–3 complete; Map, Reach, and Incomplete each produce their own
  result shape.
- **Deliverable**: a CLI entry point (`node`-invocable, `<story>.ir.json` path in, one JSON
  document on stdout) assembling all three views under a versioned schema tied to the
  package version. Failure is handled as a first-class state, not a crash: missing IR file,
  malformed IR, and non-zero exit each produce a structured, explanatory failure document
  rather than a stack trace or silent empty output.
- **Exit state**: AC-9's three cases (missing IR, malformed IR, absent — the CLI itself
  still runs, but its *own* environment check for `node`'s availability is exercised
  indirectly here and directly in Phase 6's IDE-side handling) each produce the documented
  failure shape; the schema is written down (a `.d.ts` or JSON-schema comment) as the
  contract Phase 6's Swift side parses against.
- **Status**: PENDING

### Phase 5: AC-8 — synthetic corpus and scale timing
- **Tier**: Medium
- **Budget**: 250 tool calls
- **Domain focus**: performance tripwire for D4's fixed-point analysis, deliberately scoped
  as its own phase rather than folded into Phase 2, because generating a valid synthetic
  Chord corpus at 20/40/60/80/100 rooms is itself real work (the repo's real corpus tops
  out at 13 rooms, and Dungeo is TypeScript, not Chord, so neither can stand in).
- **Entry state**: Phase 2 complete (the Reach fixed point exists to be timed) and Phase 4
  complete (a CLI entry point exists to invoke end to end, matching how the IDE will call
  it in practice).
- **Deliverable**: a generator producing synthetic but structurally valid Chord stories (or
  directly-authored IR — David's call, since Chord-source generation adds a compile step
  the timing doesn't need) at each of the five room counts, each with a representative mix
  of locks, keys, and gates so the fixed point actually iterates rather than terminating in
  one pass. A timing harness runs the Phase 4 CLI against each and records wall-clock time.
  The result is compared against an authoring-speed budget agreed with David at this point
  (the ADR sets no number in advance — AC-8 is explicitly premise-dependent); if the fixed
  point proves superlinear enough to matter, the documented fallback (the cheap
  does-any-writer-exist check, without verifying reachability of that writer) is implemented
  as a feature-flagged alternate path, not a replacement.
- **Exit state**: five timing figures recorded in this work's session/context notes; a
  decision recorded (full analysis kept, or fallback engaged) with David's sign-off, since
  this is the ADR's single most consequential runtime trade-off.
- **Status**: PENDING

### Phase 6: IDE World tab (D8) — Map / Reach / Incomplete views in SharpeeIDE
- **Tier**: Medium
- **Budget**: 250 tool calls
- **Domain focus**: the World tab as a sibling of Index, not part of it — a second
  projection of the same IR, never a Testing-tab view (ADR-303 D2, restated by ADR-321 D8).
- **Entry state**: Phase 4's JSON contract is stable (schema is the thing Swift code binds
  to); Phase 5's timing decision is made, so the tab is built against whichever analysis
  path (full or fallback) actually ships. David has approved this phase's `tools/ide`
  changes explicitly (still platform-adjacent even though it's Swift, not `packages/`).
- **Deliverable**: `RightPanelViewController.swift` gains a World tab in the strip (Build,
  Play, Testing, Index, Diagnosis, Documentation, Publish → + World), following the same
  `tabStrip.addTab` / tab-index-constant pattern already used for Index and Diagnosis. New
  `tools/ide/SharpeeIDE/World/` directory holds the tab's three sub-views (Map, Reach,
  Incomplete), each rendering its slice of the Phase 4 JSON contract.
  `Build/BuildRunner.swift` invokes the analyzer after a successful build, using
  `ShellEnvironment.buildEnvironment()` the same way the existing `node` build subprocess
  does. AC-9's three failure cases each render the explanatory empty state (the same pattern
  the Testing tab already uses for its build-first placeholder), not a crash or blank tab.
  `xcodebuild` runs for this phase use `-derivedDataPath ./DerivedData` per project
  convention. Any new chrome color this phase introduces (e.g. Reach's locked/openable
  distinction, Incomplete's three finding classes) is added as a `dynamic(light:dark:)`
  token pair in `Theme.swift`, per ADR-297's Consequences — a single-appearance hex literal
  in the new World views would be a defect under that ADR.
- **Exit state**: the World tab renders Map, Reach, and Incomplete for at least Fernhill,
  driven by a real build; all three AC-9 failure states are exercised manually (missing IR,
  malformed IR, `node` unavailable) and each shows the explanatory state, not a crash.
- **Status**: PENDING

### Phase 7: Retire `tools/vscode-ext/src/world-explorer.ts` (D9, ADR-131's own consequence)
- **Tier**: Small
- **Budget**: 100 tool calls
- **Domain focus**: none — a deletion, gated by CLAUDE.md's confirm-before-delete rule and
  by ADR-131/ADR-321's own stated ordering.
- **Entry state**: Phase 6 complete and confirmed rendering (David has seen the World tab
  work, not just code review). David has explicitly confirmed the delete — per CLAUDE.md,
  this is never inferred from "the replacement shipped."
- **Deliverable**: `tools/vscode-ext/src/world-explorer.ts` removed, plus its call sites and
  any VS Code extension registration referencing it. `docs/architecture/adrs/adr-131...md`'s
  status note ("the extension copy is not deleted until this surface renders") is confirmed
  satisfied, not amended further — ADR-131 already documents its own supersession.
- **Exit state**: no remaining references to `world-explorer.ts` in `tools/vscode-ext`; the
  extension still builds (or is confirmed dead/unshipped, David's call, before deletion).
- **Status**: PENDING
