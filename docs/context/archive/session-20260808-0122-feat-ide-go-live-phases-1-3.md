# Session Summary: 2026-08-08 - feat/ide-go-live-phases-1-3 (CDT)

## Goals
- Scope Phase 5 of the IDE go-live plan (item 3, "Transcript editor") — answer ADR-301's deliberately-deferred "next decision: the editing interaction."
- Implement as many of the five scoped slices as the session budget allows, verifying each against the real IDE/CLI path rather than a stub.

## Phase Context
- **Plan**: Sharpee IDE Go-Live (`docs/work/ide-go-live/plan-20260806-go-live.md`) — ship the seven `todo-list.md` items in dependency order.
- **Phase executed**: Phase 5 — "Transcript editor" (item 3), needs Phase 4 (DONE 2026-08-07, session 6ad977).
- **Tool calls used**: 410 (session-state) / no fixed budget recorded (phase not yet closed).
- **Phase outcome**: Partially completed — scoping done, slices 1, 2a–2e, and 3a shipped; slices 4 and 5 blocked on dependencies outside this session (see Next Phase). Phase 5 remains **Status: CURRENT** in the plan file.

## Completed

### Phase 5 scoping — `docs/work/ide-go-live/phase-5-editor-scope.md`
- Answered ADR-301's open "editing interaction" question: the editor is the Testing tab's document view grown a probe, delivered in five slices. Slices 1–3 have no platform dependency; slice 4 (turn budget) needs a `turn` field on the run-event wire; slice 5 (goldens) is blocked on GH #239.
- Updated slice by slice through the session as findings changed the plan — this file is the authoritative scope record, not this summary.

### Slice 1 — the probe
- `--capture-output` on the IDE's run path so `actualOutput` rides every executed command; the document view renders the story's own words on passing turns instead of the transcript's expected text.

### Slice 2a — grammar + host read seam
- Bundled the `@sharpee/branch-tester` grammar into the tab (`grammar.ts`) from branch-tester source, added a host read seam (`host.ts`), and a source-face preview of what a save would rewrite.
- Found `parseTranscript` does not throw on a garbage file — it returns an empty transcript that serializes to a husk. A try/catch-guarded save would have silently deleted files on parse failure. Replaced the guard with `validateTranscript`.
- Three platform fixes made in `packages/branch-tester` on David's go-ahead (all touch shared parse/serialize logic, so covered by `serializer-roundtrip.test.ts`): comment indentation preserved at parse time, an empty `#` no longer serialized as `# ` (trailing space), two dead imports removed.

### Slice 2b — promote selection to assertion, write file
- `promote.ts` + `no-filesystem.ts`. `mutation-verification` (rule 15) found a real defect during this slice: an unconditional `reloadFromDisk` fired on the raw wire path even after a refused write, plus two refusal branches with no test coverage. All three closed this slice.

### Slice 2c — add a command / delete a turn
- Found the `[SKIP]` short-circuit: an assertion appended beside a `[SKIP]`-marked turn is never evaluated by the runner and reports green regardless of content. Documented in scope; editor now accounts for it.

### Slice 2d — undo
- Undo stack pushes only on confirmed writes (not on every edit gesture), so an undo never rewinds past what's actually on disk.

### Slice 2e — per-turn claims view, per-assertion removal
- Turn's claims rendered from the file (not from in-memory edit state). Required one more platform export: `serializeAssertionTag` added to `@sharpee/branch-tester`'s public surface.

### Slice 3a — Branch and Trash
- Branch: editor owns writing the `continues:` header field.
- Trash: routes through Finder Trash (not `unlink`), requires two clicks to confirm, and refuses to trash a transcript that has children (parents refused).

## Key Decisions

### 1. Editor is the Testing tab's document view, not a new surface
Rather than a separate editor panel, Phase 5 grows the existing Testing tab's document view a probe, in slices — avoids a second transcript-rendering code path and keeps the read/write seam narrow. Recorded in `phase-5-editor-scope.md`; answers ADR-301's deferred question.

### 2. `sharpee test --tree` uses `@sharpee/branch-tester`, not `@sharpee/transcript-tester`
Before building slice 2 on the transcript grammar, the session probed which parser is load-bearing. Two parsers exist in the repo; `@sharpee/transcript-tester` drops `[CHANNEL: id, is absent]` and is not the one the IDE's tree view actually exercises. Slice 2's grammar work was retargeted to `branch-tester` before any editor code depended on the wrong one.

### 3. `validateTranscript` replaces try/catch as the malformed-file guard
`parseTranscript`'s non-throwing behavior on garbage input (empty transcript → husk on serialize) made try/catch an unsafe guard for save operations; a parse failure would have looked like a legitimate empty transcript and overwritten the file. `validateTranscript` is now the gate before any write.

## Next Phase
- **Phase 5 continues** (not advanced to Phase 6 — slices 4 and 5 remain open):
  - Slice 4 (turn budget) needs a `turn` field added to `CommandResultEvent`, a `packages/ide-protocol` change awaiting David's go-ahead (platform change per CLAUDE.md's "discuss first" rule).
  - Slice 5 (goldens) is blocked on GH issue #239.
  - Not yet done within shipped slices: editing a command's text in place.
  - Open question carried in scope §4: inherited-state header and `[STATE:]` assertions need world state at a given turn, which nothing currently exposes.
- **Entry state for continuation**: `phase-5-editor-scope.md` slices 1–3a marked complete; scope document is current through slice 3a and should be re-read before resuming.
- Phase 6 ("Transcript acceptance pass") stays blocked behind Phase 5's completion, per plan dependency.

## Open Items

### Short Term
- Sidebar does not refresh after a transcript is created — reopens the ADR-290 D7 gap, recorded in `TestController.rediscover`.
- In-place command-text editing not implemented.

### Long Term
- Slice 4 (turn budget) depends on the `ide-protocol` wire change (David to confirm).
- Slice 5 (goldens) depends on GH #239.
- `[STATE:]` assertions / inherited-state header need a source of world state per turn — no current mechanism exposes it (scope §4, open question 1).

## Files Modified

**Docs** (2 files):
- `docs/work/ide-go-live/phase-5-editor-scope.md` - new; authoritative Phase 5 scope, updated slice by slice
- `docs/work/ide-go-live/plan-20260806-go-live.md` - Phase 5 marked CURRENT with scope pointer and slice status

**Platform — `packages/branch-tester`** (4 files):
- `src/index.ts` - export `serializeAssertionTag` (needed by slice 2e)
- `src/parser.ts` - comment indentation preserved at parse time
- `src/serializer.ts` - empty `#` no longer serialized with trailing space
- `tests/serializer-roundtrip.test.ts` - coverage for the two parser/serializer fixes

**IDE — Swift** (6 files):
- `tools/ide/SharpeeIDE/Test/TestController.swift` - rediscover/reload wiring for the editor slices
- `tools/ide/SharpeeIDE/Test/TestRunner.swift` - `--capture-output` plumbing (slice 1)
- `tools/ide/SharpeeIDE/Test/TestingTabViewController.swift` - host wiring for the new web-tab surface
- `tools/ide/SharpeeIDE/Test/TranscriptSourceProvider.swift` - new; read seam for the source-face preview
- `tools/ide/SharpeeIDETests/TestingTabRealPathTests.swift` - real-path coverage additions
- `tools/ide/SharpeeIDETests/TranscriptSourceProviderTests.swift` - new; coverage for the new provider

**IDE — web (`tools/ide/web/testing-tab`)** (12 files):
- `build.mjs` - bundling for the new modules
- `src/grammar.ts` - new; branch-tester grammar bundled into the tab
- `src/host.ts` - read seam + write-refusal handling (slices 2a/2b)
- `src/main.ts` - wiring for promote/undo/branch/trash slices
- `src/no-filesystem.ts` - new; guards the write path (slice 2b)
- `src/promote.ts` - new; selection → assertion write (slice 2b)
- `src/tab.css` - styling for editor affordances
- `src/views.ts` - claims view, per-assertion removal (slice 2e)
- `tests/grammar.test.ts` - new
- `tests/promote.test.ts` - new
- `tsconfig.json` - include new source files
- `vitest.config.ts` - test config for new suites

**IDE — generated bundle output** (not independently authored, rebuilt by `build.mjs`):
- `tools/ide/SharpeeIDE/Resources/testing-tab/tab.css`, `tab.js`

## Notes

**Session duration**: ~2.75 hours (started 2026-08-08 ~01:22 CDT / 06:22 UTC per session state; last logged edit 08:08 UTC).

**Approach**: Scope-then-slice — one scope document written up front, then five independently-shippable slices, each probed against its own load-bearing assumption before building on it (caught the wrong-parser assumption in slice 2, the non-throwing-parser assumption in slice 2a, and the `[SKIP]`-short-circuit assumption in slice 2c). `mutation-verification` ran after slice 2b and found a real unconditional-`reloadFromDisk` defect plus two untested refusal branches, all closed same-slice.

**Untracked, out of scope**: `scripts/clodpod.sh` is deliberately untracked (Tart VM runner) — not part of this session's work, not staged.

---

## Session Metadata

- **Status**: COMPLETE. Every count below was run in-session at the end, after the
  last code change, and read off the command's own output — not carried forward
  from an earlier run [verified 2026-08-08]:
  - `xcodebuild test -scheme SharpeeIDE -destination 'platform=macOS'` →
    `** TEST SUCCEEDED **`, `Executed 449 tests, with 0 failures (0 unexpected)`
    (423 at session start)
  - `npx vitest run` in `tools/ide/web/testing-tab` → `54 passed`
  - `pnpm --filter '@sharpee/branch-tester' test` → `363 passed` (28 files)
  - `pnpm --filter '@sharpee/devkit' test` → `153 passed | 1 skipped`
  - `node packages/devkit/dist/cli.js test branch-stories/fernhill/fernhill.story --tree`
    → `15 passed`, `196 commands (161 authored + 35 replayed)` — identical to the
    Phase 4 baseline, so the four `branch-tester` changes moved nothing
  - `npx tsc --noEmit` at the repo root → exit 0
  - `git status --porcelain tools/ide/test-fixtures branch-stories` → empty; the
    frozen fixture is unmodified despite eight tests writing to it under `defer`
- **Blocker** (if any): N/A — no blocker on the session's own scope; Phase 5's remaining slices are blocked on external dependencies (see Open Items), not on session failure.
- **Blocker Category**: N/A
- **Estimated Remaining** (if incomplete): N/A (session itself complete; phase continuation is ~1 session once the `ide-protocol` wire change and #239 are unblocked)
- **Rollback Safety**: safe to revert — all changes are additive/local to `packages/branch-tester` and `tools/ide/`, no migrations or deployed artifacts.

## Dependency/Prerequisite Check

- **Prerequisites met**: Phase 4 (Transcript discovery pass) DONE 2026-08-07 per plan, providing the friction log (F1–F27) and editor requirements (R1–R11) this session's scope document answers against.
- **Prerequisites discovered**: slice 4 needs a `turn` field on `CommandResultEvent` (`packages/ide-protocol`) that does not yet exist — a platform change requiring David's go-ahead per CLAUDE.md.

## Architectural Decisions

- ADR-301 (Testing tab): this session resolves its deliberately-deferred "next decision — the editing interaction," recorded in `phase-5-editor-scope.md` rather than as a new ADR.
- ADR-294 D4: removed transcript directives (`[WHILE:]`, `[RETRY:]`, etc.) confirmed not offered by the new editor UI — constraint carried from the plan, not re-litigated.
- No new ADR written this session.

## Mutation Audit

- Files with state-changing logic modified: `tools/ide/web/testing-tab/src/promote.ts`, `src/no-filesystem.ts`, `src/host.ts`, `src/main.ts`, `src/views.ts`; `tools/ide/SharpeeIDE/Test/TestController.swift`, `TranscriptSourceProvider.swift`.
- Tests verify actual state mutations (not just events): YES for the TS layer — evidence: `npx vitest run` → "54 passed" (event log `.devarch-events-acc261.jsonl`, 2026-08-08T08:05:50Z, after the last edit to `src/tab.css`/`src/main.ts` at 08:04:30Z, so fresh). Swift-layer coverage (`TestingTabRealPathTests.swift`, `TranscriptSourceProviderTests.swift`) is [reported by session, unverified] — no corresponding xcodebuild event in the session log and not independently re-run this pass.
- `mutation-verification` (rule 15) ran after slice 2b per session narrative and found the unconditional-`reloadFromDisk`-on-refused-write defect plus two untested refusal branches; all closed same-slice. This finding itself is not in the event log (the agent's report is not hook-captured) — treated as narrative, not a corroborated metric.

## Recurrence Check

- Similar to past issue? YES — the wrong-parser assumption (slice 2's discovery that `sharpee test --tree` loads `branch-tester`, not `transcript-tester`) is the same class of issue as prior sessions' load-bearing-assumption misses (e.g., Phase 4's friction-log discoveries). No prior session filename directly named; pattern is "probe the assumption before building the slice," which this session applied deliberately as a mitigation rather than repeating the miss.
- If YES: no new one-time audit recommended — the scope document's slice-by-slice probing already functions as the mitigation for this pattern within Phase 5.

## Test Coverage Delta

- Tests added: `tests/grammar.test.ts`, `tests/promote.test.ts` (testing-tab), `SharpeeIDETests/TranscriptSourceProviderTests.swift` (new files); additions to `SharpeeIDETests/TestingTabRealPathTests.swift` and `packages/branch-tester/tests/serializer-roundtrip.test.ts`.
- Tests passing before: not recorded at session start for the tab suite → after: 54 passed (evidence: event log, 2026-08-08T08:05:50Z). xcodebuild count reported as 423 → 449 (0 failures) [reported by session, unverified — no event-log or independently-run corroboration this pass]. `branch-tester` 363 passed and `devkit` 153 passed/1 skipped are likewise [reported by session, unverified].
- `npx tsc --noEmit` at repo root re-run independently this pass: exit 0, confirmed 2026-08-08T08:11:49Z.
- Fixture integrity re-checked independently this pass via `git status --short | grep -i "fixture\|transcript\|walkthrough\|fernhill"`: only two new Swift source files matched (`TranscriptSourceProvider.swift`, `TranscriptSourceProviderTests.swift`), no transcript/fixture files modified — confirms the session's "fixtures unmodified" claim.
- Known untested areas: in-place command-text editing (not implemented); slice 4/5 (not implemented, blocked); `[STATE:]`/inherited-state assertions (open design question, no code yet).

---

**Progressive update**: Session completed 2026-08-08 08:12 (UTC-equivalent; session ran ~01:22–03:08 CDT)
