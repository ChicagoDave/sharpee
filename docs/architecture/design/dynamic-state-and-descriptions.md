# Dynamic State Changes and Varying Descriptions Design

## Overview

This document addresses two important interactive fiction features requested by the intfiction.org community:

1. **Dynamic State Changes**: Objects that change state based on interactions (e.g., rag + water = wet rag)
2. **Varying Descriptions**: Objects with descriptions that change based on context or randomization

## Recommended Approach

After analysis, we recommend using Sharpee's existing entity attributes and event handlers for both features. This approach is simple, flexible, and uses existing systems without new abstractions.

See [simple-state-approach.md](./simple-state-approach.md) for the complete implementation guide.

## Key Principles

### 1. Entities Own Their State
- Use entity attributes to store state (isWet, temperature, timesExamined, etc.)
- Entity event handlers update their own state and descriptions
- No external state management needed

### 2. Descriptions Live in Identity Trait
- The Identity trait's `description` field is the single source of truth
- Entities update this field when their state changes
- Store description variations in entity attributes

### 3. Text Service Just Queries
- Text service queries entities from world model
- No custom logic in text service
- Returns whatever description the entity currently has

## Quick Examples

### Dynamic State (Wet Rag)
```typescript
const rag = world.createEntity('rag', 'item');
rag.attributes.isWet = false;
rag.attributes.descriptions = {
  dry: 'A clean, dry rag.',
  wet: 'A soaking wet rag.'
};

rag.on = {
  'if.event.dipped': function(event) {
    if (event.data.targetIsLiquid) {
      this.attributes.isWet = true;
      this.get(TraitType.IDENTITY).description = this.attributes.descriptions.wet;
    }
  }
};
```

### Varying Descriptions (Random)
```typescript
const painting = world.createEntity('painting', 'item');
painting.attributes.descriptions = [
  'A stormy seascape.',
  'The painting seems to shift.',
  'Dark clouds dominate the canvas.'
];

painting.on = {
  'if.event.examined': function() {
    const identity = this.get(TraitType.IDENTITY);
    const descs = this.attributes.descriptions;
    identity.description = descs[Math.floor(Math.random() * descs.length)];
  }
};
```

## Complex State Machines

For genuinely complex state machines (combination locks, multi-step puzzles), consider the StateTrait extension design described in [state-trait-extension.md](./state-trait-extension.md). However, this is only needed for ~10% of use cases.

## Benefits of Simple Approach

1. **No New Abstractions**: Uses existing entity/trait/event systems
2. **Immediately Understandable**: Just attributes and event handlers
3. **Flexible**: Add any attributes you need
4. **Performant**: No overhead from state management layers
5. **Easy to Debug**: State is just entity attributes

## Implementation Checklist

- [ ] Store state in entity attributes
- [ ] Store description variations in attributes
- [ ] Use event handlers to update state
- [ ] Update Identity trait description when state changes
- [ ] Let text service query current description from world model

## Conclusion

Sharpee's existing architecture elegantly handles dynamic states and varying descriptions without new systems. The combination of entity attributes, event handlers, and the Identity trait provides everything needed for rich, dynamic interactive fiction.