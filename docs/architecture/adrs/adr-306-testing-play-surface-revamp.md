# ADR-306: The Testing Play Surface Revamp — No Golden Path, Just a Tree of Transcripts

**Status**: ACCEPTED, SUPERSEDED IN PART by
[ADR-307](adr-307-testing-tree-model-v2.md) (cutover landed 2026-08-10,
session ed3730) — superseded: the range/tick model (design §3) and
click-through rulings 8, 13, and 17 where they concern ticking (ADR-307's
always-recording tree replaces ranges, ticks, and extension rules; every
played turn is a card). The rest of the revamp stands as built.
*Original acceptance*: 2026-08-09, session 2b82b5 — all four Open Questions
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

> **Click-through round 4** (2026-08-09, session fb4281, David's issue list —
> these supersede ruling 3 and design §3 where they conflict):
> 7. **Assertions render inside each turn card** — the transcript's own tag
>    lines, under the prose, above the action buttons, behind their own rule
>    line. Each line carries a hover ✕ that deletes through the model's
>    mutators (the DeleteRef machinery the retired source column left
>    behind) — claim removal has its surface affordance again, superseding
>    ruling 3's "no affordance yet".
> 8. **A range is a file from its first tick.** "Every click has to update
>    the transcripts." Design §3's "an open range isn't a file yet" is
>    superseded: ticking the opening (or any turn) writes `tests/<stem>.transcript`
>    immediately; the open range's file GROWS as turns play (extent = its
>    lineage's latest turn, stopping short of a neighbouring segment), and
>    its auto-name grows with it (rename-with-cascade as before). Closing
>    just stops the growth; reopening resumes it — the file never leaves
>    disk for being open. Claims authored mid-extent no longer close the
>    range. Open recordings rehydrate from their files on reopen and show
>    in the run column ("recording…").
> 9. **Window and pane geometry is session state.** The main window's frame
>    and the project/play pane widths live in `SessionState` (one writer,
>    `persistSession`, guarded by the launch invariant) — AppKit frame
>    autosave and the loose width keys are retired.
> 10. **The landing page is skippable by preference.** Settings gains
>    "Reopen last story at launch": launch opens the persisted session's
>    project directly when it is still a story project on disk, falling
>    back to the landing page otherwise.
> 11. **The persisted session is the session the suite describes.** "If I
>    unclick all the commands and delete the transcript files, the testing
>    tab should start empty except for the opening." The sidecar's snapshot
>    trims each lineage's commands to what its segments (an open range to
>    its extent) and surviving branches' fork points need; segmentless
>    branches drop whole (persisted active falls back to the root). Unticked
>    play is ephemeral — untick everything and reopen is a fresh boot
>    (opening + boot look). And on reopen, a restored segment whose
>    `tests/` file left the disk dissolves instead of being re-written from
>    defaults: the files are the truth, a hand-delete never resurrects.
>    The scoping applies on READ as well as write (David's follow-up:
>    "commands are still showing") — a sidecar written before the trim, or
>    by anything else, is scoped to its own segments before replay, so a
>    stale sidecar's unticked commands never type back in.
> 12. **The surface synthesizes assertions by default.** A story with no
>    `auto-assertion:` header line gets the surface's default policy
>    (`room-name-and-description`) instead of 6e's synthesize-nothing —
>    David's "not working" on fernhill was a policy-less story faithfully
>    showing [SKIP] everywhere. An explicit header line still wins, and ⌘B
>    re-reads it into a live surface (it used to stay bind-time stale).
>    Runner semantics are untouched: files carry explicit tags either way;
>    the absent-line "let me decide" meaning now applies to the runner's
>    bare-command handling only, not to the authoring surface's synthesis.
>    The opening card lists a default too — its first prose line (the
>    banner's story title), same withholding rules as turn defaults.
> 13. **Branch stays available while recording.** Forking required a CLOSED
>    range, and ruling 8's growing-recording flow never closes one — the
>    Branch… gesture silently regressed out ("why did you remove branch?").
>    `fork` now accepts any covered point (`coveringSegment` — exact hit or
>    open-extent coverage): the auto-split closes the shared prefix and the
>    recording continues OPEN past the fork point; the branch lands as its
>    own closed single-turn segment as before.
> 14. **Branch runs FROM the card, not instead of it.** The gesture on card
>    N previously forked AT N (the alternate replaced N's own command — one
>    turn earlier than the state the author is looking at; "branch selects
>    the wrong card"). The card's fork point is now the NEXT turn on the
>    active path (`forkPointAfter`); the path's tip offers no Branch —
>    typing continues the recording there. Model `fork(n)` semantics are
>    unchanged; only the gesture mapping moved. The inline Branch prompt
>    also takes a full-width row of its own (the placeholder clipped
>    against the sibling buttons).
> 15. **Forking never auto-collapses.** The auto-split used to fold the
>    shared prefix into its summary card, so branching made the cards
>    before the fork vanish — and a selected branch showed only its own
>    turn ("I don't see its card in full"). The prefix now stays expanded;
>    Collapse is a manual gesture only. The auto-split structure itself is
>    unchanged (the prefix still becomes the parent transcript on disk).
> 16. **Opening claims are runnable, and opening transcripts are named for
>    the opening.** David's run failed `(opening): Output does not contain
>    "Story v0.3.0"` while the claims were correct — three platform gaps,
>    all fixed: (a) the runner evaluated opening assertions against the
>    EMPTY STRING — it now reads everything the player saw through the
>    first command (boot channel captures + the command's output, with
>    banner-style JSON values flattened to their rendered strings);
>    (b) `banner`/`prologue` were captured only when a transcript declared
>    them — bootstrap now always captures the opening's channels (the same
>    invisible-union pattern as the policy channels); (c) boot-time
>    captures were wiped by the first command's buffer reset — bootstrap
>    snapshots them once as `bootChannelValues`. Packages touched:
>    bootstrap + branch-tester (flagged; David's live report was the
>    direction). And a transcript that begins at the opening is named
>    `opening-<first room>` — stable as the recording grows, no rename
>    churn.
> 17. **Sequential ticks extend ONE transcript; `continues:` is for branch
>    starts only.** Ticking a card after a closed same-lineage range grows
>    that range's end (the file renames — "the transcripts are renamed when
>    sequential cards are checked") instead of starting a continuation
>    file. Fork points make the only boundaries: the auto-split prefix and
>    each sibling keep their `continues:` headers; a non-fork sequential
>    pair can no longer be created (one lineage, one transcript —
>    chaptering was already ruled out with Split/Merge ↑, ruling 4).
