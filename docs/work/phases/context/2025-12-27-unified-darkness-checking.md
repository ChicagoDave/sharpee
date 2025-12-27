# Work Summary: Unified Darkness Checking (ADR-068)

**Date**: 2025-12-27
**Duration**: ~1.5 hours
**Branch**: phase4
**Commits**: `9ee1ccc`, `8333b5f`

## Objective

Implement ADR-068 to create a single source of truth for darkness checking, fixing inconsistencies discovered during Cloak of Darkness testing.

## What Was Accomplished

### ADR Written
- Created `docs/architecture/adrs/adr-068-unified-darkness-checking.md`
- Documents 10 light scenarios that must work correctly
- Specifies `VisibilityBehavior.isDark()` as single source of truth

### Core Implementation

#### VisibilityBehavior.ts
- Added public `isDark(room, world)` method
- Added private `isLightActive(entity)` method with fallback logic:
  1. Explicit `isLit` property (true/false)
  2. Switchable trait state (`isOn`)
  3. Default to lit (for glowing gems, etc.)
- Updated `hasLightSource()` to use `isLightActive()` and include worn items

#### LightSourceTrait.ts
- Changed `isLit: boolean = false` to `isLit?: boolean`
- Now `undefined` means "use fallback logic"

#### LightSourceBehavior.ts
- Updated `isLit()` method to use same priority logic as `isLightActive()`
- Now checks switchable trait and defaults to lit when `isLit` undefined

#### looking-data.ts
- Simplified `checkIfDark()` from 45 lines to 4 lines
- Now delegates to `VisibilityBehavior.isDark()`

#### going.ts
- Removed dead code: `isDarkRoom()` and `hasLightInRoom()` functions
- Removed unused imports: `RoomTrait`, `LightSourceBehavior`

### Tests Added
- 15 new tests in `visibility-behavior.test.ts` for `isDark()` method
- All 10 light scenarios from ADR-068 covered
- Edge cases: isLit precedence, transparent closed containers

## Test Results

- **visibility-behavior.test.ts**: 47 tests pass
- **looking-golden.test.ts**: 20 tests pass
- Builds succeed for world-model and stdlib

## Key Decisions

### 1. Make isLit Optional
Changed `LightSourceTrait.isLit` from `boolean = false` to `boolean | undefined` to enable the fallback logic chain.

### 2. Unified Priority Order
All light detection uses the same priority:
1. Explicit isLit (author-defined state)
2. Switchable isOn (for devices like flashlights)
3. Default to lit (for inherently glowing objects)

### 3. Transparent Containers Allow Light
Light inside a transparent closed container DOES provide illumination (glass box with candle inside still lights the room).

## Files Modified

```
packages/world-model/src/world/VisibilityBehavior.ts
packages/world-model/src/traits/light-source/lightSourceTrait.ts
packages/world-model/src/traits/light-source/lightSourceBehavior.ts
packages/world-model/tests/unit/world/visibility-behavior.test.ts
packages/stdlib/src/actions/standard/looking/looking-data.ts
packages/stdlib/src/actions/standard/going/going.ts
docs/architecture/adrs/adr-068-unified-darkness-checking.md
```

## Issues Fixed

From `darkness-system-issues.md`:
- Issue 1: requiresLight → isDark ✅ (previous session)
- Issue 5: Inconsistent darkness checking ✅ (this session)

## Next Steps

1. Test full Cloak of Darkness losing path
2. Verify winning path still works
3. Consider documenting the new light detection priority in developer docs

## Git Status

Branch: `phase4`
Commits:
- `9ee1ccc`: fix(looking): Use correct isDark property
- `8333b5f`: feat(visibility): Unified darkness checking system (ADR-068)
