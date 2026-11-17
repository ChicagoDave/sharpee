# Twisty Maze Map

"This is part of a maze of twisty little passages, all alike."

## Mermaid Diagram

```mermaid
flowchart TD
    subgraph "Maze Entrances/Exits"
        MTROL[Troll Room]
        MGRAT[Grating Room]
        CYCLO[Cyclops Room]
    end

    subgraph "Maze Level 1"
        M1[MAZE1]
        M2[MAZE2]
        M3[MAZE3]
        M4[MAZE4]
        D1[DEAD1]
    end

    subgraph "Maze Level 2"
        M5[MAZE5<br/>skeleton/coins/keys]
        D2[DEAD2]
        M6[MAZE6]
        M7[MAZE7]
        M8[MAZE8]
        D3[DEAD3]
    end

    subgraph "Maze Level 3"
        M9[MAZE9]
        M10[MAZ10]
        M11[MAZ11]
        M12[MAZ12]
        M13[MAZ13]
        M14[MAZ14]
        M15[MAZ15]
        D4[DEAD4]
    end

    %% Entrance from Troll Room
    MTROL -->|S| M1

    %% Level 1 connections
    M1 -->|N| M1
    M1 -->|S| M2
    M1 -->|E| M4
    M2 -->|S| M1
    M2 -->|N| M4
    M2 -->|E| M3
    M3 -->|W| M2
    M3 -->|N| M4
    M4 -->|W| M3
    M4 -->|N| M1
    M4 -->|E| D1
    D1 -->|S| M4

    %% Level 1 to Level 2
    M3 -->|UP| M5

    %% Level 2 connections
    M5 -->|N| M3
    M5 -->|E| D2
    M5 -->|SW| M6
    D2 -->|W| M5
    M6 -->|DOWN| M5
    M6 -->|W| M6
    M6 -->|E| M7
    M7 -->|W| M6
    M7 -->|NE| D1
    M7 -->|E| M8
    M7 -->|S| M15
    M8 -->|NE| M7
    M8 -->|W| M8
    M8 -->|SE| D3
    D3 -->|N| M8

    %% Level 2 to Level 3
    M6 -->|UP| M9
    M7 -->|UP| M14

    %% Level 3 connections
    M9 -->|N| M6
    M9 -->|NW| M9
    M9 -->|E| M11
    M9 -->|DOWN| M10
    M9 -->|S| M13
    M9 -->|W| M12
    M10 -->|E| M9
    M10 -->|W| M13
    M10 -->|UP| M11
    M11 -->|DOWN| M10
    M11 -->|NW| M13
    M11 -->|SW| M12
    M12 -->|W| M5
    M12 -->|SW| M11
    M12 -->|E| M13
    M12 -->|UP| M9
    M12 -->|N| D4
    D4 -->|S| M12
    M13 -->|E| M9
    M13 -->|DOWN| M12
    M13 -->|S| M10
    M13 -->|W| M11
    M14 -->|W| M15
    M14 -->|NW| M14
    M14 -->|NE| M7
    M14 -->|S| M7
    M15 -->|W| M14
    M15 -->|S| M7

    %% Exits
    M11 -->|NE| MGRAT
    MGRAT -->|SW| M11
    M15 -->|NE| CYCLO
```

## Key Information

### Entry Point
- **South from Troll Room** → MAZE1

### Exit Points
- **MAZ11 → Grating Room** (NE) - leads up to the clearing
- **MAZ15 → Cyclops Room** (NE)

### Treasure Location
- **MAZE5** contains:
  - Skeleton
  - Bag of coins
  - Set of keys
  - Broken lantern
  - Rusty knife

### Self-Loops (same room)
| Room | Direction |
|------|-----------|
| MAZE1 | N |
| MAZE6 | W |
| MAZE8 | W |
| MAZE9 | NW |
| MAZ14 | NW |

### Dead Ends
| Dead End | Return Direction | Connects To |
|----------|------------------|-------------|
| DEAD1 | S | MAZE4 |
| DEAD2 | W | MAZE5 |
| DEAD3 | N | MAZE8 |
| DEAD4 | S | MAZ12 |

## Room Connections Table

| Room | N | S | E | W | NE | NW | SE | SW | UP | DOWN |
|------|---|---|---|---|----|----|----|----|----|----|
| MAZE1 | MAZE1 | MAZE2 | MAZE4 | MTROL | - | - | - | - | - | - |
| MAZE2 | MAZE4 | MAZE1 | MAZE3 | - | - | - | - | - | - | - |
| MAZE3 | MAZE4 | - | - | MAZE2 | - | - | - | - | MAZE5 | - |
| MAZE4 | MAZE1 | - | DEAD1 | MAZE3 | - | - | - | - | - | - |
| MAZE5 | MAZE3 | - | DEAD2 | - | - | - | - | MAZE6 | - | - |
| MAZE6 | - | - | MAZE7 | MAZE6 | - | - | - | - | MAZE9 | MAZE5 |
| MAZE7 | - | MAZ15 | MAZE8 | MAZE6 | DEAD1 | - | - | - | MAZ14 | - |
| MAZE8 | - | - | - | MAZE8 | MAZE7 | - | DEAD3 | - | - | - |
| MAZE9 | MAZE6 | MAZ13 | MAZ11 | MAZ12 | - | MAZE9 | - | - | - | MAZ10 |
| MAZ10 | - | - | MAZE9 | MAZ13 | - | - | - | - | MAZ11 | - |
| MAZ11 | - | - | - | - | MGRAT | MAZ13 | - | MAZ12 | - | MAZ10 |
| MAZ12 | DEAD4 | - | MAZ13 | MAZE5 | - | - | - | MAZ11 | MAZE9 | - |
| MAZ13 | - | MAZ10 | MAZE9 | MAZ11 | - | - | - | - | - | MAZ12 |
| MAZ14 | - | MAZE7 | - | MAZ15 | MAZE7 | MAZ14 | - | - | - | - |
| MAZ15 | - | MAZE7 | - | MAZ14 | CYCLO | - | - | - | - | - |

## Source
Extracted from `docs/dungeon-81/mdlzork_810722/patched_confusion/dung.mud`
