# Atomic Events Refactor Plan

## Overview

Refactor the Sharpee event system from reference-based events (containing entity IDs) to atomic events (containing all necessary data). This will fix TypeScript type issues, ensure historical accuracy in event replay, and simplify the text service architecture.

## Goals

1. **Historical Accuracy**: Events capture the exact state when they occurred
2. **Type Safety**: Fix the `data: Record<string, unknown>` forcing double-casting issue
3. **Simplified Text Service**: Pure transformation without world model queries
4. **True Event Sourcing**: Events become complete, replayable records

## Architecture Changes

### Current (Reference-Based)
```typescript
Event → Contains IDs → Text Service → Queries World → Formats Output
```

### New (Atomic)
```typescript
Action → Captures State → Event with Data → Text Service → Formats Output
```

## Implementation Phases

### Phase 1: Core Interface Updates

#### 1.1 Update ISemanticEvent Interface
- Location: `packages/core/src/events/types.ts`
- Change `data?: Record<string, unknown>` to `data?: unknown`
- Remove `payload` and `metadata` properties completely
- Update all code that references these properties to use `data`
- Add migration comments

#### 1.2 Create Event Builder Utilities
- Location: `packages/core/src/events/builders/`
- Create base `EventBuilder` class
- Add specific builders: `RoomDescriptionEventBuilder`, `ActionEventBuilder`, etc.
- Include snapshot helpers for common patterns

### Phase 2: Standard Library Actions

#### 2.1 Create Action Base Class Updates
- Location: `packages/stdlib/src/actions/base/`
- Add `enrichEvent()` helper method
- Add `captureEntitySnapshot()` utility
- Provide migration utilities for gradual adoption

#### 2.2 Migrate Core Actions
Priority order (based on impact):

1. **looking.ts** - Most complex, sets the pattern
   - Capture room name, description at event time
   - Include darkness state
   - Add provider functions for conditional descriptions

2. **examining.ts** - Similar pattern to looking
   - Capture entity description
   - Handle readable/wearable variations

3. **going.ts** - Movement events
   - Capture both source and destination room data
   - Include exit information

4. **taking.ts / dropping.ts** - Inventory actions
   - Capture item descriptions
   - Include container/location context

5. **opening.ts / closing.ts** - State changes
   - Capture before/after states
   - Include success/failure context

#### 2.3 Update Validation System
- Location: `packages/stdlib/src/validation/`
- Ensure validation events include entity data
- Update error events with full context

### Phase 3: Text Service Refactor

#### 3.1 Remove World Model Dependency
- Location: `packages/text-services/src/standard-text-service.ts`
- Remove `TextServiceContext.world` usage
- Update all `translateX()` methods to use event data
- Simplify to pure data transformation

#### 3.2 Update Event Handlers
- Modify each event type handler:
  - `translateRoomDescription()` - Use provided description
  - `translateActionSuccess()` - Use embedded message data
  - `translateActionFailure()` - Use embedded error context
  - etc.

#### 3.3 Add Provider Function Support
- Detect and execute provider functions in event data
- Handle both static and dynamic descriptions
- Maintain backward compatibility during migration

### Phase 4: Story Updates

#### 4.1 Cloak of Darkness
- Location: `stories/cloak-of-darkness/src/index.ts`
- Update event handlers to expect full data
- Remove world model queries from handlers
- Test all game paths

#### 4.2 Story Event Patterns
- Document new event structure for story authors
- Provide migration examples
- Update story template

### Phase 5: Engine Updates

#### 5.1 Event Processing
- Location: `packages/engine/src/`
- Update event adapter for normalization
- Ensure backward compatibility during migration
- Add event enrichment pipeline

#### 5.2 Save/Load System
- Handle serialization of events with functions
- Ensure historical replay accuracy
- Test save/load with new event structure

### Phase 6: Testing & Migration

#### 6.1 Update Tests
- Fix all action tests to expect atomic events
- Update text service tests (much simpler now!)
- Add historical accuracy tests

#### 6.2 Migration Utilities
- Create compatibility layer for gradual migration
- Add warnings for deprecated patterns
- Provide migration scripts for existing code

## Event Structure Examples

### Before (Reference-Based)
```typescript
{
  type: 'if.event.room_description',
  data: {
    roomId: 'r01',
    verbose: true
  }
}
```

### After (Atomic)
```typescript
{
  type: 'if.event.room_description',
  data: {
    roomId: 'r01',
    roomName: 'Foyer of the Opera House',
    roomDescription: 'You are standing in a spacious hall...',
    isDark: false,
    verbose: true,
    contents: [
      { id: 'i01', name: 'velvet cloak', description: 'A handsome cloak...' }
    ]
  }
}
```

### With Provider Function
```typescript
{
  type: 'if.event.room_description',
  data: {
    roomId: 'bar',
    roomName: 'Foyer Bar',
    baseDescription: 'The bar, much rougher...',
    isDark: true,
    hasCloak: true,
    disturbances: 0,
    
    getDescription: function() {
      if (this.isDark && this.hasCloak) {
        return "It's pitch black.";
      }
      let desc = this.baseDescription;
      if (this.disturbances === 0) {
        desc += " There's a message in the sawdust.";
      }
      return desc;
    }
  }
}
```

## Success Criteria

1. **No World Model Queries in Text Service**: Text service is pure transformation
2. **Historical Accuracy**: Replaying old events shows what was seen at that time
3. **Type Safety**: No more double-casting needed (`as unknown as`)
4. **All Tests Pass**: Including new historical accuracy tests
5. **Backward Compatible**: Migration can be gradual

## Risks & Mitigations

### Risk: Large Scope
- **Mitigation**: Implement in phases, maintain backward compatibility

### Risk: Breaking Changes
- **Mitigation**: Compatibility layer, deprecation warnings, gradual migration

### Risk: Performance Impact
- **Mitigation**: Measure event sizes, optimize common patterns

### Risk: Serialization Complexity
- **Mitigation**: Clear patterns for function serialization, thorough testing

## Timeline Estimate

- Phase 1 (Core): 2-3 hours
- Phase 2 (Actions): 4-6 hours  
- Phase 3 (Text Service): 2-3 hours
- Phase 4 (Stories): 2-3 hours
- Phase 5 (Engine): 2-3 hours
- Phase 6 (Testing): 3-4 hours

**Total: 15-22 hours of focused work**

## Next Steps

1. Commit current work
2. Create new branch: `refactor/atomic-events`
3. Start with Phase 1.1: Update ISemanticEvent interface
4. Implement incrementally, test continuously
5. Document patterns as they emerge