# Sharpee IDE — P4: Build Integration

**Date:** 2026-05-11
**Predecessor:** P1 complete (steps 1.1–1.6)
**Phase reference:** P4 in `docs/work/sharpee-ide/plan-20260509-phases.md`

When this phase lands, the IDE can build a Sharpee story, surface its output, parse compile errors, and jump to the error site in the editor. P5 (Play) follows.

> **REVISION 2026-06-18 (ADR-180 — `build.sh` retired).** `build.sh` was deleted; the
> build entry point is now the repo-root `./sharpee` wrapper → `node packages/devkit/dist/cli.js`
> (`@sharpee/devkit`, which loads stories via `@sharpee/bootstrap`). This phase is re-targeted:
> - **Workspace marker** is the devkit monorepo signature — a directory holding **both**
>   `pnpm-workspace.yaml` and `packages/core/` (mirrors `devkit/src/repo.ts:findMonorepoRoot`),
>   not `build.sh`.
> - **Build command** is `./sharpee build <story> [--browser] [--zifmia] [--skip <pkg>]`.
>   There is no `-s/-c/-t` flag set and **no theme flag** — themes are a runtime concern in the
>   browser client (`ThemeManager`/`data-theme`) / a `theme.css` in standalone projects, so
>   **Theme is dropped from Build Settings**.
> - **Step 4.1 is done**: `WorkspaceRoot.find` now detects the signature and terminates correctly
>   at the filesystem root (the prior `deletingLastPathComponent()` fixpoint looped forever on
>   trailing-slash dir URLs). Steps 4.2+ below are updated for the new CLI.

---

## Scope (locked)

From the phase doc, refined by this session's decisions:

- **Build menu** (top-level): `Build` (⌘B), `Build Settings…`, `Cancel Build`.
- **Build Settings sheet** holds every build option. No status-bar dropdown.
  - Story (dropdown — detected from `stories/*/package.json` + `tutorials/*/package.json`; passed as the positional `<story>` arg)
  - Clients (checkboxes — Browser → `--browser`, Zifmia → `--zifmia`; multi-select; none = platform + bundle only)
  - Skip from (dropdown — None, or a workspace package short-name to pass as `--skip <pkg>`)
  - ~~Theme~~ — **removed** (ADR-180: not a build input; runtime/browser-client concern)
- **Build panel**: bottom-docked under the editor, toggled from the rail.
- **Status bar**: build indicator (idle / building / OK / failed).
- **Cancel**: terminates the running build process gracefully.
- **Error navigation**: parsed `tsc` errors render as clickable lines; clicking jumps to `file:line` in the editor.
- **Working directory**: the repo root, detected by walking up from the loaded project URL until a directory with the monorepo signature (`pnpm-workspace.yaml` + `packages/core/`) is found.

**Out of scope** (deferred):
- Incremental / watch builds.
- Warning suppression UI.
- Multiple simultaneous builds.
- Long-running Node helper subprocess — that's P3, gated on this phase's protocol shape lessons but not built here.

---

## Architectural notes

### Build settings persistence

`SessionState` is single-active-project (one UserDefaults key, overwritten on project switch). Build settings must persist **per project** so switching projects doesn't lose them.

New `BuildSettingsStore` mirrors the `RecentProjectsStore` / `SessionStateStore` pattern but is keyed by project URL:

- UserDefaults key `SharpeeBuildSettings` → JSON `[ProjectKey: BuildSettings]`
- `ProjectKey` is `URL.path` (canonical, locale-neutral)
- `load(for:from:)`, `save(_:for:to:)`, `clear(for:from:)` — all accept an injectable `UserDefaults`
- Defaults: no story selected, browser client only, no skip

### Build process model

A single `BuildRunner` class owns the running `Process`:

- `start(settings:repoRoot:)` — spawns `Process(executableURL: repoRoot/"sharpee", arguments: ["build"] + settings.toArguments(), currentDirectoryURL: repoRoot)`. The `./sharpee` wrapper requires `packages/devkit/dist/cli.js` to exist; if it doesn't, the wrapper exits non-zero with a "engine not built" message — surface it in the panel verbatim.
- `stdout` / `stderr` pipes feed `Data` chunks to delegate callbacks on the main actor
- Cancel sends `SIGTERM`, escalates to `SIGKILL` after 2 s
- `state: idle | building | success | failure` is observable for status bar binding
- Builder asserts only one Process is running at a time

The Process is a **one-shot** — a fresh `BuildRunner` per build, owned by the controller. The long-running Node bridge protocol is deferred to P3.

### Repo-root detection

The Open Project panel may select any folder. `./sharpee` lives at the monorepo root, identified by the `pnpm-workspace.yaml` + `packages/core/` signature; detection walks `projectURL` upward looking for that signature. If absent up to filesystem root, surface an alert ("This folder is not inside a Sharpee workspace") and disable the Build menu. **The walk must terminate at the filesystem root** — `URL.deletingLastPathComponent()` does not converge on trailing-slash directory URLs (it grows `/../`), so stop explicitly when `current.path == "/"`.

### Error parsing

`tsc` output line shape: `path/to/file.ts(line,col): error TSnnnn: message`. The parser is a single regex, tolerant of leading whitespace, that matches both `error` and `warning` lines. The build panel renders one clickable line per match plus the raw output for context. Non-matching lines stay as plain text.

---

## Steps

Each step ends at a build-green checkpoint. ※ marks stop-points where I'll report and wait.

### Step 4.1 — Repo-root detection + Build menu skeleton  ✅ DONE (2026-06-18)

`WorkspaceRoot.find` detects the monorepo signature and terminates at filesystem root; `WorkspaceRootTests` rewritten (7 cases: direct/walk-up/deepest/none-terminates/two AND-condition cases/dir-named-marker/fs-root). Menu skeleton + AppDelegate validation landed in the May session. Original spec below for reference.

- Add `WorkspaceRoot.find(from: projectURL) -> URL?` helper (walks up, looks for the `pnpm-workspace.yaml` + `packages/core/` signature).
- `MenuBuilder` gains a top-level Build menu with three items: Build (⌘B), Build Settings…, Cancel Build. All actions wired to no-op stubs on AppDelegate for now. Menu items disabled when no project is loaded or no repo root found.
- `AppDelegate` enables/disables the Build menu in `applicationDidFinishLaunching` and on project load (via a `currentRepoRoot: URL?` property).
- Tests: `WorkspaceRootTests` — walks from nested dir to the signature; returns nil when no ancestor has it; requires both markers; handles `/` without looping. ※

### Step 4.2 — BuildSettings model + BuildSettingsStore + tests  ✅ DONE (2026-06-18)

Landed: `Build/BuildSettings.swift` (story/clients/skipFrom + `toArguments()`, no theme) and `Build/BuildSettingsStore.swift` (per-project, keyed by `URL.path`, injectable UserDefaults). `BuildSettingsTests` (8) + `BuildSettingsStoreTests` (7) green; full suite 56 tests, 0 failures. Original spec below.


- `BuildSettings` struct: `story: String?`, `clients: Set<String>` (values `"browser"`, `"zifmia"`), `skipFrom: String?`. Codable; sensible defaults. (No `theme` — dropped per ADR-180.)
- `BuildSettings.toArguments() -> [String]` produces the `./sharpee build` argv **after** the `build` subcommand: positional story first, then flags — e.g. `["dungeo", "--browser"]`, or `["dungeo", "--browser", "--zifmia", "--skip", "stdlib"]`. The runner prepends `"build"`.
- `BuildSettingsStore` — per-project storage keyed by `URL.path`, injectable UserDefaults, mirrors RecentProjectsStore pattern.
- Tests: `BuildSettingsTests` (argument generation, codable roundtrip, defaults), `BuildSettingsStoreTests` (save/load per project, isolation between projects, clear). ※

### Step 4.3 — Build Settings sheet UI

- `BuildSettingsViewController` — `NSViewController` presented as a sheet from the main window.
- Reads stories via `StoryDetector.detect(in: repoRoot) -> [Story]` (scans `stories/*/package.json`).
- Reads packages via `PackageDetector.detect(in: repoRoot) -> [String]` (scans `packages/*/package.json`).
- On save: persists via `BuildSettingsStore`, dismisses sheet. On cancel: discards.
- Tests: `StoryDetectorTests`, `PackageDetectorTests` against a fixture directory tree; the view controller is verified manually.
- Manual verification: open settings, change values, reopen — values persist. ※

### Step 4.4 — BuildRunner with cancel support

- `BuildRunner` class on `@MainActor`. Holds a single `Process`. Delegate protocol with `runner(_:didEmit:)`, `runner(_:didChangeState:)`, `runner(_:didExit:)`.
- `start(settings:repoRoot:)`: spawns, attaches stdout/stderr `Pipe`, reads chunks, decodes UTF-8, forwards to delegate.
- `cancel()`: sends SIGTERM; schedules a 2 s timer to send SIGKILL if still running.
- State machine: `.idle → .building → .success/.failure/.cancelled`.
- No UI yet — this step verifies the runner can launch `./sharpee build` and observe completion.
- Tests: `BuildRunnerTests` — script that prints, exits 0; script that exits non-zero; script that sleeps + cancel terminates within budget. Test script lives in `SharpeeIDETests/Fixtures/`. ※

### Step 4.5 — Bottom-docked Build panel UI

- `BuildPanelView` (`NSView`) with an `NSTextView` inside an `NSScrollView`, monospaced font, theme-coloured.
- Toggle button in the rail (third item — placeholder gets a real button per the mock).
- `MainSplitViewController` adds a fourth vertical-stack member below the editor+play horizontal split when the panel is visible. Default: hidden.
- Visibility persists in SessionState (`buildPanelVisible: Bool` — additive Codable field with default `false`).
- Manual verification: toggle from rail, panel appears/hides, height persists across drags. ※

### Step 4.6 — Wire BuildRunner to Build panel

- `BuildController` owns a `BuildRunner` and a reference to the `BuildPanelView`.
- Build menu's Build action: read settings → ensure they're complete (story selected) → start runner → forward chunks to panel.
- Cancel Build action: `runner.cancel()`. Menu item enabled only when state is `.building`.
- Build panel auto-shows on build start (if hidden) and auto-scrolls to bottom on append.
- Manual verification: build a story, panel fills with output, exit status visible at the end. ※

### Step 4.7 — Status bar build indicator

- Replace the static "main · Sharpee 0.1.0" label with an HStack: branch · version · build-state pill.
- States: `idle` (hidden), `building` (spinner + "Building…"), `success` (green dot + duration), `failure` (red dot + "Build failed").
- Click the pill while building → cancel sheet; while finished → toggle the build panel.
- Tests: `BuildStateFormatterTests` for the duration formatting + label generation.
- Manual verification: pill appearance through a full build cycle. ※

### Step 4.8 — TSC error parsing + click-to-jump

- `TSCDiagnostic` struct: `file: URL, line: Int, column: Int, severity: .error|.warning, code: String, message: String`.
- `TSCDiagnosticParser.parse(line:relativeTo: repoRoot) -> TSCDiagnostic?` — regex extraction; resolves `file` against repo root if path is relative.
- Build panel renders diagnostic lines distinctly (red for error, yellow for warning) and stores their `TSCDiagnostic` for hit-testing.
- Click handler: `EditorViewController.openDocument(at:line:column:)` extends the existing `openDocument(at:)` to optionally scroll to line/column.
- Tests: `TSCDiagnosticParserTests` for the parser; `EditorOpenAtLineTests` for the scroll-to-line behaviour (this one needs an NSWindow harness — defer if cost is high; manual verification is acceptable).
- Manual verification: introduce a TS error, build, click the error in the panel, editor jumps to the right spot. ※

### Step 4.9 — End-to-end manual verification

Run the full happy-path and a couple of failure modes against the Dungeo story:

1. Open Sharpee repo → Build Settings → pick `dungeo` + browser + classic-light → Save
2. ⌘B → panel opens → output streams → exits 0 → status bar pill goes green
3. Edit a `.ts` file to introduce a deliberate type error → ⌘B → panel shows the error in red → click → editor jumps to the line → status bar pill goes red
4. Start a build → Cancel Build → process terminates within ~2 s, panel shows "Cancelled"
5. Re-launch IDE → Build Settings opens with saved values

---

## Risks / open questions

- **Apple-event signing on the spawned `Process`** — the IDE is ad-hoc signed; should be fine for spawning shell scripts, but `./sharpee` runs `node` → devkit → `pnpm`/`tsf`, which may trip system protections on first run. Mitigate by surfacing the underlying error in the panel.
- **Performance on long output** — Dungeo builds emit thousands of lines. The `NSTextView` may bog down. If it does, batch updates per RunLoop tick (deferred until observed).
- **Repo-root detection edge case** — symlinked repos. URL resolution uses `resolvingSymlinksInPath()` before walking.
- **`./sharpee` interactive prompts** — none today, but if any are added in the future, the build will hang silently. Out of scope for P4.

---

## Files affected (estimate)

### New
- `tools/ide/SharpeeIDE/Workspace/WorkspaceRoot.swift`
- `tools/ide/SharpeeIDE/Workspace/StoryDetector.swift`
- `tools/ide/SharpeeIDE/Workspace/PackageDetector.swift`
- `tools/ide/SharpeeIDE/Build/BuildSettings.swift`
- `tools/ide/SharpeeIDE/Build/BuildSettingsStore.swift`
- `tools/ide/SharpeeIDE/Build/BuildSettingsViewController.swift`
- `tools/ide/SharpeeIDE/Build/BuildRunner.swift`
- `tools/ide/SharpeeIDE/Build/BuildController.swift`
- `tools/ide/SharpeeIDE/Build/BuildPanelView.swift`
- `tools/ide/SharpeeIDE/Build/TSCDiagnostic.swift`
- `tools/ide/SharpeeIDE/Build/TSCDiagnosticParser.swift`
- `tools/ide/SharpeeIDE/StatusBar/BuildStatusPill.swift`
- Tests for each (in `SharpeeIDETests/`)

### Modified
- `tools/ide/SharpeeIDE/Menus/MenuBuilder.swift` — Build menu
- `tools/ide/SharpeeIDE/AppDelegate.swift` — build actions, enable/disable wiring
- `tools/ide/SharpeeIDE/MainWindow.swift` — Build panel split, status bar pill
- `tools/ide/SharpeeIDE/Persistence/SessionState.swift` — additive `buildPanelVisible` field
- `tools/ide/SharpeeIDE/Editor/EditorViewController.swift` — `openDocument(at:line:column:)`
- `tools/ide/project.yml` — new source subdirs

### Configuration
- xcodegen `project.yml` may need `entitlements` adjustments if Process spawning trips the hardened runtime. TBD at step 4.4.
