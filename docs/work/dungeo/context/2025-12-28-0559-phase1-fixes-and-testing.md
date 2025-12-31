# Work Summary: Phase 1 Bug Fixes and Testing

**Date**: 2025-12-28
**Duration**: ~2 hours
**Feature/Area**: Project Dungeo - Phase 1 bug fixes and transcript testing
**Branch**: dungeo

## Objective

Fix two issues identified in Phase 1 work summary and expand transcript test coverage.

## What Was Accomplished

### 1. Lantern/LightSource Synchronization Fix

**Problem**: `switching_on` action didn't sync with `LightSourceTrait.isLit` - lantern could be "on" but not "lit".

**Root Cause**: Missing behavior coordination in execute phase. Action only called `SwitchableBehavior.switchOn()` but never `LightSourceBehavior.light()`.

**Fix**: Added coordination to both actions:

```typescript
// switching_on.ts execute phase
if (noun.has(TraitType.LIGHT_SOURCE)) {
  LightSourceBehavior.light(noun);
}

// switching_off.ts execute phase
if (noun.has(TraitType.LIGHT_SOURCE)) {
  LightSourceBehavior.extinguish(noun);
}
```

**Files Modified**:
- `packages/stdlib/src/actions/standard/switching_on/switching_on.ts`
- `packages/stdlib/src/actions/standard/switching_off/switching_off.ts`

### 2. Search Pattern Fix

**Problem**: "search mailbox" and "look in mailbox" commands not recognized by parser.

**Root Cause**: Missing patterns in `core-grammar.ts`. Only `search [carefully]` (intransitive) was defined.

**Fix**: Added transitive search patterns:

```typescript
grammar.define('search :target')
grammar.define('look in|inside :target')
grammar.define('look through :target')
grammar.define('rummage in|through :target')
```

**Files Modified**:
- `packages/parser-en-us/src/core-grammar.ts`

### 3. Erroneous NPC Require Fix

**Problem**: `lang-en-us/language-provider.ts` tried to statically require `./npc/npc` which doesn't exist.

**Root Cause**: NPC language is story-specific and injected at runtime, not loaded statically.

**Fix**: Removed the erroneous `loadNpcMessages()` call and method.

**Files Modified**:
- `packages/lang-en-us/src/language-provider.ts`

### 4. House Interior Transcript Test

Created comprehensive test covering house exploration:
- Enter via window from Behind House
- Kitchen objects (sack, bottle)
- Living Room objects (lantern, sword)
- Switch on lantern
- Attic objects (rope, knife)
- Inventory verification

**Files Created**:
- `stories/dungeo/tests/transcripts/house-interior.transcript` (21 tests)

### 5. Documentation Updates

**CLAUDE.md Updates**:
- Added "Parser vs Language Layer" section explaining grammar vs text ownership
- Added `parser-{locale}` to Logic Location table
- Added transcript testing commands section
- Updated current branch to `dungeo`

**Assessments Written**:
- `docs/work/dungeo/assessments/switching-on-lightsource-sync.md`
- `docs/work/dungeo/assessments/parser-pattern-registration-gap.md`

## Key Decisions

### 1. Parser Owns Grammar
Clarified architecture: `parser-en-us` owns grammar patterns in `core-grammar.ts`. Patterns in `lang-en-us` are for documentation/help text, not parsing. Stories can extend grammar for story-specific commands.

### 2. Actions Coordinate Behaviors
Per ADR-051, actions should coordinate multiple behaviors when an entity has multiple relevant traits. The switching actions now properly coordinate both SwitchableBehavior and LightSourceBehavior.

## Test Results

All transcript tests pass:
```
Total: 38 tests in 3 transcripts
38 passed
Duration: 24ms
```

All stdlib switching tests pass:
```
Test Files: 2 passed (switching_on-golden, switching_off-golden)
Tests: 46 passed
```

## Files Changed Summary

| File | Change |
|------|--------|
| `packages/stdlib/src/actions/standard/switching_on/switching_on.ts` | Added LightSourceBehavior coordination |
| `packages/stdlib/src/actions/standard/switching_off/switching_off.ts` | Added LightSourceBehavior coordination |
| `packages/parser-en-us/src/core-grammar.ts` | Added search patterns |
| `packages/lang-en-us/src/language-provider.ts` | Removed erroneous NPC require |
| `stories/dungeo/tests/transcripts/house-interior.transcript` | New transcript test |
| `stories/dungeo/tests/transcripts/mailbox.transcript` | Updated search assertion |
| `CLAUDE.md` | Added parser/language docs, transcript testing |
| `docs/work/dungeo/assessments/switching-on-lightsource-sync.md` | Assessment |
| `docs/work/dungeo/assessments/parser-pattern-registration-gap.md` | Assessment |

## Phase 1 Status

**Resolved this session**:
- [x] Lantern light synchronization
- [x] Parser "search/look in" patterns

**Remaining**:
- [ ] Troll blocking behavior (needs NPC system)
- [ ] Grating unlock mechanism
- [ ] Forest/Underground transcript tests

## Next Steps

1. Add forest and underground navigation transcripts
2. Implement grating unlock when player has key
3. Continue to Phase 2 (Dam/Reservoir area)
