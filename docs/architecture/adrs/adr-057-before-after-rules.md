# ADR-057: Before/After Rules System for Story Logic

## Status
Proposed

## Context
Interactive fiction authors need to inject custom logic around action execution to implement puzzles, story progression, and special behaviors. Currently, this is done through entity event handlers, but we need a more structured approach that allows story-level logic to run before and after actions.

Key requirements:
- Authors need to modify world state before actions (e.g., auto-equip gloves)
- Authors need to react to actions after execution (e.g., increment counters)
- Rules must have predictable execution order
- Rules should be able to prevent actions from executing
- The system must integrate cleanly with the validate/execute/report action phases

## Decision

### Rule Structure
Rules are first-class objects with explicit ordering:

```typescript
interface Rule {
  id: string;                                    // Unique identifier for debugging
  order: number;                                 // Execution order (lower runs first)
  when: (context: RuleContext) => boolean;      // Condition to check
  run: (context: RuleContext) => RuleResult | void;  // Effect to apply
  enabled?: boolean | (() => boolean);          // Optional enable/disable
}

interface RuleContext {
  action: string;                   // Action being executed
  phase: 'before' | 'after';       // When the rule is running
  world: WorldModel;                // Access to world state
  player: Entity;                   // The player entity
  command: ValidatedCommand;        // The parsed command
  result?: ActionResult;            // For 'after' phase only
}

interface RuleResult {
  prevent?: boolean;                // Stop action execution (before phase only)
  message?: string;                 // Message to display
  events?: ISemanticEvent[];       // Events to emit
}
```

### Execution Flow
The command executor will follow this sequence:

1. **Before Rules** - Run all matching before rules in order
   - Can mutate world state
   - Can prevent action execution
   - Can emit events

2. **Action.validate()** - Validate action with current world state
   - Sees mutations from before rules
   - Standard action validation logic

3. **Action.execute()** - Perform the action
   - Mutates world state
   - Core action logic only

4. **After Rules** - Run all matching after rules in order
   - Can mutate world state
   - Can emit events
   - Cannot prevent (action already happened)

5. **Action.report()** - Generate events from final state
   - Captures complete state after all mutations
   - Creates atomic events with embedded data

### Story Integration
Rules are defined as part of the story:

```typescript
interface Story {
  rules: Rule[];
  // ... other story properties
}
```

### Example Rules

```typescript
const story: Story = {
  rules: [
    {
      id: 'auto-wear-gloves',
      order: 10,
      when: (ctx) => 
        ctx.phase === 'before' && 
        ctx.action === 'taking' &&
        ctx.command.directObject?.entity?.id === 'fragile-vase',
      run: (ctx) => {
        if (!ctx.player.isWearing('gloves') && ctx.player.has('gloves')) {
          // Automatically wear the gloves
          ctx.world.wearItem(ctx.player.id, 'gloves');
          return {
            events: [ctx.createEvent('story.message', {
              text: 'You carefully put on your gloves first.'
            })]
          };
        }
        if (!ctx.player.has('gloves')) {
          return {
            prevent: true,
            message: 'The vase looks too delicate to handle without gloves.'
          };
        }
      }
    },
    
    {
      id: 'increment-button-counter',
      order: 20,
      when: (ctx) =>
        ctx.phase === 'after' &&
        ctx.action === 'pushing' &&
        ctx.command.directObject?.entity?.id === 'red-button',
      run: (ctx) => {
        const count = (ctx.world.getFlag('button-presses') || 0) + 1;
        ctx.world.setFlag('button-presses', count);
        
        if (count === 3) {
          return {
            events: [ctx.createEvent('story.progress', {
              milestone: 'puzzle-solved',
              message: 'A secret door slides open!'
            })]
          };
        }
      }
    }
  ]
};
```

## Consequences

### Positive
- **Clear execution order** - Rules run in predictable sequence
- **Separation of concerns** - Story logic separate from action logic
- **State mutations allowed** - Rules can prepare world state
- **Testable** - Each rule can be tested independently
- **Debuggable** - Can log which rules fire and why
- **Author-friendly** - Familiar pattern for adding game logic

### Negative
- **Complexity** - Another layer in the execution flow
- **Debugging challenges** - Rules can interfere with each other
- **Performance** - Each action evaluates all rules
- **State consistency** - Rules mutating state could cause unexpected interactions

### Neutral
- Rules run on every action (filtered by `when` condition)
- Order matters significantly - authors must understand execution sequence
- Before rules can prevent actions, after rules cannot

## Alternatives Considered

1. **Middleware chain** - More flexible but harder to reason about
2. **Event-only hooks** - Simpler but can't mutate state before validation
3. **Entity-only handlers** - Already exists but insufficient for story-level logic
4. **Inline hooks in actions** - Would require modifying every action

## Implementation Notes

- Rules should be loaded from story definition
- Consider rule groups for organization (tutorial rules, endgame rules)
- Add debugging support to trace rule execution
- Consider caching rule evaluation for performance
- Document clear examples for common patterns

## Advanced Features

### Rule Groups
For better organization and management, rules can be organized into named groups (similar to Inform's rulebooks):

```typescript
interface RuleGroup {
  id: string;                                    // Group identifier
  enabled?: boolean | (() => boolean);          // Enable/disable entire group
  rules: Rule[];                                 // Rules in this group
}

interface Story {
  ruleGroups?: RuleGroup[];  // Optional rule groups
  rules?: Rule[];            // Standalone rules
}
```

Example usage:

```typescript
const story: Story = {
  ruleGroups: [
    {
      id: 'tutorial',
      enabled: () => !world.getFlag('tutorial-complete'),
      rules: [
        {
          id: 'tutorial-hint-examine',
          order: 10,
          when: (ctx) => ctx.phase === 'before' && ctx.action === 'examining',
          run: (ctx) => ({
            events: [ctx.createEvent('story.hint', {
              text: 'Good! Examining objects reveals important details.'
            })]
          })
        },
        // More tutorial rules...
      ]
    },
    {
      id: 'endgame',
      enabled: () => world.getFlag('act-3-started'),
      rules: [
        {
          id: 'endgame-time-pressure',
          order: 5,
          when: (ctx) => ctx.phase === 'after',
          run: (ctx) => {
            const turnsLeft = world.getFlag('turns-until-collapse') - 1;
            world.setFlag('turns-until-collapse', turnsLeft);
            if (turnsLeft <= 0) {
              return {
                events: [ctx.createEvent('story.ending', {
                  type: 'time-limit',
                  message: 'The tower collapses around you!'
                })]
              };
            }
          }
        },
        // More endgame rules...
      ]
    }
  ]
};
```

Benefits of rule groups:
- **Conditional activation** - Enable/disable groups based on story state
- **Better organization** - Group related rules together
- **Named references** - Can refer to groups by ID for debugging
- **Phase separation** - Keep different story modes/phases separate
- **Performance** - Skip entire groups when disabled