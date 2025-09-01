# Attacking Action Implementation Checklist

## Phase 1: Core Refactoring
- [ ] Convert attacking.ts to three-phase pattern
  - [ ] Change validate() to return ValidationResult only
  - [ ] Change execute() to return void
  - [ ] Add report() method returning ISemanticEvent[]
  - [ ] Define AttackingSharedData interface
  - [ ] Remove old execute logic that emits events

## Phase 2: World Model - New Traits
- [ ] Create WEAPON trait (`packages/world-model/src/traits/weapon.ts`)
  - [ ] minDamage and maxDamage properties
  - [ ] weaponType property (blade, blunt, piercing, magic)
  - [ ] Add to TraitType enum
  - [ ] Export from traits index

- [ ] Create BREAKABLE trait (`packages/world-model/src/traits/breakable.ts`)
  - [ ] broken boolean property
  - [ ] breaksInto optional property
  - [ ] Add to TraitType enum
  - [ ] Export from traits index

- [ ] Create DESTRUCTIBLE trait (`packages/world-model/src/traits/destructible.ts`)
  - [ ] hitPoints number property
  - [ ] requiresWeapon boolean property
  - [ ] requiresType string property
  - [ ] transformTo optional property
  - [ ] revealExit optional property
  - [ ] Add to TraitType enum
  - [ ] Export from traits index

- [ ] Create COMBATANT trait (`packages/world-model/src/traits/combatant.ts`)
  - [ ] health and maxHealth properties
  - [ ] isAlive computed property
  - [ ] armor optional property
  - [ ] Add to TraitType enum
  - [ ] Export from traits index

- [ ] Create EQUIPPED trait (`packages/world-model/src/traits/equipped.ts`)
  - [ ] slot property (weapon, armor, accessory)
  - [ ] isEquipped boolean
  - [ ] Add to TraitType enum
  - [ ] Export from traits index

## Phase 3: World Model - New Behaviors
- [ ] Create WeaponBehavior (`packages/world-model/src/behaviors/weapon.ts`)
  - [ ] calculateDamage() method
  - [ ] canDamage() method
  - [ ] Export from behaviors index

- [ ] Create BreakableBehavior (`packages/world-model/src/behaviors/breakable.ts`)
  - [ ] break() method
  - [ ] Handle debris creation
  - [ ] Remove original if replaced
  - [ ] Export from behaviors index

- [ ] Create DestructibleBehavior (`packages/world-model/src/behaviors/destructible.ts`)
  - [ ] damage() method
  - [ ] Check weapon requirements
  - [ ] Handle transformation
  - [ ] Reveal exits
  - [ ] Export from behaviors index

- [ ] Create CombatBehavior (`packages/world-model/src/behaviors/combat.ts`)
  - [ ] attack() method
  - [ ] Apply damage and armor
  - [ ] Handle death and inventory drop
  - [ ] Export from behaviors index

- [ ] Create AttackBehavior (`packages/world-model/src/behaviors/attack.ts`)
  - [ ] attack() coordinator method
  - [ ] Try behaviors in order (breakable, destructible, combatant)
  - [ ] Return AttackResult
  - [ ] Export from behaviors index

## Phase 4: Parser Updates
- [ ] Update core-grammar.ts
  - [ ] Change attack pattern scope from visible() to touchable()
  - [ ] Add standalone "attack :target" pattern
  - [ ] Add kill verb synonym
  - [ ] Add other verb synonyms (hit, strike, punch, kick, slap, stab)
  - [ ] Add semantic properties for verbs

- [ ] Update semantic-grammar-rules.ts (if needed)
  - [ ] Add semantic verb mappings
  - [ ] Include intent properties (hostile, lethal, humiliation)

## Phase 5: Action Implementation
- [ ] Update attacking.ts
  - [ ] Implement new validate() logic
  - [ ] Implement minimal execute() - just call AttackBehavior
  - [ ] Implement report() with all message cases
  - [ ] Handle weapon inference

- [ ] Create attacking-data.ts
  - [ ] Define data builder for AttackedEventData
  - [ ] Export builder

- [ ] Update attacking-events.ts
  - [ ] Define AttackedEventData interface
  - [ ] Define AttackingSharedData interface
  - [ ] Update event types

## Phase 6: Messages
- [ ] Add new message IDs to vocabulary
  - [ ] target_broke / target_shattered
  - [ ] target_destroyed
  - [ ] target_damaged
  - [ ] killed_target / killed_blindly
  - [ ] hit_target / hit_blindly
  - [ ] need_weapon_to_damage
  - [ ] wrong_weapon_type
  - [ ] attack_ineffective
  - [ ] items_spilled
  - [ ] passage_revealed

## Phase 7: Testing
- [ ] Write unit tests for each behavior
  - [ ] weapon.test.ts
  - [ ] breakable.test.ts
  - [ ] destructible.test.ts
  - [ ] combat.test.ts
  - [ ] attack.test.ts

- [ ] Write action tests
  - [ ] attacking.test.ts (three-phase, validation, inference)
  - [ ] attacking-golden.test.ts (message output)

- [ ] Write integration tests
  - [ ] attacking-parser.test.ts
  - [ ] attacking-scenarios.test.ts
  - [ ] attacking-events.test.ts

## Phase 8: Documentation
- [ ] Update action documentation
- [ ] Document new traits in world-model README
- [ ] Add examples of attack scenarios
- [ ] Document event handler patterns

## Phase 9: Cleanup
- [ ] Remove any old/dead code
- [ ] Ensure all exports are correct
- [ ] Run full test suite
- [ ] Build all packages