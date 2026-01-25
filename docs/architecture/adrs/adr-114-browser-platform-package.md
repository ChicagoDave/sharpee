# ADR-114: Browser Platform Package

## Status: PROPOSED

## Date: 2026-01-24

## Supersedes: ADR-105

ADR-105 described a browser bundling approach where each story implements its own `browser-entry.ts` with ~1400 lines of UI code (menus, dialogs, save/restore, text display). This led to code duplication and inconsistent implementations.

This ADR replaces that approach with a shared `@sharpee/platform-browser` package.

## Context

### Problems with ADR-105 Approach

1. **Code Duplication** - Each story copies ~1400 lines of browser UI code
2. **Inconsistent Features** - Stories may implement save/restore differently
3. **Maintenance Burden** - Bug fixes must be applied to every story
4. **Feature Drift** - New features (themes, menus) require updating all stories

### Current State

The browser client for dungeo includes:
- Menu bar (File, Settings, Help)
- Theme system (4 themes with CSS variables)
- Save/restore dialogs with localStorage persistence
- Auto-save on every turn
- Command history
- Status line updates
- Text display with scroll

All of this is in `stories/dungeo/src/browser-entry.ts`. Other stories would need to duplicate this.

### Goals

1. **Single Implementation** - One place for browser UI code
2. **Minimal Story Entry** - Stories should be ~10-20 lines
3. **Extensible** - Easy to add features (themes, accessibility, PWA)
4. **Consistent UX** - All Sharpee games have same UI patterns

## Decision

Create `@sharpee/platform-browser` package that provides a complete browser runtime. Stories import and configure it with minimal code.

### Package Structure

```
packages/platform-browser/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts                    # Public exports
│   ├── BrowserClient.ts            # Main orchestrator
│   ├── types.ts                    # Interfaces and types
│   │
│   ├── managers/
│   │   ├── MenuManager.ts          # Menu bar interactions
│   │   ├── ThemeManager.ts         # Theme switching + persistence
│   │   ├── SaveManager.ts          # localStorage save/restore
│   │   ├── DialogManager.ts        # Modal dialogs
│   │   └── InputManager.ts         # Command input + history
│   │
│   └── display/
│       ├── TextDisplay.ts          # Text output + scrolling
│       └── StatusLine.ts           # Location, score, turns
│
templates/browser/
├── index.html                      # Shared HTML template
└── infocom.css                     # Shared CSS with themes
```

### Story Entry Point

Stories become minimal:

```typescript
// stories/dungeo/src/browser-entry.ts
import { BrowserClient } from '@sharpee/platform-browser';
import { story, config } from './index';

const client = new BrowserClient({
  story,
  config,
  storagePrefix: 'dungeo',  // For localStorage keys
});

client.start();
```

That's it. ~10 lines instead of ~1400.

### BrowserClient Interface

```typescript
interface BrowserClientOptions {
  // Required
  story: IStory;
  config: IStoryConfig;

  // Optional
  storagePrefix?: string;        // Default: config.id
  defaultTheme?: ThemeName;      // Default: 'dos-classic'
  enableAutoSave?: boolean;      // Default: true
  enableMenuBar?: boolean;       // Default: true
  customHelpText?: string;       // Override default help
  customAboutText?: string;      // Override default about
}

class BrowserClient {
  constructor(options: BrowserClientOptions);

  // Lifecycle
  start(): Promise<void>;
  stop(): void;

  // For advanced use
  getEngine(): GameEngine;
  getWorld(): WorldModel;
  getThemeManager(): ThemeManager;
  getSaveManager(): SaveManager;
}
```

### Manager Responsibilities

**MenuManager**
- Toggle dropdowns on click
- Close on outside click / Escape
- Delegate actions to other managers
- Wire File menu → SaveManager
- Wire Settings → ThemeManager
- Wire Help → TextDisplay

**ThemeManager**
- Apply theme via `data-theme` attribute
- Persist to localStorage
- Load saved theme on startup (early, to avoid flash)
- Update checkmarks in theme submenu

**SaveManager**
- localStorage with configurable prefix
- Save index (metadata for all saves)
- Auto-save after each turn
- Compress transcript HTML (lz-string)
- Capture world state (locations + traits)
- Restore without replacing entities (preserves handlers)

**DialogManager**
- Show/hide modal overlay
- Save dialog (name input, existing saves list)
- Restore dialog (save slot selection)
- Startup dialog (continue saved game?)
- Keyboard navigation (Escape to close)

**InputManager**
- Command input handling
- Command history (up/down arrows)
- Focus management
- Disable during dialogs

**TextDisplay**
- Append paragraphs
- Command echo styling
- Auto-scroll to bottom
- Clear screen

**StatusLine**
- Update location name
- Update score/turns
- Sync from world capabilities

### Theme System

Four built-in themes via CSS custom properties:

| Theme | Description |
|-------|-------------|
| `dos-classic` | Blue background, DOS VGA font, cyan accents |
| `modern-dark` | Catppuccin Mocha colors, Inter font |
| `retro-terminal` | Green phosphor, scanlines, JetBrains Mono |
| `paper` | Cream background, Crimson Text serif |

Themes defined in `templates/browser/infocom.css` using `[data-theme="name"]` selectors.

### Build Integration

Update `build.sh` to include platform-browser in dependency order:

```bash
PACKAGES=(
  # ... existing packages ...
  "@sharpee/platform-browser:platform-browser"
)
```

Browser client build (`-c browser`) bundles:
1. Platform browser package
2. Story package
3. Story's minimal browser-entry.ts

### Event Integration

BrowserClient subscribes to engine events:

```typescript
engine.on('text:output', (text, turn) => {
  this.textDisplay.append(text);
  this.statusLine.update(turn);
  if (this.options.enableAutoSave) {
    this.saveManager.autoSave();
  }
});

engine.on('event', (event) => {
  // Handle score changes, errors, beeps, etc.
});
```

### Save/Restore Hooks

BrowserClient registers hooks with engine:

```typescript
engine.registerSaveRestoreHooks({
  onSaveRequested: () => this.dialogManager.showSaveDialog(),
  onRestoreRequested: () => this.dialogManager.showRestoreDialog(),
  onRestartRequested: () => this.handleRestart(),
});
```

## Alternatives Considered

### 1. Inline Script in HTML Template

Put menu/theme JavaScript directly in `index.html`.

Rejected because:
- Mixes concerns (template vs. logic)
- Harder to test
- No TypeScript
- Can't share code with stories that need customization

### 2. Keep Per-Story Entry Points

Continue ADR-105 approach with better documentation.

Rejected because:
- Still duplicates code
- Bug fixes require updating all stories
- New features require updating all stories

### 3. Framework-Based (React/Vue)

Use a frontend framework for the browser client.

Rejected because:
- Text adventure UI is simple (no complex state)
- Framework adds bundle size (~30-80KB)
- Framework adds load time (hydration)
- Vanilla JS is appropriate for this use case

React client exists separately for richer UIs if needed.

## Migration

### Existing Stories

1. Create `@sharpee/platform-browser` package
2. Move code from `stories/dungeo/src/browser-entry.ts` into package
3. Simplify dungeo's browser-entry.ts to use package
4. Other stories get browser support by adding minimal entry

### Timeline

1. **Phase 1**: Create package, migrate dungeo
2. **Phase 2**: Add to other stories as needed
3. **Phase 3**: Enhanced features (PWA, accessibility)

## Success Criteria

1. Story browser-entry.ts files are < 30 lines
2. All browser features work identically across stories
3. New theme/menu features require updating only platform-browser
4. Bundle size remains < 1.5MB (engine + story + platform)
5. No regressions in existing browser client functionality

## Related ADRs

| ADR | Relationship |
|-----|--------------|
| ADR-097 | React client (separate, richer UI option) |
| ADR-105 | Superseded by this ADR |
| ADR-112 | Client security model (applies to browser) |
