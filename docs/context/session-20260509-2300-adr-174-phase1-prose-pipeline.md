# Session Summary: 2026-05-09/10 - adr-174-phase1-prose-pipeline

## Goals

- Stand up `packages/engine/src/prose-pipeline/` as the engine-internal event-to-block translator.
- Cut `@sharpee/engine` off its import of `@sharpee/text-service`.
- Ship the bracket decoration model end-to-end so `[em:emphasized]` renders italic in a default-theme browser build.
- Satisfy ADR-174 AC-1 through AC-7 (plus AC-10/11/12) with full regression passing.

## Phase Context

- **Plan**: `docs/work/adr-174-prose-pipeline/plan-20260509-phase1.md`
- **Phase executed**: Phase 1 — "Engine-Internal Prose Pipeline" (sub-phases 1.1–1.8)
- **Tool calls used**: 428 / unbudgeted
- **Phase outcome**: Completed on budget; all 8 sub-phases landed; branch local, not pushed

## Completed

### 1.1 — Decoration primitives
New module `packages/engine/src/prose-pipeline/decorations/` with `parser.ts`, `resolver.ts`, `platform-vocabulary.ts`, and `types.ts`. Parser rewrites `[type:content]` → `{ className, content }` against ADR-174 contract (bracket-only; no asterisk emphasis; platform names get `sharpee-` prefix; author names pass through bare). 32 tests.

### 1.2 — IDecoration shape change
`packages/text-blocks/src/types.ts`: `IDecoration.type` renamed to `IDecoration.className`; `CORE_DECORATION_TYPES` vocabulary constant removed. Guards and index re-exported. Downstream compilation checked across all packages.

### 1.3 — Port pipeline stages
`filter.ts` and `sort.ts` and `assemble.ts` copied from `@sharpee/text-service` to `packages/engine/src/prose-pipeline/stages/`. Import paths updated; text-service originals kept compilable for downstream consumers. 39 new tests.

### 1.4 — Port handlers
Seven existing handlers (room, revealed, generic, game, help, about, audibility) ported from text-service to `packages/engine/src/prose-pipeline/handlers/`. Four inline handlers extracted from `game-engine.ts` into named files (domain-message, implicit-take, command-failed, client-query). 53 new tests.

### 1.5 — ProsePipeline class
`packages/engine/src/prose-pipeline/pipeline.ts`: wraps the staged pipeline behind the same per-turn contract `TextService` had. 25 integration tests covering full handler dispatch and decoration resolution.

### 1.6 — Engine cutover
`packages/engine/src/game-engine.ts` switched from `createTextService()`/`TextService` to `new ProsePipeline()`. `mock-text-service.ts` deleted; `mock-prose-pipeline.ts` added as test helper. Engine no longer imports `@sharpee/text-service`. Full regression verified.

### 1.7 — Platform CSS shipping (AC-7)
New file `templates/browser/decorations.css` with all 34 platform vocabulary classes. `templates/browser/index.html` links it between `base.css` and `styles.css`. `build.sh` copies it alongside `base.css` in the browser build path. 10 DOM unit tests in `packages/platform-browser/tests/channels/text-content.test.ts`. Visual smoke test confirmed by user against `docs/work/adr-174-prose-pipeline/ac7-smoke-test.html`.

### 1.8 — Final regression and ADR acceptance
Engine vitest: 398 passing, 7 skipped, 0 failures. text-service vitest: 147 passing, 0 failures. platform-browser vitest: 68 passing, 0 failures. Dungeo walkthrough chain: 961 passing, 0 failures, first run. Browser bundle: clean. ADR-174 Phase 1 status set to ACCEPTED (`docs/architecture/adrs/adr-174-decoration-and-prose-pipeline.md`).

### Interlude — stdlib ReadOnlyActionContext deletion
Pre-existing build blocker: `ReadOnlyActionContext` lacked `emitSound` after ADR-172 added it to the `ActionContext` interface. Audit found zero call sites and a 9-month-old `@deprecated for Phase 4 removal` annotation. User authorized deletion (~310 lines). Commit `a60839ef` in `packages/stdlib/src/actions/index.ts`.

## Key Decisions

### 1. Copy, do not move, pipeline stages and handlers (Plan revision during 1.2)
Stages and handlers are copied to engine, not moved. text-service originals stay intact until Phase 3 deletes the package, because `text-service.ts` still imports them and must stay compilable for wire-production downstream consumers (Zifmia, transcript-tester, story scaffolding). This prevents a cascade build failure in Phase 1 that belongs to Phase 2.

### 2. OQ-2 resolution — platform CSS ships under templates/browser/ (during 1.7)
The original plan recommended `packages/platform-browser/assets/` as the CSS home. On-session audit of ADR-170 precedent showed that both existing platform CSS files (`base.css`, `infocom.css → styles.css`) live under `templates/browser/`, not inside any package. Ship location changed to `templates/browser/decorations.css` and plan updated retroactively.

### 3. Delete ReadOnlyActionContext rather than stub it (interlude)
An alternative was to add a no-op `emitSound` stub to keep the deprecated class compilable. Chose deletion after confirming zero call sites and an existing 9-month deprecation annotation. Stub would have left dead code and a misleading interface in place for another 1–2 phases.

### 4. Walkthrough chain flake attributed to pre-existing RNG, not pipeline cutover
First run post-1.6 showed 1039 failures cascading from thief RNG. Second run: 857/0. Post-1.7 first run: 961/0. Consistent with `feedback_flakey_walkthroughs.md` pre-existing note. No regression attributable to Phase 1 work.

## Next Phase

- **Phase 2**: "Migrate wire-production consumers off renderToString"
- **Tier**: unbudgeted
- **Entry state**: OQ-1 must be resolved before Phase 2 starts (see Open Items). Consumers to migrate: Zifmia (`ChatOverlay.tsx`, `GameContext.tsx`), transcript-tester (`story-loader.ts`), story scaffolding (`stories/cloak-of-darkness/run-platform.js`, `test-runner.ts`, `test-parser-events.js`), bridge / runtime / sharpee re-exports of `renderToString` / `renderStatusLine` / `ITextService` / `createTextService`.

## Open Items

### Short Term

- **OQ-1 (blocks Phase 2)**: Where does the `renderToString`-replacement helper live? Options are engine, a new shared package, or kept in text-service until deletion. Must be resolved before Phase 2 implementation starts.
- Branch `adr-174-phase1-prose-pipeline` is local only — push and open PR when David is ready.

### Long Term

- **AC-8** (Phase 2): migrate all downstream consumers off `renderToString`.
- **AC-9** (Phase 3): delete `@sharpee/text-service` package entirely.

## Files Modified

**Engine — prose pipeline (new module)** (22 files):
- `packages/engine/src/prose-pipeline/decorations/parser.ts` — bracket decoration parser
- `packages/engine/src/prose-pipeline/decorations/resolver.ts` — platform-name → `sharpee-` prefix resolver
- `packages/engine/src/prose-pipeline/decorations/platform-vocabulary.ts` — frozen platform name set
- `packages/engine/src/prose-pipeline/decorations/types.ts` — `IDecorationNode`, `IDecorationResult`
- `packages/engine/src/prose-pipeline/decorations/index.ts` — barrel
- `packages/engine/src/prose-pipeline/stages/filter.ts` — ported event filter stage
- `packages/engine/src/prose-pipeline/stages/sort.ts` — ported sort stage
- `packages/engine/src/prose-pipeline/stages/index.ts` — barrel
- `packages/engine/src/prose-pipeline/handlers/room.ts` — ported room description handler
- `packages/engine/src/prose-pipeline/handlers/revealed.ts` — ported revealed-items handler
- `packages/engine/src/prose-pipeline/handlers/generic.ts` — ported generic message handler
- `packages/engine/src/prose-pipeline/handlers/game.ts` — ported game-message handler
- `packages/engine/src/prose-pipeline/handlers/help.ts` — ported help handler
- `packages/engine/src/prose-pipeline/handlers/about.ts` — ported about handler
- `packages/engine/src/prose-pipeline/handlers/audibility.ts` — ported audibility handler (from ADR-172 Phase 7a)
- `packages/engine/src/prose-pipeline/handlers/domain-message.ts` — extracted inline handler
- `packages/engine/src/prose-pipeline/handlers/implicit-take.ts` — extracted inline handler
- `packages/engine/src/prose-pipeline/handlers/command-failed.ts` — extracted inline handler
- `packages/engine/src/prose-pipeline/handlers/client-query.ts` — extracted inline handler
- `packages/engine/src/prose-pipeline/handlers/types.ts` — handler interface
- `packages/engine/src/prose-pipeline/handlers/index.ts` — barrel
- `packages/engine/src/prose-pipeline/pipeline.ts` — `ProsePipeline` class
- `packages/engine/src/prose-pipeline/index.ts` — module barrel
- `packages/engine/src/prose-pipeline/types.ts` — shared pipeline types
- `packages/engine/src/prose-pipeline/assemble.ts` — assembly stage entry

**Engine — modified** (3 files):
- `packages/engine/src/game-engine.ts` — switched from TextService to ProsePipeline; extracted 4 inline handlers
- `packages/engine/package.json` — removed text-service dependency
- `packages/engine/vitest.config.ts` — test globs updated for prose-pipeline/

**Engine — tests** (14 files):
- `packages/engine/tests/prose-pipeline/decorations/parser.test.ts` — 32 tests
- `packages/engine/tests/prose-pipeline/decorations/platform-vocabulary.test.ts`
- `packages/engine/tests/prose-pipeline/decorations/resolver.test.ts`
- `packages/engine/tests/prose-pipeline/stages/filter.test.ts`
- `packages/engine/tests/prose-pipeline/stages/sort.test.ts`
- `packages/engine/tests/prose-pipeline/handlers/room.test.ts`
- `packages/engine/tests/prose-pipeline/handlers/revealed.test.ts`
- `packages/engine/tests/prose-pipeline/handlers/generic.test.ts`
- `packages/engine/tests/prose-pipeline/handlers/game.test.ts`
- `packages/engine/tests/prose-pipeline/handlers/help.test.ts`
- `packages/engine/tests/prose-pipeline/handlers/about.test.ts`
- `packages/engine/tests/prose-pipeline/handlers/audibility.test.ts`
- `packages/engine/tests/prose-pipeline/pipeline.test.ts` — 25 integration tests
- `packages/engine/tests/prose-pipeline/test-helpers.ts`
- `packages/engine/src/test-helpers/mock-prose-pipeline.ts` — replaces mock-text-service.ts
- `packages/engine/tests/game-engine.test.ts` — updated for cutover
- `packages/engine/tests/integration/command-history.test.ts` — updated for cutover

**text-blocks** (3 files):
- `packages/text-blocks/src/types.ts` — `IDecoration.type` → `className`; `CORE_DECORATION_TYPES` removed
- `packages/text-blocks/src/guards.ts` — updated for shape change
- `packages/text-blocks/src/index.ts` — re-export update

**platform-browser** (2 files):
- `packages/platform-browser/src/channels/text-content.ts` — updated for `className` shape
- `packages/platform-browser/tests/channels/text-content.test.ts` — 10 new DOM unit tests

**Browser templates** (2 files):
- `templates/browser/decorations.css` — 34 platform vocabulary CSS classes
- `templates/browser/index.html` — link to decorations.css added

**stdlib** (1 file):
- `packages/stdlib/src/actions/index.ts` — `ReadOnlyActionContext` deleted (~310 lines)

**Bridge / runtime** (2 files):
- `packages/bridge/src/index.ts` — import path updates
- `packages/runtime/src/index.ts` — import path updates

**text-service** (4 files, kept compilable):
- `packages/text-service/src/index.ts` — updated exports
- `packages/text-service/src/decoration-parser.ts` — kept, not deleted
- `packages/text-service/src/cli-renderer.ts` — kept, not deleted
- `packages/text-service/tests/` — 147 tests kept passing

**Build and docs** (4 files):
- `build.sh` — copy decorations.css in browser build path
- `docs/architecture/adrs/adr-174-decoration-and-prose-pipeline.md` — Phase 1 status set to ACCEPTED
- `docs/work/adr-174-prose-pipeline/plan-20260509-phase1.md` — OQ-2 section updated retroactively
- `docs/work/adr-174-prose-pipeline/ac7-smoke-test.html` — visual smoke test page (user-confirmed)

## Notes

**Session duration**: ~5 hours (evening 2026-05-09 through early morning 2026-05-10 CST)

**Approach**: Strict sub-phase sequencing. Each sub-phase shipped a passing test suite before the next began. No hand-wave acceptance — AC-7 required a visual smoke test which the user confirmed explicitly. Interlude commit inserted between 1.5 and 1.6 to clear a pre-existing build blocker that would have blocked the engine cutover.

**Branch state**: all 9 commits are local on `adr-174-phase1-prose-pipeline`; not pushed; no PR opened.

---

## Session Metadata

- **Status**: COMPLETE
- **Blocker**: N/A
- **Rollback Safety**: safe to revert — all Phase 1 changes are additive except the `IDecoration.type → className` rename in text-blocks (breaking) and `ReadOnlyActionContext` deletion in stdlib (breaking). Both are intentional hard-cutovers per project policy (no backwards compatibility). Reverting requires re-applying both breaks in the opposite direction.

## Dependency/Prerequisite Check

- **Prerequisites met**: ADR-174 drafted and in PROPOSED state; audibility handler (ADR-172 Phase 7a) already under text-service and ready to port; `templates/browser/` precedent from ADR-170 available for OQ-2 resolution.
- **Prerequisites discovered**: OQ-1 (renderToString replacement helper home) was not resolved during Phase 1 and blocks Phase 2 entry.

## Architectural Decisions

- **ADR-174** Phase 1 status advanced from PROPOSED → ACCEPTED. Decision: engine owns the prose pipeline internally; `@sharpee/text-service` is deprecated end-of-Phase-1 for wire-production consumers and deleted in Phase 3. Pattern applied: copy-then-cut (not move) to allow phased downstream consumer migration without breaking downstream builds.
- OQ-2 (platform CSS location) resolved to `templates/browser/` per ADR-170 precedent — documented in plan; not ADR-worthy on its own.
- `ReadOnlyActionContext` deletion authorized by user after zero-call-site audit — not ADR-worthy; documented in Key Decisions above.

## Mutation Audit

- Files with state-changing logic modified: `game-engine.ts` (cutover from TextService to ProsePipeline).
- Tests verify actual state mutations: YES — `pipeline.test.ts` asserts on output `ITextBlock[]` content, not just that `processTurn` ran. Handler tests assert on returned block arrays and decoration `className` values. `game-engine.test.ts` updated to assert on ProsePipeline output path.

## Recurrence Check

- Similar to past issue? NO — the copy-vs-move tension in Phase 1 is a new decision point specific to ADR-174's three-phase migration structure, not a recurrence of a prior session problem.

## Test Coverage Delta

- Tests added: ~169 (32 decoration + 39 stages + 53 handlers + 25 pipeline integration + 10 DOM = 159 in new files; ~10 updated in existing engine and platform-browser tests)
- Tests passing before → after: engine 229 → 398; platform-browser 58 → 68; text-service 147 → 147 (unchanged); Dungeo walkthrough 961/0 (baseline maintained)
- Known untested areas: Phase 2 consumers (`renderToString` call sites in Zifmia, transcript-tester, story scaffolding) — those are the Phase 2 scope.

---

**Progressive update**: Session completed 2026-05-10 01:29 CST
