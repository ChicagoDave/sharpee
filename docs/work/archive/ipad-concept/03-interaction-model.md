# 03 — Interaction model

**Created**: 2026-09-11
**Status**: EXPLORATORY

iPad, landscape. Left palette rail, canvas, right inspector rail. The
inspector with nothing selected is the checklist (`05`) — no extra chrome, and
tapping empty canvas always brings it back.

## Two palettes, not one

Chord's composition grammar splits them for us:

```
composition = [ ARTICLE ] WORD [ "with" setting … ] [ "while" condition ]
```

An article makes it a kind noun; a bare word makes it a trait. So:

- **Create** — `room`, `thing`, `person`, `container`, `supporter`, `door`.
  Dropping one on the canvas makes a new card and a new `create` block.
- **Traits** — `openable`, `lockable`, `switchable`, `readable`, `edible`,
  `wearable`. These never make a card. They only land *on* one, and only on a
  thing: rooms and people dim during the drag.

Different colour, different drop target, different edit. This is the cheapest
thing in the language to teach visually and it costs nothing to get right.

## Dropping a trait

Three beats, two inserts (see `02` for the text):

1. Drag the tile over a card. Valid targets highlight, invalid ones dim.
2. The trait's declared data is asked for. `lockable` declares `key: entity`,
   so the drop leaves a dashed **needs a key** chip and starts a rubber-band
   drag to a thing — every thing in the story is a candidate. A form field
   would be the wrong gesture here; the answer is another object on the
   canvas.
3. The states the trait declares become a segmented control, which writes the
   `starts <state>` initialiser.

The dashed chip is the app's one universal signal for *this will not compile
yet*, used nowhere else.

## Exits

An exit is drawn as an edge and written as a line on the from-room:

```
east to the Pantry through the oak door
down to the Cellar Stairs, one-way
```

The reverse is inferred, so an edge is two-way until the `one-way` chip is
tapped. A door on the edge is a `through` tail and shows as a glyph on the
line.

Unresolved: whether an edge carrying a door should be drawn from the room or
from the door, and what deleting a room does to lines written in other blocks.
See `07`.

## The Start Card (D6)

The opening moment is a card, not a flag on a room. It wears its own Chord
line as a banner — `BEFORE THE GAME STARTS` — and carries an arrow to wherever
play opens.

Rows: `the player` (a picker over people marked `playable`), `starts in`,
`carries`, `prologue`, and a step list for anything else that should happen
before the first turn.

Two details that are design, not decoration:

- **The prologue is the seam.** A start block cannot narrate —
  `analysis.start-block-narration` — because there is no turn yet to carry
  prose. Rather than teach that as a rule, the card puts `prologue` exactly
  where a child reaches for it and the step picker simply has no `phrase`
  option.
- **It cannot be deleted and there is exactly one.** Chord requires one start
  block that assigns the player role, so the card exists from the moment a
  story is created — empty and complaining — instead of appearing later as a
  fix-it.

## A room, open

The inspector's sections run in the order Chord writes them, using Chord's
words: `description`, `first time`, exits, what is here, `on…`. Reading the
source later then holds no surprise.

## Prose

Prose gets a full screen, not a popover. Warm paper, a single measure, Literata
at 19px. This is where the hours go in any IF project; if writing is a modal
sheet over the canvas, the tool has its priorities inverted.

Variants are drawn the way Chord writes them: paragraphs separated by a
standalone `or` divider, with the strategy (`randomly` / `cycling` /
`stopping` / `first-time`) as a picker beside them, and `while` available as a
gate on the whole set.

## `on…`

Statements are **rows, not blocks**. Drag-nesting stops being fun at the third
condition, and Chord's own shape is already flat: one statement per line, with
a trailing `when <condition>` suffix. So a step is a row and its condition is a
chip line underneath it.

```
on the player taking
    phrase key-found
        The key is cold in your palm.
    award finding-the-key, once
    phrase think-of-pantry when the oak door is locked
        Somewhere back inside, the pantry door is still shut.
end on
```

The condition bar offers `is`, `is not`, `has`, `holds`, `wears`, `can see`,
`is in`, `and`, `or`, `not`, `one chance in`. Because the condition grammar is
closed and small, every legal next word can be offered — a child cannot write
a condition that fails to parse, because the keys for it do not exist.

The head is a picker, not a text field. It writes `on the player taking` —
owner as the object of the action. The bare-gerund form (legal only in a
person's block) stays hidden; the distinction is not worth day one.

## Play

The running story in the existing browser client, with the transcript on the
left and the map on the right showing where the player is. A suggestion row of
tappable commands, drawn from the actions actually available in this room,
gives a child who has never used a parser a first move; the text field never
goes away.

One tap from any line of the transcript opens the block that printed it. This
is the loop the whole app exists for: write a sentence, hear it, fix it.
