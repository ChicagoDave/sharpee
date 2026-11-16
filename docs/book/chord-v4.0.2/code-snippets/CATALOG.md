# Sharpee Book — Code Snippet Catalog

Every code and config snippet from *The Sharpee Author and Developer Manual*, extracted verbatim and organized by chapter in reading order.

- **78 snippets** across 12 chapters (77 author, 1 reference).
- Game-session transcripts (the `> look` ... output examples) are **not** included; they are example play sessions, not code.
- **author** snippets are the story code/config a reader writes (assembled in reading order into `src/index.ts` and project files).
- **reference** snippets are "Under the Hood" excerpts of the platform's own source (interfaces/classes you *import*, not code you write); their filenames carry a `.reference.` infix and are named for the symbol they document.
- File names are `NN-<slug>.<ext>`, where `NN` is the snippet's order within the chapter.

Regenerate with `node scripts/extract-book-snippets.cjs` (from `docs/book/`).

---

# Part I. A first story

## The shape of a story file

`ch01-the-shape-of-a-story-file/` &nbsp;·&nbsp; source: `docs/book/parts/part-1/01-the-shape-of-a-story-file.md`

| # | File | Section | Lang | Kind | Src line |
|---|------|---------|------|------|----------|
| 01 | `01-the-shape-of-a-story-file.story` | The shape of a story file | chord | author | 19 |
| 02 | `02-how-a-block-ends.story` | How a block ends | chord | author | 124 |
| 03 | `03-comments.story` | Comments | chord | author | 159 |

## The story header

`ch02-the-story-header/` &nbsp;·&nbsp; source: `docs/book/parts/part-1/02-the-story-header.md`

| # | File | Section | Lang | Kind | Src line |
|---|------|---------|------|------|----------|
| 01 | `01-the-story-header.story` | The story header | chord | author | 10 |
| 02 | `02-the-two-fields-every-header-needs.story` | The two fields every header needs | chord | author | 35 |
| 03 | `03-the-two-fields-every-header-needs.story` | The two fields every header needs | chord | author | 49 |
| 04 | `04-the-prologue.story` | The prologue | chord | author | 116 |

## The player and the start

`ch03-the-player-and-the-start/` &nbsp;·&nbsp; source: `docs/book/parts/part-1/03-the-player-and-the-start.md`

| # | File | Section | Lang | Kind | Src line |
|---|------|---------|------|------|----------|
| 01 | `01-making-ansel.story` | Making Ansel | chord | author | 13 |
| 02 | `02-handing-over-the-role.story` | Handing over the role | chord | author | 57 |

## Build, play, read an error

`ch04-build-play-read-an-error/` &nbsp;·&nbsp; source: `docs/book/parts/part-1/04-build-play-read-an-error.md`

| # | File | Section | Lang | Kind | Src line |
|---|------|---------|------|------|----------|
| 01 | `01-installing-the-command.sh` | Installing the command | shell | author | 24 |
| 02 | `02-installing-the-command.sh` | Installing the command | shell | author | 30 |
| 03 | `03-checking-the-story.sh` | Checking the story | shell | author | 53 |
| 04 | `04-playing-the-story.sh` | Playing the story | shell | author | 74 |
| 05 | `05-reading-an-error.sh` | Reading an error | shell | author | 136 |
| 06 | `06-two-mistakes-with-the-folder.reference.sh` | Two mistakes with the folder | shell | reference | 234 |

# Part II. The world

## Rooms and exits

`ch05-rooms-and-exits/` &nbsp;·&nbsp; source: `docs/book/parts/part-2/05-rooms-and-exits.md`

| # | File | Section | Lang | Kind | Src line |
|---|------|---------|------|------|----------|
| 01 | `01-what-create-does.story` | What `create` does | chord | author | 19 |
| 02 | `02-what-create-does.story` | What `create` does | chord | author | 27 |
| 03 | `03-exits.story` | Exits | chord | author | 52 |
| 04 | `04-the-way-back-is-free.story` | The way back is free | chord | author | 86 |
| 05 | `05-one-way-exits.story` | One-way exits | chord | author | 109 |
| 06 | `06-the-rest-of-lanternhall.story` | The rest of Lanternhall | chord | author | 135 |
| 07 | `07-the-first-visit.story` | The first visit | chord | author | 185 |
| 08 | `08-a-heading-of-its-own.story` | A heading of its own | chord | author | 228 |
| 09 | `09-build-and-try-it.sh` | Build and try it | shell | author | 254 |

## Things

`ch06-things/` &nbsp;·&nbsp; source: `docs/book/parts/part-2/06-things.md`

| # | File | Section | Lang | Kind | Src line |
|---|------|---------|------|------|----------|
| 01 | `01-a-thing-and-where-it-is.story` | A thing and where it is | chord | author | 14 |
| 02 | `02-things-that-stay-put.story` | Things that stay put | chord | author | 56 |
| 03 | `03-more-than-one-and-things-with-names.story` | More than one, and things with names | chord | author | 88 |
| 04 | `04-more-than-one-and-things-with-names.story` | More than one, and things with names | chord | author | 101 |
| 05 | `05-other-words-for-a-thing.story` | Other words for a thing | chord | author | 128 |
| 06 | `06-a-thing-in-several-rooms.story` | A thing in several rooms | chord | author | 152 |
| 07 | `07-what-ansel-carries.story` | What Ansel carries | chord | author | 175 |
| 08 | `08-hidden-things.story` | Hidden things | chord | author | 210 |
| 09 | `09-hidden-things.story` | Hidden things | chord | author | 239 |
| 10 | `10-build-and-try-it.sh` | Build and try it | shell | author | 257 |

## Containers and supporters

`ch07-containers-and-supporters/` &nbsp;·&nbsp; source: `docs/book/parts/part-2/07-containers-and-supporters.md`

| # | File | Section | Lang | Kind | Src line |
|---|------|---------|------|------|----------|
| 01 | `01-two-kinds-that-hold.story` | Two kinds that hold | chord | author | 16 |
| 02 | `02-opening-and-closing.story` | Opening and closing | chord | author | 67 |
| 03 | `03-how-much-it-holds.story` | How much it holds | chord | author | 126 |
| 04 | `04-a-cupboard-on-the-wall.story` | A cupboard on the wall | chord | author | 147 |
| 05 | `05-seeing-through-and-saying-it-yourself.story` | Seeing through, and saying it yourself | chord | author | 177 |
| 06 | `06-seeing-through-and-saying-it-yourself.story` | Seeing through, and saying it yourself | chord | author | 210 |
| 07 | `07-getting-into-things.story` | Getting into things | chord | author | 224 |
| 08 | `08-build-and-try-it.sh` | Build and try it | shell | author | 255 |

## Doors, locks and keys

`ch08-doors-locks-and-keys/` &nbsp;·&nbsp; source: `docs/book/parts/part-2/08-doors-locks-and-keys.md`

| # | File | Section | Lang | Kind | Src line |
|---|------|---------|------|------|----------|
| 01 | `01-a-door.story` | A door | chord | author | 13 |
| 02 | `02-a-door.story` | A door | chord | author | 24 |
| 03 | `03-a-lock-and-its-key.story` | A lock and its key | chord | author | 68 |
| 04 | `04-saving-the-player-a-step.story` | Saving the player a step | chord | author | 136 |
| 05 | `05-build-and-try-it.sh` | Build and try it | shell | author | 183 |

## What things can do: the trait words

`ch09-what-things-can-do-the-trait-words/` &nbsp;·&nbsp; source: `docs/book/parts/part-2/09-what-things-can-do-the-trait-words.md`

| # | File | Section | Lang | Kind | Src line |
|---|------|---------|------|------|----------|
| 01 | `01-wearing.story` | Wearing | chord | author | 25 |
| 02 | `02-wearing.story` | Wearing | chord | author | 36 |
| 03 | `03-wearing.story` | Wearing | chord | author | 64 |
| 04 | `04-reading.story` | Reading | chord | author | 96 |
| 05 | `05-eating-and-drinking.story` | Eating and drinking | chord | author | 142 |
| 06 | `06-pulling-and-pushing.story` | Pulling and pushing | chord | author | 175 |
| 07 | `07-pulling-and-pushing.story` | Pulling and pushing | chord | author | 200 |
| 08 | `08-breaking.story` | Breaking | chord | author | 232 |
| 09 | `09-fixed-to-something.story` | Fixed to something | chord | author | 259 |
| 10 | `10-switching-on-and-off.story` | Switching on and off | chord | author | 286 |
| 11 | `11-build-and-try-it.sh` | Build and try it | shell | author | 330 |

## Light, dark and the other senses

`ch10-light-dark-and-the-other-senses/` &nbsp;·&nbsp; source: `docs/book/parts/part-2/10-light-dark-and-the-other-senses.md`

| # | File | Section | Lang | Kind | Src line |
|---|------|---------|------|------|----------|
| 01 | `01-a-dark-room.story` | A dark room | chord | author | 13 |
| 02 | `02-a-light-to-carry.story` | A light to carry | chord | author | 56 |
| 03 | `03-seeing-in-the-dark.story` | Seeing in the dark | chord | author | 138 |
| 04 | `04-smell-and-sound.story` | Smell and sound | chord | author | 159 |
| 05 | `05-build-and-try-it.sh` | Build and try it | shell | author | 213 |

## Regions

`ch11-regions/` &nbsp;·&nbsp; source: `docs/book/parts/part-2/11-regions.md`

| # | File | Section | Lang | Kind | Src line |
|---|------|---------|------|------|----------|
| 01 | `01-making-a-region.story` | Making a region | chord | author | 19 |
| 02 | `02-putting-rooms-in-it.story` | Putting rooms in it | chord | author | 34 |
| 03 | `03-scenery-for-a-whole-region.story` | Scenery for a whole region | chord | author | 63 |
| 04 | `04-a-run-of-rooms.story` | A run of rooms | chord | author | 99 |
| 05 | `05-a-table-of-exits.story` | A table of exits | chord | author | 123 |
| 06 | `06-a-backdrop-for-the-stacks.story` | A backdrop for the stacks | chord | author | 166 |
| 07 | `07-build-and-try-it.sh` | Build and try it | shell | author | 188 |

## Ways that are closed, hidden or strange

`ch12-ways-that-are-closed-hidden-or-strange/` &nbsp;·&nbsp; source: `docs/book/parts/part-2/12-ways-that-are-closed-hidden-or-strange.md`

| # | File | Section | Lang | Kind | Src line |
|---|------|---------|------|------|----------|
| 01 | `01-a-way-that-refuses.story` | A way that refuses | chord | author | 15 |
| 02 | `02-a-way-that-refuses.story` | A way that refuses | chord | author | 30 |
| 03 | `03-a-way-that-refuses.story` | A way that refuses | chord | author | 61 |
| 04 | `04-a-way-that-kills.story` | A way that kills | chord | author | 86 |
| 05 | `05-a-way-that-kills.story` | A way that kills | chord | author | 92 |
| 06 | `06-a-way-that-is-sometimes-there.story` | A way that is sometimes there | chord | author | 124 |
| 07 | `07-a-way-with-its-own-command.story` | A way with its own command | chord | author | 146 |
| 08 | `08-build-and-try-it.sh` | Build and try it | shell | author | 218 |

