# API Reference Documentation

**Version 0.9.91** — Reference documentation for the Sharpee world-model and stdlib packages.

## Viewing the Docs

Open `index.html` in a browser. The docs are a self-contained static site (HTML + CSS + JS, no build step).

## Contents

### Getting Started
- [**index.html**](./index.html) — Landing page with Story Author and Platform Developer paths
- [**authoring.html**](./authoring.html) — Getting started guide: rooms, objects, puzzles

### World Model
- [**entities.html**](./entities.html) — Rooms, items, actors, and entity creation
- [**world.html**](./world.html) — Spatial relationships, queries, state management
- [**scope.html**](./scope.html) — Visibility, reachability, and scope resolution

### Traits
- [**traits-core.html**](./traits-core.html) — Identity, Room, Container, and foundational traits
- [**traits-state.html**](./traits-state.html) — Openable, Lockable, Switchable, and state traits
- [**traits-interaction.html**](./traits-interaction.html) — Edible, Wearable, Readable, and interaction traits
- [**traits-physical.html**](./traits-physical.html) — LightSource, Scenery, and physical traits
- [**traits-combat.html**](./traits-combat.html) — Combatant traits (ext-basic-combat)

### Actions
- [**actions-overview.html**](./actions-overview.html) — Four-phase pattern, creating custom actions
- [**actions-objects.html**](./actions-objects.html) — Taking, dropping, putting, inserting, removing, giving, throwing
- [**actions-movement.html**](./actions-movement.html) — Going, entering, exiting, climbing
- [**actions-state.html**](./actions-state.html) — Opening, closing, locking, unlocking, switching on/off
- [**actions-physical.html**](./actions-physical.html) — Pushing, pulling, raising, lowering, wearing, eating, drinking
- [**actions-sensory.html**](./actions-sensory.html) — Looking, examining, searching, reading, touching, smelling, listening
- [**actions-meta.html**](./actions-meta.html) — Inventory, score, save, restore, undo, help, quit

### Advanced
- [**capabilities.html**](./capabilities.html) — Capability dispatch, interceptors, entity-specific behaviors
- [**events.html**](./events.html) — Event system, event chaining, perception filtering
- [**platform.html**](./platform.html) — Platform integration, clients, and rendering

## Related

- [Architecture Documentation](../architecture/) — ADRs and system design
- [Core Concepts](../reference/core-concepts.md) — Entity system, traits, actions, and patterns
