# Atomic Events with Description Providers

## The Historical Accuracy Problem

You've identified a critical flaw in the current reference-based approach:

```typescript
// Turn 5: Player reads message (pristine)
event = { type: 'read', data: { targetId: 'message' } }
// Text service queries: world.getEntity('message').description
// Gets: "A pristine message in the sawdust"

// Turn 10: Player disturbs message
// Message entity's description changes to "A trampled message"

// Replay Turn 5 event:
// Text service queries: world.getEntity('message').description  
// Gets: "A trampled message" <- WRONG! Historical inaccuracy!
```

**The current system can't accurately replay history** because it always shows current state, not historical state.

## Atomic Events with Dynamic Providers

Your proposal: Events contain the data AND can include functions for dynamic behavior:

```typescript
interface RoomDescriptionEvent {
  type: 'room.description',
  data: {
    roomId: string,
    roomName: string,
    // Static description OR dynamic provider
    description: string | (() => string),
    isDark: boolean,
    // Dynamic description based on darkness
    getDarkDescription?: () => string
  }
}
```

## Implementation Patterns

### Pattern 1: Simple Static Snapshot
Most events just capture the state at that moment:
```typescript
// Looking action captures current state
const room = world.getEntity(roomId);
const identity = room.get('identity');

event = {
  type: 'room.description',
  data: {
    roomId: room.id,
    roomName: identity.name,
    description: identity.description, // Snapshot at this moment
    verbose: true
  }
}
```

### Pattern 2: Dynamic Providers for Computed Properties
Some properties need to be dynamic based on other event data:
```typescript
event = {
  type: 'room.entered',
  data: {
    roomId: 'bar',
    roomName: 'Foyer Bar',
    baseDescription: 'The bar, much rougher than...',
    isDark: true,
    hasCloak: true,
    
    // Computed property based on event's own data
    getDescription: function() {
      if (this.isDark && this.hasCloak) {
        return "It's pitch black. You can't see anything.";
      }
      return this.baseDescription;
    }
  }
}
```

### Pattern 3: Conditional Descriptions
Actions can embed logic for variations:
```typescript
event = {
  type: 'examine.message',
  data: {
    messageId: 'message',
    disturbances: 0, // Captured at event time
    
    getDescription: function() {
      if (this.disturbances === 0) {
        return "The message, neatly marked in the sawdust, reads...";
      } else if (this.disturbances < 3) {
        return "The message has been carelessly trampled...";
      } else {
        return "The message has been completely obliterated.";
      }
    },
    
    getText: function() {
      if (this.disturbances === 0) {
        return "You have won!";
      } else if (this.disturbances < 3) {
        return this.garbleText("You have won!", this.disturbances);
      }
      return "The message is too trampled to read.";
    }
  }
}
```

## Benefits of This Approach

### 1. **Historical Accuracy**
- Events capture state at the moment they occurred
- Replay shows what player actually saw
- True event sourcing

### 2. **Dynamic Behavior Without World Queries**
- Providers can compute variations
- Logic is embedded in the event
- No external dependencies

### 3. **Best of Both Worlds**
- Static data for simple cases
- Dynamic providers for complex cases
- Text service remains pure transformation

### 4. **Self-Contained Events**
- Events are complete records
- Can be serialized (functions as strings)
- Can be replayed anywhere

## Implementation Strategy

### Phase 1: Update Event Interface
```typescript
export interface ISemanticEvent {
  id: string;
  type: string;
  timestamp: number;
  entities: { /* ... */ };
  
  // Allow any data, including functions
  data?: any;
  
  // Deprecate these
  payload?: any;
  metadata?: any;
}
```

### Phase 2: Action Enrichment
Actions capture current state when creating events:

```typescript
// In looking.ts
execute(context: ActionContext): SemanticEvent[] {
  const location = context.world.getLocation(context.actor.id);
  const room = context.world.getEntity(location);
  const identity = room.get('identity');
  const roomTrait = room.get('room');
  
  // Capture everything needed at this moment
  const event = {
    type: 'if.event.room_description',
    data: {
      roomId: room.id,
      roomName: identity.name,
      roomDescription: identity.description,
      isDark: roomTrait.isDark,
      verbose: true,
      
      // Include dynamic provider if needed
      getEffectiveDescription: function() {
        if (this.isDark) {
          return `${this.roomName}\n\nIt's too dark to see.`;
        }
        return `${this.roomName}\n\n${this.roomDescription}`;
      }
    }
  };
  
  return [event];
}
```

### Phase 3: Text Service Simplification
```typescript
private translateRoomDescription(event: ISemanticEvent): string {
  const data = event.data;
  
  // If dynamic provider exists, use it
  if (typeof data.getEffectiveDescription === 'function') {
    return data.getEffectiveDescription();
  }
  
  // Otherwise use static data
  const output = [];
  if (data.verbose && data.roomName) {
    output.push(data.roomName);
  }
  if (data.roomDescription) {
    output.push(data.roomDescription);
  }
  
  return output.join('\n\n');
}
```

## Serialization Considerations

For save/load and replay:

```typescript
// When serializing events
function serializeEvent(event: ISemanticEvent): string {
  const serializable = { ...event };
  
  // Convert functions to strings
  if (serializable.data) {
    for (const key in serializable.data) {
      if (typeof serializable.data[key] === 'function') {
        serializable.data[key] = {
          __function: true,
          body: serializable.data[key].toString()
        };
      }
    }
  }
  
  return JSON.stringify(serializable);
}

// When deserializing
function deserializeEvent(json: string): ISemanticEvent {
  const event = JSON.parse(json);
  
  // Restore functions
  if (event.data) {
    for (const key in event.data) {
      if (event.data[key]?.__function) {
        // Use Function constructor to restore
        event.data[key] = new Function('return ' + event.data[key].body)();
      }
    }
  }
  
  return event;
}
```

## Migration Path

### Step 1: Type System Fix (Immediate)
- Change `data: Record<string, unknown>` to `data: any`
- Fixes immediate TypeScript issues

### Step 2: Gradual Enrichment (Incremental)
- Update actions one by one to emit richer events
- Start with simple static snapshots
- Add providers where needed

### Step 3: Text Service Evolution (As needed)
- Gradually reduce world model queries
- Move toward pure transformation
- Maintain backward compatibility

## Example: Cloak of Darkness Migration

### Current Event (Reference-based)
```typescript
{
  type: 'if.event.room_description',
  data: {
    roomId: 'bar',
    verbose: true
  }
}
```

### Atomic Event with Provider
```typescript
{
  type: 'if.event.room_description',
  data: {
    roomId: 'bar',
    roomName: 'Foyer Bar',
    baseDescription: 'The bar, much rougher than you\'d have guessed...',
    isDark: false, // Cloak was hung up at this point!
    verbose: true,
    disturbances: 0, // Historical snapshot
    
    getDescription: function() {
      const desc = [this.baseDescription];
      if (this.disturbances === 0) {
        desc.push('There seems to be some sort of message scrawled in the sawdust on the floor.');
      } else if (this.disturbances < 3) {
        desc.push('The message in the sawdust has been partially disturbed.');
      } else {
        desc.push('The sawdust on the floor has been completely disturbed.');
      }
      return desc.join(' ');
    }
  }
}
```

## Conclusion

Your insight about historical accuracy is spot-on. The current reference-based approach violates event sourcing principles by showing current state instead of historical state.

**Atomic events with providers** solve this by:
1. Capturing state at the moment of the event (historical accuracy)
2. Allowing dynamic behavior through embedded functions
3. Keeping events self-contained and replayable
4. Maintaining the ability to have complex, conditional descriptions

This is a better architecture that:
- Preserves history accurately
- Simplifies the text service
- Enables true event sourcing
- Still supports IF's need for dynamic text

The migration can be gradual - fix types now, enrich events incrementally.