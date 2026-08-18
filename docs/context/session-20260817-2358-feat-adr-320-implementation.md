# Session Summary: 2026-08-17 - feat/adr-320-implementation (session ade288)

## Status: COMPLETE — three streams, all closed.
1. **ADR-320 Phase 11 (acceptance closure) DONE** — all 14 ACs discharged with
   re-run evidence; the plan (phases 1–11 incl. 10.1–10.7) is DONE and archived
   to `docs/work/archive/adr-320-conversation/`. ADR-320 is finished.
2. **Housekeeping DONE** — Chord/Sharpee versions aligned, Sharpee minor bumped;
   `./sharpee --version` reports **Sharpee 5.1.0 · Chord 3.3.0**.
3. **IDE Chord 3.3.0 alignment DONE** (4 phases, plan archived) — the D9
   "IDE is behind the installed Chord" warning is retired, and a systemic
   story-header bug found along the way is fixed. Full `SharpeeIDETests`
   **493/493**.

## Goals
- ADR-320 Phase 11: acceptance closure — full AC 1–14 audit with dated inline
  evidence, whole-platform regression, cost-leg byte-identical compile check,
  channel isolation re-confirm, ADR-142 supersession confirm. David confirmed
  phase start ("phase 11").

## Completed
- Fixed Phase 10's stale `**Status**` line in plan.md (was CURRENT, narrative
  said complete) → DONE (session b71e04); Phase 11 → CURRENT then DONE.
- **Acceptance audit written**: `docs/work/archive/adr-320-conversation/`
  `acceptance-audit.md` — all 14 ACs DISCHARGED, every row's evidence re-run
  2026-08-18 against a fresh `./repokit build dungeo` bundle.
- **New transcript** `stories/ides-of-march/tests/transcripts/thread-wire.transcript`
  (8 steps, first-run green): the one leg not previously asserted in a built
  story — thread-opened/beat/parked/resumed on the scene channel and
  `thread-affordances` continuability advertised → cleared on park → restored on
  resume. Ides unit suite is now 212 passing in 18 transcripts.
- **Cost leg measured** against a cold-start worktree build of the branch point
  (`3d68bb96`): `cloak.story` (zero ADR-320 constructs) and `fernhill.story`
  (65 entities, zero constructs) composed by main's chord 3.0.0 vs branch's
  3.3.0 — each IR diff is exactly the one `languageVersion` line. Worktree
  removed after.
- **Regression (all run 2026-08-18)**: ides 212 unit + wt-01 34; thealderman 75;
  Dungeo chain 952 in 17; character-acceptance b1 15 / b3 63 / p8-p9 19 /
  p10 21; Fernhill 9 cards / 18 assertions (`./sharpee test`); unit suites chord
  909, world-model 1492, character 563, story-loader 561, stdlib 1633, engine
  633, parser-en-us 324, bootstrap 43, testing-surface 89, test:scripts 11;
  turbo test:ci 65/65; repo-wide `npx tsc --noEmit` clean.
- **ADR-142 supersession confirmed**; replacement range widened D4–D13 → D4–D14
  (its NPC-continuation sketch is implemented by D14's threads). No construction
  divergence from D4/D14 found.
- Plan Status → DONE; archived via `plan-archive.sh` (pointer released).
  Repointed the one live-source path reference
  (`stdlib/src/actions/helpers/dialogue-selector.ts` header comment) to the
  archive path.

## Housekeeping (post-Phase 11, David's request)
- **Version alignment + Sharpee minor bump**: `website/src/lib/nav.ts` Chord
  section 3.0.0 → 3.3.0, Sharpee section 5.0.1 → 5.1.0 (Chord Writer stays
  1.2.0 on its own line, ADR-279 D1). IDE docs-tab bundle regenerated from that
  source (`tools/ide/build-docs-tab.sh`) — `docs-index.json` now stamps
  `chordLanguageVersion: 3.3.0`, absorbing the parallel IDE session's
  uncommitted 3.2.0 regeneration, and refreshing one docs page
  (`chord__stdlib__reference.html`). `npx tsf version 5.1.0` moved all 34
  workspace packages in lockstep; `./repokit build --no-genai` stamped
  `engine-version.ts` to 5.1.0 and rebuilt tree + bundle. `./sharpee --version`
  reports **Sharpee 5.1.0 · Chord 3.3.0**; Dungeo wt-01 passes against the
  rebuilt bundle (golden matched).

## IDE Chord 3.3.0 alignment (plan: docs/work/archive/ide-chord-330-alignment/)
Triggered by the D9 warning David hit: the IDE's `supportedLanguageVersion` was
pinned at 3.0.0, and the docs-tab regeneration above made
`DocsTabRealPathTests` red until it moved. Plan written by session-planner,
reviewed by `/devarch:plan-review` twice (two CONTRADICTIONs fixed — the corpus
fixture's ADR header idiom and the unextended fixture-set drift guard; one STALE
ADR recorded as a follow-up; one TENSION fixed by scoping Phase 2's diff check
to the one file that matters).
- **Phase 1 DONE**: new corpus fixture
  `packages/chord/tests/fixtures/lexer-golden/conversation-surface.story` (228
  lines, named to parallel `grammar-surface.story`) exercising all three
  conversation minors; drift guard gained 25 construct entries beside the
  existing 13; golden regenerated with **9,584 insertions and 0 deletions**
  (existing streams byte-untouched ⇒ `lexer.ts` behavior unchanged); chord
  suite 909 passing. A `sharpee compose --check` run beyond the phase's bar
  found a real missing `end topics` plus semantic errors — all fixed, fixture
  now **gate-clean at Chord 3.3.0**.
- **Phase 2 DONE**: `ChordLexerGoldenTests` TEST SUCCEEDED with
  `ChordLexer.swift` diff empty (token layer absorbed the whole conversation
  grammar, as at 2.2.0); `SyntaxHighlighter.keywords` gained 5 block nouns +
  `beat`/`conclusion` with the prose-collision tradeoff noted inline; pin
  `"3.0.0"` → `"3.3.0"` with a dated history entry in the file's idiom.
- **Phase 3 BLOCKED**: goal met, exit state not. Full suite = 491 tests, **482
  passing**; all three target suites green, so the pin/bundle/compiler agree at
  3.3.0 and **the D9 warning is retired**. But 9 tests fail (24 assertions),
  all pre-existing and unrelated: IDE Swift test fixtures hardcode the inline
  header `authors: T`, rejected by the parser as `parse.header-inline-list`.
  The gate landed in `ea65f2a3` and is present at this branch's branch point
  (`3d68bb96`) — drift predates the branch. Unseen because the IDE suite has
  never been under CI (ADR-258 D7's own recorded limitation). Not fixed, per
  CLAUDE.md's no-auto-retry rule; held for David.
- **Phase 3 unblocked by Phase 4; plan DONE.** Full suite now **493/493**.
- **Phase 4 DONE** (David: "fix the fixtures and check the scaffold"):
  - **Scaffold is FINE** — the shipped template
    `packages/devkit/templates/story-chord/story.story.template` already uses
    the indented list form. The alarm came from `StoryScaffoldTests`, which
    writes its own fake template in `setUp`; that fake had drifted. Corrected
    to mirror what ships.
  - **Fixture sweep**: inline `authors: X` → indented list in
    `TestToolchain.cleanStory`/`.hatchStory`, `TestRunnerTests`,
    `TestingSurfaceRealPathTests`.
  - **A real product bug, found via the themes test**: every IDE story-header
    reader/writer was blind to list-valued fields. `StoryHeaderLines.field(in:)`
    reads a list item (no colon) as a non-field, and all 8 scans across 4
    modules (`StoryHeaderThemes`, `StoryHeaderIFID`, `StoryHeaderPublishSource`,
    `StoryHeaderAutoAssertion` — one insert scan + one `locate` each) stopped
    there. On any real story (fernhill, every scaffolded story — all use
    `authors:` lists) readers returned nil for fields after the list and
    writers inserted INSIDE it. **Toggling a theme in Chord Writer corrupted
    the author's story header** (`parse.header-list-empty`), and
    `StoryHeaderIFID.read` returned nil on real stories. Fixed at all 8 sites
    via one documented helper `StoryHeaderLines.isListItem(_:under:)`.
    Behavior Statement produced (rule 12); 2 regression tests derived from it.
  - One expectation moved as a stated consequence, not a quiet retune:
    `testAnalyzerErrorArrivesWithFullSpan` span.line 14 → 15 (the indented
    `authors:` adds a line above the error site).
- **Follow-up for David**: the duplication is why one defect lived in four
  modules — the durable fix is extracting the header walk into
  `StoryHeaderLines` as one shared list-aware iterator. Deliberately not done
  (a refactor of working product code, wider than the failure being cleared).

## Chord character + conversation docs (plan: docs/work/archive/chord-character-conversation-docs/)
David: "the IDE doc needs updating for all the character and conversation
changes." Measured first — the gap was **total**: the Chord guide had no
Characters or Conversation coverage at all, only `world/people` (17 lines:
proper/aka/pronouns) and `behavior/topic-tables` (20 lines: define topics).
No source material existed to adapt (`docs/reference/chord-language.md` has
zero coverage; the book's "temperament" hits are prose about rabbits).
- **All 4 phases DONE, plan archived.** 15 new pages under
  `/chord/guide/characters-and-conversation/` — a new nav group between
  Behavior and Flow & Progression; People and Topic-tables cross-linked, not
  moved. Character model: personality-and-temperament, principles, mood,
  feelings-and-knowledge, goals, influence-and-face-acts, conscience.
  Conversation: manner, greetings, topic-recency, exchanges, initiative,
  conversation-threads, continuation-prompts.
- **Accuracy came from the compiler, not the ADRs.** Three scratch stories
  driven to gate-clean `sharpee compose --check` at 3.3.0 (character surface,
  every Phase 2 example, every Phase 3 example). That caught five facts ADR
  prose would have gotten wrong, incl. the built-in personality vocabulary
  being exactly 14 words with `define personality <word>` required for
  anything else; `analysis.feels-duplicate` (one feeling per target);
  `analysis.burdened-unheld` (`burdened by X` needs `knows X`); and that a
  goal's `active when` reads state, never a fact value.
  **`packages/chord/src/character-manifest.ts` is the authoritative source
  for every frozen word list** — the docs quote it, never an ADR.
- **Plan flaws caught before they cost anything**: plan-review found Phase 4's
  page-count gate contradicted the plan's own page table (144+16=160 vs. the
  real 144+15=159 — a gate that would have failed spuriously or been
  "satisfied" by inventing a page). Then the build itself revealed a
  phase-boundary flaw: it **hard-errors** on a nav entry without a page, so
  registering all 15 entries in Phase 1 would have left the docs build broken
  until Phase 3. Corrected — nav entries land with their pages.
- **Open item resolved ahead of Phase 2**: `states:` on a person IS the same
  World > States construct (thealderman:298), so Goals cross-links it.
- **Evidence (2026-08-18)**: docs-tab **159 pages, 5 excluded, Chord 3.3.0**;
  all 15 rendered fragments present in the bundle; version parity holds
  (bundle == pin == CHORD_LANGUAGE_VERSION == 3.3.0); full `SharpeeIDETests`
  **493/493 TEST SUCCEEDED**; `npx tsc --noEmit` clean in website/.

## Stale example status-bar lines (David spotted one; swept for the rest)
- `website/src/app/chord-writer/content.mdx` — was `Chord Writer 1.0.0 ·
  Sharpee 5.0.0 / Chord 3.0.0` (all three stale).
- `website/src/app/chord-writer/download/content.mdx` — was `Chord Writer
  1.2.0 · Sharpee 5.0.1 / Chord 3.0.0`: partially updated at the 5.0.1 bump,
  Chord missed. Both now `Chord Writer 1.2.0 · Sharpee 5.1.0 / Chord 3.3.0`.
- Swept all website docs for version strings; only other hit is a correct
  historical reference in `playground/examples.ts` (left alone). The download
  page is in `EXCLUDED_PAGES`, so its fix is website-only, never in the IDE.
- Verified: docs-tab rebuilt 159 pages / 5 excluded / Chord 3.3.0; full
  `SharpeeIDETests` **493/493 TEST SUCCEEDED** after the bundle change.
- **Recommendation (not implemented — new file, David's call)**: these
  hand-copied version examples rot at every bump with nothing comparing them
  to reality — the third instance this week of the duplicated-data pattern
  the recurrence detector flagged. Precedent exists in
  `scripts/playground-examples-check.mjs`; a small sibling asserting the
  example lines match `CHORD_LANGUAGE_VERSION`, the root package version, and
  `CFBundleShortVersionString` would make the next bump fail loudly.

## Two platform prose defects fixed (David: "fix it", "fix #274 too")
Both surfaced while generating a walkthrough from real output — the artifact
made them visible in a way the transcript suites could not.

**1. Header prose did not reflow (newline issue).**
`packages/chord/src/parser.ts:851` joined `description:`/`prologue:`
continuation lines with `'\n'`, while prose bodies reflow via
`parseProseParagraph` (`:2668`, `p.join(' ')` within a paragraph, `'\n\n'`
between). So the author's editor wrap width was baked into the value — and it
rides the wire as `info.description`, double-wrapping in every client — while
blank lines were dropped outright, making paragraphs unexpressible. Fixed to
the same paragraph rule, using `line.afterBlank` for breaks. Six stories were
affected (ides-of-march, character-acceptance + 3 variants, p10-threads);
Fernhill and Dungeo escaped only by having one-line descriptions. Tests: the
existing case pinning `'Line one.\nLine two.'` updated to the reflowed form
(intended change, flagged not quietly retuned) + 4 new (paragraph break,
inline+continuation, `prologue:` parity, empty-field rejection). One recorded
artifact regenerated: the Ides `tests.json` `info.description` assertion.

**2. GH #274 — win/lose ending printed twice.**
`triggerEnding` (`packages/story-loader/src/loader.ts`) put the phrase key on
the ending event as `data.messageId`, and the engine's ADR-097 domain-message
handler renders anything carrying that field — while the `win`/`lose`
statement already emits the phrase itself (`runtime.ts:3396`). Two emitters,
two renders. Note `kill` directly below gets this right. Fixed by carrying it
as **`endingMessageId`** — same re-typing shape as this session's earlier
surplus-phrase fix — so clients can still name the ending without it being a
second rendering site. No consumer read the old field (engine routes on
`event.type`; tests assert `result.override`). Tests: the loader contract test
updated to the new field + a negative assertion that no top-level `messageId`
survives, plus a runtime test that nothing emits a second renderer.
Verified by re-running the issue's own repro command — prints once.

**Evidence (2026-08-18, after rebuild)**: chord 913, story-loader 562,
stdlib 1633, engine 633, world-model 1492, character 563; ides 212 + wt-01 34;
thealderman 75; Dungeo chain 952; character-acceptance 103 across 3 groups;
Fernhill 9 cards/18 assertions; Ides recorded tests 2 cards/4 assertions;
repo-wide tsc clean.

## Key Decisions
- ADR-142's stamp amendment was made (docs-only) because the D4–D13 range
  predated D14 and no longer read correctly against the shipped implementation —
  within Phase 11's deliverable, not an unasked status flip.
- The thread-wire built-story leg was added as a NEW transcript rather than
  editing the passing `wire.transcript` (working transcripts stay untouched).
- Turbo's 65/65 counted 39 cache replays, so the nine load-bearing suites were
  re-run cache-free for the audit's evidence bar.
- **Two scope judgment calls in Phase 4, both flagged to David rather than made
  silently**: (1) David asked to "fix the fixtures", but the themes failure was
  an IDE product bug, and once the writer fix exposed the same defect in three
  more modules, fixing only the blocking two would have knowingly left six
  broken sites — so all 8 were fixed. (2) `testAnalyzerErrorArrivesWithFullSpan`
  span.line 14 → 15 is a consequence of my own fixture edit, called out
  explicitly so it does not read as a quiet retune of a failing assertion.
- The systemic header fix used a shared predicate (`isListItem`) rather than
  extracting the whole header walk. Extraction is the durable fix and is
  recorded as a follow-up; it refactors working product code, wider than the
  failure being cleared.

## Open Items
- Known limits riding as filed issues, not acceptance gaps: #273 (initiative-row
  `then asks` on the seize path), #274 (ending double-render), #275
  (subject-change initiative occasions; condition form works).
- Design observations from session b71e04 still awaiting David's review:
  blocking-thread refusal + same-turn tick advance (refuse-then-press-on
  bunching); day-one defection activation bypassing the too-raw window on
  resume.
- Pre-session audit 2nd-time flags, held for David: 23 stranded
  `.devarch-events-*.jsonl` logs + 5 stale `.session-state-*.json` in
  docs/context/ (SessionEnd archival path broken); two stale plans needing
  disposition (adr-280-chord-writer-project-model Phase 3, live-derived-state
  Phase 1).
- **Superseded**: the earlier note to leave
  `tools/ide/SharpeeIDE/Resources/docs-tab/docs-index.json` uncommitted no
  longer applies — the housekeeping step regenerated it at Chord 3.3.0, so it
  is part of this commit and absorbs the parallel session's 3.2.0 stamp.
- Deferred by choice: extracting the IDE story-header walk into one shared
  list-aware iterator (see Key Decisions).

## Files Modified

ADR-320 Phase 11 (acceptance closure):
- docs/work/archive/adr-320-conversation/ (whole dir archived from
  docs/work/; plan.md → Phase 10/11 DONE, Plan Status DONE)
- docs/work/archive/adr-320-conversation/acceptance-audit.md (new)
- stories/ides-of-march/tests/transcripts/thread-wire.transcript (new)
- docs/architecture/adrs/adr-142-conversation-system.md (supersession range
  D4–D13 → D4–D14)
- packages/stdlib/src/actions/helpers/dialogue-selector.ts (header-comment path
  repoint only)
- docs/context/.current-plan (released by plan-archive.sh)

Housekeeping — version alignment + Sharpee 5.1.0:
- website/src/lib/nav.ts (Chord 3.0.0 → 3.3.0, Sharpee 5.0.1 → 5.1.0)
- 34 workspace package.json files + stories/dungeo/package.json,
  stories/dungeo/src/version.ts (tsf version 5.1.0 lockstep)
- packages/stdlib/src/actions/standard/version/engine-version.ts (→ 5.1.0)
- tools/ide/SharpeeIDE/Resources/docs-tab/docs-index.json,
  pages/chord__stdlib__reference.html (regenerated at Chord 3.3.0)

IDE Chord 3.3.0 alignment (Phases 1–4):
- packages/chord/tests/fixtures/lexer-golden/conversation-surface.story (new)
- packages/chord/tests/fixtures/lexer-golden/lexer-golden.json (regenerated;
  additive only)
- packages/chord/tests/lexer-golden.test.ts (25 drift-guard constructs; header
  comment refreshed)
- tools/ide/SharpeeIDE/Compose/ChordVersionCheck.swift (pin → 3.3.0 + history)
- tools/ide/SharpeeIDE/Editor/SyntaxHighlighter.swift (7 keywords)
- tools/ide/SharpeeIDE/Workspace/StoryHeaderLines.swift (isListItem helper)
- tools/ide/SharpeeIDE/Workspace/StoryHeaderThemes.swift,
  StoryHeaderIFID.swift, StoryHeaderPublishSource.swift,
  StoryHeaderAutoAssertion.swift (8 scans made list-aware)
- tools/ide/SharpeeIDETests/: StoryHeaderThemesTests.swift (+2 regression
  tests), TestToolchain.swift, TestRunnerTests.swift,
  TestingSurfaceRealPathTests.swift, StoryScaffoldTests.swift,
  ComposeRunnerTests.swift (fixtures + one stated expectation move)
- tools/ide/SharpeeIDE/Resources/testing-surface/surface.js (Xcode pre-build
  regeneration, not a hand edit)
- docs/work/archive/ide-chord-330-alignment/ (plan, archived; all 4 phases DONE)

## GH #264 — web player banner/room seam (checked, fixed)
David asked me to check it; it is still live and is NOT fixed by the header
reflow above — different layer entirely (CSS in the web player, not the
compiler). Verified the issue's own diagnosis before touching anything:
`createBannerChannelRenderer` emits `<p class="sharpee-banner-*">` into the
main slot and the room description lands as a plain `<p>` in that same slot,
so they are adjacent siblings and the prescribed sibling selector matches;
`:last-of-type` genuinely cannot work, since which piece ends the banner
varies with what the story declares (tail / credit / subtitle).
- Applied David's prescribed rule verbatim to
  `packages/platform-browser/styles/base.css`, commented with why it keys on
  the following paragraph rather than the last banner piece.
- Added the spacing assertion the issue flagged as "a separate addition if
  wanted" — the existing test pins class-name drift and would have watched
  this rule be deleted. platform-browser 143 passing (+1).
- **Proved the new test can fail**: its regex finds no match in
  `git show HEAD`'s copy of base.css and matches the fixed copy, so it is a
  real assertion rather than one that cannot fail.
- CSS-only, so per the issue's own note it rides the next platform build
  rather than triggering an installer rebuild.

## Full card sets + old-school walkthroughs for both sample zips
David: "let's finish the full card sets and oldschool walkthroughs for the
Fernhill and Ides zip files."
- **Generator promoted out of scratch** to `scripts/make-story-artifacts.mjs`
  (recipe-driven, matching `playground-examples-check.mjs`'s precedent).
  Everything is captured from a real `--exec` run of the shipped bundle, so an
  assertion that is not in the real transcript cannot appear; regenerating is
  the fix for drift. Regeneration is **byte-identical run to run** (verified).
- **Fernhill's winning path did not exist anywhere** — no walkthrough, no
  solution doc. Derived it by playing: ask Tobias about the folly (shakes him,
  which is what unwarps the folly door) → boiler FILL/PRIME/LIGHT → sherry to
  Mrs Kettle → shears → prune the vine for the locket → cut the fuse with the
  shears → open the deed box with the locket → carry the deed to the gates.
  26 moves to the winning ending.
- **Card sets** (were: Fernhill 9 cards/18 assertions, Ides a 2-card stub):
  Fernhill **35 cards / 38 assertions / 73 commands** across 4 lines; Ides
  **38 cards / 45 assertions / 75 commands**. Both include real `branches`
  (Fernhill: the boiler's own instructions, the closed pantry, and taking the
  deed WITHOUT cutting the fuse — the cache goes up; Ides: an off-errand
  topic, naming Henslowe to Burbage, refusing the offer so the thread cools).
- **Walkthroughs**: `branch-stories/fernhill/WALKTHROUGH.txt` (237 lines) and
  `stories/ides-of-march/WALKTHROUGH.txt` (208), each the complete prose to
  the winning ending. Both endings print once — the #274 fix holding.
- **Three generator bugs found by running the output back through the real
  runner**, each of which would have shipped silently: the boot card asserted
  the first command's room rather than the starting room; ambient `on every
  turn` lines were being asserted, which shift with turn position; and the
  first fix over-corrected, stripping room headings (they recur legitimately
  when you revisit). Final rule: a line is ambient if it recurs AND never
  leads a turn's output, judged across every run rather than per-run.
- **A live bug in the SHIPPED download, caught by round-trip testing the zip
  itself**: the published `the-folly-at-fernhill.zip` carried a stale
  `fernhill.story` with the old inline `authors:` form, so **the sample story
  on the download page did not compile with a current Chord Writer**. Third
  instance tonight of the same `authors:` drift. Rebuilt from current repo
  sources; both zips now verified from a clean extract.
- **Ides zip is new** (20 KB) with its own README pitched as the conversation
  sample, plus a download-page section beside Fernhill's linking to the new
  Characters & Conversation docs.

## Ides moved to the tree harness (David's ruling)
**Correction I got wrong first**: asked why Fernhill sits in `branch-stories/`
and Ides in `stories/`, I explained ADR-302 D16 (the directory IS the harness
assignment) but then recommended KEEPING Ides' 212 v1 transcripts and treating
its tree document as a mere sample artifact. David: "we're never building v1
tests for Chord again" — v1 is the legacy/TS world; Chord stories are v2. Ides
and Fernhill are the only Chord stories that matter; cloak stays as it is.
- `stories/ides-of-march` → `branch-stories/ides-of-march`, flattened out of
  `chord/` to mirror Fernhill exactly (story, config, tests.json, recipe,
  WALKTHROUGH at the root).
- **The invariant asserted itself mid-move, which settled the question**: the
  bundle routes harness BY DIRECTORY (`scripts/bundle-entry.js` — anything
  under `branch-stories/` goes to the branch tester, and mixed paths are a hard
  error). The branch tester has no transcript parser at all — ADR-307 deleted
  it — so the 19 `.transcript` files were unrunnable the moment they moved
  (`branchTester.parseTranscriptFile is not a function`). There was never a
  version where they could follow.
- **19 `.transcript` files deleted** on David's explicit authorization ("we
  never needed them") — 18 unit + wt-01. Their coverage now lives in the
  38-card tree; the gap versus the old 212 is the thread transition matrix,
  the save/restore golden pairs, and the wire assertions, which would be
  redone as tree branches if wanted.
- Live references repointed: the recipe, the lexer-golden corpus provenance
  comment, and `ChordVersionCheck.swift`'s 3.3.0 history entry. Archived plans
  and session summaries deliberately left pointing at the old path — records of
  where the file was at the time, matching what commit `18d65ab3` did.
- Ides zip rebuilt from the new home. Verified after: ides tree 38 cards/45
  assertions, fernhill tree 35/38, Dungeo chain 952, thealderman 75,
  chord 913, transcript-tester 278, branch-tester 86, story-loader 562,
  repo-wide tsc clean.
- **Open**: the ADR-320 acceptance audit cites those transcripts as its
  evidence. The audit is archived history so it has not been rewritten, but a
  line recording that the evidence was re-homed to the tree harness would keep
  it honest.

## Doubled "mentions something" line — root cause and internal fix
David saw the earshot line printed twice on the Ides blow-up turn, rejected a
render-layer coalesce as a hack, and asked for the root cause; then, when the
first fix implied a new author surface, ruled that out too: "this is something
the author shouldn't fiddle with — we need an internal answer."

**First diagnosis (right symptom, wrong layer).** `applyPace` defaulted to
`eager` ("all eligible facts at once") and Chord has no `pace` surface, so
Burbage passed Kemp both `the-blow-up` and `norwich` in one tick. The witnessed
message names speaker and listener but deliberately NOT the topic (that
withholding is the point of the neutral coloring), so two real transfers
rendered as two identical sentences. Changing the default to `gradual` removed
the duplicate — **and broke two tests plus a story beat**: with one fact per
turn, a pair who meet ONCE can never exchange the second fact, so `norwich`
never reached Kemp and his "no more a Norwich man than I am a Roman"
recognition became unreachable. **Reverted.**

**Root cause (the internal answer).** The platform was narrating an arrival the
STORY already dramatizes. Kemp's rule is `on every turn while second-day and it
knows the-blow-up, once` — it fires on the tick the fact lands and narrates
that exact moment in the author's words, so the platform's generic summary
described it a second time.
- `story-loader` derives, per entity, the topics its own **turn-triggered**
  (`binding: 'every-turn'`) clauses are gated on knowing — walking the
  condition tree through and/or/not for `knows-topic` — and puts the set on the
  character config as `arrivalNarratedTopics`. Authors declare nothing.
- `recordTransfer` (character) declines to mint the witnessed observable, on
  both the scene-wrapped and legacy paths, when the arriving topic is in that
  set. The transfer still happens; only the narration stands down.
- **The precise part**: only turn-triggered clauses count. A topic row gated
  `when it knows <topic>` is a RESPONSE gate — fires if the player asks, later
  or never — so it says nothing about who narrates the arrival. Pinned by test.
- Verified discrimination, not blanket suppression: Ides now emits **1**
  generic line across the whole walkthrough (down from 2 — the blow-up is
  authored, `norwich` is not), while thealderman still emits **4**, because
  none of its transfers are authored-narrated.
- **The payoff also proves the pace revert was right**: with `eager` restored
  AND this fix, the duplicate is gone *and* "Plain as a bell" is back.
- Tests: `packages/character/tests/tick-phases/arrival-narration.test.ts` — 4
  cases including two controls that would catch over-suppression (no rule →
  still narrated; rule on a DIFFERENT topic → still narrated) and one asserting
  the fact still lands. `applyPace`'s doc records the whole finding so the
  `gradual` detour is not re-attempted.
- Ides artifacts + zip regenerated (output changed by one line).
- **Evidence (2026-08-18)**: character 567, story-loader 562, chord 913, stdlib
  1633, engine 633, world-model 1492; ides tree 38 cards/45 assertions,
  fernhill tree 35/38, thealderman 75 (both previously-red tests green again),
  Dungeo chain 952; repo-wide tsc clean.

## Files Modified — second batch (after commit 57d60757)

Chord character + conversation docs:
- website/src/lib/nav.ts (new `Characters & Conversation` group, 15 entries)
- website/src/app/chord/guide/characters-and-conversation/ (new — 15 pages,
  each `content.mdx` + `page.tsx`)
- website/src/app/chord/guide/world/people/content.mdx,
  guide/behavior/topic-tables/content.mdx (See-also cross-links)
- docs/work/archive/chord-character-conversation-docs/ (plan, archived DONE)

Stale example status-bar lines:
- website/src/app/chord-writer/content.mdx,
  chord-writer/download/content.mdx (→ Chord Writer 1.2.0 · Sharpee 5.1.0 /
  Chord 3.3.0)

Platform prose fixes:
- packages/chord/src/parser.ts (header `description:`/`prologue:` reflow)
- packages/chord/tests/story-block-fields.test.ts (1 updated + 4 new)
- packages/story-loader/src/loader.ts (`endingMessageId`, GH #274)
- packages/story-loader/tests/loader.test.ts, tests/runtime.test.ts
- stories/ides-of-march/chord/ides-of-march.tests.json (regenerated
  `info.description` assertion)

Build artifacts (regenerated, not hand-edited):
- tools/ide/SharpeeIDE/Resources/docs-tab/ (docs-index.json + 17 page
  fragments — 15 new, plus the two cross-linked pages and chord-writer.html)
- packages/sharpee/docs/genai-api/index.md, stories/dungeo/src/version.ts

## Files Modified — third batch (after commit 2022237e)

Sample-story artifacts + generator:
- scripts/make-story-artifacts.mjs (new — recipe-driven, generates the tree
  document and the walkthrough from a real bundle run)
- branch-stories/fernhill/fernhill.recipe.json, fernhill.tests.json (9 cards →
  35), WALKTHROUGH.txt (new, 237 lines)
- branch-stories/ides-of-march/ides-of-march.recipe.json, .tests.json (2-card
  stub → 38), WALKTHROUGH.txt (new, 208 lines)
- website/public/downloads/the-folly-at-fernhill.zip (rebuilt from current
  sources — the published copy carried a stale story that no longer compiled),
  the-ides-of-march.zip (new)
- website/src/app/chord-writer/download/content.mdx (Ides section + walkthrough
  rows)

Ides moved to the tree harness (v2), transcripts retired:
- stories/ides-of-march/ → branch-stories/ides-of-march/, flattened out of
  chord/ to match Fernhill
- 19 `.transcript` files DELETED on David's authorization (18 unit + wt-01) —
  unrunnable under the branch harness, which has no transcript parser
- packages/chord/tests/fixtures/lexer-golden/conversation-surface.story,
  tools/ide/SharpeeIDE/Compose/ChordVersionCheck.swift (provenance paths
  repointed); lexer-golden.json regenerated

Propagation double-narration (root-cause fix):
- packages/character/src/tick-phases.ts (`arrivalNarratedTopics` on the config;
  suppression on both emit paths)
- packages/story-loader/src/loader.ts (`arrivalNarratedTopicsOf` derives the
  set from turn-triggered clauses in the compiled IR)
- packages/character/src/propagation/propagation-evaluator.ts (doc only —
  `eager` default RESTORED after the `gradual` detour proved to be the wrong
  layer; the finding is recorded there)
- packages/character/tests/tick-phases/arrival-narration.test.ts (new, 4 cases)

Build artifacts (regenerated): packages/sharpee/docs/genai-api/*,
stories/dungeo/src/version.ts

## Notes
- Session started: 2026-08-17 23:58 (session ade288); work ran 2026-08-18.
- Three finalizes: 57d60757 (ADR-320 closure + version bump + IDE header fix),
  4922d7e3 (author docs + prose fixes + #274), 2022237e (#264), then this
  third batch. `.active-session` was retired by the first finalize's cleanup,
  so the finalize gate's date-glob check does not resolve — the summary was
  verified by name and size (480 lines) instead.
- Two finalizes this session: commit 57d60757 (ADR-320 closure, version bump,
  IDE header fix), then this second batch. `.active-session` was retired by
  the first finalize's session-end cleanup, which is why the finalize gate's
  date-glob check does not resolve — the summary was verified by name and
  size (302 lines) instead.
