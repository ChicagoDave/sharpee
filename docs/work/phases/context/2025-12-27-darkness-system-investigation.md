# Work Summary: Cloak of Darkness Deep Dive - Darkness System Investigation

**Date**: 2025-12-27
**Duration**: ~4-5 hours
**Branch**: phase4
**Feature/Area**: Engine event system, stdlib darkness mechanics, snapshot utilities

## Objective

Continue fixing Cloak of Darkness story issues from morning session, focusing on the losing path (entering dark bar without hanging cloak). This led to discovering fundamental issues with Sharpee's darkness system that required investigation and documentation.

## What Was Accomplished

### Session Continuation

Picked up from morning session (see `2025-12-27-cloak-of-darkness-fixes.md`) which had fixed 8 major issues. Morning work got the winning path working; afternoon focused on the losing path.

### Files Modified

#### Engine
- **`packages/engine/src/game-engine.ts`** (line 1238)
  - Fixed `dispatchEntityHandlers()` parameter type from `ISemanticEvent` to `SequencedEvent`
  - Compiler error was breaking builds
  - Type mismatch was from morning's entity handler dispatch implementation

#### Stdlib
- **`packages/stdlib/src/actions/base/snapshot-utils.ts`** (lines 181-184)
  - Fixed `captureRoomSnapshot()` to check `roomTrait.isDark`
  - Previously only checked for separate `darkness` trait
  - Now falls back to `roomTrait.isDark` if no darkness trait exists
  - Critical for entity handlers that need to know if room is dark

- **`packages/stdlib/src/actions/standard/going/going-data.ts`** (line 72)
  - Changed `captureEntitySnapshot(actor, context.world, false)` to `true`
  - Actor snapshots now include inventory by default
  - Entity handlers can now see what player is carrying
  - Essential for "is player carrying cloak?" checks

### Tests Performed

1. **Build Verification**: Confirmed TypeScript compilation successful after type fix
2. **Losing Path Test**: Tested "go south" (to bar) without hanging cloak first
3. **Entity Handler Test**: Verified bar's event handler receives correct data
4. **Player ID Test**: Discovered story was checking wrong player ID

### Documentation Created

- **`docs/work/phases/darkness-system-issues.md`**
  - Comprehensive analysis of 8 distinct issues with darkness system
  - Categorized by severity (Critical/High/Medium/Low)
  - Included code examples, impact analysis, and recommendations
  - Distinguished legitimate fixes from story-specific workarounds

## Key Decisions

### 1. **Keep Engine/Stdlib Fixes, Flag Story Hacks**

**Decision**: The three bugs fixed (type mismatch, snapshot isDark, inventory inclusion) are legitimate engine/stdlib issues and should be kept. Story's custom handler logic is a workaround for missing features.

**Rationale**:
- Bugs affect all stories, not just Cloak of Darkness
- Snapshot utilities should capture complete entity state
- Story shouldn't need custom player ID resolution logic

### 2. **Document But Don't Fix Darkness System Issues**

**Decision**: Created comprehensive issue documentation instead of implementing fixes during this session.

**Rationale**:
- Darkness system issues are systemic, not isolated bugs
- Fixing properly requires design discussion and ADR
- Multiple actions affected (looking, going, examining, etc.)
- Risk of breaking other stories if changed hastily

### 3. **Identify Looking Action's Critical Bug**

**Decision**: Flagged `requiresLight` property check as critical issue requiring immediate attention in future work.

**Rationale**:
- Property literally does not exist on RoomTrait
- Means looking action's darkness handling has never worked
- All stories using darkness may be broken
- TypeScript should have caught this but didn't due to `any` casting

## Challenges & Solutions

### Challenge 1: Story Player ID Check Failed
**Problem**: Story checked `actorSnapshot?.id === 'player'` but actual player ID was `'a01'` (generated ID).

**Solution**: Realized story needs to use `world.getPlayer()?.id` for proper comparison. This revealed event data doesn't include `isPlayer` flag, which would be helpful.

### Challenge 2: isDark Not Captured in Snapshots
**Problem**: Room snapshots sent to entity handlers showed `isDark: undefined` even for dark rooms.

**Solution**: Fixed `captureRoomSnapshot()` to check both `darkness` trait and `roomTrait.isDark`. Ensures handlers have complete room state.

### Challenge 3: Build Error After Morning Session
**Problem**: TypeScript compiler error: `dispatchEntityHandlers(event: ISemanticEvent)` but receives `SequencedEvent`.

**Solution**: Changed parameter type to match actual usage. Morning session implemented entity handler dispatch but had type mismatch.

### Challenge 4: Distinguishing Bugs from Workarounds
**Problem**: Story had multiple custom handlers doing unusual things. Hard to tell what was a story requirement vs compensating for missing features.

**Solution**: Analyzed each story customization against stdlib actions to identify what should be built-in vs story-specific logic.

## Code Quality

- ✅ All TypeScript compilation errors resolved
- ✅ Changes follow three-phase action pattern
- ✅ Snapshot utilities now capture complete state
- ✅ Type safety improved (ISemanticEvent → SequencedEvent)
- ⚠️ Looking action has critical bug (`requiresLight` property doesn't exist)
- ⚠️ Darkness checking inconsistent across actions

## Issues Discovered

### Critical Issues
1. **Looking action checks non-existent `requiresLight` property** (should be `isDark`)
   - File: `packages/stdlib/src/actions/standard/looking/looking-data.ts:26`
   - Impact: Darkness handling in looking action is completely broken
   - Never triggers "It's too dark to see" message

### High Priority Issues
2. **Inconsistent darkness checking across actions**
   - VisibilityBehavior has proper implementation
   - Looking action has broken implementation
   - Going action has partial implementation
   - No single source of truth

3. **Room snapshots didn't capture isDark** (FIXED in this session)
   - Only looked for separate `darkness` trait
   - Now checks both `darkness` trait and `roomTrait.isDark`

4. **Actor snapshots excluded inventory** (FIXED in this session)
   - Going action passed `false` to `captureEntitySnapshot`
   - Now includes inventory by default

### Medium Priority Issues
5. **No standard "disturbing the dark" mechanic**
   - Traditional IF feature: actions in dark rooms cause problems
   - Stories must implement custom handlers for this common pattern
   - Could be standardized in RoomTrait/DarknessBehavior

6. **Type mismatch in entity handler dispatch** (FIXED in this session)
   - Parameter was `ISemanticEvent`, should be `SequencedEvent`

### Low Priority Issues
7. **Event data structure not well defined**
   - Inconsistent field naming (actor vs actorSnapshot)
   - No TypeScript interfaces for event data
   - No documentation of event contracts

8. **Player identification in events is manual**
   - Handlers must compare IDs with `world.getPlayer()?.id`
   - Could include `isPlayer: boolean` flag in actor snapshots

## Testing Results

### Successful Tests
- ✅ TypeScript build completes without errors
- ✅ Room snapshots now include `isDark` property
- ✅ Actor snapshots now include inventory
- ✅ Entity handlers receive events with correct types
- ✅ Going to dark room no longer blocked (fixed in morning session)

### Pending Tests
- ⏸️ Looking action in dark room (broken due to `requiresLight` bug)
- ⏸️ Full Cloak of Darkness losing path playthrough
- ⏸️ Darkness disturbance tracking (waiting on feature discussion)

## Next Steps

### Immediate (Required for Cloak of Darkness)
1. [ ] Fix looking action's `requiresLight` → `isDark` property check
2. [ ] Review looking action's darkness logic against VisibilityBehavior
3. [ ] Test full losing path (go to bar, fumble around, lose game)
4. [ ] Verify winning path still works after fixes

### Short Term (Darkness System Cleanup)
5. [ ] Create DarknessBehavior or standardize on VisibilityBehavior usage
6. [ ] Update all actions to use consistent darkness checking
7. [ ] Document event data contracts (TypeScript interfaces)
8. [ ] Add `isPlayer` flag to actor snapshots

### Medium Term (Feature Enhancement)
9. [ ] Design ADR for darkness disturbance system
10. [ ] Implement optional disturbance tracking in RoomTrait
11. [ ] Add standard `if.event.darkness_disturbance` event
12. [ ] Update documentation with darkness system patterns

### Long Term (Polish)
13. [ ] Review other stories for darkness-related issues
14. [ ] Create darkness system guide for story authors
15. [ ] Consider light source propagation (carrying lit torch, etc.)

## References

- **Previous Session**: `docs/work/phases/context/2025-12-27-cloak-of-darkness-fixes.md`
- **Issue Documentation**: `docs/work/phases/darkness-system-issues.md`
- **ADR-051**: Three-phase action pattern
- **ADR-052**: Event handlers for custom logic
- **RoomTrait**: `packages/world-model/src/traits/RoomTrait.ts`
- **VisibilityBehavior**: `packages/world-model/src/world/VisibilityBehavior.ts`
- **Looking Action**: `packages/stdlib/src/actions/standard/looking/`

## Git Status

Branch: `phase4`
Status: Clean (all changes committed in previous session)

## Notes

### Why This Session Was Important

This session revealed that Sharpee's darkness system has fundamental design issues that go beyond individual bugs. The looking action has been broken since creation (checking a property that doesn't exist), and different actions have implemented their own darkness logic inconsistently.

### Story vs Engine Responsibilities

Cloak of Darkness required extensive custom handlers to work around missing engine features. The story shouldn't need to:
- Track disturbances manually with counters
- Implement custom darkness state updates
- Check player identity manually
- Work around snapshot data gaps

These should be standard engine/stdlib features.

### Technical Debt Identified

1. **Type Safety Gaps**: The `requiresLight` bug exists because of `any` casting in looking action
2. **Behavior Fragmentation**: Three different implementations of darkness checking
3. **Event System Immaturity**: Event data structure is ad-hoc, not standardized
4. **Missing Features**: Common IF patterns (disturbances, light propagation) not supported

### Recommended Approach

Before fixing individual bugs, we should:
1. Write ADR for darkness system design
2. Choose single source of truth (VisibilityBehavior)
3. Update all actions to use it consistently
4. Add optional disturbance tracking feature
5. Document event contracts properly

This prevents piecemeal fixes that create more inconsistency.

### Impact on Other Stories

Any story using dark rooms may be affected:
- Looking in dark rooms may not show proper "too dark" message
- Custom handlers may have incomplete snapshot data
- Disturbance tracking requires custom implementation

Should audit all stories after darkness system fixes are complete.
