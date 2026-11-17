# Sharpee IDE — P5: Play Panel

**Date:** 2026-06-18
**Predecessor:** P4 complete (4.1–4.8 landed; 4.9 e2e is manual QA)
**Phase reference:** P5 in `docs/work/sharpee-ide/plan-20260509-phases.md`

When this phase lands, the IDE can **play the story it just built** side-by-side with the editor: a `WKWebView` embeds the self-contained browser client (`dist/web/{story}/`), reloads after a successful `--browser` build, and offers Restart / Log / status. This hits the milestone — edit → build → play in one window.

This is `tools/ide`-only. The web bundle is produced by the existing `./sharpee build {story} --browser` pipeline (decision 6 / option **D** in the phase plan); no platform changes.

---

## Scope (locked)

- **Play pane** replaces the current placeholder 4th split item with a `WKWebView` loading `<repoRoot>/dist/web/<story>/index.html` via `file://` (read access scoped to the web-bundle dir). The story is the one in Build Settings for the current repo root.
- **Empty state**: when the bundle is absent, show a placeholder ("Build with Browser enabled to play") instead of a blank/erroring web view.
- **Play header**: Restart button (restarts the running game — see Restart note below), a status dot (green = bundle loaded, dim = none), and the "Play after build" toggle. **Log is deferred** out of P5: capturing the transcript needs the JS bridge this phase otherwise avoids, so the Log button is omitted (or a disabled placeholder) until a later bridge phase.
- **Reload after build**: a successful build whose settings include the Browser client reloads the Play pane for that story.
- **"Play after build" toggle** (default on), persisted; when off, a successful build does not auto-reload.

**Out of scope** (deferred): the command input row (web client already has one); deep JS introspection (world-state inspector, breakpoints); theme push from Swift; Sparkle/auto-update.

---

## Architectural notes

### Web-bundle location & loading
`./sharpee build <story> --browser` emits `dist/web/<story>/` (per CLAUDE.md). The Play pane loads `index.html` there with `WKWebView.loadFileURL(_:allowingReadAccessTo:)`, granting read access to the `dist/web/<story>/` directory (the bundle is self-contained — no network). Absent dir → placeholder.

### Current story / repo root
Play needs `(repoRoot, story)`. Both already flow through the build path: `currentRepoRoot` (AppDelegate) and `BuildSettingsStore.load(for: repoRoot).story`. The Play pane is told the repo root on project load and the story on build (and on demand via a refresh).

### Reload-after-build
`BuildController` already knows the `BuildSettings` and the exit result. On `.success` with `clients.contains(browser)` and the "Play after build" pref on, it asks the window to reload the Play pane for `settings.story`. No new bridge — a `WKWebView.reload()`/reload-URL is enough; the web client re-initialises the game on load.

### "Play after build" persistence
Additive `SessionState.playAfterBuild: Bool` (default **true**, `decodeIfPresent`), mirroring `buildPanelVisible`. Toggle lives in the Play header (or View menu) — decided at 5.2.

### Sandbox / entitlements
App is hardened-runtime + ad-hoc signed, not sandboxed; `WKWebView` loading local files works without extra entitlements. Revisit only if P8 sandboxing is added.

---

## Steps

Each step ends at a build-green checkpoint. ※ marks manual stop-points.

### Step 5.1 — Play pane WKWebView + empty state  ✅ DONE (2026-06-18) — verified

Landed: `Play/WebBundle.swift` (dist/web/<story> index resolution + tests), `Play/PlayViewController.swift` (WKWebView pane + empty-state placeholder, replacing the placeholder Play split item), and — resolving the flagged file:// risk for real — `Play/PlayURLSchemeHandler.swift`: the bundle is served over a custom `sharpee-play://app/` scheme (real origin) because `file://`'s null origin made the client's `localStorage` throw → "engine not loading". `isInspectable` enabled for debugging. WebKit linked in project.yml; Play wired through MainWindow + refreshed on project load. Tests: `WebBundleTests` (4), `PlayURLSchemeHandlerTests` (3). Verified: `thealderman` renders and plays in the pane. Original spec below.

- **Link `WebKit.framework`** on the SharpeeIDE target in `project.yml` (`dependencies: - sdk: WebKit.framework`), required by `import WebKit`.
- `PlayViewController` (NSViewController) hosting a `WKWebView`; replaces the placeholder Play split item in `MainSplitViewController`.
- `WebBundle.indexURL(repoRoot:story:) -> URL?` helper — returns `dist/web/<story>/index.html` if it exists, else nil.
- `load(repoRoot:story:)`: loads the bundle if present, else shows the placeholder label.
- Wire repo-root on project load; story from Build Settings on demand.
- Tests: `WebBundleTests` (index URL present/absent against a fixture tree). VC verified manually.
- Manual: with a prior `--browser` build present, the story renders in the Play pane; with none, the placeholder shows. ※

### Step 5.1.5 — Browser-entry intelligence (detect → consent → generate)  ✅ DONE (2026-06-18) — verified

Landed: `Build/BrowserEntry.swift` (path/exists/create + `story.config`-based template), build-time prompt in `AppDelegate.buildProject` (offer → create → open → continue build), and a passive Build Settings note when Browser is checked for an entry-less story. `BrowserEntryTests` (8). Verified end-to-end: created `stories/thealderman/src/browser-entry.ts` on consent → compiled → `dist/web/thealderman/` produced → ✓ Build succeeded → plays in the Play pane.

The IDE should understand the `--browser` prerequisite rather than surface a raw exit-2.

- `BrowserEntry` helper: `path(repoRoot:story:)` (resolves `stories/` then `tutorials/`, `…/src/browser-entry.ts`), `exists(repoRoot:story:)`, `template(story:)` (generates a starter entry), `create(repoRoot:story:)` (writes it).
- **Generated starter**: the standard scaffold — imports `@sharpee/engine`/`world-model`/`parser-en-us`/`lang-en-us`/`stdlib` + `BrowserClient`/`ThemeManager` from `@sharpee/platform-browser`, `{ story }` from `./index`, version from `./version`; builds `BrowserClient` (storagePrefix `<story>-`, a default theme set), a `start()` that initialises DOM + world/player/parser/language, `connectEngine`, `setStory`, save/restore hooks, `client.start()`. Story metadata comes from `story.config` (the `Story.config` property every story implements — robust whether or not the story *exports* a `config` const). Header comment marks it generated and points to `stories/dungeo/src/browser-entry.ts` for adding story-specific channel/audio renderers.
- **Build-time prompt**: `AppDelegate.buildProject` — when `settings.clients` includes Browser and the entry is missing, present an alert ("'<story>' has no browser entry, required to build/play in the browser. Create a starter one?" → Create Entry / Cancel). On consent: `BrowserEntry.create(...)` then continue the build; on cancel: abort.
- **Passive hint**: Build Settings shows the Browser checkbox with a "(no browser entry — will offer to create)" note when the selected story lacks one.
- Tests: `BrowserEntryTests` — path resolution (stories vs tutorials), exists detection, template contains the story name/prefix + key imports, `create` writes a compilable file to a fixture tree.
- Manual: select a story with no entry + Browser → ⌘B → prompt → Create → build proceeds (and surfaces the story's real errors, or produces the bundle). ※

### Step 5.2 — Play header (Restart / status dot) + reload-after-build + toggle  ✅ DONE (2026-06-18) — verified

Landed: `Play/PlayHeaderView.swift` (status dot, Restart, "Play after build" checkbox); `PlayViewController` header + status + `restart()` (reloadFromOrigin) + `reloadAfterBuild`; additive `SessionState.playAfterBuild` (default true) persisted/restored; `BuildController` loads the just-built story into Play on a successful Browser build. **Plus Play console capture**: an injected WKUserScript forwards `console.error` / uncaught errors / unhandled rejections to Swift (`onConsoleError`), surfaced in the Build panel as `▶ play:` — no WebView inspector needed (game pages suppress the right-click menu). Tests: SessionState +2; full suite 107. Verified end-to-end: edit → ⌘B auto-reloaded Play; capture surfaced a real `thealderman` world-init runtime throw (the `world.getLastCreatedEntityId()` non-method) with a full stack. Original spec below.

### Step 5.4 — Play runtime error list (symbolicated, clickable)
Turn captured Play errors into a navigable list, like the tsc diagnostics (4.8).
- `SourceMap.swift`: a self-contained Swift source-map consumer (base64-VLQ + mappings decode → `originalPosition(generatedLine:generatedColumn:)`). No Node/WASM runtime dependency.
- Parse the captured stack (`fn@sharpee-play://app/game.js:LINE:COL` frames), symbolicate each bundle frame via the story's `dist/web/<story>/game.js.map`, resolving the source path against the bundle dir → absolute `stories/<story>/src/...:line`.
- Render in the Build panel as clickable lines (generalise 4.8's diagnostic click to a `SourceLocation{file,line,column}` target used by both tsc diagnostics and play frames) → click jumps to the editor.
- Tests: `SourceMapTests` (VLQ decode, originalPosition against a known map), stack-frame parser tests.
- Manual: a Play runtime error lists clickable frames → click → editor jumps to the throwing story line. ※
- **Restart**: first try `WKWebView.reloadFromOrigin()`. **Open question to verify here:** if the web client autosaves to `localStorage` and resumes on load, a reload *resumes* rather than *restarts* — in that case Restart must invoke the client's restart via `evaluateJavaScript` (or clear the WKWebView's `localStorage`). Decide once the client's autosave behaviour is observed.
- `BuildController` reloads the Play pane on a successful Browser build when the toggle is on.
- Additive `SessionState.playAfterBuild` (default true) persisted + restored.
- Tests: SessionState +1 (default + roundtrip). Header/reload verified manually.
- Manual: build with Browser → Play reloads automatically; Restart re-inits; toggle off suppresses auto-reload; dot reflects state. ※

### Step 5.5 — Game Errors panel (tabbed, expandable list, double-click nav, editor marker)

Replace the build-panel error dump with a dedicated, navigable errors surface. Reuses the
`SourceMap` + `PlayErrorSymbolicator` engine from 5.4; changes only the presentation.

- **5.5a — Tabbed bottom panel.** Wrap the bottom panel in a tab bar: **Build** (the existing `BuildPanelView` output) and **Game Errors** (new). A `BottomPanelViewController` hosts the tab bar + swaps content; the Game Errors tab shows a count badge. Build output routes to the Build tab; symbolicated play errors route to the Game Errors tab (and select/flash it). Remove `BuildPanelView.appendPlayError` (errors no longer go to build output).
- **5.5b — Game Errors list.** An `NSOutlineView`: each top-level row is one error as a **single line** (message + primary `file:line`), **expandable** to its stack frames. **Double-click** a row → open the file in the editor with the cursor on the line (reuses `openDocument(at:line:column:)`). Clears on a new build / reload.
- **5.5c — Editor error marker.** Mark the navigated error line in the editor — **squiggly red underline** under the line's text (custom `NSLayoutManager` drawing for a marker attribute) *or* a **gutter/right-margin error flag** (an `NSRulerView` badge). Marker clears on edit of that line.
- Tests: `BottomPanelViewController` tab-switch state; `GameErrorsView` model (rows/children from `[PlayConsoleError]`); editor marker range mapping. UI verified manually.
- Manual: a runtime error appears as a one-line row in Game Errors → expand → double-click → editor opens at the line with the marker. ※

### Step 5.3 — End-to-end manual verification
1. Build `dungeo --browser` → Play pane shows the running game.
2. Edit a room description → ⌘B → Play reloads with the change.
3. Restart → game restarts from the top.
4. Toggle "Play after build" off → build → Play does not reload.
5. Relaunch → toggle state persisted.

---

## Risks / open questions
- **WKWebView local-file loading — DE-RISKED (verified 2026-06-18).** `dist/web/dungeo/index.html` loads a single classic `<script src="game.js">`; `game.js` has no `fetch`/dynamic `import`/`import.meta`/XHR/Worker, and assets are plain `<link>`/relative files. So `loadFileURL(_:allowingReadAccessTo: bundleDir)` should work directly. The `WKURLSchemeHandler` is now a **contingency only** (only if a future bundle adds module/fetch loading), not an expected step.
- **Restart vs resume**: if the web client autosaves to `localStorage`, a WKWebView reload resumes mid-game. Restart may need a JS call or a `localStorage` clear — verified at 5.2.
- **Which story when Build Settings has none**: if no story is selected, Play stays in the empty state (no guess).
- **Stale bundle**: Play shows whatever `dist/web/<story>/` currently holds; a failed build leaves the prior bundle. The status dot + build pill together convey freshness.

## Files affected (estimate)
### New
- `tools/ide/SharpeeIDE/Play/PlayViewController.swift`
- `tools/ide/SharpeeIDE/Play/PlayHeaderView.swift`
- `tools/ide/SharpeeIDE/Play/WebBundle.swift`
- Tests: `WebBundleTests`, SessionState additions
### Modified
- `tools/ide/SharpeeIDE/MainWindow.swift` — Play split item → PlayViewController; reload forwarding
- `tools/ide/SharpeeIDE/Build/BuildController.swift` — reload Play on successful Browser build
- `tools/ide/SharpeeIDE/Persistence/SessionState.swift` — `playAfterBuild`
- `tools/ide/SharpeeIDE/AppDelegate.swift` — pass repo root to Play on project load
- `tools/ide/project.yml` — new `Play/` sources (auto-globbed)
