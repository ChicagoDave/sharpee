# Sharpee Documentation

> **Version 0.9.85** — Sharpee is available for story development. The Dungeon story (Mainframe Zork port, ~191 rooms) is in testing.

## Quick Start

New to Sharpee? Start here:

1. **[Core Concepts](./reference/core-concepts.md)** — Entities, traits, actions, events
2. **[Creating Stories](./guides/creating-stories.md)** — Build your first IF game
3. **[Build System](./guides/build-system.md)** — Build and test your story

## Documentation Structure

```
docs/
├── reference/          # Core concepts, transcript testing
├── guides/             # How-to guides for authors
├── architecture/       # ADRs, diagrams, design decisions
├── getting-started/    # Installation and setup
├── work/               # Active development tracking
├── context/            # Session summaries
└── internal/           # Reference materials (dungeon-81 source)
```

## For Story Authors

| Guide | Description |
|-------|-------------|
| [Core Concepts](./reference/core-concepts.md) | Entity system, traits, actions, and events |
| [Creating Stories](./guides/creating-stories.md) | Complete guide to building IF games |
| [Event Handlers](./guides/event-handlers.md) | React to game events with custom logic |
| [Build System](./guides/build-system.md) | Building and bundling stories |
| [Transcript Testing](./reference/transcript-testing.md) | Test your story with transcript files |

## For Developers

| Guide | Description |
|-------|-------------|
| [Development Setup](./development/setup/setup-guide.md) | Set up your development environment |
| [Coding Standards](./development/standards/coding.md) | Conventions and best practices |
| [Architecture Decisions](./architecture/adrs/) | 135 ADRs documenting design rationale |
| [Naming Conventions](./architecture/naming-conventions.md) | ID and naming patterns |

## Architecture

### Key Principles

1. **Actions emit semantic events, not text** — Language layer converts message IDs to prose
2. **Behaviors own mutations** — Actions coordinate, behaviors perform state changes
3. **Traits compose entity capabilities** — Add container, lockable, wearable, etc.
4. **Language layer separation** — All text goes through localizable message IDs

### Key ADRs

| ADR | Topic |
|-----|-------|
| [ADR-051](./architecture/adrs/adr-051-action-behaviors.md) | Four-phase action pattern |
| [ADR-052](./architecture/adrs/adr-052-event-handlers-custom-logic.md) | Event handlers |
| [ADR-070](./architecture/adrs/adr-070-npc-system.md) | NPC system |
| [ADR-087](./architecture/adrs/adr-087-action-centric-grammar.md) | Grammar builder API |
| [ADR-090](./architecture/adrs/adr-090-entity-centric-action-dispatch.md) | Capability dispatch |

## Active Work

Current development is tracked in `work/`:

- **[dungeo/](./work/dungeo/)** — Mainframe Zork implementation
- **[platform/](./work/platform/)** — Engine and stdlib improvements
- **[zifmia/](./work/zifmia/)** — Desktop runner development

## Links

- [Main README](../README.md) — Project overview and quick start
- [Website](https://sharpee.net) — Official site
- [npm Package](https://www.npmjs.com/package/@sharpee/sharpee) — Install via npm/npx
