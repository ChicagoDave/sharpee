# Plan: Split devkit (author) from repokit (in-repo platform build) — ADR-187

**Date**: 2026-06-22
**ADR**: [ADR-187](../../architecture/adrs/adr-187-devkit-author-only-split-inrepo-build.md) (ACCEPTED) — supersedes ADR-180 Amendment 1's "one command, two depths"
**Status**: NEAR DONE — Phases 0–4 done (split functional + docs migrated). Remaining: Phase 5 cutover verification (largely covered by per-phase gates) + header polish debt in repokit copies.

### Phase 4 — DONE (2026-06-22) [AC-6, AC-7]
- Root CLAUDE.md Build section: platform commands `./sharpee build…` → `./repokit build…`;
  documented the two-CLI split (`./repokit` platform / `./sharpee` author + redirect);
  `devkit build --zifmia` → `./repokit build --zifmia`.
- ADR-180: added a "Partially superseded by ADR-187" banner to Amendment 1 — reverses
  "one command, two depths" and reconciles Decision 5 + AC-9 (browser target: devkit
  author / repokit workspace) (AC-7 + plan-review fix).
- Book: **no change needed** — Ch 25/31 use `sharpee build` in the *author* sense, which
  is unchanged. Per-package CLAUDE.md: none referenced platform builds.
- **Polish debt (remaining):** repokit's copied-file headers still say "@sharpee/devkit"
  (NOT sed-safe — `repo.ts` has `@sharpee/devkit` as a package-name string); fix the
  Owner-context lines by hand in a later pass.

### Phase 3 progress
- **3a DONE (2026-06-22)** — `devkit/cli.ts` rewired author-only: `build` is now
  project-relative (cwd or registered name); a workspace story passed to `build` is
  **redirected to repokit** with a hint (ADR-187 R2); decoupled in-repo projects (FZ)
  still build via devkit. Removed the `bundle`/`clean`/`verify`/`test:npm` cases, the
  monorepo build branch, `parseBuild`/`parseTestNpm`, and the platform imports; USAGE +
  header updated. devkit builds clean; all 34 tests pass; `./sharpee build dungeo` →
  redirect hint; `./sharpee bundle` → unknown. Platform impl files remain as dead code
  (deleted in 3b).
- **3b DONE (2026-06-22) [AC-1]** — deleted devkit `commands/{build,bundle,verify,clean,
  test-npm,browser,zifmia}.ts` + their tests; stripped those exports from `index.ts`;
  trimmed `repo.ts` (removed `PLATFORM_PACKAGES`/`BUNDLE_ALIASES`/`BUNDLE_DTS`/`tsfBin` —
  monorepo-build config now repokit's; kept the resolution helpers cli.ts uses). Stood
  up a repokit vitest harness and relocated the 5 platform tests there (25 passed, 1
  skipped). devkit keeps its OWN `consumer-gen.ts` (+test) for its standalone-build
  integration gate (overlap duplicated, ADR-187 R1). devkit suite: 16 passed, 1 skipped;
  builds clean. `devkit/src/commands/` now = `introspect` + `register` only.
  Verified: `./sharpee bundle` → unknown; `./sharpee build dungeo` → repokit redirect;
  `./repokit` full surface + `ifid generate` real.

### Phase 2 progress
- **2a–2d DONE** — full platform cluster ported into repokit (verbatim impls + thin
  one-class-per-file Command wrappers): helpers `repo.ts`/`consumer-gen.ts`/`registry.ts`/
  `browser.ts`/`zifmia.ts`; commands `build`/`bundle`/`verify`/`test:npm`/`clean`/
  `introspect`/`ifid` + `test`/`play` (relocated as stubs). deps: `@sharpee/core` (ifid),
  `@sharpee/bootstrap` (introspect). repokit builds clean; `./repokit` lists all 9 real
  commands; `ifid generate` runs (real `@sharpee/core`); stubs return exit 2; devkit
  untouched. **Polish debt:** copied-file headers still say "@sharpee/devkit".
- **2e DONE (AC-5 gate, 2026-06-22).** `./repokit bundle` ✓; bundle loads ✓;
  `./repokit build dungeo` (full platform + story + bundle) ✓ "build complete"; Dungeo
  walkthrough chain ✓ **892 passed** (re-run — the first run hit the known thief/troll
  combat-RNG flakiness: one early death cascaded into ~474 grue/"can't see" failures;
  re-run clean per the flaky-walkthrough rule). repokit drives the full platform build
  end-to-end. Committed `af65cc75` (ports); AC-5 verification not a code change.

## Progress

- **Phase 0 — DONE (2026-06-22).** `tools/repokit/` scaffolded (private, unpublished,
  `@sharpee/repokit`); `./repokit` wrapper (thin bash shim → `tools/repokit/dist/cli.js`);
  `Command` contract (`src/commands/command.ts`, one class per file) + thin dispatcher
  (`src/cli.ts`) with the planned surface shown as `[Phase 2]`; added to
  `pnpm-workspace.yaml`. Builds clean (`tsc`); `./repokit` prints usage, planned commands
  report "not yet ported (Phase 2)", unknown commands error. `./sharpee`/devkit untouched.
  No platform-package changes (purely additive). Committed `961082ae`.
- **Phase 1 — DONE (2026-06-22) [AC-2].** devkit's author browser build
  (`standalone/build-browser.ts`) now copies `<project>/assets/` contents into
  `dist/web/` (skip dotfiles) so author media paths (`audio/x.mp3`) resolve; help text
  updated. The real-path `browser-build.test.ts` extended: places `assets/audio/ambience.mp3`
  + a `.DS_Store`, real build, asserts `web/audio/ambience.mp3` present with correct bytes
  and the dotfile skipped. Full devkit suite green (34 passed, 2 skipped). repokit keeps
  its own separate browser build (not merged).

**Sequencing**: split-first (ADR-187 R4) — this lands before the book Ch 27 asset work

## Goal

Separate the two audiences currently mashed into the location-aware `sharpee` CLI:
- **devkit** — the author tool (outside-repo authors + decoupled in-repo projects like the FZ tutorial). Purely project-relative.
- **repokit** — the in-repo platform/maintenance build tool (David, John, future platform devs).

Delivered against ADR-187 AC-1…AC-7, gated by its five real-path tests.

## Decided structure (David, 2026-06-22)

1. **`repokit` lives in `tools/repokit/`** — in-repo, **unpublished** (nothing published
   depends on it; contrast ADR-180's reason for devkit being in `packages/`).
2. **Completely separate codebases — no cross-dependency, no shared command modules.**
   repokit does not import devkit; devkit does not import repokit. Each implements its
   full command surface independently and **duplicates the small overlap** rather than
   sharing tool-code. Both may independently depend on the *published* platform libraries
   (`@sharpee/bootstrap`, `transcript-tester`, `tsf`) — that is using the platform, not
   sharing tool-code.
3. **Each tool owns its own browser build** — devkit's (author) copies `assets/`;
   repokit's (workspace stories, e.g. Dungeo) is platform-internal. Two separate builds,
   by audience; not one shared module.

**Why completely separate (the rationale):** `repokit` is the in-repo **proving ground** —
new build/test features are developed and smoke-tested in repokit first, then **explicitly
ported to devkit when hardened**. The duplication is a deliberate staging gate (repokit
upstream → devkit by hand), not accidental drift. A shared module would couple the shipped
author tool to in-progress platform-dev work; full separation keeps devkit stable and
makes promotion an explicit, reviewed act.

4. **One class per file.** Within each tool, every command/function is its own class in
   its own file (one class per file). This makes each feature a **self-contained portable
   unit** — promoting a hardened feature from repokit → devkit is copying a single class
   file (with audience-specific tweaks), not disentangling it from a monolith. The CLI
   entry is a thin dispatcher that instantiates and runs these command classes.

## Current layout (what moves where)

| File / area | Today | → |
|---|---|---|
| `commands/build.ts` (platform pipeline, tsf + `pnpm --filter`) | devkit | **repokit** |
| `commands/bundle.ts` (`dist/cli/sharpee.js`) | devkit | **repokit** |
| `commands/verify.ts` (`tsf build --npm` + dry-run) | devkit | **repokit** |
| `commands/test-npm.ts` | devkit | **repokit** |
| `commands/zifmia.ts` | devkit | **repokit** |
| `commands/clean.ts` (platform artifacts) | devkit | **repokit** |
| `repo.ts` (monorepo layout, `findRepoRoot`, `PLATFORM_PACKAGES`) | devkit | **repokit** |
| `commands/browser.ts` (in-repo browser) | devkit | **repokit** (its own browser build) |
| `standalone/build-browser.ts` (author browser) | devkit | **devkit** — gains `assets/` copy |
| `standalone/build.ts` (author project build) | devkit | **devkit** (project-relative) |
| `standalone/{init,init-browser,ifid,version-stamp}.ts` | devkit | **devkit** |
| `commands/register.ts`, `registry.ts` (`~/.sharpee/devkit`) | devkit | **devkit** |
| `commands/introspect.ts` | devkit | **both — own copy in each** |
| `test` / `play` (currently stub: "not yet implemented") | devkit | **both — relocated as stubs** (one each); real implementation is a separate effort, NOT part of this split |
| `cli.ts` `detectMode()` + workspace/decoupled `resolveStory` dispatch | devkit | **removed** (devkit project-relative; repokit owns monorepo logic) |

## Phases (each independently verifiable; AC-mapped)

### Phase 0 — Scaffold repokit (its own codebase)
- Create `tools/repokit/` (CLI bin `repokit`, `./repokit` wrapper shim — no bash logic).
- repokit is a standalone codebase: **no shared modules with devkit**. It will receive
  the in-repo command files moved out of devkit (Phase 2); any overlap (introspect,
  `test`/`play` wrappers, ifid) is **duplicated**, not shared. Both tools depend only on
  published libs (`@sharpee/bootstrap`, `transcript-tester`, `tsf`).
- **`test`/`play` are relocated as stubs only** — this split relocates/consolidates
  existing behavior; implementing the `test`/`play` stubs is NEW capability and is a
  separate effort, out of scope here (see Out of scope).
- **One class per file:** each command is its own class file; the CLI is a thin
  dispatcher. (Phase 2 should also refactor the *existing* devkit commands it leaves
  behind into this shape, so author commands are equally portable units.)
- No behavior change yet; both CLIs compile.

### Phase 1 — Author browser build copies assets [AC-2]
- devkit's author browser build (`standalone/build-browser.ts`) gains the `assets/` copy
  step (skip dotfiles) so author audio/images bundle. repokit keeps its **own separate**
  browser build for workspace stories — two builds by audience, not merged.
- **Test (anchor):** fixture project with `assets/audio/x.mp3` referenced as
  `audio/x.mp3` → devkit `build --browser` → asset present in
  `dist/web/<story>/audio/x.mp3` and resolves when served (Playwright reaches a turn that
  uses it). Real path, no stub.

### Phase 2 — Move platform logic to repokit [AC-1, AC-5]
- **Sequencing refinement (2026-06-22):** Phase 2 **copies** the platform cluster into
  repokit and verifies it (AC-5); **removal from devkit + the devkit-cli rewire move to
  Phase 3.** Reason: `devkit/cli.ts` imports `runBuild`/`runBundle`/etc., so removing them
  mid-Phase-2 breaks devkit's compile — and that rewire is Phase 3's "make devkit
  project-relative" work. Copy-then-verify-then-remove is safer and matches ADR-187's
  "duplicate the overlap during transition." devkit still ends with no platform logic
  (at Phase 3); AC-1 unaffected.
- Port build/bundle/verify/test-npm/zifmia/platform-clean + the in-repo browser build
  + `repo.ts`/`consumer-gen.ts` into `tools/repokit`. repokit surface: `build` (platform),
  `bundle`, `verify`, `test:npm`, `clean`, `build --browser` (workspace stories), + its
  own `test`/`play`/`introspect`/`ifid`.
- **Test (regression, AC-5):** run repokit end-to-end → `packages/*` compile,
  `dist/cli/sharpee.js` present and loads (~170ms), `verify` (`tsf build --npm`) clean,
  Dungeo walkthrough chain passes. **Gate: must pass before Phase 3.**

### Phase 3 — Make devkit project-relative [AC-3, AC-4]
- Strip `detectMode()` + workspace/decoupled `resolveStory` branching from devkit `cli.ts`.
  devkit operates on cwd / registered location only.
- Add the **"that's a workspace story — use `repokit`" hint** (R2) instead of opaque failure.
- devkit surface: `build` / `build --browser` (author, assets), `init`, `init-browser`,
  `register`, `list`, + shared `test`/`play`/`introspect`/`ifid`.
- **Tests:** AC-4 — FZ tutorial builds via devkit (author path), assets bundled, no
  platform-package compilation triggered. AC-3 — location-independence: devkit produces
  equivalent output for the same project inside vs outside the repo.

### Phase 4 — Wrappers + docs [AC-6, AC-7, R3]
- `./sharpee` wrapper → devkit (author); new `./repokit` wrapper → repokit. Thin shims.
- Doc migration: CLAUDE.md (`./sharpee build dungeo` → `./repokit build dungeo`; clarify
  devkit = author), per-package CLAUDE.md, book Ch 25/31 build instructions, USAGE text in
  both CLIs.
- ADR-180: mark Amendment 1's "one command, two depths" superseded by ADR-187 (AC-7).
  **Also reconcile ADR-180 §Decision 5 + AC-9** — both attribute `devkit build <story>
  --browser → dist/web/{story}/` to devkit for *any* story; post-split the browser
  target is **devkit for author projects, `repokit` for workspace stories** (Dungeo).
  Update those clauses too, or ADR-180 stays internally inconsistent.
- **Test (AC-6):** doc-parity check — no doc points the wrong audience at the wrong command
  (book never tells an author to run `repokit`; CLAUDE.md never tells a platform dev to run
  devkit's author build).

### Phase 5 — Cutover verification
- Run all five ADR-187 tests together: author-asset e2e, platform-build intact,
  decoupled-routing, location-independence, doc parity. Confirm AC-1…AC-7.

## Acceptance gate (ADR-187)

- [ ] AC-1 devkit has no platform-maintainer logic (no platform build/verify/test:npm/introspect-of-platform).
- [ ] AC-2 one author browser build, bundles `assets/`; author audio resolves.
- [ ] AC-3 no location-sniffing; user picks the front door.
- [ ] AC-4 FZ tutorial builds via devkit with assets.
- [ ] AC-5 platform build (packages, bundle, verify, test:npm, Dungeo QA) intact under repokit.
- [ ] AC-6 docs follow the split (CLAUDE.md, book, USAGE).
- [ ] AC-7 ADR-180 Amendment 1 marked superseded.

## Risks / notes

- **No cycle:** enforce repokit → devkit one-way; devkit must not import `tools/repokit`.
  devkit stays published; repokit unpublished.
- **Don't regress the platform build during the move** — Phase 2 regression gate before
  Phase 3; preserve the ADR-180 tsf/build.sh parity already achieved.
- **Decoupled in-repo dep resolution:** the FZ tutorial resolves `@sharpee/*` from its own
  `node_modules` (published); devkit's project-relative build must keep working in-repo.
- **`./sharpee` semantics flip** (now author/devkit, was platform): expected churn for
  platform devs; the Q2 hint + AC-6 doc migration cover it. No back-compat shim (project
  stance).
- **Book Ch 27 unblocks only after this lands** (R4 split-first): the asset section + the
  paused Ch 25/FZ renderer verification resume post-cutover.

## Out of scope

- The book Ch 27 asset section (follows this; R4).
- Any new build capability beyond relocating/consolidating existing behavior.
- Publishing repokit (it is an in-repo dev tool).
