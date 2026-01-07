# Dungeo Implementation Tracking

**Target**: Mainframe Zork 616-point version + ADR-078 extension
**Current Progress**: 169 rooms (100%), 650/650 treasure points (100%) ✅

---

## Rooms by Region

### The House and Forest (Surface)

| Room | Status | Notes |
|------|--------|-------|
| West of House | ✅ Done | Starting location, mailbox |
| North of House | ✅ Done | |
| South of House | ✅ Done | |
| Behind House | ✅ Done | Window entrance |
| Kitchen | ✅ Done | Sack, bottle |
| Living Room | ✅ Done | Trophy case, trapdoor, lantern, sword |
| Attic | ✅ Done | Rope, nasty knife |
| Forest Path 1 | ✅ Done | Climbable tree |
| Forest Path 2 | ✅ Done | |
| Forest Path 3 | ✅ Done | |
| Forest Path 4 | ✅ Done | |
| Clearing | ✅ Done | Grating to maze |
| Up a Tree | ✅ Done | Egg in nest |
| Canyon View | ✅ Done | Top of Great Canyon |
| Rocky Ledge | ✅ Done | Halfway down canyon |
| Canyon Bottom | ✅ Done | Bottom of canyon |

### The Cellar and Troll Area

| Room | Status | Notes |
|------|--------|-------|
| Cellar | ✅ Done | Central hub |
| Troll Room | ✅ Done | Troll guards passage |
| East-West Passage | ✅ Done | |
| Round Room | ✅ Done | Spins until stopped |
| Narrow Passage | ✅ Done | |
| Gallery | ✅ Done | Painting treasure |
| Studio | ✅ Done | Chimney to kitchen |

### The Maze

| Room | Status | Notes |
|------|--------|-------|
| Maze 1-15 (all alike) | ✅ Done | 15 twisty passage rooms |
| Grating Room | ✅ Done | Exit to surface via grating |
| Dead End 1-5 | ✅ Done | 5 dead end rooms |
| Cyclops Room | ✅ Done | Say "Odysseus" (TBD) |
| Treasure Room | ✅ Done | Thief's lair |

### Round Room and Carousel Area

| Room | Status | Notes |
|------|--------|-------|
| Round Room | ✅ Done | Spins until stopped |
| Engravings Cave | ✅ Done | S/N from Round Room |
| Winding Passage | ✅ Done | SE from Round Room |
| North-South Passage | ✅ Done | NE from Round Room |
| Narrow Crawlway | ✅ Done | Between Grail Room and Mirror Room |
| Mirror Room | ✅ Done | Mirror puzzle base |
| Cave | ✅ Done | Leads to Hades or Atlantis |
| Chasm | ✅ Done | N of N/S Passage |
| Grail Room | ✅ Done | Grail treasure |
| Damp Cave | ✅ Done | Above Loud Room |
| Deep Canyon | ✅ Done | In dam region |

### The Well and Tea Room

| Room | Status | Notes |
|------|--------|-------|
| Well Room | ✅ Done | Bucket mechanism |
| Tea Room | ✅ Done | Cakes (eat-me, drink-me) |
| Posts Room | ✅ Done | Tiny size area |
| Pool Room | ✅ Done | Spices |
| Tiny Cave | ✅ Done | |
| Riddle Room | ✅ Done | Answer "well" - puzzle implemented |
| Pearl Room | ✅ Done | Necklace |
| Circular Room | ✅ Done | Same as Round Room |
| Low Room | ✅ Done | Robot NPC |
| Machine Room (well) | ✅ Done | Triangular button for carousel |
| Dingy Closet | ✅ Done | White sphere treasure |

### Flood Control Dam #3

| Room | Status | Notes |
|------|--------|-------|
| Dam | ✅ Done | Bolt to drain reservoir |
| Dam Lobby | ✅ Done | Guidebook, matchbook |
| Dam Base | ✅ Done | Deflated boat, pump |
| Maintenance Room | ✅ Done | Wrench, screwdriver, buttons |
| Loud Room | ✅ Done | Platinum bar, say "echo" |
| Ancient Chasm | ✅ Done | E of Loud Room |
| Temple Dead End 1 | ✅ Done | W of Ancient Chasm |
| Temple Dead End 2 | ✅ Done | N of Ancient Chasm, E crack to Basin Room |
| Temple Small Cave | ✅ Done | E of Ancient Chasm, S to Rocky Shore |
| Basin Room | ✅ Done | ADR-078: Thief's Canvas puzzle (ghost ritual) |

### The Reservoir

| Room | Status | Notes |
|------|--------|-------|
| Reservoir | ✅ Done | Trunk when drained |
| Reservoir South | ✅ Done | |
| Reservoir North | ✅ Done | Connects to Atlantis |
| Stream View | ✅ Done | |
| Glacier Room | ✅ Done | Melt glacier with torch |
| Deep Ravine | ✅ Done | Connects E/W Passage to Rocky Crawl |
| Rocky Crawl | ✅ Done | Connects Deep Ravine to Dome Room |

### The Dome and Temple

| Room | Status | Notes |
|------|--------|-------|
| Dome Room | ✅ Done | Rope tie point |
| Torch Room | ✅ Done | Ivory torch |
| Temple | ✅ Done | Bell |
| Altar | ✅ Done | Book, candles |
| Narrow Corridor | ✅ Done | |
| Entry to Hades | ✅ Done | Bell/book/candle puzzle |
| Land of the Dead | ✅ Done | Endgame trigger |
| Egyptian Room | ✅ Done | Gold coffin |
| Tiny Room | ✅ Done | Key puzzle |
| Dreary Room | ✅ Done | Blue crystal sphere |

### Mirror Rooms

| Room | Status | Notes |
|------|--------|-------|
| Mirror Room | ✅ Done | State toggle (RUB MIRROR) - ADR-075 implemented |
| Small Cave | ✅ Done | Above Atlantis (Mirror State B east) |
| Tiny Cave | ✅ Done | Above Hades (Mirror State A east) |
| Winding Passage | ✅ Done | Mirror State A west |
| Narrow Crawlway | ✅ Done | Mirror State A north |
| Cold Passage | ✅ Done | Mirror State B west |
| Steep Crawlway | ✅ Done | Mirror State B north |

**Note**: Mirror Room state toggle now working via ADR-075 effects-based handler pattern (2025-12-30).

### The Coal Mine

| Room | Status | Notes |
|------|--------|-------|
| Slide Room | ✅ Done | Entry from Cold Passage |
| Slide 1-3 | ✅ Done | One-way slide to Cellar |
| Slide Ledge | ✅ Done | Exit from slide |
| Sooty Room | ✅ Done | Red crystal sphere |
| Mine Entrance | ✅ Done | Main mine entry |
| Squeaky Room | ✅ Done | Squeaky floor |
| Shaft Room | ✅ Done | Basket mechanism |
| Wooden Tunnel | ✅ Done | To mine maze |
| Smelly Room | ✅ Done | Gas smell |
| Gas Room | ✅ Done | Lamp only! Bracelet |
| Mine Maze 1-7 | ✅ Done | 7 maze rooms |
| Ladder Top | ✅ Done | |
| Ladder Bottom | ✅ Done | |
| Coal Mine Dead End | ✅ Done | |
| Timber Room | ✅ Done | |
| Bottom of Shaft | ✅ Done | |
| Machine Room | ✅ Done | Coal to diamond |
| Bat Room | ✅ Done | Garlic required, jade |
| Coal Mine | ✅ Done | Old coal source room |
| Drafty Room | ✅ Done | Legacy room |

### Frigid River

| Room | Status | Notes |
|------|--------|-------|
| Frigid River 1 | ✅ Done | Boat required |
| Frigid River 2 | ✅ Done | |
| Frigid River 3 | ✅ Done | |
| Shore | ✅ Done | |
| Sandy Beach | ✅ Done | Buried statue |
| Aragain Falls | ✅ Done | Rainbow |
| On the Rainbow | ✅ Done | |
| End of Rainbow | ✅ Done | Pot of gold |
| White Cliffs Beach | ✅ Done | |
| White Cliffs | ✅ Done | |
| Rocky Shore | ✅ Done | |
| Atlantis | ✅ Done | Trident |
| Cave Behind Falls | ✅ Done | |
| Small Cave | ✅ Done | Above Atlantis (Mirror Room) |

### The Volcano

| Room | Status | Notes |
|------|--------|-------|
| Volcano Bottom | ✅ Done | N → Lava Room |
| Volcano Core | ✅ Done | Rising/falling |
| Volcano View | ✅ Done | |
| Narrow Ledge | ✅ Done | Zorkmid coin (Ledge-1) |
| Dusty Room | ✅ Done | Crown |
| Ruby Room | ✅ Done | Ruby treasure |
| Lava Room | ✅ Done | Connects Ruby Room to Volcano |
| Wide Ledge | ✅ Done | Ledge-2, E → Dusty Room |
| Library | ✅ Done | Stamp in purple book |

### The Bank of Zork

| Room | Status | Notes |
|------|--------|-------|
| East of Chasm | ✅ Done | |
| West of Chasm | ✅ Done | |
| Bank Entrance | ✅ Done | |
| Bank Lobby | ✅ Done | |
| West Teller | ✅ Done | |
| East Teller | ✅ Done | |
| Chairman's Office | ✅ Done | Portrait |
| Safety Deposit | ✅ Done | Curtain of light |
| Vault | ✅ Done | Zorkmid bills |
| Viewing Room | ✅ Done | |
| Small Room | ✅ Done | Through south wall |

### The Royal Puzzle

| Room | Status | Notes |
|------|--------|-------|
| Square Room | ✅ Done | E of Treasure Room |
| Puzzle Room | ✅ Done | Entry point above puzzle |
| Room in a Puzzle | ✅ Done | 8x8 grid - movement, look, card taking, exit all working |

### The Endgame

| Room | Status | Notes |
|------|--------|-------|
| Tomb of Unknown Implementer | ✅ Done | Room+door, S→Land of Dead, N→Crypt |
| Crypt | ✅ Done | Endgame trigger location, S→Tomb |
| Top of Stairs | ✅ Done | Endgame start (Phase 1) |
| Stone Room | ✅ Done | Button |
| Small Room | ✅ Done | Laser beam |
| Hallway | ✅ Done | Mirror entrance, statues |
| Inside Mirror | ✅ Done | Rotating box puzzle - poles, panels, rotation, movement all working |
| Dungeon Entrance | ✅ Done | Trivia questions location |
| Narrow Corridor | ✅ Done | |
| East-West Corridor | ✅ Done | |
| Parapet | ✅ Done | Dial mechanism location |
| Prison Cell | ✅ Done | Cell door |
| Treasury of Zork | ✅ Done | Victory location |

---

## Treasures (33 items, 650 points)

| # | Treasure | Take | Case | Total | Location | Status |
|---|----------|------|------|-------|----------|--------|
| 1 | Jeweled egg | 5 | 5 | 10 | Bird's nest (Up a Tree) | ✅ Done |
| 2 | Clockwork canary | 6 | 2 | 8 | Inside egg | ✅ Done |
| 3 | Painting | 4 | 7 | 11 | Gallery | ✅ Done |
| 4 | Bag of coins | 10 | 5 | 15 | Maze (adventurer's remains) | ✅ Done |
| 5 | Pearl necklace | 9 | 5 | 14 | Pearl Room | ✅ Done |
| 6 | Tin of spices | 5 | 5 | 10 | Pool Room | ✅ Done |
| 7 | White crystal sphere | 6 | 6 | 12 | Dingy Closet | ✅ Done |
| 8 | Fancy violin | 10 | 10 | 20 | Round Room (in box) | ✅ Done |
| 9 | Grail | 2 | 5 | 7 | Grail Room | ✅ Done |
| 10 | Platinum bar | 12 | 10 | 22 | Loud Room | ✅ Done |
| 11 | Crystal trident | 4 | 11 | 15 | Atlantis Room | ✅ Done |
| 12 | Jade figurine | 5 | 5 | 10 | Bat Room | ✅ Done |
| 13 | Statue | 10 | 13 | 23 | Sandy Beach (buried) | ✅ Done |
| 14 | Large emerald | 5 | 10 | 15 | Buoy (Frigid River) | ✅ Done |
| 15 | Pot of gold | 10 | 10 | 20 | End of Rainbow | ✅ Done |
| 16 | Chalice | 10 | 10 | 20 | Thief's Treasure Room | ✅ Done |
| 17 | Trunk of jewels | 15 | 8 | 23 | Reservoir (drained) | ✅ Done |
| 18 | Blue crystal sphere | 10 | 5 | 15 | Dreary Room | ✅ Done |
| 19 | Huge diamond | 10 | 6 | 16 | Machine Room (from coal) | ✅ Done |
| 20 | Sapphire bracelet | 5 | 3 | 8 | Gas Room | ✅ Done |
| 21 | Red crystal sphere | 10 | 5 | 15 | Sooty Room | ✅ Done |
| 22 | Gold coffin | 3 | 7 | 10 | Egyptian Room | ✅ Done |
| 23 | Portrait | 10 | 5 | 15 | Chairman's Office | ✅ Done |
| 24 | Zorkmid bills | 10 | 15 | 25 | Vault (Bank) | ✅ Done |
| 25 | Gold card | 10 | 15 | 25 | Royal Puzzle | ✅ Done |
| 26 | Ivory torch | 14 | 6 | 20 | Torch Room | ✅ Done |
| 27 | Crown | 15 | 10 | 25 | Dusty Room | ✅ Done |
| 28 | Flathead stamp | 4 | 10 | 14 | Library (Volcano) | ✅ Done |
| 29 | Zorkmid coin | 10 | 12 | 22 | Narrow Ledge | ✅ Done |
| 30 | Ruby | 15 | 8 | 23 | Ruby Room | ✅ Done |
| 31 | Don Woods stamp | -- | 1 | 1 | Brochure (mail order) | ✅ Done |
| 32 | Brass bauble | 1 | 1 | 2 | Forest (canary song) | ✅ Done |
| 33 | Thief's canvas | 10 | 24 | 34 | Gallery (ADR-078 ritual) | ✅ Done |

**Implemented**: 33/33 treasures (650/650 points = 100%)

---

## Objects (Non-Treasure)

### Light Sources

| Object | Location | Status | Notes |
|--------|----------|--------|-------|
| Brass lantern | Living Room | ✅ Done | 330 turns fuel |
| Ivory torch | Torch Room | ✅ Done | Unlimited (also treasure) |
| Candles | Altar | ✅ Done | For exorcism |
| Matchbook | Dam Lobby | ✅ Done | Light candles |

### Weapons

| Object | Location | Status | Notes |
|--------|----------|--------|-------|
| Elvish sword | Living Room | ✅ Done | Glows blue near enemies |
| Nasty knife | Attic | ✅ Done | Better vs thief |
| Stiletto | Thief | ✅ Done | Thief's weapon (drops on death) |
| Bloody axe | Troll | ✅ Done | Troll's weapon (drops on death) |

### Tools

| Object | Location | Status | Notes |
|--------|----------|--------|-------|
| Rope | Attic | ✅ Done | Dome Room, Slide Room |
| Shovel | Small Cave | ✅ Done | Dig on beach |
| Screwdriver | Maintenance Room | ✅ Done | Machine, keyhole |
| Wrench | Maintenance Room | ✅ Done | Dam bolt |
| Pump | Reservoir North | ✅ Done | Inflate boat |
| Skeleton key | Dead End (maze) | ✅ Done | Grating |

### Containers

| Object | Location | Status | Notes |
|--------|----------|--------|-------|
| Trophy case | Living Room | ✅ Done | Store treasures |
| Brown sack | Kitchen | ✅ Done | Lunch, garlic |
| Basket | Shaft Room | ✅ Done | Raises/lowers in mine |
| Inflatable boat | Dam Base | ✅ Done | Inflate with pump |
| Buoy | Frigid River | ✅ Done | Contains emerald |

### Food & Consumables

| Object | Location | Status | Notes |
|--------|----------|--------|-------|
| Lunch | Sack | ✅ Done | Eat (optional) |
| Garlic | Sack | ✅ Done | Repel vampire bat |
| Water | Bottle | ✅ Done | Bucket puzzle |
| Eat-me cake | Tea Room | ✅ Done | Grow (makes player large) |
| Drink-me cake | Tea Room | ✅ Done | Shrink (makes player small) |
| Orange cake | Tea Room | ✅ Done | Edible, no special effect |

### Keys & Access Items

| Object | Location | Status | Notes |
|--------|----------|--------|-------|
| Skeleton key | Dead End (maze) | ✅ Done | Grating |
| Sceptre | Coffin | ✅ Done | Wave for rainbow |

### Books & Papers

| Object | Location | Status | Notes |
|--------|----------|--------|-------|
| Leaflet | Mailbox | ✅ Done | Welcome message |
| Guidebook | Dam Lobby | ✅ Done | Dam info, balloon fuel |
| Matchbook | Dam Lobby | ✅ Done | Send for brochure |
| Black book | Altar | ✅ Done | Exorcism |
| Green paper | Tea Room | ✅ Done | FROBOZZ MAGIC BOAT instructions |
| Purple book | Library | ✅ Done | Contains stamp |

### Miscellaneous

| Object | Location | Status | Notes |
|--------|----------|--------|-------|
| Oriental rug | Living Room | ✅ Done | Covers trap door |
| Mat | West of House | ✅ Done | Welcome mat |
| Bell | Temple | ✅ Done | Exorcism |
| Coal | Dead End (mine) | ✅ Done | Diamond via machine |
| Brick | Attic | ✅ Done | Explosive with fuse |
| Braided wire | Stream View | ✅ Done | Balloon tether (in balloon region) |
| Shiny wire | Attic | ✅ Done | Fuse wire |
| Timber | Timber Room | ✅ Done | Props for puzzles |
| Brochure | Mail | ✅ Done | Contains stamp (SEND FOR BROCHURE) |
| Robot | Low Room | ✅ Done | Push button |
| Incense | Maze (skeleton) | ✅ Done | ADR-078: Burns 3 turns, disarms basin |
| Empty frame | Treasure Room | ✅ Done | ADR-078: Appears after Thief dies |
| Frame piece | (from frame) | ✅ Done | ADR-078: Drop in basin for canvas |

---

## NPCs / Creatures

| Creature | Location | Status | Notes |
|----------|----------|--------|-------|
| Troll | Troll Room | ✅ Done | Guard behavior, blocks passage, combat |
| Thief | Wandering | ✅ Done | Full AI: wander, steal, egg-open, combat, lair |
| Cyclops | Cyclops Room | ✅ Done | Say "Odysseus"/"Ulysses" to scare, blocks north |
| Vampire bat | Bat Room | ✅ Done | Daemon attacks without garlic, teleports player |
| Spirits | Entry to Hades | ✅ Done | Block until exorcised (bell/book/candles) |
| Dungeon Master | Endgame | ✅ Done | Trivia system with 8 questions, opens door after 3 correct |
| Robot | Low Room | ✅ Done | Commandable NPC |

---

## Puzzles

### Combat Puzzles

| Puzzle | Solution | Status | Points |
|--------|----------|--------|--------|
| Troll | Kill with sword | ✅ Done | 0 |
| Thief | Kill with knife (late game) | ✅ Done | 25 |
| Cyclops | Say "Odysseus" | ✅ Done | 10 |

### Mechanical Puzzles

| Puzzle | Solution | Status | Reward |
|--------|----------|--------|--------|
| Trap door | Move rug, open door | ✅ Done | Access underground |
| Dam | Turn bolt with wrench | ✅ Done | Drain reservoir, reservoir exit blocking |
| Carousel/Round Room | Robot push button | ✅ Done | Robot NPC + handler complete |
| Bucket/Well | Pour water to descend | ✅ Done | Access tea room |
| Coal machine | Put coal, turn switch | ✅ Done | Diamond (turn-switch action) |
| Basket | Lower/raise for mine | ✅ Done | Transport items+player (ADR-090 capability dispatch) |
| Balloon | TIE wire, LIGHT guidebook, wait, land | ✅ Done | Volcano ledge access |

### Word/Knowledge Puzzles

| Puzzle | Solution | Status | Reward |
|--------|----------|--------|--------|
| Riddle Room | Answer "well" | ✅ Done | Access Pearl Room |
| Cyclops | Say "Odysseus" | ✅ Done | Passage opens |
| Exorcism | Ring bell, light candles, read book | ✅ Done | Access Land of Dead (+10 pts) |
| Loud Room | Say "echo" | ✅ Done | Platinum bar (death without bar) |
| Endgame trivia | Answer 3 questions correctly | ✅ Done | Opens door to Narrow Corridor |

### Spatial Puzzles

| Puzzle | Solution | Status | Reward |
|--------|----------|--------|--------|
| Maze | Map carefully (drop objects) | ✅ Done | Coins, key (45 pts total) |
| Coal mine | Navigate maze | ✅ Done | Coal, bracelet |
| Royal Puzzle | Push sandstone blocks | ✅ Done | Gold card (25 pts) |
| Mirror box | Push panels, pole | ✅ Done | Dungeon entrance access |
| Bank | Enter walls, use curtain | ✅ Done | Portrait, bills |

### Item Manipulation Puzzles

| Puzzle | Solution | Status | Reward |
|--------|----------|--------|--------|
| Egg/Canary/Bauble | Thief opens egg, wind canary in forest | ✅ Done | Canary + Bauble |
| Key (Tiny Room) | Mat under door, screwdriver | ✅ Done | Blue sphere |
| Coffin | Drain reservoir, carry across, pray at altar | ✅ Done | 10 points (coffin portable weight=10, dam blocking works, transcript test passing) |
| Glacier | Throw torch at ice | ✅ Done | Volcano View access |
| Rainbow | Wave sceptre at falls | ✅ Done | Pot of gold |
| Buried treasure | Dig 4 times with shovel | ✅ Done | Statue |
| Thief's Canvas (ADR-078) | Kill thief→frame→break→incense→pray→drop piece | ✅ Done | 34 pts canvas |

---

## Systems Required

| System | Status | Needed For |
|--------|--------|------------|
| Light/darkness | ✅ Done | Underground areas |
| Containers | ✅ Done | Sack, case, etc. |
| Scoring (trophy case) | ✅ Done | ADR-076 |
| Combat (basic) | ✅ Done | Troll, thief |
| Timed events (daemons) | ✅ Done | ADR-071 complete (lantern, candles, dam, forest) |
| NPC basics | ✅ Done | ADR-070 implemented |
| Vehicle trait | ✅ Done | Boat navigation, bucket |
| INFLATE/DEFLATE actions | ❌ | Boat |
| WAVE action | ✅ Done | Sceptre/rainbow (2026-01-02) |
| Water current | ❌ | River auto-movement |
| RING action | ✅ Done | Bell |
| PRAY action | 🚧 Partial | Altar→Forest teleport needed (current Basin Room logic incorrect) |
| BURN action | ✅ Done | ADR-078 incense (3-turn timer) |
| Exorcism sequence | ✅ Done | Bell/book/candle |
| DIG action | ✅ Done | Shovel/beach (2026-01-02) |
| WIND action | ✅ Done | Canary/bauble (2026-01-02) |
| Sliding room mechanics | ✅ Done | Royal Puzzle (Phase 2 complete) |
| PUSH WALL action | ✅ Done | Royal Puzzle |
| Puzzle movement intercept | ✅ Done | Royal Puzzle |
| TAKE CARD intercept | ✅ Done | Royal Puzzle |
| Robot commands | ❌ | "tell robot 'X'" syntax |
| Endgame trigger | ✅ Done | Crypt darkness ritual (15 turns) |
| Victory condition | ✅ Done | Treasury entry triggers victory messages |
| GDT (debug tool) | 🚧 Partial | Core commands working, DC added |
| INCANT (cheat) | ✅ Done | Skip to endgame (ADR-080 text slots complete) |

---

## Cheat Mechanisms

For an accurate Fortran port, both debug/cheat systems should be implemented.

### GDT (Game Debugging Tool)

Full debug interface with 35 commands in 4 categories:

| Category | Commands | Examples |
|----------|----------|----------|
| Alter (9) | AA, AC, AF, AH, AN, AO, AR, AV, AX | `AH` teleport, `AO` move object |
| Display (14) | DA, DC, DF, DH, DL, DM, DN, DO, DP, DR, DS, DT, DV, DX, D2 | `DO` show object, `DR` show room |
| Villain (8) | NC, ND, NR, NT, RC, RD, RR, RT | `ND` immortality, `NR` disable thief |
| Utility (4) | TK, PD, HE, EX | `TK` take any object |

**Authentication**: Challenge-response (version-dependent)
- Early: `SUPNIK,BARNEY,70524` (name, cat's name, badge number)
- Later: `YRUZEV` → `VAX`

See `docs/work/dungeo/gdt-command.md` for full command reference.

### INCANT

Skip directly to endgame:
```
>INCANT <challenge> <response>
```

**Authentication**: ENCRYP algorithm with key `ECORMS`

| Challenge | Response |
|-----------|----------|
| `MHORAM` | `DFNOBO` |
| `DNZHUO` | `IDEQTQ` |

**Effect**: Teleport to Top of Stairs with elvish sword, 15/100 endgame points.

See `docs/work/dungeo/endgame-cheat.md` for full algorithm and Python implementation.

---

## Summary

| Category | Done | Total | % |
|----------|------|-------|---|
| Rooms | 169 | 169 | 100% |
| Treasures | 33 | 33 | 100% |
| Treasure Points | 650 | 650 | 100% |
| Light Sources | 4 | 4 | 100% |
| Weapons | 4 | 4 | 100% |
| Tools | 6 | 6 | 100% |
| Containers | 5 | 5 | 100% |
| NPCs | 7 | 7 | 100% |
| Puzzles (working) | 23 | ~25 | 92% |

---

## Priority Next Steps

1. **PRAY action fix**: Implement Altar→Forest teleportation (current Basin Room logic is incorrect per Fortran source)
2. **Missing systems**:
   - INFLATE/DEFLATE actions (boat)
   - Water current (river auto-movement)
   - Robot commands ("tell robot 'X'" syntax)
3. **Cleanup** - Remove obsolete `event-handler-migration-plan.md` (ADR-086 fixed all handlers)

## Recently Completed

- ✅ **Coffin Puzzle & Weight Research** (2026-01-07) - Parsed Fortran dindx.dat to extract object weights/capacities. Key finding: COFFIN weight=10, player MXLOAD=100 - coffin is easily portable (10% of capacity). Created transcript test verifying coffin+sceptre can be taken and stored in trophy case (14 points). Also discovered PRAY action incorrectly implements Basin Room logic instead of Altar→Forest teleportation per Fortran source. Added weights-capacities.md reference doc.
- ✅ **Dam Puzzle Bidirectional Toggle & Map Fix** (2026-01-07) - Fixed map bug where `connectTempleToDam()` overwrote Reservoir South→Dam exit with Temple connection. Temple is correctly accessed via Glacier Room→Egyptian Room and Grail Room paths. Added bidirectional dam toggle: turn bolt when drained closes dam and re-blocks reservoir exits. Handler listens for `dungeo.dam.closed` event. All 761 tests pass (5 expected failures).
- ✅ **Coal Machine Puzzle** (2026-01-07) - Turn switch on machine converts coal to diamond. Story action `turn-switch-action.ts` with ContainerTrait on machine. 16 transcript tests pass.
- ✅ **Tiny Room Key Puzzle** (2026-01-05) - Classic IF "key under door" puzzle. PUT MAT UNDER DOOR, PUSH KEY WITH SCREWDRIVER, TAKE MAT (gets key). 4 new actions (put-under, push-key, pull-mat, door-blocked), 2 command transformers (block north when locked, intercept take mat when under door). Uses LockableTrait properly. All 22 transcript tests pass.
- ✅ **Grammar Conflict Fixes + Flooding Timing** (2026-01-05) - Fixed 158 test failures from ADR-089 merge. Turn-bolt changed to literal "turn bolt" patterns (was intercepting "turn on lantern"). Press-button changed to "press :target" only (was intercepting "push rug"). Fixed flooding water level progression - daemon now skips button press turn and increments by 2 (matching FORTRAN RVMNT/2 formula). All 699 tests pass.
- ✅ **ADR-089 Pronoun & Identity System** (2026-01-05) - Complete implementation of pronoun resolution and narrative perspective. Parser resolves "it", "him", "her", "them" etc. Story can configure 1st/2nd/3rd person perspective. Message placeholders {You}, {your}, {take} conjugate automatically.
- ✅ **Missing Objects Placement** (2026-01-04) - Added 10 missing objects to proper locations: shovel (Small Cave), pump (Reservoir North), welcome mat (West of House), brick+wire (Attic), timber (Timber Room), green paper+3 cakes (Tea Room). Researched FORTRAN source and confirmed there is NO "gold key" - only skeleton key (maze, for grating) and rusty key (endgame). Removed incorrectly-added iron key. All 680 tests pass.
- ✅ **UNDO System** (2026-01-04) - Implemented snapshot-based undo with 5-10 turn buffer. Engine creates snapshots before state-changing commands (not meta/info commands like look, examine, inventory). Platform events: UNDO_REQUESTED/COMPLETED/FAILED. Fixed bugs in command-executor, event-adapter (was stripping requiresClientAction, converting underscores to dots in platform event types). All 680 tests pass.
- ✅ **ADR-086 Event Handler Unification** (2026-01-04) - Fixed critical bug where `world.registerEventHandler()` handlers were never called. Added `IEventProcessorWiring` interface to if-domain. Engine now wires WorldModel handlers to EventProcessor automatically. All 16 handlers (lantern, candles, exorcism, glacier, ghost ritual, laser, dam, reality altered, balloon, trophy case) now work without code changes.
- ✅ **ADR-085 Event-Based Scoring System** (2026-01-04) - Added `SCORE_GAINED`/`SCORE_LOST` events. Updated `ScoringService` with `ScoringDefinition` interface, `hasScored()`, `scorePoints()`, `losePoints()`, `getRankMessageId()` methods. Trophy case handler migrated to EventProcessor. DungeoScoringService updated with new config format.
- ✅ **Balloon Puzzle with TIE/UNTIE/LIGHT Actions** (2026-01-03) - Balloon vehicle at Volcano Bottom. TIE wire to hook, UNTIE to release, LIGHT guidebook for fuel. Balloon daemon handles vertical movement between 8 positions (ground, 4 ledges, 4 mid-air). Exit blocked in mid-air. 675 tests pass.
- ✅ **Bucket/Well Puzzle Complete** (2026-01-03) - Fixed visibility when inside transparent vehicles. Added `VehicleTrait.transparent` property (defaults to true). Added `VisibilityBehavior.getDescribableLocation()` to determine what to describe when looking. Updated looking action to use visibility logic. Bucket rises/descends correctly, LOOK from inside bucket describes the room. 20/20 bucket tests pass, 656 total tests pass.
- ✅ **Grammar Normalization** (2026-01-03) - Major parser cleanup: deleted 6 dead code files (semantic-grammar.ts, semantic-core-grammar.ts, semantic-grammar-rules.ts, semantic-parser-engine.ts, semantic-rules/). Renamed core-grammar.ts → grammar.ts. Added `enter :portal` pattern with `.matching({ enterable: true })` constraint. Added vehicle grammar: board, disembark, get on/off, alight. Priority ordering: semantic rules (100+) before fallbacks (90-95). "enter bucket" now works!
- ✅ **VehicleTrait** (2026-01-03) - New trait for enterable transport containers. Properties: vehicleType ('watercraft'|'counterweight'|'elevator'|'tram'|'cart'), blocksWalkingMovement. Works with ContainerTrait enterable. Added to bucket for well puzzle.
- ✅ **POUR/FILL Actions** (2026-01-03) - Story-specific actions for bucket/well puzzle. POUR water in bucket rises, FILL bottle descends.
- ✅ **Mail Order Stamp** (2026-01-03) - Implemented Don Woods stamp puzzle (final 1 pt). Added matchbook to Dam Lobby with "SEND FOR BROCHURE" ad. SEND action creates brochure in mailbox containing ASCII art stamp. 650/650 points complete!
- ✅ **Egg/Canary/Bauble Puzzle** (2026-01-03) - Fixed WIND action to create brass bauble entity (2 pts) when canary wound in forest. Verified thief egg-opening mechanic works.
- ✅ **Glacier Puzzle** (2026-01-02) - Throw lit torch at glacier to melt it and reveal north passage to Volcano View. Handler listens for thrown events, validates torch is lit, opens bidirectional exits, destroys torch. 16 new tests.
- ✅ **WAVE/DIG/WIND Actions** (2026-01-02) - Implemented three story-specific actions:
  - WAVE action: Wave sceptre at Aragain Falls to create/dismiss rainbow
  - DIG action: Dig at Sandy Beach (4 digs) to reveal buried statue
  - WIND action: Wind canary in forest location (bauble spawn needs object)
  - Added shovel and statue objects to Sandy Beach
  - 3 new transcript tests (38 tests total), all 550 tests pass
- ✅ **Victory Handler Confirmed Working** (2026-01-02) - Verified victory daemon messages render correctly via StandardTextService. All 4 game.message events (ENTER_TREASURY, VICTORY_TEXT, FINAL_SCORE, CONGRATULATIONS) display properly when entering Treasury.
- ✅ **Parapet Dial Puzzle** (2026-01-02) - Complete dial puzzle implementation:
  - SET DIAL action (1-8) with text slot parsing
  - PUSH DIAL BUTTON action activates cell rotation
  - GDT DL command for dial debugging (SET, PUSH, CELL, DOOR, OPEN, ENDGAME)
  - Victory handler daemon awards 35 pts on Treasury entry
  - Parapet D → Prison Cell connection on cell activation
  - Prison Cell S → Treasury when bronze door opens
- ✅ **Dungeon Master Trivia System** (2026-01-02) - Added Dungeon Master NPC with 8 trivia questions (cycle +3 mod 8). Player must answer 3 correctly to open door N to Narrow Corridor. Created ANSWER action with greedy text slot, GDT TQ command for deterministic testing. Fixed door opening by dynamically adding N exit.
- ✅ **ADR-084 Story Grammar Removal** (2026-01-02) - Removed StoryGrammarImpl wrapper (~930 lines). Stories now get direct access to GrammarBuilder with full .direction(), .vocabulary(), .manner() methods. Simplified Royal Puzzle grammar from 12+ explicit patterns to 2 parameterized patterns.
- ✅ **Inside Mirror Puzzle Complete** (2026-01-02) - Fixed 4 bugs: (1) story dist out of date, (2) double execution from event handlers calling state functions that actions already call, (3) nullish coalescing bug where poleState 0 was treated as falsy, (4) message params wrapper for language interpolation. All 56 endgame tests pass. Pole raise/lower, panel rotation/movement, and exit mechanics all working.
- ✅ **ADR-082 Vocabulary Slots** (2026-01-02) - Parser now supports vocabulary-constrained slots with context predicates. Enables patterns like "incant :challenge :response" with VOCABULARY slots. Also added MANNER slot type for adverbs.
- ✅ **Endgame Phase 1: Tomb & Crypt Rooms** (2025-12-31) - Created Tomb of Unknown Implementer and Crypt rooms in Temple region. Added crypt door object. All connections working (Land of Dead ↔ Tomb ↔ Crypt).
- ✅ **ADR-080 Text Slots & Multi-Object** (2025-12-31→2026-01-01) - Parser now supports text slots for non-entity arguments, greedy text capture, instrument slots, and multi-object parsing (take all, take all but X, take X and Y).
- ✅ **ADR-079 Endgame Region Structure** (2025-12-31) - Created 11 endgame rooms (Top of Stairs through Treasury). Added INCANT action with ENCRYP algorithm (verified: encryp('MHORAM')='DFNOBO').
- ✅ **ADR-078 Hidden Max Points** (2025-12-31) - Max score shows 616 until thief dies, then 650. "Reality altered" message appears on first SCORE after thief death. New "Master of Secrets" rank at 500 pts for players who complete ghost ritual and obtain canvas.
- ✅ **Royal Puzzle Complete** (2025-12-31) - Fixed LOOK, TAKE CARD, and blocked card mechanics. Gold card treasure now fully obtainable (25 pts). Dynamic room descriptions work correctly. All 403 transcript tests pass.
- ✅ **ADR-078 Thief's Canvas Puzzle** (2025-12-31) - Added Basin Room (E of Temple Dead End 2), ghost ritual puzzle with incense, empty frame, frame piece, canvas. New actions: BREAK, BURN, PRAY. 3-turn incense fuse. Ghost appears when frame piece dropped in blessed basin, canvas spawns in Gallery. 34 points (10 take + 24 case). Progress: 145/~191 rooms, 534/650 points.
- ✅ **Royal Puzzle Phase 2** (2025-12-31) - Command transformer now intercepts GO/TAKE in puzzle. Fixed `isInPuzzle` bug (was using wrong player ID lookup). Added puzzle-take-card action for gold card. Added 12 push wall grammar patterns. Movement within puzzle, TAKE CARD, and exit mechanics now working. Transcript tests pass.
- ✅ **Royal Puzzle Phase 1** (2025-12-30) - Added 3 rooms (Square Room, Puzzle Room, Room in a Puzzle), puzzle state management (8x8 grid from Fortran source), PUSH WALL action, gold card treasure (25 pts). Entry handlers created.
- ✅ **Coal Mine Audit** (2025-12-30) - Removed 3 orphaned rooms, added Small Room, added red crystal sphere (15 pts), fixed Slide Ledge U exit.
- ✅ **Ancient Chasm Chain** (2025-12-30) - Added 4 rooms (Ancient Chasm, Temple Dead Ends 1-2, Temple Small Cave) connecting Loud Room to Rocky Shore. Renamed Small Chamber to Ruby Room.
- ✅ **Deep Ravine & Rocky Crawl** (2025-12-30) - Added 2 rooms connecting E/W Passage to Dome Room/Egyptian Room. Fixed Chasm connections to go through Deep Ravine.
- ✅ **Library & Wide Ledge** (2025-12-30) - Added Library room with purple book containing Flathead stamp (14 pts). Added Wide Ledge room. Fixed volcano internal connections per canonical map.
- ✅ **Volcano-Glacier Connection Chain** (2025-12-30) - Added 7 rooms connecting Dam/Reservoir to Volcano: Reservoir North, Stream View, Glacier Room, Small Chamber, Lava Room. Removed incorrect Bat Room → Volcano connection.
- ✅ **Ruby Treasure** (2025-12-30) - Added 23-point ruby in Small Chamber (volcano region). Moved from incorrect Volcano View location.
- ✅ **Blue Crystal Sphere Treasure** (2025-12-30) - Added 15-point treasure in Dreary Room (temple region).
- ✅ **Tiny Room & Dreary Room** (2025-12-30) - Added rooms west of Torch Room for key puzzle area.
- ✅ **ADR-075 Effects-Based Handler Pattern** (2025-12-30) - Fixed circular dependency by moving effects code from world-model to event-processor. Module loading improved from 77s to 12s. Mirror Room toggle now working.
- ✅ **Transcript Tester File Output** (2025-12-30) - Added `--output-dir` option for timestamped JSON/text results in `test-results/` folder.
- ✅ **ADR-077 Release Build System** (2025-12-30) - Created research ADR for bundled distribution to eliminate 12s module loading for authors.
- ✅ **Sharpee Bundle Complete** (2025-12-30) - 578x faster load times (81s → 142ms). Bundle entry aggregates all packages. Fast transcript testing now available via `./scripts/fast-transcript-test.sh`.
- ✅ **Mirror Room State Toggle** (2025-12-30) - Handler complete using ADR-075 effects pattern. RUB MIRROR toggles exits between Grail Room area (State A) and Coal Mine area (State B).
- ✅ **Coal Mine Region Restructure** (2025-12-30) - Created 21 new rooms: Cold Passage, Steep Crawlway, Slide rooms (4), Sooty Room, Mine Entrance, Squeaky Room, Wooden Tunnel, Smelly Room, Mine Maze (7), Ladder rooms, Timber Room, Bottom of Shaft, Machine Room
- ✅ **Dam Puzzle Fix** (2025-12-30) - Corrected sequence: press yellow button (enables bolt) → turn bolt with wrench (starts draining)
- ✅ **Robot NPC & Round Room Puzzle Complete** (2025-12-30) - Low Room, Machine Room (well), Dingy Closet rooms + Robot NPC that can push triangular button to fix carousel
- ✅ **Word Puzzles: Loud Room & Riddle Room** (2025-12-30) - SAY action extended: "echo" in Loud Room (death without platinum bar), "well" in Riddle Room (opens stone door)
- ✅ **White Crystal Sphere Treasure** (2025-12-30) - Added 12-point treasure in Dingy Closet
- ✅ **Treasures: Grail, Violin, Chalice, Bag of Coins** (2025-12-30) - Added 4 treasures: grail in Grail Room, fancy violin in Round Room box, chalice in Treasure Room, bag of coins in Dead End
- ✅ **Round Room Randomization Handler** (2025-12-30) - Carousel room spinning mechanic ready (isFixed flag controls randomization, daemon implemented)
- ✅ **Map Connection Audit & Fixes** (2025-12-29) - Restructured Cellar/Troll Room/N/S Crawlway layout to match Mainframe Zork map, connected Canyon Bottom ↔ End of Rainbow, troll now blocks north passage
- ✅ **Exorcism Puzzle** (2025-12-29) - Bell/book/candle ritual to banish spirits at Entry to Hades
- ✅ **RING Action** (2025-12-29) - Story-specific action for ringing the bell
- ✅ **Spirits NPC** (2025-12-29) - Blocks south passage until exorcism, awards 10 points
- ✅ **Vampire Bat** (2025-12-29) - Daemon that teleports player unless carrying garlic
- ✅ **Cyclops NPC** (2025-12-29) - Say "Odysseus"/"Ulysses" to scare away, opens passage
- ✅ **SAY Action** (2025-12-29) - Story-specific action for speech, routes to NPCs
- ✅ **Transcript Tester Fix** (2025-12-29) - Now captures scheduler/NPC events properly
- ✅ **Bank of Zork Puzzle** (2025-12-29) - Complete wall-walking puzzle with curtain, alarm daemon, and stone cube
- ✅ **Parser Alias Matching** (2025-12-29) - Fixed ScopeEvaluator to match entities by IdentityTrait aliases
- ✅ **Round Room Hub Connections** (2025-12-29) - Connected Engravings Cave, N/S Passage, Winding Passage, Cave regions
- ✅ **Maze Region** (2025-12-29) - 23 rooms: 15 maze rooms, 5 dead ends, Grating Room, Cyclops Room, Treasure Room
- ✅ **Maze Connections** - Fixed Troll Room WEST→Maze, Round Room SW→Maze, all internal connections
- ✅ **Thief NPC** - Full Mainframe Zork behavior: wandering, stealing, egg-opening, combat, lair stashing
- ✅ **GDT NR/RR Commands** - No Robber/Restore Robber for thief control
- ✅ **ADR-071 Timed Events** - Lantern battery, candle burning, dam draining, forest ambience
- ✅ **ADR-070 NPC System** - NpcTrait architecture implemented, Troll and Thief working
- ✅ **GDT DC Command** - Scheduler introspection for debugging
