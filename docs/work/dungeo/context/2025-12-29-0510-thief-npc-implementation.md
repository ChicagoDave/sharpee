# Work Summary: Thief NPC Implementation

**Date**: 2025-12-29
**Feature/Area**: Thief NPC (ADR-070)

## Objective

Implement the Thief NPC for Dungeo with full Mainframe Zork behavior: wandering, stealing from player and rooms, egg-opening, combat with scaling difficulty, and treasure stashing in lair.

## What Was Accomplished

### Files Created

**Thief Module** (`stories/dungeo/src/npcs/thief/`):

| File | Description |
|------|-------------|
| `thief-messages.ts` | 16 message IDs for thief interactions |
| `thief-entity.ts` | Entity creation with traits, stiletto weapon, death handler |
| `thief-helpers.ts` | Treasure detection, state management, global flag storage |
| `thief-behavior.ts` | Full state machine with 7 states |
| `index.ts` | Module exports and `registerThief()` function |

**GDT Commands** (`stories/dungeo/src/actions/gdt/commands/`):

| File | Description |
|------|-------------|
| `nr.ts` | No Robber command (disables thief) |
| `rr.ts` | Restore Robber command (re-enables thief) |

### Files Modified

| File | Changes |
|------|---------|
| `stories/dungeo/src/index.ts` | Added thief registration in `onEngineReady()`, added 16 thief messages to `extendLanguage()` |
| `stories/dungeo/src/actions/gdt/commands/index.ts` | Registered NR/RR handlers |

### Thief Entity Configuration

```typescript
// Traits
- IdentityTrait: "seedy-looking thief" with aliases
- NpcTrait: behaviorId='thief', canMove=true, forbiddenRooms=[surface rooms]
- CombatantTrait: health=25, skill=70, baseDamage=4, canRetaliate=true
- ContainerTrait: holds stolen items

// Weapon
- Stiletto: damage=6, skillBonus=10, type='piercing'

// Death handler
- Awards 25 points
- Drops inventory (including stiletto)
```

### State Machine

| State | Behavior |
|-------|----------|
| WANDERING | 33% chance to move each turn, detect valuables |
| STALKING | Follow player when they have valuables |
| STEALING | 40% steal chance, prioritize by treasure value |
| RETURNING | Head to lair when carrying 3+ items, drop loot |
| FIGHTING | Attack player, counterattack when attacked |
| FLEEING | Run when health <= 30%, head to lair |
| DISABLED | Inactive (via GDT NR command) |

### Key Features

1. **Treasure Detection**: Items with `isTreasure: true` or `treasureValue > 0`
2. **Egg-Opening**: After carrying jeweled egg for 3 turns, opens it and creates clockwork canary
3. **Combat Scaling**: Becomes hostile at player score >= 150 (30% chance per turn)
4. **Lair Behavior**: Returns to Treasure Room to drop stolen items
5. **GDT Integration**: NR (disable) / RR (enable) commands

### Language Messages Added

```
dungeo.thief.appears, dungeo.thief.leaves, dungeo.thief.lurks
dungeo.thief.steals_from_player, dungeo.thief.steals_from_room
dungeo.thief.notices_valuables, dungeo.thief.gloats
dungeo.thief.opens_egg
dungeo.thief.attacks, dungeo.thief.counterattacks
dungeo.thief.dodges, dungeo.thief.wounded
dungeo.thief.flees, dungeo.thief.dies, dungeo.thief.drops_loot
```

## Key Decisions

### 1. NPC Behavior vs Daemon

**Decision**: Use NPC behavior system (ADR-070) rather than daemons

**Rationale**:
- NPCs have built-in turn-phase integration via `NpcService.tick()`
- Behaviors have hooks for player interaction (`onPlayerEnters`, `onAttacked`)
- Actions (move, take, drop, attack) are already defined NpcAction types
- State stored in `NpcTrait.customProperties` for save/load support

### 2. Global State Storage

**Decision**: Use `world.getDataStore().state` for thief disabled flag

**Rationale**:
- WorldModel doesn't have `getGlobalData`/`setGlobalData` methods
- Data store's `state` property is `Record<string, any>` for arbitrary storage
- Key: `dungeo.thief.disabled`

### 3. Room Restrictions

**Decision**: Forbid all surface rooms (white house, house interior, forest)

**Rationale**:
- Matches Mainframe Zork behavior (thief stays underground)
- Surface rooms collected via `Object.values()` on room ID objects
- Passed to `registerThief()` as `forbiddenRooms` array

## Challenges & Solutions

### Challenge: Type Safety with customProperties

`NpcTrait.customProperties` is typed as `Record<string, unknown>` but we need a specific interface.

**Solution**: Cast through `unknown`:
```typescript
customProperties: createThiefCustomProperties(lairRoomId) as unknown as Record<string, unknown>
```

And when reading:
```typescript
return npcTrait.customProperties as unknown as ThiefCustomProperties;
```

### Challenge: ContainerTrait has no isOpen

Initial code tried to set `isOpen: true` on ContainerTrait.

**Solution**: Removed - containers don't need isOpen (that's OpenableTrait). The thief's container is implicitly accessible since `dropsInventory: true` handles item dropping on death.

## Code Quality

- TypeScript: Passes with `tsc --noEmit`
- Build: Compiles successfully
- Follows language layer separation (all messages via IDs)
- Consistent with ADR-070 patterns

## Next Steps

1. **Other NPCs**: Cyclops, Vampire Bat, Spirits
2. **The Maze Region**: ~15 rooms including Treasure Room connections
3. **Transcript Tests**: Automated tests for thief behavior

## References

- **Plan File**: `/home/dave/.claude/plans/bright-coalescing-newell.md`
- **ADR-070**: NPC System Architecture
- **Implementation Plan**: `docs/work/dungeo/implementation-plan.md`
- **Troll Reference**: `stories/dungeo/src/regions/underground/objects/index.ts`
