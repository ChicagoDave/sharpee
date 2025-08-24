# ADR-062: Direction Language Coupling in Going Action

## Status
Implemented

## Context

During the action data refactor, it was identified that the `going` action (and its data builder) contains hardcoded English language strings for directions:

1. **Direction abbreviations**: `'n' → 'north'`, `'s' → 'south'`, etc.
2. **Direction names**: `'north'`, `'south'`, `'east'`, `'west'`, etc.
3. **Opposite direction mappings**: `'north' → 'south'`, etc.

This violates the principle of separating language concerns from business logic. The action layer should be language-agnostic, with all natural language processing handled by the parser and language provider layers.

### Current Problems

```typescript
// In going-data.ts
const abbreviations: Record<string, string> = {
  'n': 'north',    // English abbreviation
  's': 'south',    // English word
  'e': 'east',     // Hardcoded mapping
  // ...
};

const opposites: Record<string, string> = {
  'north': 'south',  // English words
  'east': 'west',    // Should use constants
  // ...
};
```

This causes several issues:

1. **Internationalization blocked**: Cannot support other languages without modifying action code
2. **Tight coupling**: Business logic (movement) coupled to English language
3. **Duplication**: Direction handling likely duplicated across multiple actions
4. **Inconsistency**: Some parts use strings, others might use enums/constants

## Decision

We should refactor direction handling to separate language concerns from action logic:

### 1. Create Direction Constants

```typescript
// In @sharpee/if-domain or @sharpee/world-model
export enum Direction {
  NORTH = 'north',
  SOUTH = 'south',
  EAST = 'east',
  WEST = 'west',
  NORTHEAST = 'northeast',
  NORTHWEST = 'northwest',
  SOUTHEAST = 'southeast',
  SOUTHWEST = 'southwest',
  UP = 'up',
  DOWN = 'down',
  IN = 'in',
  OUT = 'out'
}

export const DirectionOpposites: Record<Direction, Direction> = {
  [Direction.NORTH]: Direction.SOUTH,
  [Direction.SOUTH]: Direction.NORTH,
  [Direction.EAST]: Direction.WEST,
  [Direction.WEST]: Direction.EAST,
  // ...
};
```

### 2. Move Abbreviation Handling to Parser

The parser should handle language-specific abbreviations:

```typescript
// In @sharpee/parser-en-us
export const DirectionAbbreviations: Record<string, Direction> = {
  'n': Direction.NORTH,
  's': Direction.SOUTH,
  'e': Direction.EAST,
  'w': Direction.WEST,
  // ...
};

// Parser normalizes during parsing phase
function parseDirection(input: string): Direction | null {
  const normalized = input.toLowerCase();
  return DirectionAbbreviations[normalized] || 
         DirectionWords[normalized] || 
         null;
}
```

### 3. Update Action to Use Constants

```typescript
// In going.ts
import { Direction, DirectionOpposites } from '@sharpee/if-domain';

function getOppositeDirection(direction: Direction): Direction {
  return DirectionOpposites[direction] || direction;
}

// No more hardcoded strings!
```

### 4. Update Room Model

Rooms should use Direction enum for exits:

```typescript
interface RoomTrait {
  exits: Map<Direction, ExitConfig>;
  // Instead of: exits: Map<string, ExitConfig>;
}
```

## Consequences

### Positive
- **Language independence**: Actions become truly language-agnostic
- **Type safety**: Using enums provides compile-time checking
- **Centralized logic**: Direction handling in one place
- **Internationalization ready**: Can support multiple languages
- **Cleaner separation**: Parser handles language, actions handle logic

### Negative
- **Migration effort**: Need to update all direction-using code
- **Breaking change**: May affect existing stories
- **Increased complexity**: Additional abstraction layer
- **Parser responsibility**: Parser becomes more complex

### Neutral
- Direction constants become part of the domain model
- Stories must use constants or rely on parser
- Runtime direction resolution moves to parse phase

## Implementation Path

### Phase 1: Add Constants (Non-breaking)
1. Create Direction enum in world-model
2. Create DirectionOpposites mapping
3. Add type definitions

### Phase 2: Update Parser (Non-breaking)
1. Add abbreviation handling to parser
2. Normalize directions during parsing
3. Emit Direction enum values

### Phase 3: Migrate Actions (Breaking)
1. Update going action to use Direction enum
2. Update other direction-using actions
3. Remove hardcoded strings

### Phase 4: Update World Model (Breaking)
1. Change room exits to use Direction enum
2. Update exit-related behaviors
3. Migrate existing stories

## Alternatives Considered

1. **Keep strings but centralize**: Put all strings in a central config
   - Rejected: Still couples to English

2. **Use numeric IDs**: Directions as numbers (0=N, 1=NE, etc.)
   - Rejected: Less readable, harder to debug

3. **Configuration-based**: Load directions from config files
   - Rejected: Over-engineered for a fixed set of directions

4. **Leave as-is**: Accept the coupling as technical debt
   - Rejected: Blocks internationalization

## Related ADRs
- ADR-061: Entity Snapshot Code Smell (similar refactoring pattern)
- ADR-059: Action Customization Boundaries (action/language separation)
- ADR-051: Three-Phase Action Pattern (action architecture)

## Notes

This is a good example of how language concerns can creep into business logic. While the current implementation works, it creates a barrier to internationalization and violates our architectural principles.

The refactoring should be done after the current action data refactor (ADR-061) is complete, as changing too many things at once increases risk.

Consider creating a "direction service" that encapsulates all direction-related logic, making it easier to test and maintain.