# Session Plan: The Chord Manual 4.1.0, a prose pass for grammar, punctuation and legibility

**Created**: 2026-11-20
**Plan Status**: DONE
**Overall scope**: Read every front-matter file and chapter of *The Chord Manual* (`docs/book/chord-v4.1.0/`, 4 front-matter files and chapters 1 to 40, 44 files, 91,370 words) for grammar, punctuation, sentence legibility and paragraph legibility, and fix the prose only; then rebuild the editions and republish the site's copy. Goal, in David's words (2026-11-20): "you need to read the entire book for grammar, punctuation, sentence, and paragraph legibility".
**Bounded contexts touched**: N/A (documentation-only prose pass)
**Key domain language**: N/A

## References consulted
- `docs/architecture/adrs/INDEX.md` — the ADR index, rebuilt for this plan: 409 records (28 OPEN, 149 IMPLEMENTED, 52 ABANDONED, 7 IGNORE, 173 unclassified), every one of Kind unclassified. The plan touches only the manual's prose and its rendered copies, so records were found by a full-text search of all 409 for the manual and for `docs/book`; the ten below were opened to their Consequences. ADR-158 and ADR-398 mention the manual only in passing (a manual audit, a session line), and ADR-186, ADR-293, ADR-325, ADR-327, ADR-342 and ADR-343 name other editions or the books in general; none was opened further. ABANDONED and IGNORE records were not opened.
- `docs/architecture/adrs/adr-359-every-entity-names-its-kind.md` — the manual's Chord blocks were migrated to name their kind; this pass changes no fence, so it cannot undo that migration.
- `docs/architecture/adrs/adr-360-a-region-declares-its-rooms.md` — reserves `rooms` and `exits` line heads across the manual; constrains fences only, which this pass does not touch.
- `docs/architecture/adrs/adr-362-room-blocks-fold-for-density.md` — reserves the `exits` line head in the manual; fences only.
- `docs/architecture/adrs/adr-396-a-never-claim-is-watched-and-searched-not-proven.md` — the claims chapter must not teach bounded search as proof; a rewrite in chapter 39 must keep that distinction exactly.
- `docs/architecture/adrs/adr-397-never-is-removed-from-the-claims-language.md` — chapter 39 teaches positive claims and locks only; a prose rewrite must not reintroduce `never`.
- `docs/architecture/adrs/adr-399-change-to-a-platform-state-word-writes-the-trait.md` — Part IV's snapshot still carries a workaround for #707; that is a content matter, recorded and not fixed here.
- `docs/architecture/adrs/adr-402-a-sound-says-only-what-its-author-wrote.md` — Part VII's snapshot may gain sounds (GH #752); content, out of scope for a prose pass.
- `docs/architecture/adrs/adr-404-the-opening-is-a-routine-not-a-turn.md` — chapters 3, 19 and 35 teach the opening and quote turn numbers measured after this record; a rewrite there must not move a number or the claim it supports.
- `docs/architecture/adrs/adr-405-a-story-event-is-not-prose.md` — chapter 37's teaching about `emit` follows this record; a rewrite must keep what it says an event does.
- `docs/architecture/adrs/adr-281-chord-writer-embedded-help.md` — book edits reach the IDE's embedded help only through an app release; this plan ships no app and touches no IDE file.
- `docs/book/CLAUDE.md` — the binding rules for every edit: no em-dash in prose (only inside a verbatim quote of platform output), complete sentences, no lost-meaning paragraph (expand rather than tighten), quoted output verbatim, appendices generated and exempt, a content edit not done until the HTML build is clean.
- `docs/context/project-profile.md` — `scripts/build-book.sh` builds the editions and `website/` carries the published copy; its active-plan line is stale (the chord-manual plan is archived at `docs/work/archive/chord-manual/plan.md`).
- `docs/context/session-20261121-0341-main.md` — newest session file by name; it records a lockfile commit and has no open items that bear on the manual.
- `docs/proposals/code-documentation-sweep.md` — eight ACCEPTED items on code headers (logic first, then interface and owner, then a references block); not implemented here, but the one script this plan adds follows that header convention.
- `docs/proposals/docs-consolidation.md` — P-9 (one active plan in `docs/work/`) is ACCEPTED and held by David; this plan becomes the single active plan, consistent with it, and implements no item.
- Product ADRs not consulted (no Scope intersection): none

## Decision at approval (open, for David)

How the fixes land is David's choice when he approves this plan.

- **(a) Apply directly, part by part, and report a per-chapter change list.** Recommended: David asked Claude to do the read, and the manual's prose was written under his grant to Claude, so the change list and the diff are his review surface and anything he dislikes is reverted by hand.
- **(b) Write OLD/NEW review docs for David to approve before anything is applied**, as in an earlier book pass. Each part then takes two steps (review doc, then the approved edits), which roughly doubles the elapsed time per part.

**Taken: (a)**, 2026-11-20, session 2985ee. David did not pick a letter. While the plan was being written he said "I'm going to bed - continue the work until you estimate context length is exhausted"; Claude read that as the go-ahead and took its own recommendation. If David wants (b) for the parts not yet read, the remaining phases switch to it.

The phases below are written for (a). Under (b), each part's change list is written first as the review doc, the phase stops there for David's approval, and only approved items are applied before the phase's Demonstration runs.

## Pass rules (every phase reads these first)

What changes: grammar, punctuation, sentence legibility, and paragraph legibility. A sentence that reads backward or makes the reader hold a clause too long is rewritten in plain words (the trigger was chapter 1's "the examples in this book use them some chapters before the chapter that treats each one in full"). A paragraph that carries two claims is split, and a paragraph whose claim is buried is reordered so the claim comes first.

What never changes: what any chapter teaches; any fenced block (`chord`, `shell`, `text`, `json` and `css`, 676 fences at the baseline); any quoted game output or compiler error, fenced or inline; the text of any inline code span (keys, identifiers, commands, file names); the story and its running example; the aside captions that open `::: under-the-hood` and `::: from-another-system` blocks, and the bold on a term's first use, which are structure and not lead-ins. A heading changes only to fix a grammar error, and every heading change is listed, because the web edition's anchors and the book's cross-references follow headings.

`docs/book/CLAUDE.md` binds every edit. No new bold lead-in label opens a paragraph; one found in running prose becomes a plain sentence. Voice calibration against v1.5.0 applies to new prose, and this pass writes none beyond rewrites that keep the chapter's own voice.

A technical-accuracy problem noticed while reading is filed with `gh issue create` and its number goes in the part's change list; it is not fixed in this pass. Before filing, check the open issues: the manual already has many (for example #597, #762, #777 to #783, #789), and a problem already filed gets its number in the change list, not a duplicate. A quoted output line that looks wrong is never edited; it is filed. The seven appendices under `docs/book/chord-v4.1.0/backmatter/` are generated and out of scope.

HTML comments (`<!-- ... -->`, one each in chapters 4, 29, 30, 33 to 40) are authoring notes the reader never sees, and are left exactly as they are. Issue #789 is about some of them: the front matter promises that a few chapters say plainly what they leave out, and chapters 29, 30, 33, 34 and 35 say it only in a comment. Resolving #789 means writing new reader-facing content, so this pass does not do it, and the front matter's sentence about it is not reworded to paper over the gap.

Baseline for every fence comparison: commit `7b1651c16` (HEAD when this plan was written). The uncommitted chapter 1 edit already in the tree changes prose only. At the baseline, all 66 em-dashes in the front matter and parts sit inside fences quoting platform output, so the count of em-dashes outside fences is 0 and must stay 0.

Each part's change list, `docs/work/chord-manual-prose-pass/part-N-changes.md`, gives per chapter: a count of edits by kind (punctuation, grammar, sentence, paragraph); an OLD/NEW pair for every sentence or paragraph rewrite and every heading change; the inline-code differences the comparator lists, each with its reason (a repeated key dropped or added, never an altered one); the issues filed; and any recurring pattern worth sweeping book-wide in Phase 9.

Phases 2 to 8 depend only on Phase 1 (for the comparator) and are independent of one another; any order works, and each is resumable on its own.

## Phases

### Phase 1: Front matter and Part I, with the fence comparator
- **Tier**: Medium
- **Budget**: 250
- **Domain focus**: N/A (documentation). Front matter (`docs/book/chord-v4.1.0/frontmatter/00-preface.md`, `docs/book/chord-v4.1.0/frontmatter/00-title-page.md`, `docs/book/chord-v4.1.0/frontmatter/00b-copyright.md`, `docs/book/chord-v4.1.0/frontmatter/01-how-to-read.md`, 1,581 words) and Part I, chapters 1 to 4 (7,095 words).
- **Entry state**: David has approved the plan and chosen (a) or (b); `packages/devkit/dist/cli.js` exists for the snippet checker; the chapter 1 "How text is emitted" rewrite from session 2985ee is in the tree, committed or not.
- **Deliverable**: `docs/work/chord-manual-prose-pass/check-fences-unchanged.cjs` (new). Given a git ref, it reads each Markdown file under `docs/book/chord-v4.1.0/frontmatter/` and `docs/book/chord-v4.1.0/parts/` at that ref (through `git show`, without a shell) and in the tree, and compares their fenced blocks byte for byte and in order; it exits 1 on any changed, added or removed fence, and on any em-dash outside a fence; it lists, without failing, every changed heading and every inline code span that differs as a multiset, for the change list. A `--self-test` flag runs it on an embedded pair (a prose-only change that must pass, a one-character fence change that must fail) so the instrument carries the fixture it is known to fail on. Its header states its logic first, then its interface and owner. Then the four front-matter files and chapters 1 to 4 read in full and fixed under the Pass rules, and `docs/work/chord-manual-prose-pass/part-1-changes.md` (new) written.
- **Files**: `docs/work/chord-manual-prose-pass/`, `docs/book/chord-v4.1.0/frontmatter/`, `docs/book/chord-v4.1.0/parts/part-1/`
- **Exit state**: every sentence of the front matter and chapters 1 to 4 has been read and fixed where it needed it; no fence, quoted output, inline code span or teaching has changed; the comparator exists and passes its self-test; the part's change list exists with its issues filed.
- **Demonstration**: `node docs/work/chord-manual-prose-pass/check-fences-unchanged.cjs --self-test` reports the fence change caught and the prose change passed; `node docs/work/chord-manual-prose-pass/check-fences-unchanged.cjs 7b1651c16` exits 0 with 676 fences unchanged and 0 em-dashes outside fences; `grep -rn "—" docs/book/chord-v4.1.0/frontmatter docs/book/chord-v4.1.0/parts` shows only verbatim platform quotes (66 at the baseline, never more); `node scripts/check-chord-snippets.cjs docs/book/chord-v4.1.0` exits 0 with 305 fences proven and 43 of 43 snapshots loading; `./scripts/build-book.sh chord-v4.1.0 html` finishes with no error.
- **Demonstrated**: 2026-11-20, session 2985ee. `--self-test` printed 7 fixtures ok and "self-test passed"; the comparator against `7b1651c16` printed "44 files, 676 fences in the tree, 0 fence failures, 0 em-dashes outside fences, 1 notes" (the note is the `.story` span added in chapter 4, listed in the change list); the em-dash grep counted 66 lines; `check-chord-snippets.cjs` printed total 305, failed 0, "snapshots: 43 of 43 load", "every fence is proven"; the html build ended "done". Ten edits across chapters 1 to 4, front matter unchanged; `part-1-changes.md` written.
- **Status**: DONE

### Phase 2: Part II, the world (chapters 5 to 12)
- **Tier**: Medium
- **Budget**: 250
- **Domain focus**: N/A (documentation). Part II, chapters 5 to 12 (14,740 words): rooms and exits, things, containers and supporters, doors, trait words, light and the senses, regions, ways that are closed.
- **Entry state**: Phase 1 is DONE, so `docs/work/chord-manual-prose-pass/check-fences-unchanged.cjs` exists and passes its self-test.
- **Deliverable**: the eight chapters under `docs/book/chord-v4.1.0/parts/part-2/` read in full and fixed under the Pass rules; `docs/work/chord-manual-prose-pass/part-2-changes.md` (new); an issue filed for each accuracy problem noticed.
- **Files**: `docs/book/chord-v4.1.0/parts/part-2/`, `docs/work/chord-manual-prose-pass/part-2-changes.md`
- **Exit state**: every sentence of chapters 5 to 12 has been read and fixed where it needed it; no fence, quoted output, inline code span or teaching has changed; the change list exists.
- **Demonstration**: `node docs/work/chord-manual-prose-pass/check-fences-unchanged.cjs 7b1651c16` exits 0 with 676 fences unchanged and 0 em-dashes outside fences; `grep -rn "—" docs/book/chord-v4.1.0/frontmatter docs/book/chord-v4.1.0/parts` shows only verbatim platform quotes; `node scripts/check-chord-snippets.cjs docs/book/chord-v4.1.0` exits 0 with 305 fences proven and 43 of 43 snapshots loading; `./scripts/build-book.sh chord-v4.1.0 html` finishes with no error.
- **Demonstrated**: 2026-11-20, session 2985ee. The comparator against `7b1651c16` printed "44 files, 676 fences in the tree, 0 fence failures, 0 em-dashes outside fences, 2 notes" (the notes are the `.story` span added in chapter 4 and the `one-way` span added in chapter 5, both in the change lists); the em-dash grep counted 66 lines; `check-chord-snippets.cjs` printed total 305, failed 0, "snapshots: 43 of 43 load", "every fence is proven"; the html build ended "done". Eighteen edits across chapters 5 to 12 (first written here as nineteen, a miscount corrected at the end of the session); `part-2-changes.md` written; no issue filed.
- **Status**: DONE

### Phase 3: Part III, behavior (chapters 13 to 19)
- **Tier**: Medium
- **Budget**: 250
- **Domain focus**: N/A (documentation). Part III, chapters 13 to 19 (15,477 words): states, reacting to the player, clauses, conditions, choosing between outcomes, counting and ending, time. Chapter 19's turn numbers follow ADR-404 and must not move.
- **Entry state**: Phase 1 is DONE.
- **Deliverable**: the seven chapters under `docs/book/chord-v4.1.0/parts/part-3/` read in full and fixed under the Pass rules; `docs/work/chord-manual-prose-pass/part-3-changes.md` (new); an issue filed for each accuracy problem noticed.
- **Files**: `docs/book/chord-v4.1.0/parts/part-3/`, `docs/work/chord-manual-prose-pass/part-3-changes.md`
- **Exit state**: every sentence of chapters 13 to 19 has been read and fixed where it needed it; no fence, quoted output, inline code span or teaching has changed; the change list exists.
- **Demonstration**: `node docs/work/chord-manual-prose-pass/check-fences-unchanged.cjs 7b1651c16` exits 0 with 676 fences unchanged and 0 em-dashes outside fences; `grep -rn "—" docs/book/chord-v4.1.0/frontmatter docs/book/chord-v4.1.0/parts` shows only verbatim platform quotes; `node scripts/check-chord-snippets.cjs docs/book/chord-v4.1.0` exits 0 with 305 fences proven and 43 of 43 snapshots loading; `./scripts/build-book.sh chord-v4.1.0 html` finishes with no error.
- **Demonstrated**: 2026-11-20, session 2985ee. The comparator against `7b1651c16` printed "44 files, 676 fences in the tree, 0 fence failures, 0 em-dashes outside fences, 3 notes" (the new note is one repeated `must` span dropped in chapter 15, in the change list); the em-dash grep counted 66 lines; `check-chord-snippets.cjs` printed total 305, failed 0, "snapshots: 43 of 43 load", "every fence is proven"; the html build ended "done". Nine edits across chapters 13 to 19, chapter 16 unchanged, no number moved; `part-3-changes.md` written; no issue filed.
- **Status**: DONE

### Phase 4: Part IV, words and verbs (chapters 20 to 25)
- **Tier**: Medium
- **Budget**: 250
- **Domain focus**: N/A (documentation). Part IV, chapters 20 to 25 (14,266 words): phrases, a thing's own words, standard messages, new verbs, new kinds of thing (3,307 words), the standard grammar.
- **Entry state**: Phase 1 is DONE.
- **Deliverable**: the six chapters under `docs/book/chord-v4.1.0/parts/part-4/` read in full and fixed under the Pass rules; `docs/work/chord-manual-prose-pass/part-4-changes.md` (new); an issue filed for each accuracy problem noticed.
- **Files**: `docs/book/chord-v4.1.0/parts/part-4/`, `docs/work/chord-manual-prose-pass/part-4-changes.md`
- **Exit state**: every sentence of chapters 20 to 25 has been read and fixed where it needed it; no fence, quoted output, inline code span or teaching has changed; the change list exists.
- **Demonstration**: `node docs/work/chord-manual-prose-pass/check-fences-unchanged.cjs 7b1651c16` exits 0 with 676 fences unchanged and 0 em-dashes outside fences; `grep -rn "—" docs/book/chord-v4.1.0/frontmatter docs/book/chord-v4.1.0/parts` shows only verbatim platform quotes; `node scripts/check-chord-snippets.cjs docs/book/chord-v4.1.0` exits 0 with 305 fences proven and 43 of 43 snapshots loading; `./scripts/build-book.sh chord-v4.1.0 html` finishes with no error.
- **Demonstrated**: 2026-11-20, session 2985ee. The comparator against `7b1651c16` printed "44 files, 676 fences in the tree, 0 fence failures, 0 em-dashes outside fences, 3 notes" (no new note in Part IV); the em-dash grep counted 66 lines; `check-chord-snippets.cjs` printed total 305, failed 0, "snapshots: 43 of 43 load", "every fence is proven"; the html build ended "done". Twelve edits across chapters 20 to 25 (three of them bold lead-ins made plain in chapter 22), chapter 21 unchanged; `part-4-changes.md` written; no issue filed.
- **Status**: DONE

### Phase 5: Part V, people (chapters 26 to 31)
- **Tier**: Medium
- **Budget**: 250
- **Domain focus**: N/A (documentation). Part V, chapters 26 to 31 (14,860 words): people who act (3,441 words), asking and telling, conversations, inner lives, principles, more than one protagonist.
- **Entry state**: Phase 1 is DONE.
- **Deliverable**: the six chapters under `docs/book/chord-v4.1.0/parts/part-5/` read in full and fixed under the Pass rules; `docs/work/chord-manual-prose-pass/part-5-changes.md` (new); an issue filed for each accuracy problem noticed.
- **Files**: `docs/book/chord-v4.1.0/parts/part-5/`, `docs/work/chord-manual-prose-pass/part-5-changes.md`
- **Exit state**: every sentence of chapters 26 to 31 has been read and fixed where it needed it; no fence, quoted output, inline code span or teaching has changed; the change list exists.
- **Demonstration**: `node docs/work/chord-manual-prose-pass/check-fences-unchanged.cjs 7b1651c16` exits 0 with 676 fences unchanged and 0 em-dashes outside fences; `grep -rn "—" docs/book/chord-v4.1.0/frontmatter docs/book/chord-v4.1.0/parts` shows only verbatim platform quotes; `node scripts/check-chord-snippets.cjs docs/book/chord-v4.1.0` exits 0 with 305 fences proven and 43 of 43 snapshots loading; `./scripts/build-book.sh chord-v4.1.0 html` finishes with no error.
- **Demonstrated**: 2026-11-20, session 2985ee. The comparator against `7b1651c16` printed "44 files, 676 fences in the tree, 0 fence failures, 0 em-dashes outside fences, 3 notes" (no new note in Part V); the em-dash grep counted 66 lines; `check-chord-snippets.cjs` printed total 305, failed 0, "snapshots: 43 of 43 load", "every fence is proven"; the html build ended "done". Seven edits across chapters 27 to 31, chapter 26 unchanged; `part-5-changes.md` written; no issue filed.
- **Status**: DONE

### Phase 6: Part VI, machines and motion (chapters 32 to 35)
- **Tier**: Small
- **Budget**: 100
- **Domain focus**: N/A (documentation). Part VI, chapters 32 to 35 (8,222 words): machines, vehicles, open water and open ground, the opt-in systems. Chapter 35's hunger counts follow ADR-404 and must not move.
- **Entry state**: Phase 1 is DONE.
- **Deliverable**: the four chapters under `docs/book/chord-v4.1.0/parts/part-6/` read in full and fixed under the Pass rules; `docs/work/chord-manual-prose-pass/part-6-changes.md` (new); an issue filed for each accuracy problem noticed.
- **Files**: `docs/book/chord-v4.1.0/parts/part-6/`, `docs/work/chord-manual-prose-pass/part-6-changes.md`
- **Exit state**: every sentence of chapters 32 to 35 has been read and fixed where it needed it; no fence, quoted output, inline code span or teaching has changed; the change list exists.
- **Demonstration**: `node docs/work/chord-manual-prose-pass/check-fences-unchanged.cjs 7b1651c16` exits 0 with 676 fences unchanged and 0 em-dashes outside fences; `grep -rn "—" docs/book/chord-v4.1.0/frontmatter docs/book/chord-v4.1.0/parts` shows only verbatim platform quotes; `node scripts/check-chord-snippets.cjs docs/book/chord-v4.1.0` exits 0 with 305 fences proven and 43 of 43 snapshots loading; `./scripts/build-book.sh chord-v4.1.0 html` finishes with no error.
- **Demonstrated**: 2026-11-20, session 2985ee. The comparator against `7b1651c16` printed "44 files, 676 fences in the tree, 0 fence failures, 0 em-dashes outside fences, 4 notes" (the new note is one repeated `yard` span dropped in chapter 35, in the change list); the em-dash grep counted 66 lines; `check-chord-snippets.cjs` printed total 305, failed 0, "snapshots: 43 of 43 load", "every fence is proven"; the html build ended "done". Two edits (chapters 33 and 35), chapters 32 and 34 unchanged, no count moved; `part-6-changes.md` written; issue 825 filed (chapter 33's "since chapter 9").
- **Status**: DONE

### Phase 7: Part VII, presentation (chapters 36 and 37)
- **Tier**: Small
- **Budget**: 100
- **Domain focus**: N/A (documentation). Part VII, chapters 36 and 37 (5,541 words): sound, music and pictures; the page the player sees. Chapter 37's account of `emit` follows ADR-405 and must say the same thing after any rewrite.
- **Entry state**: Phase 1 is DONE.
- **Deliverable**: the two chapters under `docs/book/chord-v4.1.0/parts/part-7/` read in full and fixed under the Pass rules; `docs/work/chord-manual-prose-pass/part-7-changes.md` (new); an issue filed for each accuracy problem noticed.
- **Files**: `docs/book/chord-v4.1.0/parts/part-7/`, `docs/work/chord-manual-prose-pass/part-7-changes.md`
- **Exit state**: every sentence of chapters 36 and 37 has been read and fixed where it needed it; no fence, quoted output, inline code span or teaching has changed; the change list exists.
- **Demonstration**: `node docs/work/chord-manual-prose-pass/check-fences-unchanged.cjs 7b1651c16` exits 0 with 676 fences unchanged and 0 em-dashes outside fences; `grep -rn "—" docs/book/chord-v4.1.0/frontmatter docs/book/chord-v4.1.0/parts` shows only verbatim platform quotes; `node scripts/check-chord-snippets.cjs docs/book/chord-v4.1.0` exits 0 with 305 fences proven and 43 of 43 snapshots loading; `./scripts/build-book.sh chord-v4.1.0 html` finishes with no error.
- **Demonstrated**: 2026-11-20, session 2985ee. The comparator against `7b1651c16` printed "44 files, 676 fences in the tree, 0 fence failures, 0 em-dashes outside fences, 4 notes" (no new note in Part VII); the em-dash grep counted 66 lines; `check-chord-snippets.cjs` printed total 305, failed 0, "snapshots: 43 of 43 load", "every fence is proven"; the html build ended "done". Two edits (one in each chapter); chapter 37's account of `emit` unchanged; `part-7-changes.md` written; no issue filed.
- **Status**: DONE

### Phase 8: Part VIII, testing and publishing (chapters 38 to 40)
- **Tier**: Medium
- **Budget**: 250
- **Domain focus**: N/A (documentation). Part VIII, chapters 38 to 40 (9,588 words): test trees, claims (4,732 words, the longest chapter, dense with quoted output), publishing. Chapter 39 keeps ADR-396 and ADR-397 exactly: no bounded search called proof, no `never`.
- **Entry state**: Phase 1 is DONE.
- **Deliverable**: the three chapters under `docs/book/chord-v4.1.0/parts/part-8/` read in full and fixed under the Pass rules; `docs/work/chord-manual-prose-pass/part-8-changes.md` (new); an issue filed for each accuracy problem noticed.
- **Files**: `docs/book/chord-v4.1.0/parts/part-8/`, `docs/work/chord-manual-prose-pass/part-8-changes.md`
- **Exit state**: every sentence of chapters 38 to 40 has been read and fixed where it needed it; no fence, quoted output, inline code span or teaching has changed; the change list exists.
- **Demonstration**: `node docs/work/chord-manual-prose-pass/check-fences-unchanged.cjs 7b1651c16` exits 0 with 676 fences unchanged and 0 em-dashes outside fences; `grep -rn "—" docs/book/chord-v4.1.0/frontmatter docs/book/chord-v4.1.0/parts` shows only verbatim platform quotes; `node scripts/check-chord-snippets.cjs docs/book/chord-v4.1.0` exits 0 with 305 fences proven and 43 of 43 snapshots loading; `./scripts/build-book.sh chord-v4.1.0 html` finishes with no error.
- **Demonstrated**: 2026-11-20, session 2985ee. The comparator against `7b1651c16` printed "44 files, 676 fences in the tree, 0 fence failures, 0 em-dashes outside fences, 4 notes" (no new note in Part VIII); the em-dash grep counted 66 lines; `check-chord-snippets.cjs` printed total 305, failed 0, "snapshots: 43 of 43 load", "every fence is proven"; the html build ended "done". Three edits (one in each chapter); chapter 39 still says "held" and "unproven" and calls no search a proof; `part-8-changes.md` written; issue 826 filed (chapter 38's `select random`, chapter 40's block order).
- **Status**: DONE

### Phase 9: Book-wide consistency sweep, rebuilt editions and the site's copy
- **Tier**: Medium
- **Budget**: 250
- **Domain focus**: N/A (documentation and its rendered copies). The whole edition, then the PDF, EPUB and web builds and the site's published copy.
- **Entry state**: Phases 1 to 8 are DONE, so all eight change lists exist.
- **Deliverable**: every recurring pattern recorded in the eight change lists searched for across all 44 files and fixed where it recurs in a part read before the pattern was noticed, each addition appended to the owning part's change list. Then the editions rebuilt with `./scripts/build-book.sh chord-v4.1.0 all` and `./scripts/build-book.sh chord-v4.1.0 web`, and placed on the site with `node website/scripts/publish-chord-manual.mjs`, refreshing `website/public/chord-manual/4.1.0/book/`, `website/public/downloads/the-chord-manual-4.1.0.pdf` and `website/public/downloads/the-chord-manual-4.1.0.epub`. A comment on issue 817 records that the print-on-demand interior predates this pass, that its page count and so its spine width may move, and that it must be rebuilt with the build script's `print` target before any print order. `docs/book/chord-v4.1.0/code-snippets/` stays unchanged, since no fence moved. Deploying sharpee.net with `website/deploy.sh` is not part of this phase: it is David's step, and issue 823 already records that the site is waiting on a deploy.
- **Files**: `docs/book/chord-v4.1.0/frontmatter/`, `docs/book/chord-v4.1.0/parts/`, `docs/work/chord-manual-prose-pass/`, `website/public/chord-manual/4.1.0/book/`, `website/public/downloads/the-chord-manual-4.1.0.pdf`, `website/public/downloads/the-chord-manual-4.1.0.epub`
- **Exit state**: the recorded patterns no longer recur anywhere in the edition; the PDF, EPUB and web edition are rebuilt from the passed text and the site carries them; issue 817 says the print interior is stale.
- **Demonstration**: `node docs/work/chord-manual-prose-pass/check-fences-unchanged.cjs 7b1651c16` exits 0 with 676 fences unchanged and 0 em-dashes outside fences; `node scripts/check-chord-snippets.cjs docs/book/chord-v4.1.0` exits 0 with 305 fences proven and 43 of 43 snapshots loading; `./scripts/build-book.sh chord-v4.1.0 all` and `./scripts/build-book.sh chord-v4.1.0 web` finish with no error; `node website/scripts/publish-chord-manual.mjs` finishes; `git status --short docs/book/chord-v4.1.0/code-snippets` prints nothing; a NEW sentence from the Phase 8 change list is found by grep in `website/public/chord-manual/4.1.0/book/39-claims.html`; `gh issue view 817 --comments` shows the stale-interior comment.
- **Demonstrated**: 2026-11-20, session 2985ee. Sweep: every prose line ending in a colon before a fence was listed and each is a whole sentence; no bold lead-in label remains (`grep -rn -E "^\*\*[A-Z][^*\`]*\.\*\* "` printed nothing); every counted lead-in ("three rules", "four ways" and the like) was checked against what follows, and one was wrong and fixed (chapter 26, "Three rules" to "Four rules", added to `part-5-changes.md`). The comparator against `7b1651c16` printed "44 files, 676 fences in the tree, 0 fence failures, 0 em-dashes outside fences, 4 notes"; `check-chord-snippets.cjs` printed "snapshots: 43 of 43 load" and "every fence is proven"; `build-book.sh chord-v4.1.0 all` and `web` each ended "done" (two weasyprint CSS warnings, 58 web pages); `publish-chord-manual.mjs` printed the PDF (1731 KB), the EPUB (532 KB) and 58 pages placed; `git status --short docs/book/chord-v4.1.0/code-snippets` printed nothing; `grep -c "The run therefore takes four" website/public/chord-manual/4.1.0/book/39-claims.html` printed 1; issue 817 carries the stale-interior comment and a correction of its edit count to 65. Not done by design: `website/deploy.sh` (issue 823) and the print interior.
- **Status**: DONE
