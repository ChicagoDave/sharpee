# IDE author-mode realignment (ADR-185)

**Date:** 2026-06-20
**Goal:** Repoint the macOS IDE from monorepo-mode to **standalone author-project mode** — the IDE
opens an author's story project (its own `package.json` + `node_modules`, depending on
`@sharpee/sharpee` + `@sharpee/devkit`) and drives it via the project's **installed `sharpee` bin**,
never the monorepo.

## What's monorepo-shaped today (the realignment surface)

- `WorkspaceRoot.find` — locates the monorepo by `pnpm-workspace.yaml` + `packages/core`.
- `BuildController`/`BuildRunner` — run `./sharpee build <story>` at the monorepo root.
- `BuildSettings` — carries a **story name** + `skipFrom` (`--skip`); the build UI has a story picker.
- `IntrospectionRunner` — runs `node dist/cli/sharpee.js --introspect --story <path>` (monorepo bundle).
- `MainWindow.buildSucceeded` — resolves `stories/<name>` / `tutorials/<name>`.
- `PlayViewController`/`WebBundle` — load `dist/web/<story>/` at the monorepo root.
- `StoryDetector`/`PackageDetector` — scan `stories/` and `packages/`.

## Target model

The **open folder is the story project** (`currentProject.rootURL`). The IDE invokes
`<projectRoot>/node_modules/.bin/sharpee` (the installed devkit bin) for both build and introspect,
with `cwd = projectRoot`. One project = one story; no story name, no `stories/` resolution, no
monorepo lookup.

Verified facts:
- `sharpee build` (standalone) compiles `src/` + emits `.sharpee` + browser client to
  `<projectRoot>/dist/web/`.
- `sharpee introspect` runs in `cwd` and emits the manifest (just shipped).
- The scaffold (`sharpee init`) already declares `@sharpee/devkit`, so the bin exists after `npm i`.

## Increments

1. **Project model.** Replace `WorkspaceRoot` (monorepo finder) with "project root = open folder";
   add an author-project check (has `package.json` + `node_modules/.bin/sharpee`). Collapse
   `StoryDetector`/`PackageDetector` (the project *is* the story).
2. **Build.** `BuildRunner` runs `<projectRoot>/node_modules/.bin/sharpee build` with `cwd =
   projectRoot`. Drop `BuildSettings.story` + `skipFrom`; keep client toggles (browser). Remove the
   story picker from the build UI.
3. **Introspect.** `IntrospectionRunner.introspect(projectDir:)` runs the project's installed
   `sharpee introspect`; `buildSucceeded` introspects `projectRoot` directly (drop `storyDirectory`).
4. **Play.** Load `<projectRoot>/dist/web/` (no story subdir); update `WebBundle`/`PlayViewController`.
5. **Tests + UI.** Update the IDE suite (many tests assume monorepo paths); simplify the build
   settings panel.

Each increment builds + tests independently; `IntrospectionRunner`/`BuildRunner` keep their
fixture-script real-path tests.

## Decisions (confirmed 2026-06-20)

1. **Author-only.** Drop monorepo support entirely — delete `WorkspaceRoot` + the monorepo build
   path; no dual mode.
2. **Build command = `sharpee build`** (standalone: tsc + `.sharpee` + browser-when-present), the
   one-shot feeding introspect (`dist/`) and Play (`dist/web/`).
3. **Prereqs = automatic housekeeping, no prompts.** Detect missing prereqs and just run the fix
   silently:
   - no `node_modules/.bin/sharpee` → run `npm install`.
   - no `src/browser-entry.ts` (Play) → run `sharpee init-browser`.
   This is increment 6 (after the core realignment is green).

## Risks

Large surface; the existing IDE suite encodes monorepo paths (WorkspaceRoot, WebBundle, build
settings) and will need broad updates. Done as sequenced increments, each green before the next.
