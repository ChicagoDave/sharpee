# Attacking System Architecture

## Overview
The attacking system in Sharpee consists of multiple layers that work together to handle combat and destructive actions. Understanding how these components interact is crucial for proper implementation and testing.

## System Components

### 1. Traits (State Storage)
Traits store the state data needed for combat mechanics:

#### WEAPON Trait
- **Purpose**: Defines an item as a weapon with damage capabilities
- **Properties**:
  - `minDamage`: Minimum damage value
  - `maxDamage`: Maximum damage value  
  - `weaponType`: Type of weapon (blade, blunt, piercing, magic)
- **Used by**: WeaponBehavior to calculate damage

#### BREAKABLE Trait
- **Purpose**: Marks an entity as destructible in one hit
- **Properties**:
  - `broken`: Boolean flag indicating if broken
- **Philosophy**: Minimal state only - story details via events
- **Used by**: BreakableBehavior for one-hit destruction

#### DESTRUCTIBLE Trait
- **Purpose**: Multi-hit destructible barriers/objects
- **Properties**:
  - `hitPoints`: Current HP
  - `maxHitPoints`: Maximum HP
  - `armor`: Damage reduction
  - `requiresWeapon`: Boolean - needs weapon to damage
  - `requiresType`: Specific weapon type needed
  - `transformTo`: Entity ID to transform into when destroyed
  - `revealExit`: Direction to reveal when destroyed
  - `damageMessage`: Custom message when damaged
  - `destroyMessage`: Custom message when destroyed
- **Used by**: DestructibleBehavior for HP-based destruction

#### COMBATANT Trait
- **Purpose**: Living entities with health that can be killed
- **Properties**:
  - `health`: Current health
  - `maxHealth`: Maximum health
  - `isAlive`: Computed property (health > 0)
  - `armor`: Optional damage reduction
- **Used by**: CombatBehavior for NPC/creature combat

#### EQUIPPED Trait
- **Purpose**: Tracks equipped status of items
- **Properties**:
  - `slot`: Equipment slot (weapon, armor, accessory)
  - `isEquipped`: Boolean flag
- **Used by**: Equipment system (not directly by attack)

### 2. Behaviors (Business Logic)
Behaviors implement the logic for how traits affect gameplay:

#### WeaponBehavior
- **calculateDamage(weapon)**: Returns random damage between min/max
- **canDamage(weapon, targetType)**: Checks weapon vs target compatibility
- **inferWeapon(inventory)**: Finds first weapon in inventory

#### BreakableBehavior  
- **break(entity, world)**: 
  - Marks entity as broken
  - Returns success and any story-specific data
  - Does NOT create debris (story-specific)

#### DestructibleBehavior
- **damage(entity, amount, weaponType, world)**:
  - Checks weapon requirements
  - Applies damage (reduced by armor)
  - Handles transformation when destroyed
  - Reveals exits if configured
  - Returns detailed damage result

#### CombatBehavior
- **attack(entity, damage, world)**:
  - Applies damage (reduced by armor)
  - Handles death when health reaches 0
  - Drops inventory items on death
  - Returns combat result with details

#### AttackBehavior (Coordinator)
- **attack(target, weapon, world)**:
  - **Priority order**: Breakable → Destructible → Combatant
  - Calculates weapon damage (or 1 for unarmed)
  - Tries each behavior based on target's traits
  - Returns combined IAttackResult
  - Falls back to "ineffective" if no combat traits

### 3. The Attacking Action (Three-Phase Flow)

#### Phase 1: Validate
```typescript
validate(context: ActionContext): ValidationResult
```
- Checks target exists
- Verifies target is visible
- Confirms target is reachable  
- Prevents self-harm
- Validates weapon is held (if specified)
- Returns validation result only (no side effects)

#### Phase 2: Execute
```typescript
execute(context: ActionContext): void
```
- Assumes validation passed
- Infers weapon for certain verbs (stab, slash, cut)
- Calls `AttackBehavior.attack(target, weapon, world)`
- Stores result in `context.sharedData`:
  - `attackResult`: The IAttackResult from AttackBehavior
  - `weaponUsed`: Entity ID of weapon
  - `weaponInferred`: Boolean flag
  - `customMessage`: Any custom message from behaviors

#### Phase 3: Report
```typescript
report(context: ActionContext, validationResult?, executionError?): ISemanticEvent[]
```
- Generates events based on execution results
- If validation failed: Returns single error event
- If attack succeeded:
  - Emits `if.event.attacked` event
  - Emits `action.success` with appropriate message
  - May emit additional events (dropped items, revealed exits)
- If attack was ineffective:
  - Returns `action.error` event with message

## Attack Flow Example

### Attacking a Goblin (COMBATANT)
1. **Validate**: Check goblin is reachable, visible
2. **Execute**: 
   - AttackBehavior checks traits
   - Finds COMBATANT trait
   - CombatBehavior.attack() applies damage
   - Returns result with damage/health info
3. **Report**: 
   - Emits attacked event
   - Emits success with "hit" or "killed" message

### Breaking a Vase (BREAKABLE)
1. **Validate**: Check vase is reachable
2. **Execute**:
   - AttackBehavior checks traits
   - Finds BREAKABLE trait (highest priority)
   - BreakableBehavior.break() marks as broken
   - Returns result with type: 'broke'
3. **Report**:
   - Emits attacked event
   - Emits success with "target_broke" message

### Destroying a Wall (DESTRUCTIBLE)
1. **Validate**: Check wall is reachable
2. **Execute**:
   - AttackBehavior checks traits
   - Finds DESTRUCTIBLE trait
   - DestructibleBehavior.damage() checks requirements
   - If no weapon and requiresWeapon: Returns ineffective
   - Otherwise: Applies damage, may destroy
3. **Report**:
   - If ineffective: Error event
   - If damaged: Success with remaining HP
   - If destroyed: Success with transformation/exit info

### Attacking a Rock (No Combat Traits)
1. **Validate**: Check rock is reachable
2. **Execute**:
   - AttackBehavior checks all traits
   - Finds no combat-related traits
   - Returns ineffective result
3. **Report**:
   - Emits error event with "attack_ineffective" message

## Key Design Principles

### 1. Trait Priority
AttackBehavior checks traits in specific order:
1. BREAKABLE (one-hit destruction)
2. DESTRUCTIBLE (HP-based)
3. COMBATANT (living entities)

This ensures consistent behavior when entities have multiple traits.

### 2. Separation of Concerns
- **Traits**: Store state only (minimal data)
- **Behaviors**: Implement game mechanics
- **Action**: Coordinates and reports
- **Events**: Allow story customization

### 3. Story vs Mechanics
- Core mechanics are in behaviors (damage calculation, death)
- Story elements are via events (messages, sounds, descriptions)
- This allows games to customize narrative without changing mechanics

### 4. Atomic Events
Each event represents one discrete fact:
- "X was attacked"
- "Y was dropped"
- "Exit north was revealed"

This allows precise event handling and customization.

## Testing Considerations

### Unit Testing Behaviors
Test each behavior in isolation:
- WeaponBehavior with various weapon types
- BreakableBehavior marking entities as broken
- DestructibleBehavior with HP and requirements
- CombatBehavior with health and death

### Integration Testing
Test AttackBehavior coordinating multiple behaviors:
- Priority order when entity has multiple traits
- Weapon inference from inventory
- Result aggregation

### Action Testing
Test the three-phase pattern:
- Validation logic for all error cases
- Execute storing correct shared data
- Report generating appropriate events

### Important: Entity Setup
For tests to work properly, entities must:
1. Be created through WorldModel.createEntity()
2. Have traits added with proper structure
3. Be placed in appropriate locations
4. Have all required trait properties

Example:
```typescript
const goblin = world.createEntity('goblin', EntityType.ACTOR);
goblin.add({
  type: TraitType.COMBATANT,
  health: 100,
  maxHealth: 100,
  armor: 0
});
world.moveEntity(goblin.id, room.id);
```

## Common Issues

### Attack Returns Ineffective
- Entity missing required trait
- Trait not properly structured
- Entity not created through WorldModel
- Behavior not recognizing trait

### Validation Passes When It Shouldn't
- Weapon check only applies if weapon specified
- Check command structure (indirectObject vs secondEntity)
- Verify entity locations in world

### Events Not Generated
- Attack result was ineffective
- Check sharedData is populated
- Verify report() is checking correct result type

## Summary

The attacking system is a carefully layered architecture where:
1. **Traits** define what an entity IS (breakable, combatant, etc.)
2. **Behaviors** define what happens WHEN attacked
3. **AttackBehavior** coordinates the attack based on traits
4. **Attacking Action** validates, executes, and reports results
5. **Events** allow customization of story elements

This design provides a robust combat system while maintaining flexibility for different game styles and narratives.