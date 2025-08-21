# ISemanticEvent Data Property Assessment

## Executive Summary

The `ISemanticEvent` interface has three conflicting properties for storing event data: `data`, `payload`, and `metadata`. This assessment documents the current usage patterns and proposes a migration strategy to unify on a single property.

## Current State Analysis

### Property Definitions (packages/core/src/events/types.ts)

```typescript
export interface ISemanticEvent {
  // ... other properties
  
  /**
   * Additional data related to the event
   */
  payload?: Record<string, unknown>;
  
  /**
   * Legacy support for data property (same as payload)
   */
  data?: Record<string, unknown>;
  
  /**
   * Legacy support for metadata property
   */
  metadata?: Record<string, unknown>;
}
```

### Usage Statistics

Based on comprehensive code analysis:

1. **`.data` property**: 530 occurrences across 211 files
   - Primary usage pattern in the codebase
   - Used for action parameters, event details, game state
   - Dominant in stories, engine, and stdlib packages

2. **`.payload` property**: 61 occurrences across 28 files
   - Secondary usage, mainly in newer code
   - Used in event creation helpers
   - Some documentation references

3. **`.metadata` property**: ~50 files with references
   - Mostly used for different purposes (not event.metadata)
   - game-engine.ts uses context.metadata for game metadata
   - Only ~10 actual uses of event.metadata for event data

## Key Findings

### 1. Data is the Dominant Pattern

The `.data` property is overwhelmingly the most used:
- All story implementations use `.data`
- Text service implementation uses `.data` 
- Parser events use `.data`
- Validation events use `.data`
- Action events use `.data`

### 2. Payload Usage is Limited

The `.payload` property appears mainly in:
- Some event creation utilities
- World model extensions
- Documentation and ADRs

### 3. Metadata Has Different Semantics

The `.metadata` property is rarely used for event data. Instead:
- `context.metadata` stores game metadata (title, author, version)
- `saveData.metadata` stores save game metadata
- Only a few test files use `event.metadata` for actual event data

### 4. Type Safety Issues

The current implementation causes TypeScript errors because:
- `data` is typed as `Record<string, unknown>` not `any`
- Type assertions fail without intermediate `unknown` cast
- This forces awkward double-casting: `event.data as unknown as RoomDescriptionData`
- The intent is to allow ANY data through events and type-check at consumption

## Impact Assessment

### High Impact Areas

1. **Text Service** (packages/text-services/)
   - Currently uses `.data` extensively
   - Type assertions causing compilation errors
   - Needs immediate fix

2. **Stories** (stories/)
   - Cloak of Darkness uses `.data` in event handlers
   - All story event handlers expect `.data`

3. **Standard Library** (packages/stdlib/)
   - Actions emit events with `.data`
   - Validation uses `.data`
   - Query handlers use `.data`

### Medium Impact Areas

1. **Engine** (packages/engine/)
   - Event adapter handles both data and payload
   - Some internal uses of metadata for different purposes

2. **World Model** (packages/world-model/)
   - Extensions use createEvent with payload
   - Some traits emit events with data

### Low Impact Areas

1. **Parser** (packages/parser-en-us/)
   - Consistent use of `.data`
   - No payload/metadata usage

2. **Core** (packages/core/)
   - Just the interface definition
   - Event system passes through all properties

## Migration Strategy

### Phase 1: Immediate Fix (Now)

1. **Update ISemanticEvent interface**:
```typescript
export interface ISemanticEvent {
  // ... other properties
  
  /**
   * Event data payload - typed as 'any' to allow flexible event data
   * Consumers should type-check/validate at point of use
   */
  data?: any;
  
  /**
   * @deprecated Use 'data' instead
   */
  payload?: any;
  
  /**
   * @deprecated Use 'data' instead  
   */
  metadata?: any;
}
```

2. **Add migration helper in event-adapter.ts**:
```typescript
function normalizeEvent(event: any): ISemanticEvent {
  // Ensure data property exists
  if (!event.data && (event.payload || event.metadata)) {
    event.data = event.payload || event.metadata || {};
  }
  return event;
}
```

### Phase 2: Gradual Migration (1-2 weeks)

1. Update all `payload` references to use `data`
2. Update event creation utilities to use `data`
3. Add deprecation warnings in development mode

### Phase 3: Cleanup (Future release)

1. Remove `payload` and `metadata` properties
2. Update all documentation
3. Major version bump due to breaking change

## Recommendations

### Immediate Actions

1. **Change data to `any` type** to fix TypeScript issues
2. **Add backward compatibility** layer in event processing
3. **Update text service** to use simple type assertions

### Best Practices Going Forward

1. **Always use `.data`** for event payload
2. **Type-check at consumption point**:
```typescript
// In text service or event handler:
private translateRoomDescription(event: ISemanticEvent): string {
  const data = event.data as RoomDescriptionData; // Simple cast, no double-casting needed
  if (!data.roomId) return ''; // Runtime validation
  // ... use data.roomId safely
}
```

3. **Document expected data shapes** for each event type:
```typescript
// Event documentation (not enforced by TypeScript)
interface RoomDescriptionEventData {
  roomId: string;
  verbose?: boolean;
}
```

## Risk Assessment

### Low Risk
- Parser package (already consistent)
- Core package (just interface change)

### Medium Risk  
- Text service (needs type fixes)
- Stories (may need event handler updates)

### High Risk
- Breaking change for external consumers
- Potential runtime errors if payload/metadata not migrated

## Conclusion

The conflicting properties in ISemanticEvent are causing immediate issues with the text service implementation. The `.data` property is the clear winner with 530 uses vs 61 for payload and minimal for metadata.

**The root issue**: `data` is typed as `Record<string, unknown>` when it should be `any` to allow flexible event payloads that are type-checked at consumption.

**Recommended approach**: 
1. Change `.data` to type `any` immediately (fixes TypeScript errors)
2. Add compatibility layer for payload/metadata
3. Migrate all code to use `.data`
4. Deprecate and eventually remove redundant properties

This will provide:
- Immediate fix for TypeScript double-casting issues
- Backward compatibility during migration
- Clear path forward with single source of truth
- Pragmatic type checking at point of use (not at event creation)