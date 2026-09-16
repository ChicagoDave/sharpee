# Phase 1 — the Q-3 gate: David's felt comparison

**Recorded 2026-09-16, session e923d3, on `main`.** This file exists because Q-3 is the one
condition in ADR-351 D2 that no amount of spiking answers. It is a record of David's judgment,
not an argument for it.

## What he looked at

The **notarized, stapled spike artifact** — not a debug build, not a screenshot:
`/Users/david/repos/spikes/avalonia-ide/out/signed-verify/ChordWriterAvaloniaSpike.app`,
re-verified immediately before launch as `accepted` / `source=Notarized Developer ID` /
`origin=Developer ID Application: David Cornelson (RSNGKW5LNH)`, staple valid. Opened beside
the shipping product, **Chord Writer 1.4.0** from `/Applications/Chord Writer.app`.

Four surfaces, in this order: the chrome (tab strip, editor tab bar, project pane); typing in
the AvaloniaEdit editor, including mid-line on a long line, with Chord highlighting coming from
the real `packages/chord/src/lexer.ts` over the NDJSON bridge; the World map, which is the Swift
`draw(_:)` transliterated and fed with real world-index output; and the ADR-297 theme flip on
both apps. The editor's syntax colours not following the flip was named as a known one-edit gap
(GH #462 item 3) and excluded from the judgment rather than judged.

## The ruling

**YES — option (a), build it.** In his words:

> **"a (it's damn near perfect)"**

No reservations were named, so none are folded into the plan. This is the unqualified branch of
Phase 1's two-branch exit state, not the "yes, with reservations" branch.

## What it discharges

ADR-351 D2's ruling carried three conditions. All three are now discharged:

| Condition | Discharged | Where |
|---|---|---|
| Phase 7 on Windows | 2026-09-14, session 6c19b3 | Q-1; `phase-7-windows-check.md`, evaluation §12 |
| A solved macOS bundle layout | 2026-09-16, session e923d3 | Q-5; `velopack-macos-bundle-layout/decision.md`, evaluation §13 |
| David's felt comparison | 2026-09-16, session e923d3 | Q-3; this file |

**What it does not discharge.** ADR-351 stays **DRAFT**. Q-2, Q-4 and Q-6 are still open, and
under rule 11a a non-empty Open Questions section keeps the document DRAFT regardless of D2's
conditions. Q-4 in particular — when the Swift app retires and how ADR-341 is amended — is
Phase 12's deliverable and is not answered by a favourable felt comparison. Acceptance is
therefore reachable but not reached, and the gap is three open questions rather than any
remaining doubt about the shape.

Phase 2 is unblocked.
