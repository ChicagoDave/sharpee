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
- **Status**: IN PROGRESS — design complete + plan-reviewed; U1 (non-breaking repo entry)
  starting on `feat/adr-180-u1-sharpee-cli`. U2 = bin handoff + command absorption + standalone
  mode + amendment; U3 = register/list.
