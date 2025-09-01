# About Action Design Review

## Current Implementation Analysis

### Overview
The `about` action is a meta-action that displays information about the game (title, author, version, etc.). It's currently implemented as a simple two-phase action that doesn't follow the three-phase pattern.

### Current Structure
- **Location**: `/packages/stdlib/src/actions/standard/about/`
- **Files**: 
  - `about.ts` - Main action implementation
  - `about-events.ts` - Event type definitions
  - `about-data.ts` - Missing (no data builder)
- **Tests**: None

### Current Implementation Issues

#### 1. Not Following Three-Phase Pattern
```typescript
// Current: Two-phase with execute returning events
validate(context: ActionContext): ValidationResult
execute(context: ActionContext): ISemanticEvent[]  // ❌ Wrong signature

// Should be: Three-phase
validate(context: ActionContext): ValidationResult
execute(context: ActionContext): void
report(context: ActionContext): ISemanticEvent[]
```

#### 2. Unused State Interface
```typescript
interface AboutState {
  displayMode: string;
}
```
This interface is defined but never used and should be removed. It's likely a remnant from an earlier implementation or incomplete refactoring.

#### 3. Validation Always Succeeds
The validate phase extracts `displayMode` but doesn't use it. The validation always returns `{ valid: true }`, which is fine for a meta-action but the mode extraction should be in execute.

#### 4. No Data Builder
Missing `about-data.ts` file means no participation in the action data building system.

#### 5. No Tests
No unit or integration tests to verify behavior.

## Design Considerations

### Is Three-Phase Appropriate?
For the `about` action, the three-phase pattern might seem like overkill since:
- No world state mutations occur
- No validation is really needed
- It's purely a signal to the text service
- The text service constructs the output entirely from story config

However, consistency across all actions provides:
- Predictable structure for maintainers
- Uniform testing patterns
- Clear separation of concerns

### Display Mode Consideration
The current implementation passes a `displayMode` parameter, but since the about content is entirely determined by the story config and text service implementation, this parameter may be unnecessary. The text service will always construct the same output from the story config regardless of any parameters passed in the event.

## Recommended Refactoring

### 1. Simplify and Implement Three-Phase Pattern
Since the about action is purely a signal and the text service constructs everything from story config, we can simplify:

```typescript
export const aboutAction: Action & { metadata: ActionMetadata } = {
  id: IFActions.ABOUT,
  
  validate(context: ActionContext): ValidationResult {
    // About action always succeeds
    return { valid: true };
  },
  
  execute(context: ActionContext): void {
    // No state mutations needed
    // No data to pass between phases
  },
  
  report(context: ActionContext): ISemanticEvent[] {
    // Simply signal that about was requested
    return [
      context.event('if.action.about', {})
    ];
  },
  
  group: "meta",
  metadata: {
    requiresDirectObject: false,
    requiresIndirectObject: false
  }
};
```

### 2. Simplify Event Type
Since the text service ignores parameters and builds from story config:
```typescript
export interface AboutDisplayedEventData {
  // Empty - the text service will construct output from story config
}
```

### 3. Create Data Builder
Add `about-data.ts`:
```typescript
import { createActionDataBuilder } from '../../data-builder';
import { IFActions } from '../../constants';

export const aboutDataBuilder = createActionDataBuilder({
  actionId: IFActions.ABOUT,
  scopeRequirements: [],
  nounResolvers: {}
});
```

### 4. Add Tests
Create simple tests:
- Unit tests for each phase
- Integration test for full flow
- Verify event structure

## Event Design

### Simplified Event
```typescript
'if.action.about': {}
```

Since the text service constructs the about information entirely from the story config, the event doesn't need any parameters. It's purely a signal that the about command was invoked. The text service will:
1. Receive the `if.action.about` event
2. Query the story config for title, author, version, etc.
3. Format and display the information

## Implementation Priority

**Low Priority** - The about action works as-is and doesn't affect gameplay. However, it should be refactored for consistency when doing a cleanup pass.

## Testing Strategy

### Unit Tests
```typescript
describe('about action', () => {
  it('should have correct action ID')
  it('should always validate successfully')
  it('should execute without mutations')
  it('should emit simple about event')
})
```

### Integration Tests
```typescript
describe('about action integration', () => {
  it('should emit event for text service to handle')
})
```

## Migration Path

1. Simplify to three-phase structure
2. Remove unused AboutState interface
3. Remove unnecessary displayMode parameter from event
4. Add data builder
5. Add minimal tests
6. Verify event structure remains compatible

## Summary

The `about` action is functional but inconsistent with the codebase's architectural patterns. Since it's purely a signal to the text service (which constructs output from story config), it can be extremely simple while still following the three-phase pattern for consistency.

### Key Recommendations
1. ✅ Implement three-phase pattern (with empty execute phase)
2. ✅ Simplify event to empty object (no parameters needed)
3. ✅ Create data builder for consistency
4. ✅ Add minimal tests
5. ❌ Remove displayMode parameter (unnecessary complexity)
6. ✅ Keep event atomic (just a signal)

### Key Insight
The about action demonstrates that some actions are purely signals to other layers. The text service owns the logic for constructing about information from story config. The action just needs to emit an event saying "the player typed ABOUT".

### Notes
- This is the simplest possible three-phase action
- Good template for other meta-actions (help, credits, version)
- Shows that not all actions need complex state management