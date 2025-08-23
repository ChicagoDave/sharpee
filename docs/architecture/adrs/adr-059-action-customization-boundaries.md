# ADR-059: Action Customization Boundaries

## Status
Proposed

## Context
With the introduction of the three-phase action pattern (ADR-058) and rules system (ADR-057), we need to define clear boundaries for how authors can customize action behavior. Key questions:

1. Should report logic be injectable/configurable per story?
2. Should authors be able to completely replace standard actions?
3. Should authors be able to replace individual phases (validate/execute/report)?

These decisions affect the balance between flexibility and system integrity.

## Decision

### 1. Report Configuration: Action-Level Data Definitions

Each action in stdlib will have a simple function that builds the data for its events. Stories can extend this data:

```typescript
// packages/stdlib/src/actions/standard/taking/taking-data.ts
export function buildTakingData(
  context: ActionContext,
  preState: WorldState,
  postState: WorldState
): Record<string, unknown> {
  const item = context.directObject?.entity;
  const previousLocation = preState.entities[item.id]?.location;
  
  return {
    // Core data (always included)
    actionId: 'taking',
    success: context.result?.success ?? false,
    actor: context.player.id,
    
    // Standard data
    itemId: item?.id,
    itemName: item?.name,
    item: captureEntitySnapshot(item),
    previousLocation: previousLocation ? entities[previousLocation]?.name : null,
    previousContainer: item?.container?.name
  };
}

// Simple type for action data builders
export type ActionDataBuilder = (
  context: ActionContext,
  preState: WorldState,
  postState: WorldState
) => Record<string, unknown>;
```

This provides a simple, testable function for building action data.

### 2. Action Registration: Full Replacement Allowed

Authors can register complete action replacements:

```typescript
interface ActionRegistry {
  register(actionId: string, action: Action): void;
  unregister(actionId: string): void;
  get(actionId: string): Action;
}

// Story can replace an action entirely
story.actions = {
  replacements: {
    'taking': CustomTakingAction,  // Must implement full Action interface
  }
};
```

However, replaced actions must implement the complete Action interface (validate/execute/report).

### 3. Phase Replacement: Not Allowed

Individual phase replacement is **not** allowed. Actions must be replaced atomically to maintain coherence between phases.

**Rationale:**
- Validate and execute phases are tightly coupled
- Report phase depends on changes made in execute
- Partial replacement could break invariants

### Customization Hierarchy

The system provides multiple levels of customization, used in this order:

1. **Before Rules** - Modify state before action (can prevent)
2. **Action Validation** - Standard or replaced action's validate
3. **Action Execution** - Standard or replaced action's execute  
4. **After Rules** - React to action completion
5. **Report Override** - Custom event generation (if configured)
6. **Default Report** - Standard action's report (if no override)

### Example Usage

```typescript
// In the action implementation
// packages/stdlib/src/actions/standard/taking/taking.ts
import { takingDataConfig } from './taking-data';

class TakingAction implements Action {
  private dataConfig = takingDataConfig;
  
  validate(context: ActionContext): ValidationResult { /* ... */ }
  
  execute(context: ActionContext): void { /* ... */ }
  
  report(context: ActionContext): ISemanticEvent[] {
    // Build the event data from configuration
    const eventData = buildEventData(this.dataConfig, context);
    
    // Create the actual semantic event
    const event: ISemanticEvent = {
      type: 'if.action.taking',
      timestamp: Date.now(),
      actor: context.player.id,
      data: eventData
    };
    
    // May return multiple events (e.g., taking + side effects)
    return [event];
  }
}

// Story configuration with rules
const story: Story = {
  // Level 1: Rules for state modification
  rules: [
    new BeforeRule({
      id: 'auto-wear-gloves-before-taking-glass',
      order: 10,
      when: (ctx) => 
        ctx.action === 'taking' && 
        ctx.command.directObject?.entity?.id === 'glass-shard',
      run: (ctx) => {
        // Before taking sharp glass, auto-wear gloves if player has them
        if (!ctx.player.isWearing('gloves') && ctx.player.has('gloves')) {
          ctx.world.wearItem(ctx.player.id, 'gloves');
          return { 
            message: 'You put on the gloves first to protect your hands.' 
          };
        }
      }
    }),
    
    new AfterRule({
      id: 'increment-disturbance-after-dropping',
      order: 20,
      when: (ctx) => 
        ctx.action === 'dropping' && 
        ctx.player.location === 'bar',
      run: (ctx) => {
        // After dropping something in the bar, increment disturbance counter
        const disturbances = ctx.world.getFlag('bar-disturbances') || 0;
        ctx.world.setFlag('bar-disturbances', disturbances + 1);
      }
    })
  ],

  // Level 2: Complete action replacement (rare)
  actions: {
    replacements: {
      'singing': CustomSingingAction,  // Completely custom action
    },
    
    // Level 3: Data extensions (common)
    dataExtensions: {
      'taking': (baseData, context, preState, postState) => {
        // Start with base data
        const data = { ...baseData };
        
        // Add story-specific data
        const item = postState.entities[context.directObject?.entity?.id];
        if (item) {
          data.weight = item.properties?.weight;
          data.cursed = item.properties?.cursed ?? false;
          
          // Story-specific computation
          if (story.questItems.includes(item.id)) {
            data.isQuestItem = true;
            data.questMessage = `You have found the ${item.name}!`;
          }
        }
        
        return data;
      }
    }
  }
};
```

### How Data Extension Works

The action's report method combines base data with story extensions:

```typescript
class TakingAction implements Action {
  report(context: ActionContext): ISemanticEvent[] {
    // Capture states for data building
    const preState = this.capturedPreState;
    const postState = captureWorldState(context.world);
    
    // Build base data
    let eventData = buildTakingData(context, preState, postState);
    
    // Apply story extension if present
    const extension = context.story?.actions?.dataExtensions?.['taking'];
    if (extension) {
      eventData = extension(eventData, context, preState, postState);
    }
    
    // Create the event
    return [{
      type: 'if.action.taking',
      timestamp: Date.now(),
      actor: context.player.id,
      data: eventData
    }];
  }
}
```

### Protected Core Data

To prevent stories from breaking essential data:

```typescript
// In the data extension function
const storyDataExtension = (baseData, context, preState, postState) => {
  const data = { ...baseData };
  
  // Core fields are protected
  const protectedFields = ['actionId', 'success', 'actor', 'type'];
  
  // Add custom data
  data.customField = 'custom value';
  
  // Try to override core field
  data.actionId = 'different';  // This could be prevented or warned
  
  return data;
};

// The system could validate or enforce protection
function applyDataExtension(baseData, extension, context, preState, postState) {
  const extended = extension(baseData, context, preState, postState);
  
  // Restore protected fields
  for (const field of protectedFields) {
    extended[field] = baseData[field];
  }
  
  return extended;
}
```

### File Structure

```
packages/stdlib/src/actions/standard/
├── taking/
│   ├── taking.ts          # Action implementation
│   ├── taking-data.ts     # Data configuration
│   └── taking.test.ts
├── looking/
│   ├── looking.ts
│   ├── looking-data.ts    # Data configuration
│   └── looking.test.ts
└── going/
    ├── going.ts
    ├── going-data.ts      # Data configuration
    └── going.test.ts
```


## Consequences

### Positive
- **Simple** - Just functions that build and extend data
- **Clear boundaries** - Authors know exactly what can be customized
- **Protected core data** - Essential fields can be protected from corruption
- **Flexible** - Stories can add any custom data they need
- **Testable** - Data builders are pure functions
- **Maintains integrity** - Actions remain coherent units
- **Gradual customization** - Start with rules, add data extensions as needed
- **Debuggable** - Can log what data is being built

### Negative
- **No partial phase replacement** - Cannot replace just validate or execute
- **Code required** - Data extensions require writing functions
- **Learning curve** - Authors must understand the data flow
- **Potential conflicts** - Rules and data extensions could interact unexpectedly

### Neutral
- Most customization via rules (90% of cases)
- Report overrides for event customization (9% of cases)
- Full action replacement rare (1% of cases)
- Partial phase replacement not supported

## Alternatives Considered

1. **Phase Decorators** - Allow wrapping individual phases
   - Rejected: Too complex, breaks phase coupling

2. **No Action Replacement** - Only rules for customization
   - Rejected: Some stories need completely custom actions

3. **Mixin Approach** - Combine behaviors from multiple sources
   - Rejected: Too complex for authors to reason about

4. **Event Transforms** - Modify events after generation
   - Rejected: Less efficient than report overrides

## Implementation Notes

- Action registry should be immutable after story initialization
- Report overrides should have access to both pre and post state
- Provide clear error messages for invalid customizations
- Document common patterns in authoring guide
- Consider validation tools to check customization conflicts

## Migration Path

1. Existing actions continue to work (no report overrides)
2. Rules can be added incrementally
3. Report overrides optional
4. Full replacements only when absolutely needed

## Related ADRs
- ADR-057: Before/After Rules System
- ADR-058: Action Report Function