# ADR-185: The IDE is a standalone authoring tool (npm platform, no platform build)

## Status: ACCEPTED

## Date: 2026-06-20

## Context

The Sharpee IDE (`tools/ide/`) was prototyped *against the monorepo*: it opens the
sharpee repo, lists stories under `stories/`, and builds them with `./sharpee build <story>`,
which recompiles all ~25 `@sharpee/*` platform packages from source in dependency order on
every build. Introspection (ADR-184) was likewise wired to the monorepo bundle
(`scripts/bundle-entry.js` → `dist/cli/sharpee.js --introspect`). This drove a proposal to
track which packages changed and pass `--skip <pkg>` to avoid rebuilding the unchanged platform.

That proposal solves a problem the IDE should not have. **The IDE's audience is interactive-
fiction authors working on their own story projects *outside* the monorepo — not contributors
editing the platform.** An author's project is an ordinary npm package that depends on the
published `@sharpee/*` packages; the platform is a prebuilt dependency in `node_modules`, never
recompiled. The monorepo-source build (and therefore the entire `--skip` change-tracking idea)
is a contributor concern the IDE does not serve.

The supporting facts (verified 2026-06-20):

- `@sharpee/sharpee`, `@sharpee/bootstrap`, `@sharpee/devkit` are **published at 1.0.0** on the
  public npm registry; `@sharpee/devkit` ships the `sharpee` bin (`dist/cli.js`).
- The standalone build (`packages/devkit/src/standalone/build.ts`) already compiles **only the
  story** (`npx tsc` + `esbuild … --external:@sharpee/*`) and resolves every `@sharpee/*` from
  `node_modules`. **The platform is never compiled.** This is the model.
- ADR-180 Phase U2 set the direction of a standalone/global `sharpee` CLI for authors; this ADR
  commits the IDE to it.

This decision sets the IDE's foundational project model and build strategy, so it is recorded as
an ADR. It refines ADR-184 (which placed `--introspect` on the monorepo bundle) for the author
target, and supersedes the unimplemented `--skip` change-tracking proposal.

## Decision

**The IDE operates exclusively on standalone, npm-based story projects and never builds the
Sharpee platform.** The platform is a prebuilt npm dependency.

1. **Project model: one project = one story.** The folder the author opens *is* the story
   project (its own `package.json`, `src/`, `tsconfig.json`, depending on `@sharpee/sharpee` and,
   as a dev dependency, `@sharpee/devkit`). The IDE does not scan `packages/` or `stories/`; there
   is no monorepo mode.

2. **Build = the project's installed `sharpee build`, run in the project directory.** It compiles
   the story's `src/` against the `node_modules` platform and emits the `.sharpee` bundle +
   browser client. No platform packages are compiled. **`--skip`/platform change-tracking is
   abandoned** — there is nothing to skip.

3. **Introspection = a new `sharpee introspect` command on the devkit CLI**, run in the project
   directory. It loads the project's compiled story (`dist/index.js`) and the `node_modules`
   platform, assembles the world via `@sharpee/bootstrap` (**reusing `assembleGame`**, exactly as
   ADR-184's monorepo path does — not a re-implementation of world construction), calls
   `bootstrap.buildManifest`, and writes the `@sharpee/ide-protocol` `ProjectManifest` JSON to
   stdout (status to stderr).
   This is the author-mode equivalent of ADR-184's monorepo-bundle `--introspect`; the manifest
   schema (`ide-protocol`) is identical, so the IDE's decoder is unchanged.

4. **The IDE invokes the project's installed CLI, not the monorepo.** `sharpee` is resolved from
   the project (`node_modules/.bin/sharpee`, `npx sharpee`, or a global install) and run with the
   project root as the working directory.

5. **The consumer/render stack is retained as-is** (mode-agnostic): the Swift `ProjectManifest`
   decoder, `ProjectStructure`, the project-tree views, the Files|Structure toggle, and
   `EntitySourceIndex` (which scans the project's own `src/`).

### Author project dependency surface (verified 2026-06-20)

The canonical author project — what `sharpee init` scaffolds (`packages/sharpee/templates/story/`)
— declares a **single runtime dependency, `@sharpee/sharpee`**, and its story imports **only** from
`@sharpee/sharpee`. The umbrella declares the entire `@sharpee/*` runtime as its own dependencies,
so one install brings the whole platform into `node_modules`. Therefore author-mode `build` and
`introspect` have **no sub-package-resolution problem**: one platform dependency, imported from one
specifier. (The monorepo reference stories `dungeo`/`thealderman` import sub-packages like
`@sharpee/world-model` directly — but those are *not* author projects and are not the IDE's target.)

Introspection additionally needs the **`sharpee` CLI** (the `@sharpee/devkit` bin) available in the
project — the same prerequisite `build` already has. Verification (2026-06-20) found the scaffold is
**not 1.0-correct**; author mode requires fixing it first:

- **The template is not shipped in the published package.** It lives in `packages/sharpee/templates/`,
  but `@sharpee/devkit` (which owns `init`) ships only `dist` + `fixtures` in its `files`, so a
  published devkit carries **no template** and `sharpee init` from npm cannot find it. Move the story
  template into `@sharpee/devkit` and add it to the package's `files` so the scaffold ships with the
  CLI.
- **The platform version must be injected, not hardcoded.** `init` substitutes only
  `STORY_ID`/`TITLE`/`AUTHOR`/`DESCRIPTION`; the dependency is a stale literal (`@sharpee/sharpee`
  `^0.9.61-beta`, which the published `1.0.0` does not satisfy). Add a version placeholder filled from
  devkit's own release version (devkit and the platform publish in lockstep), so a scaffolded project
  always pins the matching `@sharpee/sharpee` **and** `@sharpee/devkit`.
- **No `npx`** (removed in 1.0). The template script uses `npx sharpee build-browser`, and the
  standalone paths (`build.ts`, `build-browser.ts`, `init.ts`, `test-npm.ts`) still call
  `npx tsc`/`npx esbuild`/`npx serve`/`npx transcript-test`. Scaffolded scripts invoke `sharpee`/`tsc`
  directly — devkit + typescript as devDeps resolve on the npm-script PATH — and the straggler `npx`
  calls in the standalone toolchain are removed.

**The IDE uses this same scaffold.** Creating a new story runs the installed `sharpee init`; the IDE
builds/introspects by invoking the project's local `sharpee` bin (`node_modules/.bin`) — exactly what
the template's scripts do. One scaffold definition, shipped in `@sharpee/devkit`, serves both CLI
authors and the IDE.

## Affected packages / contracts

- **`@sharpee/devkit`** — add an `introspect` subcommand to the CLI (`src/cli.ts` →
  `dist/cli.js`); add a runtime dependency on `@sharpee/bootstrap`. The command contract:
  `sharpee introspect` (in a story project) → loads `dist/index.js`, builds the world, emits a
  `ProjectManifest` on stdout; non-zero exit with a message if `dist/index.js` is absent (story
  not built) or the project is not a Sharpee story.
- **`@sharpee/bootstrap`** — already exports `buildManifest` (ADR-184) and depends on
  `@sharpee/ide-protocol`; the published 1.0.0 predates both. No new code; it must be republished.
- **`@sharpee/ide-protocol`** — the manifest wire types; currently unpublished. Must be published
  so `bootstrap` (and thus `devkit`) resolves it in an author's `node_modules`.
- **`tools/ide`** — realign the monorepo-shaped wiring to author mode (see Consequences). No
  change to the manifest/structure/tree/source-index types.
- **`@sharpee/devkit` story scaffold** — own the story template inside devkit and ship it (add to
  `files`); inject the platform version at `init` time (a placeholder replacing the hardcoded
  `@sharpee/sharpee` literal); the template declares `@sharpee/sharpee` **and** `@sharpee/devkit` at
  the injected version; remove `npx` from the template scripts and the standalone build/init/test
  paths (1.0 decision). This makes `sharpee build`/`introspect` runnable in a freshly-scaffolded
  project.
- **Out of scope:** `@sharpee/sharpee` (the umbrella) — `ide-protocol` is deliberately not
  re-exported through it (IDE tooling, not authoring API), so it needs no republish for this. (Its
  *template* is updated, but the package's own code/exports are unchanged.)

## Publishing

This feature ships only when these are on npm (a single coordinated publish — additive, so no
break and no migration phase):

1. **Publish `@sharpee/ide-protocol`** (first publish, `1.0.0`).
2. **Republish `@sharpee/bootstrap`** at **`1.0.1`** — now exports `buildManifest` and depends on
   `@sharpee/ide-protocol`.
3. **Republish `@sharpee/devkit`** at **`1.0.1`** — new `introspect` command, depends on
   `@sharpee/bootstrap`.

(Updated packages bump to `1.0.1` — patch, not minor; new packages first-publish at `1.0.0`.)

The republished `@sharpee/devkit`'s `@sharpee/bootstrap` dependency range (and `bootstrap`'s
`@sharpee/ide-protocol` range) must resolve to the **newly published** versions, so a fresh
`npm install` pulls `buildManifest` + the wire types — not the old 1.0.0 `bootstrap` that lacks
them. The `sharpee init` scaffold ships **inside** the republished `@sharpee/devkit` (its `files`) and
**injects** the current platform version at init time — replacing the stale `^0.9.61-beta` literal —
so a fresh `sharpee init` from the new devkit produces a project pinned to the just-published
platform, with no hardcoded version to drift.

Author projects gain introspection by `npm update @sharpee/devkit` (which pulls the new
`bootstrap` + `ide-protocol` transitively). Authors update on their own schedule; nothing forces
it. `./sharpee verify` (tsf `--npm` + publish dry-run) gates the publish.

## Consequences

- **Monorepo support in the IDE is explicitly out of scope.** Platform/reference-story work
  (editing the engine, `stories/dungeo`, `thealderman`) is done with the repo's CLI and tests
  directly, not through the IDE.
- **`--skip` and build change-tracking are dropped** — they only ever helped the monorepo build,
  which the IDE no longer performs.
- **Build is fast and bounded** — compiling one story package against a prebuilt platform — with
  no need for incremental-platform machinery.
- **Realignment work in `tools/ide`** (follow-up): `BuildRunner` runs the project's `sharpee
  build` in the project dir (not `./sharpee build` at a monorepo root); `IntrospectionRunner`
  runs `sharpee introspect` (not the monorepo bundle); `buildSucceeded` treats the project root as
  the story (no `stories/`/`tutorials/` resolution); project/story detectors collapse to
  "the open project." The pieces built against the monorepo this session were a stepping stone.
- **The monorepo bundle's `--introspect`** (ADR-184, `scripts/bundle-entry.js`) remains for
  in-repo testing but is not the IDE's path; the `ide-protocol` schema keeps both emitters honest.
- **A new published package (`@sharpee/ide-protocol`)** enters the platform's release surface and
  is versioned with the rest.

## Acceptance

- `sharpee init` from an **npm-installed** `@sharpee/devkit` (not the monorepo) scaffolds a project
  whose `@sharpee/sharpee` + `@sharpee/devkit` versions are injected to the installed release (a
  satisfiable range), with **no `npx`** in its scripts; `sharpee --help` in that project lists
  `introspect`. (Verifies the template ships in the package and the version is injected, not stale.)
- An author project scaffolded by `sharpee init` (single `@sharpee/sharpee` runtime dep, story
  importing only from `@sharpee/sharpee`) **builds with zero platform-package compilation** (only the
  story compiles; `@sharpee/*` stay external) — verified by a real-path test that builds a fixture
  project and asserts no `@sharpee/*` package was recompiled.
- `sharpee introspect` run in that built project emits a `ProjectManifest` (`schemaVersion: 1`)
  whose entities match the story's world — a real-path test (devkit's npm-consumer staging,
  `test:npm`) drives the **installed** command, not a monorepo stub.
- `sharpee introspect` exits non-zero with a clear message when `dist/index.js` is absent.
- The IDE opens a standalone project, builds it, and populates the project tree from the
  installed `sharpee introspect`; the full IDE suite stays green.
- `@sharpee/ide-protocol` is published; `@sharpee/bootstrap` and `@sharpee/devkit` are
  republished with the new exports/command; `./sharpee verify` passes.

## Alternatives rejected

- **Dual-mode IDE (monorepo + standalone).** Doubles the build/introspect surface to serve an
  audience (contributors) the IDE is not for. Rejected — single author mode.
- **`--skip` platform change-tracking.** Optimizes a build the IDE should not run. Moot once the
  platform is an npm dependency. Abandoned.
- **Bundle the platform into each story build.** Recompiles/copies the platform per project,
  reintroducing the very cost npm dependencies eliminate. Rejected; `--external:@sharpee/*` is the
  point.

## Session

Produced 2026-06-20 (session `822214`) after ADR-184's P3 introspection landed on `main`.
Prompted by David's correction that the IDE targets authors outside the monorepo, not monorepo
work. Refines ADR-184 (introspection entry point for author mode), builds on ADR-180 Phase U2
(standalone `sharpee` CLI), and supersedes the unimplemented `--skip` proposal. Implementation
(devkit `introspect` command, the three-package publish, the `sharpee init` template fix, and the
`tools/ide` realignment) is a `packages/`-touching follow-up to be done after this decision.

Revised the same session after a `/adr-review` that flagged the author-project dependency surface
as unspecified. Verification of `packages/sharpee/templates/story/` confirmed the canonical model
(umbrella-only: one `@sharpee/sharpee` dep, imports from it). David then corrected the scaffold
approach: the template must ship **inside** the npm package and be current for 1.0 and the IDE.
Further verification found the scaffold is not 1.0-correct — `@sharpee/devkit`'s `files` ships no
template (so a published `init` has nothing to copy); the `@sharpee/sharpee` dep is a stale literal
(`^0.9.61-beta`) with no version injection; and `npx` (removed in 1.0) persists in the template and
across `build.ts`/`build-browser.ts`/`init.ts`/`test-npm.ts`. The corrected approach (devkit owns +
ships the template, injects the release version, drops `npx`, and the IDE uses the same scaffold) is
now recorded, along with the `assembleGame` reuse and publish version-range pinning.
