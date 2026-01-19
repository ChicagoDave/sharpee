# ADR-107: Dual-Mode Authored Content

## Status: PROPOSED

## Date: 2026-01-19

## Context

Sharpee distinguishes between two types of text:

1. **System messages** - UI prose owned by the language layer ("Taken.", "It's too dark to see.")
2. **Authored content** - Story prose owned by the author (room descriptions, object descriptions)

The simplified event pattern (ADR-097) established that action events carry a `messageId` for text rendering. However, room descriptions currently use a "special case" pattern where the event carries literal text directly rather than a messageId.

This creates architectural inconsistency, but the special case exists because:
- Room descriptions are authored content, not system messages
- Authors may not want to register every room's text in the language provider
- The current pattern "just works" for single-language stories

However, authors who want **localized stories** (e.g., English and Spanish) need a path to:
1. Register all authored text in language provider(s)
2. Reference that text by ID from entities
3. Have the system resolve the appropriate language at runtime

## Decision Drivers

1. **Author ergonomics** - Simple stories should stay simple (literal text)
2. **Localization support** - Multi-language stories must be possible
3. **Architectural consistency** - Minimize special cases in text-service
4. **No coupling** - World-model must not depend on language provider

## Decision

Support **dual-mode** authored content: entities can store either literal text OR a message ID, and the system handles both transparently.

### Entity Properties

Traits that hold authored content support paired properties:

```typescript
// RoomTrait
interface RoomTrait {
  // Literal mode (simple, single-language)
  name?: string;
  description?: string;

  // ID mode (localized, multi-language)
  nameId?: string;
  descriptionId?: string;
}

// IdentityTrait (for object descriptions)
interface IdentityTrait {
  name?: string;
  description?: string;

  nameId?: string;
  descriptionId?: string;
}
```

**Resolution priority**: ID takes precedence over literal if both are present.

### Layer Responsibilities

**Actions (stdlib)** emit events with either `messageId` or `text`. No resolution happens here - just data packaging.

**Text-service** receives events and resolves text. This is where `messageId` gets looked up from the language provider.

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Action Layer (stdlib)                                                   │
│                                                                         │
│   Entity has literal text?  ──► emit { text: '...' }                   │
│   Entity has messageId?     ──► emit { messageId: '...', params: {} }  │
│                                                                         │
│   (No resolution - just package what the entity provides)              │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼ events
┌─────────────────────────────────────────────────────────────────────────┐
│ Text Service                                                            │
│                                                                         │
│   Has messageId?  ──► language.getMessage(messageId, params)           │
│   Has text?       ──► use directly                                     │
│                                                                         │
│   (Resolution happens HERE)                                            │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼ ITextBlock[]
┌─────────────────────────────────────────────────────────────────────────┐
│ Client (React/CLI)                                                      │
└─────────────────────────────────────────────────────────────────────────┘
```

### Event Emission (Action Layer)

Actions check which mode the entity uses and emit accordingly. **No text resolution happens here.**

```typescript
// In looking action report()
const roomTrait = room.getTrait(TraitType.ROOM);

// Room name event - just package the data
if (roomTrait.nameId) {
  events.push(context.event('if.event.room.name', {
    messageId: roomTrait.nameId,
    params: {}
  }));
} else if (roomTrait.name) {
  events.push(context.event('if.event.room.name', {
    text: roomTrait.name
  }));
}

// Room description event - just package the data
if (roomTrait.descriptionId) {
  events.push(context.event('if.event.room.description', {
    messageId: roomTrait.descriptionId,
    params: {}
  }));
} else if (roomTrait.description) {
  events.push(context.event('if.event.room.description', {
    text: roomTrait.description
  }));
}
```

### Text Service (Resolution Layer)

Text-service receives events and resolves them to text blocks. **This is where messageId lookup happens.**

```typescript
// Unified handler - same pattern for ALL events
function processEvent(
  event: ISemanticEvent,
  context: HandlerContext,
  blockKey: string
): ITextBlock[] {
  let text: string;

  if (event.data.messageId) {
    // Resolve messageId from language provider NOW
    text = context.language.getMessage(
      event.data.messageId,
      event.data.params
    );
  } else if (event.data.text) {
    // Literal text - use directly
    text = event.data.text;
  } else {
    return [];
  }

  return [createBlock(blockKey, text)];
}
```

### Concrete Examples

#### LOOK Command (Authored Content)

**Simple mode** - entity has literal text:

```typescript
// Entity setup
kitchen.addTrait(TraitType.ROOM, {
  name: 'Kitchen',
  description: 'A small kitchen with dated appliances.'
});

// Events emitted by looking action (no resolution yet)
[
  { type: 'if.event.room.name', data: { text: 'Kitchen' } },
  { type: 'if.event.room.description', data: { text: 'A small kitchen with dated appliances.' } }
]

// Text-service processes events → text blocks
[
  { key: 'ROOM_NAME', content: ['Kitchen'] },
  { key: 'ROOM_DESCRIPTION', content: ['A small kitchen with dated appliances.'] }
]
```

**Localized mode** - entity has messageId:

```typescript
// Entity setup
kitchen.addTrait(TraitType.ROOM, {
  nameId: 'room.kitchen.name',
  descriptionId: 'room.kitchen.description'
});

// Language provider (registered separately)
language.addMessage('room.kitchen.name', 'Kitchen');
language.addMessage('room.kitchen.description', 'A small kitchen with dated appliances.');

// Events emitted by looking action (no resolution yet)
[
  { type: 'if.event.room.name', data: { messageId: 'room.kitchen.name', params: {} } },
  { type: 'if.event.room.description', data: { messageId: 'room.kitchen.description', params: {} } }
]

// Text-service resolves messageIds → text blocks (same output)
[
  { key: 'ROOM_NAME', content: ['Kitchen'] },
  { key: 'ROOM_DESCRIPTION', content: ['A small kitchen with dated appliances.'] }
]
```

#### GET SWORD (System Message)

System messages always use messageId - the text lives in the language layer:

```typescript
// Language provider (in lang-en-us)
language.addMessage('if.action.taking.taken', 'Taken.');

// Event emitted by taking action (no resolution yet)
{
  type: 'if.event.taken',
  data: {
    messageId: 'if.action.taking.taken',
    params: { item: 'sword' },
    actorId: 'player',
    targetId: 'sword'
  }
}

// Text-service resolves messageId → text block
{ key: 'ACTION_RESULT', content: ['Taken.'] }
```

#### Side-by-Side

| Aspect | LOOK (authored) | GET SWORD (system) |
|--------|-----------------|-------------------|
| Text owner | Story author | Language layer |
| Simple mode event | `{ text: 'Kitchen' }` | N/A |
| Localized mode event | `{ messageId: 'room.kitchen.name' }` | `{ messageId: 'if.action.taking.taken' }` |
| Resolution happens | Text-service | Text-service |
| Handler logic | Same unified pattern | Same unified pattern |

### Author Workflow

#### Simple Mode (Single Language)

```typescript
// stories/my-story/src/regions/house/rooms/kitchen.ts
export function createKitchen(world: WorldModel) {
  const kitchen = world.createEntity('kitchen', EntityType.ROOM);
  kitchen.addTrait(TraitType.ROOM, {
    name: 'Kitchen',
    description: 'A small kitchen with dated appliances. The smell of old coffee lingers.'
  });
  return kitchen;
}
```

No language provider registration needed. Text renders directly.

#### Localized Mode (Multi-Language)

```typescript
// stories/my-story/src/regions/house/rooms/kitchen.ts
export function createKitchen(world: WorldModel) {
  const kitchen = world.createEntity('kitchen', EntityType.ROOM);
  kitchen.addTrait(TraitType.ROOM, {
    nameId: 'room.kitchen.name',
    descriptionId: 'room.kitchen.description'
  });
  return kitchen;
}

// stories/my-story/src/lang/en-us.ts
export function registerEnglish(language: EnglishLanguageProvider) {
  language.addMessage('room.kitchen.name', 'Kitchen');
  language.addMessage('room.kitchen.description',
    'A small kitchen with dated appliances. The smell of old coffee lingers.');
}

// stories/my-story/src/lang/es-mx.ts
export function registerSpanish(language: SpanishLanguageProvider) {
  language.addMessage('room.kitchen.name', 'Cocina');
  language.addMessage('room.kitchen.description',
    'Una cocina pequena con electrodomesticos anticuados. Persiste el olor a cafe viejo.');
}
```

### Event Types

Separate event types for distinct block rendering:

| Event | Block Key | Purpose |
|-------|-----------|---------|
| `if.event.room.name` | `ROOM_NAME` | Room title (bold, styled) |
| `if.event.room.description` | `ROOM_DESCRIPTION` | Room prose |
| `if.event.object.description` | `OBJECT_DESCRIPTION` | Examine result |

This replaces the current single `if.event.room.description` that carries both name and description.

### Parameterized Descriptions

ID mode enables dynamic descriptions with parameters:

```typescript
// Entity
kitchen.addTrait(TraitType.ROOM, {
  descriptionId: 'room.kitchen.description'
});

// Message template (supports ADR-095 formatters)
language.addMessage('room.kitchen.description',
  'A small kitchen with dated appliances. {npcName} is here, looking hungry.'
);

// Event emission includes params
events.push(context.event('if.event.room.description', {
  messageId: roomTrait.descriptionId,
  params: { npcName: 'the cat' }
}));
```

## Consequences

### Positive

- **Unified pattern** - All events can use `messageId` OR `text`, eliminating special cases
- **Author choice** - Simple stories stay simple, complex stories get localization
- **Full formatter support** - ID mode enables `{a:item}`, perspective placeholders, etc.
- **Clean separation** - World-model stores IDs, language layer stores text
- **Gradual adoption** - Authors can start simple and add localization later

### Negative

- **Dual properties** - Traits have both `name` and `nameId` (minor complexity)
- **Author responsibility** - Localized stories must register all text manually
- **Migration needed** - Current room description handler needs refactoring

### Neutral

- **No automatic registration** - System doesn't auto-register entity text (avoids coupling)
- **ID conventions** - Authors choose their own ID patterns (e.g., `room.{id}.name`)

## Implementation

### Phase 1: Trait Updates

1. Add `nameId`, `descriptionId` to RoomTrait
2. Add `descriptionId` to IdentityTrait
3. Update trait interfaces in world-model

### Phase 2: Event Refactoring

1. Split `if.event.room.description` into `if.event.room.name` and `if.event.room.description`
2. Update looking action to emit based on entity mode
3. Update going action similarly

### Phase 3: Text Service

1. Create unified `handleAuthoredContent()` helper
2. Update room handlers to use helper
3. Remove legacy `handleRoomDescription` that expects combined data

### Phase 4: Documentation

1. Update story authoring guide with both modes
2. Add localization guide for multi-language stories
3. Update CLAUDE.md with pattern guidance

## Related ADRs

| ADR | Relationship |
|-----|--------------|
| ADR-095 | Formatter syntax available in ID mode templates |
| ADR-096 | Text service consumes these events |
| ADR-097 | Simplified event pattern this extends |
| ADR-089 | Perspective placeholders work in ID mode |

## References

- Previous discussion on room description "special case"
- Inform 7's approach to multilingual support
- gettext pattern for string externalization
