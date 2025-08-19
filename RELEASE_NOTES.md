# 🚀 Sharpee v1.0.0-alpha.1 - First Alpha Release

We're excited to announce the first alpha release of **Sharpee**, a modern TypeScript-based interactive fiction platform that brings professional software engineering practices to the world of text adventures and narrative games.

## 🎯 What is Sharpee?

Sharpee is a comprehensive interactive fiction engine designed from the ground up with:
- **Type safety** throughout the entire codebase
- **Event-driven architecture** for predictable state management
- **Extensible plugin system** for custom game mechanics
- **Natural language processing** for rich player interactions
- **2,700+ tests** ensuring reliability and stability

## ✨ Highlights of This Release

### Core Platform (Stable)
- **Event System**: Immutable event-driven architecture ensuring game state consistency
- **World Model**: Sophisticated entity system with traits, behaviors, and relationships
- **Parser**: Natural language understanding with semantic grammar support
- **Standard Library**: 40+ implemented actions (take, drop, examine, go, open, close, etc.)
- **Extension System**: Clean plugin architecture for adding custom mechanics


### Developer Experience
- Full TypeScript with strict typing and I-prefix interfaces
- Monorepo structure with pnpm workspaces
- Comprehensive test coverage (2,700+ passing tests)
- Clean separation of concerns across 20+ packages

## 📦 Package Ecosystem

All packages are released at version `1.0.0-alpha.1`:

### Core Infrastructure
- `@sharpee/core` - Event system and foundational types
- `@sharpee/world-model` - Entity, trait, and behavior system
- `@sharpee/engine` - Game runtime and command processor
- `@sharpee/event-processor` - Event application and state management

### Interactive Fiction Domain
- `@sharpee/if-domain` - Domain contracts and interfaces
- `@sharpee/stdlib` - Standard actions and capabilities
- `@sharpee/parser-en-us` - English language parser

### Platform Support
- `@sharpee/platform-cli-en-us` - Command-line interface for English

## 🚧 Alpha Status

This is an **alpha release**, which means:
- ✅ Core architecture is stable and well-tested
- ✅ APIs are functional but may change before 1.0.0
- ✅ Ready for experimentation and early adoption
- ⚠️ Not recommended for production use yet
- 🔄 Breaking changes possible in future releases

## 🛠️ Getting Started

### For Developers

```bash
# Clone the repository
git clone https://github.com/ChicagoDave/sharpee.git
cd sharpee

# Install dependencies (requires pnpm 8+)
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test
```

### For Story Authors

The authoring tools and story templates are coming in future releases. For now, explore the example stories in the `/stories` directory to understand the platform's capabilities.

## 📋 Known Limitations

- **Forge API**: The fluent authoring API is planned but not yet implemented
- **Story Examples**: Reflections story needs completion, Cloak of Darkness needs rebuilding
- **Documentation**: API documentation is being expanded
- **Platform Support**: Currently CLI only; web and desktop clients in development

## 🎮 What Can You Build?

With this alpha release, you can create:
- Classic text adventures with rooms, objects, and puzzles
- NPCs with conversation systems (via extensions)
- Magic systems and special abilities (see blood-magic extension)
- Complex game mechanics through the extension system
- Stories with save/restore capabilities

## 🤝 Contributing

We welcome contributions! Areas where we especially need help:
- Testing the platform with your own stories
- Creating new extensions for different game mechanics
- Improving parser coverage for natural language
- Writing documentation and tutorials
- Reporting bugs and suggesting improvements

See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## 📊 Technical Metrics

- **Lines of Code**: 25,000+ TypeScript
- **Test Coverage**: 2,700+ tests passing
- **Package Count**: 22 packages in monorepo
- **Type Safety**: 100% TypeScript with strict mode
- **Architecture**: Event-sourced, immutable state

## 🗺️ Roadmap to 1.0.0

### Beta Phase (Next)
- [ ] Complete Forge authoring API
- [ ] Finish Reflections demonstration story
- [ ] Rebuild Cloak of Darkness
- [ ] Web platform support
- [ ] Comprehensive documentation

### Release Candidate
- [ ] Performance optimizations
- [ ] API stability guarantee
- [ ] Production-ready examples
- [ ] Migration guides

### 1.0.0 Stable
- [ ] Long-term support commitment
- [ ] Semantic versioning guarantee
- [ ] Full platform ecosystem

## 📝 Breaking Changes from Pre-Alpha

If you were using pre-alpha versions:
- All interfaces now use I-prefix convention (e.g., `Entity` → `IFEntity`)
- Event structure standardized with required `id` field
- Trait properties aligned with new naming conventions
- World model methods updated for consistency

## 🙏 Acknowledgments

Special thanks to:
- The interactive fiction community for inspiration and feedback
- All contributors who helped shape the architecture
- The TypeScript team for an amazing language and toolchain

## 📄 License

Sharpee is released under the MIT License. See [LICENSE](./LICENSE) for details.

## 🔗 Links

- [Documentation](./docs/)
- [Architecture Overview](./docs/architecture/README.md)
- [GitHub Repository](https://github.com/ChicagoDave/sharpee)
- [Issue Tracker](https://github.com/ChicagoDave/sharpee/issues)

---

**Ready to start your interactive fiction journey?** Download v1.0.0-alpha.1 and let us know what you create!

*This is an alpha release. APIs may change. Not recommended for production use.*