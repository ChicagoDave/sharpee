# ADR-187: devkit is author-only; the in-repo platform build is a separate process

## Status: ACCEPTED

## Date: 2026-06-22

## Supersedes

ADR-180 **Amendment 1**'s "one command, two depths" clause — the decision that the
installed author and the repo maintainer run the **same** location-aware `sharpee`
CLI. This ADR reverses that specific clause. The rest of ADR-180 (devkit exists, tsf
compiles / devkit orchestrates, `@sharpee/bootstrap` as the single loader, the
`--browser` self-contained target) stands.

## Context

ADR-180 Amendment 1 unified two audiences under one `sharpee` command, distinguished
at runtime by `detectMode()` (monorepo vs standalone) and `resolveStory().workspace`
(workspace member vs decoupled project). In practice that single command now carries
two unrelated toolchains:

- **In-repo / platform-maintainer build** — `commands/build.ts` (platform packages via
  the tsf pipeline + `pnpm --filter`), `bundle`, `clean`, `verify` (`tsf build --npm`
  + publish dry-run), `introspect`, `test:npm`. Audience: David, John, future Sharpee
  platform devs.
- **Author build** — `standalone/build.ts`, `standalone/build-browser.ts`,
  `init`, `init-browser`, `register`/`list`, `ifid`. Audience: an IF author building
  their own game in their own project against installed `@sharpee/*` packages.

The conflation has concrete costs:

1. **Two browser builds that drifted.** `commands/browser.ts` (in-repo) copies
   `<story>/assets/` into the bundle; `standalone/build-browser.ts` (author) does not.
   Same nominal feature, different behavior, decided by which audience's path you hit.
2. **A decoupled in-repo story silently uses the *author* toolchain.** `cli.ts`'s
   `build` dispatch routes an in-repo-but-not-workspace story (published deps — e.g.
   the Family Zoo tutorial) through `runBuildBrowserCommand`, the author path. So the
   book's own reference story builds via the no-asset path even though it lives in the
   repo — which is exactly why book QA found author audio assets never bundled
   (Ch 24/25/27).
3. **Location-sniffing dispatch is hard to reason about.** "Same command, two depths"
   means every behavior question becomes "in which mode, with which story kind?" The
   confusion this creates is the proximate trigger for this ADR.

Root cause: the platform-maintainer toolchain and the shipped author tool have
different audiences, lifecycles, and guarantees, and should not be one command that
decides what it is by sniffing its surroundings.

## Decision

**`@sharpee/devkit` is the author-facing tool only** — for IF authors building their
own games against installed `@sharpee/*` packages, whether their project lives outside
the monorepo or is a decoupled (published-deps, non-workspace) project inside it.

**In-repo platform and story-maintenance builds are a separate build process —
`repokit`** — owned by and intended for Sharpee platform developers (David, John,
future devs): building the platform packages (tsf pipeline + `pnpm --filter`), the CLI
bundle, `verify` (`tsf build --npm` + publish dry-run), `introspect`, `test:npm`, and
building the bundled example stories (Dungeo) for platform QA. (`repokit` ↔ `devkit`:
the in-repo toolchain vs the author toolchain.)

The split is by **audience**, not by location-sniffing:

- devkit never contains platform-maintainer build logic (`commands/build.ts`'s
  platform pipeline, `verify`, `introspect`, `test:npm`).
- The in-repo build is `repokit`, not devkit — a completely separate codebase with its
  own CLI; see Resolved decisions (R1) for its command surface.
- A decoupled author project that happens to live in-repo (the Family Zoo tutorial)
  is an **author** project and uses **devkit** — it is not a platform-maintainer
  build. This is already how `cli.ts` routes it; the difference is that devkit becomes
  the *only* tool that path uses, with author-correct behavior.

**Author asset bundling is devkit's job.** The author browser build copies the
project's `assets/` (audio, images) into the bundle so author-referenced paths
(`audio/x.mp3`, `images/y.png`) resolve. This is the single motivating defect that
must land for the book (Ch 27) to be honest, and it is unambiguously the author tool's
responsibility.

## Consequences

- ADR-180 Amendment 1's "one command, two depths" is withdrawn. The `sharpee` command
  becomes the author tool; the platform build gets its own entry.
- Each tool owns its **own** browser build (full separation, R1): devkit's (author)
  copies `assets/`; repokit's (workspace stories, e.g. Dungeo) is platform-internal.
  They are separate code, not one shared module — but separated by audience with clear
  ownership, so the old location-decided asset divergence is irrelevant: authors only
  ever hit devkit's asset-copying build.
- `./sharpee` (today a thin shim into devkit `cli.js`) is re-pointed: platform-dev
  commands go to the separate in-repo build; it no longer implies devkit.
- The book (written for the outside author) can document the author workflow against
  one tool with one set of guarantees — including asset placement (`assets/audio/…`).
- Clear ownership going forward: author capabilities land in devkit; platform-build
  capabilities land in the maintainer build; neither leaks into the other.
- Migration is real work: untangle `cli.ts`'s mode/workspace dispatch, relocate the
  platform-build commands, give the author browser build asset-copy parity, update
  CLAUDE.md / book build instructions / USAGE, and update ADR-180.

## Acceptance criteria

- **AC-1 — devkit is author-only.** `@sharpee/devkit` contains no platform-maintainer
  build logic: no platform-package pipeline (`pnpm --filter`/tsf orchestration of
  `packages/*`), no `verify` (`tsf build --npm` + publish dry-run), no `introspect`,
  no `test:npm`. Those exist only in `repokit`.
- **AC-2 — one author browser build, with assets.** There is a single author browser
  build, and it copies the project's `assets/` (audio, images) into the bundle. An
  author project referencing `audio/x.mp3` has that file present in
  `dist/web/<story>/` and resolving at runtime. (This is the motivating defect.)
- **AC-3 — no location-sniffing.** No build command decides its behavior by detecting
  monorepo-vs-standalone or workspace-vs-decoupled. devkit and `repokit` are distinct
  front doors chosen by the user, not by the tool inspecting its surroundings.
- **AC-4 — decoupled in-repo story uses devkit.** A decoupled in-repo author project
  (the Family Zoo tutorial: published `@sharpee/*` deps, non-workspace) builds via
  devkit with author-correct behavior, including asset bundling — not via the platform
  pipeline.
- **AC-5 — platform build intact under `repokit`.** Building the platform packages,
  the CLI bundle (`dist/cli/sharpee.js`), `verify`, `introspect`, `test:npm`, and the
  Dungeo QA build all work under `repokit`; nothing platform-side regresses.
- **AC-6 — docs follow the split.** `./sharpee` wrapper, root + per-package CLAUDE.md,
  the book's build instructions (Ch 25/31), and the devkit USAGE text point each
  audience at the right tool; no doc points the wrong audience at the wrong command.
- **AC-7 — ADR-180 updated.** ADR-180 Amendment 1's "one command, two depths" clause
  is marked superseded by this ADR.

## Tests

The build is an **owned integration** (this repo spawns it, ships its outputs), so
each criterion below is exercised on the real build, not a stub (DEVARCH 13a).

- **Author asset end-to-end (anchor, AC-2/AC-4).** A fixture/author project with
  `assets/audio/x.mp3` referenced as `audio/x.mp3` → run the devkit author
  `build --browser` → assert the file is copied into `dist/web/<story>/audio/x.mp3`
  and resolves when served (Playwright play reaches a turn where the asset is
  used/visible). Real path, no stub.
- **Platform build intact (regression, AC-5).** Run `repokit` end-to-end →
  `packages/*` compile, `dist/cli/sharpee.js` is present and loads (~170ms),
  `verify` (`tsf build --npm`) is clean, and the Dungeo walkthrough chain passes.
- **Decoupled-in-repo routing (AC-4).** Building the Family Zoo tutorial in-repo goes
  through devkit (author path, assets bundled), not the platform pipeline — assert by
  output shape (asset present; no platform-package compilation triggered).
- **Location-independence (AC-3).** The devkit author build produces equivalent output
  (same asset copy + bundle) for the same project whether invoked inside or outside
  the monorepo — proving behavior is project-relative, not location-decided.
- **Doc parity (AC-6).** A grep/check that no doc references a relocated command for
  the wrong audience (e.g. the book never tells an author to run a `repokit` command,
  and CLAUDE.md never tells a platform dev to run devkit's author build).

## Alternatives considered

- **Keep "one command, two depths," just fix the asset drift.** Add asset-copy to the
  author browser build and leave the unified CLI. Rejected: it patches the symptom but
  keeps the location-sniffing conflation that produced the drift; the next divergence
  is a matter of time, and the mental model stays muddy.
- **Merge the two browser builds into one shared module both paths call.** Rejected:
  this was the author's first instinct corrected in discussion — the two builds serve
  different audiences; merging them deepens the conflation rather than resolving it.

## Resolved decisions (2026-06-22)

All four open questions are resolved; this ADR is ready to ACCEPT.

**R1 — `repokit` and `devkit` are completely separate codebases**, each its own CLI
(`repokit` in `tools/repokit/`, unpublished; `devkit` stays `packages/devkit`,
published). **No shared command modules and no cross-dependency** — repokit does not
import devkit and devkit does not import repokit; each implements its full command
surface independently, duplicating the small overlap rather than sharing tool-code.
(Both may independently depend on the *published* platform libraries —
`@sharpee/bootstrap` loader, `transcript-tester` runner, `tsf` — which is using the
platform, not sharing tool-code.) Command allocation by audience:

| Command | Owner |
|---|---|
| `build` (platform packages, tsf + `pnpm --filter`), `bundle` (`dist/cli/sharpee.js`), `verify` (`tsf build --npm` + publish dry-run), `test:npm`, `clean` | **repokit** |
| `build` / `build --browser` (author project, **assets bundled**), `init`, `init-browser`, `register`, `list` | **devkit** |
| `test`, `play`, `introspect`, `ifid` (operate on a story by location) | **both — each its own implementation** over the published bootstrap/transcript-tester |

`test`/`play`/`introspect`/`ifid` exist in both because both audiences need them; under
full separation each tool carries its own implementation (a thin wrapper over the
published libs), not a shared module.

*Rationale for full separation:* `repokit` is the in-repo **proving ground** — new
build/test features are developed and smoke-tested in repokit first, then **explicitly
ported to devkit when hardened**. The duplication is a deliberate staging gate (repokit
upstream → devkit by hand), not accidental drift. A shared module would couple the
shipped author tool to in-progress platform-dev work; full separation keeps devkit
stable and makes promotion an explicit, reviewed act.

To make that promotion cheap, **each command/function is its own class in its own file**
(one class per file) in both tools; the CLI is a thin dispatcher. A feature is then a
self-contained portable unit — promoting it from repokit → devkit is copying one class
file (with audience-specific tweaks), not disentangling it from a monolith.

**R2 — `devkit` is purely project-relative.** It operates on a project (cwd or a
registered location); `detectMode()` and the workspace-vs-decoupled `resolveStory`
branching are removed from it — all monorepo knowledge lives in `repokit`. Mapping:
workspace members (Dungeo, `packages/*`) → repokit; decoupled projects (the FZ
tutorial, external authors) → devkit. The user picks the front door; there is no
auto-detection. **devkit emits a hint** when pointed at a workspace story ("that's a
workspace story — use `repokit`") rather than failing opaquely.

**R3 — wrappers (Option B).** `sharpee` / `./sharpee` = **devkit** (the author tool)
everywhere, consistent with ADR-180's author command; in-repo `./sharpee` builds the
decoupled author project (FZ). A new committed **`./repokit`** wrapper is the in-repo
platform entry. Both are thin shims (no logic in bash). Today's `./sharpee build
dungeo` becomes `./repokit build dungeo`; the doc migration is AC-6.

**R4 — split-first.** The full devkit/`repokit` separation lands *before* the book
asset work. The author asset-copy is **not** patched into the current structure as an
interim — it ships as part of the consolidated author browser build. The book (Ch 27)
stays paused until the split lands.

## Issues / Session

- Surfaced 2026-06-22 during book QA (Ch 24/25/27 web-client + media assets): author
  channel renderers and audio assets had no working path, traced to the conflated
  build CLI.
- Cross-references: ADR-180 (build/test devkit) and its Amendment 1; ADR-170
  (framework-free web UI); ADR-163/174 (channels / prose pipeline).
- Memory: `project_devkit_outside_repo_only`.
