# Attacking Action Implementation Plan

## Overview
The attacking action needs refactoring to follow the three-phase pattern, support weapon inference, and provide meaningful combat mechanics.

**Key Design Principle**: The execute phase is minimal - it just calls AttackBehavior. All world mutations (breaking objects, revealing exits, killing NPCs) happen inside the behaviors themselves. The action only coordinates and reports.

## Core Attack Scenarios

### 1. Combat with NPCs
- **Example**: "kill troll with sword"
- **Trait**: COMBATANT - health-based combat system
- **Result**: Damage dealt, possible death

### 2. Breaking Fragile Objects
- **Example**: "hit window", "smash vase"
- **Trait**: BREAKABLE - one-hit destruction for fragile items
- **Result**: Object breaks, spills contents, creates debris

### 3. Destroying Tough Objects
- **Example**: "attack wall" (false wall), "break chains"
- **Trait**: DESTRUCTIBLE - multi-hit or tool-specific destruction
- **Result**: Transforms, reveals passages, requires specific weapons

### 4. Default (No Effect)
- **Example**: "attack stone wall", "hit air"
- **No traits**: Attack deflected with narrative
- **Result**: "Your attack has no effect" or similar

## Required Changes

### 1. Three-Phase Pattern Implementation

Convert from current two-phase (validate/execute) to three-phase pattern:

```typescript
// attacking.ts
export const attackingAction: Action = {
  id: IFActions.ATTACKING,
  
  validate(context: ActionContext): ValidationResult {
    const target = context.command.directObject?.entity;
    
    if (!target) {
      return { valid: false, error: 'no_target' };
    }
    
    // Allow attacking even if can't see (blind attack)
    // but check if can at least reach
    if (!context.canReach(target)) {
      return { valid: false, error: 'not_reachable' };
    }
    
    // Prevent self-attack
    if (target.id === context.player.id) {
      return { valid: false, error: 'self_attack' };
    }
    
    // Weapon inference and validation
    if (!context.command.indirectObject) {
      const weapons = context.getCarried()
        .filter(e => e.has(TraitType.WEAPON));
      
      if (weapons.length > 1) {
        const equipped = weapons.find(w => w.has(TraitType.EQUIPPED));
        if (!equipped) {
          // Multiple weapons, need disambiguation
          return { valid: false, error: 'ambiguous_weapon' };
        }
      }
    }
    
    return { valid: true };
  },
  
  execute(context: ActionContext): void {
    const sharedData = context.sharedData as AttackingSharedData;
    const target = context.command.directObject!.entity!;
    
    // Get weapon (specified or inferred)
    const weapon = context.command.indirectObject?.entity || 
      context.getCarried()
        .filter(e => e.has(TraitType.WEAPON))
        .find(w => w.has(TraitType.EQUIPPED)) ||
      context.getCarried()
        .find(e => e.has(TraitType.WEAPON));
    
    // Store context for reporting
    sharedData.targetId = target.id;
    sharedData.weaponId = weapon?.id;
    sharedData.wasBlindAttack = !context.canSee(target);
    
    // Attack behavior handles ALL world mutations
    const result = AttackBehavior.attack(context.player, target, weapon, context.world);
    sharedData.attackResult = result;
  },
  
  report(context: ActionContext): ISemanticEvent[] {
    const sharedData = context.sharedData as AttackingSharedData;
    const result = sharedData.attackResult!;
    const events: ISemanticEvent[] = [];
    
    // Emit world event
    events.push(context.event('if.event.attacked', {
      targetId: sharedData.targetId,
      weaponId: sharedData.weaponId,
      isBlindAttack: sharedData.wasBlindAttack,
      resultType: result.type,
      damage: result.damage,
      killed: result.killed
    }));
    
    // Generate appropriate message based on result type
    let messageId: string;
    const params: any = {
      target: context.world.getEntity(sharedData.targetId!)?.name,
      weapon: sharedData.weaponId ? context.world.getEntity(sharedData.weaponId)?.name : null
    };
    
    switch (result.type) {
      case 'broke':
        messageId = result.replacedWith ? 'target_shattered' : 'target_broke';
        if (result.replacedWith) {
          params.debris = result.replacedWith;
        }
        break;
        
      case 'destroyed':
        messageId = 'target_destroyed';
        break;
        
      case 'damaged':
        messageId = 'target_damaged';
        params.remaining = result.remainingHits;
        break;
        
      case 'combat':
        if (result.killed) {
          messageId = sharedData.wasBlindAttack ? 'killed_blindly' : 'killed_target';
        } else {
          messageId = sharedData.wasBlindAttack ? 'hit_blindly' : 'hit_target';
          params.damage = result.damage;
        }
        break;
        
      case 'need_weapon':
        events.push(context.event('action.error', {
          actionId: this.id,
          error: 'need_weapon_to_damage',
          params
        }));
        break;
        
      case 'wrong_weapon':
        events.push(context.event('action.error', {
          actionId: this.id,
          error: 'wrong_weapon_type',
          params
        }));
        break;
        
      case 'ineffective':
      default:
        messageId = 'attack_ineffective';
        events.push(context.event('action.success', {
          actionId: this.id,
          messageId,
          params
        }));
    }
    
    // Only add success message if we didn't add an error
    if (result.type !== 'need_weapon' && result.type !== 'wrong_weapon' && result.type !== 'ineffective') {
      events.push(context.event('action.success', {
        actionId: this.id,
        messageId,
        params
      }));
    }
    
    return events;
  }
};
```

### 2. New Traits and Behaviors

#### WEAPON Trait (Most Important)
```typescript
// packages/world-model/src/traits/weapon.ts
export interface WeaponTrait extends Trait {
  minDamage: number;      // Minimum damage (1 for fists)
  maxDamage: number;      // Maximum damage (2 for fists, 6 for sword)
  weaponType?: string;    // 'blade', 'blunt', 'piercing', 'magic'
  
  // Allows author creativity - anything can be a weapon
  // Examples:
  // - Rolled newspaper: minDamage: 1, maxDamage: 1
  // - Magic sword: minDamage: 5, maxDamage: 10, weaponType: 'magic'
  // - Sledgehammer: minDamage: 4, maxDamage: 8, weaponType: 'blunt'
}
```

#### WeaponBehavior
```typescript
// packages/world-model/src/behaviors/weapon.ts
export class WeaponBehavior {
  static calculateDamage(weapon?: IFEntity | null): number {
    if (!weapon) {
      // Unarmed attack
      return Math.floor(Math.random() * 2) + 1; // 1-2 damage
    }
    
    const weaponTrait = weapon.get(TraitType.WEAPON);
    if (!weaponTrait) {
      // Improvised weapon (no trait)
      return 1;
    }
    
    const { minDamage, maxDamage } = weaponTrait;
    return Math.floor(Math.random() * (maxDamage - minDamage + 1)) + minDamage;
  }
  
  static canDamage(weapon: IFEntity | null, target: IFEntity): boolean {
    const destructible = target.get(TraitType.DESTRUCTIBLE);
    if (!destructible) return true;
    
    if (destructible.requiresWeapon && !weapon) return false;
    
    if (destructible.requiresType) {
      const weaponTrait = weapon?.get(TraitType.WEAPON);
      return weaponTrait?.weaponType === destructible.requiresType;
    }
    
    return true;
  }
}
```

#### BREAKABLE Trait
```typescript
// packages/world-model/src/traits/breakable.ts
export interface BreakableTrait extends Trait {
  broken: boolean;             // Current state
  breaksInto?: string;         // Entity type to create when broken (e.g., 'debris')
}
```

#### BreakableBehavior
```typescript
// packages/world-model/src/behaviors/breakable.ts
export class BreakableBehavior {
  static break(entity: IFEntity, world: WorldModel): BreakResult {
    const breakable = entity.get(TraitType.BREAKABLE);
    if (!breakable || breakable.broken) {
      return { broken: false };
    }
    
    // Mark as broken
    breakable.broken = true;
    
    // Create debris if specified
    if (breakable.breaksInto) {
      const location = world.getLocation(entity.id);
      const debris = world.createEntity(`broken ${entity.name}`, breakable.breaksInto);
      world.moveEntity(debris.id, location);
      world.removeEntity(entity.id);
      
      return { broken: true, replacedWith: debris.name };
    }
    
    // Just mark as broken, don't remove
    return { broken: true };
  }
}

interface BreakResult {
  broken: boolean;
  replacedWith?: string;     // Name of debris for reporting
}

// Author can handle spilling contents via event handler:
// vase.on['if.event.attacked'] = (event) => {
//   if (event.data.resultType === 'broke') {
//     // Move contents to floor
//     const contents = world.getContents(vase.id);
//     contents.forEach(item => world.moveEntity(item.id, room.id));
//   }
// }
```

#### DESTRUCTIBLE Trait
```typescript
// packages/world-model/src/traits/destructible.ts
export interface DestructibleTrait extends Trait {
  hitPoints: number;           // Hits needed to destroy
  requiresWeapon?: boolean;    // Can't damage with bare hands
  requiresType?: string;       // Specific weapon type ('blade' for chains)
  transformTo?: string;        // Entity to replace with when destroyed
  revealExit?: string;         // Exit ID to reveal when destroyed
}
```

#### DestructibleBehavior
```typescript
// packages/world-model/src/behaviors/destructible.ts
export class DestructibleBehavior {
  static damage(entity: IFEntity, weapon: IFEntity | null, world: WorldModel): DamageResult {
    const destructible = entity.get(TraitType.DESTRUCTIBLE);
    if (!destructible || destructible.hitPoints <= 0) {
      return { damaged: false, reason: 'not_destructible' };
    }
    
    // Check weapon requirements
    if (!WeaponBehavior.canDamage(weapon, entity)) {
      if (destructible.requiresWeapon && !weapon) {
        return { damaged: false, reason: 'needs_weapon' };
      }
      if (destructible.requiresType) {
        return { damaged: false, reason: 'wrong_weapon' };
      }
    }
    
    // Apply damage
    destructible.hitPoints--;
    
    // Handle destruction
    if (destructible.hitPoints === 0) {
      const location = world.getLocation(entity.id);
      
      // Transform into new entity
      if (destructible.transformTo) {
        const newEntity = world.createEntity(entity.name, destructible.transformTo);
        world.moveEntity(newEntity.id, location);
        world.removeEntity(entity.id);
      }
      
      // Reveal hidden exit
      if (destructible.revealExit) {
        const exit = world.getEntity(destructible.revealExit);
        if (exit) {
          exit.setAttribute('hidden', false);
        }
      }
      
      return {
        damaged: true,
        destroyed: true,
        remainingHits: 0
      };
    }
    
    return {
      damaged: true,
      destroyed: false,
      remainingHits: destructible.hitPoints
    };
  }
}

interface DamageResult {
  damaged: boolean;
  reason?: 'not_destructible' | 'needs_weapon' | 'wrong_weapon';
  destroyed?: boolean;
  remainingHits?: number;
}
```

#### COMBATANT Trait
```typescript
// packages/world-model/src/traits/combatant.ts
export interface CombatantTrait extends Trait {
  health: number;         // Current HP
  maxHealth: number;      // Maximum HP (default 10)
  isAlive: boolean;       // Computed: health > 0
  armor?: number;         // Damage reduction
}
```

#### CombatBehavior
```typescript
// packages/world-model/src/behaviors/combat.ts
export class CombatBehavior {
  static attack(
    attacker: IFEntity, 
    target: IFEntity, 
    weapon: IFEntity | null,
    world?: WorldModel
  ): CombatResult {
    const combatant = target.get(TraitType.COMBATANT);
    if (!combatant || !combatant.isAlive) {
      return { hit: false };
    }
    
    const damage = WeaponBehavior.calculateDamage(weapon);
    const actualDamage = Math.max(0, damage - (combatant.armor || 0));
    
    combatant.health = Math.max(0, combatant.health - actualDamage);
    combatant.isAlive = combatant.health > 0;
    
    // Handle death
    if (!combatant.isAlive && world) {
      // Drop inventory
      if (target.has(TraitType.CONTAINER)) {
        const contents = world.getContents(target.id);
        const location = world.getLocation(target.id);
        contents.forEach(item => world.moveEntity(item.id, location));
      }
      
      // Could transform to corpse here
      // const corpse = world.createEntity(`${target.name}'s corpse`, 'corpse');
      // world.moveEntity(corpse.id, world.getLocation(target.id));
    }
    
    return {
      hit: true,
      damage: actualDamage,
      killed: !combatant.isAlive
    };
  }
}

interface CombatResult {
  hit: boolean;
  damage?: number;
  killed?: boolean;
}
```

#### AttackBehavior (Coordinator)
```typescript
// packages/world-model/src/behaviors/attack.ts
export class AttackBehavior {
  static attack(
    attacker: IFEntity, 
    target: IFEntity, 
    weapon: IFEntity | null,
    world: WorldModel
  ): AttackResult {
    // Try BREAKABLE first (glass, vases)
    if (target.has(TraitType.BREAKABLE)) {
      const result = BreakableBehavior.break(target, world);
      if (result.broken) {
        return {
          succeeded: true,
          type: 'broke',
          replacedWith: result.replacedWith
        };
      }
    }
    
    // Try DESTRUCTIBLE (walls, chains)
    if (target.has(TraitType.DESTRUCTIBLE)) {
      const result = DestructibleBehavior.damage(target, weapon, world);
      if (!result.damaged) {
        return {
          succeeded: false,
          type: result.reason === 'needs_weapon' ? 'need_weapon' : 'wrong_weapon'
        };
      }
      return {
        succeeded: true,
        type: result.destroyed ? 'destroyed' : 'damaged',
        remainingHits: result.remainingHits
      };
    }
    
    // Try COMBATANT (NPCs)
    if (target.has(TraitType.COMBATANT)) {
      const result = CombatBehavior.attack(attacker, target, weapon, world);
      if (result.hit) {
        return {
          succeeded: true,
          type: 'combat',
          damage: result.damage,
          killed: result.killed
        };
      }
    }
    
    // Default: no effect (stone walls, air, etc.)
    return {
      succeeded: false,
      type: 'ineffective'
    };
  }
}

interface AttackResult {
  succeeded: boolean;
  type: 'ineffective' | 'broke' | 'destroyed' | 'damaged' | 
        'combat' | 'need_weapon' | 'wrong_weapon';
  
  // Just enough info for reporting
  replacedWith?: string;       // Debris name
  remainingHits?: number;      // Hits left
  damage?: number;             // Combat damage
  killed?: boolean;            // Target died
}
```

#### EQUIPPED Trait
```typescript
// packages/world-model/src/traits/equipped.ts
export interface EquippedTrait {
  slot: 'weapon' | 'armor' | 'accessory';
  isEquipped: boolean;
}
```

### 3. Parser Grammar Updates

```typescript
// packages/parser-en-us/src/core-grammar.ts

// Change scope from visible to touchable
grammar
  .define('attack :target')
  .where('target', scope => scope.touchable())  // Was: visible()
  .mapsTo('if.action.attacking')
  .withPriority(100)
  .build();

// Add kill and other verbs
grammar
  .define(':verb :target')
  .where('target', scope => scope.touchable())
  .withVerbs(['kill', 'hit', 'strike', 'punch', 'kick', 'slap', 'stab'])
  .mapsTo('if.action.attacking')
  .withSemanticVerbs({
    'kill': { intent: 'lethal' },
    'hit': { intent: 'hostile' },
    'strike': { intent: 'hostile' },
    'punch': { intent: 'hostile', unarmed: true },
    'kick': { intent: 'hostile', unarmed: true },
    'slap': { intent: 'humiliation' },
    'stab': { intent: 'lethal', requiresBlade: true }
  })
  .withPriority(100)
  .build();

// With weapon pattern
grammar
  .define(':verb :target with :weapon')
  .where('target', scope => scope.touchable())
  .where('weapon', scope => scope.carried())
  .withVerbs(['attack', 'kill', 'hit', 'strike', 'stab'])
  .mapsTo('if.action.attacking')
  .withPriority(110)  // Higher than simple attack
  .build();
```

### 4. Supporting Files

#### attacking-data.ts
```typescript
export const attackingDataBuilder = defineDataBuilder<AttackedEventData>({
  targetId: required(),
  weaponId: optional(),
  damageDealt: optional(),
  isBlindAttack: optional(false),
  targetKilled: optional(false),
  intent: optional('hostile')
});
```

#### attacking-events.ts
```typescript
export interface AttackedEventData {
  targetId: string;
  weaponId?: string;
  damageDealt?: number;
  isBlindAttack?: boolean;
  targetKilled?: boolean;
  intent?: 'hostile' | 'lethal' | 'humiliation';
}

export interface AttackingSharedData {
  targetId?: string;
  weaponId?: string;
  wasBlindAttack?: boolean;
  attackResult?: AttackResult;
}
```

## Implementation Order

1. **Phase 1: Core Refactor**
   - Implement three-phase pattern (validate/execute/report)
   - Add AttackingSharedData interface
   - Move to execute/report separation

2. **Phase 2: Parser Updates**
   - Change scope to touchable()
   - Add kill verb and other synonyms
   - Add semantic properties

3. **Phase 3: Combat System**
   - Add WEAPON trait
   - Add COMBATANT trait
   - Implement damage calculation
   - Handle death state

4. **Phase 4: Weapon Inference**
   - Implement weapon selection in execute() phase
   - Add EQUIPPED trait
   - Handle single/multiple weapon cases

## Testing Requirements

### Action Tests (`attacking.test.ts`)

#### Three-Phase Pattern
- [ ] validate() returns ValidationResult
- [ ] execute() returns void
- [ ] execute() only calls AttackBehavior
- [ ] report() returns ISemanticEvent[]
- [ ] sharedData passes between phases

#### Validation Tests
- [ ] Fails when no target
- [ ] Fails when target not reachable
- [ ] Fails when attacking self
- [ ] Fails when multiple weapons without equipped
- [ ] Passes when target is touchable but not visible (blind attack)

#### Weapon Inference
- [ ] Uses specified weapon from command
- [ ] Infers single carried weapon
- [ ] Prefers equipped weapon when multiple
- [ ] Works with no weapon (unarmed)

#### Report Generation
- [ ] Emits if.event.attacked for all attacks
- [ ] Different messages for broke/destroyed/damaged/combat
- [ ] Includes blind attack flag
- [ ] Error messages for need_weapon/wrong_weapon
- [ ] Default message for ineffective attacks

### Behavior Tests

#### WeaponBehavior (`weapon.test.ts`)
- [ ] calculateDamage() returns 1-2 for unarmed
- [ ] calculateDamage() uses weapon min/max range
- [ ] calculateDamage() returns 1 for improvised (no trait)
- [ ] canDamage() checks requiresWeapon
- [ ] canDamage() checks requiresType matches weaponType

#### BreakableBehavior (`breakable.test.ts`)
- [ ] break() marks object as broken
- [ ] break() creates debris if breaksInto specified
- [ ] break() removes original if replaced with debris
- [ ] break() returns false if already broken
- [ ] break() does NOT handle contents (author's job)

#### DestructibleBehavior (`destructible.test.ts`)
- [ ] damage() decrements hitPoints
- [ ] damage() checks weapon requirements
- [ ] damage() transforms entity when destroyed
- [ ] damage() reveals exit when destroyed
- [ ] damage() returns remainingHits
- [ ] damage() returns false if wrong weapon type

#### CombatBehavior (`combat.test.ts`)
- [ ] attack() calculates damage with weapon
- [ ] attack() applies armor reduction
- [ ] attack() updates health and isAlive
- [ ] attack() drops inventory on death
- [ ] attack() returns false if target already dead

#### AttackBehavior (`attack.test.ts`)
- [ ] Tries BREAKABLE first
- [ ] Tries DESTRUCTIBLE second
- [ ] Tries COMBATANT third
- [ ] Returns ineffective for no traits
- [ ] Passes world to all sub-behaviors
- [ ] Returns appropriate result type

### Integration Tests

#### Parser Integration (`attacking-parser.test.ts`)
- [ ] "attack troll" maps to attacking action
- [ ] "kill troll" maps to attacking action
- [ ] "hit window with hammer" parses weapon
- [ ] "slap guard" includes semantic intent
- [ ] Scope allows touchable but not visible targets

#### End-to-End Scenarios (`attacking-scenarios.test.ts`)
- [ ] Breaking glass window creates debris
- [ ] Destroying wall with 3 hits reveals passage
- [ ] Killing NPC drops inventory
- [ ] Attack without weapon uses fists
- [ ] Attack with wrong weapon type fails
- [ ] Attack on invulnerable object has no effect
- [ ] Blind attack in darkness succeeds with flag

#### Event Handler Integration (`attacking-events.test.ts`)
- [ ] Entity.on['if.event.attacked'] receives event
- [ ] Event includes all attack data
- [ ] Vase spills contents via custom handler
- [ ] Bell rings via custom handler
- [ ] Training dummy gives feedback via handler

### Golden Tests (`attacking-golden.test.ts`)
- [ ] Standard attack messages
- [ ] Combat with damage reports
- [ ] Breaking fragile objects
- [ ] Destroying tough objects
- [ ] Weapon requirement errors
- [ ] Blind attack messages

### Edge Cases
- [ ] Attack air/darkness (no entity)
- [ ] Attack with newspaper (improvised weapon)
- [ ] Attack ghost (might have special handler)
- [ ] Multiple attacks to destroy wall
- [ ] Death during combat
- [ ] Attack already broken object

## Design Philosophy

### Trait-Based Attack System

The attack system uses traits to determine outcomes:

1. **WEAPON Trait** - Makes anything a weapon with damage ranges
   - Authors can be creative (newspaper = weapon with 1 damage)
   - Weapon type enables special interactions (blade cuts chains)

2. **BREAKABLE Trait** - For fragile objects (glass, vases)
   - One-hit destruction
   - Can spill contents or create debris
   - No trait = deflect with "Your attack bounces off"

3. **DESTRUCTIBLE Trait** - For tough objects (walls, chains)
   - Multi-hit or requires specific tools
   - Can transform or reveal passages

4. **COMBATANT Trait** - For NPCs with health
   - Traditional HP system with armor
   - Death handling

### Behavior Separation

Each trait has its own behavior class:
- `WeaponBehavior` - Damage calculation
- `BreakableBehavior` - Breaking logic
- `DestructibleBehavior` - Destruction logic  
- `CombatBehavior` - Combat mechanics
- `AttackBehavior` - Coordinates all behaviors

This separation allows:
- Testing each behavior independently
- Reusing behaviors in other actions
- Clear responsibility boundaries

## Notes

- **Execute phase is minimal** - just gets weapon and calls AttackBehavior
- **Behaviors handle ALL world mutations** - breaking, transforming, revealing exits
- **AttackResult only contains reporting data** - not mutation instructions
- Start with minimal implementation (just events)
- Combat traits are optional - entities without traits are invulnerable
- Authors can override any behavior via event handlers
- Death should drop inventory and change entity state