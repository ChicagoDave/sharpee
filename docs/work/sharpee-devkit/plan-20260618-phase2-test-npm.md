# Plan — ADR-180 Phase 2: `devkit test:npm`

**Date:** 2026-06-18
**Branch:** (new) `feat/adr-180-phase2-test-npm`
**ADR:** docs/architecture/adrs/adr-180-build-test-devkit.md (Phase 2)
**Scope:** Create `@sharpee/devkit`, implement one parameterized `devkit test:npm <location>`
that reproduces the three npm consumer harnesses, then retire them.

## Decisions (confirmed with David 2026-06-18)

1. **Umbrella wiring deferred to Phase 3.** `@sharpee/sharpee` does *not* depend on
   `@sharpee/devkit` yet. In Phase 2 devkit is invoked via the workspace
   (`pnpm --filter @sharpee/devkit ...` / `node packages/devkit/dist/cli.js`).
   Avoids dragging tsf/transcript-tester into the SDK before devkit is feature-complete.
2. **Default source = local build.** `devkit test:npm <loc>` defaults to packing
   `~/.tsf-publish` tarballs (the familyzoo pre-publish gate). `--registry` opts into
   the post-publish check (dungeo / old npm-test behavior).
3. **Fixture = the existing `npm-test/` story.** Move `npm-test/src` + `npm-test/tests`
   into `packages/devkit/fixtures/basic-story/` as devkit's own AC-7 validation fixture.

## The three harnesses → one command

| Variant | npm-test | npm-test-dungeo | npm-test-familyzoo | devkit flag |
|---|---|---|---|---|
| Package source | registry | registry | local build (`~/.tsf-publish`) | `--registry` / `--local` (default local) |
| Dep closure | hand-listed | hand-listed | auto transitive | always auto (from story package.json) |
| Transcript mode | per-file | `--chain` | per-file | `--chain` |
| Transcript glob | `tests/transcripts/*` | `walkthroughs/wt-*` | `tests/transcripts/*` | `--transcripts <glob>` (default `tests/transcripts/*.transcript`) |
| Compile only | — | `--quick` | — | `--quick` |

`npm-test-dungeo --walkthrough` (run the local bundle directly, no npm) is **not** an
npm consumer test — it's covered today by `node dist/cli/sharpee.js --test --chain`. Not
reproduced in `test:npm`; noted for the Phase 3 `devkit test`/`play` surface.

## The mechanism (drift-free, from `gen-consumer.mjs`)

`gen-consumer.mjs`'s transitive-closure logic becomes the single consumer-package
generator, parameterized by source mode:

- **Seed** from the story's own `package.json` `@sharpee/*` deps.
- **Close** transitively over the staged package metadata.
- **`--local`:** `npm pack` each closure member from `~/.tsf-publish/sharpee/<dir>` →
  `file:vendor/*.tgz` refs. Fail loudly if a seed dep is absent from staging.
- **`--registry`:** emit version refs for each closure member. Version source: read the
  workspace version (the version that is/will be published); default tag `latest` if a
  member is unresolved. Third-party deps resolve from registry in both modes.
- transcript-tester (the `transcript-test` bin) added as a dev dep the same way.

## Steps

1. **Create `packages/devkit`** — published `@sharpee/devkit`, bin `devkit`, TS → `dist/`.
   - `package.json` (bin, scripts: build/clean/test mirroring bootstrap), `tsconfig.json`,
     `tsconfig.esm.json` if needed. Deps: node built-ins only for `test:npm` (orchestrates
     `npm`/`tsc`/`transcript-test` as subprocesses). devDeps: typescript, vitest, rimraf, @types/node.
2. **CLI scaffold** — `src/cli.ts` arg parsing; subcommand dispatch (`test:npm` first; leave
   room for `build|bundle|test|verify|clean|init|list` per ADR). Unknown command → usage + nonzero exit.
3. **`src/commands/test-npm.ts`** — the orchestrator: temp dir, copy story `src/` (excluding
   `browser-entry.ts`/`react-entry.tsx`) + transcripts, generate consumer `package.json`,
   `npm install`, `tsc`, run transcripts (chain or per-file), report `N passed, M failed`.
4. **`src/consumer-gen.ts`** — port `gen-consumer.mjs` closure logic; add `--registry` mode.
5. **Fixture** — move `npm-test/src` + `npm-test/tests` → `packages/devkit/fixtures/basic-story/`
   with a story `package.json` listing its `@sharpee/*` deps.
6. **Tests** (AC-7):
   - unit: consumer-gen closure (seed → transitive set; missing seed → throws; local vs registry refs).
   - integration / real-path: `devkit test:npm fixtures/basic-story --local` runs the real
     pipeline against `~/.tsf-publish` and the fixture transcripts (no stubs — Integration
     Reality: this is the real npm consumer path).
7. **Registration** — `ts-forge.config.json` (+`packages/devkit/tsconfig.json`), `build.sh`
   PACKAGES (build only; not bundled into `dist/cli/sharpee.js`). Umbrella points deferred.
8. **Parity check** — run `devkit test:npm` to reproduce each harness's result:
   - `tutorials/familyzoo --local` ≈ `npm-test-familyzoo/run.sh` (expect 15/16; v16 known #116)
   - `stories/dungeo --registry --chain --transcripts 'walkthroughs/wt-*.transcript'` ≈ `npm-test-dungeo/run.sh`
   - `fixtures/basic-story --registry` ≈ `npm-test/run.sh`
9. **Retire** the three harnesses (`npm-test/`, `npm-test-dungeo/`, `npm-test-familyzoo/`)
   **only after** parity passes and **with explicit confirmation** (deletion gate).

## Acceptance (Phase 2 slice of ADR-180)

- **AC-4:** `devkit test:npm <location>` reproduces the three retired harnesses over any story. ✅ target
- **AC-7 (partial):** devkit ships its own test suite + real-path npm-consumer harness against a fixture. ✅ target

## Invariants

- Exactly one consumer-package generator (closure logic); no hand-listed dep lists.
- devkit depends on transcript-tester/tsf, never the reverse (Phase 2: only invokes them as subprocesses).
- A no-op/empty staging fails loudly (missing-seed-dep error), never a silent pass.

## Open / deferred

- Registry-mode version pinning detail (workspace version vs `latest`) — decide in step 4.
- `devkit test`/`play`/`build`/`bundle`, `init`, `~/.sharpee/devkit` — Phase 3.
- `--walkthrough` (local-bundle direct run) folds into Phase 3 `devkit test`, not `test:npm`.
