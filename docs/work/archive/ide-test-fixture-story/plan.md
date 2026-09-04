# Session Plan: A dedicated, invisible fixture story for the IDE's Testing-tab real-path suite

## Status: SUPERSEDED (2026-08-07, session a9d8ca) — not executed. **Overbuilt for the need.**

The goal was achieved by copying instead of authoring. `tools/ide/test-fixtures/fernhill-frozen/`
is a frozen snapshot of `branch-stories/fernhill` (the `.story` file plus `tests/`, 23 files,
124K — `assets/`, `browser/` and `dist/` proved unnecessary), and
`TestingTabRealPathTests.swift` was repointed at it. Because the snapshot is frozen, **every
existing assertion stayed valid unchanged** — 552 / 518 authored + 34 replayed, 22 nodes, 5
roots, `arrival` 2 commands, `concealment` 16 turns at line 12 — so Phases 2, 3 and 4 below
collapsed into a copy and four edits.

Evidence (2026-08-07): `node packages/devkit/dist/cli.js test fernhill.story --tree` in the
fixture dir → exit 0, `22 passed`, `552 commands (518 authored + 34 replayed)`.
`xcodebuild test -only-testing:SharpeeIDETests/TestingTabRealPathTests` → `** TEST SUCCEEDED **`,
`Executed 7 tests, with 0 failures`. `git status --porcelain branch-stories/` empty, and
`diff -rq` of the fixture's `tests/` against the source differs only by a removed `.DS_Store`,
confirming the broken-node test's `defer` restore works against the copy.

Placement sidestepped the XcodeGen problem this plan flagged: `tools/ide/test-fixtures/` sits
outside `project.yml`'s `sources: - path: SharpeeIDETests`, so no `excludes:` was needed and
`project.yml` was not modified.

Two findings from this plan survive it and are recorded in the session summary: `docs/spec/`
already exists (contradicting an earlier claim in the same session), and
`branch-stories/tree-npm-fixture` is a pre-existing v2 fixture this plan never found. A
purpose-built fixture remains the nicer long-term artifact if the frozen copy ever gets in the
way — this document is the design for it.

**Plan Status**: ABANDONED
**Created**: 2026-08-07
**Dispositioned**: 2026-08-22 — the prose `## Status: SUPERSEDED` heading above (written
2026-08-07) is not a field the plan-staleness scan reads, so this plan kept surfacing as a
stale CURRENT phase. Recorded here in the contract field, phases marked ABANDONED, and the
plan archived. The design above is preserved, not withdrawn: if the frozen `fernhill-frozen`
copy ever gets in the way, this document is still the design for a purpose-built fixture.
**Overall scope**: Replace `TestingTabRealPathTests.swift`'s coupling to the real author
story `branch-stories/fernhill` with a small, purpose-built, invisible fixture story +
transcript tree, so the 7-test rule-13a suite (ADR-301/302 acceptance) survives go-live
Phase 4 moving all 22 Fernhill transcripts out of the story — and stays trustworthy
afterward, since Phase 4's rewritten suite may land a different tree shape anyway.
**Bounded contexts touched**: IDE Testing tab acceptance (`tools/ide/SharpeeIDETests/`);
the `@sharpee/branch-tester` (v2) tree/report model it drives against, read-only.
**Key domain language**: tree (root/interior/leaf node), `continues:` (ADR-302 D1 parent
pointer), authored vs. replayed commands (ADR-302 D17), unreached (ADR-302 D13, never
"failed"), subtree-failure badge (ADR-301 D2), stem (ADR-302 D14 — a transcript's
filename-derived identity).

## References consulted
- `docs/architecture/adrs/adr-301-sharpee-transcript-editor.md` — the suite under
  rewrite is this ADR's own Acceptance evidence (D1–D6); the plan must keep rule-13a
  real-path testing (real bundle, real scheme handler, real `sharpee test --tree --json`
  run, assertions read off the rendered page) while detaching the *numbers* from Fernhill.
- `docs/architecture/adrs/adr-302-transcript-branches.md` — the fixture is a v2
  (`branch-tester`) tree: D1 `continues:` names a filename stem with no interior
  addressing; D9 says no branch/chain/tree design may be shaped by Dungeo's corpus (used
  only as a *grammar* reference, never as a shape model); D12/D16 put v2 stories under
  `branch-stories/` by directory convention, which the fixture should follow unless
  Phase 1 finds a reason not to; D13 unreached-not-failed and D17 authored+replayed are
  the exact mechanics the rewritten assertions must exercise correctly.
- `docs/architecture/adrs/adr-294-golden-transcripts-tester-rebuild.md` — D4 removed
  `[WHILE:]`, `[RETRY:]`, `[DO]`/`[UNTIL]`, `[IF:]`, `[ENSURES:]`, `[REQUIRES:]`,
  `[NAVIGATE TO:]`; the fixture's transcripts must not use them (parser rejects each by
  name — verified below).
- `docs/architecture/adrs/adr-293-choice-points-per-point-streams.md` — determinism
  discipline: avoid RNG in the fixture, or pin it with `forces:`/`point-seed:` if a
  choice point is ever introduced.
- `docs/context/project-profile.md` — confirms `tools/ide` carries its own Swift-based
  golden-test discipline alongside the platform's transcript tester, and the project's
  RNG/determinism rule (byte-identical at a pinned seed, not "didn't throw").
- `docs/context/session-20260807-1724-feat-ide-go-live-phases-1-3.md` — most recent
  session's open items: go-live Phase 4 (the transcript move this plan is racing) was
  **not started this session** ("inaccessible — David was away from home"), and the active
  `.current-plan` pointer before this plan was `docs/work/ide-docs-tab/plan.md`, unrelated.
  Confirms `branch-stories/fernhill/tests/transcripts/` still holds all 22 files today —
  this plan runs *before* Phase 4, which is the point.

## Grounding (established this session, not to be re-derived)

- **Harness**: `sharpee test <story> --tree --json` dispatches to `@sharpee/branch-tester`
  (v2) via `packages/devkit/src/commands/test-tree.ts`. `assembleTree` builds the tree from
  every transcript's `continues:` header (`packages/branch-tester/src/tree.ts`);
  `tree-report.ts` computes the unreached/failed split (D13); `run.executedCommands -
  run.authoredCommands` is the replayed count (D17), printed by the reporter and
  recomputed independently by the Testing tab's own JS from the raw NDJSON stream — so
  agreement is a wire claim, not a copied constant (this is what Acceptance 2 actually
  tests, and must keep being true against the fixture).
- **Bare `.story` file + sibling `tests/`**: `runTestCommand` in
  `packages/devkit/src/commands/test.ts` takes `dir = path.dirname(storyFile)` when given
  a `.story` path, and `findTranscripts(path.join(dir, 'tests'))` globs
  `**/*.transcript` recursively. `loadAuthorGame` → `findStoryFile` requires **exactly one**
  root-level `.story` file in that directory and needs no `package.json`/`src/` (confirmed
  by `BuildRunnerTests.swift`'s "no package.json, no src/" comment against real Fernhill,
  and by `bootstrap`'s `findStoryFile`/`chordGame` path). So a fixture is: one `.story`
  file + a `tests/` subtree of `.transcript` files, nothing else required.
- **Minimal verified Chord header shape**: `TestToolchain.cleanStory` in
  `tools/ide/SharpeeIDETests/TestToolchain.swift` is explicitly "verified against the live
  CLI" — `title:`/`authors:`/`id:`/`story-version:`/`ifid:` fields, no `story "Title" by
  "Author"` inline form. **Use this shape, not `docs/reference/chord-language.md`'s
  `smoke.story` example** — the doc is confirmed stale here (sharpee.net is canon per
  project memory) and disagrees with both Fernhill's real header and `TestToolchain`'s
  live-verified one.
- **No repo-wide story discovery to dodge**: `./repokit build <name>` takes an explicit
  story name; there is no directory sweep of `stories/`/`branch-stories/` in `./repokit`
  or `scripts/bundle-entry.js` that would pick up a new story unasked (`bundle-entry.js`'s
  `branch-stories/` regex only *classifies* a path it's already been given, never
  enumerates the directory). This is good news for Hard Constraint 2 but Phase 1 confirms
  it rather than trusting this note alone.
- **XcodeGen risk, identified but not yet resolved**: `tools/ide/project.yml`'s
  `SharpeeIDETests` target has `sources: - path: SharpeeIDETests` with **no excludes**,
  unlike the app target (which excludes `Resources/testing-tab/**` and
  `Resources/docs-tab/**` precisely because those are folder references XcodeGen must not
  also individually enumerate). Dropping a `.story` + `tests/*.transcript` tree directly
  under `SharpeeIDETests/` risks XcodeGen picking the files up into a build phase of the
  **test bundle** (not the shipped app — lower stakes, but still not "nothing discovers
  it"). Phase 1's job is to settle this: either an `excludes:` glob mirroring the app
  target's pattern, or placing the fixture one level outside anything named in `sources:`.
- **Hard Constraint 7 check — no `packages/` change anticipated.** Every mechanism above
  (`test.ts`, `test-tree.ts`, `branch-tester`) is read-only for this plan: the fixture is
  consumed by existing, unmodified code paths. The only non-story, non-transcript file
  this plan expects to touch is `tools/ide/project.yml` (IDE tooling, not `packages/`) and
  `tools/ide/SharpeeIDETests/TestingTabRealPathTests.swift`. If Phase 1 finds this false,
  it must say so loudly and stop rather than proceed into `packages/`.
- **HARD CONSTRAINT 1, standing for the whole plan**: no file under
  `branch-stories/fernhill/tests/transcripts/` is read by any phase below. Every transcript
  reference in this plan is either `stories/dungeo/**` (format reference) or the fixture's
  own new files.

## Proposed fixture tree (design target — Phase 3 pins the real numbers)

A single tiny Chord story, one or two rooms, trivial commands (`look`, `examine`, `wait`
— no puzzles). Eight transcript nodes, three roots, chosen so every one of Hard
Constraint 6's shape requirements is met by construction:

```
lobby (root, 2 cmds)
└── hallway (continues: lobby, 2 cmds — the node this plan deliberately breaks)
    ├── closet (continues: hallway, 4 cmds — known turn count + known first source line,
    │           the doc-view / click-through node)
    ├── attic  (continues: hallway, 2 cmds)
    └── cellar (continues: hallway, 2 cmds)
study (root, 2 cmds)
└── footnote (continues: study, 2 cmds — a depth-2 CHAIN, distinct shape from the fan above)
garden (root, 2 cmds, no children — the simplest possible leaf)
```

- **Multiple roots**: `lobby`, `study`, `garden` (3).
- **Interior node with several children** (unreached/badge test): `hallway`, 3 children.
  Breaking it (same technique as today — insert a bad command after a literal line,
  restore in a `defer`) must produce 1 failure, `hallway`'s 3 children `unreached`, and the
  badge on `lobby` (`hallway`'s parent) — mirroring `arrival`/`key` structurally without
  reusing its numbers.
- **Known turn count + known source line**: `closet`, 4 commands.
- **Replayed ancestors**: `lobby` and `hallway` are each re-executed once per leaf beneath
  them (D17 re-execution, not restore) — replay tags are therefore structural, not
  fabricated.
- **Small and legible**: 8 files, ≤4 commands each, no puzzle state.

Hand-derived reference arithmetic (authored 18, executed 26, replayed 8 — see the design
note in Phase 1) is a sanity check only. **Phase 3 is the source of truth**; if the real
run disagrees with this arithmetic, the real run wins and the design note is corrected,
not the other way around.

## Phases

### Phase 1: Fixture design + invisibility mechanism, confirmed
- **Tier**: Small
- **Budget**: ~80 tool calls
- **Domain focus**: tree shape design (branch-tester's tree/report model); IDE build
  surface (XcodeGen `sources`/`excludes`).
- **Entry state**: This plan approved. No fixture files exist yet.
- **Deliverable**: A short design note (`docs/work/ide-test-fixture-story/design.md`)
  finalizing: the tree shape above (or a corrected version, if reading the actual
  `branch-tester` source this session surfaces a reason to change it — e.g. an
  `assembleTree` edge case), the fixture's exact repo path, and the chosen invisibility
  mechanism with the concrete `project.yml` diff (or the "place it outside `sources:`
  entirely" alternative) written out but not yet applied.
- **Exit state**: Fixture location and invisibility mechanism are settled with evidence,
  not assumption — verified against a scratch XcodeGen regenerate (`xcodegen generate` in
  a throwaway copy or a dry read of the generated `.xcodeproj` after a trial file drop) or
  equivalent proof that no build phase would pick the fixture up.
- **Acceptance criteria**:
  1. Design note states the final tree shape, node names, and target command counts.
  2. Design note states the fixture's absolute repo path and confirms no existing
     `sources:`/`excludes:` entry in `tools/ide/project.yml` currently covers it safely —
     with the fix identified (exact `excludes:` glob, or an out-of-`sources:` path).
  3. Confirms (by reading, not assuming) that `./repokit`, `scripts/bundle-entry.js`, and
     the DMG/`package.sh` pipeline have no path that would enumerate the fixture.
  4. No file under `branch-stories/fernhill/tests/transcripts/` was read.
  5. If any check surfaces a need to touch `packages/`, the note says so loudly and this
     phase stops rather than proceeding to Phase 2 (Hard Constraint 7).
- **Status**: ABANDONED

### Phase 2: Author the fixture story + transcript tree
- **Tier**: Medium
- **Budget**: ~180 tool calls
- **Domain focus**: Chord authoring (minimal story shape); branch-tester grammar
  (`continues:`, `[OK: contains "..."]`, no removed directives).
- **Entry state**: Phase 1's design note and invisibility mechanism are settled.
- **Deliverable**: The fixture `.story` file (using `TestToolchain.cleanStory`'s
  verified header shape) plus the 8 `.transcript` files from the design note, placed at
  the confirmed location; the `project.yml` invisibility fix applied and `xcodegen
  generate` re-run if the mechanism requires it.
- **Exit state**: `node packages/devkit/dist/cli.js test <fixture>.story --tree --json`
  (run manually from the repo root, per `TestToolchain.devkitCLI`'s convention) completes
  with **zero tree defects** and all nodes passing — nothing is deliberately broken yet.
- **Acceptance criteria**:
  1. Every transcript header uses `continues:` per the design; no transcript uses any
     ADR-294 D4 removed directive (grep the new files for each removed form by name to
     confirm the parser never even gets exercised on them).
  2. The story has no RNG-dependent output, or any RNG is pinned per ADR-293 (`forces:`/
     `point-seed:`) — confirmed by running the CLI twice and diffing byte-for-byte.
  3. A human-mode run (`sharpee test <fixture> --tree`, no `--json`) prints "X passed" with
     zero failed/unreached, X = the leaf count from the design (5).
  4. `xcodebuild -scheme SharpeeIDE build` (or equivalent) still succeeds with the fixture
     in place, and inspecting the built `.app` / `.xctest` bundle confirms the fixture is
     genuinely absent from anything shipped (Hard Constraint 2, closed for real here, not
     just reasoned about in Phase 1).
  5. No file under `branch-stories/fernhill/tests/transcripts/` was read.
- **Status**: ABANDONED

### Phase 3: Record real tally numbers from a live run (clean and broken)
- **Tier**: Small
- **Budget**: ~70 tool calls
- **Domain focus**: the run-event wire / reporter agreement that Acceptance 2 of ADR-301
  actually tests.
- **Entry state**: Phase 2's fixture runs clean via the CLI.
- **Deliverable**: A recorded numbers table appended to `design.md`, derived from actual
  `--json` runs (not the hand-arithmetic in this plan), covering:
  - Clean run: total executed commands, authored/replayed split, roots count, pass count,
    `closet`'s turn count and its first command's source line (`file:line`), count of
    replay-tagged rows.
  - Broken run: same mutation technique as today (insert a bad command after a literal
    line in `hallway.transcript`, restore via the same before/after pattern), then:
    failure count (must be 1), unreached count, which row's badge carries the count
    (`lobby`), and confirmation `hallway`'s children render class `unreached` and never
    `failed`.
- **Exit state**: Every number Phase 4's Swift assertions will need is on paper, each
  traceable to the literal CLI command + captured output that produced it.
- **Acceptance criteria**:
  1. Every recorded number cites the exact command run and shows the relevant slice of
     its output (evidence inline, not narrated).
  2. The clean and broken runs are both captured in the same session, back to back, so
     the "restore" step is verified to actually restore (`hallway.transcript` byte-
     identical to before the mutation after the broken run).
  3. If any recorded number disagrees with the design note's hand arithmetic, the
     disagreement is called out explicitly (it is not a defect in this plan — real runs
     govern).
  4. No file under `branch-stories/fernhill/tests/transcripts/` was read.
- **Status**: ABANDONED

### Phase 4: Rewrite TestingTabRealPathTests.swift against the fixture
- **Tier**: Medium
- **Budget**: ~180 tool calls
- **Domain focus**: the Testing tab's rule-13a acceptance suite (ADR-301 Acceptance 1–6).
- **Entry state**: Phase 3's numbers table is complete and evidenced.
- **Deliverable**: `TestingTabRealPathTests.swift` with every `branch-stories/fernhill`
  reference replaced by the fixture — the `fernhillStory` computed property renamed and
  repointed, `beginRun(story:)`'s story-name argument updated, and every hardcoded
  assertion (552/518/34/22/5/2/"concealment"/16/12/"key"/"search the doormat"/"arrival")
  replaced with the fixture's real, Phase-3-recorded equivalents — preserving each test's
  INTENT per Hard Constraint 3:
  - tree nesting vs. flat → asserted against the fixture's real root/leaf counts
  - replay marking → asserted against the fixture's real replay-tag count (`> 0`, not a
    copied number, matching the existing test's own style)
  - tab tallies agreeing with the reporter → still recomputed by the tab from the stream
    and compared to the fixture's real numbers, never a value copied from this plan
    without having been produced by an actual run
  - broken-interior-node → 1 failure, `hallway`'s children `unreached` and never `failed`,
    badge on `lobby`
  - selection surviving mode switches → same mechanic, fixture node names
  - doc view click-through → `closet`'s real turn count and real first-line number
- **Exit state**: `xcodebuild test` green, and the file has zero remaining references to
  `branch-stories`, `fernhill`, `arrival`, `key`, `concealment`, or `doormat`.
- **Acceptance criteria**:
  1. `grep -n "fernhill\|arrival\|concealment\|doormat" tools/ide/SharpeeIDETests/TestingTabRealPathTests.swift`
     returns nothing.
  2. `xcodebuild test` reported pass/fail per CLAUDE.md's "never auto-retry failed builds"
     rule — if red, report and STOP, do not loop fixing and rebuilding without explicit
     instruction.
  3. Every numeric literal introduced by this rewrite traces to a line in Phase 3's
     recorded table (spot-checked, not assumed).
  4. No file under `branch-stories/fernhill/tests/transcripts/` was read at any point in
     this phase either.
  5. `branch-stories/fernhill` itself (the story, its transcripts, other test files that
     reference it — `ComposeRunnerTests.swift`, `BuildRunnerTests.swift`,
     `StoryIndexTests.swift`, etc.) is untouched; this plan's scope is
     `TestingTabRealPathTests.swift` only, confirmed by `git status`/`git diff` at the end
     of this phase.
- **Status**: ABANDONED

## Out of scope (explicitly)

- Any change to `branch-stories/fernhill` itself, or to the other Swift test files that
  reference it for unrelated reasons (compose, IFID, publish, build) — those are unaffected
  by go-live Phase 4 (which only moves `tests/transcripts/`) and unaffected by this plan.
- Go-live Phase 4 itself (the real transcript-rewrite discovery pass) — this plan exists so
  that work can proceed without breaking `TestingTabRealPathTests.swift`, but does not
  perform it.
- Any change under `packages/` — flagged loudly in Phase 1 if it ever looks necessary,
  never done without a separate discussion per CLAUDE.md.
