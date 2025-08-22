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

Each action in stdlib will have a data configuration file that defines what data to capture for its events. This configuration is declarative and can be extended by stories:

```typescript
// packages/stdlib/src/actions/standard/taking/taking-data.ts
export const takingDataConfig: ActionDataConfig = {
  actionId: 'taking',
  availableData: {
    // What data this action makes available
    item: 'Entity being taken',
    previousLocation: 'Where item was before',
    previousContainer: 'Container item was in (if any)',
    player: 'Player taking the item',
    success: 'Whether action succeeded'
  },
  properties: [
    { 
      name: 'actionId', 
      source: DataSource.STATIC, 
      value: 'taking',
      description: 'Action identifier'
    },
    { 
      name: 'success',
      source: DataSource.CONTEXT,
      path: 'result.success',
      description: 'Whether the action succeeded'
    },
    { 
      name: 'item',
      source: DataSource.POST_STATE,
      path: 'directObject.entity',
      transform: DataTransform.ENTITY_SNAPSHOT,
      description: 'Complete snapshot of item taken'
    },
    { 
      name: 'itemId',
      source: DataSource.CONTEXT,
      path: 'directObject.entity.id',
      description: 'ID of item taken'
    },
    { 
      name: 'previousLocation',
      source: DataSource.PRE_STATE,
      path: 'directObject.entity.location',
      transform: DataTransform.ENTITY_NAME,
      description: 'Where item was before taking'
    }
  ]
};

interface ActionDataConfig {
  actionId: string;
  availableData: Record<string, string>;  // Documents what's available
  properties: DataProperty[];
}

interface DataProperty {
  name: string;                    // Property name in event data
  source: DataSource;              // Where to get the data
  path?: string;                   // Path within source
  transform?: DataTransform;       // Optional transformation
  required?: boolean;              // If missing, skip or error?
  description: string;             // What this data represents
}

enum DataSource {
  CONTEXT = 'context',             // From action context
  PRE_STATE = 'preState',          // World state before execute
  POST_STATE = 'postState',        // World state after execute
  COMPUTED = 'computed',           // Derived from other data
  STATIC = 'static',              // Hardcoded value
}

enum DataTransform {
  ENTITY_SNAPSHOT = 'entitySnapshot',     // Full entity data
  ENTITY_NAME = 'entityName',             // Just the name
  ENTITY_DESCRIPTION = 'entityDescription', // Just the description
  ROOM_SNAPSHOT = 'roomSnapshot',         // Full room data
  ROOM_CONTENTS = 'roomContents',         // List of entities in room
  COUNT = 'count',                        // Count of items
  // etc...
}
```

This provides a single, accessible point for configuring each action's report data.

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

// Story can extend the data configuration
const story: Story = {
  // Level 1: Rules for state modification
  rules: [
    {
      id: 'auto-light-lamp',
      when: (ctx) => ctx.phase === 'before' && ctx.action === 'taking' && ctx.target?.id === 'lamp',
      run: (ctx) => {
        ctx.world.setProperty('lamp', 'lit', true);
      }
    }
  ],

  // Level 2: Complete action replacement (rare)
  actions: {
    replacements: {
      'singing': CustomSingingAction,  // Completely custom action
    },
    
    // Level 3: Data configuration extensions (common)
    dataExtensions: {
      'taking': {
        // Add to the existing taking data config
        additionalProperties: [
          {
            name: 'weight',
            source: DataSource.POST_STATE,
            path: 'directObject.entity.properties.weight',
            description: 'Weight of item taken',
            required: false
          },
          {
            name: 'cursed',
            source: DataSource.POST_STATE,
            path: 'directObject.entity.properties.cursed',
            description: 'Whether item is cursed',
            required: false
          }
        ],
        // Can also override existing properties
        overrideProperties: {
          'item': {
            // Change to just capture name instead of full snapshot
            transform: DataTransform.ENTITY_NAME
          }
        }
      }
    }
  }
};
```

### Data Availability Validation

Stories can only access data that the action makes available. This is enforced at configuration time:

```typescript
// packages/stdlib/src/actions/standard/taking/taking-data.ts
export const takingDataConfig: ActionDataConfig = {
  actionId: 'taking',
  availableData: {
    // These define what's accessible
    'context.directObject': 'The object being taken',
    'context.player': 'The player performing the action',
    'context.result': 'The validation result',
    'preState.directObject.location': 'Where object was before',
    'postState.directObject.location': 'Where object is after',
    'postState.player.inventory': 'Player inventory after taking'
  },
  // ... properties
};

// Story extension is validated
const storyExtension = {
  'taking': {
    additionalProperties: [
      {
        name: 'customField',
        source: DataSource.POST_STATE,
        path: 'directObject.entity.foo',  // ❌ Not in availableData
        description: 'This will fail validation'
      }
    ]
  }
};

// Validation at story load time
validateDataExtensions(takingDataConfig, storyExtension);
// Error: Path 'directObject.entity.foo' not available for action 'taking'
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

### Report Processing

The action's report method would process its data configuration:

```typescript
// packages/stdlib/src/actions/base/report-builder.ts
export function buildEventData(
  config: ActionDataConfig,
  context: ActionContext,
  extensions?: DataExtensions
): unknown {
  // Merge base config with story extensions
  const finalConfig = mergeDataConfig(config, extensions);
  
  // Capture states
  const preState = context.preState;   // Saved before execute()
  const postState = context.postState; // Saved after execute()
  
  // Build event data from configuration
  const eventData: any = {};
  
  for (const prop of finalConfig.properties) {
    const value = extractDataProperty(prop, {
      context,
      preState,
      postState
    });
    
    if (value !== undefined || prop.required) {
      eventData[prop.name] = value;
    }
  }
  
  return eventData;
}

function extractDataProperty(prop: DataProperty, sources: DataSources): any {
  // Get base value from source
  let value = getValueFromSource(prop.source, prop.path, sources);
  
  // Apply transformation if specified
  if (prop.transform) {
    value = applyTransform(value, prop.transform, sources);
  }
  
  return value;
}
```

## Consequences

### Positive
- **Declarative** - No code needed for report customization
- **Clear boundaries** - Authors know exactly what can be customized
- **Maintains integrity** - Actions remain coherent units
- **Multiple options** - Rules, report config, and full replacement
- **Gradual customization** - Start with rules, escalate only if needed
- **Type safety** - All configurations are strongly typed
- **Debuggable** - Can log what data is being captured and from where

### Negative
- **No partial replacement** - Less granular control over phases
- **Configuration complexity** - Need to understand data sources and transforms
- **Learning curve** - Authors must understand customization hierarchy
- **Potential conflicts** - Rules and replacements could interact unexpectedly
- **Limited computed fields** - Complex computations may need custom actions

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