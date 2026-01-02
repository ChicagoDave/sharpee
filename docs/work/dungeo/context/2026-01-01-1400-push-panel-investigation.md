# Work Summary: Push Panel Investigation

**Date:** 2026-01-01 14:00
**Branch:** dungeo
**Focus:** Fixing panel push for Inside Mirror puzzle

## Problem Statement

The Inside Mirror puzzle requires pushing wall panels (red, yellow, mahogany, pine) to rotate/move the box structure. The stdlib `push` action rejects these because they have `SceneryTrait`.

## What Was Implemented

### 1. Push Panel Action (`stories/dungeo/src/actions/push-panel/`)
- Created custom action to bypass stdlib scenery check
- Extracts panel type from raw input (for literal grammar patterns)
- Calls `rotateBox()` or `moveBox()` from inside-mirror-handler
- Files: `types.ts`, `push-panel-action.ts`, `index.ts`

### 2. Grammar Patterns (in `stories/dungeo/src/index.ts`)
- Added 12 literal patterns: `push red panel`, `push red`, `push mahogany`, etc.
- Priority 170 (higher than stdlib push at 100)
- Added generic slot patterns as fallback: `push :target panel`

### 3. Command Transformer
- Added transformer to clear entity slots for PUSH_PANEL_ACTION_ID
- Intended to bypass CommandValidator entity resolution

### 4. Language Messages
- Added error messages for push-panel validation failures

## Investigation Findings

### Parser Unit Tests PASS
Created `packages/parser-en-us/tests/push-panel-pattern.test.ts`:
- "push red panel" correctly matches `story.action.push_panel` ✓
- "push red" correctly matches `story.action.push_panel` ✓
- Literal patterns DO take priority over `push :target` ✓
- No `directObject` in structure for literal patterns (correct!) ✓

### Integration Test FAILS
```
> push red panel
  • command.failed {"reason":"Validation failed: ENTITY_NOT_FOUND","input":"push red panel"}
```

### Root Cause Analysis (Incomplete)

The parser correctly matches literal patterns, but something in the full story integration is different:

1. **Parser works correctly** - unit tests prove literal patterns match with higher priority
2. **CommandValidator** only validates entities if `command.structure?.directObject` exists
3. **Somewhere between parser and validator**, either:
   - A different pattern is matching (core `push :target`)
   - The directObject is being added back
   - The transformer isn't running

### Files Created for Investigation
- `packages/parser-en-us/tests/push-panel-pattern.test.ts` - basic parser tests (PASS)
- `packages/parser-en-us/tests/push-panel-with-core.test.ts` - test with full core grammar (not yet run)

## Next Steps

1. **Run test with full core grammar** to see if core `push :target` overrides story patterns
2. **Add debug logging** to transformer to verify it's being called
3. **Check rule ordering** - are story grammar rules actually being added with correct priority?
4. **Consider alternative approach**: Use `.text()` slots like INCANT action does

## Key Files Modified

- `stories/dungeo/src/actions/push-panel/` (new)
- `stories/dungeo/src/actions/index.ts` (export push-panel)
- `stories/dungeo/src/index.ts` (grammar patterns, transformer, language)

## Test Commands

```bash
# Parser unit tests
npx vitest run packages/parser-en-us/tests/push-panel-pattern.test.ts

# Full story transcript test
./scripts/fast-transcript-test.sh stories/dungeo stories/dungeo/tests/transcripts/endgame-mirror.transcript --verbose
```

## Related Files

- `packages/parser-en-us/src/english-grammar-engine.ts` - grammar matching logic
- `packages/stdlib/src/validation/command-validator.ts` - entity resolution (line 133-141)
- `stories/dungeo/src/handlers/inside-mirror-handler.ts` - rotateBox/moveBox functions
