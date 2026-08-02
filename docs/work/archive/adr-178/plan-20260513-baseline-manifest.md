# Session Plan: ADR-178 Story Runtime Baseline

**Created**: 2026-05-13
**Overall scope**: Create `@sharpee/story-runtime-baseline` as the single source of truth for which packages a `.sharpee` bundle may import; wire it into Zifmia's dependency graph and boot-time health check; add build-time validation to `build.sh`; expose `baseline_version` in `GET /api/stories`; guard the Docker image label.
**Bounded contexts touched**: N/A — infrastructure/tooling. This ADR is packaging plumbing, not domain logic.
**Key domain language**: N/A

---

## Phases

### Phase 1: Manifest package skeleton + 6-point registration (AC-1)

- **Tier**: Small
- **Budget**: ~100 tool calls
- **Domain focus**: N/A
- **Entry state**: `packages/story-runtime-baseline/` does not exist.
- **Deliverable**:
  - `packages/story-runtime-baseline/package.json` — `name: "@sharpee/story-runtime-baseline"`, `version: "1.0.0"`, `dependencies` = exact v1 baseline list (17 entries, all `workspace:*` for monorepo peers, exact version for `lz-string`).
  - `packages/story-runtime-baseline/src/index.ts` — exports `STORY_RUNTIME_BASELINE` (frozen `ReadonlyArray<string>`) and `BASELINE_VERSION = 1`. Array must exactly mirror `package.json` `dependencies` keys.
  - `packages/story-runtime-baseline/tsconfig.json` — extends `../../tsconfig.base.json`, emits CJS to `dist/` and ESM to `dist-esm/` (parallel to every other package pattern).
  - `packages/story-runtime-baseline/__tests__/exports.test.ts` — asserts: array is frozen; array contains every key from `package.json` `dependencies` and no extras (reads `package.json` at test time, not a hardcoded snapshot); `BASELINE_VERSION` is a positive integer. Test must be GREEN per rule 12-13 grading.
  - 6-point registration (per David's standing checklist):
    1. `ts-forge.config.json` — add `packages/story-runtime-baseline/tsconfig.json` to `projects`.
    2. `packages/sharpee/package.json` — add `@sharpee/story-runtime-baseline` as a dependency (so the umbrella package can re-export if needed).
    3. `packages/sharpee/src/index.ts` — **do not re-export** the constant (it is infrastructure, not a story API); add a comment noting the package exists but is not surfaced here.
    4. `packages/sharpee/tsconfig.json` — add reference path if sharpee declares it.
    5. `build.sh` — add `story-runtime-baseline` to the platform package build order before `zifmia`.
    6. Root `package.json` `workspaces` array — add `"packages/story-runtime-baseline"`.
  - Verify build: `pnpm --filter @sharpee/story-runtime-baseline build` produces `dist/index.js` and `dist-esm/index.js`. ESM extension correctness confirmed (no extensionless relative imports).
  - Run the exports test suite: all GREEN.
- **Exit state**: `pnpm --filter @sharpee/story-runtime-baseline test` passes. `dist/` and `dist-esm/` exist. Package is visible in pnpm workspace (`pnpm -r ls | grep story-runtime-baseline` shows it). All 6 registration points confirmed in a checklist comment in the session.
- **Status**: CURRENT

---

### Phase 2: Zifmia wires in the manifest; story-only deps move (AC-2)

- **Tier**: Small
- **Budget**: ~100 tool calls
- **Domain focus**: N/A
- **Entry state**: Phase 1 complete. `@sharpee/story-runtime-baseline` is a workspace package. Zifmia's `package.json` currently lists `@sharpee/plugin-npc`, `@sharpee/plugin-scheduler`, `@sharpee/plugin-state-machine`, `@sharpee/event-processor`, `@sharpee/queries`, and `lz-string` as direct deps alongside Zifmia's own server-source deps.
- **Deliverable**:
  - `tools/zifmia/package.json` — add `"@sharpee/story-runtime-baseline": "workspace:*"` to `dependencies`. Remove `@sharpee/plugin-npc`, `@sharpee/plugin-scheduler`, `@sharpee/plugin-state-machine` from direct `dependencies` (they are story-only; now they flow transitively through the manifest). Keep direct deps on every package that Zifmia's own `src/` files import: `@sharpee/core`, `@sharpee/engine`, `@sharpee/event-processor`, `@sharpee/if-domain`, `@sharpee/if-services`, `@sharpee/lang-en-us`, `@sharpee/media`, `@sharpee/parser-en-us`, `@sharpee/platform-browser`, `@sharpee/queries`, `@sharpee/stdlib`, `@sharpee/text-blocks`, `@sharpee/world-model`, and `lz-string` (server uses it for save compression). Note: `@sharpee/event-processor` and `@sharpee/queries` are retained as direct deps because Zifmia's own source imports them; they also appear on the baseline and that overlap is intentional per the ADR invariant (§1).
  - Confirm `pnpm install` resolves without error after the change.
  - Confirm that a `pnpm --filter @sharpee/zifmia build` still succeeds (TypeScript sees the same resolution as before — the deps just moved from direct to transitive for the plugin packages).
  - Confirm that `dist/stories/dungeo.sharpee` still loads cleanly in the existing `story-health.test.ts` REAL-PATH suite (run it; all existing tests must stay GREEN).
- **Exit state**: `tools/zifmia/package.json` no longer directly declares any `@sharpee/plugin-*` package. Zifmia build and existing story-health tests pass. The node_modules inside a `pnpm deploy --prod` of zifmia still contains all plugin packages (transitively via the manifest).
- **Dependencies**: Phase 1 complete.
- **Status**: PENDING

---

### Phase 3: StoryHealth discriminated union + unit test (AC-6 part 1)

- **Tier**: Small
- **Budget**: ~100 tool calls
- **Domain focus**: N/A
- **Entry state**: Phase 2 complete. `StoryHealthReport` in `tools/zifmia/src/engine/story-health.ts` currently uses `reason?: string` (a free-text optional string).
- **Deliverable**:
  - Extend `StoryHealthReport` in `tools/zifmia/src/engine/story-health.ts` so `reason` becomes a discriminated union. Shape:
    ```ts
    export type StoryHealthFailureReason =
      | { kind: 'missing_package'; package: string }
      | { kind: 'manifest_emission_failed'; message: string }
      | { kind: 'unknown'; message: string };

    export interface StoryHealthReport {
      readonly slug: string;
      readonly path: string;
      readonly ok: boolean;
      readonly reason?: StoryHealthFailureReason;
      readonly manifest?: CmgtPacket | null;
    }
    ```
    The change is additive: all existing `report.reason` access must be updated from `string` to the union (TypeScript will catch regressions). The `createStoryHealthChecker` implementation maps `ERR_MODULE_NOT_FOUND` errors to `{ kind: 'missing_package', package: <extracted name> }` (extract the package name from the Node error message, which includes it in the module specifier). All other caught errors map to `{ kind: 'unknown', message: err.message }`. `captureManifest` failures caught explicitly map to `{ kind: 'manifest_emission_failed', message: ... }`.
  - Update every call site in `tools/zifmia/src/` that reads `report.reason` — currently only the boot log in `main.ts` and the filtered scanner adapter in `story-health.ts` itself. Use a helper `formatReason(r: StoryHealthFailureReason): string` so the log stays readable.
  - Update `tools/zifmia/tests/story-health.test.ts` to cover:
    - Non-existent bundle path → `{ ok: false, reason: { kind: 'unknown', ... } }` (existing test updated to assert on the union shape, not just `reason` being defined).
    - A synthetic `.sharpee` file that does `require('@sharpee/nonexistent-xyz')` → `{ ok: false, reason: { kind: 'missing_package', package: '@sharpee/nonexistent-xyz' } }`. Produce the synthetic bundle inline in the test using `fs.writeFileSync` to a temp file. This is the REAL-PATH test the ADR requires — no engine stub.
    - Existing REAL-PATH dungeo validation still returns `{ ok: true }`.
  - Behavior Statement produced in session before tests are written (rule 12).
  - All new/updated tests grade GREEN.
- **Exit state**: `pnpm --filter @sharpee/zifmia test` passes (all tests including the updated story-health suite). TypeScript compiler emits no errors on `tools/zifmia/src/`.
- **Dependencies**: Phase 2 complete (zifmia depends on baseline; build is clean).
- **Status**: PENDING

---

### Phase 4: Build-time bundle validator + test (AC-5)

- **Tier**: Medium
- **Budget**: ~250 tool calls
- **Domain focus**: N/A
- **Entry state**: Phase 1 complete (the manifest package exists and exports `STORY_RUNTIME_BASELINE`). Phase 3 not required — this phase is independent of StoryHealth.
- **Deliverable**:
  - `scripts/validate-bundle-baseline.js` — new standalone Node script (CommonJS, no build step). Accepts two arguments: path to a `.sharpee` bundle and path to the baseline module (defaulting to the workspace's `packages/story-runtime-baseline/dist/index.js`). Algorithm:
    1. Parse the `.sharpee` bundle source as text. Walk `require(...)` / `import(...)` / `from '...'` string literals using a regex pass (the bundle is already a flat JS file after esbuild; no AST needed, a pattern match over external module names is sufficient).
    2. Extract every external module reference (anything that does not start with `.` or `/`). Strip subpath segments to get the bare package name (e.g., `@sharpee/stdlib/foo` → `@sharpee/stdlib`).
    3. Load `STORY_RUNTIME_BASELINE` from the baseline module.
    4. Compute the diff: external references not in the baseline.
    5. If diff is non-empty: write to `stderr` one line per offending reference in the format `[baseline-check] NOT IN BASELINE: <package> (found in bundle)`; exit code 1.
    6. If clean: write a single `[baseline-check] OK` to stdout; exit code 0.
    - Note on source-file attribution: esbuild bundles typically include `// <file>` banner comments above each bundled module chunk. If detectable, the validator should report the source file next to the package name. If not detectable, the package name alone is sufficient — the ADR says "names the import and source file" but the source-file part depends on bundle metadata; do the best the flat bundle allows.
  - Wire into `build.sh`: after the `.sharpee` bundle is produced by the story build step, call `node scripts/validate-bundle-baseline.js dist/stories/<story>.sharpee`. If it exits non-zero, `build.sh` propagates the failure. The step only runs when building a story target (`-s <story>`).
  - `scripts/__tests__/baseline-validation.test.ts` — vitest test (or Node test runner — match whatever `scripts/` currently uses; if none exists, use vitest by adding it as a devDep in the root `package.json`):
    - Fixture 1: a synthetic JS bundle string containing `require('@fake/nonexistent-xyz')` written to a temp file → validator exits code 1 with stderr containing `@fake/nonexistent-xyz`.
    - Fixture 2: a synthetic bundle containing only `require('@sharpee/stdlib')` (a known baseline entry) → exits code 0.
    - Fixture 3: the real `dist/stories/dungeo.sharpee` (if it exists at test time) → exits code 0.
    - Tests grade GREEN.
- **Exit state**: `node scripts/validate-bundle-baseline.js` exits 1 on a non-baseline reference with a clear message; exits 0 on a clean bundle. `scripts/__tests__/baseline-validation.test.ts` passes. `build.sh -s dungeo` succeeds end-to-end (the dungeo bundle passes the validator).
- **Dependencies**: Phase 1 (needs `STORY_RUNTIME_BASELINE` from the built manifest). Phase 2 not required.
- **Status**: PENDING

---

### Phase 5: Docker image label from manifest (AC-3)

- **Tier**: Small
- **Budget**: ~100 tool calls
- **Domain focus**: N/A
- **Entry state**: Phase 1 complete. The manifest exports `BASELINE_VERSION = 1`. The Dockerfile lives at `tools/zifmia/Dockerfile`. The current Dockerfile has no `org.sharpee.story-runtime-baseline` label.
- **Deliverable**:
  - `tools/zifmia/Dockerfile` — add `ARG BASELINE_VERSION=1` near the top of the file and a `LABEL org.sharpee.story-runtime-baseline=${BASELINE_VERSION}` directive in the `runtime` stage. The `ARG` default of `1` is the safe fallback if the build script does not pass it.
  - `build.sh` — update the `-c zifmia` Docker build path to extract `BASELINE_VERSION` from the manifest at image-build time. Mechanism (option b from the ADR open questions): read `BASELINE_VERSION` by running `node -e "const m = require('./packages/story-runtime-baseline/dist/index.js'); process.stdout.write(String(m.BASELINE_VERSION));"` and pass the result as `--build-arg BASELINE_VERSION=<n>` to `docker build`. This keeps the manifest as the single source of truth.
  - Verify the label is present after a local Docker build: `docker inspect sharpee/zifmia:dev | python3 -m json.tool | grep story-runtime-baseline`.
  - No new automated test is required for the label specifically — verification is a build-output check. The e2e suite in Phase 6 confirms the server reports the version correctly; the label is a packaging concern audited by operators.
- **Exit state**: A `docker build -f tools/zifmia/Dockerfile .` tagged as `sharpee/zifmia:dev` carries the label `org.sharpee.story-runtime-baseline=1`. `docker inspect` confirms it. `build.sh -c zifmia` passes the arg correctly.
- **Dependencies**: Phase 1 (needs `BASELINE_VERSION` from the manifest).
- **Status**: PENDING

---

### Phase 6: GET /api/stories baseline_version field + e2e (AC-4)

- **Tier**: Small
- **Budget**: ~100 tool calls
- **Domain focus**: N/A
- **Entry state**: Phase 2 complete (Zifmia depends on the manifest; the manifest is installed). `GET /api/stories` currently returns `{ stories: [...] }`.
- **Deliverable**:
  - `tools/zifmia/src/stories/routes.ts` — update `GET /api/stories` handler to return `{ baseline_version: BASELINE_VERSION, stories: [...] }`. Import `BASELINE_VERSION` from `@sharpee/story-runtime-baseline`. The per-story rows do not include the field — it is top-level only.
  - Update `tools/zifmia/tests/rooms-routes.test.ts` (or wherever the stories route is tested at the unit/integration level) to assert the new field is present at the top level and is a positive integer. Confirm per-story objects do not carry it.
  - `tools/zifmia/tests/e2e/ac-baseline.spec.ts` — new Playwright spec:
    - Uses `spawnZifmiaServer()` from the existing harness at `tools/zifmia/tests/e2e/helpers/server.ts` (REAL-PATH: spawned `node dist/main.js`, no stubs).
    - Asserts `GET /api/stories` returns a JSON body where `baseline_version` is a positive integer.
    - Asserts per-story entries do not include a `baseline_version` field.
    - Mirrors the structure of `ac-07-stories-scan.spec.ts`.
  - Add `ac-baseline.spec.ts` to the Playwright config if it is not auto-discovered.
  - Run `pnpm --filter @sharpee/zifmia test:e2e` and confirm the new spec passes.
  - All new tests grade GREEN.
- **Exit state**: `GET /api/stories` returns `{ baseline_version: 1, stories: [...] }`. The e2e spec passes against a real spawned server. Unit route tests pass.
- **Dependencies**: Phase 2 (manifest installed in zifmia); Phase 1 (manifest exports `BASELINE_VERSION`).
- **Status**: PENDING

---

### Phase 7: End-to-end Docker validation — bad bundle excluded at boot (AC-6 part 2)

- **Tier**: Medium
- **Budget**: ~250 tool calls
- **Domain focus**: N/A
- **Entry state**: Phases 1, 2, 3, and 6 complete. StoryHealth discriminated union is in place (`missing_package` kind). `GET /api/stories` includes `baseline_version`. The Docker image builds cleanly.
- **Deliverable**:
  - Extend `tools/zifmia/tests/e2e/ac-baseline.spec.ts` with a second scenario (or create `ac-baseline-health.spec.ts` if separation is cleaner):
    - Construct a minimal synthetic `.sharpee` bundle that does `require('@sharpee/nonexistent-xyz-adr178-test')` — a package that is not on the baseline and is not installed anywhere. Write it to a temp file.
    - Boot a Zifmia server via `spawnZifmiaServer({ seedStories: ['<temp-bad.sharpee>'] })` (or use a custom `env` override for the stories dir pointing to a temp dir containing the bad bundle alongside `dungeo.sharpee`).
    - Assert `GET /api/stories` does not include the bad story's slug — it is excluded by the health filter.
    - Assert `GET /api/stories` does include `dungeo` (good story still listed).
    - Confirm the server log (captured via `child.stderr` in the harness) contains the offending package name. The harness already pipes stderr to a string buffer when `ZIFMIA_E2E_VERBOSE` is set; extend it to capture stderr unconditionally into a buffer for assertion.
  - This is the REAL-PATH test required by rule 13a for an "integration" phase: the spawned server runs the production `StoryHealth.validate()` path against a real (synthetic) bundle. No stubs of the engine, no injection.
  - Update `spawnZifmiaServer` harness if needed to support seeding a custom bad bundle (the harness currently accepts `seedStories: readonly string[]` as filenames from `dist/stories/` — extend it to accept `{ name: string; sourcePath: string }[]` so a caller can inject a bundle from anywhere).
  - All new e2e assertions grade GREEN.
  - Final checklist: run `pnpm --filter @sharpee/zifmia test`, `pnpm --filter @sharpee/zifmia test:e2e`, `pnpm --filter @sharpee/story-runtime-baseline test`, and `scripts/__tests__/baseline-validation.test.ts` in sequence. All must pass.
- **Exit state**: A `.sharpee` bundle referencing a non-baseline package is excluded from `GET /api/stories` in a REAL-PATH e2e test. The Zifmia boot log names the offending package. The full test matrix (unit + e2e across both new packages and zifmia) is green.
- **Dependencies**: Phases 1, 2, 3, and 6 complete. Phase 4 (build-time validator) and Phase 5 (Docker label) are independent and can be done in any order relative to this phase, but all seven phases should be complete before the ADR is updated to ACCEPTED.
- **Status**: PENDING

---

## Phase Dependency Graph

```
Phase 1 (manifest skeleton)
  └─► Phase 2 (zifmia wires in manifest)
        ├─► Phase 3 (StoryHealth union)        ──────────────────────► Phase 7 (e2e Docker)
        └─► Phase 6 (GET /api/stories field)   ──────────────────────► Phase 7 (e2e Docker)
Phase 1 ──► Phase 4 (build-time validator)     [independent of 2, 3, 5, 6]
Phase 1 ──► Phase 5 (Docker label)             [independent of 2, 3, 4, 6]
```

Phases 4 and 5 can run in parallel with Phases 2–6 once Phase 1 is done. Phase 7 requires Phases 1, 2, 3, and 6.

---

## ADR Status Update (post-implementation)

After all phases pass their exit gates, update `docs/architecture/adrs/adr-178-story-runtime-baseline.md` `Status` field from `PROPOSED` to `ACCEPTED`.

---

## Files Touched by Phase

| Phase | Files created or modified |
|-------|--------------------------|
| 1 | `packages/story-runtime-baseline/package.json`, `packages/story-runtime-baseline/src/index.ts`, `packages/story-runtime-baseline/tsconfig.json`, `packages/story-runtime-baseline/__tests__/exports.test.ts`, `ts-forge.config.json`, `packages/sharpee/package.json`, `packages/sharpee/src/index.ts`, `packages/sharpee/tsconfig.json`, `build.sh`, root `package.json` |
| 2 | `tools/zifmia/package.json` |
| 3 | `tools/zifmia/src/engine/story-health.ts`, `tools/zifmia/tests/story-health.test.ts` |
| 4 | `scripts/validate-bundle-baseline.js`, `scripts/__tests__/baseline-validation.test.ts`, `build.sh` |
| 5 | `tools/zifmia/Dockerfile`, `build.sh` |
| 6 | `tools/zifmia/src/stories/routes.ts`, `tools/zifmia/tests/rooms-routes.test.ts` (or equivalent route test), `tools/zifmia/tests/e2e/ac-baseline.spec.ts` |
| 7 | `tools/zifmia/tests/e2e/ac-baseline.spec.ts` (extended), `tools/zifmia/tests/e2e/helpers/server.ts` (seed extension), `docs/architecture/adrs/adr-178-story-runtime-baseline.md` (Status → ACCEPTED) |

---

## Open Questions Resolved by This Plan

- **Image-label mechanism (ADR open question)**: Option (b) — Docker build arg read from the manifest at image-build time. `build.sh -c zifmia` reads `BASELINE_VERSION` via `node -e` and passes `--build-arg`. Default `ARG BASELINE_VERSION=1` in the Dockerfile is the safe fallback.
- **`packages/sharpee` re-export**: Do not re-export `STORY_RUNTIME_BASELINE` from the umbrella package — it is infrastructure, not a story API.
- **`scripts/__tests__/` test runner**: Match whatever the repo uses for scripts tests; if none exists, add vitest as a root devDep.
- **Synthetic bad bundle in e2e**: Constructed inline in the test as a minimal JS file (`"use strict"; require('@sharpee/nonexistent-xyz-adr178-test')`) written to a temp path — no separate fixture file needed.
