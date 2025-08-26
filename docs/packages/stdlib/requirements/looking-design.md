# Looking Action Design

## Overview
The looking action provides a description of the current location and visible items. It's a basic sensory action that cannot fail and follows the three-phase pattern (validate/execute/report) with most logic in the report phase. This action marks rooms as visited and handles darkness mechanics.

## Required Messages
- `room_description` - Standard room description
- `room_description_brief` - Brief room description (already visited)
- `room_dark` - Room is dark and requires light
- `contents_list` - List of visible items
- `nothing_special` - No special details to note
- `in_container` - Player is inside a container
- `on_supporter` - Player is on a supporter
- `cant_see_in_dark` - Can't see details in darkness
- `look_around` - Generic looking around message
- `examine_surroundings` - Examining the surroundings (when using "examine" with no object)

## Validation Logic
Looking is **always valid** - it's a basic sensory action that cannot fail. The validate method simply returns `{ valid: true }`.

## Execution Flow

### 1. Mark Room as Visited
The only mutation in the execute phase:
- Gets the containing room via `world.getContainingRoom(player.id)`
- If room has `ROOM` trait, sets `visited = true` on the trait
- No events emitted from execute - all events generated in report phase

## Report Phase (Main Logic)

### 1. Error Handling
Handles validation/execution errors (though looking shouldn't fail):
- Validation errors: Adds room snapshot to error params
- Execution errors: Returns generic execution failure

### 2. Build Looked Event Data
Using `buildLookingEventData`:
- Captures complete room snapshot
- Gets visible items (excluding room and player)
- Checks darkness state
- Creates atomic event structure with:
  - Room snapshot
  - Visible item snapshots
  - Darkness flag
  - Timestamp

### 3. Check for Darkness
If room is dark (`isDark = true`):
- Emits `if.event.looked` event
- Emits `action.success` with `room_dark` message
- Returns early (no further description)

### 4. Generate Description Events
For lit rooms:
1. **Room Description Event** (`if.event.room.description`):
   - Contains room snapshot
   - Visible item snapshots
   - Verbose/brief mode flag
   - Contents list

2. **List Contents Event** (`if.event.list.contents`):
   - Only emitted if visible items exist
   - Groups items by type (NPCs, containers, supporters, other)
   - Includes full snapshots

3. **Success Message Event** (`action.success`):
   - Selects appropriate message based on context

## Data Structures

### LookedEventData
```typescript
{
  actorId: string,
  room: RoomSnapshot,           // Complete room state
  visibleItems: EntitySnapshot[], // Visible entities
  locationId: string,           // Backward compatibility
  locationName: string,
  locationDescription: string,
  isDark: boolean,
  contents: Array<{id, name, description}>,
  timestamp: number
}
```

### RoomDescriptionEventData
```typescript
{
  room: RoomSnapshot,
  visibleItems: EntitySnapshot[],
  roomId: string,
  roomName: string,
  roomDescription: string,
  includeContents: boolean,
  verbose: boolean,
  contents: Array<{id, name, description}>,
  timestamp: number
}
```

### ListContentsEventData
```typescript
{
  allItems: EntitySnapshot[],
  location: RoomSnapshot,
  items: string[],        // All item IDs
  npcs: string[],        // NPC IDs
  containers: string[],   // Container IDs
  supporters: string[],   // Supporter IDs
  other: string[],       // Other item IDs
  context: 'room',
  locationName: string,
  timestamp: number
}
```

## Darkness Logic

### Check If Dark
A room is dark if:
1. Room has `ROOM` trait with `requiresLight = true`
2. No active light sources in room
3. Player not carrying active light source

### Light Source Detection
Checks for `LIGHT_SOURCE` trait:
- If has `isLit` property, uses that value
- If has `SWITCHABLE` trait, checks if switched on
- Otherwise defaults to lit

## Message Selection Logic

### Priority Order
1. **Dark room**: `room_dark`
2. **In container**: `in_container`
3. **On supporter**: `on_supporter`
4. **Examine with no object**: `examine_surroundings`
5. **Room with visible items**: `contents_list`
6. **Standard room**: `room_description` or `room_description_brief`

### Brief vs Verbose
- Brief mode used when `verboseMode = false` AND room already visited
- First visit always shows verbose description
- Verbose mode can be toggled by game settings

## Traits and Behaviors

### Traits Checked
- `ROOM` - For visited status and light requirements
- `LIGHT_SOURCE` - For darkness calculation
- `SWITCHABLE` - For light source state
- `CONTAINER` - For location type messaging
- `SUPPORTER` - For location type messaging
- `ACTOR` - For grouping visible entities

### Behaviors Used
- `SwitchableBehavior.isOn()` - Check if light source is active

## Integration Points
- **World model**: Queries entity locations and containment
- **Visibility system**: Uses `context.getVisible()` for item detection
- **Snapshot system**: Creates atomic state captures
- **Event system**: Emits multiple events for UI rendering

## Current Implementation Notes

### Strengths
1. **Three-phase pattern**: Properly separates concerns
2. **Atomic events**: Complete state snapshots prevent inconsistency
3. **Rich event data**: Multiple events for different UI needs
4. **Darkness handling**: Comprehensive light source detection
5. **Minimal mutations**: Only marks room as visited

### Patterns Observed
1. **Report-heavy**: Most logic in report phase
2. **Multi-event**: Generates 2-4 events per action
3. **Snapshot-based**: Uses atomic state captures
4. **Context-aware**: Different messages for different situations

## Recommended Improvements
1. **Directional looking**: Support "look north" for exit descriptions
2. **Partial visibility**: Fog, distance, or obstruction effects
3. **Dynamic descriptions**: Time-based or state-based variations
4. **NPC observations**: Let NPCs react to player looking
5. **Examined flags**: Track what player has examined closely

## Usage Examples

### Standard Look
```
> look
[Room Name]
You are in a well-lit chamber with stone walls.
You can see a brass key and a wooden chest here.
```

### Dark Room
```
> look
It is pitch dark, and you can't see a thing.
```

### Brief Mode (Revisited)
```
> look
[Room Name]
```

### In Container
```
> look
You are inside the large crate.
```