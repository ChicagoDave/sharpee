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

## Phase-entry checklist

**Before drafting the ADR paragraph a phase implements, read the exact IR shape for every
field that phase depends on.** Not the ADR, not the prototype, not a prior phase's summary —
the compiled `.ir.json` of a real story, or the `@sharpee/chord` type that produces it.

This is here because `pattern-recurrence-detector` found the same defect in **three of this
plan's sessions** (0129, 0329, 1745, all 2026-08-19), and each one's own Recurrence Check
answered NO — they compared against a single matching prior instance rather than the shared
root cause. Every instance is a design assumption written from *reading* and found wrong only
once code ran against a real story: mirrored exit rows and `lockable`≠locked (0129); gates
being directional, not undirected, which cost `undirectedExits` (0329); `ProseSite`'s
attribution fields, the `text`/`sentence` name, and D14's mechanism being a top-level
`define machine` rather than the `switchable` trait (1745).

The package already treats this as house style for TESTS — compile from source, never commit a
`.ir.json` snapshot, spawn the real binary (`tests/corpus.ts`, `tests/cli.test.ts`) — and
Phase 5 named it "measure-then-derive" after David rejected a hand-tuned generator. The gap
was never the tests; it was that the *prose* got written first. The fix is procedural and
costs one command per field.

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

### Phase 2: Map and Reach derivation — the D4 fixed point and D7 auto-layout (AC-1..AC-5)
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
- **Status**: DONE (2026-08-19, session 8cf526)
- **Outcome**: five new modules — `containment.ts` (where a thing sits at start),
  `statements.ts` (the `change`-writer and `move` walks, each carrying the context that
  fires it), `conditions.ts` (tri-state `holdsAtStart` / `canBeFalsified` over `IRCondition`),
  `reach.ts` (the D4 fixed point), `map.ts` (the D7 grid) — plus `wiredEdges`,
  `oppositeDirection`, and `platformStateHoldsAtStart` added to `loader-semantics.ts`.
  **50/50 tests green** (`pnpm --filter '@sharpee/world-index' test:ci`, 2026-08-19 03:44
  local): 21 loader-semantics (AC-6, extended), 17 Reach (AC-1..AC-5), 12 Map (D7).
  `npx tsf build` clean across the whole tree; both `local` and `esm` targets emitted.
- **AC results, each against a story compiled from its own `.story` source** (never a
  committed `.ir.json`, which would pin yesterday's compiler): AC-1 — Fernhill 13 rooms,
  The Alderman 8, Ides of March 5, all report `findingCount: 0` unmodified. AC-2 — moving
  `tarnished-key` into `cellar` leaves `cellar` unreached with reason *the key is inside the
  room it opens*, and reports `crowbar` + `tarnished-key` stranded. AC-3 — an added
  `kitchen east → scullery` yields exactly one broken exit and `rooms.total` stays 13
  (the 14-of-13 regression). AC-4 — clearing `oil-lamp`'s `descriptionKey` reports it
  reachable in `cellar-stairs` with nothing to read, and the same fault on a *stranded*
  thing stays quiet (the stranding is the finding, not the prose). AC-5 — both of
  Fernhill's gates read openable unmodified; emptying Mrs Kettle's `onClauses` seals the
  study gate, and moving the boiler behind the exit it opens seals the greenhouse gate.
- **Tests were mutation-checked, not just run green.** All 50 passed on the first run, so
  each obstacle class was verified to fail when broken: inverting the `blocked while`
  polarity fails both sealed-gate tests; disabling the lock check fails all three AC-2
  tests; corrupting one row of the direction-opposites table fails the platform pin.
- **Three modelling decisions worth carrying forward.** (1) *Gates are directional, locks are
  not* — a blocked-exit line is keyed to one room and one direction, and it governs the
  loader's **mirrored** exit as readily as an authored one (Fernhill's study gate sits on
  `entrance-hall west`, which the author only ever wrote as `study east → entrance-hall`).
  That is why `wiredEdges` replaced `undirectedExits` for this work. (2) *A platform trait
  state is player-writable; an author state needs a triggerable writer* — `boiler is off`
  lifts because `switchable` means a standard action turns it on, while `mrs-kettle is
  guarded` lifts only because a `change` on her own clause moves her out of it. Without the
  first half, D3's own table would have reported Fernhill's greenhouse gate permanently
  sealed. (3) *A displaced room is never also a skew* — resolving a collision moves a room
  off its compass cell by construction, so reporting that as skew would have made D7's
  "direction skew is zero in all three" false the moment collision resolution shipped.
- **Deferred by design**: manual map positions are an input (`LayoutOptions.overrides`), not
  a store — where they persist is the IDE's call in Phase 6, and the analyzer stays a pure
  function of the IR.

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
- **Status**: DONE (2026-08-19, session 8cf526)
- **Outcome**: two new modules — `vocabulary.ts` (the parser's resolution model) and
  `incomplete.ts` (the extractor, the three classes, and the documented lists). **74/74
  tests green** (`pnpm --filter '@sharpee/world-index' test:ci`, 2026-08-19 03:59 local):
  21 loader-semantics, 17 Reach, 12 Map, 24 Incomplete. `npx tsf build` clean across the
  whole tree.
- **The resolution model is imported, not restated.** `deriveNameVocabulary` — the function
  `command-validator.ts` itself calls — is imported from `@sharpee/world-model`, which is
  therefore a runtime dependency of this package now, not just `@sharpee/chord`. Writing a
  private copy of the parser's content-word rule inside a tool whose whole purpose is
  "resolve the way the parser resolves" is the D3-class error this ADR exists to avoid.
  `@sharpee/world-model` costs little: its only dependencies are `core` and `if-domain`.
- **The parser matches on whole-vocabulary coverage, and the prototype did not.** The
  validator's WORDS tier requires *every* content word of the query to appear in one
  entity's vocabulary; the prototype instead indexed each name's **last** word as a head
  noun and checked modifiers against whatever that head matched. Modelling the real rule
  moved three Fernhill findings and is the reason the pinned figures differ from the
  prototype's: *boiler's water valve* is **ambiguous**, not missing-word, because the
  stopcock's alias *water valve* and the *brass valve handle* both answer to `valve` (the
  prototype's head index only saw `handle`); *far wall* and *plain white* became
  missing-word cases because `wall` genuinely reaches the wall niche and `white` genuinely
  reaches the pantry door's *white door* alias.
- **Two extractor rules were changed after measuring, not by taste.** `here`/`there` joined
  the boundary list — as locatives they end a noun phrase, and without them *"left the ball
  here"* headed on `here` and the whole phrase was lost. The minimum head length dropped
  from four letters to three, because interactive fiction is full of three-letter objects
  and the old floor silently dropped every one: the change recovered *small steel box* for
  the deed box, *flat tin*, *leather pot*, and *hotel bar*, against exactly one junk entry
  (`seedling now`) across the whole corpus. Both are documented at their constant.
- **Pinned corpus figures** (D6b): Fernhill 20 missing-word / 9 ambiguous / 58 no-object;
  The Alderman 4 / 0 / 36; Ides of March 7 / 0 / 30. Every case ADR-321 quotes is asserted
  by name: *hurricane lamp* → `oil-lamp` missing `hurricane`; *long iron poker* →
  `furnace-poker` missing `iron`; *study door* ambiguous across all three real doors;
  `scrollwork`, `keyhole`, `bolt`, `cache` with no object behind them. The ADR's own
  figure of 17 missing-word cases was the prototype's, measured with the head-noun model,
  a four-letter floor, and first-visit prose unread — worth an ADR amendment when
  convenient, not a discrepancy to reconcile. **Done 2026-08-19**: corrected in place in
  ADR-321's Missing-word bullet as part of Amendment 1.
- **AC-7 green**, with no `adjectives` field anywhere: `ball` raises the three-way
  disambiguation, each colour word resolves its own ball alone, `red green` and `brass ball`
  resolve to nothing (a word the entity does not answer to disqualifies it), and `plant` /
  `potted plant` / `potted` all reach the potted plant.
- **Two limits are documented and pinned rather than papered over.** A verb the boundary
  list does not name swallows the phrase after it (*the hurricane lamp burns* reads as a
  three-word phrase headed by `burns`) — a part-of-speech pass is the fix and D6b defers it
  deliberately, so a test asserts the loss so it stays visible. And **scope is not modelled**:
  a generic noun resolves against the whole story, so `wall` in the Study's prose reaches the
  Folly's wall niche and stays quiet. Adding scope would raise recall further and is a
  design decision the ADR does not make — worth raising before Phase 6 renders this view.
- **No suppression mechanism**, exactly as D6a specifies for this ADR's scope: every finding,
  every build.

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
- **Status**: DONE (2026-08-19, session 8cf526)
- **Outcome**: `src/document.ts` (the wire contract) and `src/cli.ts` (the entry point).
  **83/83 tests green** (`pnpm --filter '@sharpee/world-index' test:ci`, 2026-08-19 04:09
  local): 21 loader-semantics, 17 Reach, 12 Map, 24 Incomplete, **9 CLI**. `npx tsf build`
  clean across the whole tree.
- **Invocation**: `node packages/world-index/dist/cli.js <story>.ir.json`, following the
  `transcript-tester` convention — a `src/cli.ts` with a shebang, no published `bin`.
  Exit 0 carries an analysis, exit 1 carries a failure document, and anything else means
  the process died before it could speak, which is the IDE's own empty state.
- **The written-down schema is `dist/document.d.ts`**, emitted from `src/document.ts`. That
  file is marked a wire contract in its own header and holds no `Map`, no `Set`, and no
  optional-only fields — every absent value crosses as an explicit `null`, so the Swift side
  decodes one shape. `WORLD_INDEX_SCHEMA` (`world-index/1`) is what Phase 6 branches on;
  `analyzerVersion` is the package version and is diagnostics only.
- **Two version fields, deliberately.** The ADR says the schema is "versioned with the
  package", but the package version rides the platform's lockstep release train and would
  churn the wire version on every release for no wire change — the failure `chord`'s own
  `version.ts` exists to avoid. So the document carries both: a hand-bumped schema name the
  IDE switches on, and the package version for diagnostics.
- **Four failure causes, each a document rather than a stack trace**: `usage` (no path),
  `unreadable-ir` (the path names nothing), `malformed-ir` (not JSON, or JSON that is not a
  Story IR), `internal` (the analysis itself threw). `readStoryIR` gained the
  unreadable/malformed distinction to feed this — Phase 1 collapsed both into one error.
- **Real-path tested, not stubbed** (DEVARCH 13a): `tests/cli.test.ts` spawns the built
  `dist/cli.js` as an actual child process and parses its real stdout for the success case
  and all four failures, asserting stderr is empty every time. It compiles Fernhill itself
  and writes the IR to a scratch directory rather than reading the committed build artifact,
  so the run depends on this checkout's compiler rather than on when someone last built the
  story. One test re-derives the document in-process and asserts the wire form is equal —
  serialization loses nothing.
- **AC-9's third case, an absent `node`, is not testable from inside a Node process** and is
  IDE-side by nature. Phase 6 owns it; this phase's exit-code contract is what makes it
  renderable.

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
- **Status**: DONE (2026-08-19, session 421f1f)
- **Decision — full analysis kept, fallback NOT implemented.** David's sign-off, 2026-08-19.
  The D4 fixed point grows linearly in room count; the documented fallback would save under a
  millisecond at 100 rooms while trading away the correctness D4 exists for. Any future
  authoring-speed concern here is a question about process startup, not about the derivation.
- **Outcome**: `tests/corpus-shape.ts` (structural profiler), `tests/synthetic-corpus.ts`
  (the generator), `tests/scale-timing.ts` (the harness), their three test files, and a
  `scale` package script. **119 passing, 1 skipped** (the gated report) —
  `pnpm --filter '@sharpee/world-index' test:ci`, 2026-08-19 04:39 local; root
  `npx tsc --noEmit` clean.
- **The five figures** — `pnpm --filter '@sharpee/world-index' scale`, Node v25.8.1 on
  darwin, 2026-08-19 04:40 local. Startup floor, measured from a no-argument run that
  analyzes nothing: **63.53ms**.

  | shape | rooms | entities | IR | analysis | subprocess | over floor |
  |---|---|---|---|---|---|---|
  | derived | 20 | 80 | 73K | 0.23ms | 68.03ms | 4.04ms |
  | derived | 40 | 160 | 146K | 0.45ms | 68.95ms | 4.96ms |
  | derived | 60 | 239 | 219K | 0.64ms | 70.29ms | 6.30ms |
  | derived | 80 | 319 | 293K | 0.85ms | 70.79ms | 6.80ms |
  | derived | 100 | 399 | 366K | 1.07ms | 71.14ms | 7.15ms |
  | dense-chain (bound) | 100 | 430 | 395K | 1.19ms | 72.16ms | 8.17ms |

  Growth: **rooms^0.95** derived, **rooms^1.08** for the adversarial bound. A 100-room story
  — four times Fernhill's size — costs an author ~71ms, of which 63.5ms is node starting up
  and ~1ms is the derivation. "Over floor" includes reading and parsing the 366K IR file; the
  parse is the larger half of it, not the analysis.
- **The corpus is derived, not invented.** Every structural parameter of a generated story is
  read at generation time from ratios measured off Fernhill, The Alderman, and Ides of March
  (`corpus-shape.ts`, pinned by inline snapshot): 1.65 exit lines/room, 2.65 things/room,
  0.15 obstacles/room at a 0.25 lock share, 23.1 words/description, 6.5 rooms/region, 0.5
  dead-end share, 0 cycles. The closing check is a round trip — generate from the measured
  ratios, compile, profile the result with the same profiler, require it back within 15%.
  An earlier hand-tuned generator was discarded: a fixture shaped to produce its own finding
  makes the timing table describe a story nobody wrote.
- **Finding that outlives this phase: every map in the corpus is a pure tree.** Fernhill
  wires 12 connections across 13 rooms, The Alderman 7 across 8, Ides of March 4 across 5 —
  not one cycle anywhere, and half of all rooms are dead ends. The Map view's collision
  resolution and direction-skew detection (D7) therefore have no corpus behind them; Phase 6
  will be rendering machinery no real story has exercised.
- **Two ratios were corrected before anything was derived from them.** `roomsPerRegion` read
  13 by counting all 26 rooms against Fernhill's 2 regions (real figure 6.5 — it is now taken
  only over stories that declare regions), and raw connections-per-room read 0.88 — below a
  tree — purely because pooling three stories loses one connection each. That is now
  `cyclesPerRoom`, taken per story and then pooled, which reads 0 and generalizes.
- **`dense-chain` is a labelled upper bound, never a representative case**: it packs
  obstacles ~2x denser than the corpus and seals each opener where the walk cannot reach it
  until the next pass. Its figures are reported as a bound and tested as one.
- **Real-path tested, not stubbed** (DEVARCH 13a): the always-on acceptance tests spawn the
  built `dist/cli.js` at 20 and 100 rooms and at the bound shape, and require a clean
  analysis from each. Only the report is gated (`WORLD_INDEX_SCALE_TABLE=1`, via
  `pnpm --filter '@sharpee/world-index' scale`) — it spends fifty-odd spawns producing a
  table for a human to read, which belongs on demand rather than in every suite run.

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
- **Status**: AWAITING CONFIRMATION (since 2026-08-19, session 4db9d0) — code and tests are
  complete and no further implementation is planned here; the single open exit-state item is
  David's own confirmation that the tab RENDERS, driven by a real build. Phase 7 requires that
  confirmation ("David has seen the World tab work, not just code review"), so the phase does
  not close on a green suite. Deliberately NOT `CURRENT`: Phase 8 is the phase being worked,
  and two CURRENT phases would leave the next session unable to tell which one it is resuming.
- **Outcome (code + tests)**: seven new files under `tools/ide/SharpeeIDE/World/` —
  `WorldIndexDocument.swift` (the Swift half of Phase 4's wire contract),
  `WorldIndexRunner.swift` (the subprocess), `WorldFindingTable.swift` (the shared sectioned
  list), `WorldMapView.swift`, `WorldReachView.swift`, `WorldIncompleteView.swift`,
  `WorldView.swift` (the tab) — plus `SharpeeIDETests/WorldIndexTests.swift`. Wired into
  `RightPanelViewController` (World appended at index 7), `Theme.swift` (nine new
  `dynamic(light:dark:)` pairs), `BuildController` (derives after a successful build), and
  `MainWindow` (forwarding, source-line jump, clears on project switch).
  **20 new tests; the full IDE suite is 513 passing, 0 failures**
  (`xcodebuild test -only-testing:SharpeeIDETests -derivedDataPath ./DerivedData`,
  2026-08-19 18:00 local). `xcodebuild build` clean; root `npx tsc --noEmit` clean.
- **Off the main actor, behind a loading state (D15, added 2026-08-19).** The child's output
  is decoded in the termination handler's own context — `interpret` is `nonisolated`, with a
  test driving it from a detached task — so only the finished value crosses to the main actor.
  The tab holds an explicit loading state between the build finishing and the analysis landing,
  cleared by an analysis and by a failure alike (a tab that spins forever on an absent
  toolchain is the failure mode the state introduces). This is what makes Amendment 1's deeper
  scan affordable, and it satisfies AC-15 ahead of the rest of that amendment.
- **The analyzer is reached through the author CLI, not a script path.** The plan's
  deliverable said BuildRunner would invoke the analyzer; resolving
  `packages/world-index/dist/cli.js` would have worked inside a checkout and nowhere else,
  leaving a permanently empty World tab for every author who did not clone the monorepo.
  David approved the platform change 2026-08-19: `@sharpee/devkit` gains
  `sharpee world-index <story>.ir.json` (one dependency line, one command file), and the IDE
  resolves it through `ComposeRunner.resolveSharpee` — the same three tiers as build, compose,
  test, and play, riding the sealed bundled toolchain for free. The analysis moved to
  `world-index/src/analyze.ts` (`analyzeStoryIR`) so the package's own `cli.js` and the devkit
  command cannot disagree about what a failure is called. **4 new devkit tests; devkit 167
  passing, 1 skipped; world-index unchanged at 119 passing, 1 skipped.**
- **The invocation sits in `BuildController`, not `BuildRunner`.** `BuildRunner` owns ONE
  child process and its lifecycle; a second, unrelated child spawned from inside it would give
  it two reasons to change (DEVARCH 7).
- **AC-9's three failure states are automated, not just exercised by hand**: a missing IR
  (answered before anything is spawned), a malformed IR (through the REAL analyzer, which is
  what decides unreadable from malformed), and a process that dies without speaking — the
  absent-`node` case, unreachable from inside a Node process, asserted at the seam that has to
  render it. A fourth guard rejects a document whose `schema` this app does not read, naming
  both versions rather than decoding a newer shape into an older struct.
- **Real-path tested, not stubbed** (DEVARCH 13a): the suite spawns the real `sharpee` this
  checkout resolves, against an IR composed by the real compiler into a scratch directory
  rather than the committed `branch-stories/fernhill/dist/` artifact — the analysis under test
  is of THIS checkout's compiler output. Two mutations confirmed the suite can fail: renaming
  the subcommand fails the real-CLI test with `unknown command: world-index-oops` (proof the
  subprocess really runs), and emitting the unreached-rooms header unconditionally fails the
  clean-story assertion.
- **Blocker cleared en route — the docs-tab pre-build phase had been failing for days**,
  taking the whole app build down before a single Swift file compiled. Two independent cases
  of website drift: `website/src/lib/nav.ts` gained `import versions from './versions.json'`,
  which a `data:` URL has no base to resolve (fixed by bundling rather than transforming, so
  the data URL imports nothing no matter what the website adds next), and `<StatusBarExample>`
  appeared in the corpus with no handler (`mdx.mjs` now renders it from the same
  `versions.json` the website component reads, so the two cannot name different releases).
- **Carried in from Phase 5, and still true**: the Map view's collision resolution and
  direction-skew detection have no corpus behind them beyond Fernhill's single Study/Folly
  Hill displacement — every real Chord map is a tree with no cycles — so the skew path ships
  built and reviewed but never exercised by a real story.

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

### Phase 8: Amendment 1 — response prose, POS re-heading, and mention roles (D10–D15, AC-10..AC-16)
- **Tier**: Large
- **Budget**: 400 tool calls
- **Domain focus**: the Incomplete view's inputs and its meaning — what prose is read, what a
  phrase resolves to, and what a resolution is worth. Distinct from Phase 3's extractor work,
  which built the resolution; this decides what to do with it.
- **Entry state**: Phase 6 complete and confirmed rendering (the roles and the re-heading both
  surface in the World tab, so there must be a tab to surface them in). ADR-321 Amendment 1
  accepted. David's approval for the `packages/world-index` changes (platform) as well as the
  `tools/ide` ones.
- **Numbered after Phase 7 deliberately, not before it.** Phase 7's deletion is gated on the
  World tab rendering, which Phase 6 satisfies; holding it behind this phase would leave a
  superseded VS Code copy alive for the length of a large phase. Run 7 when David confirms the
  render, and 8 whenever it is scheduled — they share no code.
- **Deliverable**, in the order each unblocks the next:
  1. **D10 — every authored phrase is read.** `describedProse` walks the locale table rather
     than two keys per entity. Response findings attribute by phrase key and firing clause
     (a response has no owning entity) and report in their own section. The D6b corpus pins
     are re-measured across both sources and re-recorded — the figures WILL move, and the diff
     is the point.
  2. **D14 — the progression chain, then D12 — roles.** `reach.ts` keeps the obstacle it
     lifts (`blocks.delete` today) in a `lifted` list beside `blocked`; that IS the dependency
     graph of progress. `roles.ts` then splits every resolved prose edge into tool (the thing
     has player affordances), progression-info (it is on the chain), or atmosphere-info (the
     residual). The edge itself already exists inside `classify`, which discards it. **D14
     first and not optionally**: a static scan of the IR puts `stopcock` in atmosphere-info,
     because the boiler gate lifts through the `switchable` trait rather than a `change` a
     scan can follow. Roles ride the wire and rank the candidate list.
  3. **D11 — IDE-side part-of-speech work, in two steps.** The wire carries each candidate's
     source sentence; `tools/ide/SharpeeIDE/World/` tags with `NLTagger` (`.lexicalClass`)
     before rendering. **(a) Re-head, never drop** — a test asserts the count is
     non-decreasing, because four of Fernhill's nine no-noun phrases are tagger errors on real
     nouns (`grate`, `shroud`, `well`, `wooden`) and dropping them would delete real gaps.
     **(b) Drop the article gate**, chunking adjective-noun runs over all prose: measured at
     9.2ms for Fernhill's ~2,400 words, under 100ms extrapolated to 100 rooms. It yields
     **+98 resolved edges** (`plunger` → `primer-plunger`, `staging` → `staging-benches`,
     `smoke` → the cat) against **+445 raw candidates** — only shippable because step 2's
     roles rank them. Ships with step 2 or not at all.
  4. **D13 — the unnamed-tool finding.** Last, and only after 1, 2, and 3: it is a claim that
     no prose names a thing, and today's extractor is article-gated and three-word capped, so
     the claim is only as good as the recall beneath it. Its sharpest form needs D14 —
     a *progression-critical* thing no prose names is not a nag, it is a story the player
     cannot finish by reading.
- **`adr-review` findings, fixed in the ADR before this phase was scheduled** (2026-08-19,
  6/13 — BLOCKED on the first pass): the resolution boundary was undischargeable as drafted
  (the IDE was asked to chunk phrases it had nothing to resolve against), so the analyzer now
  publishes a `vocabulary` surface — 2.3KB for Fernhill — that the IDE applies but never
  derives; the schema bumps to `world-index/2` because the Swift decoder refuses an unknown
  one by design; `lifted`, `MentionEdge`, `ProseSite`, and `roles.ts`'s exports have real
  signatures in D11a; and AC-16 pins the CLI list as a subset of the IDE's. **Implement
  against D11a, not against the prose.**
- **Exit state**: AC-10 through AC-16 pass against the real corpus; the D6b pins are
  re-recorded with both prose sources and the role split; the IDE's re-headed count is proven
  greater than or equal to the analyzer's on every corpus story, never less.
- **Status**: CURRENT (since 2026-08-19) — **step 1 (D10), D14, D12, and D11 are DONE**; D13
  remains.
- **D14 outcome, 2026-08-19**: `obstacleOn` returns a verdict (`{open, requires}` or
  `{blocked}`) instead of `BlockedEdge | undefined`, so the moment an edge opens the loop
  records WHAT opened it rather than deleting the evidence. `ReachResult` gains
  `lifted: LiftedObstacle[]` and `progression: string[]`; `machineDrivers` reads
  `ir.machines`, resolving each role to the entity it plays (`$furnace` → `boiler`) and
  collecting the triggers that advance it. Two latent bugs fell out on the way: an exit
  carrying BOTH a gate and a locked door had its door unexamined (the gate branch returned
  first), and an obstacle overcome on first sight was never recorded at all, which made the
  chain depend on walk order. **world-index 127 passing / 1 skipped; IDE suite 517 passing.**
- **D11 outcome, 2026-08-19**: new `tools/ide/SharpeeIDE/World/WorldProseChunker.swift`
  (`NLTagger` chunking, re-heading, resolution, classification) and three more published
  surfaces — `vocabulary` (both tiers), `prose` (every passage, once), `filters`. The Incomplete
  view now renders the merged reading, role-ranked. **IDE suite 525 passing, 0 failures**
  (from 517); **world-index 144 passing / 1 skipped**; root `npx tsc --noEmit` clean.
- **The measured gain, Fernhill, NLTagger on macOS 26.5.2**: CLI 23/14/136 = 173 candidates;
  IDE 52/22/359 = **433**, so **+260**. Resolved edges: 76 → **+54 new**, naming **26 entities**
  the article gate hid. Both actuals land BELOW the ADR's predictions (+445 candidates, +98
  edges) because this chunker applies the published head filters — stopwords, minimum head
  length, inflected heads — which the ADR's probe evidently did not. Less junk than promised,
  and fewer edges.
- **AC-11a is satisfied in direction, not by a pinned count, deliberately.** The counts above
  are a dated measurement in this plan rather than an assertion in the suite: they depend on
  Apple's tagger, so pinning them would make a macOS update read as a Sharpee regression. The
  tests assert what is actually ours — the count never decreases, the four named recoveries
  (`plunger`, `staging`, `fuse`, `smoke`) resolve, and the pass stays under 250ms.
- **Union, never replacement.** The IDE list is the analyzer's findings plus the chunked ones,
  deduplicated on site and phrase, so AC-16 holds by construction. It has to be a union:
  probed directly, `NLTagger` returns `shroud` and `well` as ADVERBS in real Fernhill
  sentences, so a reading that trusted the tagger alone would delete real findings. (The ADR
  recorded `grate` as an Adjective; on macOS 26.5.2 it tags Verb. Same conclusion, different
  word.)
- **Roles cannot rank what ungating adds, so ranking goes through the passage's owner.** A role
  attaches to a resolved entity; the new candidates are no-object and name nothing. A missing
  noun in a progression-critical thing's prose outranks one in a room's scenery; an unowned
  passage sorts last rather than being hidden.
- **A deadlock that shipped in Phase 6, found by this step and fixed here.**
  `WorldIndexRunner` read the child's stdout inside `terminationHandler`, so once the analyzer
  filled the ~64KB pipe it blocked on the write, never exited, and the handler never ran — the
  tab would hang forever. It was invisible only because Fernhill's document fit: **55,460 bytes
  at Phase 6, 83,594 after D12, 120,193 now.** Fixed by draining both pipes while the child
  runs, the pattern `IntrospectionRunner` and `ComposeRunner` already used; their two identical
  private `DataBuffer` copies are now one shared `Build/DataBuffer.swift`. The regression test
  asserts the document still EXCEEDS a pipe buffer, so the guard says so if it ever stops
  guarding anything. The test helper's `analyzeReal` also force-unwrapped after its wait, so a
  hang crashed the whole test process instead of failing one test; it now unwraps.
- **D12 outcome, 2026-08-19**: new `packages/world-index/src/roles.ts` — `roleTable(ir, reach)`
  and `deriveRoles(ir, reach, edges)`. `classify` now names its clean-resolution case instead
  of returning `undefined`, so `IncompleteResult` gains `edges: MentionEdge[]`; the wire gains
  a top-level `roles` table. **world-index 140 passing / 1 skipped** (from 127), no schema
  re-bump — v2 bumps once for the amendment.
- **Four IR facts read before the code was written** (the phase-entry checklist, all measured
  against compiled corpus stories rather than the ADR): there is **no `takeable` row** — the
  loader grants portability by default and `scenery` withdraws it, so a derivation hunting for
  an affordance row calls every plain object inert; an affordance can live on the **trait
  declaration** rather than the entity (`case-clock` declares only `on every turn`, and is a
  tool solely because `windable` answers `on winding` in `ir.traits`); `binding: 'every-turn'`
  is the non-player discriminator, not the action word; and `kinds` is a separate array from
  `traits` carrying `room`/`region`/`door`/`person`/`container`/`supporter`.
- **The measured correction the corpus forced**: with affordances alone, Fernhill called
  `grounds`, `house` and `iron-gates` **tools** — a region and a room answer `on entering`,
  which is player-fired by every other test — and the player is portable because nothing
  withdraws it. Places and the player can never be tools; the guard moved 13 Fernhill edges
  from tool to atmosphere (39/7/30 → 26/7/43).
- **The pin**: Fernhill **26 tool / 7 progression-info / 43 atmosphere-info** of 76 edges; The
  Alderman 7/0/18 of 25; Ides of March 41/0/20 of 61. Against D12's rejected two-way rule
  (41 of 65 entities tools, 48 of 71 edges info) the split now separates the sherry bottle
  (tool) from the cellar door (progression-info), which is the distinction the view exists for.
- **One D11a contract change, made deliberately**: D11a gives `deriveRoles(ir, reach, edges)`
  and nothing else, which cannot serve the IDE — under D11 Chord Writer chunks phrases this
  extractor never resolves, and it would have to re-implement the rule in Swift to role them.
  The Alderman proves it is not hypothetical: all six `accusable` suspects are proper-named,
  so not one appears in an analyzer edge today, yet each is a tool the moment ungated chunking
  finds it. The document therefore publishes `roles: Record<entityId, MentionRole>` for **every
  declared entity** — the IDE applies it and never derives it, the same posture D11 takes with
  the vocabulary surface. ~2.6KB for Fernhill, comparable to vocabulary's 2.3KB.
- **The limit worth watching in the World tab**: atmosphere-info is a residual, so places land
  there — nine of Fernhill's twenty-two atmosphere entities are rooms. A fourth role for places
  is not D12's and was not invented here.
- **Fernhill's chain, and why the scan was rejected**: the fixed point reports `boiler`,
  `stopcock`, `primer-plunger`, `mrs-kettle`, `cellar-door`, `tarnished-key`. The static
  proxy reports the same COUNT and a different SET — it invents `folly-door` and
  `pantry-door` (neither starts locked) and misses both machine triggers. Mutation-checked:
  blinding the walk to `ir.machines` drops the two triggers and fails three tests.
- **Step 1 outcome (D10 + the D11a contracts it needs), 2026-08-19**: new
  `packages/world-index/src/prose.ts` — `collectProse(ir): ProseSite[]`, one site per
  authored passage, walking description and first-visit keys by entity and every
  `phraseKey` reference by a shape-agnostic tree walk that carries the enclosing entity
  and clause. `incomplete.ts` now iterates passages rather than entities, and all three
  finding types carry `site: ProseSite` in place of `where`/`whereName`/`line`. The wire
  bumped to **`world-index/2`** in `document.ts` and `WorldIndexDocument.swift` together;
  Swift decodes `WorldProseSite` with an unknown-kind fallback and a `label` that falls
  back owner → firing clause → phrase key, so no finding is ever unlocatable.
  **world-index 121 passing / 1 skipped; devkit 167 passing / 1 skipped; IDE suite 515
  passing, 0 failures** (2026-08-19 20:21 local).
- **The pin is now two pins, and the description half did not move.** Every story reports
  exactly its pre-amendment description figures — Fernhill 20/9/58, The Alderman 4/0/36,
  Ides of March 7/0/30 — so reading response prose is a strict superset, not a
  re-reading. What it adds: Fernhill +3/+5/+78 (124 passages, 60 of them response), The
  Alderman +1/+0/+89 (82 passages, 62 response), **Ides of March +10/+1/+184** (113
  passages, **94 response**). That last story is the case D10's own-section rule exists
  for: its candidate list is seven times its description list, and merged into one list
  the description findings would be unfindable.
- **Two contract corrections found by implementing against the real IR**, both folded back
  into D11a: `ProseSite.owner` and `firedBy` are **independently optional** — a response
  usually DOES have an owner (`folly-jammed` hangs off `folly-door`'s `on opening`) and 22
  of Fernhill's passages are story-level with neither — and the passage text field is
  `text`, not `sentence`, because a site is a whole passage and the part-of-speech pass
  wants the full context anyway.
- **Measured going in** (Fernhill, 2026-08-19, recorded in Amendment 1 rather than re-derived
  here): 124 phrases of which 60 are unread; +85 no-object and +2 ambiguous from reading them;
  172 no-object candidates of which 21 are re-headable and 9 have no noun (about four of those
  nine being tagger errors); the rejected two-way rule calls 41 of 65 entities tools and 48 of
  71 edges info, against a progression chain of **six** entities and **five** edges — the
  correction that produced D12's three-way split; 11 things no prose names.
- **Duration is not a constraint here; placement is** (D15, David 2026-08-19). The derivation
  runs off the main actor behind a loading state — **already built and tested in Phase 6**, so
  this phase inherits it rather than adding it. Do not move the work onto a keystroke, a save,
  or the compose loop behind the Index tab: there a background thread does not help, because
  the author is waiting on the result.
- **The one divergence to keep visible**: after D11 the IDE and the CLI report different
  Incomplete counts for the same story. Bounded to the recall direction and acceptable only
  because D6 defines Incomplete as a candidate list — Reach and Map must never acquire an
  IDE-side derivation, and a test should assert the headless list stays a subset rather than
  drifting into a different reading.
