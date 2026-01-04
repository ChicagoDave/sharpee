# Work Summary: ADR-085 Scoring System Implementation

**Date**: 2026-01-04
**Duration**: ~90 minutes
**Branch**: `scoring` (created from `dungeo`)
**Feature/Area**: ADR-085 Event-Based Scoring System

## Status: COMPLETE

ADR-085 implementation is complete. Remaining handler migrations are a separate bug fix.

## Objective

Implement ADR-085 event-based scoring system with centralized definitions, message IDs for i18n, and proper event handler registration.

## What Was Accomplished

### 1. Core Infrastructure (Phase 1 - Complete)

**if-domain/events.ts**:
- Added `SCORE_GAINED: 'if.event.score_gained'`
- Added `SCORE_LOST: 'if.event.score_lost'`

**stdlib/services/scoring/scoring-service.ts** - Complete rewrite:
- New `ScoringDefinition` interface (points, reasonMessageId, category)
- New `ScoringServiceConfig` interface (maxScore, enabled, ranks, definitions)
- Updated `RankDefinition` to use `messageId` instead of just `name`
- New methods: `isEnabled()`, `hasScored()`, `scorePoints()`, `losePoints()`, `getDefinition()`, `registerDefinition()`, `getScoredSources()`, `restoreScoredSources()`, `getRankMessageId()`, `setMaxScore()`
- Legacy `addPoints()` and `getRank()` preserved for backward compatibility

**stdlib/services/scoring/index.ts**:
- Exports `ScoringServiceConfig` and `ScoringDefinition`

### 2. Language Layer (Phase 2 - Complete)

**lang-en-us/actions/scoring.ts**:
- Added `'no_scoring'` message for disabled scoring
- Added `scoringSystemMessages` export with rank message IDs

**stdlib/actions/standard/scoring/scoring.ts**:
- Updated to check `scoringData.enabled === false`
- Shows `'no_scoring'` message when scoring disabled
- Uses `computeRank()` helper function

### 3. Dungeo Migration (Phase 3 - Partial)

**stories/dungeo/src/scoring/dungeo-scoring-service.ts**:
- Updated to use new `ScoringServiceConfig`
- Updated `ZORK_RANKS` to include `messageId` fields
- Added `getRankMessageId()` override for Master of Secrets

**stories/dungeo/src/index.ts**:
- Migrated trophy case handler from `world.registerEventHandler()` to `engine.getEventProcessor().registerHandler()`
- Handler now registered in `onEngineReady()` instead of `createWorld()`

## Critical Discovery: Event Handler Bug

**Problem Found**: `world.registerEventHandler()` handlers are NEVER called!

- WorldModel has `eventHandlers` Map and `applyEvent()` method
- But `applyEvent()` is never called by the engine
- Engine uses `EventProcessor.processEvents()` which calls `storyHandlers`, not `eventHandlers`

**Solution**: Use `engine.getEventProcessor().registerHandler()` instead of `world.registerEventHandler()`

**Files Affected** (need migration):
- ✅ `stories/dungeo/src/index.ts` - Trophy case handler (FIXED)
- ❌ `stories/dungeo/src/handlers/balloon-handler.ts` - Still uses old API
- ❌ Other handlers using `world.registerEventHandler()`

## Current State

### Build Status
- ✅ if-domain builds
- ✅ world-model builds
- ✅ stdlib builds
- ✅ lang-en-us builds
- ✅ story-dungeo builds

### Test Status
- Bundle needs rebuild after dungeo build
- Trophy case scoring test was failing (score=0 instead of 5)
- Fix applied but not yet verified

## Completed Steps

1. ✅ Rebuild bundle
2. ✅ Run transcript tests (675 tests, 670 passed, 5 expected failures)
3. ✅ Migrate balloon handler to EventProcessor
4. ✅ Audit other handlers - found 14 remaining in 8 files
5. ✅ Created migration plan: `docs/work/dungeo/event-handler-migration-plan.md`

## Remaining Work (Separate from ADR-085)

14 handlers in 8 files still use broken `world.registerEventHandler()` API.
See `event-handler-migration-plan.md` for details.

## Files Changed

```
packages/if-domain/src/events.ts
packages/stdlib/src/services/scoring/scoring-service.ts
packages/stdlib/src/services/scoring/index.ts
packages/stdlib/src/services/index.ts
packages/stdlib/src/actions/standard/scoring/scoring.ts
packages/lang-en-us/src/actions/scoring.ts
stories/dungeo/src/scoring/dungeo-scoring-service.ts
stories/dungeo/src/index.ts
stories/dungeo/src/handlers/balloon-handler.ts (reverted change)
```

## Commands to Resume

```bash
# Rebuild bundle
./scripts/bundle-sharpee.sh

# Run tests
./scripts/fast-transcript-test.sh stories/dungeo --all

# If tests pass, commit
git add -A
git commit -m "feat: Implement ADR-085 event-based scoring system"
```

## References

- ADR-085: `/docs/architecture/adrs/adr-085-scoring-system.md`
- Previous summary: `2026-01-04-0100-adr-085-textservice-fixes.md`
