# Work Summary: VehicleTrait Investigation

**Date**: 2026-01-03 18:30
**Branch**: vehicle-trait
**Status**: Paused for architecture discussion

## What Was Attempted

Tried to implement VehicleTrait for the bucket/well counterweight puzzle in Dungeo. The bucket should be:
1. An enterable container (ContainerTrait with enterable: true)
2. A vehicle that blocks walking (VehicleTrait)
3. Able to move between rooms, taking its contents (including player) with it

## What Works

1. **World-model level composition works** - Created test file `packages/world-model/tests/unit/traits/vehicle-composition.test.ts` with scenarios for boat, elevator, tram. 11/14 tests pass (3 fail due to import issues, not logic).

2. **Entity containment works** - When you move an entity that contains other entities, the contents stay inside. No special "vehicle movement" code needed.

3. **VehicleTrait + ContainerTrait can coexist** - Both traits can be added to the same entity.

## What Doesn't Work

**"enter bucket" fails with INVALID_SYNTAX**

Despite the bucket being:
- Visible (examine works)
- Having ContainerTrait with `enterable: true`
- Having VehicleTrait

The grammar `enter :portal` with `.matching({ enterable: true })` doesn't find the bucket.

## Root Cause Analysis

The ScopeEvaluator in parser-en-us has `matchesFilter()` that checks for property constraints like `{ enterable: true }`. However:

1. The original code only checks `entity[key]` (direct entity property)
2. `enterable` lives on ContainerTrait, not the entity itself
3. I wrote a fix (`getPropertyValue()`) to check trait properties, but:
   - Debug logging in that code NEVER fires
   - This suggests the semantic grammar path isn't being used at all

## Key Discovery

The semantic grammar definitions (`enter :portal` with `.where()` constraints) may not be what's actually parsing "enter bucket". The parsing might be going through a different code path that doesn't use ScopeEvaluator.

## Architecture Questions for Discussion

1. **Traits vs Behaviors**: When you add a trait to an entity, behaviors are NOT attached. They're just static utility classes that code must explicitly call. Should behaviors be auto-registered?

2. **Scope Constraints vs Behaviors**: Grammar scope constraints like `{ enterable: true }` check properties directly. Should they instead call behavior methods like `ContainerBehavior.isEnterable()`?

3. **VehicleTrait Design**: Currently a "marker" trait with no `enterable`. Should vehicles imply enterable? Should VehicleTrait extend container capabilities?

4. **Which Grammar System?**: There are multiple grammar definition systems:
   - `semantic-core-grammar.ts` - Defines `enter :portal` with scope constraints
   - `semantic-grammar-rules.ts` - More semantic rules
   - `lang-en-us/actions/entering.ts` - Patterns like `enter [something]`

   Which one actually parses commands?

## Files Changed (uncommitted)

```
packages/world-model/src/traits/vehicle/vehicleTrait.ts - Simplified design
packages/world-model/src/traits/vehicle/vehicleBehavior.ts - Import fix
packages/world-model/src/index.ts - Export vehicle
packages/stdlib/src/actions/standard/going/going.ts - Vehicle blocking
packages/lang-en-us/src/actions/going.ts - Vehicle messages
scripts/bundle-entry.js - Direct paths instead of symlinks
```

## Files Created

```
docs/work/dungeo/context/2026-01-03-1600-vehicle-trait-refactor.md
docs/work/dungeo/context/2026-01-03-1800-trait-behavior-architecture-analysis.md
packages/world-model/tests/unit/traits/vehicle-composition.test.ts
stories/dungeo/tests/transcripts/bucket-well.transcript
```

## Next Steps (After Discussion)

1. Determine which grammar system is authoritative
2. Decide if scope constraints should use behaviors
3. Decide if VehicleTrait design is correct
4. Fix the actual parsing path for "enter bucket"

## Commands to Resume

```bash
# Run vehicle composition tests
pnpm --filter '@sharpee/world-model' test vehicle-composition

# Run bucket-well transcript (will fail)
./scripts/fast-transcript-test.sh stories/dungeo stories/dungeo/tests/transcripts/bucket-well.transcript
```
