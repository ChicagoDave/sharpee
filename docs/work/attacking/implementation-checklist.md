# Attacking Action Implementation Checklist

## Phase 1: Core Refactoring ✅
- [x] Convert attacking.ts to three-phase pattern
  - [x] Change validate() to return ValidationResult only
  - [x] Change execute() to return void
  - [x] Add report() method returning ISemanticEvent[]
  - [x] Define AttackingSharedData interface
  - [x] Remove old execute logic that emits events

## Phase 2: World Model - New Traits ✅
- [x] Create WEAPON trait (`packages/world-model/src/traits/weapon/weaponTrait.ts`)
  - [x] minDamage and maxDamage properties
  - [x] weaponType property (blade, blunt, piercing, magic)
  - [x] Add to TraitType enum
  - [x] Export from traits index

- [x] Create BREAKABLE trait (`packages/world-model/src/traits/breakable/breakableTrait.ts`)
  - [x] broken boolean property (only property - simplified)
  - [x] ~~breaksInto optional property~~ (removed - story-specific)
  - [x] Add to TraitType enum
  - [x] Export from traits index

- [x] Create DESTRUCTIBLE trait (`packages/world-model/src/traits/destructible/destructibleTrait.ts`)
  - [x] hitPoints number property
  - [x] requiresWeapon boolean property
  - [x] requiresType string property
  - [x] transformTo optional property
  - [x] revealExit optional property
  - [x] damageMessage and destroyMessage (for event injection)
  - [x] ~~Sound properties~~ (removed - story-specific)
  - [x] Add to TraitType enum
  - [x] Export from traits index

- [x] Create COMBATANT trait (`packages/world-model/src/traits/combatant/combatantTrait.ts`)
  - [x] health and maxHealth properties
  - [x] isAlive computed property
  - [x] armor optional property
  - [x] Add to TraitType enum
  - [x] Export from traits index

- [x] Create EQUIPPED trait (`packages/world-model/src/traits/equipped/equippedTrait.ts`)
  - [x] slot property (weapon, armor, accessory)
  - [x] isEquipped boolean
  - [x] Add to TraitType enum
  - [x] Export from traits index

## Phase 3: World Model - New Behaviors ✅
- [x] Create WeaponBehavior (`packages/world-model/src/traits/weapon/weaponBehavior.ts`)
  - [x] calculateDamage() method
  - [x] canDamage() method
  - [x] Export from behaviors index

- [x] Create BreakableBehavior (`packages/world-model/src/traits/breakable/breakableBehavior.ts`)
  - [x] break() method
  - [x] Handle debris creation
  - [x] Remove original if replaced
  - [x] Export from behaviors index

- [x] Create DestructibleBehavior (`packages/world-model/src/traits/destructible/destructibleBehavior.ts`)
  - [x] damage() method
  - [x] Check weapon requirements
  - [x] Handle transformation
  - [x] Reveal exits
  - [x] Export from behaviors index

- [x] Create CombatBehavior (`packages/world-model/src/traits/combatant/combatantBehavior.ts`)
  - [x] attack() method
  - [x] Apply damage and armor
  - [x] Handle death and inventory drop
  - [x] Export from behaviors index

- [x] Create AttackBehavior (`packages/world-model/src/behaviors/attack.ts`)
  - [x] attack() coordinator method
  - [x] Try behaviors in order (breakable, destructible, combatant)
  - [x] Return AttackResult
  - [x] Export from behaviors index

## Phase 4: Parser Updates ✅
- [x] Update semantic-core-grammar.ts
  - [x] Change attack pattern scope from visible() to touchable()
  - [x] Add standalone "attack :target" pattern
  - [x] Add kill verb synonym
  - [x] Add other verb synonyms (hit, strike, punch, kick, slap, stab)
  - [x] Add semantic properties for verbs

- [x] Add patterns with semantic properties
  - [x] Add semantic verb mappings
  - [x] Include intent properties (harm, kill, humiliate)
  - [x] Include manner properties (normal, forceful)

## Phase 5: Action Implementation ✅
- [x] Update attacking.ts
  - [x] Implement new validate() logic
  - [x] Implement minimal execute() - just call AttackBehavior
  - [x] Implement report() with all message cases
  - [x] Handle weapon inference

- [x] Create attacking-data.ts
  - [x] Define data builder for AttackedEventData
  - [x] Export builder

- [x] Create attacking-types.ts
  - [x] Define AttackResult interface
  - [x] Define AttackingSharedData interface

- [x] Update attacking-events.ts
  - [x] Define AttackedEventData interface (already existed)
  - [x] Export AttackingSharedData type
  - [x] Update event types

## Phase 6: Messages ✅
- [x] Add new message IDs to vocabulary
  - [x] target_broke / target_shattered
  - [x] target_destroyed
  - [x] target_damaged
  - [x] killed_target / killed_blindly
  - [x] hit_target / hit_blindly
  - [x] need_weapon_to_damage
  - [x] wrong_weapon_type
  - [x] attack_ineffective
  - [x] items_spilled
  - [x] passage_revealed
  - [x] debris_created (additional message)

## Phase 7: Cleanup ✅
- [x] Remove duplicate type imports and aliases
- [x] Fix type safety issues (removed type casting)
- [x] Simplify shared data assignment
- [x] Clean up unused event data fields (removed 16 unused fields)
- [x] Simplify AttackingErrorData
- [x] Update AttackingEventMap with actual events
- [x] Fix test expectations for simplified behaviors
- [x] Ensure all exports are correct
- [x] Build all packages (all building successfully)

## Phase 8: Testing ✅ (Core Tests Complete)
- [x] Write unit tests for each behavior
  - [x] weapon.test.ts (12 tests passing)
  - [x] breakable.test.ts (11 tests passing - simplified)
  - [x] destructible.test.ts (14 tests passing)
  - [x] combat.test.ts (16 tests passing)
  - [x] attack.test.ts (12 tests passing)
  - [x] breakable trait tests (13 tests passing)

- [x] Write action tests
  - [x] attacking.test.ts (32 tests passing - three-phase, validation, inference)
  - [x] attacking-golden.test.ts (existing, needs review)

- [x] Document system architecture
  - [x] Created attacking-system-architecture.md
  - [x] Documented trait/behavior interactions
  - [x] Explained testing considerations

- [ ] Write integration tests (optional, lower priority)
  - [ ] attacking-parser.test.ts
  - [ ] attacking-scenarios.test.ts
  - [ ] attacking-events.test.ts

## Phase 9: Documentation ⏭️
- [ ] Update action documentation
- [ ] Document new traits in world-model README
- [ ] Add examples of attack scenarios
- [ ] Document event handler patterns