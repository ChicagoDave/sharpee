# Touching Action Design

## Overview
The touching action handles tactile exploration of objects, detecting temperature, texture, and special properties. It shows complete logic duplication between validate and execute phases with extensive trait-based property detection.

## Required Messages
- `no_target` - No object specified
- `not_visible` - Object not visible
- `not_reachable` - Object not reachable
- `feels_normal` - Normal feeling
- `feels_warm` - Warm to touch
- `feels_hot` - Hot to touch
- `feels_cold` - Cold to touch
- `feels_soft` - Soft texture
- `feels_hard` - Hard texture
- `feels_smooth` - Smooth texture
- `feels_rough` - Rough texture
- `feels_wet` - Wet/liquid
- `device_vibrating` - Vibrating device
- `immovable_object` - Fixed scenery
- `liquid_container` - Contains liquid
- `touched` - Generic touch
- `touched_gently` - Gentle feel
- `poked` - Poked object
- `prodded` - Prodded object
- `patted` - Patted object
- `stroked` - Stroked object

## Validation Logic

### 1. Basic Validation
- Target must exist (`no_target`)
- Scope handled by CommandValidator

### 2. Temperature Detection
Priority order:
- **Lit light source** → hot
- **Active switchable** → warm
- Checks vibration in description → special case

### 3. Texture Detection
Based on traits:
- **WEARABLE** → soft
- **DOOR** → smooth + hard
- **CONTAINER/SUPPORTER** → solid
- **EDIBLE (drink)** → liquid
- **SCENERY** → immovable

### 4. Special Cases
- **Vibrating devices**: Description contains "vibrat"
- **Liquid containers**: Contains drinkable items
- **Immovable scenery**: Fixed objects

### 5. Verb-Based Messages
For normal touches, uses verb:
- poke → `poked`
- prod → `prodded`
- pat → `patted`
- stroke → `stroked`
- feel → `touched_gently`
- default → `touched`

## Execution Flow

### CRITICAL ISSUE: Complete Logic Duplication
**Entire validation logic repeated in execute:**
- All temperature checks (lines 233-257)
- All texture checks (lines 260-301)
- Scenery check (lines 304-309)
- Verb determination (lines 312-334)

Minor differences:
- Some condition checks slightly different
- Uses `messageId === 'feels_normal'` guards

## Data Structures

### TouchedEventData
```typescript
interface TouchedEventData {
  target: EntityId;
  targetName: string;
  temperature?: 'hot' | 'warm' | 'cold';
  texture?: 'soft' | 'hard' | 'smooth' | 'rough' | 'liquid' | 'solid';
  material?: string;
  isLit?: boolean;
  isActive?: boolean;
  immovable?: boolean;
}
```

## Trait-Based Detection

### Temperature Sources
1. **LIGHT_SOURCE + isLit** → hot
2. **SWITCHABLE + isOn** → warm
3. Default → room temperature

### Texture Mapping
- Clothing/fabric → soft
- Doors/walls → smooth, hard
- Containers → solid
- Liquids → wet
- Scenery → immovable

## Current Implementation Issues

### Critical Problems
1. **Complete duplication**: ~140 lines repeated
2. **No state preservation**: Everything recalculated
3. **String searching**: Fragile "vibrat" detection
4. **No three-phase pattern**: Missing report phase

### Design Issues
1. **No tactile trait**: Uses proxy traits
2. **Limited properties**: Only basic textures
3. **No custom feels**: Can't define unique sensations
4. **Hardcoded logic**: All detection inline

## Recommended Improvements

### Immediate Fixes
1. **Implement three-phase pattern**
2. **Store validation results**
3. **Create TACTILE trait**
4. **Extract detection logic**

### Feature Enhancements
1. **Custom textures**: Define per object
2. **Temperature range**: More than 3 levels
3. **Reaction system**: Objects respond to touch
4. **Danger detection**: Warning for hazards
5. **Discovery system**: Find hidden features

## Usage Examples

### Hot Object
```
> touch lit torch
The torch feels hot to the touch.
```

### Soft Texture
```
> feel cloak
The cloak feels soft.
```

### Vibrating Device
```
> touch activated device
The device is vibrating.
```

### Verb Specific
```
> poke goblin
You poke the goblin.

> stroke cat
You stroke the cat.
```

### Liquid Detection
```
> touch glass with water
You can feel liquid inside.
```