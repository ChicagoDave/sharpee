# @sharpee/sharpee

A modern TypeScript interactive fiction engine for creating text adventures and parser-based games.

[![npm version](https://img.shields.io/npm/v/@sharpee/sharpee/latest.svg)](https://www.npmjs.com/package/@sharpee/sharpee)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Installation

Add the runtime library to a project that embeds the engine:

```bash
npm install @sharpee/sharpee
```

To scaffold and build a story from the command line, install the devkit globally —
it provides the `sharpee` CLI:

```bash
npm install -g @sharpee/devkit
# then
sharpee init my-story
sharpee build
```

## Features

- **Event-Driven Architecture** - Immutable events for all state changes
- **Rich World Model** - Entities with traits, behaviors, and relationships
- **Natural Language Parser** - Understands complex player commands
- **Extensible** - Add custom actions, behaviors, and game mechanics
- **Type-Safe** - Full TypeScript with strict typing

## Quick Start

```typescript
import {
  GameEngine,
  EnglishParser,
  EnglishLanguageProvider
} from '@sharpee/sharpee';

// Set up language + parser
const language = new EnglishLanguageProvider();
const parser = new EnglishParser(language);

// Build the engine (world and player typically come from your story setup)
const engine = new GameEngine({ world, player, parser, language });

// Register the story, then start
engine.setStory(story);
engine.start();

// Process player commands
const result = await engine.executeTurn('look');
```

> Rendering is no longer a separate text service (ADR-174). The engine's prose
> pipeline produces `ITextBlock[]` that are carried to the UI by channels
> (ADR-163); use `renderToString` to flatten blocks for a plain-text host.

## What's Included

This umbrella package re-exports the **story runtime baseline** — the imports a
story author needs (ADR-178). It deliberately does **not** re-export every
symbol from every sub-package; for advanced use, import the specific sub-package
directly (e.g. `@sharpee/world-model`, `@sharpee/stdlib`).

| Export | Description |
|--------|-------------|
| `GameEngine` | Main game runtime |
| `WorldModel`, `IFEntity`, `TraitType` | Entity and world management (types) |
| `EnglishParser` | Natural language command parser |
| `EnglishLanguageProvider` | English language provider |
| `renderToString`, `renderStatusLine` | Flatten prose blocks for a text host |
| `ITextBlock`, `IDecoration` | Prose-pipeline output types (ADR-096) |
| `QueryManager` | Player input queries (yes/no, menus) |

## Standard Actions

The engine includes 48 standard IF actions out of the box:

- **Movement**: go, enter, exit
- **Manipulation**: take, drop, put, insert, remove
- **Interaction**: open, close, lock, unlock, push, pull
- **Observation**: look, examine, search, read
- **Communication**: talk, give, show
- **Meta**: save, restore, quit, inventory, score

## Documentation

- [GitHub Repository](https://github.com/ChicagoDave/sharpee)
- [Author's Guide](https://github.com/ChicagoDave/sharpee/blob/main/docs/getting-started/authors/README.md)
- [API Reference](https://github.com/ChicagoDave/sharpee/blob/main/docs/api/README.md)
- [Architecture Decisions](https://github.com/ChicagoDave/sharpee/blob/main/docs/architecture/adrs/)

## Example Stories

See the [stories directory](https://github.com/ChicagoDave/sharpee/tree/main/stories) for complete examples:

- **Cloak of Darkness** - The classic IF benchmark
- **Dungeo** - Full implementation of Mainframe Zork (~190 rooms)

## Requirements

- Node.js 18+
- TypeScript 5.2+ (for development)

## License

MIT
