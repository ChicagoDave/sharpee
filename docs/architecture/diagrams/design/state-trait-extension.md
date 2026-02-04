# StateTrait Extension Design

## Overview

This document describes a potential StateTrait extension for complex state machines in interactive fiction. This would be appropriate for stdlib or as an optional extension when simple attribute-based approaches aren't sufficient.

## Use Cases

StateTrait is only needed for genuinely complex state machines:
- Combination locks with specific sequences
- Multi-step puzzles with intricate state transitions
- Machines with many operational modes
- Objects with 5+ interconnected states

For simple cases (wet/dry, on/off, broken/intact), use the attribute-based approach described in [simple-state-approach.md](./simple-state-approach.md).

## Design Proposal: State Traits

### Core Concept

Introduce a new `StateTrait` that tracks mutable states with structured transitions:

```typescript
interface StateTrait extends ITrait {
  type: TraitType.STATE;
  currentState: string;
  states: {
    [stateName: string]: {
      description?: string;
      adjectives?: string[];
      weight?: number;
      behaviors?: string[];  // Other traits to enable/disable
      transitions?: {
        [action: string]: {
          condition?: (entity: IFEntity, context: any) => boolean;
          nextState: string;
          messageKey?: string;  // Text service key
        }
      }
    }
  }
}
```

### Example Implementation

```typescript
// Complex state machine for a combination lock
const combinationLock = {
  id: 'combo-lock',
  traits: {
    [TraitType.STATE]: {
      type: TraitType.STATE,
      currentState: '0-0-0',
      states: {
        '0-0-0': {
          description: 'A combination lock set to 0-0-0.',
          transitions: {
            'turn_first_to_3': { nextState: '3-0-0' },
            'turn_first_to_wrong': { nextState: '?-0-0' }
          }
        },
        '3-0-0': {
          description: 'A combination lock with the first dial at 3.',
          transitions: {
            'turn_second_to_7': { nextState: '3-7-0' },
            'turn_second_to_wrong': { nextState: '3-?-0' },
            'reset': { nextState: '0-0-0' }
          }
        },
        '3-7-0': {
          description: 'A combination lock with two dials set.',
          transitions: {
            'turn_third_to_9': { 
              nextState: 'open',
              messageKey: 'lock.clicks_open'
            },
            'turn_third_to_wrong': { nextState: '3-7-?' },
            'reset': { nextState: '0-0-0' }
          }
        },
        'open': {
          description: 'The combination lock hangs open.',
          behaviors: ['can_remove']
        },
        // Error states
        '?-0-0': {
          description: 'A combination lock with incorrect settings.',
          transitions: {
            'reset': { nextState: '0-0-0' }
          }
        }
        // ... more states
      }
    }
  }
}
```

### Integration with Actions

Actions would check for state transitions and emit events:

```typescript
// In turning.ts action (for dials/knobs)
execute(context: ActionContext): SemanticEvent[] {
  const target = context.directObject.entity;
  const direction = context.command.modifiers?.direction;
  const value = context.command.modifiers?.value;
  
  // Check for state trait
  const stateTrait = target.get(TraitType.STATE);
  if (stateTrait) {
    const currentState = stateTrait.states[stateTrait.currentState];
    const transitionKey = `turn_${direction}_to_${value}`;
    const transition = currentState.transitions?.[transitionKey];
    
    if (transition && (!transition.condition || transition.condition(target, context))) {
      // Apply state change
      const previousState = stateTrait.currentState;
      stateTrait.currentState = transition.nextState;
      
      // Update properties based on new state
      const newState = stateTrait.states[transition.nextState];
      if (newState.weight) target.attributes.weight = newState.weight;
      if (newState.description) {
        const identity = target.get(TraitType.IDENTITY);
        if (identity) identity.description = newState.description;
      }
      
      return [{
        type: 'if.event.state_changed',
        data: {
          entity: target.id,
          fromState: previousState,
          toState: transition.nextState
        }
      }];
    }
  }
  
  // Default turning behavior
  return [/* ... */];
}
```

### State Visualization (Debug Feature)

```typescript
// Helper for debugging complex state machines
function visualizeStateMachine(entity: IFEntity): string {
  const stateTrait = entity.get(TraitType.STATE);
  if (!stateTrait) return 'No state machine';
  
  let output = `Current State: ${stateTrait.currentState}\n`;
  output += 'Possible transitions:\n';
  
  const currentState = stateTrait.states[stateTrait.currentState];
  for (const [action, transition] of Object.entries(currentState.transitions || {})) {
    output += `  ${action} → ${transition.nextState}\n`;
  }
  
  return output;
}
```

## Implementation Strategy

### As a Stdlib Extension

```typescript
// @sharpee/stdlib/extensions/state-trait
export { StateTrait } from './state-trait';
export { StateTransitionBehavior } from './state-transition-behavior';
export { createStateMachine } from './state-machine-factory';
```

### As a Separate Package

```typescript
// @sharpee/ext-state-machines
export * from './traits/state-trait';
export * from './behaviors/state-behavior';
export * from './actions/state-aware-actions';
export * from './debug/state-visualizer';
```

## Benefits

1. **Structured State Management**: Clear definition of states and transitions
2. **Declarative**: State machines defined as data, not code
3. **Debuggable**: Can visualize current state and possible transitions
4. **Reusable**: Common patterns can be extracted into helpers

## Drawbacks

1. **Complexity**: Another abstraction for authors to learn
2. **Overkill**: Most IF objects don't need this level of structure
3. **Maintenance**: State machines can become complex to maintain

## When to Use

Use StateTrait when:
- You have 5+ interconnected states
- State transitions have complex conditions
- You need to visualize/debug state flow
- Multiple objects share similar state patterns

Use simple attributes when:
- States are binary or simple (2-3 states)
- Transitions are straightforward
- State changes are independent

## Alternatives Considered

1. **State Machines as Separate Entities**: Have state machine objects that control other entities
   - Pro: Separation of concerns
   - Con: Additional indirection

2. **Rule-Based State Changes**: Use a rule engine for state transitions
   - Pro: Very flexible
   - Con: Too complex for most needs

3. **Behavior Trees**: Use behavior trees for complex state logic
   - Pro: Industry standard for game AI
   - Con: Overkill for IF objects

## Conclusion

StateTrait provides a powerful abstraction for complex state machines but should be reserved for cases that truly need it. The simple attribute-based approach handles 90% of IF needs more elegantly.