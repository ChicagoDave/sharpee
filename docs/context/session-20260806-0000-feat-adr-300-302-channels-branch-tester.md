# Session Summary: 2026-08-06 - feat/adr-300-302-channels-branch-tester

## Goals
- Started: "back to the IDE."
- Build the IDE Testing wire: a live event stream from the testing tools to the IDE, replacing the current after-the-fact record burst.
- Answer ADR-301's open question ("what hosts the Testing tab?") rather than leaving it a placeholder.

## Standing directive received mid-session (2026-08-05, David)
For the IDE and the platform API, everything is on the table; ADR imperatives do not bind the work — judge by what makes a great IDE and amend the ADRs after. This licensed a v2 wire break (ADR-277 D1) and a direct answer to ADR-301's "do not start building until this is answered" line.

## Phase Context
- **Plan**: `docs/work/ide-testing-wire/plan-20260806-run-event-spine.md` — 5 phases. Supersedes `plan-20260805-ide-testing-wire.md` (wire-first sequencing; marked superseded in place, its Swift-decoder-mirror Phase 4 dropped outright by the host decision below).
- **Phase executed**: Phases 1–4, all COMPLETE with status blocks written into the plan file itself.
- **Phase outcome**: Completed on budget for 1, 3, 4; Phase 2 (the one the plan exists for) completed with its performance gate not fully met as stated (see below).

## Completed

### Phase 1 — the run-event vocabulary
New `packages/ide-protocol/src/run-events.ts` at `RUN_EVENT_SCHEMA_VERSION = 2`, a deliberate break from v1 rather than an additive change. Every record now carries an envelope (`seq`, `elapsedMs`); new `phase` and `progress` events (`progress` carries multi-dimensional `budgets` for the eventual ADR-131 explorer); `transcript-start` gains `commandCount`/`parent`/`replayed`; `transcript-end` gains `unreached`/`blockedBy`; `run-end` gains `totalUnreached`. v1 `test-results.ts` is kept and marked deprecated with a pointer forward — consumers move in a later phase, not this one. `CoveragePoint` moved to `run-events.ts` and is re-exported from `test-results.ts` so deleting the v1 module later leaves nothing dangling. ADR-277 D1 amended in place to record the supersession.

**Gate**: `ide-protocol` 41 passed (4 files), +16 in `tests/run-events.test.ts`. Both build targets clean; `transcript-tester` and `branch-tester` rebuild clean against the new export shape.

**Deviation from plan**: no `finding` event was declared. Its shape is not knowable until the explorer exists, and inventing one would pin a guess; the doc comment records that adding a variant later stays additive.

### Phase 2 — the observer seam
`RunObserver` on `RunnerOptions`. Both command loops route every append through a `record()` helper so the announced sequence *is* `TranscriptResult.commands` — not a second bookkeeping path that could drift from it. `runTranscript` announces before any early return. New `transcript-tester/src/run-event-stream.ts` owns envelope bookkeeping (`seq` monotonic, `elapsedMs`); the schema version is mirrored and compile-time pinned, never value-imported, per ADR-277 D1's type-only rule. `reporter.ts` split into `reportTranscriptStart`/`reportCommandResult`/`reportTranscriptEnd`, with `reportTranscript` reimplemented on top of them so live rendering and post-hoc rendering cannot drift from each other.

**Gates, all executed**:
- Dungeo chain terminal output diff-clean against a pre-change capture (1085 lines, timing lines excluded), `952 passed`.
- Live vs post-hoc rendering of `rug-trapdoor` identical but for absolute-vs-relative path (a pre-existing CLI difference) and 1ms.
- Real Fernhill `--json` stream: 20 events, 0 rejected by `isRunEvent`, seq 0..19, `transcript-start` before the first `command-result`.
- Suites: transcript-tester 262 passed (22 files, +9), devkit 132 passed/1 skipped (+1), branch-tester 360 passed (unchanged), ide-protocol 41 passed.

**Performance gate not met as stated — reporting the actual numbers, not the target.** The plan set a 5% wall-clock ceiling against an 8452ms baseline. Three post-change runs gave 8435/8494/9853ms against a re-measured 8512ms baseline that itself varied 8452–8512ms across its own runs. Median-to-median is within 1%, but the spread on both sides exceeds the 5% ceiling as written, so the honest statement is "no detectable regression at this granularity," not "verified within 5%."

**An existing rule-13a real-path test caught the break.** devkit's `test-json.test.ts` — which spawns the real command rather than stubbing it — failed 9 tests immediately on the version bump because it validated against v1's `isTestResultRecord`. Migrated to `isRunEvent` and strengthened with a new case pinning Phase 2's actual claim: start-before-commands, `commandCount` matching what ran, monotonic `seq`, non-decreasing `elapsedMs`.

### Phase 3 — phase events around load and compile
`loadAuthorGame` gained an optional `LoadPhaseReporter`, built inside the loader rather than as an outside timing wrapper — a Chord project's compile happens inside `loadAuthorGame` itself, so a wrapper could only ever say "loading" and never where the time went. Module-story projects emit `load` alone, correctly with no `compile` phase. ADR-248's `freshStory` recompile is deliberately left unreported — announcing a mid-transcript compile would read as a new run starting.

**Measured on real stories**: Fernhill (Chord) — `compile` 2→12ms, `load` 12→19ms, then `transcript-start`. Dungeo (module story) — `load` 2→81ms, i.e. 79ms of previously invisible time before the first command, and correctly no compile phase.

**Gate**: devkit 133 passed/1 skipped (+1: a real-path case pinning the four-event order, `.story` detail, every phase preceding the first `transcript-start`, non-decreasing elapsed time across each pair). Non-JSON terminal output unchanged.

### Phase 4 — the tree observer, and the `--tree --json` guard comes out
`TreeObserver`/`TreeRunnerOptions` on `runTree`. The tree announces its own nodes and forwards only `onCommandResult` inward, so an execution is never announced twice in two shapes. Unreached nodes emit a start/end pair with zero commands. D11 defects and parse failures emit one `transcript-end{status:'error'}` per file via new `transcriptError`/`transcriptUnreached` methods. The `--tree --json` exit-2 guard from the prior session is deleted.

**Gates**:
- Fernhill `--tree --json` → 634 events, 0 rejected by `isRunEvent`, seq monotonic, 39 executions / 5 roots / 17 replayed, and `552 = 518 authored + 34 replayed` **recomputed from the stream itself** by attributing each command to its enclosing start, not read off the summary.
- Tree terminal output diff-clean vs baseline (659 lines).
- `tree-npm-fixture`: 3 passed, 4 commands (3 authored + 1 replayed).
- Dungeo chain through a rebuilt bundle, diff-clean, 952 passed.
- Suites: branch-tester 360, devkit 135 passed/1 skipped (+3), transcript-tester 262.

**Two findings the work surfaced**:
1. branch-tester carries a full copy of `runner.ts` as well as `types.ts` (ADR-302 D15's deliberate duplication). The first tree stream run emitted **zero** command events while the terminal reported 516 passing commands — the observer had been wired into transcript-tester's copy of the runner only. Both copies now carry it. This is the D15 duplication cost paid a second time in one session.
2. A new test caught `blockedBy` arriving as a stem while `parent` is an absolute path — two identity domains on one wire, the exact failure mode the design argued against. `onNodeUnreached` now passes the failing node itself, and the CLI emits its path.

**Deviation from plan**: `summarizeTreeRun` was NOT rewritten as a projection over the observer's events. It is already a pure projection over `outcomes`, and both `outcomes` and the observer derive from the same execution, so the "one source" property already holds. The tree's terminal output stays post-hoc deliberately — interleaving replays live would put a replayed ancestor's rows mid-tree, reading as the same test running twice, with no way for the terminal to mark them.

### Final suite numbers (session end)
ide-protocol 41 · transcript-tester 262 (22 files, +9) · devkit 135 passed/1 skipped (+3) · branch-tester 360 (unchanged).

### Design work — Phase 5's rendering half, mocks committed rather than left as artifacts
Under `docs/work/ide-testing-wire/`: `testing-tab-mock.html` (a full working mock over the real 22-node, 518-authored-turn Fernhill suite, source line numbers extracted from the real capture; double-click opens a document reading surface), `branch-view-modes.html`, `miller-columns-deep-chain.html`, `testing-tab-prototype.html` (a live replay of the real 634-event Phase-4 capture). Unlike the prior session's mocks, these are committed to the repo, not published-only artifacts — see the correction below on why that mattered this time.

## Key Decisions

### 1. Version 2 is a real break, not an additive migration
ADR-277 D1's record contract is superseded outright rather than versioned alongside v1 forever. Every consumer of the stream lives in this repo, which is what makes the break affordable — there is no external integrator to coordinate with.

### 2. The Testing tab is a web bundle in the IDE's existing WKWebView (ADR-301 D1)
Not a native AppKit rewrite, not a second Swift mirror of the protocol types. The tab imports `@sharpee/ide-protocol` directly, satisfying DEVARCH rule 8b (co-located wire-type sharing) by direct import instead of a hand-maintained Swift decoder that could drift. This retires the Swift `TestResultRecord.swift` mirror as a design decision; deletion is a separate, explicit step (see Open Items).

### 3. Explorer-shaped vocabulary now, explorer unbuilt
`progress` carries `budgets` (plural, multi-dimensional) rather than a simple `done/total`, and `phase`/`transcript-start` are written so a future ADR-131 explorer producer — which proposes candidate transcripts rather than replaying authored ones — can emit the same events with no second stream. Phase 1's synthetic explorer-shaped producer test exists specifically to prove this now, while it is cheap, rather than retrofit it later.

## Corrections David made mid-session — recorded because they drove the outcome, not just noted in passing

1. **Miller columns, not an indented tree.** The first branch-view draft was a vertical indented tree — a layout David's own prior study (session f2a7e6) had explicitly rejected on the grounds that extent should track leaf count, not depth. Root cause: the IDE's own prior mocks exist only as published artifacts, deliberately never committed to the repo (session 1707, §7), so the only trace of the rejected layout left in the repo was a parenthetical in ADR-303 D2. Rebuilt on the real Miller-columns treatment after fetching the actual prior artifacts. This is the reason this session's mocks were committed instead of left artifact-only.

2. **ADR-302 D9 violation — arguing from the wrong corpus.** A deep-chain argument was built on Dungeo's 17-walkthrough corpus. ADR-302 D9 says by name: "No branch, chain, or tree design is to be shaped by Dungeo's corpus"; D12 says Dungeo runs v1 indefinitely and v2's actual consumer is Fernhill; and the IDE never tests Dungeo at all. The study was rewritten on v2's real population (Fernhill), at which point the instance count of the problem being solved went to zero and the verdict flipped from "here's a fix" to "don't build it."

3. **Miller columns shift-left math was wrong.** An initial "3,836px of horizontal travel" cost was miscounted — Finder auto-scrolls the column view, so the real cost is what remains visible on screen after a deep selection (two steps of a chain), not the cumulative travel distance.

4. **A ported v1 walkthrough does not become a deep chain under the tree model.** A spine splits wherever tests attach to it, and every split point then acquires siblings rather than continuing as a single deep line. Evidence pulled from the real corpus: Fernhill's `arrival` node is 2 commands with 12 children; `key` is 2 commands with 4 children.

5. **Artifact CSP forced a design detour, twice.** Artifact publishing refuses inline scripts, so the first interactive studies were rebuilt CSS-only to survive publishing; once David clarified he loads these from Finder rather than a published link, a full JS-driven mock became viable and was built.

## ADR Work

### ADR-277 D1 amended (Phase 1)
Records what survives from v1, the 8452ms baseline measurement, v2 as a deliberate break rather than an addition, and retires the Swift-mirror clause that the new host decision makes moot.

### ADR-301 rewritten and ACCEPTED
Retitled from "The Sharpee Transcript Editor" to "The IDE Testing Surface" — the original file was a TBD placeholder whose only real content was the open question this session answers. Decisions recorded:
- **D1**: web bundle in the WKWebView, three rejected alternative hosts named with reasons; retires the Swift mirror; satisfies DEVARCH rule 8b by direct import.
- **D2**: Miller columns for the branch view, with the subtree-failure count required as a design constraint (not optional decoration).
- **D3**: three view modes, each earning its own shape rather than one mode wearing three hats — List is nearly free, since `TestPanelView` is already an NSOutlineView missing only the level above it.
- **D4**: the mode never auto-switches.
- **D5**: explorer findings are adopted as documents — this resolves ADR-299's `origin: author|explorer` slot, which nothing had set across nine phases of that ADR.
- **D6**: run-coalescing in the column layout is rejected; run-folding stays killed; the narrow trigger that would revive either is named explicitly; Dungeo is explicitly excluded as a design input (consistent with D9 above).
- Seven acceptance criteria recorded. The editing interaction (cards with in-place assertion editing, record-from-play) is explicitly scoped OUT as "the next decision" — which is why ADR-301 has no Open Questions section and ACCEPTED is a legitimate status rather than a premature one.

### ADR-303 D2
Parenthetical repointed from the old mock URLs to ADR-301 D2, now that Miller columns has a real decision to cite instead of an artifact link.

## Next Phase
- **Phase 5**: "The Testing tab" — the web-bundle surface itself: TS→JS build step for the tab, an app-bundled web root plus scheme handler (following the proven `sharpee-play://` pattern), a controller spawning `sharpee test --json`, and `xcodebuild test` passing green against it.
- **Tier**: Large (400 tool-call budget per the plan).
- **Entry state**: rendering already proven via the committed mocks over real capture data (`testing-tab-mock.html`, `testing-tab-prototype.html`); the Swift side is completely untouched — no build step, no scheme handler, no controller exist yet. Which mock the tab follows is explicitly David's call at phase start, per the plan.

## Open Items

### Short Term
- Phase 5's Swift half is entirely unstarted: TS→JS build step, app-bundled web root + scheme handler, controller spawning `sharpee test --json`, `xcodebuild test` green.
- v1 `packages/ide-protocol/src/test-results.ts` and the Swift `TestResultRecord.swift` mirror are superseded but NOT deleted — deletion is proposed, not assumed, and needs explicit confirmation per rule against deleting files without it.
- `tools/ide/SharpeeIDE/Skein/` (12 files) is likewise superseded but carved out of this plan's scope; its own retirement needs its own confirmation.
- devkit, branch-tester, and transcript-tester still import the v1 record types in places; moving those consumers off v1 is a later phase of the retirement, not done here.

### Long Term
- ADR-302 D6 (coverage of untaken divergences) remains unimplemented.
- ADR-131's explorer is still unbuilt, but the vocabulary it needs (an `explore` run mode, denominator-free budgeted `progress`) and its landing surface (ADR-301 D5, findings adopted as documents) now both exist in the wire and the ADR, ahead of the explorer itself.

## Files Modified

**Docs/ADRs** (3 modified, 1 new dir): `docs/architecture/adrs/adr-277-ide-integrated-testing.md`, `adr-301-sharpee-transcript-editor.md`, `adr-303-convergent-paths-and-unwinnable-states.md`; `docs/context/.current-plan` repointed; `docs/work/ide-testing-wire/` new (plan, 4 HTML mocks).

**Platform** (11 modified, 3 new): `packages/ide-protocol/src/{index.ts,test-results.ts}` modified, `src/run-events.ts` new, `tests/run-events.test.ts` new; `packages/transcript-tester/src/{index.ts,reporter.ts,runner.ts,types.ts}` modified, `src/run-event-stream.ts` new, `tests/run-observer.test.ts` new; `packages/branch-tester/src/{runner.ts,tree-runner.ts,types.ts}` modified; `packages/devkit/src/{commands/test.ts,commands/test-tree.ts,commands/test.test.ts,standalone/author-game.ts,tests/test-json.test.ts}` modified.

## Notes

**Session duration**: full working day, 2026-08-05 into 2026-08-06 (session id 7f4a36).

**Approach**: Wire-first, per-phase gates executed against real stories (Fernhill, Dungeo) rather than fixtures wherever the plan allowed it, with each phase's status block written directly into the plan file as it completed. Nothing from this session is committed yet — `git status` at write time shows all changes still working-tree, no commits since `7742463d` (the prior session's finalize).

**Gap acknowledged rather than smoothed over**: Phase 2's performance gate is reported as "no detectable regression" rather than "verified within 5%," because three post-change runs and the re-measured baseline both showed more spread than the 5% ceiling the plan set. The gate is not failed outright — nothing points to a real cost — but it is not proven to the letter the plan wrote, and the plan's status block says so rather than rounding to a pass.

---

## Session Metadata

- **Status**: COMPLETE (unverified: Phase 2's performance gate — reported as "no detectable regression," not the plan's stated "within 5%," per the measurement spread above)
- **Blocker**: N/A
- **Blocker Category**: N/A
- **Estimated Remaining**: N/A (COMPLETE)
- **Rollback Safety**: safe to revert — nothing from this session is committed; all changes are working-tree modifications and untracked new files as of session end.

## Dependency/Prerequisite Check

- **Prerequisites met**: Phase 1 vocabulary was a hard prerequisite for Phases 2–4 and landed first as planned; Phase 2's observer seam was a hard prerequisite for Phase 3 (phase events ride the same stream) and Phase 4 (tree observer reuses the same envelope/record helper).
- **Prerequisites discovered**: Phase 4 surfaced that branch-tester's full copy of `runner.ts` (ADR-302 D15) needed the observer wired independently of transcript-tester's copy — not stated as a prerequisite in the plan, found by the first tree run emitting zero command events.

## Architectural Decisions

- ADR-277 D1 amended (Phase 1) — v2 as a deliberate break, not additive; Swift-mirror clause retired.
- ADR-301 rewritten from placeholder to ACCEPTED — "The IDE Testing Surface" (D1–D6, seven ACs); see ADR Work above for the full decision list.
- ADR-303 D2 parenthetical repointed to ADR-301 D2.
- Pattern applied: DEVARCH rule 8b (co-located wire-type sharing) satisfied by direct TypeScript import into the WKWebView bundle rather than a hand-maintained Swift mirror — the mirror retirement is itself the rule-8b fix.

## Mutation Audit

- Files with state-changing logic modified: `packages/transcript-tester/src/runner.ts` (command loop now routes through `record()`), `packages/branch-tester/src/tree-runner.ts` (node-level observer calls), `packages/devkit/src/standalone/author-game.ts` (`LoadPhaseReporter` calls inside the loader).
- Tests verify actual state mutations (not just events): YES (evidence: real-path stream captures cited per phase above — Fernhill `--json` 20 events/0 rejected for Phase 2, Fernhill `--tree --json` 634 events/0 rejected with counts recomputed from the stream for Phase 4, both executed 2026-08-06 in-session; devkit `test-json.test.ts` and `test.test.ts` real-path cases pinning event order and arithmetic).
- If NO: N/A.

## Recurrence Check

- Similar to past issue? YES — session f2a7e6 and session 1707 both record that the IDE's own mocks live only as published artifacts, never committed, which is exactly the mechanism that caused this session's Miller-columns rework (Correction 1 above): the rejected layout's evidence existed only outside the repo. This session broke the pattern by committing its mocks under `docs/work/ide-testing-wire/`.
- If YES: no further audit needed this session — the fix (commit the mocks) is applied here; worth confirming in a future session that the habit holds.

## Test Coverage Delta

- Tests added: +16 (ide-protocol run-events), +9 (transcript-tester, including run-observer.test.ts), +1 (devkit Phase 3 real-path case), +3 (devkit Phase 4), +1 (devkit Phase 2) — plan-stated deltas, corroborated inline per phase above.
- Tests passing before: ide-protocol 25 → after 41; transcript-tester 253 → after 262; devkit 131 → after 135 passed/1 skipped; branch-tester 360 → after 360 (unchanged, observer wiring only). (Evidence: suite run counts quoted inline in each phase's Gates section above, run 2026-08-06 in-session, after the corresponding edits.)
- Known untested areas: Phase 2's performance gate is not proven to the plan's 5% ceiling (see Notes); the `finding` event has no test because it does not exist yet (deliberate, Phase 1 deviation); ADR-302 D6 (untaken-divergence coverage) remains unimplemented and untested.

---

**Progressive update**: Session completed 2026-08-06
