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

## Continuation — 2026-08-08 (session 6ad977 crossed midnight; work below is unrecorded until now)

Everything below happened after commit `60393d68` (the Docs→Documentation rename + Phase 4, recorded above). No new plan phase started — Phase 4 stays COMPLETE, Phase 5 has not begun. Tool calls for the full session now total 341 (up from 167 at the point above), per `.session-state-6ad977.json`.

### Loose-ends routing — 8 GitHub issues filed

Phase 4's findings were routed to the tracker [verified — `gh issue list`, all nine present]:

- **#239** — `sharpee test` lacks `--bless`/`--watch`; goldens and watch mode exist only on the platform bundle (`scripts/bundle-entry.js:201,203`) and `packages/transcript-tester/src/cli.ts:83`, absent from `packages/devkit`, whose own runner tells authors to use a flag it doesn't have.
- **#240** — `sharpee play` drops every piped command after the first (`packages/devkit/src/commands/play.ts:71` re-arms `rl.question` only after an `await`; EOF's `rl.on('close')` wins the race). No author-facing way to script a story run.
- **#241** — tool gates require the instrument NAMED even when held, identical refusal text either way. Corrected afterward (see below) — it's a design question, not a plain bug.
- **#242** — entity topics silently fall through to the generic `ask` reply when the topic entity is out of scope.
- **#243** — a `gated by` channel is silent in transcripts and unassertable [verified by probe — 46 ticking turns, `[CHANNEL: clock, is absent]` passes every time].
- **#244** — transcript grammar gaps: no count assertion, and a transcript cannot continue past a story ending (`Error: Engine is not running` is misclassified as a command error).
- **#245** — nine Fernhill defects from the rewrite (win text twice, post-death phrase ordering, stale vine description, noun-prefix mis-take, folly refusal bypass, hiding-spot no-op, Smoke follows unfed, article/pluralisation bugs, the Dungeo grue line).
- **#246** — sharpee.net documents the hello-world transcript and stops: no `continues:`/tree, no `seed:`, no goldens, no `[STATE:]`/`[EVENT:]`/`[CHANNEL:]`; recommends `--chain`, which ADR-302 D10 retires for trees.
- Commented on **#213** (docs sweep) twice: once corroborating, once correcting (see F1/F18 below).

### Three factual corrections to Phase 4's own findings

Recorded in a new Corrections section of `docs/work/ide-go-live/phase-4-friction-log.md`:

- **F9 overstated.** Reported `--bless` as "a flag that does not exist" — it exists on the platform bundle and transcript-tester CLI, just not on `sharpee test`. Corrected finding is sharper (author-tool parity gap), not weaker.
- **F1 wrong, and it was the headline finding.** Claimed the author-facing docs never show a transcript file; they do, at `website/src/app/chord/getting-started/compose-and-run`. I searched only the Chord Writer section and generalised. Corrected to the real gap: the site covers hello-world and stops (#246). F2 re-weighted high→low after David ruled `docs/reference/` low-priority.
- **F18 — accused a document of fabrication.** Wrote that the backtick-fence syntax "never existed in either parser" and its verification claim was "invented." Both false — David: "there WAS a backtick syntax — I hated it." Verified: `e49c0460` (2026-07-28) shipped `FENCE_DELIMITER = /^`{3,}$/` as ADR-287 all three phases; `a217b8dd` the SAME DAY replaced it after ADR-287 was reopened [verified — `git log -S`, both commits confirmed]. Retracted in the friction log, in R8 of `phase-5-editor-requirements.md`, and in a correction comment on #213. Root error: inferring fabrication from absence instead of running `git log -S`.

Also corrected #241's own framing in a follow-up comment: `website/src/app/chord/cookbook/containers-and-locks/opening-with-a-tool-in-the-command` documents `open X with Y` as a consulted-command-entity path (ADR-230 D3b) and notes the trait-side requirement is "TypeScript territory today" — a design question, not a bug, running the opposite polarity from Fernhill's worked example.

### Memory updated

`project_sharpee_net_canon_docs.md` — added David's history of the docs arc (repo docs → website → Book → Chord, each step moving the landing place further from `docs/`), extended scope to `docs/guides/`, and added the rule: when a repo doc describes something the code lacks, run `git log -S` before calling it wrong — never escalate "stale" to "invented" [verified — file content read back, contains the F18 retraction language].

### New proposal: `docs/proposals/docs-consolidation.md`

Produced via `/devarch:proposal`, reviewed via `/devarch:proposal-review` twice (initial + re-review after edits). 14 items; **P-1 through P-8 ACCEPTED**, P-9 through P-14 PROPOSED [verified — grep of the file's own Status markers matches this split].

Inventory: `docs/` held 31 top-level directories + `README.md`. Keep-list settled at eight: `architecture`, `context`, `design`, `work`, `proposals`, `book`, `core-concepts`, `brainstorm`.

- **P-1** — `docs/unofficial/` is an in-repo quarantine: unmaintained, unpublished, out of scope for proposal/planning/research, and using anything requires moving it out first. Path revised from repo-root to `docs/unofficial/` to match DevArch's `resolution-anchors.sh` default.
- **P-2** — `docs/guides/` + `docs/reference/` (22 files) move to quarantine; the site already carries 53 `chord/stdlib` + 55 `chord/guide` + 23 `chord/cookbook` pages superseding them.
- **P-3** — three archive trees resolve to two destinations by content: `docs/archive/` (27 dirs, 24 with a `plan.md`) → `docs/work/archive/<slug>/` per DevArch Phase 3; `_archive/` (site/web-save/website, 39M) + `_archived/` (28 loose docs) → `docs/unofficial/archive/`. Principle: an archived plan is history to consult; archived documentation is junk mail.
- **P-4** — fourteen git-cold trees archived; `brainstorm/` excluded (it's a DevArch output dir, not dead).
- **P-5** — `actions/`, `api/`, `publish/` archived, plus `scripts/publish-npm.sh`.
- **P-6** — reversed same day: first ruled "stays," then moved to `docs/unofficial/` with **#247** filed to revisit its purpose. Consequence: the engine has no citable written contract until that issue is picked up.
- **P-7** — `docs/book/` stays. **P-8** — `docs/proposals/` stays (mechanically forced by ADR-0008 D5 + DEVARCH.md rule 18a).

Two signal errors caught and corrected, both recorded in the proposal itself:
- **git-cold ≠ dead** — `brainstorm/` was cold because `/devarch:brainstorm` hadn't run, not because it was abandoned.
- **git-warm ≠ alive** — `actions/` was warm because commit `85d54966` was actively dismantling it (deleting its `package.json`). Abandoned package `@sharpee/actions` v0.1.0, last substantive commit 2026-01-14.

Review findings that mattered: P-3 self-contradicted after the DevArch read (fixed, re-accepted); **P-14 had drifted outside the `## Items` section**, which would have made it invisible to `session-planner` and `proposal-review` (fixed); P-4's title said "thirteen" over a 14-directory scope (fixed); `unofficial/` vs `docs/unofficial/` inconsistent across four items (fixed).

Also found: `packages/sharpee/README.md` (published to npm) carries three absolute GitHub links into `docs/`; the accepted items break two (L96 `docs/getting-started/authors/`, L97 `docs/api/`) — the most externally-visible breakage in the consolidation, invisible to a relative-path grep. Recorded in P-12.

### DevArch interlock

Read `../devarch/docs/work/plan-lifecycle-and-folder-controls/plan.md` at David's direction. It overlaps this proposal in four places, and DevArch owns all four: Phases 1-3 (plan terminal state, disposition prompt, archival), Phase 4 (`Read|Grep|Glob` gate on `unofficial/`), Phase 5 (immutability gate on six anchors).

That plan names MY inference — "`packages/media` exists — shipped" — as its own cautionary case, under a governing constraint that disposition is the user's call: "not on a timer, not on a heuristic, and **not on evidence**." I had reported six long-CURRENT plans as shipped/obsolete; those are questions, not findings.

**P-9 rewritten** around David's rule: "only active plans cannot be swept" + "we're only ever working on one plan at a time." `.current-plan` names the active plan; that target stays, all others get explicit disposition and move. Backlog: **110 targets, 1 active (`ide-go-live`), 109 needing disposition** — larger than #214's "86 stale entries." Second self-correction here: I initially measured "active" as "has a CURRENT phase," which is wrong — `ide-go-live` has five COMPLETE phases and no CURRENT one, yet `.current-plan` already names it. Both errors were building a classifier where a pointer already existed.

Anchor gap recorded: DevArch's six anchors protect five of the eight survivors; `design/`, `book/`, `core-concepts/` get no immutability protection.

### Open items added this continuation

- **P-14 is PROPOSED while P-2 is ACCEPTED** — filling the quarantine before writing the rule that makes it one. Should land together.
- Anchor gap on `design/`, `book/`, `core-concepts/` (noted above).
- Suggested to David (not a change request): DevArch rule 18b triggers on `session-planner` writing `.current-plan`; a hand-written pointer change wouldn't ask. May be worth triggering on the write rather than the writer.
- Issue **#247** (docs/spec/ purpose) is new and unscoped — no owner yet.

### Files touched this continuation

- `docs/work/ide-go-live/phase-4-friction-log.md` — modified, Corrections section added (F1, F9, F18).
- `docs/work/ide-go-live/phase-5-editor-requirements.md` — modified, R6/R8 corrections.
- `docs/proposals/docs-consolidation.md` — new, 14 items.
- `/Users/david/.claude/projects/-Users-david-repos-sharpee/memory/project_sharpee_net_canon_docs.md` — memory file, outside repo, not part of any commit.

All three repo files are uncommitted at finalize time. `scripts/clodpod.sh` remains untracked and out of scope per the prior project note (parallel, deliberately-untracked artifact).

**Mutation note**: no side-effect source functions were written after commit `60393d68` — this stretch was entirely markdown, GitHub issues, and one memory file. Rule 15 (mutation-verification) did not fire during the continuation either.

---

## Session Metadata

- **Status**: COMPLETE (unverified: xcodebuild 423-test pass count, `./sharpee test --tree` 15-passed/196-command count)
- **Blocker** (if any): N/A
- **Blocker Category**: N/A
- **Estimated Remaining**: N/A (Phase 4 complete; Phase 5 scoping is the next session's work, not a remainder of this one). The continuation's own next step — David deciding how to proceed on the docs-consolidation proposal's six remaining PROPOSED items and the P-9 disposition backlog (109 targets) — is unscoped, not estimated.
- **Rollback Safety**: safe to revert — the move used `git mv` (baseline preserved, not deleted); the rewritten suite and both markdown deliverables are new/untracked additions; the continuation's three repo files (`phase-4-friction-log.md`, `phase-5-editor-requirements.md`, `docs-consolidation.md`) are uncommitted markdown edits/additions with no code touched.

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
- **Continuation addendum**: the "git-cold ≠ dead" and "git-warm ≠ alive" classifier errors (P-4/P-9 in the proposal) are the same shape as F1/F9/F18 above — inferring a conclusion from an indirect signal (staleness heuristic, doc absence) instead of checking the direct source (`.current-plan`, `git log -S`). Three instances in one session is a pattern worth naming even though none repeats a *prior* session's specific finding; not escalated to `pattern-recurrence-detector` because Status is COMPLETE, not INCOMPLETE/BLOCKED, and rule 19 gates that agent on blocker status.
- If YES: N/A

## Test Coverage Delta

- Tests added: 15 transcript files (161 authored commands; 196 total including 35 replayed) replacing 22 moved-out baseline files in the story's active test path — net transcript-file count in `branch-stories/fernhill/tests/transcripts/` is -7 versus the prior baseline, by design (breadth-over-reproduction redirect).
- Tests passing before: 22 baseline transcripts (moved, not run this session) → after: 15 new transcripts, all passing [verified — `./sharpee test branch-stories/fernhill --tree` → `15 passed`, `196 commands (161 authored + 35 replayed)`, re-run at commit time]. IDE suite unchanged at 423 passing [verified, see above]. The DevArch event log carries no `test`-kind rows this session because the runs were plain Bash invocations, not agent-mediated; the commands and their output are in the session transcript.
- Known untested areas (relative to baseline, per the friction-log diff): golden recordings (`recorded`), `dawn-lose` (turn 130), `media-degrade`, `restart` (meta commands), `compass`, the pantry door's two-sidedness (`doors`), `timeline` as its own file, `tool-gates` as a family, `smoke-nose`, `e-group`. Per the friction log, every miss traces to either a mode discovery never surfaced (golden recordings, `--bless`) or a beat too many turns deep to reach in this pass — none were missed because the mechanic was hard to test once found.

---

**Progressive update**: Session completed 2026-08-07 23:35 CDT; continuation (loose-ends routing, corrections, docs-consolidation proposal, DevArch interlock) added 2026-08-08, session still open at update time.
