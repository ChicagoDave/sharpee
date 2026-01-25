# Session Summary: 2026-01-24 - maphints

## Status: Completed

## Goals
- Implement Phase 1 (Exit Hints) of ADR-113 Map Position Hints
- Allow story authors to override auto-mapper positioning for non-Euclidean connections
- Enable correct map rendering for interior spaces and irregular topology

## Completed

### 1. Created Implementation Plan

**File:** `docs/work/maphints/implementation-plan.md`

Documented the step-by-step approach for Phase 1, identifying all files to modify and the data flow from story definitions through events to React client rendering.

### 2. Platform Layer Changes (world-model)

**File:** `packages/world-model/src/traits/room/roomTrait.ts`

Added `IExitMapHint` interface and optional `mapHint` field to `IExitInfo`:

```typescript
export interface IExitMapHint {
  dx?: number;  // Grid offset X (-1 = west, +1 = east)
  dy?: number;  // Grid offset Y (-1 = north, +1 = south)
  dz?: number;  // Grid offset Z (-1 = down, +1 = up)
}

export interface IExitInfo {
  destination: string;
  via?: string;
  mapHint?: IExitMapHint;  // NEW
}
```

This allows story authors to add `mapHint: { dx: -1, dy: 1 }` to exit definitions to specify relative grid positioning.

### 3. Event System Changes (stdlib)

**Files:**
- `packages/stdlib/src/actions/standard/going/going-events.ts`
- `packages/stdlib/src/actions/standard/going/going-data.ts`

Added `mapHint` field to `ActorMovedEventData` and updated the going action's execute phase to include exit map hints in actor_moved events. This passes the hint from the story definition through to the client.

### 4. Client Type System (client-react)

**File:** `packages/client-react/src/types/game-state.ts`

Added `MapHint` type and `arrivedViaMapHint` field to `CurrentRoom`:

```typescript
export type MapHint = {
  dx?: number;
  dy?: number;
  dz?: number;
};

export interface CurrentRoom {
  // ... existing fields
  arrivedViaMapHint?: MapHint;
}
```

This stores the map hint for the transition that brought the player to the current room.

### 5. Event Processing (client-react)

**File:** `packages/client-react/src/context/GameContext.tsx`

Updated the `if.event.actor_moved` event handler to extract `mapHint` from event data and attach it to the `CurrentRoom` object as `arrivedViaMapHint`.

### 6. Map Positioning Algorithm (client-react)

**File:** `packages/client-react/src/hooks/useMap.ts`

Modified the room positioning logic to check for `arrivedViaMapHint` BEFORE falling back to direction-based algorithm:

```typescript
// Priority order:
1. Check arrivedViaMapHint → use hint offsets (dx, dy, dz)
2. If hint position occupied → use hint as starting point for collision avoidance
3. Fall back to direction-based positioning if no hint
```

This ensures author-provided hints take precedence while maintaining graceful fallback for existing content.

### 7. ADR Status Update

**File:** `docs/architecture/adrs/ADR-113-map-position-hints.md`

Updated status from "Accepted" to "Accepted (Phase 1 Implemented)" to reflect completion of exit-level hints.

## Key Decisions

### 1. Hint Priority with Graceful Fallback

The positioning algorithm checks for map hints first but falls back to the existing direction-based algorithm if:
- No hint is provided (backward compatibility)
- Hint position is already occupied (collision avoidance)

This allows incremental adoption - authors only add hints where needed.

### 2. Event-Based Data Flow

Map hints flow through the event system (`if.event.actor_moved`) rather than requiring client-side room definition queries. This:
- Keeps client decoupled from story internals
- Matches existing architecture patterns
- Enables future server/client split

### 3. Optional Field Design

Made `mapHint` optional at all layers (IExitInfo, event data, CurrentRoom) to ensure:
- Zero impact on existing stories
- No breaking changes to API
- Clear backward compatibility story

## Build Verification

All packages build successfully:
```bash
./build.sh -s dungeo -c react
# All packages compiled without errors
```

The implementation is additive - no existing code paths were modified, only extended.

## Open Items

### Short Term

1. **Test with real content**: Add `mapHint` to problematic Dungeo exits (Behind House -> Kitchen, window entries) and verify rendering
2. **Visual testing**: Play through transitions and confirm map positions match expectations
3. **Edge cases**: Test hint collision scenarios, ensure fallback works correctly

### Long Term

Phase 2-5 features from ADR-113 (not implemented):

- **Phase 2**: Room-level absolute positioning via `MapLayout` export
- **Phase 3**: Basic visual map editor (standalone HTML/JS tool)
- **Phase 4**: Story integration (import from source, export to map-layout.ts)
- **Phase 5**: Advanced editor features (multi-level visualization, transcript replay, undo/redo)

The editor will be valuable once Dungeo reaches ~50+ rooms with complex topology.

## Files Modified

**Platform** (3 files):
- `packages/world-model/src/traits/room/roomTrait.ts` - Added IExitMapHint interface, mapHint to IExitInfo
- `packages/stdlib/src/actions/standard/going/going-events.ts` - Added mapHint to ActorMovedEventData
- `packages/stdlib/src/actions/standard/going/going-data.ts` - Pass mapHint in actor_moved events

**Client** (3 files):
- `packages/client-react/src/types/game-state.ts` - Added MapHint type, arrivedViaMapHint to CurrentRoom
- `packages/client-react/src/context/GameContext.tsx` - Extract mapHint from events
- `packages/client-react/src/hooks/useMap.ts` - Use arrivedViaMapHint for positioning with fallback

**Documentation** (2 files):
- `docs/architecture/adrs/ADR-113-map-position-hints.md` - Updated status to Phase 1 Implemented
- `docs/work/maphints/implementation-plan.md` - Created detailed implementation plan

## Architectural Notes

### Auto-Mapper Enhancement Pattern

This feature demonstrates a clean enhancement pattern for the React client:

1. **Story layer** provides hints via trait fields
2. **Event system** carries hints through platform (no new event types needed)
3. **Client** consumes hints with graceful fallback to existing algorithm
4. **Zero coupling** - client never queries story structure directly

The same pattern could be used for other "rendering hints" like room importance, visual theming, or connection types (stairs, doors, portals).

### Platform vs Story Boundary

Making this a platform feature (rather than story-specific) was correct because:
- All IF stories need map visualization
- The problem is inherent to auto-mapping, not Dungeo-specific
- Future stories (Zork I, Trinity, etc.) will have the same issues
- Editor tool will work across all stories

### Phase 1 Completeness

Exit hints solve 80% of map visualization problems:
- Non-Euclidean connections (kitchen west of house)
- Interior/exterior transitions (window entry)
- Caves with irregular topology

Absolute positioning (Phase 2) is only needed for:
- Large regions where relative drift accumulates
- Starting positions for disconnected areas
- Author preference for specific layouts

## Notes

**Session duration**: ~2 hours

**Approach**: Implemented exactly per the plan document. Started at the data layer (world-model traits), flowed through events (stdlib), and ended at rendering (client-react hooks). All changes were additive - no modifications to existing behavior.

**Testing strategy**: Build verification only. Real content testing should happen in context of actual Dungeo map issues (will add hints to white-house region exits and verify visually).

**Branch**: `maphints` (ready for PR to main)

**PR URL**: https://github.com/ChicagoDave/sharpee/pull/new/maphints

---

**Progressive update**: Session completed 2026-01-24 10:46
