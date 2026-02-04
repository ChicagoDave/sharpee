# Text Service Logic Design

## Overview

The text service is a translation layer that converts semantic events from the story/engine into narrative text for the player. It has access to the world model through the TextServiceContext and **should** query entities to get their properties.

## Core Design Principle

**The text service SHOULD query the world model** - this is by design. The events contain entity IDs, and the text service's job is to:
1. Receive events with entity references (IDs)
2. Query the world model to get entity details
3. Extract properties like name and description
4. Format them into narrative text

This is NOT a violation of separation of concerns - it's the intended architecture.

## Data Flow

```
Story/Engine → Events (with entity IDs) → Text Service → Query World Model → Format Text → Output
```

## Event Analysis from Cloak of Darkness

### Room Description Event
```json
{
  "type": "if.event.room_description",
  "data": {
    "roomId": "r02",
    "includeContents": true,
    "verbose": true
  }
}
```

**This is correct!** The event contains:
- `roomId` - The ID to query the world model with
- `verbose` - Whether to show the room name
- `includeContents` - Whether to list items

The text service then:
1. Queries `world.getEntity(roomId)`
2. Extracts name and description from the entity
3. Formats the output

### List Contents Event
```json
{
  "type": "if.event.list_contents",
  "data": {
    "items": ["i01", "s01"],
    "itemNames": ["velvet cloak", "brass hook"]
  }
}
```

This event provides both IDs and names (probably for convenience/performance).

### Action Success Event
```json
{
  "type": "action.success",
  "data": {
    "actionId": "if.action.looking",
    "messageId": "contents_list",
    "params": {
      "items": "velvet cloak, brass hook",
      "count": 2
    }
  }
}
```

Uses language provider with messageId and params.

## The Real Problem: TypeScript Types

The actual issue isn't the architecture - it's that:

1. **ISemanticEvent.data is `any`** - No type safety
2. **Entity structure is unclear** - How to properly access description?
3. **World model returns `IFEntity | null`** - Need null checks

## How Entities Store Data (from Cloak of Darkness)

```typescript
foyer.add(new IdentityTrait({
    name: 'Foyer of the Opera House',
    description: 'You are standing in a spacious hall...'
}));
```

Entities use traits. To access:
- Entity has a `get(traitName)` method
- Returns the trait instance
- Trait has properties like `name` and `description`

## Correct Implementation Pattern

```typescript
private translateRoomDescription(event: ISemanticEvent): string {
    const data = event.data || {};
    const output: string[] = [];
    
    // This is CORRECT - we SHOULD query the world model
    if (data.roomId && this.context) {
        const room = this.context.world.getEntity(data.roomId);
        if (room) {
            // Show name if verbose
            if (data.verbose) {
                const name = this.getEntityName(room);
                if (name) output.push(name);
            }
            
            // Get description
            const description = this.getEntityDescription(room);
            if (description) output.push(description);
        }
    }
    
    return output.join('\n\n');
}

private getEntityDescription(entity: IFEntity): string | null {
    // Entities store description in IdentityTrait
    const identity = entity.get('identity');
    if (identity && 'description' in identity) {
        return (identity as any).description;
    }
    return null;
}
```

## Type Safety Approaches

### Option 1: Type Assertions (Pragmatic)

```typescript
interface RoomDescriptionData {
    roomId: string;
    verbose?: boolean;
    includeContents?: boolean;
}

private translateRoomDescription(event: ISemanticEvent): string {
    const data = event.data as RoomDescriptionData;
    // Now TypeScript knows data.roomId is a string
}
```

### Option 2: Runtime Validation (Defensive)

```typescript
private translateRoomDescription(event: ISemanticEvent): string {
    const data = event.data || {};
    
    // Validate at runtime
    if (typeof data.roomId !== 'string') {
        return '';
    }
    
    // Now we know it's safe
    const room = this.context.world.getEntity(data.roomId);
}
```

### Option 3: Define Event Types (Ideal)

Create a union type of all possible event data shapes:

```typescript
type EventData = 
    | { type: 'room'; roomId: string; verbose?: boolean }
    | { type: 'action'; actionId: string; messageId: string; params?: any }
    | { type: 'contents'; items: string[]; itemNames: string[] };
```

## Summary

1. **Text service SHOULD query world model** - This is correct design
2. **Events contain IDs, not full data** - This is intentional
3. **The problem is TypeScript types**, not the architecture
4. **Entities use traits** to store properties
5. **We need type assertions or validation** for type safety