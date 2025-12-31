# GDT (Game Debugging Tool) Command Reference

## Overview

GDT was Bob Supnik's debug interface for the Fortran port of mainframe Zork. It provided comprehensive access to the game's internal state, allowing developers and testers to inspect and modify any aspect of the game.

## Entering GDT

```
>GDT
```

Once authenticated (or if GDTFLG=1), you see:

```
GDT>
```

## Complete Command List

### Alter Commands (Modify Game State)

| Command | Name           | Description                           |
| ------- | -------------- | ------------------------------------- |
| `AA`    | Alter ADVS     | Modify adventurer (player) state      |
| `AC`    | Alter CEVENT   | Modify clock events (timers, daemons) |
| `AF`    | Alter FINDEX   | Modify game flags/indices             |
| `AH`    | Alter HERE     | **Teleport player to any room**       |
| `AN`    | Alter switches | Modify game switches/toggles          |
| `AO`    | Alter OBJCTS   | **Move any object anywhere**          |
| `AR`    | Alter ROOMS    | Modify room properties                |
| `AV`    | Alter VILLS    | Modify villain state                  |
| `AX`    | Alter EXITS    | Modify room connections               |

### Display Commands (Inspect Game State)

| Command | Name             | Description              |
| ------- | ---------------- | ------------------------ |
| `DA`    | Display ADVS     | Show adventurer state    |
| `DC`    | Display CEVENT   | Show clock events        |
| `DF`    | Display FINDEX   | Show game flags          |
| `DH`    | Display HACKS    | Show hack/debug info     |
| `DL`    | Display lengths  | Show array lengths       |
| `DM`    | Display RTEXT    | Show room text indices   |
| `DN`    | Display switches | Show game switches       |
| `DO`    | Display OBJCTS   | Show object properties   |
| `DP`    | Display parser   | Show parser state        |
| `DR`    | Display ROOMS    | Show room properties     |
| `DS`    | Display state    | Show overall game state  |
| `DT`    | Display text     | Display text by index    |
| `DV`    | Display VILLS    | Show villain state       |
| `DX`    | Display EXITS    | Show room exits          |
| `D2`    | Display ROOM2    | Show secondary room data |

### Villain Toggle Commands

| Command | Name            | Description            |
| ------- | --------------- | ---------------------- |
| `NC`    | No cyclops      | Disable cyclops        |
| `ND`    | No deaths       | **Toggle immortality** |
| `NR`    | No robber       | Disable thief          |
| `NT`    | No troll        | Disable troll          |
| `RC`    | Restore cyclops | Re-enable cyclops      |
| `RD`    | Restore deaths  | Disable immortality    |
| `RR`    | Restore robber  | Re-enable thief        |
| `RT`    | Restore troll   | Re-enable troll        |

### Utility Commands

| Command | Name           | Description                              |
| ------- | -------------- | ---------------------------------------- |
| `TK`    | Take           | Take any object (regardless of location) |
| `PD`    | Program detail | Toggle verbose debug output              |
| `HE`    | Help           | Display command list                     |
| `EX`    | Exit           | Return to normal game                    |

## Key Capabilities

### 1. Teleportation (`AH` - Alter HERE)

Move the player to any room by number:

```
GDT> AH
Old=2 New=100
```

This teleports from room 2 (West of House) to room 100.

### 2. Object Manipulation (`AO` - Alter OBJCTS)

Move any object to any location:

```
GDT> AO
Object=sword
Action=move
New location=player
```

### 3. Immortality (`ND` - No Deaths)

Prevents the player from dying:

```
GDT> ND
Deaths off.
```

Supnik's quote: _"Getting killed too often? Turn on immortality mode."_

### 4. Villain Control

Disable troublesome NPCs during testing:

```
GDT> NR    (disable thief)
GDT> NT    (disable troll)
GDT> NC    (disable cyclops)
```

### 5. Item Acquisition (`TK` - Take)

Acquire any object regardless of its location:

```
GDT> TK
Object=sceptre
Taken.
```

## Internal Data Structures

GDT exposes the game's core data structures:

| Structure  | Contents                                      |
| ---------- | --------------------------------------------- |
| **ADVS**   | Adventurer state (inventory, score, location) |
| **OBJCTS** | All objects (location, properties, flags)     |
| **ROOMS**  | Room definitions (exits, properties)          |
| **VILLS**  | Villain state (location, strength, activity)  |
| **CEVENT** | Clock events (lamp timer, thief movement)     |
| **FINDEX** | Game flags and progress markers               |

## Room Numbers (Selected)

| #   | Room                    |
| --- | ----------------------- |
| 2   | West of House           |
| 9   | Cellar                  |
| 100 | Living Room             |
| 191 | Top of Stairs (Endgame) |

## Object Numbers (Selected)

| #   | Object        |
| --- | ------------- |
| 1   | Brass lantern |
| 12  | Elvish sword  |
| 17  | Jeweled egg   |

## Why GDT Mattered

From Bob Supnik's recollections:

> _"Once the game was released, players quickly realized that [GDT] offered a simple way to short circuit the game and to undo mistakes. Lost something to the thief? Take it back. Getting killed too often? Turn on immortality mode."_

GDT was essential for:

- **Development**: Testing puzzles without playing through the whole game
- **Debugging**: Inspecting game state when something went wrong
- **Content verification**: Ensuring all rooms and objects were accessible

## GDT vs Commercial Debuggers

The commercial Infocom games had their own debug tools, but GDT was specific to the Fortran/C port of mainframe Zork. Infocom's internal debugging for Z-machine games used different mechanisms.

---

_Documented from source code analysis and historical records, December 2024._
