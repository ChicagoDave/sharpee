# Tea Room / Well Area - Full Canonical Implementation Plan

## Overview

The Tea Room / Well area (well-room.ts) needs comprehensive rework: wrong room connections, misplaced treasures, missing rooms, and unimplemented puzzle mechanics. This plan covers full canonical implementation.

**Canonical source**: `docs/work/dungeo/map-connections.md` + `docs/work/dungeo/dungeon-catalog.md`

**Platform patterns available** (no platform changes needed):
- **Event handlers** (ADR-052): React to `if.event.eaten` for cake effects
- **Action interceptors** (ADR-118): Hook into throwing (red cake → pool), taking (sphere → cage trap), going (carousel exits)
- **Commanding action**: Already implemented — `tell robot to X` / `robot, X` patterns work
- **Robot behavior**: Already has `onSpokenTo()` handler — needs "raise cage" command added
- **Player death**: Death penalty handler exists — can trigger via `game.player_death` event

---

## 1. Room Connection Fixes

### Current (WRONG) vs Canonical (CORRECT)

| Connection     | Current Code   | Canonical      | Fix    |
| -------------- | -------------- | -------------- | ------ |
| Tea Room E     | → Low Room     | → Pool Room    | Change |
| Tea Room N     | → Dingy Closet | _(none)_       | Remove |
| Tea Room W     | _(none)_       | → Top of Well  | Add    |
| Tea Room NW    | _(none)_       | → Low Room     | Add    |
| Low Room W     | → Tea Room     | _(none)_       | Remove |
| Low Room S     | → Top of Well  | _(none)_       | Remove |
| Low Room SE    | _(none)_       | → Tea Room     | Add    |
| Low Room E     | → Machine Room | → Machine Room | OK     |
| Machine Room W | → Low Room     | → Low Room     | OK     |
| Machine Room S | _(none)_       | → Dingy Closet | Add    |
| Dingy Closet S | → Tea Room     | _(none)_       | Remove |
| Dingy Closet N | _(none)_       | → Machine Room | Add    |
| Top of Well N  | → Low Room     | _(none)_       | Remove |
| Top of Well E  | _(none)_       | → Tea Room     | Add    |
| Pool Room      | No exits (TBD) | W → Posts Room | Add    |
| Pearl Room E   | _(none)_       | → Well Bottom  | Add    |

### Target connections:

```
Tea Room:      W → Top of Well, NW → Low Room, E → Posts Room
Posts Room:    W → Tea Room, E → Pool Room
Pool Room:     W → Posts Room
Low Room:      SE → Tea Room, E → Machine Room
Machine Room:  W → Low Room, S → Dingy Closet
Dingy Closet:  N → Machine Room
Top of Well:   E → Tea Room, D → Well Bottom
Pearl Room:    W → Riddle Room, E → Well Bottom
```

**File**: `stories/dungeo/src/regions/well-room.ts` — rewrite `setExits()` calls

---

## 2. New Room: Posts Room (ALISM)

The "enlarged" Alice room where the player arrives after eating eat-me cake.

**Canonical**: "This is a room with very large and very tall wooden posts in each corner. The room is otherwise featureless."

- Exits: W → Tea Room (return via blue cake only?), E → Pool Room
- Purpose: Transition zone between Tea Room and Pool Room
- Player arrives here by eating eat-me cake in Tea Room
- Player returns to Tea Room by eating blue-icing cake in Posts Room

**Implementation**: Add `postsRoom` to `WellRoomIds`, create room in `createWellRoomRegion()`.

**File**: `stories/dungeo/src/regions/well-room.ts`

---

## 3. Treasure Relocations

### Silver Chalice — Remove from Pool Room

| Current                      | Canonical             |
| ---------------------------- | --------------------- |
| Pool Room (well-room.ts:194) | Thief's Treasure Room |

Chalice is the thief's personal treasure. It should appear only when the thief is killed.

**Fix**: Delete `createSilverChalice()` call from `createWellRoomObjects()`. Move chalice creation to maze region (thief's treasure room or thief inventory).

**Files**: `stories/dungeo/src/regions/well-room.ts`, `stories/dungeo/src/regions/maze.ts`

### Tin of Spices — Move from Atlantis to Pool Room

| Current                    | Canonical               |
| -------------------------- | ----------------------- |
| Atlantis Room (dam.ts:543) | Pool Room (hidden)      |

The MDL room code `ALITR` = Pool Room (Alice-Trapped), NOT Atlantis Room.

**Fix**: Remove spices from `createAtlantisRoomObjects()` in dam.ts. Recreate in well-room.ts Pool Room. Initially hidden — revealed when red-icing cake dissolves pool.

**Files**: `stories/dungeo/src/regions/dam.ts`, `stories/dungeo/src/regions/well-room.ts`

---

## 4. Pool Room Rework

### Description Update

Current: "This is a large room with a pool of water in the center."

Canonical: "This is a large room, one half of which is depressed. There is a large leak in the ceiling through which brown colored goop is falling. The only exit is to the west."

### Objects in Pool Room

1. **Pool of goop** (scenery) — covers the spices. Removed when red cake is thrown.
2. **Leak** (scenery) — the ceiling leak dripping goop.
3. **Tin of spices** (treasure, hidden) — revealed when pool dissolves. 5 take + 5 case = 10 pts.

### Pool Dissolve Mechanic

When red-icing cake is thrown at the pool (or just thrown in Pool Room):
- Pool scenery entity is removed (or description changes)
- Spices become visible/takeable
- Room description changes to show cleared floor
- Red cake is consumed

**Pattern**: Action interceptor on Pool Room (or pool entity) for `if.action.throwing`. Check if thrown item is red cake → dissolve pool, reveal spices.

**File**: `stories/dungeo/src/regions/well-room.ts` + new handler file

---

## 5. Tea Room Cake Rework

### Current Objects (WRONG)

- "Eat Me" cake — placeholder `onEatEffect: 'grow'`
- "Drink Me" cake — NOT CANONICAL, should be blue-icing
- Orange cake — partially correct name, no effect

### Canonical Cakes (4 cakes)

| Cake              | Icing Text  | Effect when eaten                     | Effect when thrown            |
| ----------------- | ----------- | ------------------------------------- | ----------------------------- |
| Eat-Me (ECAKE)    | "Eat Me"    | In Tea Room → move to Posts Room      | No special effect             |
| Blue-icing (BLICE)| "Enlarge"   | In Posts Room → move to Tea Room      | No special effect             |
|                   |             | In Tea Room → CRUSH death             |                               |
| Red-icing (RDICE) | "Evaporate" | Tastes terrible (no effect)           | At pool → dissolves, reveals spices |
| Orange-icing (ORICE)| "Explode" | Explodes → player death               | Explodes → player death       |

### Implementation

1. **Rename objects**: "Drink Me" → blue-icing cake, fix orange name, add red-icing cake
2. **Cake eating handler**: Register event handler for `if.event.eaten`
   - Check which cake was eaten and player's current room
   - Eat-me + Tea Room → teleport to Posts Room
   - Blue + Posts Room → teleport to Tea Room
   - Blue + Tea Room → player death (crushed)
   - Orange anywhere → player death (explosion)
   - Red → "tastes terrible" message (no effect, but cake consumed)
3. **Cake reading**: Each cake has icing text, but only the capital letter is visible without flask/magnifying glass. Defer magnifying glass — just show "You can make out a capital E on the icing" for now.

**Pattern**: Event handler on `if.event.eaten` in story's `initializeWorld()`.

**Files**: `stories/dungeo/src/regions/well-room.ts` (objects), new handler in `stories/dungeo/src/handlers/` (effects)

---

## 6. Cage / White Sphere Puzzle

### Canonical Sequence

1. Player enters Dingy Closet, sees cage with sphere glowing beneath
2. **TAKE SPHERE**:
   - If robot IS in room: Cage drops. Player + robot trapped. Sphere under cage.
   - If robot NOT in room: Poisonous gas → player death
3. Player commands: `robot, raise cage` (or `tell robot to raise cage`)
4. Robot lifts cage. Player freed. Sphere now takeable.
5. Once solved (`cageSolvedFlag = true`), sphere stays freely takeable.

### Implementation

1. **Sphere taking interceptor**: Action interceptor on sphere entity for `if.action.taking`
   - `preValidate()`: If cage not solved, check if robot present
   - Robot present → trap sequence (move both to "cage" state, block exit)
   - Robot absent → poison death
2. **Robot "raise cage" command**: Add to robot-behavior.ts `onSpokenTo()` handler
   - When robot hears "raise cage" / "lift cage" → free player, mark solved
3. **State tracking**: `world.setStateValue('dungeo.cage.solved', true)` — once solved, sphere is freely takeable

**Pattern**: Action interceptor (ADR-118) on sphere + robot behavior command.

**Files**: `stories/dungeo/src/regions/well-room.ts` (objects), `stories/dungeo/src/npcs/robot/` (new NPC folder or extend existing), new handler

---

## 7. Robot NPC Behavior

### Already Implemented (commanding-action.ts + robot-behavior.ts)

The commanding action parses `tell robot to X` / `robot, X` and routes to `onSpokenTo()`. Robot already handles:
- follow/come
- push button
- stay/wait
- Generic "Whirr, buzz, click!" response

### Needs Adding

1. **raise cage / lift cage** — cage puzzle solution
2. **Correct follow behavior** — robot must actually move with player between rooms
3. **Button press effect** — triangular button toggles carousel mode in Low Room

**File**: `stories/dungeo/src/npcs/robot/robot-behavior.ts` (or create if not exists)

---

## 8. Low Room Carousel

### Canonical Behavior

Low Room has a magnetic anomaly. When `carouselFlip` is active (default), compass directions in Low Room are scrambled — exits randomly point to Machine Room or Tea Room.

- **Triangular button** (Machine Room): Toggles `carouselFlip` off → exits become reliable
- Robot must push the button (too small for player's finger)

### Implementation

1. **Going action interceptor** on Low Room: When `carouselFlip` is true, randomize destination between Machine Room and Tea Room (50/50 on each attempt)
2. **State flag**: `world.getStateValue('dungeo.carousel.flip')` — default true
3. **Button push**: When robot pushes triangular button, set flip to false → exits normalize

**Pattern**: Action interceptor on Low Room for `if.action.going`.

**File**: New handler in `stories/dungeo/src/handlers/carousel-handler.ts`

---

## 9. Riddle Room — Verify & Fix

The riddle answer is "a well". Must verify:
- SAY action handles `answer "well"` or `say "well"` in Riddle Room
- Solving sets `riddleSolved = true` on RiddleRoomTrait
- East exit to Pearl Room unlocks when solved

**File**: Check `stories/dungeo/src/actions/say/say-action.ts`

---

## Implementation Order

### Phase 1: Structure (no new mechanics)

1. Fix all room connections in well-room.ts
2. Create Posts Room
3. Remove chalice from Pool Room, move to maze region
4. Move spices from dam.ts to well-room.ts Pool Room (visible for now)
5. Update Pool Room description
6. Fix cake names (Drink Me → blue-icing, add red-icing)
7. Add Pearl Room → Well Bottom connection
8. **Build + test**: Verify rooms are navigable

### Phase 2: Cake Mechanics

9. Create pool scenery entity in Pool Room
10. Implement cake eating handler (eat-me/blue teleport, orange death)
11. Implement red cake throwing handler (pool dissolve, spices reveal)
12. Hide spices behind pool (not visible until dissolved)
13. **Build + test**: Verify cake puzzle works

### Phase 3: Robot & Cage Puzzle

14. Implement/extend robot follow behavior
15. Implement cage trap on sphere TAKE
16. Implement robot "raise cage" command
17. Implement poison gas death (no robot present)
18. **Build + test**: Verify cage puzzle works

### Phase 4: Carousel

19. Implement Low Room going interceptor (exit randomization)
20. Implement button push → disable carousel
21. **Build + test**: Verify carousel works

### Phase 5: Walkthrough

22. Write wt-09 transcript exercising the full area with real gameplay

---

## Walkthrough Route (real gameplay, no GDT except start teleport)

```
$restore wt-08

# Prerequisites: need water in bottle for bucket puzzle
# If bottle not in inventory, get from Kitchen first
$teleport Living Room

# Navigate to Round Room (underground, need torch)
$take torch
$take brass lantern
> west                     # Kitchen
> down                     # Cellar (or appropriate underground route)
# ... navigate to Round Room via existing underground connections ...

# Alternative: use known route from Living Room
> west                     # Kitchen
> west                     # Cellar
# (exact route depends on what's unlocked in chain state)

# At Round Room
> south                    # → Engravings Cave
> southeast                # → Riddle Room
> answer "a well"          # Solve riddle, opens east exit
> east                     # → Pearl Room
> take necklace            # Treasure: 9 take + 5 case

# Well puzzle — need water in bottle
> east                     # → Well Bottom
> enter bucket
> pour water               # Water from bottle → bucket rises
> exit bucket              # Now at Top of Well
> east                     # → Tea Room

# Tea Room cake puzzle
> take all cakes           # Get eat-me, blue, red, orange
> eat eat-me cake          # Shrink → moved to Posts Room
> east                     # → Pool Room
> throw red cake at pool   # Pool dissolves, reveals spices
> take spices              # Treasure: 5 take + 5 case
> west                     # → Posts Room
> eat blue cake            # Grow → moved back to Tea Room

# Robot and sphere puzzle
> northwest                # → Low Room (robot is here)
> tell robot to follow me  # Robot follows
> east                     # → Machine Room
> tell robot to push button # Triangular button → disable carousel
> south                    # → Dingy Closet
> take sphere              # Cage trap! Trapped with robot
> tell robot to raise cage # Robot lifts cage, frees player
> take sphere              # Now takeable. Treasure: 6 take + 6 case

# Return with treasures
# Navigate back: N → Machine Room → W → Low Room → SE → Tea Room
# → W → Top of Well → enter bucket → fill bottle → bucket descends
# → Well Bottom → W → Pearl Room → W → Riddle Room → up → Engravings
# → N → Round Room → ... → Living Room
# OR just teleport back for walkthrough brevity
$teleport Living Room

> open trophy case
> put necklace in trophy case
> put spices in trophy case
> put sphere in trophy case
```

**Key prerequisites from chain state**:
- Water in glass bottle (from Kitchen, taken in earlier walkthrough?)
- Torch for light in underground areas
- Route to Round Room must be accessible (troll dead, trapdoor open)

**NOTE**: The return route must be worked out once connections are fixed. The player may need to ride the bucket back down, or find another path. The exact navigation commands will be finalized during Phase 5 when the walkthrough is written against the working implementation.
