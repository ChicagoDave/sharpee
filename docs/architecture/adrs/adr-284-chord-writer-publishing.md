# ADR-284: Chord Writer publishing — a first-class Publish action for finished stories

## Status: ACCEPTED — **IMPLEMENTED**, and **Amended A1** (2026-08-06, session daeb64): D1 and D2 shipped as `sharpee publish` plus a Publish tab. Acceptance 1's "customized Web Template" is read against the `browser/<storyId>.css` override that exists, NOT ADR-286's `.templates` DSL, which is unimplemented; Q-2 is answered (a right-panel tab). See **Amendment A1** at the foot of this document. (Original accept: 2026-07-28, session fda0f0 — David's accept-all after the full-family review; remaining questions deferred as non-blocking.)

## Date: 2026-07-27

## Parent: ADR-279 (the shipped app), ADR-280 (project model — Assets and Web Template feed the publish build), ADR-252/devkit browser build (the mechanical engine).

> **Inbound requirement (2026-08-03, ADR-298 D5)**: Publish MUST hard-error
> on a story with no IFID. A missing `ifid:` is a compile-time warning only
> (ADR-298); publication is where Treaty of Babel compliance (ADR-074)
> becomes mandatory. This is a day-one requirement of this ADR's
> implementation, recorded here because no publish command existed when
> ADR-298 was accepted.

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

Amendment A1: 2026-08-06, session daeb64.

---

## Amendment A1 — implemented, with Acceptance 1 read against what exists (2026-08-06, session daeb64)

**Shipped.** `sharpee publish [<file>.story | dir] [--out]` in devkit (D1's
"working form", now real) and a Publish tab in Chord Writer's right panel, plus
**Build → Publish…**. The tab drives the toolchain and owns none of the
mechanics, so a terminal author and an IDE author get the identical artifact —
D1's rule, enforced by there being exactly one implementation.

**Q-2 is answered: a right-panel tab**, per go-live item 1. That was this ADR's
stated implementation blocker.

**Acceptance 1 is read against the override that exists.** It says "a story with
customized Web Template and referenced assets". Assets are real and copied
(`build-browser.ts`). But ADR-286's `.templates` layout DSL **is not
implemented** — the string appears nowhere in `packages/devkit/src` or
`packages/chord/src`, and no `.templates` file exists in the repo. Customization
today means the escape hatch: `browser/<storyId>.css` (and `browser/index.html`).
Acceptance 1 is satisfied against that, and this ADR does not wait on ADR-286.
Nothing about producing a distributable zip depends on the DSL; when ADR-286
lands, Publish carries whatever the build emits, unchanged.

**A defect this implementation found, worth recording because it predates it.**
`buildBrowser` writes into `dist/web/<id>` *without clearing it*. The first real
publish of fernhill therefore shipped a `game.js.map` five hours older than its
`game.js`, despite `sourcemap: false` — and, in general, anything an earlier
build left behind. Publish now clears the story's own output directory first,
which took that artifact from 1.2 MB to 0.4 MB. **`sharpee build` still does
not clear**, which is right for an iterative build and is why the fix lives in
publish rather than in the shared core.

**Acceptance, checked.**

| # | Criterion | State |
|---|---|---|
| 1 | Customized + assets survive the zip | met, read as above — fernhill publishes with `fernhill.css`, `audio/` and `images/` intact |
| 2 | Uploads to itch.io and runs unmodified | **not verified** — needs a real account; the structure it depends on (`index.html` at the archive root) is pinned by test |
| 3 | Failures surface in the IDE's existing surfaces | met — the toolchain's output streams into the tab; a zero exit that wrote no file is reported as a failure rather than claiming an artifact |

**Deliberately not built: an in-tab fix for the missing-IFID refusal.** It would
mean a second IFID check in Swift, which is the drift D1 exists to prevent. The
author meets the fix earlier — the Problems panel offers Generate IFID at
compile time (ADR-298's warning), and the CLI's refusal names both remedies.

> **AMENDED by [ADR-309](adr-309-tool-owned-ifid.md)** (2026-08-10, session
> ed3730). The rule above stands — Publish is still thin, with no IFID check
> in Swift — but its *rationale* has moved: there is no earlier fix to meet,
> because there is nothing to fix. The toolchain owns the IFID (minted at
> creation into `<story-name>.config.json`, rendered into the header on save
> and build), and the Problems panel's Generate IFID quick-fix retired with
> the `analysis.missing-ifid` warning it hung on. `publish.missing-ifid`
> survives as the **backstop**, now unreachable-by-construction for any story
> a host has touched: it fires only for a story with no identity anywhere —
> in practice, a clone whose committed config file went missing. Publish
> reconciles through the same shared function the builds use, but never
> mints: inventing an identifier at publication would silently make the work
> a different one to every archive that already knows it.

**Q-1 (targets beyond the zip) remains open and blocks nothing.**
