# Work Summary: ADR-075 Fix and Testing Improvements

**Date**: 2025-12-30
**Branch**: dungeo

## Summary

Fixed the ADR-075 implementation that was causing 77-second module loading times due to circular dependencies. Also added timestamped file output to the transcript tester and created ADR-077 for researching a release build system.

## Problem

The ADR-075 effects-based handler pattern had been implemented in `packages/world-model/src/effects/`, but this created circular dependencies:
- `world-model/index.ts` → `effects/effect-processor.ts`
- `effect-processor.ts` → `world-model/WorldModel` and `traits/room`
- This created a cycle through the barrel exports causing Node.js to repeatedly load `index.js`

The result was 77-second module loading time, making transcript tests appear to "hang."

## Solution

**Moved effects code from `world-model` to `event-processor`** where it belongs:

1. **Created** `packages/event-processor/src/effects/`:
   - `types.ts` - Effect type definitions
   - `world-query.ts` - Read-only WorldQuery interface
   - `effect-processor.ts` - EffectProcessor class
   - `index.ts` - Barrel export

2. **Created** `packages/event-processor/src/handler-types.ts`:
   - `IGameEvent`, `StoryEventHandler`, `EntityEventHandler` types
   - Moved from `world-model/events/types.ts`

3. **Updated** `packages/world-model/src/events/types.ts`:
   - Removed Effect/WorldQuery imports and types
   - Kept only basic event types (`IGameEvent`, `LegacyEntityEventHandler`)

4. **Deleted** `packages/world-model/src/effects/` folder

5. **Updated** `stories/dungeo/src/handlers/mirror-room-handler.ts`:
   - Import Effect/WorldQuery/StoryEventHandler from `@sharpee/event-processor`

6. **Added** `@sharpee/event-processor` to dungeo's package.json dependencies

## Results

| Metric | Before | After |
|--------|--------|-------|
| Module load time | 77s | 12s |
| Mirror room test | Hanging | Passes (26/26) |
| Test execution | N/A | 28ms |

The 12s remaining is a pre-existing issue with barrel exports, not ADR-075.

## Transcript Tester Improvements

Added file output capability to `packages/transcript-tester`:

1. **New CLI option**: `--output-dir` / `-o`
   ```bash
   node packages/transcript-tester/dist/cli.js stories/dungeo --all -o test-results
   ```

2. **Output files**:
   - `results_YYYY-MM-DD_HH-MM-SS.json` - Full JSON results
   - `report_YYYY-MM-DD_HH-MM-SS.txt` - Human-readable summary

3. **Added** `test-results/` to `.gitignore`

## ADR-077 Created

Created research ADR for release build system to address the 12s module loading for authors:

**Key areas to investigate:**
- Build tool selection (esbuild, rollup, tsup)
- Package structure (single vs scoped vs layered)
- Author workflow (`npm create sharpee-story`)
- Distribution channels (npm, CDN)

**Success criteria:**
- Module loading < 500ms
- Simple `npm install sharpee`
- Full TypeScript support

## Files Changed

### New Files
- `packages/event-processor/src/effects/types.ts`
- `packages/event-processor/src/effects/world-query.ts`
- `packages/event-processor/src/effects/effect-processor.ts`
- `packages/event-processor/src/effects/index.ts`
- `packages/event-processor/src/handler-types.ts`
- `docs/architecture/adrs/adr-077-release-build-system.md`
- `test-results/` (gitignored)

### Modified Files
- `packages/world-model/src/index.ts` - Removed effects exports
- `packages/world-model/src/events/types.ts` - Simplified to basic types
- `packages/event-processor/src/index.ts` - Added effects/handler-types exports
- `packages/event-processor/src/processor.ts` - Import from local effects
- `packages/transcript-tester/src/cli.ts` - Added --output-dir option
- `packages/transcript-tester/src/reporter.ts` - Added file output functions
- `stories/dungeo/src/handlers/mirror-room-handler.ts` - Updated imports
- `stories/dungeo/package.json` - Added event-processor dependency
- `docs/work/dungeo/implementation-plan.md` - Updated status
- `docs/architecture/adrs/README.md` - Added ADRs 070-077

### Deleted Files
- `packages/world-model/src/effects/` (entire folder)

## Architecture Note

The fix respects package boundaries:
- **world-model** owns data model and types
- **event-processor** owns processing logic that applies effects to the model
- Stories import effects types from event-processor, not world-model

## Next Steps

1. Investigate ADR-077 build system options
2. Continue Dungeo implementation (remaining puzzles, NPCs, endgame)
3. Address 12s barrel export slowness (separate from ADR-075)
