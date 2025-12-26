# IF Logic Assessment Summary

**Date**: 2025-12-26
**Actions Assessed**: 43
**Purpose**: Identify gaps in basic Interactive Fiction logic across all stdlib actions

## Overview

Most actions are **well-implemented** and cover fundamental IF expectations. The gaps identified fall into a few recurring patterns rather than action-specific issues.

## Actions with No Gaps (22)

These actions fully cover basic IF expectations:

| Category | Actions |
|----------|---------|
| **Physical** | taking, opening, closing, locking, unlocking, removing, going, entering |
| **Manipulation** | climbing |
| **Sensory** | looking, examining |
| **Communication** | showing |
| **Meta** | about, help, inventory, switching_on, switching_off, saving, restoring, restarting, quitting, scoring |

## Common Gap Patterns

### Pattern 1: Reachability/Visibility Not Explicitly Validated

**Issue**: Actions declare scope in metadata (`ScopeLevel.REACHABLE`) but don't explicitly validate reachability in the `validate()` phase. They rely on parser scope resolution.

**Affected Actions**:
- `eating` - No `context.canReach()` check (critical gap)
- `drinking` - Relies on scope, no explicit check
- `giving` - `REACHABLE` for recipient not validated
- `reading` - No reachability/visibility validation
- `searching` - No `canReach()` or `canSee()` checks
- `smelling` - No visibility check for targeted smells
- `pushing` - Relies entirely on scope metadata
- `pulling` - Relies on scope, no explicit check
- `throwing` - No explicit held-item validation

**Severity**: Low-Medium (parser handles this, but defensive programming is missing)

**Recommendation**: Consider adding explicit validation in actions for robustness.

---

### Pattern 2: Strength/Capacity Requirements Defined But Not Enforced

**Issue**: Traits define properties like `requiresStrength` but actions don't validate them.

**Affected Actions**:
- `pulling` - `requiresStrength` in trait, never validated
- `pulling` - `maxPulls` limit not enforced
- `pushing` - `requiresStrength` stored but never checked
- `taking_off` - Inventory capacity not checked after removal

**Severity**: Medium (puzzles relying on these won't work)

**Recommendation**: Add validation for trait-defined requirements.

---

### Pattern 3: Locked State Not Checked for Non-Lock Actions

**Issue**: Actions involving lockable objects don't always check lock state.

**Affected Actions**:
- `pushing` - Locked pushable objects can still be pushed
- `dropping` - `container_not_open` message defined but openability not validated

**Severity**: Low (edge cases)

---

### Pattern 5: Signal Actions Always Succeed Without Context Validation

**Issue**: Meta actions like waiting/sleeping always succeed without checking game state.

**Affected Actions**:
- `waiting` - No game-over, location restriction, or consecutive-wait validation
- `sleeping` - No location safety, player state, or fatigue validation
- `restarting` - No restart restriction checks (unlike save/restore)

**Severity**: Low-Medium (limits game design options)

---

### Pattern 6: Semantic Drift Between Traits and Actions

**Issue**: Action code uses property names that don't match trait definitions.

**Affected Actions**:
- `eating` - Uses `portions` but trait defines `servings`
- `eating` - Sets `consumed` via unsafe cast `(edibleTrait as any).consumed`

**Severity**: Medium (type safety issue, potential runtime bugs)

---

## Action-Specific Gaps

### eating (Critical)
- **No reachability check** - Can eat items not in scope if parser fails
- **Semantic drift** - `portions` vs `servings` naming mismatch
- **Unsafe mutation** - Sets consumed state via type assertion

### drinking (Minor)
- **Implicit taking** not formally in execute phase (works via events)

### giving (Medium)
- **Held-item validation** relies on scope, not explicit check
- **Recipient reachability** not explicitly validated

### reading (Medium)
- **No scope/reachability validation** - Can read inaccessible objects
- **Ability requirements stub** - `requiresAbility` defined but never enforced

### searching (Medium)
- **No reachability/visibility checks** in validate phase
- **No searchability trait** - Everything is searchable

### pulling/pushing (Medium)
- **Strength requirements** defined but not enforced
- **Pull limits** (`maxPulls`, `repeatable`) not validated

### quitting (Minor)
- **No goodbye message** - Traditional IF shows farewell before exit
- **No final score event** for normal quits

### sleeping (Medium)
- **No location validation** - Sleep anywhere
- **No player state checks** - No fatigue system
- **Error messages defined but unreachable** in code

### smelling (Minor)
- **Metadata conflict** - `requiresDirectObject: true` but allows no-target smell

### throwing (Minor)
- **Scenery check missing** - Could throw fixed/scenery items
- **No player paralysis check** - Common IF validation

### wearing (Minor)
- **`canRemove` flag** not validated during wearing
- **`wearableOver` property** not enforced

### waiting (Minor)
- **No consecutive wait tracking** or messaging
- **No location/game-state restrictions**

### attacking (Minor, acceptable)
- **Deferred validation** - Non-combatant targets fail in behavior, not validate()

### exiting (Minor, acceptable)
- **Asymmetry with entering** - No capacity check (intentional - if you fit in, you fit out)

---

## Summary Statistics

| Severity | Count | Description |
|----------|-------|-------------|
| **No Gap** | 22 | Fully meets basic IF expectations |
| **Minor** | 13 | Edge cases or intentional design choices |
| **Medium** | 7 | Missing validations that could affect gameplay |
| **Critical** | 1 | `eating` has reachability gap + type safety issues |

*Note: save/restore/restart are signal actions - client handles implementation details.*

---

## Recommendations

### Priority 1: Fix Critical Gaps
1. Add explicit reachability check to `eating` action
2. Fix `portions` vs `servings` naming in eating

### Priority 2: Add Defensive Validation
3. Consider adding `context.canReach()` checks to actions relying solely on scope metadata
4. Enforce `requiresStrength` in pulling/pushing

### Priority 3: Game Design Enablement
5. Add location safety validation to `sleeping`
6. Consider consecutive-wait tracking in `waiting`
7. Add goodbye/final-score events to `quitting`

**Note**: `saving`, `restoring`, and `restarting` are signal actions - they emit events to the client which handles the actual implementation. Validation of save slots, overwrites, etc. is a client concern.
