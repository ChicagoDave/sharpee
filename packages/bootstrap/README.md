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

// Run the story's opening (prologue, banner, first look). It is not a turn;
// its packets are in `game.openingPackets`, in the order the story states
const firstLook = await game.runOpening();
console.log(firstLook);

// Execute a turn; returns the turn's composed prose
const text = await game.executeCommand('take lamp');
console.log(text);

// Or assemble from an already-loaded story instance
const game2 = assembleGame(storyInstance);
```

A `LoadedGame` exposes `engine`, `world`, `testingExtension`, the last turn's
`lastOutput` / `lastEvents` / `lastTurnResult`, `getPluginRegistry()` (save/restore
plugin state), `runOpening()` with `openingPackets` and `openingPending`, and
`executeCommand(input)`. A head calls `runOpening()` once on a new game and not on
a restored one; after that, a RESTART's reboot runs the new game's opening too.

## Exports

| Export | Description |
|--------|-------------|
| `loadStory(location, opts?)` | Resolve + load a story directory, return a started `LoadedGame` |
| `assembleGame(story, opts?)` | Assemble a `LoadedGame` from an already-loaded story instance; without `opts.freshStory` a confirmed RESTART reports "restart is not supported here" instead of rebooting (ADR-248) |
| `resolveStoryModulePath(location, entry?)` | Resolve a story directory (entry-aware) to its module path |
| `purgeStoryModuleCache(storyRoot)` | Purge a story directory's modules from the require cache (restart/reboot support) |
| `moduleFreshStory(location, modulePath)` | Build an ADR-248 `freshStory` provider: purge, re-require, call `createStory()` |
| `buildManifest(world, story, generatedFrom)` | Project an already-constructed world into a `ProjectManifest` (story id + `'cli' \| 'bridge'` origin) |
| `CLI_CAPABILITIES` | Text-only CLI/test capability profile (ADR-165) |
| `LoadedGame` | Type of a loaded, runnable game with output capture |

## Related Packages

- [@sharpee/engine](https://www.npmjs.com/package/@sharpee/engine) - Game runtime
- [@sharpee/devkit](https://www.npmjs.com/package/@sharpee/devkit) - Build/test/scaffold CLI engine
- [@sharpee/sharpee](https://www.npmjs.com/package/@sharpee/sharpee) - Full platform bundle

## License

MIT
