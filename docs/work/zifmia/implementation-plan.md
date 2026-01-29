# Zifmia Implementation Plan

Based on ADR-121 (Story Runner Architecture) and ADR-122 (Rich Media and Story Styling).

## Current State

The `packages/zifmia/` package exists as a simplified React client (migrated from `client-react`). It has:

- GameShell, StatusLine, Transcript, CommandInput components
- GameContext, useTranscript, useCommandHistory, useTheme hooks
- MenuBar component
- Theme CSS files (classic-light, modern-dark, retro-terminal, paper)

It does **not** yet function as a story runner. It's still a React component library that gets bundled monolithically with each story.

## Goal

Transform Zifmia from a component library into a **standalone story runner** that:

1. Loads `.sharpee` story bundles (zip archives)
2. Runs in browser (web-hosted) and desktop (Tauri)
3. Provides consistent UI, save/restore, and accessibility
4. Supports illustrations and story-specific CSS (ADR-122)

## Phases

### Phase 1: Story Bundle Format and Build Tooling

**Objective**: Produce `.sharpee` files from stories; define the bundle contract.

#### 1.1 Define meta.json Schema

- Create TypeScript interface for `StoryMetadata`
- Fields: format, formatVersion, title, author, version, description, sharpeeVersion, ifid, hasAssets, hasTheme, preferredTheme
- Location: `packages/zifmia/src/types/story-metadata.ts`

#### 1.2 Story Bundle Build Command

- Add `--story-bundle` flag to `build.sh`
- esbuild bundles story code with `@sharpee/*` packages marked as **external**
- Generate `meta.json` from story's `config` object and `package.json`
- Package `story.js` + `meta.json` into zip archive
- Output: `dist/stories/{name}.sharpee`

#### 1.3 Optional Asset/Theme Packaging

- If `stories/{name}/assets/` exists, include in zip under `assets/`
- If `stories/{name}/theme.css` exists, include in zip root
- Update `meta.json` flags: `hasAssets`, `hasTheme`

**Deliverables**: `./build.sh --story-bundle -s dungeo` produces `dist/stories/dungeo.sharpee`

---

### Phase 2: Story Loader

**Objective**: Zifmia can load and execute a `.sharpee` bundle at runtime.

#### 2.1 Bundle Extractor

- Unzip `.sharpee` in-memory (browser: JSZip or fflate; Tauri: native fs)
- Parse `meta.json` for metadata and compatibility check
- Extract `story.js` as a blob/module URL

#### 2.2 Dynamic Story Import

- Load `story.js` via dynamic `import()` from blob URL (browser) or temp file (Tauri)
- Story module exports `story` object matching existing `Story` interface
- Validate exported shape before proceeding

#### 2.3 Platform Provider

- Story code references `@sharpee/*` packages as externals
- Runner must provide these at runtime (importmap in browser, or pre-bundled global)
- Design: runner bundles all platform packages; story JS uses `import` statements that resolve to runner-provided modules
- **Browser approach**: ES module importmap in HTML, or AMD/UMD with global `Sharpee` namespace
- **Tauri approach**: Same webview, same mechanism

#### 2.4 Asset Serving

- Extract `assets/` to temporary location or serve from memory
- Create asset URL resolver: `resolveAsset('dam-exterior.jpg')` → blob URL or temp path
- Wire into illustration rendering (Phase 4)

**Deliverables**: `<ZifmiaRunner bundleUrl="dungeo.sharpee" />` loads and starts a game

---

### Phase 3: Runner Application Shell

**Objective**: Standalone HTML app that hosts Zifmia, loads bundles, manages saves.

#### 3.1 Runner Entry Point

- New entry: `packages/zifmia/src/runner/index.tsx`
- Renders: story picker → game session → back to picker
- States: `idle` (no story loaded), `loading`, `playing`, `error`

#### 3.2 Story Library UI

- List previously opened stories (metadata from localStorage)
- "Open Story" button → file picker or URL input
- Display: title, author, description from `meta.json`
- Recent stories list with "Play Again" / "Continue" / "Remove"

#### 3.3 Save/Restore Abstraction

- Interface: `StorageProvider { save(slot, data), restore(slot), listSlots(), delete(slot) }`
- Browser implementation: localStorage with story-scoped keys
- Tauri implementation: native filesystem via IPC (Phase 6)
- Wire into existing save/restore action handlers

#### 3.4 Build Runner

- Add `--runner` flag to `build.sh`
- Bundles all `@sharpee/*` platform packages + Zifmia runner shell
- Output: `dist/runner/index.html` + `dist/runner/zifmia.js`
- Self-contained — can be served statically or wrapped in Tauri

**Deliverables**: `dist/runner/` serves a web app that opens `.sharpee` files

---

### Phase 4: Illustration Support (ADR-122)

**Objective**: Stories can include inline images that render in the transcript.

#### 4.1 IllustrationTrait

- Define in `packages/world-model/src/traits/`
- Properties: `src`, `alt`, `position`, `width`, `trigger`
- Pure data — no rendering logic

#### 4.2 Illustration Event

- Define `if.event.illustration` event type
- Emitted during action report phase when entity has IllustrationTrait
- Payload: `{ entityId, src, alt, position, width }`

#### 4.3 Transcript Rendering

- Transcript component handles illustration events
- Renders `<img>` with CSS float classes (`.float-right`, `.float-left`, `.center`, `.full-width`)
- Asset URLs resolved via bundle extractor (Phase 2.4)
- CLI client: prints `[Image: {alt}]` or skips

#### 4.4 Player Toggle

- "Show illustrations" preference in runner settings
- When off, illustration events are silently ignored
- Stored in localStorage / Tauri preferences

**Deliverables**: Stories with IllustrationTrait show images inline with text

---

### Phase 5: Story Styling (ADR-122)

**Objective**: Stories can ship custom CSS that scopes to game content.

#### 5.1 CSS Scoping

- Runner wraps game content in `#story-content` container
- On bundle load, prefix all story CSS rules with `#story-content`
- Use a simple CSS scoper (string transform or CSSStyleSheet API)
- Story CSS cannot affect runner chrome (file picker, menus, dialogs)

#### 5.2 Style Override Cascade

- Order: runner defaults → story `preferredTheme` → story `theme.css` → player preferences
- Player accessibility overrides (font size, contrast, dyslexia font) always win
- Settings UI for player preferences

#### 5.3 Built-in Theme Selection

- Runner settings: pick from classic-light, modern-dark, retro-terminal, paper
- Story's `preferredTheme` in `meta.json` sets initial default
- Player override persists per-story in localStorage

**Deliverables**: Stories bundle `theme.css`; runner scopes and applies it correctly

---

### Phase 6: Tauri Desktop Shell

**Objective**: Native desktop app wrapping the web runner.

#### 6.1 Tauri Project Setup

- Add Tauri v2 config to `packages/zifmia/` (src-tauri/ directory)
- Rust backend + webview frontend
- Frontend loads the runner from `packages/zifmia/dist/`

#### 6.2 Native File Operations

- IPC commands: `open_bundle`, `save_game`, `restore_game`, `list_saves`
- File picker for `.sharpee` files (native OS dialog)
- Save files stored in OS-appropriate app data directory
- `.sharpee` file association (double-click to open)

#### 6.3 Security Configuration

- Content Security Policy: block inline scripts, external resources
- Tauri capability permissions: only expose defined IPC commands
- No filesystem/network access from story JS
- Sandbox the webview appropriately

#### 6.4 Desktop Distribution

- Build targets: `.exe` (Windows), `.dmg` (macOS), `.AppImage` (Linux)
- Auto-updater for runner updates (Tauri built-in)
- Installer registers `.sharpee` file association

**Deliverables**: Installable desktop app that opens and plays `.sharpee` files

---

## Phase Dependencies

```
Phase 1 (Bundle Format) ──→ Phase 2 (Loader) ──→ Phase 3 (Runner Shell)
                                    │                      │
                                    ▼                      ▼
                             Phase 4 (Illustrations)  Phase 5 (Styling)
                                                           │
                                                           ▼
                                                    Phase 6 (Tauri)
```

Phases 4 and 5 can proceed in parallel once Phase 2 is done. Phase 6 requires Phase 3 (runner shell) and Phase 5 (styling) to be stable.

## Platform Changes Required

These phases touch `packages/` (platform code) and require discussion:

| Phase | Package                                | Change                           |
| ----- | -------------------------------------- | -------------------------------- |
| 1     | `packages/zifmia`                      | StoryMetadata type               |
| 2     | `packages/zifmia`                      | Bundle loader, platform provider |
| 3     | `packages/zifmia`                      | Runner shell, StorageProvider    |
| 4     | `packages/world-model`                 | IllustrationTrait                |
| 4     | `packages/engine` or `packages/stdlib` | Illustration event emission      |
| 5     | `packages/zifmia`                      | CSS scoping, theme cascade       |
| 6     | `packages/zifmia` (src-tauri/)         | Tauri shell                      |

## Note: Daemon Serialization (ADR-123, Jan 2026)

ADR-123 added `getRunnerState()`/`restoreRunnerState()` to the `Daemon` interface and `runnerState` to `DaemonState`. The scheduler now captures daemon internal state during save and restores it on load. This flows through `SchedulerService.getState()` into the save format.

**Impact on Zifmia**: No effect on the bundle format (Phases 1-2). Phase 3's `StorageProvider` will carry this additional state transparently — it's just more JSON in the existing save data structure. No special handling needed.

## Resolved Decisions

1. **Module resolution**: **Importmap**. Story bundles use ES module imports for `@sharpee/*`; runner HTML provides an importmap pointing to runner-bundled modules.

2. **Zip library**: **fflate** (~8KB). Lightweight, fast, no dependencies.

3. **Tauri build output**: Goes in `packages/zifmia/dist/` — not a separate package. The Tauri project config lives in `packages/zifmia/` alongside the web runner, and builds to its `dist/` directory.

4. **Illustration emission**: **Author-controlled**. Stories decide when to emit illustration events. The text service provides the mechanism; authors wire it to their content. No auto-emission from stdlib looking/examining actions.

5. **Save format**: **Reuse existing platform-browser SaveManager**. Uses delta-compressed saves (BrowserSaveData v3.0.0-delta) with LZ-String compression in localStorage. The `StorageProvider` abstraction wraps the same `SaveManager` for browser, and adds native filesystem persistence for Tauri via IPC.
