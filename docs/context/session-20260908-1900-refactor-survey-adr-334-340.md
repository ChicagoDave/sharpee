# Session Summary: 2026-09-08 - refactor/survey-adr-334-340

## Status: In Progress

## Goals
- Resume the refactoring-survey plan (`docs/work/refactoring-survey/plan.md`) with David at the keyboard: the four HELD confirmations (Phases 3, 5, 14, and Phase 4(b)'s IParser choice), then Phase 9 attended, then the unattended-safe phases.

## Completed
- Phase 3 (#382 / #385) DONE after David's "confirm both": `lang-en-us/src/data/events.ts` deleted whole (nothing imported it), three dead tables and `ActionFailureReason` out of `data/messages.ts` (header rewritten), `EnglishToken` and `EnglishPrepositionProperties` removed; `tryMatchRule` (175 lines), `getDirectionWord` with `DisplayNames`, `ExtendedMatchOptions`, `MatchResult` removed; `DirectionWords`, `DirectionAbbreviations`, `MatchAttemptResult` lose `export` (all three still read internally); three skipped parser tests deleted, bare "put down" carried to GH #388.
- Phase 5 (ADR-338 D2, D7) DONE: `src/extensions/`, `src/examples/`, and the four dead `src/interfaces/` files deleted with their barrel lines; `IParser` kept (option ii, ADR-338 Amendment A2); eight architecture-reason skipped tests deleted, the pockets test un-skipped and kept, the deep-nesting test deleted and carried to GH #389.
- Both phases gated: `compare-gates.sh` IDENTICAL on the Dungeo chain, the seeded unit suite, and the three Chord trees; parser-en-us 328 passing 0 skipped; world-model 1512 passing 0 skipped; lang-en-us 452.
- Found and filed GH #391: the incremental CJS `tsc` leaves `dist/**/*.d.ts` stale (fresh mtime, old content), so `./repokit build` regenerated the API reference with 450+ lines of removed API re-added. `tsc --build --force` on stdlib, world-model (via stdlib's references), and character fixed it; the reference diff is now deletions only.
- Filed GH #390 (Chord Writer closes open files when a different story opens) and GH #392 (export the Testing view to a self-contained HTML file) at David's request.
- Phase 14 item 1 (ADR-337 D1) DONE after David approved the two descriptor fields: the interceptor lifecycle's call site is stdlib's `lifecycle/phase-runner.ts`, called by `CommandExecutor.runPhases`; 605 plumbing lines gone from 40 actions; `contracts.runsOwnHooks` (attacking, the four conversation actions) and `contracts.handlesMultiObject` (taking, dropping, putting, removing) name the exceptions; inserting runs putting's hooks around its delegation. 58 test files now drive phases through the runner. **The refusal-order diff was empty** (both gate runs byte-identical); `earlyRefusal` is declared and unused. ADR-337 Amendment A2; `packages/stdlib/CLAUDE.md` updated; two new test files (engine hook sequence, stdlib structural pin). mutation-verification: clean.

## Key Decisions
- David, 2026-09-08: "confirm both" — the Phase 3 and Phase 5 lists as posted, including the recommendations (delete `events.ts` whole; `IParser` stays in world-model; the ten-row and three-row skip tables as recommended).

## Open Items
- Phase 14 items 2 (D3 deletions: `pushing-original.ts` and the four `.removed` files) and 3 (D7's 27-row skip table: keep 4 that pass un-skipped, delete 23, three GH issues) posted for David's confirmation.
- Phase 9 (ADR-340) waits for an attended session per the plan.

## Files Modified
- See the plan's Phase 3 and Phase 5 outcome records for the full list.

## Notes
- Session started: 2026-09-08 ~19:00 CDT
