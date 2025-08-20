# Architecture Decision Records (ADRs)

> ⚠️ **ALPHA DOCUMENTATION**: These ADRs document an evolving architecture. Some decisions may be superseded, and implementations may differ from documented designs.

This directory contains all Architecture Decision Records (ADRs) for the Sharpee Interactive Fiction Platform. ADRs document significant architectural decisions made during development, helping future developers understand the rationale behind design choices.

## What is an ADR?

An Architecture Decision Record captures important architectural decisions along with their context and consequences. ADRs provide:
- **Historical context** - Why decisions were made
- **Trade-off analysis** - What alternatives were considered
- **Impact assessment** - Consequences of the decision
- **Evolution tracking** - How the architecture has changed over time

## Complete ADR Index (56 ADRs)

### Parser & Language Processing (ADRs 1-4, 21, 25-28, 36-37, 44, 54)

#### Core Parser Architecture
- [ADR-001: Parser Debug Events Architecture](./adr-001-parser-debug-events.md) - Debug event system for parser development
- [ADR-003: Internal Parser Types](./adr-003-internal-parser-types.md) - Type system for parser internals
- [ADR-004: Parser-Validation-Execution Separation](./adr-004-parser-validation-separation.md) - Three-phase command processing
- [ADR-025: Parser Information Preservation](./adr-025-parser-information-preservation.md) - Maintaining parse context through pipeline

#### Language Support
- [ADR-026: Language-Specific Parser Architecture](./adr-026-language-specific-parsers.md) - Multi-language parser design
- [ADR-027: Parser Package Architecture](./adr-027-parser-package-architecture.md) - Parser package organization
- [ADR-028: Simplified Story Language Management](./adr-028-simplified-language-management.md) - Language configuration approach
- [ADR-037: Parser Language Provider](./adr-037-parser-language-provider.md) - Language provider interface

#### Advanced Parsing
- [ADR-021: Parser Edge Cases and Complex Command Support](./adr-021-parser-edge-cases.md) - Handling complex grammar
- [ADR-036: Parser Contracts (IF Domain)](./adr-036-parser-contracts-if-domain.md) - Parser interface contracts
- [ADR-044: Parser and Vocabulary System Gaps](./adr-044-parser-vocabulary-gaps.md) - Vocabulary management
- [ADR-054: Semantic Grammar for Command Processing](./adr-054-semantic-grammar.md) - Semantic parsing approach

### Action System (ADRs 5, 7, 38-39, 41-42, 51)

#### Core Actions
- [ADR-005: Action Interface Location and ValidatedCommand Design](./adr-005-action-interface-location.md) - Action interface architecture
- [ADR-007: Actions in Standard Library](./adr-007-actions-in-stdlib.md) - Stdlib action organization
- [ADR-038: Language-Agnostic Action Implementation](./adr-038-language-agnostic-actions.md) - Cross-language action support

#### Action Execution
- [ADR-039: Action Event Emission Pattern](./adr-039-action-event-emission-pattern.md) - Event-driven action results
- [ADR-041: Simplified Action Context Interface](./adr-041-simplified-action-context.md) - Streamlined action context
- [ADR-042: Stdlib Action Event Type Migration](./adr-042-stdlib-action-event-types.md) - Event type standardization
- [ADR-051: Action Behaviors for Complex Action Handling](./adr-051-action-behaviors.md) - Behavior-based actions

### World Model & Entities (ADRs 9, 11, 14-17, 20, 43, 45-47)

#### Entity System
- [ADR-009: Deep Cloning Strategy for Entity Copies](./adr-009-entity-cloning-strategy.md) - Entity immutability approach
- [ADR-011: Entity ID System Design](./adr-011-entity-id-system.md) - Entity identification strategy
- [ADR-014: Unrestricted World Model Access](./adr-014-unrestricted-world-model-access.md) - World model visibility
- [ADR-047: Entity Type Safety and Validation](./adr-047-entity-type-safety.md) - Entity type system

#### Spatial & Perception
- [ADR-015: SpatialIndex Pattern References](./adr-015-spatial-index-references.md) - Spatial indexing design
- [ADR-045: Scope Management System](./adr-045-scope-management-system.md) - Visibility and scope
- [ADR-046: Scope and Perception Architecture](./adr-046-scope-perception-architecture.md) - Perception modeling

#### Entity Features
- [ADR-016: Author Recorded Event Metadata](./adr-016-author-recorded-event-metadata.md) - Event recording system
- [ADR-017: Disambiguation Strategy for Entity References](./adr-017-disambiguation.md) - Handling ambiguous references
- [ADR-020: Clothing and Pockets Design](./adr-020-clothing-pockets-design.md) - Container hierarchy
- [ADR-043: Scope Resolution and Implied Indirect Objects](./adr-043-scope-and-implied-indirect-objects.md) - Implicit object handling

### Core Architecture (ADRs 6, 8, 10, 53)

- [ADR-006: Use Const Objects Instead of Enums](./adr-006-const-objects-not-enums.md) - TypeScript pattern choice
- [ADR-008: Core Package as Generic Event System](./adr-008-core-as-generic-engine.md) - Event-driven architecture
- [ADR-010: No I-Prefix for Interfaces](./adr-010-no-i-prefix-interfaces.md) - Interface naming (deprecated)
- [ADR-053: Adopt I-Prefix Convention for All TypeScript Interfaces](./adr-053-interface-naming-convention.md) - Interface naming (current)

### Platform & Extensions (ADRs 13, 18-19, 22, 48, 52)

#### Extension System
- [ADR-013: Lighting as Extension System](./adr-013-lighting-extensions.md) - Extension architecture example
- [ADR-022: Extension Architecture](./adr-022-extension-architecture.md) - Plugin system design
- [ADR-052: Event Handlers and Custom Logic](./adr-052-event-handlers-custom-logic.md) - Custom behavior hooks

#### Platform Features
- [ADR-018: Conversational State Management](./adr-018-conversational-state-management.md) - Dialog system
- [ADR-019: Platform Implementation Patterns for Conversational UI](./adr-019-platform-implementation-patterns.md) - UI patterns
- [ADR-048: Static Language, Parser, and Text Service Architecture](./adr-048-static-language-architecture.md) - Static configuration

### Game State & Persistence (ADRs 32-35, 40, 49)

#### Save/Restore
- [ADR-032: Capability Refactoring and Command History](./adr-032-capability-refactoring-command-history.md) - History tracking
- [ADR-033: Save/Restore Architecture](./adr-033-save-restore-architecture.md) - Save system design
- [ADR-034: Event Sourcing for Save/Restore](./adr-034-event-sourcing-save-restore.md) - Event-based saves
- [ADR-049: Auto-Save Architecture](./adr-049-auto-save-architecture.md) - Automatic saving

#### Game Flow
- [ADR-035: Platform Event Architecture](./adr-035-platform-event-architecture.md) - Platform-level events
- [ADR-040: Turn-Based Time Progression](./adr-040-turn-based-time-progression.md) - Time management

### User Interface & Services (ADRs 2, 12, 23-24, 29-31, 50)

#### Debug & Development
- [ADR-002: Debug Mode Meta Commands](./adr-002-debug-mode-meta-commands.md) - Debug command system
- [ADR-012: Debug Events as System Events](./adr-012-debug-as-system-events.md) - Debug event architecture
- [ADR-050: Meta-Commands Implementation](./adr-050-meta-commands.md) - System command handling

#### Services
- [ADR-023: Message System Integration](./adr-023-message-system-integration.md) - Message handling
- [ADR-024: Score Data Storage](./adr-024-score-data-storage.md) - Score tracking system
- [ADR-029: Simple Query-Based Text Service Architecture](./adr-029-text-service-architecture.md) - Text generation
- [ADR-030: Introduction of if-services Package](./adr-030-if-services-package.md) - Service layer
- [ADR-031: Self-Inflating Help System](./adr-031-self-inflating-help-system.md) - Dynamic help

### Development & Testing (ADRs 55-56)

- [ADR-055: NPM Publishing Strategy](./adr-055-npm-publishing.md) - Package publishing approach
- [ADR-056: Story Testing Framework](./adr-056-story-testing-framework.md) - Testing infrastructure

### Special ADRs

- [ADR-00X: Action Event Emission Pattern](./adr-00X-action-event-emission-pattern.md) - Experimental pattern (to be numbered)
- [ADR-014-assessment: Project Assessment](./adr-014-assessment.md) - Mid-project evaluation
- [ADR-014-intfiction: IntFiction.org Post](./adr-014-intfiction-post.md) - Community engagement

## Additional Documentation

### Core System ADRs
Located in `./core-systems/`:
- [ADR-013: Save/Load Architecture](./core-systems/adr-013-save-load-architecture.md) - Detailed save system
- [ADR-014: Unlimited Undo System](./core-systems/adr-014-unlimited-undo-system.md) - Undo/redo implementation

### Supporting Documents
- [Traits with Built-in Container](./2025-01-19-traits-with-builtin-container.md) - Container trait design
- [Lighting Interim Plan](./lighting-interim-plan.md) - Lighting system roadmap

### Code Review Batches
Located in `./batch/` - Contains 49 batch review files documenting code review sessions

### Historical/Outdated ADRs
Located in `./outdated/` - Superseded decisions kept for historical reference

## ADR Status Key

- **Accepted** - Decision is current and implemented
- **Proposed** - Under consideration, not yet approved
- **Deprecated** - No longer valid, see replacement
- **Superseded** - Replaced by another ADR
- **Experimental** - Testing approach, may change

## ADR Template

```markdown
# ADR-XXX: [Title]

## Status
[Proposed | Accepted | Deprecated | Superseded by ADR-YYY]

## Context
What issue motivated this decision?

## Decision
What change are we making?

## Consequences
What becomes easier or harder?

## Alternatives Considered
What other options were evaluated?
```

## Contributing New ADRs

1. **Choose the next number** - Use next sequential number (057+)
2. **Use the template** - Start from the template above
3. **Be specific** - Include concrete examples
4. **Document trade-offs** - Explain why alternatives were rejected
5. **Update this index** - Add your ADR to the appropriate category
6. **Get review** - Have at least one other developer review

## Navigation Tips

- ADRs are grouped by architectural area for easier discovery
- Numbers reflect chronological order of decisions
- Some early ADRs have inconsistent numbering (being cleaned up)
- Check "Superseded" status to find current approaches
- Review batches contain detailed implementation discussions

## Key Architectural Themes

1. **Event-Driven Architecture** - Most state changes happen through events
2. **Separation of Concerns** - Parser, validator, executor are distinct phases
3. **Extensibility** - Plugin architecture for game mechanics
4. **Type Safety** - Strong TypeScript typing throughout
5. **Immutability** - Prefer immutable patterns for state management
6. **Language Agnostic** - Core mechanics independent of natural language

---

*Last updated: August 2024 | Total ADRs: 56*