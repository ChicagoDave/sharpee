# 004 — Screen reader client

**Status**: ACCEPTED — design settled; see *Built?*
**Built?**: none — `packages/` contains no screen-reader or accessibility package, and a repo-wide search for `aria-live` / `screenReader` turns up one incidental hit in `packages/platform-browser/src/channels/layout.ts`
**Created**: 2026-01-13 (identified) · 2026-02-18 (accepted with an implementation plan)
**Target date**: TBD
**Target Sharpee version**: TBD
**Target Chord version**: n/a — a client concern, not a language one
**Traces to**: ADR-100 · related clients: ADR-098 (terminal), ADR-099 (Glk), ADR-170 (browser client vocabulary)

---

## What it is

Making Sharpee stories work well for blind players — JAWS, NVDA, VoiceOver — rather than
merely being technically reachable. Interactive Fiction has a strong accessibility tradition
precisely because text games are inherently more accessible than graphical ones, and the
platform should make that the easy path for authors rather than a thing each author solves
alone.

## Status divergence — read this

**ADR-100's own header says `ACCEPTED`, with an implementation plan attached, dated
2026-02-18. There is no implementing code.** This item's `Built?` field is the accurate
signal.

This is exactly the case the roadmap's dual-status rule exists for: an ADR header records
what was decided, not what was delivered, and in this project several ADR statuses have
drifted from reality in both directions. Do not read `ACCEPTED` here as "shipped."

## What is unresolved

Whether accessibility is a **separate client** (as ADR-100's title implies and as ADR-098 /
ADR-099 are separate clients) or a **set of obligations on the existing browser client**.
The latter is cheaper and probably better — the browser client is already
author-customizable, channels already carry every story→UI signal, and a parallel client is
a second thing to keep correct. The ADR predates both of those facts being as settled as
they now are, so it deserves a re-read before anyone builds from it.
