# DUNGEON (Dungeo)

A faithful recreation of **Mainframe Zork** (1981) built with [Sharpee](../../README.md), the parser-based Interactive Fiction authoring platform.

Based on the original work by Tim Anderson, Marc Blank, Bruce Daniels, and Dave Lebling.

## Stats

- **172 rooms** across 15 regions
- **616 points** (main game) + **100 points** (endgame)
- **17 walkthroughs** covering the full game
- Ported from the 1981 MDL/FORTRAN source (`docs/dungeon-81/mdlzork_810722/`)

## Regions

| Region | Description |
|--------|-------------|
| white-house | West of House, surrounding grounds |
| house-interior | Kitchen, Living Room, Attic |
| forest | Up a Tree, Canyon View, Rocky Ledge |
| underground | Cellar through Torch Room |
| maze | Grating Room, Cyclops Room, Treasure Room |
| temple | Temple, Altar, Mirror Room, Loud Room |
| dam | Flood Control Dam, Reservoir, Atlantis Room |
| frigid-river | Rocky Shore, Sandy Beach, End of Rainbow |
| well-room | Tea Room, Pool Room, Riddle Room |
| coal-mine | Mine maze, Gas Room, Machine Room |
| bank-of-zork | Bank Lobby, Vault, Safety Depository |
| volcano | Egyptian Room, Glacier, Volcano interior |
| royal-puzzle | Square Room, Puzzle Room |
| round-room | Carousel and surrounding rooms |
| endgame | Dungeon Entrance, Prison Cell, Parapet |

## Building and Playing

```bash
# Build platform + story
./build.sh -s dungeo

# Play interactively
node dist/cli/sharpee.js --play

# Run walkthrough tests
node dist/cli/sharpee.js --test --chain stories/dungeo/walkthroughs/wt-*.transcript

# Build for web browser
./build.sh -s dungeo -c browser
```

## License

MIT
