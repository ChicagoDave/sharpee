# Spec — Sharpee build/test devkit (productization)

**Date**: 2026-06-17
**Status**: DRAFT SPEC — convergence doc, pre-ADR. Decisions in §7 must be
resolved before this becomes an ADR and any code is written.
**Scope decision (set)**: a **Sharpee-internal, tested devtool package** — not a
published product. Owns build/test/verify orchestration.
**Origin**: session 90c6c2. A string of build/test fixes (tsbuildinfo no-op,
clean drift, dead `publish:beta`/`npm-latest.sh`, the unimplemented `entry:`
header) revealed the tooling is accreted bash + copy-paste, not a product.

---

## 1. Problem

The **build** half is productized — `tsf` (`@davidcornelson/tsf`) is a real,
owned, published compiler/publisher. The **bundle + story-build + transcript-run
+ npm-verify + publish-verify** half never was. Concrete smells:

- **Three hand-copied story loaders** — `transcript-tester/src/cli.ts`
  (`loadStory`), `transcript-tester/src/fast-cli.ts` (`loadStoryAndCreateGame`),
  and `scripts/bundle-entry.js` (inline copy). Guaranteed drift; the
  unimplemented `entry:` header is a direct symptom (a fix must be written three
  times).
- **`build.sh` is a ~1,100-line untested bash monolith** doing versioning,
  package build, genai-api gen, bundling, story build, and 4+ client builds. The
  silent `.tsbuildinfo` no-op lived here.
- **Dead/stale scripts, no owner** — `publish:beta` (just fixed),
  `npm-latest.sh` (just deleted), `pack-release.sh` (references the deleted
  `text-service`, hardcodes `0.9.60-beta`).
- **Three near-duplicate npm consumer harnesses** — `npm-test/`,
  `npm-test-dungeo/`, `npm-test-familyzoo/`, same shape copied.
- **Unenforced conventions** — `entry:` headers authored into transcripts that no
  runner reads.

Root cause: no single owner, no config, no self-tests for the layer that builds
and tests everything.

## 2. Goal

A single Sharpee-internal devtool package (**working name `@sharpee/devkit`**)
that owns build/test/verify orchestration with **one** story loader, is
config-driven, and is **tested in its own right** — the same "hard app" shape as
DevArch (single entry, declarative config, own validation harness, versioned).

## 3. Boundaries

**devkit OWNS (orchestration + test):**
- One entry-aware `StoryLoader`/runner — the single source all front-ends call.
- Transcript test execution.
- npm consumer-test, parameterized over any story (collapses the three
  `npm-test-*` dirs).
- Bundle assembly (`dist/cli/sharpee.js`).
- Build orchestration across packages + stories.
- Publish verification (dry-run of the npm output).

**devkit DELEGATES to `tsf` (compiler/publisher — keep as-is):**
- TypeScript compilation (local/esm/npm targets).
- npm publish.
- devkit calls tsf; it does **not** re-implement compilation.

**Out of devkit (for now):** story game logic, the runtime packages themselves.

**tsf vs devkit, one line:** tsf compiles and publishes; devkit orchestrates,
bundles, and tests. Clean split — no overlap.

## 4. Proposed CLI surface

```
devkit build      [--story X] [--skip pkg]     # orchestrate package+story build (delegates compile to tsf)
devkit bundle     [--story X]                  # assemble dist/cli/sharpee.js
devkit test       <transcripts...> [--chain]   # run transcripts (the ONE runner, entry-aware)
devkit test:npm   --story X [--local|--registry]  # npm consumer test, any story
devkit verify                                   # tsf build --npm + publish dry-run
devkit clean                                    # build-artifact hygiene (tsbuildinfo, dist, dist-esm)
```

The existing `node dist/cli/sharpee.js --test/--play` stays as the fast runtime
entry, but its transcript path calls devkit's shared loader instead of an inline
copy.

## 5. Architecture sketch

- Package at `packages/devkit` (or `tools/devkit` — §7).
- A single `StoryLoader` module, entry-aware (resolves `dist/<entry>.js` →
  `dist/<entry>/index.js` → default `dist/index.js`). cli.ts, fast-cli.ts, and
  `bundle-entry.js` all import it — no hand-copies.
- Config-driven (`sharpee.devkit.json` or reuse/extend an existing config — §7).
- Programmatic API + thin CLI.
- Self-tested: unit tests (loader resolution, config) + integration tests (real
  build, real transcript run, real npm consumer test), plus a validation harness
  mirroring DevArch's `run.sh`.

## 6. Phased migration (each phase independently shippable)

- **Phase 0** — this spec → ADR once §7 is resolved.
- **Phase 1** — extract the single entry-aware `StoryLoader`; point all three
  front-ends at it. *Delivers the `entry:` fix correctly and kills the 3-copy
  bug.* Smallest, highest-leverage step; foundation for the rest.
- **Phase 2** — generalize the npm consumer-test into one parameterized command;
  retire `npm-test/`, `npm-test-dungeo/`, `npm-test-familyzoo/`.
- **Phase 3** — move `build.sh` orchestration into `devkit build`/`bundle`
  (delegating compile to tsf); retire dead scripts (`pack-release.sh`, etc.).
- **Phase 4** — client build targets (browser/runner/zifmia) as devkit targets,
  if in scope (§7).

## 7. Decisions needed (resolve before ADR)

1. **Package location/name** — RESOLVED (2026-06-17): `tools/devkit`, package
   `@sharpee/devkit`, CLI bin `devkit`. Rationale: it's tooling not a runtime
   library; `tools/` keeps it out of the publishable graph (no accidental npm
   publish, no dep-graph contamination) and mirrors `tools/zifmia`; still a
   normal pnpm workspace member.
2. **build.sh disposition** — RESOLVED (2026-06-17): **full replacement.** devkit
   fully owns the build pipeline; build.sh is deleted at cutover (no shim, no
   delegation to it). Safeguard: a one-time parity check (devkit outputs vs
   build.sh outputs) must pass before build.sh is deleted, so no behavior is
   silently lost. Implication: devkit must reach parity on everything build.sh
   does — package build (via tsf), genai-api gen, bundling, version stamping, and
   client builds — which pre-constrains Decision 5 toward "devkit owns client
   builds."
3. **Shared loader home** — RESOLVED (2026-06-17): the loader is **its own
   published package `@sharpee/bootstrap`** (`packages/bootstrap`), not folded
   into transcript-tester or devkit. It resolves the story module (entry-aware:
   `dist/<entry>.js` → `dist/<entry>/index.js` → `dist/index.js`) and assembles
   GameEngine + world + player + parser + language + perception into a runnable
   game. Layering: bootstrap depends only downward on runtime libs; transcript-
   tester, the bundle (`--play`/`--test`), and devkit all depend on bootstrap (no
   cycle). Consequence: a new published `@sharpee/*` package — needs the 6-point
   new-package registration and joins the publish set. The `entry:` fix lands as
   part of building bootstrap and routing all three former loaders through it.
4. **Config / story registry** — RESOLVED (2026-06-18): **a story is just a
   location; no committed config, no directory convention.** devkit targets a
   path directly (`devkit build <path>`, `devkit test <path> …`) — the canonical,
   reproducible input requiring no machine state. `devkit init <location>`
   optionally registers a name→path mapping into a **user-level memory at
   `~/.sharpee/devkit`** (machine-level, not committed; can point at stories
   anywhere, incl. other repos) so a story can later be referenced by name;
   `devkit list` shows registered stories. The memory is pure convenience over
   the location — never a source of truth, nothing requires `init`. Consequences:
   no committed `devkit.config.json` (so no second repo-level registry to drift
   against tsf's project list); mirrors `~/.devarch` tooling pattern. Nothing is
   bolted onto `ts-forge.config.json`.
5. **Client builds / targets** — RESOLVED (2026-06-17): devkit covers only the
   **three live targets** — CLI platform bundle, `browser` (single-player static
   client), `zifmia` (ADR-177 multi-user server). **Dropped:** `shite` (abandoned
   parts bin) and `--runner` (dormant legacy interpreter) — devkit will not build
   them; their build entry points die with build.sh. **Deferred:** the `.sharpee`
   story-bundle format — reconstructable later, out of initial scope. (Dropping
   from devkit's build ≠ deleting `tools/shite/` / `dist/runner/` source; that's a
   separate cleanup to confirm.) For `browser`/`zifmia`, devkit likely
   orchestrates their existing builds (zifmia has its own Dockerfile +
   `mac-release.sh`) rather than owning the logic — see Decision 6 / future detail.
   This shrinks the Decision-2 parity surface to these three targets.
6. **The bundle** — RESOLVED (2026-06-18): **keep** `dist/cli/sharpee.js` (the
   ~170ms platform bundle earns its place), but as devkit's **internal fast
   engine**, not the user-facing entry. `devkit` is the single front door
   (`devkit test <loc>`, `devkit play <loc>`); devkit produces the bundle and
   runs against it for speed. `bundle-entry.js`'s hand-copied loader is replaced
   by `@sharpee/bootstrap`. Raw `node dist/cli/sharpee.js` survives as a low-level
   entry devkit invokes / power-user escape hatch, but is no longer the blessed
   path.

## 8. Non-goals

- Not a published/standalone product (scope decision: internal).
- Not a rewrite of tsf — devkit orchestrates, tsf compiles.
- Not changing story/game logic or runtime package boundaries.

## 9. Validation approach (DevArch parallel)

devkit ships with its own test suite and a validation harness that runs a real
build + a real transcript run + a real npm consumer test against a fixture
story — so the tool that tests Sharpee is itself tested. No bash path goes
untested the way `build.sh` is today.
