# Work Summary — Chord browser build supports hatch modules (ADR-259)

**Date:** 2026-07-24
**Branch:** hatch-scoring
**Target:** `docs/work/adr-259-hatch-browser-build/` (ADR-259)
**Plan:** `docs/work/adr-259-hatch-browser-build/plan.md` (6 phases A–F, all done)
**Session:** `docs/context/session-20260724-0200-hatch-scoring.md`

## Goal

Let a hatched `.story` produce a browser bundle, and retire the two-host
divergence in how hatches load. Before this, the browser build threw on any
hatch, and the CLI loaded a per-story `tsc` output (`dist/<base>.js`) while the
browser bundled authored `.ts` — two policies that could drift. The D6 amendment
(2026-07-23) ruled the CLI should get the same esbuild transpile the browser
uses, which also unblocked ADR-259 D8's split of friendly-zoo.

## What was done

Three commits over six plan phases. The phases were sequenced A→B first because
A lands the CLI transpile *before* B removes the `tsc` the old CLI path needed —
reversing the order breaks all seven friendly-zoo transcripts in between.

### Phase A — CLI esbuild transpile (`97e26e41`)

New `packages/devkit/src/standalone/hatch-transpile.ts`: `requireHatchModule`
resolves the **authored `.ts`** beside the `.story` and transpiles it through
esbuild (bundled with `packages: 'external'` so a hatch may import siblings while
`@sharpee/*` resolves at runtime; unminified, because the loader's `chord.*`
namespace lint reads function source; output cached under the temp dir by a hash
of the source). One implementation, re-exported from `author-game.ts` and called
from `scripts/bundle-entry.js` — all three former copies collapse to it. **No
tsc, no tsconfig, no typescript anywhere in the path.**

Packaging consequence, not skipped: `esbuild` became a real dependency of
`@sharpee/devkit`, where it was a root devDependency only.

### Phase B — split friendly-zoo (`97e26e41`)

`stories/friendly-zoo` became a clean hatched Chord story — `zoo.story`,
`chord-extras.ts` (moved up from `src/`), tests, walkthroughs. The tutorial's
`package.json`, tsconfigs, vitest config, and remaining `src/` moved whole to
`stories/family-zoo-tutorial/`, which keeps the workspace membership. **Nothing
deleted; every move is a tracked git rename.**

This made the authored path true for the first time: `zoo.story:789` declares
`from "./chord-extras.ts"` and the file was at `src/chord-extras.ts`. The split
is a correctness fix, not tidying.

**Acceptance (A+B):** all 7 transcripts and all 7 walkthroughs pass through
`dist/cli/sharpee.js` with no hand-run `tsc` and no `dist/` directory — the hatch
resolves from the authored `.ts` beside the `.story`.

### Phase C — the browser build route (`eec1f752`)

The `hasHatches` throw in `browser-core.ts` deleted: `hasHatches` **selects a
route**, it does not fail the build. Per hatch module, the generated entry gets a
static import plus a map entry, and calls `createStory(ir, { hatchModules })`.

The ADR calls the import-specifier / map-key distinction the one way to get D2
wrong, so `HatchBinding` computes them separately: the **map key** is the
author's `modulePath` verbatim (`'./chord-extras.ts'`, what the loader looks up);
the **specifier** is that module resolved against the `.story` dir and
re-expressed relative to the generated entry's scratch location. Verified in the
emitted file that the two strings differ and the producer's prose reaches
`game.js`.

The map ships as a **generated sibling module** (`hatch-modules.ts`), stamped
beside the entry exactly as `version.ts` is, rather than as placeholders
substituted into the entry text. That choice came from a real failure:
`init-browser` scaffolds a hand-written `src/browser-entry.ts` from the same
template through a different substitution path, which left `{{HATCH_MODULES}}`
literal and broke two existing browser-build tests. As a sibling module it also
lets D4's escape hatch keep hatch support.

### Phase D — build-time bind check (`eec1f752`)

A hatch that does not bind fails the **build**, not the player's browser.
`checkHatchBindings` binds every hatch in Node via the same `requireHatchModule`
(so the hatch that binds is the hatch that ships) and builds the world, failing
on the loader's own error with the `.story` span. Five cases proven against real
stories on disk in `hatch-bind-check.test.ts` (10 tests): missing module, missing
export, export-of-wrong-kind, and a `chord.*` namespace violation each fail
separately; a well-formed hatch builds. The no-tsc/tsconfig/typescript grep is a
test, not a habit.

**Bug this caught:** the transpiler kept a path-keyed in-process cache, so an
edited hatch returned stale exports within one process. Removed — the output path
is a hash of the source, so Node's require cache already keys on content:
unchanged is free, edited is never stale.

### Phase E — trust reporting + pure-IR guard (`75b46303`)

D3: the build reports that a hatched bundle carries author-written executable
code, not merely story data — naming the modules. The ADR's own correction is
honored: per-story bundles are *already* story-specific (title/theme/prefix
interpolated), so "story-agnostic vs specific" was never the line; **trust** is.
A pure-IR build says nothing of the kind.

D4 needed no code change; the test proves it stayed true — the pure-IR profile
refuses a hatch-bearing story before reading any author code, asserted with a
tripwire module that flips on any property access.

### Phase F — REAL-PATH validation, with a recorded gap (`75b46303`)

Host parity is now by construction: both hosts resolve the same authored `.ts`
through the same esbuild mechanism. `hatch-host-parity.test.ts` (3 tests) pins
that the specifier the browser entry imports resolves to the *same file on disk*
the CLI loads (while the map key stays the author's path), that every literal the
producer can emit is in the shipped `game.js`, and that the same literals come
back from a real call to the CLI-loaded producer.

**Uncovered acceptance item:** ADR-259 Phase F asks for the bound producer's
output asserted in a *running browser*. No headless browser is available in the
build container, so the DOM-level assertion is not made; parity is pinned at the
module and bundle level instead. Recorded in the test header and the ADR status
line.

## Test coverage delta

- New: `hatch-bind-check.test.ts` (10), `hatch-host-parity.test.ts` (3), fixture
  `packages/devkit/tests/fixtures/hatch-bind/`.
- devkit suite green: 80 pass, 1 skipped (including the pre-existing byte-identical
  browser-build parity tests, which the sibling-module change had to keep passing).
- REAL-PATH through `dist/cli/sharpee.js`: friendly-zoo 71 assertions in 7
  transcripts + 7 walkthroughs; the hatched browser build produces
  `dist/web/friendly-zoo/` with the producer's text in `game.js`.

## Flags for David

1. **The running-browser assertion (Phase F) is not covered** — no headless
   browser in the container. If that matters for sign-off, it needs a machine
   with Playwright/Puppeteer to load `dist/web/friendly-zoo/index.html` and read
   the parrot's `{flavor}` text off the page.
2. **`stories/family-zoo-tutorial` is the tutorial's new home** and keeps the
   `@sharpee/story-friendly-zoo` package name. If the tutorial should be renamed
   to match its directory, that's a follow-up.
3. **The split touched `pnpm-workspace.yaml`** (member path changed from
   `stories/friendly-zoo` to `stories/family-zoo-tutorial`) — worth a glance if
   any CI script globs story directories by the old path.
