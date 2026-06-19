# Session Summary: 2026-06-18 (05:24 CST) — feat/adr-180-phase3b-browser

## Goals
- ADR-180 Phase 3b: `devkit build <story> --browser` — the self-contained browser
  client (dist/web/<story>/), byte-parity with build.sh's `-c browser` (AC-9).

## Context
- Phase 3a (devkit build/bundle, CLI bundle) merged to main (PR #122).
- Branch: feat/adr-180-phase3b-browser.

## Completed
- **`commands/browser.ts`** (`buildBrowserClient`): verbatim build.sh esbuild IIFE
  (`--format=iife --global-name=SharpeeGame --minify --conditions=require`, single
  platform-browser alias) → `dist/web/<story>/game.js`; copies index.html + base/
  decorations/styles css + themes (rm -rf first) + story assets + website mirror;
  asserts game.js non-empty.
- **`--browser`** flag wired into `runBuild` (additive: implies `--esm`, requires a story,
  runs after the CLI bundle) and the CLI.
- **tsf robustness fix**: `devkit build` resolves `tsf` via `node_modules/.bin/tsf`
  (build.sh's bare `tsf` fails when tsf is only a shell alias / not on a non-interactive
  PATH). Identical compiler output; makes devkit work where build.sh's ESM pass wouldn't.
- **Parity harness** `scripts/parity-browser.sh` — freezes version+date, wipes trees,
  runs build.sh then devkit, byte-diffs the dist/web/<story> + website mirror trees.
  (Puts node_modules/.bin on PATH so build.sh's bare tsf resolves.)
- +2 rejection unit tests (`browser.test.ts`). devkit suite: **17 passing, 1 skipped**, GREEN.

## Parity result
- **PARITY PASS** — `dist/web/dungeo/` and `website/public/web/dungeo/` byte-identical to build.sh.
- One real diff found + fixed en route: devkit copied a `.DS_Store` from `assets/` that
  build.sh's `cp "$ASSETS_DIR"/*` glob skips. Fixed: skip dotfiles when copying story assets
  (matches build.sh, and keeps Finder cruft out of the deliverable). Harness also now wipes
  output trees between builders so a stale artifact can't mask a diff.

## AC-9
- Met: the IIFE `game.js` bakes platform + story into one payload — boots in a single load,
  portable to any static host. Faithful port of build.sh's already-IIFE browser build.

## Open / next
- 3c — zifmia target (`pnpm --filter @sharpee/zifmia build` + BASELINE_VERSION).
- 3d — cutover: delete build.sh + dead scripts; `devkit clean`/`verify`; umbrella wiring; AC-8 doc sweep.

## Status
- **Status**: COMPLETE (3b) — browser target implemented, 17 tests GREEN, byte-parity gate PASS.
