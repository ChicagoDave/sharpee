# Session Summary: 2026-11-23 - description-noun-lens (CST)

## Goals
- Begin Phase 5 of `docs/work/lens-findings-in-ide/plan-20261122-lens-findings-in-ide.md` ("Chord Writer shows where a noun has no text").
- After David's redirect: plan a CLI that lists each noun in a description with its own source line and column span, read from source, with no IDE work.

## Phase Context
- **Plan**: `docs/work/world-index-noun-spans/plan-20261123-world-index-noun-spans.md` — `sharpee world-index` locates every noun phrase it reads to its own source span, reading the story from source (`.current-plan` now points here).
- **Phase executed**: none — planning only; lens plan Phase 5 was opened and set aside before any edit, and the new plan's Phase 1 ("The analyzer reads the story's source and publishes each phrase's own span", Medium) is CURRENT (since 2026-11-23) and not started.
- **Tool calls used**: 110 (state file) / 250 — all spent on session start and planning, but the state file already attributes them to the new Phase 1's budget.
- **Phase outcome**: Partially completed — no phase advanced; the session's output is the approved-pending plan.

## Completed

### Lens Phase 5 investigation (no edits)
- Found that the testing-surface page receives only each lens source's passage span (e.g. `scullery.description`, lines 18–19), not the source text, so it cannot compute the phrase's own column and length that ADR-408 D9 requires.

### Redirect and plan
- David ruled: no IDE work; the CLI should list description nouns with their own source line and column start/end, reading from source.
- Found `sharpee world-index` (`packages/world-index/src/incomplete.ts`) already extracts nouns from every passage and classifies no-object / missing-word / ambiguous / undescribed, but publishes only passage spans and reads only a built IR.
- David chose (b) extend `sharpee world-index` rather than a new command, and (a) a plan of its own.
- `session-planner` wrote the new plan: Phase 1 (Medium, 250) adds `packages/world-index/src/locate.ts` and an optional `at` span on every phrase record, with `analyze.ts` reading a `.story` through a caller-supplied compile function; Phase 2 (Small, 100) has devkit's `sharpee world-index` pass `compileChordStory`, adds the scullery real-path test, and puts a dated note on ADR-321.
- Rule 18b disposition: David chose "still live" for the lens plan; it carries `**Superseded by**: docs/work/world-index-noun-spans/plan-20261123-world-index-noun-spans.md` (corroborated by `git diff`, the only change to that file), with Phase 5 CURRENT (since 2026-11-23) and Phase 6 PENDING (corroborated by grep of its Status lines).

## Key Decisions

### 1. Lens findings' Chord Writer highlight work is set aside
David's call: per-phrase locations come from the CLI, not from the IDE page.

### 2. `sharpee world-index` gains per-phrase source spans
Extending the existing analyzer beats a new command, because it already reads every passage and classifies each phrase.

### 3. `at` is optional, so the wire stays `world-index/4`
A built IR publishes no `at`; Swift's `Decodable` ignores the unknown key, so the IDE needs no change.

### 4. Pending at approval: D-1 and D-2
The plan leans D-1(a), a new failure cause `uncompilable-story` for a `.story` the gates refuse, and D-2, a dated note on ADR-321 rather than a new ADR; David has not yet ruled.

## Next Phase
- **Phase 1**: "The analyzer reads the story's source and publishes each phrase's own span" — `locate.ts`, `at?: Span` on the three Incomplete finding classes and `ResolvedMention`, `.story` input in `analyzeStoryIR`, `turbo.json` inputs, `tests/locate.test.ts`, and a located-phrase census.
- **Tier**: Medium (250 tool-call budget).
- **Entry state**: David approves the plan (PROCEED) with D-1 and D-2 ruled; record the `pnpm --filter '@sharpee/world-index' test:ci` baseline before the first edit. The planning recommendation is to commit both phases together (ADR-407's same-commit consequence for signature changes).

## Open Items

### Short Term
- 835: IDE testing: report nouns in room and object descriptions that the player cannot use (the examinable lens is broken and only tries examine) — commented this session with the redirect.
- 837: Chord Writer: decode the World Index failure cause no-noun-extractor

### Long Term
- 836: A thing answers only to the grammatical number its name and aka words are written in (candles but not candle)
- 669: plan-archive.sh requires docs/work/<slug>/plan.md; this repository names plans plan-YYYYMMDD-<name>.md, so a DONE plan cannot be archived by the script

## Files Modified

**Plans** (3 files, per the state file's `files` array):
- `docs/work/world-index-noun-spans/plan-20261123-world-index-noun-spans.md` - new plan, 2 phases, Phase 1 CURRENT.
- `docs/work/lens-findings-in-ide/plan-20261122-lens-findings-in-ide.md` - `**Superseded by**` stamp only.
- `docs/context/.current-plan` - repointed to the new plan.

## Notes

**Session duration**: started 13:23 CST; the event log shows about 5 h between the audit (13:29 CST) and the planner's return (18:36 CST), so active time was well under that.

**Approach**: session start (recap, `pre-session-audit`, profile fresh from 2026-11-17, gate cleared, core concepts read), then investigation of lens Phase 5, a redirect, and planning.

**Chord pin**: 4.1.0 matches the toolchain [reported by session, unverified].

**Previous session's file**: `docs/context/session-20261123-0317-description-noun-lens.md` (48a616) is modified in the tree by the harness's SessionEnd Activity Log append (mtime 13:23); this write leaves it alone.

---

## Session Metadata

- **Session**: 788f1b
- **Status**: COMPLETE
- **Blocker**: N/A
- **Blocker Category**: N/A
- **Estimated Remaining**: N/A
- **Rollback Safety**: safe to revert
- **Commits**: none before this write — this write is staged by the next commit (rule 18); its hash is in `git log -- docs/context/session-20261123-1323-description-noun-lens.md`

## Dependency/Prerequisite Check

- **Prerequisites met**: David's go for `packages/world-index` and `packages/devkit` changes (recorded in the plan, 2026-11-23).
- **Prerequisites discovered**: The testing-surface page lacks source text, which is what made the lens highlight work unbuildable as planned.

## Architectural Decisions

- None this session written; the plan reads ADR-321 (D2, D17, AC-18), ADR-407 D8, ADR-408 D6/D8/D9, ADR-187 and ADR-395 D7, and D-2 leans toward a dated note on ADR-321 in Phase 2.

## Mutation Audit

- N/A — planning only, no source changed.

## Test Coverage Delta

- No test changes this session.

---

**Progressive update**: session completed 2026-11-23 18:50 — first write: planning-only session; world-index-noun-spans plan written and awaiting approval, lens plan stamped Superseded by and left live.

## Activity Log (auto-captured)
```
[19:29:24] BUILD: Build passed — npx tsc --noEmit 2>&1 | tail -20 | grep -c "error TS"; grep -l "BUILD:" docs/con
[00:42:28] EDIT: File edited — docs/work/lens-findings-in-ide/plan-20261122-lens-findings-in-ide.md
[00:42:41] EDIT: File changed via Bash — docs/work/lens-findings-in-ide/plan-20261122-lens-findings-in-ide.md
[00:43:39] EDIT: File written — docs/work/world-index-noun-spans/plan-20261123-world-index-noun-spans.md
[00:43:48] EDIT: File changed via Bash — docs/context/.current-plan
[00:43:48] EDIT: File changed via Bash — docs/work/world-index-noun-spans/plan-20261123-world-index-noun-spans.md
[00:44:11] EDIT: File edited — docs/work/world-index-noun-spans/plan-20261123-world-index-noun-spans.md
[00:44:11] EDIT: File edited — docs/work/world-index-noun-spans/plan-20261123-world-index-noun-spans.md
[00:51:20] EDIT: File written — docs/context/session-20261123-1323-description-noun-lens.md
[00:51:25] EDIT: File changed via Bash — docs/context/session-20261123-1323-description-noun-lens.md
[00:52:04] EDIT: File written — .commit-files
[00:52:04] EDIT: File written — .commit-msg
[00:52:09] GIT: Git operation — bash /Users/david/.claude/scripts/git-commit.sh --push
```
