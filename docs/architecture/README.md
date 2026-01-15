# Architecture Documentation

> **BETA** (v0.9.2): Architecture is stable with 100+ ADRs documenting design decisions. The platform is actively used to implement a full Mainframe Zork port.

This directory contains all architectural documentation for the Sharpee Interactive Fiction Framework.

## Structure

- **[ADRs (Architecture Decision Records)](./adrs/)** - Documented architectural decisions
- **[Design Documents](./design/)** - Design specifications and diagrams

## Key Architectural Components

### Core Architecture
- Entity-Component System (ECS) for world modeling
- Event-driven architecture for game state changes
- Parser-based natural language processing
- Capability-based action system

### System Layers

1. **Core Layer** - Basic types and utilities
2. **World Model Layer** - Entity and trait system
3. **Parser Layer** - Natural language understanding
4. **Engine Layer** - Game runtime and execution
5. **Standard Library Layer** - Common actions and behaviors
6. **Platform Layer** - Platform-specific implementations

## Recent Design Documents

### Command Processing
- [Command Flow Architecture](./design/command-flow-architecture.md)
- [Command Handlers](./design/command-handlers.md)
- [Execution Design](./design/execution-design.md)

### Action System
- [Action Handler Design Review](./design/action-handler-design-review.md)
- [Action Migration Checklist](./design/action-migration-checklist.md)
- [Action Trait Migration](./design/action-trait-migration.md)

### World Model
- [World Model Extraction Summary](./design/world-model-extraction-summary.md)
- [World Model Shift](./design/world-model-shift.md)
- [World Model Status](./design/world-model-status.md)
- [Parser World Integration](./design/parser-world-integration-complete.md)

## Architecture Diagrams

Available in [./design/diagrams/](./design/diagrams/):
- System architecture diagrams (Drawio format)
- Component interaction diagrams
- Data flow diagrams

## Key Decisions

### Recent ADRs
- [ADR-013: Save/Load Architecture](./adrs/core-systems/adr-013-save-load-architecture.md)
- [ADR-014: Unlimited Undo System](./adrs/core-systems/adr-014-unlimited-undo-system.md)
- [Action Event Emission Pattern](./adrs/adr-00X-action-event-emission-pattern.md)

### Design Principles

1. **Separation of Concerns** - Clear boundaries between layers
2. **Event-Driven** - State changes through events
3. **Type Safety** - Strong TypeScript typing throughout
4. **Extensibility** - Easy to add new actions and capabilities
5. **Testability** - Components designed for testing

## Migration and Refactoring

- [Trait Action Update Checklist](./design/trait-action-update-checklist.md)
- [Refactor List](./design/refactor%20list.md)
- [Check List](./design/check%20list.md)

## Related Documentation

- [Development Standards](../development/standards/)
- [API Documentation](../api/)

## Contributing

When adding architectural documentation:
1. Place ADRs in the `./adrs/` directory
2. Add design documents to `./design/`
3. Update this index
4. Link from relevant code and documentation