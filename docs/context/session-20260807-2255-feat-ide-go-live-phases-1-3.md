# Session Summary: 2026-08-07 - feat/ide-go-live-phases-1-3 (CDT)

## Goals
- Rename the IDE's "Docs" tab to "Documentation" (small pre-Phase-4 request).
- Run Phase 4 of the go-live plan: rewrite Fernhill's transcript suite from scratch as an author, log the friction, and diff against the baseline to derive Phase 5's requirements.

## Phase Context
- **Plan**: `docs/work/ide-go-live/plan-20260806-go-live.md` — the seven go-live items.
- **Phase executed**: Phase 4 — "Transcript discovery pass" (item 7, pass 1), no formal tier/budget in the plan.
- **Tool calls used**: 167 (per `.session-state-6ad977.json`; no budget set for this phase).
- **Phase outcome**: Completed on scope. David gave the explicit go-ahead the plan's "Before starting" gate requires (git mv of the 22 originals) before work began.

## Completed

### Docs → Documentation tab rename
- `tools/ide/SharpeeIDE/Play/RightPanelViewController.swift:64` — tab strip title "Docs" → "Documentation"; file header prose updated.
- `website/src/app/chord-writer/content.mdx:48` — tab-reference table row updated to match.
- Regenerated `tools/ide/SharpeeIDE/Resources/docs-tab/docs-index.json` and `pages/chord-writer.html` via `node tools/ide/web/docs-tab/build.mjs`.
- Safe because the tab strip selects by index not title, and no test asserts on tab titles; `DocsTabWebRoot.missingNote` already read "The Documentation tab's" so code was ahead of the label. Swift type names (`DocsTabViewController`, etc.) and the `docs-tab` resource folder name were deliberately left unrenamed.
- xcodebuild full suite: `** TEST SUCCEEDED **`, `Executed 423 tests, with 0 failures (0 unexpected) in 37.411`, re-run 2026-08-07 at commit time [verified — `cd tools/ide && xcodebuild test -scheme SharpeeIDE -destination 'platform=macOS'`, run twice this session, both green].

### Phase 4 — Transcript discovery pass
- **Move**: `git mv` of Fernhill's 22 transcripts from `branch-stories/fernhill/tests/transcripts/` to `docs/work/ide-go-live/fernhill-transcripts-baseline/`. Moved, never deleted (per CLAUDE.md). The frozen ADR-301/302 acceptance fixture at `tools/ide/test-fixtures/fernhill-frozen/` was checked before the move and holds its own copy (23 files: 22 transcripts + `fernhill.story`), so that suite is unaffected.
- **Rewrite**: wrote 15 new transcripts from scratch as an author, without reading the moved originals, keeping a friction log as it happened: `arrival`, `key`, `cellar-dark`, `containers`, `npcs`, `concealment`, `machine`, `vine`, `folly`, `fuse-cut`, `fuse-lose`, `win`, `frost-seal`, `phrasebooks`, `channels` (5 of these — arrival, npcs, machine, frost-seal, phrasebooks, channels — are roots; that's 6, see note below on the shared-root convention). 161 authored commands.
- **Result**: `15 passed` / `196 commands (161 authored + 35 replayed)` via `./sharpee test branch-stories/fernhill --tree` [verified — re-run 2026-08-07 immediately before commit, byte-identical to the run that closed the phase].
- **Diff**: compared the rewritten suite against the moved baseline only after finishing, per the plan's method constraint (reading the originals first would turn the exercise into transcription).
- Mid-phase, David redirected scope: aim for breadth of mechanic classes and assertion forms to build an editor-design corpus, not for reproducing all 22 baseline files — this is why 15 files/6 roots ships rather than 22.

### Deliverables
- `docs/work/ide-go-live/phase-4-friction-log.md` — 27 findings (F1–F27) in encounter order, the baseline diff, and the suite table.
- `docs/work/ide-go-live/phase-5-editor-requirements.md` — 11 requirements (R1–R11), prioritized, derived from the findings. This is Phase 5's input per the plan's acceptance criterion.

## Key Decisions

### 1. Discovery pass done blind, diffed only afterward
Per the plan's explicit method constraint: reading the 22 moved originals before writing would destroy the friction signal by turning authoring into transcription. Honored throughout; the diff step happened last.

### 2. Coverage redirected from reproduction to corpus breadth
David reframed the phase mid-session from "reproduce the 22-file baseline" to "produce enough varied mechanic/assertion coverage to design the editor from." This is why the deliverable is 15 files covering a spread of forms (containers, NPCs, concealment, channels, tool state, win/lose) rather than a 1:1 baseline match — and why the "what was missed" diff became the more load-bearing finding than raw file-count parity.

## Next Phase
- **Phase 5**: "Transcript editor" (item 3) — create, edit, and delete transcript tests from inside the IDE, scoped by Phase 4's friction log (deliberately not fixed in the plan text itself). Existing pieces to build from: the Testing tab (ADR-301), `TranscriptDiscovery`, `TranscriptHighlighter`, and the mocks in `docs/work/ide-transcript-editor/`.
- **Tier**: not specified in the plan (no budget line for Phase 5).
- **Entry state**: Phase 4's friction log and `phase-5-editor-requirements.md` (R1–R11) are the required input and are now in place; ADR-294 D4's removed control-flow directives must not be offered by the editor UI.

## Open Items

### Short Term
- `docs/reference/transcript-testing.md` teaches four removed forms (`[OK: any]`, `[OK: matches]`, `[EVENTS: N]`, `[ENSURES:]`), omits `continues:` entirely, and documents a "Fenced Literal Payloads" backtick syntax that neither parser implements — needs rewrite or deletion (this is plan item 9, scheduled "after Phase 4").
- `packages/devkit/src/commands/play.ts:71` — piped multi-command input silently drops everything after the first command (re-arms `rl.question` only after an `await`, so EOF's `rl.on('close')` wins the race); exit 0, no error. Unfixed. Was the single biggest obstacle to authoring this phase.
- `--bless` is named in the unasserted-command guidance message but does not exist as a flag on `sharpee test` — either implement it or fix the message; the baseline's `recorded.transcript` shows the golden-recording mode it should point to is already expressible in the grammar.
- Nine story/platform defects found during authoring (win paragraph double-prints; fuse per-turn hiss fires post-mortem; vine self-describes as "seedling" while `flowering`; `take the deed` on a closed box silently takes the box via noun-prefix match with no disambiguation; entity topics fall through to generic `ask`; folly door's custom refusal is bypassed by bare `north`; `hiding-spot` changes nothing observable; Smoke-follows-unfed truncates the crowbar chain to one sentence; `clock` channel confirmed silent across 46 ticking turns) plus two platform questions (tool gates require the instrument named even when held — decisive in `fuse-lose`; entity-topic scoping) — not yet filed as GitHub issues.
- `--json`/`--capture-output` (the workable probe loop) don't appear in `./sharpee`'s top-level help, only in the bad-flag usage line — worth fixing regardless of Phase 5, since it blocks any author from discovering the loop without already knowing it exists.

### Long Term
- Unpinned seeds are random per run (observed two different seeds for the identical command sequence); the ADR-294 "deterministic at a pinned seed" premise rests on an undocumented header field — needs surfacing in author-facing docs, likely folded into item 9's rewrite.
- The turn-budget entanglement across the transcript tree (a parent's command count is a hidden input to every descendant's expected turn number) is currently answered only by an unwritten convention visible in the baseline's file shapes (shared roots kept to 2 commands). Phase 5 should make this explicit, not just replicate the convention silently.

## Files Modified

**IDE/website (Docs tab rename)** (4 files):
- `tools/ide/SharpeeIDE/Play/RightPanelViewController.swift` - tab title + header prose "Docs" → "Documentation"
- `tools/ide/SharpeeIDE/Resources/docs-tab/docs-index.json` - regenerated by `docs-tab/build.mjs`
- `tools/ide/SharpeeIDE/Resources/docs-tab/pages/chord-writer.html` - regenerated by `docs-tab/build.mjs`
- `website/src/app/chord-writer/content.mdx` - tab-reference table row

**Phase 4 transcripts** (37 files):
- 22 files `git mv`'d from `branch-stories/fernhill/tests/transcripts/` to `docs/work/ide-go-live/fernhill-transcripts-baseline/` (baseline, preserved)
- 15 new files written at `branch-stories/fernhill/tests/transcripts/` (the rewritten suite)

**Deliverables** (2 files):
- `docs/work/ide-go-live/phase-4-friction-log.md` - F1–F27 findings, baseline diff, suite table
- `docs/work/ide-go-live/phase-5-editor-requirements.md` - R1–R11, prioritized

## Notes

**Session duration**: ~1 hour (started 2026-08-07 ~22:55 CDT).

**Approach**: Docs tab rename done first as a small interrupt. Phase 4 followed the plan's blind-authoring method exactly: move, author from memory with a running friction log, diff last. `scripts/clodpod.sh` (untracked, present since session start) is a separate, deliberately-untracked artifact per prior project notes and is not part of this session's work — excluded from Files Modified above.

**Carried forward, unrelated to this session's work**: the 521-vs-423 IDE test-count discrepancy (ADR-301 Amendment A1 says 521; full runs report 423) remains unexplained; the manual DMG drag-and-drop install and mounted Finder window remain visually unverified.

---

## Session Metadata

- **Status**: COMPLETE (unverified: xcodebuild 423-test pass count, `./sharpee test --tree` 15-passed/196-command count)
- **Blocker** (if any): N/A
- **Blocker Category**: N/A
- **Estimated Remaining**: N/A (Phase 4 complete; Phase 5 scoping is the next session's work, not a remainder of this one)
- **Rollback Safety**: safe to revert — the move used `git mv` (baseline preserved, not deleted), and the rewritten suite plus both markdown deliverables are new/untracked additions.

## Dependency/Prerequisite Check

- **Prerequisites met**: David's explicit go-ahead for the transcript move (plan's "Before starting" gate); the frozen ADR-301/302 fixture confirmed to hold its own copy of all 22 originals before the move, so Phase 4 could proceed without risking that acceptance suite.
- **Prerequisites discovered**: none beyond what the plan anticipated.

## Architectural Decisions

- None this session. Findings reference existing ADRs (ADR-294 D2/D4/D5, ADR-293 Phase C/D, ADR-300 D5, ADR-287 D1) but no new ADR was written or amended.

## Mutation Audit

- Files with state-changing logic modified: none. This session's platform/IDE change was a UI string constant plus a docs-bundle regeneration; everything else was transcript fixture files and markdown. Rule 15 (mutation-verification trigger) did not fire.
- Tests verify actual state mutations (not just events): N/A
- If NO: N/A

## Recurrence Check

- Similar to past issue? Uncertain — the `packages/devkit/src/commands/play.ts:71` piped-input bug and the `docs/reference/transcript-testing.md` staleness were not confirmed against prior session summaries in this pass; both read as newly-surfaced findings specific to Phase 4's blind-authoring method rather than repeats of a previously logged blocker.
- If YES: N/A

## Test Coverage Delta

- Tests added: 15 transcript files (161 authored commands; 196 total including 35 replayed) replacing 22 moved-out baseline files in the story's active test path — net transcript-file count in `branch-stories/fernhill/tests/transcripts/` is -7 versus the prior baseline, by design (breadth-over-reproduction redirect).
- Tests passing before: 22 baseline transcripts (moved, not run this session) → after: 15 new transcripts, all passing [verified — `./sharpee test branch-stories/fernhill --tree` → `15 passed`, `196 commands (161 authored + 35 replayed)`, re-run at commit time]. IDE suite unchanged at 423 passing [verified, see above]. The DevArch event log carries no `test`-kind rows this session because the runs were plain Bash invocations, not agent-mediated; the commands and their output are in the session transcript.
- Known untested areas (relative to baseline, per the friction-log diff): golden recordings (`recorded`), `dawn-lose` (turn 130), `media-degrade`, `restart` (meta commands), `compass`, the pantry door's two-sidedness (`doors`), `timeline` as its own file, `tool-gates` as a family, `smoke-nose`, `e-group`. Per the friction log, every miss traces to either a mode discovery never surfaced (golden recordings, `--bless`) or a beat too many turns deep to reach in this pass — none were missed because the mechanic was hard to test once found.

---

**Progressive update**: Session completed 2026-08-07 23:35 CDT
