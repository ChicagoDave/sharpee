# Dungeo World Map

## Geographic Regions

Mainframe Zork is organized into distinct geographic regions. This document catalogs all areas for implementation planning.

### Surface (~10 rooms)
The above-ground starting area.

| Room | Key Features |
|------|--------------|
| West of House | Starting location, mailbox |
| North of House | |
| South of House | |
| Behind House | Kitchen window entry |
| Kitchen | Bag of food, bottle, stairs down |
| Living Room | Trophy case, sword, lantern, rug/trapdoor |
| Attic | Rope, knife |
| Forest (multiple) | Various forest rooms |
| Clearing | Grating to underground |
| Up a Tree | Egg with jewels |

### The Great Underground Empire - Upper Level (~40 rooms)
The initial underground areas accessible from the house.

| Area | Rooms | Key Features |
|------|-------|--------------|
| Cellar Area | ~5 | Trapdoor, Troll room |
| Maze (all alike) | 10+ | Classic twisty maze |
| Maze (all different) | 10+ | Variant maze |
| Round Room Complex | ~8 | Central hub, Loud Room, Dam area |
| Dam & Reservoir | ~6 | Dam controls, pile of leaves |
| Glacier & Crystal Cave | ~4 | Torch, crystal skull |

### The Great Underground Empire - Lower Level (~50 rooms)
Deeper areas requiring more puzzle-solving to access.

| Area | Rooms | Key Features |
|------|-------|--------------|
| Coal Mine | ~8 | Basket, shaft, coal, bat |
| Volcano/Lava Area | ~5 | Balloon, volcano view |
| Underground River | ~6 | Boat, rapids, waterfalls |
| Temple Area | ~6 | Prayer, treasure |
| Egyptian Room | ~3 | Coffin, sceptre |
| Hades | ~3 | Spirits, bell/book/candle |

### The Royal Puzzle (~30 rooms)
The famous 15-puzzle style sliding maze.

| Area | Rooms | Key Features |
|------|-------|--------------|
| Royal Puzzle entrance | 3 | Sandstone walls |
| Puzzle rooms | 25 | Sliding room puzzle |
| Solution area | 2 | Cardinal direction inscription |

### Bank of Zork (~15 rooms)
The complex bank puzzle area.

| Area | Rooms | Key Features |
|------|-------|--------------|
| Bank exterior | 2 | East/West of Chasm |
| Bank interior | ~10 | Chairman's office, vault, safety deposit |
| Viewing room | 3 | Curtains, portrait, bills |

### Wizard's Quarters (~20 rooms)
Magic and mirror puzzles.

| Area | Rooms | Key Features |
|------|-------|--------------|
| Mirror Rooms | 8 | North/South mirrors |
| Wizard's Workroom | 3 | Magic items |
| Topiary/Garden | 5 | Hedge maze |
| Crypt | 4 | Graves, tomb |

### Endgame (~20 rooms)
The final puzzle sequence.

| Area | Rooms | Key Features |
|------|-------|--------------|
| Dungeon Master's Lair | 5 | Final confrontation |
| Stone Barrow | 3 | Endgame entrance |
| Puzzle House | 5 | Door puzzles |
| Parapet | 4 | Endgame climax |
| Final victory | 1 | Winning room |

## Room Count Summary

| Region | Approximate Count |
|--------|-------------------|
| Surface | 10 |
| GUE Upper | 40 |
| GUE Lower | 50 |
| Royal Puzzle | 30 |
| Bank of Zork | 15 |
| Wizard's Quarters | 20 |
| Endgame | 20 |
| **Total** | **~185-195** |

## Connection Types

- Standard directional (N/S/E/W/NE/NW/SE/SW/U/D)
- Conditional (requires light, requires object, requires state)
- One-way (falls, slides)
- Vehicle-dependent (boat on river)
- Magical (teleport, mirror)
- Time-dependent (thief relocations)
