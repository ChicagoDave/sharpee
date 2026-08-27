# Session Plan: Migrate the Chord reference documentation to ADR-327 ("explicit references")

**Created**: 2026-08-27
**Plan Status**: DONE
**Overall scope**: `docs/work/adr-327-explicit-references/plan.md` Phase 5 measured this
work at "10 doc files" and split it out (rule 18b, still-live disposition, David
2026-08-27). Measured ground truth this session: sharpee.net's Chord reference
(`website/src/app/chord/**/content.mdx` and `website/src/app/learn/**/content.mdx`) is
the only real reference surface (`docs/reference/` does not exist; `docs/book/` is the
TypeScript authoring book and has zero `chord` fences) — and it is also the source the
IDE's Documentation tab ships (`tools/ide/web/docs-tab/build.mjs`). It carries **183-187
removed-spelling sites across ~82-83 files** (83 `on`/`after <gerund> it` clause heads, 51
`create the player` blocks, 27 `while`/`when it is` conditions, 22 `change it to`/`move
it`, 1 possessive `its <field> by N`) and documents **none** of what ADR-327 D1/D9/D10
landed (zero occurrences of `playable`, `before the game starts`, `change the player to`,
or an actor-explicit clause head anywhere on the site). This plan is therefore two
things, not one: a mechanical spelling sweep, and net-new authoring of four constructs —
plus a REAL-PATH verification instrument neither currently exists to check either half
with.
**Bounded contexts touched**: N/A — documentation and verification-tooling work; no new
domain modeling. The subject matter is the Chord Story Language's already-landed
vocabulary (clause heads, the player role, trait carriers) as ADR-327 defined it; this
plan describes that vocabulary correctly, it does not extend it.
**Key domain language**: actor-explicit clause head (`on <actor> <gerund>`, D1), the
player role (`the player` resolves at fire time, never a compile-time entity, D1), own-block
bare head (a block's owner needs no pronoun, D1's exception), carrier (`it`/`its` inside
`define trait`/`define condition` only, D8), `playable` + `before the game starts` + `change
the player to <character>` (D9/D10, the role-assignment vocabulary this plan must teach for
the first time).

## References consulted
- `docs/architecture/adrs/adr-327-explicit-references.md` — the language reform this plan documents; Acceptance item 4's reference half ("the book, sharpee.net's Chord reference, and `docs/reference` carry a breaking-spelling update") is this plan's mandate, and D1/D8/D9/D10's exact target spellings (own-block exception, trait/condition carrier exception, the D10 shape) are the ground truth every rewrite must match — not a paraphrase of it.
- `docs/architecture/adrs/adr-272-grammar-documentation-surfaces.md` — established the precedent this plan reuses: REAL-PATH doc-example loading via the real `@sharpee/chord` compiler (`docs-examples-load.test.ts`), the repokit-owned generated+committed+freshness-gated derivation discipline (`repokit grammar --check`), and the binding example-first/Chord-only voice rule for every page this plan touches. Its D6 enumeration (`REQUIRED_PAGES`/`KNOWN_PARTIAL_PAGES`, vocabulary-dir only) is the pattern Phase 1 below extends site-wide — it is not already site-wide, so extending it is new work, not a rerun.
- `docs/work/adr-327-explicit-references/plan.md` — the outgoing plan (stays LIVE, untouched by this plan per the user's ruling): Phase 4's measured corpus-migration mechanism (each `it`/`its` resolves statically to its enclosing block's owner; own-block heads survive; `create the player` becomes a start-block assignment) is the same mechanism this plan applies to doc prose, and its Phase 5 note is the exact scope-correction record this plan exists to close.
- `docs/context/project-profile.md` — confirms `website/` (Next.js/React) as its own framework surface and restates the platform-changes-require-discussion-first discipline (CLAUDE.md) that applies to Phase 1's `packages/` test/tooling addition, not to `website/` content edits.
- `docs/context/session-20260827-0211-feat-adr-321-world-index.md` — most recent prior session; a harness-maintenance session with no open item bearing on this plan's scope (its Phase-5 status note is superseded by session a3a4af's split, which is what produced this plan).

## Verified ground truth this session (do not re-derive)
- `docs-examples-load.test.ts` currently passes (15/15) — its own harness scaffold
  (`WORLD` constant) already uses D10 syntax (`before the game starts` / `change the
  player to Alex`), and its three `REQUIRED_PAGES` (`define-action`, `extend-action`,
  `remove-from-action`) carry zero removed spellings in their fences already. **The
  removed-spelling surface is entirely outside what this test currently checks** — it
  scans only `chord/guide/vocabulary/*`.
- `chord/stdlib/reference/content.mdx` (the 55-entry `<GrammarBlock>` page, ADR-272 D4) has
  **zero literal `chord` fences** — the fences render at runtime from the generated
  `grammar-blocks.ts` data module, sourced from `packages/parser-en-us/grammar/standard-en-us.story`,
  which defines grammar *patterns* (`define action` slot/pattern blocks), not `on`/`after`
  interceptor bodies. **This page is unaffected by ADR-327 and needs no edits** —
  confirmed by direct grep, not assumed. `repokit grammar --check`'s freshness gate is
  therefore not at risk from this plan's edits.
- Measured file-set breakdown by section (regex over fenced `chord` blocks only, prose `it`
  excluded — figures are this session's own count, close to but not identical to the
  outgoing plan's 187/83 due to regex conservatism on multi-word gerunds; treat both as
  "~185 sites, ~82 files," not a number to reconcile further):
  - `chord/guide/**`: 66 sites / 28 files — mostly `it`/`its` + gerund-heads (2 `create the player`). Includes `guide/behavior/on-and-after/content.mdx`, the flagship hive-box example ADR-327 D1/D2 itself is written against.
  - `chord/stdlib/**` (excluding `stdlib/reference`): 65 sites / 29 files — mixed (31 `create the player`, 27 gerund-heads).
  - `chord/cookbook/**`: 26 sites / 16 files — mostly `create the player` (17).
  - `learn/fernhill/**`: 23 sites / 7 files — narrative tutorial chapters.
  - `chord/reference/grammar/content.mdx`: 2 sites / 1 file.
  - `chord/getting-started/first-story/content.mdx`: 1 site.
- `guide/tooling/migrating-from-removed-constructs/content.mdx` currently shows `on opening
  it` as a *removed-construct example* (line 31) — its own subject matter, not an oversight;
  Phase 4 below decides whether it needs a new ADR-327 section rather than a straight fix.
- The IDE's Documentation tab (`tools/ide/web/docs-tab/build.mjs`) reads the same
  `content.mdx` tree plus `website/src/lib/nav.ts` and stamps `CHORD_LANGUAGE_VERSION`
  (`packages/chord/src/version.ts`, already `4.0.0`) into the bundle — doc edits here ship
  in Chord Writer, not only on the website. Confirmed: no reference to `playable`/`before
  the game starts`/`change the player to` anywhere in `nav.ts` either — a new-construct page
  needs a nav entry, not just prose.

## plan-review findings folded (2026-08-27, session a3a4af)

`/devarch:plan-review` ran after the planner (the planner could not reach the skill from
inside a subagent). Two blocking findings, both applied here:

- **[CONTRADICTION] Section landing page fell outside every phase's glob.** The phases
  enumerated `chord/guide/**`, `chord/reference/grammar`, `chord/stdlib/**`,
  `chord/cookbook/**`, `getting-started/first-story`, and `learn/fernhill/**`, which left
  `website/src/app/chord/content.mdx` unassigned — the first Chord page a reader lands on,
  carrying `after entering it while in-darkness`. Verified by globbing the measured
  file-set against the phase globs: it is the only such file, 1 site. Added to Phase 2.
  Phase 1's harness would have caught it at Phase 5, but only after three phases had
  claimed their sections clean.
- **[STALE ADR] ADR-327 named two reference surfaces that carry nothing.** Its
  Consequences and Acceptance item 4 listed "the book, sharpee.net's Chord reference, and
  `docs/reference`"; the book has zero `chord` fences and `docs/reference` does not exist.
  Fixed on the ADR side, not the plan side — both sections amended in the same session.

One advisory finding, left open as a Phase 1 design question rather than a fix:

- **[TENSION] A second verification instrument over the same corpus.** ADR-272 D6 already
  established `docs-examples-load.test.ts` as the doc-example enforcement instrument and
  names its own future work as "widening the bar to the remaining pages," with
  `KNOWN_PARTIAL_PAGES` as the mechanism for deliberate partial snippets. Phase 1 instead
  builds a parallel checker that solves the fragment problem by filtering to five
  diagnostic codes. Both are defensible, but two instruments over one corpus is the drift
  class ADR-272 D5 exists to close. **Phase 1 must decide** whether this widens D6's test
  or genuinely stands beside it — and if it stands beside it, record why.

## Phases

### Phase 1: Build the REAL-PATH verification harness
- **Tier**: Medium
- **Budget**: 250
- **Domain focus**: A doc-fragment compile-check driven by the real `@sharpee/chord`
  compiler (`compile()`), not a regex checker. Present the design to David before writing
  it — it is new code under a package (`packages/chord` or `packages/story-loader`, whichever
  the design lands in), and CLAUDE.md's platform-changes-require-discussion-first rule
  applies to that surface even though the change is test/tooling, not production behavior.
- **Entry state**: ADR-327 and ADR-272 read (references above). The five target diagnostic
  codes named by the user are the acceptance bar: `analysis.it-removed`,
  `parse.removed-head-it`, `parse.removed-create-player`, `analysis.head-bare-outside-actor`,
  `analysis.head-actor*`.
- **Deliverable**: A script or test that (a) enumerates every `content.mdx` under
  `website/src/app/chord/**` and `website/src/app/learn/**`, (b) extracts every ` ```chord `
  fence, (c) wraps each fragment in the minimal scaffolding it needs to reach the
  parse/analyze stage (a story header is likely sufficient — these diagnostics fire at
  parse/analyze, not at full-world-load, so this does **not** need
  `docs-examples-load.test.ts`'s full `initializeWorld`/`createPlayer` pipeline; confirm this
  by inspecting where each of the five codes is emitted in `packages/chord/src/{parser,analyzer}.ts`
  before committing to the wrapper shape), (d) runs `compile()` and filters the diagnostics
  list to only the five named codes — every other diagnostic (missing room, undefined
  reference, incomplete fragment) is expected noise from a partial snippet and must not fail
  the check. Runs once against the **unmigrated** corpus first, to establish a baseline red
  count and cross-check it against this plan's ~185/82 measurement (a real discrepancy here
  is worth surfacing before Phase 2 starts, not after). Explicitly decide and record whether
  this becomes a standing repo check (a candidate home: `repokit grammar --check`'s sibling,
  or a new script under `tools/repokit`) — per the user's memory, this must be a **local**
  gate David runs by hand, never a CI gate ("No CI gates for Sharpee").
- **Exit state**: The harness runs cleanly against the current (unmigrated) corpus and
  reports a red count in the ballpark of ~185 sites / ~82 files, broken down by diagnostic
  code and file. The standing-check decision is recorded (built now vs. deferred, and where
  it will live if built later).
- **Status**: DONE (2026-08-27, session a3a4af).
  **Instrument**: `packages/story-loader/tests/docs-adr-327-spelling.test.ts` — 159 pages across
  `website/src/app/{chord,learn}/**`, one test per page. Location and standing-check questions
  put to David and answered: story-loader test (ADR-272 D7 already names it the home for
  doc-example testing), and **standing, local only** — never a CI gate.
  **Design settled on evidence, not preference.** Probed the compiler directly: all six ADR-327
  codes fire at `compile()` on a bare fence with only a story header — no world, no player, no
  grammar seeding. So the wrapper is a header and nothing else, and the fragment noise
  (`analysis.unknown-entity`, `analysis.missing-phrase`, `analysis.start-block-missing`) is
  cleanly separable by code. The Phase-1 TENSION is therefore **resolved as "stands beside,"
  with a reason**: `docs-examples-load.test.ts` requires a fence to fully LOAD, so an
  unloadable fence must be excluded wholesale via `KNOWN_PARTIAL_PAGES` — which today excludes
  ten pages **including `define-trait` and `define-condition`, exactly D8's carrier-exception
  pages**. Widening that test would leave D8 permanently unchecked. The spelling gate's lower
  bar covers strictly more corpus (159 pages vs. the vocabulary directory). Recorded as a dated
  note under ADR-272 D6 so it is not re-litigated.
  **D8 verified, and verified properly.** The first probe had a syntax error and would have
  given a false pass; re-run against real corpus syntax (`mercenaries.chord:250-260`) the trait
  block **parses cleanly** and emits **zero** target codes despite three `it` sites. No false
  positives on carriers.
  **Baseline: 161 diagnostics across 78 files** (197 fences scanned, 159 files) — 84
  `parse.removed-head-it`, 51 `parse.removed-create-player`, 26 `analysis.it-removed`.
  `analysis.head-actor*` and `head-bare-outside-actor` score **zero**: they are not current
  debt but regression guards against a migration edit naming the wrong actor. Against this
  plan's ~185-187 textual estimate the gap is the compiler emitting one diagnostic per
  *statement* where a regex counts each `it` token — the compiler is authoritative on what must
  change; the regex was sizing only. **No discrepancy left to reconcile** (the exit state's
  cross-check, discharged).
  **Blind spot found, measured, and pinned.** A fence that dies at parse never reaches the
  analyzer, so its `it` sites are invisible; they are pinned in `PARSE_BLOCKED_FENCES` so a
  fence that JOINS the list — i.e. silently stops being checked — fails the suite.
  **CORRECTED during Phase 2 (same session).** This phase originally recorded the blind spot as
  "2 sites in 1 fence — small and named, not systemic." That was wrong, and the error was in
  this phase's own classification rule, not the measurement: `parseBlocked` required
  `codes.length === 0`, so a fence carrying BOTH a parse error and an ADR-327 hit was never
  flagged, and the sites hidden behind its parse error stayed invisible. The rule now flags any
  fence with a truncating parse error regardless of hits, and it under-reported by 20 fences.
  Re-measured true blind spot at Phase 1's exit state: **27 sites across 16 fences.** Two
  further harness bugs were fixed with it — the wrapper prepended a story header
  unconditionally, so a fence carrying its own header died on `parse.duplicate-story-header`
  with everything behind it hidden (now conditional). Both fixes are commented in the test with
  the reason, so the weaker rules are not reintroduced.
  **Shape: a ratchet, so the suite stays green while the migration runs.** `UNMIGRATED` maps
  file → exact diagnostic count and only ever shrinks; each phase deletes the rows it migrates.
  The assertion is on the exact count, not an upper bound, so a regression in an
  already-clean file fails immediately instead of hiding inside a falling total. An empty map
  means the migration is complete and the suite becomes a pure drift gate.
  **Gates**: `pnpm --filter '@sharpee/story-loader' test docs-adr-327-spelling` → 161 passing.
  Full story-loader suite **798 passing** (637 prior + 161 new), no regression. Negative test
  run: injecting `on taking it` into a clean page fails that page's assertion
  (`expected 1 to be +0`) and only that page; file restored, `git diff website/` empty.

### Phase 2: Guide section — spelling sweep and D1/D9/D10 authoring
- **Tier**: Large
- **Budget**: 400
- **Domain focus**: `chord/guide/**` (28 files), `chord/reference/grammar/content.mdx` (1
  file), and **`chord/content.mdx`** (the Chord section landing page, 1 site — `after
  entering it while in-darkness` at line 16) — the core author-facing prose that teaches
  the language, plus the two constructs with no natural home yet. This phase carries the highest judgment: it is not a pure
  find-and-replace, because `guide/behavior/on-and-after/content.mdx` is the flagship D1/D2
  example (the hive-box block) and several guide pages need genuinely new paragraphs, not
  just rewritten fences.
- **Entry state**: Phase 1's harness exists and its baseline red count is known. For each
  file: apply the mechanical mapping (`on/after <gerund> it` -> `on/after the player
  <gerund>` unless the block is the actor's own, in which case the bare head stays per D1's
  own-block exception; body/condition `it`/`its` -> the enclosing `create <name>` block's
  owner name, **except** inside `define trait`/`define condition` bodies where `it`/`its`
  stay as the carrier per D8; `create the player` -> the D10 shape, named character +
  `playable` + `starts in ...` + a `before the game starts` / `change the player to <name>` /
  `end before` block, using **Alex** as the demo name per the user's 2026-08-27 ruling).
- **Deliverable**: All 66 spelling sites in `chord/guide/**`, both sites in
  `chord/reference/grammar/content.mdx`, and the single site in `chord/content.mdx`
  rewritten to the ADR-327 spelling, verified per-file
  against Phase 1's harness as edited (not deferred to Phase 5). Net-new authoring, in
  whichever existing or new page reads best (decide and record the choice, add a `nav.ts`
  entry if a new page is created): (1) actor-explicit clause heads — most naturally an
  expansion of `guide/behavior/on-and-after`, alongside its own-block-bare-head exception and
  the role-vs-entity distinction under PC rotation; (2) `playable`; (3) `before the game
  starts` and its "role must be filled" error; (4) `change the player to <character>` as a
  mid-play statement (D9), not only a start-block one. Each new section is example-first,
  Chord-only voice (ADR-272 D7) — no prose essay, a complete loadable fragment plus a
  sentence or two.
- **Exit state**: Phase 1's harness reports zero of the five diagnostic codes across
  `chord/guide/**`, `chord/reference/grammar/content.mdx`, and `chord/content.mdx`. `pnpm --filter '@sharpee/story-loader'
  test docs-examples-load` (or wherever Phase 1 landed) stays green — this phase must not
  regress the existing vocabulary-page load test.
- **Status**: DONE (2026-08-27, session a3a4af).
  **Sweep**: `chord/guide/**` (28 files), `chord/reference/grammar/content.mdx`, and
  `chord/content.mdx` migrated. Corpus went **161 diagnostics / 78 files → 114 / 54**; the guide
  section reports zero, the sole remaining `chord/guide/**` entry being
  `guide/tooling/migrating-from-removed-constructs`, which Phase 4 owns by name. The blind spot
  fell **27 sites / 16 fences → 14 / 10**, with none of the remainder in this phase's scope.
  **Mechanism changed mid-phase, deliberately.** The first pass was a regex rewriter tracking
  the enclosing `create` block; it got 40 of 47 sites and got two things wrong in opposite
  directions, so it was discarded for a **compiler-driven** rewriter keyed off each
  diagnostic's own span and fix-it text — the mechanism the ADR-327 corpus migration used. The
  compiler names the owner (`name the owner: \`the fountain\``) and gives exact columns, so
  edits are surgical and iterative (a fixed head reveals body diagnostics behind it).
  **The distinction the regex got wrong, recorded because it is easy to get wrong again:
  ADR-327 D8 exempts trait BODIES, not trait HEADS.** Inside `define trait feedable`,
  `on feeding it` still becomes `on the player feeding`, while `its food`, `it must be hungry`,
  and `change it to content` correctly stay as carrier references (D1: a trait's carrier is the
  clause's object, never its actor).
  **Authoring judgment calls** (none of these were mechanical):
  - Six guide fences were bare clause fragments with no `create` block, so the owner existed
    only in surrounding prose. Named from each fence's own phrase keys: `the cat`, `the barrow`,
    `the pumpkin`, `the rope bridge`, `the brass plate`, `the secateurs`.
  - `guide/behavior/requirements` taught `it`/`its` as legal `must` subjects, which ADR-327
    makes true only inside a trait. Rather than strip the teaching, its fixture became a
    `define trait stockable` block — `it must be a tool` stays legal, the prose stays true, and
    the fence went from unparseable to fully compiler-checked.
  - `chord/content.mdx`, the section landing page (added to this phase by the plan-review
    CONTRADICTION), had its example in an **unlabelled** fence — which is why the gate never saw
    what the textual scan caught. Labelled `chord` as well as migrated, so it is now covered.
  - `chord/reference/grammar` teaches the head shape abstractly in three places (a table row, a
    fence, and prose). All three now read `on <actor> <verb>`, plus a line on the own-block
    bare head.
  **Net-new authoring** (the four previously-undocumented constructs):
  - `guide/behavior/on-and-after` expanded with three sections — *The head names who acts*,
    *`the player` is a role, not a character*, *A character's own block needs no name* — the
    D1 material, on the flagship page ADR-327 D1/D2 is itself written against.
  - **New page** `guide/world/the-player-role` (`content.mdx` + `page.tsx`, `nav.ts` row after
    *People*): `playable`, `before the game starts`, and `change the player to <character>` as
    a mid-play statement, with the role-vs-character distinction cross-linked to on-and-after.
    Placed in the guide rather than beside its examples because Phase 3 owns 51 of the 51
    `create the player` rewrites and needs the teaching to already exist to point at.
    **All eight diagnostic codes the page cites were verified against `packages/chord/src`
    (analyzer.ts, parser.ts, ir.ts) with their exact prefixes — not taken from the changelog.**
  **Gates**: spelling gate 161 → **162 passing** (the new page adds one); full story-loader
  suite **799 passing** (was 798); `docs-examples-load` **15/15**, the pre-existing ADR-272 D6
  instrument unregressed; repo `tsc --noEmit` clean.

### Phase 3: Stdlib and cookbook sections — spelling sweep (mechanical)
- **Tier**: Large
- **Budget**: 400
- **Domain focus**: `chord/stdlib/**` excluding `stdlib/reference` (29 files, 65 sites),
  `chord/cookbook/**` (16 files, 26 sites), `chord/getting-started/first-story/content.mdx`
  (1 site) — action-reference worked examples and task-pattern recipes. Mostly mechanical:
  the same mapping as Phase 2, applied to shorter, more self-contained fragments (most of
  these pages carry exactly one worked example per page, unlike the guide section's denser
  prose).
- **Entry state**: Phase 2 shipped (the mapping and harness are proven against the harder
  guide-section cases first; this phase applies the same mapping at volume). Confirm
  `stdlib/reference/content.mdx` needs no edits (already verified this session — zero
  literal fences) before starting, so it is not mistakenly swept.
- **Deliverable**: All 92 spelling sites across these 46 files migrated to the ADR-327
  spelling (`create the player` -> D10 shape with `Alex`; gerund heads -> actor-explicit;
  `it`/`its` -> owner name, D8 exceptions preserved).
- **Exit state**: Phase 1's harness reports zero of the five diagnostic codes across
  `chord/stdlib/**` and `chord/cookbook/**`. `docs-examples-load.test.ts` stays green.
- **Status**: DONE (2026-08-27, session a3a4af).
  **Fences**: 44 compiler-driven edits plus **51 `create the player` blocks** restructured to
  the D10 shape across `chord/stdlib/**`, `chord/cookbook/**`, and
  `chord/getting-started/first-story`. Corpus **114 diagnostics / 54 files → 21 / 8**, the
  remaining 8 all Phase 4's (fernhill + the migration-guide page). Parse-blind spot
  **14 sites / 10 fences → 5 / 4**, likewise all Phase 4's.
  **Cross-check caught a disagreement, correctly.** The compiler reported this phase's scope
  clean while the textual scan still found 2 sites (`change it to wide-open`,
  `change it to lowered`). The compiler was right and the regex over-flagged: both sit inside
  `define trait` blocks and are legal D8 carriers. No edit made.
  **SECOND MEASUREMENT CORRECTION — the prose was never counted.** That disagreement exposed
  a surface neither instrument read: removed spellings quoted in **prose**, in inline code
  spans outside every fence — **100 clause-head references plus 4 others, across 46 files**.
  The docs were *teaching* `on <gerund> it` after every fence had been migrated, so the corpus
  could go compiler-clean and still be wrong for any reader who follows the prose. Swept in
  this phase by user ruling rather than deferred to a new one. Two pages are exempt because
  the removed syntax is their subject: `guide/tooling/migrating-from-removed-constructs` and
  the new `guide/world/the-player-role`. `guide/vocabulary/define-trait`'s `its <field>`
  mention is a legal D8 carrier reference and needs no exemption.
  **A SECOND BLIND-SPOT CLASS found and measured: an unresolved referent masks the check.**
  A fence referencing a person it never creates emits `analysis.unknown-entity`, and the
  `it`-removal check on that owner never fires — so the fence reads clean while carrying live
  sites. Measured: **7 sites across 5 fences.** Found by probing `define manner`: the doc fence
  compiled clean, and a first probe appeared to show `define manner` was a third carrier scope
  alongside `define trait`/`define condition`. It is **not** — that probe was malformed
  (missing `end manner`), and with a well-formed block and the person actually defined the
  compiler flags `analysis.it-removed` and names them. Five of the seven were fixed on sight
  (`topic-tables`, `initiative`, `manner` — all `define <X> for <person>` blocks whose `it`
  meant the header's person); two remain in the fernhill tutorial for Phase 4.
  **Gate extended** with a second, independent prose suite over the same corpus — a textual
  reading catches what an unresolvable compile cannot. Both blind-spot classes are documented
  in the test header with their measured counts, so neither is rediscovered from scratch.
  **Gates**: spelling gate **322 passing** (161 fence + 161 prose); full story-loader suite
  **959 passing**; `docs-examples-load` **15/15** unregressed; repo `tsc --noEmit` clean.
  Negative-tested both suites: injecting `on taking it` into a clean fence and
  `` `on entering it` `` into clean prose each fail that page alone; both files restored.

### Phase 4: Learn tutorial, migration-guide page, and nav
- **Tier**: Medium
- **Budget**: 250
- **Domain focus**: `learn/fernhill/**` (7 files, 23 sites) — a narrative, chapter-by-chapter
  tutorial building up one story, so edits must stay consistent chapter-to-chapter (a
  `create the player` block introduced in an early chapter and referenced by name in later
  ones needs the same name threaded through); `guide/tooling/migrating-from-removed-constructs/content.mdx`
  (decide: gains a new ADR-327 section documenting the removed spellings as its own subject
  matter is migration guidance, not a page to silently rewrite away its own examples);
  `website/src/lib/nav.ts` (confirm/add entries for any new pages Phase 2 created).
- **Entry state**: Phases 2-3 shipped (the mapping is proven at volume; fernhill's tutorial
  prose deserves the most careful read last, not first).
- **Deliverable**: All 23 `learn/fernhill/**` spelling sites migrated, consistently across
  chapters. `migrating-from-removed-constructs` gains its ADR-327 entries (the removed
  spellings, the fix-its, matching the page's existing per-construct format) rather than
  losing its own worked example. `nav.ts` confirmed current for every page this plan touched
  or created.
- **Exit state**: Phase 1's harness reports zero of the five diagnostic codes across
  `learn/fernhill/**`. `docs-examples-load.test.ts` stays green.
- **Status**: DONE (2026-08-27, session a3a4af).
  **Fernhill**: all 20 sites across 7 chapters migrated. Chapter-to-chapter naming was not at
  risk after all — the tutorial has no `create the player` block (only a prose mention of a
  "playable page"), so no character had to be threaded through. Verified the real story's PC is
  **Wren** (`branch-stories/fernhill/fernhill.story:711`) before touching anything, in case a
  name was needed.
  **The two masked fernhill fences, read rather than trusted** (the compiler cannot see them):
  `learn/fernhill/people` #4 is a `define topics for tobias` block whose `change it to shaken`
  means tobias — fixed to name him. `learn/fernhill/state` #2 is a `define trait prunable`
  block whose `select on its state` / `change it to fruiting` are **legal D8 carriers** — left
  alone, and confirmed by compiling it with its referents defined (`it-removed` = 0). It still
  shows in the masked-referent detector as a false positive, which is the expected behaviour of
  a textual cross-check over a scope where `it` is legal.
  **Migration guide — gained rows, kept its examples.** Three new rows: `parse.removed-head-it`,
  `analysis.it-removed`, `parse.removed-create-player`, each with its replacement. Verified all
  three carry expected-to-fail fixtures (`tests/adr-327-phase1.test.ts`,
  `tests/adr-327-phase3.test.ts`) **before** adding them, because the page's intro claims every
  row is fixture-backed — adding an unbacked row would have made that claim false.
  Two real bugs fixed on the page while there: its `if` example compounded two removals
  (`on opening it` *and* `if`), obscuring the one it teaches — the head is now migrated and the
  `if` left as the subject; and **the replacement it recommended was itself removed syntax**
  (`phrase clunk when it is locked-fast`), now `when the door is locked-fast`. Its through-line
  paragraph gained ADR-327's shape and a link to the new player-role page.
  **`nav.ts`**: confirmed current — `guide/world/the-player-role` is the only page this plan
  created, and its row is in place.
  **Corpus is CLEAN on all four instruments**: compiler gate **0 diagnostics / 0 files**;
  parse-blocked blind spot **0 sites**; masked-referent blind spot 1 site, verified a false
  positive (legal D8 carrier); prose **0 references**. `UNMIGRATED` is now empty and the suite
  is a pure drift gate.
  **Gates**: spelling gate **322 passing**; full story-loader suite **959**; chord **1064**;
  repo `tsc --noEmit` clean.

### Phase 5: Full-corpus verification, IDE docs-tab rebuild, and close-out
- **Tier**: Medium
- **Budget**: 200
- **Domain focus**: The closing regression gate for this plan, and the two build artifacts
  this doc tree feeds: the website's own build and the IDE's shipped Documentation tab.
- **Entry state**: Phases 1-4 shipped (every section migrated and individually verified).
- **Deliverable**: Phase 1's harness run once, full-corpus (`website/src/app/chord/**` +
  `website/src/app/learn/**`), reporting zero of the five diagnostic codes anywhere. `next
  build` (website) green. `node tools/ide/web/docs-tab/build.mjs` run and its output diffed
  (the bundle should now teach `playable`/`before the game starts`/`change the player to`
  and carry no removed-spelling examples). `repokit grammar --check` confirmed still green
  (per this session's finding, `stdlib/reference/content.mdx` was never touched, so this
  should be a no-op confirmation, not a live risk). If Phase 1 deferred the
  standing-check decision, make the final call here now that the full sweep is proven
  against it.
- **Exit state**: ADR-327 Acceptance item 4's reference half is fully satisfied — the book
  (already a no-op), sharpee.net's Chord reference, and the IDE's docs-tab bundle all carry
  the ADR-327 spelling and document all four previously-undocumented D1/D9/D10 constructs.
  Session-end candidate: reasonable point to write the work summary if the plan stops here.
- **Status**: DONE (2026-08-27, session a3a4af), with one deliverable reclassified — see
  `next build` below.
  **Corpus**: compiler gate **0 diagnostics / 0 files**; parse-blocked blind spot **0 sites**;
  prose **0 references**; the one masked-referent hit is a verified false positive
  (`learn/fernhill/state` #2, a legal D8 carrier).
  **`repokit grammar --check`**: green — both generated artifacts still match the Chord source,
  confirming this plan never touched the derived `grammar-blocks.ts` surface.
  **IDE docs-tab bundle**: rebuilt, 160 pages in nav order, Chord 4.0.0;
  `chord__guide__world__the-player-role.html` ships, and 49-50 pages now mention the new
  constructs. Scanned the SHIPPED HTML (not just the source) — 3 remaining `<code>` occurrences,
  all verified legal D8 carriers inside `define trait` bodies.
  **Scanning the shipped bundle was the phase's highest-value step: it found four more real
  sites the source-side checks had missed**, each a different flaw in this plan's own prose
  pattern. (a) The pattern was anchored to the START of a code span, so constructs sitting
  mid-span were invisible — `phrase detail while it is lit:`, `on every turn while it is
  ticking`, `award softened, once when it is softened`. **Six real sites survived a "clean"
  run.** (b) Separators were literal spaces, so a span wrapped across a line
  (`phrase detail while it\nis on:`) slipped through — the third variant of the same
  whitespace-assumption bug in one phase. The check now extracts each span and tests its
  CONTENTS with `\s+` separators, and both failures are commented in the test with what they
  missed. Negative-tested: a mid-span injection fails that page alone.
  **`next build` — RECLASSIFIED, not skipped.** It fails locally with `MODULE_NOT_FOUND`:
  `website/node_modules/next` is a dangling symlink into the root pnpm store
  (`next@16.2.11_...`), and that store entry no longer exists. Root `pnpm install` cannot
  repair it because **`website` is not in `pnpm-workspace.yaml`** — it reports "already up to
  date," correctly. The tree was linked by pnpm on 2026-08-12 while the committed lockfile is
  npm's `package-lock.json`; that mismatch predates this plan. **This was never the real gate**:
  the site is built on plover by `website/deploy.sh`, which runs `npm ci` in `website/` against
  that committed lockfile — a different dependency tree entirely. The plan inherited "`next
  build` green" from an assumption about how the site builds that does not hold on a dev
  machine. Not repaired here: the two fixes (`npm install` in `website/`, or adding `website`
  to the pnpm workspace) lead to different long-term setups and that is the owner's call.
  **`deploy.sh` named a surface this plan never scoped — and it was broken.** The playground's
  seeded examples are Chord **strings in a website source file**
  (`website/src/app/playground/examples.ts`), not `content.mdx`, so every instrument built here
  was blind to them. `node scripts/playground-examples-check.mjs` reported **4 of 4 examples do
  not compile** — including the starter a first-time visitor lands on at sharpee.net/playground.
  Two causes: ADR-327's `create the player` and `on <gerund> it`, and a pre-existing ADR-298
  drift (`parse.header-inline-list` — `authors:` takes an indented list). Both fixed in all four
  examples (4 headers, 1 clause head, 4 player blocks to the D10 shape with `Alex`);
  **all 4 now compile clean**. The ADR-298 half is outside this plan's mandate but was
  load-bearing: the examples could not compile without it.
  **Gates**: spelling gate **322 passing**; full story-loader suite **959**; `repokit grammar
  --check` green; playground examples **4/4 clean**; repo `tsc --noEmit` clean.
