# ADR-180: Build/Test devkit and `@sharpee/bootstrap`

## Status: PROPOSED

## Date: 2026-06-18

## Context

Sharpee's **build** layer is productized — `tsf` (`@davidcornelson/tsf`) is a
real, owned, published compiler/publisher. The **bundle + story-build +
transcript-run + npm-verify + publish-verify** layer never got the same
treatment. It is accreted bash and copy-paste, with no single owner, no config,
and no tests of its own. Concrete evidence (session 90c6c2/2026-06):

- **Three hand-copied story loaders** — `transcript-tester/src/cli.ts`
  (`loadStory`), `transcript-tester/src/fast-cli.ts` (`loadStoryAndCreateGame`),
  and `scripts/bundle-entry.js` (inline copy). Guaranteed drift; the
  unimplemented `entry:` transcript header is a direct symptom — a fix would have
  to be written three times, and the bundle path silently ignored it.
- **`build.sh` is a ~1,100-line untested bash monolith** (versioning, package
  build, genai-api gen, bundling, story build, multiple client builds). The
  silent `.tsbuildinfo` no-op bug lived here.
- **Dead/stale scripts, no owner** — `publish:beta`, `npm-latest.sh`,
  `pack-release.sh` (still references the deleted `text-service`).
- **Three near-duplicate npm consumer harnesses** — `npm-test/`,
  `npm-test-dungeo/`, `npm-test-familyzoo/`.

Root cause: the test/bundle/verify layer is not a product. Full design
exploration and per-decision rationale: `docs/work/sharpee-devkit/spec-20260617-build-test-devkit.md`.

## Decision

Build a **published, Sharpee-specific, self-tested devtool** (`@sharpee/devkit`)
shipped via the `@sharpee/sharpee` authoring SDK, that owns
build/test/verify orchestration, and extract story loading into its own
published package. tsf stays the compiler/publisher; **devkit orchestrates, tsf
compiles**.

Six decisions (resolved during the spec walkthrough):

1. **`@sharpee/devkit` at `packages/devkit`** (published), CLI bin `devkit`.
   **Shipped as part of the npm install:** `@sharpee/sharpee` (the authoring SDK
   umbrella) depends on `@sharpee/devkit`, so `npm install @sharpee/sharpee`
   places the `devkit` bin in `node_modules/.bin` — a story author building their
   game in any repo gets the tool without a separate install. This is required by
   Decision 4 (a story is a location *anywhere*, including outside this
   monorepo): an unpublished `tools/` tool could not reach external authors.
   devkit is published and Sharpee-specific — *not* a generic standalone product.
   It must live in `packages/` (not `tools/`) because the published
   `packages/sharpee` depends on it. **Assumption:** `@sharpee/sharpee` is the
   *authoring-time* SDK (authors install it to build/test; runtime ships built
   bundles / the ADR-178 Story Runtime Baseline, not the umbrella), so devkit's
   build-only transitive deps (tsf, bundler) do not bloat a story's runtime. If
   that assumption breaks (stories runtime-depend on `@sharpee/sharpee`),
   revisit — devkit would otherwise drag build tooling into runtime.
2. **Full replacement of `build.sh`.** devkit fully owns the build; build.sh is
   **deleted at cutover** (no shim, no delegation). A **one-time parity check** —
   devkit outputs vs build.sh outputs — must pass before deletion, so no behavior
   is silently lost.
3. **`@sharpee/bootstrap` at `packages/bootstrap`** (published) — the single
   story loader. Resolves the story module **entry-aware** (`dist/<entry>.js` →
   `dist/<entry>/index.js` → `dist/index.js`) and assembles GameEngine + world +
   player + parser + language + perception into a runnable game. Depends only
   downward on runtime libs; transcript-tester, the bundle, and devkit all depend
   on it (no cycle). This closes the long-standing `entry:` gap.
4. **A story is a location; no committed config; no directory convention.**
   devkit targets a path (`devkit test <path>`). `devkit init <location>`
   optionally registers a name→path mapping in a **user-level memory at
   `~/.sharpee/devkit`** (machine-level, not committed; stories may live
   anywhere, including other repos). The memory is pure convenience over the
   location — never a source of truth; nothing requires `init`.
5. **Targets: CLI bundle, `browser`, `zifmia`.** The **`browser`** target is the
   author's player-facing deliverable: `devkit build <story> --browser` produces
   a **fully self-contained, encapsulated web app** at `dist/web/{story}/` — the
   framework-free platform-browser runtime (ADR-170) and the compiled story
   bundled into a single optimized payload that **boots without fetching the
   platform piecemeal**, so players get a fast page load. An author can build a
   complete, fast, self-contained browser version of their story and ship it
   anywhere static files are served. `shite` (abandoned parts bin) and `--runner`
   (dormant legacy interpreter) are **dropped** — devkit does not build them;
   their entry points die with build.sh. The `.sharpee` story-bundle format is
   **deferred** (reconstructable later). Dropping from the build ≠ deleting
   `tools/shite/` / `dist/runner/` source (separate cleanup).
6. **Keep the platform bundle (`dist/cli/sharpee.js`)** as devkit's **internal
   fast engine** (~170ms load). `devkit` is the single user-facing front door
   (`devkit test/play <loc>`); raw `node dist/cli/sharpee.js` survives as a
   low-level entry devkit invokes. `bundle-entry.js`'s inline loader is replaced
   by `@sharpee/bootstrap`.

### Layering

```
engine + world-model + parser + lang  (runtime libs, published)
        ↑
@sharpee/bootstrap   (published; entry-aware load + game assembly)
        ↑
   ┌────┼───────────────────────────┐
transcript-tester   bundle(--play/--test)   @sharpee/devkit (packages/, published)
                                                   ↑ orchestrates tsf (compile) + transcript-tester (run)
                                                   ↑ shipped via @sharpee/sharpee (authoring SDK) → bin on npm install
```

### CLI surface (initial)

`devkit build|bundle|test|test:npm|verify|clean|init|list` — plus `play` and
`watch` as needed. `test`/`play` take a location or a registered name.

### `@sharpee/bootstrap` public API (contract)

Three consumers depend on this surface, so it is fixed here:

```ts
// Resolve the story module file to require, entry-aware. Throws on traversal
// (entry containing '/', '\\', '..', or absolute) and on no candidate found.
function resolveStoryModulePath(location: string, entry?: string): string;

// Load + assemble a runnable game. Resolves the module, requires it, takes
// `story || default`, builds GameEngine + world + player + parser + language +
// perception, applies story.extendParser/extendLanguage, setStory, start.
function loadStory(location: string, opts?: { entry?: string }): Promise<LoadedGame>;

interface LoadedGame {
  engine: GameEngine;
  world: WorldModel;
  player: IFEntity;
  parser: Parser;
  language: LanguageProvider;
  execute(input: string): Promise<TurnResult>;   // run one command
  getOutput(): string;                            // captured text since last read
  // (superset of today's transcript-tester TestableGame; that type is replaced by this)
}
```

`resolveStoryModulePath` is the single home for entry resolution; no front-end
reimplements it.

### `~/.sharpee/devkit` memory format

A JSON file: `{ "stories": { "<name>": { "path": "<absolute path>" } } }`.
`devkit init <location> [--name X]` upserts an entry (default name = basename).
On lookup by name, devkit resolves the path and **errors if it no longer
exists** (stale registration is reported, never silently skipped); `devkit list`
flags stale entries. The file is machine-level, git-ignored, and rebuildable by
re-running `init` — losing it costs only the name shortcuts, never a build.

## Migration (phased; each independently shippable)

- **Phase 1 — `@sharpee/bootstrap`.** Create the package and implement
  entry-aware resolution + game assembly per the API contract above.
  **Atomic-completion contract:** Phase 1 is not done until **all three**
  former loaders — `transcript-tester/src/cli.ts`, `transcript-tester/src/fast-cli.ts`,
  **and** `scripts/bundle-entry.js` — route through bootstrap and contain no
  story-loading logic of their own. Updating only two leaves the bundle path
  silently broken (the failure mode that hid the unimplemented `entry:` header).
  Concrete edit set:
  - `packages/bootstrap/*` — new package (see registration below).
  - `transcript-tester`: `types.ts` (add `entry?: string` to `TranscriptHeader`),
    `parser.ts` (already captures `entry`; add validation warning), `cli.ts` +
    `fast-cli.ts` (delegate to bootstrap, thread `header.entry` at the
    per-transcript reload), `index.ts` (drop the local loader exports / re-export
    bootstrap as needed).
  - `scripts/bundle-entry.js` — replace the inline `loadStoryAndCreateGame` with
    bootstrap.
  - **bootstrap registration (Phase-1 task, not optional)** — the 6 points:
    `ts-forge.config.json`, `packages/sharpee/package.json`,
    `packages/sharpee/src/index.ts`, `packages/sharpee/tsconfig.json`, `build.sh`,
    root `package.json` (per the new-package checklist).
  Supersedes the standalone `entry:` plan
  (`docs/work/transcript-entry-support/plan-20260617-entry-header-support.md`),
  which holds the detailed resolution/threading design.
  *Delivers the `entry:` fix and eliminates the three-loader duplication.*
- **Phase 2 — `devkit test:npm`.** One parameterized npm consumer-test over any
  location; retire `npm-test/`, `npm-test-dungeo/`, `npm-test-familyzoo/`.
- **Phase 3 — `devkit build/bundle` + full build.sh replacement.** devkit
  orchestrates tsf for compile, produces the bundle and the three live targets,
  the location/`init`/`~/.sharpee/devkit` model, the parity gate; delete build.sh
  and the dead scripts after parity passes, and update CLAUDE.md + docs (AC-8) in
  the same cutover.

## Invariants

- A story is referable by raw location with zero machine state; `~/.sharpee/devkit`
  is convenience only.
- Exactly one story-loading implementation (`@sharpee/bootstrap`); no front-end
  hand-copies it.
- devkit depends on tsf and transcript-tester; never the reverse (no cycle).
- devkit asserts its build outputs exist (no silent `✓` on an empty/no-op build —
  the `.tsbuildinfo` failure class is precluded by design).
- build.sh is not deleted until the parity check passes.

## Acceptance Criteria

- **AC-1:** `@sharpee/bootstrap` is a published package; `cli.ts`, `fast-cli.ts`,
  and `bundle-entry.js` contain no story-loading logic of their own.
- **AC-2:** A transcript with `entry: v16` loads `dist/v16.js`; familyzoo
  `v16-scoring` passes via both `transcript-test` and the bundle path; `v01`–`v15`
  and dungeo unchanged.
- **AC-3:** `devkit test <location>` and `devkit test <name>` (after `init`) both
  run a story with no committed config.
- **AC-4:** `devkit test:npm <location>` reproduces the three retired harnesses'
  behavior over any story.
- **AC-5:** `devkit build` produces byte-identical artifacts to build.sh for the
  three live targets (parity gate) before build.sh is removed.
- **AC-6:** A no-op/empty build fails loudly (artifact assertion), not silently.
- **AC-7:** devkit ships its own test suite + a validation harness (real build +
  real transcript run + real npm consumer test against a fixture story).
- **AC-8:** at build.sh cutover, every reference to build.sh and the dropped
  flags (`-c shite`, `--runner`) in `CLAUDE.md`, package CLAUDE.md files, and
  `docs/` is updated to the `devkit` equivalents — no doc describes a deleted
  command.
- **AC-9:** `devkit build <story> --browser` emits a self-contained
  `dist/web/{story}/` bundle (platform + story in one optimized payload). Served
  as static files with no app server and an empty network cache, it boots and
  reaches the story's first turn with a **single fast load** — no piecemeal
  platform module fetches. The directory is portable (copy it anywhere static
  files are served and it runs).

## Tests required for AC closure

- bootstrap unit: entry resolution (file form, dir form, default, traversal
  rejection, nonexistent → throws).
- bootstrap integration: load + run a fixture story end-to-end.
- devkit integration (real-path): build → bundle → transcript run → npm consumer
  test against a fixture, all on production code paths (no stubs).
- parity harness: diff devkit vs build.sh outputs for the three targets.

## Constrains Future Sessions

- New build/test/run capabilities go in devkit, not new bash scripts.
- Story loading changes go in `@sharpee/bootstrap` only.
- Transcripts may pin a story sub-entry via `entry:`, resolved by bootstrap.
- No new committed story registry; locations + `~/.sharpee/devkit` are the model.

## Out of Scope

- Making devkit a generic standalone product (it is published, but Sharpee-specific).
- Rewriting tsf (devkit delegates compile/publish to it).
- `shite`, `--runner`, the `.sharpee` bundle format (dropped/deferred).
- Deleting `tools/shite/` / `dist/runner/` source (separate cleanup, to confirm).
- CI gates (per project direction, recurrence prevention stays local).

## Open Questions (resolve during implementation; non-blocking to acceptance)

1. **tsf ↔ arbitrary locations.** tsf's project list lives in
   `ts-forge.config.json`; a story can now be any location. Does devkit invoke
   tsf against the story's own `tsconfig` ad hoc, or run the story's own build
   script (familyzoo's is `tsc`)? Reconcile with the existing tsf project list.
2. **Parity-gate capture.** How build.sh's current outputs are captured/frozen to
   diff devkit against before deletion.

(bootstrap's 6-point registration was previously listed here; it is now a
Phase-1 task in the Migration section, not an open question.)

## Prior Art

- `tsf` / DevArch — productized tools with single entry, declarative config, own
  validation harness, versioned lifecycle. devkit follows that shape.
- `git init` / `npm init` — explicit registration of a location into tool state,
  vs directory-scanning convention.
