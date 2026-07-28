# ADR-284: Chord Writer publishing — a first-class Publish action for finished stories

## Status: ACCEPTED (2026-07-28, session fda0f0 — David's accept-all after the full-family review; remaining questions deferred as non-blocking)

## Date: 2026-07-27

## Parent: ADR-279 (the shipped app), ADR-280 (project model — Assets and Web Template feed the publish build), ADR-252/devkit browser build (the mechanical engine).

## Context — verified, not assumed

- **The mechanical core exists**: the devkit browser build
  (`packages/devkit/src/standalone/build-browser.ts`, `init-browser.ts`)
  produces a self-contained browser client for a story, and author
  asset-copy belongs to that build by standing ruling.
- **The writer-facing gap is total**: build and Play exist in the IDE, but
  a finished story has no "then what" — no action produces a shareable
  artifact. For Chord Writer's audience this is the point of the app.
- **zifmia** ships separately as a self-contained Docker multi-user server
  (ADR-177/179) — a possible publish target, not a dependency.

## Decision

### D1 — Publish is a first-class app action

Chord Writer gets a **Publish** action (menu-level peer of Build/Play): it
runs the devkit browser build over the story — Web Template and Assets
included (ADR-280 artifacts) — and produces a distributable artifact. It
is not a debug/export buried in a submenu; it is the finish line the
project view points toward.

**The mechanics live in devkit** (working form: `sharpee publish` —
browser build + zip); Chord Writer's Publish invokes it via the resolved
toolchain, the ADR-280 D3 one-owner pattern. A terminal author gets the
identical artifact; there is no IDE-only publish path.

### D2 — The baseline artifact is a self-contained web zip

The v1 target: a **zip of the self-contained browser build** — unzip
anywhere, open `index.html`, the story runs. This shape is itch.io-ready
as-is (itch accepts exactly this: an HTML zip with `index.html` at the
root). Further targets are Q-1.

## Acceptance

1. Publish on a story with customized Web Template and referenced assets
   produces a zip; unzipped on a machine with nothing installed, the story
   plays in a browser with the customization and assets intact.
2. The zip uploads to itch.io's HTML-project flow and runs without
   modification (manual verification once; the structure is pinned by a
   test).
3. Publish failures (build errors, missing assets) surface in the IDE's
   existing problem/output surfaces, not a silent half-artifact.

## Consequences

- Publish invokes the resolved toolchain (ADR-279 D4), so it works on a
  fresh install with the bundled devkit.
- The ADR-286 transform becomes load-bearing: what it emits, Publish
  delivers to strangers' browsers; validation is the transform's own
  diagnostics plus the `use html` escape hatch's warnings.

## Deferred questions (non-blocking, ruled at implementation)

### Q-1: What targets beyond the zip?
- **Why it matters**: candidates with different weights: an itch.io
  preset (metadata/cover handling), a zifmia-targeted artifact for
  multi-user hosting, and a hosted "publish to sharpee.net" destination
  (a product ambition, not a feature toggle). David's call on the list
  and the order.
- **Blocks**: nothing in D1/D2 — targets are additive.

### Q-2: Where does Publish live in the UI?
- **Why it matters**: a single menu action (zip to a chosen location) vs
  a Publish panel (target choice, story metadata, cover image). The
  panel shape depends on Q-1's target list.
- **Blocks**: implementation start.

## Session

Drafted 2026-07-27, session fda0f0, from the basic-features conversation
(`docs/context/session-20260727-2100-main.md`).
