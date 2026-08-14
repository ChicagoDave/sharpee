# Drinking Action Design

## Overview
The Drinking action handles consumption of liquid items. It demonstrates multi-trait validation, implicit taking mechanics, portion management, and rich message variation based on drink properties and consumption verbs.

## Action Metadata
- **ID**: `IFActions.DRINKING`
- **Group**: `interaction`
- **Direct Object**: Required (ScopeLevel.REACHABLE)
- **Indirect Object**: Not required

## Core Concepts

### Drinkable Detection
Items are drinkable if they have:
1. **EDIBLE trait** with `isDrink: true`
2. **CONTAINER trait** with `containsLiquid: true`

### Implicit Taking
If drink is not held, automatically takes it first:
- Generates implicit taken event
- Maintains natural gameplay flow
- Avoids tedious "take then drink"

### Rich Message System
Messages vary based on:
- Verb used (sip, quaff, gulp)
- Taste properties
- Effects
- Portions remaining
- Container type

## Core Components

### 1. Main Action File (`drinking.ts`)

#### Required Messages
**Basic:**
- `no_item` - No item specified
- `not_visible` - Can't see item
- `not_reachable` - Can't reach item
- `not_drinkable` - Item cannot be drunk
- `already_consumed` - Already drunk/empty
- `container_closed` - Container needs opening

**Success Variations:**
- `drunk` - Basic success
- `drunk_all` - Finished entire drink
- `drunk_some` - Partial consumption
- `drunk_from` - From container
- `from_container` - Container with liquid type

**Taste/Quality:**
- `refreshing` - Refreshing drink
- `satisfying` - Satisfying drink
- `bitter` - Bitter taste
- `sweet` - Sweet taste
- `strong` - Alcoholic/strong

**Effects:**
- `thirst_quenched` - Satisfies thirst
- `still_thirsty` - Doesn't satisfy
- `magical_effects` - Magic drink
- `healing` - Healing potion

**Container States:**
- `empty_now` - Container emptied
- `some_remains` - Liquid remains

**Verb Variations:**
- `sipped` - Small amount
- `quaffed` - Large amount
- `gulped` - Swallowed quickly

### 2. Event Types (`drinking-events.ts`)

#### DrunkEventData
```typescript
{
  item: EntityId,
  itemName: string,
  
  // Consumption details
  nutrition?: number,
  portions?: number,
  portionsRemaining?: number,
  
  // Effects
  effects?: string[],
  satisfiesThirst?: boolean,
  
  // Container details
  fromContainer?: boolean,
  liquidType?: string,
  liquidAmount?: number,
  liquidRemaining?: number
}
```

#### ImplicitTakenEventData
```typescript
{
  implicit: boolean,    // Always true here
  item: EntityId,
  itemName: string
}
```

## Validation Phase

### Validation Sequence

#### 1. Item Existence
```typescript
if (!item) {
  return { valid: false, error: 'no_item' };
}
```

#### 2. Drinkability Check
```typescript
let isDrinkable = false;

// Check EDIBLE trait
if (item.has(TraitType.EDIBLE)) {
  const edibleTrait = item.get(TraitType.EDIBLE);
  isDrinkable = edibleTrait.isDrink === true;
}

// Check CONTAINER trait
if (!isDrinkable && item.has(TraitType.CONTAINER)) {
  const containerTrait = item.get(TraitType.CONTAINER);
  if (containerTrait.containsLiquid) {
    isDrinkable = true;
  }
}
```

#### 3. Consumption State
```typescript
if (item.has(TraitType.EDIBLE)) {
  if (edibleTrait.consumed) {
    return { valid: false, error: 'already_consumed' };
  }
}
```

#### 4. Container Access
```typescript
if (item.has(TraitType.CONTAINER) && item.has(TraitType.OPENABLE)) {
  if (!OpenableBehavior.isOpen(item)) {
    return { valid: false, error: 'container_closed' };
  }
}
```

## Execution Phase

### Implicit Taking Logic
```typescript
const itemLocation = context.world.getLocation(item.id);
const isHeld = itemLocation === actor.id;

if (!isHeld) {
  events.push(context.event('if.event.taken', {
    implicit: true,
    item: item.id,
    itemName: item.name
  }));
}
```

### Message Selection Algorithm

#### Priority Order
1. **Effects-based** (magical, healing)
2. **Container state** (empty_now, some_remains)
3. **Taste properties** (refreshing, bitter, sweet)
4. **Portions** (drunk_all, drunk_some)
5. **Verb-specific** (sipped, quaffed, gulped)
6. **Default** (drunk)

#### Message Determination
```typescript
// Start with default
let messageId = 'drunk';

// Override based on properties (in priority order)
if (effects.includes('magic')) messageId = 'magical_effects';
else if (effects.includes('healing')) messageId = 'healing';
else if (liquidRemaining === 0) messageId = 'empty_now';
else if (taste === 'refreshing') messageId = 'refreshing';
else if (portionsRemaining > 0) messageId = 'drunk_some';
else if (verb === 'sip') messageId = 'sipped';
// etc...
```

### Event Generation
```typescript
// 1. Implicit take (if needed)
if (!isHeld) {
  events.push(context.event('if.event.taken', ...));
}

// 2. Drunk event with all data
events.push(context.event('if.event.drunk', eventData));

// 3. Success message with selected ID
events.push(context.event('action.success', {
  messageId: messageId,
  params: params
}));
```

## Trait Integrations

### Primary Traits

#### EDIBLE Trait Extensions
Standard trait plus drinking extensions:
```typescript
{
  // Standard EDIBLE
  nutrition?: number,
  servings?: number,
  
  // Drinking extensions
  isDrink?: boolean,        // Is this drinkable
  taste?: string,           // Taste descriptor
  satisfiesThirst?: boolean, // Thirst satisfaction
  effects?: string[],       // Special effects
  portions?: number,        // Multi-use drinks
  consumed?: boolean        // Already consumed
}
```

#### CONTAINER Trait Extensions
For drinkable containers:
```typescript
{
  // Container with liquid
  containsLiquid?: boolean,
  liquidType?: string,      // "water", "wine", etc.
  liquidAmount?: number,    // Remaining drinks
}
```

### Secondary Traits
- **OPENABLE**: Container must be open to drink
- **PORTABLE**: Affects implicit taking

## Design Patterns

### Multi-Trait Validation
Check multiple traits for capability:
```typescript
isDrinkable = hasEdibleWithDrink || hasContainerWithLiquid
```

### Implicit Action Pattern
Automatically perform prerequisite actions:
```
Not Held → Take → Drink
Held → Drink
```

### Verb-Message Mapping
Different verbs create different experiences:
```typescript
"sip" → gentle consumption
"quaff" → hearty drinking
"gulp" → quick swallow
```

### Property-Based Messaging
Message selection based on item properties:
```typescript
taste → specific taste message
effects → effect message
portions → amount message
```

## Special Mechanics

### Portion Management
Multi-use drinks:
```typescript
portions: 3,              // Start with 3 drinks
portionsRemaining: 2,     // After one drink
// Message: "You drink some of the potion."
```

### Container Liquids
Drinking from containers:
```typescript
containsLiquid: true,
liquidType: "wine",
liquidAmount: 5,
// Message: "You drink wine from the bottle."
```

### Effect System
Special effects from drinking:
```typescript
effects: ['healing', 'restore_mana'],
// Triggers additional events
// Message: "The potion heals your wounds."
```

### Thirst Mechanics
Optional thirst satisfaction:
```typescript
satisfiesThirst: true,    // Water, juice
satisfiesThirst: false,   // Alcohol, potions
// Messages vary accordingly
```

## Error Handling

### Contextual Errors
```typescript
'not_drinkable' - "You can't drink the book."
'already_consumed' - "The bottle is empty."
'container_closed' - "You need to open it first."
```

### Validation vs Execution
- Validation in both phases
- Execution re-validates for safety
- Consistent error messages

## Performance Considerations

### Optimization Strategies
1. **Early trait checks** - Skip non-drinkable quickly
2. **Cached trait access** - Store trait references
3. **Single pass message selection** - Priority-ordered checks
4. **Minimal world queries** - Reuse location checks

### Memory Management
- No entity snapshots (lightweight action)
- Simple event data structures
- No state storage between phases

## Testing Considerations

### Test Scenarios

#### Basic Drinking
- Simple drinkable items
- Non-drinkable items
- Already consumed items
- Successful drinking

#### Container Drinking
- Open containers
- Closed containers
- Empty containers
- Liquid types

#### Implicit Taking
- Item not held
- Item already held
- Item in container
- Item on supporter

#### Message Variations
- Different verbs
- Different tastes
- Different effects
- Portion management

### Verification Points
- Correct drinkability detection
- Implicit take generation
- Message selection logic
- Event data completeness

## Extension Points

### Custom Properties
Stories can add:
```typescript
{
  temperature: 'hot' | 'cold',
  carbonated: boolean,
  viscosity: 'thin' | 'thick',
  color: string
}
```

### Advanced Effects
```typescript
{
  effects: {
    immediate: ['quench_thirst'],
    delayed: ['intoxication'],
    permanent: ['increase_health']
  }
}
```

### Drinking Vessels
Container-specific behavior:
```typescript
{
  vesselType: 'cup' | 'bottle' | 'flask',
  spillable: boolean,
  requiresTwoHands: boolean
}
```

## Comparison with Eating

### Similarities
- Both consume items
- Both use EDIBLE trait
- Both support portions
- Both have effects

### Differences
| Aspect | Drinking | Eating |
|--------|----------|--------|
| Trait Flag | `isDrink: true` | `isDrink: false` |
| Containers | Can drink from | Cannot eat from |
| Verbs | sip, quaff, gulp | eat, nibble, devour |
| Thirst | Can satisfy | Usually doesn't |
| Messages | Liquid-specific | Food-specific |

## Future Enhancements

### Potential Features

#### 1. Mixing Drinks
```typescript
interface DrinkMixing {
  ingredients: EntityId[],
  result: string,
  requiresVessel: boolean
}
```

#### 2. Temperature Effects
```typescript
interface DrinkTemperature {
  current: 'frozen' | 'cold' | 'cool' | 'warm' | 'hot' | 'boiling',
  optimal: 'cold' | 'hot',
  effects: TemperatureEffect[]
}
```

#### 3. Spillage Mechanics
```typescript
interface Spillage {
  chance: number,
  conditions: string[],
  creates: 'puddle' | 'stain'
}
```

#### 4. Drinking Speed
```typescript
interface DrinkingSpeed {
  rate: 'sip' | 'normal' | 'gulp' | 'chug',
  duration: number,
  chokeRisk: boolean
}
```

## Design Philosophy

### Natural Interaction
- Implicit taking reduces friction
- Verb variety adds expression
- Rich messages enhance immersion

### Flexible System
- Multiple trait paths to drinkability
- Extensible property system
- Story-specific customization

### Player Experience
- Clear error messages
- Contextual feedback
- Satisfying interactions
- Minimal frustration
