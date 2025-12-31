# Work Summary: Coal Mine Restructure & Dam Puzzle Fix

**Date**: 2025-12-30
**Branch**: dungeo
**Session Focus**: Restructure Coal Mine region to match map-connections.md, fix Dam puzzle sequence

---

## What Was Done

### 1. Dam Puzzle Sequence Fix

Fixed the dam draining sequence to match Mainframe Zork:

**Old (wrong) flow:**
1. Turn bolt with wrench → loosens bolt
2. Press yellow button → starts draining

**New (correct) flow:**
1. Press **yellow button** in Maintenance Room → enables bolt (green bubble glows)
2. Go to Dam, **turn bolt with wrench** → starts draining sequence

**Files Modified:**
- `src/scheduler/dam-fuse.ts` - Renamed `boltLoose` to `buttonPressed`, swapped handler logic, added `isYellowButtonPressed()` helper

### 2. Mirror Room Mechanic Clarified

Updated understanding of Mirror Room - it's ONE room with TWO exit states (not two separate rooms):

**State A** (Grail Room/Hades):
- N → Narrow Crawlway
- W → Winding Passage
- E → Tiny Cave → Hades

**State B** (Coal Mine):
- N → Steep Crawlway
- W → Cold Passage
- E → Small Cave → Atlantis Room

RUB MIRROR toggles between states. Implementation pending.

### 3. New Rooms Created (21 total)

**Mirror-related (underground region):**
- `small-cave.ts` - Above Atlantis Room (Mirror State B east exit)

**Coal Mine region (20 new rooms):**
- `cold-passage.ts` - Mirror State B west exit
- `steep-crawlway.ts` - Mirror State B north exit
- `slide-room.ts` - Top of one-way slide
- `slide-1.ts`, `slide-2.ts`, `slide-3.ts` - One-way slide to Cellar
- `slide-ledge.ts` - Exit point from slide
- `sooty-room.ts` - Contains red crystal sphere treasure
- `mine-entrance.ts` - Main entrance to coal mine
- `squeaky-room.ts` - Room with squeaky floor
- `wooden-tunnel.ts` - Tunnel to mine maze
- `smelly-room.ts` - Gas smell, leads down to Gas Room
- `mine-maze-1.ts` through `mine-maze-7.ts` - 7 mine maze rooms
- `coal-mine-dead-end.ts` - Dead end in mine
- `bottom-of-shaft.ts` - Bottom of mine shaft

### 4. Coal Mine Region Completely Rewired

Rewrote `src/regions/coal-mine/index.ts`:
- Updated `CoalMineRoomIds` interface with all 30 room IDs
- Complete new connection map matching `map-connections.md`
- Added `connectCoalMineToMirrorRoom()` for Mirror Room State B
- Added `connectSlideToCellar()` for one-way slide exit
- Deprecated `connectCoalMineToDam()` (old connection pattern)

### 5. Underground Region Updated

Updated `src/regions/underground/index.ts`:
- Added Small Cave room
- Updated Atlantis Room to connect UP to Small Cave (not old Cave)
- Added Small Cave connections

---

## Files Changed

### New Files (21)
```
src/regions/underground/rooms/small-cave.ts
src/regions/coal-mine/rooms/cold-passage.ts
src/regions/coal-mine/rooms/steep-crawlway.ts
src/regions/coal-mine/rooms/slide-room.ts
src/regions/coal-mine/rooms/slide-1.ts
src/regions/coal-mine/rooms/slide-2.ts
src/regions/coal-mine/rooms/slide-3.ts
src/regions/coal-mine/rooms/slide-ledge.ts
src/regions/coal-mine/rooms/sooty-room.ts
src/regions/coal-mine/rooms/mine-entrance.ts
src/regions/coal-mine/rooms/squeaky-room.ts
src/regions/coal-mine/rooms/wooden-tunnel.ts
src/regions/coal-mine/rooms/smelly-room.ts
src/regions/coal-mine/rooms/mine-maze-1.ts
src/regions/coal-mine/rooms/mine-maze-2.ts
src/regions/coal-mine/rooms/mine-maze-3.ts
src/regions/coal-mine/rooms/mine-maze-4.ts
src/regions/coal-mine/rooms/mine-maze-5.ts
src/regions/coal-mine/rooms/mine-maze-6.ts
src/regions/coal-mine/rooms/mine-maze-7.ts
src/regions/coal-mine/rooms/coal-mine-dead-end.ts
src/regions/coal-mine/rooms/bottom-of-shaft.ts
```

### Modified Files
```
src/scheduler/dam-fuse.ts
src/regions/coal-mine/index.ts (complete rewrite)
src/regions/underground/index.ts
src/regions/well-room/rooms/tiny-cave.ts (removed "small cave" alias)
docs/work/dungeo/implementation-plan.md
```

---

## Progress Update

- **Rooms**: 110 → 131 (~190 total) = **69%**
- **Treasures**: 25/32 (433/616 points) = **70%**

---

## Next Steps

1. **Mirror Room State Toggle**
   - Add `mirrorState: 'A' | 'B'` flag to room
   - RUB MIRROR handler to swap all three exits
   - Connect Cold Passage/Steep Crawlway/Small Cave when in State B

2. **External Connections Needed**
   - Slide-3 → DOWN → Cellar (one-way)
   - Coal Mine to Mirror Room (State B)

3. **Red Crystal Sphere Treasure**
   - Add to Sooty Room once implemented

4. **Story index.ts Updates**
   - May need to update connection calls in main story setup
