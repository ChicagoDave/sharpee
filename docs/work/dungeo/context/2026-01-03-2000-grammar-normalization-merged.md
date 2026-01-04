# Work Summary: Grammar Normalization & VehicleTrait Merged

**Date**: 2026-01-03 20:00
**Branch**: dungeo (synced with main)
**Status**: Complete

## Session Summary

This session normalized the parser grammar implementation and merged VehicleTrait work into main.

### PRs Merged

1. **PR #41** - VehicleTrait for enterable transport containers
2. **PR #42** - Grammar normalization (parser cleanup)

### Grammar Normalization

**Problem**: 3 grammar rule files existed, only 1 was used. The `enter :portal` pattern with scope constraints only existed in dead code.

**Solution**:
- Deleted 6 dead files from if-domain and parser-en-us
- Renamed `core-grammar.ts` → `grammar.ts`
- Added missing patterns with `.matching({ enterable: true })` constraint
- Added vehicle synonyms: board, disembark, get on/off, alight
- Priority ordering: semantic rules (100+) before fallbacks (90-95)

**Result**: "enter bucket" now works!

### Files Deleted (dead code)

```
packages/if-domain/src/grammar/semantic-grammar.ts
packages/if-domain/src/grammar/semantic-rules/inserting.ts
packages/parser-en-us/src/semantic-core-grammar.ts
packages/parser-en-us/src/semantic-grammar-rules.ts
packages/parser-en-us/src/semantic-parser-engine.ts
packages/parser-en-us/tests/semantic-parsing.test.ts
docs/work/dungeo/reduced-plan.md
```

### Test Results

```
Total: 656 tests in 37 transcripts
647 passed, 4 failed, 5 expected failures
```

The 4 failures are bucket/well puzzle logic issues (pour/fill mechanics), not grammar.

### Branch Status

- `main`: Has both PRs merged
- `dungeo`: Fast-forwarded to main, clean
- `vehicle-trait`: Can be deleted (merged)

### Next Steps

1. Debug bucket/well puzzle (POUR/FILL actions)
2. Implement remaining puzzles (balloon, key puzzles)
3. Add missing systems (INFLATE/DEFLATE, robot commands)
