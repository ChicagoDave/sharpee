# Thin Web Client Implementation Plan

## Goal

Create a minimal browser-based IF client with DOS-era Infocom aesthetics (white/cyan on blue). Pure vanilla JS, no frameworks.

## Current State

`packages/platforms/browser-en-us/` already provides:
- `BrowserClient` - DOM manipulation, command input, history (up/down arrows)
- `BrowserPlatform` - Engine integration, event handling, save/restore via localStorage

**This is 90% of what we need.** The work is mostly:
1. Bundle script targeting browser
2. HTML shell template
3. CSS for Infocom DOS look
4. Story-specific entry point

## Target Aesthetic

```
┌─────────────────────────────────────────────────────────┐
│ West of House                          Score: 0  Turns: 0│  ← Cyan bar, black text
├─────────────────────────────────────────────────────────┤
│                                                          │
│ You are standing in an open field west of a white house, │  ← Blue background
│ with a boarded front door.                               │    White text
│ There is a small mailbox here.                           │    Fixed-width font
│                                                          │
│ > open mailbox                                           │  ← Command echo
│                                                          │
│ Opening the small mailbox reveals a leaflet.             │
│                                                          │
│ > _                                                      │  ← Input cursor
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## Implementation Phases

### Phase 1: Bundle Infrastructure (~30 min)

**Files to create:**
- `scripts/bundle-browser.sh` - esbuild for browser target
- `templates/browser/index.html` - HTML shell with placeholders
- `templates/browser/infocom.css` - DOS-era styling

**Bundle script:**
```bash
#!/bin/bash
STORY=${1:-dungeo}
ENTRY="stories/$STORY/src/browser-entry.ts"
OUTDIR="dist/web/$STORY"

mkdir -p "$OUTDIR"

npx esbuild "$ENTRY" \
  --bundle \
  --platform=browser \
  --target=es2020 \
  --format=iife \
  --outfile="$OUTDIR/$STORY.js" \
  --sourcemap \
  --minify

cp templates/browser/index.html "$OUTDIR/"
cp templates/browser/infocom.css "$OUTDIR/styles.css"
sed -i "s/{{TITLE}}/$STORY/g" "$OUTDIR/index.html"
```

### Phase 2: HTML Template (~15 min)

Minimal HTML shell:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{TITLE}}</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <div id="game-container">
    <div id="status-line">
      <span id="location-name"></span>
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
  <script src="{{TITLE}}.js"></script>
</body>
</html>
```

### Phase 3: Infocom DOS CSS (~30 min)

```css
/* DOS Infocom Color Palette */
:root {
  --dos-blue: #0000aa;
  --dos-cyan: #00aaaa;
  --dos-white: #aaaaaa;
  --dos-bright-white: #ffffff;
  --dos-black: #000000;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html, body {
  height: 100%;
  overflow: hidden;
}

body {
  background: var(--dos-blue);
  color: var(--dos-bright-white);
  font-family: "Perfect DOS VGA 437", "Consolas", "Courier New", monospace;
  font-size: 16px;
  line-height: 1.3;
}

#game-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  max-width: 80ch;  /* Classic 80-column terminal */
  margin: 0 auto;
  padding: 0;
}

/* Status Line - Cyan background, black text */
#status-line {
  background: var(--dos-cyan);
  color: var(--dos-black);
  padding: 2px 8px;
  display: flex;
  justify-content: space-between;
  font-weight: bold;
  flex-shrink: 0;
}

/* Main Text Window */
#main-window {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

#main-window p {
  margin-bottom: 0.5em;
}

/* Command echo styling */
.command-echo {
  color: var(--dos-white);
  margin-top: 1em;
}

/* Input Area */
#input-area {
  display: flex;
  align-items: center;
  padding: 4px 8px;
  border-top: 1px solid var(--dos-cyan);
}

.prompt {
  margin-right: 4px;
}

#command-input {
  flex: 1;
  background: transparent;
  border: none;
  color: var(--dos-bright-white);
  font-family: inherit;
  font-size: inherit;
  outline: none;
  caret-color: var(--dos-bright-white);
}

/* Hide scrollbar but allow scrolling */
#main-window::-webkit-scrollbar {
  width: 0;
}

/* System messages */
.system-message {
  color: var(--dos-cyan);
  font-style: italic;
}

/* Game over / victory */
.game-status {
  color: var(--dos-bright-white);
  text-align: center;
  font-weight: bold;
  margin: 1em 0;
}
```

### Phase 4: Browser Entry Point (~20 min)

Create `stories/dungeo/src/browser-entry.ts`:

```typescript
import { BrowserPlatform } from '@sharpee/platform-browser-en-us';
import { GameEngine } from '@sharpee/engine';
import { DungeoStory } from './index';

// Initialize story
const story = new DungeoStory();

// Create engine with story
const engine = new GameEngine(story);

// Create browser platform
const platform = new BrowserPlatform(engine);

// Start when DOM ready
function start() {
  platform.initialize();
  platform.start();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start);
} else {
  start();
}
```

### Phase 5: Test & Fix (~1-2 hours)

1. Build bundle: `./scripts/bundle-browser.sh dungeo`
2. Serve locally: `npx serve dist/web/dungeo`
3. Test in browser, fix any issues:
   - Node API leaks (fs, path, etc.)
   - Missing DOM elements
   - Event wiring issues
   - CSS tweaks

### Phase 6: Polish (Optional)

- [ ] Loading indicator while bundle parses
- [ ] Mobile-friendly touch input
- [ ] PWA manifest for "Add to Home Screen"
- [ ] Retro CRT scanline effect (CSS filter)
- [ ] Blinking cursor animation

## Files to Create

| File | Purpose |
|------|---------|
| `scripts/bundle-browser.sh` | Build script |
| `templates/browser/index.html` | HTML shell |
| `templates/browser/infocom.css` | DOS styling |
| `stories/dungeo/src/browser-entry.ts` | Dungeo entry point |

## Files That Already Exist (No Changes Needed)

| File | Status |
|------|--------|
| `packages/platforms/browser-en-us/src/browser-client.ts` | Ready |
| `packages/platforms/browser-en-us/src/browser-platform.ts` | Ready |

## Success Criteria

1. `./scripts/bundle-browser.sh dungeo` produces `dist/web/dungeo/`
2. Opening `index.html` shows playable game
3. White text on blue background, cyan status bar
4. Bundle size < 500KB minified
5. Works in Chrome, Firefox, Safari

## Risks

1. **Node API contamination** - Some package might import `fs` or `path`. esbuild will warn; we fix.
2. **GameEngine initialization** - May need adjustments for browser context.
3. **localStorage size limits** - Large save states might hit browser limits (~5MB).

## Time Estimate

Core implementation: ~2 hours
Testing & fixes: ~1-2 hours
Polish: Optional, as desired

## Next Steps

1. Create bundle script
2. Create HTML template
3. Create CSS
4. Create browser entry point
5. Build and test
