# Action Organization Assessment: Shared Files vs Sub-Actions

## Executive Summary

After analyzing the stdlib action structure, I believe **sub-actions** would be a superior architectural pattern to the current shared files approach. Here's why.

## Current State Analysis

### Action Inventory
We have 43 standard actions, with clear natural groupings:

**Paired Actions (direct opposites):**
- opening / closing
- locking / unlocking  
- switching_on / switching_off
- wearing / taking_off
- entering / exiting
- inserting / removing

**Related Actions (conceptual groups):**
- Container ops: putting, inserting, removing
- Movement: going, entering, exiting, climbing
- Object handling: taking, dropping, giving, throwing
- Sensory: examining, looking, listening, smelling, touching

### Current Approach: Shared Files
```
actions/standard/
├── switching_on/
│   ├── switching_on.ts
│   ├── switching_on-events.ts
│   └── switching_on-data.ts
├── switching_off/
│   ├── switching_off.ts
│   ├── switching_off-events.ts
│   └── switching_off-data.ts
└── switching-shared.ts  <-- Shared utilities
```

## Proposed Sub-Actions Architecture

### Structure
```
actions/standard/
└── switching/
    ├── index.ts           # Exports both sub-actions
    ├── switching-base.ts  # Shared logic, types, utilities
    ├── on/
    │   ├── switching_on.ts
    │   ├── switching_on-events.ts
    │   └── switching_on-data.ts
    └── off/
        ├── switching_off.ts
        ├── switching_off-events.ts
        └── switching_off-data.ts
```

## Comparative Analysis

### Current Shared Files Approach

**Pros:**
- ✅ Minimal disruption to existing structure
- ✅ Quick to implement
- ✅ Clear separation between actions

**Cons:**
- ❌ Shared files accumulate at root level (already have 3)
- ❌ No clear visual/structural relationship between paired actions
- ❌ Shared code feels disconnected from its consumers
- ❌ Hard to discover which actions share code
- ❌ Naming convention awkward (lock-shared.ts, wearable-shared.ts)

### Proposed Sub-Actions Approach

**Pros:**
- ✅ **Clear hierarchy** - Related actions are visually grouped
- ✅ **Natural home for shared code** - Lives with its consumers
- ✅ **Better encapsulation** - Each action family is self-contained
- ✅ **Easier navigation** - Find all related code in one place
- ✅ **Scalable** - Can add new sub-actions easily
- ✅ **Supports inheritance patterns** - Base classes make sense here
- ✅ **Cleaner root** - No accumulation of shared files

**Cons:**
- ❌ Requires restructuring 12 actions (6 pairs)
- ❌ Changes import paths (but TypeScript helps)
- ❌ Slightly deeper directory nesting

## Deep Architectural Implications

### 1. Parser Integration
The parser references actions by ID (e.g., `IFActions.SWITCHING_ON`), not by file path. No changes needed.

### 2. Export Strategy
```typescript
// actions/standard/switching/index.ts
export { switchingOnAction } from './on/switching_on';
export { switchingOffAction } from './off/switching_off';
export type { SwitchedOnEventData } from './on/switching_on-events';
export type { SwitchedOffEventData } from './off/switching_off-events';
```

The main index.ts would change from:
```typescript
export * from './switching_on';
export * from './switching_off';
```
To:
```typescript
export * from './switching';
```

### 3. Shared Code Evolution

Current shared file (switching-shared.ts):
```typescript
// Disconnected utilities
export function analyzeSwitchingContext(...) { }
export function determineSwitchingMessage(...) { }
```

With sub-actions (switching-base.ts):
```typescript
// Could use inheritance
export abstract class SwitchingActionBase implements Action {
  protected analyzeSwitchingContext(...) { }
  protected determineSwitchingMessage(...) { }
}

// Or composition with better typing
export const switchingHelpers = {
  analyzeContext: (...) => { },
  determineMessage: (...) => { }
} as const;
```

### 4. Future Extensibility

Sub-actions make complex action families easier:
```
actions/standard/
└── communication/
    ├── communication-base.ts
    ├── talking/
    ├── telling/
    ├── asking/
    └── answering/
```

## Migration Strategy

### Phase 1: Pilot with One Pair
1. Start with switching (already has shared code)
2. Create new structure alongside old
3. Validate tests still pass
4. Update exports

### Phase 2: Migrate Other Pairs
Priority order based on shared code existence:
1. locking/unlocking (has lock-shared.ts)
2. wearing/taking_off (has wearable-shared.ts)
3. opening/closing (high quality, less urgent)
4. entering/exiting
5. inserting/removing

### Phase 3: Consider Conceptual Groups
- Movement actions could benefit from shared validation
- Sensory actions have similar patterns

## Decision Factors

### Choose Sub-Actions If:
- We value long-term maintainability over short-term convenience ✅
- We expect more paired/grouped actions in future ✅
- We want clearer code organization ✅
- We're willing to do a one-time migration ✅

### Stay with Shared Files If:
- We need to minimize changes ❌
- We're near a release deadline ❌
- The current approach is "good enough" ❌

## Recommendation

**Adopt the sub-actions pattern.** The benefits significantly outweigh the migration cost:

1. **Better architecture** - Actions that belong together, stay together
2. **Cleaner codebase** - No proliferation of *-shared.ts files
3. **Easier to understand** - New developers immediately see relationships
4. **Future-proof** - Scales better as we add more complex actions
5. **Supports our quality goals** - Makes high-quality actions easier to maintain

The migration can be done incrementally, starting with the 3 pairs that already have shared code. This is a perfect time since we're already refactoring these actions.

## Next Steps

If we proceed:
1. Create detailed migration plan for switching actions
2. Implement as proof of concept
3. Validate no breaking changes
4. Document the new pattern
5. Migrate remaining pairs incrementally

This is more than a refactoring - it's establishing a pattern that will serve the project for years.