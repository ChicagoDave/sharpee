# ADR-306: The Testing Play Surface Revamp — No Golden Path, Just a Tree of Transcripts

**Status**: ACCEPTED (2026-08-09, session 2b82b5) — all four Open Questions
resolved by interview the same day (D6 state picker, D7 meta commands under
branch replay, D8 complete-state restore, D9 editor auto-reload); reviewed twice
via `/devarch:adr-review` (11/18 NEEDS WORK → all four findings folded → 16/16
READY FOR IMPLEMENTATION); accepted by David on the re-reviewed result.
**Date**: 2026-08-09 (session 2b82b5)
**Spec of record**: `docs/work/testing/design-testing-play-surface.md` (design settled
with David 2026-08-09, session 1dd6d3) and its living illustration
`docs/work/testing/mock-testing-play-surface.html` (iterated live ~15 rounds, IDE
palette). This ADR does not restate the surface design; it records what the revamp
supersedes, what it keeps, the golden-tier scoping, and the boundaries future sessions
must not re-litigate.
**Depends on**: ADR-302 (the `continues:` tree — the at-rest representation), ADR-305
(6f's platform substrate — the foundation), ADR-294 (D1 scoped by D3 below), ADR-304
and ADR-301 (superseded in part / bounded below)
**Plan**: `docs/work/testing/plan-20260809-testing-surface-revamp.md` (Phases 1–7;
this ADR is Phase 1)

---

## Context

Phase 6f (ADR-305) shipped play-to-transcript promotion: margin checkboxes over
played turns in the game page, a Create Transcript button, a save panel, user naming.
David's reaction to the built result — "too mechanical" — triggered a same-session
design cycle that produced the testing play surface: a dedicated testing page where
playing *is* writing the test suite. The design is settled and mocked; this ADR is
the decision record the implementation phases build against.

The capstone ruling, David's words closing session 1dd6d3: **"there is no golden
path anymore — it's just a tree of transcripts."** That ruling reaches beyond UI: it
removes the golden tier from the author world entirely (D3).

## Decision

### D1 — Supersessions are recorded now, flipped at landing

The revamp supersedes, **when it lands** (design doc §9, carried verbatim):

- **ADR-304's testing workspace layout** (D1/D2 — Play moving to the left pane, the
  modal enter/exit). The testing surface replaces the reason it existed. (ADR-304's
  "revisiting requires superseding this ADR" clause guards the rejected
  any-tab-in-any-pane alternative, which this revamp does not revive — the
  supersession here stands on its own: the workspace's job moves to a dedicated
  page.)
- **6f's in-game-page margin chrome** (checkbox overlay in `PlayViewController`),
  the Play-header **Create Transcript button**, the **save panel** flow, and user
  naming (ADR-305 D4's margin location and D6's write flow, in part).
- **The per-turn-checkbox selection model** (ADR-305 D2 as built) — replaced by
  ranges + pruning.
- **The author-world golden tier** (D3 below): branch-tester's copied golden
  machinery and the Testing tab's "Record golden…" affordance.

**Flip timing is part of this decision.** These are *forthcoming* supersessions:
ADR-304's and ADR-305's status lines flip to SUPERSEDED (in part) at the plan's
Phase 6 retirements — "the flip owner is whoever lands the revamp" (design doc §10
item 7) — never at this ADR's writing, while the superseded UI still ships. The same
Phase 6 edit set includes ADR-294's D1 scoping note (D3 below) and a one-line
pointer to this ADR in ADR-301's "The next decision" section (whose Status never
changes — D4/D5 bound it, nothing supersedes it). A future session finding these
files unflipped before Phase 6 lands is looking at correct state, not an omission.

> **Flip landed early** (2026-08-09, session d54d7e): David's shred ruling — "you have
> my authority to shred the old UX completely for testing… nothing from the old
> testing UX survives" — pulled the IDE-side retirements forward of Phases 4/5. The
> ADR-304 workspace, 6f margin chrome, Create Transcript button, and save-panel flow
> are removed and the ADR-304/305/294/301 edits above are in place. Still pending
> under Phase 6: the run column, and the author-world golden machinery's retirement
> (tab affordance + `packages/branch-tester` — awaiting its platform discussion,
> since live `.golden` files need both sides cut together).

> **Post-go-live rulings** (2026-08-09, session fdfe6a, David on first real
> click-through — these supersede this ADR where they conflict):
> 1. **The Testing tab IS the surface.** "Remove the old UX and embed the new
>    UX in the Testing tab." D4's authoring-vs-reading split is superseded:
>    the ADR-301 tree/documents tab, its web bundle, TestController, and the
>    separate surface window are all removed; the tab hosts the play surface
>    (binds per project, loads after ⌘B). There is no separate reading surface.
> 2. **Transcripts are Chord Writer's artifacts.** Auto-named and auto-saved,
>    they live on disk but the project pane never lists them — the Testing
>    tab's serialized view is their only IDE presentation.
> 3. **The source column is retired** (unnecessary in practice); assertions
>    are authored by gesture and read in the files. Claim removal has no
>    surface affordance yet — the model mutators remain for a future gesture.
> 4. **Split and Merge ↑ are retired as gestures.** Fork's auto-split is the
>    only split (internal); deleting the last branch at a point folds the
>    prefix back — safe precisely because every boundary is fork-made.
> 5. **Branches are deletable** (chip ✕, armed then confirmed — descendants
>    and files go; deleting the viewed branch replays its parent live) and
>    **authoring gestures are undoable** (⌘Z over authoring state; played
>    turns are not undone — fork/switch/delete/fence clear the stack).
> 6. **A changed suite voids run results** — any write/remove/rename to the
>    tree on disk resets the run column to not-run.

> **Phase 6 landed** (2026-08-09, session fdfe6a, David's per-file confirmation):
> the golden pair is retired on both sides — branch-tester's `golden.ts`, golden
> tier, `--bless`/`--bless-file` (cli + devkit), watch bless flow, rename's
> golden/divergence carry; the tab's Record golden…/restore affordances, R6
> review, tier facts, and Swift bless plumbing. No author-world `.golden` files
> existed on disk, so machinery only. The wire's golden-divergence `diff?` left
> `CommandResultEvent` and an additive `failure?` (first failed assertion's
> message, populated by the runner) replaced it — the run column's one-line
> failure source. `transcript-tester`'s frozen copy verified untouched. The run
> column shipped per design §7 over the same NDJSON stream the tab decodes.

### D2 — 6f's platform substrate is kept unchanged; it is the foundation

Carried verbatim from design doc §9:

- The turn feed (`turnEvents`: ordinal, command, engine-composed output, structured
  captures; restart fences) and the `data-turn` anchor contract.
- `IDE_PLAY_SEED` determinism; capture parity with the headless runner (boot-look
  alignment included).
- The synthesis module (`@sharpee/branch-tester` `auto-assertion.ts`) and
  `createTranscriptFromPlay` / `sharpee transcript-from-play` — the one code path
  everything above serializes through (rule 8b; ADR-305 D5 as built).
- The 6e `auto-assertion:` policy as the source of default claims.
- ADR-302's tree (`continues:`, stem renames, `sharpee test --tree`) as the at-rest
  representation of everything this surface produces — now carrying the **whole**
  regression burden (D3).

No phase of the revamp may reimplement any of these; they are imported, not copied.

### D3 — ADR-294 D1 is scoped: goldens live only in the frozen transcript-tester world

The author world (branch-tester, Chord stories, the IDE) has **no golden tier**: no
`.golden` recordings, no bless step, no privileged walkthrough spine. The regression
baseline is **the tree passing** — root to every leaf, at the pinned seed. What the
golden tier provided, the tree provides in place (design doc §8): byte-level pinning
is per-turn opt-in (`all-emitted-text` policy or the Exact gesture — `[OK]` +
literal block); re-bless after intended change is re-authoring (prune, replay,
resynthesize); coverage is the tree's shape.

ADR-294 D1 ("golden transcripts are the regression baseline") **stays true where it
lives**: the frozen transcript-tester world — Dungeo's walkthrough goldens,
deliberately an outlier and deliberately untouched (ADR-302 D9/D12/D15). The edit to
ADR-294's own file recording this scoping lands with the Phase 6 retirements, per
D1's flip timing; until then this ADR is the record.

Consequence carried with it: branch-tester's copied golden machinery (`golden.ts`,
the recording format) and the Testing tab's "Record golden…" button retire at
Phase 6. `transcript-tester`'s frozen copy is untouched — the freeze (ADR-302 D15)
covers it, and Dungeo's harness keeping passing is Dungeo's only claim on the
platform.

### D4 — The post-revamp Testing tab boundary

*(ADR-301 left "the editing interaction" as its next decision; ADR-305 decided the
creation half. This decides the rest of the boundary. Defaults below are
Claude-proposed under David's fold-with-defaults pattern — flagged for veto.)*

The split is **authoring vs reading**:

- **The testing play surface authors.** Cards, segments, gesture-authored
  assertions, the source panel as the editor, branching, auto-name/auto-save, and
  the minimal run column ("do my transcripts still pass?" — Run button, PASS/FAIL
  row per transcript, first failure on one line, tally; design doc §7). ADR-301's
  "next decision" — the editing interaction — is hereby decided: editing lives
  here, and the surviving ADR-299 ideas it listed (card per turn, contains by
  selection, visible generated source) shipped in this design.
- **The Testing tab reads.** The suite-level view of the whole tree: ADR-301
  D2/D3/D4 (Miller columns, List, Documents, no self-switching) stand unchanged;
  per-node results, unreached cascades, document open with `file:line`
  click-through. The tab never edits a transcript's assertions — an author who
  wants to change a test plays it in the testing surface.
- **Rename** lives in the Testing tab, as the escape hatch from auto-naming
  (design doc §4): executed through ADR-302 D14's atomic harness rename, and a
  hand-renamed file stops auto-renaming.
- **Runner**: both surfaces trigger runs over the same harness
  (`sharpee test --tree`); the tab remains the full-suite reader with per-node
  depth, the run column stays deliberately minimal and never grows toward the
  tab's feature set ("this column is not a copy of the IDE's testing UI, by
  ruling" — design doc §7).
- **Diff and golden depth**: with no author-world goldens (D3) there is no golden
  diff surface and no bless affordance anywhere in the author world. Failure
  detail is assertion-failure lines. Re-bless (ADR-282 D2's lifecycle, dormant
  since ADR-301 A1.2) is not rebuilt — its replacement is re-authoring in the
  testing surface.

### D5 — ADR-301 D5 is scoped to the batch explorer; play-to-goal adopts nothing

ADR-301 D5 ("explorer findings are adopted as documents — Accept commits, Discard
deletes; that is the whole interaction") **continues to govern the batch explorer**
(ADR-294 D20) — machine-proposed transcript files, produced offline, reviewed as
documents. It is not superseded.

**Play to a goal (design doc §12) is not that feature and creates no second
adoption path.** It is an interactive affordance: the found path is re-proven by
one fresh-boot replay and then *played into the live surface* as ordinary feed
turns — cards the author can range into a test like any turns they typed. There is
no proposed file to accept or discard; nothing lands in `tests/` until the author
ranges it, exactly as with hand-played turns. The rule that keeps the two features
distinct: **goal search never emits proposed transcript files, and the batch
explorer never injects turns into a live play session.**

### D6 — The State picker is one searchable list with a Grouped toggle

(David's ruling, 2026-08-09, session 2b82b5, from the side-by-side mock
`docs/work/testing/mock-state-picker.html`.) The picker is a flat,
type-to-filter list of the world digest's facts, with a **Grouped** toggle that
folds the same list into kind sections (NPC locations / items / score / state
machines). Both shapes over one list — not two pickers. Grouping is
presentation only: the digest already carries each fact's kind, so the toggle
costs no wire or digest change. Grouped sections are **collapsible** (chevron on
the header; a live filter auto-expands every group — a hit never hides inside a
folded section). The toggle's default state and persistence are Phase 4
implementation detail. Scale is measured against Chord stories; Dungeo
is never the yardstick (design doc §8, ADR-302 D9).

### D7 — Meta commands under branch replay: ADR-305 D3 extends unchanged, and lineage stickiness applies to saves

(David's ruling, 2026-08-09, session 2b82b5.) Branch replay carries meta
commands exactly as the linear case does: restart is the only fence (and can
never appear in a fork prefix by construction — the fence resets the log
origin, so no transcript ever contains it), and `save`, `restore`, `undo`,
`verbose`, and the rest are ordinary commands, made self-contained by the
storage-clean fresh boot plus full-ancestry re-execution (ADR-302 D17).

The premise this rides — restart never appears in any transcript because the
fence resets the log origin before creation can see pre-restart turns — is
pinned, not assumed: the platform-browser turn-feed suite covers the restart
fence directly (10 turn-feed tests incl. fence behavior; 131 passing, run
2026-08-09, corroborated in the session event log at 04:46:14Z after the last
edit to those files — ADR-305 "As built" evidence).

The rule that makes forks safe with zero new machinery: **a restore reaches
only saves made in its own ancestry.** A save in the shared prefix is re-made
during every sibling's replay, so restores of it work in every branch. A
restore in branch B of a save made only in sibling A's turns fails
deterministically and visibly ("no such save") — an ordinary test failure the
author reads, not something the surface warns about or refuses. Rejected: a
soft warning at Branch… (Phase 5 UI for a rare, already-visible case) and hard
refusal of forks that separate a save from its restore (forbids legitimate
forks).

### D8 — The testing page's complete state is managed and restored on reopen

(David's ruling, 2026-08-09, session 2b82b5 — rejecting files-only
persistence.) The surface owns its **complete session state** and restores it
on reopen: the session's command log (with restart fences), segment structure
including an open range, fork structure and the selected lineage, and view
ephemera (collapsed summaries, fold states). An author who closes the project
mid-session reopens to the page as they left it.

Two lines hold the shape honest:

- **`tests/` remains the only durable test artifact.** The persisted session
  state is view/session truth, never test truth — it carries no assertions and
  no transcript content, so there is no second copy of anything a runner
  reads and no drift class against the tree (ADR-302 D4 is unbreached: the
  tree is still derived from files alone).
- **The played turns restore by replay, not by cached prose.** Determinism at
  `IDE_PLAY_SEED` (ADR-305 D1) makes reconstruction exact: fresh boot of what
  ⌘B built, replay the logged commands, and the cards are re-fed through the
  live turn feed — so "every load is a fresh boot" stays true, and if the
  story was rebuilt since, the cards show the *current* story's real output,
  never a stale snapshot. The determinism premise is pinned, not assumed: the
  capture-parity suite byte-compares play records against the headless runner
  with boot-turn alignment (green in the platform-browser 131-test run,
  2026-08-09, event log 04:46:14Z — ADR-305 "As built" evidence).
- **A sidecar never blocks reopen.** An unreadable, corrupt, or
  version-mismatched session sidecar (e.g. after an IDE update) is discarded
  and the page rebuilds from `tests/` alone — files-only is the *degraded
  mode*, never an error. The durable product is always intact under this
  rule, because the sidecar carries no test truth.

Storage location and format (per-story, IDE-side) are Phase 3/5 implementation
detail; what is decided is that complete restore is a requirement, not an
enhancement.

### D9 — Editor documents auto-reload when clean, conflict-guard when dirty

(David's ruling, 2026-08-09, session 2b82b5.) One rule for every tool-written
file — the auto-save writer, restructure renames, and 6e policy-writing runs
alike (this closes the "editor pane doesn't auto-refresh during policy-writing
runs" loose thread from session 20260808-2200): the editor watches its open
documents; an external change to a buffer with **no unsaved user edits reloads
it silently** (cursor and scroll preserved where the content allows). A
**dirty** buffer whose file changes underneath is never resolved silently in
either direction — the document is badged and the author chooses. This removes
the one data-loss path the auto-save design otherwise had (saving a stale
buffer over what the testing surface just wrote). Rejected: badge-only (the
badge is effectively always on under continuous auto-save) and read-only
`tests/` files during a live session (blocks legitimate hand edits).

## Consequences

- Phases 2–7 of the revamp plan build against this record; the design doc stays the
  surface spec and the mock the acceptance reference.
- ADR-304 D3/D4 (web-view reparenting, editor-state restore) become moot when the
  workspace retires — they are invariants of a layout that will no longer exist;
  nothing else depends on them.
- ADR-305 loses its D4-margin/D6-save-panel UI but keeps every platform decision
  (D1 seed, D2 selection-as-assertion semantics — now expressed by ranges +
  pruning, D3 restart fence, the anchor contract, D5 synthesis). The `[SKIP]`
  demote-on-prune rule is 6e's grammar doing the same job under a new gesture.
- The Testing tab's surface area shrinks by ruling ("Record golden…" goes) and its
  role sharpens to reading + rename + adoption. Anything deeper proposed for the
  run column should be rejected by citing D4.
- The author-world golden retirement means ADR-294's D13–D16 coverage/watch
  intelligence, where it lands for the author world, computes over assertion
  transcripts and the tree — not over recordings. (Dungeo's golden world keeps its
  own machinery, frozen.)
- Chord Writer sizing questions (state picker and anything author-facing) are
  measured against Chord stories; Dungeo is never the yardstick (design doc §8,
  ADR-302 D9).

## Acceptance

Phase-level test lists live in the plan; these are the ADR-level criteria the
revamp as a whole must meet:

- **AC-1 (D8, E2E)** — play a session, range a segment, fork a branch, collapse
  a summary, close the project, reopen: the page restores completely — cards
  re-fed by replay at `IDE_PLAY_SEED`, segments/forks/selected lineage/fold
  states as left. SELF-VERIFYING.
- **AC-2 (D8, degraded mode)** — with the session sidecar deliberately
  corrupted, reopen succeeds: the tree renders from `tests/` alone, no error
  dialog, and the sidecar is replaced on the next session write. SELF-VERIFYING.
- **AC-3 (D9, both sides)** — a clean editor buffer reloads silently when the
  auto-save writer rewrites its file; a dirty buffer is badged and neither side
  is clobbered until the author chooses. Asserted on buffer and file content,
  not on the badge alone. SELF-VERIFYING.
- **AC-4 (D7, rejection)** — a transcript whose `restore` names a save made
  only in a sibling lineage fails its run deterministically with the engine's
  own "no such save" outcome, reported as an ordinary assertion failure — the
  surface neither warns at Branch… nor refuses the fork. SELF-VERIFYING.
- **AC-5 (D6)** — at a synthetic large-story digest, the picker filters, groups,
  folds, and auto-expands folded groups on filter input; every written line is
  a picker-sourced `[STATE:]` claim (free text is unreachable by construction).
  SELF-VERIFYING.
- **AC-6 (D1/D3, retirement safety)** — after Phase 6's retirements land,
  `transcript-tester`'s own suite and the Dungeo golden world are byte-for-byte
  unaffected (its suite green, no file under `packages/transcript-tester`
  touched by the retirement commits). SELF-VERIFYING.

## Session

Written 2026-08-09, session 2b82b5, as Phase 1 of
`docs/work/testing/plan-20260809-testing-surface-revamp.md`, from the settled design
of session 1dd6d3. D4's boundary defaults and D5's scoping rule are Claude-proposed
and David-vetoable; D1–D3 record rulings David already made in the design session
(the §9 lists and the §8 capstone verbatim). Plan-review (2026-08-09, this session)
contributed three advisories, all folded: D1's flip timing, the editor-refresh
question (now D9), and D5. All four Open Questions were resolved by interview the
same day (session 2b82b5): D6 (state picker — one list, Grouped toggle, collapsible
sections, ruled from `mock-state-picker.html`), D7 (meta commands under branch
replay — D3 extends unchanged, lineage-sticky saves), D8 (complete testing-page
state restored on reopen — David rejecting files-only persistence), D9 (auto-reload
clean buffers, conflict-guard dirty ones).
