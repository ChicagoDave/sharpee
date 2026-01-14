# TR-001 Fixes

**Transcript**: `tr-001.txt`
**Date**: 2026-01-14
**Tester**: Dave

## Issues Found

### Issue 1: "TURN LAMP ON" not recognized
**Line**: 10
**Category**: Parser
**Severity**: Medium

**Problem**: "TURN LAMP ON" should work as an alternative to "turn on lamp". This is a common phrasal verb pattern (verb + object + particle).

**Current**: Only "turn on :item" pattern exists
**Expected**: Both "turn on :item" AND "turn :item on" should work

**Fix Location**: `packages/parser-en-us/src/grammar.ts`

**Solution**: Add phrasal verb pattern with particle after object:
```typescript
grammar
  .define('turn :item on')
  .where('item', (scope) => scope.touchable())
  .mapsTo('if.action.switching_on')
  .build();

grammar
  .define('turn :item off')
  .where('item', (scope) => scope.touchable())
  .mapsTo('if.action.switching_off')
  .build();
```

**Status**: [ ] Open

---

### Issue 2: Can go UP from Cellar with trapdoor closed
**Line**: 24
**Category**: Puzzle
**Severity**: High

**Problem**: Player teleported to Cellar, then typed "u" and went to Living Room. The trapdoor was never opened (it wasn't even revealed yet - rug not moved). The UP exit should be blocked when trapdoor is closed.

**Current**: Cellar has unconditional UP exit to Living Room
**Expected**: UP from Cellar blocked unless trapdoor is open

**Fix Location**: `stories/dungeo/src/regions/living-room.ts` or trapdoor handler

**Solution**: The trapdoor needs a conditional exit handler. When going UP from Cellar:
1. Check if trapdoor exists and is open
2. If closed: "The trapdoor is closed."
3. If open: Allow passage

This may need a door-like connection or event handler on the going action.

**Status**: [ ] Open

---

### Issue 3: "open trap door" produces no output
**Line**: 36
**Category**: Entity Resolution
**Severity**: Medium

**Problem**: Command "open trap door" failed silently due to entity resolution failure.

**Debug trace**: `tr-001-open-trap-door.txt`

**Root Cause Analysis**:
1. Parser correctly identifies "trap door" as noun phrase with head="door", modifiers=["trap"]
2. Entity search finds 5 doors, scope filtering leaves 2: trapdoor (y08), wooden door (y0a)
3. Ambiguity resolution tries to use "trap" modifier to disambiguate
4. Neither entity has "trap" as an adjective
5. Resolution fails with `modifiers_not_matched`
6. `command.failed` event emitted but **no text output generated**

**Two issues here**:
1. **Entity vocab**: Trapdoor entity lacks "trap door" synonym or "trap" adjective
2. **Silent failure**: `command.failed` should produce user-visible error message

**Fix A - Story** (trapdoor entity):
```typescript
trapdoor.add(new IdentityTrait({
  name: 'trapdoor',
  synonyms: ['trap door'],  // Add compound spelling
  adjectives: ['trap'],     // Add modifier
  ...
}));
```

**Fix B - Platform** (text service):
Ensure `command.failed` events produce "I don't understand" or similar message.

**Status**:
- [x] 3a: trap door entity renamed + adjectives added
- [x] 3a: message updated to "trap door"
- [x] 3a: transcripts updated
- [ ] 3b: command.failed silent failure still needs investigation
- [ ] 3c: state-dependent descriptions (open vs closed) not yet implemented

---

## Summary

| Issue | Category | Status |
|-------|----------|--------|
| 1. TURN X ON | Parser | **FIXED** |
| 2. Cellar UP exit | Puzzle | **FIXED** |
| 3a. trap door vocab | Story/Entity | **FIXED** |
| 3b. command.failed silent | Platform/Text | **FIXED** |
| 3c. trap door state descriptions | Story | **FIXED** |

## All Issues Resolved

**Files Modified**:
- `packages/parser-en-us/src/grammar.ts` - Added "turn :device on/off" patterns
- `packages/text-service/src/text-service.ts` - Added command.failed handler
- `packages/transcript-tester/src/runner.ts` - Filter system.* events
- `stories/dungeo/src/regions/house-interior.ts` - Trap door entity + event handlers
- `stories/dungeo/src/regions/underground.ts` - Removed static UP exit from Cellar
- `stories/dungeo/src/index.ts` - Added trapdoor.opened message
