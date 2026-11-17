# GDT Implementation Plan

**Target**: Project Dungeo
**Reference**: Original 1981 Mainframe Zork (Fortran/C port by Bob Supnik)
**Status**: Planning

## Background

GDT (Game Debugging Tool) was Bob Supnik's debug interface for the Fortran port of mainframe Zork. It provided comprehensive access to the game's internal state. From Supnik's recollections:

> *"Once the game was released, players quickly realized that [GDT] offered a simple way to short circuit the game and to undo mistakes. Lost something to the thief? Take it back. Getting killed too often? Turn on immortality mode."*

This plan implements GDT for Project Dungeo, mimicking the original 1981 interface while adapting to Sharpee's architecture.

## Original GDT Commands (38 total)

### Display Commands (15)
| Cmd | Name | Original Purpose | Sharpee Equivalent |
|-----|------|------------------|-------------------|
| `DR` | Display Rooms | Show room properties | List room entities with traits |
| `DO` | Display Objects | Show object properties | List object entities with traits |
| `DA` | Display ADVS | Show adventurer state | Show player inventory, location, score |
| `DC` | Display CEVENT | Show clock events | List active daemons/fuses (ADR-071) |
| `DX` | Display Exits | Show room exits | List room connections |
| `DH` | Display Hacks | Show debug vars | Show thief activity, sword glow, etc. |
| `DL` | Display Lengths | Show array sizes | Show entity counts by type |
| `DV` | Display Villains | Show villain state | Show NPC state (ADR-070) |
| `DF` | Display Flags | Show game flags | Show world state flags |
| `DS` | Display State | Show overall state | Show turn count, score, game phase |
| `DN` | Display Switches | Show switch values | Show boolean world state |
| `DM` | Display Messages | Show message indices | List message IDs |
| `DT` | Display Text | Print text by index | Print message by ID |
| `DP` | Display Parser | Show parser state | Show last parse result |
| `D2` | Display ROOM2 | Secondary room data | Show room metadata |
| `DZ` | Display Puzzle | Puzzle room grid | Show Royal Puzzle state |

### Alter Commands (9)
| Cmd | Name | Original Purpose | Sharpee Equivalent |
|-----|------|------------------|-------------------|
| `AH` | Alter HERE | Teleport player | Move player to room by ID |
| `AO` | Alter Objects | Move objects | Set entity location |
| `AR` | Alter Rooms | Modify room props | Set room traits |
| `AF` | Alter Flags | Modify game flags | Set world state |
| `AC` | Alter CEVENT | Modify timers | Adjust daemon/fuse timing |
| `AA` | Alter ADVS | Modify player | Set score, inventory, etc. |
| `AX` | Alter Exits | Modify connections | Add/remove room exits |
| `AV` | Alter Villains | Modify NPC state | Set NPC properties |
| `AN` | Alter Switches | Modify switches | Set world booleans |
| `AZ` | Alter Puzzle | Modify puzzle | Set Royal Puzzle state |

### Villain Toggle Commands (8)
| Cmd | Name | Original Purpose |
|-----|------|------------------|
| `NC` | No Cyclops | Disable cyclops |
| `ND` | No Deaths | Enable immortality |
| `NR` | No Robber | Disable thief |
| `NT` | No Troll | Disable troll |
| `RC` | Restore Cyclops | Re-enable cyclops |
| `RD` | Restore Deaths | Disable immortality |
| `RR` | Restore Robber | Re-enable thief |
| `RT` | Restore Troll | Re-enable troll |

### Utility Commands (4)
| Cmd | Name | Original Purpose |
|-----|------|------------------|
| `TK` | Take | Acquire any object |
| `PD` | Program Detail | Toggle verbose debug |
| `HE` | Help | List GDT commands |
| `EX` | Exit | Return to game |

## Implementation Phases

### Phase 1: Core Infrastructure
**Goal**: Establish GDT mode and basic command dispatch

#### 1.1 GDT Entry Action
Create `gdt` action that enters debug mode:

```
>GDT
A BOOMING VOICE CALLS OUT, "WHO SUMMONS THE GAME DEBUGGING TOOL?"

GDT>
```

**Files to create**:
- `stories/dungeo/src/actions/gdt/index.ts` - Main GDT action
- `stories/dungeo/src/actions/gdt/gdt-events.ts` - GDT event types
- `stories/dungeo/src/actions/gdt/gdt-mode.ts` - GDT mode handler

**Technical approach**:
- GDT is a **story-specific action** (not stdlib)
- Entering GDT sets a world state flag: `gdtMode: true`
- While in GDT mode, parser routes to GDT command handler
- GDT prompt changes from `>` to `GDT>`

#### 1.2 GDT Command Parser
Create sub-parser for GDT two-letter commands:

```typescript
interface GDTCommand {
  code: string;      // "AH", "DO", etc.
  args: string[];    // Additional arguments
}

function parseGDTCommand(input: string): GDTCommand | null {
  const match = input.match(/^([A-Z]{2})\s*(.*)/i);
  if (!match) return null;
  return {
    code: match[1].toUpperCase(),
    args: match[2].split(/\s+/).filter(Boolean)
  };
}
```

#### 1.3 Command Registry
```typescript
const gdtCommands: Map<string, GDTCommandHandler> = new Map([
  ['HE', helpHandler],
  ['EX', exitHandler],
  // ... more commands
]);
```

### Phase 2: Display Commands (Priority: High)
**Goal**: Enable inspection of game state

#### 2.1 Essential Display Commands

**`DA` - Display Adventurer** (Priority: Critical)
```
GDT> DA
ADVENTURER 1:
  Location: West of House (west-of-house)
  Score: 25 / 350
  Moves: 42
  Inventory: brass lantern, elvish sword, leaflet
  Light: yes (lantern lit)
  Deaths: 0
```

**`DR` - Display Room** (Priority: Critical)
```
GDT> DR living-room
ROOM: Living Room (living-room)
  Region: house
  Light: inherent
  Visited: yes
  Exits: west→kitchen, east→gallery, down→cellar
  Contains: trophy-case, sword, rug
  Traits: RoomTrait, LightSourceTrait (ambient)
```

**`DO` - Display Object** (Priority: Critical)
```
GDT> DO brass-lantern
OBJECT: brass lantern (brass-lantern)
  Location: player-inventory
  Portable: yes
  Traits: LightSourceTrait, SwitchableTrait
  Light source: lit=true, fuel=200
  Size: 10, Weight: 15
```

**`DX` - Display Exits** (Priority: High)
```
GDT> DX living-room
EXITS from Living Room:
  north: kitchen
  east: gallery (door: wooden-door, open)
  west: strange-passage (blocked: carpet)
  down: cellar (via: trap-door, locked)
```

**`DC` - Display Clock Events** (Priority: Medium)
```
GDT> DC
ACTIVE DAEMONS/FUSES:
  1. lantern-fuel: daemon, ticks every turn, current=200
  2. thief-wander: daemon, ticks every 3 turns
  3. forest-rustle: fuse, fires in 5 turns
```

**`DS` - Display State** (Priority: High)
```
GDT> DS
GAME STATE:
  Turn: 42
  Score: 25 / 350 (7%)
  Phase: MID_GAME
  Treasures placed: 2 / 19
  Deaths: 0
  GDT Flags: immortal=false, verbose=true
```

#### 2.2 Implementation Pattern

Each display command follows this pattern:

```typescript
// gdt/commands/display-adventurer.ts
import { GDTCommandHandler, GDTContext } from '../types';

export const displayAdventurerHandler: GDTCommandHandler = {
  code: 'DA',
  name: 'Display Adventurer',
  description: 'Show player state including location, score, inventory',

  execute(context: GDTContext, args: string[]): string[] {
    const player = context.world.getPlayer();
    const room = context.world.getEntity(player.location);
    const inventory = context.world.getInventory(player.id);

    return [
      'ADVENTURER 1:',
      `  Location: ${room.name} (${room.id})`,
      `  Score: ${player.score} / ${context.world.maxScore}`,
      `  Moves: ${context.world.turnCount}`,
      `  Inventory: ${inventory.map(e => e.name).join(', ') || '(empty)'}`,
      `  Deaths: ${player.deaths || 0}`
    ];
  }
};
```

### Phase 3: Alter Commands (Priority: High)
**Goal**: Enable modification of game state for testing

#### 3.1 Essential Alter Commands

**`AH` - Alter HERE (Teleport)** (Priority: Critical)
```
GDT> AH
Old location: West of House (west-of-house)
New location? living-room
Teleported to: Living Room
```

Alternative syntax:
```
GDT> AH living-room
Teleported to: Living Room
```

**`AO` - Alter Object** (Priority: Critical)
```
GDT> AO jeweled-egg
Object: jeweled egg (jeweled-egg)
Current location: birds-nest
Actions: [M]ove, [O]pen, [L]ock, [D]estroy? M
New location? player
Moved jeweled egg to player inventory.
```

Quick syntax:
```
GDT> AO jeweled-egg player
Moved jeweled egg to player inventory.
```

**`TK` - Take** (Priority: Critical)
Simplified object acquisition:
```
GDT> TK sceptre
Taken: sceptre
```

This bypasses all checks (reachability, portability, container locks).

#### 3.2 State Modification Commands

**`AF` - Alter Flags** (Priority: High)
```
GDT> AF
Flag name? dam-opened
Current value: false
New value? true
Set dam-opened = true
```

**`ND` - No Deaths (Immortality)** (Priority: High)
```
GDT> ND
Immortality mode: ON
You can no longer die.
```

**`NT/NR/NC` - Disable NPCs** (Priority: Medium)
```
GDT> NT
Troll disabled. It will not attack or block.

GDT> RT
Troll restored to initial state.
```

### Phase 4: Villain/NPC Commands (Priority: Medium)
**Depends on**: ADR-070 NPC System

Commands `DV`, `AV`, `NC/RC`, `NT/RT`, `NR/RR` require the NPC system.

Placeholder implementation:
```
GDT> DV
NPC system not yet implemented (see ADR-070).
```

### Phase 5: Advanced Commands (Priority: Low)

**`DZ/AZ` - Puzzle State** (Royal Puzzle specific)
**`DP` - Parser Debug**
**`DM/DT` - Message System**
**`PD` - Verbose Mode**

## Technical Architecture

### File Structure

```
stories/dungeo/src/
├── actions/
│   └── gdt/
│       ├── index.ts              # Main GDT action (enters mode)
│       ├── gdt-mode.ts           # GDT mode controller
│       ├── gdt-parser.ts         # Two-letter command parser
│       ├── gdt-events.ts         # Event types
│       ├── types.ts              # GDT interfaces
│       └── commands/
│           ├── index.ts          # Command registry
│           ├── display-adventurer.ts  # DA
│           ├── display-room.ts        # DR
│           ├── display-object.ts      # DO
│           ├── display-exits.ts       # DX
│           ├── display-state.ts       # DS
│           ├── display-clock.ts       # DC
│           ├── alter-here.ts          # AH
│           ├── alter-object.ts        # AO
│           ├── alter-flags.ts         # AF
│           ├── take-object.ts         # TK
│           ├── toggle-immortal.ts     # ND/RD
│           ├── toggle-npcs.ts         # NT/RT, NR/RR, NC/RC
│           ├── help.ts                # HE
│           └── exit.ts                # EX
└── lang/
    └── gdt-messages.ts           # GDT output text
```

### GDT Context Interface

```typescript
interface GDTContext {
  world: IWorld;
  player: IEntity;

  // GDT state
  gdtFlags: {
    immortal: boolean;
    verbose: boolean;
    trollDisabled: boolean;
    thiefDisabled: boolean;
    cyclopsDisabled: boolean;
  };

  // Helpers
  findEntity(idOrName: string): IEntity | undefined;
  findRoom(idOrName: string): IEntity | undefined;
  listRooms(): IEntity[];
  listObjects(): IEntity[];
  teleportPlayer(roomId: string): void;
  moveObject(objectId: string, locationId: string): void;
  setFlag(name: string, value: unknown): void;
  getFlag(name: string): unknown;
}
```

### Parser Integration

GDT mode intercepts normal command parsing:

```typescript
// In story's command handler or parser hook
function handleInput(input: string, world: IWorld): ParseResult {
  if (world.getFlag('gdtMode')) {
    return handleGDTInput(input, world);
  }
  return normalParse(input);
}

function handleGDTInput(input: string, world: IWorld): ParseResult {
  const gdtCommand = parseGDTCommand(input);
  if (!gdtCommand) {
    return { error: 'Unknown GDT command. Type HE for help.' };
  }

  const handler = gdtCommands.get(gdtCommand.code);
  if (!handler) {
    return { error: `Unknown command: ${gdtCommand.code}` };
  }

  return handler.execute(createGDTContext(world), gdtCommand.args);
}
```

## Original Behavior Preservation

### 1. Entry Challenge (Optional Fidelity)

Original Zork had an authentication challenge:

```
>GDT
A BOOMING VOICE CALLS OUT, "WHO SUMMONS THE GAME DEBUGGING TOOL?
TO PROVE YOUR WORTHINESS, ANSWER THE FOLLOWING CHALLENGE."

What is 23 + 17?
>40
Correct. You may proceed.

GDT>
```

**Recommendation**: Implement as optional Easter egg. Default to direct access.

### 2. Numeric vs Named References

Original used numeric IDs:
```
GDT> AH
Old=2 New=100
```

Sharpee uses string IDs:
```
GDT> AH
Old: west-of-house
New? living-room
```

**Recommendation**: Support both. Accept numbers as indices into sorted entity list.

### 3. Prompt Style

Original:
```
GDT>
```

Preserve exactly. No space after `>`.

## Testing Strategy

### Transcript Tests

Create `stories/dungeo/tests/transcripts/gdt-basic.transcript`:

```
# GDT Basic Functionality Test

> gdt
/A BOOMING VOICE/
GDT>

> he
/Display/
/Alter/
/HE.*Help/

> da
/ADVENTURER/
/Location: West of House/
/Score: 0/

> dr living-room
/ROOM: Living Room/
/Exits:/

> ah living-room
/Teleported/

> da
/Location: Living Room/

> ex
/Returning to game/

> look
/Living Room/
```

### Unit Tests

```typescript
describe('GDT Commands', () => {
  describe('DA - Display Adventurer', () => {
    it('should show player location');
    it('should show current score');
    it('should list inventory items');
  });

  describe('AH - Alter Here', () => {
    it('should teleport player to valid room');
    it('should reject invalid room ID');
    it('should update player location in world state');
  });

  describe('ND - No Deaths', () => {
    it('should set immortal flag');
    it('should prevent player death when enabled');
  });
});
```

## Implementation Order

### Sprint 1: Foundation
1. [ ] GDT entry action (`gdt` command)
2. [ ] GDT mode flag and prompt
3. [ ] Two-letter command parser
4. [ ] Command registry
5. [ ] `HE` - Help command
6. [ ] `EX` - Exit command

### Sprint 2: Display Commands
7. [ ] `DA` - Display Adventurer
8. [ ] `DR` - Display Room
9. [ ] `DO` - Display Object
10. [ ] `DX` - Display Exits
11. [ ] `DS` - Display State

### Sprint 3: Essential Alter Commands
12. [ ] `AH` - Alter Here (teleport)
13. [ ] `TK` - Take object
14. [ ] `AO` - Alter Object location
15. [ ] `AF` - Alter Flags

### Sprint 4: Toggles
16. [ ] `ND/RD` - Immortality toggle
17. [ ] `NT/RT` - Troll toggle (placeholder)
18. [ ] `NR/RR` - Thief toggle (placeholder)
19. [ ] `NC/RC` - Cyclops toggle (placeholder)

### Sprint 5: Advanced (Post-NPC)
20. [ ] `DC` - Display Clock Events
21. [ ] `DV` - Display Villains
22. [ ] `AV` - Alter Villains
23. [ ] `DZ/AZ` - Puzzle state

## Dependencies

| Feature | Depends On | Status |
|---------|-----------|--------|
| Core GDT | None | Ready |
| Display commands | None | Ready |
| Alter HERE | None | Ready |
| Object manipulation | None | Ready |
| NPC toggles | ADR-070 NPC System | Not started |
| Clock events | ADR-071 Daemons/Fuses | Not started |
| Puzzle state | Royal Puzzle impl | Not started |

## Success Criteria

1. **Functional**: All Phase 1-3 commands working
2. **Faithful**: Interface matches original 1981 style
3. **Useful**: Actually helps debug Dungeo development
4. **Tested**: Transcript tests for core functionality
5. **Documented**: Command reference in README

## References

- Original GDT source: [github.com/devshane/zork/gdt.c](https://github.com/devshane/zork)
- Command reference: `docs/work/dungeo/gdt-command.md`
- ADR-070: NPC System Architecture
- ADR-071: Daemons and Fuses

---

*Plan created: 2025-12-29*
