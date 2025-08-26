# Showing Action Design

## Overview
The showing action allows players to show items to NPCs without transferring ownership, useful for puzzles with NPC reactions. This action exhibits complete logic duplication between validate and execute phases.

## Required Messages
- `no_item` - No item specified
- `no_viewer` - No viewer specified
- `not_carrying` - Not carrying item
- `viewer_not_visible` - Viewer not visible
- `viewer_too_far` - Viewer too far away
- `not_actor` - Viewer is not an actor
- `self` - Cannot show to self
- `shown` - Generic shown message
- `viewer_examines` - Viewer examines item
- `viewer_nods` - Viewer nods
- `viewer_impressed` - Viewer is impressed
- `viewer_unimpressed` - Viewer is unimpressed
- `viewer_recognizes` - Viewer recognizes item
- `wearing_shown` - Showing worn item

## Validation Logic

### 1. Basic Validation
- Item must exist (`no_item`)
- Viewer must exist (`no_viewer`)

### 2. Location Check
- Viewer and actor must be in same location (`viewer_too_far`)

### 3. Actor Validation
- Viewer must have ACTOR trait (`not_actor`)
- Cannot show to self (`self`)

### 4. Reaction Determination
Complex reaction system based on viewer's reactions property:
- `recognizes` list → `viewer_recognizes`
- `impressed` list → `viewer_impressed`
- `unimpressed` list → `viewer_unimpressed`
- `examines` list → `viewer_examines`
- Default → `viewer_nods`

### 5. Special Cases
- If wearing item → `wearing_shown`

## Execution Flow

### CRITICAL ISSUE: Complete Logic Duplication
**Entire validation logic repeated:**
- Re-validates all conditions
- Rebuilds event data
- Recalculates reactions
- Repeats message selection

## Data Structures

### ShownEventData
```typescript
interface ShownEventData {
  item: EntityId;
  itemName: string;
  viewer: EntityId;
  viewerName: string;
  isWorn: boolean;
  itemProperName?: string;
  recognized?: boolean;
  impressed?: boolean;
}
```

## Current Implementation Issues

### Critical Problems
1. **Complete duplication**: 100% logic repeated
2. **No state preservation**: Everything recalculated
3. **No three-phase pattern**: Missing report phase

### Design Issues
1. **Hardcoded reactions**: String matching on item names
2. **Limited reaction types**: Only 5 reaction categories
3. **No memory**: NPCs don't remember what was shown

## Recommended Improvements
1. **Implement three-phase pattern**
2. **Add reaction memory**
3. **Support custom reactions**
4. **Add emotional responses**
5. **Track showing history**