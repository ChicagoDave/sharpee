# Plan — Unify the build process under the `sharpee` command (devkit engine)

**Date:** 2026-06-18
**Branch:** (proposed, phased — see below)
**Supersedes:** the narrow `plan-20260618-devkit-entry.md` (entry-ergonomics only).
**Carries:** an **ADR-180 amendment** (records the command rename, devkit-as-engine,
Decision 1 affirmed, Open Q1 resolved, sharpee-CLI consolidation).

## Intent

**One build process, one command, two depths.** ADR-180's goal was to unify build/test
orchestration; the missing realization is that the *installed author* and the *repo
author* should run the **same tool** — the repo author simply has additional
experienced-developer steps. The user-facing command is **`sharpee`** (the brand /
front door), backed by **`@sharpee/devkit`** as the internal engine.

- **Installed author** (global `sharpee` CLI installed once; story = their project, which
  depends on `@sharpee/sharpee` for imports): `sharpee build` compiles *their* story against
  published `@sharpee/*` and emits the browser / `.sharpee` outputs. No platform-package build.
- **Repo author / maintainer** (monorepo): the *same* `sharpee build`, plus the deeper
  steps — platform packages in dependency order, the CLI bundle, `--skip`, parity,
  `verify`/publish.
- **Location-aware dispatch:** a workspace (pnpm-workspace.yaml + story is a workspace
  package) → full monorepo build; a standalone project → just the author's story.

## Naming / packaging / delivery (confirmed with David)

The **Claude Code model**: a distinct, globally-installed CLI (`npm i -g @anthropic-ai/claude-code`
→ bare `claude`), separate from the importable SDK. Author flow becomes
`npm i -g @sharpee/devkit` (and/or an installer) → `sharpee init`/`build`/`test` anywhere —
**no `npx`, no reliance on a project-local `.bin`.**

- **Command = `sharpee`**, delivered as a **distinct, globally-installed CLI**.
- **Install target = the existing `@sharpee/devkit`** (reused), bin **`sharpee`** — package
  name ≠ command, exactly like `claude-code`→`claude`. It holds the engine + all commands;
  build-only deps (tsf, transcript-tester) live here, never in the library.
- **`@sharpee/sharpee` becomes a pure library/SDK** — **drop its CLI bin** (`packages/sharpee/
  src/cli/*`). It is the thing you `import`, not the thing you run. (Resolves the
  package-vs-execution-role overload.)
- **Reverse the 3d umbrella wiring:** remove the `@sharpee/sharpee` → `@sharpee/devkit`
  dependency. The CLI installs *separately/globally*, NOT as a transitive bin of the library.
  devkit must not depend on `@sharpee/sharpee` (one-way; no cycle).
- Repo entry = a committed **`./sharpee`** wrapper (or a global/linked dev build); installed
  entry = the global `sharpee` command. The `devkit` bin is renamed to `sharpee`.
- **Deferred:** Claude-style self-update (`sharpee update`) — out of initial scope.

## Unified command surface (proposed)

| Command | Audience | Notes |
|---|---|---|
| `sharpee build [path]` | both | location-aware (monorepo full build vs standalone story) |
| `sharpee build --browser` | both | self-contained browser client (merges devkit `--browser` + sharpee `build-browser`) |
| `sharpee bundle:story` | both | `.sharpee` bundle (restores the capability; merges sharpee CLI `.sharpee`) |
| `sharpee test` / `test:npm` / `play` | both | transcript run / npm consumer test / REPL |
| `sharpee init <name>` | installed | **scaffold a new project** (from the sharpee CLI's `init`) |
| `sharpee ifid` | installed | keep (IFID utility) |
| `sharpee bundle` | repo | CLI platform bundle (`dist/cli/sharpee.js`) — advanced |
| `sharpee clean` / `verify` | repo | artifact hygiene / publish dry-run — advanced |
| `sharpee register <loc>` / `list` | repo | location registry (`~/.sharpee/devkit`) — was ADR `init`/`list` |

Repo-only "experienced developer" flags (`--skip`, `--no-version`, `--build-date`, etc.)
ride on the shared commands.

## Decisions to settle in this plan

1. **`init` collision (resolved):** `sharpee init` = **scaffold a project** (the
   author-valuable meaning, from the sharpee CLI). ADR-180's location-registry `init`
   becomes **`sharpee register`** (+ `sharpee list`).
2. **Absorb everything into the engine (resolved):** all commands — build/test/bundle/
   browser/`.sharpee` **and scaffolding (`init`, `ifid`)** — live in `@sharpee/devkit`.
   `@sharpee/sharpee` keeps **no CLI** (pure library); `packages/sharpee/src/cli/*` moves
   into devkit (U2/U3).
3. **Standalone build mechanism (ADR Open Q1, resolved):** standalone = run the author's
   own build (their `npm run build`/tsc) + devkit bundling; monorepo = `pnpm --filter`.
   devkit detects mode from the workspace context.

## Phasing (each independently shippable; build.sh already gone)

- **Phase U1 — non-breaking repo entry.** Committed `./sharpee` wrapper (execs
  `node packages/devkit/dist/cli.js` — a path, so **no bin collision**; error-with-instructions
  if the engine dist is missing). `build` accepts an in-repo **path** (not just a name) — fixes
  ADR Decision-4 (`resolveStory`). Remove the premature 3d `@sharpee/sharpee`→`@sharpee/devkit`
  dependency. Re-sweep **repo** docs `node packages/devkit/dist/cli.js build`→`./sharpee build`.
  **No bin rename / no `@sharpee/sharpee` bin change / no website docs** — those couple to the U2
  command move (two workspace packages can't both own bin `sharpee`; dropping sharpee's bin would
  orphan init/build-browser/ifid until they move into devkit).
- **Phase U2 — bin handoff + command absorption + standalone mode (the unification).**
  Rename the `@sharpee/devkit` bin `devkit`→`sharpee`; **atomically** drop `@sharpee/sharpee`'s
  CLI bin and move `packages/sharpee/src/cli/*` (init/build-browser/`.sharpee`/ifid) into devkit.
  Add location-aware **standalone build** (author story via its own toolchain → browser/`.sharpee`;
  monorepo → `pnpm --filter`) — resolves Open Q1, restores `.sharpee`. Global-install story
  (`npm i -g @sharpee/devkit`) + website-docs re-sweep (drop `npx`). **The ADR-180 amendment
  (Decision-1 reversal etc.) lands here**, atomic with the rename.
- **Phase U3 — scaffolding + registry.** `sharpee init` (scaffold), `sharpee register`/`list`
  (+ `~/.sharpee/devkit`); reconcile `ifid`/`init-browser`. ADR AC-3 closure.
- **ADR-180 amendment** is a **U2 deliverable** (not a footnote) — see the checklist
  below. It lands atomically with the bin rename so code and record never diverge. (U1 is
  non-breaking and changes no decided behavior, so it needs no amendment.)

## ADR-180 amendment checklist (U2 deliverable — lands with the bin handoff)

Mechanism: **append an `## Amendment 1 (2026-06-18) — unify under the `sharpee` command`
section** to `docs/architecture/adrs/adr-180-build-test-devkit.md` that restates the
superseding decisions, and **inline-tag each superseded clause** with
`(amended — see Amendment 1)` rather than rewriting history silently. The amendment
section itself spells out the new state. Exact clauses to touch:

- [ ] **§Decision 1 (delivery + bin) — substantial REWRITE / reversal.** The CLI is a
      **distinct, globally-installed package** (the Claude Code model): `@sharpee/devkit`,
      bin **`sharpee`**, `npm i -g @sharpee/devkit` (and/or installer) → bare `sharpee`.
      It is **NOT** shipped via a `@sharpee/sharpee` dependency — **reverse** the original
      "ships via the SDK / bin appears on local npm install" mechanism (remove that dep).
      `@sharpee/sharpee` is a **pure library** (no CLI bin). The `devkit` bin → `sharpee`.
      Add the committed `./sharpee` repo wrapper (thin exec shim). Note the package-name ≠
      command-name precedent (`claude-code`→`claude`).
- [ ] **§Decision 4 (`init` semantics).** `init` no longer registers a location.
      **`sharpee init <name>` = scaffold a new story project**; the name→path registry verb
      becomes **`sharpee register <location>`** (+ `sharpee list`). The `~/.sharpee/devkit`
      memory + "story is a location" model is otherwise unchanged.
- [ ] **§CLI surface.** Rewrite `devkit build|bundle|test|test:npm|verify|clean|init|list`
      → `sharpee build [--browser] | bundle | bundle:story | test | test:npm | play |
      clean | verify | init | register | list | ifid`.
- [ ] **§"~/.sharpee/devkit memory format".** `devkit init <location>` → `sharpee register
      <location>`; `devkit list` → `sharpee list`. File path/format unchanged.
- [ ] **§Acceptance Criteria — sweep all `devkit …` command names → `sharpee …`.**
      Specifically **AC-3**: `devkit test <location>` / `devkit test <name>` (after init)
      → `sharpee test <location>` / `sharpee test <name>` (after **`register`**).
      AC-4/AC-5/AC-7/AC-9 command names likewise.
- [ ] **§Decision 5 (`.sharpee`).** Un-defer: record that `.sharpee` building is **restored
      as `sharpee bundle:story`** (scheduled in U2), not indefinitely deferred. (Closes the
      overstated "3d .sharpee gap.")
- [ ] **§Open Questions — mark Open Q1 RESOLVED.** "tsf ↔ arbitrary locations": **standalone
      project → run the story's own build (its tsc/`npm run build`) + devkit bundling;
      monorepo → `pnpm --filter`**; devkit detects mode from workspace context.
- [ ] **§Invariants — add/clarify.** (a) the `sharpee` bin → `@sharpee/devkit` dependency is
      **one-way** (no `sharpee` ⇄ `devkit` cycle — guards the U2 absorption); (b) keep
      "exactly one story-loading implementation (`@sharpee/bootstrap`)" — the standalone
      build/test path still **loads via bootstrap**; (c) update "init is convenience" wording
      to "`register` is convenience."
- [ ] **§Constrains Future Sessions.** Verbs `devkit …` → `sharpee …`; affirm "new build/
      test/run capabilities go in the **devkit engine** (exposed via `sharpee`), not bash";
      note the `./sharpee` wrapper is a thin shim (no logic in bash).
- [ ] **§Out of Scope — affirm unchanged.** Still "not a generic standalone product"; the
      rename to the product name does not change that — `sharpee` is Sharpee-specific.

Plan-review (2026-06-18) flagged the two CONTRADICTIONs (rename, `init`) as blocking until
this amendment lands; the checklist is their fix. The three advisory TENSIONs map to the
new Invariants bullet (cycle direction, bootstrap-only loading) and the Constrains note
(thin-shim wrapper).

## Doc model (two entry points, same global command)

- **Install entry** (website getting-started): `npm i -g @sharpee/devkit` (or installer) →
  `sharpee init my-game` → `sharpee build` / `sharpee build --browser` / `sharpee test`.
  The project still `npm install @sharpee/sharpee` for the *library import* — but the
  *command* comes from the global CLI, not the project. **No `npx`.**
- **Repo entry** (CLAUDE.md, guides): `./sharpee build <path>` plus the advanced steps
  (`bundle`, `--skip`, `verify`, parity).

## Out of scope / later
- Rewriting tsf (engine still delegates compile to it).
- Deleting `tools/shite` / `dist/runner` source (separate cleanup).

## No code until this plan is approved.
