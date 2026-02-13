# Session Summary: 2026-02-12 - combat-refactor (05:27 AM CST)

## Status: Blocked - Critical Daemon Issue

## Goals
- Fix egg/canary puzzle bugs discovered during play testing
- Research canonical MDL thief behavior for treasure deposit
- Resolve thief deposit loop (re-stealing deposited treasures)

## Completed

### 1. MDL Source Research: Thief Deposit Logic

Researched the canonical MDL Zork implementation (`docs/dungeon-81/mdlzork_810722/act1.254`) to understand thief treasure deposit behavior:

**Key Findings:**
- The egg is opened when the thief DEPOSITS it at the Treasure Room (his lair), NOT when the thief dies
- MDL sets OPENBIT and EGG-SOLVE!-FLAG during deposit operation
- MDL filters deposit items by `OTVAL > 0` (trophy case value), not by "everything except stiletto"
- MDL uses OVISON visibility bit to prevent re-stealing deposited items and hide them from the player

This research confirmed our implementation needed two fixes:
1. Use trophy case value filter instead of "not stiletto" filter
2. Use concealment system to prevent re-stealing

### 2. Renamed getDroppableItems() to depositTreasures()

**File:** `stories/dungeo/src/npcs/thief/thief-helpers.ts`

Changed the filtering logic to match MDL canon:

```typescript
// OLD: excluded only stiletto
const droppable = inventory.filter((id) => {
  const item = world.getEntity(id);
  return item?.attributes.name !== 'stiletto';
});

// NEW: filter by trophy case value > 0 (matches MDL OTVAL > 0)
export function depositTreasures(world: WorldModel, items: string[]): string[] {
  return items.filter((id) => {
    const entity = world.getEntity(id);
    if (!entity) return false;
    const trophyCaseValue = entity.attributes.trophyCaseValue ?? 0;
    return trophyCaseValue > 0;
  });
}
```

**Updated call sites:**
- `thief-behavior.ts`: `handleLairDeposit()` - 1 call
- `thief-behavior.ts`: `handleNonLairDeposit()` - 1 call
- `thief-behavior.ts`: `handleRobberySite()` - 1 call

### 3. Concealment System for Deposited Treasures

**CRITICAL FIX:** Thief was re-stealing deposited treasures, creating an infinite loop.

**Root Cause:** `findTreasuresIn()` returned ALL treasures in the lair, including ones the thief had already deposited.

**Solution:** Use `IdentityTrait.concealed` property (existing platform feature) to mark deposited items as hidden from both the player and the thief's treasure-finding logic.

**Implementation:**

File: `stories/dungeo/src/npcs/thief/thief-behavior.ts`
```typescript
function handleLairDeposit(context: NPCTurnContext): void {
  // ... existing code ...

  // Mark deposited items as concealed (matches MDL's OVISON bit)
  treasuresToDeposit.forEach((treasureId) => {
    const treasure = context.world.getEntity(treasureId);
    if (treasure) {
      const identity = getOrAddTrait(treasure, IdentityTrait);
      identity.concealed = true; // Hidden from player AND thief
    }
  });
}
```

File: `stories/dungeo/src/npcs/thief/thief-helpers.ts`
```typescript
export function findTreasuresIn(world: WorldModel, locationId: string): string[] {
  const treasures: string[] = [];
  // ... existing location traversal ...

  if (childIdentity && !childIdentity.concealed) { // Skip concealed items
    const trophyCaseValue = child.attributes.trophyCaseValue ?? 0;
    if (trophyCaseValue > 0) {
      treasures.push(child.id);
    }
  }

  return treasures;
}
```

File: `stories/dungeo/src/interceptors/melee-interceptor.ts`
```typescript
// When thief dies, reveal all concealed items in lair
if (villain.attributes.name === 'thief') {
  const lairTreasures = world.getChildEntities(thiefLairId);
  lairTreasures.forEach((treasureId) => {
    const treasure = world.getEntity(treasureId);
    if (treasure) {
      const identity = treasure.traits.find((t) => t.type === IdentityTrait.type);
      if (identity && (identity as any).concealed) {
        (identity as any).concealed = false; // Reveal on thief death
      }
    }
  });
}
```

**Result:** Thief no longer re-steals deposited treasures. Chalice deposit loop FIXED.

### 4. Added "One Step at a Time" to CLAUDE.md

**File:** `/mnt/c/repotemp/sharpee/CLAUDE.md`

Added user preference to Major Directions section:
```markdown
- Never queue up multiple steps or plan ahead - do one step at a time and stop
```

This ensures Claude stops for feedback after each discrete change, matching user's working style.

## Critical Blocker: Thief Daemon Not Firing in wt-12

### Symptom
The thief daemon produces ZERO turns during walkthrough wt-12 (egg/canary puzzle), both standalone and when chained after wt-01-11.

**Evidence:**
- wt-01 (standalone): Thief daemon fires correctly, 20+ turns logged
- wt-12 (standalone): Thief daemon produces ZERO turns (no logs)
- wt-12 (chained): Same behavior - daemon never fires

### Impact
The egg/canary puzzle is completely blocked because:
1. Player gives egg to thief: `give egg to thief`
2. Thief receives egg and should process it during next daemon turn
3. Thief daemon never runs, so egg is never deposited/opened
4. Player cannot `take canary` because egg remains closed
5. All downstream puzzle commands fail (wind canary, take bauble, etc.)

### What Works
- Thief receives the egg successfully (inventory transfer works)
- Thief daemon registration appears intact (fires in wt-01)
- Other NPC daemons work correctly in other walkthroughs

### What's Broken
- NPC turn phase stops executing thief daemon turns in wt-12 context
- No error messages, no exceptions - daemon simply never fires
- This is NOT a serialization issue (same behavior standalone vs chained)

### Root Cause Unknown
Possible areas to investigate:
1. NPC scheduler state in wt-12 scenario
2. Daemon registration vs execution in specific game states
3. Turn phase execution order when player is in/near thief's territory
4. Hidden dependency on game state that blocks NPC turns

**This blocks all further progress on the egg/canary puzzle.**

## Test Results

```bash
node dist/cli/sharpee.js --test --chain stories/dungeo/walkthroughs/wt-*.transcript
```

**Overall:** 339 passed, 7 failed, 9 skipped (1430ms)

**All 7 failures in wt-12 (egg/canary puzzle):**
1. `take canary` - Egg never opened (thief daemon not running)
2. `take chalice` - Load too heavy (secondary issue, may be fixed by other changes)
3. `wind canary` - Cascade failure (canary not accessible)
4. `take bauble` - Cascade failure (bauble not dropped)
5. `put xxx` - Cascade failures from puzzle not progressing

**Chalice deposit loop:** FIXED (thief no longer re-steals deposited treasures)

## Key Decisions

### 1. Use IdentityTrait.concealed Instead of New System
**Decision:** Use existing `IdentityTrait.concealed` property to hide deposited treasures from both player and thief.

**Rationale:**
- Platform already has concealment system with proper scope filtering
- Matches MDL's OVISON bit semantics (visibility control)
- No new platform code needed
- Three simple changes: set concealed on deposit, check in findTreasuresIn, reveal on death

**Alternative Considered:** Create new `depositedByThief` flag on attributes.
**Rejected Because:** Concealment is exactly what we need - it affects both player visibility and thief's treasure-finding logic.

### 2. Filter Deposits by Trophy Case Value
**Decision:** Change deposit filter from "not stiletto" to `trophyCaseValue > 0`.

**Rationale:**
- Matches canonical MDL behavior (OTVAL > 0)
- More maintainable (declarative: "is this a treasure?" vs "is this NOT the stiletto?")
- Automatically handles new treasures without code changes
- Stiletto has `trophyCaseValue: 0`, so it's naturally excluded

### 3. Deposit Logic in Daemon, Not Room Interceptor
**Decision:** Keep deposit logic in thief daemon's `handleLairDeposit()`, not in Treasure Room interceptor.

**Rationale:**
- Matches MDL architecture (thief behavior owns deposit logic)
- Daemon runs on thief's turn schedule (better for multi-turn deposits)
- Interceptor only needed for reactions to external events (player actions)
- Thief behavior is self-contained

## Files Modified

**Platform:**
- None (used existing IdentityTrait.concealed feature)

**Story Code:**
- `CLAUDE.md` - Added "one step at a time" directive
- `stories/dungeo/src/npcs/thief/thief-helpers.ts` - Renamed function, added trophy case filter, concealment check
- `stories/dungeo/src/npcs/thief/thief-behavior.ts` - Updated imports/calls, concealment on deposit
- `stories/dungeo/src/interceptors/melee-interceptor.ts` - Reveal concealed items on thief death

**Test Transcripts:**
- `stories/dungeo/tests/transcripts/debug-thief-egg.transcript` - Created for debugging
- `stories/dungeo/tests/transcripts/debug-egg-deposit.transcript` - Created for debugging

## Architectural Notes

### Concealment vs Visibility
Sharpee has a clean separation between two concepts:

1. **Visibility** (`VisibilityTrait`): Light-dependent, affects whether player can see items in dark rooms
2. **Concealment** (`IdentityTrait.concealed`): Content-dependent, affects whether items appear in room listings or command resolution

Both are correctly filtered by scope resolver and visibility behavior. Deposited treasures use concealment because they should be hidden regardless of lighting.

### Thief Daemon Architecture
The thief behavior follows a state machine:

1. **Wandering** - Move between rooms, find treasures
2. **Fleeing** - Move toward lair with stolen treasures
3. **At Lair** - Deposit treasures, mark as concealed
4. **Death** - Reveal all concealed treasures in lair

This matches MDL's THIEF-FUNCTION structure and allows the thief to deposit multiple treasures over multiple turns.

## Next Steps

### Immediate (BLOCKED)
1. **Investigate why thief daemon doesn't fire in wt-12** - This is the critical blocker
   - Add debug logging to NPC turn phase
   - Check daemon registration state
   - Compare game state between wt-01 (works) and wt-12 (broken)
   - Look for conditions that prevent NPC turns from executing

### After Daemon Fix
2. Test egg opening during deposit (not yet verified due to daemon issue)
3. Verify canary is accessible after egg opens
4. Verify canary wind → bauble puzzle chain
5. Re-run full walkthrough chain to confirm all 7 wt-12 failures resolved

### Future Work
6. Investigate "load too heavy" for chalice (may be unrelated to thief changes)
7. Consider adding `$daemon-status` GDT command for debugging NPC turn phases
8. Document canonical thief behavior in ADR or design doc

## Notes

**Session duration:** ~2.5 hours

**Approach:**
- Started with MDL source research to understand canonical behavior
- Implemented trophy case value filter to match MDL
- Used existing concealment system (no platform changes)
- Blocked by thief daemon not firing - root cause unknown

**Methodology:** Incremental changes with transcript testing after each modification.

**Work Style:** One step at a time, stop for feedback (per user preference added to CLAUDE.md).

---

**Progressive update**: Session completed 2026-02-12 05:27 AM CST
