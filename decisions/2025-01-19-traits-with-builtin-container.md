# ADR: Traits with Built-in Container Functionality

**Date**: 2025-01-19
**Status**: Accepted

## Context

In interactive fiction, certain types of entities naturally contain other entities:
- Rooms contain items, actors, and furniture
- Actors carry inventory
- Containers (boxes, chests) hold items

Initially, we required authors to explicitly add both a RoomTrait and ContainerTrait to make a room capable of holding things. This felt redundant since rooms inherently contain things in the author's mental model.

## Decision

We will implement Option 1: Certain traits (RoomTrait, ActorTrait) will directly include container functionality as part of their core behavior.

### Implementation Details

1. **RoomTrait** includes:
   - All standard room properties (exits, darkness, etc.)
   - Container properties (capacity limits, allowed/excluded types)
   - Fixed properties: `isTransparent: true`, `enterable: true`

2. **ActorTrait** includes:
   - All standard actor properties (pronouns, state, etc.)
   - Container properties for inventory management
   - Fixed properties: `isTransparent: false`, `enterable: false`

3. **ContainerTrait** remains for explicit containers (boxes, bags, etc.)

4. **Storage**: The actual containment relationships are stored in the SpatialIndex, not in the traits themselves. Traits only provide:
   - Capability declaration (yes, I can contain things)
   - Constraints (capacity, type restrictions)
   - Behavior flags (transparent, enterable)

## Consequences

### Positive
- Matches author mental model (rooms naturally contain things)
- Reduces boilerplate (no need to add two traits)
- Maintains single source of truth (SpatialIndex for relationships)
- Clear, explicit behavior (no hidden trait dependencies)

### Negative
- Some code duplication between traits
- Cannot have a room that isn't a container (probably not needed)
- Slightly larger trait classes

### Neutral
- Container utilities (`canContain()`, `getContainerTrait()`) abstract over the different trait types
- World model queries work uniformly regardless of which trait provides container capability

## Alternatives Considered

1. **Trait Dependencies**: Automatically add ContainerTrait when RoomTrait is added
   - Rejected: Hidden behavior, complexity in trait management

2. **Trait Bundles**: Explicit groupings like `[RoomTrait, ContainerTrait]`
   - Rejected: Still requires authors to remember the pairing

3. **Composite Traits**: Inheritance-like system
   - Rejected: Adds complexity, goes against composition philosophy

4. **Smart Query System**: Make queries understand that rooms are containers
   - Rejected: Hides the relationship, makes system less transparent

## Implementation Notes

- Created `container-utils.ts` with utilities for checking container capability
- Updated `canMoveEntity()` in WorldModel to use `canContain()` utility
- Traits implementing container functionality should implement the `ContainerCapable` interface pattern
