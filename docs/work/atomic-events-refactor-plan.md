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

### Phase 1: Core Interface Updates ✅ COMPLETE

#### 1.1 Update ISemanticEvent Interface
- Location: `packages/core/src/events/types.ts`
- Change `data?: Record<string, unknown>` to `data?: unknown`
- Remove `payload` and `metadata` properties completely
- Update all code that references these properties to use `data`
- Add migration comments

### Phase 2: Action Architecture Redesign (ADR-058)

#### 2.1 Update Action Interface
- Location: `packages/stdlib/src/actions/types.ts`
- Split current `execute()` into three phases:
  ```typescript
  interface Action {
    validate(context: ActionContext): ValidationResult;
    execute(context: ActionContext): void;  // Mutations only
    report(context: ActionContext): ISemanticEvent[];  // Event generation
  }
  ```

#### 2.2 Update CommandExecutor
- Location: `packages/engine/src/command-executor.ts`
- Implement new execution flow:
  1. Run before rules (Phase 3)
  2. Call action.validate()
  3. Call action.execute()
  4. Run after rules (Phase 3)
  5. Call action.report()
- Maintain backward compatibility for unmigrated actions

#### 2.3 Create Helper Utilities
- Location: `packages/stdlib/src/actions/base/`
- Add `captureEntitySnapshot()` utility
- Add `captureRoomSnapshot()` utility
- Add migration shim for gradual adoption

### Phase 3: Rules System Implementation (ADR-057)

#### 3.1 Define Rule Interfaces
- Location: `packages/core/src/rules/types.ts`
- Create Rule, RuleContext, RuleResult interfaces
- Create RuleGroup interface for organization
- Define execution ordering

#### 3.2 Implement Rule Engine
- Location: `packages/engine/src/rules/rule-engine.ts`
- Process before/after rules
- Handle rule ordering and groups
- Support conditional enabling/disabling
- Add debugging/tracing support

#### 3.3 Integrate with CommandExecutor
- Update execution flow to include rules
- Pass rule context with action information
- Handle rule prevention (before phase)
- Collect rule-generated events

### Phase 4: Migrate Standard Library Actions

#### 4.1 Migrate Core Actions (Three-Phase Pattern)
Priority order (based on impact):

1. **looking.ts** - Most complex, sets the pattern
   - Split execute() into execute/report
   - Capture room data in report phase
   - Include darkness state
   - Test with before/after rules

2. **examining.ts** - Similar pattern to looking
   - Separate mutations from event generation
   - Capture entity description in report
   - Handle readable/wearable variations

3. **going.ts** - Movement events
   - Execute: perform movement
   - Report: capture both rooms' data
   - Include exit information

4. **taking.ts / dropping.ts** - Inventory actions
   - Execute: transfer item
   - Report: capture item descriptions
   - Include container/location context

5. **opening.ts / closing.ts** - State changes
   - Execute: change state
   - Report: capture before/after states
   - Include success/failure context

#### 4.2 Update Validation System
- Location: `packages/stdlib/src/validation/`
- Ensure validation events include entity data
- Update error events with full context

### Phase 5: Text Service Refactor

#### 5.1 Remove World Model Dependency
- Location: `packages/text-services/src/standard-text-service.ts`
- Remove `TextServiceContext.world` usage
- Update all `translateX()` methods to use event data
- Simplify to pure data transformation

#### 5.2 Update Event Handlers
- Modify each event type handler:
  - `translateRoomDescription()` - Use provided description
  - `translateActionSuccess()` - Use embedded message data
  - `translateActionFailure()` - Use embedded error context
  - etc.

#### 5.3 Add Provider Function Support
- Detect and execute provider functions in event data
- Handle both static and dynamic descriptions
- Maintain backward compatibility during migration

### Phase 6: Story Updates

#### 6.1 Cloak of Darkness
- Location: `stories/cloak-of-darkness/src/index.ts`
- Update event handlers to expect full data
- Remove world model queries from handlers
- Add example rules for story logic
- Test all game paths

#### 6.2 Story Event Patterns
- Document new event structure for story authors
- Document rules system usage
- Provide migration examples
- Update story template

### Phase 7: Engine Updates

#### 7.1 Event Processing
- Location: `packages/engine/src/`
- Update event adapter for normalization
- Ensure backward compatibility during migration
- Add event enrichment pipeline

#### 7.2 Save/Load System
- Handle serialization of events with functions
- Ensure historical replay accuracy
- Test save/load with new event structure

### Phase 8: Testing & Migration

#### 8.1 Update Tests
- Fix all action tests to expect three-phase pattern
- Update text service tests (much simpler now!)
- Add rule system tests
- Add historical accuracy tests

#### 8.2 Migration Utilities
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

- Phase 1 (Core): ✅ COMPLETE
- Phase 2 (Action Architecture): 3-4 hours
- Phase 3 (Rules System): 3-4 hours  
- Phase 4 (Action Migration): 4-6 hours
- Phase 5 (Text Service): 2-3 hours
- Phase 6 (Stories): 2-3 hours
- Phase 7 (Engine): 2-3 hours
- Phase 8 (Testing): 3-4 hours

**Total: 19-27 hours of focused work**

## Next Steps

1. ~~Phase 1 Complete~~ ✅
2. Implement Phase 2: Action Architecture Redesign
   - Update Action interface with three-phase pattern
   - Update CommandExecutor for new flow
   - Create migration utilities
3. Implement Phase 3: Rules System
   - Define interfaces per ADR-057
   - Build rule engine
   - Integrate with CommandExecutor
4. Begin Phase 4: Migrate looking.ts as proof of concept
5. Test with Cloak of Darkness story
6. Document patterns as they emerge