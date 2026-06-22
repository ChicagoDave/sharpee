# @sharpee/bootstrap

Load and assemble a Sharpee story (entry-aware) into a runnable game.

## Installation

```bash
npm install @sharpee/bootstrap
```

## Overview

`@sharpee/bootstrap` is the single story-loading implementation for the platform — transcript-tester, the CLI bundle, and devkit all call it instead of hand-copying the wiring (ADR-180):

- **Resolve** — locates a story module from a directory, honoring an optional sub-entry (the transcript `entry:` header)
- **Assemble** — wires `GameEngine` + world + player + parser + language + perception into one runnable game
- **Channel output capture** — flattens the `main` channel's packet entries to plain text via the ADR-163 channel-packet path (the canonical CLI/test output)
- **CLI capability profile** — `CLI_CAPABILITIES` (ADR-165) exposes a text-only surface for test/CLI mode

## Usage

```typescript
import { loadStory, assembleGame, resolveStoryModulePath } from '@sharpee/bootstrap';

// Load a story directory (entry-aware) into a started, runnable game
const game = await loadStory('/path/to/story', { entry: 'main' });

// Execute a turn; returns the captured `main`-channel text
const text = await game.executeCommand('look');
console.log(text);

// Or assemble from an already-loaded story instance
const game2 = assembleGame(storyInstance);
```

A `LoadedGame` exposes `engine`, `world`, `testingExtension`, the last turn's
`lastOutput` / `lastEvents` / `lastTurnResult`, `getPluginRegistry()` (save/restore
plugin state), and `executeCommand(input)`.

## Exports

| Export | Description |
|--------|-------------|
| `loadStory(location, opts?)` | Resolve + load a story directory, return a started `LoadedGame` |
| `assembleGame(story)` | Assemble a `LoadedGame` from an already-loaded story instance |
| `resolveStoryModulePath(location, entry?)` | Resolve a story directory (entry-aware) to its module path |
| `buildManifest` | Introspect a story into a project manifest |
| `CLI_CAPABILITIES` | Text-only CLI/test capability profile (ADR-165) |
| `LoadedGame` | Type of a loaded, runnable game with output capture |

## Related Packages

- [@sharpee/engine](https://www.npmjs.com/package/@sharpee/engine) - Game runtime
- [@sharpee/devkit](https://www.npmjs.com/package/@sharpee/devkit) - Build/test/scaffold CLI engine
- [@sharpee/sharpee](https://www.npmjs.com/package/@sharpee/sharpee) - Full platform bundle

## License

MIT
