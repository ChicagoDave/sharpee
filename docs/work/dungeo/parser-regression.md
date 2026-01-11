# Dungeo Transcript Test Regression Tracking

Last updated: 2026-01-11

## Summary

- Total tests: 66 (river-navigation deleted)
- Passing: 5
- Failing: 0
- Not yet run: 61

## Test Categories

### Core Navigation & Basics
| Test | Status | Notes |
|------|--------|-------|
| navigation.transcript | [x] PASS | Basic room navigation (9/9) |
| house-interior.transcript | [ ] | House interior rooms |
| mailbox.transcript | [ ] | Mailbox interactions |
| rug-trapdoor.transcript | [ ] | Rug/trapdoor puzzle |

### Boat & Frigid River
| Test | Status | Notes |
|------|--------|-------|
| boat-inflate-deflate.transcript | [x] PASS | Pump/inflate/deflate (27/27) |
| boat-stick-puncture.transcript | [x] PASS | Stick punctures boat (16/16) |
| debug-boat.transcript | [ ] | Boat debugging |
| frigid-river-full.transcript | [x] PASS | Full river navigation (57/57) |
| river-navigation.transcript | [DELETED] | Replaced by frigid-river-full.transcript |
| wave-rainbow.transcript | [x] PASS | Fixed: was using wrong direction (WEST→EAST) and wrong item (sceptre→stick) |

### Puzzles - Underground
| Test | Status | Notes |
|------|--------|-------|
| bank-puzzle.transcript | [ ] | Bank of Zork |
| basket-elevator.transcript | [ ] | Shaft basket puzzle |
| bucket-well.transcript | [ ] | Bucket/well mechanics |
| coal-machine.transcript | [ ] | Coal machine puzzle |
| coffin-puzzle.transcript | [ ] | Coffin/sceptre puzzle |
| coffin-transport.transcript | [ ] | Moving coffin |
| dam-puzzle.transcript | [ ] | Dam controls |
| dam-drain.transcript | [ ] | Draining reservoir |
| dig-statue.transcript | [ ] | Digging for statue |
| mirror-room-toggle.transcript | [ ] | Mirror room mechanics |
| rope-puzzle.transcript | [ ] | Dome/rope puzzle |
| tiny-room-puzzle.transcript | [ ] | Tiny room navigation |

### NPCs
| Test | Status | Notes |
|------|--------|-------|
| bat-with-garlic.transcript | [ ] | Bat with garlic protection |
| bat-without-garlic.transcript | [ ] | Bat without garlic |
| cyclops-magic-word.transcript | [ ] | Cyclops ULYSSES |
| robot-commands.transcript | [ ] | Robot command puzzle |
| thiefs-canvas.transcript | [ ] | Thief interaction |
| troll-blocking.transcript | [ ] | Troll blocks passage |
| troll-combat.transcript | [ ] | Fighting troll |

### Maze
| Test | Status | Notes |
|------|--------|-------|
| maze-loops.transcript | [ ] | Maze loop detection |
| maze-navigation.transcript | [ ] | Maze traversal |

### Balloon
| Test | Status | Notes |
|------|--------|-------|
| balloon-actions.transcript | [ ] | Balloon basic actions |
| balloon-flight.transcript | [ ] | Full balloon flight |

### Special Actions
| Test | Status | Notes |
|------|--------|-------|
| egg-canary.transcript | [ ] | Egg/canary puzzle |
| exorcism-ritual.transcript | [ ] | Bell/book/candle |
| flooding.transcript | [ ] | Flood mechanics |
| implicit-take-put.transcript | [ ] | Implicit take on put |
| implicit-take-test.transcript | [ ] | Implicit take general |
| mail-order-stamp.transcript | [ ] | Stamp/letter puzzle |
| pray-altar-teleport.transcript | [ ] | Pray at altar |
| throw-torch-glacier.transcript | [ ] | Throw torch at glacier |
| wind-canary.transcript | [ ] | Wind up canary |

### Round Room & Hub
| Test | Status | Notes |
|------|--------|-------|
| round-room-hub.transcript | [ ] | Round room exits |

### Royal Puzzle
| Test | Status | Notes |
|------|--------|-------|
| royal-puzzle-basic.transcript | [ ] | Royal puzzle moves |
| royal-puzzle-exit.transcript | [ ] | Royal puzzle escape |

### Scoring
| Test | Status | Notes |
|------|--------|-------|
| trophy-case-scoring.transcript | [ ] | Trophy case points |
| hidden-max-score.transcript | [ ] | Max score test |

### GDT (Debug/Testing)
| Test | Status | Notes |
|------|--------|-------|
| gdt-basic.transcript | [ ] | GDT basic commands |
| gdt-phase2.transcript | [ ] | GDT phase 2 features |
| gdt-unrestricted-access.transcript | [ ] | GDT full access |

### Endgame
| Test | Status | Notes |
|------|--------|-------|
| endgame-dial.transcript | [ ] | Dial puzzle |
| endgame-entry.transcript | [ ] | Entering endgame |
| endgame-incant.transcript | [ ] | INCANT command |
| endgame-laser-puzzle.transcript | [ ] | Mirror/laser puzzle |
| endgame-mirror.transcript | [ ] | Endgame mirror |
| endgame-trivia.transcript | [ ] | Dungeon Master trivia |
| endgame-victory.transcript | [ ] | Victory sequence |
| tomb-crypt-navigation.transcript | [ ] | Tomb/crypt rooms |

### Walkthrough Segments
| Test | Status | Notes |
|------|--------|-------|
| wt-01-get-torch-early.transcript | [ ] | Early torch acquisition |
| wt-02-bank-puzzle.transcript | [ ] | Bank walkthrough |
| wt-03-maze-cyclops-goal.transcript | [ ] | Maze to cyclops |
| wt-04-dam-reservoir.transcript | [ ] | Dam/reservoir |
| wt-05-egyptian-room.transcript | [ ] | Egyptian room |
| full-walkthrough.transcript | [ ] | Complete game walkthrough |

### System/Meta
| Test | Status | Notes |
|------|--------|-------|
| smart-directives-basic.transcript | [ ] | Transcript directives |
| undo-basic.transcript | [ ] | Undo functionality |
| weight-capacity.transcript | [ ] | Inventory weight |

## Recent Work

### Frigid River (2026-01-11)
- Implemented 5 river rooms (FR1-FR5)
- Added shore/beach landing rooms
- Launch action for boat
- Boat puncture mechanic with stick
- Wave sceptre for rainbow

## Regression Log

| Date | Test | Issue | Resolution |
|------|------|-------|------------|
| 2026-01-11 | river-navigation | 1. Uses old boat mechanics (compass nav from Dam Base) 2. Entity resolution bug: "wave sceptre" finds "sharp stick" | OUTDATED - test needs rewrite with LAUNCH/DISEMBARK |
| 2026-01-11 | wave-rainbow | Test uses WEST direction but rainbow exit is EAST (code is correct, test is wrong) | TEST WRONG - update test to use EAST direction |

## Issues Found

### Entity Resolution Bug (river-navigation)
When player types "wave sceptre" while holding both sceptre and sharp stick, the system finds "sharp stick" instead of "sceptre". Output: "You wave the sharp stick, but nothing happens."

### Test Direction Error (wave-rainbow) - FIXED
Geography is: `Aragain Falls → EAST → On the Rainbow → EAST → End of Rainbow`
- Code adds EAST exit from Aragain Falls (correct)
- Test was using WEST (fixed to EAST)
- Test was using "sceptre" but mainframe Zork uses "sharp stick" (fixed)

### Sceptre Removed (FIXED)
volcano.ts had a "sceptre" treasure in the gold coffin worth 4 points. FORTRAN source confirms:
- No sceptre exists in mainframe Zork
- The gold coffin is the treasure itself (not a container)
- The sharp stick is the rainbow item

**Fixed**: Removed sceptre, made coffin a simple ITEM treasure (not container).

### Points Audit Needed
The removed sceptre was worth 4 points. Need to audit FORTRAN source to verify total treasure values match 616 points.

