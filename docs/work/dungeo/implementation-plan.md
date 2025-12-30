# Dungeo Implementation Tracking

**Target**: Mainframe Zork 616-point version
**Current Progress**: 131/~190 rooms (69%), 433/616 treasure points (70%)

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
| Circular Room | ❌ | Top of well |
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

### The Reservoir

| Room | Status | Notes |
|------|--------|-------|
| Reservoir | ✅ Done | Trunk when drained |
| Reservoir South | ✅ Done | |
| Reservoir North | ❌ | Pump |
| Stream View | ❌ | Torch (if thrown at glacier) |
| Deep Ravine | ❌ | |
| Rocky Crawl | ❌ | |

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
| Tiny Room | ❌ | Key puzzle |
| Dreary Room | ❌ | Blue sphere |
| Cave | ❌ | |

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

### Egyptian Area

| Room | Status | Notes |
|------|--------|-------|
| Egyptian Room | ✅ Done | In temple region |
| Glacier Room | ❌ | Throw torch at ice |
| North-South Crawlway | ❌ | |
| Ruby Room | ❌ | Ruby treasure |

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
| Volcano Bottom | ✅ Done | Balloon basket |
| Volcano Core | ✅ Done | Rising/falling |
| Volcano View | ✅ Done | |
| Narrow Ledge | ✅ Done | Zorkmid coin |
| Dusty Room | ✅ Done | Crown |
| Lava Room | ❌ | |
| Wide Ledge | ❌ | |
| Library | ❌ | Stamp in purple book |

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
| Puzzle Entrance | ❌ | Entry point |
| Room in a Puzzle | ❌ | 8x8 grid - 64 virtual positions |

### The Endgame

| Room | Status | Notes |
|------|--------|-------|
| Tomb of Unknown Implementer | ❌ | Crypt |
| Crypt | ❌ | Wait in darkness |
| Top of Stairs | ❌ | Endgame start |
| Stone Room | ❌ | Button |
| Small Room | ❌ | Laser beam |
| Hallway | ❌ | Mirror entrance |
| Inside Mirror | ❌ | Rotating box |
| Dungeon Entrance | ❌ | Trivia questions |
| Narrow Corridor | ❌ | |
| South Corridor | ❌ | |
| East Corridor | ❌ | |
| North Corridor | ❌ | |
| Parapet | ❌ | Dial mechanism |
| Prison Cell | ❌ | Cell door |
| Treasury of Zork | ❌ | Victory! |

---

## Treasures (32 items, 616 points)

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
| 18 | Blue crystal sphere | 10 | 5 | 15 | Dreary Room | ❌ |
| 19 | Huge diamond | 10 | 6 | 16 | Machine Room (from coal) | ✅ Done |
| 20 | Sapphire bracelet | 5 | 3 | 8 | Gas Room | ✅ Done |
| 21 | Red crystal sphere | 10 | 5 | 15 | Sooty Room | ❌ |
| 22 | Gold coffin | 3 | 7 | 10 | Egyptian Room | ✅ Done |
| 23 | Portrait | 10 | 5 | 15 | Chairman's Office | ✅ Done |
| 24 | Zorkmid bills | 10 | 15 | 25 | Vault (Bank) | ✅ Done |
| 25 | Gold card | 10 | 15 | 25 | Royal Puzzle | ❌ |
| 26 | Ivory torch | 14 | 6 | 20 | Torch Room | ✅ Done |
| 27 | Crown | 15 | 10 | 25 | Dusty Room | ✅ Done |
| 28 | Flathead stamp | 4 | 10 | 14 | Library (Volcano) | ❌ |
| 29 | Zorkmid coin | 10 | 12 | 22 | Narrow Ledge | ✅ Done |
| 30 | Ruby | 15 | 8 | 23 | Ruby Room | ❌ |
| 31 | Don Woods stamp | -- | 1 | 1 | Brochure (mail order) | ❌ |
| 32 | Brass bauble | 1 | 1 | 2 | Forest (canary song) | ❌ |

**Implemented**: 25/32 treasures (433/616 points = 70%)

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
| Shovel | Small Cave | ❌ | Dig on beach |
| Screwdriver | Maintenance Room | ✅ Done | Machine, keyhole |
| Wrench | Maintenance Room | ✅ Done | Dam bolt |
| Pump | Reservoir North | ❌ | Inflate boat |
| Skeleton key | Dead End (maze) | ❌ | Grating |

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
| Eat-me cake | Tea Room | ❌ | Shrink |
| Drink-me cake | Tea Room | ❌ | Unused? |
| Orange cake | Tea Room | ❌ | Grow |

### Keys & Access Items

| Object | Location | Status | Notes |
|--------|----------|--------|-------|
| Skeleton key | Dead End | ❌ | Grating |
| Iron key | Tiny Room | ❌ | Dreary Room door |
| Gold key | ? | ❌ | |
| Sceptre | Coffin | ✅ Done | Wave for rainbow |

### Books & Papers

| Object | Location | Status | Notes |
|--------|----------|--------|-------|
| Leaflet | Mailbox | ✅ Done | Welcome message |
| Guidebook | Dam Lobby | ✅ Done | Dam info, balloon fuel |
| Matchbook | Dam Lobby | ✅ Done | Send for brochure |
| Black book | Altar | ✅ Done | Exorcism |
| Green paper | Tea Room | ❌ | Robot instructions |
| Purple book | Library | ❌ | Contains stamp |
| Lore book | Royal Puzzle | ❌ | Endgame item |

### Miscellaneous

| Object | Location | Status | Notes |
|--------|----------|--------|-------|
| Oriental rug | Living Room | ✅ Done | Covers trap door |
| Mat | West of House | ❌ | Key puzzle |
| Bell | Temple | ✅ Done | Exorcism |
| Coal | Dead End (mine) | ✅ Done | Diamond via machine |
| Brick | Attic | ❌ | Volcano explosion |
| Braided wire | Stream View | ❌ | Balloon tether |
| Shiny wire | (with brick) | ❌ | Fuse |
| Timber | Mine | ❌ | Slide room anchor |
| Brochure | Mail | ❌ | Contains stamp |
| Robot | Low Room | ✅ Done | Push button |

---

## NPCs / Creatures

| Creature | Location | Status | Notes |
|----------|----------|--------|-------|
| Troll | Troll Room | ✅ Done | Guard behavior, blocks passage, combat |
| Thief | Wandering | ✅ Done | Full AI: wander, steal, egg-open, combat, lair |
| Cyclops | Cyclops Room | ✅ Done | Say "Odysseus"/"Ulysses" to scare, blocks north |
| Vampire bat | Bat Room | ✅ Done | Daemon attacks without garlic, teleports player |
| Spirits | Entry to Hades | ✅ Done | Block until exorcised (bell/book/candles) |
| Dungeon Master | Endgame | ❌ | Ally in final puzzle |
| Robot | Low Room | ✅ Done | Commandable NPC |
| Gnome | Bank | ❌ | Appears with curtain |

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
| Dam | Turn bolt with wrench | 🚧 Partial | Drain reservoir |
| Carousel/Round Room | Robot push button | ✅ Done | Robot NPC + handler complete |
| Bucket/Well | Pour water to descend | ❌ | Access tea room |
| Coal machine | Put coal, turn switch | 🚧 Partial | Diamond |
| Basket | Lower/raise for mine | 🚧 Partial | Transport items |
| Balloon | Light guidebook, wait, land | ❌ | Volcano access |

### Word/Knowledge Puzzles

| Puzzle | Solution | Status | Reward |
|--------|----------|--------|--------|
| Riddle Room | Answer "well" | ✅ Done | Access Pearl Room |
| Cyclops | Say "Odysseus" | ✅ Done | Passage opens |
| Exorcism | Ring bell, light candles, read book | ✅ Done | Access Land of Dead (+10 pts) |
| Loud Room | Say "echo" | ✅ Done | Platinum bar (death without bar) |
| Endgame trivia | Various answers | ❌ | Progress |

### Spatial Puzzles

| Puzzle | Solution | Status | Reward |
|--------|----------|--------|--------|
| Maze | Map carefully | ❌ | Coins, keys |
| Coal mine | Navigate maze | ✅ Done | Coal, bracelet |
| Royal Puzzle | Push sandstone blocks | ❌ | Gold card |
| Mirror box | Push panels, pole | ❌ | Dungeon entrance |
| Bank | Enter walls, use curtain | ✅ Done | Portrait, bills |

### Item Manipulation Puzzles

| Puzzle | Solution | Status | Reward |
|--------|----------|--------|--------|
| Egg | Let thief steal and open | ❌ | Canary |
| Key (Tiny Room) | Mat under door, screwdriver | ❌ | Blue sphere |
| Coffin | Drain reservoir, carry across | ❌ | 10 points |
| Glacier | Throw torch at ice | ❌ | Ruby room |
| Rainbow | Wave sceptre at falls | ❌ | Pot of gold |
| Bauble | Wind canary in forest | ❌ | Bauble |
| Buried treasure | Dig 4 times with shovel | ❌ | Statue |

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
| Vehicle trait | ❌ | Boat navigation |
| INFLATE/DEFLATE actions | ❌ | Boat |
| WAVE action | ❌ | Sceptre/rainbow |
| Water current | ❌ | River auto-movement |
| RING action | ✅ Done | Bell |
| PRAY action | ❌ | Resurrection |
| Exorcism sequence | ✅ Done | Bell/book/candle |
| DIG action | ❌ | Shovel/beach |
| Sliding room mechanics | ❌ | Royal Puzzle |
| PUSH WALL action | ❌ | Royal Puzzle |
| Robot commands | ❌ | "tell robot 'X'" syntax |
| Endgame trigger | ❌ | 616 points placed |
| Victory condition | ❌ | Game completion |
| GDT (debug tool) | 🚧 Partial | Core commands working, DC added |
| INCANT (cheat) | ❌ | Skip to endgame |

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
| Rooms | 110 | ~190 | 58% |
| Treasures | 25 | 32 | 78% |
| Treasure Points | 433 | 616 | 70% |
| Light Sources | 4 | 4 | 100% |
| Weapons | 4 | 4 | 100% |
| Tools | 5 | 6 | 83% |
| Containers | 5 | 5 | 100% |
| NPCs | 6 | 8 | 75% |
| Puzzles (working) | 11 | ~25 | 44% |

---

## Priority Next Steps

1. **Remaining treasures** - Spheres (2), ruby, stamps (2), bauble
2. **Puzzle mechanics** - Rainbow wave sceptre
3. **Royal Puzzle** - 8x8 sliding block puzzle (see royal-puzzle.md)
4. **Remaining NPCs** - Dungeon Master, Gnome
5. **Endgame** (~15 rooms) - Final puzzle sequence
6. **Additional regions** - Mirror rooms, remaining mine areas, library

## Recently Completed

- ✅ **ADR-075 Effects-Based Handler Pattern** (2025-12-30) - Fixed circular dependency by moving effects code from world-model to event-processor. Module loading improved from 77s to 12s. Mirror Room toggle now working.
- ✅ **Transcript Tester File Output** (2025-12-30) - Added `--output-dir` option for timestamped JSON/text results in `test-results/` folder.
- ✅ **ADR-077 Release Build System** (2025-12-30) - Created research ADR for bundled distribution to eliminate 12s module loading for authors.
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
