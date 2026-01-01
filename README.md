# Sharpee Interactive Fiction Platform

[![Version](https://img.shields.io/badge/version-0.9.0--beta.5-orange.svg)](https://www.npmjs.com/package/@sharpee/sharpee)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.2+-blue.svg)](https://www.typescriptlang.org/)
[![Tests](https://img.shields.io/badge/tests-2700%2B%20passing-brightgreen.svg)](./packages)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](./LICENSE)

> ⚠️ **BETA SOFTWARE**: This is beta software under active development. Features may change and breaking changes may occur. Use in production at your own risk.

A modern, TypeScript-based platform for creating interactive fiction with a powerful event-driven architecture and extensible design.

## 🎮 What is Sharpee?

Sharpee is a comprehensive interactive fiction engine that empowers both authors and developers to create rich, dynamic storytelling experiences. Built with TypeScript from the ground up, it provides a robust foundation for everything from simple text adventures to complex narrative systems.

### Key Features

- **🎯 Event-Driven Architecture** - All state changes are immutable events, ensuring consistency and enabling features like undo/redo
- **🧩 Extension System** - Add magic, combat, economics, or any game mechanic through plugins
- **🌍 Rich World Model** - Sophisticated entity system with traits, behaviors, and relationships
- **📝 Natural Language Parser** - Understands complex player commands with semantic grammar
- **💾 Capability System** - Clean separation between physical world and abstract game state
- **🌐 Multi-Language Support** - Built-in localization and text generation system
- **✅ Type-Safe Throughout** - Full TypeScript with strict typing and I-prefix interfaces
- **🧪 Comprehensive Testing** - 2,700+ tests ensuring reliability

## 🚀 Quick Start

### For Story Authors

Create your first interactive fiction in minutes:

```bash
# Create a new story project (coming soon)
npx create-sharpee-story my-adventure
cd my-adventure
npm start
```

Or explore our [Author's Guide](./docs/getting-started/authors/README.md) to learn the basics.

### For Developers

Set up the development environment:

```bash
# Clone the repository
git clone https://github.com/your-org/sharpee.git
cd sharpee

# Install dependencies (requires pnpm 8+)
pnpm install

# Build all packages
pnpm build

# Run tests (2,700+ passing!)
pnpm test
```

## 📚 Documentation

### Getting Started
- **[Author's Guide](./docs/getting-started/authors/README.md)** - Write interactive fiction stories
- **[Extension Developer Guide](./docs/getting-started/developers/extension-development-guide.md)** - Create reusable game mechanics
- **[Platform Developer Guide](./docs/platform/README.md)** - Contribute to core systems

### References
- **[Architecture Overview](./docs/architecture/README.md)** - System design and patterns
- **[API Documentation](./docs/api/README.md)** - Complete API reference
- **[Contributing Guide](./CONTRIBUTING.md)** - How to contribute
- **[Architecture Decision Records](./docs/architecture/adrs/)** - Design decisions explained

## 🏗️ Architecture

Sharpee uses a clean, layered architecture:

```
┌─────────────────────────────────────────────┐
│           Stories & Games                   │  <- Your creations
├─────────────────────────────────────────────┤
│   Standard Library │ Extensions             │  <- Common actions & Community plugins
├─────────────────────────────────────────────┤
│   World Model │ IF Domain │ Parser          │  <- Game systems
├─────────────────────────────────────────────┤
│             Core Engine                     │  <- Event system
└─────────────────────────────────────────────┘
```

### Core Packages

| Package | Description | Status |
|---------|-------------|--------|
| `@sharpee/core` | Event system and core types | ✅ Stable |
| `@sharpee/world-model` | Entity, trait, and behavior system | ✅ Stable |
| `@sharpee/stdlib` | Standard actions and capabilities | ✅ Stable |
| `@sharpee/engine` | Game runtime and command processor | ✅ Stable |
| `@sharpee/parser-en-us` | English language parser | ✅ Stable |
| `@sharpee/if-domain` | Interactive fiction contracts | ✅ Stable |
| `@sharpee/forge` | Fluent authoring API | 📋 Planned |

## 🎯 Use Cases

### For Authors
Write rich interactive fiction with:
- Natural language commands
- Complex object interactions
- Non-linear narratives
- Puzzle mechanics
- Character conversations

### For Game Developers
Build text-based games with:
- Custom combat systems
- Economy and trading
- Skill progression
- Procedural generation
- Multiplayer support

### For Educators
Create educational experiences with:
- Language learning adventures
- Historical simulations
- Science experiments
- Problem-solving scenarios

## 🛠️ Development

### Development Commands

```bash
# Build all packages
pnpm build

# Run all tests
pnpm test

# Build specific package
pnpm --filter @sharpee/core build

# Run tests for specific package
pnpm --filter @sharpee/stdlib test

# Watch mode for development
pnpm --filter @sharpee/stdlib dev

# Clean all build artifacts
pnpm clean

# Type checking
pnpm type-check

# Linting
pnpm lint
```

### Project Structure

```
sharpee/
├── packages/
│   ├── core/                 # Event system and core types
│   ├── world-model/          # Entity and trait system
│   ├── stdlib/               # Standard library of actions
│   ├── engine/               # Game runtime
│   ├── parser-en-us/         # English parser
│   ├── lang-en-us/           # English language data
│   ├── if-domain/            # IF contracts
│   └── extensions/           # Extension packages
├── stories/                  # Example stories
├── docs/                     # Documentation
│   ├── getting-started/      # Quick start guides
│   ├── architecture/         # System design
│   └── api/                  # API reference
└── tests/                    # Integration tests
```

## 🎨 Creating with Sharpee

### Simple Story Example

```typescript
import { Story, Room, Thing, Player } from '@sharpee/world-model';

export const MyStory: Story = {
  metadata: {
    title: "The Mystery Manor",
    author: "Your Name",
    version: "1.0.0"
  },
  
  world: createWorld({
    rooms: [
      new Room('entrance', {
        name: 'Grand Entrance',
        description: 'A magnificent entrance hall with marble floors.',
        exits: { north: 'library' }
      })
    ],
    
    things: [
      new Thing('key', {
        name: 'golden key',
        description: 'An ornate golden key.',
        location: 'entrance',
        traits: ['takeable']
      })
    ],
    
    player: new Player('player', {
      location: 'entrance'
    })
  })
};
```

### Extension Example

```typescript
import { IExtension, IAction } from '@sharpee/core';

export class MagicExtension implements IExtension {
  id = 'magic';
  
  register(registry) {
    registry.registerAction(new CastSpellAction());
    registry.registerTrait('magical', MagicalTrait);
    registry.registerCapability('magic', {
      mana: 10,
      spells: []
    });
  }
}
```

## 📊 Project Status

### Current Version: 1.0.0-alpha.1

> **Note**: This is alpha software. APIs may change, features are being actively developed, and documentation is being improved. We welcome feedback and contributions!

| Component | Status | Tests | Coverage |
|-----------|--------|-------|----------|
| Core Engine | ✅ Stable | 120 | 95% |
| World Model | ✅ Stable | 1,124 | 92% |
| Standard Library | ✅ Stable | 920 | 88% |
| Parser | ✅ Stable | 128 | 90% |
| Engine Runtime | ✅ Stable | 173 | 85% |
| Extensions | 🚧 Beta | 45 | 80% |

### Roadmap

**Q3 2025**
- ✅ Core platform stable
- ✅ Extension system
- 🚧 Documentation site
- 🚧 Example extensions

**Q4 2025**
- 📋 Story templates
- 📋 Web player
- 📋 Visual debugger
- 📋 Performance optimizations

**2026**
- 📋 Forge visual editor
- 📋 Cloud saves
- 📋 Story marketplace
- 📋 Mobile support

## 🤝 Contributing

We welcome contributions from the community! Whether you're fixing bugs, adding features, improving documentation, or creating extensions, your help is appreciated.

See our [Contributing Guide](./CONTRIBUTING.md) for:
- Code standards and conventions
- Development setup
- Pull request process
- Testing requirements
- Documentation guidelines

### Good First Issues

Check out issues labeled [`good first issue`](https://github.com/your-org/sharpee/labels/good%20first%20issue) to get started.

## 📜 License

MIT License - see [LICENSE](./LICENSE) for details.

## 🌟 Acknowledgments

Sharpee stands on the shoulders of giants:
- Inspired by Inform 7, TADS, and other IF systems
- Built with TypeScript and modern web technologies
- Powered by the amazing IF community

## 💬 Community & Support

- **[GitHub Discussions](https://github.com/your-org/sharpee/discussions)** - Ask questions and share ideas
- **[Discord Server](#)** - Real-time chat (coming soon)
- **[Issue Tracker](https://github.com/your-org/sharpee/issues)** - Report bugs and request features
- **[Twitter](#)** - Follow for updates
- **Email** - hello@sharpee.dev

## 🚦 Build Status

![Tests](https://img.shields.io/badge/tests-2721%20passing-brightgreen)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)
![License](https://img.shields.io/badge/license-MIT-blue)

---

Built with ❤️ by the Sharpee team and contributors for the interactive fiction community.
