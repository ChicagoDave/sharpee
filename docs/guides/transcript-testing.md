# Transcript Testing

Sharpee uses **transcript testing** to verify interactive fiction stories. Transcript files describe a sequence of player commands and expected outcomes in a format that reads like actual gameplay. The transcript tester runs these against the game engine and verifies that output, events, and world state match expectations.

There are two kinds of transcript tests:

- **Unit tests**: Short, isolated tests for specific features or puzzles. Each gets a fresh game instance.
- **Walkthroughs**: Long, chained playthroughs where game state persists between files. Used to verify full game progression.

## Quick Start

### Published stories (npx)

From your story project directory:

```bash
# Build your story and run all transcript tests
npx sharpee build --test

# With verbose output
npx sharpee build --test --verbose

# Stop on first failure
npx sharpee build --test --stop-on-failure
```

`npx sharpee build --test` compiles your TypeScript, creates a `.sharpee` bundle, builds the browser client (if configured), then runs all transcript tests it finds:

- `walkthroughs/wt-*.transcript` — run as a chain (state persists between files)
- `tests/transcripts/*.transcript` — run individually (fresh game per file)

### Sharpee development (bundle)

When working on Sharpee itself, the pre-built bundle is faster (~170ms load vs multi-second package resolution):

```bash
# Build the platform + story first
./build.sh -s dungeo

# Run a single unit test
node dist/cli/sharpee.js --test stories/dungeo/tests/transcripts/basket-elevator.transcript

# Run all unit tests
node dist/cli/sharpee.js --test stories/dungeo/tests/transcripts/*.transcript

# Run walkthrough chain (state persists between files)
node dist/cli/sharpee.js --test --chain stories/dungeo/walkthroughs/wt-*.transcript

# Stop on first failure
node dist/cli/sharpee.js --test --chain --stop-on-failure stories/dungeo/walkthroughs/wt-*.transcript
```

## Project Layout

```
stories/my-story/
├── walkthroughs/
│   ├── wt-01-first-quest.transcript      # Walkthrough files (chained)
│   ├── wt-02-second-quest.transcript
│   └── ...
├── tests/
│   └── transcripts/
│       ├── door-puzzle.transcript         # Unit tests (isolated)
│       ├── combat.transcript
│       └── ...
└── saves/
    ├── wt-01.json                         # Auto-generated save checkpoints
    └── wt-02.json
```

## Writing Transcripts

### File Structure

Every transcript starts with a YAML header, followed by `---`, then commands and assertions:

```
title: Door Puzzle Test
story: my-story
description: Tests that the locked door requires the brass key

---

# Comments start with #

> look
[OK: contains "a locked door"]

> open door
[OK: contains "locked"]

> unlock door with brass key
[OK: contains "unlocked"]

> open door
[OK: contains "opens"]
```

### Header Fields

| Field | Required | Description |
|-------|----------|-------------|
| `title` | Yes | Human-readable name for the test |
| `story` | Yes | Story identifier (matches package name) |
| `author` | No | Author name |
| `description` | No | What this transcript tests |

The `---` separator marks the end of the header.

### Commands

Lines starting with `>` are player commands sent to the game:

```
> take lamp
> go north
> open chest
```

### Comments

Lines starting with `#` are comments (ignored by the tester):

```
# Navigate to the kitchen first
> north
> west
```

### Sections

Lines starting with `##` are section headers. They appear in test output to organize results but don't affect execution:

```
## Setup
> take sword
[OK: contains "Taken"]

## Combat
> attack troll with sword
[OK: contains "troll"]
```

---

## Text Assertions

Text assertions check the game's textual output after a command. Every assertion is enclosed in `[brackets]`.

### Contains

Check that output includes a substring (case-sensitive):

```
> look
[OK: contains "Living Room"]
[OK: contains "trophy case"]
```

### Not Contains

Check that output does NOT include a substring:

```
> look
[OK: not contains "You have died"]
```

### Contains Any

Check that output includes at least one of several strings:

```
> inventory
[OK: contains_any "sword" "knife" "dagger"]
```

### Regex Match

Check output against a regular expression:

```
> examine paintings
[OK: matches /\d+ paintings?/i]
```

### Expected Failure

Use `[FAIL]` to assert a check should NOT pass (inverted logic). This is useful for testing that something does NOT happen:

```
> east
[FAIL: contains "East-West Passage"]
[OK: contains "troll blocks"]
```

### Skip / TODO

Skip a command or mark it as incomplete:

```
> complex command
[SKIP]

> unimplemented feature
[TODO: waiting for NPC system]
```

---

## Event Assertions

Event assertions verify the semantic events emitted by the engine during the turn. Events represent what happened at the action layer, independent of the text output.

### Assert Event Exists

Check that an event of a specific type was emitted:

```
> take lantern
[EVENT: true, type="if.event.taken"]
```

### Assert Event Does Not Exist

Check that an event type was NOT emitted:

```
> east
[EVENT: false, type="if.event.actor_moved"]
```

### Position-Specific Events

Check event at a specific position (1-indexed):

```
> push rug
[EVENT: true, 1, type="if.event.pushed"]
[EVENT: true, 2, type="action.success"]
[EVENT: true, 3, type="game.message"]
```

### Event Data Matching

Match specific properties in event data:

```
> push rug
[EVENT: true, type="action.success" messageId="pushed_nudged"]
[EVENT: true, type="game.message" messageId="dungeo.rug.moved.reveal_trapdoor"]
```

### Event Count

Verify exact number of events emitted:

```
> push rug
[EVENTS: 3]
```

### Common Event Types

**Movement:**
- `if.event.actor_moved` — Actor moved between rooms
- `if.event.actor_entered` — Actor entered a room
- `if.event.actor_exited` — Actor exited a room
- `if.event.room.description` — Room description displayed

**Object manipulation:**
- `if.event.taken` — Object picked up
- `if.event.opened` — Container/door opened
- `if.event.closed` — Container/door closed
- `if.event.examined` — Object examined
- `if.event.searched` — Container searched
- `if.event.put_in` — Object put in container
- `if.event.put_on` — Object put on supporter

**Devices:**
- `if.event.switched_on` — Device turned on
- `if.event.switched_off` — Device turned off

**Physical actions:**
- `if.event.pushed` — Object pushed
- `if.event.pulled` — Object pulled

**Action results:**
- `action.success` — Action completed successfully
- `action.blocked` — Action was blocked/prevented
- `game.message` — Custom game message

---

## State Assertions

State assertions verify world model state after a command executes.

### Entity Property Equality

Check that an entity property equals a value:

```
> push rug
[STATE: true, trapdoor.location = r06]
```

### Entity Property Inequality

Check that a property does NOT equal a value:

```
> drop egg
[STATE: false, egg.location = nowhere]
```

### Collection Contains

Check that a collection contains an item:

```
> take all
[STATE: true, player.inventory contains lantern]
```

### Collection Not Contains

Check that a collection does NOT contain an item:

```
> drop lantern
[STATE: true, player.inventory not-contains lantern]
```

Entity names in state expressions are resolved by name, ID, or alias.

---

## Control Flow Directives

Transcripts support directives for handling variable outcomes, loops, and navigation.

### GOAL / END GOAL

Organize transcripts into named objectives with preconditions and postconditions:

```
[GOAL: Get the torch]
[REQUIRES: inventory contains "rope"]
[ENSURES: inventory contains "torch"]

> tie rope to railing
[OK: contains "rope"]

> down
[OK: contains "Torch Room"]

> take torch
[OK: contains "Taken"]

[END GOAL]
```

- `[REQUIRES: condition]` — must be true before the goal starts (test fails if not)
- `[ENSURES: condition]` — must be true after the goal completes (test fails if not)

### IF / END IF

Conditional execution based on world state:

```
[IF: location = "Troll Room"]
> attack troll with sword
[END IF]
```

### WHILE / END WHILE

Loop while a condition is true (max 100 iterations):

```
[WHILE: room contains "troll"]
> attack troll with sword
[END WHILE]
```

### DO / UNTIL

Execute at least once, then repeat until output matches:

```
[DO]
> attack troll with sword
[OK: contains_any "troll" "staggering"]
[UNTIL "slumps to the floor dead" OR "He dies" OR "You are dead"]
```

Multiple UNTIL conditions use OR logic. Output accumulates across iterations.

### RETRY

Retry a block on failure, restoring world state between attempts. Essential for handling randomness (combat outcomes, NPC behavior):

```
[RETRY: max=5]
[DO]
> attack troll with sword
[OK: contains_any "troll" "staggering"]
[UNTIL "slumps to the floor dead" OR "He dies" OR "You are dead"]
[ENSURES: not entity "troll" alive]
[END RETRY]
```

The tester saves world state before the block and restores it on failure before retrying.

### NAVIGATE TO

Auto-pathfind to a room by name using BFS on the world model:

```
[NAVIGATE TO: "Torch Room"]
```

Useful for skipping tedious navigation in long tests.

---

## Save and Restore

Transcripts can create and load checkpoints:

```
# At the end of a walkthrough
$save wt-01

# At the start of the next walkthrough
$restore wt-01
```

Saves are written to `saves/{name}.json` as serialized world state. This is how walkthrough chains work — each walkthrough saves at the end, and the next one restores from that checkpoint.

## Test Commands

Transcripts can use `$`-prefixed commands for testing utilities (requires the TestingExtension):

| Command | Description |
|---------|-------------|
| `$teleport kitchen` | Move player to a room |
| `$take egg` | Put item in inventory |
| `$kill troll` | Kill an entity |
| `$immortal` | Player can't die |
| `$mortal` | Restore mortality |
| `$state entity.prop = val` | Set entity state |
| `$describe entity` | Dump entity info |
| `$save name` | Save game state |
| `$restore name` | Restore game state |

Stories can implement their own debug tools as well. For example, Dungeo implements a Game Debugging Tool (GDT) with teleport and take commands — that's story-specific, not part of Sharpee's core testing infrastructure.

---

## Condition Expressions

Used in `REQUIRES`, `ENSURES`, `IF`, and `WHILE` directives:

| Expression | Meaning |
|------------|---------|
| `location = "Room Name"` | Player is in that room |
| `room contains "entity"` | Entity is in the current room |
| `not room contains "entity"` | Entity is NOT in the current room |
| `inventory contains "item"` | Player is carrying the item |
| `not inventory contains "item"` | Player is NOT carrying the item |
| `entity "X" in "Room"` | Entity X is in the specified room |
| `entity "X" alive` | Entity X is alive |
| `not entity "X" alive` | Entity X is dead |

---

## Unit Tests vs Walkthroughs

### Unit Tests

Location: `tests/transcripts/*.transcript`

- Test one feature, puzzle, or mechanic in isolation
- Get a fresh game instance each run
- Use `$teleport` and test commands to set up the scenario quickly
- Keep them short and focused

Example:

```
title: Basket Elevator
story: my-story
description: Tests basket elevator lowering/raising

---

## Setup
$teleport Shaft Room
$take brass lantern

> turn on lantern
[OK: contains "switches on"]

## Test lowering
> lower basket
[OK: contains "lower"]

## Already at bottom
> lower basket
[OK: contains "already"]

## Raise it back
> raise basket
[OK: contains "raise"]
```

### Walkthroughs

Location: `walkthroughs/wt-NN-description.transcript`

- Test full game progression from start to finish
- State persists between files via `$save` / `$restore`
- Must be run with `--chain` flag (or via `npx sharpee build --test` which chains automatically)
- Number them sequentially: `wt-01`, `wt-02`, etc.
- Each walkthrough saves at the end so the next one can continue

Example pattern:

```
# wt-01-get-torch-early.transcript

title: Get Torch Early
story: dungeo
description: Get the torch ASAP to save lantern battery

---

[GOAL: Collect essential items from house]
[ENSURES: inventory contains "rope"]
[ENSURES: inventory contains "lantern"]
[ENSURES: inventory contains "sword"]

> look
[OK: contains "West of House"]

> north
...

[END GOAL]

# Save for next walkthrough
$save wt-01
```

```
# wt-02-bank-puzzle.transcript

title: Bank Puzzle
story: dungeo

---

$restore wt-01

[GOAL: Solve the bank vault]
...
[END GOAL]

$save wt-02
```

---

## Complete Example

A full transcript combining multiple assertion types:

```
title: Mailbox and Leaflet
story: dungeo
description: Test opening mailbox and reading the leaflet

---

## Examine the mailbox
> examine mailbox
[OK: contains "small mailbox"]
[EVENT: true, type="if.event.examined"]

## Open and search
> open mailbox
[OK: contains "open"]
[EVENT: true, type="if.event.opened"]
[EVENT: false, type="action.blocked"]

> search mailbox
[OK: contains "leaflet"]
[EVENT: true, type="if.event.searched"]

## Take and read the leaflet
> take leaflet
[OK: contains "Taken"]
[EVENT: true, type="if.event.taken"]
[STATE: true, player.inventory contains leaflet]

> read leaflet
[OK: contains "DUNGEO"]
[EVENT: true, type="action.success"]

## Put it back
> put leaflet in mailbox
[EVENT: true, type="if.event.put_in"]
[STATE: true, player.inventory not-contains leaflet]

> close mailbox
[OK: contains "close"]
[EVENT: true, type="if.event.closed"]
```

---

## Test Results

Each command produces one of:

| Result | Meaning |
|--------|---------|
| **PASS** | All assertions passed |
| **FAIL** | At least one assertion failed |
| **EXPECTED FAIL** | Marked `[FAIL]` and failed as intended |
| **SKIP** | Marked `[SKIP]` or `[TODO]` |

Summary output:

```
360 tests: 349 pass, 0 fail, 0 expected-fail, 11 skip (1623ms)
```

---

## CLI Reference

### npx sharpee build

| Flag | Description |
|------|-------------|
| `--test` | Run transcript tests after building |
| `--verbose`, `-v` | Show detailed test output |
| `--stop-on-failure` | Stop on first test failure |
| `--no-minify` | Skip browser client minification |
| `--no-sourcemap` | Skip source map generation |

### node dist/cli/sharpee.js (development)

| Flag | Description |
|------|-------------|
| `--test <files>` | Run transcript test(s) |
| `--chain` | Chain transcripts (state persists between files) |
| `--stop-on-failure` | Stop on first failure |
| `--verbose` | Show detailed output |
| `--play` | Interactive play mode |
| `--play --restore <name>` | Resume from a save checkpoint |
| `--exec "cmd1/cmd2"` | Execute commands non-interactively |
| `--debug` | Show parsed/validated/event debug info |

---

## Best Practices

1. **Start simple** — Begin with text assertions (`[OK: contains "..."]`), add event and state assertions for critical behavior.
2. **Test the contract** — Event assertions verify the semantic layer independent of text output. If you change prose, event tests still pass.
3. **Use negative assertions** — `[EVENT: false, ...]` and `[OK: not contains "..."]` catch accidental side effects.
4. **Position matters for order** — Use position-specific events (`[EVENT: true, 1, ...]`) when event ordering is important.
5. **State for puzzles** — State assertions are ideal for verifying puzzle mechanics where the mutation matters more than the message.
6. **One feature per unit test** — Keep unit transcripts short and focused on a single mechanic.
7. **Comment liberally** — Use `#` comments to explain what each section tests and why.
8. **Write transcripts as you build** — Don't wait until the story is done. Test each feature as you implement it.

## Troubleshooting

### Assertion Not Matching

Use `--verbose` to see actual game output:

```bash
node dist/cli/sharpee.js --test --verbose stories/my-story/tests/transcripts/failing.transcript
```

### Event Type Unknown

Check the action's source code for the exact event type string:

```typescript
// In packages/stdlib/src/actions/standard/{action}/{action}.ts
events.push(context.event('if.event.{type}', data));
```

### State Expression Failing

Entity names in state expressions are resolved by name, ID, or alias. Check that the entity exists and the property name is correct.

### Combat Randomness

Combat outcomes are random. Use `[DO]`/`[UNTIL]` with `[RETRY]` blocks to handle variable results. Providing 6 attack commands is usually sufficient without retry logic.

---

## Further Reading

- [ADR-073: Transcript Story Testing](../architecture/adrs/adr-073-transcript-story-testing.md) — Original design rationale
- [ADR-092: Smart Transcript Directives](../architecture/adrs/adr-092-smart-transcript-directives.md) — Control flow extensions (GOAL, IF, WHILE, RETRY, NAVIGATE TO)
- [ADR-134: Generic IF Transcript Tester](../architecture/adrs/adr-134-generic-if-transcript-tester.md) — Future extraction as standalone tool
