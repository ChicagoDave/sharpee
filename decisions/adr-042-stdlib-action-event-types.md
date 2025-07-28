# ADR-042: Stdlib Action Event Type Migration

Status: **Proposed**

## Context

With the simplified `EnhancedActionContext` interface from ADR-041, we need to migrate all stdlib actions to use explicit TypeScript interfaces for their event data. This ensures type safety and self-documenting code while maintaining compatibility with existing extensions and story-specific actions.

### Current State

Actions currently create events with inline anonymous objects:

```typescript
return [context.event('if.event.taken', {
  fromLocation: currentLocation,
  item: noun.name
})];
```

### Desired State

Each action should define explicit interfaces for all events it emits:

```typescript
import { TakenEventData, TakingErrorData } from './taking-events';

return [context.event('if.event.taken', {
  fromLocation: currentLocation,
  item: noun.name
} satisfies TakenEventData)];
```

## Decision

We will migrate each stdlib action to its own folder with explicit event data type definitions, following a careful migration strategy that preserves compatibility.

### 1. Folder Structure

Each action will be organized in its own folder (note: tests remain in `/packages/stdlib/tests`):

```
/packages/stdlib/src/actions/standard/
├── taking/
│   ├── index.ts           // Public exports
│   ├── taking.ts          // Action implementation
│   └── taking-events.ts   // Event data type definitions
├── examining/
│   ├── index.ts
│   ├── examining.ts
│   └── examining-events.ts
└── ...
```

### 2. Event Type Definitions

Each `*-events.ts` file defines interfaces for all events the action can emit:

```typescript
// taking-events.ts
import { EntityId } from '@sharpee/core';

/**
 * Data for successful take event
 */
export interface TakenEventData {
  /** The entity that was taken */
  item: string;
  /** Where it was taken from (optional) */
  fromLocation?: EntityId;
  /** If taken from a container */
  fromContainer?: boolean;
  /** If taken from a supporter */
  fromSupporter?: boolean;
}

/**
 * Data for take error events
 */
export interface TakingErrorData {
  /** Which error occurred */
  reason: 'no_target' | 'already_have' | 'cant_take_self' | 'cant_take_room' | 
          'fixed_in_place' | 'container_full' | 'too_heavy';
  /** The entity involved (if any) */
  item?: string;
  /** Additional context */
  details?: Record<string, any>;
}
```

### 3. Action Implementation Pattern

```typescript
// taking.ts
import { Action, EnhancedActionContext } from '../../enhanced-types';
import { SemanticEvent } from '@sharpee/core';
import { TakenEventData, TakingErrorData } from './taking-events';

export const takingAction: Action = {
  id: IFActions.TAKING,
  
  execute(context: EnhancedActionContext): SemanticEvent[] {
    const noun = context.command.directObject?.entity;
    
    if (!noun) {
      const errorData: TakingErrorData = {
        reason: 'no_target'
      };
      
      return [context.event('action.error', {
        actionId: this.id,
        messageId: 'no_target',
        ...errorData
      })];
    }
    
    // Success case
    const successData: TakenEventData = {
      item: noun.name,
      fromLocation: currentLocation,
      fromContainer: isFromContainer
    };
    
    return [
      context.event('if.event.taken', successData),
      context.event('action.success', {
        actionId: this.id,
        messageId: 'taken',
        params: successData
      })
    ];
  }
};
```

### 4. Compatibility Strategy

To ensure we don't break extensions or story-based actions:

#### a. Event Type Naming Convention

- Event types remain strings, not enums
- Use namespaced patterns: `if.event.*`, `action.*`, `system.*`
- Document standard event types in a central location

#### b. Gradual Migration

1. Create new folder structure alongside existing files
2. Add type definitions without changing behavior
3. Update imports in a backwards-compatible way
4. Remove old files only after verification

#### c. Extension Points

```typescript
// Ensure extensions can still add custom events
export interface ExtensionEventData {
  [key: string]: any;
}

// Actions can emit any event type
context.event('custom.extension.event', customData);
```

#### d. Registry Compatibility

The action registry must handle both old and new action structures:

```typescript
// Both patterns must work:
registry.register(takingAction);  // New structured action
registry.register(oldStyleAction); // Legacy flat file action
```

### 5. Validation Process

Before marking an action as migrated:

1. **Type Coverage**: All events have defined interfaces
2. **Test Coverage**: Existing tests in `/packages/stdlib/tests` pass without modification
3. **Test Imports**: Update test imports to reference new action locations
4. **Extension Check**: Sample extensions still work
5. **Story Check**: Sample stories with custom actions work
6. **Event Compatibility**: Event consumers (text service, etc.) handle new structure

### 6. Migration Checklist

For each action:

- [ ] Create folder structure
- [ ] Define event data interfaces
- [ ] Update action to use typed events
- [ ] Verify imports/exports work
- [ ] Run existing tests from `/packages/stdlib/tests`
- [ ] Update test imports if needed
- [ ] Test with sample extension
- [ ] Update documentation
- [ ] Remove old file (after grace period)

## Implementation Plan

### Phase 1: Core Actions (Week 1)
- taking, dropping, examining, going
- These are most commonly extended/overridden

### Phase 2: Manipulation Actions (Week 2)  
- opening, closing, locking, unlocking
- pushing, pulling, turning

### Phase 3: Interaction Actions (Week 3)
- giving, showing, talking
- eating, drinking

### Phase 4: System Actions (Week 4)
- saving, restoring, quitting
- scoring, help, about

### Phase 5: Cleanup (Week 5)
- Remove old files
- Update all documentation
- Final compatibility testing

## Consequences

### Positive

- **Type Safety**: Compile-time checking of event data
- **Documentation**: Event interfaces serve as documentation
- **Discoverability**: Easy to see what events an action emits
- **Maintainability**: Clearer separation of concerns
- **Testing**: Easier to test event data separately

### Negative

- **File Proliferation**: More files to manage
- **Migration Effort**: Significant refactoring required
- **Import Complexity**: More imports needed
- **Breaking Changes Risk**: Must be careful with compatibility

## Risk Mitigation

1. **Parallel Structure**: Keep old files during migration
2. **Compatibility Tests**: Automated tests for extensions
3. **Staged Rollout**: Migrate one action at a time
4. **Documentation**: Clear migration guide for extension authors
5. **Version Strategy**: Consider this for a minor version bump

## Success Criteria

- All stdlib actions use explicit event types
- Zero breaking changes for existing extensions
- Story-based actions continue to work
- Improved developer experience with autocomplete
- No performance regression

## Related ADRs

- ADR-041: Simplified Action Context Interface
- ADR-038: Language Agnostic Actions  
- ADR-029: Text Service Architecture
- ADR-022: Extension Architecture
