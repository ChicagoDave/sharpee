# Work Summary: EnterableTrait Design & sharedData Fix

**Date**: 2026-01-07
**Branch**: dungeo

## Completed

### 1. CapabilityBehavior sharedData (ADR-090 polish)

Added `sharedData` parameter to `CapabilityBehavior` interface, matching stdlib action pattern:

- **world-model**: Added `CapabilitySharedData` type, updated all 4 methods (validate, execute, report, blocked)
- **stdlib**: Updated `capability-dispatch.ts` to create and pass sharedData
- **dungeo**: Updated basket elevator behaviors to use `sharedData.playerTransported` instead of `(entity as any)._lastMoveTransportedPlayer` hack

This fixes the "temp flag hack" issue from the ADR-090 review.

### 2. Merged dispatch branch to main

- Created PR #47 for ADR-090 capability dispatch
- Merged to main
- Merged main into dungeo branch

### 3. EnterableTrait Design

Discovered that "enter basket" doesn't work because:
- Grammar uses `.matching({ enterable: true })` which checks entity properties
- `ContainerTrait.enterable` is not exposed to the entity
- Design mixes containment and enterability concerns

**Solution**: Create `EnterableTrait` as a separate composable trait.

Design doc written to `docs/work/dungeo/enterable-trait.md` with:
- EnterableTrait definition (marker trait with optional preposition)
- Entity getter `IFEntity.enterable` for grammar matching
- Compositional usage pattern
- Backwards compatibility approach
- Migration path

## Files Changed

- `packages/world-model/src/capabilities/capability-behavior.ts` - sharedData param
- `packages/world-model/src/capabilities/index.ts` - export CapabilitySharedData
- `packages/stdlib/src/actions/capability-dispatch.ts` - pass sharedData
- `stories/dungeo/src/traits/basket-elevator-behaviors.ts` - use sharedData
- `packages/world-model/tests/unit/capabilities/capability-dispatch.test.ts` - updated tests
- `docs/work/dispatch/review.md` - marked issues as fixed
- `docs/work/dungeo/enterable-trait.md` - new design doc

## Completed (continued)

### 4. EnterableTrait Implementation

Implemented the full EnterableTrait:

**world-model changes:**
- Created `src/traits/enterable/enterableTrait.ts` with `preposition` config ('in' | 'on')
- Added `ENTERABLE` to TraitType enum
- Added `enterable` getter to IFEntity (line 312)
- Updated `all-traits.ts`, `implementations.ts`, `index.ts` exports

**stdlib changes:**
- Updated `entering.ts` to check EnterableTrait first, then fall back to legacy

**dungeo changes:**
- Added `EnterableTrait()` to basket
- Added `EnterableTrait()` to bucket
- Added `EnterableTrait()` to balloon

**Final Design:** EnterableTrait is the single source of truth for enterability.
- Removed legacy fallbacks to ContainerTrait.enterable/SupporterTrait.enterable
- Removed capacity checks from entering action - capacity is author responsibility
- Clean, simple validation: has EnterableTrait? is open (if openable)? done.

## Test Status

- Build: passing
- 45 transcript tests: 739 tests, 734 passed, 5 expected failures (unchanged)
