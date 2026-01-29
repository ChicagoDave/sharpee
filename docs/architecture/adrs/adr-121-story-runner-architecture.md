# ADR-121: Story Runner Architecture

## Status: PROPOSED

## Date: 2026-01-28

## Context

### The Problem

Sharpee currently compiles stories into monolithic bundles — each story's entry point imports the engine, stdlib, parser, language layer, and platform client, producing a single JS file that *is* the game. This means:

1. **Every story ships the entire platform.** A 1.2MB bundle where ~90% is shared infrastructure.
2. **No standard distribution format.** Authors must build and deploy a full web app or share source code.
3. **No consistent player experience.** Each story bundles its own client, so UI, save system, and accessibility vary.
4. **Security concerns.** Stories with full platform access have no sandboxing — they're arbitrary JS running in the browser.

The IF community has a well-established pattern: a **runner** (Frotz, Gargoyle, Lectrote, Parchment) loads **story files** (Z-machine, Glulx, Blorb). Authors distribute small story files; players install one runner. Sharpee has no equivalent.

### Goals

- Authors distribute a single `.sharpee` story file, not a full application
- Players install a single Sharpee Runner (desktop app via Tauri, or web-hosted)
- The runner provides a consistent, curated experience: UI, save/restore, accessibility
- Story code executes in a sandboxed context with no direct filesystem or network access
- Story files are JS bundles exporting the existing `Story` interface — no new DSL

### Non-Goals

- Defining a declarative story format or DSL (stories remain TypeScript, compiled to JS)
- Binary/bytecode compilation (story files are standard JavaScript)
- Backward compatibility with other IF formats (Z-machine, Glulx, TADS)
- Multiplayer or online services (future ADR if needed)

## Decision

### Split the build into Runner and Story Bundle

**Sharpee Runner** is a standalone application containing:

- GameEngine, stdlib, world-model
- parser-en-us, lang-en-us
- platform-browser (UI, menus, dialogs, save/restore)
- Story loader (loads `.sharpee` files into a sandboxed context)

**Story Bundle** (`.sharpee`) is a JS file containing:

- World definition (rooms, objects, NPCs, traits)
- Story-specific actions, behaviors, event handlers
- Grammar extensions (story-specific verbs/patterns)
- Language extensions (story-specific messages)
- Story metadata (title, author, version, description)

The story bundle exports a `Story` object — the same interface stories already implement. The build change is scope, not shape.

### Story File Format

A `.sharpee` file is a zip archive with a known extension. Contents:

```
dungeo.sharpee (zip)
├── story.js              # Story code bundle (esbuild output)
├── meta.json             # Story metadata (title, author, version, compatibility)
├── theme.css             # Optional story stylesheet (see ADR-122)
└── assets/               # Optional media assets (see ADR-122)
    ├── dam-exterior.jpg
    └── fonts/
        └── custom-font.woff2
```

The `story.js` module exports the standard `Story` interface:

```javascript
export const story = {
  config: { title: "DUNGEO", author: "...", version: "..." },
  extendParser(parser) { /* ... */ },
  extendLanguage(language) { /* ... */ },
  async initializeWorld(world, engine) { /* ... */ }
};
```

The runner extracts the archive to a temporary directory, reads `meta.json` for library/compatibility info, loads `story.js` via dynamic `import()`, applies `theme.css` if present, and serves assets to the webview.

### Runner Variants

| Variant | Shell | Distribution | Use Case |
|---------|-------|-------------|----------|
| **Tauri desktop** | Native window + OS webview | `.exe`, `.dmg`, `.AppImage` | Primary player experience |
| **Web hosted** | Browser tab | URL | Play online, no install |
| **CLI** | Terminal | `npm install -g` | Testing, purists |

All variants share the same platform packages. Only the outer shell differs.

### Tauri Desktop Runner

The Tauri app provides:

- **Native file picker** for loading `.sharpee` files and save/restore
- **Story library** — remembers previously opened stories, lists available ones
- **Sandboxed webview** — story JS runs inside the webview with no Node/Rust API access
- **Native save/restore** — real files on disk instead of localStorage, using Tauri's IPC commands
- **Native menus** (optional, can keep HTML menus initially)
- **Desktop integration** — `.sharpee` file association, drag-and-drop

### Security Model

Story bundles execute inside the webview sandbox:

- **No filesystem access** — save/restore goes through runner IPC, not direct file I/O
- **No network access** — stories cannot fetch URLs or open sockets
- **No platform APIs** — Tauri's `invoke()` is only exposed for runner-defined commands (save, restore, file pick)
- **Content Security Policy** — the runner's HTML sets CSP to block inline scripts, external resources

The runner acts as a capability broker: the story asks "save this state" and the runner decides how and where.

### Build Integration

```bash
# Build the runner (once, or on platform updates)
./build.sh --runner                    # Builds Tauri app with platform packages

# Build a story bundle (per story)
./build.sh --story-bundle -s dungeo    # Outputs dist/stories/dungeo.sharpee

# Development mode (current behavior, unchanged)
./build.sh -s dungeo -c browser        # Monolithic bundle for dev/testing
```

The `--story-bundle` flag uses esbuild to bundle only the story code, marking all `@sharpee/*` packages as external (they're provided by the runner).

### Story Metadata

The `meta.json` file inside the archive provides metadata without executing story code:

```json
{
  "format": "sharpee-story",
  "formatVersion": 1,
  "title": "DUNGEO",
  "author": "ChicagoDave",
  "version": "0.9.60-beta.20260128",
  "description": "A port of Mainframe Zork",
  "sharpeeVersion": ">=0.9.60",
  "ifid": "UUID-HERE",
  "hasAssets": true,
  "hasTheme": true
}
```

The runner reads `meta.json` from the zip without extracting the full archive, enabling story library UI, version compatibility checks, and IFDB integration.

### Migration Path

1. **Phase 1**: Build produces both monolithic bundles (current) and story bundles (new). Runner is a minimal Tauri app wrapping platform-browser.
2. **Phase 2**: Runner gets story library UI, native save/restore, file association.
3. **Phase 3**: Web-hosted runner (static site that loads `.sharpee` via URL parameter or file upload).
4. **Phase 4**: Community infrastructure — story repository, IFDB integration, auto-updates.

## Consequences

### Positive

- **Familiar to IF community** — matches the runner + story file pattern they expect
- **Small story distribution** — story files are tens of KB, not 1.2MB
- **Consistent player experience** — one runner, uniform UI/save/accessibility
- **Security** — sandboxed execution, no arbitrary filesystem/network access
- **Simpler for authors** — build a `.sharpee` file, don't worry about deployment
- **Tauri keeps it light** — ~10MB runner vs ~150MB Electron

### Negative

- **Two build targets** — runner and story bundles must stay version-compatible
- **Version coupling** — a story built for runner v1.2 might not work on v1.0 (mitigated by `sharpeeVersion` in metadata)
- **Dynamic import security** — loading arbitrary JS is inherently risky; the sandbox must be carefully configured
- **Platform-browser changes** — save/restore needs to support both localStorage (web) and native file system (Tauri) via an abstraction layer

### Neutral

- Stories remain TypeScript — no new language to learn, no DSL lock-in
- Existing monolithic build continues to work for development
- The `Story` interface is unchanged — stories don't know or care if they're in a monolith or a runner

## References

- ADR-120: Engine Plugin Architecture (runner leverages plugin system for story loading)
- ADR-087: Action-Centric Grammar (grammar extensions in story bundles)
- Frotz/Gargoyle/Lectrote — prior art for runner + story file pattern
- Tauri v2 — https://v2.tauri.app/
- Treaty of Babel — IFID standard for story identification
