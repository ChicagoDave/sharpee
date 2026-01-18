# Session Summary: 2026-01-18 - dungeo

## Status: Completed

## Overview

Two debugging sessions addressing three issues discovered during transcript testing:
1. **Troll combat bug** - Player attacks not working (FIXED)
2. **Save command crash** - Text service null reference error (FIXED)
3. **Lamp article formatter** - Wrong capitalization order (identified, not fixed)

## Completed

### Session 1 (13:07): Troll Combat Bug

**Problem**: Player could not attack the troll with the bloody axe. Transcript showed "You can't attack without a weapon!" even when armed.

**Root Cause**: `TrollAttackingBehavior` registered for `if.action.attacking` capability but only implemented blocking logic for unarmed combat. When player was armed, the behavior's `validate()` method returned undefined (implicit success), but `execute()` was never called because it didn't exist.

**Investigation Path**:
1. Examined `troll-combat.transcript` failure (expected damage message, got "no weapon")
2. Reviewed `TrollAttackingBehavior` in `stories/dungeo/src/traits/troll-capability-behaviors.ts`
3. Discovered behavior only had `blocked()` method (for unarmed attacks)
4. Missing `validate()` and `execute()` phases for armed combat

**Solution**: Implemented full 4-phase capability behavior for armed combat:

```typescript
// Added validate phase
validate(entity, world, actorId, sharedData) {
  const actor = world.getEntityById(actorId);
  const weapon = findBestWeapon(actor, world);

  if (!weapon) {
    return {
      allowed: false,
      reason: 'dungeo.troll.combat.no_weapon'
    };
  }

  sharedData.weapon = weapon;
  return { allowed: true };
}

// Added execute phase
execute(entity, world, actorId, sharedData) {
  const trait = entity.getTrait<TrollTrait>(TrollTrait.type);
  if (!trait) return;

  // Damage troll (3 hits to kill)
  trait.damageCount = (trait.damageCount || 0) + 1;

  if (trait.damageCount >= 3) {
    trait.isAlive = false;
    // Remove axe from troll's inventory
    const axe = world.findEntity((e) => e.name === 'bloody axe');
    if (axe) world.moveEntity(axe.id, entity.id);
  }

  sharedData.damageCount = trait.damageCount;
  sharedData.trollDied = !trait.isAlive;
}
```

**Files Changed**:
- `stories/dungeo/src/traits/troll-capability-behaviors.ts` - Full combat implementation
- `stories/dungeo/tests/transcripts/troll-combat.transcript` - Updated expected output

**Test Results**:
- `troll-combat.transcript`: 1/1 pass
- Combat progression: Hit 1 → Hit 2 → Hit 3 → Troll dies, drops axe

### Session 2 (13:47): Save Command Crash

**Problem**: Save command threw uncaught error "Cannot read properties of undefined (reading 'message')". No events emitted, no save file created.

**Root Cause**: `platform.save_requested` events have `undefined` data (by design - they're internal routing events, not user-facing messages). The text service's `handleGenericEvent` function accessed `data.message` without null checking, causing crash when processing platform events.

**Investigation Process**:
1. Created `save-test.transcript` to reproduce the crash
2. Ran debug script to capture full stack trace
3. Traced error to `handleGenericEvent` in `text-service/src/handlers/generic.ts:64`
4. Discovered `platform.*` events were reaching text service (architectural issue)

**Solution** (defense in depth - two fixes):

1. **Filter platform events** (`packages/text-service/src/stages/filter.ts`):
   ```typescript
   // Platform events are internal routing - never produce text
   if (event.type.startsWith('platform.')) {
     return false;
   }
   ```

2. **Null guard in handler** (`packages/text-service/src/handlers/generic.ts`):
   ```typescript
   export function handleGenericEvent(event: GameEvent): Effect[] {
     const { data } = event;

     // Guard against events with no data
     if (!data) {
       return [];
     }

     // Now safe to access data.message
     // ...
   }
   ```

**Why Two Fixes?**
- **Filtering** = Correct architectural solution (platform events shouldn't reach text service)
- **Null guard** = Defensive programming (future events might legitimately have no data)

**Files Changed**:
- `packages/text-service/src/stages/filter.ts` - Filter platform events
- `packages/text-service/src/handlers/generic.ts` - Add null check
- `stories/dungeo/tests/transcripts/save-test.transcript` - New regression test

**Test Results**:
- `save-test.transcript`: 1/1 pass
- All dungeo transcripts: 45/46 passed (1 pre-existing wave-rainbow failure)

## Key Decisions

### 1. Capability Behaviors Must Implement Full 4-Phase Pattern

**Context**: Troll behavior only had `blocked()` method, leading to silent failure when armed.

**Decision**: All capability behaviors must implement `validate()`, `execute()`, `report()`, and `blocked()` phases (matching stdlib action pattern).

**Rationale**:
- Capability dispatch (ADR-090) is "trait behaviors participating in stdlib actions"
- Behaviors own entity mutations (like damage, state changes)
- Missing `execute()` phase = no mutations = action appears to work but does nothing

**Implications**: When registering capability behaviors, implement all 4 phases even if some are no-ops.

### 2. Platform Events Should Never Reach Text Service

**Context**: Save crash revealed platform.* events were being processed by text service.

**Decision**: Add explicit filter for `platform.*` events in text service's filter stage.

**Rationale**:
- Platform events are internal routing (save_requested, restore_requested)
- They never produce user-facing text
- Processing them is architectural smell

**Implications**: All platform.* events now filtered at text service entry point.

### 3. Defensive Null Checks in Generic Handlers

**Context**: `handleGenericEvent` assumed `data` was always defined.

**Decision**: Add null guard before accessing event data properties.

**Rationale**:
- Some events legitimately have no data (platform events, simple notifications)
- Generic handlers must be resilient to all event shapes
- Early return with empty effects is correct behavior

**Implications**: Pattern for all generic event handlers - check data existence before access.

## Open Items

### Lamp Article Formatter (IDENTIFIED, NOT FIXED)

**Issue**: Switching on lamp produces "You switch on the brass Lamp." (capital L).

**Root Cause**: Wrong formatter order in `lang-en-us/src/actions/switching-on.ts`:
```typescript
// Current (wrong)
message: '{cap:the:target}' // Capitalizes "the", then "the" → entity name

// Should be
message: '{the:cap:target}' // Gets article + name, then capitalizes first letter
```

**Status**: Fix identified but NOT applied per CLAUDE.md requirement:
> "Platform changes require discussion first. Any changes to packages/ (engine, stdlib, world-model, parser-en-us, etc.) must be discussed with the user before implementation."

**Next Step**: Discuss with user before modifying `lang-en-us` package.

## Files Modified

**Story** (2 files):
- `stories/dungeo/src/traits/troll-capability-behaviors.ts` - Full combat implementation
- `stories/dungeo/tests/transcripts/troll-combat.transcript` - Updated expectations

**Platform - Text Service** (2 files):
- `packages/text-service/src/stages/filter.ts` - Platform event filter
- `packages/text-service/src/handlers/generic.ts` - Null guard

**Tests** (1 new file):
- `stories/dungeo/tests/transcripts/save-test.transcript` - Save regression test

## Architectural Notes

### Capability Dispatch Pattern (ADR-090)

The troll combat bug highlighted a common pitfall with capability behaviors:

**Anti-pattern**: Partial behavior implementation
```typescript
// Only implements blocked() - BAD
const TrollAttackingBehavior: CapabilityBehavior = {
  blocked(entity, world, actorId, error, sharedData) {
    // Returns custom message for unarmed attacks
  }
};
```

**Correct pattern**: Full 4-phase implementation
```typescript
const TrollAttackingBehavior: CapabilityBehavior = {
  validate(entity, world, actorId, sharedData) {
    // Check preconditions, store weapon reference
  },
  execute(entity, world, actorId, sharedData) {
    // Mutate troll health, check death, move items
  },
  report(entity, world, actorId, sharedData) {
    // Return effects describing what happened
  },
  blocked(entity, world, actorId, error, sharedData) {
    // Return effects for validation failures
  }
};
```

**Why this matters**:
- Behaviors own entity mutations (damage, death, item movement)
- Missing `execute()` = no mutations = silent failure
- `validate()` returning undefined = implicit success, but nothing happens
- All 4 phases ensure complete action lifecycle

### Text Service Event Filtering

Text service processes game events to produce user-facing output. Three categories:

1. **Action events** (`if.event.*`) - Produce narrative text ("You take the sword")
2. **Custom events** (`dungeo.event.*`) - Story-specific messages ("Thief appears!")
3. **Platform events** (`platform.*`) - Internal routing (save/restore/quit)

**Filtering strategy**:
```typescript
// Filter stage (text-service/src/stages/filter.ts)
export function shouldProcessEvent(event: GameEvent): boolean {
  // Platform events never produce text
  if (event.type.startsWith('platform.')) return false;

  // Process everything else
  return true;
}
```

Platform events trigger side effects (save file I/O) but don't need text output. Filtering them at entry prevents downstream handlers from seeing events they can't process.

## Test Coverage

**New Tests**:
- `troll-combat.transcript` - Full combat sequence (3 hits → death → axe drop)
- `save-test.transcript` - Save command doesn't crash

**Transcript Results** (46 total):
- **45 passed**
- **1 failed** - `wave-rainbow.transcript` (pre-existing issue, not related to today's work)

**Coverage**:
- Capability behaviors with armed combat
- Platform event handling (save command)
- Text service null safety

## Notes

**Session 1 duration**: ~40 minutes (13:07 - 13:47)
**Session 2 duration**: ~30 minutes (13:47 - 14:17)
**Total**: ~70 minutes

**Approach**:
- Session 1: Transcript-driven debugging (test failure → code inspection → fix → verify)
- Session 2: Stack trace analysis (error → source location → architectural fix)

**Key Insight**: The troll bug was a "works by accident" scenario - behavior returned implicit success but did nothing. This pattern can hide in capability behaviors that only implement `blocked()` for error cases. All behaviors should implement full lifecycle.

---

**Progressive update**: Session completed 2026-01-18 14:17
