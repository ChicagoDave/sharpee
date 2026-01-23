# ADR-110: Debug & Testing Tools Extension

Date: 2026-01-22

## Status

Proposed

## Context

The GDT (Game Debugging Tool) system was originally implemented as a Dungeo-specific feature, mimicking the 1981 Mainframe Zork debug interface. However, debugging and testing are inseparable concerns:

- **Debug tools** set up test scenarios (teleport, spawn items, disable enemies)
- **Transcript tests** verify specific features in isolation
- **Walkthrough tests** verify full game completion paths
- **Assertions** validate world state during tests

Currently these capabilities are scattered:
- GDT lives in Dungeo only
- Transcript tester is a separate package
- Smart directives (ADR-092) are proposed but not integrated
- No unified way for authors to enable/disable testing features

This ADR proposes a unified **Debug & Testing Tools Extension** that provides:
1. Interactive debug commands (GDT-style)
2. Test setup commands for transcripts
3. State assertions and verification
4. Smart directives for walkthrough tests (GOAL, WHILE, NAVIGATE, etc.)
5. Test-mode behaviors (deterministic randomness, time control)

## Decision

Create a platform-level extension (`@sharpee/ext-testing`) that provides all debugging and testing infrastructure.

### Extension API

```typescript
import { TestingExtension } from '@sharpee/ext-testing';

export function createStory(): Story {
  return {
    extensions: [
      new TestingExtension({
        // Interactive debug mode
        debugMode: {
          enabled: process.env.NODE_ENV !== 'production',
          prefix: 'gdt',
          password: null,
        },
        // Testing features
        testMode: {
          enabled: true,
          deterministicRandom: true,
          assertions: true,
          walkthroughDirectives: true,
        }
      })
    ]
  };
}
```

---

## Two Test Artifact Types

The extension supports two types of test files that serve different purposes and have different execution models:

### Transcript Tests (`.transcript`)

**Purpose**: Test specific features, puzzles, or behaviors in isolation.

**Characteristics**:
- Each test is independent
- Can run in parallel
- Can run in any order
- Fast feedback on specific functionality
- Analogous to unit/integration tests

**Location**: `stories/{story}/tests/transcripts/*.transcript`

```transcript
title: Mailbox Container Test
story: dungeo

---

> $teleport West of House
[OK]

> open mailbox
[OK: contains "Opening"]

> $assert room contains "leaflet"
[OK]

> take leaflet
[OK: contains "Taken"]

> $assert inventory contains "leaflet"
[OK]
```

### Walkthrough Tests (`.walkthrough`)

**Purpose**: Verify full game completion paths from start to finish.

**Characteristics**:
- Tests run sequentially (game state carries forward)
- Order matters - later goals depend on earlier ones
- Uses smart directives (GOAL, WHILE, NAVIGATE, etc.)
- Handles randomness via loops and conditions
- Analogous to end-to-end tests

**Location**: `stories/{story}/tests/walkthroughs/*.walkthrough`

```walkthrough
title: Full Game Completion
story: dungeo

---

[GOAL: Get the brass lantern]
[ENSURES: inventory contains "brass lantern"]

> $teleport West of House
> open window
> enter
> take lantern

[END GOAL]

[GOAL: Kill the troll]
[REQUIRES: inventory contains "sword"]
[ENSURES: not room contains "troll"]

[NAVIGATE TO: "Troll Room"]

[WHILE: room contains "troll"]
> kill troll with sword
[SKIP]
[END WHILE]

[END GOAL]

[GOAL: Get the torch]
[REQUIRES: not room contains "troll"]
[ENSURES: inventory contains "torch"]

[NAVIGATE TO: "Torch Room"]
> take torch

[END GOAL]
```

### Comparison

| Aspect | Transcript Tests | Walkthrough Tests |
|--------|------------------|-------------------|
| File extension | `.transcript` | `.walkthrough` |
| Execution | Independent, parallel | Sequential, ordered |
| State | Fresh each test | Carries forward |
| Purpose | Feature verification | Completion verification |
| Directives | Basic (`$` commands) | Full (GOAL, WHILE, NAVIGATE) |
| Speed | Fast | Slow (full playthrough) |
| Debugging | Easy (isolated) | Harder (depends on prior state) |

---

## Three Modes of Operation

### 1. Interactive Debug Mode (GDT)

Entered by typing `gdt`. Provides a command shell for manual exploration:

```
> gdt
GDT ready. Type HE for help, EX to exit.

GDT> ah Troll Room
Teleported to Troll Room.

GDT> tk sword
Taken: sword

GDT> nd
Immortality enabled.

GDT> ex
Exiting GDT.
```

### 2. Transcript Test Mode

For `.transcript` files. Commands can be used inline:

```transcript
> $teleport Troll Room
[OK]

> $take sword
[OK]

> kill troll with sword
[OK: contains "nasty blow"]
```

### 3. Walkthrough Test Mode

For `.walkthrough` files. Full directive support:

```walkthrough
[GOAL: Clear the troll]
[REQUIRES: inventory contains "sword"]
[ENSURES: not room contains "troll"]

[NAVIGATE TO: "Troll Room"]

[WHILE: room contains "troll"]
> kill troll with sword
[END WHILE]

[END GOAL]
```

---

## Core Commands

### Setup Commands (Scenario Building)

| Command | GDT Code | Test Syntax | Description |
|---------|----------|-------------|-------------|
| Teleport | AH | `$teleport <room>` | Move player to any room |
| Take | TK | `$take <item>` | Add item to inventory (bypasses rules) |
| Move Object | AO | `$move <item> to <location>` | Move any object anywhere |
| Spawn | -- | `$spawn <entity-id>` | Create entity at current location |
| Remove | -- | `$remove <entity>` | Remove entity from world |
| Set Flag | AF | `$set <flag> = <value>` | Set world state flag |
| Set Trait | -- | `$trait <entity>.<trait>.<prop> = <value>` | Modify trait property |

### Inspection Commands (State Queries)

| Command | GDT Code | Test Syntax | Description |
|---------|----------|-------------|-------------|
| Display Adventurer | DA | `$player` | Show player state |
| Display Room | DR | `$room [name]` | Show room details |
| Display Object | DO | `$object <name>` | Show object state |
| Display Entity | DE | `$entity <id>` | Full entity dump |
| Display State | DS | `$state [prefix]` | Show world flags |
| Display Exits | DX | `$exits [room]` | Show connections |
| Display Clock | DC | `$clock` | Show scheduled events |
| Find | -- | `$find <entity>` | Locate entity in world |

### Control Commands (Test Behavior)

| Command | GDT Code | Test Syntax | Description |
|---------|----------|-------------|-------------|
| Immortal | ND/RD | `$immortal on/off` | Toggle player death |
| Disable NPC | NR/NT | `$disable <npc>` | Prevent NPC actions |
| Enable NPC | RR/RT | `$enable <npc>` | Re-enable NPC |
| Kill | KL | `$kill <entity>` | Remove/kill entity |
| Time | -- | `$time +N` | Advance N turns |
| Seed | -- | `$seed <number>` | Set random seed |

### Assertion Commands (Both Test Types)

| Test Syntax | Description |
|-------------|-------------|
| `$assert location = "Room Name"` | Player is in specified room |
| `$assert inventory contains "item"` | Player has item |
| `$assert room contains "entity"` | Entity in current room |
| `$assert "entity" in "Room"` | Entity in specified room |
| `$assert flag "name" = value` | World flag has value |
| `$assert score = N` | Score equals N |
| `$assert score >= N` | Score at least N |
| `$assert not <condition>` | Negation |

### Save/Restore Commands (Checkpoint System)

Walkthroughs can be split into independent segments using save/restore:

| Command | GDT Code | Test Syntax | Description |
|---------|----------|-------------|-------------|
| Save | -- | `$save <name>` | Save game state to named checkpoint |
| Restore | -- | `$restore <name>` | Restore game state from checkpoint |
| List Saves | -- | `$saves` | List available checkpoints |
| Delete Save | -- | `$delete-save <name>` | Remove a checkpoint |

**Save File Location**: `stories/{story}/saves/{name}.json`

**Use Cases**:
1. **Segment Independence**: Each walkthrough segment can restore from prior checkpoint
2. **Faster Iteration**: Re-run single segment without replaying everything before it
3. **CI/CD**: Pre-build checkpoints, run segments in parallel
4. **Debugging**: Save before tricky section, restore to retry

**Example - Segmented Walkthroughs**:

```transcript
# wt-01-get-torch.transcript
title: Get Torch Early
story: dungeo
---
> look
[OK: contains "West of House"]

# ... gameplay to get torch ...

> $save wt01
[OK: contains "Saved"]
```

```transcript
# wt-02-bank-puzzle.transcript
title: Bank Puzzle
story: dungeo
requires: wt01
---
> $restore wt01
[OK: contains "Restored"]

# ... bank puzzle gameplay ...

> $save wt02
[OK: contains "Saved"]
```

**Implementation Requirements**:
1. WorldModel must support full state serialization (entities, traits, relationships, flags)
2. Save files use JSON format with version marker for compatibility
3. Scheduler state (fuses, daemons) must be included in saves
4. NPC state (position, alive/dead, behavior state) must be serialized

### Walkthrough Directives (`.walkthrough` only)

| Directive | Description |
|-----------|-------------|
| `[GOAL: name]` | Start named goal segment |
| `[END GOAL]` | End goal segment |
| `[REQUIRES: condition]` | Precondition that must be true |
| `[ENSURES: condition]` | Postcondition verified after goal |
| `[WHILE: condition]` | Loop until condition is false |
| `[END WHILE]` | End while loop |
| `[IF: condition]` | Conditional execution |
| `[END IF]` | End conditional |
| `[NAVIGATE TO: "Room"]` | Auto-pathfind to room |

---

## Test Runner CLI

```bash
# Run all transcript tests (parallel)
sharpee test stories/dungeo/tests/transcripts/

# Run specific transcript test
sharpee test stories/dungeo/tests/transcripts/mailbox.transcript

# Run walkthrough test (sequential)
sharpee test stories/dungeo/tests/walkthroughs/full-game.walkthrough

# Run all tests (transcripts first, then walkthroughs)
sharpee test stories/dungeo/tests/ --all

# Verbose output
sharpee test --verbose stories/dungeo/tests/transcripts/

# Stop on first failure
sharpee test --stop-on-failure stories/dungeo/tests/
```

### Test Organization

```
stories/dungeo/
├── src/
├── tests/
│   ├── transcripts/           # Feature tests (independent)
│   │   ├── mailbox.transcript
│   │   ├── troll-combat.transcript
│   │   ├── light-sources.transcript
│   │   └── container-behavior.transcript
│   │
│   └── walkthroughs/          # Completion tests (sequential)
│       ├── main-game.walkthrough
│       ├── endgame.walkthrough
│       └── speedrun.walkthrough
│
└── package.json
```

---

## Package Structure

```
packages/ext-testing/
├── src/
│   ├── index.ts                  # Extension entry point
│   ├── extension.ts              # TestingExtension class
│   ├── types.ts                  # Shared types
│   │
│   ├── debug/                    # Interactive debug mode (GDT)
│   │   ├── context.ts            # Debug context helpers
│   │   ├── parser.ts             # Two-letter command parsing
│   │   ├── grammar.ts            # Grammar registration
│   │   └── commands/
│   │       ├── index.ts
│   │       ├── help.ts
│   │       ├── exit.ts
│   │       ├── display-*.ts
│   │       ├── alter-*.ts
│   │       └── toggle-*.ts
│   │
│   ├── test/                     # Test mode features
│   │   ├── command-parser.ts     # $command parsing
│   │   ├── assertions.ts         # Assertion evaluation
│   │   ├── conditions.ts         # Condition DSL parser
│   │   ├── random-control.ts     # Deterministic randomness
│   │   └── checkpoints/          # Save/restore system
│   │       ├── serializer.ts     # WorldModel state serialization
│   │       ├── checkpoint-store.ts # File-based save storage
│   │       └── commands.ts       # $save, $restore commands
│   │
│   ├── walkthrough/              # Walkthrough-specific features
│   │   ├── directive-parser.ts   # GOAL, WHILE, etc. parsing
│   │   ├── navigator.ts          # NAVIGATE TO pathfinding
│   │   ├── goal-tracker.ts       # Goal state management
│   │   └── loop-executor.ts      # WHILE loop execution
│   │
│   ├── runner/                   # Test execution
│   │   ├── transcript-runner.ts  # Run .transcript files
│   │   ├── walkthrough-runner.ts # Run .walkthrough files
│   │   └── cli.ts                # Command-line interface
│   │
│   └── actions/
│       ├── debug-enter.ts        # Enter GDT mode
│       ├── debug-command.ts      # GDT command execution
│       └── test-command.ts       # $command execution
│
├── tests/
│   ├── debug-commands.test.ts
│   ├── assertions.test.ts
│   ├── walkthrough-directives.test.ts
│   └── transcripts/
│       └── self-test.transcript
│
└── package.json
```

---

## Configuration Options

```typescript
interface TestingExtensionConfig {
  debugMode?: {
    /** Enable interactive debug mode. Default: true in dev */
    enabled?: boolean;
    /** Command to enter debug mode. Default: 'gdt' */
    prefix?: string;
    /** Password to enter debug mode. Default: null */
    password?: string | null;
    /** Allow in production. Default: false */
    allowInProduction?: boolean;
    /** Prompt string. Default: 'GDT>' */
    prompt?: string;
  };

  testMode?: {
    /** Enable test commands ($teleport, etc). Default: true */
    enabled?: boolean;
    /** Make Math.random() deterministic. Default: true in tests */
    deterministicRandom?: boolean;
    /** Enable $assert commands. Default: true */
    assertions?: boolean;
    /** Enable walkthrough directives. Default: true */
    walkthroughDirectives?: boolean;
    /** Max WHILE iterations before failure. Default: 100 */
    maxLoopIterations?: number;
    /** Max nested directive depth. Default: 10 */
    maxNestingDepth?: number;
  };

  /** Custom commands to register */
  commands?: DebugCommand[];
}
```

---

## Story-Specific Extensions

Stories can register custom debug/test commands:

```typescript
import { TestingExtension, DebugCommand } from '@sharpee/ext-testing';

// Dungeo-specific puzzle inspector
const puzzleDebug: DebugCommand = {
  code: 'PZ',           // GDT code
  testSyntax: 'puzzle', // $puzzle in transcripts
  name: 'Puzzle State',
  description: 'Display puzzle completion status',
  execute(context, args) {
    const puzzles = getAllPuzzles(context.world);
    return {
      success: true,
      output: puzzles.map(p => `${p.name}: ${p.solved ? 'SOLVED' : 'unsolved'}`)
    };
  }
};

const testing = new TestingExtension({
  commands: [puzzleDebug]
});
```

---

## Examples

### Transcript Test: Container Behavior

```transcript
title: Mailbox Container Test
story: dungeo

---

> $teleport West of House
[OK]

> open mailbox
[OK: contains "Opening"]

> $assert room contains "leaflet"
[OK]

> take leaflet
[OK: contains "Taken"]

> $assert inventory contains "leaflet"
[OK]

> $assert not room contains "leaflet"
[OK]
```

### Transcript Test: Combat Mechanics

```transcript
title: Troll Combat - Single Hit
story: dungeo

---

# Setup isolated combat scenario
> $teleport Troll Room
> $take sword
> $immortal on
> $seed 42

# Test that attack produces combat output
> kill troll with sword
[OK: matches /swing|blow|slash|hit/i]
```

### Walkthrough Test: Treasure Collection

```walkthrough
title: Above Ground Treasures
story: dungeo

---

[GOAL: Get the brass lantern]
[ENSURES: inventory contains "brass lantern"]

> $teleport West of House
> open window
> w
> take lantern

[END GOAL]

[GOAL: Get the sword]
[REQUIRES: inventory contains "brass lantern"]
[ENSURES: inventory contains "sword"]

> turn on lantern
> d
> take sword

[END GOAL]

[GOAL: Kill the troll]
[REQUIRES: inventory contains "sword"]
[ENSURES: not room contains "troll"]

[NAVIGATE TO: "Troll Room"]

[WHILE: room contains "troll"]
> kill troll with sword
[SKIP]
[END WHILE]

[END GOAL]

[GOAL: Deposit sword in trophy case]
[REQUIRES: inventory contains "sword"]
[REQUIRES: not room contains "troll"]

[NAVIGATE TO: "Living Room"]

> open trophy case
> put sword in trophy case

> $assert score >= 10
[OK]

[END GOAL]
```

---

## Implementation Plan

### Phase 1: Core Infrastructure
1. Create `packages/ext-testing/` package
2. Define types and interfaces
3. Implement basic extension scaffold
4. Port GDT context helpers (generalized)

### Phase 2: Debug Mode (GDT)
1. Port display commands (DA, DR, DO, DE, DS, DX, DC)
2. Port alter commands (AH, TK, AO)
3. Port toggle commands (ND, RD, NR, RR)
4. Implement help system
5. Register grammar patterns

### Phase 3: Test Mode (Transcripts)
1. Implement `$` command parser
2. Implement assertion evaluator
3. Add random seed control
4. Create transcript runner
5. Implement save/restore checkpoint system:
   - WorldModel state serialization (entities, traits, relationships)
   - Scheduler state serialization (fuses, daemons, turn counter)
   - File-based checkpoint storage (`stories/{story}/saves/`)
   - `$save`, `$restore`, `$saves`, `$delete-save` commands

### Phase 4: Walkthrough Mode
1. Implement directive parser (GOAL, WHILE, IF, NAVIGATE)
2. Implement condition evaluator
3. Implement navigator (pathfinding)
4. Create walkthrough runner
5. Add safety limits (max iterations, max depth)

### Phase 5: Dungeo Migration
1. Update Dungeo to use `@sharpee/ext-testing`
2. Register Dungeo-specific commands (PZ, TQ, DL, KL, KO, WU)
3. Convert existing tests to new format
4. Remove duplicated GDT code
5. Verify all tests pass

### Phase 6: Documentation
1. Update CLAUDE.md with testing patterns
2. Add tutorial on transcript testing
3. Add tutorial on walkthrough testing
4. Document all commands and directives
5. Add to website extension catalog

---

## Migration Path

### Existing GDT Transcripts

Old style continues to work:

```transcript
> gdt
GDT> ah Troll Room
GDT> tk sword
GDT> ex
```

New style is cleaner:

```transcript
> $teleport Troll Room
> $take sword
```

### Chained Transcripts → Walkthroughs

Old approach (multiple files with `--chain`):

```bash
sharpee test --chain \
  wt-01-get-torch.transcript \
  wt-02-kill-troll.transcript \
  wt-03-treasures.transcript
```

New approach (single walkthrough file):

```walkthrough
[GOAL: Get torch]
...
[END GOAL]

[GOAL: Kill troll]
...
[END GOAL]

[GOAL: Collect treasures]
...
[END GOAL]
```

---

## Consequences

### Positive

- **Unified testing infrastructure**: All testing tools in one extension
- **Clear artifact separation**: Transcripts for features, walkthroughs for completion
- **Cleaner test files**: `$` commands and directives are readable
- **State verification**: `$assert` catches bugs earlier
- **Deterministic tests**: Random seed control eliminates flakiness
- **Handles randomness**: WHILE loops for combat, NAVIGATE for carousel
- **Extensible**: Stories add custom commands easily
- **Backward compatible**: Old GDT syntax still works

### Negative

- **Larger package**: Combined debug+test+walkthrough is substantial
- **Learning curve**: Multiple syntaxes and file types
- **Migration effort**: Existing tests need conversion

### Neutral

- **Two file types**: `.transcript` vs `.walkthrough` makes intent clear
- **Two syntaxes**: GDT codes for interactive, `$` commands for tests

---

## Alternatives Considered

### 1. Separate Packages for Debug/Transcript/Walkthrough

**Rejected**: Too much overlap in primitives. Would create awkward dependencies.

### 2. Single File Type with Mode Flag

**Rejected**: The sequential vs parallel distinction is fundamental. Separate file types make intent explicit.

### 3. Keep Walkthrough Features in ADR-092 Only

**Rejected**: User clarified all testing should be in the extension. ADR-092 becomes implementation detail of this extension.

---

## Related ADRs

- ADR-022: Extension Architecture (how extensions integrate)
- ADR-073: Transcript Story Testing (original transcript format - superseded by this ADR for file format)
- ADR-092: Smart Transcript Directives (walkthrough directives - incorporated into this ADR)
