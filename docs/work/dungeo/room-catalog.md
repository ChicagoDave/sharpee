# Dungeo Room Catalog

Quick reference for rooms, regions, and connections.

## By Region

### white-house (Surface)
| Room | Connections |
|------|-------------|
| West of House | N:North of House, S:South of House, W:Forest-1 |
| North of House | N:Forest-Low-Branches, W:West of House, E:Behind House |
| South of House | W:West of House, E:Behind House, S:Forest-2 |
| Behind House | W:Kitchen, E:Clearing, N:North of House |

### house-interior
| Room | Connections |
|------|-------------|
| Kitchen | OUT/E:Behind House, W:Living Room, U:Attic |
| Living Room | E:Kitchen, D:Cellar, W:Strange Passage |
| Attic | D:Kitchen |

### forest
| Room | Connections |
|------|-------------|
| Forest-1 | N:Forest-1, E:Forest-Low-Branches, S:Forest-2, W:Forest-1 |
| Forest-2 | N:South of House, W:Forest-1, S:Forest-3, E:Clearing |
| Forest-3 | W:Forest-2, N:Forest-3, S:Forest-3, E:Canyon View |
| Forest-Low-Branches | U:Up a Tree, S:North of House |
| Up a Tree | D:Forest (has egg) |
| Clearing | SW:Behind House, D:Grating Room, W:Forest-Low-Branches |
| Canyon View | W:Forest-3, S:Rocky Ledge |
| Rocky Ledge | U:Canyon View, D:Canyon Bottom |
| Canyon Bottom | U:Rocky Ledge, N:End of Rainbow |

### underground
| Room | Connections |
|------|-------------|
| Cellar | E:Troll Room, S:West Chasm, U:Living Room |
| Troll Room | S:Maze-1, E:North/South Crawlway, N:East/West Passage, W:Cellar |
| East/West Passage | W:Troll Room, N/D:Deep Ravine, E:Round Room |
| Deep Ravine | S:East/West Passage, W:Rocky Crawl, E:Chasm |
| Rocky Crawl | W:Deep Ravine, E:Dome Room, NW:Egyptian Room |
| Chasm | S:Deep Ravine, E:North/South Passage |
| Round Room | NW:Deep Canyon, NE:North/South Passage, E:Grail Room, SE:Winding Passage, S/N:Engravings Cave, SW:Maze-1, W:East/West Passage |
| North/South Passage | N:Chasm, NE:Loud Room, S:Round Room |
| Loud Room | W:North/South Passage, U:Damp Cave, E:Ancient Chasm |
| Damp Cave | D:Loud Room |
| Ancient Chasm | S:Loud Room, W:Dead End-1, N:Dead End-2, E:Small Cave |
| Engravings Cave | N:Round Room, SE:Riddle Room |
| Riddle Room | D:Engravings Cave, E:Pearl Room |
| Grail Room | W:Round Room, U:Temple, E:Narrow Crawlway |
| Winding Passage | E:Mirror Room, N:Narrow Crawlway |
| Narrow Crawlway | SW:Mirror Room, N:Grail Room |
| Mirror Room | N:Narrow Crawlway, W:Winding Passage, E:Tiny Cave (or Small Cave in Coal Mine state) |
| West Chasm | W:Cellar, N:North/South Crawlway, S:Gallery |
| North/South Crawlway | E:Troll Room, N:West Chasm, S:Studio |
| Gallery | W:Bank Entrance, S:Studio, N:West Chasm |
| Studio | NW:Gallery, N:North/South Crawlway, U:Kitchen (1 item limit) |

### temple
| Room | Connections |
|------|-------------|
| Temple | W:Grail Room, E:Altar |
| Altar | W:Temple, "pray":Clearing |
| Dome Room | E:Rocky Crawl, D:Torch Room (via rope) |
| Torch Room | D:North/South Passage, W:Tiny Room, U:Dome Room |
| Tiny Room | E:Torch Room, N:Dreary Room |
| Dreary Room | S:Tiny Room |
| Egyptian Room | E:Rocky Crawl, S:Volcano View, U:Glacier Room |
| Tiny Cave | D:Hades |
| Hades | E:Land of the Living Dead, U:Tiny Cave |
| Land of the Living Dead | W:Hades, E:Tomb |
| Tomb | W:Land of the Living Dead, N:Crypt |
| Crypt | S:Tomb |

### maze
| Room | Connections |
|------|-------------|
| Maze-1 | W:Troll Room, E:Maze-2, S:Maze-3 |
| Maze-2 | N:Maze-1, W:Maze-4, E:Dead End-1 |
| Maze-3 | S:Maze-1, N:Maze-2, E:Maze-4 |
| Maze-4 | N:Maze-2, W:Maze-3, U:Maze-15 |
| Maze-5 | NE:Dead End-3, SE:Dead End-4 |
| Maze-6 | D:Maze-15, E:Maze-7, U:Maze-11 |
| Maze-7 | W:Maze-6 |
| Maze-8 | S:Dead End-3, W:Maze-9 |
| Maze-9 | S:Dead End-3, W:Maze-8, NE:Cyclops Room |
| Maze-10 | N:Dead End-5, U:Maze-11, W:Maze-15 |
| Maze-11 | N:Maze-6, E:Maze-12, W:Maze-10, S:Maze-14, D:Maze-13 |
| Maze-12 | NW:Maze-14, D:Maze-13, NE:Grating Room |
| Maze-13 | E:Maze-11, U:Maze-12, W:Maze-14 |
| Maze-14 | E:Maze-11, S:Maze-13, W:Maze-12, D:Maze-10 |
| Maze-15 | N:Maze-4, SW:Maze-6, E:Dead End-3 |
| Dead End-1 | S:Maze-2 |
| Dead End-2 | S:Dead End-1 |
| Dead End-3 | W:Maze-15, NE:Dead End-2, E:Maze-5, S:Maze-9, U:Maze-8 |
| Dead End-4 | N:Maze-5 |
| Dead End-5 | S:Maze-10 |
| Grating Room | NE:Maze-12, U:Clearing |
| Cyclops Room | NE:Maze-9, U:Treasure Room, N:Strange Passage |
| Strange Passage | S:Cyclops Room, E:Living Room |

### dam
| Room | Connections |
|------|-------------|
| Stream View | N:Glacier Room, E:Reservoir South |
| Reservoir South | W:Stream View, N:Reservoir, U:Deep Canyon |
| Reservoir | S:Reservoir South, N:Reservoir North |
| Reservoir North | S:Reservoir, N:Atlantis Room |
| Atlantis Room | SE:Reservoir North, U:Small Cave |
| Deep Canyon | NW:Reservoir South, S:Round Room, E:Flood Control Dam #3 |
| Flood Control Dam #3 | S:Deep Canyon, D:Dam Base, N:Dam Lobby |
| Dam Lobby | S:Flood Control Dam #3, N/E:Maintenance Room |
| Maintenance Room | S/W:Dam Lobby |
| Dam Base | N:Flood Control Dam #3 |
| Glacier Room | N:Stream View, W:Ruby Room |

### volcano
| Room | Connections |
|------|-------------|
| Ruby Room | S:Glacier Room, W:Lava Room |
| Lava Room | W:Ruby Room, S:Volcano Bottom |
| Volcano Bottom | N:Lava Room, (balloon up) |
| Near Small Ledge | W:Narrow Ledge, (balloon movements) |
| Near Viewing Ledge | (balloon movements) |
| Near Wide Ledge | W:Wide Ledge, (balloon movements) |
| Narrow Ledge | S:Library, E:Near Small Ledge (balloon) |
| Library | N:Narrow Ledge |
| Wide Ledge | E:Near Wide Ledge (balloon), S:Dusty Room |
| Dusty Room | N:Wide Ledge |

### well-room
| Room | Connections |
|------|-------------|
| Pearl Room | W:Riddle Room, E:Well Bottom |
| Well Bottom | (bucket up):Top of Well |
| Top of Well | (bucket down):Well Bottom, E:Tea Room |
| Tea Room | W:Top of Well, NW:Low Room, E:Pool Room |
| Low Room | SE:Tea Room, E:Machine Room |
| Machine Room | W:Low Room, S:Dingy Closet |
| Dingy Closet | N:Machine Room |
| Pool Room | W:Tea Room |

### coal-mine
| Room | Connections |
|------|-------------|
| Cold Passage | E:Mirror Room, W:Slide Room, N:Steep Crawlway |
| Steep Crawlway | S:Mirror Room, SW:Cold Passage |
| Slide Room | D:Slide-1, E:Cold Passage, N:Mine Entrance |
| Mine Entrance | S:Slide Room, NW:Squeaky Room, NE:Shaft Room |
| Squeaky Room | S:Mine Entrance, W:Small Room |
| Small Room | E:Squeaky Room |
| Shaft Room | W:Mine Entrance, N:Wooden Tunnel |
| Wooden Tunnel | S:Shaft Room, W:Smelly Room, NE:Mine Maze-1 |
| Smelly Room | E:Wooden Tunnel, D:Gas Room |
| Gas Room | U:Smelly Room |
| Timber Room | N:Ladder Bottom, SW:Bottom of Shaft |
| Bottom of Shaft | E:Machine Room, NE:Timber Room |
| Machine Room | NW:Bottom of Shaft |
| Ladder Bottom | U:Ladder Top, S:Timber Room, NE:Dead End (coal) |

### bank-of-zork
| Room | Connections |
|------|-------------|
| Bank Entrance | NW:West Teller, NE:East Teller, S:Gallery |
| West Teller | N:Viewing Room, W:Vault Room |
| East Teller | N:Viewing Room, E:Vault Room |
| Viewing Room | S:Bank Entrance |
| Safety Depository | S:Chairman's Office, "walk through":Vault of Zork |
| Chairman's Office | N:Safety Depository |
| Vault of Zork | (walk through walls puzzle) |

### frigid-river
| Room | Connections |
|------|-------------|
| Rocky Shore | NW:Small Cave, (board boat):Frigid River-1 |
| Frigid River-1 to 5 | River flow downstream |
| White Cliffs Beach 1-2 | Shore landings |
| Sandy Beach | E:Frigid River-4, S:Shore |
| Shore | N:Sandy Beach, S:Aragain Falls |
| End of Rainbow | SE:Canyon Bottom, W:Rainbow Room |
| Rainbow Room | E:End of Rainbow, W:Aragain Falls |
| Aragain Falls | E:Rainbow Room (wave sceptre) |

### royal-puzzle
| Room | Connections |
|------|-------------|
| Treasure Room | U:Cyclops Room, E:Square Room |
| Square Room | W:Treasure Room, S:Side Room, D:Puzzle Room |
| Side Room | N:Square Room, E:Puzzle Room |
| Puzzle Room | W:Side Room, U:Square Room |

### endgame
| Room | Connections |
|------|-------------|
| Top of Stairs | D:Stone Room |
| Stone Room | S:Top of Stairs, N:Small Room |
| Small Room | N:Long Hallway, S:Stone Room |
| Long Hallway | NE/NW:North/South Hallway |
| Prison Cell | S:South Corridor, N:North Corridor |
| Parapet | S:North Corridor |

---

## Key Items by Location

| Item | Location | Notes |
|------|----------|-------|
| Platinum Bar | Loud Room | Say "echo" to get it |
| Skeleton Key | Maze (Dead End) | Not the rusty knife |
| Ivory Torch | Torch Room | Need rope from Dome |
| Egg | Up a Tree | Jewel-encrusted |
| Sword | Living Room | For combat |
| Lantern | Living Room | Battery powered |
| Rope | Attic | For Dome Room |
| Sceptre | Inside house | Wave at rainbow |

