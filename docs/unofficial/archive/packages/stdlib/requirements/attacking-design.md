# Attacking Action Design

## Overview
The Attacking action handles hostile or destructive actions against NPCs and objects. It demonstrates complex trait-based behavior variations, material-specific responses, and multi-hit mechanics while deliberately keeping combat simple for extensibility.

## Action Metadata
- **ID**: `IFActions.ATTACKING`
- **Group**: `interaction`
- **Direct Object**: Required (ScopeLevel.REACHABLE)
- **Indirect Object**: Optional (weapon)

## Core Concepts

### Dual Purpose Design
- **Combat Actions**: Against actors (NPCs)
- **Destruction Actions**: Against objects
- **Scenery Protection**: Prevents environmental damage
- **Extensibility Focus**: Simple base for complex combat systems

### Verb Variations
Different verbs trigger different messages:
- `attack` - Generic hostile action
- `hit` - Striking action
- `strike` - Formal striking
- `punch` - Unarmed specific
- `kick` - Unarmed specific
- `break` - Destruction focused
- `smash` - Forceful destruction
- `destroy` - Complete destruction

## Core Components

### 1. Main Action File (`attacking.ts`)

#### Required Messages
**General:**
- `no_target` - No target specified
- `not_visible` - Can't see target
- `not_reachable` - Can't reach target
- `self` - Attempting self-harm
- `not_holding_weapon` - Weapon not in inventory

**Combat:**
- `attacked` - Basic attack
- `attacked_with` - Attack with weapon
- `hit`, `hit_with` - Hit variations
- `struck`, `struck_with` - Strike variations
- `punched`, `kicked` - Unarmed specifics
- `unarmed_attack` - Generic unarmed

**Destruction:**
- `indestructible` - Can't be broken
- `broke`, `smashed`, `destroyed` - Success variations
- `shattered` - Glass/crystal specific
- `needs_tool` - Requires specific tool
- `not_strong_enough` - Insufficient strength
- `already_damaged` - Already partially broken
- `partial_break` - Damaged but not destroyed

**NPC Reactions:**
- `defends` - Defensive response
- `dodges` - Evasion response
- `retaliates` - Counter-attack
- `flees` - Escape response

**Game Tone:**
- `peaceful_solution` - Non-violent alternative
- `no_fighting` - Combat disabled
- `unnecessary_violence` - Discouragement

### 2. Event Types (`attacking-events.ts`)

#### AttackedEventData
Comprehensive attack information:
```typescript
{
  // Core data
  target: EntityId,
  targetName: string,
  weapon?: EntityId,
  weaponName?: string,
  unarmed: boolean,
  
  // Target classification
  targetType?: 'actor' | 'object' | 'scenery',
  hostile?: boolean,
  
  // Fragile trait data
  fragile?: boolean,
  willBreak?: boolean,
  fragileMaterial?: string,
  breakThreshold?: number,
  
  // Breakable trait data
  breakable?: boolean,
  hitsToBreak?: number,
  partialBreak?: boolean,
  hitsRemaining?: number,
  
  // Breaking effects
  breakSound?: string,
  fragments?: string[],
  sharpFragments?: boolean,
  revealsContents?: boolean,
  triggersEvent?: string
}
```

#### ItemDestroyedEventData
Destruction outcome:
```typescript
{
  item: EntityId,
  itemName: string,
  cause: string,
  fragments?: string[],
  sharpFragments?: boolean,
  triggersEvent?: string
}
```

### 3. Trait Integration

#### Fragile Trait
Objects that break immediately:
```typescript
interface FragileTrait {
  breakThreshold?: number,        // 0-10 force scale
  fragileMaterial?: string,        // glass, crystal, etc.
  damaged?: boolean,               // Already cracked
  breakSound?: string,             // Sound effect
  breaksInto?: string[],          // Fragment entities
  sharpFragments?: boolean,        // Dangerous debris
  triggersOnBreak?: string,        // Triggered event
  breakMessage?: string            // Custom message
}
```

#### Breakable Trait
Objects requiring effort to break:
```typescript
interface BreakableTrait {
  breakMethod?: string,            // force, cutting, heat
  requiresTool?: string,           // Specific tool ID
  strengthRequired?: number,       // Min strength
  hitsToBreak?: number,           // Multiple hits
  hitsTaken?: number,             // Current damage
  revealsContents?: boolean,      // Hidden items
  effects?: {
    onBreak?: string,             // Break event
    onPartialBreak?: string       // Damage event
  }
}
```

## Validation Phase

### Validation Sequence

#### 1. Basic Checks
```typescript
// Target existence
if (!target) return 'no_target';

// Visibility
if (!context.canSee(target)) return 'not_visible';

// Reachability
if (!context.canReach(target)) return 'not_reachable';

// Self-harm prevention
if (target.id === actor.id) return 'self';
```

#### 2. Weapon Validation
```typescript
if (weapon) {
  const weaponLocation = context.world.getLocation(weapon.id);
  if (weaponLocation !== actor.id) {
    return 'not_holding_weapon';
  }
}
```

#### 3. Target Type Analysis
```typescript
if (target.has(TraitType.ACTOR)) {
  targetType = 'actor';
  // Check for peaceful game mode
  if (context.world.isPeaceful) {
    return 'peaceful_solution';
  }
} else if (target.has(TraitType.SCENERY)) {
  targetType = 'scenery';
  return 'indestructible'; // Most scenery protected
} else {
  targetType = 'object';
  // Check fragile/breakable traits
}
```

#### 4. Fragile Object Logic
```typescript
if (target.has(TraitType.FRAGILE)) {
  const trait = target.get(TraitType.FRAGILE);
  willBreak = true;
  
  // Material-specific messages
  if (trait.fragileMaterial === 'glass' || 
      trait.fragileMaterial === 'crystal') {
    messageId = 'shattered';
  } else {
    messageId = 'broke';
  }
  
  // Check if already damaged
  if (trait.damaged) {
    params.damaged = true;
  }
}
```

#### 5. Breakable Object Logic
```typescript
if (target.has(TraitType.BREAKABLE)) {
  const trait = target.get(TraitType.BREAKABLE);
  
  // Tool requirement
  if (trait.requiresTool && weapon?.id !== trait.requiresTool) {
    return 'needs_tool';
  }
  
  // Strength requirement
  const effectiveStrength = weapon ? 5 : 3;
  if (effectiveStrength < trait.strengthRequired) {
    return 'not_strong_enough';
  }
  
  // Multi-hit mechanics
  trait.hitsTaken = (trait.hitsTaken || 0) + 1;
  if (trait.hitsTaken < trait.hitsToBreak) {
    // Partial damage
    eventData.partialBreak = true;
    eventData.hitsRemaining = trait.hitsToBreak - trait.hitsTaken;
  } else {
    // Breaks!
    willBreak = true;
  }
}
```

## Execution Phase

### State Reconstruction
Since validation is separate, execution rebuilds state:
```typescript
// Re-validate to ensure consistency
const result = this.validate(context);
if (!result.valid) {
  return [context.event('action.error', ...)];
}

// Rebuild all state from context
const target = context.command.directObject!.entity!;
const weapon = context.command.indirectObject?.entity;
```

### Event Generation

#### 1. Attack Event
```typescript
events.push(context.event('if.event.attacked', {
  target: target.id,
  targetName: target.name,
  targetType: targetType,
  weapon: weapon?.id,
  weaponName: weapon?.name,
  unarmed: !weapon,
  // ... trait-specific data
}));
```

#### 2. Success Message
```typescript
events.push(context.event('action.success', {
  actionId: this.id,
  messageId: messageId, // Verb and context specific
  params: params
}));
```

#### 3. NPC Reactions (for actors)
```typescript
if (targetType === 'actor') {
  const reactions = ['defends', 'dodges', 'retaliates', 'flees'];
  const reaction = reactions[Math.floor(Math.random() * reactions.length)];
  events.push(context.event('action.success', {
    messageId: reaction,
    params: params
  }));
}
```

#### 4. Destruction Event (if breaking)
```typescript
if (willBreak) {
  events.push(context.event('if.event.item_destroyed', {
    item: target.id,
    itemName: target.name,
    cause: 'attacked',
    fragments: eventData.fragments,
    sharpFragments: eventData.sharpFragments,
    triggersEvent: eventData.triggersEvent
  }));
}
```

## Design Patterns

### Trait-Based Behavior
Different behaviors based on target traits:
- **ACTOR**: Combat reactions
- **SCENERY**: Protected from damage
- **FRAGILE**: Immediate breaking
- **BREAKABLE**: Multi-hit destruction

### Material-Specific Responses
```typescript
// Glass/crystal shatter
if (material === 'glass' || material === 'crystal') {
  messageId = 'shattered';
  sharpFragments = true;
}

// Paper tears
if (material === 'paper') {
  messageId = 'torn';
}
```

### Progressive Damage
Multi-hit breaking system:
```typescript
hitsTaken++;
if (hitsTaken < hitsToBreak) {
  // Partial damage feedback
  return 'partial_break';
} else {
  // Complete destruction
  return 'destroyed';
}
```

### Verb-Message Mapping
Different verbs produce different messages:
```typescript
switch (verb) {
  case 'punch': messageId = 'punched'; break;
  case 'kick': messageId = 'kicked'; break;
  case 'smash': messageId = 'smashed'; break;
  case 'break': messageId = 'broke'; break;
  default: messageId = 'attacked';
}
```

## Special Mechanics

### Tool Requirements
Some objects need specific tools:
```typescript
if (breakableTrait.requiresTool) {
  if (!weapon || weapon.id !== breakableTrait.requiresTool) {
    return 'needs_tool'; // "You need a hammer to break this."
  }
}
```

### Strength System
Simple strength calculation:
```typescript
const baseStrength = 3;
const weaponBonus = weapon ? 2 : 0;
const effectiveStrength = baseStrength + weaponBonus;

if (effectiveStrength < required) {
  return 'not_strong_enough';
}
```

### Fragment Generation
Breaking creates new objects:
```typescript
if (fragileTrait.breaksInto) {
  // Create fragment entities
  for (const fragmentId of fragileTrait.breaksInto) {
    // Generate fragments in world
  }
}
```

### Triggered Events
Breaking can trigger story events:
```typescript
if (fragileTrait.triggersOnBreak) {
  // Emit custom event
  events.push(context.event(fragileTrait.triggersOnBreak, {...}));
}
```

## Game Tone Considerations

### Peaceful Games
Option to discourage violence:
```typescript
if (context.world.isPeaceful) {
  return 'peaceful_solution'; // "Violence isn't the answer."
}
```

### Violence Alternatives
Stories can provide:
- Non-violent solutions
- Diplomatic options
- Puzzle alternatives
- Conversation paths

## Extension Points

### Combat System Extensions
Base action supports:
- Damage calculations
- Health tracking
- Weapon properties
- Armor effects
- Combat skills
- Turn-based combat

### Material System
Extensible material properties:
- Hardness scales
- Damage types
- Tool effectiveness
- Environmental factors

### NPC Behavior
Customizable reactions:
- Personality-based responses
- Relationship effects
- Memory of attacks
- Group dynamics

## Performance Considerations

### Trait Checking
- Check most likely traits first
- Cache trait lookups
- Minimize repeated gets

### Event Generation
- Batch related events
- Avoid duplicate data
- Use references where possible

## Testing Considerations

### Test Scenarios

#### Basic Attacks
- Unarmed vs actors
- Armed vs actors
- Different verb variations
- Self-attack prevention

#### Object Destruction
- Fragile items (immediate break)
- Breakable items (multi-hit)
- Tool requirements
- Strength requirements
- Indestructible objects

#### Edge Cases
- Missing weapons
- Unreachable targets
- Peaceful mode
- Already damaged items
- Partial breaks

### Verification Points
- Correct message selection
- Event sequence
- Fragment generation
- Tool validation
- Damage accumulation

## Future Enhancements

### Potential Features

#### 1. Advanced Combat
- Hit points/health
- Damage types (slash, pierce, blunt)
- Critical hits
- Combat rounds
- Initiative system

#### 2. Material Physics
- Realistic breakage
- Material interactions
- Environmental effects
- Chain reactions

#### 3. Weapon Properties
- Damage ratings
- Durability
- Special effects
- Skill requirements

#### 4. NPC AI
- Combat strategies
- Morale system
- Group tactics
- Learning opponents

## Design Philosophy

### Simplicity with Depth
- Simple base mechanics
- Complex emergent behavior
- Easy to understand
- Hard to master

### Story-First Design
- Combat serves narrative
- Violence has consequences
- Alternatives encouraged
- Tone flexibility

### Extensibility Focus
- Minimal core implementation
- Clear extension points
- Trait-based customization
- Event-driven outcomes
