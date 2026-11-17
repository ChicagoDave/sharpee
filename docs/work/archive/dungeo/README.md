# Project Dungeo: Mainframe Zork Implementation

## Overview

Dungeo is the dog-fooding project for Sharpee: a complete implementation of Mainframe Zork (MDL "Dungeon") - the original 1977-1979 MIT text adventure that later became Zork I, II, and III.

This project will stress-test Sharpee's engine, stdlib, and authoring patterns by implementing a substantial, well-known work of interactive fiction.

## Source Material

- **MDL Source**: The original MDL (Muddle) source code is publicly available
- **Documentation**: Extensive maps, object lists, and puzzle documentation exist
- **Reference Implementations**: Multiple ports (Fortran, C, Inform) can be consulted

## Scope

Full implementation including:
- ~191 rooms across surface and underground areas
- ~100+ objects (treasures, tools, containers, etc.)
- NPCs: Thief, Troll, Cyclops, Spirits, etc.
- All puzzles and their solutions
- Complete scoring system (616 points maximum in original)
- Combat system
- Light/darkness mechanics
- Vehicle (boat) mechanics

## Goals

### Primary Goals
1. **Validate Sharpee's architecture** - Can it handle a real, complex IF game?
2. **Identify stdlib gaps** - What actions, traits, behaviors are missing?
3. **Stress-test authoring patterns** - Is the author experience workable?
4. **Create reference implementation** - A showcase for what Sharpee can do

### Secondary Goals
1. Document patterns for common IF problems
2. Identify performance issues at scale
3. Create reusable components (combat system, NPC AI, etc.)
4. Inform deployment design decisions

## Non-Goals

- Perfect fidelity to MDL parser quirks
- Bug-for-bug compatibility with original
- Supporting original save file formats

## Success Criteria

1. Complete playthrough possible from start to endgame
2. All 616 points achievable
3. Core puzzles solvable as in original
4. Thief behavior reasonably faithful
5. No major Sharpee architectural changes required mid-project
