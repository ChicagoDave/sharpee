# Session Summary: 2026-06-18 (06:00 CST) — ADR-180 unify-CLI design + U1

## Goals
- After the 3d cutover, design the unified author/maintainer CLI entry model (raised by
  David: the in-repo invocation had been standardized to `node packages/devkit/dist/cli.js …`
  without a design discussion).

## Design decisions reached (this conversation)
- **Unify the build process: one tool, two depths.** The installed author and the repo
  maintainer run the **same** commands; the maintainer just has extra experienced-dev steps.
- **Command = `sharpee`**, delivered as a **distinct, globally-installed CLI** — the **Claude
  Code model** (`npm i -g …` → bare `claude`), explicitly **not** `npx @sharpee/sharpee …`.
  David: "npm install + `sharpee do-stuff`" vs "npx do-stuff (baked into packaging)" is a big
  difference.
- **Install target = reuse `@sharpee/devkit`**, bin **`sharpee`** (package-name ≠ command,
  like `claude-code`→`claude`). It holds the engine + ALL commands (build/test/bundle/browser/
  `.sharpee`/scaffold/clean/verify/register/list/ifid).
- **`@sharpee/sharpee` → pure library** (drop its CLI bin). The thing you `import` is not the
  thing you run — resolves the package-vs-execution-role overload David flagged.
- **Reverse the 3d umbrella wiring** (`@sharpee/sharpee`→`@sharpee/devkit` dep removed). CLI
  installs separately/globally, not as a transitive bin. One-way dep, no cycle.
- **Absorb everything into the engine** (incl. scaffolding `init`/`ifid`); `packages/sharpee/
  src/cli/*` moves into devkit.
- `init` = **scaffold a project**; the location registry verb becomes **`register`**/`list`.
- **ADR-180 Open Q1 resolved**: standalone project → run the story's own build + devkit
  bundling; monorepo → `pnpm --filter`; devkit detects mode from workspace context.
- Self-update (`sharpee update`) deferred.

## Plan + review
- Plan: `docs/work/sharpee-devkit/plan-20260618-unify-sharpee-cli.md` (supersedes the narrow
  `plan-20260618-devkit-entry.md`, removed). Includes a 10-box **ADR-180 amendment checklist**.
- `/devarch:plan-review` (vs ADR-180): 2 CONTRADICTIONs (the `devkit`→`sharpee` rename; `init`
  redefinition) — both fixed BY the amendment (Decision-1 reversal + Decision-4); 3 advisory
  TENSIONs (no `sharpee`⇄devkit cycle; standalone still loads via bootstrap; `./sharpee` stays a
  thin shim) pinned to invariant/constrain lines.

## U1 boundary (refined during implementation start)
The plan's U1 listed "rename devkit bin + drop sharpee's bin." That's blocked from being
non-breaking: two workspace packages can't both declare bin `sharpee` (pnpm link collision),
and dropping `@sharpee/sharpee`'s bin would orphan its author commands (init/build-browser/
ifid) until they move to devkit. So the **bin handoff + command move + ADR amendment move to
U2** (atomic), and **U1 is the non-breaking repo-ergonomics increment**:
- Committed `./sharpee` wrapper (execs `node packages/devkit/dist/cli.js` — a path, no bin
  collision; works in-repo today).
- `build` accepts an in-repo **path** (not just a name) — fixes ADR Decision-4; `resolveStory`.
- Remove the 3d `@sharpee/sharpee`→`@sharpee/devkit` umbrella dependency (premature coupling).
- Re-sweep **repo** docs `node packages/devkit/dist/cli.js build` → `./sharpee build`.
- No bin rename, no `@sharpee/sharpee` bin change, no website-docs change yet (U2).

## Status
- **U1** merged (PR #126): `./sharpee` wrapper + path-based build + umbrella-dep removal + repo doc sweep.
- **U2** implemented on `feat/adr-180-u2-unify-cli`:
  - Bin handoff: `@sharpee/devkit` bin `devkit`→`sharpee`; `@sharpee/sharpee` CLI bin dropped
    (pure library now; builds clean). No bin collision (verified install).
  - Absorbed the sharpee CLI: `packages/sharpee/src/cli/*` → `packages/devkit/src/standalone/*`
    (git-mv; init/init-browser/build/build-browser/ifid), old dispatcher deleted. devkit deps
    += `@sharpee/core`, `@sharpee/transcript-tester`, `fflate` (one-way; no cycle).
  - Unified `cli.ts` dispatcher: location-aware `build` (`detectMode` = pnpm-workspace.yaml +
    packages/core → monorepo, else standalone), `build-browser`, `init`/`init-browser`/`ifid`.
  - **ADR-180 Amendment 1** appended (Decision-1 reversal etc.) + 3 inline clause tags.
  - Website + web-save docs: `npx @sharpee/sharpee …` → global `sharpee` (+ `npm i -g @sharpee/devkit`).
  - Tests: +detectMode (25 passing, 1 skipped). Smoked: `sharpee help`/`ifid generate`; standalone
    routing from an out-of-repo dir → standalone build path.
  - **Remaining real-path gap (flagged):** a full standalone `sharpee build` e2e (out-of-repo
    project → `.sharpee`) not yet run; the moved code is the previously-shipped sharpee CLI.
- **Status**: U2 COMPLETE pending standalone e2e; U3 (register/list + `bundle:story` verb) next.
