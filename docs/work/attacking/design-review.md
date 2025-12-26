# Attacking Action Design Review

## Current Implementation Analysis

### Overview
The attacking action (`packages/stdlib/src/actions/standard/attacking/attacking.ts`) handles hostile actions against NPCs or objects. **CRITICAL: It does NOT follow the three-phase pattern** - it still uses the old two-phase validate/execute pattern.

### Current Features
1. **Basic validation**: target visibility, reachability, self-attack prevention
2. **Weapon support**: optional indirect object for armed attacks
3. **Message variation**: different messages based on verb (hit, strike, punch, kick)
4. **Actor reactions**: deterministic reactions for NPCs (defends, dodges, retaliates, flees)
5. **Peaceful mode**: optional world-level flag to prevent violence

### Parser Integration
The parser currently only recognizes:
- `attack :target with :weapon` (priority 110)
- No standalone `attack :target` pattern
- No verb synonyms defined

## Critical Design Issues

### 0. Not Using Three-Phase Pattern
**Problem**: The attacking action still uses the old validate/execute pattern instead of the required three-phase pattern (validate/prepare/execute).

**Current Implementation**:
```typescript
validate(context: ActionContext): ValidationResult
execute(context: ActionContext): ISemanticEvent[]
```

**Required Implementation** (per ADR-051):
```typescript
validate(context: ActionContext): ValidationResult
prepare?(context: ActionContext, state: AttackingState): AttackingState
execute(context: ActionContext): ISemanticEvent[]
report?(context: ActionContext): ISemanticEvent[]
```

**Impact**:
- Violates architectural standards
- No state management between validation and execution
- Weapon inference has nowhere to store selected weapon
- Inconsistent with other refactored actions

### 1. Visibility Requirements Conflict
**Problem**: The parser requires targets to be `.visible()` but players might legitimately want to attack in darkness or while blindfolded.

**Current Implementation**:
- Parser: `.where('target', scope => scope.visible())` - blocks parsing if not visible
- Action: `if (!context.canSee(target))` - validation fails if not visible

**Real-world Scenarios**:
- Fighting in complete darkness (swinging blindly)
- Attacking while blinded/blindfolded
- Striking at sounds or remembered positions
- Combat in smoke/fog

**Design Conflict**:
- Parser shouldn't block commands for invisible targets (player intent is valid)
- Action validation might allow "swing blindly" with penalties
- Some games may want strict visibility, others may allow blind attacks

**Proposed Solution**:
- Parser should use `.touchable()` instead of `.visible()` (note: we don't have `.present()`)
- Available scope methods: `.visible()`, `.touchable()`, `.carried()`, `.nearby()`
- Action decides if visibility is required based on context
- Could emit different events: 'attacked' vs 'attacked_blindly'

### 2. Missing 'kill' Synonym
**Problem**: The parser doesn't recognize "kill" as a synonym for attack, which is a standard IF convention.

**Impact**: 
- Players typing "kill troll" get an unrecognized command error
- Breaks expected IF conventions from games like Zork, Adventure, etc.

**Design Considerations**:
- "Kill" implies lethal intent vs. "attack" which is more general
- Some games may want to differentiate between attack and kill
- Could emit different semantic properties (e.g., `intent: 'lethal'`)

### 3. Weapon Inference Issues
**Problem**: When a player types "kill troll" while carrying a weapon, the system should infer weapon usage but currently doesn't.

**Current Behavior**:
- "attack troll with sword" - works
- "kill troll" (while carrying sword) - fails (command not recognized)
- No automatic weapon selection

**Design Requirements**:
1. **Single weapon case**: Automatically use carried weapon
2. **Multiple weapons case**: Require disambiguation
3. **No weapon case**: Default to unarmed attack

**Implementation Challenges**:
- Parser needs to recognize patterns without explicit "with :weapon"
- Action needs logic to select appropriate weapon
- Disambiguation needs to present reasonable choices

### 4. Missing Verb Patterns
The parser lacks many common attack verbs:
- Basic: kill, hit, strike, fight
- Unarmed: punch, kick, slap (with intent: 'humiliation')
- Weapon-specific: stab, shoot
- Formal: assault, attack, combat

### 5. Weapon Selection Logic
**Current State**: No automatic weapon selection

**Needed Logic**:
```
if no weapon specified:
  if carrying exactly one weapon:
    use that weapon
  else if carrying multiple weapons:
    if one is "preferred" (wielded/equipped):
      use that one
    else:
      require disambiguation: "Which weapon?"
  else:
    unarmed attack
```

## Proposed Solutions

### Solution 0: Three-Phase Implementation

#### Proposed execute() method:
```typescript
execute(context: ActionContext): void {
  const target = context.command.directObject!.entity!;
  const weapon = context.sharedData.inferredWeapon 
    ? context.world.getEntity(context.sharedData.inferredWeapon)
    : context.command.indirectObject?.entity;
  
  // Store attack details in sharedData for report phase
  const sharedData = context.sharedData as AttackingSharedData;
  sharedData.wasBlindAttack = !context.canSee(target);
  sharedData.targetId = target.id;
  sharedData.weaponId = weapon?.id;
  
  // World mutations would go here if attacking had any
  // (e.g., damaging the target, breaking the weapon, etc.)
  // For now, attacking is purely narrative with no state changes
  
  // Note: In a combat system, this might:
  // - Reduce target health
  // - Check for weapon durability
  // - Update combat state
  // - Trigger defensive items
}
```

#### Proposed report() method:
```typescript
report(context: ActionContext): ISemanticEvent[] {
  const sharedData = context.sharedData as AttackingSharedData;
  const target = context.world.getEntity(sharedData.targetId)!;
  const weapon = sharedData.weaponId 
    ? context.world.getEntity(sharedData.weaponId)
    : undefined;
  
  const events: ISemanticEvent[] = [];
  
  // First emit the world event
  events.push(context.event('if.event.attacked', {
    targetId: sharedData.targetId,
    weaponId: sharedData.weaponId,
    isBlindAttack: sharedData.wasBlindAttack,
    intent: context.command.parsed.semantics?.intent || 'hostile',
    manner: context.command.parsed.semantics?.manner || 'normal'
  }));
  
  // Determine message based on context
  let messageId = 'attacked';
  const isBlind = sharedData.wasBlindAttack;
  
  if (isBlind) {
    messageId = weapon ? 'attacked_blindly_with' : 'attacked_blindly';
  } else if (target.has(TraitType.ACTOR)) {
    const verb = context.command.parsed.action || 'attack';
    const intent = context.command.parsed.semantics?.intent;
    
    if (intent === 'humiliation') {
      messageId = 'slapped';
    } else if (!weapon) {
      switch (verb) {
        case 'punch': messageId = 'punched'; break;
        case 'kick': messageId = 'kicked'; break;
        case 'hit': messageId = 'hit'; break;
        case 'strike': messageId = 'struck'; break;
        default: messageId = 'unarmed_attack';
      }
    } else {
      switch (verb) {
        case 'hit': messageId = 'hit_with'; break;
        case 'strike': messageId = 'struck_with'; break;
        default: messageId = weapon ? 'attacked_with' : 'attacked';
      }
    }
  }
  
  // Success message
  events.push(context.event('action.success', {
    actionId: this.id,
    messageId: messageId,
    params: {
      target: target.name,
      weapon: weapon?.name
    }
  }));
  
  // Target reaction for actors
  if (target.has(TraitType.ACTOR) && !isBlind) {
    const reactions = ['defends', 'dodges', 'retaliates', 'flees'];
    const hashCode = target.id.split('').reduce((a: number, b: string) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    const reactionIndex = Math.abs(hashCode) % reactions.length;
    
    events.push(context.event('action.success', {
      actionId: this.id,
      messageId: reactions[reactionIndex],
      params: { target: target.name }
    }));
  }
  
  return events;
}
```

### Solution 1: Enhanced Parser Patterns
Add comprehensive verb support with semantic properties:

```typescript
// Basic attack pattern (no weapon specified)
grammar
  .define(':verb :target')
  .where('target', scope => scope.visible())
  .mapsTo('if.action.attacking')
  .withSemanticVerbs({
    'attack': { intent: 'hostile' },
    'kill': { intent: 'lethal' },
    'hit': { intent: 'hostile', style: 'blunt' },
    'strike': { intent: 'hostile', style: 'precise' },
    'punch': { intent: 'hostile', style: 'unarmed', bodyPart: 'fist' },
    'kick': { intent: 'hostile', style: 'unarmed', bodyPart: 'foot' },
    'slap': { intent: 'humiliation', style: 'unarmed', bodyPart: 'hand' },
    'stab': { intent: 'lethal', style: 'piercing' },
    'shoot': { intent: 'hostile', style: 'ranged' }
  })
  .withPriority(100)
  .build();
```

### Solution 2: Weapon Inference in Action
Enhance the attacking action validation to handle weapon selection:

```typescript
validate(context: ActionContext): ValidationResult {
  // ... existing validation ...
  
  // If no weapon specified, try to infer one
  if (!context.command.indirectObject) {
    const carriedWeapons = context.getCarriedItems()
      .filter(item => item.has(TraitType.WEAPON));
    
    if (carriedWeapons.length === 1) {
      // Auto-select single weapon
      context.sharedData.inferredWeapon = carriedWeapons[0].id;
    } else if (carriedWeapons.length > 1) {
      // Check for equipped/wielded weapon
      const equipped = carriedWeapons.find(w => w.has(TraitType.EQUIPPED));
      if (equipped) {
        context.sharedData.inferredWeapon = equipped.id;
      } else {
        // Need disambiguation
        return { 
          valid: false, 
          error: 'ambiguous_weapon',
          needsDisambiguation: {
            type: 'weapon',
            choices: carriedWeapons.map(w => w.id)
          }
        };
      }
    }
  }
  
  return { valid: true };
}
```

### Solution 3: Disambiguation System
**Note**: Disambiguation is covered in a separate ADR and will be implemented as a general system feature. For now, multiple weapon scenarios will return an appropriate error message.

## Implementation Priority

### Phase 0: Three-Phase Pattern Implementation (CRITICAL)
- Refactor to use validate/prepare/execute pattern
- Create AttackingState interface for state management
- Move weapon selection logic to prepare phase

### Phase 1: Parser Enhancement (Required)
- Change scope from `.visible()` to `.touchable()`
- Add "kill" synonym at minimum
- Add basic attack pattern without weapon
- Map common verbs to attacking action

### Phase 2: Weapon Inference (Recommended)
- Auto-select single carried weapon
- Prefer equipped/wielded weapons
- Store inferred weapon in sharedData
- Return clear error for multiple weapons (until disambiguation system is available)

## Compatibility Considerations

### Standard IF Conventions
- "kill" must work as expected
- Weapon inference is expected behavior
- Disambiguation prompts should be clear

### Extension Points
- Games can override weapon selection logic
- Custom reactions based on semantic properties
- Combat system integration via event handlers

## Testing Requirements

### Parser Tests
- Verify all verb synonyms map correctly
- Test with/without weapon patterns
- Verify semantic properties passed through

### Action Tests
- Single weapon auto-selection
- Multiple weapon scenarios
- No weapon (unarmed) attacks
- Equipped weapon preference

### Integration Tests
- Full command flow with inference
- Disambiguation handling
- Error message clarity

## Recommendations

1. **CRITICAL**: Implement three-phase pattern - this is an architectural requirement
2. **Immediate**: Fix visibility scope issue - parser should allow attacking non-visible targets
3. **Immediate**: Add "kill" synonym to parser - this is a breaking usability issue
4. **Short-term**: Implement basic weapon inference for single-weapon case in prepare phase
5. **Future**: Disambiguation system will handle multiple weapon scenarios (per separate ADR)
6. **Long-term**: Consider combat trait system for more sophisticated weapon handling

## Missing Core Concept Elements

Based on the core concepts review, the current design is missing several critical elements:

### 1. Typed SharedData Interface
The design doesn't define the typed interface for `AttackingSharedData`:

```typescript
interface AttackingSharedData {
  inferredWeapon?: string;        // ID of auto-selected weapon
  wasBlindAttack?: boolean;       // Couldn't see target
  targetReaction?: string;        // Selected NPC reaction
  originalVisibility?: boolean;   // Target visibility at start
}
```

### 2. Proper Three-Phase Structure
The execute() method should NOT emit events - it only performs world mutations:

```typescript
// Wrong (my initial proposal)
execute(context: ActionContext): ISemanticEvent[] {
  return [context.event('if.action.attacking.attempted', {...})]
}

// Correct (following three-phase pattern)
execute(context: ActionContext): void {
  // Only world mutations and storing data in sharedData
  // NO event emission here
}

report(context: ActionContext): ISemanticEvent[] {
  // ALL events are emitted here
  return [context.event('if.event.attacked', {...})]
}
```

### 3. Missing Data Builder
Actions need a data builder in `attacking-data.ts` for the event system:

```typescript
export const attackingDataBuilder = defineDataBuilder<AttackedEventData>({
  targetId: required(),
  weaponId: optional(),
  isBlindAttack: optional(false),
  intent: optional('hostile'),
  manner: optional('normal')
});
```

### 4. Event Handler Support
The design doesn't consider entity-level event handlers:

```typescript
// Entity can react to being attacked
troll.on['if.event.attacked'] = (event) => {
  // Custom troll defense logic
}
```

### 5. Behavior Pattern
Consider if attacking should use a behavior pattern like other actions:

```typescript
// Potential AttackBehavior in world-model
AttackBehavior.strike(attacker, target, weapon?)
```

This would separate game logic from command handling.

### 6. Missing prepare() Phase
The design mentions prepare but doesn't show implementation:

```typescript
prepare(context: ActionContext, state: AttackingState): AttackingState {
  // Weapon inference logic here
  if (!context.command.indirectObject) {
    const weapons = context.getCarried()
      .filter(e => e.has(TraitType.WEAPON));
    
    if (weapons.length === 1) {
      state.inferredWeapon = weapons[0].id;
    }
  }
  
  return state;
}
```

### 7. Trait Considerations
No mention of potential weapon-related traits:
- `WEAPON` trait for identifying weapons
- `EQUIPPED` or `WIELDED` trait for preferred weapons
- `DEFENDING` trait for armor/shields

## Combat Mechanics Design

### The Problem
Currently, attacking is purely narrative - it has no mechanical effect. This makes combat meaningless and removes player agency. Authors need a way to make attacks matter.

### Option 1: Basic Hit Point System
Simple numeric health that decreases with attacks:

```typescript
// In ACTOR trait or new COMBATANT trait
interface CombatantTrait {
  health: number;          // Current HP
  maxHealth: number;       // Maximum HP (default 10?)
  isAlive: boolean;        // Computed from health > 0
  armor?: number;          // Damage reduction
}

// Weapon damage ranges
interface WeaponTrait {
  minDamage: number;       // e.g., 1 for fist
  maxDamage: number;       // e.g., 3 for fist, 8 for sword
  accuracy?: number;       // Hit chance modifier
}

// In execute() phase
execute(context: ActionContext): void {
  const target = context.command.directObject!.entity!;
  const combatant = target.get(TraitType.COMBATANT);
  
  if (combatant && combatant.isAlive) {
    const weapon = /* get weapon */;
    const weaponTrait = weapon?.get(TraitType.WEAPON);
    
    // Calculate damage
    const minDmg = weaponTrait?.minDamage ?? 1;
    const maxDmg = weaponTrait?.maxDamage ?? 2;
    const damage = Math.floor(Math.random() * (maxDmg - minDmg + 1)) + minDmg;
    
    // Apply damage
    const actualDamage = Math.max(0, damage - (combatant.armor ?? 0));
    combatant.health = Math.max(0, combatant.health - actualDamage);
    
    // Store for reporting
    sharedData.damageDealt = actualDamage;
    sharedData.targetKilled = combatant.health === 0;
    
    // If killed, handle death
    if (combatant.health === 0) {
      combatant.isAlive = false;
      // Move to corpse state? Drop inventory?
    }
  }
}
```

### Option 2: State-Based Combat
Instead of HP, NPCs have combat states:

```typescript
enum CombatState {
  HEALTHY = 'healthy',
  WOUNDED = 'wounded',
  BADLY_WOUNDED = 'badly_wounded',
  UNCONSCIOUS = 'unconscious',
  DEAD = 'dead'
}

interface CombatantTrait {
  combatState: CombatState;
  woundCount: number;      // Tracks cumulative damage
  threshold: number;        // Wounds before state change
}
```

### Option 3: Reaction-Based System
NPCs react based on personality/role rather than health:

```typescript
interface CombatReaction {
  flee?: number;           // Chance to run away
  surrender?: number;      // Chance to give up
  retaliate?: number;      // Chance to fight back
  callHelp?: number;       // Chance to summon allies
}

// Cowardly merchant might flee immediately
// Brave guard might always retaliate
// Smart villain might surrender then betray later
```

### Option 4: Event-Driven Combat
Let authors handle it entirely through event handlers:

```typescript
// No built-in combat system, just events
troll.on['if.event.attacked'] = (event) => {
  // Author decides what happens
  if (event.data.weaponId === 'magic_sword') {
    troll.setAttribute('health', 0);
    return [
      context.event('action.success', {
        messageId: 'troll_dies_to_magic',
      })
    ];
  } else {
    return [
      context.event('action.success', {
        messageId: 'troll_laughs_at_puny_weapon'
      })
    ];
  }
};
```

### Recommendation: Hybrid Approach

1. **Core System**: Implement basic HP system in COMBATANT trait
   - Simple, understood by players
   - Optional - entities without trait are invulnerable
   - Default 10 HP for most NPCs

2. **Weapon Traits**: Add WEAPON trait with damage ranges
   - Fists: 1-2 damage
   - Knife: 2-4 damage  
   - Sword: 3-6 damage
   - Magic weapons: higher/special

3. **Event Hooks**: Allow overrides via event handlers
   - Authors can implement special cases
   - Boss fights, puzzle combat, story beats

4. **Reactions**: Add personality-based reactions
   - Flee, surrender, retaliate based on NPC type
   - Stored in COMBATANT or ACTOR trait

5. **Death Handling**: 
   - Move to 'corpse' state (new trait?)
   - Drop carried items
   - Emit 'if.event.killed' for story consequences

### Implementation Priority
1. Start with events only (Option 4) - minimal, flexible
2. Add basic HP later if needed
3. Let combat-heavy games extend with their own systems

## Notes on Complexity

The attacking action reveals a fundamental challenge in IF design: balancing user convenience with explicitness. The weapon inference problem is a microcosm of larger disambiguation challenges throughout the system. A general solution for disambiguation would benefit many actions beyond attacking.