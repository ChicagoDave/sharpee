# Scope Integration Checklist

## Overview
This document tracks the scope integration work needed for each action and the overall system.

## Core Integration Tasks ✅

### 1. CommandValidator Updates ✅
- [x] Update CommandValidator constructor to accept ScopeResolver
- [x] Replace world.canSee() calls with scopeResolver.canSee()
- [x] Update getEntitiesInScope() to use scopeResolver (now filterByScope)
- [x] Update isEntityVisible() to use scopeResolver
- [x] Update isEntityReachable() to use scopeResolver
- [x] Add scope level to ValidatedCommand interface
- [x] Update entity resolution to consider all senses (not just sight)

### 2. ActionContext Factory Updates ✅
- [x] Update action execution pipeline to pass scopeResolver
- [x] Ensure all action contexts get scopeResolver

### 3. Action Metadata Enhancement ✅
- [x] Define ScopeLevel requirements in action metadata
- [x] Update ActionMetadata interface to use ScopeLevel enum

## Action-Specific Updates

### Actions WITH Scope Checks (need removal)

#### 1. **taking** (taking.ts) ✅
- [x] Has canSee/canReach checks (lines 47-64) - ADDED, needs removal
- [x] Remove scope checks from execute()
- [x] Add metadata: directObjectScope = REACHABLE
- [x] Update tests to not expect scope errors from action

#### 2. **pushing** (pushing.ts) ✅
- [x] Has canSee/canReach checks
- [x] Remove scope checks from execute()
- [x] Add metadata: directObjectScope = REACHABLE
- [x] Review skipped reachability test

#### 3. **pulling** (pulling.ts) ✅
- [x] Has canSee/canReach checks
- [x] Remove scope checks from execute()
- [x] Add metadata: directObjectScope = REACHABLE

#### 4. **searching** (searching.ts) ✅
- [x] Has canSee/canReach checks
- [x] Remove scope checks from execute()
- [x] Add metadata: directObjectScope = REACHABLE

#### 5. **smelling** (smelling.ts) ✅
- [x] Has canSee check (should be canSmell!)
- [x] Remove scope checks from execute()
- [x] Add metadata: directObjectScope = DETECTABLE
- [x] Special handling for smell-specific scope

#### 6. **throwing** (throwing.ts) ✅
- [x] Has canSee check
- [x] Remove scope checks from execute()
- [x] Add metadata: directObjectScope = CARRIED, indirectObjectScope = VISIBLE

#### 7. **showing** (showing.ts) ✅
- [x] Has canSee check for recipient
- [x] Remove scope checks from execute()
- [x] Add metadata: directObjectScope = CARRIED, indirectObjectScope = VISIBLE

#### 8. **switching_on/switching_off** ✅
- [x] Has canSee/canReach checks
- [x] Remove scope checks from execute()
- [x] Add metadata: directObjectScope = REACHABLE

#### 9. **eating/drinking** ✅
- [x] Has canSee/canReach checks
- [x] Remove scope checks from execute()
- [x] Add metadata: directObjectScope = REACHABLE

#### 10. **listening** (listening.ts) ✅
- [x] Has canSee check (should allow hearing!)
- [x] Remove scope checks from execute()
- [x] Add metadata: directObjectScope = AUDIBLE
- [x] Special handling for hearing-specific scope

#### 11. **giving** (giving.ts) ✅
- [x] Has canSee/canReach checks for recipient
- [x] Remove scope checks from execute()
- [x] Add metadata: directObjectScope = CARRIED, indirectObjectScope = REACHABLE

#### 12. **opening/closing** (opening.ts, closing.ts) ✅
- [x] Has canSee/canReach checks
- [x] Remove scope checks from execute()
- [x] Add metadata: directObjectScope = REACHABLE

#### 13. **locking/unlocking** ✅
- [x] Has canSee/canReach checks
- [x] Remove scope checks from execute()
- [x] Add metadata: directObjectScope = REACHABLE

#### 14. **touching** (touching.ts) ✅
- [x] Has canSee/canReach checks
- [x] Remove scope checks from execute()
- [x] Add metadata: directObjectScope = REACHABLE

#### 15. **turning** (turning.ts) ✅
- [x] Has canSee/canReach checks
- [x] Remove scope checks from execute()
- [x] Add metadata: directObjectScope = REACHABLE

#### 16. **wearing/taking_off** ✅
- [x] Has canSee/canReach checks
- [x] Remove scope checks from execute()
- [x] Add metadata: directObjectScope = REACHABLE (wearing), CARRIED (taking_off)

#### 17. **putting/inserting** ✅
- [x] Has canSee/canReach checks
- [x] Remove scope checks from execute()
- [x] Add metadata: directObjectScope = CARRIED, indirectObjectScope = REACHABLE

#### 18. **removing** (removing.ts) ✅
- [x] Has canSee/canReach checks
- [x] Remove scope checks from execute()
- [x] Add metadata: directObjectScope = REACHABLE

### Actions WITHOUT Scope Checks (need metadata) ✅

#### 1. **examining** ✅
- [x] Add metadata: directObjectScope = VISIBLE (or AUDIBLE/DETECTABLE for special cases)
- [x] Consider multi-sense examination

#### 2. **looking**
- [ ] No object requirements
- [ ] Uses current location visibility

#### 3. **inventory**
- [ ] No object requirements
- [ ] Shows carried items

#### 4. **going** ✅
- [x] Add metadata: directObjectScope = VISIBLE (for exits)

#### 5. **entering/exiting** ✅
- [x] Add metadata: directObjectScope = REACHABLE
- [x] Review skipped currentLocation tests

#### 6. **climbing** ✅
- [x] Add metadata: directObjectScope = REACHABLE

#### 7. **attacking** ✅
- [x] Add metadata: directObjectScope = REACHABLE

#### 8. **talking** ✅
- [x] Add metadata: directObjectScope = AUDIBLE (can talk to things you can hear)

#### 9. **dropping** ✅
- [x] Add metadata: directObjectScope = CARRIED

#### 10. **waiting/sleeping/scoring/help/about**
- [ ] No object requirements

#### 11. **saving/restoring/quitting/restarting**
- [ ] No object requirements

#### 12. **again**
- [ ] Special case - repeats previous command

## Test Updates

### Skipped Tests to Review
1. **entering/exiting tests** - currentLocation dependent on scope
2. **pushing tests** - reachability checks
3. **vehicle-related tests** - scope-defining objects
4. **door/container tests** - visibility through barriers

### New Tests Needed
1. Integration tests for CommandValidator with ScopeResolver
2. Tests for multi-sense entity resolution
3. Tests for darkness affecting commands
4. Tests for hearing/smell-based commands

## Error Message Standardization

### Current Error Messages
- `not_visible` - "You can't see the {target}"
- `not_reachable` - "You can't reach the {target}"
- `not_audible` - "You can't hear the {target}"
- `not_detectable` - "You can't smell the {target}"

### Validator Error Messages
- `ENTITY_NOT_VISIBLE` - Maps to action's `not_visible`
- `ENTITY_NOT_REACHABLE` - Maps to action's `not_reachable`
- Add: `ENTITY_NOT_AUDIBLE`, `ENTITY_NOT_DETECTABLE`

## Implementation Order ✅

1. **Phase 1: Core Integration** ✅
   - Update CommandValidator with ScopeResolver ✅
   - Update ValidatedCommand interface ✅
   - Update ActionMetadata interface ✅

2. **Phase 2: Remove Duplicate Checks** ✅
   - Remove scope checks from all actions ✅
   - Add metadata to each action ✅
   - Update action tests ✅

3. **Phase 3: Special Cases** ✅
   - Implement multi-sense examining ✅
   - Implement hearing-based commands ✅
   - Implement smell-based commands ✅

4. **Phase 4: Testing** ✅
   - Create integration tests ✅
   - Fix skipped tests ✅
   - Verify darkness handling ✅

5. **Phase 5: Entity Resolution Improvements** ✅
   - Fix fuzzy matching issues ✅
   - Fix door connection logic ✅
   - Fix action metadata structures ✅
   - Fix scope filtering for AUDIBLE/DETECTABLE ✅

## Notes

- Some actions like `smelling` currently check `canSee` when they should check `canSmell`
- `listening` checks visibility when it should work with hearing
- Many actions duplicate the same scope checking logic
- Centralization will make it easier to add new senses or modify scope rules