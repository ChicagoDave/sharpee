# Coal Mine Walkthrough Plan

**Goal**: Collect 3 treasures (39 pts total) + store in trophy case
**Walkthrough**: wt-10-coal-mine.transcript (restores from wt-09)

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

## Prerequisites

### Gas Room Explosion Handler (NEW)

The gas room currently warns about danger but doesn't enforce it. Before writing the walkthrough, we need to implement:

- **Going interceptor or daemon**: If player enters Gas Room (or is in Gas Room) with a lit flame source (torch, candles), trigger explosion death
- **Flame detection**: Check for lit items with `LightSourceTrait` that are flame-based (torch, candles) — NOT the lantern
- **Death mechanic**: Similar to falls-death or grue-death pattern
- **Message**: Something like "Oh dear, you seem to have let your flame get too close to the gas. **BOOOOOM**"

**Location**: `stories/dungeo/src/handlers/gas-room-handler.ts`

---

## Route

### Phase 1: Setup (Living Room → Coal Mine Entry)

```
$restore wt-09
$take torch
$take brass lantern
```

Entry to coal mine requires Mirror Room in State B (coal mine config). Current mirror state after wt-09 is unknown — may need to RUB MIRROR.

```
$teleport Mirror Room
# Check/toggle mirror state to B if needed
> west                    → Cold Passage
> south                   → Slide Room
> down                    → Mine Entrance
```

### Phase 2: Get Red Crystal Sphere (Sooty Room)

From Mine Entrance, reach Sooty Room via the slide path:

```
Mine Entrance → (slide path) → Slide Ledge → south → Sooty Room
> take red sphere
```

**Note**: Need to verify exact route from Mine Entrance to Slide Ledge. The slide is one-way down, so we need to access Sooty Room from Slide Ledge without going down the slide to Cellar.

Alternative: Use $teleport for hard-to-navigate areas, verify with LOOK.

### Phase 3: Get Coal (Coal Mine Dead End)

```
# Navigate to coal location
Mine area → Ladder Bottom → northeast → Coal Mine Dead End
> take coal
```

### Phase 4: Get Bracelet (Gas Room — Lamp Only)

This is the critical safety section:

```
# Drop torch at safe location (Shaft Room or similar)
> drop torch
> turn on lantern

# Navigate to Gas Room
Smelly Room → down → Gas Room
> take bracelet

# Return from Gas Room
> up → Smelly Room
```

### Phase 5: Coal Machine (Machine Room)

```
# Navigate to Machine Room (Bottom of Shaft area)
# May need basket to reach Bottom of Shaft
> put coal in machine
> turn switch
> take diamond
```

### Phase 6: Retrieve Torch & Return

```
# Return to where torch was dropped
> take torch
> turn off lantern          # Save battery

# Return to Living Room
$teleport Living Room
```

### Phase 7: Store Treasures

```
> open trophy case
> put diamond in trophy case
> put bracelet in trophy case
> put red sphere in trophy case
```

Also store trunk (still in inventory from wt-04):

```
> put trunk in trophy case
```

---

## Implementation Steps

1. **Implement gas room explosion handler** — story-level handler that kills player when entering Gas Room with lit flame source
2. **Verify coal mine navigation** — test routes between key rooms interactively
3. **Write wt-10 transcript** — coal mine walkthrough with all 3 treasures
4. **Update score accounting** — expected score after wt-10: 291 + 39 (treasures) + 8 (trunk case) = 338/616

---

## Open Questions (Resolved)

- **Mirror state after wt-09?** → STATE A (default). Mirror was never touched in any walkthrough (wt-01 through wt-09). wt-10 will need `rub mirror` to toggle to State B for coal mine access via Cold Passage → Slide Room → Mine Entrance.

- **Navigation routes?** → Must use actual navigation, NOT $teleport (walkthroughs test real routes). Need to map exact paths through the mine interactively before writing transcript.

- **Gas explosion triggers?** → Any fire causes explosion: lit torch, lit candle, lighting a match. Not just entering — also bringing fire into the room or lighting fire while in the room.

- **Basket start position?** → Confirmed TOP. Canonical MDL source (`act2.92` line 67): `CAGE-TOP!-FLAG` initialized to `T`. Sharpee implementation matches (`basket-handler.ts` defaults to `'top'`).
