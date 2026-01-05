# Work Summary: Grammar Conflict Fixes

**Date**: 2026-01-05 16:00
**Branch**: dungeo

## Problem

After merging main (ADR-089) into dungeo, 158 transcript tests failed. The failures were all related to grammar conflicts:

1. **"turn on lantern"** → `dungeo.bolt.not_a_bolt`
   - The `turn :target` pattern (priority 150) for turn-bolt was intercepting all "turn" commands
   - Parser matched "turn on lantern" to turn-bolt, then validation failed because lantern isn't a bolt

2. **"push rug"** → `dungeo.button.not_a_button`
   - The `push :target` pattern (priority 145) for press-button was intercepting all "push" commands
   - Parser matched "push rug" to press-button, then validation failed because rug isn't a button

## Root Cause

Story-specific actions (turn-bolt, press-button) used generic slot patterns like `turn :target` and `push :target` that matched ANY entity, not just bolts/buttons. Even with priority set lower than intended, these patterns were still being matched before stdlib patterns because:

1. Grammar constraints via `.where()` with `.matching()` don't reject patterns when no entities match - they just filter the scope
2. Priority determines which action wins when multiple patterns match, but both patterns still match

## Solution

### Turn-Bolt Action
Changed from slot pattern to literal patterns:
```typescript
// Before (broken)
grammar.define('turn :target').mapsTo(TURN_BOLT_ACTION_ID)

// After (working)
grammar.define('turn bolt').mapsTo(TURN_BOLT_ACTION_ID)
grammar.define('turn the bolt').mapsTo(TURN_BOLT_ACTION_ID)
grammar.define('turn bolt with :instrument').mapsTo(TURN_BOLT_ACTION_ID)
```

Updated action to find bolt in room instead of relying on parsed directObject.

### Press-Button Action
Changed from "push :target" to "press :target" only:
```typescript
// Before (broken - intercepted "push rug")
grammar.define('push :target').mapsTo(PRESS_BUTTON_ACTION_ID)
grammar.define('press :target').mapsTo(PRESS_BUTTON_ACTION_ID)

// After (working - only "press" commands)
grammar.define('press :target').mapsTo(PRESS_BUTTON_ACTION_ID)
```

This works because:
- Stdlib pushing uses verbs ['push', 'press', 'shove', 'move'] but dungeo press-button only uses 'press'
- "push rug" goes to stdlib pushing (correct)
- "press yellow" goes to dungeo press-button (correct, buttons have color aliases)

## Files Changed

- `stories/dungeo/src/index.ts` - Grammar pattern definitions
- `stories/dungeo/src/actions/turn-bolt/turn-bolt-action.ts` - Find bolt in room
- `stories/dungeo/src/regions/dam/objects/index.ts` - Added `turnable: true` marker (unused but harmless)

## Test Results

- Before: 541 passed, 158 failed
- After: 698 passed, 1 failed, 5 expected failures

The 1 remaining failure is a pre-existing flooding timing issue (water level shows "shins" instead of "knees" on 3rd wait) - unrelated to grammar fixes.

## Lessons Learned

1. **Avoid generic slot patterns for story-specific actions** - Use literal verb+noun patterns when possible
2. **Grammar constraints don't reject patterns** - They only filter the entity scope, patterns still match
3. **Be careful with verb overlap** - If stdlib uses a verb (push, press, etc.), story actions using the same verb will conflict
