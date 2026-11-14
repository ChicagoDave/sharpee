# Session Plan: A Chord manual, built the way the Sharpee manual was

**Created**: 2026-11-13
**Plan Status**: ACTIVE
**Overall scope**: Write and publish a version-pinned manual that teaches Chord (`.story` files, built and tested with Chord Writer or the `sharpee` CLI) the way *The Sharpee Author and Developer Manual* teaches TypeScript authoring: one canonical markdown source rendered to HTML, EPUB and PDF, one running example carried through every chapter, generated appendices, a snippet check against the published toolchain, and a naive-reader acceptance gate.
**Bounded contexts touched**: N/A (documentation and book tooling; no domain modeling)
**Key domain language**: N/A. Working vocabulary: edition, edition pin, running example, companion snapshot (the compiling `.story` at the end of a chapter), tree document, naive-reader run.

Edition paths below use D-7 as ruled on 2026-11-14: `docs/book/chord-v4.0.2/`. The `tutorials/familyzoo/chord-v4/` companion path is stale (the zoo is not the example) and the snapshots' home is not yet ruled.

## Ruled 2026-11-14 (session 298893, David)

David's words: "D3 a, D4 a, D5 a, D6 a, D7 b, D10 a".

- **D-3 (a):** the pin is Sharpee 5.6.1 / Chord 4.0.2.
- **D-4 (a):** a surface-neutral body; each "Build and try it" step gives both the Chord Writer action and the `sharpee` command.
- **D-5 (a):** asides name the platform concept a Chord line becomes, from published outputs; no TypeScript source, no ADRs.
- **D-6 (a):** PDF and EPUB downloads plus a chunked web build linked from sharpee.net; the site pages stay as they are. The "adapts that material" half was already void.
- **D-7 (b):** the edition lives at `docs/book/chord-v4.0.2/`, with the pin in the name.
- **D-10 (a):** the manual's examples and the #684 test stories stay separate.
- **Defects.** David, same session: "any defects in the way of writing a clean manual must be mitigated". No chapter is written around a defect that blocks it; the defect is dealt with first. Ruled the same session ("yes, fixed in the platform, start with 714 and 715"): mitigated means fixed in `packages/`, and the D-3 pin and the D-7 directory name move to the release that carries the fixes. Each fix's design goes to David before `packages/` is touched. Order: #714, #715, then the rest.
- D-8 (title) and D-9 (audience and length) are not ruled.
- Not covered by D-7 (b): where the eight Relighting snapshots live once they leave `docs/work/chord-manual/snapshots/`.

## Ruled 2026-11-13 (session 625c8d, David)

David's words: "I don't want to use any of the current material. We just updated Chord several times, so the first step is to look at everything in the syntax and organize loose chapters, then create a game that we can build through those chapters...you have authority over plot, story, puzzles, and prose...but I'd like a story that lines up after Spellbreaker when magic and spells work again."

What that settles:
- **No existing material is a source.** The site's Chord pages, the Family Zoo mirrors, Fernhill, the Ides of March and Cloak are not adapted, quoted or planned from. Every chapter is [new], written from `packages/chord` at the pin. This overrides the "[have]" framing wherever it survives below.
- **Order of work.** First the syntax survey and a loose chapter organization (`docs/work/chord-manual/chapters.md`, written this session from `packages/chord/chord.ebnf` read in full). Then the game those chapters build (`docs/work/chord-manual/game.md`, a design written this session; no Chord yet).
- **D-1 is ruled:** a new example, written by Claude, who has authority over its plot, story, puzzles and prose. David's one premise is the setting quoted above. The session's reading of that premise (an original world, no names or content from Infocom's games) is recorded in `game.md` and is the session's interpretation, not David's wording.
- **D-2:** ruled for the game's prose. For the manual's own prose, (a) stands as the default reading of "the same way" unless David says otherwise.
- **D-6:** the "adapts that material as its [have] source" half of option (a) is void. How the manual is published is still open.
- D-3, D-4, D-5, D-7, D-8, D-9 and D-10 are not ruled.

**Progress since the ruling (same session).** David renamed and recast the player character (Ansel, a returning former student) and said "go ahead with part II" and "go ahead with part III", building on `chapters.md` and `game.md` as written. The game now exists as three snapshots under `docs/work/chord-manual/snapshots/` (`part-1`, `part-2`, `part-3`, each a `relighting.story`), a provisional home until D-7 is ruled. Each passed `node packages/devkit/dist/cli.js compose <file> --check` ("gate-clean", Chord 4.0.2) and was played with `sharpee play <dir>` on 2026-11-13, with the in-repo CLI, not the published one. Part III's Lantern clauses and lighting endings were played only in a scratch copy with the `up is blocked` line removed (once with the lens `starts broken`, once without), since no working can unseal the stair until Part IV. No snapshot has a test tree yet. What the snapshots taught is listed in `game.md`; issues #704, #705 and #706 came from them.

Not yet re-cut: Phases 2 to 5 below still carry the planner's chapter ranges (1–9, 10–16, 17–23, 24–30), its Volume names and the `tutorials/familyzoo/chord-v4/` companion path. Phase 1 re-cuts them against `chapters.md` once David accepts that organization.

## References consulted
- `CLAUDE.md` — no `packages/` change without discussion; `docs/unofficial/` is not a source; real stories other than Dungeo do not gate and story-exploring tests run on `test-stories/`; never auto-retry a failed build.
- `docs/work/book/plan-20260620-sharpee-author-book.md` — the method this plan copies: goal and non-goals, locked-decisions table, one Pandoc source to three formats, `book.yaml` chapter order, one running example, the two-depth "Under the Hood" convention, generated appendices, an outline by Volume marked [have]/[new].
- `docs/work/book-v2-edition/plan.md` — voice constraints apply to every prose phase; chapter claims are proven by building and running, never by read-through; the naive-executor gate runs against published packages only.
- `docs/work/v2-209-book/plan.md` — companion code lives beside the book and every chapter's quoted output is pinned by a test that is actually run.
- `docs/work/book/naive-prompt.txt` — the amnesia protocol (book as the only source, execute as-is, no R&D, per-chapter PASS / PASS-WITH-ISSUES / BLOCKED log, DEVIATION only when blocked) and the "clean" definition.
- `docs/work/test-book/accepted-limitations.md` — by-design items are listed in the run brief so a clean run is unambiguous.
- `docs/book/CLAUDE.md` — binding for everything under `docs/book/`: v1.5.0 voice, no em-dashes in prose, complete sentences, quoted output must match the published platform, snippets must work against the published packages, re-run the snippet extractor after code edits, a content edit is not done until the build is clean; appendices are generated and exempt.
- `scripts/build-book.sh` — takes the edition directory under `docs/book/` as its argument; names output `the-sharpee-book-<version>`; its `snippets` target copies into `site/`, which no longer exists.
- `scripts/extract-book-snippets.cjs` — runs from the edition directory; extracts only `typescript`, `bash`, `css` and `jsonc` fences, so `chord` and `shell` fences need adding.
- `docs/core-concepts/README.md` — Chord compiles to Story IR that `@sharpee/story-loader` interprets; Chord stories are tested by `@sharpee/branch-tester` tree documents stored as a `<story-id>.tests/` directory; `./sharpee` is the author tool.
- `test-stories/README.md` — test stories are "Never published, never a sample", so none can be the manual's example.
- `branch-stories/familyzoo/README.md` — the Chord Family Zoo is John Googol's sixteen-step tutorial, mirrored from his IF Hub, re-tested by him on Sharpee 5.5.0 / Chord 4.0.0, with no tree tests.
- `tools/ide/build-docs-tab.sh` — Chord Writer's Documentation tab is built from `website/src/app/chord` and `learn`, so the site pages are the corpus both the site and the IDE ship.
- `docs/architecture/adrs/adr-272-grammar-documentation-surfaces.md` — read only to locate `packages/story-loader/tests/docs-examples-load.test.ts`, the precedent for wrapping a fence in a minimal story harness; not read as a description of current code.
- `docs/context/project-profile.md` — mutation verification for story work rides on tree `states:` pins; `docs/unofficial/` is not a source; versions move at publish.
- `docs/context/session-20261113-1951-main.md` — open issue #653: Chord Writer 1.4.0 carries a pre-4.0 toolchain, and no published Chord Writer pairs with Sharpee 5.6.x / Chord 4.0.x.
- Open issues, read through that summary from the issue record — #685 is this goal's record: the manual exists to expose Chord's gaps, so every example must be compiled and loaded, and it leaves open the audience, the length, whether the examples double as #684's small test stories, and who writes it. #681: the Family Zoo mirrors `familyzoo` and v13–v16 do not compile today (they repeat a standard action's grammar), and David ruled they stay as they are until John Googol updates them. #582: an open Fernhill defect (the deed box can leave the Folly without the locket).
- `docs/proposals/docs-consolidation.md` — P-7 (DONE) keeps the Sharpee Book at `docs/book/`; P-9 (ACCEPTED, held) wants one active plan per work directory, so this plan keeps its run logs under its own slug.
- `docs/proposals/code-documentation-sweep.md` — accepted header convention; every script this plan adds or edits carries a header comment. This plan implements no proposal item.
- Product ADRs not consulted (no Scope intersection): none. This repository has no `docs/adrs/` directory; its ADRs live under `docs/architecture/adrs/`, outside the planner's reference universe.

## Open decisions (David rules on all of these before Phase 1 starts)

**D-1. The running example.** RULED 2026-11-13: none of the candidates below; a new game written by Claude (see "Ruled 2026-11-13" above and `game.md`). The candidate list is kept as the record of what was offered. The method rests on one story that grows chapter by chapter, with a compiling snapshot at every step. Candidates found:
- (a) **Chord Family Zoo**: `branch-stories/familyzoo/` plus `branch-stories/familyzoo-v01/` through `branch-stories/familyzoo-v16/`. John Googol's tutorial, one concept per step, from the story header and one room (50 lines) to story states and a closing sequence (843 lines). It is the same zoo the Sharpee manual teaches, and it is the only candidate that already has a step-by-step spine. It is a third party's work, so it needs John Googol's permission and David's ruling on credit. It was tested on Chord 4.0.0 and has no tree tests. Steps v13–v16 and the combined story do not compile today (#681) until John re-publishes them. It covers Volumes I–VI only; presentation, multi-file and testing chapters would need extension steps David supplies (the role v18 played for the Sharpee manual) or snippet-only teaching.
- (b) **The Folly at Fernhill**: `branch-stories/fernhill/fernhill.story` (1,193 lines, authored by "The Sharpee Project"), with a recorded tree in `branch-stories/fernhill/fernhill.tests/` and an existing pattern-by-pattern tutorial at `website/src/app/learn/fernhill/`. It is platform-owned and covers presentation, but it is a finished game walked through rather than built up, so early-chapter snapshots would have to be cut down from it. It also carries an open defect (#582).
- (c) **Cloak of Darkness**: `stories/cloak-of-darkness/cloak.story`. A three-room standard demo that suits a first-story chapter but cannot carry eight volumes.
- (d) **The Ides of March**: `branch-stories/ides-of-march/` (930 lines, recorded tree, downloadable on the site). A complete game with the same walk-through shape as (b).
- (e) A new example David supplies.
- Not candidates: everything in `test-stories/` (their README forbids it), Dungeo, armoured, secret-letter.
- Recommendation: (a) if John Googol agrees, because only it has the incremental spine and readers of both manuals meet the same zoo; (b) otherwise.

**D-2. Who drafts the prose.**
- (a) Claude drafts in session under `docs/book/CLAUDE.md`'s voice rules and David reviews each volume. This is how the Sharpee manual was written and is the default reading of "the same way".
- (b) David drafts; Claude builds the toolchain, companion snapshots, trees, appendices and every check.
- (c) Claude adapts existing site material only, and David writes every [new] chapter.
- Recommendation: (a). The manual is technical documentation; story content stays David's under D-1.

**D-3. The edition pin.**
- (a) Sharpee 5.6.1 / Chord 4.0.2, the pair in `website/src/lib/versions.json` and in `packages/chord/src/version.ts:355`. `sharpee --version` prints both.
- (b) Whatever the next release is.
- Chord Writer complicates either answer. `website/src/lib/versions.json` and `tools/ide/project.yml` both say 1.4.0, and open issue #653 says 1.4.0 carries a pre-4.0 toolchain, so no published Chord Writer pairs with 5.6.1 / 4.0.2 today.
- Recommendation: (a) for the language and the CLI. The Chord Writer passages are drafted against the current IDE, but they are not accepted until a Chord Writer release that pairs with the pin is published.

**D-4. Which authoring surface the chapters teach.** The site says most authors use Chord Writer, but the naive reader runs headless in a container and can only drive the CLI.
- (a) A surface-neutral body. Every chapter teaches the `.story` text, then a "Build and try it" step gives both the Chord Writer action and the `sharpee` command. Volume I sets up both.
- (b) Chord Writer first, with CLI notes.
- (c) CLI first, with one Chord Writer chapter.
- Recommendation: (a).

**D-5. What the second depth shows.** The Sharpee manual's "Under the Hood" asides show the public TypeScript API.
- (a) Asides name the platform concept a Chord line becomes: the trait, the standard action, the event id, the message alias. Names come from published outputs (`sharpee compose` IR, `sharpee messages`), with a pointer to the Sharpee manual. No TypeScript source and no ADRs. This keeps the two-track model (Author's Track skips the asides).
- (b) One depth only.
- (c) Asides quote Story IR JSON.
- Recommendation: (a).

**D-6. How the manual is published, and how it relates to the site's Chord docs.** The site already carries about 15,000 lines of Chord material under `website/src/app/chord/`, `website/src/app/chord-writer/` and `website/src/app/learn/fernhill/`, and Chord Writer's Documentation tab bundles it.
- (a) The manual adapts that material as its [have] source and ships as PDF and EPUB downloads plus a chunked web build, linked from sharpee.net. The site pages stay as they are. This mirrors the Sharpee book, which deferred site integration.
- (b) The manual becomes canonical and the site's guide pages are generated from it.
- (c) Downloads only.
- Whichever is chosen, the publish step is new work: sharpee.net is served from `website/` (Next.js, deployed by `website/deploy.sh`), not from `site/`.
- Recommendation: (a).

**D-7. Where the edition and its companion snapshots live.**
- (a) `docs/book/chord-v4/` (new), a sibling of `docs/book/v2.0.0/`, revised in place across Chord 4.x the way v2.0.0 was revised to 2.2. `docs/book/CLAUDE.md` already governs everything under `docs/book/`, and the Sharpee-edition helpers that pick "the newest edition" match only `v`-prefixed names, so they are unaffected. Companion snapshots go to `tutorials/familyzoo/chord-v4/` (new), mirroring `tutorials/familyzoo/v2.0.0/`, or the matching directory for the example D-1 picks.
- (b) `docs/book/chord-v4.0.2/`, with the pin in the name.
- (c) A separate tree such as `docs/chord-manual/v4/`, with its own copy of the rules.
- Moving the Sharpee editions into a `docs/book/sharpee/` subdirectory is not offered, because docs-consolidation P-7 settled that location.
- Recommendation: (a).

**D-8. The title.**
- (a) *The Chord Author's Manual*, which parallels the Sharpee manual's title without its "Developer" half.
- (b) *The Chord Language Manual*.
- (c) David's own.
- Recommendation: (a), though this is purely David's call.

**D-9. Audience and length.** Issue #685 leaves both open.
- (a) First-time interactive-fiction authors, with no programming assumed, in about thirty chapters over eight Volumes like the Sharpee manual (the Draft outline below has thirty). Experienced authors are served by the appendices and the site's reference pages.
- (b) Authors who already know another IF system, in a shorter book that teaches by contrast.
- (c) Both, through two reading tracks.
- Recommendation: (a).

**D-10. Whether the manual's examples double as #684's small test stories.** Issue #685 asks this.
- (a) No. The manual's examples and companion snapshots are published, while `test-stories/README.md` says test stories are "Never published, never a sample". The two sets stay separate.
- (b) Yes, which would mean amending that README's rules first.
- Recommendation: (a).

## Locked decisions (carried from the Sharpee method)

| Decision | Choice |
| --- | --- |
| Organizing model | Integrated-progressive: one continuous narrative in eight Volumes over one running example |
| Source of truth | One canonical markdown set rendered to HTML, EPUB and PDF by Pandoc and WeasyPrint through `scripts/build-book.sh` |
| Voice and accuracy | `docs/book/CLAUDE.md` in full: no em-dashes in prose, complete sentences, quoted output exactly as the pinned toolchain prints it |
| Proof of a chapter | Its companion snapshot compiles and loads with the published CLI at the pin, and its tree pins every "Try it" output; a read-through is not proof |
| Gaps are findings | The manual exists to expose Chord's gaps (#685). A construct that cannot be shown working is filed as a GitHub issue and taken to David; the prose never works around it |
| Failures | Per `CLAUDE.md`, a failed build or test is reported, never looped through fix-and-rerun. Text and snapshots the session wrote count as its own fixture, which David's standing feedback lets it correct; a failure that points at the platform stops for him |
| Appendices | Generated from shipped sources and regenerated, never hand-edited |
| Acceptance | Naive-reader runs repeat until clean: every chapter PASS, zero BLOCKED, zero deviations, every reported issue on the accepted list |

## Non-goals
- TypeScript authoring and the `@sharpee/*` API, which are the Sharpee manual's subject; also writing extensions or `use` gates, and platform contributions.
- ADR references anywhere in the manual's text.
- Changes under `packages/`. A phase that finds it needs one stops and takes it to David; a platform defect found while writing is filed as a GitHub issue and the passage waits.
- Rewriting the example's story content. Story changes happen only when a chapter exposes a genuine defect, and story elements come from David.
- Rewriting the Chord primer, which David supplies.
- CI gates. Every check is a local script.
- Treating the companion snapshot trees as a platform regression floor. They prove the manual's own quoted output and do not gate platform work.

## Current state (what already exists)
- **Site material.** Not a source for the manual (ruled 2026-11-13). Described here only as what exists: the site's Chord corpus has getting-started, guide, cookbook, stdlib and grammar-reference sections, the Chord Writer pages, and the Fernhill tutorial. It must be reconciled against the pinned toolchain rather than copied. For example, `website/src/app/chord/guide/tooling/sharpee-test/content.mdx` still describes a single `<story-id>.tests.json`, while `packages/devkit/src/commands/test-tree-document.ts` reads a `<story-id>.tests/` directory of segments. The site's prose also uses em-dashes throughout.
- **Grammar sources.** `docs/work/chord/grammar.md` is a July snapshot ("Phase A subset") and is not current. The live grammar is `packages/chord/chord.ebnf`, which the site copies through `website/scripts/sync-chord-ebnf.mjs`.
- **Generator inputs.** The standard grammar every story loads is `packages/parser-en-us/grammar/standard-en-us.story`. The core vocabulary is exported from `packages/chord/src/index.ts:33` (`KIND_NOUNS`, `TRAIT_ADJECTIVES`, `STATE_ADJECTIVES`, `EVENT_VERBS`, `PRONOUN_WORDS`, `MESSAGE_OVERRIDE_ALIASES` and others). `sharpee messages` emits every overridable message with its alias and template (`packages/devkit/src/cli.ts:48`).
- **Diagnostic codes.** These are string literals spread across `packages/chord/src` (about 840 distinct `lex.`, `parse.` and `analysis.` codes by a literal scan), with no single registry.
- **Book tooling.** `pandoc` and `weasyprint` are installed. `scripts/build-book.sh`, `scripts/book-web-nav.cjs` and `scripts/build-snippet-page.cjs` are hard-wired to `docs/book/` and to `site/`, and the last two also to `tutorials/familyzoo/`.

## Draft outline (SUPERSEDED 2026-11-13)

The working outline is `docs/work/chord-manual/chapters.md`: forty loose chapters in eight Parts, derived from the 4.0.2 grammar, with `docs/work/chord-manual/game.md` mapping the game onto them. The planner's thirty-chapter outline below was built on adapting site material and the Family Zoo; it is kept as history and is not the plan.

[have] means material exists to adapt and reconcile against the pin; [new] means it must be written. Site paths are relative to `website/src/app/chord/` unless shown otherwise. "zoo vNN" applies only if D-1 picks the Family Zoo.

Front matter: title and copyright pages carrying the pin **[new]**; Preface **[new, short]**; How to read this book (the two tracks, the Under-the-Hood legend, "Build and try it" on both surfaces, how the example grows) **[new, short]**.

Volume I — Getting Started
1. Installing Chord Writer and the `sharpee` CLI **[have: site chord-writer/download, getting-started/install]**
2. Your first story: the story header and one room **[have: getting-started/first-story, guide/world/the-story-header, chord-writer/your-first-story; zoo v01]**
3. Build, play, and read the compiler **[have: getting-started/compose-and-run, guide/tooling/sharpee-compose, guide/tooling/reading-diagnostics, guide/reading; new: how a turn works]**

Volume II — Building a World
4. Rooms and exits **[have: guide/world/exits-and-blocked-exits; zoo v02]**
5. Things: kinds, traits, settings, scenery and portable objects **[have: guide/world/creating-things, kinds-traits-and-settings, placing-and-wearing; zoo v03–v04]**
6. Containers and supporters **[have: stdlib/containers, cookbook/manipulation; zoo v05]**
7. Doors, locks and blocked exits **[have: guide/world/doors, cookbook/containers-and-locks; zoo v06–v07]**
8. Light and dark **[have: zoo v08; new framing]**
9. Regions, first visits and starting state **[have: guide/world/regions, the-first-visit-description, starting-state]**

Volume III — Making It Interactive
10. The standard actions as a Chord author meets them **[have: stdlib section and stdlib/reference; new framing]**
11. Readable and switchable things **[have: stdlib/devices, stdlib/senses; zoo v09–v10]**
12. States and named conditions **[have: guide/world/states, guide/behavior/conditions, guide/vocabulary/define-condition; zoo v16 story states]**

Volume IV — Behavior
13. Event clauses: on, before and after **[have: guide/behavior/on-and-after, while-once-before-after, the-when-suffix, what-a-clause-can-bind; zoo v12]**
14. Statements, refusals and requirements **[have: guide/behavior/the-statements, refusals, requirements]**
15. Selecting and sequencing **[have: guide/flow/select-on-a-value, ordinal-blocks, each-blocks, sequences]**
16. Custom traits and actions **[have: guide/vocabulary/define-trait, define-action, extend-action, remove-from-action; zoo v13]**

Volume V — Words
17. Prose, paragraphs and markers **[have: guide/world/prose-paragraphs-and-markers, guide/vocabulary/comments]**
18. Phrases and their strategies **[have: guide/vocabulary/define-phrase, define-phrases, guide/flow/select-with-a-strategy; zoo v09 verbatim blocks]**
19. Phrasebooks, message overrides and per-entity overrides **[have: guide/vocabulary/define-phrasebook, define-pronouns, guide/world/per-entity-phrase-overrides]**

Volume VI — Living Worlds
20. People and conversation **[have: guide/world/people, the thirteen guide/characters-and-conversation pages, guide/behavior/topic-tables; zoo v11]**
21. Time: every turn, timers and state machines **[have: guide/flow/timers, state-machines; zoo v14]**
22. Scoring, chapters, death and endings **[have: guide/flow/scoring, chapters, death, endings, guide/world/scores-live-on-owners; zoo v15–v16]**
23. Opt-in systems: `use`, hunger, vehicles, sailing and expanses **[have: guide/vocabulary/use, guide/flow/hunger, guide/world/vehicles, sailing, expanses]**

Volume VII — Presentation (the zoo's gap; see D-1)
24. Sound, music and images **[have: guide/world/sound-music-and-images, site learn/fernhill/browser]**
25. The browser client: themes and the header's client fields **[have: guide/world/the-story-header, chord-writer/publishing; new]**
26. Channels a story declares **[have: site learn/fernhill/browser; background in `docs/core-concepts/channel-io.md`; new]**

Volume VIII — Shipping
27. Multi-file stories **[have: guide/project/multi-file-stories]**
28. Testing with tree documents **[have: guide/tooling/sharpee-test (stale on file layout), chord-writer/building-playing-and-testing; new: the CLI path]**
29. Claims **[have: guide/tooling/claims]**
30. Publishing **[have: chord-writer/publishing; new: `sharpee publish`]**

Appendices (generated): A, the Chord grammar from `packages/chord/chord.ebnf`; B, the standard actions and their grammar from `packages/parser-en-us/grammar/standard-en-us.story`; C, the core vocabulary from the published `@sharpee/chord` exports; D, message aliases and default text from `sharpee messages`; E, diagnostic codes, only if a repo-side scan can produce it.

**Phase order.** Phases 2 to 5 run in order, because each chapter's snapshot builds on the one before. Phase 6 depends only on Phase 1 and may run at any point before Phase 7. Phases 7, 8 and 9 run in order after Phases 5 and 6.

## Phases

### Phase 1: Syntax survey, loose chapters, the game's design, and an empty edition that builds clean
- **Tier**: Medium
- **Budget**: 250
- **Domain focus**: The Chord 4.0.2 surface, editorial structure, and book tooling.
- **Entry state**: No `docs/book/chord-v4.0.2/` exists. `scripts/build-book.sh` builds only Sharpee editions under their Sharpee file name. The edition-skeleton deliverables below wait on David's rulings on D-3 to D-10; the first three deliverables do not.
- **Deliverable**:
  - Read `packages/chord/chord.ebnf` and the vocabulary catalogs in full and sort every construct into loose chapters: `docs/work/chord-manual/chapters.md` (written 2026-11-13, awaiting David's review).
  - Design the game the chapters build, with a chapter-by-chapter growth table: `docs/work/chord-manual/game.md` (written 2026-11-13, awaiting David's review).
  - Once David accepts the chapter organization, re-cut Phases 2 to 5 (chapter ranges, Part names, companion path) against it.
  - Record each remaining ruling in this plan's Open decisions section, dated, and rewrite any path the rulings change.
  - Create the edition skeleton: `docs/book/chord-v4.0.2/book.yaml` (new) and `docs/book/chord-v4.0.2/frontmatter.yaml` (new); `docs/book/chord-v4.0.2/frontmatter/` (new) with a title page and a copyright page stating the pin; one stub per outline chapter under `docs/book/chord-v4.0.2/parts/` (new); appendix stubs under `docs/book/chord-v4.0.2/backmatter/` (new); `docs/book/chord-v4.0.2/styles/` (new), copied from `docs/book/v2.0.0/styles/`; and a `.gitignore` for build output.
  - Make `scripts/build-book.sh` take the output file name from the edition, so the Chord edition is not named `the-sharpee-book-*`. Make it skip the dead `site/` copy for an edition that has no site target.
  - Add `chord` and `shell` fences to the extraction map in `scripts/extract-book-snippets.cjs`.
  - Add a Chord-edition section to `docs/book/CLAUDE.md` naming its em-dash check path.
  - Install the published `@sharpee/devkit@5.6.1` in the scratchpad and confirm it reports the pin.
  - Establish, using the published CLI alone, how a reader creates and extends a `<story-id>.tests/` tree, and record the answer here. If the only path is Chord Writer's Testing tab, stop and take it to David: a CLI path would be a `packages/devkit` change, and both chapter 28 and the headless naive gate depend on it.
- **Files**: `docs/book/chord-v4.0.2/` (new), `docs/book/chord-v4.0.2/frontmatter/` (new), `docs/book/chord-v4.0.2/parts/` (new), `docs/book/chord-v4.0.2/backmatter/` (new), `docs/book/chord-v4.0.2/styles/` (new), `scripts/build-book.sh`, `scripts/extract-book-snippets.cjs`, `docs/book/CLAUDE.md`, `docs/work/chord-manual/plan.md`
- **Exit state**: The rulings and the final outline are in this plan. The empty edition renders to HTML under its own name, with every outline chapter in the table of contents. The Sharpee edition still builds, and its extracted snippets are unchanged. The CLI tree-authoring path is known, or it is with David as a platform question.
- **Demonstration**: `scripts/build-book.sh chord-v4.0.2 html` exits 0, and the HTML it writes lists every outline chapter. `scripts/build-book.sh v2.0.0 html` exits 0. Re-running the snippet extractor from `docs/book/v2.0.0/` leaves `git status --porcelain docs/book/v2.0.0/code-snippets` empty. The published devkit, run through npx at 5.6.1 with the version flag, prints "Sharpee 5.6.1 · Chord 4.0.2".
- **Demonstrated**: 
- **Status**: CURRENT (since 2026-11-13)

### Phase 2: Volumes I and II, Getting Started and Building a World (chapters 1–9)
- **Tier**: Large
- **Budget**: 400
- **Domain focus**: Chapter writing: the story header, rooms, exits, things, containers, doors and locks, light, regions.
- **Entry state**: Phase 1's exit state holds, and the CLI tree path is known.
- **Deliverable**:
  - Draft chapters 1–9 in full under the voice rules (or integrate David's drafts, if D-2 is (b)), adapting each [have] source against the pin.
  - Write the "Build and try it" steps according to D-4, and the Under-the-Hood asides according to D-5.
  - For each chapter that grows the example, add a companion snapshot under `tutorials/familyzoo/chord-v4/` (new) with a tree pinning every "Try it" output.
  - Re-run the snippet extractor so that `docs/book/chord-v4.0.2/code-snippets/` (new) is in sync.
  - File every language gap the chapters expose as a GitHub issue, and list the issue numbers in the phase's work summary. Phases 3 to 5 do the same.
- **Files**: `docs/book/chord-v4.0.2/parts/`, `docs/book/chord-v4.0.2/code-snippets/` (new), `tutorials/familyzoo/chord-v4/` (new)
- **Exit state**: Chapters 1–9 are drafted with no stubs left. Every quoted output matches what the published 5.6.1 CLI prints. The Chord Writer half of chapter 1 is marked pending under D-3 if no paired Chord Writer release exists yet.
- **Demonstration**: `scripts/build-book.sh chord-v4.0.2 html` exits 0. `grep -rn "—" docs/book/chord-v4.0.2/frontmatter/ docs/book/chord-v4.0.2/parts/` returns only the permitted heading forms. For each companion snapshot this phase adds, the published CLI's build and test commands (run through npx at 5.6.1) exit 0, and the session lists each snapshot with its passing card count.
- **Demonstrated**: 
- **Status**: PENDING

### Phase 3: Volumes III and IV, Making It Interactive and Behavior (chapters 10–16)
- **Tier**: Large
- **Budget**: 400
- **Domain focus**: Chapter writing: standard actions, readable and switchable things, states and conditions, event clauses, statements and refusals, selection and sequencing, custom traits and actions.
- **Entry state**: Phase 2's exit state holds, and the chapter 9 snapshot is the starting point.
- **Deliverable**: Chapters 10–16 under the same conventions, with companion snapshots, trees and re-extracted snippets. Under-the-Hood asides in chapter 10 name the standard actions only by the identifiers the published outputs show.
- **Files**: `docs/book/chord-v4.0.2/parts/`, `docs/book/chord-v4.0.2/code-snippets/`, `tutorials/familyzoo/chord-v4/`
- **Exit state**: Chapters 10–16 are drafted. Every snapshot compiles, and every tree passes on the published CLI.
- **Demonstration**: `scripts/build-book.sh chord-v4.0.2 html` exits 0. The em-dash check over `docs/book/chord-v4.0.2/parts/` returns only permitted hits. The published CLI's build and test commands exit 0 for each snapshot this phase adds, with card counts listed.
- **Demonstrated**: 
- **Status**: PENDING

### Phase 4: Volumes V and VI, Words and Living Worlds (chapters 17–23)
- **Tier**: Large
- **Budget**: 400
- **Domain focus**: Chapter writing: prose and markers, phrases and strategies, phrasebooks and overrides, people and conversation, time, scoring and endings, opt-in systems.
- **Entry state**: Phase 3's exit state holds.
- **Deliverable**: Chapters 17–23 under the same conventions, with companion snapshots, trees and re-extracted snippets. Chapter 19 points to Appendix D for the full alias list instead of reproducing it.
- **Files**: `docs/book/chord-v4.0.2/parts/`, `docs/book/chord-v4.0.2/code-snippets/`, `tutorials/familyzoo/chord-v4/`
- **Exit state**: Chapters 17–23 are drafted. Every snapshot compiles, and every tree passes on the published CLI.
- **Demonstration**: `scripts/build-book.sh chord-v4.0.2 html` exits 0. The em-dash check returns only permitted hits. The published CLI's build and test commands exit 0 for each snapshot this phase adds, with card counts listed.
- **Demonstrated**: 
- **Status**: PENDING

### Phase 5: Volumes VII and VIII, Presentation and Shipping (chapters 24–30), and the final front matter
- **Tier**: Large
- **Budget**: 400
- **Domain focus**: Chapter writing: sound and images, the browser client, channels, multi-file stories, tree testing, claims, publishing; then the preface and How to read this book.
- **Entry state**: Phase 4's exit state holds. Any extension steps D-1 calls for in Volume VII have been supplied by David.
- **Deliverable**:
  - Chapters 24–30 under the same conventions. Volume VII's browser claims are checked by Playwright against the built web output.
  - Chapter 28 teaches the CLI tree path Phase 1 established.
  - Write the preface and How to read this book in full.
- **Files**: `docs/book/chord-v4.0.2/parts/`, `docs/book/chord-v4.0.2/frontmatter/`, `docs/book/chord-v4.0.2/code-snippets/`, `tutorials/familyzoo/chord-v4/`
- **Exit state**: Every chapter and all front matter are drafted. The whole book renders to HTML, EPUB and PDF.
- **Demonstration**: `scripts/build-book.sh chord-v4.0.2 all` exits 0 and writes all three formats. The em-dash check returns only permitted hits. The published CLI's build and test commands exit 0 for every companion snapshot in the edition. Each Volume VII Playwright check passes.
- **Demonstrated**: 
- **Status**: PENDING

### Phase 6: Generated appendices
- **Tier**: Medium
- **Budget**: 250
- **Domain focus**: Book tooling: appendices derived from the shipped sources at the pin.
- **Entry state**: Phase 1's exit state holds. This phase may run at any point before Phase 7.
- **Deliverable**:
  - Write `scripts/generate-chord-appendices.cjs` (new), with a header comment. It writes Appendix A from `packages/chord/chord.ebnf`, Appendix B from `packages/parser-en-us/grammar/standard-en-us.story`, Appendix C from the published `@sharpee/chord` vocabulary exports, and Appendix D from the published `sharpee messages` output.
  - Appendix E (diagnostic codes) only if a repo-side scan of `packages/chord/src` can produce it. Anything that needs a registry in `packages/` stops for David's ruling.
  - Group headings carry `{.unnumbered .unlisted}`, as in the Sharpee manual's Appendix D.
- **Files**: `scripts/generate-chord-appendices.cjs` (new), `docs/book/chord-v4.0.2/backmatter/`
- **Exit state**: Each appendix's entry count matches its source: Appendix B has one entry per `define action` block in the standard grammar, and Appendix D has one entry per alias `sharpee messages` emits. Regenerating produces no diff.
- **Demonstration**: `node scripts/generate-chord-appendices.cjs` exits 0. A second run leaves `git status --porcelain docs/book/chord-v4.0.2/backmatter/` empty. The session prints each appendix's count beside its source count. `scripts/build-book.sh chord-v4.0.2 html` exits 0 with the appendix headings kept out of the table of contents.
- **Demonstrated**: 
- **Status**: PENDING

### Phase 7: The snippet check against the published toolchain
- **Tier**: Medium
- **Budget**: 250
- **Domain focus**: Book tooling: every `chord` fence in the manual is proven against the pinned CLI.
- **Entry state**: Phases 5 and 6 are complete.
- **Deliverable**:
  - Write `scripts/check-chord-snippets.cjs` (new), with a header comment. It reads the extracted fences and classifies each as a complete story, a chapter addition or an illustrative fragment.
  - Complete stories and chapter-assembled snapshots are compiled and then booted through the published CLI's loader. Fragments are first wrapped in the minimal story harness that `packages/story-loader/tests/docs-examples-load.test.ts` uses. Loading is required, not compiling alone, because a construct the compiler accepts and the loader refuses is exactly the gap #685 describes.
  - The script prints a per-chapter table.
  - Add a committed fixture the checker is known to fail on (a broken `chord` fence), with `scripts/__tests__/check-chord-snippets.test.ts` (new) asserting that it is reported.
  - Fix book-side failures. File platform defects as GitHub issues for David.
- **Files**: `scripts/check-chord-snippets.cjs` (new), `scripts/__tests__/check-chord-snippets.test.ts` (new), `docs/book/chord-v4.0.2/parts/`
- **Exit state**: Every fence in the manual compiles and loads against Sharpee 5.6.1 / Chord 4.0.2, or is listed as a filed platform issue awaiting David. The checker fails on its fixture.
- **Demonstration**: `node scripts/check-chord-snippets.cjs docs/book/chord-v4.0.2/` exits 0 and prints the per-chapter table with zero failures. The fixture test fails the broken fence and passes.
- **Demonstrated**: 
- **Status**: PENDING

### Phase 8: Naive-reader acceptance runs
- **Tier**: Large
- **Budget**: 400 per session; runs repeat until clean, so this phase may span sessions.
- **Domain focus**: The acceptance gate: a reader with no repository context follows the manual literally.
- **Entry state**: Phase 7's exit state holds, and the PDF renders.
- **Deliverable**:
  - Write `docs/work/chord-manual/naive-prompt.txt` (new) and `docs/work/chord-manual/accepted-limitations.md` (new), modeled on the Sharpee brief. They cover amnesia, execute as-is, no R&D, per-chapter logging, a stale-artifact check on the title page, the npm versions the run must get, Playwright for Volume VII, and how Chord Writer steps are handled under D-4.
  - Each run happens in a container with only the PDF and the published CLI, launched by David or as he directs. Its log lands under `docs/work/chord-manual/naive-runs/` (new).
  - Triage each log, fix book defects, re-render, and run again.
- **Files**: `docs/work/chord-manual/naive-prompt.txt` (new), `docs/work/chord-manual/accepted-limitations.md` (new), `docs/work/chord-manual/naive-runs/` (new), `docs/book/chord-v4.0.2/`, `tutorials/familyzoo/chord-v4/`
- **Exit state**: The latest run is clean: every chapter PASS, zero BLOCKED, zero deviations, and every reported issue on the accepted list.
- **Demonstration**: The newest execution log under `docs/work/chord-manual/naive-runs/` shows every chapter with STATUS PASS, no BLOCKED or DEVIATION entries, and only accepted-list issues. The Demonstrated line names that log file and quotes its per-status counts.
- **Demonstrated**: 
- **Status**: PENDING

### Phase 9: Publication on sharpee.net
- **Tier**: Medium
- **Budget**: 250
- **Domain focus**: Publication per D-6.
- **Entry state**: Phase 8's exit state holds.
- **Deliverable**:
  - Render all formats plus the chunked web build.
  - Place the PDF and EPUB in `website/public/downloads/`, and the web build where D-6 puts it.
  - Add the manual's page and a link in `website/src/lib/nav.ts`, following the version notes in `website/AGENTS.md`.
  - The live deploy (`website/deploy.sh` on the server) is David's step.
- **Files**: `website/public/downloads/`, `website/src/lib/nav.ts`, `website/src/app/chord/`
- **Exit state**: The local site builds and serves the manual's page with working downloads. David has deployed it, or the deploy is recorded as his pending step.
- **Demonstration**: `npm --prefix website run build` exits 0. The site's start script, run locally, serves the manual's page, and each download link on it returns 200. After David's deploy, the same page loads on sharpee.net.
- **Demonstrated**: 
- **Status**: PENDING
