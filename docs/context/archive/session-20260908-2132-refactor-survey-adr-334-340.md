# Session Summary: 2026-09-08 - refactor/survey-adr-334-340 (21:32 CDT)

## Goals
- Phase 9 of `docs/work/refactoring-survey/plan.md`: ADR-340 D3, D1, D4, D2 — one assertion core in `@sharpee/transcript-tester`, consumed by `@sharpee/branch-tester`. Run attended (David at the keyboard) in the plan's order: D3 fixture test, the mechanical moves, `errorResult`, then `checkAssertion` and `runCommand` as their own decisions.

## Phase Context
- **Plan**: `docs/work/refactoring-survey/plan.md` — implement ADR-334..340, `**Plan Status**: ACTIVE`.
- **Phase executed**: Phase 9 — "ADR-340 D3, D1, D4, D2 — one assertion core" (Large, budget 350).
- **Tool calls used**: ~150 (state file recorded 142 at last progressive write, 146 at session end) / 350 budget.
- **Phase outcome**: Completed under budget.

## Completed

### Phase 9 (ADR-340 D1-D4) — DONE, phase closed
Session start: audit relayed, core concepts read, gate cleared. Phase 9 stamped CURRENT. Gate scripts (`run-gates.sh`, `compare-gates.sh`) and the Phase 0 `baseline/` copied from session 71ed1a's scratchpad (identical to 4a2d5f's) into this session's scratchpad.

**D3 first**: `packages/branch-tester/tests/assertion-core-ownership.test.ts` + `tests/fixtures/assertion-core-names.json` (26 names). Reads `src/*.ts` text: no top-level declaration of a pinned name; every use bound from an `@sharpee/transcript-tester` specifier. Fails by name against the current copies: 52 failed, 1 passed (21:43 CDT) — by design until D1 lands.

**Phase 8's table corrected**: re-measuring the per-function diff with doc comments included showed Phase 8's extractor cut a function at the first line whose braces balanced, misreading two rows: `evaluateStateExpression` is NOT identical (branch-tester's carried the `story.state =` and Chord `the X is Y` form, GH #355, importing three `@sharpee/story-loader` constants); `runTranscript` "identical" was the same artefact (it is each runner's facade and stays). Also: `configureRandomInstruments` uses `path.basename` and `executeDirective` uses `fs`/`path`, so the core could not be one browser-safe module.

**D1 landed** (David: "go" on the four calls, "go" on the rebuild). Two modules: `packages/transcript-tester/src/assertion-core.ts` (browser-safe evaluator + synthesis; `./assertion-core` package subpath, `typesVersions` for `tsc` consumers) and `command-core.ts` (Node: `runCommand`, directives, instruments, results), both barrel-exported. The Chord state forms became a `StoryStateKeys` parameter (`RunnerOptions.storyStateKeys`; branch-tester exports `CHORD_STORY_STATE_KEYS`) rather than a story-loader dependency, keeping the evaluator bundleable. `channel-assert.ts` moved whole with its test (ADR-340 D2 narrowed by Amendment A1; branch-tester's barrel re-exports the three names). `runCommand` moved with `endingFrom`/`worldEntityRef`/`captureWorldSnapshot`, which read only the engine seam — no injection needed. transcript-tester's `types.ts` is the superset (tree fields optional, four channel kinds added; serializer names those four unserializable so the `.transcript` grammar is unchanged); branch-tester's `types.ts` is `export type *` from the core; branch-tester's runner is `runTranscript`/`openingResult`/`runAssertion` (1500 → 321 lines); `auto-assertion.ts` re-exports the two synthesis functions; `aggregateTestRun` is transcript-tester's; unused `allAssertionsOf` went with the rewrite. `errorResult` spreads `tier`/`goldenPath` conditionally; `runCommand` evaluates channels over `lastChannelValues ?? lastChannels`.

`typesVersions` in transcript-tester's package.json resolves the subpath's types for every `tsc` consumer under `moduleResolution: node` (devkit failed the first gate build without it; verified fixed with a clean tsbuildinfo). IDE aliases added in `build.mjs`, `tsconfig.json`, `vitest.config.ts`; `surface.js` regenerated (diff: the `proseTextLinesOf` banner moves to `transcript-tester/src/assertion-core.ts`, body identical).

**D4 landed**: rule-9 headers on `parser.ts` and branch-tester's `runner.ts`; `Streamable*` (×3) and `ReporterOptions` kept (parameter types of barrel-exported methods) and now barrel-exported.

**D3 verified (AC-1 evidence)**: scratch `normalizeOutput` redefined in branch-tester's runner → "normalizeOutput is redefined in src/runner.ts" + "used … without an import", 2 failed by name; reverted → 53 passed. Five-name grep finds each shared name once, under `transcript-tester/src`.

ADR-340 Amendment A1, an ADR-307 note beside its "Untouched" statement, an ADR-302 D15 note, and the `tools/repokit/src/repo.ts` comment rewritten to state the true premise.

**mutation-verification** ran; three gaps closed in `packages/transcript-tester/tests/assertion-core.test.ts` (9 tests): state forms without keys fall through, the flattened-channel fallback, and the serializer's throw path.

**Gate (22:37–22:45 CDT)**: first `./repokit build dungeo` failed in devkit's `tsc` (branch-tester's declaration shim re-exported a subpath `moduleResolution: node` cannot see → `any`); fixed with `typesVersions` (resolution trace + type probe + clean-tsbuildinfo devkit check), rebuilt on David's word: exit 0, bundle 4,369,112 bytes. `compare-gates.sh baseline phase9`: Dungeo chain, seed-1 unit suite, and the three Chord trees IDENTICAL; chord 1136, story-loader 1083, lang-en-us 452 at baseline; world-model 1512, character 641, stdlib 1664, engine 685, parser-en-us 328/0 skipped at their recorded post-phase counts; transcript-tester 25 files **314** (282 + 23 moved + 9 new), branch-tester 8 files **134** (104 − 23 moved + 53 D3). IDE testing-surface suite 91 passing, `tsc` clean. Phase 9 outcome recorded in the plan; Status DONE.

## Key Decisions

### 1. Two core modules, not one
`executeDirective` and `configureRandomInstruments` carry Node imports (`fs`/`path`), so a single browser-safe module was impossible; `assertion-core.ts` (browser-safe) and `command-core.ts` (Node) split cleanly along that line.

### 2. Chord state forms as a parameter, not a dependency
The Chord `the X is Y` state forms (GH #355) became a `StoryStateKeys` parameter on `RunnerOptions` rather than importing `@sharpee/story-loader` constants into the shared core, keeping the evaluator dependency-free and bundleable.

### 3. `channel-assert.ts` moves whole
ADR-340 D2 was narrowed by Amendment A1 to move the whole file (with its test) rather than splitting it further.

### 4. `runCommand`'s three helpers move with it
`endingFrom`, `worldEntityRef`, `captureWorldSnapshot` read only the engine seam, so no signature injection was needed despite Phase 8's flag that this move might require one.

### 5. Subpath types via `typesVersions`, not per-consumer `paths`
Under `moduleResolution: node`, `exports` subpaths are invisible to `tsc`; a `typesVersions` entry in the producing package resolves the subpath's types for every consumer, versus a `paths` entry per consumer that would need repeating for each new consumer.

## Next Phase
- **Phase 15**: "ADR-334 D3, D4 — one platform dispatcher, the dead enrichment funnel removed" (Medium, budget 200) — PENDING. Explicitly lowest-priority per ADR-334's own D6 order; the plan notes Phases 15-16 may not be reached this session.
- **Phases 10-13** — Phase 13 (ADR-337 D2, D4) already DONE (session 4a2d5f, before this session); Phases 10-12 (ADR-336 D2/D3, ADR-335 D4/D2/D3, ADR-335 D1) remain PENDING.
- **Entry state for Phase 15**: Phase 0 baseline recorded; no outstanding prerequisite.
- The survey's overall-progress item, `I-7f0471-1`, is amended this session: DONE through Phases 0-9, 13, and 14; remaining Phases 10-12, 15-16.

## Open Items

### Short Term
- I-13688e-1: a package subpath consumed through another package's `.d.ts` needs `typesVersions` (not per-consumer `paths`) under `moduleResolution: node`; discovered when the first Phase 9 gate build failed devkit's `tsc` with an `any`-typed import. Also: `tsc --noEmit` after a package.json-only change can replay stale diagnostics from `tsconfig.tsbuildinfo` — verify with a clean tsbuildinfo before trusting a pass.
- I-71ed1a-3: GH #391 workaround — `tsc --build --force` on any touched package (and its dependents) before trusting the generated API reference, until the incremental-`tsc`-stale-`.d.ts` bug is fixed.

### Long Term
- I-71ed1a-4: mutation-verification flagged that stdlib's `dialogue-selector-socket.test.ts` and `adr-231-d4-topic.test.ts` still call the asking/telling phases directly rather than through `CommandExecutor.runPhases` — harmless today, worth revisiting if asking/telling's `runsOwnHooks` contract changes.
- I-7f0471-1 (amended this session): tracks the survey's overall implementation progress against all seven ADRs — DONE through Phases 0-9, 13, and 14; remaining: Phases 10-12, 15-16.
- I-7f0471-2: the separate package-by-package survey ("one at a time") is paused, not finished — unchanged this session.

Closed this session: I-71ed1a-2 — Phase 9 (ADR-340 D1-D4) was recommended to run attended; resolved done, evidence `docs/work/refactoring-survey/plan.md` (Phase 9 outcome, Status DONE).

## Files Modified

**transcript-tester** (new core + wiring):
- `packages/transcript-tester/src/assertion-core.ts` - new: browser-safe evaluator + synthesis
- `packages/transcript-tester/src/command-core.ts` - new: Node `runCommand`, directives, instruments, results
- `packages/transcript-tester/src/channel-assert.ts` - moved from branch-tester (whole file)
- `packages/transcript-tester/src/{runner,types,index,serializer,parser,reporter,run-event-stream}.ts` - superset types, re-exports, barrel updates
- `packages/transcript-tester/package.json` - `exports` + `typesVersions` for the `./assertion-core` subpath
- `packages/transcript-tester/tests/{channel-assert,assertion-core}.test.ts` - moved test + new test (9 cases, mutation-verification gaps)

**branch-tester** (consumes the core):
- `packages/branch-tester/src/{runner,types,auto-assertion,index,tree-walker}.ts` - runner cut from 1500 to 321 lines; types `export type *` from core
- `packages/branch-tester/package.json`, `tsconfig.json` - `@sharpee/transcript-tester` dependency
- `packages/branch-tester/tests/{assertion-core-ownership,chord-state-claim,story-state-claim,world-capture}.test.ts` - new ownership test + updates
- `packages/branch-tester/tests/fixtures/assertion-core-names.json` - new: 26-name fixture pinning shared functions

**IDE**:
- `tools/ide/web/testing-surface/{build.mjs,tsconfig.json,vitest.config.ts}` - alias for the new subpath
- `tools/ide/SharpeeIDE/Resources/testing-surface/surface.js` - regenerated (banner move only, body identical)

**Docs/ADRs**:
- `docs/architecture/adrs/adr-340-testing-assertion-core.md` - Amendment A1
- `docs/architecture/adrs/adr-307-testing-tree-model-v2.md` - note beside "Untouched"
- `docs/architecture/adrs/adr-302-transcript-branches.md` - D15 note
- `docs/work/refactoring-survey/plan.md` - Phase 9 outcome recorded, Status DONE
- `tools/repokit/src/repo.ts` - comment rewritten (now-true premise)

**Build artifacts**: `pnpm-lock.yaml`, `stories/dungeo/src/version.ts` (build stamp), `packages/sharpee/docs/genai-api/{index,tooling}.md` (regenerated).

## Notes

**Session duration**: ~1 hour (21:32-22:45 CDT).

**Approach**: Ran attended per the plan's own recommendation — David's "go" gated each of the four structural calls (module split, `channel-assert.ts` move, `runCommand` move, no-injection decision) and the final rebuild after the `typesVersions` fix. D3's ownership test ran first, by name, before any code moved, and stayed the acceptance gate through to the end (53 passing at close). One gate failure (devkit's `tsc`) was diagnosed and fixed once, not looped on — no build-fail-fix-rebuild cycling.

---

## Session Metadata

- **Session**: 13688e
- **Status**: COMPLETE
- **Blocker**: N/A
- **Blocker Category**: N/A
- **Rollback Safety**: safe to revert — all changes uncommitted on the feature branch `refactor/survey-adr-334-340`, not merged to main

## Dependency/Prerequisite Check

- **Prerequisites met**: Phase 8's diff table (session 4a2d5f) was entry state, correcting two of its rows this session (`evaluateStateExpression`, `runTranscript`) before any code moved; David at the keyboard per the phase's own recommendation.
- **Prerequisites discovered**: `typesVersions` was needed for the `./assertion-core` subpath under `moduleResolution: node` — not anticipated by Phase 8's design notes, which had named `exports`/`paths`/bundler alias as the three resolution paths but not the `tsc`-through-another-package's-`.d.ts` case that devkit's build hit.

## Architectural Decisions

- ADR-340 Amendment A1: narrows D2 — `channel-assert.ts` moves whole (with its test) rather than being split further; records D1/D3/D4 as built (two modules, `StoryStateKeys` parameter, `runCommand`'s helpers moving without injection).
- ADR-307: one-line note beside its "Untouched" statement recording that transcript-tester now exports the assertion core branch-tester consumes.
- ADR-302 D15: same note amended.
- Pattern applied: subpath type resolution via `typesVersions` (not per-consumer `paths`) — the same shape as `@sharpee/sharpee/runtime-surface`'s existing pattern.

## Mutation Audit

- Files with state-changing logic modified: `packages/transcript-tester/src/{assertion-core,command-core}.ts` (new), `runner.ts`, `serializer.ts` (transcript-tester and branch-tester).
- Tests verify actual state mutations (not just events): YES (evidence: mutation-verification agent ran on the changed files this session and flagged three gaps — state forms without keys, the flattened-channel fallback, the serializer's throw path — all three closed in `packages/transcript-tester/tests/assertion-core.test.ts`, 9 new test cases).
- If NO: N/A — gaps found were closed in-session.

## Recurrence Check

- Similar to past issue? NO — no blocker this session; the `typesVersions` finding is a new discovery, not a repeat of a prior session's issue.

## Test Coverage Delta

- Tests added: 9 (assertion-core mutation-verification gaps) + 1 new ownership test file (`assertion-core-ownership.test.ts`, 26-name fixture) in branch-tester.
- Tests passing before: transcript-tester 23 files/282 passing, branch-tester baseline 104 passing → after: transcript-tester **25 files, 314 passing** (282 + 23 moved channel-assert cases + 9 new), branch-tester **8 files, 134 passing** (104 − 23 moved + 53 D3 ownership cases) (evidence: `compare-gates.sh baseline phase9`, run 22:37-22:45 CDT, after every edit this session — Dungeo chain, seed-1 unit suite, and the three Chord trees IDENTICAL to Phase 0 baseline; chord 1136, story-loader 1083, lang-en-us 452, world-model 1512, character 641, stdlib 1664, engine 685, parser-en-us 328/0 skipped all at their recorded counts). IDE testing-surface suite 91 passing, `tsc` clean, same run. `./repokit build dungeo` exit 0, bundle 4,369,112 bytes, same run.
- Known untested areas: unchanged from prior sessions — `earlyRefusal` on `ActionLifecycleDescriptor` remains declared but unused by any descriptor.

---

**Progressive update**: Session completed 2026-09-08 22:45
