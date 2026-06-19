# Session Summary: 2026-06-18 (04:30 CST) — feat/adr-180-phase2-test-npm

## Goals
- ADR-180 Phase 2: build `@sharpee/devkit` with one parameterized `devkit test:npm`
  that reproduces the three npm consumer harnesses (npm-test/, npm-test-dungeo/,
  npm-test-familyzoo/), then retire them.

## Phase Context
- **Plan**: docs/work/sharpee-devkit/plan-20260618-phase2-test-npm.md
- **ADR**: docs/architecture/adrs/adr-180-build-test-devkit.md (Phase 2)
- **Branch**: feat/adr-180-phase2-test-npm

## Decisions (confirmed with David)
1. Umbrella wiring (`@sharpee/sharpee` → devkit) **deferred to Phase 3**; Phase 2 devkit
   invoked via workspace / `node packages/devkit/dist/cli.js`.
2. `test:npm` **default source = local build** (`~/.tsf-publish` tarballs); `--registry` opts in.
3. AC-7 fixture = the existing `npm-test/` story, copied to `packages/devkit/fixtures/basic-story/`.

## Completed (implementation)
- New package `packages/devkit` (`@sharpee/devkit`, bin `devkit`). For `test:npm` it
  orchestrates `npm`/`tsc`/`transcript-test` as **subprocesses** — zero `@sharpee/*`
  runtime deps. Registered in `ts-forge.config.json` + `build.sh` PACKAGES.
- `src/consumer-gen.ts` — the single drift-free consumer-package generator (ports
  `gen-consumer.mjs`). **Local mode** packs the full transitive `@sharpee` closure as
  `file:` tarballs (required: file: deps don't resolve their own @sharpee deps).
  **Registry mode** declares only the story's seed `@sharpee` deps and lets npm resolve
  transitive deps from the registry — mirrors a real consumer and avoids
  staging-vs-registry graph divergence (the design fix that surfaced when bootstrap
  turned out to be unpublished).
- `src/commands/test-npm.ts` — `runTestNpm`: temp consumer, copy story src (minus
  browser/react entries) + transcripts, generate package.json + inlined tsconfig, install,
  tsc, run transcripts (chain or per-file), return counts. Flags `--local/--registry`,
  `--chain`, `--transcripts <glob>`, `--quick`, `--version`, `--staging`, `--keep`.
- `src/cli.ts` — `devkit` dispatch; `test:npm` live; build/bundle/test/.../init/list reserved (Phase 3).
- Tests: `consumer-gen.test.ts` (7) + `test-npm.test.ts` (rejection paths + gated real-path).
  **9 passing, 1 skipped** (real-path gated behind `DEVKIT_INTEGRATION=1`). Suite graded GREEN.

## Parity results (the gate before deleting the three harnesses)
- **familyzoo `--local`: 15 passing, 1 failure (v16-scoring)** — EXACTLY matches the
  documented npm-test-familyzoo result; v16 is the known #116 petting-dispatch regression.
- **dungeo `--registry`: pipeline works** (closure→install 67 pkgs→tsc), but tsc fails on
  `IChannelRegistry`/`createAmbientChannel`/`credits` **not exported by the registry** —
  publish-lag (registry latest 0.9.113 predates HEAD's ADR-174 channel API). The old
  npm-test-dungeo would fail identically today; mechanism parity confirmed, e2e is publish-gated.
- **dungeo `--local`: compiles clean** (staging matches HEAD), walkthrough chain RAN
  (~1080 tests). Run #1: 311/752; run #2: 259/825 — two consistent ~75% failures (NOT the
  RNG signature, which flips to passing on re-run). wt-01 fully passes (torch + troll); the
  cascade is death/restore-driven. Since familyzoo passes 15/16 on the SAME staging, the
  local-npm pipeline + channel capture are sound; the divergence is **dungeo-specific**
  (combat/save-restore/daemons) — a candidate issue, orthogonal to Phase 2. dungeo was never
  a local-npm subject in the old harnesses, so there is no prior baseline this contradicts.

## Harness retirement (David approved — done)
- `git rm` of `npm-test/`, `npm-test-dungeo/`, `npm-test-familyzoo/` (68 files).
- Live doc fixed: `docs/guides/npm-publish.md` now points at `devkit test:npm` (registry + local).
- Stale `.claude/settings.local.json` permission entries removed.
- Archive session records + the ADR-180 reference left as-is (history / spec).

## Issue filed
- **#120** — dungeo walkthrough chain fails ~75% via local-npm-staged packages while
  familyzoo passes 15/16 on the same staging and the bundle baseline passes (862/0). Candidate
  kin to #118. Orthogonal to Phase 2.

## Open Items
- Registry-mode e2e is publish-gated (needs `tsf publish` of the current batch incl. the
  unpublished `@sharpee/bootstrap`). After publish: `devkit test:npm <story> --registry` should pass.
- #120 investigation (npm-staged dungeo runtime divergence).
- Phase 3: `@sharpee/devkit` build/bundle + full build.sh replacement + parity gate + umbrella wiring + AC-8 docs.

## Files
- NEW `packages/devkit/**` (package.json, tsconfig.json, src/{cli,index,consumer-gen}.ts,
  src/commands/test-npm.ts, tests, fixtures/basic-story/ copied from npm-test/)
- `ts-forge.config.json`, `build.sh` — devkit registration
- `docs/work/sharpee-devkit/plan-20260618-phase2-test-npm.md`

## Status
- **Status**: COMPLETE (Phase 2) — devkit + `test:npm` built, 9 tests GREEN, local parity exact
  (familyzoo 15/16), registry mechanism proven (e2e publish-gated), three harnesses retired,
  #120 filed. Not yet committed.
