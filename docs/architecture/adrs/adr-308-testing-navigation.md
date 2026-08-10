# ADR-308: Testing Navigation — Finding Your Way in a Fully-Tested Story

**Status**: DRAFT (cursory — captures direction and candidates ahead of
go-live; open questions unresolved)
**Date**: 2026-08-10 (session ed3730)
**Builds on**: ADR-307 (the tree is the model; JSON is the source of truth),
ADR-306 (testing/play surface), the region-groups feature (2026-08-10, IDE-side
derived grouping — the first navigation aid, already shipped).
**Untouched**: the wire format (`<story-id>.tests.json`), the run protocol,
and the transcript-tester world. Navigation is a **view concern**: everything
here is derived from the tree the way labels and region groups already are,
and persists (if at all) as D7 view ephemera in the opaque sidecar — never in
the tests document.

---

## Context

The testing tab was built and signed off (ADR-307 Phases 1–5) against small
trees: fernhill-sized stories with a handful of regions and a few dozen cards.
As go-live approaches, real stories will implement **full testing** — every
room, every puzzle, branches for alternate solutions and failure paths. The
active-path card list plus collapsible region groups navigates dozens of cards
well; it will not navigate hundreds. Concretely, the pressures we can already
name:

- **Scale**: a fully-tested story's active path is long, and its branch set is
  wide. Scrolling a linear card list is the only way to move today.
- **Orientation**: branches are visible only as chips at their branch points.
  There is no overview of the tree's shape — where branches live, how deep they
  go, where the seams are.
- **Finding things**: there is no way to search for a room, a command, a claim,
  or a failure message. After a run, locating the failing cards means reading
  the run column and scrolling.
- **Post-run triage**: a run that fails in three places should offer a direct
  route to each failure, not a scavenger hunt.

The region groups feature (collapse, active-group-stays-open, last-group
immunity) is the pattern to extend: navigation aids are **derived views over
the tree**, computed IDE-side, storing at most view ephemera.

## Decision

Cursory — this ADR fixes the *direction* and the candidate set; the concrete
feature contracts are open questions below.

### D1 — Navigation is derived, never authored

Every navigation aid reads the tree (and, where relevant, the last run's fold
and the Story IR's region map) and renders a view. No navigation feature adds
a field to the tests document. View state that must survive a reopen (collapse
sets, a selected overview node) rides the D7 sidecar.

### D2 — Candidate aids (to be selected and specified via the open questions)

1. **Tree overview graph** — the tree's shape without card details: nodes are
   branch points / region runs / seams, edges are play order and branching.
   Click a node → the card list scrolls there (and expands its group). Renders
   from the same derivation that feeds region groups.
2. **Search** — one search field over the tree: room names, commands, claim
   text, failure messages from the last run. Results jump to and highlight the
   matching card.
3. **Failure navigation** — after a run, next/previous-failure movement (and
   possibly a failures-only filter of the card list), sourced from the fold's
   per-card outcomes.
4. **??? (deliberately open)** — David's framing invites aids we haven't
   named: breadcrumb/position indicator, keyboard-driven movement, a
   coverage-tinted map (which rooms have cards at all), bookmarks. Candidates
   are collected in Q-4 rather than decided here.

### D3 — The card list stays the primary surface

Navigation aids point *into* the existing card list; none of them replaces it.
The graph shows no card details by design — detail lives in one place.

## Consequences

- Future sessions treat navigation features as IDE/view work: no wire, schema,
  or branch-tester changes should appear in a navigation PR. If one seems
  necessary, that is a signal the feature is mis-scoped — stop and re-check
  against D1.
- The region-group derivation (`groupByRegion`, the Story IR region map
  injection) becomes shared infrastructure; the overview graph should consume
  it, not re-derive rooms→regions.
- Search over failure messages couples search to the last run's fold — search
  results can go stale relative to edits; the spec (Q-2) must say what stale
  means.
- Selecting and specifying the aids is post-go-live-adjacent work: this ADR
  deliberately does not gate the ADR-307 Phase 6 cutover.

## Session

2026-08-10, session ed3730 — raised by David while closing in on go-live:
"the testing tool will likely need some navigation assistance as games
implement full testing."

## Open Questions

- **Q-1 (graph)**: What are the overview graph's nodes — branch points only,
  region runs, every card, seams marked? Where does it live (sidebar pane,
  popover, replacing the run column on demand)? Does it reflect run state
  (pass/fail tint)?
- **Q-2 (search)**: What does search index — rooms, commands, claim text, run
  failures, all of them? Is it a filter (card list narrows) or a jump list
  (results panel)? What happens to run-sourced results after the tree is
  edited?
- **Q-3 (failure navigation)**: Next/prev-failure commands, a failures-only
  view, or both? Keyboard bindings? Does the run column's per-assertion detail
  become clickable (jump to card)?
- **Q-4 (the ???)**: Which unnamed aids make the cut — breadcrumbs, keyboard
  navigation, coverage tinting, bookmarks, something else David has in mind?
- **Q-5 (priority)**: Which aid ships first, and does any of this land before
  go-live or is it all post-go-live?
