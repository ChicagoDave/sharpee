# Sharpee Interactive Fiction Platform

[![npm](https://img.shields.io/npm/v/@sharpee/sharpee?label=npm&color=orange)](https://www.npmjs.com/package/@sharpee/sharpee)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.2+-blue.svg)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](./LICENSE)

A modern, TypeScript-based platform for creating parser-based interactive fiction.

## Installation

```bash
npm install @sharpee/sharpee@beta
```

> **Beta Release**: This is a standalone release of the core platform. Documentation and examples are coming soon.

## What's Included

The `@sharpee/sharpee` meta-package installs all core packages:

| Package | Description |
|---------|-------------|
| `@sharpee/core` | Event system, types, utilities |
| `@sharpee/world-model` | Entity system with traits and behaviors |
| `@sharpee/stdlib` | 40+ standard IF actions |
| `@sharpee/engine` | Game runtime and command processor |
| `@sharpee/parser-en-us` | English natural language parser |
| `@sharpee/lang-en-us` | English language messages |
| `@sharpee/if-domain` | Grammar builder interfaces |
| `@sharpee/if-services` | Service interfaces |
| `@sharpee/event-processor` | Event processing |
| `@sharpee/text-services` | Text formatting |

## Features

- **Event-Driven Architecture** - Immutable events for all state changes
- **Natural Language Parser** - Understands complex player commands
- **Rich World Model** - Entities with traits, behaviors, and relationships
- **40+ Standard Actions** - take, drop, open, close, lock, unlock, wear, eat, drink, attack, and more
- **NPC System** - Autonomous characters with behaviors and schedules
- **Daemons & Fuses** - Timed events and background processes
- **Type-Safe** - Full TypeScript with strict typing

## Coming Soon

- **Documentation** - Author's guide, API reference, tutorials
- **Examples** - Sample stories showing platform capabilities
- **Dungeon** - Full implementation of Mainframe Zork (~191 rooms), currently in development

## Architecture

```
┌─────────────────────────────────────────────┐
│              Your Story                     │
├─────────────────────────────────────────────┤
│   stdlib (actions) │ lang-en-us (messages)  │
├─────────────────────────────────────────────┤
│   world-model │ parser-en-us │ engine       │
├─────────────────────────────────────────────┤
│              core (events)                  │
└─────────────────────────────────────────────┘
```

## Development

```bash
# Clone and setup
git clone https://github.com/ChicagoDave/sharpee.git
cd sharpee
pnpm install
pnpm build

# Run tests
pnpm test
```

## Standard Actions

The stdlib includes these action categories:

**Movement**: going, entering, exiting
**Manipulation**: taking, dropping, putting, inserting, removing
**Containers/Doors**: opening, closing, locking, unlocking
**Examination**: looking, examining, searching, reading
**Interaction**: talking, giving, showing, throwing, attacking
**Devices**: switching on/off, pushing, pulling
**Wearables**: wearing, taking off
**Consumables**: eating, drinking
**Senses**: touching, smelling, listening
**Meta**: inventory, score, help, save, restore, quit

## License

MIT License - see [LICENSE](./LICENSE)

## Links

- [GitHub Repository](https://github.com/ChicagoDave/sharpee)
- [npm Package](https://www.npmjs.com/package/@sharpee/sharpee)
- [Issue Tracker](https://github.com/ChicagoDave/sharpee/issues)

---

Built for the interactive fiction community.
