# Searching Action Design

## Overview
The searching action allows players to search objects or locations for concealed items. Unlike many actions, this one has minimal logic and no duplication between phases, focusing on revealing hidden items using the identity behavior.

## Required Messages
- `not_visible` - Target not visible
- `not_reachable` - Target not reachable
- `container_closed` - Container must be opened first
- `nothing_special` - Nothing found
- `found_items` - Items discovered
- `empty_container` - Container is empty
- `container_contents` - Container has items
- `supporter_contents` - Supporter has items
- `searched_location` - Searched current location
- `searched_object` - Searched an object
- `found_concealed` - Found hidden items

## Validation Logic

### Simple Validation
1. **No target**: Always valid (searches location)
2. **Container check**: If openable container, must be open (`container_closed`)
3. Otherwise: Always valid

## Execution Flow

### 1. Target Determination
- Uses direct object if provided
- Falls back to current location

### 2. Find Concealed Items
- Gets contents via `world.getContents()`
- Filters for concealed items using `IdentityBehavior.isConcealed()`

### 3. Reveal Concealed Items
If found:
- Calls `IdentityBehavior.reveal()` for each item

### 4. Message Selection
Complex branching based on:
- Whether items were found
- Target type (container/supporter/location/object)
- Whether target has contents

Message priority:
1. `found_concealed` - If concealed items found
2. Container messages:
   - `empty_container` - No contents
   - `container_contents` - Has contents
3. Supporter messages:
   - `supporter_contents` - Has contents
   - `nothing_special` - Empty
4. Location: `searched_location`
5. Object: `searched_object` or `nothing_special`

## Data Structures

### SearchedEventData
```typescript
interface SearchedEventData {
  target: EntityId;
  targetName: string;
  foundItems: EntityId[];
  foundItemNames: string[];
  searchingLocation?: boolean;
}
```

## Traits and Behaviors

### Traits Used
- `IDENTITY` - For concealment status
- `CONTAINER` - Affects messaging
- `SUPPORTER` - Affects messaging
- `OPENABLE` - Validation requirement

### Behaviors Used
- `IdentityBehavior`:
  - `isConcealed()` - Check if hidden
  - `reveal()` - Make visible
- `OpenableBehavior`:
  - `isOpen()` - Check container access

## Integration Points
- **World model**: Content queries
- **Identity system**: Concealment mechanics
- **Container system**: Access validation

## Current Implementation Notes

### Strengths
1. **No duplication**: Clean execution
2. **Proper delegation**: Uses behaviors correctly
3. **Flexible targeting**: Can search location or objects
4. **Simple validation**: Minimal checks

### Minor Issues
1. **No three-phase pattern**: Could use report phase
2. **String joining**: Items joined with comma
3. **Message complexity**: Complex branching for messages

## Recommended Improvements
1. **Add report phase**: Move events to report
2. **Format item lists**: Better list formatting
3. **Search depth**: Support recursive searching
4. **Search filters**: Find specific item types
5. **Partial success**: Report what can't be searched