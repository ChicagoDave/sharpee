# Session Summary: 2026-09-08 - refactor/survey-adr-334-340 (19:28 CDT)

## Goals
- Resume the refactoring-survey plan (`docs/work/refactoring-survey/plan.md`) with David at the keyboard: the two HELD confirmation gates (Phase 3, Phase 5), then Phase 14's confirmation gate and D1's landing, then continue toward the unattended-safe phases.

## Phase Context
- **Plan**: `docs/work/refactoring-survey/plan.md` — implement ADR-334..340 (engine, story-loader, chord, stdlib, world-model, character, transcript-tester/branch-tester) plus GH #382/#385 (lang-en-us, parser-en-us cleanup), `**Plan Status**: ACTIVE`.
- **Phases executed**: Phase 3 (#382/#385 decisions, Small, budget 70) — DONE; Phase 5 (ADR-338 decisions, Small, budget 80) — DONE; Phase 14 item 1 (ADR-337 D1's landing, Medium, budget 160) — items 2-3 remain HELD.
- **Tool calls used**: 258 (state file) against a combined 310-call budget across the three phases attempted.
- **Phase outcome**: Phases 3 and 5 completed on budget. Phase 14 partially completed — item 1 (D1) landed and gated; items 2 (D3 deletions) and 3 (D7's 27-row skip table) posted for David and held per the plan's own STOP-and-wait exit state.

## Completed

### Phase 3 (#382 / #385) — DONE
David: "confirm both." Every candidate re-verified against HEAD before editing, and the dead set turned out larger than the posted list: `lang-en-us/src/data/events.ts` deleted whole (nothing imported it at all, including its `IFEvents` copy — the live constant is world-model's); `ActionFailureReason`, `failureMessages`, `systemMessages` (260 lines) removed from `data/messages.ts`, whose header now describes what remains; `EnglishToken`, `EnglishPrepositionProperties` removed from `grammar.ts`. In parser-en-us: `tryMatchRule` deleted (175 lines, `tryMatchRuleWithFailure` is the live matcher); `getDirectionWord` removed along with its only consumer `DisplayNames`; `DirectionWords`/`DirectionAbbreviations` lose `export` (still read internally by `parseDirection`); `ExtendedMatchOptions`, `MatchResult` removed; `MatchAttemptResult` turned out **not** dead (it's `tryMatchRuleWithFailure`'s return type) — loses `export`, stays. All three skipped parser tests deleted: "take in box" parses fine against the real grammar (validation refuses it, not the parser); bare "put down" parses as `put` with a missing object, carried to GH #388; the third predates the current engine per its own comment.

### Phase 5 (ADR-338 D2, D7) — DONE
David: "confirm both." `src/extensions/` (six files, 1,100 lines), `src/examples/event-handler-registration.ts` (174 lines), and the four dead `src/interfaces/` files Phase 4's audit found (`command-executor.ts`, `command-processor.ts`, `command-validator.ts`, `language-provider.ts`) deleted with their barrel lines. **`IParser` stays in world-model** (David, option ii): its result types (`IParsedCommand`, `IParseError`, `CommandResult`) live in `world-model/src/commands/`, and `if-domain` sits below world-model, so neither tightening `if-domain`'s `BaseParser.parse` nor moving `IParser` there is possible without moving the command types too — ADR-338 Amendment A2 records the ruling and withdraws AC-2's `grep IParser → 0` line. Ten skip-test rows resolved: the eight tests whose titles name the architectural reason (`magic-sight` x4, `window-visibility-fixed` x3, `darkness-light` x1 — all assert `getVisible` honoring a `ScopeRule`, which the platform rejects) deleted; `wearable-clothing`'s pockets-visibility test un-skipped and kept (passes as written); `get-in-scope`'s deep-nesting test deleted (fails un-skipped — `getInScope` stops one container level down), carried to GH #389.

### Phase 14 item 1 (ADR-337 D1) — DONE, items 2-3 HELD
David: "recommendations are approved" (the two descriptor fields; D5's amendment followed). D1 built and gated with an empty refusal-order diff — the Dungeo chain, seeded unit suite, and three Chord trees were byte-identical to baseline across two `compare-gates.sh` runs (after the first cut and after the conversation-action fix). As built (ADR-337 Amendment A2): `ActionLifecycleDescriptor` gains required `reportEventType` and `blockedEventType` plus optional `earlyRefusal` (declared, unused — no line needed it, so the criterion question for when to use it stays open). The one call site is stdlib's new `lifecycle/phase-runner.ts` (`runValidatePhase`/`runExecutePhase`/`runReportPhase`/`runBlockedPhase`); `CommandExecutor.runPhases` calls those four and nothing else about the lifecycle. `contracts.runsOwnHooks` names attacking (postExecute mid-execute IS the combat resolution; postReport precedes death/knockout events) and the four conversation actions asking/telling/talking/answering (hooks only when no exchange or thread grips the input, per ADR-320 D16). `contracts.handlesMultiObject` names taking, dropping, putting, removing (the D4 per-item loop stays); inserting has no per-item loop and now runs putting's hooks around its delegated phases itself. 605 plumbing lines gone from 40 actions; the six-name import block gone from 30. 58 test files (31 stdlib, 26 story-loader, 1 character) now drive phases through the runner. Two new pinning tests: `packages/engine/tests/lifecycle-call-site.test.ts` (take lamp fires the four hooks once each in order; a preValidate veto reaches onBlocked; score consults nothing) and `packages/stdlib/tests/unit/actions/lifecycle-call-site.test.ts` (every descriptor names both event types; no action calls a hook without a declared contract; only the four D4 actions import the primitives). `packages/stdlib/CLAUDE.md` updated to state the call site. Items 2 (D3: delete `pushing-original.ts` and the four `.removed` files) and 3 (D7: the 27-row skip-test table) posted in the plan and held — the phase's own exit state says STOP until David confirms both.

### Gates and secondary findings
- Both landed phases gated clean: `compare-gates.sh` IDENTICAL on the Dungeo chain, the seeded unit suite, and the three Chord trees; parser-en-us 328 passing 0 skipped; world-model 1512 passing 0 skipped; lang-en-us 452 passing; stdlib 1657 passing (1654 + 3); engine 685 (682 + 3); story-loader 1083 and character 641 (both baseline).
- Found and filed **GH #391**: incremental CJS `tsc` leaves `dist/**/*.d.ts` stale (fresh mtime, old content), so an ordinary `./repokit build` regenerated the API reference with 450+ lines of removed API re-added. `tsc --build --force` on stdlib, world-model (via stdlib's references), and character fixed it for this session; the reference diff is deletions-only once forced.
- Filed **GH #390** (Chord Writer closes open files when a different story opens) and **GH #392** (export the Testing view to a self-contained HTML file) at David's request — unrelated to the survey, logged per the all-issues-to-GitHub convention.
- `mutation-verification` ran clean after Phase 14 item 1, with one advisory (carried to the ledger, below): `dialogue-selector-socket.test.ts` and `adr-231-d4-topic.test.ts` still call the asking/telling phases directly rather than through the runner — harmless today since neither exercises a hook path.

## Key Decisions

### 1. Phase 3 and Phase 5 lists — "confirm both"
David confirmed both posted lists (deletions, keep-or-remove calls, and the skip-test tables) as recommended, including `IParser` staying in world-model (option ii) rather than migrating to `if-domain`.

### 2. ADR-337 D1 descriptor fields — "recommendations are approved"
David approved `reportEventType`/`blockedEventType` as required descriptor fields before D1 landed; ADR-337's D5 ("and nothing else") was amended after, in Amendment A2, to record the two additions as forced by call sites the ADR text didn't name.

## Next Phase
- **Phase 14, items 2-3**: D3's deletion list (`pushing-original.ts`, the four `actions/removed/*.removed` files) and D7's 27-row skip-test table — posted in the plan, awaiting David's confirmation (I-71ed1a-1). Once confirmed, this phase executes the deletions and skip-test dispositions in one pass and the phase closes.
- **Phase 9** (ADR-340 D1-D4, Large, budget 350) is design-settled per Phase 8's diff table but explicitly recommended to run attended, not unattended (I-71ed1a-2) — resolution wiring across three build systems and two functions needing signature injection are judgment calls.
- Phases 10-13, 15-16 remain PENDING behind these.
- **Entry state for Phase 14's resumption**: David's disposition on both lists; nothing else changed since this session's gate.

## Open Items

### Short Term
- I-71ed1a-1: Phase 14 items 2 (D3 deletions: `pushing-original.ts` and the four `.removed` files under `actions/removed/`) and 3 (D7's 27-row skip-test table) are posted in `docs/work/refactoring-survey/plan.md` and await David's confirmation before they execute.
- I-71ed1a-3: GH #391 workaround — `tsc --build --force` on any touched package (and its dependents) before trusting the generated API reference, until the incremental-`tsc`-stale-`.d.ts` bug is fixed.

### Long Term
- I-71ed1a-2: Phase 9 (ADR-340 D1-D4, one assertion core shared by transcript-tester and branch-tester) is design-settled but recommended to run with David at the keyboard — resolution wiring and two functions needing signature injection are judgment calls.
- I-71ed1a-4: mutation-verification flagged that stdlib's `dialogue-selector-socket.test.ts` and `adr-231-d4-topic.test.ts` still call the asking/telling phases directly rather than through `CommandExecutor.runPhases` — harmless today, worth revisiting if asking/telling's `runsOwnHooks` contract changes.
- I-7f0471-1 (amended this session): tracks the survey's overall implementation progress against all seven ADRs — DONE through Phase 8 plus Phase 14 item 1; remaining phases listed above.

## Files Modified

**lang-en-us** (Phase 3):
- `src/data/events.ts` - deleted whole (345 lines)
- `src/data/messages.ts` - `ActionFailureReason`, `failureMessages`, `systemMessages` removed (269 → fewer lines), header rewritten
- `src/grammar.ts` - `EnglishToken`, `EnglishPrepositionProperties` removed

**parser-en-us** (Phase 3):
- `src/english-grammar-engine.ts` - `tryMatchRule`, `getDirectionWord`+`DisplayNames`, `ExtendedMatchOptions`, `MatchResult` removed (193 lines)
- `src/direction-mappings.ts` - `DirectionWords`/`DirectionAbbreviations` lose `export`
- `tests/unit/english-parser.test.ts` - three skipped tests deleted

**world-model** (Phase 5):
- `src/extensions/*` (6 files), `src/examples/event-handler-registration.ts`, `src/interfaces/{command-executor,command-processor,command-validator,language-provider}.ts` - deleted with barrel lines
- `tests/scope/{magic-sight,window-visibility-fixed,darkness-light}.test.ts`, `tests/unit/world/get-in-scope.test.ts` - deleted (architecture-reason skips)
- `tests/integration/wearable-clothing.test.ts` - un-skipped, kept

**stdlib, engine** (Phase 14 item 1):
- `packages/stdlib/src/actions/lifecycle/{descriptor.ts,phase-runner.ts,registry.ts}` - new phase-runner module, descriptor gains two required + one optional field
- `packages/stdlib/src/actions/standard/*/*.ts` (30 action files) - hook plumbing removed, contracts declared where kept
- `packages/stdlib/src/actions/index.ts`, `packages/stdlib/CLAUDE.md` - call-site documented
- `packages/engine/src/command-executor.ts` - `runPhases` calls the four phase-runner functions
- `packages/engine/tests/lifecycle-call-site.test.ts`, `packages/stdlib/tests/unit/actions/lifecycle-call-site.test.ts` - new pinning tests
- 58 existing test files (31 stdlib, 26 story-loader, 1 character) updated to drive phases through the runner

**ADRs and docs**:
- `docs/architecture/adrs/adr-338-world-model-surface-and-dead-subsystems.md` - Amendment A2
- `docs/architecture/adrs/adr-337-stdlib-lifecycle-and-validator.md` - Amendment A2
- `docs/work/refactoring-survey/plan.md` - Phase 3, 5, 14 outcome records
- `packages/sharpee/docs/genai-api/{index,lang,world-model,stdlib}.md` - regenerated (force-rebuilt per GH #391 workaround)

Full per-file detail: the plan's Phase 3, Phase 5, and Phase 14 outcome records; commits `30bc06065` (Phases 3+5) and `96aaff544` (Phase 14 item 1).

## Notes

**Session duration**: ~1h35m (19:00-20:35 CDT).

**Approach**: Each HELD phase's list was posted verbatim from the plan, David gave a single confirming instruction ("confirm both" / "recommendations are approved"), and the phase executed the confirmed deletions/dispositions in one pass followed immediately by the full gate (`compare-gates.sh` across the Dungeo chain, seeded unit suite, and three Chord trees). No build-fail-fix-rebuild looping occurred; the one mid-session test failure (5 story-loader + 1 character, from the conversation-action hook contract) was diagnosed and fixed before the final gate, not retried blindly.

---

## Session Metadata

- **Session**: 71ed1a
- **Status**: COMPLETE
- **Blocker**: N/A
- **Blocker Category**: N/A
- **Estimated Remaining**: N/A (not incomplete — Phase 14 items 2-3 and Phase 9 are deliberately HELD/attended, not blocked)
- **Rollback Safety**: safe to revert — both commits (`30bc06065`, `96aaff544`) are on the feature branch `refactor/survey-adr-334-340`, not merged to main

## Dependency/Prerequisite Check

- **Prerequisites met**: Phase 4's audit table (IParser member-set comparison, dead-interfaces list) fed Phase 5's confirmation list; Phase 13's validation-pipeline consolidation was entry state for Phase 14; David present at the keyboard for all three confirmation gates.
- **Prerequisites discovered**: None — no new prerequisite surfaced beyond what the plan already named.

## Architectural Decisions

- ADR-338 Amendment A2: `IParser` stays in world-model (option ii); AC-2's `grep IParser → 0` line withdrawn; D2/D7 deletions and skip-test dispositions recorded.
- ADR-337 Amendment A2: D1 built with two required descriptor fields (`reportEventType`, `blockedEventType`) beyond D5's original "and nothing else"; the call site is a stdlib module (`phase-runner.ts`) the executor calls, not code inlined in the executor; `contracts.runsOwnHooks`/`handlesMultiObject` name the declared exceptions; the refusal-order diff was empty, so `earlyRefusal`'s criterion stays an open question.
- Pattern applied: validate/execute/report/blocked four-phase action pattern (ADR-051), now with one lifecycle call site per ADR-337 D1 rather than per-action hook plumbing.

## Mutation Audit

- Files with state-changing logic modified: 30 stdlib standard-action files, `command-executor.ts`, `phase-runner.ts`, `descriptor.ts`, `registry.ts`.
- Tests verify actual state mutations (not just events): YES (evidence: mutation-verification agent run completed 2026-09-09T01:22:22Z per the session event log, reporting clean with one advisory noted above; `packages/engine/tests/lifecycle-call-site.test.ts` and `packages/stdlib/tests/unit/actions/lifecycle-call-site.test.ts` assert the hook sequence and descriptor contract, not just that a call didn't throw).
- If NO: N/A.

## Recurrence Check

- Similar to past issue? NO — this is the first session to land ADR-337 D1; no prior session recorded a comparable lifecycle-plumbing consolidation attempt or failure.

## Test Coverage Delta

- Tests added: 2 new files (`engine/tests/lifecycle-call-site.test.ts` 3 cases, `stdlib/tests/unit/actions/lifecycle-call-site.test.ts` 3 cases); 4 test files deleted (3 parser-en-us skip-resolutions, 4 world-model scope skip-resolutions — net across both phases: 7 skipped tests deleted, 1 un-skipped and kept per Phase 5; 3 skipped tests deleted per Phase 3).
- Tests passing before: parser-en-us 328+3 skipped, world-model 1504+... skips, stdlib 1654, engine 682 → after: parser-en-us 328 passing 0 skipped, world-model 1512 passing 0 skipped, stdlib 1657 passing, engine 685 passing (evidence: plan.md Phase 3/5/14 outcome records quoting `compare-gates.sh` IDENTICAL results and per-package pass counts, corroborated by the session event log's timestamped `Build passed`/`Tests ran` rows for the same package filters, 2026-09-08 19:36-20:24 CDT — all after the last edit to the covered files).
- Known untested areas: `earlyRefusal` on `ActionLifecycleDescriptor` is declared but no descriptor uses it and no test exercises it (no line in the refusal-order diff needed it); Phase 14 items 2-3 (deletions, skip-table) are not yet executed, so their exit-state checks have no evidence yet.

---

**Progressive update**: Session completed 2026-09-08 20:35
