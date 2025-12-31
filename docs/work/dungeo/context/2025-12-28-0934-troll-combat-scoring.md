# Work Summary: Troll Combat and Scoring System

**Date**: 2025-12-28
**Duration**: ~1 hour
**Status**: INCOMPLETE - Blocked on entity handler signature fix

## Objective

Make the troll defeatable with the sword and add scoring for defeating the troll.

## What Was Accomplished

### 1. Troll Made Combatant
Updated `stories/dungeo/src/objects/underground-objects.ts`:
- Added `CombatantTrait` to troll with 10 HP, skill 40, baseDamage 5
- Added death handler to unblock east passage and add score
- Moved bloody axe to troll's inventory (drops on death)

### 2. Sword Made a Weapon
Updated `stories/dungeo/src/objects/house-interior-objects.ts`:
- Added `WeaponTrait` to elvish sword (damage: 5, skillBonus: 10, blessed, glowsNearDanger)
- Added `WeaponTrait` to nasty knife (damage: 2, skillBonus: 5)

### 3. Scoring System Initialized
Updated `stories/dungeo/src/index.ts`:
- Registered scoring capability with initial values (0/616, Zork max score)
- Added custom message for troll death: `dungeo.troll.death.passage_clear`

### 4. Transcript Test Created
Created `stories/dungeo/tests/transcripts/troll-combat.transcript`:
- Navigate to troll room with sword and lantern
- Attack troll 10 times (accounts for combat randomness)
- Verify passage unblocks after troll death
- Verify score shows 10 points

## Blocker: Entity Handler Signature Mismatch

### The Problem
Entity handlers expect signature `(event, world)` but the event processor only passes `(event)`.

**Error observed**:
```
Entity handler error for if.event.death on a02: Cannot read properties of undefined (reading 'getCapability')
```

The troll's death handler tries to call `world.getCapability()` but `world` is undefined.

### Root Cause
In `packages/event-processor/src/processor.ts:197`:
```typescript
// Current (broken):
const handlerResult = target.on[event.type](gameEvent);

// Should be:
const handlerResult = target.on[event.type](gameEvent, this.world);
```

### Type Issue
The `IEventHandlers` type in `packages/world-model/src/events/types.ts` needs to be updated to accept two arguments:
```typescript
export interface IEventHandlers {
  [eventType: string]: (event: IGameEvent, world: WorldModel) => ISemanticEvent[] | void;
}
```

Current type only expects one argument, causing TypeScript error when we try to pass `this.world`.

### Files to Fix
1. `packages/world-model/src/events/types.ts` - Update `IEventHandlers` signature
2. `packages/event-processor/src/processor.ts` - Pass `this.world` to handler

## Test Results Before Blocker

Combat is working mechanically:
- Sword recognized as weapon (unarmed: false)
- Troll takes damage and can be killed
- Death event is emitted correctly
- Entity handler IS being invoked (just failing due to missing world param)
- Passage unblocking works (player can go east)

Only the scoring doesn't work because handler crashes before updating score.

## Files Modified

### stories/dungeo/src/objects/underground-objects.ts
- Added imports: CombatantTrait, RoomBehavior, Direction, StandardCapabilities
- Added CombatantTrait to troll
- Added death handler with scoring and passage unblock

### stories/dungeo/src/objects/house-interior-objects.ts
- Added WeaponTrait import
- Added WeaponTrait to elvish sword
- Added WeaponTrait to nasty knife

### stories/dungeo/src/index.ts
- Added StandardCapabilities import
- Registered scoring capability in initializeWorld()
- Added troll death message

### packages/event-processor/src/processor.ts
- Attempted fix (incomplete due to type error)

## Files Created

- `stories/dungeo/tests/transcripts/troll-combat.transcript`

## To Continue

1. **Fix IEventHandlers type** in `packages/world-model/src/events/types.ts`:
   ```typescript
   import { WorldModel } from '../world';

   export interface IEventHandlers {
     [eventType: string]: (event: IGameEvent, world: WorldModel) => ISemanticEvent[] | void;
   }
   ```

2. **Update event processor** in `packages/event-processor/src/processor.ts:198`:
   ```typescript
   const handlerResult = target.on[event.type](gameEvent, this.world);
   ```

3. **Rebuild and test**:
   ```bash
   pnpm --filter '@sharpee/world-model' build
   pnpm --filter '@sharpee/event-processor' build
   pnpm --filter '@sharpee/story-dungeo' build
   node packages/transcript-tester/dist/cli.js stories/dungeo --all
   ```

4. **Run all transcript tests** to verify no regressions

5. **Commit and push**

## Notes

- Combat is random - test uses 10 attacks to ensure troll dies despite misses
- Troll has 10 HP, sword does 6 damage per hit (5 weapon + 1 base), so 2 hits kill
- Score adds 10 points for defeating troll
- Bloody axe drops when troll dies (dropsInventory: true)
