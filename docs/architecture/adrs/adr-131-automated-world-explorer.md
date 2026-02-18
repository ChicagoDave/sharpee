# ADR-131: Automated World Explorer (Regression Test Generator)

**Status:** Proposed
**Date:** 2026-02-18

## Context

Manual transcript testing provides excellent coverage for known paths through the game, but has blind spots:

- Only tests the exact commands the author wrote
- Misses nouns mentioned in room descriptions that lack entities or aliases
- Doesn't exercise "wrong" actions (taking scenery, going invalid directions)
- Doesn't scale — each new room/object needs hand-written test cases
- Regression detection depends on someone noticing a change in behavior

We need an automated system that methodically explores the entire game world, tries every reasonable interaction, and records all outputs as a regression baseline.

## Decision

Build an **Automated World Explorer** — a BFS-driven bot that systematically visits every room, interacts with every entity and description noun, and records all outputs. It runs against the existing game engine programmatically (same as the transcript runner) and produces a golden baseline that can be diffed on future runs.

## Design

### Phase 1: Room Traversal

Use breadth-first search over the room graph starting from a known save state (e.g., post-wt-16 where all puzzles are solved and all areas accessible).

```
queue = [startRoom]
visited = Set()

while queue is not empty:
  room = queue.dequeue()
  if room in visited: continue
  visited.add(room)

  execute("look")
  record(room, "look", output)

  for each exit direction in room.exits:
    execute(direction)
    record(room, direction, output)
    if moved to new room:
      queue.enqueue(newRoom)
      execute(reverseDirection)  // go back
```

At each room, the explorer runs a suite of probes before moving on.

### Phase 2: Entity Interaction

For every visible entity in a room, try standard verbs:

| Verb | Applicability |
|------|--------------|
| `examine <entity>` | Always |
| `take <entity>` | Always (tests portability/scenery) |
| `open <entity>` | If openable trait or "door/box/case" in name |
| `read <entity>` | If "book/sign/note/inscription" in name |
| `push <entity>` | If "button/switch/lever" in name |
| `turn on <entity>` | If switchable trait |

Every response is recorded. "You can't see any such thing" for a visible entity is flagged as a bug.

### Phase 3: Description Noun Extraction

Parse room descriptions to extract nouns that players might try to interact with, even if they aren't entities:

**Extraction patterns:**
- Article + noun phrase: "a steep metal ramp", "the wooden door"
- Prepositional objects: "leading to a passage", "carved into the wall"
- Named features: capitalized multi-word phrases

**For each extracted noun, try:**
- `examine <noun>`
- `take <noun>` (if it sounds portable)

**Expected outcomes:**
- Scenery entity → "That's not something you can take" (correct)
- No entity → "You can't see any such thing" (potential bug — description mentions it but no entity exists)
- Portable item → normal take response (correct)

Record all responses. Flag cases where a description noun gets "can't see" as candidates for scenery entities or aliases.

### Phase 4: Wrong Action Coverage

At each room, deliberately try actions that should fail gracefully:

- Go in every cardinal direction (including ones without exits)
- `take` scenery items
- `open` things that aren't openable
- `attack` non-combatants
- `eat` non-edible items

This tests error message coverage and catches cases where wrong actions produce crashes, empty output, or nonsensical responses.

### Output Format

```json
{
  "room": "Living Room",
  "roomId": "r06",
  "probes": [
    {
      "command": "examine trophy case",
      "output": "The trophy case is a beautiful...",
      "events": [...],
      "category": "entity-interaction"
    },
    {
      "command": "take rug",
      "output": "The rug is too heavy to carry.",
      "events": [...],
      "category": "entity-interaction"
    },
    {
      "command": "examine chimney",
      "output": "You can't see any such thing.",
      "events": [...],
      "category": "description-noun",
      "flag": "NOUN_NOT_FOUND"
    }
  ]
}
```

### Regression Detection

On subsequent runs, diff output against baseline:

- **Changed output**: Behavior changed — review for regressions
- **New rooms/entities**: New content added — update baseline
- **Missing rooms/entities**: Content removed — investigate
- **New NOUN_NOT_FOUND flags**: Description changed without adding entity

### Implementation Location

`packages/transcript-tester/src/explorer.ts` — reuses the existing engine initialization and command execution from the transcript runner. New CLI flag: `--explore`.

## Starting Point

Start from a save state where:
- All puzzles solved (no locked doors, dead NPCs cleared)
- All rooms accessible (mirror in known state)
- Lamp has fuel
- Minimal inventory (avoid carrying capacity issues)

This avoids the hard problem of puzzle-solving and focuses on regression coverage.

## Consequences

**Positive:**
- Massive regression coverage with zero manual effort per room
- Catches "description mentions X but X isn't an entity" bugs automatically
- Catches error message regressions across the entire game
- Baseline grows automatically as rooms are added
- Players' most common frustration (description nouns not recognized) is tested

**Negative:**
- Initial baseline will surface many known issues that need triage
- Noun extraction from descriptions is imperfect (false positives are harmless, false negatives miss coverage)
- Cannot test puzzle mechanics (those still need manual transcripts)
- Save state dependency — explorer coverage depends on game state

**Neutral:**
- Complements manual transcripts, doesn't replace them
- Manual transcripts test sequences and puzzles; explorer tests breadth and error handling
