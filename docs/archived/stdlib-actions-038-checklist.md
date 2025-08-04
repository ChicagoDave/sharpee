# Language-Agnostic Actions Implementation Checklist

## Overview
Refactor stdlib actions to remove English string detection and use explicit traits instead, per ADR-038.

## Progress Summary
- **Phase 1**: ✅ COMPLETED - All new trait types and interfaces defined
- **Phase 2**: ✅ COMPLETED - Created comprehensive tests for new traits
- **Phase 3**: ✅ COMPLETED - Refactor actions to use traits (pulling ✅, pushing ✅, turning ✅, attacking ✅)
- **Phase 4**: ✅ COMPLETED - Update action tests (pulling ✅, pushing ✅, turning ✅, attacking ✅)
- **Phase 5**: ⏳ TODO - Documentation
- **Phase 6**: ⏳ TODO - Integration testing
- **Phase 7**: ⏳ TODO - Cleanup

## Current Status
All trait types have been successfully created in the world-model package. The pulling and pushing actions have been fully refactored to use traits, along with their tests. The next actions to refactor are turning.ts and attacking.ts.

## Phase 1: Define New Traits in World-Model ✅ COMPLETED

**Completion Notes:**
- All trait types have been added to `TraitType` enum
- All trait interfaces have been implemented with comprehensive properties
- All traits have been added to `all-traits.ts` with proper exports and type guards
- Main index.ts has been updated to export all new traits
- Created index.ts files for all trait directories
- Updated implementations.ts to include all new trait mappings
- Fixed all build errors - world-model now builds successfully

## Phase 1: Define New Traits in World-Model

### Pulling-Related Traits
- [x] Create `PULLABLE` trait type in `TraitType` enum
- [x] Define `PullableTrait` interface with properties:
  - `pullType: 'lever' | 'cord' | 'attached' | 'heavy'`
  - `activates?: string` (entity ID)
  - `linkedTo?: string` (entity ID for levers)
  - `pullSound?: string`
  - `requiresStrength?: number`
- [x] Create `LEVER` trait type (extends behavior of PULLABLE)
- [x] Create `CORD` trait type (extends behavior of PULLABLE)
- [x] Create `BELL_PULL` trait type (special case of CORD)
- [x] Create `ATTACHED` trait type for attached/fastened items

### Pushing-Related Traits
- [x] Create `PUSHABLE` trait type
- [x] Define `PushableTrait` interface with properties:
  - `pushType: 'button' | 'heavy' | 'moveable'`
  - `revealsPassage?: boolean`
  - `pushSound?: string`
  - `requiresStrength?: number`
- [x] Create `BUTTON` trait type (consider extending SWITCHABLE)
- [x] Create `MOVEABLE_SCENERY` trait type for pushable heavy objects

### Turning-Related Traits
- [x] Create `TURNABLE` trait type
- [x] Define `TurnableTrait` interface with properties:
  - `turnType: 'dial' | 'knob' | 'wheel' | 'crank' | 'valve'`
  - `settings?: string[] | number[]`
  - `currentSetting?: string | number`
  - `turnsRequired?: number`
  - `turnSound?: string`
- [x] Create `DIAL` trait type with settings support
- [x] Create `KNOB` trait type
- [x] Create `WHEEL` trait type
- [x] Create `CRANK` trait type
- [x] Create `VALVE` trait type with open/close states

### Object Property Traits
- [x] Create `FRAGILE` trait type
- [x] Define `FragileTrait` interface with properties:
  - `breakSound?: string`
  - `breaksInto?: string[]` (entity IDs of fragments)
  - `breakThreshold?: number`
- [x] Create `BREAKABLE` trait type (more general than FRAGILE)

## Phase 2: Update World-Model Tests ✅ COMPLETED

**Completion Notes:**
- Created comprehensive tests for all new traits
- Tests cover initialization, default values, all configuration options
- Tests verify entity integration and trait retrieval
- Created trait combination tests to ensure traits work well together
- Tests follow existing patterns and conventions

### Trait Creation Tests
- [x] Add tests for creating entities with PULLABLE trait
- [x] Add tests for creating entities with PUSHABLE trait
- [x] Add tests for creating entities with TURNABLE trait
- [x] Add tests for creating entities with FRAGILE trait
- [x] Test trait combinations (e.g., SWITCHABLE + BUTTON)

### Build Fixes
- [x] Created all missing index.ts files for trait directories
- [x] Updated implementations.ts with all new trait imports and mappings
- [x] Fixed TypeScript compilation errors
- [x] Verified all imports and exports are correct

### Test Fixes
- [x] Fixed trait-combinations.test.ts to use correct SwitchableTrait properties
- [x] All tests now pass successfully (1090 tests passed)

### Trait Behavior Tests
- [x] Test lever behavior with PULLABLE + LEVER
- [x] Test cord behavior with PULLABLE + CORD
- [x] Test button behavior with PUSHABLE + BUTTON
- [x] Test dial/knob/wheel behavior with TURNABLE variants
- [x] Test fragility with FRAGILE trait

## Phase 3: Refactor Actions ⏳ NEXT PHASE

### pulling.ts
- [x] Remove all `name.includes()` and `description.includes()` checks
- [x] Replace with `target.has(TraitType.PULLABLE)` checks
- [x] Use `PullableTrait.pullType` instead of string detection
- [x] Update event data to use trait properties
- [x] Update message selection based on trait properties
- [x] Remove weight-based detection, use trait properties

### pushing.ts
- [x] Remove all string-based button/switch detection
- [x] Remove boulder/statue/pillar name checking
- [x] Replace with `target.has(TraitType.PUSHABLE)` checks
- [x] Use `PushableTrait.pushType` for behavior
- [x] Update message selection to use traits

### turning.ts
- [x] Remove all dial/knob/wheel/crank/valve string detection
- [x] Remove key name detection
- [x] Replace with `target.has(TraitType.TURNABLE)` checks
- [x] Use `TurnableTrait.turnType` for behavior
- [x] Handle settings/values through trait properties

### attacking.ts
- [x] Remove glass/fragile string detection
- [x] Replace with `target.has(TraitType.FRAGILE)` checks
- [x] Use `FragileTrait` properties for break behavior
- [x] Update destruction logic to use trait properties

## Phase 4: Update Action Tests

### pulling-golden.test.ts
- [x] Update lever creation to use PULLABLE + LEVER traits
- [x] Update cord creation to use PULLABLE + CORD traits
- [x] Update bell cord to use PULLABLE + BELL_PULL traits
- [x] Remove reliance on object names for behavior
- [x] Add tests for trait-based behavior variations

### pushing tests
- [x] Update button creation to use PUSHABLE + BUTTON traits
- [x] Update moveable scenery to use PUSHABLE + MOVEABLE_SCENERY
- [x] Test push behavior based on traits, not names

### turning tests
- [x] Update dial/knob/wheel objects to use TURNABLE traits
- [x] Test turning behavior based on trait type
- [x] Test settings/values through trait properties

### attacking tests
- [x] Update fragile objects to use FRAGILE trait
- [x] Test breaking based on trait, not name
- [x] Test break thresholds and sounds from trait

## Phase 5: Documentation

### Author Documentation
- [ ] Document all new trait types in world-model README
- [ ] Provide examples of creating pullable objects
- [ ] Provide examples of creating pushable objects
- [ ] Provide examples of creating turnable objects
- [ ] Provide examples of creating fragile objects
- [ ] Update action documentation to reference traits

### Migration Guide
- [ ] Create migration examples for existing games
- [ ] Show before/after for common objects:
  - Lever: from name-based to PULLABLE + LEVER
  - Button: from name-based to PUSHABLE + BUTTON
  - Dial: from name-based to TURNABLE + DIAL
  - Glass vase: from name-based to FRAGILE

## Phase 6: Integration Testing

### Full Game Tests
- [ ] Test pulling various PULLABLE objects
- [ ] Test pushing various PUSHABLE objects
- [ ] Test turning various TURNABLE objects
- [ ] Test breaking FRAGILE objects
- [ ] Test trait combinations in realistic scenarios

### Language Independence Tests
- [ ] Create test objects with non-English names
- [ ] Verify behaviors work regardless of object names
- [ ] Test with multiple language providers

## Phase 7: Cleanup

### Code Cleanup
- [ ] Remove using.ts file completely
- [ ] Remove any commented-out string detection code
- [ ] Update any remaining string-based behavior detection
- [ ] Run linter and fix any issues

### Final Review
- [ ] Verify all tests pass
- [ ] Review trait interfaces for completeness
- [ ] Ensure backward compatibility where possible
- [ ] Update CHANGELOG with breaking changes

## Notes

- **Breaking Change**: Games relying on name-based behavior detection will need updates
- **Migration Path**: Provide clear examples and utilities to help authors migrate
- **Extension Point**: New traits can be added by games for custom behaviors
- **Performance**: Trait checking should be more efficient than string searching
