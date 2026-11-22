# ADR-406: A room group gives each room its own things

**Planning**: OPEN

**Summary**: Proposes one new line in a Chord room group, `each has the <stem>`, which stamps a copy of a thing into every room of the group, named after the rooms and printed to the player by its stem. Nothing is built, and the printed name of a thing is unsettled.

**Status**: **DRAFT** (written 2026-11-21, session f809ff, from GitHub #827 at David's direction: "proceed", to a list that included drafting this record). Nothing here is decided. David has not ruled on the syntax or on any open question, and no `packages/` change may start from this record until he accepts it.

## Date: 2026-11-21

**Kind**: technical

**Scope**: `packages/chord` (`chord.ebnf`, the parser, the analyzer, the room-group expansion, the IR if a printed name needs a field), `packages/story-loader` (only if a thing's printed name needs runtime support), `docs/book/chord-v4.1.0/parts/part-2/11-regions.md`

## Context

The case is an intfiction.org thread, "Groups of Multiples" (https://intfiction.org/t/groups-of-multiples/82937): four identical guest rooms off a hallway, each with its own bed and dresser. The Inform 7 answer in the thread is one sentence for each thing.

Read in the source on 2026-11-21:

- `packages/chord/chord.ebnf` line 1410, `room-group`: `rooms <stem> <n> to <m>` makes one room for each whole number, named `<stem> <n>` (ADR-360 D1). A group line may carry trait words, a `first time` block and a `room name` block, each copied to every room. It has no line for things.
- `packages/chord/chord.ebnf` line 1396, `room-name-block`: a room's heading is authored apart from the room's name. The block is legal on a room, in a `rooms` group, or on an `enterable` thing. No other thing has a printed name apart from the name the file uses.
- `it` is a form only inside `define trait` (`analysis.it-removed`), so a block copied onto several things cannot hold a clause or a `phrase detail` that names its owner.

Reported by session 2985ee, which probed Chord 4.1.0 on the in-repo CLI and did not keep the probe story: a story with `rooms Guest Room 1 to 4`, four doors and four separately created beds and dressers is gate-clean and plays correctly, each dresser holding its own contents. The costs it found:

- Every bed, dresser and door is its own `create` block with a unique name, and the description is repeated in each.
- The unique names reach the player: "You open the first dresser."
- `open door` in a hall with two of the doors asks which.

## Decision

Proposed, not accepted. One new line inside a room group, `each has the <stem>`, followed by an indented block.

```chord
create the Wing, a region
  rooms Guest Room 1 to 4

    A narrow room with a bed against one wall and a dresser against the
    other. The door leads back to the hallway.

    each has the bed
      a supporter, scenery, enterable, guest-bed

      A narrow iron bed with a grey blanket.

    each has the dresser
      a container, scenery, openable, starts closed
      holds 4

      A pine dresser with one deep drawer.

    each has the door
      a door, openable

  exits
    the Guest Room 1: south to the West Hall through the door 1
    the Guest Room 2: south to the East Hall through the door 2
    the Guest Room 3: north to the West Hall through the door 3
    the Guest Room 4: north to the East Hall through the door 4

create the sock
  a thing
  in the dresser 1
```

**D1. Naming follows the rooms.** `rooms Guest Room 1 to 4` makes `the Guest Room 1` to `the Guest Room 4`, and `each has the dresser` makes `the dresser 1` to `the dresser 4` by the same rule. Any copy can be named elsewhere in the file, as the sock's placement and the exit rows do. A created name that collides is `analysis.duplicate-entity`, as it is for rooms.

**D2. The player sees the stem.** The number is the author's handle. Each copy prints as "the dresser" and answers to `dresser`. This decision depends on Open Question 1.

**D3. The block says what the thing is, not what it does.** It takes the kind line with its trait words, the short facts (`holds`, `servings`, `states`) and a description. It takes no clause. Behaviour goes in a trait named on the kind line, which is where `it` is already a form.

**D4. A door declared this way has no placement**, as any door has none. It gets its place from the exit row that names it, and a copy that no exit names is `analysis.door-unconnected`.

**D5. `each` keeps its meaning.** It already means "once for every member of a set" in the `each` block of a clause.

**D6. The compiler expands the line.** A room group is expanded before the platform sees it, and this line is expanded with it, so the Story IR carries ordinary entities.

**Alternative considered.** A top-level form, `create the dresser, in each of the Guest Room 1 to 4`. Not proposed, because the nested line puts the copies beside the room description that promises them, and because the group is already where "one of these per room" is said.

## Consequences

- An author writes a repeated room's furniture once. Chapter 11 of the manual, which teaches room groups, gains a section.
- D2 needs a thing to have a printed name apart from its file name. That is the platform half of the change, and it would serve things outside a group as well.
- D3 keeps `it` out of `create`-shaped blocks. An author who wants one copy to behave differently writes that copy as an ordinary `create` block and leaves it out of the group.
- A story-wide noun now has several owners by design. In a room that holds one copy the parser has one candidate. In a place that can see two, such as a hall with two of the doors, the player is still asked which, and the stem gives them no word to answer with. Open Question 5 is about that.
- The Story IR and the loader are unchanged by D6, apart from whatever Open Question 1 adds.

## Session

Session f809ff, 2026-11-21. Drafted from GitHub #827, which session 2985ee filed the same day after probing the thread's case.

## Open Questions

1. **A thing's printed name.** D2 needs it, and nothing in `chord.ebnf` gives a thing one except the `room name` block on an `enterable` thing. Is it a new line on any thing, an extension of `room name`, or a rule that only group copies get? Without an answer the copies print as "the dresser 2".
2. **Detail and present phrases.** `phrase detail while <condition>:` names its owner in the condition, so it has the problem a clause has. Is it left out of the block, or allowed from a trait?
3. **Contents.** Can the block declare what each copy starts with (a Bible in every dresser), or is an ordinary `create` with `in the dresser 1` enough?
4. **States.** The block takes a `states` line under D3. With no clause in the block, only a trait can change them. Is that enough, or should `states` be left to the trait as well?
5. **Two copies in sight.** When the player can see two copies and types the stem, what do they answer the question with? The room's number, the direction, or nothing new?
