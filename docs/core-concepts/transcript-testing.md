# Transcript Testing

> **Scope — which harness is this?** Sharpee has two, and the split is strict:
>
> | | Harness | Artifact | Command |
> |---|---|---|---|
> | **Sharpee** | `@sharpee/transcript-tester` | `*.transcript` | `node dist/cli/sharpee.js --test` |
> | **Chord** | `@sharpee/branch-tester` (ADR-307) | one `<story-id>.tests.json` tree document beside the `.story` | `sharpee test <story-dir>` |
>
> **Transcript tests are strictly Sharpee. Chord stories are strictly tree
> documents.** This document covers the Sharpee side only — the tree document is
> not a transcript and shares none of the grammar below. If you are writing a
> Chord story, nothing here applies to it.

Sharpee uses **transcript testing** to verify interactive fiction stories. Transcript files describe a sequence of player commands and expected outcomes in a format that reads like actual gameplay. The transcript tester runs these against the game engine and verifies that output, events, and world state match expectations.

There are two kinds of transcript tests:

- **Unit tests**: Short, isolated tests for specific features or puzzles. Each gets a fresh game instance.
- **Walkthroughs**: Long, chained playthroughs where game state persists between files. Used to verify full game progression.

## Quick Start

### Authoring your own story — not this harness

`sharpee build --test` no longer exists; there is no `--test` flag on the
author build. An authored story is tested through its **tree document**:

```bash
sharpee test                     # from the project directory
sharpee test <dir|name|file.story>
sharpee test --stop-on-failure --verbose
```

That reads `<story-id>.tests.json` beside your `.story` and replays it against a
real engine. Tests are recorded in the IDE's Testing tab rather than hand-written.
Everything from "Writing Transcripts" down is the *other* harness and does not
apply to it. `--chain` and `--coverage` are retired there (ADR-302 D10,
ADR-307 cutover).

### Sharpee development (bundle)

When working on Sharpee itself, the pre-built bundle is faster (~170ms load vs multi-second package resolution):

```bash
# Build the platform + story first (ADR-187: ./repokit is the in-repo build;
# ./sharpee is the author tool and redirects a workspace story here anyway)
./repokit build dungeo

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

Seven further keys carry **run configuration** rather than prose, recognized
case-insensitively (ADR-294 D3/D6/D8/D13/D15/D19, ADR-293 Phase C). Anything
else in the header stays a raw string.

| Field | Description |
|-------|-------------|
| `seed` | Pin the master seed. This is the only way to pin one — `[SEED: N]` is removed grammar |
| `seeds` | Multiple seeds for a matrix run |
| `channels` | Channels to capture |
| `events` | Events to capture |
| `locale` | Language/locale for the run |
| `forces` | Force an outcome class at a point: `point[#occurrence]=CLASS`, comma-separated |
| `point-seed` | Pin one point's seed: `point=seed`, comma-separated |

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

The full live set is `[OK]`, `[OK: contains "..."]`, payload-less `[OK: contains]`
with a text block, `[OK: not contains "..."]`, `[FAIL: reason]`, `[TODO: note]`,
`[SKIP]`, `[EVENT:]`, `[STATE:]`, and the `[GOAL:]` label. Anything else is
[removed grammar](#removed-grammar).

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

### Expected Failure

`[FAIL: reason]` marks a command as an **expected failure**. The command is
excluded from the pass/fail count and never fails a run, whatever its other
assertions do — `reason` is a free-text label, not a check:

```
> east
[FAIL: the troll blocks this until the axe puzzle is solved]
```

It does **not** invert an individual assertion. To assert that something is
absent, use `[OK: not contains "..."]`. Verified 2026-08-21: a `[FAIL:]` command
whose sibling `[OK: contains]` matched, and one whose sibling did not, both
report `EXPECTED FAIL` and exit 0.

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

## Structural Labels

Five of the six control-flow directives this section once documented were
removed by ADR-294 D4 — output and state are deterministic at a pinned seed, so
a loop, a retry, or a condition never varies. The parser rejects each by name.
See [Removed Grammar](#removed-grammar). One survives.

### GOAL / END GOAL

`[GOAL: name]` and `[END GOAL]` group a run of commands under a label. It is a
**structural label only** — it groups and names, it does not assert, branch, or
verify that the goal was reached:

```
[GOAL: retrieve the torch]
> north
[OK: contains "Dark Passage"]

> take torch
[OK: contains "Taken"]
[END GOAL]
```

---

## Removed Grammar

Sixteen forms were removed by ADR-293/ADR-294. **The parser rejects each by
name** with a message pointing at the replacement, so a transcript using one
fails to parse rather than misbehaving. They are listed here because earlier
revisions of this document taught several of them, and because a rejection is
easier to act on when you know what to write instead.

The common cause: **a run is deterministic at a pinned seed.** A loop, a retry,
a precondition, and a condition therefore cannot vary between runs — so the
fixed command list they produce is what the transcript should say outright.

| Removed | Write instead |
|---|---|
| `[SEED: N]` | `seed: N` in the header, above the `---` |
| `[WHILE:]` / `[END WHILE]` | the fixed command list the loop produced |
| `[RETRY:]` / `[END RETRY]` | the fixed command list the retries produced |
| `[DO]` / `[UNTIL]` | the fixed command list the loop produced |
| `[IF:]` / `[END IF]` | the branch that actually happens |
| `[REQUIRES:]` | nothing — a precondition either always holds, or the transcript is wrong |
| `[ENSURES:]` | a golden recording for durable protection; `[OK: contains "..."]` or `[STATE:]` for unit intent |
| `[NAVIGATE TO:]` | the movement commands themselves |
| `[OK: any]` | `[OK]` |
| `[OK: contains_any]` | `[OK: contains "..."]` with the text that actually occurs |
| `[OK: matches]` | `[OK: contains "..."]`, or a golden recording |
| `[EVENTS: N]` | `[EVENT: true, N, type="..."]` for a specific type |

Do not reintroduce any of them, and do not add new control-flow forms in their
place — that is the shape ADR-294 D4 closed.

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

Used in `[STATE: true|false, expression]` assertions. (They were also the
argument to `REQUIRES`, `ENSURES`, `IF`, and `WHILE`; all four are removed
grammar — `[STATE:]` is where these expressions live now.)

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
seed: 42

---

[GOAL: Collect essential items from house]

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

### sharpee build (author tool)

| Flag | Description |
|------|-------------|
| `--no-minify` | Skip browser client minification |
| `--no-sourcemap` | Skip source map generation |

There is no `--test` flag. Author-side testing is `sharpee test`, which runs the
tree document — see [Scope](#transcript-testing) at the top.

### node dist/cli/sharpee.js (development)

| Flag | Description |
|------|-------------|
| `--test <files>` | Run transcript test(s) |
| `--story <path>` | Story dir or `.story` file. Inferred from the transcript paths' `stories/<name>/` prefix for `--test`; **required** for `--play`/`--exec` — there is no default story |
| `--seed <n>` / `--vary` | Override the pinned seed / run off-baseline (mutually exclusive) |
| `--output-dir <dir>`, `-o` | Write timestamped results to a directory |
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

Combat is **deterministic at a pinned seed** — it is not a source of flakiness,
and it needs no loop or retry (`[DO]`/`[UNTIL]`/`[RETRY]` are removed grammar).
Write the exact command list the fight actually takes: derive it by probing with
`--exec`, or pin a specific outcome with the `forces:` / `point-seed:` header
fields (ADR-293 Phase C).

**Do not pad with surplus attack commands "for safety."** The count in a
combat sequence is an exact pinned-seed result; extra commands make the
transcript wrong, not safer. If a run differs from the recorded one at the same
seed, that is a real finding — investigate it rather than re-running.

---

## Further Reading

- [ADR-073: Transcript Story Testing](../architecture/adrs/adr-073-transcript-story-testing.md) — Original design rationale
- [ADR-092: Smart Transcript Directives](../architecture/adrs/adr-092-smart-transcript-directives.md) — the control-flow extensions (GOAL, IF, WHILE, RETRY, NAVIGATE TO). **Historical**: everything but GOAL was removed by ADR-294 D4; read it for why they existed, not for what to write
- [ADR-134: Generic IF Transcript Tester](../architecture/adrs/adr-134-generic-if-transcript-tester.md) — Future extraction as standalone tool
- [ADR-293: Determinism and forcing](../architecture/adrs/adr-293-determinism-and-forcing.md) — the pinned seed the removals rest on, and the `forces:` / `point-seed:` header fields
- [ADR-294](../architecture/adrs/) — D2/D3/D4 removed the assertion and control-flow forms listed under [Removed Grammar](#removed-grammar)
- [ADR-307: The Testing Tree, Model v2](../architecture/adrs/adr-307-testing-tree-model-v2.md) — the *other* harness: the tree document that Chord and IDE stories use instead of this grammar
- [`README.md`](./README.md) — `@sharpee/transcript-tester` vs `@sharpee/branch-tester`, and which world each serves
