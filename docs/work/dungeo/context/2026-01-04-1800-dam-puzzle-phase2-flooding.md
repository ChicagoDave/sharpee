# Work Summary: Dam Puzzle Phase 2 - Blue Button Flooding

**Date**: 2026-01-04
**Status**: PARTIAL - Daemon works, parser issue blocks multi-word nouns

## What Was Done

### 1. Fixed Daemon Registration
- **Issue**: `daemon.run is not a function` error
- **Cause**: Story dist had `tick:` but interface expects `run:`
- **Fix**: Rebuilt story with `npx tsc --build --force`

### 2. Fixed Water Level Message Indexing
- **Issue**: Level 1 showed "water_head" instead of "water_ankles"
- **Cause**: `Math.floor(level / 2)` gave 0 for level 1, fell to default
- **Fix**: Changed to `Math.floor((level - 1) / 2)` with case 0 → ANKLES

### 3. Fixed Event Type for Text Rendering
- **Issue**: Daemon events not appearing in text output
- **Cause**: Text service only renders `game.message`, not `scheduler.daemon.tick`
- **Fix**: Changed daemon events to use `type: 'game.message'`

### 4. Created Build Script
- New `scripts/build-all-dungeo.sh` builds all packages + dungeo + bundle in order
- Shows ✓/✗ for each step, exits on first failure

### 5. Fixed VehicleTrait Case Warning
- **Issue**: esbuild warnings about `VehicleTrait.js` vs `vehicleTrait.js`
- **Cause**: Stale dist with wrong case from Windows filesystem
- **Fix**: Deleted dist, rebuilt with `--build --force`

## Current Blocker: Multi-Word Noun Parsing

"press blue button" fails with `ENTITY_NOT_FOUND`. Only "press blue" works (using alias).

The entity has:
- name: 'blue button'
- aliases: ['blue']

**Root cause unclear** - the `scoreEntities` function in command-validator.ts should match:
- `ref.head` (the head noun) against entity name
- `ref.modifiers` against entity adjectives

But it's not finding a match. Investigation started into:
- `consumeEntitySlot` in english-grammar-engine.ts
- `scoreEntities` in command-validator.ts
- How `ref.head` vs `ref.text` is parsed from "blue button"

**Also**: "press button" should trigger disambiguation ("which one?") but returns ENTITY_NOT_FOUND.

## Files Modified

- `stories/dungeo/src/scheduler/dam-fuse.ts` - Fixed indexing, event types
- `stories/dungeo/tests/transcripts/flooding.transcript` - Using "press blue" workaround
- `scripts/build-all-dungeo.sh` - New build script
- `packages/world-model/src/traits/vehicle/` - Cleaned dist for case fix

## Next Steps

1. Debug why "blue button" doesn't parse as head="button" + modifier="blue"
2. Check if INounPhrase has correct structure for multi-word names
3. Test "press button" to verify disambiguation is working
4. Once parser fixed, update transcript back to "press blue button"

## Test Command

```bash
./scripts/fast-transcript-test.sh stories/dungeo stories/dungeo/tests/transcripts/flooding.transcript --verbose
```

Current result: 6 passed, 5 failed (using "press blue" workaround would be 11 passed)
