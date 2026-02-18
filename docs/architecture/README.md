# Architecture Documentation

**Version 0.9.91** — The Sharpee platform architecture is stable with 131 ADRs documenting design decisions. 90 are implemented.

## Contents

- **[ADRs](./adrs/)** — 131 Architecture Decision Records ([full index](./adrs/README.md))
- **[Diagrams](./diagrams/)** — Architecture diagrams (Drawio, Mermaid)
- **[Naming Conventions](./naming-conventions.md)** — Entity, trait, and action naming standards
- **[Architecture Diagram](./diagram-20260203.md)** — Current system diagram

## Platform Layers

```
+-----------------------------------------------+
|              Your Story                       |
+--------------------+--------------------------+
| stdlib (actions)   | lang-en-us (messages)    |
| plugins (npc,      | parser-en-us (grammar)   |
|  scheduler, state) |                          |
+--------------------+--------------------------+
| engine | world-model | text-service           |
+-----------------------------------------------+
| if-domain | if-services | event-processor     |
+-----------------------------------------------+
|           core (events, types)                |
+-----------------------------------------------+
```

## Core Architecture

### Entity-Trait System
Entities are composed of traits (data) and behaviors (logic). Traits are serializable plain objects — class methods do not survive save/restore. Use static behavior methods or direct property access for post-deserialization logic.

### Four-Phase Action Pattern
All 48 stdlib actions follow: **validate** (can we?), **execute** (do it), **report** (what happened), **blocked** (why not). Actions mutate world state in execute, then return semantic events for rendering in report.

### Language Layer Separation
Code emits message IDs, never English strings. The language package (`lang-en-us`) maps IDs to prose. This enables future localization.

### Capability Dispatch (ADR-090)
Verbs with standard semantics (TAKE, DROP, OPEN) use stdlib actions directly. Verbs with entity-specific semantics (TURN, WAVE, LOWER) use capability dispatch — the entity's trait declares which actions it responds to, and a registered behavior implements the four-phase logic.

### Plugin Architecture (ADR-120)
The engine's turn cycle is extensible via plugins. Three plugins ship with the platform:
- **NPC** (ADR-070) — Autonomous character behaviors and turn processing
- **Scheduler** (ADR-071) — Daemons (recurring) and fuses (one-shot timed events)
- **State Machine** (ADR-119) — Declarative puzzle and narrative orchestration

### Interceptors (ADR-118)
Story code can intercept stdlib actions before they execute, allowing puzzles and custom logic to block, modify, or replace standard behavior without forking the action.

### Event System
Semantic events are return values from action phases — they are message objects for rendering, not a pub/sub bus. There is no event bus and no automatic listener dispatch. Side effects belong in the execution flow: actions, behaviors, or interceptors.

## Key ADRs by Topic

### Parser & Grammar
- [ADR-054](./adrs/adr-054-semantic-grammar.md) — Semantic grammar
- [ADR-087](./adrs/adr-087-action-centric-grammar.md) — Action-centric grammar with verb aliases
- [ADR-089](./adrs/adr-089-pronoun-identity-system.md) — Pronoun and identity system
- [ADR-104](./adrs/adr-104-implicit-inference.md) — Implicit inference and implicit actions

### Actions & Behaviors
- [ADR-052](./adrs/adr-052-event-handlers-custom-logic.md) — Event handlers and custom logic
- [ADR-075](./adrs/adr-075-event-handler-consolidation.md) — Effects-based handler pattern
- [ADR-090](./adrs/adr-090-entity-centric-action-dispatch.md) — Capability dispatch
- [ADR-117](./adrs/adr-117-event-handlers-vs-capability-behaviors.md) — Event handlers vs capability behaviors
- [ADR-118](./adrs/adr-118-stdlib-action-interceptors.md) — Action interceptors

### World Model
- [ADR-046](./adrs/adr-046-scope-perception-architecture.md) — Scope and perception
- [ADR-093](./adrs/adr-093-i18n-entity-vocabulary.md) — Entity vocabulary and disambiguation
- [ADR-094](./adrs/adr-094-event-chaining.md) — Event chaining
- [ADR-108](./adrs/adr-108-player-character-system.md) — Player character system

### Text & Rendering
- [ADR-091](./adrs/adr-091-text-decorations.md) — Text decorations
- [ADR-095](./adrs/adr-095-message-templates.md) — Message templates with formatters
- [ADR-096](./adrs/adr-096-text-service.md) — Text service architecture

### Plugins & Extensions
- [ADR-070](./adrs/adr-070-npc-system.md) — NPC system
- [ADR-071](./adrs/adr-071-daemons-and-fuses.md) — Daemons and fuses
- [ADR-111](./adrs/adr-111-extension-ecosystem.md) — Extension ecosystem
- [ADR-119](./adrs/adr-119-state-machines.md) — State machines
- [ADR-120](./adrs/adr-120-engine-plugin-architecture.md) — Plugin architecture

### Clients & Platforms
- [ADR-097](./adrs/adr-097-react-client.md) — React client (Zifmia)
- [ADR-114](./adrs/adr-114-browser-platform-package.md) — Browser platform package
- [ADR-121](./adrs/adr-121-story-runner-architecture.md) — Story runner architecture

### Testing
- [ADR-073](./adrs/adr-073-transcript-story-testing.md) — Transcript-based testing
- [ADR-092](./adrs/adr-092-smart-transcript-directives.md) — Smart transcript directives
- [ADR-110](./adrs/adr-110-debug-tools-extension.md) — Debug and testing tools extension

## Related Documentation

- [API Reference](../api/) — Generated HTML documentation for traits, actions, entities, and events
- [Coding Standards](../development/standards/coding.md) — TypeScript coding conventions
- [Core Concepts](../reference/core-concepts.md) — Entity system, traits, actions, and event patterns

---

*Last updated: February 2026*
