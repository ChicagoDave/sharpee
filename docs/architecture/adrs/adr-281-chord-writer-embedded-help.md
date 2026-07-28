# ADR-281: Chord Writer embeds searchable help — the book and the Chord reference, in-bundle

## Status: ACCEPTED (2026-07-28, session fda0f0 — David's accept-all after the full-family review; remaining questions deferred as non-blocking)

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
- **ADR-279 D3 rules `tools/ide/package.sh` as the one scripted place**
  that assembles bundle resources at release time — *not yet
  implemented; ADR-279's implementation has not started, so this ADR's
  index step cannot begin before it* (it lands as part of, or
  immediately after, that script's initial implementation).
- **sharpee.net is canon; `docs/reference/` lags it** (David's ruling,
  2026-07-28): the site is the regularly-maintained home of author docs.
  Evidence: `docs/reference/chord-language.md` self-declares "Describes
  Chord **1.4.0**" while the shipped language is **2.1.0**
  (`packages/chord/src/version.ts`). An embedded reference sourced from
  the repo copy would ship stale help by design — the corpus must come
  from the site's canon content (pipeline location: Q-3).
- **The repo already renders the book**: `scripts/build-book.sh` renders
  `docs/book/<version>/` to HTML/EPUB/PDF via pandoc, per edition — the
  Q-1 renderer question is "reuse that pipeline or app-native," not
  greenfield.

## Decision

### D1 — Corpus: the book plus the Chord language reference

The embedded help is **the book and the Chord reference** (David's
ruling). The genai-api reference is tooling-facing and stays out. The
corpus ships in `Chord Writer.app/Contents/Resources/help/`, rendered for
in-app display — fully offline.

**Sources, pinned**: the book is `docs/book/<version>/` — the newest
edition at package time (currently `v2.0.0`; `v1.5.0` stays out). The
Chord reference comes from **sharpee.net's canon content** (the site is
the maintained home — see Context; the pipeline that gets it to
`package.sh` is Q-3). The formal-grammar companions (`chord-grammar.md`,
`chord.ebnf`) are tooling-facing and stay out with genai-api.

### D2 — Search index built at package time

`tools/ide/package.sh` gains a step: render the corpus and build its
search index into the bundle. **The step runs after the toolchain build
and before `xcodebuild archive`** in ADR-279 D3's pipeline — bundle
resources must be in place before signing — and the rendered corpus and
index **join ADR-279's signing and notarization surface**. The index is
a build artifact, never committed.

**The pairing invariant is a same-commit snapshot with a hard gate**,
not a version claim: the corpus is rendered at packaging time from the
canon sources, and `package.sh` **fails loudly if the Chord reference's
declared language version does not equal the bundled
`CHORD_LANGUAGE_VERSION`** — a stale reference can never ship silently
(this also gives reference-currency an enforcement point it lacks
today).

### D3 — An in-app help viewer with search

Help opens inside Chord Writer — a themed viewer pane/window with a search
field over the D2 index — not Apple Help Book machinery and not a bounce
to the browser. The Help menu's items open it (general help, Chord
reference, and contextual entries as they earn their place). **In a build
without the packaged corpus (the dev loop — `xcodegen` + `xcodebuild`,
no `package.sh`), Help menu items disable with a "help ships with
packaged builds" notice** — dev-loop builds stay unaffected (ADR-279
Acceptance 5) and the state is testable.

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
- The packaging Mac gains the chosen renderer (pandoc, if Q-1 lands on
  the build-book.sh pipeline) as a prerequisite alongside ADR-279's
  signing credentials.
- Book/reference edits reach writers only via app releases — consistent
  with the ADR-279 D4 update model, and Sparkle (ADR-279 D7) is the
  delivery path.
- `package.sh` acquires a docs-rendering dependency (the corpus is
  markdown; the renderer choice is Q-1).

## Deferred questions (non-blocking, ruled at implementation)

### Q-1: Rendering and index machinery?
- **Why it matters**: markdown → what (pre-rendered HTML in a WKWebView vs
  native attributed-string rendering), and which index (a prebuilt
  client-side index vs simple full-text scan — the corpus is small).
  `scripts/build-book.sh` already renders the book per-edition via
  pandoc (html/web formats) — reuse that pipeline or go app-native?
- **Blocks**: D2/D3 implementation start.

### Q-3: How does packaging reach the site's canon Chord reference?
- **Why it matters**: sharpee.net is canon and the repo copy lags
  (Context). `package.sh` needs a build-time source for the canon
  content — the site's content repo/pipeline, an export endpoint, or a
  sync-back into this repo that makes `docs/reference/` generated-from-
  canon. Where the site's content actually lives decides this.
- **Blocks**: D1's Chord-reference source; the D2 version gate's input.

### Q-2: Contextual help entry points?
- **Why it matters**: "search from a Chord error/keyword under the cursor"
  is the high-value integration; scoping it now vs shipping plain search
  first.
- **Blocks**: nothing — additive.

## Session

Drafted 2026-07-27, session fda0f0
(`docs/context/session-20260727-2100-main.md`).
