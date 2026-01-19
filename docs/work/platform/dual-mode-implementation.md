# Dual-Mode Authored Content Implementation

**ADR**: ADR-107
**Branch**: dualmode
**Date**: 2026-01-19

## Overview

Implement dual-mode support for authored content (room descriptions, item descriptions) to enable both simple literal text and localized messageId references.

## Current State Analysis

### IdentityTrait (owns name/description)
```typescript
// packages/world-model/src/traits/identity/identityTrait.ts
class IdentityTrait {
  name = '';           // Literal text
  description = '';    // Literal text
  // No *Id variants exist
}
```

### RoomTrait (owns room-specific data)
```typescript
// packages/world-model/src/traits/room/roomTrait.ts
interface IRoomData {
  initialDescription?: string;  // First-visit description
  // No *Id variants exist
}
```

### Looking Action Data Flow
```
looking-data.ts:buildRoomDescriptionData()
  → Gets location.name, location.description from entity
  → Returns { roomName, roomDescription } as literal text

looking.ts:report()
  → Emits if.event.room.description with roomName/roomDescription

text-service/handlers/room.ts
  → Extracts roomName, roomDescription from event
  → Creates ROOM_NAME, ROOM_DESCRIPTION blocks directly
```

## Implementation Plan

### Phase 1: Trait Updates

**File**: `packages/world-model/src/traits/identity/identityTrait.ts`

Add ID variants to IdentityTrait:

```typescript
class IdentityTrait implements ITrait {
  name = '';
  description = '';

  // NEW: ID variants for localization
  nameId?: string;         // Message ID for localized name
  descriptionId?: string;  // Message ID for localized description
}
```

**File**: `packages/world-model/src/traits/room/roomTrait.ts`

Add ID variant for initialDescription:

```typescript
interface IRoomData {
  initialDescription?: string;
  initialDescriptionId?: string;  // NEW
}
```

### Phase 2: Event Data Updates

**File**: `packages/stdlib/src/actions/standard/looking/looking-data.ts`

Update `buildRoomDescriptionData()` to emit messageId OR text:

```typescript
const buildRoomDescriptionData = (context: ActionContext): Record<string, unknown> => {
  const identity = location.getTrait(TraitType.IDENTITY);

  // Room name - emit either messageId or text
  const nameData = identity.nameId
    ? { roomNameId: identity.nameId }
    : { roomName: identity.name };

  // Room description - emit either messageId or text
  const descData = identity.descriptionId
    ? { roomDescriptionId: identity.descriptionId }
    : { roomDescription: identity.description };

  return {
    ...nameData,
    ...descData,
    // ... other fields
  };
};
```

### Phase 3: Text Service Updates

**File**: `packages/text-service/src/handlers/room.ts`

Update handler to resolve messageId if present:

```typescript
interface RoomDescriptionData {
  // Text mode (current)
  roomName?: string;
  roomDescription?: string;

  // ID mode (new)
  roomNameId?: string;
  roomDescriptionId?: string;
}

function handleRoomDescription(event: ISemanticEvent, context: HandlerContext): ITextBlock[] {
  const data = event.data as RoomDescriptionData;
  const blocks: ITextBlock[] = [];

  // Room name
  let name: string | undefined;
  if (data.roomNameId && context.languageProvider) {
    name = context.languageProvider.getMessage(data.roomNameId, {});
  } else {
    name = data.room?.name ?? data.roomName;
  }

  if (name && data.verbose) {
    blocks.push(createBlock(BLOCK_KEYS.ROOM_NAME, name));
  }

  // Room description
  let description: string | undefined;
  if (data.roomDescriptionId && context.languageProvider) {
    description = context.languageProvider.getMessage(data.roomDescriptionId, {});
  } else {
    description = data.room?.description ?? data.roomDescription;
  }

  if (description) {
    blocks.push(createBlock(BLOCK_KEYS.ROOM_DESCRIPTION, description));
  }

  return blocks;
}
```

### Phase 4: Build and Test

1. Build world-model: `./scripts/build-dungeo.sh --skip world-model`
2. Run existing transcript tests to verify no regressions
3. Create a test transcript that exercises dual-mode

## Files to Modify

| Package | File | Changes |
|---------|------|---------|
| world-model | traits/identity/identityTrait.ts | Add nameId, descriptionId |
| world-model | traits/room/roomTrait.ts | Add initialDescriptionId |
| stdlib | actions/standard/looking/looking-data.ts | Emit messageId or text |
| text-service | handlers/room.ts | Resolve messageId if present |

## Testing Strategy

1. **Regression**: All existing transcripts should pass (they use literal text)
2. **New Tests**: Add transcript or unit test with messageId-based room descriptions

## Risks

- **None expected**: This is additive - existing stories continue to work unchanged
- **ID detection**: Use presence of `*Id` fields, not string pattern matching

## Success Criteria

1. Stories using literal text work unchanged
2. Stories can optionally use `nameId`/`descriptionId` for localization
3. Text-service resolves messageIds through language provider
4. No changes required to existing dungeo story
