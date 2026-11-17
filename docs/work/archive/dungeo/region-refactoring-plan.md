# Region Folder Refactoring Plan

## Overview

Refactor 4 regions from single-file format to the dam-style folder pattern with co-located documentation.

## Target Pattern (from dam/)

```
regions/{region}/
├── README.md           # Region overview + Mermaid connection diagram
├── index.ts            # Exports, room creation, connections
├── objects/
│   └── index.ts        # Region objects (move from objects/ folder)
└── rooms/
    ├── room-name.ts    # Individual room creator
    └── room-name.md    # Optional documentation for complex rooms
```

## Regions to Refactor

| Region | Rooms | Complexity | Objects File |
|--------|-------|------------|--------------|
| white-house | 4 | Simple | white-house-objects.ts |
| house-interior | 3 | Medium (trapdoor puzzle) | house-interior-objects.ts |
| forest | 6 | Medium (tree climbing) | forest-objects.ts |
| underground | 5 | Complex (troll combat, round room) | underground-objects.ts |

## Implementation Order

1. **white-house** - Simplest, 4 rooms, no puzzles
2. **house-interior** - 3 rooms, has trapdoor puzzle to document
3. **forest** - 6 rooms, tree climbing
4. **underground** - 5 rooms, troll combat, round room puzzle

## Steps Per Region

1. Create folder structure: `regions/{name}/`, `rooms/`, `objects/`
2. Create `README.md` with Mermaid connection diagram
3. Split rooms into individual `rooms/{room-name}.ts` files
4. Move objects from `objects/{region}-objects.ts` to `{region}/objects/index.ts`
5. Create `index.ts` that imports rooms and exports functions
6. Update `stories/dungeo/src/index.ts` imports
7. Delete old single-file region
8. Run transcript tests to verify

## Files Summary

**To Create**: ~28 files (7 per region)
**To Delete**: 8 files (4 region files + 4 object files)

## Example: white-house

### New Structure
```
regions/white-house/
├── README.md
├── index.ts
├── objects/
│   └── index.ts
└── rooms/
    ├── west-of-house.ts
    ├── north-of-house.ts
    ├── south-of-house.ts
    └── behind-house.ts
```

### README.md Content
- Region overview
- Mermaid connection diagram showing room connections
- Room table with links
- Object table
- Implementation status checklist

## Status

- [ ] white-house
- [ ] house-interior
- [ ] forest
- [ ] underground
