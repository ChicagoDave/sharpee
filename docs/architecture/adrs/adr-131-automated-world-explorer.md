# ADR-131: Automated World Explorer (Regression Test Generator)

**Status:** **SUPERSEDED IN PART** by
[ADR-321](adr-321-world-index.md) (2026-08-19, session 317706) — and still **unbuilt**:
nothing in `packages/` or `repokit` implements it.

> **Do not build from the Decision below as written.** ADR-321 reframed this feature
> around what an author actually opens a panel to learn — **map, reach, incomplete** — and
> found that almost all of it is a *static join over the compiled Story IR*, not a walk.
> The BFS-and-diff-prose bot specified here is demoted to an optional later stage
> (ADR-321 D9) and is not what gets built first.
>
> **What survives:** the *reachability* mode added by ADR-303 D6, and Phase 3's
> description-noun idea — which becomes ADR-321's **Incomplete** view, generalized from
> "nouns with no entity" to a full vocabulary check against each object's name and
> aliases. The **static half** living in `tools/vscode-ext/src/world-explorer.ts` is
> subsumed by ADR-321's Map and Reach views; per this ADR's own consequence, the extension
> copy is not deleted until that surface renders.
>
> This flip was made by the accepter of ADR-321, as that ADR's supersession ownership
> requires.
**Date:** 2026-02-18

> **SCOPE WIDENED 2026-08-05 (session 51b5f4)**, replacing the scope question
> opened earlier the same day (session f2a7e6). Resolved by
> [ADR-303 D6](adr-303-convergent-paths-and-unwinnable-states.md): this ADR
> **gains a second mode rather than being replaced**, and its *static* half
> **moves out of the VS Code extension into the IDE**. Both are stated in the
> Decision below.
>
> The question was whether a BFS bot built as a *regression-baseline generator*
> — BFS the rooms, probe entities and description nouns, record outputs, diff
> later — should also probe whether the **ending stays reachable**. An
> unwinnable state has no ending, no message and no test, which is why it
> survives to ship (ADR-303 D1), and this ADR excludes reachability by design:
> "This avoids the hard problem of puzzle-solving."
>
> The earlier note argued from that exclusion that widening would *replace this
> ADR's premise rather than extend it*. **That objection is retracted**, and the
> reason is what ADR-303 D5's probe turned out to be: it replays the story's own
> answer key from a state rather than searching for a win, so it solves no
> puzzle. The excluded thing and the added thing are not the same thing, and the
> exclusion under *Starting Point* survives the widening intact.
>
> **Amended ahead of its trigger.** ADR-303 D6 names *whoever accepts ADR-303*
> as this amendment's owner, with acceptance as the trigger; ADR-303 is still
> DRAFT. Landed early on David's instruction (session 51b5f4). The obligation D6
> records is discharged here, and D6's own "ADR-131 stands unamended until that
> lands" sentence is corrected in place to say so.
>
> ---
>
> **CLOSED 2026-08-20 (session 502b0b) — the widening above is moot, and its
> trigger never fired.** ADR-303 was **SUPERSEDED** on 2026-08-20 without ever
> being accepted, so the acceptance this amendment anticipated will not happen and
> the ownership it names has no holder. Read everything above as history.
>
> **Do not re-point it at ADR-322.** ADR-303's own supersession record disposes of
> D6 directly — *"D6's widening of ADR-131 is moot: ADR-321 subsumed ADR-131's
> static half on 2026-08-19, and the proposal's §4A consumes ADR-321's Reach rather
> than rebuilding it."* The second mode this block grants was overtaken twice: by
> ADR-321 for the static half (see the SUPERSEDED IN PART header above, which is the
> later and governing statement), and by ADR-322 D8 for the reachability half, which
> **consumes ADR-321's `lifted` rather than widening any explorer**. Re-pointing the
> citation would resurrect a widening that two later documents removed the need for.
>
> **Where the live work is**: ADR-322 (ACCEPTED 2026-08-20) and its working document
> `docs/proposals/state-space-analysis.md`. Nothing is owed by this ADR to either.

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

### Two modes over one walk (widened by ADR-303 D6, 2026-08-05)

| Mode | Records | Cadence | Output |
|------|---------|---------|--------|
| **Baseline** | prose, events and flags per probe | often, diffed against a golden | regression findings |
| **Reachability** | states from which the authored win may no longer be reachable | rarely, run deliberately | unwinnability *candidates*, never verdicts |

They share the walk and differ in everything else, which is why a mode is the
right seam and not a second tool. Phases 1–4 below specify the **baseline**
mode. The **reachability** mode is specified by
[ADR-303 D5](adr-303-convergent-paths-and-unwinnable-states.md) — three
detection layers (declared invariants, irreversibility flags, probing) and a
probe that replays the known winning suffix from a state rather than searching
for a win — and is not restated here.

> **Label collision, stated so it is not tripped over.** ADR-303 D5 divides its
> *probing* layer into a **routine** mode (seeded from the states the suite
> already reaches) and a **deep** mode (BFS the reachable space, dedupe by state
> signature, probe the frontier). Those two sit *inside* the reachability mode
> named above; they are not alternatives to the baseline mode.

**The static half moves to the IDE — not into either mode above.**
`tools/vscode-ext/src/world-explorer.ts` already computes the graph-computable
portion of this idea — dead ends (rooms with one exit or fewer) and one-way
exits, rendered as a World Index from `--world-json`. That is the cheap layer
living in the wrong product. Its destination is the **IDE's** author surface,
not this explorer's walk: it needs no engine run at all, only the world JSON.
It **moves** rather than being mirrored — two copies of a reachability analysis
will eventually disagree, and the disagreement would be discovered by an
author.

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

This is the home of **both modes** named in the Decision, since both are engine
walks. The **static** dead-end/one-way analysis is not one of them and does not
belong behind `--explore`: it reads `--world-json` without running the engine,
and its destination is the IDE.

## Starting Point

Start from a save state where:
- All puzzles solved (no locked doors, dead NPCs cleared)
- All rooms accessible (mirror in known state)
- Lamp has fuel
- Minimal inventory (avoid carrying capacity issues)

This avoids the hard problem of puzzle-solving and focuses on regression coverage.

> **This exclusion survives the ADR-303 D6 widening, and is load-bearing in it.**
> Reachability mode does not solve puzzles either: it replays a winning path the
> finished story already ships. What changes is the *starting point* — baseline
> mode starts from one all-puzzles-solved save, while reachability mode seeds
> from many states (the suite's leaves in routine mode, a BFS frontier in deep
> mode). The single privileged save above is a baseline-mode requirement, not an
> explorer-wide one.

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

**Added by the ADR-303 D6 widening (2026-08-05):**
- Reachability mode has a **prerequisite this ADR did not previously have**: the
  story must ship a known winning path for the probe to replay. A story without
  one gets baseline mode only.
- Its findings are **candidates, not failures** — a failed suffix replay may
  mean the route changed rather than the win being gone. Reporting them as
  failures would train authors to ignore the surface.
- Those findings do **not** enter ADR-293's point-and-class catalog; they are
  reported by the coverage surface (ADR-293 D15) alongside ADR-302 D6's untaken
  divergences, where the unit is already "a place the story can be in that
  nothing tests" (ADR-303 D5).
- Moving the static analysis out of `tools/vscode-ext` **removes a shipped VS
  Code feature** from that extension. The move is not complete until the IDE
  renders the World Index; until then, deleting the extension copy would leave
  authors with neither.
