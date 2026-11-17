# Room Contents Display Architecture Fix

## Problem Statement

The looking action has a duplication bug where room descriptions are output twice when there are no direct items in the room. This reveals an architectural issue in how actions communicate prose output.

## Current Behavior (Bug)

When typing LOOK in a room with no direct items (e.g., Troll Room after killing the troll):

```
Troll Room
This is a small room with passages off in all directions...

Troll Room
This is a small room with passages off in all directions...
```

## Root Cause

The looking action has **two mechanisms** outputting room descriptions:

1. **Event-based**: `if.event.room.description` → handled by text-service room handler → outputs room name + description
2. **Message-based**: `action.success` with `messageId: 'room_description'` → lang-en-us lookup → outputs room name + description

When there ARE direct items in the room:
- `action.success` uses `messageId: 'contents_list'` → outputs "You can see X here" (no duplication)

When there are NO direct items:
- `action.success` falls back to `messageId: 'room_description'` → duplicates the room output

## Temporary Fix Applied

Changed `room_description` message to empty string in `packages/lang-en-us/src/actions/looking.ts`:

```typescript
messages: {
  // Note: room_description is empty because if.event.room.description already outputs the room
  // via the text service's room handler. This message ID exists for completeness but should not
  // duplicate the room description output.
  'room_description': "",
  ...
}
```

This works but is a workaround, not a proper architectural fix.

## Proper Architecture (Proposed)

### Current Pattern (Problematic)
```
Action.report() → { messageId, params }
                     ↓
           action.success event
                     ↓
        Lang layer message lookup
                     ↓
              Prose output
```

Actions carry prose instructions via `messageId` in `action.success`. This creates duplication when events already contain the semantic data needed for prose generation.

### Proposed Pattern
```
Action.report() → semantic events with structured data
                     ↓
           Text service event handlers
                     ↓
        Lang layer transforms data to prose
                     ↓
              Prose output

action.success → just a completion signal (no messageId)
```

### For Looking Action Specifically

**Events already emitted:**
- `if.event.looked` - the looking action occurred
- `if.event.room.description` - room name, description, visibility
- `if.event.list.contents` - items visible, direct items, containers, etc.

**Proposed change:**
- `if.event.room.description` → text service renders room name + description
- `if.event.list.contents` → text service renders "You can see X here" (or nothing if `directItems` is empty)
- `action.success` → just signals completion, no `messageId` for prose

The `if.event.list.contents` event already contains `directItems` and `directItemNames` arrays. The text service should check if `directItems.length > 0` and render the contents list accordingly.

## Implementation Plan

### Phase 1: Text Service Enhancement
1. Add handler for `if.event.list.contents` in text-service
2. Handler checks `directItems.length > 0` before outputting "You can see X here"
3. Use language layer for the actual prose template

### Phase 2: Looking Action Cleanup
1. Remove `messageId` return from looking action's report phase (or return empty/null)
2. Ensure all prose comes from event handlers
3. `action.success` becomes purely a completion signal

### Phase 3: Broader Refactoring (Optional)
1. Review other actions for similar patterns
2. Consider whether `action.success` should ever carry `messageId`
3. Document the preferred pattern in ADR

## Files Affected

- `packages/text-service/src/handlers/` - add list.contents handler
- `packages/lang-en-us/src/actions/looking.ts` - remove `room_description` message or keep empty
- `packages/stdlib/src/actions/standard/looking/looking-data.ts` - simplify report return

## Related

- ADR-096: Text Service Architecture
- `packages/text-service/src/handlers/room.ts` - existing room description handler
