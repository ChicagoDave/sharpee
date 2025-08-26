# Listening Action Design Document

## Action Overview
The listening action allows players to listen for sounds in their current environment or from specific objects. This sensory action detects active sound sources, identifies different types of sounds (devices, liquids, ambient), and provides appropriate feedback about what the player hears. The action always succeeds and provides context-specific messages.

## Action ID
`IFActions.LISTENING`

## Required Messages
- `not_visible` - Target cannot be seen (unused due to AUDIBLE scope)
- `silence` - No sounds detected in environment
- `ambient_sounds` - General environmental sounds
- `active_devices` - Devices making noise
- `no_sound` - Object makes no sound
- `device_running` - Device is operating and making noise
- `device_off` - Device is turned off
- `container_sounds` - Sounds from container contents
- `liquid_sounds` - Liquid sloshing sounds
- `listened_to` - Generic listened to object
- `listened_environment` - Listened to surroundings

## Validation Logic

### Phase: validate()
**Note**: Listening always succeeds - validation builds event data only.

1. **Check for Target Object**
   - Determines if listening to specific object or environment
   - Target from command.directObject.entity

2. **Target-Specific Listening**
   - If target specified:
     - Sets target ID in event data
     - Checks for sound sources:

   **Switchable Devices**:
   - Checks SWITCHABLE trait
   - If device is on:
     - Sets `hasSound` = true
     - Sets `soundType` = "device"
     - Message: `device_running`
   - If device is off:
     - Message: `device_off`

   **Containers**:
   - Checks CONTAINER trait
   - Gets container contents
   - If has contents:
     - Sets `hasContents` = true
     - Sets `contentCount`
     - Checks for liquids (EDIBLE with isDrink)
     - Message: `liquid_sounds` if liquid, else `container_sounds`
   - If empty:
     - Message: `no_sound`

   **Other Objects**:
   - Default message: `no_sound` or `listened_to`

3. **Environmental Listening**
   - If no target:
     - Sets `listeningToEnvironment` = true
     - Gets current location contents
     - Filters for active sound sources:
       - Items with SWITCHABLE trait and isOn = true
     - If sound sources found:
       - Stores source IDs
       - Creates device list
       - Message: `active_devices`
     - If no sources:
       - Message: `silence`
     - Sets room ID in event data

### Return Value
- Always returns `{ valid: true }` (listening cannot fail)

## Execution Logic

### Phase: execute()
**Note**: This action duplicates ALL logic from validate() phase.

1. **Re-validate**
   - Calls validate() to check result
   - Should never fail for listening

2. **Rebuild All Data** (Complete Duplication)
   - Gets actor and target again
   - Repeats all target checks:
     - SWITCHABLE trait check
     - CONTAINER trait check
     - Content analysis
     - Liquid detection
   - Repeats environmental checks:
     - Location contents
     - Sound source filtering
     - Device listing
   - Rebuilds event data structure
   - Reselects message ID

3. **Generate Events**
   - Creates `if.event.listened` domain event
   - Creates `action.success` with selected message

## Reporting Logic
**Note**: No separate report() method - all logic in execute().

## Data Structures

### ListenedEventData
```typescript
{
  target?: EntityId,              // Specific object listened to
  listeningToEnvironment?: boolean, // Listening to general area
  roomId?: EntityId,              // Current room ID
  hasSound?: boolean,             // Target produces sound
  soundType?: string,             // Type of sound detected
  soundSources?: EntityId[],      // Active sound sources in room
  hasContents?: boolean,          // Container has items
  contentCount?: number           // Number of container items
}
```

### ListeningErrorData
```typescript
{
  reason: 'not_visible',  // Only defined error (unused)
  target?: string         // Target name
}
```

### ListeningState (Internal)
```typescript
{
  messageId: string,              // Selected message
  params: Record<string, any>,    // Message parameters
  eventData: ListenedEventData    // Event data
}
```

## Traits Used

### Primary Traits
- **SWITCHABLE** - Devices that can be turned on/off
  - `isOn` - Boolean flag for device state

- **CONTAINER** - Objects that hold other objects
  - Used to check for contents

- **EDIBLE** - Food/drink items
  - `isDrink` - Identifies liquids for sound variation

## Message Selection Logic

### Target-Specific Messages
1. **Switchable Devices**
   - Device on: `device_running`
   - Device off: `device_off`

2. **Containers**
   - With liquid contents: `liquid_sounds`
   - With solid contents: `container_sounds`
   - Empty: `no_sound`

3. **Other Objects**
   - Default: `no_sound` or `listened_to`

### Environmental Messages
1. **Active Devices Present**
   - `active_devices` with device list

2. **No Sound Sources**
   - `silence`

Message parameters include:
- `target` - Name of listened object
- `devices` - Comma-separated list of active devices

## Metadata

```typescript
{
  requiresDirectObject: false,
  requiresIndirectObject: false,
  directObjectScope: ScopeLevel.AUDIBLE
}
```

- **Group**: `sensory`
- **Direct Object**: Optional, must be AUDIBLE if specified
- **Indirect Object**: Not supported

## Event Flow

1. **Validation Phase**
   - Builds complete event data
   - Always returns valid
   - Results not preserved

2. **Execution Phase**
   - Rebuilds all data from scratch
   - Duplicates all logic
   - Generates two events

## Special Behaviors

### Always Succeeds
- No failure conditions
- Always provides some response
- Graceful handling of silence

### Sound Type Detection
- Identifies different sound categories
- Device sounds vs container sounds
- Liquid-specific sounds

### Environmental Scanning
- Automatic detection of sound sources
- Filters for active devices
- Lists all audible items

### Scope-Based Filtering
- Uses AUDIBLE scope level
- Framework handles visibility/audibility
- No manual scope checking needed

## Integration Points

### World Model Integration
- Queries container contents
- Scans location contents
- No state modifications

### Scope System
- Leverages AUDIBLE scope level
- Framework pre-filters objects
- Ensures only audible items considered

### Event System
- Domain event for listening action
- Success message with context
- No error events possible

## Error Handling

### No Failure Cases
- Action always succeeds
- No error conditions defined
- Always returns valid

### Safe Property Access
- Graceful handling of missing traits
- Default values for undefined properties
- Type casting for trait data

## Design Patterns

### Current Implementation Notes
1. **Complete Duplication**
   - Entire logic duplicated between validate and execute
   - Identical calculations performed twice
   - Significant code redundancy

2. **Sound Categorization**
   - Different sound types identified
   - Context-specific messages
   - Rich sensory feedback

3. **Environmental Awareness**
   - Scans surroundings automatically
   - Detects active sound sources
   - Provides ambient context

4. **Graceful Defaults**
   - Always provides response
   - Silence is valid result
   - No error states

## Limitations and Assumptions

1. **Performance Impact**
   - All logic executed twice
   - Unnecessary content scanning
   - Could impact performance in large rooms

2. **Limited Sound Types**
   - Only devices and containers
   - No NPC sounds
   - No environmental effects

3. **Simple Detection**
   - Binary on/off for devices
   - No volume levels
   - No distance effects

4. **No Sound Propagation**
   - Only current room sounds
   - No adjacent room sounds
   - No muffled sounds through barriers

5. **Static Sound Description**
   - Fixed messages per type
   - No dynamic sound generation
   - No randomization

## Recommended Improvements

1. **Eliminate Duplication**
   - Execute logic once
   - Pass state between phases
   - Reduce computation

2. **Expand Sound Types**
   - NPC conversation sounds
   - Environmental sounds (wind, water)
   - Action-generated sounds

3. **Sound Propagation**
   - Adjacent room sounds (muffled)
   - Direction indication
   - Volume/distance effects

4. **Dynamic Descriptions**
   - Randomized sound descriptions
   - Intensity variations
   - Time-based changes

5. **Sound Memory**
   - Track recently heard sounds
   - Note changes in soundscape
   - Historical comparison