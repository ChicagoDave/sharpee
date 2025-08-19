# Changelog

All notable changes to the Sharpee Interactive Fiction Platform will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0-alpha.1] - 2025-08-19

### Overview
First alpha release of the Sharpee Interactive Fiction Platform. This release marks the stabilization of the core architecture and establishes the foundation for creating interactive fiction experiences.

### Added
- **Core Engine**: Event-driven architecture with immutable state changes
- **World Model**: Entity system with traits, behaviors, and relationships
- **Standard Library**: 40+ standard actions (take, drop, examine, go, etc.)
- **Parser**: Natural language understanding with semantic grammar
- **Extension System**: Plugin architecture for adding game mechanics
- **Blood Magic Extension**: Demonstration extension with mirror portals and invisibility
- **Platform Support**: CLI platform for English language
- **Type Safety**: Full TypeScript implementation with I-prefix interfaces
- **Testing**: 2,700+ tests ensuring reliability

### Architecture Highlights
- **Event System**: All state changes tracked as immutable events
- **Trait System**: Composable behaviors for entities
- **Action Pattern**: Validate/execute pattern for consistent action handling
- **Scope System**: Sophisticated visibility and reachability rules
- **Capability System**: Clean separation of world state and meta-game features

### Package Versions
All packages released at version 1.0.0-alpha.1:
- `@sharpee/core` - Event system and core types
- `@sharpee/world-model` - Entity, trait, and behavior system
- `@sharpee/stdlib` - Standard actions and capabilities
- `@sharpee/engine` - Game runtime and command processor
- `@sharpee/parser-en-us` - English language parser
- `@sharpee/if-domain` - Interactive fiction contracts
- `@sharpee/event-processor` - Event processing system
- `@sharpee/extension-blood-magic` - Blood magic mechanics

### Known Issues
- Forge authoring API is planned but not yet implemented
- Reflections story needs completion
- Cloak of Darkness story needs rebuilding

### Migration Notes
This is the first public release. Future releases may include breaking changes until version 1.0.0 stable.

### Contributors
- David Cornelson (@ChicagoDave) - Project lead and architecture

---

For detailed documentation, see the [README](./README.md) and [documentation directory](./docs/).