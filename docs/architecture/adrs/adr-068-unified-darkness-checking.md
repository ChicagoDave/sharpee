# ADR-068: Unified Darkness Checking

## Status
Accepted

## Context

Testing the Cloak of Darkness story revealed that darkness checking is implemented inconsistently across the codebase, leading to bugs and unpredictable behavior.

### Current Implementations

Three different places implement darkness checking:

1. **VisibilityBehavior.hasLightSource()** (world-model)
   - Uses recursive `getAllContents()`
   - Checks `isAccessible()` for closed containers
   - Only recognizes `isLit === true` (strict)
   - Private method, not reusable

2. **Looking action's checkIfDark()** (stdlib)
   - Uses non-recursive `getContents()`
   - No accessibility check for containers
   - Falls back to `SwitchableBehavior.isOn()` and defaults to lit
   - Duplicates logic instead of delegating

3. **Going action's isDarkRoom()** (stdlib)
   - Checks `roomTrait.isDark` only
   - No light source detection at all

### Problems Discovered

| Scenario | Looking | Visibility | Expected |
|----------|:-------:|:----------:|:--------:|
| Lit candle in open box | Fails | Works | Works |
| Lit candle in closed box | Works (wrong!) | Blocked | Blocked |
| Switchable flashlight (no isLit) | Works | Fails | Works |
| Glowing gem (inherent light) | Works | Fails | Works |
| Player wearing lit headlamp | Fails | Partial | Works |
| NPC carrying lantern | Fails | Works | Works |

### Root Cause

The `requiresLight` bug in looking-data.ts (now fixed) was symptomatic of a larger issue: no single source of truth for darkness checking. Each implementation made different assumptions and had different bugs.

## Decision

Create a public `isDark()` method in `VisibilityBehavior` as the single source of truth for darkness checking. All actions must delegate to this method instead of implementing their own logic.

### API Design

```typescript
// In VisibilityBehavior.ts
export class VisibilityBehavior extends Behavior {
  /**
   * Determines if a room is effectively dark (no usable light sources).
   * This is the single source of truth for darkness checking.
   *
   * @param room - The room entity to check
   * @param world - The world model
   * @returns true if the room is dark and has no accessible light sources
   */
  static isDark(room: IFEntity, world: WorldModel): boolean {
    const roomTrait = room.getTrait(TraitType.ROOM);
    if (!roomTrait || !(roomTrait as any).isDark) {
      return false; // Room isn't marked as dark
    }
    return !this.hasAccessibleLightSource(room, world);
  }

  /**
   * Checks if a room has any accessible, active light sources.
   * Handles nested containers, worn items, and various light source types.
   */
  private static hasAccessibleLightSource(room: IFEntity, world: WorldModel): boolean {
    // Get ALL contents recursively, including worn items
    const contents = world.getAllContents(room.id, {
      recursive: true,
      includeWorn: true
    });

    for (const entity of contents) {
      if (!entity.hasTrait(TraitType.LIGHT_SOURCE)) continue;
      if (!this.isLightActive(entity)) continue;
      if (!this.isAccessible(entity.id, room.id, world)) continue;

      return true;
    }
    return false;
  }

  /**
   * Determines if a light source is currently providing light.
   * Checks isLit property, falls back to switchable state, defaults to lit.
   */
  private static isLightActive(entity: IFEntity): boolean {
    const lightTrait = entity.getTrait(TraitType.LIGHT_SOURCE) as any;

    // Explicit isLit property takes precedence
    if (lightTrait?.isLit !== undefined) {
      return lightTrait.isLit === true;
    }

    // Fall back to switchable state
    if (entity.hasTrait(TraitType.SWITCHABLE)) {
      return SwitchableBehavior.isOn(entity);
    }

    // Default: light sources without explicit state are lit
    // (e.g., glowing gems, phosphorescent moss)
    return true;
  }
}
```

### Usage in Actions

```typescript
// In looking-data.ts - simplified
function checkIfDark(context: ActionContext): boolean {
  const room = context.world.getContainingRoom(context.player.id);
  if (!room) return false;
  return VisibilityBehavior.isDark(room, context.world);
}

// In going.ts - simplified
function isDarkRoom(room: IFEntity, world: WorldModel): boolean {
  return VisibilityBehavior.isDark(room, world);
}
```

### Light Detection Priority

The `isLightActive()` method uses this priority order:

1. **Explicit `isLit` property** - Author-defined state (e.g., lit torch, extinguished candle)
2. **Switchable trait state** - For devices like flashlights (`isOn: true`)
3. **Default to lit** - Inherent light sources without state (glowing gems, lava, etc.)

This ensures backward compatibility while supporting all common light source patterns.

## Consequences

### Positive

1. **Single Source of Truth**: One method for all darkness checks
2. **Consistent Behavior**: All actions behave the same way
3. **Complete Coverage**: Handles all 10 identified light scenarios correctly
4. **Maintainability**: Bug fixes apply everywhere automatically
5. **Testability**: One place to test darkness logic thoroughly
6. **Documentation**: Clear contract for how darkness works

### Negative

1. **Breaking Change**: Actions using custom darkness logic will behave differently
2. **Dependency**: stdlib now depends on VisibilityBehavior for darkness (already imports it)
3. **Performance**: Recursive search on every darkness check (negligible in practice)

### Neutral

1. **Migration**: Existing stories may need adjustment if relying on buggy behavior
2. **Extension Point**: Future ADR-013 lighting extensions can override this method

## Implementation Plan

### Phase 1: Core Implementation
1. Add `isDark()` public method to VisibilityBehavior
2. Add `isLightActive()` private method with fallback logic
3. Update existing `hasLightSource()` to use `isLightActive()`
4. Add comprehensive unit tests

### Phase 2: Action Migration
1. Update looking action to use `VisibilityBehavior.isDark()`
2. Update going action to use `VisibilityBehavior.isDark()`
3. Audit other actions for darkness checks (examining, searching, reading)
4. Remove duplicate darkness checking code

### Phase 3: Validation
1. Run Cloak of Darkness full test (winning and losing paths)
2. Verify all 10 light scenarios pass
3. Update darkness-system-issues.md documentation

## Test Scenarios

The following scenarios must all pass:

```typescript
describe('VisibilityBehavior.isDark', () => {
  test('returns false for room not marked dark', ...);
  test('returns true for dark room with no lights', ...);
  test('returns false when player carries lit torch', ...);
  test('returns false when lit lamp on floor', ...);
  test('returns false when lit candle in OPEN box', ...);
  test('returns true when lit candle in CLOSED box', ...);
  test('returns false when switchable flashlight is on', ...);
  test('returns false for glowing gem (no isLit property)', ...);
  test('returns false when player WEARING lit headlamp', ...);
  test('returns false when NPC carries lantern', ...);
  test('returns true when light in ADJACENT room (no help)', ...);
});
```

## Alternatives Considered

### 1. Keep Separate Implementations
- **Rejected**: Root cause of current bugs; maintenance nightmare

### 2. Create New DarknessBehavior Class
- **Rejected**: Unnecessary abstraction; VisibilityBehavior already handles visibility

### 3. Move Logic to RoomTrait
- **Rejected**: Traits should be data, not logic; violates behavior pattern

### 4. Implement ADR-013 Lighting Extensions First
- **Rejected**: Over-engineering for current needs; can be added later

## References

- ADR-013: Lighting as Extension System (future enhancement)
- darkness-system-issues.md: Detailed bug analysis
- VisibilityBehavior.ts: Existing visibility system
- Cloak of Darkness: Test story exposing issues

## Notes

This ADR addresses the immediate need for consistent darkness checking. The ADR-013 lighting extension system remains a valid future enhancement that would build on top of this foundation. When implemented, lighting extensions would override `VisibilityBehavior.isDark()` to provide more sophisticated lighting models.
