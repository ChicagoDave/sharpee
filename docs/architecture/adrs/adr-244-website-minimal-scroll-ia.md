# ADR-244: Website docs IA — minimal-scroll pages, sticky rail, accordion navigation

## Status: ACCEPTED (2026-07-19 — all decisions ruled by David directly in session 7692ef during the stdlib Phase 13 review; no open questions.)

## Date: 2026-07-19

## Parent: ADR-232 (website rebuild); applies the WF-B shell David picked 2026-07-19. Sibling context: website-content plan Phase 7a records the executed scope.

## Context

The stdlib reference's Phase 13 example-first rework shipped the content
David wanted, but the site pages carrying it were single chapter pages —
the Manipulation page ran nine entries (~8,500 px), and the rail's
navigation groups all rendered open, so both the page and the menu
required long scrolling to use. Reviewing the live site, David ruled
(verbatim intent): "we should keep each page to minimal scroll and the
menu hierarchy should be sticky plus close all top menus except for one
the user is reading."

Two follow-up decisions were put to David at execution:

- **Granularity**: one page per numbered subsection (§N.M), with each
  chapter page becoming a short landing (chapter intro + linked entry
  list) — chosen over an on-page sticky TOC and over splitting only the
  largest chapters.
- **Scope**: the stdlib section splits now; the sticky + accordion rail
  ships site-wide now; the Author guide, Phrasebook, and Fernhill
  chapters split in a follow-up phase — chosen over whole-site-now and
  over stdlib-only-permanently.

## Decision

1. **Minimal-scroll rule.** A docs page targets one to two screens: one
   §N.M subsection per page. A chapter page is a landing — the chapter
   intro plus a linked list of its entry pages. Section numbers stay in
   page titles and rail labels so §N.M cross-references keep meaning.
2. **Sticky navigation.** The top bar and the left rail are both sticky;
   the rail scrolls independently of the content column.
3. **Accordion rail.** Exactly the nav group containing the current page
   renders open; every other group collapses to its label. Within a
   group, a nav item's children (entry pages) render only while the
   reader is on that item's branch. Hand-opened groups reset on
   navigation (accordion state is keyed to the pathname).
4. **One nav model.** The hierarchy still lives solely in
   `website/src/lib/nav.ts` (now with an optional `children` level on
   items); breadcrumbs (four-deep on entry pages) and the pager (walks
   entries in reading order, within-section only) derive from it, per
   the WF-B shell's existing single-source rule.

## Consequences

- Every future content phase authors to the minimal-scroll rule: new
  reference or guide material lands as §-sized pages under a landing,
  not as chapter-length pages. Import pipelines split at `## N.M`
  boundaries with fences moved wholesale (byte-identical to the source
  doc, preserving the fence byte-diff verification convention).
- The Author guide, Phrasebook, and Fernhill chapters are now
  out-of-compliance by explicit deferral — the split is a recorded
  follow-up (website-content plan, Phase 7a follow-up), not silently
  dropped.
- Deep-linkable, stable per-entry URLs (`/chord/stdlib/<chapter>/<slug>`)
  become the citation surface for stdlib entries; anything linking a
  chapter anchor should link the entry page instead.
- The rail scales: adding entries burdens only the branch the reader is
  in, so further splits (guide, phrasebook, Fernhill) do not re-crowd
  the menu.
- Route count grows with content (50 → 90 at adoption); the static
  build absorbs this (~180 ms page generation at 90 routes).

## Session

session 7692ef, 2026-07-19 (`docs/context/session-20260719-2147-chord-foundations.md`) —
ruled during the stdlib Phase 13 (example-first rework) site review;
executed for the stdlib section in the same session (website-content
plan Phase 7a).
