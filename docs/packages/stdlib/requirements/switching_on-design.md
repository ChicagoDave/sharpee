# Switching On Action Design

## Overview
The switching on action turns on devices and lights, properly delegating to `SwitchableBehavior` for state changes. This action follows good patterns with minimal duplication and proper behavior delegation.

## Required Messages
- `no_target` - No object specified
- `not_visible` - Object not visible
- `not_reachable` - Object not reachable
- `not_switchable` - Object cannot be switched
- `already_on` - Already switched on
- `no_power` - No power available
- `switched_on` - Basic success
- `light_on` - Light turned on
- `device_humming` - Device starts humming
- `temporary_activation` - Temporary activation
- `with_sound` - Switched with sound
- `door_opens` - Door opens when activated
- `illuminates_darkness` - Light illuminates dark room

## Validation Logic

### Simple and Clean
1. **Target check**: Must exist (`no_target`)
2. **Switchable check**: Must have SWITCHABLE trait (`not_switchable`)
3. **Can switch check**: Uses `SwitchableBehavior.canSwitchOn()`
   - Already on → `already_on`
   - No power → `no_power`

## Execution Flow

### 1. Delegate to Behavior
- Calls `SwitchableBehavior.switchOn(noun)`
- Returns result with success status

### 2. Handle Failure (Defensive)
Checks result for failures:
- `wasOn` → `already_on` error
- `noPower` → `no_power` error
- Default → `not_switchable` error

### 3. Build Event Data
Complex logic for device-specific data:
- Light sources: radius, intensity, illumination
- Power consumption tracking
- Sound effects
- Auto-off timers

### 4. Message Selection
Sophisticated message selection based on:
- **Light source in dark room** → `illuminates_darkness`
- **Light source with other lights** → `light_on`
- **Non-light device** → `device_humming`
- **Temporary activation** → `temporary_activation`
- **With sound** → `with_sound`
- **Opens container** → `door_opens`
- **Default** → `switched_on`

## Data Structures

### SwitchedOnEventData
```typescript
interface SwitchedOnEventData {
  target: EntityId;
  targetName: string;
  isLightSource?: boolean;
  lightRadius?: number;
  lightIntensity?: string;
  willIlluminateLocation?: boolean;
  autoOffTime?: number;
  temporary?: boolean;
  powerConsumption?: number;
  continuousSound?: string;
  sound?: string;
  willOpen?: boolean;
}
```

### Switch Result (from behavior)
```typescript
interface ISwitchResult {
  success: boolean;
  wasOn?: boolean;
  noPower?: boolean;
  autoOffTime?: number;
  powerConsumption?: number;
  onSound?: string;
  runningSound?: string;
}
```

## Traits and Behaviors

### Required Traits
- `SWITCHABLE` - Must have for switching

### Optional Traits
- `LIGHT_SOURCE` - Affects messaging and events
- `CONTAINER` + `OPENABLE` - Side effects

### Behaviors Used
- `SwitchableBehavior`:
  - `canSwitchOn()` - Validation
  - `switchOn()` - State change

## Message Selection Logic

Complex priority system:
1. Check if illuminating darkness (highest priority)
2. Check for door opening side effect
3. Check for temporary activation
4. Check for sound effects
5. Check device type (light vs other)
6. Default to basic message

## Integration Points
- **World model**: Room and content queries
- **Behavior delegation**: Proper use of SwitchableBehavior
- **Light system**: Darkness detection
- **Sound system**: Sound effect support
- **Power system**: Consumption tracking

## Current Implementation Notes

### Strengths
1. **Proper delegation**: Uses behavior correctly
2. **No logic duplication**: Clean execution
3. **Rich event data**: Comprehensive information
4. **Smart messaging**: Context-aware messages
5. **Side effect handling**: Considers secondary effects

### Minor Issues
1. **No three-phase pattern**: Could use report phase
2. **Complex message logic**: Could be extracted
3. **Room light detection**: Could use behavior

## Recommended Improvements
1. **Add report phase**: Move event generation
2. **Extract light detection**: Create LightingBehavior
3. **Power system**: Implement actual power consumption
4. **Device categories**: Support device types
5. **Failure reasons**: More specific error messages

## Usage Examples

### Turn On Light
```
> turn on lamp
You switch on the lamp, illuminating the darkness.
```

### Turn On Device
```
> switch on radio
The radio starts humming.
```

### Temporary Activation
```
> turn on timer
You activate the timer temporarily.
```

### Error Cases
```
> turn on rock
The rock cannot be switched on.

> turn on lamp
The lamp is already on.

> turn on unpowered device
There's no power.
```