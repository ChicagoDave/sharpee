# Sharpee Interactive Fiction Platform

A modern, extensible platform for creating interactive fiction experiences.

## Overview

Sharpee is a TypeScript-based interactive fiction engine that provides:

- **Event-driven architecture** - All state changes happen through events
- **Capability system** - Clean separation between world state and game mechanics
- **Extension support** - Add new features without modifying core
- **Multi-language support** - Built-in localization system
- **Type-safe** - Full TypeScript support throughout

## Quick Start

### Prerequisites

- Node.js 18+
- pnpm 8+

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/sharpee.git
cd sharpee

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test
```

## Development Guides

Choose your path based on what you want to build:

### 🏗️ [Platform Development](./docs/platform/README.md)
Contributing to Sharpee's core engine, world model, or standard library.

- Modify core systems
- Add new traits or behaviors  
- Improve parser and validation
- Enhance the capability system

### 🧩 [Extension Development](./docs/extensions/README.md)
Creating reusable packages that extend Sharpee's functionality.

- Build custom actions
- Create new capabilities
- Add specialized behaviors
- Package game mechanics

### 📖 [Story Development](./docs/stories/README.md)
Writing interactive fiction using Sharpee.

- Author games with TypeScript
- Use the standard library
- Integrate extensions
- Deploy your stories

> **Note:** The Forge visual authoring tool is planned but not yet implemented. Story development currently requires TypeScript knowledge.

## Architecture

Sharpee uses a layered architecture:

```
┌─────────────────────────────────────┐
│         Stories/Games               │
├─────────────────────────────────────┤
│         Extensions                  │
├─────────────────────────────────────┤
│      Standard Library               │
├─────────────────────────────────────┤
│    World Model │ Language System    │
├─────────────────────────────────────┤
│          Core Engine                │
└─────────────────────────────────────┘
```

### Key Concepts

- **Entities** - Things in the game world (rooms, items, actors)
- **Traits** - Behaviors attached to entities (container, wearable, lockable)
- **Actions** - Player commands that generate events
- **Events** - Immutable records of what happened
- **Capabilities** - Game state outside the entity model (score, saves, preferences)

## Project Structure

```
sharpee/
├── packages/
│   ├── core/           # Event system and engine
│   ├── world-model/    # Entity and trait system
│   ├── stdlib/         # Standard library of actions
│   ├── lang-en/        # English language pack
│   └── test-utils/     # Testing utilities
├── stories/            # Example games
├── docs/              # Documentation
└── decisions/         # Architecture decision records
```

## Current Status

### ✅ Stable
- Core event system
- World model with entities and traits
- Standard library actions
- Parser and validation
- Capability system

### 🚧 In Progress
- Additional standard library actions
- Extension packaging system
- Performance optimizations

### 📋 Planned
- Forge visual authoring tool
- Additional language packs
- Story distribution system
- Web player

## Contributing

We welcome contributions! Please see our [Contributing Guide](./CONTRIBUTING.md) for details.

### Development Commands

```bash
# Build everything
pnpm build

# Run all tests
pnpm test

# Build specific package
pnpm --filter @sharpee/core build

# Run tests for specific package
pnpm --filter @sharpee/stdlib test

# Clean build artifacts
pnpm clean
```

## Documentation

- [Architecture Overview](./docs/architecture/README.md)
- [API Reference](./docs/api/README.md)
- [Decision Records](./decisions/README.md)
- [Examples](./stories/README.md)

## License

MIT License - see [LICENSE](./LICENSE) for details.

## Community

- [Discord Server](#) (Coming soon)
- [Forum](#) (Coming soon)
- [Issue Tracker](https://github.com/your-org/sharpee/issues)

---

Built with ❤️ for the interactive fiction community
