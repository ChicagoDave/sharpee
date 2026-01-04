# Work Summary: Royal Puzzle Grammar Fix Investigation

**Date**: 2026-01-02
**Time**: ~01:30 AM CST
**Duration**: ~1.5 hours
**Branch**: dungeo → story-grammar
**Feature/Area**: Parser Architecture / Story Grammar Extension

## Objective

Fix Royal Puzzle grammar issues where "push east wall" commands were failing with `dungeo.push_panel.not_in_mirror` error instead of executing the puzzle mechanics.

## What Was Accomplished

### Investigation & Root Cause Analysis

Discovered a **cascading architecture issue** in how stories extend parser grammar:

1. **Symptom**: Royal Puzzle had 7 failing transcript tests - "push east wall" returned wrong error
2. **Initial diagnosis**: Grammar priority conflict between generic and specific patterns
3. **Band-aid fix**: Bumped Royal Puzzle pattern priorities from 160 → 175 (worked but wrong approach)
4. **Real insight**: Should use `.direction('direction')` slot type like `go :direction` does
5. **Architecture flaw found**: `StoryGrammarImpl` wrapper doesn't expose `.direction()` method!

### The Core Problem

`packages/parser-en-us/src/story-grammar-impl.ts` wraps `PatternBuilder` but manually proxies only some methods:

**Missing from StoryGrammarImpl**:
- `.direction()` - for directional slot constraints
- `.vocabulary()` - for vocabulary-constrained slots (ADR-082)
- `.manner()` - for manner-constrained slots (ADR-082)

This creates a **two-tier system**:
- Core grammar (stdlib) has full PatternBuilder capabilities
- Story grammar has restricted access, requiring manual updates for each new feature

**Impact**: Stories must define 12 explicit patterns (`push north wall`, `push south wall`, etc.) instead of one parameterized pattern (`push :direction wall`).

### Files Created/Modified

- `docs/architecture/adrs/adr-084-remove-story-grammar-wrapper.md` - **New ADR proposing removal of StoryGrammarImpl wrapper**

### Commits

1. `ce950d3` - fix(dungeo): Royal Puzzle push wall priority - 160 → 175 (band-aid fix, all tests pass)
2. `f2c706d` - docs: ADR-084 Remove StoryGrammarImpl wrapper (analysis & recommendation)

### Stash Created

**stash@{0}**: "WIP: push :direction wall pattern (needs story-grammar fix)"
- Contains attempted implementation of `push :direction wall` pattern
- Cannot complete until StoryGrammarImpl issue is resolved

### Branch Created

- `story-grammar` - For implementing the platform-level fix (requires discussion per CLAUDE.md)

## Key Decisions

### 1. **Platform Change Requires Discussion First**
Per CLAUDE.md: "Platform changes require discussion first. Any changes to packages/ (engine, stdlib, world-model, parser-en-us, etc.) must be discussed with the user before implementation."

Created ADR-084 to document the issue and propose solutions rather than implementing immediately.

### 2. **Three Implementation Options Identified**

**Option A: Remove wrapper entirely**
- Stories get `PatternBuilder` directly
- Maximum simplicity, but loses tracking/debug features

**Option B: Transparent proxy** (RECOMMENDED)
- Intercept `.build()` to track rule provenance and emit debug events
- Return real `PatternBuilder` for method calls
- Full feature parity + preserved tracking
- No ongoing maintenance burden

**Option C: Quick fix**
- Just add missing methods to wrapper
- Smallest change but perpetuates maintenance burden

### 3. **Recommended Approach**

ADR-084 recommends **Option B** because it:
- Provides immediate feature parity (all PatternBuilder methods available)
- Preserves tracking/stats/debug capabilities
- Eliminates ongoing maintenance burden
- Minimal breaking changes (mostly internal)

## Challenges & Solutions

### Challenge: Grammar Priority Conflicts
**Initial thought**: "push east wall" failing because generic `push :target wall` (priority 165) matched before specific patterns (priority 160)

**Solution**: Bumped Royal Puzzle priorities to 175. This worked but was treating symptoms, not root cause.

### Challenge: Stories Can't Use Direction Slots
**Discovery**: Tried to implement `push :direction wall` with `.direction('direction')` but method doesn't exist on StoryGrammarImpl

**Solution**: Identified wrapper as the architectural flaw, not just missing implementation.

### Challenge: Platform Change Policy
**Policy**: Cannot change packages/ code without discussion

**Solution**:
1. Created comprehensive ADR documenting problem, options, and recommendation
2. Created `story-grammar` branch for implementation
3. Stashed WIP story changes
4. Ready for discussion before proceeding

## Code Quality

- ✅ All 473 transcript tests passing (with priority band-aid)
- ✅ TypeScript compilation successful
- ❌ Architecture issue documented but not fixed (awaiting discussion)
- ✅ Comprehensive ADR created for review

## Current State

### On `dungeo` branch:
- Royal Puzzle working via priority override (ce950d3)
- 12 explicit push wall patterns (north, south, east, west, etc.)
- All tests passing

### On `story-grammar` branch:
- ADR-084 documenting the wrapper issue
- Ready for platform-level fix implementation

### In stash:
- WIP changes attempting to use `push :direction wall` pattern
- Will be applied after wrapper fix is complete

## Next Steps

1. **Discussion Phase**:
   - [ ] Review ADR-084 with user
   - [ ] Confirm Option B (transparent proxy) approach
   - [ ] Discuss any API/interface changes needed

2. **Implementation Phase** (after approval):
   - [ ] On `story-grammar` branch: Implement transparent proxy approach
   - [ ] Update `StoryGrammarImpl.define()` to return real `PatternBuilder`
   - [ ] Intercept `.build()` for tracking/stats/debug events
   - [ ] Update tests in `packages/parser-en-us/`
   - [ ] Verify no regressions in core grammar

3. **Story Update Phase**:
   - [ ] Pop stash and switch to `dungeo` branch
   - [ ] Implement `push :direction wall` pattern using `.direction()`
   - [ ] Remove 12 explicit patterns, replace with single parameterized pattern
   - [ ] Run Royal Puzzle transcripts to verify
   - [ ] Revert priority override (return to 160 or lower)

4. **Future Benefits**:
   - [ ] Stories can use `.vocabulary()` for constrained slots (ADR-082)
   - [ ] Stories can use `.manner()` for manner slots (ADR-082)
   - [ ] Any future PatternBuilder features automatically available to stories

## Technical Insights

### Why This Matters

**Before this fix**:
```typescript
// Royal Puzzle must define 12+ patterns
grammar.define('push north wall').mapsTo(ACTION_ID).build();
grammar.define('push south wall').mapsTo(ACTION_ID).build();
grammar.define('push east wall').mapsTo(ACTION_ID).build();
// ... 9 more patterns
```

**After this fix**:
```typescript
// Single parameterized pattern
grammar.define('push :direction wall')
  .direction('direction')
  .mapsTo(ACTION_ID)
  .build();
```

This reduces duplication, improves maintainability, and makes story grammar match core grammar capabilities.

### Architecture Lesson

**The wrapper was well-intentioned** (tracking, stats, debug events) but created a **maintenance choke point**. Every new PatternBuilder feature required manual updates to the wrapper.

**Better approach**: Intercept at the build stage rather than wrapping the entire builder. This gives full feature access while preserving observability.

## References

- **ADR-084**: `docs/architecture/adrs/adr-084-remove-story-grammar-wrapper.md`
- **ADR-082**: Vocabulary Constrained Slots (added `.vocabulary()` and `.manner()` methods)
- **ADR-080**: Raw Text Grammar Slots (added `.text()` method)
- **Implementation file**: `packages/parser-en-us/src/story-grammar-impl.ts`
- **Interface**: `packages/if-domain/src/grammar/grammar-builder.ts`
- **Royal Puzzle grammar**: `stories/dungeo/src/index.ts` (extendParser method)

## Notes

- This is a **platform-level architectural improvement**, not just a story bug fix
- The priority override (ce950d3) should be reverted once the proper fix is in place
- All new slot types from ADR-082 are similarly blocked for story use
- This fix will benefit all future stories, not just Dungeo
- User is away - waiting for discussion on ADR-084 before implementing platform changes

## Related Work

- **Previous session**: 2026-01-02-0000-adr-082-complete.md - Completed vocabulary/manner slot implementation
- **Previous session**: 2026-01-02-1200-inside-mirror-puzzle-fix.md - Fixed Inside Mirror puzzle (which introduced the generic `push :target wall` pattern that exposed this issue)
