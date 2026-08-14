# Sharpee Documentation

> **Version 0.9.85** — Sharpee is available for story development. The Dungeon story (Mainframe Zork port, ~191 rooms) is in testing.

## Quick Start

New to Sharpee? Start here:

1. **[Core Concepts](./core-concepts/README.md)** — Entities, traits, actions, events
2. **[sharpee.net](https://sharpee.net)** — the maintained home of author documentation

The author guides that used to be listed here now live in
[`unofficial/`](./unofficial/README.md) and are unmaintained. See that folder's
README before using anything in it.

## Documentation Structure

```
docs/
├── unofficial/         # Quarantine — unmaintained, superseded (guides, reference, spec)
├── architecture/       # ADRs, diagrams, design decisions
├── getting-started/    # Installation and setup
├── work/               # Active development tracking
├── context/            # Session summaries
└── internal/           # Reference materials (dungeon-81 source)
```

## For Story Authors

| Guide | Description |
|-------|-------------|
| [Core Concepts](./core-concepts/README.md) | Entity system, traits, actions, and events |
| [sharpee.net](https://sharpee.net) | Author guides, Chord language reference, cookbook |

The former `guides/` entries in this table moved to
[`unofficial/guides/`](./unofficial/README.md) and are no longer maintained.

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
- **[zifmia/](./work/zifmia/)** — Desktop runner development *(retired 2026-08-13; kept as history)*

## Links

- [Main README](../README.md) — Project overview and quick start
- [Website](https://sharpee.net) — Official site
- [npm Package](https://www.npmjs.com/package/@sharpee/sharpee) — Install via npm/npx
