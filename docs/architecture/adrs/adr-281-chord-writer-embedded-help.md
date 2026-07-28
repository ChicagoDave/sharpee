# ADR-281: Chord Writer embeds searchable help — the book and the Chord reference, in-bundle

## Status: DRAFT (2026-07-27, session fda0f0) — Open Questions unresolved

## Date: 2026-07-27

## Parent: ADR-279 (packaging — the DMG this help ships inside; D3's `package.sh` gains the index step), ADR-258 (authoring environment).

## Context — verified, not assumed

- **The author docs exist and are done**: the Sharpee author/developer
  manual (`docs/book/`, Volumes I–VIII + appendices, QA'd 2026-06-23) and
  the Chord language reference. Both live in the repo and on the site —
  neither is reachable from inside the app.
- **The app's audience is writers**: sending them to a repo checkout for
  docs contradicts the entire ADR-279 premise (self-contained, works
  offline, no developer rituals).
- **`package.sh` (ADR-279 D3) already exists as the one place** that
  assembles bundle resources at release time.

## Decision

### D1 — Corpus: the book plus the Chord language reference

The embedded help is **the book and the Chord reference** (David's
ruling). The genai-api reference is tooling-facing and stays out. The
corpus ships in `Chord Writer.app/Contents/Resources/help/`, rendered for
in-app display — fully offline.

### D2 — Search index built at package time

`tools/ide/package.sh` gains a step: render the corpus and build its
search index into the bundle. The index is a build artifact, never
committed; the corpus version is the bundled toolchain's version (help
matches what the app actually ships, per ADR-279 D4's exact pairing).

### D3 — An in-app help viewer with search

Help opens inside Chord Writer — a themed viewer pane/window with a search
field over the D2 index — not Apple Help Book machinery and not a bounce
to the browser. The Help menu's items open it (general help, Chord
reference, and contextual entries as they earn their place).

## Acceptance

1. On an offline machine, Help opens the book and the Chord reference
   inside the app, and searching a known term (e.g. a Chord keyword)
   returns results that navigate to the right section.
2. The DMG contains the rendered corpus + index; `package.sh` fails loudly
   if the corpus is missing or the index build fails.
3. Help content version matches the bundled platform/Chord version shown
   in About (ADR-279 D1).

## Consequences

- The DMG grows by the rendered corpus + index (text-scale, trivial next
  to ADR-279 D4's Node runtime).
- Book/reference edits reach writers only via app releases — consistent
  with the ADR-279 D4 update model, and Sparkle (ADR-279 D7) is the
  delivery path.
- `package.sh` acquires a docs-rendering dependency (the corpus is
  markdown; the renderer choice is Q-1).

## Open Questions

### Q-1: Rendering and index machinery?
- **Why it matters**: markdown → what (pre-rendered HTML in a WKWebView vs
  native attributed-string rendering), and which index (a prebuilt
  client-side index vs simple full-text scan — the corpus is small).
- **Blocks**: D2/D3 implementation start.

### Q-2: Contextual help entry points?
- **Why it matters**: "search from a Chord error/keyword under the cursor"
  is the high-value integration; scoping it now vs shipping plain search
  first.
- **Blocks**: nothing — additive.

## Session

Drafted 2026-07-27, session fda0f0
(`docs/context/session-20260727-2100-main.md`).
