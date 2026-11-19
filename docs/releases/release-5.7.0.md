# 5.7.0 — the opening is a routine, and The Chord Manual's edition

**Status**: PUBLISHED
**Published**: 2026-11-19
**Chord language**: 4.1.0
**Traces to**: [#793](https://github.com/ChicagoDave/sharpee/issues/793), [#755](https://github.com/ChicagoDave/sharpee/issues/755)

## What shipped

A story's opening, which is its prologue, its banner and the first look at the first room, is now
something the platform runs by itself when a new game begins. Until now every way of playing a
story typed a hidden `look` to produce it, and that `look` counted as the first turn. This release
makes the opening a routine outside the turn count, lets a Chord author change its order, and
moves the Chord language to 4.1.0 for the block that does so.

It is also the release *The Chord Manual* is written against. The manual's title page names
Chord 4.1.0 and Sharpee 5.7.0, and its last reader run before this release completed all forty
chapters with nothing to report. Three interim releases, 5.6.2 to 5.6.4, carried parts of this
work to npm so that those runs could be made on a published command.

## Details

- **The opening is not a turn.** The first command a player types is turn 1. A sequence step
  written `at turn 50` now runs on the fiftieth command that costs a turn, where before it ran on
  the forty-ninth. Counted clauses, timers and the hunger extension's rungs all move by one in the
  same way.
- **The turn count is blank until a command has cost a turn.** A browser page's status line shows
  no count through the opening and shows 1 after the first command. It never shows 0.
- **`when the game starts … end when` (Chord 4.1.0).** A new top-level block that holds the
  opening's three routines, `show-prologue`, `show-banner` and `do-first-look`, each alone on its
  line, in the order the author wants them printed. A story with no block gets prologue, banner,
  look. A routine left out of a block does not run: a block without `show-banner` prints no title.
  The block holds nothing else, and a story has at most one.
- **New diagnostics for the block.** A routine named twice is `analysis.opening-routine-repeated`.
  Any other statement in the block is `parse.opening-statement`. `show-prologue` in a story whose
  header has no `prologue:` is a compile error.
- **With `use chapters`, the opening chapter's title is printed just before the first look**,
  wherever `do-first-look` stands in the block.
- **A TypeScript story states the same list.** `Story` has an optional `opening` field, a list of
  the same three names, and the engine refuses a story whose list repeats one.
- **A test tree records the opening as one `opening` card.** The `boot` card type is gone. The
  card holds whatever the routine printed, and its assertions are made against that.
- **In the browser, the prologue is printed into the transcript in the order the routine gives.**
  The separate prologue element above the transcript is gone.
- **In the terminal, the banner's lines are in one order everywhere**: title, description,
  credits, story version.
- **A command that costs no turn leaves the page's turn count alone.** Typing `score` after one
  command leaves the count at 1, where it used to show 2.

## Upgrading

- A save made before this release still restores. It keeps the turn count it was saved with,
  which is one higher than the same position in a new game. No migration is made.
- Transcripts and test trees recorded before this release should be recorded again. The `boot`
  card type is gone, and a tree's first card is now the `opening` card.
- A story that relied on the hidden first turn (a timer or sequence step tuned to fire on a
  particular command) fires one command later. Lower the number by one to keep the old moment.
- No existing Chord story stops compiling. The opening block is additive.

## Known in this release

- When the player role changes hands on the same turn the outgoing character walks into another
  room, that turn's reply shows the new character's room name over the entered room's
  description, with a garbled listing line. The next `look` is right
  ([#815](https://github.com/ChicagoDave/sharpee/issues/815)).
