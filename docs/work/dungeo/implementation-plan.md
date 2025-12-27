# Dungeo Implementation Plan

## Approach

Implement in playable vertical slices, not horizontal layers. Each phase produces a playable game that can be expanded.

---

## Prerequisites: Required ADRs

Before implementation begins, these architectural decisions must be finalized and approved.

### Required for Phase 1

| ADR | Status | Needed For |
|-----|--------|------------|
| ADR-070: NPC System | Proposed | Troll guard behavior |
| ADR-071: Daemons/Fuses | Proposed | Lantern battery countdown |
| ADR-072: Combat System | Proposed | Troll fight mechanics, randomization |

### Required for Phase 3

| ADR | Status | Needed For |
|-----|--------|------------|
| ADR-073: Vehicle System | Not Started | Boat mechanics, basket elevator |

### Required for Phase 5

| ADR | Status | Needed For |
|-----|--------|------------|
| ADR-070: NPC System | (see above) | Thief wandering, stealing, AI |

### Parser Enhancements (Can Be Deferred)

| ADR | Status | Needed For |
|-----|--------|------------|
| ADR-074: Multi-Command Input | Not Started | "N. N. E. TAKE LAMP" |
| ADR-075: Pronoun Resolution | Not Started | "TAKE IT", "DROP THEM" |
| ADR-076: AGAIN Command | Not Started | Repeat last action |

### Implementation Order

1. **ADR-070** (NPC) + **ADR-071** (Daemons) + **ADR-072** (Combat) → All drafted
2. **ADR-073** (Vehicle) → Can be drafted during Phase 2
3. Parser ADRs → Can be deferred, workaround with explicit commands

---

## Phase 1: White House to Troll (Playable Demo)

**Goal**: Playable from start through defeating troll, ~30 rooms

### Rooms
- Surface: West of House, North/South/Behind, Kitchen, Living Room, Attic
- Forest: Forest rooms, Clearing, Up a Tree
- Underground: Cellar, Troll Room, East-West Passage, Round Room

### Objects
- Mailbox, leaflet, sword, lantern, rope, knife
- Egg (unopened), sack with food and garlic
- Trophy case, rug, trapdoor

### Systems Needed
- ✅ Light/darkness (exists)
- ✅ Containers (exists)
- ✅ Combat (basic exists)
- ❌ Timed events (lantern battery)
- ❌ NPC basics (troll - stationary guard)

### Puzzles
- Open mailbox, read leaflet
- Find trapdoor under rug
- Light lantern for underground
- Defeat troll with sword

### Exit Criteria
- Can traverse from West of House to Round Room
- Troll blocks passage until defeated
- Lantern tracks remaining light
- Score increases for troll defeat

---

## Phase 2: Dam & Coal Mine

**Goal**: Add dam puzzle, coal mine, ~50 total rooms

### New Rooms
- Dam area: Dam, Dam Base, Dam Lobby, Maintenance Room
- Reservoir (drained/filled)
- Coal Mine: Shaft Room, Timber Room, Drafty Room, Machine Room, Coal Mine, Ladder area

### New Objects
- Matchbook, guidebook, wrench, screwdriver
- Coal, machine, basket
- Trunk of jewels (in reservoir)

### Systems Needed
- ❌ Mechanical state (dam open/closed)
- ❌ Basket/elevator mechanics
- ❌ Multi-room cause/effect (dam affects reservoir)

### Puzzles
- Open dam to drain reservoir
- Use basket to descend shaft
- Light coal in machine to get sharp sword
- Get trunk from drained reservoir

### Exit Criteria
- Dam controls work, affect water levels
- Basket system functional
- Coal mine traversable
- Machine works with coal

---

## Phase 3: River & Boat

**Goal**: Add river traversal, boat mechanics, ~70 total rooms

### New Rooms
- River: Shore, River (multiple), Waterfall areas
- Aragain Falls, Rainbow room, End of Rainbow
- Atlantis, Reservoir Shore

### New Objects
- Inflatable boat, hand pump
- Buoy with emerald
- Trident, pot of gold
- Sceptre (for rainbow)

### Systems Needed
- ❌ Vehicle trait/behavior
- ❌ INFLATE/DEFLATE actions
- ❌ WAVE action (sceptre)
- ❌ Water current (auto-movement)

### Puzzles
- Inflate boat, patch boat
- Navigate river without crashing
- Wave sceptre for solid rainbow
- Dig at end of rainbow

### Exit Criteria
- Boat fully functional
- River navigation works
- Rainbow puzzle solvable
- DIG action works

---

## Phase 4: Temple & Hades

**Goal**: Add temple, exorcism puzzle, ~90 total rooms

### New Rooms
- Temple, Altar area
- Egyptian Room, Coffin area
- Hades, Land of the Dead
- Torch room, Dome area

### New Objects
- Bell, book, candles
- Gold coffin, sceptre (if not from Ph3)
- Ivory torch, crystal skull
- Chalice

### Systems Needed
- ❌ RING action (bell)
- ❌ PRAY action
- ❌ Exorcism sequence (bell, book, candle)
- ❌ Spirit NPCs (blocking, dispellable)

### Puzzles
- Retrieve bell, book, candles
- Perform exorcism to clear Hades
- Get skull from Land of Dead
- Rope descent in dome

### Exit Criteria
- Exorcism fully works
- Spirits block until exorcised
- Temple treasures retrievable
- Rope mechanics work

---

## Phase 5: The Thief

**Goal**: Add wandering thief NPC

### Systems Needed
- ❌ NPC wandering AI
- ❌ NPC inventory (thief carries stolen goods)
- ❌ Thief stealing behavior
- ❌ Thief combat (tougher than troll)
- ❌ Thief lair (treasure dump)
- ❌ Thief state (alive, dead, unconscious)

### Behavior Spec
- Wanders underground randomly
- Steals valuable items from rooms and player
- Fights if attacked or cornered
- Returns treasure to lair
- Can open egg properly (get canary)
- Combat is randomized, sword skill matters

### Exit Criteria
- Thief wanders and steals
- Thief can be killed
- Thief's lair contains stolen goods
- Proper egg opening via thief

---

## Phase 6: Mazes

**Goal**: Add both mazes, ~120 total rooms

### New Rooms
- Maze of Twisty Passages (all alike) - 10+ rooms
- Maze of Twisty Passages (all different) - 10+ rooms
- Grating room, Cyclops room

### New Objects
- Skeleton with rusty knife
- Coins, jewels scattered in maze
- Cyclops NPC

### Systems Needed
- ❌ Maze navigation (confusing connections)
- ❌ Object dropping for maze mapping
- ❌ Cyclops NPC (name puzzle)

### Puzzles
- Map mazes with dropped objects
- Say "ODYSSEUS" to cyclops
- Find skeleton and grating

### Exit Criteria
- Mazes navigable
- Grating openable from below
- Cyclops puzzle works

---

## Phase 7: Royal Puzzle

**Goal**: Add sliding room puzzle, ~150 total rooms

### New Rooms
- Royal Puzzle entrance
- 16 sliding puzzle rooms
- Solution chamber

### Systems Needed
- ❌ Sliding room mechanics
- ❌ Room state tracking (positions)
- ❌ PUSH WALL action

### Puzzles
- Navigate shifting puzzle rooms
- Find correct sequence to solution

### Exit Criteria
- Puzzle rooms slide correctly
- Solution achievable
- Cardinal inscription readable

---

## Phase 8: Bank of Zork

**Goal**: Add bank puzzle, ~170 total rooms

### New Rooms
- Chasm area (east/west)
- Bank interior: Lobby, offices, vault
- Safety deposit area
- Viewing room

### New Objects
- Portrait, zorkmid bills
- Keys, vault door
- Bills (multiple denominations)

### Systems Needed
- ❌ Curtain/viewing room mechanics
- ❌ Complex lock (vault)
- ❌ Teller/deposit box system

### Exit Criteria
- Bank traversable
- Vault accessible via puzzle
- All bank treasures retrievable

---

## Phase 9: Wizard Area & Mirrors

**Goal**: Add mirror puzzles, ~185 total rooms

### New Rooms
- Mirror rooms (north/south)
- Wizard's workroom
- Topiary/garden
- Crypt, tomb areas

### New Objects
- Mirror (magical)
- Ancient map
- Wizard's items

### Systems Needed
- ❌ Mirror reflection mechanics
- ❌ Mirror teleportation
- ❌ Short pole/long pole puzzle

### Exit Criteria
- Mirror navigation works
- Crypt accessible
- All wizard area treasures

---

## Phase 10: Endgame

**Goal**: Complete game with endgame sequence, all ~191 rooms

### New Rooms
- Stone Barrow (endgame entrance)
- Dungeon Master's domain
- Puzzle House
- Parapet, final rooms

### New Objects
- Master's items
- Final treasures

### Systems Needed
- ❌ Endgame trigger (all treasures placed)
- ❌ Dungeon Master NPC (guide)
- ❌ Final puzzle sequence
- ❌ Victory condition

### Exit Criteria
- All 616 points achievable
- Endgame triggerable
- Game completable
- Victory message displays

---

## Milestone Summary

| Phase | Rooms | Key Addition | Estimated Effort |
|-------|-------|--------------|------------------|
| 1 | ~30 | Playable demo | Foundation |
| 2 | ~50 | Dam & Mine | Medium |
| 3 | ~70 | River & Boat | High (vehicle) |
| 4 | ~90 | Temple | Medium |
| 5 | ~90 | Thief AI | High (NPC) |
| 6 | ~120 | Mazes | Medium |
| 7 | ~150 | Royal Puzzle | High (mechanics) |
| 8 | ~170 | Bank | Medium |
| 9 | ~185 | Mirrors | Medium |
| 10 | ~191 | Endgame | Medium |

Each phase produces a playable, saveable game that demonstrates progress.
