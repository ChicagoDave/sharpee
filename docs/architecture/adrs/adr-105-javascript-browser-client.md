# ADR-105: JavaScript Browser Client

## Status: PROPOSED

## Date: 2026-01-16

## Context

Sharpee games currently run via Node.js CLI. To reach a wider audience, we need a browser-based client that can run games directly in web browsers without server-side processing.

### Why JavaScript, Not WebAssembly?

WASM was initially considered but is **not appropriate** for Sharpee because:

1. **Pure TypeScript Engine** - The entire engine is TypeScript with no native code or computationally intensive operations. WASM provides no performance benefit.

2. **Bundle Size** - A WASM runtime adds overhead. JavaScript bundles are smaller and load faster.

3. **Debugging** - JavaScript source maps work natively in browser DevTools. WASM debugging is harder.

4. **Existing Infrastructure** - We already have `@sharpee/platform-browser-en-us` with DOM integration. Using it directly is simpler than wrapping in WASM.

WASM would only make sense if we:
- Rewrote the engine in Rust/C++ for performance (unnecessary)
- Had computationally expensive operations (we don't)
- Needed memory isolation (not a concern for IF)

### Current Browser Platform

`packages/platforms/browser-en-us/` already provides:

- `BrowserPlatform` - Event handling, platform operations
- `BrowserClient` - DOM manipulation, command input, history
- localStorage integration for saves
- Status line updates

### What's Missing

1. **Browser-targeted bundle** - Current `dist/sharpee.js` uses `--platform=node`
2. **Story-specific entry point** - Wire a story to BrowserPlatform
3. **HTML template** - Minimal shell with required DOM elements
4. **Hosting strategy** - Static files, no server needed

## Decision

Create a browser bundling system that:

1. Uses esbuild with `--platform=browser`
2. Generates story-specific bundles (e.g., `dungeo-web.js`)
3. Includes HTML template and minimal CSS
4. Produces fully static, self-contained distributions

### Bundle Architecture

```
dist/web/dungeo/
├── index.html        # HTML shell
├── dungeo.js         # Bundled game + engine
├── dungeo.js.map     # Source map
└── styles.css        # Minimal IF styling
```

### Entry Point Pattern

Each story needs a browser entry point:

```typescript
// stories/dungeo/src/browser-entry.ts
import { createBrowserPlatform } from '@sharpee/platform-browser-en-us';
import { DungeoStory } from './index';

const story = new DungeoStory();
const { world, player } = story.initializeWorld();

const platform = createBrowserPlatform({ story, world, player });

// Auto-start when DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => platform.start());
} else {
  platform.start();
}
```

### HTML Template

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>DUNGEO</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <div id="game-container">
    <div id="status-line">
      <span id="location-name">West of House</span>
      <span id="score-turns">Score: 0 | Turns: 0</span>
    </div>
    <div id="main-window">
      <div id="text-content"></div>
    </div>
    <div id="input-area">
      <span class="prompt">&gt;</span>
      <input id="command-input" type="text"
             autocomplete="off" autocapitalize="none"
             spellcheck="false" autofocus>
    </div>
  </div>
  <script type="module" src="dungeo.js"></script>
</body>
</html>
```

### Bundle Script

```bash
#!/bin/bash
# scripts/bundle-browser.sh [story-name]

STORY=${1:-dungeo}
ENTRY="stories/$STORY/src/browser-entry.ts"
OUTDIR="dist/web/$STORY"

mkdir -p "$OUTDIR"

npx esbuild "$ENTRY" \
  --bundle \
  --platform=browser \
  --target=es2020 \
  --format=esm \
  --outfile="$OUTDIR/$STORY.js" \
  --sourcemap \
  --minify

# Copy HTML template and CSS
cp templates/browser/index.html "$OUTDIR/"
cp templates/browser/styles.css "$OUTDIR/"

# Replace placeholders in HTML
sed -i "s/{{STORY_NAME}}/$STORY/g" "$OUTDIR/index.html"
sed -i "s/{{BUNDLE_NAME}}/$STORY.js/g" "$OUTDIR/index.html"

echo "Built: $OUTDIR/"
```

### Node API Audit

These packages use Node APIs and must NOT be included in browser bundles:

| Package | Node APIs | Browser Strategy |
|---------|-----------|------------------|
| `transcript-tester` | fs, path, glob | Exclude (test tooling) |
| `cli-en-us` | readline | Exclude (CLI only) |

Core packages (`engine`, `world-model`, `stdlib`, `parser-en-us`, `lang-en-us`) are Node-API-free and browser-safe.

### Save/Load Strategy

Browser platform uses localStorage:

```typescript
// Already implemented in browser-platform.ts
localStorage.setItem('sharpee-save', JSON.stringify(saveData));
localStorage.getItem('sharpee-save');
```

Future enhancement: IndexedDB for larger saves, or download/upload JSON files.

## Implementation Plan

### Phase 1: Bundle Infrastructure
1. Create `scripts/bundle-browser.sh`
2. Create `templates/browser/` with HTML and CSS
3. Verify esbuild produces browser-compatible output

### Phase 2: Dungeo Browser Entry
1. Create `stories/dungeo/src/browser-entry.ts`
2. Build and test in browser
3. Fix any Node API leaks

### Phase 3: Polish
1. Responsive CSS for mobile
2. Touch-friendly input
3. PWA manifest for installability
4. Loading indicator

### Phase 4: Distribution
1. GitHub Pages deployment
2. itch.io package
3. Documentation

## Alternatives Considered

### 1. Server-Side Rendering
Run engine on server, send HTML to client. Rejected because:
- Requires hosting infrastructure
- Adds latency
- Harder to distribute

### 2. WebAssembly Compilation
Compile TypeScript → WASM via AssemblyScript. Rejected because:
- No performance benefit for text processing
- Larger bundles
- Debugging complexity
- AssemblyScript has TypeScript subset limitations

### 3. Electron
Desktop app with embedded browser. Already exists at `packages/clients/electron/`. Browser client is complementary, not replacement.

## Related ADRs

| ADR | Relationship |
|-----|--------------|
| ADR-096 | ITextBlock rendering in browser |
| ADR-097 | React client (alternative to vanilla JS) |
| ADR-100 | Screen reader accessibility requirements |
| ADR-101 | Graphical client architecture |

## Success Criteria

1. `dist/web/dungeo/` contains playable game
2. Works in Chrome, Firefox, Safari, Edge
3. Bundle size < 500KB minified
4. Load time < 2 seconds on 3G
5. Passes basic accessibility audit (keyboard nav, ARIA)
