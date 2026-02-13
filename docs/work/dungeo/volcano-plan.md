# Volcano Puzzle Plan

## Context

The volcano region is ~70% implemented (rooms, balloon objects, traits, daemons, some actions) but has critical gaps: wrong room connections, misplaced treasures, hooks in wrong location, incomplete balloon flight mechanics, and no walkthrough coverage. This plan fixes those issues based on verified MDL source (`docs/internal/dungeon-81/patched_confusion/dung.mud`).

---

## MDL-Verified Room Layout

```
STREA (Stream View)     ←  N  →  ICY (Glacier Room)    [dam.ts region]
                                   E → EGYPT, W → RUBYR (cond: glacier melted)

EGYPT (Egyptian Room)    UP → ICY (Glacier Room)
                         S  → LEDG3 (Volcano View)
                         E  → CRAW1 (cond: no coffin carried)

LEDG3 (Volcano View)    E → EGYPT  [dead-end lookout, NO balloon dock]

RUBYR (Ruby Room)        W → LAVA,  S → ICY
LAVA  (Lava Room)        S → VLBOT, W → RUBYR
VLBOT (Volcano Bottom)   N → LAVA   [balloon starts here]

Balloon shaft: VLBOT → VAIR1 → VAIR2 → VAIR3 → VAIR4 → rim (death)

LEDG2 (Narrow Ledge)    dock at VAIR2, S → LIBRA
                         has HOOK1 + COIN on floor
LIBRA (Library)          N → LEDG2
                         has 4 books (purple book contains stamp)

LEDG4 (Wide Ledge)      dock at VAIR4, S → SAFE
                         has HOOK2 on wall
SAFE  (Dusty Room)       N → LEDG4
                         has SSLOT (hole) + SAFE object (CROWN + CARD inside)
```

**Note:** "Volcano Core" room does NOT exist in MDL. Remove it. CXGNOME exits (gnome NPC) on LEDG2/LEDG4 are deferred.

### Connection Fixes Needed (current → MDL)

| Room | Current | MDL Correct |
|------|---------|-------------|
| Egyptian Room | W → Glacier Room | UP → Glacier Room, S → Volcano View |
| Glacier Room | E → Egyptian Room only | N → Stream View, E → Egyptian Room, W → Ruby Room (cond) |
| Volcano View | S → Glacier, DOWN → Wide Ledge | E → Egyptian Room only |
| Wide Ledge | UP → VolcView, W → Narrow, DOWN → VBot | S → Dusty Room only (+ balloon LAUNCH) |
| Narrow Ledge | E → Wide Ledge, W → Dusty Room | S → Library only (+ balloon LAUNCH) |
| Dusty Room | E → Narrow, N → Library | N → Wide Ledge only |
| Library | S → Dusty Room | N → Narrow Ledge |
| Ruby Room | W → Volcano Core | W → Lava Room, S → Glacier Room |
| Lava Room | N → Volcano Core | W → Ruby Room, S → Volcano Bottom |
| Volcano Bottom | UP → Wide Ledge, N → Lava | N → Lava Room only |
| Volcano Core | EXISTS | DELETE — not in MDL |

---

## Implementation Steps

### Step 1: Fix Room Structure & Connections

**File:** `stories/dungeo/src/regions/volcano.ts`

1. **Remove Volcano Core room** — delete creation, remove from VolcanoRoomIds
2. **Fix ALL connections** per the table above:
   - Egyptian Room: UP→Glacier Room, S→Volcano View (remove W→Glacier)
   - Glacier Room: E→Egyptian Room, N→Stream View (external), W→Ruby Room (conditional on glacier melted)
   - Volcano View: E→Egyptian Room ONLY
   - Wide Ledge: S→Dusty Room ONLY (no UP, no W, no DOWN). DOWN→death message
   - Narrow Ledge: S→Library ONLY. DOWN→death message
   - Dusty Room: N→Wide Ledge
   - Library: N→Narrow Ledge
   - Ruby Room: W→Lava Room, S→Glacier Room
   - Lava Room: W→Ruby Room, S→Volcano Bottom
   - Volcano Bottom: N→Lava Room ONLY (no UP)
3. **Add death exits** for ledge DOWN: use `via` field or NEXIT pattern

**Also update:** dam.ts external connector (Stream View ↔ Glacier Room). MDL says both rooms use NORTH direction. Current connector goes Stream View S→Glacier. Verify and fix: `stories/dungeo/src/regions/dam.ts` line ~187.

### Step 2: Move Hooks to Ledge Walls

**File:** `stories/dungeo/src/regions/volcano.ts`

Currently HOOK1 and HOOK2 are created inside the balloon basket. Move them:
- HOOK1 → Narrow Ledge room (LEDG2)
- HOOK2 → Wide Ledge room (LEDG4)

**Then update:** `stories/dungeo/src/actions/tie/tie-action.ts` — verify TIE WIRE TO HOOK works when hook is in the room (not in the same container as the wire). The wire is scenery inside the balloon. The hook is scenery in the room. Player says "tie wire to hook" while in balloon docked at ledge.

### Step 3: Relocate Crown + Safe + CARD from Bank to Volcano

**Remove from:** `stories/dungeo/src/regions/bank-of-zork.ts`
- Delete `createSafe()` function and its call at line 226

**Add to:** `stories/dungeo/src/regions/volcano.ts` in `createDustyRoomObjects()`

Objects to create in Dusty Room:
1. **SSLOT** — "hole" / "slot" — a visible, open container (the damaged hole in the front of the safe)
   - Aliases: slot, hole
   - OpenableTrait (isOpen: true, cannot close)
   - ContainerTrait (capacity: 1 item)
   - SceneryTrait
2. **SAFE** — "box" / "safe" — rusty, imbedded in wall, contains crown + card
   - Current createSafe() code is mostly correct, but:
   - Change description: "Imbedded in the far wall, there is a rusty old box. An oblong hole has been chipped out of the front of it."
   - LockableTrait removed — safe is "rusted shut" (not locked, just stuck). Block OPEN with custom message.
   - After explosion: door blown off, contents accessible
   - Use `entity.attributes.safeBlownOpen = false` for state
3. **CROWN** — keep as-is (OFVAL 15, OTVAL 10), inside safe
4. **CARD** — warning note inside safe
   - ReadableTrait: "Warning: This room was constructed over very weak rock strata. Detonation of explosives in this room is strictly prohibited! — Frobozz Magic Cave Company, per M. Agrippa, foreman"
   - Small, takeable, burnable

### Step 4: Relocate Zorkmid Coin from Bank to Volcano

**Remove from:** `stories/dungeo/src/regions/bank-of-zork.ts`
- Delete `createZorkmidCoin()` function and its call at line 225

**Add to:** `stories/dungeo/src/regions/volcano.ts` — new function `createNarrowLedgeObjects()`

Zorkmid coin placed on Narrow Ledge floor:
- OFVAL 10, OTVAL 12
- ReadableTrait: "GOLD ZORKMID — In Frobs We Trust"
- Aliases: coin, zorkmid, gold coin, zorkmid coin

### Step 5: Verify & Complete Balloon Flight

**Files:**
- `stories/dungeo/src/scheduler/balloon-daemon.ts`
- `stories/dungeo/src/handlers/balloon-handler.ts`
- `stories/dungeo/src/interceptors/receptacle-putting-interceptor.ts`
- `stories/dungeo/src/traits/balloon-state-trait.ts`

Check/fix these items:

1. **Receptacle interceptor registration** — verify it's actually wired up in command-transformers or story setup. If not, register it. Critical for: put burning item in receptacle → inflate balloon.

2. **Balloon crash at VAIR4** — when balloon rises above VAIR4 (would be VAIR5), destroy balloon:
   - Remove balloon entity, create dead balloon at VLBOT
   - If player inside: instant death
   - Currently has TODOs — implement the death

3. **Exit routing** — only 2 valid docking points:
   - VAIR2 → exit to Narrow Ledge (LEDG2)
   - VAIR4 → exit to Wide Ledge (LEDG4)
   - VAIR1, VAIR3 → block exit ("It would be fatal to disembark here")

4. **VehicleTrait.positionRooms** mapping — update to match new room structure

5. **Fuel duration** — MDL: `<* <OSIZE <PRSO>> 20>` turns. Guidebook OSIZE = 10 → 200 turns. Verify our burn daemon matches.

### Step 6: Glacier Melting

**New file:** `stories/dungeo/src/interceptors/glacier-interceptor.ts` (or handler)

MDL source (`act1.mud` lines 369-407): There is only ONE Glacier Room (`ICY`). The WEST exit uses a `CEXIT` (conditional exit) gated by `GLACIER-FLAG`. The ICE object (`["ICE" "MASS" "GLACI"]`) is an alias — `GLACI` is NOT a second room, it's the glacier object's alias.

**Mechanic (from MDL GLACIER function):**
- THROW TORCH AT GLACIER:
  - Remove ICE object from room
  - Move torch to Stream View (carried downstream by melt water — NOT destroyed)
  - Set GLACIER-FLAG = true → unlocks WEST exit to Ruby Room
  - Message: "The torch hits the glacier and explodes into a great ball of flame, devouring the glacier. The water from the melting glacier rushes downstream, carrying the torch with it. In the place of the glacier, there is a passageway leading west."
- THROW anything else: "The glacier is unmoved by your ridiculous attempt."
- MELT (verb with torch): Partially melts glacier, turns off torch, kills player ("You seem to have gotten a bit wet...")

**GLACIER-ROOM function (custom LOOK):**
- If GLACIER-FLAG (fully melted): room desc + "There is a large passageway leading westward."
- If GLACIER-MELT (partially melted): room desc + "Part of the glacier has been melted."
- Otherwise: room desc + glacier object desc ("A mass of ice fills the western half of the room.")

**Implementation:**
- Glacier Room WEST exit uses `via` field gated by `room.attributes.glacierMelted`
- Interceptor on THROWING action targeting glacier:
  - Check if thrown object is the torch (lit)
  - Remove ICE entity, move torch to Stream View room (not destroyed — player can retrieve it later)
  - Set `glacierMelted = true` on Glacier Room, unlock WEST exit
- Register in story interceptors
- Note: Player loses their torch here but can get it back from Stream View

### Step 7: Brick/Fuse/Safe Explosion

This is a complex multi-part mechanic from MDL (act2.mud lines 646-736):

**Mechanic summary:**
1. Brick is in Attic (house-interior.ts, already exists with fuse wire)
2. Player carries brick to Dusty Room, puts it in SSLOT (the hole in safe)
3. Player lights the fuse wire → 2-turn countdown (FUSIN timer)
4. After 2 turns, explosion:
   - If brick in SSLOT AND in SAFE room: **safe blown open** (door off, SAFE-FLAG true, SSLOT hidden)
   - If brick in player's room: player dies
   - If brick elsewhere: room is "munged" (debris blocks passage)
5. 5 turns after explosion (SAFIN timer):
   - SAFE room collapses (debris blocks passage, kills player if present)
   - LEDG4 (Wide Ledge) also collapses (blocks balloon landing, kills player if there)

**Implementation approach:**
- **Fuse daemon** (like candle-fuse pattern): 2-turn timer, checks brick location
- **Explosion handler**: handles safe opening, room munging, death conditions
- **Collapse daemon** (SAFIN): 5-turn timer, collapses Dusty Room + Wide Ledge
- **Room mung state**: `entity.attributes.isMunged = true` + blocked exits

**Intended player sequence:**
1. Fly to Wide Ledge (LEDG4), exit balloon
2. Go S to Dusty Room, put brick in slot
3. Light fuse, go N to Wide Ledge
4. Board balloon, untie wire (balloon starts moving)
5. Wait — BOOM (you're in balloon, flying away from LEDG4)
6. Balloon descends (fuel may be running low)
7. Dock at Narrow Ledge (LEDG2) if fuel remains, or land at VLBOT
8. Return to Dusty Room via... hmm, LEDG4 is collapsed

**Critical question:** After LEDG4 collapses, how does the player reach the open safe? They need to dock at LEDG4 again, but it's collapsed. The MDL LEDGE-MUNG says "cannot be landed on" — maybe walking from Dusty Room N to LEDG4 still works? Or maybe the intended sequence is to take the crown BEFORE the collapse by staying in Dusty Room (risky — 5 turns before it collapses).

**Recommendation:** Implement the basic fuse/explosion mechanic, verify exact timing during implementation against MDL. The walkthrough will validate the correct sequence.

### Step 8: Walkthrough Transcript

**New/expanded transcript for balloon flight + volcano treasures**

Could be a new wt-13 or expand wt-05 (currently just Egyptian Room coffin).

Walkthrough covers:
1. Get brick from Attic
2. Navigate to Glacier Room, melt glacier (throw torch)
3. Path to Volcano Bottom: Ruby Room → Lava Room → Volcano Bottom
4. Balloon flight: light guidebook, put in receptacle, board
5. Rise to VAIR2, tie at Narrow Ledge — take coin, visit Library (take stamp)
6. Rise to VAIR4, tie at Wide Ledge — go to Dusty Room, take emerald
7. Brick/safe puzzle — put brick in slot, light fuse, escape, take crown
8. Return to Living Room, store treasures

### Step 9: Update Catalog & Scoring

**File:** `docs/work/dungeo/dungeon-catalog.md`

- Crown location: Bank Chairman's Office → Volcano Dusty Room
- Zorkmid coin location: Bank Small Room → Volcano Narrow Ledge
- Add SSLOT and CARD objects
- Verify score totals unchanged (just location moves)

---

## Implementation Order

1. Step 1 (connections) — foundational, everything depends on correct rooms
2. Step 2 (hooks) — needed for balloon docking
3. Steps 3-4 (treasure relocation) — needed for walkthrough
4. Step 5 (balloon flight) — verify/fix existing code
5. Step 6 (glacier) — needed for ground path to volcano
6. Step 7 (brick/safe) — complex, may be phased
7. Step 8 (walkthrough) — validates everything
8. Step 9 (catalog) — documentation cleanup

## Verification

1. `./build.sh -s dungeo` — must compile clean
2. `node dist/cli/sharpee.js --test stories/dungeo/tests/transcripts/balloon-*.transcript` — existing balloon tests pass
3. `node dist/cli/sharpee.js --test --chain stories/dungeo/walkthroughs/wt-*.transcript` — full chain passes (verify bank walkthrough still works after removing crown/coin)
4. New volcano walkthrough passes end-to-end
5. Crown in Dusty Room safe, coin on Narrow Ledge, NOT in bank
