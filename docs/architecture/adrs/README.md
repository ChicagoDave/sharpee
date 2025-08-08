# Architecture Decision Records (ADRs)

This directory contains all Architecture Decision Records (ADRs) for the Sharpee project. ADRs document significant architectural decisions made during the development of the system.

## What is an ADR?

An Architecture Decision Record captures an important architectural decision made along with its context and consequences. ADRs help future developers understand why certain decisions were made and what alternatives were considered.

## ADR Index

### Core System ADRs
Located in `./core-systems/`

- [ADR-013: Save/Load Architecture](./core-systems/adr-013-save-load-architecture.md) - Design for game state persistence
- [ADR-014: Unlimited Undo System](./core-systems/adr-014-unlimited-undo-system.md) - Implementation of undo/redo functionality

### Recent ADRs

- [ADR-00X: Action Event Emission Pattern](./adr-00X-action-event-emission-pattern.md) - Pattern for how actions emit events
- [Traits with Built-in Container](./2025-01-19-traits-with-builtin-container.md) - Decision on trait-based container system
- [Lighting Interim Plan](./lighting-interim-plan.md) - Interim approach to lighting system

### Code Review Batches
Located in `./batch/`

Contains 49 batch review files documenting code review sessions and decisions made during those reviews.

### Outdated/Historical ADRs
Located in `./outdated/`

These ADRs are kept for historical reference but may no longer reflect current architecture:

- Parser refactoring decisions
- Capability implementation plans
- Various design patterns and standards
- World model ownership decisions
- Text service implementation plans
- Standard library architecture decisions

## ADR Template

When creating a new ADR, use the following template:

```markdown
# ADR-XXX: [Title]

## Status
[Proposed | Accepted | Deprecated | Superseded by ADR-YYY]

## Context
[What is the issue that we're seeing that is motivating this decision or change?]

## Decision
[What is the change that we're proposing and/or doing?]

## Consequences
[What becomes easier or more difficult to do because of this change?]

## Alternatives Considered
[What other options were evaluated?]
```

## Numbering Convention

- Core system ADRs: ADR-001 through ADR-099
- Feature-specific ADRs: ADR-100 through ADR-199
- Refactoring ADRs: ADR-200 through ADR-299
- Experimental/Proposal ADRs: ADR-00X (replace X with letter)

## Contributing

When adding a new ADR:
1. Create the ADR file following the template
2. Add it to the appropriate directory
3. Update this index
4. Link to it from relevant documentation

## Review Process

ADRs should be reviewed by at least one other developer before being marked as "Accepted".