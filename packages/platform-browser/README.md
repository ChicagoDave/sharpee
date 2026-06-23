# @sharpee/platform-browser

Browser client infrastructure for Sharpee interactive fiction.

## Installation

```bash
npm install @sharpee/platform-browser
```

## Overview

- **Framework-free** - reusable browser managers and display components built on plain DOM, with no React, Lit, or Web Components.
- **`BrowserClient`** - the main client that wires together save/restore, themes, menus, dialogs, input, and display.
- **Managers** - `ThemeManager`, `SaveManager`, `DialogManager`, `MenuManager`, and `InputManager` for advanced, à-la-carte use.
- **Display components** - `TextDisplay` and `StatusLine` render the engine's output regions.
- **Audio** - `AudioManager` plays the audio events defined by `@sharpee/media`.
- **Channel renderers** (ADR-165) - default browser renderers that consume the channel-I/O wire stream, since channels are the universal UI surface.
- **Theme engine + built-in themes** (ADR-188) - ships the CSS engine (`styles/base.css`, `styles/engine.css`, `styles/decorations.css`) and the built-in themes (`styles/themes/*.css` + `manifest.json`, with bundled fonts) that the author build copies into a story's `dist/web/`. A theme is just a `[data-theme]` block of `--theme-*` tokens; the engine paints every `.sharpee-*` component from them, and the `:root` default (`classic`) keeps the page skinned with no theme selected. `ThemeManager` handles runtime switching.

## Usage

```typescript
import {
  BrowserClient,
  BROWSER_CAPABILITIES,
  registerDefaultBrowserRenderers,
  type BrowserClientConfig,
  type BrowserClientCallbacks,
} from '@sharpee/platform-browser';

const config: BrowserClientConfig = {
  // DOM elements, theme, story info, etc.
};

const callbacks: BrowserClientCallbacks = {
  // hook into save, restore, input handling
};

const client = new BrowserClient(config, callbacks);

// Or assemble individual pieces for advanced use
import { ThemeManager, SaveManager, TextDisplay } from '@sharpee/platform-browser';
```

## Key Exports

| Export | Description |
|--------|-------------|
| `BrowserClient`, `BROWSER_CAPABILITIES` | Main client and its declared client capabilities |
| `ThemeManager`, `SaveManager`, `DialogManager`, `MenuManager`, `InputManager` | Individual managers |
| `TextDisplay`, `StatusLine` | Display components |
| `AudioManager` | Browser audio playback |
| `registerDefaultBrowserRenderers`, channel renderers | Default channel-I/O renderers (ADR-165) |
| `BrowserClientConfig`, `BrowserClientCallbacks`, `ThemeConfig`, `SaveSlotMeta`, `BrowserSaveEnvelope` | Configuration and save types |
| `AUTOSAVE_SLOT` | Autosave slot constant |

## Related Packages

- [@sharpee/channel-service](https://www.npmjs.com/package/@sharpee/channel-service) - Wire producer and renderer (ADR-163/165)
- [@sharpee/media](https://www.npmjs.com/package/@sharpee/media) - Audio type definitions
- [@sharpee/text-blocks](https://www.npmjs.com/package/@sharpee/text-blocks) - Structured text interfaces
- [@sharpee/sharpee](https://www.npmjs.com/package/@sharpee/sharpee) - Full platform bundle

## License

MIT
