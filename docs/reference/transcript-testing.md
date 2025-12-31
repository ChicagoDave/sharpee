# Transcript Testing Reference

The transcript tester (`@sharpee/transcript-tester`) provides a way to write integration tests for interactive fiction stories using a natural, readable format that resembles actual gameplay transcripts.

## Overview

Transcript tests verify that:
1. **Text output** - The game produces expected text responses
2. **Semantic events** - The correct events are emitted by actions
3. **World state** - Entities are in expected locations/states after commands

## Running Tests

```bash
# Run all transcripts for a story
node packages/transcript-tester/dist/cli.js stories/dungeo --all

# Run a specific transcript
node packages/transcript-tester/dist/cli.js stories/dungeo stories/dungeo/tests/transcripts/navigation.transcript

# Verbose output (shows actual game text)
node packages/transcript-tester/dist/cli.js stories/dungeo --all --verbose
```

## File Format

Transcript files use the `.transcript` extension and have two sections: a YAML-like header and command/assertion pairs.

### Header

```
title: My Test Transcript
story: dungeo
author: Sharpee Team
description: Test basic navigation

---
```

Header fields:
- `title` - Human-readable name for the test
- `story` - Story identifier (matches package name)
- `author` - Optional author name
- `description` - Optional description of what's being tested

The `---` separator marks the end of the header.

### Commands

Commands start with `>` followed by player input:

```
> look
> take lantern
> go north
```

### Comments

Lines starting with `#` are comments (ignored):

```
# Navigate to the kitchen first
> north
> west
```

## Text Assertions

Text assertions check the game's textual output.

### Contains

Check that output contains a substring (case-sensitive):

```
> look
[OK: contains "Living Room"]
[OK: contains "trophy case"]
```

### Not Contains

Check that output does NOT contain a substring:

```
> look
[OK: not contains "You have died"]
```

### Regex Match

Check output against a regular expression:

```
> inventory
[OK: matches /carrying.*lantern/i]
```

### Expected Failure

Mark a command where you expect NOT to see something (inverted logic):

```
> east
[FAIL: contains "East-West Passage"]
[OK: contains "troll blocks"]
```

`[FAIL]` means "this check should fail" - useful for testing that something does NOT happen.

### Skip / TODO

Skip a command or mark it as incomplete:

```
> complex command
[SKIP]

> unimplemented feature
[TODO: waiting for NPC system]
```

## Event Assertions

Event assertions verify the semantic events emitted by actions.

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

## State Assertions

State assertions verify world model state after a command.

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

## Common Event Types

### Movement Events
- `if.event.actor_moved` - Actor moved between rooms
- `if.event.actor_entered` - Actor entered a room
- `if.event.actor_exited` - Actor exited a room
- `if.event.room.description` - Room description displayed

### Object Manipulation
- `if.event.taken` - Object picked up
- `if.event.opened` - Container/door opened
- `if.event.closed` - Container/door closed
- `if.event.examined` - Object examined
- `if.event.searched` - Container searched
- `if.event.put_in` - Object put in container
- `if.event.put_on` - Object put on supporter

### Device Events
- `if.event.switched_on` - Device turned on
- `if.event.switched_off` - Device turned off

### Physical Actions
- `if.event.pushed` - Object pushed
- `if.event.pulled` - Object pulled

### Action Results
- `action.success` - Action completed successfully
- `action.blocked` - Action was blocked/prevented
- `game.message` - Custom game message

## Complete Example

```
title: Mailbox and Leaflet
story: dungeo
description: Test opening mailbox and reading the leaflet

---

# Examine the mailbox
> examine mailbox
[OK: contains "small mailbox"]
[EVENT: true, type="if.event.examined"]

# Open the mailbox
> open mailbox
[OK: contains "open"]
[EVENT: true, type="if.event.opened"]
[EVENT: true, type="action.success"]
[EVENT: false, type="action.blocked"]

# Search inside the mailbox
> search mailbox
[OK: contains "leaflet"]
[EVENT: true, type="if.event.searched"]

# Take the leaflet
> take leaflet
[OK: contains "Taken"]
[EVENT: true, type="if.event.taken"]

# Read it
> read leaflet
[OK: contains "DUNGEO"]
[EVENT: true, type="action.success"]

# Check inventory
> inventory
[OK: contains "carrying"]
[OK: contains "leaflet"]

# Put it back
> put leaflet in mailbox
[OK: contains "put"]
[EVENT: true, type="if.event.put_in"]

# Close the mailbox
> close mailbox
[OK: contains "close"]
[EVENT: true, type="if.event.closed"]
```

## Best Practices

1. **Start simple** - Begin with text assertions, add event/state assertions for critical behavior
2. **Test the contract** - Event assertions verify the semantic layer independent of text
3. **Use negative assertions** - `[EVENT: false, ...]` catches accidental side effects
4. **Position matters for order** - Use position-specific events when order is important
5. **State for puzzles** - State assertions are ideal for verifying puzzle mechanics
6. **Group related tests** - One transcript per feature/scenario keeps tests focused
7. **Comment liberally** - Use `#` comments to explain what each section tests

## File Organization

Place transcripts in your story's test directory:

```
stories/
  dungeo/
    tests/
      transcripts/
        navigation.transcript
        mailbox.transcript
        rug-trapdoor.transcript
        troll-blocking.transcript
```

## Troubleshooting

### Assertion Not Matching

Use `--verbose` to see actual game output:

```bash
node packages/transcript-tester/dist/cli.js stories/dungeo --all --verbose
```

### Event Type Unknown

Check the action's source code for the exact event type:

```typescript
// In packages/stdlib/src/actions/standard/{action}/{action}.ts
events.push(context.event('if.event.{type}', data));
```

### State Expression Failing

Entity names in state expressions are resolved by name, ID, or alias. Check that the entity exists and the property name is correct.
