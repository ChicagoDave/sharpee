# Mainframe Zork Complete Catalog

## 616-Point Version (Fortran DUNGEON 3.x)

**Original Design:** Tim Anderson, Marc Blank, Bruce Daniels, Dave Lebling (1977-1981)
**Fortran Port:** Bob Supnik (1978)
**Based on:** David's map, walkthrough sources, Fortran source analysis

---

## Scoring Summary

| Category            | Points  |
| ------------------- | ------- |
| Main Game Treasures | 616     |
| ADR-078 Extension   | 34      |
| Endgame             | 100     |
| **Total**           | **750** |

> **Note:** The base Fortran game has 32 treasures for 616 points. Our ADR-078 extension adds a 33rd treasure (Thief's Canvas, 34 pts) for 650 main game points. Max score display shows 616 until thief dies, then 650.

---

## Treasures (33 items, 650 points total)

Points are awarded for: (1) taking the treasure, (2) placing it in the trophy case.

| #   | Treasure                   | Take | Case | Total | Location                     |
| --- | -------------------------- | ---- | ---- | ----- | ---------------------------- |
| 1   | Jeweled egg                | 5    | 5    | 10    | Bird's nest (Up a Tree)      |
| 2   | Clockwork canary           | 6    | 2    | 8     | Inside egg (opened by thief) |
| 3   | Painting                   | 4    | 7    | 11    | Gallery                      |
| 4   | Bag of coins               | 10   | 5    | 15    | Maze (adventurer's remains)  |
| 5   | Pearl necklace             | 9    | 5    | 14    | Pearl Room                   |
| 6   | Tin of spices              | 5    | 5    | 10    | Pool Room                    |
| 7   | White crystal sphere       | 6    | 6    | 12    | Dingy Closet                 |
| 8   | Fancy violin               | 10   | 10   | 20    | Round Room (in box)          |
| 9   | Grail                      | 2    | 5    | 7     | Grail Room                   |
| 10  | Platinum bar               | 12   | 10   | 22    | Loud Room                    |
| 11  | Crystal trident            | 4    | 11   | 15    | Atlantis Room                |
| 12  | Jade figurine              | 5    | 5    | 10    | Bat Room                     |
| 13  | Statue                     | 10   | 13   | 23    | Sandy Beach (buried)         |
| 14  | Large emerald              | 5    | 10   | 15    | Buoy (Frigid River)          |
| 15  | Pot of gold                | 10   | 10   | 20    | End of Rainbow               |
| 16  | Chalice                    | 10   | 10   | 20    | Thief's Treasure Room        |
| 17  | Trunk of jewels            | 15   | 8    | 23    | Reservoir (drained)          |
| 18  | Blue crystal sphere        | 10   | 5    | 15    | Dreary Room                  |
| 19  | Huge diamond               | 10   | 6    | 16    | Machine Room (from coal)     |
| 20  | Sapphire bracelet          | 5    | 3    | 8     | Gas Room                     |
| 21  | Red crystal sphere         | 10   | 5    | 15    | Sooty Room                   |
| 22  | Gold coffin                | 3    | 7    | 10    | Egyptian Room                |
| 23  | Portrait of J.P. Flathead  | 10   | 5    | 15    | Chairman's Office (Bank)     |
| 24  | Zorkmid bills (stack)      | 10   | 15   | 25    | Vault (Bank)                 |
| 25  | Gold card                  | 10   | 15   | 25    | Royal Puzzle                 |
| 26  | Ivory torch                | 14   | 6    | 20    | Torch Room                   |
| 27  | Crown                      | 15   | 10   | 25    | Dusty Room (Volcano)         |
| 28  | Lord Dimwit Flathead stamp | 4    | 10   | 14    | Library (Volcano)            |
| 29  | Priceless zorkmid coin     | 10   | 12   | 22    | Narrow Ledge (Volcano)       |
| 30  | Ruby                       | 15   | 8    | 23    | Ruby Room                    |
| 31  | Don Woods stamp            | --   | 1    | 1     | Brochure (mail order)        |
| 32  | Brass bauble               | 1    | 1    | 2     | Forest (from canary song)    |
| 33  | Thief's canvas (ADR-078)   | 10   | 24   | 34    | Gallery (ghost ritual)       |

**Note:** Treasures 1-32 are from the original Fortran DUNGEON. Treasure 33 (Thief's Canvas) is a Sharpee ADR-078 extension. Some treasures require solving puzzles first (egg must be opened by thief, diamond from coal via machine, rainbow from sceptre wave, etc.)

---

## Rooms by Region

### The House and Forest (Surface)

| Room              | Notes                                  |
| ----------------- | -------------------------------------- |
| West of House     | Starting location, mailbox             |
| North of House    |                                        |
| South of House    |                                        |
| Behind House      | Window entrance                        |
| Kitchen           | Sack, bottle, chimney exit             |
| Living Room       | Trophy case, trap door, lantern, sword |
| Attic             | Rope, nasty knife, brick               |
| Cellar            | Trap door destination                  |
| Forest (multiple) | Various forest locations               |
| Clearing          | Grating to maze                        |
| Up a Tree         | Egg in nest                            |
| Canyon View       |                                        |
| Rocky Ledge       |                                        |
| Canyon Bottom     |                                        |

### The Cellar and Troll Area

| Room              | Notes                |
| ----------------- | -------------------- |
| Cellar            | Central hub          |
| West of Chasm     |                      |
| Gallery           | Painting             |
| Studio            | Chimney to kitchen   |
| Troll Room        | Troll guards passage |
| East-West Passage |                      |

### The Maze

| Room                  | Notes                      |
| --------------------- | -------------------------- |
| Maze (many)           | Twisty little passages     |
| Grating Room          | Exit to surface            |
| Dead End (adventurer) | Bag of coins, skeleton key |
| Cyclops Room          | Say "Odysseus"             |
| Strange Passage       | Shortcut to Living Room    |
| Treasure Room         | Thief's lair               |

### Round Room and Carousel Area

| Room                | Notes               |
| ------------------- | ------------------- |
| Round Room          | Spins until stopped |
| Engravings Cave     |                     |
| Riddle Room         | Answer "well"       |
| Pearl Room          | Necklace            |
| Winding Passage     |                     |
| North-South Passage |                     |
| Deep Canyon         |                     |

### The Well and Tea Room

| Room          | Notes                    |
| ------------- | ------------------------ |
| Circular Room | Bucket mechanism         |
| Top of Well   | Bucket stop              |
| Tea Room      | Cakes (eat-me, drink-me) |
| Posts Room    | Tiny size area           |
| Pool Room     | Spices                   |
| Low Room      | Robot                    |
| Machine Room  | Triangular button        |
| Dingy Closet  | White sphere under cage  |

### Flood Control Dam #3

| Room             | Notes                        |
| ---------------- | ---------------------------- |
| Dam              | Bolt to drain reservoir      |
| Dam Lobby        | Guidebook, matchbook         |
| Dam Base         | Deflated boat, pump          |
| Maintenance Room | Wrench, screwdriver, buttons |

### The Reservoir

| Room                      | Notes                        |
| ------------------------- | ---------------------------- |
| Reservoir (flooded/empty) | Trunk when drained           |
| Reservoir North           | Pump                         |
| Reservoir South           |                              |
| Stream View               | Torch (if thrown at glacier) |
| Deep Ravine               |                              |
| Rocky Crawl               |                              |

### The Dome and Temple

| Room                    | Notes                   |
| ----------------------- | ----------------------- |
| Dome Room               | Rope tie point          |
| Torch Room              | Ivory torch             |
| Tiny Room               | Key puzzle              |
| Dreary Room             | Blue sphere             |
| Temple                  | Bell                    |
| Altar                   | Book, candles           |
| Cave                    |                         |
| Entrance to Hades       | Bell/book/candle puzzle |
| Land of the Living Dead | Endgame trigger         |

### Mirror Rooms

| Room                | Notes                        |
| ------------------- | ---------------------------- |
| Mirror Room (South) | Touch to teleport            |
| Mirror Room (North) | Touch to teleport            |
| Cold Passage        |                              |
| Slide Room          | Rope puzzle, slide to cellar |

### The Coal Mine

| Room                 | Notes                 |
| -------------------- | --------------------- |
| Mine Entrance        |                       |
| Squeaky Room         |                       |
| Bat Room             | Garlic required, jade |
| Shaft Room           | Basket mechanism      |
| Wooden Tunnel        |                       |
| Smelly Room          |                       |
| Gas Room             | Lamp only! Bracelet   |
| Coal Mine (multiple) | Maze-like             |
| Ladder Top           |                       |
| Ladder Bottom        |                       |
| Dead End             | Coal                  |
| Timber Room          | Squeeze passage       |
| Lower Shaft          | Basket terminus       |
| Machine Room (lower) | Coal to diamond       |

### Egyptian Area

| Room                 | Notes              |
| -------------------- | ------------------ |
| Egyptian Room        | Gold coffin        |
| Glacier Room         | Throw torch at ice |
| North-South Crawlway |                    |

### Atlantis

| Room          | Notes   |
| ------------- | ------- |
| Atlantis Room | Trident |

### The Frigid River

| Room                    | Notes         |
| ----------------------- | ------------- |
| Frigid River (multiple) | Boat required |
| White Cliffs (multiple) |               |
| Rocky Shore             |               |
| Small Cave              | Shovel        |
| Sandy Beach             | Buried statue |
| Shore                   |               |
| Aragain Falls           | Rainbow       |
| End of Rainbow          | Pot of gold   |
| Rainbow Room            |               |

### The Volcano

| Room           | Notes                  |
| -------------- | ---------------------- |
| Lava Room      |                        |
| Ruby Room      | Ruby                   |
| Volcano Bottom | Balloon basket         |
| Volcano Core   | Rising/falling         |
| Narrow Ledge   | Zorkmid coin           |
| Wide Ledge     |                        |
| Library        | Stamp in purple book   |
| Dusty Room     | Crown, brick explosion |

### The Bank of Zork

| Room               | Notes              |
| ------------------ | ------------------ |
| Bank Entrance      |                    |
| East Teller's Room |                    |
| West Teller's Room |                    |
| Safety Depository  | Curtain of light   |
| Chairman's Office  | Portrait           |
| Small Room         | Through south wall |
| Vault              | Zorkmid bills      |
| Viewing Room       |                    |

### The Royal Puzzle

| Room                   | Notes                  |
| ---------------------- | ---------------------- |
| Small Square Room      | Entrance               |
| Room in a Puzzle       | 8x8 sliding block grid |
| (64 virtual positions) | See Royal Puzzle spec  |

### The Endgame

| Room                        | Notes            |
| --------------------------- | ---------------- |
| Tomb of Unknown Implementer | Crypt            |
| Crypt                       | Wait in darkness |
| Top of Stairs               | Endgame start    |
| Stone Room                  | Button           |
| Small Room                  | Laser beam       |
| Hallway                     | Mirror entrance  |
| Inside Mirror               | Rotating box     |
| Dungeon Entrance            | Trivia questions |
| Narrow Corridor             |                  |
| South Corridor              |                  |
| East Corridor               |                  |
| North Corridor              |                  |
| Parapet                     | Dial mechanism   |
| Prison Cell                 | Cell door        |
| Treasury of Zork            | Victory!         |

---

## Objects (Non-Treasure)

### Light Sources

| Object        | Location    | Duration   | Notes           |
| ------------- | ----------- | ---------- | --------------- |
| Brass lantern | Living Room | ~350 turns | Battery powered |
| Ivory torch   | Torch Room  | Unlimited  | Also a treasure |
| Candles       | Altar       | Limited    | For exorcism    |
| Matchbook     | Dam Lobby   | Limited    | Light candles   |

### Weapons

| Object       | Location    | Notes                   |
| ------------ | ----------- | ----------------------- |
| Elvish sword | Living Room | Glows blue near enemies |
| Nasty knife  | Attic       | Better vs thief         |
| Stiletto     | Thief       | Thief's weapon          |
| Bloody axe   | Troll       | Troll's weapon          |

### Tools

| Object       | Location         | Use                   |
| ------------ | ---------------- | --------------------- |
| Rope         | Attic            | Dome Room, Slide Room |
| Shovel       | Small Cave       | Dig on beach          |
| Screwdriver  | Maintenance Room | Machine, keyhole      |
| Wrench       | Maintenance Room | Dam bolt              |
| Pump         | Reservoir North  | Inflate boat          |
| Skeleton key | Dead End (maze)  | Grating               |

### Containers

| Object      | Location     | Notes                 |
| ----------- | ------------ | --------------------- |
| Trophy case | Living Room  | Store treasures here  |
| Sack        | Kitchen      | Lunch, garlic         |
| Basket      | Shaft Room   | Raises/lowers in mine |
| Boat        | Dam Base     | Inflate with pump     |
| Buoy        | Frigid River | Contains emerald      |

### Food & Consumables

| Object        | Location | Use                              |
| ------------- | -------- | -------------------------------- |
| Lunch         | Sack     | Eat (optional)                   |
| Garlic        | Sack     | Repel vampire bat                |
| Water         | Bottle   | Bucket puzzle                    |
| Eat-me cake   | Tea Room | Grow (makes player large)        |
| Blue cake     | Tea Room | Shrink (makes player small)      |
| Red cake      | Tea Room | Edible, explodes (kills player)  |
| Orange cake   | Tea Room | Edible, no special effect        |

### Keys & Access Items

| Object       | Location  | Use                                              |
| ------------ | --------- | ------------------------------------------------ |
| Skeleton key | Dead End  | Grating                                          |
| Rusty key    | Tiny Room | In keyhole; push out with screwdriver, catch on mat |
| Rusty key    | Endgame   | Prison cell door                                 |
| Sceptre      | Coffin    | Wave for rainbow                                 |

> **Note:** There is NO "gold key" in any version of Zork. The Tiny Room key is pushed through the keyhole with the screwdriver and caught on the welcome mat.

### Books & Papers

| Object      | Location  | Notes                         |
| ----------- | --------- | ----------------------------- |
| Leaflet     | Mailbox   | Welcome message               |
| Guidebook   | Dam Lobby | Dam information, balloon fuel |
| Matchbook   | Dam Lobby | Send for brochure             |
| Black book  | Altar     | Exorcism                      |
| Green paper | Tea Room  | FROBOZZ MAGIC BOAT instructions |
| Purple book | Library   | Contains stamp                |

### Miscellaneous

| Object         | Location        | Use                                  |
| -------------- | --------------- | ------------------------------------ |
| Rug            | Living Room     | Covers trap door                     |
| Mat            | West of House   | Key puzzle (slide under door)        |
| Bell           | Temple          | Exorcism                             |
| Coal           | Dead End (mine) | Diamond via machine                  |
| Brick          | Attic           | Volcano explosion                    |
| Wire (braided) | Stream View     | Balloon tether                       |
| Wire (shiny)   | (with brick)    | Fuse                                 |
| Timber         | Mine            | Slide room anchor                    |
| Brochure       | Mail            | Contains stamp (SEND FOR BROCHURE)   |
| Robot          | Low Room        | Push button (commandable NPC)        |
| Incense        | Maze (skeleton) | ADR-078: Burns 3 turns, disarms basin |
| Empty frame    | Treasure Room   | ADR-078: Appears after thief dies    |
| Frame piece    | (from frame)    | ADR-078: Drop in basin for canvas    |

---

## NPCs / Creatures

| Creature       | Location          | Behavior                                     | Status |
| -------------- | ----------------- | -------------------------------------------- | ------ |
| Troll          | Troll Room        | Guards passage, fight to pass                | Done   |
| Thief          | Wandering         | Steals treasures, opens egg, fight late-game | Done   |
| Cyclops        | Cyclops Room      | Say "Odysseus" or "Ulysses" to scare away    | Done   |
| Vampire bat    | Bat Room          | Attacks without garlic, teleports player     | Done   |
| Spirits        | Entrance to Hades | Block passage until exorcised                | Done   |
| Dungeon Master | Endgame           | Trivia questions, opens door after 3 correct | Done   |
| Robot          | Low Room          | Commandable NPC (walk, take, drop, push)     | Done   |
| Gnome          | Bank              | Appears with curtain of light                | **TODO** |

---

## Puzzles

### Combat Puzzles

| Puzzle  | Solution                    | Points |
| ------- | --------------------------- | ------ |
| Troll   | Kill with sword             | 0      |
| Thief   | Kill with knife (late game) | 25     |
| Cyclops | Say "Odysseus"              | 10     |

### Mechanical Puzzles

| Puzzle              | Solution                                    | Reward                |
| ------------------- | ------------------------------------------- | --------------------- |
| Trap door           | Move rug, open door                         | Access to underground |
| Dam                 | Turn bolt with wrench                       | Drain reservoir       |
| Carousel/Round Room | Robot push triangular button                | Stop spinning         |
| Bucket/Well         | Pour water to descend, take water to ascend | Access tea room area  |
| Coal machine        | Put coal in, turn switch                    | Diamond               |
| Basket              | Lower/raise for mine access                 | Transport items       |
| Balloon             | Light guidebook, wait, land, tether         | Volcano access        |

### Word/Knowledge Puzzles

| Puzzle         | Solution                            | Reward                 |
| -------------- | ----------------------------------- | ---------------------- |
| Riddle Room    | Answer "well"                       | Access to Pearl Room   |
| Cyclops        | Say "Odysseus"                      | Passage opens          |
| Exorcism       | Ring bell, light candles, read book | Access to Land of Dead |
| Loud Room      | Say "echo"                          | Platinum bar           |
| Endgame trivia | Various answers                     | Progress               |

### Spatial Puzzles

| Puzzle       | Solution                      | Reward           |
| ------------ | ----------------------------- | ---------------- |
| Maze         | Map carefully                 | Coins, keys      |
| Coal mine    | Navigate maze                 | Coal, bracelet   |
| Royal Puzzle | Push sandstone blocks         | Gold card        |
| Mirror box   | Push panels, raise/lower pole | Dungeon entrance |
| Bank         | Enter walls, use curtain      | Portrait, bills  |

### Item Manipulation Puzzles

| Puzzle          | Solution                               | Reward           |
| --------------- | -------------------------------------- | ---------------- |
| Egg             | Let thief steal and open it            | Canary           |
| Key (Tiny Room) | Mat under door, screwdriver in keyhole | Blue sphere      |
| Coffin          | Drain reservoir, carry across          | 10 points        |
| Glacier         | Throw torch at ice                     | Ruby room access |
| Rainbow         | Wave sceptre at falls                  | Pot of gold      |
| Bauble          | Wind canary in forest                  | Bauble           |
| Buried treasure | Dig 4 times with shovel                | Statue           |

### Multi-Step Puzzles

| Puzzle         | Steps                                              | Reward   |
| -------------- | -------------------------------------------------- | -------- |
| Endgame access | Get 616 pts, go to Land of Dead, wait for wraith   | Endgame  |
| Endgame prison | Set dial to 4, push button, tell master stay, etc. | Treasury |

---

## Point Breakdown by Area

| Region                 | Points | Notes                            |
| ---------------------- | ------ | -------------------------------- |
| Surface (House/Forest) | ~15    | Egg, entering                    |
| Troll Area             | ~36    | Painting                         |
| Maze                   | ~40    | Coins, thief treasure            |
| Round Room Area        | ~54    | Sphere, violin, necklace, spices |
| Dam/Reservoir          | ~38    | Trunk, platinum bar              |
| Temple/Hades           | ~22    | Grail, trident                   |
| Coal Mine              | ~34    | Diamond, bracelet, jade          |
| Egyptian/Glacier       | ~33    | Coffin, ruby                     |
| River                  | ~58    | Statue, emerald, pot             |
| Volcano                | ~81    | Torch, crown, stamps, coin       |
| Bank                   | ~40    | Portrait, bills                  |
| Royal Puzzle           | ~25    | Gold card                        |
| Miscellaneous          | ~40    | Egg contents, bauble, etc.       |
| Endgame                | 100    | Separate score                   |

---

## Trivia Questions (Endgame)

Questions asked at the Dungeon Entrance:

| Question                                     | Answer         |
| -------------------------------------------- | -------------- |
| How to read the cakes?                       | flask          |
| What item is haunted?                        | rusty knife    |
| How to reach thief's lair (not via Cyclops)? | temple         |
| Where from altar (besides temple)?           | forest         |
| What offends the ghosts?                     | skeleton       |
| Where is "Hello Sailor" useful?              | none           |
| Minimum value of zorkmid treasures?          | 30003          |
| What to do with mirror?                      | touch (or rub) |

---

## Version Differences

| Version  | Max Score | Notes              |
| -------- | --------- | ------------------ |
| Jun 1977 | ~285      | Earliest known     |
| Dec 1977 | 500       | No endgame         |
| Apr 1978 | 500+100   | Endgame incomplete |
| Sep 1978 | 585+100   | Endgame added      |
| Oct 1978 | 616+100   | Puzzle room added  |
| Jul 1981 | 616+100   | Final MDL version  |
| Various  | 616+100   | Fortran versions   |

---

## Death Conditions

| Death                    | Status   | Notes                                  |
| ------------------------ | -------- | -------------------------------------- |
| Killed by troll          | Done     | Combat system                          |
| Killed by thief          | Done     | Combat system                          |
| Killed by cyclops        | Done     | Combat system                          |
| Eaten by grue (darkness) | Done     | Darkness handler                       |
| Drowned at falls         | Done     | Falls death handler                    |
| Drowned in river         | Done     | River navigation blocking              |
| Gas room explosion       | Done     | Gas room interceptor (torch + gas)     |
| Fell in volcano          | **TODO** | Falling off ledge without balloon      |
| Glacier flood            | **TODO** | Possible death from glacier mechanics  |
| Slide without rope       | **TODO** | Sliding to cellar                      |
| Red cake explosion       | **TODO** | Eating red cake                        |

**Resurrection:** If killed, PRAY at Altar to be resurrected (once). **Status: TODO** — PRAY currently only does altar→forest teleport, not resurrection.

---

## File References (Fortran Source)

| File     | Contents                           |
| -------- | ---------------------------------- |
| dmain.F  | Main program, CPVEC data           |
| rooms.F  | Room processors                    |
| nrooms.F | New room processors                |
| objcts.F | Object definitions                 |
| nobjs.F  | New objects, puzzle walls          |
| verbs.F  | Main verbs                         |
| sverbs.F | Simple verbs                       |
| dverb1.F | Auxiliary verbs 1                  |
| dverb2.F | Auxiliary verbs 2, puzzle movement |
| villns.F | Villain (thief, troll) logic       |
| actors.F | NPC processors                     |
| demons.F | Daemon processors                  |
| clockr.F | Clock events                       |
| ballop.F | Balloon logic                      |
| lightp.F | Light source logic                 |

---

## Implementation Notes for Sharpee

1. **Treasure tracking:** OFVAL → `points` on IdentityTrait, OTVAL → `trophyCaseValue` on TreasureTrait (ADR-129)
2. **Thief behavior:** Done — wanders, steals, opens egg at lair, fight difficulty scales with score
3. **Light timer:** Done — lantern has ~330 turns, candles limited
4. **Puzzle room:** Done — 8x8 grid, push walls, gold card obtainable
5. **Robot commands:** Done — "tell robot to X" syntax, walk/take/drop/push
6. **Endgame separation:** Done — score resets to 0/100, INCANT cheat available
7. **Resurrection:** **TODO** — one-time prayer mechanic after death
8. **Randomization:** Done — combat has random elements, carousel exits random
9. **ADR-078 extension:** Done — Thief's Canvas puzzle (ghost ritual, 34 pts)
10. **Gnome NPC:** **TODO** — bank curtain of light interaction

## Open Issues

See `docs/work/issues/issues-list-03.md` for tracked bugs:
- ISSUE-052 (High): Capability registry not shared across require() boundaries
- ISSUE-055 (Medium): Scope resolver doesn't find items in open containers on floor
- ISSUE-054 (Low): Cyclops say handler emits raw {npcName} template
- ISSUE-056 (Low): Treasure Room thief summoning message not displayed
