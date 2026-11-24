# Session Summary: 2026-11-22 - description-noun-lens (CST)

## Goals
- Phase 5 of the description-noun-lens plan (GH #835, ADR-407): AC-3 (the story runtime has not grown), the repository gates once each, and the dated records pointing at what landed.

## Phase Context
- **Plan**: `docs/work/description-noun-lens/plan-20261122-description-noun-lens.md` — repair the examinable lens and have it read description nouns through the story language (ADR-407).
- **Phase executed**: Phase 5 — "The story runtime has not grown, the gates pass, and the records point at what landed" (Small).
- **Tool calls used**: 65 (state file; it now reports Phase 6's budget, 250) / 100 for Phase 5.
- **Phase outcome**: Completed under budget; flipped DONE and Phase 6 advanced CURRENT (since 2026-11-22) by the session.
- **Out-of-scope changes**:
  - out of scope: stories/dungeo/src/version.ts

  The BUILD_DATE stamp written by `./repokit build dungeo` (the `pnpm test:scripts` prerequisite); it ships with the commit.

## Completed

### AC-3: The Relighting's game.js has not grown
- After `./repokit build` (23:01 CST), `node packages/devkit/dist/cli.js publish relighting.story` in `tutorials/relighting/chord-v4.1.0/chapter-40/`; `game.js` is 1,971,319 bytes, the Phase 2 baseline to the byte (writer's `ls -l`, 23:01 CST mtime). CLI bundle `dist/cli/sharpee.js` 5,401,919 bytes, unchanged (writer's `ls -l`, 23:02 CST).

### Gates, once each
- `pnpm exec turbo run test:ci` → 73 of 73 tasks, all cache hits (FULL TURBO), replaying the 22:59 passing run on identical inputs; not re-run uncached. [reported by session, unverified]
- `node --test tools/explorer-probe/tests/*.test.js` → tests 57, pass 56, fail 1: `lens-declared-state.test.js:228`, actual 91 against expected 41 (GH #805), as at baseline (writer's own run, 2026-11-22 23:11 CST).
- `pnpm test:scripts` after `./repokit build dungeo` → 23 files, 155 passed. [reported by session, unverified]

### Records
- ADR-294: dated note under "The first lens has shipped" — the lens reads nouns through the story language's extractor (`@sharpee/lang-en-us/nouns` for English), types both number forms, refuses a language with none.
- ADR-407: `**Planning**` OPEN → IMPLEMENTED, Summary ends "Built 2026-11-22 under issue 835.", an `**Implemented**` line naming the four build sessions and the AC evidence; `adr-index.sh` rebuilt `INDEX.md` (29 OPEN, 150 IMPLEMENTED).

### GitHub (handled by the session)
- #835: AC results comment (7092155669).
- #583: closed (the lens suite passes 39 of 39).
- #805: status comment, left open (the declared-state count).
- #514: closed with the measurement on Secret Letter (120s, 14 rooms, 100 passages): 234 entity-name head mentions; heuristic alone 86 (36.8%); combined extractor 201 (85.9%); 86 of the heuristic's 101 article-less misses found (85.1%). The method is a reconstruction; the September script was not kept.

## Key Decisions

### 1. Phase 6 waits on David
Phase 6's entry state needs David to name the verbs and to rule whether this extends the examinable lens or becomes a second lens (ADR-294 D23: one question per lens); the session recommended (b), TAKE only.

## Next Phase
- **Phase 6**: "Verbs beyond examine (issue 835; outside ADR-407; David chooses the verbs)" — for each named verb, the lens executes `<verb> <form>` per candidate form and finds nouns that resolve for examine but not for the verb; never an author-written refusal. Scullery's test set gains the obligation first, then the story, then the pins.
- **Tier**: Medium (250 tool-call budget)
- **Entry state**: David has named the verbs and ruled extend-examinable vs. second lens.

## Open Items

### Short Term
- 835: IDE testing: report nouns in room and object descriptions that the player cannot use (the examinable lens is broken and only tries examine)
- 805: explorer-probe tests fail 9 of 43: the walk executes no phrase and the dimension count is 91, not 41

### Long Term
- 836: A thing answers only to the grammatical number its name and aka words are written in (candles but not candle)
- 839: lang-en-us: lemmatize is a stemmer with no caller (candles → candl, shed → sh)
- 837: Chord Writer: decode the World Index failure cause no-noun-extractor
- 838: Website getting-started pages quote a New Story landing sentence the template no longer has

## Files Modified

**ADRs** (3 files):
- `docs/architecture/adrs/adr-294-golden-transcripts-tester-rebuild.md` - dated note under the first-lens paragraph
- `docs/architecture/adrs/adr-407-a-lens-reads-prose-through-the-story-language.md` - Planning IMPLEMENTED, Summary, Implemented line
- `docs/architecture/adrs/INDEX.md` - rebuilt by `adr-index.sh`

**Plan** (1 file):
- `docs/work/description-noun-lens/plan-20261122-description-noun-lens.md` - Phase 5 Demonstrated (with the writer's verification mark), DONE; Phase 6 CURRENT

**Build stamp** (1 file):
- `stories/dungeo/src/version.ts` - BUILD_DATE from `./repokit build dungeo`

## Notes

**Session duration**: ~15 minutes (23:00 to 23:11 CST at this write).

**Approach**: Verification and records only; no source code changed. Scratch files (`gh-*.md` comment drafts, `recall-514.js`) live in the session scratchpad, not the repository.

---

## Session Metadata

- **Session**: 055db7
- **Status**: IN-FLIGHT
- **Blocker** (if any): N/A
- **Blocker Category**: N/A
- **Estimated Remaining**: N/A
- **Rollback Safety**: safe to revert
- **Commits**: none before this write — this write is staged by the next commit (rule 18); its hash is in `git log -- docs/context/session-20261122-2300-description-noun-lens.md`

## Dependency/Prerequisite Check

- **Prerequisites met**: Phase 4 DONE (commit 9c775dda4); `./repokit build` and `./repokit build dungeo` green.
- **Prerequisites discovered**: Phase 6 needs David's verb list and the lens-shape ruling.

## Architectural Decisions

- ADR-407: moved to IMPLEMENTED — the lens reads prose through the story language's extractor.
- ADR-294: dated note only; D23's lens contract unchanged.

## Mutation Audit

- Files with state-changing logic modified: none
- Tests verify actual state mutations (not just events): N/A

## Test Coverage Delta

- Tests added: 0
- Tests passing before: explorer-probe 56 of 57 → after: 56 of 57 (writer's run, 2026-11-22 23:11 CST); turbo test:ci 73/73 and test:scripts 155 [reported by session, unverified]
- Known untested areas: the declared-state lens count (GH #805)

---

**Progressive update**: checkpoint 2026-11-22 23:12 — Phase 5 DONE (AC-3, gates, ADR-294/407 records, GH #835/#583/#805/#514), Phase 6 CURRENT pending David's verb ruling.

## Activity Log (auto-captured)
```
[05:00:32] BUILD: Build passed — grep -rh "BUILD:" docs/context/ 2>/dev/null | tail -2; npx tsc --noEmit 2>&1 | t
[05:02:58] EDIT: File changed via Bash — stories/dungeo/src/version.ts
[05:06:22] EDIT: File written — /private/tmp/claude-501/-Users-david-repos-sharpee/302e23cd-40fd-46d4-b747-22b18f7b7203/scratchpad/recall-514.js
[05:06:35] EDIT: File edited — /private/tmp/claude-501/-Users-david-repos-sharpee/302e23cd-40fd-46d4-b747-22b18f7b7203/scratchpad/recall-514.js
[05:06:46] EDIT: File edited — /private/tmp/claude-501/-Users-david-repos-sharpee/302e23cd-40fd-46d4-b747-22b18f7b7203/scratchpad/recall-514.js
[05:08:23] EDIT: File edited — docs/architecture/adrs/adr-294-golden-transcripts-tester-rebuild.md
[05:08:24] EDIT: File edited — docs/architecture/adrs/adr-407-a-lens-reads-prose-through-the-story-language.md
[05:08:24] EDIT: File edited — docs/architecture/adrs/adr-407-a-lens-reads-prose-through-the-story-language.md
[05:08:24] EDIT: File edited — docs/architecture/adrs/adr-407-a-lens-reads-prose-through-the-story-language.md
[05:08:27] EDIT: File changed via Bash — docs/architecture/adrs/INDEX.md
[05:08:27] EDIT: File changed via Bash — docs/architecture/adrs/adr-294-golden-transcripts-tester-rebuild.md
[05:08:27] EDIT: File changed via Bash — docs/architecture/adrs/adr-407-a-lens-reads-prose-through-the-story-language.md
[05:08:38] EDIT: File written — /private/tmp/claude-501/-Users-david-repos-sharpee/302e23cd-40fd-46d4-b747-22b18f7b7203/scratchpad/gh-835.md
[05:08:43] EDIT: File written — /private/tmp/claude-501/-Users-david-repos-sharpee/302e23cd-40fd-46d4-b747-22b18f7b7203/scratchpad/gh-514.md
[05:09:00] EDIT: File written — /private/tmp/claude-501/-Users-david-repos-sharpee/302e23cd-40fd-46d4-b747-22b18f7b7203/scratchpad/gh-583.md
[05:09:03] EDIT: File written — /private/tmp/claude-501/-Users-david-repos-sharpee/302e23cd-40fd-46d4-b747-22b18f7b7203/scratchpad/gh-805.md
[05:09:19] EDIT: File edited — docs/work/description-noun-lens/plan-20261122-description-noun-lens.md
[05:09:19] EDIT: File changed via Bash — docs/work/description-noun-lens/plan-20261122-description-noun-lens.md
[05:11:46] EDIT: File edited — docs/work/description-noun-lens/plan-20261122-description-noun-lens.md
[05:12:21] EDIT: File written — docs/context/session-20261122-2300-description-noun-lens.md
[05:12:23] EDIT: File changed via Bash — docs/context/session-20261122-2300-description-noun-lens.md
[05:12:58] TEST: Tests passed — 14 passed 143 passed
[05:13:03] EDIT: File written — .commit-files
[05:13:03] EDIT: File written — .commit-msg
[05:13:04] GIT: Git operation — bash /Users/david/.claude/scripts/git-commit.sh
```
