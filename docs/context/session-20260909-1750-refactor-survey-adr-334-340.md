# Session Summary: 2026-09-09 - refactor/survey-adr-334-340 (17:45 CDT)

## Goals
- Phase 8 of `docs/work/game-engine-residue/plan.md`: `index.ts` narrows to the contract — ADR first (consumer inventory as Context, export list as Decision), then `index.ts` loses every `export *`, every consumer compiles, the generated API reference diff is the record of what left, gate byte-identical.
- Phase 6 of `docs/work/game-engine-residue/plan.md` (second half of the session, after Phase 8 committed as c52cb421c): parser adapter normalization under David's Option A ruling — one `EngineParser` shape built once at construction; the four guard functions and the fifth cast gone; parser-en-us count unchanged; gate byte-identical.
- Phase 9 of `docs/work/game-engine-residue/plan.md` (added this session from `docs/work/engine-refactor/diagram-notes.md`, David: "let's go ahead with phase 9"): `GameEngineEvents` and the three narrative types move to `types.ts`; a layering test pins the import graph.

## Phase Context
- **Plan**: `docs/work/game-engine-residue/plan.md` — "Extract game-engine.ts residue (ADR-334 follow-on)"
- **Phase executed**: Phase 8 — "index.ts narrows to the contract" (Small, budget 100), then Phase 6 — "Parser adapter normalization" (Medium, budget 250), then Phase 9 — "Two type moves and a layering test" (Small, budget 100)
- **Tool calls used**: 192 / 450 (combined budget of the three phases)
- **Phase outcome**: All three phases completed under budget. Phase 9 was the plan's last phase — **the plan is now fully DONE (Phases 0-9), and this session closes it.**

## Completed

### Phase 8 — ADR-342: engine package contract
- Consumer inventory re-derived: grep of every `@sharpee/engine` import/require across `packages/`, `stories/`, `tools/`, `branch-stories/`, `scripts/`, `docs/book`, `tutorials/` (minus `_archive` and dist) — 26 names in the union; the plan's flagged `IFEntity` leak is already absent from the checker's 112-name export set (its one importer is an uncompiled stdlib example).
- ADR-342 written (`docs/architecture/adrs/adr-342-engine-package-contract.md`): D1 the 31-name contract (26 inventory + 4 stage names + `EngineConfig` by judgment), D2 the 81 names that leave by group with reasons, D3 reachable-is-not-named, D4 root barrel names declaring modules never sub-barrels, D5 the set pinned by a test, D6 no behavior change.
- `adr-review` run at David's request ("review the ADR again"): 16/16 after three folds — a citation line range (22-35), a durable citation for the 112 count (checker method + commit, not a scratchpad file), and the repointed `platform-dispatcher.test.ts` assertion named in Scope.
- David: "accept" — ADR-342 **ACCEPTED**, with an as-built note recording the same-session implementation.
- `index.ts` rewritten: no `export *`, 31 names exported from their declaring modules, rule-9 header. Export map (checker) 112 → 31.
- `tests/unit/public-surface.test.ts` added (D5): asserts no wildcard export and that the checker's export set equals the contract; 2 passing.
- `tests/unit/platform-dispatcher.test.ts:253` repointed: it previously asserted the barrel exported `processEvent`, `enrichTurnEvents`, `dispatchPlatformOperations` (now internal per D2); it now asserts those on the declaring modules and that the barrel names none of them.
- Gate `contract` (17:59 CDT): tsc clean, build ok (engine + every downstream consumer compiled, none edited), IDENTICAL ×4 (Dungeo walkthrough chain, three Chord trees).
- AC-2 negative-control check: scratch `export { wasRefused }` correctly produced `unexpected: ['wasRefused']` from the checker; reverted via `git checkout`, `index.ts` re-written with the identical 31-name content, both tests re-run.
- `tsc --build --force` on engine (I-71ed1a-3 workaround) then `generate-genai-api.js`: `engine.md` 50 → 14 declarations, 4,424 → 2,303 lines; `index.md` count line updated.
- `mutation-verification` relayed: diff under `src/` is `index.ts` only, no function body changed; both new/repointed tests GREEN (checker-resolved export set, module-namespace inspection); every name real consumers import is in the contract; the two `examples/` files were already broken before this phase.
- **Committed as c52cb421c** and finalized mid-session (that finalization independently re-ran the engine suite: 78 files / 752 passed / 7 skipped, matching the session's reported gate).

### DevArch issue filed (David's request, mid-session)
- ChicagoDave/devarch#3: the id-collision scan treats dated blog/book filenames as ADR ids (`adr-locate.sh:45-60` discovers any directory with two `NNNN-*.md`; `id-collision-scan.sh` takes the year as the number); the stranded event-log line noted as a second noise source.

### Phase 6 — Parser adapter normalization (David's Option A)
- David read `docs/work/engine-refactor/diagram-notes.md` first (three type-only import cycles verified against the code; Phase 9 proposed, undecided), then said "phase 6", then ruled **"A"** at 19:02 CDT — the adapter lives in `packages/engine`, `if-domain`'s `Parser` contract and `parser-en-us` untouched.
- `packages/engine/src/ports/parser-interface.ts` rewritten: `IEngineAwareParser` gains optional `registerPronounEntity` (the fifth probe typed like the other four); new `EngineParser` (all five methods required) and `adaptParser(parser)` — identity when the parser already offers all five (so `EnglishParser` is its own `EngineParser`, no hop), a forwarding/no-op wrapper otherwise, idempotent. The four `has*` guards and `isEngineAwareParser` are gone.
- The facade holds `engineParser = adaptParser(options.parser)` beside the raw `parser`; `getParser()`, the install context, and `Story.extendParser` still receive the raw parser. `CommandExecutor` normalizes its own input (`this.parser = adaptParser(parser)`). `TurnEngine.parser` is `EngineParser`, required; three stages lose their `if (engine.parser)` null guards along with the type change.
- `tests/unit/engine-parser.test.ts` added (6 tests): forward/no-op behavior, identity for a full parser, idempotence, `getParser()` still returns the real parser, an engine over a bare `{ parse }` parser starts and runs a turn, and a structural test that no file under `src/` other than the port probes the parser by name.
- Gate `parser-adapter` (19:07 CDT): tsc clean, build ok, IDENTICAL ×4; engine 79 files / 758 passed / 7 skipped (was 78 / 752 / 7); `parser-en-us` 25 files / 328 passed (unchanged from baseline).
- Reference regenerated after `tsc --build --force`: only private-field and `TurnEngine` field lines differ; no public change.
- `mutation-verification` relayed (19:18 CDT): all seven call sites behavior-identical, removed null guards dead, tests GREEN; its one finding — `setupTestEngine(new MinimalTestStory())` passed a story where an options object was expected, silently ignored — fixed in both call sites (6 tests still passing).
- Phase 6 marked DONE (19:02-19:20 CDT).

### Phase 9 — Two type moves and a layering test
- Added to the plan and started on David's word at 19:26 CDT. File-level import graph computed (`scratchpad/graph/graph.cjs`, 104 files): one 55-file strongly connected component held together by exactly two edges into the facade — `turn/context.ts → game-engine.ts` (`GameEngineEvents`) and `install/story.ts → game-engine.ts` (`Story.onEngineReady(engine)`) — plus one directory-level inversion, `ports/language-provider-interface.ts → install/narrative/` (`NarrativeSettings`).
- `GameEngineEvents` lifted from `game-engine.ts` to `types.ts` verbatim; `turn/context.ts` and the facade import it there; the facade's now-unused `CmgtPacket`/`TurnPacket` imports dropped.
- `Perspective`, `Tense`, `NarrativeSettings` lifted from `install/narrative/narrative-settings.ts` to `types.ts` verbatim; that file keeps `NarrativeConfig`, `DEFAULT_NARRATIVE_SETTINGS`, `buildNarrativeSettings` and imports the three back from `types.ts`; `install/narrative/index.ts` no longer re-exports them; `install/context.ts`, `install/narrative-language.ts`, `ports/language-provider-interface.ts`, `game-engine.ts` repointed. `types.ts` remains a leaf (no package-internal import).
- `tests/unit/module-layering.test.ts` added (6 tests): builds the relative-import graph from the files (Tarjan for cycles); asserts the allow-listed edge `install/story.ts → game-engine.ts` still exists and is acyclic once removed, nothing else imports the facade, nothing imports the barrel, `types.ts` is a leaf, `ports/` and `install/narrative/` read only `types.ts`. A scratch `import type { GameEngine }` added to `turn/parse.ts` failed two assertions by that edge's exact name (19:15 CDT); removed by exact-text edit.
- Export map by checker still 31 (public-surface test still passes — no surface change).
- Gate `layering` (19:16 CDT): tsc clean, build ok, IDENTICAL ×4 (Dungeo chain, three Chord trees); engine 80 files / 764 passed / 7 skipped (was 79 / 758 / 7). Reference regenerated after `tsc --build --force`: the moved declarations now print under `types` and leave `install/narrative/narrative-settings`; 14 declaration headings unchanged.
- **Finding for the record**: the diagram notes' "three cycles" are, at file level, one 55-file SCC held by two edges into the facade; this phase removes one (`turn/context.ts`), and the other (`install/story.ts`, `Story.onEngineReady`) is the allow-listed edge and a pending ADR (opened as I-42e176-3 this session) — the SCC dissolves the day that ADR lands, and the layering test will demand the allow-list entry be removed then.
- `mutation-verification` relayed (19:34 CDT): type-only move, export set unchanged, layering test computed from the actual files, no warnings.
- Phase 9 marked DONE (19:26-19:35 CDT). **This closes the plan — every phase 0-9 is now DONE.**

### Plan closure
- `docs/work/game-engine-residue/plan.md` — Phase 9's Status line set to DONE (already recorded progressively during the session); **Plan Status line updated `ACTIVE` → `DONE`** as the last step of this finalization, since Phase 9 was the plan's final non-terminal phase and no PENDING phase remains.
- Per ADR-0007 Decision 5, the plan directory is archived immediately: `bash ~/.claude/scripts/plan-archive.sh game-engine-residue` moves `docs/work/game-engine-residue/` to `docs/work/archive/game-engine-residue/` and releases `.current-plan` if it named this plan.
- **Branch disposition is explicitly David's call, not mine.** The plan's own header states: "the branch merges to `main` once when this plan closes rather than twice" — `refactor/survey-adr-334-340` carries both this plan and the prior refactoring-survey plan (already archived). Nothing about the branch was merged or pushed as part of this finalization.

- **After the second finalize (19:40 CDT onward)**: David: "write the PR" — PR #397 opened, `refactor/survey-adr-334-340` → `main`, 22 commits, the whole survey (ADRs 334-340, 342) by package, gates, follow-ups, issue refs #376-#383 and #385 without closing keywords. David: "this should be a patch bump for both Sharpee and Chord (I think)" — `tsf version --bump patch`: every `@sharpee/*` package 5.3.0 → 5.3.1; `./repokit build dungeo --no-genai` stamped `engine-version.ts` and Dungeo's `version.ts`; `website/scripts/sync-versions.mjs` regenerated `versions.json` (sharpee 5.3.1). The Chord LANGUAGE version stays 3.6.0 by ADR-257 D2 (compiler refactors and platform releases do not bump it; no author-visible syntax changed on the branch). Committed c855c8df8, pushed; PR body gained a Version section. Not merged.

- **SonarCloud quality gate on PR #397 (David: "quality gate failed", 19:33 CDT)**: Reliability Rating on New Code D (required A), 5 new bugs: `typescript:S2871` bare `.sort()` on string arrays at `story-loader/src/runtime/bind.ts:52-53` and `character/src/conversation/scene-sub-step.ts:369,386`, and `typescript:S7727` `.map(normalizeTopic)` at `story-loader/src/runtime/dialogue.ts:56`. All five lines pre-exist on `main` (`runtime.ts:503-504,1197`, `tick-phases.ts:1573,1590`); the survey's file splits made them "new code". Fixed behavior-preservingly: comparator `(a, b) => (a < b ? -1 : a > b ? 1 : 0)` (the default string ordering, code-unit order — not `localeCompare`, which would change order) and an arrow wrapper on the map (`normalizeTopic(text: string)` takes one argument, so the index was never consumed; the wrapper only satisfies the rule). story-loader 121 files / 1104 passed; character 54 / 641; gate `sonar-fix` (19:39 CDT) IDENTICAL ×4, engine 80 / 764 / 7. Duplication on new code 0.9% (threshold 3%), security and maintainability A.

## Key Decisions

### 1. ADR-342 — engine package contract
The engine's public surface is the consumer union plus the authoring surface, named one by one; `EngineConfig` is the one name added by judgment; reachable-but-unnamed types stay internal (the `IProsePipeline` precedent already set this); the root barrel never re-exports a sub-barrel. Link: `docs/architecture/adrs/adr-342-engine-package-contract.md`.

### 2. Implemented ahead of formal acceptance (Phase 8)
The rewrite, tests, and reference regeneration landed before David's "accept" so he could review the ADR, the gate, and the `engine.md` diff together; everything reverts with `index.ts` alone if a name is rejected. No behavior change accompanied the surface narrowing (D6).

### 3. Parser-adapter boundary — Option A (Phase 6)
David ruled the adapter lives inside `packages/engine`, not in `if-domain`'s `Parser` contract: the engine adapts what it is given (`adaptParser`), rather than every `Parser` implementation and test double being forced to implement all five engine-facing methods. `parser-en-us` and `if-domain` are untouched by this plan.

### 4. `onEngineReady` deferred to its own ADR (Phase 9)
The one edge holding the 55-file SCC together besides the type that moved — `install/story.ts → game-engine.ts` via `Story.onEngineReady(engine: GameEngine)` — is deliberately left as an allow-listed edge in the new layering test rather than resolved this session. A role-interface for what a story genuinely needs at ready time is a separate design question and an amendment to ADR-342 D1 (stories would then name the new type). Tracked as I-42e176-3.

- PR #397 is the merge vehicle; the merge is David's. Chord Writer's version was not touched.
- Sharpee 5.3.1 is committed on the branch, so the publish workflow's `git diff --exit-code` stamping check passes once merged; the Chord language stays 3.6.0.

## Next Phase
Plan complete — all phases (0-9) done. `docs/work/game-engine-residue/plan.md` has been archived to `docs/work/archive/game-engine-residue/plan.md` as part of this finalization.

There is no successor plan queued in this session. Candidate follow-on work, none yet planned:
- The `onEngineReady` role-interface ADR (I-42e176-3) — would remove the last allow-listed edge in `module-layering.test.ts` and amend ADR-342 D1.
- The paused refactoring-survey package queue (I-7f0471-2): devkit, platform-browser, if-domain, core, and the rest — a separate, already-open item, not part of this plan.
- Whether/when `refactor/survey-adr-334-340` merges to `main` — David's call, per the plan's own header.

## Open Items

### Short Term
- I-42e176-1: three story-loader tests import `PluginRegistry` from `@sharpee/engine`; repoint to `@sharpee/plugins` and retire the re-export (ADR-342 Consequences).
- I-42e176-2: two dead examples do not compile and import names that no longer exist — `packages/stdlib/examples/pushable-trait-with-handler.ts` (`IFEntity` from engine) and `packages/engine/examples/language-management.ts` (`createStandardEngine`); David's call whether to delete or fix.
- I-42e176-3: `onEngineReady` needs its own role-interface ADR (what a story needs at ready time) plus an amendment to ADR-342 D1; it is the allow-listed edge (`install/story.ts → game-engine.ts`, `Story.onEngineReady`) that `tests/unit/module-layering.test.ts` pins and will demand removed from its allow-list once the ADR lands.

### Long Term
- I-71ed1a-3: `tsc --build --force` before trusting the generated API reference (GH #391 workaround) — applied again in all three phases this session; the underlying incremental-tsc staleness bug remains open.

## Files Modified

**Plan & ledger** (3 files):
- `docs/work/game-engine-residue/plan.md` (Phases 6, 8, 9 → DONE; Plan Status ACTIVE → DONE; archived to `docs/work/archive/game-engine-residue/` this finalization)
- `docs/context/.open-items.jsonl` — I-42e176-1, I-42e176-2, I-42e176-3 opened this session
- `docs/context/session-20260909-1750-refactor-survey-adr-334-340.md` (this file)

**ADR** (1 file):
- `docs/architecture/adrs/adr-342-engine-package-contract.md` (new, ACCEPTED, Phase 8)

**Engine package — Phase 8** (2 files, committed c52cb421c):
- `packages/engine/src/index.ts` — rewritten: 112 → 31 named exports, no `export *`
- `packages/engine/tests/unit/public-surface.test.ts` (new) — pins the 31-name contract
- `packages/engine/tests/unit/platform-dispatcher.test.ts` — one assertion repointed

**Engine package — Phase 6** (5 files):
- `packages/engine/src/ports/parser-interface.ts` — `EngineParser`/`adaptParser`, four `has*` guards removed
- `packages/engine/src/game-engine.ts` — `engineParser` field, guard removal at construction/`switchPlayer`
- `packages/engine/src/command/command-executor.ts` — normalizes its own parser input
- `packages/engine/src/turn/held-command.ts`, `packages/engine/src/turn/command-history.ts` — guards removed, `EngineParser` typed
- `packages/engine/tests/unit/engine-parser.test.ts` (new, 6 tests)

**Engine package — Phase 9** (7 files):
- `packages/engine/src/types.ts` — gains `GameEngineEvents`, `Perspective`, `Tense`, `NarrativeSettings`
- `packages/engine/src/game-engine.ts` — `GameEngineEvents` removed, imports from `types.ts`
- `packages/engine/src/turn/context.ts`, `packages/engine/src/turn/parse.ts` — repointed
- `packages/engine/src/install/context.ts`, `packages/engine/src/install/narrative-language.ts`, `packages/engine/src/install/narrative/index.ts`, `packages/engine/src/install/narrative/narrative-settings.ts` — three types moved out, re-imported
- `packages/engine/src/ports/language-provider-interface.ts` — repointed to `types.ts`
- `packages/engine/tests/unit/module-layering.test.ts` (new, 6 tests)

**Generated reference** (2 files):
- `packages/sharpee/docs/genai-api/engine.md` — regenerated across all three phases (final: 14 declarations)
- `packages/sharpee/docs/genai-api/index.md` — count line updated

**Routine** (1 file):
- `stories/dungeo/src/version.ts` — build-date stamp

## Notes

**Session duration**: ~17:45-19:35 CDT (~1h50m across three phases, with a commit-and-finalize between Phase 8 and Phase 6), plus this closing finalization.

**Approach**: Phase 8's ADR was written and reviewed before code so the ADR, the gate, and the `engine.md` diff could be reviewed together. Phase 6 was gated on David's explicit design ruling before any code was written (CLAUDE.md "Platform changes require discussion first"). Phase 9 was added mid-session from a reference document David read together with the assistant, then computed fresh against the actual files rather than trusting the document's own claim of "three cycles."

**This finalization's scope**: this update covers Phases 6, 8, and 9 together, rolling up an earlier mid-session finalization that covered Phase 8 alone (committed as c52cb421c). The plan is now closed (Plan Status: DONE) and archived as part of this pass — the first time this plan's rollup has reached that state.

---

## Session Metadata

- **Session**: 42e176
- **Status**: COMPLETE
- **Blocker**: N/A
- **Blocker Category**: N/A
- **Estimated Remaining**: N/A
- **Rollback Safety**: safe to revert for the uncommitted portion (Phases 6 and 9 — nothing merged to main, no other consumer edited); Phase 8 is committed locally (c52cb421c, not pushed) and reverts cleanly via `index.ts` alone if a name is rejected.

## Dependency/Prerequisite Check
- **Prerequisites met**: Phase 7 (package layout) done before Phase 8 started; Phase 5 done before Phase 6 started; Phases 6 and 8 both done before Phase 9 started (its entry state named both).
- **Prerequisites discovered**: none.

## Architectural Decisions
- ADR-342: Engine package contract — ACCEPTED 2026-09-09 (session 42e176, Phase 8). Names the 31-export public surface; everything else becomes internal; root barrel never re-exports a sub-barrel. `docs/architecture/adrs/adr-342-engine-package-contract.md`.
- Pattern applied: rule 8 (Clear Boundaries) — Phase 8 is the first phase to give `packages/engine` a boundary it never had; Phase 6 applies the same discipline to the parser seam under David's Option A; Phase 9 makes the internal layering (types.ts as a leaf) an enforced invariant rather than an aspiration.
- No new ADR was written for Phase 6 (a design ruling recorded in the plan itself) or Phase 9 (a mechanical consequence of ADR-334/ADR-342, with the one open design question — `onEngineReady` — deferred to I-42e176-3's future ADR).

## Mutation Audit
- Files with state-changing logic modified: none in Phases 8 and 9 (export-surface and type-location changes only, no function body changed). Phase 6 changed control flow at seven call sites (guard removal) but is behavior-preserving by construction — `mutation-verification` confirmed each site produces the same effective call whether the injected parser implements all five methods or none.
- Tests verify actual state mutations (not just events): YES for Phase 6 (evidence: `pnpm --filter '@sharpee/engine' test`, 2026-09-09 19:20:38 CDT — "Test Files 80 passed (80)", "Tests 764 passed | 7 skipped (771)", fresh relative to the 19:17:00 CDT last source edit; `tests/unit/engine-parser.test.ts` asserts on the adapter's actual forwarding/no-op behavior, not on return values alone). N/A for Phases 8 and 9 — public-API-surface and type-location changes, not state-mutation changes.
- If NO: N/A

## Recurrence Check
- Similar to past issue? NO — Phase 8 was the plan's first contract-narrowing phase; Phase 6 was the plan's only discuss-first cross-package-boundary phase; Phase 9 was the plan's first layering-invariant phase. None repeats a prior session's issue class.

## Test Coverage Delta
- Tests added: 14 (2 `public-surface.test.ts` + 6 `engine-parser.test.ts` + 6 `module-layering.test.ts`)
- Tests passing before: 750 (Phase 7 baseline, 77 files) → after: 764 (evidence: `pnpm --filter '@sharpee/engine' test`, run 2026-09-09 19:20:38 CDT, fresh relative to the last source edit (19:17:00 CDT) — "Test Files 80 passed (80)", "Tests 764 passed | 7 skipped (771)")
- Known untested areas: the two dead `examples/` files remain uncompiled (I-42e176-2); the `PluginRegistry` re-export path has no direct test of its own (I-42e176-1); the `onEngineReady` seam is pinned as an allow-listed edge but not otherwise tested against a narrower contract (I-42e176-3).

---

**Progressive update**: Session completed 2026-09-09 19:35 CDT (plan closed and archived at finalization)
