# Sharpee Architecture Decisions - Batch 24

## File: 2025-05-22-15-41-22.json
**Topic**: Sharpee TypeScript Interactive Fiction Platform - Major Pivot

### Decision: Pivot from Over-Engineered to IF-First Design

**Context**: The project underwent a major pivot from an over-engineered approach to an IF-first design.

**Decision**: 
Pivoted to focus on Interactive Fiction specific concepts rather than generic abstractions. This represents a fundamental shift in the project's direction.

**Rationale**: The previous approach was over-engineered for the specific needs of Interactive Fiction. An IF-first design better serves the target audience of non-programmer authors.

### Decision: Core Architecture Components to Keep

**Context**: During the pivot, need to decide what to keep from existing architecture.

**Decision**: Keep the following core components:
- ✅ Channels architecture
- ✅ Events system

**Rationale**: These components provide value without adding unnecessary complexity and support the separation of concerns principle.

### Decision: New IF-Specific Parser

**Context**: Need a parser designed specifically for Interactive Fiction.

**Decision**: 
Implemented a new IF-specific parser with:
- Pattern matching (not NLP)
- Disambiguation support
- Located at: packages/core/src/parser/if-parser.ts

**Rationale**: Pattern-based parsing is more predictable and easier for authors to understand than NLP approaches. Disambiguation is crucial for IF games.

### Decision: Simplified World Model Direction

**Context**: The generic graph database approach was too complex.

**Decision**: 
Replace the generic graph database with a simplified world model featuring:
- IF-specific entity types: Room, Container, Door, etc.
- IF-specific properties: takeable, openable, lit, etc.
- Keep the graph-based concept but simplify implementation

**Rationale**: IF has well-established conventions for entity types and properties. Using these conventions makes the system more intuitive for authors familiar with IF.

### Decision: Key Project Goals Reaffirmed

**Context**: Need to maintain focus on core goals during the pivot.

**Decision**: The key goals remain:
1. Fluent API for non-programmer authors
2. Graph-based world model (simplified)
3. Separate text emission from game logic
4. Multi-language support
5. Pattern-based parser (not NLP)
6. TypeScript implementation

**Rationale**: These goals ensure the platform remains accessible to its target audience while maintaining technical quality.

### Decision: Development Priorities

**Context**: After the pivot, need to establish clear priorities.

**Decision**: Current development status and priorities:
1. ✅ Core architecture (channels, events) - DONE
2. ✅ New IF-specific parser - DONE
3. 🚧 Simplified world model - IN PROGRESS (Next task)
4. ⏳ Forge authoring layer - TODO

**Rationale**: This prioritization focuses on building the IF-specific foundation before moving to the author-facing layer.

## Pivot Impact

This represents a major architectural shift from:
- **FROM**: Generic, over-engineered, graph database approach
- **TO**: IF-first design with established conventions

The pivot maintains the valuable core concepts (channels, events, graph-based world) while simplifying the implementation to be more IF-specific and author-friendly.

## Next Steps

The immediate next task is implementing the simplified world model with:
- IF-specific entity types
- IF-specific properties
- Maintaining the graph-based approach but with IF conventions

## Key Principle

The pivot emphasizes: **Convention over Configuration** - using established IF patterns rather than building generic abstractions.

## Next Review File
- [ ] 2025-05-22-21-03-16.json
