# Parser Refactor Plan: Trait-Based Semantic Constraints

**Date**: 2026-01-10
**Status**: In Progress
**Branch**: parser-refactor

## Problem Statement

The parser conflates two separate concerns:

1. **Scope** (visibility/reachability) - determined by world state
2. **Semantic constraints** (what kind of entity) - declared by grammar

Currently, grammar patterns like this mix both:
```typescript
grammar
  .define('board :vehicle')
  .where('vehicle', (scope) => scope.visible().matching({ enterable: true }))
  .mapsTo('if.action.entering')
```

This is wrong because:
- Grammar declares `.visible()` - but parser should determine visibility from world state
- `.matching({ enterable: true })` checks `entity.enterable` property - but entities have **traits**, not boolean properties
- The boat has `VehicleTrait` but `entity.enterable` may be undefined

## Desired Architecture

### Core Principle: Separation of Concerns

**CRITICAL**: Grammar and parser handle pattern matching and semantic constraints. Scope (AWARE/VISIBLE/REACHABLE/CARRIED) is ALWAYS handled by action validation.

| Layer | Responsibility | Examples |
|-------|---------------|----------|
| **Grammar** | Pattern → Action mapping | `board :target` → `if.action.entering` |
| **Grammar** | Semantic constraints (traits) | `.hasTrait(TraitType.CONTAINER)` |
| **Parser** | Entity resolution, disambiguation | Find entities matching traits |
| **Action validate()** | Scope validation (dynamic) | Check VISIBLE/REACHABLE/CARRIED |
| **Action blocked()** | Scope failure messages | "You can't see that" / "Too far away" |

**Grammar NEVER declares:**
- `.visible()` - handled by action validation
- `.touchable()` / `.reachable()` - handled by action validation
- `.carried()` - handled by action validation
- `.matching({ portable: true })` - SceneryTrait handles acquisition blocking

### Scope Handling in Actions (Design Decision)

**Key Insight**: Scope requirements can be **dynamic** based on context (instruments, magic, environmental conditions). A static declarative approach is too limiting for a dynamic world model.

**Solution**: `defaultScope` metadata + dynamic override in `validate()`:

```typescript
const switchingOnAction: Action = {
  id: 'if.action.switching_on',

  // Default scope - documents intent, used for parser hints
  defaultScope: {
    target: ScopeLevel.REACHABLE
  },

  validate(context) {
    // Can compute effective scope dynamically
    const effectiveScope = context.target.has(TraitType.REMOTE_CONTROLLABLE)
      ? ScopeLevel.VISIBLE
      : ScopeLevel.REACHABLE;

    // Helper returns scope error if check fails
    const scopeCheck = context.requireScope('target', effectiveScope);
    if (!scopeCheck.ok) return scopeCheck.error;

    // Action-specific validation
    if (!context.target.has(TraitType.SWITCHABLE)) {
      return error('NOT_SWITCHABLE');
    }

    return success();
  },

  blocked(context, error) {
    // Handles both scope errors and action-specific errors
    if (error.type === 'SCOPE_NOT_VISIBLE') {
      return effects.say("You can't see any such thing.");
    }
    if (error.type === 'SCOPE_NOT_REACHABLE') {
      return effects.say("That's too far away.");
    }
    // ... action-specific errors
  }
}
```

**Dynamic scope scenarios this supports:**

| Scenario | Normal Scope | Dynamic Scope | Trigger |
|----------|--------------|---------------|---------|
| Remote control | REACHABLE | VISIBLE | Target has RemoteControllableTrait |
| Pole/hook tool | REACHABLE | VISIBLE | Using instrument |
| Ranged weapon | REACHABLE | VISIBLE | Weapon type |
| Telepathy | REACHABLE | AWARE | Player has telepathy |
| Darkness | VISIBLE | REACHABLE (touch) | Room is dark |

**Benefits:**
- `defaultScope` documents intent and helps parser with entity resolution
- `validate()` has full control to compute effective scope dynamically
- `context.requireScope()` helper keeps scope checks clean and consistent
- `blocked()` handles all failure cases uniformly
- No new phase needed - stays 4-phase pattern

### Scope Levels (4 tiers)

| Scope Level | What It Means | Example Actions | Check |
|-------------|---------------|-----------------|-------|
| AWARE | Player knows entity exists | think about, remember, ask about | `world.getEntitiesInScope()` |
| VISIBLE | Player can see it | examine, look at, read | `world.getVisibleEntities()` |
| REACHABLE | Player can touch it | take, push, board, open, touch | `world.getTouchableEntities()` |
| CARRIED | In player's inventory | drop, eat, wear, insert, give | inventory check |

### SceneryTrait: Core Platform Mechanism

Objects are **portable by default**. SceneryTrait marks objects as NOT acquirable:

```typescript
// SceneryTrait blocking is checked in action validate(), not grammar
takingAction.validate(context) {
  const scopeCheck = context.requireScope('target', ScopeLevel.REACHABLE);
  if (!scopeCheck.ok) return scopeCheck.error;

  if (target.has(TraitType.SCENERY)) {
    return error('SCENERY_BLOCKED');
  }
  // ... other validation
}
```

---

## Implementation Progress

### ✅ Phase 1: Add `.hasTrait()` to Grammar API (COMPLETE)

**Added direct `.hasTrait(slot, traitType)` method to builders:**
- Added `hasTrait(slot: string, traitType: string): PatternBuilder` to PatternBuilder interface
- Added `hasTrait(slot: string, traitType: string): ActionGrammarBuilder` to ActionGrammarBuilder interface
- Added `traitFilters?: string[]` to SlotConstraint interface
- Implemented in `packages/if-domain/src/grammar/grammar-engine.ts`

**New simplified grammar syntax:**
```typescript
// Before (callback-based)
grammar.define('open :door')
  .where('door', (scope) => scope.hasTrait(TraitType.OPENABLE))
  .mapsTo('if.action.opening')
  .build();

// After (direct API)
grammar.define('open :door')
  .hasTrait('door', TraitType.OPENABLE)
  .mapsTo('if.action.opening')
  .build();
```

### ✅ Phase 2: Update ScopeEvaluator for Trait Filtering (COMPLETE)

- Added trait filtering logic to `packages/parser-en-us/src/scope-evaluator.ts`
- Added `entityHasTrait()` helper method

### ✅ Phase 3: Remove Scope Filters from Grammar (COMPLETE)

**Removed from `packages/parser-en-us/src/grammar.ts`:**
- `.visible()` - removed from ~25 patterns
- `.touchable()` - removed from ~15 patterns
- `.carried()` - removed from ~10 patterns
- `.matching({ portable: true })` - removed from 3 patterns
- Removed `ScopeBuilder` import (no longer needed)
- `.matching({ locked: true })` - removed (state check)
- `.matching({ open: false })` - removed (state check)

**Kept trait constraints:**
- `.hasTrait(TraitType.CONTAINER)`
- `.hasTrait(TraitType.SUPPORTER)`
- `.hasTrait(TraitType.OPENABLE)`
- `.hasTrait(TraitType.SWITCHABLE)`
- `.hasTrait(TraitType.ENTERABLE)`
- `.hasTrait(TraitType.ACTOR)`

### ✅ Phase 4: Add Scope Checking to Actions (COMPLETE)

**Goal**: Add `defaultScope` and `context.requireScope()` to action framework.

**Completed:**
1. Updated `ScopeLevel` enum to use ordered numeric values:
   - `UNAWARE = 0` - Entity not known to player
   - `AWARE = 1` - Player knows it exists (can hear/smell)
   - `VISIBLE = 2` - Player can see it
   - `REACHABLE = 3` - Player can touch it
   - `CARRIED = 4` - In player's inventory
2. Added `ScopeCheckResult` type and `ScopeErrors` constants
3. Added `defaultScope` property to `Action` interface
4. Added scope methods to `ActionContext`:
   - `getEntityScope(entity)` - returns ScopeLevel
   - `getSlotScope(slot)` - returns ScopeLevel for entity in command slot
   - `requireScope(entity, required)` - returns ScopeCheckResult
   - `requireSlotScope(slot, required)` - convenience method for slots
5. Updated `taking` action as test case with scope checking
6. Updated all tests and actions that used old scope values
7. **Updated all stdlib actions with `defaultScope` and `requireScope()` in validate()**

**Actions updated (24 total):**
- VISIBLE scope: examining, reading
- REACHABLE scope: opening, closing, entering, pushing, pulling, touching, searching, locking, unlocking, switching_on, switching_off, eating, drinking, wearing
- CARRIED scope: dropping, taking_off, inserting, putting, giving, showing, throwing
- Two-slot actions: inserting (item: CARRIED, container: REACHABLE), putting (item: CARRIED, target: REACHABLE), removing (item: REACHABLE, source: REACHABLE), locking/unlocking (target: REACHABLE, key: CARRIED), giving (item: CARRIED, recipient: REACHABLE), showing (item: CARRIED, viewer: VISIBLE), throwing (item: CARRIED, target: VISIBLE)

**Files modified:**
- `packages/stdlib/src/scope/types.ts` - Updated ScopeLevel enum
- `packages/stdlib/src/scope/scope-resolver.ts` - Updated to return numeric values
- `packages/stdlib/src/actions/enhanced-types.ts` - Added types and defaultScope
- `packages/stdlib/src/actions/enhanced-context.ts` - Added scope methods
- `packages/stdlib/src/actions/standard/*/` - All 24 actions updated with defaultScope and requireScope
- `packages/stdlib/src/validation/command-validator.ts` - Updated for new ScopeLevel

**Remaining (future work):**
- Add scope error messages to lang-en-us (Phase 5 will address localized messages)

**Scope requirements by action:**

```typescript
// AWARE - mental/social actions
'if.action.thinking_about': { target: ScopeLevel.AWARE }
'if.action.remembering': { target: ScopeLevel.AWARE }

// VISIBLE - perception actions
'if.action.examining': { target: ScopeLevel.VISIBLE }
'if.action.reading': { target: ScopeLevel.VISIBLE }

// REACHABLE - physical interaction
'if.action.taking': { target: ScopeLevel.REACHABLE }
'if.action.entering': { target: ScopeLevel.REACHABLE }
'if.action.pushing': { target: ScopeLevel.REACHABLE }
'if.action.opening': { target: ScopeLevel.REACHABLE }
'if.action.touching': { target: ScopeLevel.REACHABLE }

// CARRIED - inventory actions
'if.action.dropping': { item: ScopeLevel.CARRIED }
'if.action.eating': { item: ScopeLevel.CARRIED }
'if.action.wearing': { item: ScopeLevel.CARRIED }
'if.action.inserting': { item: ScopeLevel.CARRIED }
'if.action.giving': { item: ScopeLevel.CARRIED }
```

### ✅ Phase 5: Add Disambiguation Support (COMPLETE)

**Goal**: When multiple entities match, auto-select by score or prompt user.

**Completed:**
1. ✅ Added `entity.scope(actionId, priority?)` method to IFEntity
   - Default priority is 100
   - Higher = preferred, lower = deprioritized
   - Persisted in toJSON/fromJSON
2. ✅ Updated CommandValidator scoring to use scope priorities
   - Reads `entity.scope(actionId)` during entity scoring
   - Converts to bonus: (priority - 100) / 10 (so 150 → +5, 50 → -5)
3. ✅ Added `AMBIGUOUS_ENTITY` error code for multiple matches
   - Distinct from `ENTITY_NOT_FOUND`
   - Includes list of candidate entities for disambiguation prompt
4. ✅ Fixed modifier extraction from parser output
   - Parser wasn't populating `modifiers` field
   - Added fallback: extract modifiers by comparing text to head noun
5. ✅ Smart disambiguation: ENTITY_NOT_FOUND when modifier doesn't match any entity
6. ✅ Added `disambiguation_required` debug event (emitted when multiple matches)
7. ✅ Implemented `resolveWithSelection()` for re-resolving after user selection
   - Takes command + entity selections map (slot -> entityId)
   - Bypasses normal resolution for specified slots
   - Still validates scope constraints on selected entities
8. ✅ Added 11 tests for `entity.scope()` disambiguation priority
9. ✅ Added 6 tests for `resolveWithSelection()` method

**Author-controlled scoring:**
```typescript
apple.scope('if.action.eating', 150);      // prefer real apple
waxApple.scope('if.action.eating', 50);    // deprioritize wax apple
```

**Disambiguation API:**
```typescript
// When validate() returns AMBIGUOUS_ENTITY error with choices:
const result = validator.validate(command);
if (!result.success && result.error.code === 'AMBIGUOUS_ENTITY') {
  // UI presents choices to user
  const choices = result.error.details.ambiguousEntities;
  // User selects one...

  // Re-resolve with explicit selection
  const selectedId = choices[userChoice].id;
  const finalResult = validator.resolveWithSelection(command, {
    directObject: selectedId
  });
}
```

### ✅ Author-Controlled Scope Additions (COMPLETE)

Allow authors to add entities to scope regardless of spatial location:

```typescript
// Always visible everywhere
sky.setMinimumScope(ScopeLevel.VISIBLE);

// Visible only from specific rooms
mountain.setMinimumScope(ScopeLevel.VISIBLE, ['overlook', 'trail']);

// Butterfly fluttering in garden area - reachable but may escape
butterfly.setMinimumScope(ScopeLevel.REACHABLE, ['garden', 'meadow']);

// Ambient sound - always audible
ticking.setMinimumScope(ScopeLevel.AWARE, ['hallway', 'study']);
```

**Implementation (Complete):**
1. ✅ Added `minimumScopes: Map<string, number>` to IFEntity ('*' for all rooms)
2. ✅ Added `setMinimumScope(level, rooms?)` and `clearMinimumScope(rooms?)` methods
3. ✅ Added `getMinimumScope(roomId)` for ScopeResolver to use
4. ✅ Updated `ScopeResolver.getScope()` to return max(physical, minimum)
5. ✅ Updated `getVisible()`, `getReachable()`, `getAudible()` to include minimum scope entities
6. ✅ Serialize/deserialize in clone/toJSON/fromJSON

**Use cases:**
- Ambient scenery (sky, floor, walls)
- Distant visible objects (mountains, towers)
- Roaming creatures (butterfly, cat)
- Sounds and smells
- Player body parts

**Disambiguation flow:**
1. Multiple entities match after trait filtering
2. Sort by `entity.scope(actionId)` score (higher first)
3. If top score significantly higher than second → auto-select
4. Otherwise, return `AMBIGUOUS_ENTITY` error with choices
5. UI can prompt user: "Do you mean the red apple or the wax apple?"
6. Re-resolve with explicit entity ID

### ✅ Phase 6: Add Implicit Takes (COMPLETE)

**Goal**: Auto-take items when needed for an action.

**Event**: `if.event.implicit_take` (distinct from regular `if.event.taken`)

**Implementation:**

1. ✅ Added `ImplicitTakeResult` type to enhanced-types.ts
2. ✅ Added `requireCarriedOrImplicitTake(entity)` method to ActionContext interface
3. ✅ Implemented in enhanced-context.ts:
   - If already carried → success, no implicit take
   - If not reachable → return scope error
   - If scenery/room → return fixed_in_place error
   - If reachable and takeable → run taking action internally
   - If take succeeds → return success with events
   - If take fails → return take's error
4. ✅ Added `ImplicitTakeEventData` type and registered `if.event.implicit_take` event
5. ✅ Added 12 tests for implicit take functionality
6. ✅ Updated `putting` action to use `requireCarriedOrImplicitTake`

**Usage:**
```typescript
// In action's validate():
const carryCheck = context.requireCarriedOrImplicitTake(item);
if (!carryCheck.ok) {
  return carryCheck.error!;
}
// If implicit take happened, events are stored in context.sharedData.implicitTakeEvents

// In action's report():
const events: ISemanticEvent[] = [];
if (context.sharedData.implicitTakeEvents) {
  events.push(...context.sharedData.implicitTakeEvents);
}
// ... add main action events
```

**Actions that support implicit takes:**
- ✅ `putting` - reference implementation (single-object path)
- ✅ `inserting` - fixed context forwarding to preserve implicit take events from putting
- ✅ `giving` - added requireCarriedOrImplicitTake check
- ✅ `showing` - added requireCarriedOrImplicitTake check
- ✅ `throwing` - added requireCarriedOrImplicitTake check
- ✅ `wearing` - replaced incomplete implicit take logic with proper implementation

**Files modified:**
- `packages/stdlib/src/actions/enhanced-types.ts` - Added ImplicitTakeResult type
- `packages/stdlib/src/actions/enhanced-context.ts` - Implemented requireCarriedOrImplicitTake
- `packages/stdlib/src/actions/context.ts` - Added stub for deprecated class
- `packages/stdlib/src/events/event-registry.ts` - Added ImplicitTakeEventData type
- `packages/stdlib/src/actions/standard/putting/putting.ts` - Uses requireCarriedOrImplicitTake
- `packages/stdlib/src/actions/standard/inserting/inserting.ts` - Fixed context forwarding for implicit takes
- `packages/stdlib/src/actions/standard/giving/giving.ts` - Added implicit take support
- `packages/stdlib/src/actions/standard/showing/showing.ts` - Added implicit take support
- `packages/stdlib/src/actions/standard/throwing/throwing.ts` - Added implicit take support
- `packages/stdlib/src/actions/standard/wearing/wearing.ts` - Replaced incomplete implicit take with proper implementation
- `packages/stdlib/tests/unit/actions/implicit-take.test.ts` - 12 new tests
- `packages/stdlib/tests/unit/actions/wearing-golden.test.ts` - Updated test for new event format

---

## Design Decisions

### Q1: Separate scope() phase vs scope in validate()?

**Decision**: No separate phase. Use `defaultScope` metadata + dynamic check in `validate()`.

**Rationale**:
- Scope requirements can be dynamic (instruments, magic, environmental conditions)
- Static declarative-only approach is too limiting for dynamic world model
- `validate()` already checks preconditions - scope is just another precondition
- `context.requireScope()` helper keeps code clean and consistent

### Q2: Should ENTERABLE and VEHICLE be separate traits?

**Decision**: VehicleTrait inherently includes enterable capability.

**Rationale**: User confirmed vehicles are enterable by definition. No need for separate EnterableTrait on vehicles.

### Q3: How should "examine" work - visible or touchable scope?

**Decision**: VISIBLE by default, with sensory cascade fallback.

**Rationale**: User specified examine should try: see → feel → hear → smell → fail. This is handled in action validate() with dynamic scope.

### Q4: Should disambiguation limit to N options?

**Decision**: No limit - author's responsibility.

**Rationale**: User stated "if an author is dumb enough to make you sift through 99 shades of red balloons, that's on them."

---

## Files Modified (Complete)

| File | Change |
|------|--------|
| `packages/if-domain/src/grammar/grammar-builder.ts` | Added hasTrait() to ScopeBuilder |
| `packages/if-domain/src/grammar/scope-builder.ts` | Added traitFilters, implemented hasTrait() |
| `packages/parser-en-us/src/scope-evaluator.ts` | Added trait filtering logic |
| `packages/parser-en-us/src/grammar.ts` | Removed all scope filters (~50 patterns) |
| `packages/parser-en-us/tests/grammar-scope.test.ts` | Updated for new architecture |
| `packages/parser-en-us/tests/grammar-scope-cross-location.test.ts` | Updated for new architecture |

## Files to Modify (Phase 4)

| File | Changes |
|------|---------|
| `packages/stdlib/src/actions/action-types.ts` | Add `defaultScope` to Action interface |
| `packages/stdlib/src/actions/action-context.ts` | Add `requireScope()` helper |
| `packages/stdlib/src/actions/standard/*` | Update validate() methods |
| `packages/world-model/src/scope/scope-level.ts` | Add ScopeLevel enum |

---

## Test Results

**Parser tests:** 266 passed, 4 skipped
**stdlib tests:** Pre-existing failures (21 failures unrelated to grammar changes)

---

## Running Tests

```bash
# Parser unit tests
pnpm --filter '@sharpee/parser-en-us' test

# stdlib tests
pnpm --filter '@sharpee/stdlib' test

# Integration tests
node packages/transcript-tester/dist/cli.js stories/dungeo --all

# Interactive testing
./scripts/play-dungeo.sh
```
