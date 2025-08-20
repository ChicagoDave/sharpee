# Simplified Approach to Dynamic States and Descriptions

## Overview

After considering the wet rag scenario, a simpler approach using existing systems is more appropriate for most interactive fiction needs.

## Simpler Solution: Attributes + Conditional Logic

### For Wet Rag Scenario

Instead of complex state traits, just use entity attributes:

```typescript
// In story initialization
const rag = world.createEntity('rag', 'item');
rag.attributes.name = 'cotton rag';
rag.attributes.isWet = false;
rag.attributes.wetness = 0;  // 0-100 scale if needed
rag.attributes.liquidType = null;

// Store description variations in attributes
rag.attributes.descriptions = {
  dry: 'A clean, dry cotton rag.',
  wet: 'A wet cotton rag, dripping slightly.',
  damp: 'A slightly damp cotton rag.'
};

// Add identity trait
rag.add({
  type: TraitType.IDENTITY,
  name: 'cotton rag',
  description: rag.attributes.descriptions.dry  // Initial description
});

world.moveEntity(rag.id, room.id);
```

### Custom Dipping Action

```typescript
// In dipping.ts action
export const dippingAction: IAction = {
  id: IFActions.DIPPING,
  
  validate(context: ActionContext): ValidationResult {
    const item = context.command.directObject?.entity;
    const target = context.command.indirectObject?.entity;
    
    if (!item || !target) {
      return { valid: false, error: 'missing_objects' };
    }
    
    // Check if target contains liquid
    if (!target.has(TraitType.LIQUID) && !target.attributes.containsLiquid) {
      return { 
        valid: false, 
        error: 'not_liquid',
        params: { target: target.name }
      };
    }
    
    return { valid: true };
  },
  
  execute(context: ActionContext): ISemanticEvent[] {
    const item = context.command.directObject!.entity!;
    const target = context.command.indirectObject!.entity!;
    
    // Update item state
    item.attributes.isWet = true;
    item.attributes.wetness = 100;
    item.attributes.liquidType = target.attributes.liquidType || 'water';
    
    // Update weight if needed
    if (item.attributes.baseWeight) {
      item.attributes.weight = item.attributes.baseWeight * 1.5;
    }
    
    // Update description if it has descriptions object
    if (item.attributes.descriptions?.wet) {
      const identity = item.get(TraitType.IDENTITY);
      if (identity) {
        identity.description = item.attributes.descriptions.wet;
      }
    }
    
    // Emit the dipped event for entity handlers
    const events: ISemanticEvent[] = [];
    
    events.push(context.event('if.event.dipped', {
      item: item.name,
      target: target.name,
      targetIsLiquid: true
    }));
    
    // Success message will vary based on what was dipped
    const messageId = item.attributes.absorbent ? 'dipped_absorbent' : 'dipped';
    
    events.push(context.event('action.success', {
      actionId: context.action.id,
      messageId,
      params: {
        item: item.name,
        target: target.name
      }
    }));
    
    return events;
  }
};
```

### How Descriptions Work

The text service simply queries the entity's current description from its Identity trait:

```typescript
// Text service queries the world model
const entity = world.getEntity(entityId);
const identity = entity.get(TraitType.IDENTITY);
const description = identity?.description || 'You see nothing special.';

// The description is whatever the entity currently has set
// Entity handlers update this description when state changes
```

When state changes, the entity updates its own description:

```typescript
// In the entity's event handler or when state changes
if (this.attributes.isWet) {
  const identity = this.get(TraitType.IDENTITY);
  identity.description = this.attributes.descriptions.wet;
} else if (this.attributes.wetness < 50) {
  const identity = this.get(TraitType.IDENTITY);
  identity.description = this.attributes.descriptions.damp;
} else {
  const identity = this.get(TraitType.IDENTITY);
  identity.description = this.attributes.descriptions.dry;
}
```

### Time-Based Drying (Entity Handler)

```typescript
// In story initialization, add handler to the rag entity
rag.on = {
  'turn.ended': function(event) {
    if (this.attributes.wetness > 0) {
      // Reduce wetness each turn
      this.attributes.wetness = Math.max(0, this.attributes.wetness - 10);
      
      // Update state and description based on wetness
      if (this.attributes.wetness === 0) {
        this.attributes.isWet = false;
        this.attributes.liquidType = null;
        this.getTrait(TraitType.IDENTITY).description = this.attributes.descriptions.dry;
      } else if (this.attributes.wetness < 50) {
        this.getTrait(TraitType.IDENTITY).description = this.attributes.descriptions.damp;
      }
      
      // Entity handlers don't typically emit events
      // The text service will see the updated description on next examine
    }
  }
};
```

## Comparison: Simple vs Complex Approach

### Simple (Attributes + Handlers)
```typescript
// Just add attributes
entity.attributes.isWet = true;
entity.attributes.temperature = 'hot';
entity.attributes.broken = false;

// Check in actions/text service
if (entity.attributes.isWet) { /* ... */ }
```

**Pros:**
- Uses existing systems
- Immediately understandable
- Flexible - add any attribute
- No new abstractions
- Easy to debug

**Cons:**
- No structured state transitions
- Logic can be scattered

### Complex (StateTrait)
```typescript
// Define complex state machine
entity.traits[TraitType.STATE] = {
  states: { dry: { /* ... */ }, wet: { /* ... */ } },
  transitions: { /* ... */ }
}
```

**Pros:**
- Structured state machines
- Declarative transitions
- Good for complex puzzles

**Cons:**
- New abstraction to learn
- Overkill for simple cases
- More code for basic needs

## When to Use Each Approach

### Use Simple Attributes When:
- State is binary (wet/dry, on/off, broken/intact)
- Few states (2-3 variations)
- State changes are straightforward
- You need quick implementation

### Consider StateTrait Only When:
- Complex state machines (combination locks, multi-step puzzles)
- Many interconnected states (5+)
- States have complex transition rules
- You need state change visualization/debugging

## Varying Descriptions - Simple Approach

For varying descriptions, the entity manages its own description changes:

### Random Variation
```typescript
// In story initialization
const painting = world.createEntity('painting', 'item');
painting.attributes.descriptions = [
  'A stormy seascape with crashing waves.',
  'The painting shifts as you look at it.',
  'Dark clouds dominate the painted sky.'
];

painting.add({
  type: TraitType.IDENTITY,
  name: 'old painting',
  description: painting.attributes.descriptions[0]
});

// Entity handler picks a random description on examine
painting.on = {
  'if.event.examined': function(event) {
    const identity = this.get(TraitType.IDENTITY);
    const descriptions = this.attributes.descriptions;
    identity.description = descriptions[Math.floor(Math.random() * descriptions.length)];
  }
};
```

### Conditional Descriptions
```typescript
// Entity tracks its own state
const statue = world.createEntity('statue', 'item');
statue.attributes.timesExamined = 0;
statue.attributes.playerKnowsSecret = false;
statue.attributes.descriptions = {
  first: 'You gasp at the incredible detail of this marble warrior statue.',
  normal: 'The marble statue of a warrior stands in eternal combat.',
  secret: 'Now you see it - the statue\'s sword points to a hidden switch!'
};

statue.add({
  type: TraitType.IDENTITY,
  name: 'marble statue',
  description: statue.attributes.descriptions.first
});

// Update description based on state
statue.on = {
  'if.event.examined': function(event) {
    const identity = this.get(TraitType.IDENTITY);
    this.attributes.timesExamined++;
    
    if (this.attributes.playerKnowsSecret) {
      identity.description = this.attributes.descriptions.secret;
    } else if (this.attributes.timesExamined === 1) {
      identity.description = this.attributes.descriptions.first;
    } else {
      identity.description = this.attributes.descriptions.normal;
    }
  }
};
```

## Recommendation

For 90% of interactive fiction needs, the simple attribute-based approach is better:

1. **Wet rag**: Just use `isWet` attribute + event handlers
2. **Varying descriptions**: Use arrays or attribute checks
3. **State changes**: Modify attributes directly

Reserve complex state management for genuinely complex state machines where the investment in abstraction pays off.

## Implementation Examples

### Example 1: Complete Wet/Dry Rag
```typescript
// In story.initializeWorld(world: WorldModel)
const rag = world.createEntity('rag', 'item');
rag.attributes.name = 'cotton rag';
rag.attributes.isWet = false;
rag.attributes.wetness = 0;
rag.attributes.descriptions = {
  dry: 'A clean, dry cotton rag.',
  wet: 'A soaking wet rag, dripping water.',
  damp: 'A slightly damp rag.'
};

rag.add({
  type: TraitType.IDENTITY,
  name: 'cotton rag',
  description: rag.attributes.descriptions.dry
});

// Add event handler for dipping (custom event from dipping action)
rag.on = {
  'if.event.dipped': function(event) {
    if (event.data.targetIsLiquid) {
      this.attributes.isWet = true;
      this.attributes.wetness = 100;
      this.get(TraitType.IDENTITY).description = this.attributes.descriptions.wet;
      
      // No need to return anything - the action will handle success message
      // The text service will see the state change and adjust messages accordingly
    }
  }
};

world.moveEntity(rag.id, room.id);
```

### Example 2: Breakable Mirror
```typescript
// In story initialization
const mirror = world.createEntity('mirror', 'item');
mirror.attributes.name = 'ornate mirror';
mirror.attributes.isBroken = false;

mirror.add({
  type: TraitType.IDENTITY,
  name: 'ornate mirror',
  description: 'An ornate mirror in a golden frame.'
});

mirror.add({
  type: TraitType.SCENERY  // Can't be taken
});

mirror.on = {
  'if.event.struck': function(event) {
    if (!this.attributes.isBroken) {
      this.attributes.isBroken = true;
      this.get(TraitType.IDENTITY).description = 
        'The mirror is shattered into a web of cracks.';
      
      // The striking action will handle the success message
      // We just update our state
    }
  }
};

world.moveEntity(mirror.id, room.id);
```

### Example 3: Temperature States
```typescript
// In story initialization
const metalRod = world.createEntity('metal-rod', 'item');
metalRod.attributes.name = 'iron rod';
metalRod.attributes.temperature = 20;  // Celsius
metalRod.attributes.baseWeight = 2;
metalRod.attributes.weight = 2;

metalRod.add({
  type: TraitType.IDENTITY,
  name: 'iron rod',
  description: 'A solid iron rod.'
});

// Dynamic description based on temperature
metalRod.on = {
  'if.event.heated': function(event) {
    this.attributes.temperature = Math.min(1000, 
      this.attributes.temperature + event.data.heatAmount);
    this.updateDescription();
  },
  'turn.ended': function(event) {
    // Cool down over time
    if (this.attributes.temperature > 20) {
      this.attributes.temperature = Math.max(20,
        this.attributes.temperature - 5);
      this.updateDescription();
    }
  }
};

// Helper method (would be added to entity)
metalRod.updateDescription = function() {
  const temp = this.attributes.temperature;
  const identity = this.get(TraitType.IDENTITY);
  
  if (temp > 500) {
    identity.description = 'The rod glows red-hot!';
  } else if (temp > 100) {
    identity.description = 'The rod is too hot to touch.';
  } else if (temp > 40) {
    identity.description = 'The rod feels warm to the touch.';
  } else {
    identity.description = 'A solid iron rod.';
  }
};

world.moveEntity(metalRod.id, room.id);
```

## Conclusion

The beauty of Sharpee's architecture is that it already supports dynamic states through:
- **Entity attributes** - Store any state you need
- **Event handlers** - React to events and update state
- **Identity trait description** - Single source of truth that text service queries
- **World model** - Text service queries entities for their current descriptions

The flow is simple:
1. Something happens (action, event, turn)
2. Entity's event handler updates its own state and description
3. Text service queries the entity's current description from world model
4. Player sees the updated description

No custom text service logic needed. No new abstractions needed. Keep it simple!