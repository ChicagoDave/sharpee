# Session: Adjective Resolution Fix
**Date**: 2026-01-14 01:30
**Branch**: dungeo

## Summary
Fixed entity resolution for adjective-only commands like "press yellow" to find "yellow button".

## Changes Made

### 1. Command Validator - Adjective Fallback (`packages/stdlib/src/validation/command-validator.ts`)
- Added `getEntitiesByAdjective()` method to search entities by their adjectives
- Added adjective fallback in entity resolution: when name/type/synonym search fails, try adjective search
- Added adjective matching in `scoreEntities()`: entities matching search term as adjective get score +4

### 2. Command Executor - World Context (`packages/engine/src/command-executor.ts`)
- Added `parser.setWorldContext(world, player.id, playerLocation)` call before parsing
- Parser now has world access for entity slot resolution during parsing

### 3. Unit Test (`packages/stdlib/tests/unit/validation/command-validator-golden.test.ts`)
- Added test: `adjective fallback: "press yellow" finds "yellow button"`
- Imported and registered `pushingAction` for test coverage

### 4. Package Cleanup (merged from client branch)
- Removed deprecated packages: `text-services`, `text-service-browser`, `text-service-template`
- Updated all package.json references to use `@sharpee/text-blocks` and `@sharpee/text-service`
- Updated build scripts: `build-all-dungeo.sh`, `bundle-entry.js`, `bundle-sharpee.sh`

### 5. Scheduler Messages (`stories/dungeo/src/scheduler/scheduler-messages.ts`)
- Added missing `DAM_GATES_OPEN` and `DAM_GATES_CLOSE` message IDs

## Technical Details

### The Problem
"press yellow" was failing with ENTITY_NOT_FOUND because:
1. Parser couldn't resolve "yellow" to an entity (no world context)
2. CommandValidator searched by name/alias/synonym but not adjectives
3. Even with adjective fallback, `scoreEntities()` gave 0 score to adjective-only matches

### The Solution
1. **Parser world context**: Set world context before parsing so slot consumers can resolve entities
2. **Adjective fallback**: Search entities where the term matches an adjective
3. **Adjective scoring**: Give base score of 4 to adjective matches so they pass the >0 filter

### Design Note
The parser was intentionally designed to work without world access (defer to CommandValidator). Investigation needed on why pass-through wasn't working - may be ADR documented.

## Files Changed
- `packages/stdlib/src/validation/command-validator.ts`
- `packages/engine/src/command-executor.ts`
- `packages/stdlib/tests/unit/validation/command-validator-golden.test.ts`
- `stories/dungeo/src/scheduler/scheduler-messages.ts`
- Various `package.json` files (text-service refactoring)
- Build scripts

## Testing Status
- Unit test for adjective fallback: PASSING
- Transcript test for "press yellow": Needs retest after build
- Other transcript tests: 1033 passed, 27 failed, 5 expected failures (pre-fix baseline)

## Next Steps
- Rebuild and verify "press yellow" works in transcript test
- Fix "turn bolt" message resolution (showing literal message ID)
- Investigate parser design decision around world context
