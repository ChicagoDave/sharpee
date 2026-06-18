# Plan — ADR-180 Phase 3: `devkit build/bundle` + full build.sh replacement

**Date:** 2026-06-18
**ADR:** docs/architecture/adrs/adr-180-build-test-devkit.md (Phase 3)
**Predecessor:** Phase 1 (bootstrap) + Phase 2 (`devkit test:npm`) merged to main.

## Goal

devkit owns the full build pipeline (delegating compile to tsf); build.sh is
**deleted at cutover** after a one-time parity gate passes. Targets: CLI bundle,
browser, zifmia. Dropped: shite, `--runner` (their entry points die with build.sh).

## Parity surface (from build.sh map, 1334 lines)

| build.sh function | devkit owner | Output |
|---|---|---|
| `update_versions` | `devkit build` (version stamp) | `stories/*/src/version.ts`, `packages/sharpee/package.json` |
| `build_platform` (27-pkg ordered list) | `devkit build` → **tsf**/`pnpm --filter` | `packages/*/dist`, `dist-esm` |
| `generate_genai_api` | `devkit build` → invoke `scripts/generate-genai-api.js` | `packages/sharpee/docs/genai-api/` |
| `build_story` | `devkit build <story>` | `<story>/dist`, `dist-esm` |
| `build_bundle` | `devkit bundle` → esbuild `scripts/bundle-entry.js` (18 aliases) | `dist/cli/sharpee.js` |
| `build_browser_client` | `devkit build <story> --browser` → esbuild `browser-entry.ts` IIFE + template copy | `dist/web/{story}/` |
| `build_zifmia_server` | `devkit build --zifmia` → `pnpm --filter @sharpee/zifmia build` + baseline version | `tools/zifmia/dist/` |
| `build_test_bundle`, `run_tests` | already covered by `devkit test:npm` / `node dist/cli/sharpee.js --test` | — |

bundle-entry.js already routes through `@sharpee/bootstrap` (Phase 1) — `devkit bundle`
just runs the esbuild step. shite / `--runner` / `.sharpee` bundle: **not built**.

## Open questions (ADR) — resolved here

1. **tsf ↔ arbitrary locations.** Monorepo stories build via `pnpm --filter
   @sharpee/{tutorial-,story-}<name> build` (+ `tsf build --condition esm`), exactly as
   build.sh. An **external** path (story outside the workspace) runs the story's own
   `npm run build` (same as `test:npm` compiles consumers with `tsc`). devkit picks by
   whether the location resolves inside the workspace.
2. **Parity-gate capture + AC-5 "byte-identical."** Build stamps embed `BUILD_DATE`, so
   runs are never byte-identical unless the two non-deterministic inputs are frozen.
   **Resolution:** make build-date injectable (`--build-date` / env, threaded into both
   build.sh's `update_versions` and devkit). The parity harness runs both with the same
   `--version` + frozen date → **true byte-for-byte diff** of the three target trees
   (esbuild output is deterministic given identical inputs). Honors AC-5 literally.

## Decomposition (each sub-increment independently shippable; build.sh coexists until 3d)

- **3a — `devkit build` + `devkit bundle` (CLI bundle).** Port version stamping (TS),
  ordered platform build via tsf/pnpm, genai-api gen, story build, and the esbuild bundle
  step. Parity: frozen-stamp byte-diff of `dist/cli/sharpee.js` (+ `.d.ts`, `.map`) and the
  `packages/*/dist` trees vs build.sh. **The core; biggest increment.**
- **3b — browser target.** `devkit build <story> --browser` → `dist/web/{story}/` (IIFE
  game.js + base/decorations/styles css + themes + assets + index.html + website mirror).
  Parity vs `build_browser_client`. AC-9: confirm single-load boot (already an IIFE).
- **3c — zifmia target.** `devkit build --zifmia` → `pnpm --filter @sharpee/zifmia build`
  + BASELINE_VERSION extraction. Parity vs `build_zifmia_server`.
- **3d — cutover.** Parity gate green for all three → delete build.sh + dead scripts
  (`pack-release.sh` if present, others confirmed dead); add `devkit clean` (tsbuildinfo +
  dist + dist-esm hygiene) and `devkit verify` (`tsf build --npm` + publish dry-run);
  **umbrella wiring** (`@sharpee/sharpee` → `@sharpee/devkit`, the deferred Phase-2 step);
  **AC-8 doc sweep** (CLAUDE.md, package CLAUDE.md, docs/ — every build.sh / `-c shite` /
  `--runner` reference → devkit equivalent). `devkit init`/`list` + `~/.sharpee/devkit`
  name registry land here too (or fold to a 3e if 3d is large).

## Invariants (ADR)

- devkit asserts build outputs exist (no silent `✓` on no-op — the tsbuildinfo class precluded).
- build.sh not deleted until parity passes.
- Exactly one story loader (`@sharpee/bootstrap`); devkit never re-implements it.
- devkit → tsf/transcript-tester, never the reverse.

## Tests (AC closure)

- devkit unit: version-stamp content, location classification (workspace vs external),
  artifact-existence assertions.
- devkit integration (real-path): `devkit build -s familyzoo` + `devkit bundle` produce a
  working `dist/cli/sharpee.js` that runs a transcript (no stubs).
- **parity harness:** frozen-stamp byte-diff devkit vs build.sh for CLI bundle / browser /
  zifmia. This is the AC-5 gate and the build.sh deletion precondition.

## Recommended start: 3a (CLI bundle build+bundle + parity harness skeleton).
