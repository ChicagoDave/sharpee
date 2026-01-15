# Sharpee Documentation

> **BETA SOFTWARE** (v0.9.2): Sharpee is feature-complete for story development. The platform is stable and actively used to implement a full Mainframe Zork port (~191 rooms). Documentation is being expanded.

Welcome to the Sharpee Interactive Fiction Framework documentation.

## Quick Start

If you're new to Sharpee:

1. **[Core Concepts](./reference/core-concepts.md)** - Essential reading: entities, traits, actions, events
2. **[Creating Stories](./guides/creating-stories.md)** - Start building your first IF game
3. **[Architecture Overview](./architecture/README.md)** - Understand the system design

## For Story Authors

| Guide | Description |
|-------|-------------|
| [Core Concepts](./reference/core-concepts.md) | Entity system, traits, actions, and events |
| [Creating Stories](./guides/creating-stories.md) | Complete guide to building IF games |
| [Event Handlers](./guides/event-handlers.md) | React to game events with custom logic |
| [Transcript Testing](./reference/transcript-testing.md) | Test your story with transcript files |

## For Developers

| Guide | Description |
|-------|-------------|
| [Development Setup](./development/setup/setup-guide.md) | Set up your development environment |
| [Coding Standards](./development/standards/coding.md) | Conventions and best practices |
| [Architecture Decisions](./architecture/adrs/) | 100+ ADRs documenting design rationale |

## Package Documentation

Sharpee is organized into focused packages:

### Core Platform

| Package | Description |
|---------|-------------|
| [@sharpee/core](./packages/core/) | Event system, types, utilities |
| [@sharpee/world-model](./packages/world-model/) | Entity system with traits and behaviors |
| [@sharpee/engine](./packages/engine/) | Game runtime and command processor |
| [@sharpee/stdlib](./packages/stdlib/) | 43 standard IF actions |

### Language & Parser

| Package | Description |
|---------|-------------|
| [@sharpee/parser-en-us](./packages/parser-en-us/) | English natural language parser |
| [@sharpee/lang-en-us](./packages/lang-en-us/) | English language messages |
| [@sharpee/if-domain](./packages/if-domain/) | Grammar builder interfaces |

### Services & Tools

| Package | Description |
|---------|-------------|
| [@sharpee/text-services](./packages/text-services/) | Text formatting and output |
| [@sharpee/if-services](./packages/if-services/) | Service interfaces |
| [@sharpee/transcript-tester](./packages/transcript-tester/) | Test stories via transcript files |
| [@sharpee/forge](./packages/forge/) | Story scaffolding and build tools |

## Architecture

### Key Principles

1. **Actions emit semantic events, not text** - The language layer converts message IDs to prose
2. **Behaviors own mutations** - Actions coordinate, behaviors perform state changes
3. **Traits compose entity capabilities** - Add container, lockable, wearable, etc.
4. **Language layer separation** - All user-facing text goes through localizable message IDs

### Architecture Decision Records

Over 100 ADRs document the design rationale:

- [ADR Index](./architecture/adrs/README.md) - Complete list of decisions
- [ADR-051: Four-Phase Action Pattern](./architecture/adrs/adr-051-four-phase-action-pattern.md) - validate/execute/report/blocked
- [ADR-070: NPC System](./architecture/adrs/adr-070-npc-system.md) - Autonomous characters
- [ADR-087: Action-Centric Grammar](./architecture/adrs/adr-087-action-centric-grammar.md) - Grammar builder API
- [ADR-090: Capability Dispatch](./architecture/adrs/adr-090-capability-dispatch.md) - Entity-specific verb handling

## Example Stories

| Story | Description |
|-------|-------------|
| [cloak-of-darkness](../stories/cloak-of-darkness/) | Classic IF demo - simple introduction |
| [dungeo](../stories/dungeo/) | Mainframe Zork implementation (~191 rooms) |
| [secretletter2025](../stories/secretletter2025/) | Mystery adventure with NPCs |
| [reflections](../stories/reflections/) | Atmospheric puzzle game |

## Testing

- [Transcript Testing Guide](./reference/transcript-testing.md) - Write and run transcript tests
- [TR-002 Comparison](./testing/tr-002-comparison.md) - Canonical Zork vs Dungeo verification

## Reference

- [Core Concepts](./reference/core-concepts.md) - Essential concepts reference
- [Naming Conventions](./architecture/naming-conventions.md) - ID and naming patterns
- [Parser Comparison](./reference/parser-comparison.md) - How Sharpee compares to other IF systems

## Additional Resources

- [Features](./features/) - Feature documentation and proposals
- [Extensions](./extensions/) - Extension system documentation
- [Archived](./archived/) - Historical documentation
