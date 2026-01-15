# Work Summary: Grammar .hasTrait() API Implementation and Engine ActionContext Fix

**Date**: 2026-01-10
**Duration**: ~4 hours
**Feature/Area**: Parser Refactor - Trait-based semantic constraints
**Branch**: parser-refactor → main → dungeo

## Objective

Complete the implementation of direct `.hasTrait()` API for grammar builders, eliminating the callback-based `.where()` pattern for trait filtering. This is Phase 1 of the larger parser refactor that separates grammar (pattern matching + semantic constraints) from scope (world state validation).

## What Was Accomplished

### 1. Grammar API Enhancement (Phase 1 Complete)

#### Files Created/Modified
- `packages/if-domain/src/grammar/grammar-builder.ts` - Added `.hasTrait()` to PatternBuilder interface
- `packages/if-domain/src/grammar/grammar-builder.ts` - Added `.hasTrait()` to ActionGrammarBuilder interface
- `packages/if-domain/src/grammar/scope-builder.ts` - Added `traitFilters?: string[]` to SlotConstraint interface
- `packages/if-domain/src/grammar/grammar-engine.ts` - Implemented `.hasTrait()` method in both builders

#### New Simplified API
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

**Benefits:**
- Cleaner, more declarative syntax
- No need to import ScopeBuilder in grammar files
- Consistent with `.forAction()` API style
- Trait filters are now metadata in SlotConstraint, not runtime callbacks

### 2. Grammar Patterns Updated (~22 patterns)

Updated all grammar patterns in `packages/parser-en-us/src/grammar.ts` to use the new `.hasTrait()` API:

**Container patterns:**
```typescript
// PUT :item IN :container
.hasTrait('container', TraitType.CONTAINER)

// INSERT :item INTO :container
.hasTrait('container', TraitType.CONTAINER)
```

**Supporter patterns:**
```typescript
// PUT :item ON :supporter
.hasTrait('supporter', TraitType.SUPPORTER)
```

**Openable patterns:**
```typescript
// OPEN :target, CLOSE :target
.hasTrait('target', TraitType.OPENABLE)
```

**Switchable patterns:**
```typescript
// SWITCH ON :device, SWITCH OFF :device
.hasTrait('device', TraitType.SWITCHABLE)
```

**Lockable patterns:**
```typescript
// LOCK :target WITH :key
.hasTrait('target', TraitType.LOCKABLE)

// UNLOCK :target WITH :key
.hasTrait('target', TraitType.LOCKABLE)
```

**Enterable patterns:**
```typescript
// BOARD :vehicle, ENTER :target, GET IN :vehicle
.hasTrait('target', TraitType.ENTERABLE)
.hasTrait('vehicle', TraitType.ENTERABLE)
```

**Actor patterns:**
```typescript
// GIVE :item TO :recipient, SHOW :item TO :viewer
.hasTrait('recipient', TraitType.ACTOR)
.hasTrait('viewer', TraitType.ACTOR)
```

**Code cleanup:**
- Removed `ScopeBuilder` import from grammar.ts (no longer needed)
- All ~22 patterns now use consistent `.hasTrait()` syntax
- Grammar file is now purely declarative - no runtime callbacks

### 3. Engine ActionContext Fix (Critical Bug Fix)

#### Problem Discovered
While testing Dungeo transcripts, discovered that `action-context-factory.ts` was missing implementations for new scope methods added in Phase 4 of the refactor:
- `getEntityScope(entity)`
- `getSlotScope(slot)`
- `requireScope(entity, required)`
- `requireSlotScope(slot, required)`
- `requireCarriedOrImplicitTake(entity)`

This caused runtime errors when stdlib actions called `context.requireScope()`.

#### Fix Applied
**File**: `packages/engine/src/action-context-factory.ts`

Implemented all missing scope methods:

```typescript
getEntityScope(entity: IEntity): ScopeLevel {
  return this.scopeResolver.getScope(
    entity.id,
    this.world.getPlayerLocation()!
  );
}

getSlotScope(slot: string): ScopeLevel {
  const entity = this.entities[slot];
  if (!entity) {
    throw new Error(`No entity found for slot: ${slot}`);
  }
  return this.getEntityScope(entity);
}

requireScope(entity: IEntity, required: ScopeLevel): ScopeCheckResult {
  const actual = this.getEntityScope(entity);
  if (actual >= required) {
    return { ok: true };
  }
  // Return appropriate scope error based on required level
  // ... error handling logic
}

requireSlotScope(slot: string, required: ScopeLevel): ScopeCheckResult {
  const entity = this.entities[slot];
  if (!entity) {
    throw new Error(`No entity found for slot: ${slot}`);
  }
  return this.requireScope(entity, required);
}

requireCarriedOrImplicitTake(entity: IEntity): ImplicitTakeResult {
  // Complex logic for implicit take support
  // ... implementation matches enhanced-context.ts
}
```

**Also fixed:**
- Updated `ScopeLevel.OUT_OF_SCOPE` references to `ScopeLevel.UNAWARE` (enum was renamed in Phase 4)
- Added missing imports for `ImplicitTakeResult`, `ScopeCheckResult`

### 4. Pull Request and Merge

**PR #49**: Parser Refactor - `.hasTrait()` API
- Created PR from parser-refactor branch
- Merged to main after verification
- Updated dungeo branch with merged changes

**Commits:**
- `d3356b5` - feat(grammar): Add direct .hasTrait() API to PatternBuilder and ActionGrammarBuilder
- `785857c` - Merge pull request #49 from ChicagoDave/parser-refactor
- `44966ee` - fix(engine): Implement new scope methods in ActionContext factory

### 5. Dungeo Testing and Bug Fixes

#### Transcript Tests
Ran transcript tests to verify parser refactor didn't break existing functionality:

```bash
node packages/transcript-tester/dist/cli.js stories/dungeo --all
```

**Results:**
- `navigation.transcript` - PASS
- `boat-inflate-deflate.transcript` - PASS (after fixes)
- Several other puzzle transcripts - PASS

#### Boat Puzzle Fixes

**File**: `stories/dungeo/tests/transcripts/boat-inflate-deflate.transcript`

**Problem**: Transcript started at Sandy Beach, but boat starts at Dam Base
**Fix**: Updated transcript to start at Dam Base

```transcript
# Before
> go to sandy beach

# After
> go to dam base
```

**File**: `stories/dungeo/src/regions/frigid-river.ts`

**Problem**: "examine river" not working at Shore and Sandy Beach
**Fix**: Added Frigid River as scenery object at both locations

```typescript
// Added scenery entity for river
const frigidRiverScenery = world.createEntity('frigid-river-scenery', 'object');
frigidRiverScenery
  .name('Frigid River', 'the frigid river')
  .description('The icy waters rush past with considerable force.')
  .addTrait(TraitType.SCENERY);

// Added to Shore room
world.moveEntity(frigidRiverScenery.id, shoreRoom.id);

// Added minimum scope for Sandy Beach visibility
frigidRiverScenery.setMinimumScope(ScopeLevel.VISIBLE, [sandyBeachRoom.id]);
```

**Key pattern used**: Minimum scope extension (from Phase 5) - river is visible from Sandy Beach even though it's "in" Shore room. This demonstrates the power of the new scope system.

## Key Decisions

### 1. Direct API vs Callback Pattern

**Decision**: Implement direct `.hasTrait(slot, traitType)` method instead of forcing callback pattern.

**Rationale**:
- Grammar should be declarative, not procedural
- Callbacks require importing ScopeBuilder into grammar files
- Direct API is more consistent with `.forAction()` style
- Trait filters stored as metadata, enabling better tooling/introspection

### 2. ActionContext Implementation Location

**Decision**: Implement scope methods in `action-context-factory.ts` (engine layer), not just in enhanced-context.ts (stdlib layer).

**Rationale**:
- Engine creates ActionContext instances via factory
- Stdlib's enhanced-context.ts is just type definitions
- All stdlib actions call `context.requireScope()` - must work at runtime
- Factory must implement all interface methods

### 3. ScopeLevel.OUT_OF_SCOPE → UNAWARE Rename

**Decision**: Consistently use `ScopeLevel.UNAWARE` (not OUT_OF_SCOPE).

**Rationale**:
- UNAWARE is more semantically accurate (player doesn't know entity exists)
- Matches 4-tier scope system: UNAWARE/AWARE/VISIBLE/REACHABLE/CARRIED
- OUT_OF_SCOPE was inconsistent with other level names
- Engine code was using old enum value, causing type errors

## Challenges & Solutions

### Challenge: Missing ActionContext Method Implementations

**Problem**: Running Dungeo tests revealed that `action-context-factory.ts` was missing all the new scope methods. This caused runtime errors when stdlib actions (opening, taking, etc.) called `context.requireScope()`.

**Root Cause**: Phase 4 added scope methods to ActionContext interface and enhanced-context.ts type definitions, but forgot to implement them in the actual factory that creates contexts at runtime.

**Solution**:
1. Implemented all five scope methods in action-context-factory.ts
2. Added proper error handling for scope failures
3. Implemented full implicit take logic to match enhanced-context.ts
4. Fixed ScopeLevel.OUT_OF_SCOPE references

**Lesson**: When adding methods to interfaces, always check ALL implementations, not just type definition files.

### Challenge: Frigid River Not Examinable

**Problem**: "examine river" didn't work at Shore or Sandy Beach, even though the river is a major feature.

**Root Cause**: River entity didn't exist in these rooms.

**Solution**: Created `frigid-river-scenery` entity and used minimum scope extension:
- Entity located in Shore room (physical location)
- Added `setMinimumScope(ScopeLevel.VISIBLE, [sandyBeachRoom.id])` to make it visible from Sandy Beach
- This demonstrates cross-location visibility without duplicating entities

**Design Pattern**: Use minimum scope for scenery that's visible from multiple locations but shouldn't be duplicated.

### Challenge: Boat Transcript Starting in Wrong Room

**Problem**: Transcript started at Sandy Beach, but boat is initialized at Dam Base.

**Solution**: Updated transcript to start at Dam Base. Simple fix, but important for test reliability.

**Lesson**: Transcripts should start in rooms where expected entities are located, or explicitly navigate there first.

## Code Quality

- ✅ All grammar patterns use consistent `.hasTrait()` API
- ✅ Parser tests passing (266 passed, 4 skipped)
- ✅ Dungeo navigation tests passing
- ✅ Boat puzzle tests passing
- ✅ TypeScript compilation successful
- ✅ No runtime errors in action context creation
- ✅ ScopeLevel enum usage consistent across codebase

## Testing Results

### Parser Unit Tests
```bash
pnpm --filter '@sharpee/parser-en-us' test
```
**Result**: 266 passed, 4 skipped

### Dungeo Transcript Tests
```bash
node packages/transcript-tester/dist/cli.js stories/dungeo --all
```
**Results**:
- navigation.transcript: PASS
- boat-inflate-deflate.transcript: PASS
- Several other puzzle transcripts: PASS

### Manual Testing
- Tested "examine river" at Shore and Sandy Beach - works correctly
- Tested boat inflation/deflation - works correctly
- Tested parser disambiguation - works correctly

## Next Steps

### Immediate (Parser Refactor)
1. [ ] Update Phase 4 documentation in refactor-plan.md to note engine fix
2. [ ] Consider adding tests for ActionContext scope methods in engine package
3. [ ] Review other transcript tests for similar starting location issues

### Future Work (Parser Refactor)
1. [ ] Phase 7: Remove deprecated `.where()` callback API entirely
2. [ ] Add language-layer scope error messages (currently using fallback strings)
3. [ ] Consider adding `.hasTraits()` (plural) for AND/OR combinations

### Dungeo Work
1. [ ] Complete boat/river puzzle implementation
   - Boat launch/land mechanics
   - River current behavior
   - Shore access from river
2. [ ] Add more transcript tests for other regions
3. [ ] Continue with wizard's quarters and rainbow puzzle

## References

- **Design Doc**: `docs/work/parser/refactor-plan.md` (Phases 1-6)
- **Plan Assessment**: `docs/work/parser/plan-assessment.md`
- **Scope Scenarios**: `docs/work/parser/scope-scenarios.md`
- **PR**: #49 - Parser Refactor `.hasTrait()` API
- **ADR-087**: Action-Centric Grammar
- **ADR-090**: Entity-Centric Action Dispatch

## Technical Notes

### .hasTrait() Implementation Details

The `.hasTrait()` method adds trait types to `SlotConstraint.traitFilters`:

```typescript
// In grammar-engine.ts
hasTrait(slot: string, traitType: string): this {
  const constraint = this.ensureSlotConstraint(slot);
  if (!constraint.traitFilters) {
    constraint.traitFilters = [];
  }
  constraint.traitFilters.push(traitType);
  return this;
}
```

The parser's `scope-evaluator.ts` reads these filters during entity resolution:

```typescript
// Check trait filters
if (constraint.traitFilters?.length) {
  for (const traitType of constraint.traitFilters) {
    if (!this.entityHasTrait(entity, traitType)) {
      return false;
    }
  }
}
```

This means:
- Trait filtering happens at parse time (grammar layer)
- Scope validation happens at action time (validate layer)
- Clean separation of concerns

### Minimum Scope Pattern

The Frigid River scenery demonstrates the minimum scope pattern:

```typescript
// Entity physically located in one room
world.moveEntity(frigidRiverScenery.id, shoreRoom.id);

// But visible from another room
frigidRiverScenery.setMinimumScope(ScopeLevel.VISIBLE, [sandyBeachRoom.id]);
```

When player is at Sandy Beach:
1. ScopeResolver checks physical scope → UNAWARE (entity in different room)
2. ScopeResolver checks minimum scope → VISIBLE (author override)
3. Returns max(UNAWARE, VISIBLE) = VISIBLE
4. Player can examine river from Sandy Beach

**Use cases**:
- Distant scenery (mountains, towers, sky)
- Flowing water (rivers visible from multiple banks)
- Ambient features (sounds, smells)
- Large objects spanning multiple rooms

## Statistics

**Lines of code changed**: ~300
**Files modified**: 8
**Grammar patterns updated**: ~22
**Tests passing**: 266 parser + Dungeo transcripts
**Commits**: 3 (grammar API, merge, engine fix)
**Duration**: ~4 hours

## Session Context

This session completed Phase 1 of the parser refactor and uncovered a critical bug in the engine's ActionContext factory. The fix ensures that all stdlib actions can use the new scope validation methods. The work also included practical testing via Dungeo transcripts, which revealed scenery gaps and transcript issues that were addressed.

The parser refactor is now ready for Phase 7 (deprecating old API) or can pause here while Dungeo work continues, as the core functionality is complete and tested.
