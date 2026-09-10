# Session Plan: Implement ADR-343 — `StoryEngine` role interface

**Created**: 2026-09-09
**Plan Status**: DONE
**Overall scope**: Give `onEngineReady` a thirteen-member role interface (`StoryEngine`) instead of the whole `GameEngine` facade, closing the last import cycle into `packages/engine`'s facade and amending ADR-342's contract by one name. Platform change (`packages/engine`) — discuss-first is satisfied by ADR-343's own acceptance.
**Bounded contexts touched**: `packages/engine` (`install/story.ts`, `game-engine.ts`, `index.ts`, `module-layering.test.ts`, `public-surface.test.ts`); implementers in `stories/dungeo`, `stories/family-zoo-tutorial`, `stories/channel-service-test`, `packages/devkit/fixtures/basic-story`, `docs/book/v2.0.0` snippets, `packages/story-loader/src/loader.ts`. No Chord change, no wire change, no `GameEngine` member change (ADR-334 AC-5). `tutorials/familyzoo/v2.0.0` is pinned and untouched.
**Key domain language**: `StoryEngine` (the role a story is handed at ready time), `onEngineReady` (the hook), `Story` contract, the engine package's contract (ADR-342 D1), the module-layering allow-list.

## References consulted
- `docs/architecture/adrs/adr-343-story-engine-role.md` — authoritative spec: D1's thirteen members and signatures, D2's hook signature and cycle removal, D3's contract amendment, D4's implementer repoints, D5's allow-list emptying, D6's byte-identical requirement, AC-1..AC-5.
- `docs/architecture/adrs/adr-342-engine-package-contract.md` — the contract is a named list in `index.ts`; D3 requires a consumer-must-name trigger and an amendment line on D1 in the same commit as the code change; the CONTRACT fixture in `public-surface.test.ts` pins the set by name.
- `docs/architecture/adrs/adr-334-game-engine-turn-pipeline.md` — AC-5 (as amended A1(iv)): no `GameEngine` public member removed or renamed by this work; the facade's surface is otherwise frozen.
- `docs/context/project-profile.md` — TypeScript strict mode via shared `tsconfig.base.json`; Vitest per-package; transcript/branch-tester gates are separate manual steps from `test:ci`; no path-alias convention, CommonJS resolution.
- `docs/work/archive/game-engine-residue/plan.md` (Phase 9 record) — named this exact edge (`install/story.ts → game-engine.ts`) as the one allow-listed cycle, pending this ADR; the layering test's shape (Tarjan-based, fails by edge name) that this phase's D5 step relies on already exists and only needs the allow-list emptied.
- `docs/context/session-20260909-1750-refactor-survey-adr-334-340.md` — this session's record: ADR-342 and ADR-343 written and accepted this session at `ef0bbf49f`; the residue plan closed with Phase 9 as its last item.

## Phases

### Phase 1: Declare and wire `StoryEngine`; repoint every implementer
- **Tier**: Small
- **Budget**: 100
- **Domain focus**: `packages/engine`'s internal layering (the facade importable only from `index.ts` and its own class declaration) and the engine package's public contract (ADR-342 D1).
- **Entry state**: ADR-343 ACCEPTED; residue plan archived; working tree clean on `main` at `ef0bbf49f` plus the two uncommitted docs noted in session context. Baseline gate scripts and `baseline/` outputs from this session's scratchpad (`gates/gate-stage.sh`, `gates/baseline/`) are reusable as-is — no re-baseline needed.
- **Deliverable** (ADR-343 D1-D6, in order):
  1. Capture/confirm the byte-identical baseline using the existing scratchpad gate scripts (`gates/gate-stage.sh` against `gates/baseline/`) — reused, not rewritten.
  2. Declare `StoryEngine` in `packages/engine/src/install/story.ts` with the thirteen D1 members (six registration, six reads, one acting method — exact signatures per the ADR) and `Story.onEngineReady?(engine: StoryEngine): void`; drop `import type { GameEngine } from '../game-engine.js'` from `story.ts`.
  3. `export class GameEngine implements StoryEngine` in `game-engine.ts` (no member changes — ADR-334 AC-5).
  4. `export type { StoryEngine }` from `index.ts`; add `StoryEngine` to the CONTRACT fixture in `tests/unit/public-surface.test.ts` (32 names); write the amendment line on ADR-342 D1 (`docs/architecture/adrs/adr-342-engine-package-contract.md`) citing ADR-343, in the same commit as the code change (ADR-342 D3).
  5. Empty `ALLOWED_CYCLE_EDGES` in `tests/unit/module-layering.test.ts` (keep the constant and its comment).
  6. Repoint implementers: `stories/dungeo/src/index.ts:825`, `stories/family-zoo-tutorial/src/index.ts:311`, `stories/channel-service-test/src/playable-story.ts`, `packages/devkit/fixtures/basic-story/src/index.ts:299`, and the three `docs/book/v2.0.0` code-snippet files typing `engine: GameEngine` in `onEngineReady` — change to `engine: StoryEngine`; drop the now-unused `GameEngine` import in family-zoo, channel-service-test, and the devkit fixture (signature was its only use). Check whether book chapter markdown repeats the signature inline and note any occurrence found (do not edit the pinned tutorial edition).
  7. `packages/story-loader/src/loader.ts:1053-1061` — replace the inline structural parameter type with `StoryEngine` imported from `@sharpee/engine`; replace the six `if (engine.x)` probes with plain calls.
  8. Gate: engine `tsc --noEmit`; `./repokit build dungeo`; Dungeo chain + three Chord trees byte-identical against baseline; engine suite (expect 80 files / 764 passed / 7 skipped, +0 unless a test is added); story-loader suite unchanged (121 files / 1104); AC-2's scratch check — a scratch `import type { GameEngine } from '../game-engine.js'` in `install/story.ts` fails the layering test naming that edge, then is removed.
  9. `tsc --build --force` on `packages/engine`, then `node scripts/generate-genai-api.js`; review the reference diff (expect one declaration added, under `install/story`).
- **Exit state**: ADR-343's AC-1 through AC-5 all evidenced inline (command, result, time) — the role exists and the hook uses it (AC-1), the layering test is exception-free and fails by name on the scratch check (AC-2), the contract carries 32 names with the ADR-342 amendment landed and every implementer compiles with `StoryEngine` named (AC-3), the loader imports the role and has no probes (AC-4), and the full gate is byte-identical with no engine-suite failures (AC-5). Commit is the user's call.
- **Status**: DONE (2026-09-09; commit is David's call)

## Explicitly out of scope
- Any `GameEngine` member addition, removal, or rename.
- Any change to `tutorials/familyzoo/v2.0.0` (pinned to a published version).
- The deferred `Session` concept (ADR-343 Consequences: not decided here).
- Chord/wire changes.

### Phase 1 progress (2026-09-09, session 42e176, 20:39-20:47 CDT) — HELD for David

Landed and green: `StoryEngine` declared in `install/story.ts` (13 members per ADR-343 D1) with the `GameEngine` import gone; `GameEngine implements StoryEngine` (compiles, no facade change); barrel exports the role and the public-surface fixture is 32; ADR-342 gained Amendment A1; `ALLOWED_CYCLE_EDGES` emptied and the layering test passes, failing by edge on a scratch facade import in `install/story.ts` (AC-2 verified 20:43 CDT); the four in-repo implementers, Dungeo's five orchestration modules, the three book chapters and their three extracted snippets name the role; the Chord loader took `StoryEngine` and lost its inline structural type, its `ChordSlotEntry`, and all six probes. Gate `story-engine` (20:44 CDT): tsc clean, build ok, Dungeo chain IDENTICAL, three Chord trees IDENTICAL, engine suite 80 files / 764 passed / 7 skipped. devkit 27 files / 177 passed / 1 skipped.

**RESOLVED — a finding the ADR got wrong, and what it cost.** `packages/story-loader`'s suite failed 14 files / 68 tests: 15 call sites in the loader's own tests drove the hook with hand-built partial stubs — nine `{ getNpcService, getPluginRegistry }`, six `{ getNpcService }` — and the six probes ADR-343 D4 removed were what let a two-member stub through. With the probes gone the first unconditional call threw `Cannot read properties of undefined (reading 'bind')` at `loader.ts:1056`. The optionality was never defending against real engines lacking members (none does); it was the loader tests' stubbing convenience, which the ADR's Context observed ("probes each optional one before calling it") without asking why.

### Phase 1 completion (2026-09-09, session 03237e, 21:00-21:10 CDT)

The role stays non-optional; the tests get one complete double. `packages/story-loader/tests/helpers/stub-story-engine.ts` exports `stubStoryEngine(overrides?)` — every one of D1's thirteen members present, each read returning the same instance for the double's lifetime as a real engine does — and `recordingPluginRegistry(sink)`, a **real** `PluginRegistry` wrapped so it also appends each registration to `sink`, because the only thing those tests needed that the production class does not give is *install* order (`getAll()` sorts by priority, the run order). All 19 call sites across 14 test files now pass the double and override only what they assert on; every `as never` / `as unknown as Parameters<...>` cast at those sites is gone, and `createNpcService` left the imports of the files that only had it for the stub. The as-built finding is recorded in ADR-343's Consequences.

Evidence, this session:
- `pnpm --filter '@sharpee/story-loader' test` (21:02:31 CDT) — **Test Files 121 passed (121), Tests 1104 passed (1104)**, matching the phase's expected baseline exactly (was 107/1036 with 14 files / 68 failing).
- `pnpm --filter '@sharpee/engine' test` (21:02:57 CDT) — 80 files / 764 passed / 7 skipped.
- `pnpm --filter '@sharpee/devkit' test` (21:04:53 CDT) — 27 files passed / 1 skipped, 177 passed / 1 skipped.
- Gate `story-engine-2` (21:04 CDT, `gates/gate-stage.sh`): `tsc --noEmit -p packages/engine` clean; `./repokit build dungeo --skip engine --no-genai` ok; **IDENTICAL** dungeo-chain, tree-secret-letter, tree-fernhill, tree-ides-of-march; engine 80 / 764 / 7.
- AC-2 negative control (21:04 CDT): a scratch `import type { GameEngine } from '../game-engine.js'` in `install/story.ts` failed `module-layering.test.ts` 2 of 6, naming the edge exactly — `"install/story.ts -> game-engine.ts"` and the 55-file SCC. Restored by file copy; `module-layering` + `public-surface` re-run 8 passed (8).
- Reference regenerated after `tsc --build --force packages/engine/tsconfig.json` + `node scripts/generate-genai-api.js` (21:03 CDT): `engine.md` gains the `StoryEngine` declaration under `install/story`, `GameEngine implements StoryEngine`, and the hook signature; 14 declaration headings unchanged; `index.md` line count 2310 → 2354 and the generated-for line 5.3.0 → 5.3.1.

AC-1 through AC-5 are all evidenced above. Nothing is committed.

### Superseded record (kept for the trail)

**BLOCKED — a finding the ADR got wrong.** `packages/story-loader` suite: 14 files / 68 tests failed (107 files / 1036 passed). Cause: 15 call sites in the loader's own tests drive the hook with hand-built partial stubs — nine pass `{ getNpcService, getPluginRegistry }`, six pass `{ getNpcService }` — and the six probes ADR-343 D4 removed were what let a two-member stub through. With the probes gone the first unconditional call throws `Cannot read properties of undefined (reading 'bind')` at `loader.ts:1056`. The optionality was not defending against real engines lacking members (no engine lacks them); it was the loader tests' stubbing convenience, which the ADR's Context observed ("probes each optional one before calling it") without asking why. Options put to David; nothing reverted pending his ruling.
