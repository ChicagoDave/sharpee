# Coal Mine Walkthrough Plan

**Goal**: Collect 3 treasures (39 pts total) + store in trophy case
**Walkthrough**: wt-10-coal-mine.transcript (restores from wt-09)
**Last updated**: 2026-02-09

---

## Treasures

| Treasure           | Take   | Case   | Total  | Location                 |
| ------------------ | ------ | ------ | ------ | ------------------------ |
| Huge diamond       | 10     | 6      | 16     | Machine Room (from coal) |
| Sapphire bracelet  | 5      | 3      | 8      | Gas Room                 |
| Red crystal sphere | 10     | 5      | 15     | Sooty Room               |
| **Total**          | **25** | **14** | **39** |                          |

---

## Light Source Strategy

The Gas Room has flammable gas — open flames cause death. The ivory torch is an open flame; the brass lantern is electric (safe).

**Plan**:

1. Drop torch at Shaft Room (safe, central location)
2. Turn on lantern for gas area navigation
3. Get bracelet from Gas Room (lantern only)
4. Return to Shaft Room, pick up torch
5. Turn off lantern to conserve battery

---

## What's Already Implemented

### Gas Room Entry — COMPLETE (ADR-126)

Implemented via destination interceptor pattern (session 2026-02-09 12:10 PM):

- **GasRoomTrait** (`stories/dungeo/src/traits/gas-room-trait.ts`) — marker trait on Gas Room entity
- **GasRoomEntryInterceptor** (`stories/dungeo/src/interceptors/gas-room-entry-interceptor.ts`) — blocks entry when actor carries lit flame (`attributes.isFlame = true`); kills player with explosion death
- Registered in `stories/dungeo/src/index.ts` for `if.action.entering_room`
- Platform extension: going action now supports destination interceptors (`if.action.entering_room`)
- **Tests**: `gas-room-explosion.transcript` (3 pass, 2 skip), `gas-room-safe-lantern.transcript` (7 pass)
- **Open**: Cases 2/3 (lighting flame inside room, $teleport edge case) deferred to daemon/ADR-127

### Coal Machine Puzzle — COMPLETE

- **MachineStateTrait** (`stories/dungeo/src/traits/machine-state-trait.ts`) — tracks activation (one-time use, serializable)
- **Turn Switch action** (`stories/dungeo/src/actions/turn-switch/`) — story-specific action for machine activation
- **Machine entity** in `coal-mine.ts` — ContainerTrait (capacity 1), OpenableTrait, SceneryTrait
- **Test**: `coal-machine.transcript` (put coal in machine → turn switch → get diamond)

### Basket Elevator — COMPLETE

- **BasketElevatorTrait** on basket entity
- **basket-handler.ts** — lower/raise mechanics, player-in-basket travel, VehicleTrait
- Basket starts at top (Shaft Room), moves to Bottom of Shaft
- State persists via `world.getStateValue()`

### Coal Mine Region — COMPLETE (26 rooms)

- All 26 rooms created in `stories/dungeo/src/regions/coal-mine.ts`
- Connections to Mirror Room (Coal Mine state) and Cellar (slide)
- Mine maze (7 rooms) with MDL-accurate connections
- All objects placed: coal, machine, basket, bat, jade figurine, bracelet, red sphere, timber

### Bat Handler — EXISTS

- `stories/dungeo/src/handlers/bat-handler.ts` — handles vampire bat in Squeaky Room
- Bat is repelled by garlic (per `(bat as any).repelledBy = 'garlic'`)

### Mirror Room Handler — EXISTS

- `stories/dungeo/src/handlers/mirror-room-handler.ts` — handles mirror state toggling
- wt-10 will need `rub mirror` to switch to State B for coal mine access

---

## What Remains

### 1. Verify coal mine navigation (interactive testing)

Before writing the walkthrough, map exact paths interactively:

- **Mirror Room → Cold Passage → Mine Entrance**: west, south(?), north(?)
- **Mine Entrance → Sooty Room**: south → Slide Room → down → slides → Slide Ledge → south
  - **WARNING**: Slide is one-way down. Must access Slide Ledge from slide path (Slide Room → down → Slide-1 → down → Slide-2 → down → Slide-3 → east → Slide Ledge). Player cannot return up the slide to Mine Entrance — need alternate route back.
- **Mine Entrance → Coal Mine Dead End**: via mine maze or via Shaft Room → Wooden Tunnel → maze → Ladder Top → down → Ladder Bottom → northeast
- **Mine Entrance → Machine Room**: Shaft Room → basket (lower) → Bottom of Shaft → east → Machine Room
  - OR via mine maze → Ladder Top → down → Ladder Bottom → south → Timber Room → southwest → Bottom of Shaft → east
- **Gas Room access**: Wooden Tunnel → west → Smelly Room → down → Gas Room

### 2. Write wt-10-coal-mine.transcript

Route plan (needs verification):

```
$restore wt-09
$take torch
$take brass lantern

# Enter Coal Mine via Mirror Room
$teleport Mirror Room
> rub mirror                    # Toggle to State B (coal mine access)
> west                          # → Cold Passage
> west                          # → Slide Room

# Phase A: Get red crystal sphere (Sooty Room)
> north                         # → Mine Entrance (need to verify)
> south                         # → Slide Room
> down                          # → Slide-1 → Slide-2 → Slide-3 (auto-slide?)
                                # → east at Slide-3 → Slide Ledge
> south                         # → Sooty Room
> take red sphere

# Phase B: Navigate back to Mine Entrance area
# (need to find route from Slide Ledge back — up goes to Slide-2?)
> north                         # → Slide Ledge
> up                            # → Slide-2 (can we go back up?)
# ... route TBD

# Phase C: Get bracelet (Gas Room) — drop torch first
> drop torch                    # At safe location (Shaft Room)
> turn on lantern
# Navigate: Shaft Room → north → Wooden Tunnel → west → Smelly Room → down → Gas Room
> north
> west
> down
> take bracelet
> up
> east
> south                         # Back to Shaft Room

# Phase D: Get coal
# Navigate via maze or Wooden Tunnel → maze → Ladder → Dead End
# Route through maze TBD

# Phase E: Machine Room (need basket or maze route)
# Option 1: Lower basket, enter basket, ride down
# Option 2: Walk through maze to Ladder → Timber → Bottom of Shaft
> put coal in machine
> turn switch
> take diamond

# Phase F: Return, retrieve torch
> take torch
> turn off lantern

# Phase G: Return to Living Room + store treasures
$teleport Living Room
> open trophy case
> put diamond in trophy case
> put bracelet in trophy case
> put red sphere in trophy case
> put trunk in trophy case
```

### 3. Update score accounting

Expected score after wt-10: 291 + 39 (treasures) + 8 (trunk case) = 338/616

### 4. Gas Room Cases 2/3 (deferred — not blocking wt-10)

- Case 2: Lighting flame inside gas room → needs daemon or ADR-127
- Case 3: $teleport edge case → deferred
- These don't block the walkthrough since wt-10 tests safe navigation (drop torch first)

---

## Implementation Steps

| Step | Description | Status |
|------|-------------|--------|
| 1 | Gas room explosion handler | **DONE** (ADR-126 destination interceptor) |
| 2 | Coal machine puzzle (turn switch) | **DONE** (story action + MachineStateTrait) |
| 3 | Basket elevator mechanics | **DONE** (basket-handler.ts) |
| 4 | Coal mine region (26 rooms, objects) | **DONE** (coal-mine.ts) |
| 5 | Verify coal mine navigation interactively | **DONE** (coal-mine-navigation.transcript, 58 tests) |
| 6 | Write wt-10-coal-mine.transcript | **DONE** (59 tests, 281 total in 10-walkthrough chain) |
| 7 | Update score accounting | **DONE** (328/616 after wt-10) |
| 8 | Gas room Cases 2/3 | **DEFERRED** (not blocking) |

### Additional fixes during wt-10 implementation

- **Slide-3 → Cellar connection**: `connectSlideToCellar()` was defined but never called. Wired in `index.ts`.
- **Crystal sphere adjectives**: Added `adjectives: ['red']`, `['white']`, `['blue']` to all 3 crystal spheres for disambiguation when multiple are in scope.
- **Cellar → Living Room exit bug**: The UP exit from Cellar to Living Room (set when rug is pushed) doesn't survive save/restore. Workaround: $teleport in wt-10. Needs investigation.

---

## Open Questions (Resolved)

- **Mirror state after wt-09?** → STATE A (default). Mirror was never touched in any walkthrough (wt-01 through wt-09). wt-10 will need `rub mirror` to toggle to State B for coal mine access via Cold Passage → Slide Room → Mine Entrance.

- **Navigation routes?** → Must use actual navigation, NOT $teleport (walkthroughs test real routes). Need to map exact paths through the mine interactively before writing transcript.

- **Gas explosion triggers?** → Any fire causes explosion: lit torch, lit candle, lighting a match. Not just entering — also bringing fire into the room or lighting fire while in the room. Entry case now handled by destination interceptor; in-room ignition deferred.

- **Basket start position?** → Confirmed TOP. Canonical MDL source (`act2.92` line 67): `CAGE-TOP!-FLAG` initialized to `T`. Sharpee implementation matches (`basket-handler.ts` defaults to `'top'`).

## Open Questions (New)

- **Slide auto-traversal?** → Do slides auto-move player through Slide-1/2/3, or does player manually go `down` at each? Need to verify implementation.
- **Slide Ledge return route?** → Slide Ledge has `up → Slide-2` but can player actually climb up the slide? If not, Sooty Room may be a dead end without $teleport. Need to verify.
- **Bat behavior in wt-10?** → Does the vampire bat interfere with traversal through Squeaky Room? If so, need garlic. Check if garlic is in inventory after wt-09.
- **Mine maze route to Ladder Top?** → Need to find shortest path: Wooden Tunnel → NE → Mine-1 → N → Mine-4 → NE → Mine-6 → NW → Mine-7 → down → Ladder Top (5 maze rooms). Verify interactively.
